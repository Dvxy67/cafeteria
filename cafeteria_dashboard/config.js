// config.js - Configuration et constantes de l'application (VERSION CORRIGÉE)

// 🔧 CONFIGURATION EMAILJS - À REMPLIR AVEC VOS DONNÉES
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

// Configuration Cloudinary pour upload unsigned (CORRIGÉE)
export const CLOUDINARY_CONFIG = {
    cloudName: 'dvtv7bku4', 
    uploadPreset: 'cafeteria-menu-uploads', 
    folder: 'cafeteria-menus',
    // Note: API Key non nécessaire pour les uploads unsigned
    // Mais vous pouvez la garder pour référence: 357312394157985
};

// Configuration des images
export const IMAGE_CONFIG = {
    IMAGE_URL: 'https://res.cloudinary.com/dvtv7bku4/image/upload/v1732203557/cafeteria-menus/menu_placeholder.jpg',
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    CLOUDINARY_TRANSFORMS: {
        preview: { width: 300, height: 200, crop: 'fill', quality: 'auto', format: 'auto' },
        modal: { width: 800, height: 600, crop: 'fit', quality: 'auto', format: 'auto' },
        thumbnail: { width: 150, height: 100, crop: 'fill', quality: 'auto', format: 'auto' }
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

// État global de l'application
export const appState = {
    allData: {},
    isLoggedIn: false,
    emailSchedulerInterval: null,
    currentImageURL: IMAGE_CONFIG.IMAGE_URL,
    isAdminLoggedIn: false,
    db: null
};

// Constantes pour les éléments DOM
export const DOM_ELEMENTS = {
    // Login
    LOGIN_SECTION: 'loginSection',
    ADMIN_PASSWORD: 'adminPassword',
    MAIN_CONTENT: 'mainContent',
    
    // Loading
    LOADING: 'loading',
    
    // Stats
    STATS_GRID: 'statsGrid',
    TODAY_TOTAL: 'todayTotal',
    TODAY_OUI: 'todayOui',
    TODAY_NON: 'todayNon',
    TODAY_OUI_PERCENT: 'todayOuiPercent',
    TODAY_NON_PERCENT: 'todayNonPercent',
    WEEK_AVERAGE: 'weekAverage',
    
    // Charts
    CHARTS_SECTION: 'chartsSection',
    TREND_CANVAS: 'trendCanvas',
    PIE_CANVAS: 'pieCanvas',
    
    // History
    HISTORY_SECTION: 'historySection',
    HISTORY_TABLE_BODY: 'historyTableBody',
    
    // Actions
    ACTIONS_SECTION: 'actionsSection',
    
    // Image Upload (AJOUTÉ)
    IMAGE_UPLOAD_SECTION: 'imageUploadSection',
    IMAGE_UPLOAD: 'imageUpload',
    IMAGE_PREVIEW: 'imagePreview',
    UPLOAD_BTN: 'uploadBtn',
    CURRENT_IMAGE_DISPLAY: 'currentImageDisplay',
    
    // Email
    EMAIL_CONFIG: 'emailConfig',
    EMAIL_STATUS: 'emailStatus',
    SCHEDULER_STATUS: 'schedulerStatus',
    RECIPIENTS_LIST: 'recipientsList',
    EMAIL_TIME: 'emailTime',
    EMAIL_DAYS: 'emailDays',
    NEXT_SEND_INFO: 'nextSendInfo',
    STOP_BUTTON: 'stopButton'
};

// Messages et textes
export const MESSAGES = {
    WRONG_PASSWORD: 'Mot de passe incorrect !',
    EMAIL_CONFIG_NOT_SETUP: 'âš  Vous devez d\'abord configurer EmailJS !\n\nVeuillez remplir vos clés dans le code:\n- serviceId\n- templateId\n- publicKey',
    EMAIL_SUCCESS: '✅ Email envoyé avec succès',
    EMAIL_ERROR: '❌ Erreur lors de l\'envoi',
    NO_RECIPIENTS: 'Veuillez entrer au moins un email valide',
    NO_DAYS_SELECTED: 'Veuillez sélectionner au moins un jour',
    CONFIRM_CLEAR_DATA: 'Voulez-vous supprimer les données de plus de 30 jours ?',
    CONFIRM_STOP_AUTO_EMAIL: 'Voulez-vous vraiment arrêter l\'envoi automatique ?',
    AUTO_EMAIL_STOPPED: '✅ Envoi automatique arrêté',
    DUPLICATES_DETECTED: 'âš  Des doublons ont été détectés dans vos destinataires !\nVeuillez vérifier votre liste.',
    DUPLICATES_REMOVED: 'âš  Des doublons ont été détectés et supprimés de votre configuration.',
    // Messages pour les images (AJOUTÉS)
    IMAGE_UPLOAD_SUCCESS: '✅ Image uploadée avec succès !',
    IMAGE_UPLOAD_ERROR: '❌ Erreur lors de l\'upload de l\'image',
    IMAGE_SIZE_ERROR: 'L\'image est trop volumineuse (max 5MB)',
    IMAGE_TYPE_ERROR: 'Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP',
    NO_IMAGE_SELECTED: 'Veuillez sélectionner une image'
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
    getCurrentMenuKey: () => {
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);

        const year = monday.getFullYear();
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const date = String(monday.getDate()).padStart(2, '0');

        return `${year}-${month}-${date}`;
    },
    generateUniqueId: () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    // Fonction pour valider les types d'images (AJOUTÉE)
    validateImageType: (file) => {
        return IMAGE_CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type);
    },
    // Fonction pour valider la taille d'image (AJOUTÉE)
    validateImageSize: (file) => {
        return file.size <= IMAGE_CONFIG.MAX_IMAGE_SIZE;
    }
};