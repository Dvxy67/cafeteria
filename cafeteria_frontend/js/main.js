// main.js - Script principal ultra-simplifié

import { appState, CONFIG } from './config.js';
import { initializeFirebase, loadTodayData } from './firebaseService.js';
import { updateDateTime, updateCountdown, checkVotingStatus, cleanup } from './utils.js';
import { 
    setupEventListeners, 
    updateVotingStatusDisplay, 
    selectOption, 
    showImageModal, 
    closeImageModal,
    updateMenuImage
} from './ui.js';
import { submitVote } from './voting.js';
import { getTodayImageURL, getModalImageURL } from './cloudinaryService.js';

// Charger l'image du jour depuis Cloudinary
async function loadTodayImage() {
    try {
        console.log('🖼️ Chargement de l\'image du jour...');
        
        const imageURL = await getTodayImageURL();
        
        if (imageURL) {
            console.log('✅ Image trouvée:', imageURL);
            const modalImageURL = getModalImageURL(imageURL);
            updateMenuImage(modalImageURL);
        } else {
            console.log('📷 Utilisation de l\'image par défaut');
            updateMenuImage(CONFIG.IMAGE_URL);
        }
    } catch (error) {
        console.error('❌ Erreur chargement image:', error);
        updateMenuImage(CONFIG.IMAGE_URL);
    }
}

// Initialisation de l'application
async function initApp() {
    try {
        console.log('🚀 Initialisation de l\'application...');
        
        // Initialiser Firebase
        const firebaseReady = await initializeFirebase();
        if (!firebaseReady) {
            console.warn("⚠️ Firebase non disponible, utilisation du localStorage");
        }
        
        // Initialiser l'interface
        updateDateTime();
        appState.isVotingOpen = checkVotingStatus();
        updateCountdown();
        setupEventListeners();
        
        // Charger les données
        await loadTodayData();
        
        // Charger l'image du jour
        if (firebaseReady) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await loadTodayImage();
        } else {
            updateMenuImage(CONFIG.IMAGE_URL);
        }
        
        // Mettre à jour l'affichage
        updateVotingStatusDisplay();
        
        // Timers pour le compte à rebours
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

// Exposer les fonctions essentielles
function exposeGlobalFunctions() {
    window.selectOption = selectOption;
    window.showImageModal = showImageModal;
    window.closeImageModal = closeImageModal;
    window.submitVote = submitVote;
}

// Nettoyer lors du déchargement
function setupCleanup() {
    window.addEventListener('beforeunload', () => {
        cleanup(appState.unsubscribe);
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', async function() {
    exposeGlobalFunctions();
    setupCleanup();
    await initApp();
});

export { initApp };