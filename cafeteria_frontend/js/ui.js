// ui.js - Interface utilisateur avec support PDF

import { appState, CONFIG } from './config.js';

let currentFileURL = CONFIG.IMAGE_URL;
let currentFileType = 'image';

// Mettre à jour l'état du bouton de soumission
export function updateSubmitButton() {
    const userName = document.getElementById('userName').value.trim();
    const selectedChoice = document.querySelector('input[name="cantine"]:checked');
    const submitBtn = document.getElementById('submitBtn');
    
    if (userName && selectedChoice && appState.isVotingOpen && !appState.hasVotedToday) {
        submitBtn.disabled = false;
    } else {
        submitBtn.disabled = true;
    }
}

// Sélectionner une option
export function selectOption(value) {
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    document.getElementById(value).checked = true;
    document.getElementById(value).closest('.option').classList.add('selected');
    
    updateSubmitButton();
}

// Mettre à jour l'affichage des résultats
export function updateResultsDisplay() {
    const countOui = appState.votes.oui ? appState.votes.oui.length : 0;
    const countNon = appState.votes.non ? appState.votes.non.length : 0;
    
    // Mettre à jour les compteurs
    const countOuiEl = document.getElementById('countOui');
    const countNonEl = document.getElementById('countNon');
    
    if (countOuiEl) countOuiEl.textContent = countOui;
    if (countNonEl) countNonEl.textContent = countNon;
    
    // Mettre à jour la liste des participants
    const participantsList = document.getElementById('participantsList');
    if (!participantsList) return;
    
    participantsList.innerHTML = '';
    
    if (appState.votes.oui && appState.votes.oui.length > 0) {
        const ouiDiv = document.createElement('div');
        ouiDiv.innerHTML = '<strong style="color: #333; font-weight: 400;">✓ Mangent à la cafétéria:</strong>';
        participantsList.appendChild(ouiDiv);
        
        appState.votes.oui.forEach(vote => {
            const div = document.createElement('div');
            div.className = 'participant-item';
            div.textContent = `• ${vote.name}`;
            participantsList.appendChild(div);
        });
    }
    
    if (appState.votes.non && appState.votes.non.length > 0) {
        const nonDiv = document.createElement('div');
        nonDiv.innerHTML = '<strong style="color: #333; font-weight: 400; margin-top: 15px; display: block;">✗ Ne mangent pas à la cafétéria:</strong>';
        participantsList.appendChild(nonDiv);
        
        appState.votes.non.forEach(vote => {
            const div = document.createElement('div');
            div.className = 'participant-item';
            div.textContent = `• ${vote.name}`;
            participantsList.appendChild(div);
        });
    }
    
    if (countOui === 0 && countNon === 0) {
        participantsList.innerHTML = '<p style="text-align: center; color: #999; font-style: italic;">Aucun vote pour le moment</p>';
    }
}

// Mettre à jour le fichier du menu (image ou PDF)
export function updateMenuFile(fileURL, fileType = 'image') {
    currentFileURL = fileURL;
    currentFileType = fileType;
    
    console.log('📄 Mise à jour menu:', { fileURL, fileType });
    
    // Activer le bouton "Voir le menu"
    const viewImageBtn = document.getElementById('viewImageBtn');
    if (viewImageBtn) {
        viewImageBtn.disabled = false;
        viewImageBtn.style.opacity = '1';
        
        // Changer le texte selon le type
        const btnText = viewImageBtn.querySelector('span:last-child');
        if (btnText) {
            btnText.textContent = fileType === 'pdf' ? 'Voir le menu (PDF)' : 'Voir le menu';
        }
    }
}

// Fonction de compatibilité (pour ne pas casser le code existant)
export function updateMenuImage(imageURL) {
    updateMenuFile(imageURL, 'image');
}

// Mettre à jour le statut du vote et l'affichage
export function updateVotingStatusDisplay() {
    const formSection = document.getElementById('formSection');
    const successMessage = document.getElementById('successMessage');
    const closedMessage = document.getElementById('closedMessage');
    const resultsSection = document.getElementById('resultsSection');
    
    // 🔒 TOUJOURS MASQUER les résultats pour les utilisateurs
    if (resultsSection) resultsSection.style.display = 'none';
    
    if (!appState.isVotingOpen) {
        // Vote fermé
        if (formSection) formSection.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        if (closedMessage) closedMessage.style.display = 'block';
    } else if (appState.hasVotedToday) {
        // A déjà voté
        if (formSection) formSection.style.display = 'none';
        if (closedMessage) closedMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'block';
    } else {
        // Peut encore voter
        if (formSection) formSection.style.display = 'block';
        if (successMessage) successMessage.style.display = 'none';
        if (closedMessage) closedMessage.style.display = 'none';
    }
}

// Afficher la modal (image ou PDF)
export function showImageModal() {
    const modal = document.getElementById('imageModal');
    const modalContent = modal.querySelector('.image-modal-content');
    const imageTitle = document.getElementById('imageTitle');
    
    // Mettre à jour le titre
    if (imageTitle) {
        const today = new Date().toLocaleDateString('fr-FR');
        imageTitle.textContent = `Menu du jour - ${today}`;
    }
    
    // Effacer le contenu précédent (sauf le bouton close et le titre)
    const existingMedia = modalContent.querySelector('img, iframe');
    if (existingMedia) {
        existingMedia.remove();
    }
    
    // ✅ Ajouter/retirer la classe spéciale selon le type
    if (currentFileType === 'pdf') {
        modalContent.classList.add('pdf-modal'); // ✅ NOUVEAU : Classe pour PDF
    } else {
        modalContent.classList.remove('pdf-modal');
    }
    
    // Créer le contenu selon le type
    if (currentFileType === 'pdf') {
        // Créer un iframe pour le PDF
        const iframe = document.createElement('iframe');
        iframe.src = currentFileURL;
        // ✅ Plus besoin de styles inline, tout est dans le CSS maintenant
        iframe.setAttribute('title', 'Menu PDF');
        iframe.setAttribute('frameborder', '0');
        
        // Insérer avant le titre
        modalContent.insertBefore(iframe, imageTitle);
        
    } else {
        // Afficher l'image
        const img = document.createElement('img');
        img.src = currentFileURL;
        img.alt = 'Menu du jour';
        img.id = 'modalImage';
        // ✅ Styles minimaux, le reste est dans le CSS
        
        img.onerror = function() {
            console.warn('⚠️ Erreur chargement image, fallback vers défaut');
            this.src = CONFIG.IMAGE_URL;
        };
        
        // Insérer avant le titre
        modalContent.insertBefore(img, imageTitle);
        
        // Supprimer le bouton de téléchargement PDF s'il existe
        const downloadBtn = modalContent.querySelector('.pdf-download-btn');
        if (downloadBtn) {
            downloadBtn.remove();
        }
    }
    
    // Afficher la modal
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Fermer la modal
export function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // ✅ Nettoyer la classe pdf-modal aussi
        const modalContent = modal.querySelector('.image-modal-content');
        if (modalContent) {
            modalContent.classList.remove('pdf-modal');
        }
    }
}

// Configurer les écouteurs d'événements
export function setupEventListeners() {
    const userName = document.getElementById('userName');
    const radioButtons = document.querySelectorAll('input[name="cantine"]');
    
    if (userName) {
        userName.addEventListener('input', updateSubmitButton);
    }
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', updateSubmitButton);
    });

    // Fermer la modal en cliquant en dehors
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeImageModal();
            }
        });
    }

    // Fermer la modal avec Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });
}

// ========================================
// SYSTÈME DE LANGUES BILINGUES (NOUVEAU)
// ========================================

// Initialiser le stockage des images
if (!window.menuImages) {
    window.menuImages = {
        fr: null,
        nl: null
    };
}

// Variable pour stocker le type de fichier actuel
if (!window.menuFileTypes) {
    window.menuFileTypes = {
        fr: 'image',
        nl: 'image'
    };
}

// Fonction pour changer de langue
export function switchLanguage(lang) {
    console.log(`🌍 Changement de langue vers: ${lang}`);
    
    // Vérifier que la langue est valide
    if (lang !== 'fr' && lang !== 'nl') {
        console.error('❌ Langue invalide:', lang);
        return;
    }
    
    // Sauvegarder la préférence dans localStorage
    localStorage.setItem('user_language_preference', lang);
    console.log(`💾 Préférence sauvegardée: ${lang}`);
    
    // Mettre à jour l'apparence des boutons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        }
    });
    
    // Charger le fichier correspondant (image ou PDF)
    const fileURL = window.menuImages[lang] || CONFIG.IMAGE_URL;
    const fileType = window.menuFileTypes[lang] || 'image';
    
    console.log(`🖼️ Fichier à afficher (${lang}):`, fileURL, `Type: ${fileType}`);
    
    // Mettre à jour les variables globales
    currentFileURL = fileURL;
    currentFileType = fileType;
    
    // Mettre à jour l'image de la modal
    const modalImage = document.getElementById('modalImage');
    if (modalImage && fileType === 'image') {
        modalImage.src = fileURL;
    }
    
    // Changer le texte du bouton "Voir le menu" (optionnel)
    const viewMenuText = document.getElementById('viewMenuText');
    if (viewMenuText) {
        viewMenuText.textContent = lang === 'nl' ? 'Bekijk menu' : 'Voir le menu';
    }
    
    // Changer le titre de la modal (optionnel)
    const imageTitle = document.getElementById('imageTitle');
    if (imageTitle) {
        const date = new Date().toLocaleDateString('fr-FR');
        imageTitle.textContent = lang === 'nl' ? 
            `Menu van de dag - ${date}` : 
            `Menu du jour - ${date}`;
    }
    
    console.log(`✅ Langue changée vers: ${lang}`);
}

// Fonction pour charger la langue préférée au démarrage
export function loadUserLanguagePreference() {
    const savedLang = localStorage.getItem('user_language_preference') || 'fr';
    console.log(`📖 Langue préférée chargée: ${savedLang}`);
    return savedLang;
}

// Exposer globalement pour que le HTML puisse l'appeler
window.switchLanguage = switchLanguage;

console.log('✅ Système de langues bilingues chargé');