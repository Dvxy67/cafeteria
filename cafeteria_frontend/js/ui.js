// ui.js - Interface utilisateur ultra-simplifiée

import { appState, CONFIG } from './config.js';

let currentImageURL = CONFIG.IMAGE_URL;

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

// Mettre à jour l'image du menu
export function updateMenuImage(imageURL) {
    currentImageURL = imageURL;
    
    const modalImage = document.getElementById('modalImage');
    if (modalImage) {
        modalImage.src = imageURL;
        modalImage.onerror = function() {
            console.warn('⚠️ Erreur chargement image, fallback vers défaut');
            this.src = CONFIG.IMAGE_URL;
        };
    }
    
    const viewImageBtn = document.getElementById('viewImageBtn');
    if (viewImageBtn) {
        viewImageBtn.disabled = false;
        viewImageBtn.style.opacity = '1';
    }
}

// Mettre à jour le statut du vote et l'affichage
export function updateVotingStatusDisplay() {
    const formSection = document.getElementById('formSection');
    const successMessage = document.getElementById('successMessage');
    const closedMessage = document.getElementById('closedMessage');
    const resultsSection = document.getElementById('resultsSection');
    
    if (!appState.isVotingOpen) {
        // Vote fermé
        if (formSection) formSection.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        if (closedMessage) closedMessage.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'block';
    } else if (appState.hasVotedToday) {
        // A déjà voté
        if (formSection) formSection.style.display = 'none';
        if (closedMessage) closedMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'block';
    } else {
        // Peut encore voter
        if (formSection) formSection.style.display = 'block';
        if (successMessage) successMessage.style.display = 'none';
        if (closedMessage) closedMessage.style.display = 'none';
        if (resultsSection) resultsSection.style.display = 'none';
    }
}

// Afficher la modal d'image
export function showImageModal() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const imageTitle = document.getElementById('imageTitle');
    
    if (modalImage) modalImage.src = currentImageURL;
    if (imageTitle) imageTitle.textContent = 'Menu de la semaine';
    
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// Fermer la modal d'image
export function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
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