// main.js - Script principal avec Cloudinary

import { appState } from './config.js';
import { initializeFirebase, loadTodayData } from './firebaseService.js';
import { updateDateTime, updateCountdown, checkVotingStatus, cleanup } from './utils.js';
import { 
    setupEventListeners, 
    updateVotingStatusDisplay, 
    selectOption, 
    showImageModal, 
    closeImageModal,
    previewImage
} from './ui.js';
import { submitVote } from './voting.js';
import { 
    checkAdminStatus, 
    toggleAdminLogin, 
    hideAdminLogin, 
    checkAdminPassword, 
    logout, 
    exportResults, 
    viewResults, 
    resetDaily,
    uploadImage,
    deleteCurrentImage,
    loadTodayImage
} from './admin.js';

// Initialisation de l'application
// main.js - Section d'initialisation corrigée pour les images

// Initialisation de l'application - VERSION CORRIGÉE
async function initApp() {
    try {
        console.log('🚀 Initialisation de l\'application...');
        
        // Initialiser Firebase (seulement Firestore, pas Storage)
        const firebaseReady = await initializeFirebase();
        if (!firebaseReady) {
            console.warn("⚠️ Firebase non disponible, utilisation du localStorage");
        } else {
            console.log('✅ Firebase Firestore initialisé');
        }
        
        // Marquer Cloudinary comme prêt
        appState.cloudinaryReady = true;
        console.log('✅ Service Cloudinary prêt');
        
        // Initialiser l'interface
        updateDateTime();
        appState.isVotingOpen = checkVotingStatus();
        updateCountdown();
        setupEventListeners();
        checkAdminStatus();
        
        // Charger les données
        await loadTodayData();
        console.log('📊 Données du jour chargées');
        
        // CORRECTION IMPORTANTE: Attendre un peu avant de charger l'image
        // pour s'assurer que Firebase est complètement prêt
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Charger l'image du jour depuis Cloudinary
        try {
            await loadTodayImage();
            console.log('🖼️ Image du jour chargée');
        } catch (error) {
            console.error('⚠️ Erreur chargement image, continuant avec défaut:', error);
        }
        
        // Mettre à jour l'affichage
        updateVotingStatusDisplay();
        
        // AJOUT: Vérification périodique de l'image
        setInterval(async () => {
            try {
                if (window.loadTodayImage && appState.db) {
                    await window.loadTodayImage();
                }
            } catch (error) {
                console.warn('Erreur vérification périodique image:', error);
            }
        }, 300000); // Vérifier toutes les 5 minutes
        
        // Démarrer les timers existants
        setInterval(() => {
            const stillOpen = updateCountdown();
            if (stillOpen !== appState.isVotingOpen) {
                appState.isVotingOpen = stillOpen;
                updateVotingStatusDisplay();
            }
        }, 1000);
        
        setInterval(() => {
            const newStatus = checkVotingStatus();
            if (newStatus !== appState.isVotingOpen) {
                appState.isVotingOpen = newStatus;
                updateVotingStatusDisplay();
            }
        }, 60000);
        
        console.log('✅ Application initialisée avec succès');
        
    } catch (error) {
        console.error("❌ Erreur lors de l'initialisation:", error);
        document.getElementById('loading').style.display = 'none';
        alert("Erreur lors du chargement de l'application. Veuillez actualiser la page.");
    }
}

// Fonction pour forcer le rechargement de l'image si nécessaire
function forceImageReload() {
    if (window.loadTodayImage) {
        setTimeout(() => {
            window.loadTodayImage().catch(err => 
                console.warn('Erreur rechargement forcé image:', err)
            );
        }, 2000);
    }
}

// Événement de focus de la fenêtre pour recharger l'image
window.addEventListener('focus', () => {
    // Recharger l'image quand l'utilisateur revient sur l'onglet
    if (document.hidden === false && window.loadTodayImage) {
        setTimeout(() => {
            window.loadTodayImage().catch(err => 
                console.warn('Erreur rechargement image au focus:', err)
            );
        }, 1000);
    }
});

// Initialisation au chargement - VERSION CORRIGÉE
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM chargé, démarrage de l\'application...');
    
    exposeGlobalFunctions();
    setupCleanup();
    
    await initApp();
    
    // AJOUT: Forcer un rechargement de l'image après initialisation complète
    forceImageReload();
});

// Exposer les fonctions globalement pour les onclick dans le HTML
function exposeGlobalFunctions() {
    // Fonctions UI
    window.selectOption = selectOption;
    window.showImageModal = showImageModal;
    window.closeImageModal = closeImageModal;
    window.previewImage = previewImage;
    
    // Fonctions de vote
    window.submitVote = submitVote;
    
    // Fonctions admin
    window.adminFunctions = {
        toggleAdminLogin,
        hideAdminLogin,
        checkAdminPassword,
        logout,
        exportResults,
        viewResults,
        resetDaily,
        uploadImage,
        deleteCurrentImage
    };
    
    // Exposer individuellement pour compatibilité avec les onclick existants
    window.toggleAdminLogin = toggleAdminLogin;
    window.hideAdminLogin = hideAdminLogin;
    window.checkAdminPassword = checkAdminPassword;
    window.logout = logout;
    window.exportResults = exportResults;
    window.viewResults = viewResults;
    window.resetDaily = resetDaily;
    window.uploadImage = uploadImage;
    window.deleteCurrentImage = deleteCurrentImage;
    
    console.log('🔧 Fonctions globales exposées');
}

// Nettoyer lors du déchargement de la page
function setupCleanup() {
    window.addEventListener('beforeunload', () => {
        cleanup(appState.unsubscribe);
    });
}

// Vérifier la configuration Cloudinary
function checkCloudinaryConfig() {
    // Cette fonction peut être utilisée pour valider la configuration
    // en essayant un upload de test ou en vérifiant les paramètres
    console.log('🔍 Vérification de la configuration Cloudinary...');
    
    // Ici vous pourriez ajouter une validation de votre upload preset
    // ou vérifier que votre cloud name est accessible
    
    return true;
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM chargé, démarrage de l\'application...');
    
    exposeGlobalFunctions();
    setupCleanup();
    
    // Vérifier la config Cloudinary en mode développement
    if (window.location.hostname === 'localhost') {
        checkCloudinaryConfig();
    }
    
    await initApp();
});

// Export pour utilisation en tant que module si nécessaire
export { initApp };