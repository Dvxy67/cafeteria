// ui.js - Gestion de l'interface utilisateur avec images

import { appState, CONFIG } from './config.js';

// Variable pour stocker l'URL de l'image actuelle
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
    
    document.getElementById('countOui').textContent = countOui;
    document.getElementById('countNon').textContent = countNon;
    
    const participantsList = document.getElementById('participantsList');
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

// NOUVELLE FONCTION: Mettre à jour l'image du menu
export function updateMenuImage(imageURL) {
    currentImageURL = imageURL;
    
    // Mettre à jour l'image dans la modal si elle est ouverte
    const modalImage = document.getElementById('modalImage');
    if (modalImage) {
        modalImage.src = imageURL;
    }
}

// Mettre à jour le statut du vote et l'affichage
export function updateVotingStatusDisplay() {
    if (!appState.isVotingOpen) {
        document.getElementById('formSection').style.display = 'none';
        document.getElementById('closedMessage').style.display = 'block';
        if (appState.isAdminLoggedIn) {
            document.getElementById('resultsSection').style.display = 'block';
        }
    } else if (appState.hasVotedToday && !appState.isAdminLoggedIn) {
        document.getElementById('formSection').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';
    } else if (appState.hasVotedToday && appState.isAdminLoggedIn) {
        document.getElementById('formSection').style.display = 'none';
        document.getElementById('resultsSection').style.display = 'block';
    }
}

// Afficher la modal d'image - maintenant accessible à tous
export function showImageModal() {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const imageTitle = document.getElementById('imageTitle');
    
    modalImage.src = currentImageURL;
    imageTitle.textContent = `Menu du jour - ${new Date().toLocaleDateString('fr-FR')}`;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Fermer la modal d'image
export function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

// NOUVELLE FONCTION: Prévisualiser l'image sélectionnée pour upload
export function previewImage() {
    const fileInput = document.getElementById('imageUpload');
    const preview = document.getElementById('imagePreview');
    const file = fileInput.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Aperçu :</p>
                <img src="${e.target.result}" alt="Aperçu" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd;">
            `;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = '';
    }
}

// Configurer les écouteurs d'événements
export function setupEventListeners() {
    const userName = document.getElementById('userName');
    const radioButtons = document.querySelectorAll('input[name="cantine"]');
    const adminPassword = document.getElementById('adminPassword');
    const imageUpload = document.getElementById('imageUpload');
    
    if (userName) {
        userName.addEventListener('input', updateSubmitButton);
    }
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', updateSubmitButton);
    });
    
    if (adminPassword) {
        adminPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const { checkAdminPassword } = window.adminFunctions;
                checkAdminPassword();
            }
        });
    }

    // Écouteur pour l'aperçu de l'image
    if (imageUpload) {
        imageUpload.addEventListener('change', previewImage);
    }

    // Fermer la modal en cliquant en dehors
    document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeImageModal();
        }
    });

    // Fermer la modal avec Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });
}