// image_menu_service.js - Version corrigée

import {
    CLOUDINARY_CONFIG,
    IMAGE_CONFIG,
    appState,
    UTILS
} from './config.js';

// Variable pour stocker l'URL de l'image actuelle
let currentImageURL = IMAGE_CONFIG.IMAGE_URL;

/**
 * INITIALISATION DU SERVICE - CORRECTION PRINCIPALE
 */
export async function initImageService() {
    console.log('🖼️ Initialisation du service d\'images...');
    
    // Exposer les fonctions globalement
    exposeImageFunctions();
    
    // Charger l'image de la semaine immédiatement
    await loadTodayImage();
    
    // S'assurer que l'image est mise à jour dans l'interface
    updateImageInInterface();
    
    console.log('✅ Service d\'images initialisé');
}

/**
 * CHARGEMENT DE L'IMAGE DU JOUR - FONCTION CORRIGÉE
 */
export async function loadTodayImage() {
    try {
        console.log('📷 Chargement de l\'image de la semaine...');
        
        const imageURL = await getTodayImageURL();
        
        if (imageURL) {
            console.log('✅ Image trouvée dans Cloudinary:', imageURL);
            
            // Mettre à jour l'URL courante
            currentImageURL = imageURL;
            appState.currentImageURL = imageURL;
            
            // Utiliser l'image avec transformation pour la modal
            const modalImageURL = getModalImageURL(imageURL);
            updateMenuImage(modalImageURL);
            
            // Mettre à jour l'affichage admin si connecté
            if (appState.isAdminLoggedIn) {
                const previewImageURL = getPreviewImageURL(imageURL);
                updateCurrentImageDisplay(previewImageURL, imageURL);
            }
            
            console.log('✅ Image de la semaine mise à jour');
            return imageURL;
        } else {
            console.log('📷 Aucune image personnalisée, utilisation de l\'image par défaut');
            
            // Utiliser l'image par défaut
            currentImageURL = IMAGE_CONFIG.IMAGE_URL;
            appState.currentImageURL = IMAGE_CONFIG.IMAGE_URL;
            updateMenuImage(IMAGE_CONFIG.IMAGE_URL);
            
            if (appState.isAdminLoggedIn) {
                updateCurrentImageDisplay(null);
            }
            
            return null;
        }
    } catch (error) {
        console.error('❌ Erreur chargement image:', error);
        
        // Fallback vers image par défaut
        currentImageURL = IMAGE_CONFIG.IMAGE_URL;
        appState.currentImageURL = IMAGE_CONFIG.IMAGE_URL;
        updateMenuImage(IMAGE_CONFIG.IMAGE_URL);
        
        if (appState.isAdminLoggedIn) {
            updateCurrentImageDisplay(null);
        }
        
        return null;
    }
}

/**
 * FONCTION POUR METTRE À JOUR L'INTERFACE
 */
function updateImageInInterface() {
    // Mettre à jour le bouton "Voir le menu"
    const viewImageBtn = document.getElementById('viewImageBtn');
    if (viewImageBtn) {
        viewImageBtn.disabled = false;
        viewImageBtn.style.opacity = '1';
    }
    
    // S'assurer que l'image est visible dans la modal
    const modalImage = document.getElementById('modalImage');
    if (modalImage && currentImageURL) {
        modalImage.src = currentImageURL;
    }
}

/**
 * RÉCUPÉRATION DE L'IMAGE DU JOUR DEPUIS FIREBASE
 */
export async function getTodayImageURL() {
    try {
        if (!appState.db) {
            console.warn('⚠️ Base de données non initialisée');
            return null;
        }

        const menuKey = UTILS.getCurrentMenuKey();

        // Utiliser les fonctions Firebase exposées globalement
        const { doc, getDoc } = window.firebaseFunctions;
        const imageDocRef = doc(appState.db, "menu_images", menuKey);
        
        const docSnap = await getDoc(imageDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('📄 Document image trouvé:', data);
            
            // Vérifier si l'image existe toujours sur Cloudinary
            const isValid = await validateCloudinaryImage(data.imageURL);
            if (isValid) {
                return data.imageURL;
            } else {
                console.warn('⚠️ Image non accessible sur Cloudinary, nettoyage...');
                await deleteImageRecord(menuKey);
                return null;
            }
        } else {
            console.log('📄 Aucun document image pour cette semaine');
            return null;
        }
        
    } catch (error) {
        console.error('❌ Erreur récupération image:', error);
        return null;
    }
}

/**
 * FONCTIONS UTILITAIRES
 */
async function validateCloudinaryImage(imageURL) {
    try {
        const response = await fetch(imageURL, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error('Erreur validation image:', error);
        return false;
    }
}

async function deleteImageRecord(dateKey) {
    try {
        const { doc, deleteDoc } = window.firebaseFunctions;
        const imageDocRef = doc(appState.db, "menu_images", dateKey);
        await deleteDoc(imageDocRef);
        return true;
    } catch (error) {
        console.error('Erreur suppression enregistrement:', error);
        return false;
    }
}

// Mettre à jour l'image du menu dans l'interface
export function updateMenuImage(imageURL) {
    currentImageURL = imageURL;
    appState.currentImageURL = imageURL;
    
    // Mettre à jour l'image dans la modal
    const modalImage = document.getElementById('modalImage');
    if (modalImage) {
        modalImage.src = imageURL;
        modalImage.onerror = function() {
            console.warn('⚠️ Erreur chargement image, fallback vers défaut');
            this.src = IMAGE_CONFIG.IMAGE_URL;
        };
    }
    
    console.log('🖼️ Image du menu mise à jour:', imageURL);
}

// Reste des fonctions existantes...
export function previewImage() {
    const fileInput = document.getElementById('imageUpload');
    const preview = document.getElementById('imagePreview');
    const uploadBtn = document.getElementById('uploadBtn');
    const file = fileInput.files[0];
    
    if (file) {
        // Vérifier le type de fichier
        if (!IMAGE_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
            alert('Veuillez sélectionner un fichier image valide (JPG, PNG, GIF, WebP)');
            fileInput.value = '';
            return;
        }
        
        // Vérifier la taille
        if (file.size > IMAGE_CONFIG.MAX_IMAGE_SIZE) {
            alert('L\'image est trop volumineuse (max 5MB)');
            fileInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Aperçu :</p>
                <img src="${e.target.result}" alt="Aperçu" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd;">
                <p style="color: #999; font-size: 10px; margin-top: 5px;">Fichier: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
            `;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
        
        // Activer le bouton d'upload
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }
    } else {
        clearImagePreview();
    }
}

export function clearImagePreview() {
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

// Upload vers Cloudinary
export async function uploadImage() {
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Veuillez sélectionner une image');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn.textContent;
    uploadBtn.disabled = true;
    uploadBtn.textContent = '📤 Upload en cours...';
    
    try {
        console.log('📄 Début upload vers Cloudinary...');
        
        const formData = new FormData();
        const menuKey = UTILS.getCurrentMenuKey();
        const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const publicId = `menu_${menuKey}_${uniqueId}`;
        
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('public_id', publicId);
        formData.append('folder', CLOUDINARY_CONFIG.folder);
        
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
        }
        
        console.log('✅ Upload réussi:', data.secure_url);
        
        // Sauvegarder l'URL dans Firebase
        const saved = await saveImageURLToDatabase(menuKey, data.secure_url, data.public_id);
        
        if (saved) {
            // Mettre à jour l'interface
            updateMenuImage(data.secure_url);
            updateCurrentImageDisplay(getPreviewImageURL(data.secure_url), data.secure_url);
            
            // Nettoyer le formulaire
            fileInput.value = '';
            clearImagePreview();
            
            alert('✅ Image uploadée avec succès !');
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

// Sauvegarder l'URL dans Firebase
async function saveImageURLToDatabase(dateKey, imageURL, publicId) {
    try {
        if (!appState.db) {
            console.error('❌ Base de données non initialisée');
            return false;
        }

        const { doc, setDoc } = window.firebaseFunctions;
        const imageDocRef = doc(appState.db, "menu_images", dateKey);
        
        await setDoc(imageDocRef, {
            imageURL: imageURL,
            publicId: publicId,
            uploadDate: new Date().toISOString(),
            date: dateKey,
            provider: 'cloudinary'
        });
        
        console.log('✅ URL image sauvegardée en base');
        return true;
    } catch (error) {
        console.error('❌ Erreur sauvegarde URL image:', error);
        return false;
    }
}

// Fonctions de transformation Cloudinary
export function getTransformedImageURL(originalURL, transformations = {}) {
    try {
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

export function getPreviewImageURL(originalURL) {
    return getTransformedImageURL(originalURL, IMAGE_CONFIG.CLOUDINARY_TRANSFORMS.preview);
}

export function getModalImageURL(originalURL) {
    return getTransformedImageURL(originalURL, IMAGE_CONFIG.CLOUDINARY_TRANSFORMS.modal);
}

export function updateCurrentImageDisplay(previewImageURL, originalURL = null) {
    const currentImageDiv = document.getElementById('currentImageDisplay');
    
    if (!currentImageDiv) {
        console.warn('Élément currentImageDisplay non trouvé');
        return;
    }
    
    if (previewImageURL) {
        currentImageDiv.innerHTML = `
            <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Image actuelle de la semaine :</p>
            <img src="${previewImageURL}" alt="Menu actuel" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd; cursor: pointer;" 
                 onclick="showImageDetails('${originalURL || previewImageURL}')"
                 title="Cliquez pour voir les détails">
            <p style="color: #999; font-size: 10px; margin-top: 5px;">✅ Hébergé </p>
        `;
    } else {
        currentImageDiv.innerHTML = `
            <p style="color: #999; font-size: 12px; font-style: italic;">Image par défaut utilisée</p>
            <p style="color: #ccc; font-size: 10px;">Aucune image uploadée cette semaine</p>
        `;
    }
}

export function refreshCurrentImage() {
    console.log('🔄 Actualisation de l\'image...');
    loadTodayImage().then(() => {
        alert('✅ Image actualisée !');
    });
}

export function showImageDetails(imageURL) {
    const details = `URL de l'image: ${imageURL}

Transformations disponibles:
- Aperçu: ${IMAGE_CONFIG.CLOUDINARY_TRANSFORMS.preview.width}x${IMAGE_CONFIG.CLOUDINARY_TRANSFORMS.preview.height}
- Modal: ${IMAGE_CONFIG.CLOUDINARY_TRANSFORMS.modal.width}x${IMAGE_CONFIG.CLOUDINARY_TRANSFORMS.modal.height}

L'image est automatiquement optimisée par Cloudinary.`;
    alert(details);
}

// Exposer les fonctions globalement
function exposeImageFunctions() {
    window.previewImage = previewImage;
    window.uploadImage = uploadImage;
    window.refreshCurrentImage = refreshCurrentImage;
    window.showImageDetails = showImageDetails;
    window.loadTodayImage = loadTodayImage;
    
    console.log('✅ Fonctions image exposées globalement');
}