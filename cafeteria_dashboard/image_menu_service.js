// image_menu_service.js - SUPPORT COMPLET BILINGUE + PDF
// Gère les images ET les PDF pour FR et NL

import { 
    CLOUDINARY_CONFIG,
    FILE_CONFIG,
    UTILS,
    appState 
} from './config.js';

// ===== VARIABLES GLOBALES =====

// Variables anciennes (compatibilité)
let currentFileURL = FILE_CONFIG.DEFAULT_IMAGE_URL;
let currentFileType = 'image';

// NOUVEAU : Stockage bilingue
let currentFiles = {
    fr: {
        url: FILE_CONFIG.DEFAULT_IMAGE_URL,
        type: 'image',
        publicId: null
    },
    nl: {
        url: FILE_CONFIG.DEFAULT_IMAGE_URL,
        type: 'image',
        publicId: null
    }
};

// ===== INITIALISATION =====

/**
 * Initialisation du service
 */
export async function initImageService() {
    console.log('🖼️ Initialisation du service de fichiers (images + PDF bilingue)...');
    
    exposeImageFunctions();
    await loadTodayImage();
    updateImageInInterface();
    
    console.log('✅ Service de fichiers initialisé');
}

// ===== CHARGEMENT DES FICHIERS =====

/**
 * Charger les fichiers du jour (version adaptée pour bilingue)
 */
export async function loadTodayImage() {
    try {
        console.log('📄 Chargement des fichiers du jour...');
        
        // Si on est dans le dashboard admin, charger en mode bilingue
        if (appState.isAdminLoggedIn) {
            console.log('👤 Mode admin : chargement bilingue');
            return await loadTodayImagesBilingual();
        }
        
        // Sinon, charger normalement (pour compatibilité)
        console.log('👤 Mode public : chargement standard');
        const fileData = await getTodayImageURL();
        
        if (fileData && fileData.url) {
            console.log('✅ Fichier trouvé:', fileData);
            
            currentFileURL = fileData.url;
            currentFileType = fileData.type;
            appState.currentImageURL = fileData.url;
            appState.currentFileType = fileData.type;
            
            updateMenuImage(fileData.url, fileData.type);
            
            if (appState.isAdminLoggedIn) {
                updateCurrentImageDisplay(fileData.url, fileData.type);
            }
            
            return fileData;
        } else {
            console.log('📄 Aucun fichier personnalisé, utilisation par défaut');
            
            currentFileURL = FILE_CONFIG.DEFAULT_IMAGE_URL;
            currentFileType = 'image';
            appState.currentImageURL = FILE_CONFIG.DEFAULT_IMAGE_URL;
            appState.currentFileType = 'image';
            
            updateMenuImage(FILE_CONFIG.DEFAULT_IMAGE_URL, 'image');
            
            if (appState.isAdminLoggedIn) {
                updateCurrentImageDisplay(null, 'image');
            }
            
            return null;
        }
    } catch (error) {
        console.error('❌ Erreur chargement fichier:', error);
        
        currentFileURL = FILE_CONFIG.DEFAULT_IMAGE_URL;
        currentFileType = 'image';
        appState.currentImageURL = FILE_CONFIG.DEFAULT_IMAGE_URL;
        appState.currentFileType = 'image';
        
        updateMenuImage(FILE_CONFIG.DEFAULT_IMAGE_URL, 'image');
        
        return null;
    }
}

/**
 * NOUVELLE FONCTION : Charger les deux fichiers du jour (FR + NL)
 */
export async function loadTodayImagesBilingual() {
    try {
        console.log('📂 Chargement des fichiers FR et NL...');
        
        const fileData = await getTodayImageURLBilingual();
        
        // Mettre à jour FR
        if (fileData.fr && fileData.fr.url) {
            currentFiles.fr = fileData.fr;
            updateCurrentImageDisplayBilingual('fr', fileData.fr.url, fileData.fr.type);
            console.log('✅ Fichier FR chargé:', fileData.fr.url.substring(0, 50) + '...');
        } else {
            currentFiles.fr = {
                url: FILE_CONFIG.DEFAULT_IMAGE_URL,
                type: 'image',
                publicId: null
            };
            updateCurrentImageDisplayBilingual('fr', null, 'image');
            console.log('📷 Aucun fichier FR, utilisation par défaut');
        }
        
        // Mettre à jour NL
        if (fileData.nl && fileData.nl.url) {
            currentFiles.nl = fileData.nl;
            updateCurrentImageDisplayBilingual('nl', fileData.nl.url, fileData.nl.type);
            console.log('✅ Fichier NL chargé:', fileData.nl.url.substring(0, 50) + '...');
        } else {
            currentFiles.nl = {
                url: FILE_CONFIG.DEFAULT_IMAGE_URL,
                type: 'image',
                publicId: null
            };
            updateCurrentImageDisplayBilingual('nl', null, 'image');
            console.log('📷 Aucun fichier NL, utilisation par défaut');
        }
        
        console.log('✅ Chargement bilingue terminé');
        return fileData;
        
    } catch (error) {
        console.error('❌ Erreur chargement bilingue:', error);
        return { fr: null, nl: null };
    }
}

// ===== RÉCUPÉRATION DEPUIS FIREBASE =====

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
        console.error(`❌ Erreur récupération dernier document (${collectionName}):`, error);
        return null;
    }
}

function formatMenuFilesData(data = {}) {
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

function formatLegacyData(data = {}) {
    const fallback = {
        url: data.imageURL || data.url || null,
        type: 'image',
        publicId: data.publicId || null
    };

    return { fr: fallback, nl: fallback };
}

/**
 * Récupérer le fichier depuis Firebase (version ancienne, compatibilité)
 */
async function getTodayImageURL() {
    try {
        if (!appState.db) {
            console.warn('⚠️ Base de données non initialisée');
            return null;
        }

        const todayKey = UTILS.getTodayKey();
        const { doc, getDoc } = window.firebaseFunctions || {};

        // 1. Essayer d'abord la nouvelle collection "menu_files"
        const fileDocRef = doc(appState.db, "menu_files", todayKey);
        const fileDocSnap = await getDoc(fileDocRef);

        if (fileDocSnap.exists()) {
            const data = fileDocSnap.data();
            console.log('📄 Document fichier trouvé dans menu_files');

            // Priorité au français si disponible
            if (data.fileURL_fr) {
                return {
                    url: data.fileURL_fr,
                    type: data.fileType_fr || 'image',
                    publicId: data.publicId_fr
                };
            } else if (data.fileURL) {
                // Ancien format
                return {
                    url: data.fileURL,
                    type: data.fileType || 'image',
                    publicId: data.publicId
                };
            }
        }

        // 1.bis : utiliser le dernier fichier disponible
        const latestMenuFile = await fetchLatestDocument('menu_files');
        if (latestMenuFile) {
            console.log(`📚 Utilisation du dernier fichier menu_files (${latestMenuFile.id})`);
            const formatted = formatMenuFilesData(latestMenuFile.data);
            return formatted.fr.url
                ? { ...formatted.fr }
                : formatted.nl;
        }

        // 2. Si pas trouvé, essayer l'ancienne collection "menu_images"
        console.log('📋 Tentative dans menu_images (compatibilité)...');
        const imageDocRef = doc(appState.db, "menu_images", todayKey);
        const imageDocSnap = await getDoc(imageDocRef);

        if (imageDocSnap.exists()) {
            const data = imageDocSnap.data();
            console.log('📄 Document image trouvé dans menu_images');

            return {
                url: data.imageURL,
                type: 'image',
                publicId: data.publicId
            };
        }

        // 2.bis : utiliser la dernière image legacy disponible
        const latestLegacyImage = await fetchLatestDocument('menu_images');
        if (latestLegacyImage) {
            console.log(`🗂️ Utilisation de l'image legacy ${latestLegacyImage.id}`);
            const formatted = formatLegacyData(latestLegacyImage.data);
            return formatted.fr;
        }

        console.log('📄 Aucun document trouvé pour aujourd\'hui');
        return null;

    } catch (error) {
        console.error('❌ Erreur récupération fichier:', error);
        return null;
    }
}

/**
 * NOUVELLE FONCTION : Récupérer les deux fichiers depuis Firebase
 */
async function getTodayImageURLBilingual() {
    try {
        if (!appState.db) {
            console.warn('⚠️ Base de données non initialisée');
            return { fr: null, nl: null };
        }

        const todayKey = UTILS.getTodayKey();
        const { doc, getDoc } = window.firebaseFunctions || {};

        const fileDocRef = doc(appState.db, "menu_files", todayKey);
        const fileDocSnap = await getDoc(fileDocRef);

        if (fileDocSnap.exists()) {
            const data = fileDocSnap.data();
            console.log('📄 Document bilingue trouvé:', data);

            return formatMenuFilesData(data);
        }

        // 1.bis : tenter de récupérer le dernier document disponible
        const latestMenuFile = await fetchLatestDocument('menu_files');
        if (latestMenuFile) {
            console.log(`📚 Utilisation du dernier fichier bilingue (${latestMenuFile.id})`);
            return formatMenuFilesData(latestMenuFile.data);
        }

        console.log('📭 Aucun document bilingue trouvé');
        return { fr: null, nl: null };

    } catch (error) {
        console.error('❌ Erreur récupération bilingue:', error);
        return { fr: null, nl: null };
    }
}

// ===== PRÉVISUALISATION =====

/**
 * Prévisualisation du fichier (version ancienne)
 */
export function previewImage() {
    const fileInput = document.getElementById('imageUpload');
    const preview = document.getElementById('imagePreview');
    const uploadBtn = document.getElementById('uploadBtn');
    const file = fileInput.files[0];
    
    if (file) {
        // Vérifier le type
        if (!UTILS.validateFileType(file)) {
            alert('Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP ou PDF');
            fileInput.value = '';
            return;
        }
        
        // Vérifier la taille
        if (!UTILS.validateFileSize(file)) {
            alert('Le fichier est trop volumineux (max 10MB)');
            fileInput.value = '';
            return;
        }
        
        const fileType = UTILS.getFileType(file);
        const reader = new FileReader();
        
        reader.onload = function(e) {
            if (fileType === 'pdf') {
                preview.innerHTML = `
                    <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Aperçu PDF :</p>
                    <div style="padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                        <p style="color: #374151; font-weight: 500;">${file.name}</p>
                        <p style="color: #6b7280; font-size: 12px;">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                `;
            } else {
                preview.innerHTML = `
                    <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Aperçu :</p>
                    <img src="${e.target.result}" alt="Aperçu" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd;">
                    <p style="color: #999; font-size: 10px; margin-top: 5px;">${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                `;
            }
            preview.style.display = 'block';
        };
        
        reader.readAsDataURL(file);
        
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }
    } else {
        clearImagePreview();
    }
}

/**
 * NOUVELLE FONCTION : Prévisualisation bilingue (FR ou NL)
 */
export function previewImageBilingual(lang) {
    console.log(`🖼️ Prévisualisation fichier ${lang.toUpperCase()}`);
    
    const fileInput = document.getElementById(`imageUpload${lang.toUpperCase()}`);
    const preview = document.getElementById(`imagePreview${lang.toUpperCase()}`);
    const uploadBtn = document.getElementById(`uploadBtn${lang.toUpperCase()}`);
    const file = fileInput.files[0];
    
    if (!file) {
        clearPreviewBilingual(lang);
        return;
    }
    
    // Vérifier le type
    if (!UTILS.validateFileType(file)) {
        alert('Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP ou PDF');
        fileInput.value = '';
        clearPreviewBilingual(lang);
        return;
    }
    
    // Vérifier la taille
    if (!UTILS.validateFileSize(file)) {
        alert('Le fichier est trop volumineux (max 10MB)');
        fileInput.value = '';
        clearPreviewBilingual(lang);
        return;
    }
    
    const fileType = UTILS.getFileType(file);
    const reader = new FileReader();
    
    reader.onload = function(e) {
        if (fileType === 'pdf') {
            preview.innerHTML = `
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Aperçu PDF ${lang.toUpperCase()} :</p>
                <div style="padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                    <p style="color: #374151; font-weight: 500;">${file.name}</p>
                    <p style="color: #6b7280; font-size: 12px;">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
            `;
        } else {
            preview.innerHTML = `
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Aperçu ${lang.toUpperCase()} :</p>
                <img src="${e.target.result}" alt="Aperçu ${lang}" style="max-width: 100%; max-height: 150px; border-radius: 8px; border: 1px solid #ddd;">
                <p style="color: #999; font-size: 10px; margin-top: 5px;">${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
            `;
        }
        preview.style.display = 'block';
    };
    
    reader.readAsDataURL(file);
    
    if (uploadBtn) {
        uploadBtn.disabled = false;
    }
}

// ===== UPLOAD VERS CLOUDINARY =====

/**
 * Upload vers Cloudinary (version ancienne)
 */
export async function uploadImage() {
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Veuillez sélectionner un fichier');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⬆️ Upload en cours...';
    
    try {
        console.log('📤 Début upload vers Cloudinary...');
        
        const fileType = UTILS.getFileType(file);
        const formData = new FormData();
        const todayKey = UTILS.getTodayKey();
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const publicId = `menu_${todayKey}_${uniqueId}`;
        
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('public_id', publicId);
        formData.append('folder', CLOUDINARY_CONFIG.folder);
        
        if (fileType === 'pdf') {
            formData.append('resource_type', 'raw');
        }
        
        const resourceType = fileType === 'pdf' ? 'raw' : 'image';
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
        
        console.log(`🌐 Upload vers: ${url} (type: ${resourceType})`);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
        }
        
        console.log('✅ Upload réussi:', data.secure_url);
        
        const saved = await saveImageURLToDatabase(todayKey, data.secure_url, data.public_id, fileType);
        
        if (saved) {
            updateMenuImage(data.secure_url, fileType);
            updateCurrentImageDisplay(data.secure_url, fileType);
            
            fileInput.value = '';
            clearImagePreview();
            
            alert('✅ Fichier uploadé avec succès !');
        } else {
            throw new Error('Erreur lors de la sauvegarde en base de données');
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'upload:', error);
        alert('❌ Erreur lors de l\'upload: ' + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
    }
}

/**
 * NOUVELLE FONCTION : Upload bilingue (FR ou NL)
 */
export async function uploadImageBilingual(lang) {
    console.log(`📤 Upload fichier ${lang.toUpperCase()}`);
    
    const fileInput = document.getElementById(`imageUpload${lang.toUpperCase()}`);
    const uploadBtn = document.getElementById(`uploadBtn${lang.toUpperCase()}`);
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Veuillez sélectionner un fichier');
        return;
    }
    
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⬆️ Upload en cours...';
    
    try {
        console.log(`📤 Début upload ${lang.toUpperCase()} vers Cloudinary...`);
        
        const fileType = UTILS.getFileType(file);
        const formData = new FormData();
        const todayKey = UTILS.getTodayKey();
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const publicId = `menu_${todayKey}_${lang}_${uniqueId}`;
        
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('public_id', publicId);
        formData.append('folder', CLOUDINARY_CONFIG.folder);
        
        if (fileType === 'pdf') {
            formData.append('resource_type', 'raw');
        }
        
        const resourceType = fileType === 'pdf' ? 'raw' : 'image';
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
        
        console.log(`🌐 Upload vers: ${url} (type: ${resourceType})`);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
        }
        
        console.log(`✅ Upload ${lang.toUpperCase()} réussi:`, data.secure_url);
        
        const saved = await saveImageURLBilingual(todayKey, lang, data.secure_url, data.public_id, fileType);
        
        if (saved) {
            currentFiles[lang] = {
                url: data.secure_url,
                type: fileType,
                publicId: data.public_id
            };
            
            updateCurrentImageDisplayBilingual(lang, data.secure_url, fileType);
            
            fileInput.value = '';
            clearPreviewBilingual(lang);
            
            alert(`✅ Fichier ${lang.toUpperCase()} uploadé avec succès !`);
        } else {
            throw new Error('Erreur lors de la sauvegarde en base de données');
        }
        
    } catch (error) {
        console.error(`❌ Erreur upload ${lang.toUpperCase()}:`, error);
        alert(`❌ Erreur lors de l'upload ${lang.toUpperCase()}: ` + error.message);
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = originalText;
    }
}

// ===== SAUVEGARDE DANS FIREBASE =====

/**
 * Sauvegarder dans Firebase (version ancienne)
 */
async function saveImageURLToDatabase(dateKey, fileURL, publicId, fileType) {
    try {
        if (!appState.db) {
            console.error('❌ Base de données non initialisée');
            return false;
        }

        const { doc, setDoc } = window.firebaseFunctions;
        const fileDocRef = doc(appState.db, "menu_files", dateKey);
        
        await setDoc(fileDocRef, {
            fileURL: fileURL,
            publicId: publicId,
            fileType: fileType,
            uploadDate: new Date().toISOString(),
            date: dateKey,
            provider: 'cloudinary'
        });
        
        console.log('✅ URL fichier sauvegardée dans menu_files');
        return true;
    } catch (error) {
        console.error('❌ Erreur sauvegarde URL fichier:', error);
        return false;
    }
}

/**
 * NOUVELLE FONCTION : Sauvegarder dans Firebase (version bilingue)
 */
async function saveImageURLBilingual(dateKey, lang, fileURL, publicId, fileType) {
    try {
        if (!appState.db) {
            console.error('❌ Base de données non initialisée');
            return false;
        }

        const { doc, setDoc, getDoc } = window.firebaseFunctions;
        const fileDocRef = doc(appState.db, "menu_files", dateKey);
        
        // Charger le document existant pour ne pas écraser l'autre langue
        const docSnap = await getDoc(fileDocRef);
        const existingData = docSnap.exists() ? docSnap.data() : {};
        
        // Préparer les nouvelles données
        const updatedData = {
            ...existingData,
            [`fileURL_${lang}`]: fileURL,
            [`publicId_${lang}`]: publicId,
            [`fileType_${lang}`]: fileType,
            [`uploadDate_${lang}`]: new Date().toISOString(),
            date: dateKey,
            provider: 'cloudinary',
            lastUpdated: new Date().toISOString()
        };
        
        await setDoc(fileDocRef, updatedData);
        
        console.log(`✅ URL fichier ${lang.toUpperCase()} sauvegardée dans menu_files`);
        return true;
    } catch (error) {
        console.error(`❌ Erreur sauvegarde URL fichier ${lang.toUpperCase()}:`, error);
        return false;
    }
}

// ===== AFFICHAGE =====

/**
 * Mettre à jour l'affichage du menu
 */
export function updateMenuImage(fileURL, fileType) {
    currentFileURL = fileURL;
    currentFileType = fileType;
    appState.currentImageURL = fileURL;
    appState.currentFileType = fileType;
    
    console.log('🖼️ Mise à jour affichage menu:', { fileURL, fileType });
    
    if (window.updateModalContent) {
        window.updateModalContent(fileURL, fileType);
    }
}

/**
 * Afficher le fichier actuel dans l'admin (version ancienne)
 */
function updateCurrentImageDisplay(fileURL, fileType) {
    const currentImageDiv = document.getElementById('currentImageDisplay');
    
    if (!currentImageDiv) {
        return;
    }
    
    if (fileURL) {
        if (fileType === 'pdf') {
            const thumbnailURL = getPDFThumbnail(fileURL);
            currentImageDiv.innerHTML = `
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Fichier actuel (PDF) :</p>
                <div style="text-align: center;">
                    ${thumbnailURL ? 
                        `<img src="${thumbnailURL}" alt="Aperçu PDF" style="max-width: 200px; max-height: 150px; border-radius: 8px; cursor: pointer;" 
                             onclick="window.open('${fileURL}', '_blank')">` :
                        `<div style="padding: 20px; background: #f3f4f6; border-radius: 8px; cursor: pointer;" onclick="window.open('${fileURL}', '_blank')">
                            <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                            <p style="color: #374151; font-weight: 500;">Menu PDF</p>
                        </div>`
                    }
                </div>
                <p style="color: #999; font-size: 10px; margin-top: 5px;">✅ Type: PDF</p>
            `;
        } else {
            const previewURL = getPreviewImageURL(fileURL);
            currentImageDiv.innerHTML = `
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Image actuelle :</p>
                <img src="${previewURL}" alt="Menu actuel" style="max-width: 200px; max-height: 150px; border-radius: 8px; cursor: pointer;" 
                     onclick="window.open('${fileURL}', '_blank')">
                <p style="color: #999; font-size: 10px; margin-top: 5px;">✅ Type: Image</p>
            `;
        }
    } else {
        currentImageDiv.innerHTML = `
            <p style="color: #999; font-size: 12px; font-style: italic;">Fichier par défaut utilisé</p>
            <p style="color: #ccc; font-size: 10px;">Aucun fichier uploadé aujourd'hui</p>
        `;
    }
}

/**
 * NOUVELLE FONCTION : Afficher le fichier actuel (version bilingue)
 */
function updateCurrentImageDisplayBilingual(lang, fileURL, fileType) {
    const currentImageDiv = document.getElementById(`currentImageDisplay${lang.toUpperCase()}`);
    
    if (!currentImageDiv) {
        console.warn(`Élément currentImageDisplay${lang.toUpperCase()} non trouvé`);
        return;
    }
    
    if (fileURL) {
        if (fileType === 'pdf') {
            const thumbnailURL = getPDFThumbnail(fileURL);
            currentImageDiv.innerHTML = `
                <p style="color: #666; font-size: 11px; margin-bottom: 8px;">Fichier actuel ${lang.toUpperCase()} (PDF) :</p>
                <div style="text-align: center;">
                    ${thumbnailURL ? 
                        `<img src="${thumbnailURL}" alt="Aperçu PDF ${lang}" style="max-width: 150px; max-height: 100px; border-radius: 8px; cursor: pointer;" 
                             onclick="window.open('${fileURL}', '_blank')">` :
                        `<div style="padding: 15px; background: #f3f4f6; border-radius: 8px; cursor: pointer;" onclick="window.open('${fileURL}', '_blank')">
                            <div style="font-size: 32px; margin-bottom: 5px;">📄</div>
                            <p style="color: #374151; font-size: 12px;">Menu PDF ${lang.toUpperCase()}</p>
                        </div>`
                    }
                </div>
                <p style="color: #10b981; font-size: 10px; margin-top: 5px;">✅ Uploadé</p>
            `;
        } else {
            const previewURL = getPreviewImageURL(fileURL);
            currentImageDiv.innerHTML = `
                <p style="color: #666; font-size: 11px; margin-bottom: 8px;">Image actuelle ${lang.toUpperCase()} :</p>
                <img src="${previewURL}" alt="Menu ${lang}" style="max-width: 150px; max-height: 100px; border-radius: 8px; cursor: pointer;" 
                     onclick="window.open('${fileURL}', '_blank')">
                <p style="color: #10b981; font-size: 10px; margin-top: 5px;">✅ Uploadé</p>
            `;
        }
    } else {
        currentImageDiv.innerHTML = `
            <p style="color: #999; font-size: 11px; font-style: italic;">Aucun fichier ${lang.toUpperCase()}</p>
            <p style="color: #ccc; font-size: 10px;">Uploadez un menu</p>
        `;
    }
}

// ===== NETTOYAGE =====

/**
 * Nettoyer l'aperçu (version ancienne)
 */
function clearImagePreview() {
    const preview = document.getElementById('imagePreview');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (preview) {
        preview.innerHTML = '';
        preview.style.display = 'none';
    }
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
    }
}

/**
 * NOUVELLE FONCTION : Nettoyer l'aperçu (version bilingue)
 */
function clearPreviewBilingual(lang) {
    const preview = document.getElementById(`imagePreview${lang.toUpperCase()}`);
    const uploadBtn = document.getElementById(`uploadBtn${lang.toUpperCase()}`);
    
    if (preview) {
        preview.innerHTML = '';
        preview.style.display = 'none';
    }
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
    }
}

// ===== ACTUALISATION =====

/**
 * Actualiser l'image actuelle (version ancienne)
 */
export function refreshCurrentImage() {
    console.log('🔄 Actualisation du fichier...');
    loadTodayImage().then(() => {
        alert('✅ Fichier actualisé !');
    });
}

/**
 * NOUVELLE FONCTION : Actualiser tous les menus
 */
export async function refreshAllImages() {
    console.log('🔄 Actualisation des deux menus...');
    
    try {
        await loadTodayImagesBilingual();
        alert('✅ Les deux menus ont été actualisés !');
    } catch (error) {
        console.error('❌ Erreur actualisation:', error);
        alert('❌ Erreur lors de l\'actualisation');
    }
}

// ===== UTILITAIRES =====

/**
 * Générer un thumbnail PDF via Cloudinary
 */
function getPDFThumbnail(pdfURL) {
    try {
        if (pdfURL.includes('cloudinary.com') && pdfURL.includes('.pdf')) {
            const parts = pdfURL.split('/upload/');
            if (parts.length === 2) {
                return `${parts[0]}/upload/w_300,h_200,c_fill,f_jpg,pg_1/${parts[1]}`;
            }
        }
        return null;
    } catch (error) {
        console.error('Erreur génération thumbnail PDF:', error);
        return null;
    }
}

/**
 * Transformation image via Cloudinary
 */
function getPreviewImageURL(imageURL) {
    try {
        if (!imageURL.includes('cloudinary.com')) return imageURL;
        
        const parts = imageURL.split('/upload/');
        if (parts.length === 2) {
            const transform = 'w_300,h_200,c_fill,q_auto,f_auto';
            return `${parts[0]}/upload/${transform}/${parts[1]}`;
        }
        return imageURL;
    } catch (error) {
        return imageURL;
    }
}

/**
 * Mettre à jour l'interface
 */
function updateImageInInterface() {
    const viewBtn = document.getElementById('viewImageBtn') || document.getElementById('viewMenuBtn');
    if (viewBtn) {
        viewBtn.disabled = false;
        viewBtn.style.opacity = '1';
    }
}

/**
 * Afficher les détails d'un fichier
 */
export function showImageDetails(imageURL) {
    const details = `URL du fichier: ${imageURL}

Type: ${currentFileType}

${currentFileType === 'pdf' ? 
    'PDF hébergé sur Cloudinary' : 
    `Transformations disponibles:
- Aperçu: ${FILE_CONFIG.CLOUDINARY_TRANSFORMS.preview.width}x${FILE_CONFIG.CLOUDINARY_TRANSFORMS.preview.height}
- Modal: ${FILE_CONFIG.CLOUDINARY_TRANSFORMS.modal.width}x${FILE_CONFIG.CLOUDINARY_TRANSFORMS.modal.height}`
}`;
    alert(details);
}

// ===== EXPOSITION GLOBALE =====

/**
 * Exposer les fonctions globalement
 */
function exposeImageFunctions() {
    // Fonctions anciennes (compatibilité)
    window.previewImage = previewImage;
    window.uploadImage = uploadImage;
    window.refreshCurrentImage = refreshCurrentImage;
    window.showImageDetails = showImageDetails;
    window.loadTodayImage = loadTodayImage;
    
    // NOUVELLES FONCTIONS BILINGUES
    window.previewImageBilingual = previewImageBilingual;
    window.uploadImageBilingual = uploadImageBilingual;
    window.refreshAllImages = refreshAllImages;
    window.loadTodayImagesBilingual = loadTodayImagesBilingual;
    
    // Fonctions pour récupérer les données
    window.getCurrentFileData = () => ({
        url: currentFileURL,
        type: currentFileType
    });
    
    window.getCurrentFilesBilingual = () => currentFiles;
    
    console.log('✅ Fonctions image/PDF bilingues exposées globalement');
}