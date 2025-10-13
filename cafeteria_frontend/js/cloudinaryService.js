// cloudinaryService.js - Gestion des images ET PDF

import { appState } from './config.js';
import { getTodayKey } from './utils.js';

// Configuration Cloudinary
const CLOUDINARY_CONFIG = {
    cloudName: 'dvtv7bku4', 
    uploadPreset: 'cafeteria-menu-uploads', 
    folder: 'cafeteria-menus' 
};

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

// Récupérer l'URL et le type du fichier du jour
export async function getTodayFileData() {
    try {
        const { doc, getDoc } = window.firebaseFunctions;
        const todayKey = getTodayKey();
        
        // 1. Essayer d'abord la nouvelle collection "menu_files"
        const fileDocRef = doc(appState.db, "menu_files", todayKey);
        const fileDocSnap = await getDoc(fileDocRef);
        
        if (fileDocSnap.exists()) {
            const data = fileDocSnap.data();
            console.log('📄 Fichier trouvé dans menu_files:', data);
            
            return {
                url: data.fileURL,
                type: data.fileType || 'image',
                publicId: data.publicId
            };
        }
        
        // 2. Si pas trouvé, essayer l'ancienne collection "menu_images" (compatibilité)
        console.log('📋 Tentative dans menu_images...');
        const imageDocRef = doc(appState.db, "menu_images", todayKey);
        const imageDocSnap = await getDoc(imageDocRef);
        
        if (imageDocSnap.exists()) {
            const data = imageDocSnap.data();
            console.log('📄 Image trouvée dans menu_images:', data);
            
            return {
                url: data.imageURL,
                type: 'image', // Les anciennes données sont toujours des images
                publicId: data.publicId
            };
        }
        
        console.log('📄 Aucun fichier trouvé pour aujourd\'hui');
        return null;
        
    } catch (error) {
        console.error('Erreur récupération fichier:', error);
        return null;
    }
}

// Fonction de compatibilité - retourne juste l'URL (pour ne pas casser le code existant)
export async function getTodayImageURL() {
    const fileData = await getTodayFileData();
    return fileData ? fileData.url : null;
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