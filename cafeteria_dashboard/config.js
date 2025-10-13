// config.js - Configuration avec support PDF

// 🔧 CONFIGURATION EMAILJS
export const EMAIL_CONFIG = {
    serviceId: 'service_gwtxvhs',      
    templateId: 'template_bmik9m9',    
    publicKey: 'Ki8ogPbWkkUFvgHfr'       
};

// Configuration Firebase
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAeotUUuHLEmDoQHn3wUE9iXQdA8-T6cig",
    authDomain: "cafeteria-du-foyer.firebaseapp.com",
    projectId: "cafeteria-du-foyer",
    storageBucket: "cafeteria-du-foyer.firebasestorage.app",
    messagingSenderId: "762470338871",
    appId: "1:762470338871:web:4a6380d0f5618b0c060ab2"
};

// Configuration Cloudinary
export const CLOUDINARY_CONFIG = {
    cloudName: 'dvtv7bku4', 
    uploadPreset: 'cafeteria-menu-uploads', 
    folder: 'cafeteria-menus'
};

// Configuration des fichiers (images ET PDF)
export const FILE_CONFIG = {
    DEFAULT_IMAGE_URL: 'https://res.cloudinary.com/dvtv7bku4/image/upload/v1732203557/cafeteria-menus/menu_placeholder.jpg',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB pour les PDF
    ALLOWED_FILE_TYPES: [
        // Images
        'image/jpeg', 
        'image/jpg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        // PDF
        'application/pdf'
    ],
    CLOUDINARY_TRANSFORMS: {
        preview: { 
            width: 300, 
            height: 200, 
            crop: 'fill', 
            quality: 'auto', 
            format: 'jpg',  // Convertir le PDF en JPG pour preview
            page: 1         // Première page du PDF
        },
        modal: { 
            width: 800, 
            height: 1000, 
            crop: 'fit', 
            quality: 'auto'
        },
        thumbnail: { 
            width: 150, 
            height: 100, 
            crop: 'fill', 
            quality: 'auto', 
            format: 'jpg',
            page: 1
        }
    }
};

// Configuration de l'application
export const APP_CONFIG = {
    ADMIN_PASSWORD: 'cantine2025',
    DATA_RETENTION_DAYS: 30,
    CHART_COLORS: {
        primary: '#3b82f6',
        success: '#10b981',
        danger: '#ef4444',
        gray: '#6b7280'
    }
};

// État global
export const appState = {
    allData: {},
    isLoggedIn: false,
    emailSchedulerInterval: null,
    currentFileURL: FILE_CONFIG.DEFAULT_IMAGE_URL,
    currentFileType: 'image', // 'image' ou 'pdf'
    isAdminLoggedIn: false,
    db: null
};

// Constantes pour les éléments DOM
export const DOM_ELEMENTS = {
    LOGIN_SECTION: 'loginSection',
    ADMIN_PASSWORD: 'adminPassword',
    MAIN_CONTENT: 'mainContent',
    LOADING: 'loading',
    STATS_GRID: 'statsGrid',
    TODAY_TOTAL: 'todayTotal',
    TODAY_OUI: 'todayOui',
    TODAY_NON: 'todayNon',
    TODAY_OUI_PERCENT: 'todayOuiPercent',
    TODAY_NON_PERCENT: 'todayNonPercent',
    WEEK_AVERAGE: 'weekAverage',
    CHARTS_SECTION: 'chartsSection',
    TREND_CANVAS: 'trendCanvas',
    PIE_CANVAS: 'pieCanvas',
    HISTORY_SECTION: 'historySection',
    HISTORY_TABLE_BODY: 'historyTableBody',
    ACTIONS_SECTION: 'actionsSection',
    FILE_UPLOAD_SECTION: 'fileUploadSection',
    FILE_UPLOAD: 'fileUpload',
    FILE_PREVIEW: 'filePreview',
    UPLOAD_BTN: 'uploadBtn',
    IMAGE_UPLOAD_SECTION: 'imageUploadSection',
    CURRENT_FILE_DISPLAY: 'currentFileDisplay',
    EMAIL_CONFIG: 'emailConfig',
    EMAIL_STATUS: 'emailStatus',
    SCHEDULER_STATUS: 'schedulerStatus',
    RECIPIENTS_LIST: 'recipientsList',
    EMAIL_TIME: 'emailTime',
    EMAIL_DAYS: 'emailDays',
    NEXT_SEND_INFO: 'nextSendInfo',
    STOP_BUTTON: 'stopButton'
};

// Messages
export const MESSAGES = {
    WRONG_PASSWORD: 'Mot de passe incorrect !',
    EMAIL_CONFIG_NOT_SETUP: '⚠️ Vous devez d\'abord configurer EmailJS !',
    EMAIL_SUCCESS: '✅ Email envoyé avec succès',
    EMAIL_ERROR: '❌ Erreur lors de l\'envoi',
    NO_RECIPIENTS: 'Veuillez entrer au moins un email valide',
    NO_DAYS_SELECTED: 'Veuillez sélectionner au moins un jour',
    CONFIRM_CLEAR_DATA: 'Voulez-vous supprimer les données de plus de 30 jours ?',
    CONFIRM_STOP_AUTO_EMAIL: 'Voulez-vous vraiment arrêter l\'envoi automatique ?',
    AUTO_EMAIL_STOPPED: '✅ Envoi automatique arrêté',
    DUPLICATES_DETECTED: '⚠️ Des doublons ont été détectés dans vos destinataires !',
    DUPLICATES_REMOVED: '⚠️ Des doublons ont été détectés et supprimés.',
    FILE_UPLOAD_SUCCESS: '✅ Fichier uploadé avec succès !',
    FILE_UPLOAD_ERROR: '❌ Erreur lors de l\'upload',
    FILE_SIZE_ERROR: 'Le fichier est trop volumineux (max 10MB)',
    FILE_TYPE_ERROR: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF, WebP ou PDF',
    NO_FILE_SELECTED: 'Veuillez sélectionner un fichier'
};

// Fonctions utilitaires
export const UTILS = {
    formatDate: (date) => new Date(date).toLocaleDateString('fr-FR'),
    formatDateTime: (date) => new Date(date).toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'short' 
    }),
    formatTime: (date) => new Date(date).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    }),
    getTodayKey: () => new Date().toISOString().split('T')[0],
    generateUniqueId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    validateFileType: (file) => {
        return FILE_CONFIG.ALLOWED_FILE_TYPES.includes(file.type);
    },
    validateFileSize: (file) => {
        return file.size <= FILE_CONFIG.MAX_FILE_SIZE;
    },
    getFileType: (file) => {
        return file.type === 'application/pdf' ? 'pdf' : 'image';
    },
    isPDF: (url) => {
        return url && (url.includes('.pdf') || url.includes('resource_type=raw'));
    }
};