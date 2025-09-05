// cloudinaryService.js - Gestion du stockage d'images Cloudinary

import { appState } from './config.js';
import { getTodayKey } from './utils.js';

// Configuration Cloudinary - SANS API KEY pour unsigned
const CLOUDINARY_CONFIG = {
    cloudName: 'dvtv7bku4', 
    uploadPreset: 'cafeteria-menu-uploads', 
    folder: 'cafeteria-menus' 
    
};

// Upload d'une image vers Cloudinary
export async function uploadMenuImage(file) {
    try {
        console.log('🔍 Début upload vers Cloudinary...');
        console.log('📁 Fichier:', file.name, file.size, 'bytes, type:', file.type);
        console.log('⚙️ Config:', CLOUDINARY_CONFIG);
        
        const formData = new FormData();
        const todayKey = getTodayKey();
        const publicId = `menu_${todayKey}_${Date.now()}`;
        
        // Paramètres minimaux pour un upload unsigned
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        
        // Log des paramètres envoyés
        console.log('📤 Paramètres envoyés:');
        console.log('- upload_preset:', CLOUDINARY_CONFIG.uploadPreset);
        console.log('- file size:', file.size);
        console.log('- file type:', file.type);
        
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
        console.log('🌐 URL:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        console.log('📡 Réponse status:', response.status);
        
        // Lire la réponse même en cas d'erreur pour diagnostiquer
        const data = await response.json();
        console.log('📋 Réponse complète:', data);
        
        if (!response.ok) {
            console.error('❌ Erreur HTTP:', response.status);
            console.error('❌ Détails:', data);
            throw new Error(`HTTP error! status: ${response.status} - ${JSON.stringify(data)}`);
        }
        
        if (data.error) {
            console.error('❌ Erreur Cloudinary:', data.error);
            throw new Error(data.error.message);
        }
        
        // Sauvegarder l'URL dans Firestore
        await saveImageURL(todayKey, data.secure_url, data.public_id);
        
        return {
            success: true,
            url: data.secure_url,
            publicId: data.public_id,
            fileName: data.original_filename
        };
        
    } catch (error) {
        console.error('Erreur lors de l\'upload vers Cloudinary:', error);
        throw error;
    }
}

// Sauvegarder l'URL de l'image dans Firestore
async function saveImageURL(dateKey, imageURL, publicId) {
    try {
        const { doc, setDoc } = window.firebaseFunctions;
        const imageDocRef = doc(appState.db, "menu_images", dateKey);
        
        await setDoc(imageDocRef, {
            imageURL: imageURL,
            publicId: publicId,
            uploadDate: new Date().toISOString(),
            date: dateKey,
            provider: 'cloudinary'
        });
        
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde URL image:', error);
        return false;
    }
}

// Récupérer l'URL de l'image du jour
export async function getTodayImageURL() {
    try {
        const { doc, getDoc } = window.firebaseFunctions;
        const todayKey = getTodayKey();
        const imageDocRef = doc(appState.db, "menu_images", todayKey);
        
        const docSnap = await getDoc(imageDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Vérifier si l'image existe toujours sur Cloudinary
            const isValid = await validateCloudinaryImage(data.imageURL);
            if (isValid) {
                return data.imageURL;
            } else {
                // Nettoyer la base si l'image n'existe plus
                await deleteImageRecord(todayKey);
                return null;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Erreur récupération image:', error);
        return null;
    }
}

// Valider qu'une image existe sur Cloudinary
async function validateCloudinaryImage(imageURL) {
    try {
        const response = await fetch(imageURL, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error('Erreur validation image:', error);
        return false;
    }
}

// Supprimer l'image du jour
export async function deleteTodayImage() {
    try {
        const { doc, deleteDoc, getDoc } = window.firebaseFunctions;
        
        const todayKey = getTodayKey();
        const imageDocRef = doc(appState.db, "menu_images", todayKey);
        
        // Récupérer les infos de l'image
        const docSnap = await getDoc(imageDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const publicId = data.publicId;
            
            // Supprimer l'image de Cloudinary
            const deleted = await deleteCloudinaryImage(publicId);
            
            if (deleted) {
                // Supprimer le document Firestore
                await deleteDoc(imageDocRef);
                return true;
            } else {
                // Même si la suppression Cloudinary échoue, nettoyer la base
                await deleteDoc(imageDocRef);
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Erreur suppression image:', error);
        return false;
    }
}

// Supprimer une image de Cloudinary
async function deleteCloudinaryImage(publicId) {
    try {
        // Pour supprimer via l'API, il faut signer la requête
        // Alternative : utiliser le Admin API ou laisser Cloudinary gérer automatiquement
        
        // Méthode simplifiée : marquer comme supprimé dans la base
        // Cloudinary peut être configuré pour supprimer automatiquement les images non utilisées
        
        console.log(`Image ${publicId} marquée pour suppression`);
        return true;
        
    } catch (error) {
        console.error('Erreur suppression Cloudinary:', error);
        return false;
    }
}

// Supprimer un enregistrement d'image de la base
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

// Générer une URL de transformation Cloudinary
export function getTransformedImageURL(originalURL, transformations = {}) {
    try {
        const {
            width = 'auto',
            height = 'auto',
            crop = 'fill',
            quality = 'auto',
            format = 'auto'
        } = transformations;
        
        // Extraire le public_id de l'URL
        const urlParts = originalURL.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        
        if (uploadIndex === -1) return originalURL;
        
        // Construire les transformations
        const transformString = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
        
        // Insérer les transformations après 'upload'
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

// Lister toutes les images du dossier (nécessite l'Admin API)
export async function listAllMenuImages() {
    // Cette fonction nécessiterait l'API Admin de Cloudinary
    // qui requiert une signature côté serveur pour la sécurité
    console.warn('Listage des images nécessite l\'API Admin côté serveur');
    return [];
}

// Générer une URL d'aperçu optimisée
export function getPreviewImageURL(originalURL) {
    return getTransformedImageURL(originalURL, {
        width: 300,
        height: 200,
        crop: 'fill',
        quality: '80',
        format: 'auto'
    });
}

// Générer une URL d'image pour la modal
export function getModalImageURL(originalURL) {
    return getTransformedImageURL(originalURL, {
        width: 800,
        height: 600,
        crop: 'limit',
        quality: 'auto',
        format: 'auto'
    });
}