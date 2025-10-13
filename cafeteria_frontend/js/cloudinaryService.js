// cloudinaryService.js - Gestion des images ET PDF

import { appState } from './config.js';
import { getTodayKey } from './utils.js';

// Configuration Cloudinary
const CLOUDINARY_CONFIG = {
    cloudName: 'dvtv7bku4',
    uploadPreset: 'cafeteria-menu-uploads',
    folder: 'cafeteria-menus'
};

function formatBilingualDataFromMenuFiles(data = {}) {
    return {
        fr: {
            url: data.fileURL_fr || data.fileURL || null,
            type: data.fileType_fr || data.fileType || 'image',
            publicId: data.publicId_fr || data.publicId || null
        },
        nl: {
            url: data.fileURL_nl || data.fileURL || null,
            type: data.fileType_nl || data.fileType || 'image',
            publicId: data.publicId_nl || data.publicId || null
        }
    };
}

function formatBilingualDataFromLegacy(data = {}) {
    const fallbackData = {
        url: data.imageURL || data.url || null,
        type: 'image',
        publicId: data.publicId || null
    };

    return {
        fr: fallbackData,
        nl: fallbackData
    };
}

async function fetchLatestDocument(collectionName) {
    try {
        const { collection, query, orderBy, limit, getDocs } = window.firebaseFunctions || {};

        if (!collection || !query || !orderBy || !limit || !getDocs) {
            console.warn('⚠️ Fonctions de requête Firestore indisponibles');
            return null;
        }

        const collRef = collection(appState.db, collectionName);
        const q = query(collRef, orderBy('date', 'desc'), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            return { id: docSnap.id, data: docSnap.data() };
        }

        return null;
    } catch (error) {
        console.error(`❌ Erreur lors de la recherche du dernier document (${collectionName}):`, error);
        return null;
    }
}

// Upload d'un fichier vers Cloudinary (image ou PDF)
export async function uploadMenuImage(file) {
    try {
        console.log('🔍 Début upload vers Cloudinary...');
        console.log('📁 Fichier:', file.name, file.size, 'bytes, type:', file.type);
        
        const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
        const formData = new FormData();
        const todayKey = getTodayKey();
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const publicId = `menu_${todayKey}_${uniqueId}`;
        
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('public_id', publicId);
        formData.append('folder', CLOUDINARY_CONFIG.folder);
        
        // IMPORTANT: Pour les PDF, utiliser "raw" comme resource_type
        if (fileType === 'pdf') {
            formData.append('resource_type', 'raw');
        }
        
        // Choisir l'endpoint selon le type
        const resourceType = fileType === 'pdf' ? 'raw' : 'image';
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
        
        console.log('🌐 URL:', url, '- Type:', resourceType);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        console.log('📡 Réponse status:', response.status);
        
        const data = await response.json();
        console.log('📋 Réponse complète:', data);
        
        if (!response.ok || data.error) {
            console.error('❌ Erreur:', data.error || response.status);
            throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
        }
        
        // Sauvegarder l'URL dans Firestore avec le type de fichier
        await saveFileURL(todayKey, data.secure_url, data.public_id, fileType);
        
        return {
            success: true,
            url: data.secure_url,
            publicId: data.public_id,
            fileType: fileType,
            fileName: data.original_filename
        };
        
    } catch (error) {
        console.error('Erreur lors de l\'upload vers Cloudinary:', error);
        throw error;
    }
}

// Sauvegarder l'URL du fichier dans Firestore
async function saveFileURL(dateKey, fileURL, publicId, fileType) {
    try {
        const { doc, setDoc } = window.firebaseFunctions;
        
        // Sauvegarder dans la nouvelle collection "menu_files"
        const fileDocRef = doc(appState.db, "menu_files", dateKey);
        
        await setDoc(fileDocRef, {
            fileURL: fileURL,
            publicId: publicId,
            fileType: fileType, // 'image' ou 'pdf'
            uploadDate: new Date().toISOString(),
            date: dateKey,
            provider: 'cloudinary'
        });
        
        console.log('✅ URL fichier sauvegardée dans menu_files');
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde URL fichier:', error);
        return false;
    }
}


// NOUVELLE : Récupérer les URLs des DEUX fichiers du jour (FR + NL)
export async function getTodayFileDataBilingual() {
    try {
        const { doc, getDoc } = window.firebaseFunctions || {};

        if (!doc || !getDoc) {
            console.warn('⚠️ Fonctions Firestore minimales indisponibles');
            throw new Error('Firestore non disponible');
        }

        const todayKey = getTodayKey();

        // 1. Essayer d'abord la nouvelle collection "menu_files"
        const fileDocRef = doc(appState.db, 'menu_files', todayKey);
        const fileDocSnap = await getDoc(fileDocRef);

        if (fileDocSnap.exists()) {
            const data = fileDocSnap.data();
            console.log('📦 Données fichiers récupérées:', data);
            const result = formatBilingualDataFromMenuFiles(data);
            console.log('🖼️ Données finales (bilingue):', result);
            return result;
        }

        // 1.bis : récupérer le dernier fichier disponible si pas de document pour aujourd'hui
        const latestMenuFile = await fetchLatestDocument('menu_files');
        if (latestMenuFile) {
            console.log(`📚 Dernier fichier disponible utilisé (${latestMenuFile.id})`);
            return formatBilingualDataFromMenuFiles(latestMenuFile.data);
        }

        // 2. Si pas trouvé, essayer l'ancienne collection "menu_images" (compatibilité)
        console.log('📋 Tentative dans menu_images...');
        const imageDocRef = doc(appState.db, 'menu_images', todayKey);
        const imageDocSnap = await getDoc(imageDocRef);

        if (imageDocSnap.exists()) {
            const data = imageDocSnap.data();
            console.log('📄 Image trouvée dans menu_images:', data);
            return formatBilingualDataFromLegacy(data);
        }

        // 2.bis : récupérer la dernière image legacy disponible
        const latestLegacyImage = await fetchLatestDocument('menu_images');
        if (latestLegacyImage) {
            console.log(`🗂️ Image legacy utilisée (${latestLegacyImage.id})`);
            return formatBilingualDataFromLegacy(latestLegacyImage.data);
        }

        console.log('📭 Aucun fichier trouvé pour aujourd\'hui');
        return {
            fr: { url: null, type: 'image', publicId: null },
            nl: { url: null, type: 'image', publicId: null }
        };

    } catch (error) {
        console.error('❌ Erreur récupération fichiers bilingues:', error);
        return {
            fr: { url: null, type: 'image', publicId: null },
            nl: { url: null, type: 'image', publicId: null }
        };
    }
}

// Fonction simplifiée pour récupérer juste les URLs (sans les métadonnées)
export async function getTodayImageURLs() {
    const fileData = await getTodayFileDataBilingual();
    return {
        fr: fileData.fr.url,
        nl: fileData.nl.url
    };
}

// GARDER la fonction de compatibilité - retourne juste l'URL FR
export async function getTodayImageURL() {
    const urls = await getTodayImageURLs();
    return urls.fr; // Par défaut retourner le français
}

// GARDER aussi getTodayFileData pour compatibilité avec ton code existant
export async function getTodayFileData() {
    const fileData = await getTodayFileDataBilingual();
    return fileData.fr; // Par défaut retourner les données FR
}

// Valider qu'un fichier existe sur Cloudinary
async function validateCloudinaryFile(fileURL) {
    try {
        const response = await fetch(fileURL, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error('Erreur validation fichier:', error);
        return false;
    }
}

// Supprimer le fichier du jour
export async function deleteTodayImage() {
    try {
        const { doc, deleteDoc, getDoc } = window.firebaseFunctions;
        
        const todayKey = getTodayKey();
        
        // Essayer d'abord menu_files
        const fileDocRef = doc(appState.db, "menu_files", todayKey);
        const fileDocSnap = await getDoc(fileDocRef);
        
        if (fileDocSnap.exists()) {
            await deleteDoc(fileDocRef);
            return true;
        }
        
        // Sinon essayer menu_images
        const imageDocRef = doc(appState.db, "menu_images", todayKey);
        const imageDocSnap = await getDoc(imageDocRef);
        
        if (imageDocSnap.exists()) {
            await deleteDoc(imageDocRef);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Erreur suppression fichier:', error);
        return false;
    }
}

// Générer une URL de transformation Cloudinary (pour images uniquement)
export function getTransformedImageURL(originalURL, transformations = {}) {
    try {
        // Ne pas transformer les PDF
        if (originalURL.includes('/raw/upload/') || originalURL.includes('.pdf')) {
            return originalURL;
        }
        
        const {
            width = 'auto',
            height = 'auto',
            crop = 'fill',
            quality = 'auto',
            format = 'auto'
        } = transformations;
        
        const urlParts = originalURL.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        
        if (uploadIndex === -1) return originalURL;
        
        const transformString = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
        
        const newUrlParts = [
            ...urlParts.slice(0, uploadIndex + 1),
            transformString,
            ...urlParts.slice(uploadIndex + 1)
        ];
        
        return newUrlParts.join('/');
        
    } catch (error) {
        console.error('Erreur transformation image:', error);
        return originalURL;
    }
}

// Générer une URL d'aperçu optimisée (seulement pour images)
export function getPreviewImageURL(originalURL) {
    return getTransformedImageURL(originalURL, {
        width: 300,
        height: 200,
        crop: 'fill',
        quality: '80',
        format: 'auto'
    });
}

// Générer une URL d'image pour la modal (seulement pour images)
export function getModalImageURL(originalURL) {
    return getTransformedImageURL(originalURL, {
        width: 800,
        height: 600,
        crop: 'limit',
        quality: 'auto',
        format: 'auto'
    });
}

// Générer un thumbnail PDF via Cloudinary
export function getPDFThumbnail(pdfURL) {
    try {
        if (pdfURL.includes('cloudinary.com') && pdfURL.includes('.pdf')) {
            const parts = pdfURL.split('/upload/');
            if (parts.length === 2) {
                // Transformer première page PDF en JPG
                return `${parts[0]}/upload/w_300,h_400,c_fill,f_jpg,pg_1/${parts[1]}`;
            }
        }
        return null;
    } catch (error) {
        console.error('Erreur génération thumbnail PDF:', error);
        return null;
    }
}