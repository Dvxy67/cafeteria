// voting.js - Logique de vote

import { appState } from './config.js';
import { saveTodayData } from './firebaseService.js';
import { getTodayKey } from './utils.js';
import { updateSubmitButton } from './ui.js';

// Soumettre un vote
// Soumettre un vote
export async function submitVote() {
    const userName = document.getElementById('userName').value.trim();
    const selectedChoice = document.querySelector('input[name="cantine"]:checked');
    
    if (!userName || !selectedChoice) {
        alert('Veuillez remplir votre nom et faire un choix.');
        return;
    }
    
    if (!appState.isVotingOpen) {
        alert('Le vote est fermé pour aujourd\'hui.');
        return;
    }
    
    if (appState.hasVotedToday) {
        alert('Vous avez déjà voté aujourd\'hui.');
        return;
    }
    
    // Vérifier si le nom existe déjà 
    const choice = selectedChoice.value;
    const nameExists = Object.values(appState.votes).flat().some(vote => 
        vote.name.toLowerCase() === userName.toLowerCase()
    );
    
    if (nameExists) {
        alert('Ce nom a déjà été utilisé aujourd\'hui. Veuillez utiliser un nom différent.');
        return;
    }
    
    // Désactiver le bouton pendant l'envoi
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours...';
    
    try {
        if (!appState.votes[choice]) {
            appState.votes[choice] = [];
        }
        
        appState.votes[choice].push({
            name: userName,
            timestamp: new Date().toISOString()
        });
        
        const success = await saveTodayData();
        
        if (success) {
            const todayKey = getTodayKey();
            localStorage.setItem(`user_voted_${todayKey}`, 'true');
            appState.hasVotedToday = true;
            
            // 🔒 NE JAMAIS AFFICHER les résultats pour les utilisateurs normaux
            document.getElementById('formSection').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';
            // Résultats restent toujours cachés
            
            alert('Merci ! Votre choix a été enregistré.');
        } else {
            alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
        }
        
    } catch (error) {
        console.error('Erreur lors du vote:', error);
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    }
    
    // Restaurer le bouton
    submitBtn.textContent = 'Envoyer mon choix';
    updateSubmitButton();
}