// main.js - Script principal avec support PDF

import { appState, CONFIG } from './config.js';
import { initializeFirebase, loadTodayData } from './firebaseService.js';
import { updateDateTime, updateCountdown, checkVotingStatus, cleanup } from './utils.js';
import { 
    setupEventListeners, 
    updateVotingStatusDisplay, 
    selectOption, 
    showImageModal, 
    closeImageModal,
    updateMenuFile
} from './ui.js';
import { submitVote } from './voting.js';
import { getTodayFileData, getModalImageURL } from './cloudinaryService.js';

// Charger le fichier du jour (image ou PDF)
async function loadTodayFile() {
    try {
        console.log('📄 Chargement du fichier du jour...');
        
        const fileData = await getTodayFileData();
        
        if (fileData && fileData.url) {
            console.log('✅ Fichier trouvé:', fileData);
            
            // Si c'est une image, appliquer les transformations Cloudinary
            if (fileData.type === 'image') {
                const modalImageURL = getModalImageURL(fileData.url);
                updateMenuFile(modalImageURL, 'image');
            } else {
                // Si c'est un PDF, utiliser l'URL directement
                updateMenuFile(fileData.url, 'pdf');
            }
        } else {
            console.log('📷 Utilisation de l\'image par défaut');
            updateMenuFile(CONFIG.IMAGE_URL, 'image');
        }
    } catch (error) {
        console.error('❌ Erreur chargement fichier:', error);
        updateMenuFile(CONFIG.IMAGE_URL, 'image');
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
        
        // Charger le fichier du jour (image ou PDF)
        if (firebaseReady) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await loadTodayFile();
        } else {
            updateMenuFile(CONFIG.IMAGE_URL, 'image');
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