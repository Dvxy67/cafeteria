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
    updateMenuFile,
    switchLanguage,          
    loadUserLanguagePreference
} from './ui.js';
import { submitVote } from './voting.js';
import { getTodayFileData, getModalImageURL } from './cloudinaryService.js';

// Charger le fichier du jour (image ou PDF)
// Charger les fichiers du jour (VERSION BILINGUE : FR + NL)
async function loadTodayFile() {
    try {
        console.log('🖼️ Chargement des fichiers du jour (bilingue)...');
        
        // Importer la nouvelle fonction bilingue
        const { getTodayFileDataBilingual, getModalImageURL } = await import('./cloudinaryService.js');
        const filesData = await getTodayFileDataBilingual();
        
        console.log('📦 Données fichiers récupérées:', filesData);
        
        // Initialiser les stockages globaux
        if (!window.menuImages) {
            window.menuImages = { fr: null, nl: null };
        }
        if (!window.menuFileTypes) {
            window.menuFileTypes = { fr: 'image', nl: 'image' };
        }
        
        // Traiter le fichier FRANÇAIS
        if (filesData.fr && filesData.fr.url) {
            if (filesData.fr.type === 'image') {
                // Appliquer transformation Cloudinary pour images
                window.menuImages.fr = getModalImageURL(filesData.fr.url);
            } else {
                // PDF : utiliser l'URL directement
                window.menuImages.fr = filesData.fr.url;
            }
            window.menuFileTypes.fr = filesData.fr.type;
            console.log('✅ Fichier FR chargé:', window.menuImages.fr, `(${filesData.fr.type})`);
        } else {
            // Pas de fichier FR → utiliser l'image par défaut
            window.menuImages.fr = CONFIG.IMAGE_URL;
            window.menuFileTypes.fr = 'image';
            console.log('📷 Fichier FR par défaut');
        }
        
        // Traiter le fichier NÉERLANDAIS
        if (filesData.nl && filesData.nl.url) {
            if (filesData.nl.type === 'image') {
                // Appliquer transformation Cloudinary pour images
                window.menuImages.nl = getModalImageURL(filesData.nl.url);
            } else {
                // PDF : utiliser l'URL directement
                window.menuImages.nl = filesData.nl.url;
            }
            window.menuFileTypes.nl = filesData.nl.type;
            console.log('✅ Fichier NL chargé:', window.menuImages.nl, `(${filesData.nl.type})`);
        } else {
            // Pas de fichier NL → utiliser la même que FR (ou image par défaut)
            window.menuImages.nl = window.menuImages.fr;
            window.menuFileTypes.nl = window.menuFileTypes.fr;
            console.log('📷 Fichier NL = FR (fallback)');
        }
        
        console.log('📊 Résumé chargement:', {
            fr: window.menuImages.fr ? '✅' : '❌',
            nl: window.menuImages.nl ? '✅' : '❌',
            types: window.menuFileTypes
        });
        
        // Charger la langue préférée de l'utilisateur
        const userLang = localStorage.getItem('user_language_preference') || 'fr';
        console.log(`👤 Langue préférée utilisateur: ${userLang}`);
        
        // Afficher le fichier correspondant à la langue préférée
        const fileToDisplay = window.menuImages[userLang];
        const typeToDisplay = window.menuFileTypes[userLang];
        
        updateMenuFile(fileToDisplay, typeToDisplay);
        
        // Appliquer visuellement la langue préférée (activer le bon bouton)
        setTimeout(() => {
            if (typeof window.switchLanguage === 'function') {
                window.switchLanguage(userLang);
            } else {
                console.warn('⚠️ switchLanguage pas encore disponible');
            }
        }, 300);
        
        console.log('✅ Fichiers bilingues chargés avec succès');
        
    } catch (error) {
        console.error('❌ Erreur chargement fichiers bilingues:', error);
        
        // Fallback complet vers image par défaut
        window.menuImages = {
            fr: CONFIG.IMAGE_URL,
            nl: CONFIG.IMAGE_URL
        };
        window.menuFileTypes = {
            fr: 'image',
            nl: 'image'
        };
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
    window.switchLanguage = switchLanguage;
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