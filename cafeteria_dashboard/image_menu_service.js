// image_menu_service.js - MAINTENANT AVEC SUPPORT PDF
// ⚠️ Le nom reste "image" mais le service gère maintenant les images ET les PDF

import { 
    CLOUDINARY_CONFIG,
    FILE_CONFIG,
    UTILS,
    appState 
} from './config.js';

let currentFileURL = FILE_CONFIG.DEFAULT_IMAGE_URL;
let currentFileType = 'image';

/**
 * INITIALISATION DU SERVICE
 */
export async function initImageService() {
    console.log('🖼️ Initialisation du service de fichiers (images + PDF)...');
    
    exposeImageFunctions();
    await loadTodayImage();
    updateImageInInterface();
    
    console.log('✅ Service de fichiers initialisé');
}

/**
 * CHARGEMENT DU FICHIER DU JOUR
 * Note: La fonction s'appelle "loadTodayImage" mais charge aussi les PDF
 */
export async function loadTodayImage() {
    try {
        console.log('📄 Chargement du fichier du jour...');
        
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
            
            console.log('✅ Fichier du jour mis à jour');
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
 * RÉCUPÉRATION DU FICHIER DEPUIS FIREBASE
 * Note: Vérifie d'abord "menu_files", puis "menu_images" pour compatibilité
 */
async function getTodayImageURL() {
    try {
        if (!appState.db) {
            console.warn('⚠️ Base de données non initialisée');
            return null;
        }

        const todayKey = UTILS.getTodayKey();
        const { doc, getDoc } = window.firebaseFunctions;
        
        // 1. Essayer d'abord la nouvelle collection "menu_files" (images + PDF)
        const fileDocRef = doc(appState.db, "menu_files", todayKey);
        const fileDocSnap = await getDoc(fileDocRef);
        
        if (fileDocSnap.exists()) {
            const data = fileDocSnap.data();
            console.log('📄 Document fichier trouvé dans menu_files:', data);
            
            return {
                url: data.fileURL,
                type: data.fileType || 'image',
                publicId: data.publicId
            };
        }
        
        // 2. Si pas trouvé, essayer l'ancienne collection "menu_images" (compatibilité)
        console.log('📋 Tentative dans menu_images (compatibilité)...');
        const imageDocRef = doc(appState.db, "menu_images", todayKey);
        const imageDocSnap = await getDoc(imageDocRef);
        
        if (imageDocSnap.exists()) {
            const data = imageDocSnap.data();
            console.log('📄 Document image trouvé dans menu_images:', data);
            
            return {
                url: data.imageURL,
                type: 'image', // Les anciennes données sont toujours des images
                publicId: data.publicId
            };
        }
        
        console.log('📄 Aucun document trouvé pour aujourd\'hui');
        return null;
        
    } catch (error) {
        console.error('❌ Erreur récupération fichier:', error);
        return null;
    }
}

/**
 * PRÉVISUALISATION DU FICHIER (Image ou PDF)
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
                // Aperçu pour PDF
                preview.innerHTML = `
                    <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Aperçu PDF :</p>
                    <div style="padding: 20px; background: #f3f4f6; border-radius: 8px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                        <p style="color: #374151; font-weight: 500;">${file.name}</p>
                        <p style="color: #6b7280; font-size: 12px;">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <p style="color: #999; font-size: 10px; margin-top: 5px;">Le PDF sera visible après upload</p>
                `;
            } else {
                // Aperçu pour image
                preview.innerHTML = `
                    <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Aperçu :</p>
                    <img src="${e.target.result}" alt="Aperçu" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd;">
                    <p style="color: #999; font-size: 10px; margin-top: 5px;">Fichier: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
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
 * UPLOAD VERS CLOUDINARY (Images ET PDF)
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
    uploadBtn.textContent = '📤 Upload en cours...';
    
    try {
        console.log('📄 Début upload vers Cloudinary...');
        
        const fileType = UTILS.getFileType(file);
        const formData = new FormData();
        const todayKey = UTILS.getTodayKey();
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
        
        // Choisir l'endpoint selon le type de fichier
        const resourceType = fileType === 'pdf' ? 'raw' : 'image';
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;
        
        console.log(`📤 Upload vers: ${url} (type: ${resourceType})`);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
        }
        
        console.log('✅ Upload réussi:', data.secure_url);
        
        // Sauvegarder dans Firebase (nouvelle collection "menu_files")
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
 * SAUVEGARDER DANS FIREBASE
 * Sauvegarde dans la nouvelle collection "menu_files"
 */
async function saveImageURLToDatabase(dateKey, fileURL, publicId, fileType) {
    try {
        if (!appState.db) {
            console.error('❌ Base de données non initialisée');
            return false;
        }

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
        console.error('❌ Erreur sauvegarde URL fichier:', error);
        return false;
    }
}

/**
 * METTRE À JOUR L'AFFICHAGE DU MENU
 */
export function updateMenuImage(fileURL, fileType) {
    currentFileURL = fileURL;
    currentFileType = fileType;
    appState.currentImageURL = fileURL;
    appState.currentFileType = fileType;
    
    console.log('🖼️ Mise à jour affichage menu:', { fileURL, fileType });
    
    // Notifier la page principale si elle a une fonction d'update
    if (window.updateModalContent) {
        window.updateModalContent(fileURL, fileType);
    }
}

/**
 * AFFICHAGE DANS L'ADMIN
 */
function updateCurrentImageDisplay(fileURL, fileType) {
    const currentImageDiv = document.getElementById('currentImageDisplay');
    
    if (!currentImageDiv) {
        console.warn('Élément currentImageDisplay non trouvé');
        return;
    }
    
    if (fileURL) {
        if (fileType === 'pdf') {
            // Affichage pour PDF
            const thumbnailURL = getPDFThumbnail(fileURL);
            currentImageDiv.innerHTML = `
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Fichier actuel (PDF) :</p>
                <div style="text-align: center;">
                    ${thumbnailURL ? 
                        `<img src="${thumbnailURL}" alt="Aperçu PDF" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd; cursor: pointer;" 
                             onclick="window.open('${fileURL}', '_blank')"
                             title="Cliquez pour ouvrir le PDF">` :
                        `<div style="padding: 20px; background: #f3f4f6; border-radius: 8px; cursor: pointer;" onclick="window.open('${fileURL}', '_blank')">
                            <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                            <p style="color: #374151; font-weight: 500;">Menu PDF</p>
                        </div>`
                    }
                </div>
                <p style="color: #999; font-size: 10px; margin-top: 5px;">✅ Type: PDF</p>
            `;
        } else {
            // Affichage pour image
            const previewURL = getPreviewImageURL(fileURL);
            currentImageDiv.innerHTML = `
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Image actuelle :</p>
                <img src="${previewURL}" alt="Menu actuel" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd; cursor: pointer;" 
                     onclick="window.open('${fileURL}', '_blank')"
                     title="Cliquez pour voir en grand">
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
 * GÉNÉRATION THUMBNAIL PDF via Cloudinary
 */
function getPDFThumbnail(pdfURL) {
    try {
        if (pdfURL.includes('cloudinary.com')) {
            const parts = pdfURL.split('/upload/');
            if (parts.length === 2) {
                // Transformer première page PDF en JPG
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
 * TRANSFORMATION IMAGE via Cloudinary
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
 * FONCTIONS UTILITAIRES
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

export function refreshCurrentImage() {
    console.log('🔄 Actualisation du fichier...');
    loadTodayImage().then(() => {
        alert('✅ Fichier actualisé !');
    });
}

function updateImageInInterface() {
    const viewBtn = document.getElementById('viewImageBtn') || document.getElementById('viewMenuBtn');
    if (viewBtn) {
        viewBtn.disabled = false;
        viewBtn.style.opacity = '1';
    }
}

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

/**
 * EXPOSER LES FONCTIONS GLOBALEMENT
 */
function exposeImageFunctions() {
    window.previewImage = previewImage;
    window.uploadImage = uploadImage;
    window.refreshCurrentImage = refreshCurrentImage;
    window.showImageDetails = showImageDetails;
    window.loadTodayImage = loadTodayImage;
    
    // Fonction pour que le frontend public puisse récupérer les données
    window.getCurrentFileData = () => ({
        url: currentFileURL,
        type: currentFileType
    });
    
    console.log('✅ Fonctions image/PDF exposées globalement');
}