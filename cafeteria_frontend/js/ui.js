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
    
    // Créer le contenu selon le type
    if (currentFileType === 'pdf') {
        // Créer un iframe pour le PDF
        const iframe = document.createElement('iframe');
        iframe.src = currentFileURL;
        iframe.style.cssText = `
            width: 100%;
            height: 70vh;
            border: none;
            border-radius: 12px;
            background: white;
            margin: 0 auto;
            display: block;
        `;
        
        // Insérer avant le titre
        modalContent.insertBefore(iframe, imageTitle);
        
        // Ajouter un bouton de téléchargement
        let downloadBtn = modalContent.querySelector('.pdf-download-btn');
        if (!downloadBtn) {
            downloadBtn = document.createElement('a');
            downloadBtn.href = currentFileURL;
            downloadBtn.download = 'menu.pdf';
            downloadBtn.target = '_blank';
            downloadBtn.className = 'pdf-download-btn';
            downloadBtn.innerHTML = '📥 Télécharger le PDF';
            downloadBtn.style.cssText = `
                display: inline-block;
                margin-top: 15px;
                padding: 12px 24px;
                background: linear-gradient(135deg, #333 0%, #555 100%);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 300;
                letter-spacing: 1px;
                transition: all 0.3s ease;
            `;
            modalContent.appendChild(downloadBtn);
        }
        
    } else {
        // Afficher l'image
        const img = document.createElement('img');
        img.src = currentFileURL;
        img.alt = 'Menu du jour';
        img.id = 'modalImage';
        img.style.cssText = `
            max-width: 100%;
            max-height: 70vh;
            border-radius: 12px;
            display: block;
            margin: 0 auto;
        `;
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