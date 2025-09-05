// firebaseStorageService.js - Gestion du stockage d'images Firebase

import { appState } from './config.js';
import { getTodayKey } from './utils.js';

let storage = null;

// Initialiser Firebase Storage
export async function initializeFirebaseStorage() {
    try {
        const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } = 
            await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js');
        
        // Récupérer l'app Firebase déjà initialisée
        const { getApp } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
        const app = getApp();
        
        storage = getStorage(app);
        
        // Exposer les fonctions Storage globalement
        window.firebaseStorageFunctions = {
            ref,
            uploadBytes,
            getDownloadURL,
            deleteObject,
            listAll
        };
        
        return true;
    } catch (error) {
        console.error("Erreur d'initialisation Firebase Storage:", error);
        return false;
    }
}

// Upload d'une image
export async function uploadMenuImage(file) {
    if (!storage) {
        throw new Error('Firebase Storage non initialisé');
    }
    
    try {
        const { ref, uploadBytes, getDownloadURL } = window.firebaseStorageFunctions;
        
        // Créer une référence unique pour l'image du jour
        const todayKey = getTodayKey();
        const fileName = `menu_${todayKey}.${file.name.split('.').pop()}`;
        const imageRef = ref(storage, `menus/${fileName}`);
        
        // Upload du fichier
        const snapshot = await uploadBytes(imageRef, file);
        console.log('Image uploadée avec succès!', snapshot);
        
        // Obtenir l'URL de téléchargement
        const downloadURL = await getDownloadURL(imageRef);
        
        // Sauvegarder l'URL dans Firestore
        await saveImageURL(todayKey, downloadURL, fileName);
        
        return {
            success: true,
            url: downloadURL,
            fileName: fileName
        };
        
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        throw error;
    }
}

// Sauvegarder l'URL de l'image dans Firestore
async function saveImageURL(dateKey, imageURL, fileName) {
    try {
        const { doc, setDoc } = window.firebaseFunctions;
        const imageDocRef = doc(appState.db, "menu_images", dateKey);
        
        await setDoc(imageDocRef, {
            imageURL: imageURL,
            fileName: fileName,
            uploadDate: new Date().toISOString(),
            date: dateKey
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
            return data.imageURL;
        }
        
        return null;
    } catch (error) {
        console.error('Erreur récupération image:', error);
        return null;
    }
}

// Supprimer l'image du jour
export async function deleteTodayImage() {
    try {
        const { ref, deleteObject } = window.firebaseStorageFunctions;
        const { doc, deleteDoc, getDoc } = window.firebaseFunctions;
        
        const todayKey = getTodayKey();
        const imageDocRef = doc(appState.db, "menu_images", todayKey);
        
        // Récupérer les infos de l'image
        const docSnap = await getDoc(imageDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            const fileName = data.fileName;
            
            // Supprimer le fichier du Storage
            const imageRef = ref(storage, `menus/${fileName}`);
            await deleteObject(imageRef);
            
            // Supprimer le document Firestore
            await deleteDoc(imageDocRef);
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Erreur suppression image:', error);
        return false;
    }
}

// Lister toutes les images disponibles (pour l'admin)
export async function listAllMenuImages() {
    try {
        const { ref, listAll, getDownloadURL } = window.firebaseStorageFunctions;
        const menusRef = ref(storage, 'menus/');
        
        const result = await listAll(menusRef);
        const images = [];
        
        for (const item of result.items) {
            const url = await getDownloadURL(item);
            images.push({
                name: item.name,
                url: url,
                fullPath: item.fullPath
            });
        }
        
        return images;
    } catch (error) {
        console.error('Erreur listage images:', error);
        return [];
    }
}