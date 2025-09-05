// config.js - Configuration Firebase et constantes globales avec Cloudinary

// Configuration Firebase
export const firebaseConfig = {
    apiKey: "AIzaSyAeotUUuHLEmDoQHn3wUE9iXQdA8-T6cig",
    authDomain: "cafeteria-du-foyer.firebaseapp.com",
    projectId: "cafeteria-du-foyer",
    storageBucket: "cafeteria-du-foyer.firebasestorage.app",
    messagingSenderId: "762470338871",
    appId: "1:762470338871:web:4a6380d0f5618b0c060ab2"
};

// Configuration Cloudinary - SANS API KEY pour unsigned
export const cloudinaryConfig = {
    cloudName: 'dvtv7bku4', 
    uploadPreset: 'cafeteria-menu-uploads', 
    folder: 'cafeteria-menus'
    
};

// Configuration de l'application
export const CONFIG = {
    CLOSING_HOUR: 19,
    CLOSING_MINUTE: 0,
    ADMIN_PASSWORD: "cantine2025",
    IMAGE_URL: "https://via.placeholder.com/400x300/f0f0f0/666666?text=Menu+du+Jour", // Image par défaut
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB max
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    
    // Options Cloudinary par défaut
    CLOUDINARY_TRANSFORMS: {
        thumbnail: { width: 150, height: 100, crop: 'fill', quality: '80' },
        preview: { width: 300, height: 200, crop: 'fill', quality: '80' },
        modal: { width: 800, height: 600, crop: 'limit', quality: 'auto' },
        admin: { width: 200, height: 150, crop: 'fill', quality: '70' }
    }
};

// Variables globales d'état
export let appState = {
    votes: {},
    isVotingOpen: true,
    hasVotedToday: false,
    isAdminLoggedIn: false,
    unsubscribe: null,
    db: null,
    currentImageURL: null,
    cloudinaryReady: false
};