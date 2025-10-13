// admin.js - Fonctions d'administration avec Cloudinary

import { appState, CONFIG } from './config.js';
import { resetDailyData } from './firebaseService.js';
import { 
    uploadMenuImage, 
    deleteTodayImage, 
    getTodayImageURL, 
    getPreviewImageURL,
    getModalImageURL 
} from './cloudinaryService.js';
import { updateSubmitButton, updateResultsDisplay, updateMenuImage } from './ui.js';

// Vérifier le statut administrateur
export function checkAdminStatus() {
    const adminLoggedIn = sessionStorage.getItem('admin_logged_in');
    appState.isAdminLoggedIn = adminLoggedIn === 'true';
    
    if (appState.isAdminLoggedIn) {
        document.getElementById('adminSection').style.display = 'block';
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminToggleSection').style.display = 'none';
        
        // Afficher la section de gestion d'image
        document.getElementById('imageManagementSection').style.display = 'block';
        
        if (appState.hasVotedToday || !appState.isVotingOpen) {
            document.getElementById('successMessage').style.display = 'none';
            document.getElementById('resultsSection').style.display = 'block';
        }
    } else {
        document.getElementById('adminSection').style.display = 'none';
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminToggleSection').style.display = 'block';
        document.getElementById('imageManagementSection').style.display = 'none';
    }
}

// Afficher/masquer la connexion admin
export function toggleAdminLogin() {
    document.getElementById('adminLogin').style.display = 'block';
    document.getElementById('adminToggleSection').style.display = 'none';
    
    setTimeout(() => {
        document.getElementById('adminPassword').focus();
    }, 100);
}

export function hideAdminLogin() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminToggleSection').style.display = 'block';
    document.getElementById('adminPassword').value = '';
}

// Vérifier le mot de passe administrateur
export function checkAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === CONFIG.ADMIN_PASSWORD) {
        appState.isAdminLoggedIn = true;
        sessionStorage.setItem('admin_logged_in', 'true');
        document.getElementById('adminPassword').value = '';
        checkAdminStatus();
        
        alert('Connexion administrateur réussie !');
    } else {
        alert('Mot de passe incorrect !');
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
    }
}

// Déconnexion administrateur
export function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        appState.isAdminLoggedIn = false;
        sessionStorage.removeItem('admin_logged_in');
        checkAdminStatus();
        
        if (appState.hasVotedToday && appState.isVotingOpen) {
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';
        }
        
        alert('Déconnexion réussie !');
    }
}

// Upload d'image du menu vers Cloudinary
export async function uploadImage() {
    if (!appState.isAdminLoggedIn) {
        alert('Accès réservé aux administrateurs !');
        return;
    }
    
    const fileInput = document.getElementById('imageUpload');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Veuillez sélectionner une image');
        return;
    }
    
    // Vérifier le type de fichier
    if (!CONFIG.ALLOWED_IMAGE_TYPES.includes(file.type)) {
        alert('Veuillez sélectionner un fichier image valide (JPG, PNG, GIF, WebP)');
        return;
    }
    
    // Vérifier la taille
    if (file.size > CONFIG.MAX_IMAGE_SIZE) {
        alert('L\'image est trop volumineuse (max 5MB)');
        return;
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    const originalText = uploadBtn.textContent;
    
    try {
        uploadBtn.textContent = '⬆️ Upload en cours...';
        uploadBtn.disabled = true;
        
        const result = await uploadMenuImage(file);
        
        if (result.success) {
            alert('Image uploadée avec succès vers Cloudinary !');
            fileInput.value = ''; // Vider l'input
            clearImagePreview(); // Nettoyer l'aperçu
            
            // Mettre à jour l'affichage de l'image avec transformation pour modal
            const modalImageURL = getModalImageURL(result.url);
            updateMenuImage(modalImageURL);
            
            // Mettre à jour l'état actuel de l'image avec transformation pour admin
            const previewImageURL = getPreviewImageURL(result.url);
            updateCurrentImageDisplay(previewImageURL, result.url);
            
            console.log('Image uploadée:', {
                original: result.url,
                modal: modalImageURL,
                preview: previewImageURL
            });
        }
        
    } catch (error) {
        console.error('Erreur upload:', error);
        let errorMessage = 'Erreur lors de l\'upload de l\'image';
        
        if (error.message.includes('Invalid')) {
            errorMessage = 'Format d\'image non valide';
        } else if (error.message.includes('size')) {
            errorMessage = 'Image trop volumineuse';
        } else if (error.message.includes('network')) {
            errorMessage = 'Erreur de connexion. Vérifiez votre internet.';
        }
        
        alert(errorMessage);
    } finally {
        uploadBtn.textContent = originalText;
        uploadBtn.disabled = false;
    }
}

// Supprimer l'image du jour
export async function deleteCurrentImage() {
    if (!appState.isAdminLoggedIn) {
        alert('Accès réservé aux administrateurs !');
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer l\'image du menu d\'aujourd\'hui ?')) {
        return;
    }
    
    const deleteBtn = document.getElementById('deleteImageBtn');
    const originalText = deleteBtn.textContent;
    
    try {
        deleteBtn.textContent = '🗑️ Suppression...';
        deleteBtn.disabled = true;
        
        const success = await deleteTodayImage();
        
        if (success) {
            alert('Image supprimée avec succès de Cloudinary !');
            
            // Remettre l'image par défaut
            updateMenuImage(CONFIG.IMAGE_URL);
            updateCurrentImageDisplay(null);
        } else {
            alert('Aucune image à supprimer pour aujourd\'hui');
        }
        
    } catch (error) {
        console.error('Erreur suppression:', error);
        alert('Erreur lors de la suppression');
    } finally {
        deleteBtn.textContent = originalText;
        deleteBtn.disabled = false;
    }
}

// Mettre à jour l'affichage de l'image actuelle
function updateCurrentImageDisplay(previewImageURL, originalURL = null) {
    const currentImageDiv = document.getElementById('currentImageDisplay');
    
    if (previewImageURL) {
        currentImageDiv.innerHTML = `
            <p style="color: #666; font-size: 12px; margin-bottom: 10px;">Image actuelle du jour (Cloudinary) :</p>
            <img src="${previewImageURL}" alt="Menu actuel" style="max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #ddd; cursor: pointer;" 
                 onclick="showImageDetails('${originalURL || previewImageURL}')"
                 title="Cliquez pour voir les détails">
            <p style="color: #999; font-size: 10px; margin-top: 5px;">✅ Hébergé sur Cloudinary</p>
        `;
    } else {
        currentImageDiv.innerHTML = `
            <p style="color: #999; font-size: 12px; font-style: italic;">Image par défaut utilisée</p>
            <p style="color: #ccc; font-size: 10px;">Aucune image uploadée aujourd'hui</p>
        `;
    }
}

// Afficher les détails d'une image (nouvelle fonction)
window.showImageDetails = function(imageURL) {
    const details = `
URL de l'image: ${imageURL}

Transformations disponibles:
- Aperçu: ajout de w_300,h_200,c_fill,q_80
- Modal: ajout de w_800,h_600,c_limit,q_auto
- Miniature: ajout de w_150,h_100,c_fill,q_80

L'image est automatiquement optimisée par Cloudinary.
    `;
    alert(details);
};

// Nettoyer l'aperçu d'image
function clearImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.innerHTML = '';
    }
}

// Charger l'image du jour au démarrage
export async function loadTodayImage() {
    try {
        const imageURL = await getTodayImageURL();
        
        if (imageURL) {
            // Utiliser l'image de Cloudinary avec transformation pour la modal
            const modalImageURL = getModalImageURL(imageURL);
            updateMenuImage(modalImageURL);
            
            if (appState.isAdminLoggedIn) {
                // Utiliser l'image avec transformation pour l'aperçu admin
                const previewImageURL = getPreviewImageURL(imageURL);
                updateCurrentImageDisplay(previewImageURL, imageURL);
            }
            
            console.log('Image du jour chargée depuis Cloudinary:', imageURL);
        } else {
            // Utiliser l'image par défaut
            updateMenuImage(CONFIG.IMAGE_URL);
            if (appState.isAdminLoggedIn) {
                updateCurrentImageDisplay(null);
            }
        }
    } catch (error) {
        console.error('Erreur chargement image:', error);
        // Utiliser l'image par défaut en cas d'erreur
        updateMenuImage(CONFIG.IMAGE_URL);
        if (appState.isAdminLoggedIn) {
            updateCurrentImageDisplay(null);
        }
    }
}

// Exporter les résultats
export function exportResults() {
    if (!appState.isAdminLoggedIn) {
        alert('Accès réservé aux administrateurs !');
        return;
    }

    const today = new Date().toLocaleDateString('fr-FR');
    const countOui = appState.votes.oui ? appState.votes.oui.length : 0;
    const countNon = appState.votes.non ? appState.votes.non.length : 0;
    
    let exportText = `Résultats Cantine - ${today}\n`;
    exportText += `================================\n\n`;
    exportText += `Mangent à la cantine: ${countOui}\n`;
    exportText += `Ne mangent pas à la cantine: ${countNon}\n`;
    exportText += `Total participants: ${countOui + countNon}\n\n`;
    
    // Ajouter l'info sur l'image du jour
    if (appState.currentImageURL && appState.currentImageURL !== CONFIG.IMAGE_URL) {
        exportText += `Image du menu: ${appState.currentImageURL}\n`;
        exportText += `Service: Cloudinary\n\n`;
    } else {
        exportText += `Image du menu: Image par défaut\n\n`;
    }
    
    exportText += `Détail des participants:\n`;
    exportText += `------------------------\n\n`;
    
    if (appState.votes.oui && appState.votes.oui.length > 0) {
        exportText += `✓ MANGENT À LA CANTINE (${countOui}):\n`;
        appState.votes.oui.forEach((vote, index) => {
            exportText += `${index + 1}. ${vote.name}\n`;
        });
        exportText += `\n`;
    }
    
    if (appState.votes.non && appState.votes.non.length > 0) {
        exportText += `✗ NE MANGENT PAS À LA CANTINE (${countNon}):\n`;
        appState.votes.non.forEach((vote, index) => {
            exportText += `${index + 1}. ${vote.name}\n`;
        });
    }
    
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultats_cantine_${today.replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Afficher les résultats
export function viewResults() {
    if (!appState.isAdminLoggedIn) {
        alert('Accès réservé aux administrateurs !');
        return;
    }
    
    document.getElementById('formSection').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('closedMessage').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'block';
    updateResultsDisplay();
}

// Reset quotidien
export async function resetDaily() {
    if (!appState.isAdminLoggedIn) {
        alert('Accès réservé aux administrateurs !');
        return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir effacer tous les votes d\'aujourd\'hui ? Cette action est irréversible.')) {
        try {
            const success = await resetDailyData();
            
            if (success) {
                document.getElementById('formSection').style.display = 'block';
                document.getElementById('resultsSection').style.display = 'none';
                document.getElementById('closedMessage').style.display = 'none';
                document.getElementById('successMessage').style.display = 'none';
                
                document.getElementById('userName').value = '';
                document.querySelectorAll('input[name="cantine"]').forEach(radio => {
                    radio.checked = false;
                });
                document.querySelectorAll('.option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                updateSubmitButton();
                updateResultsDisplay();
                
                alert('Reset effectué ! Le vote est à nouveau ouvert.');
            } else {
                alert('Erreur lors du reset. Veuillez réessayer.');
            }
            
        } catch (error) {
            console.error('Erreur lors du reset:', error);
            alert('Erreur lors du reset. Veuillez réessayer.');
        }
    }
}