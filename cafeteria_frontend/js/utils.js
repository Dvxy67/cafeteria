// utils.js - Fonctions utilitaires

import { CONFIG } from './config.js';

// Obtenir la clé du jour
export function getTodayKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// Mettre à jour la date et l'heure
export function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('fr-FR', options).toUpperCase();
}

// Mettre à jour le compte à rebours
export function updateCountdown() {
    const now = new Date();
    const today = new Date();
    const closingTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), CONFIG.CLOSING_HOUR, CONFIG.CLOSING_MINUTE, 0);
    
    if (now > closingTime) {
        document.getElementById('timer').textContent = "FERMÉ";
        return false;
    }
    
    const timeLeft = closingTime - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    document.getElementById('timer').textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    return true;
}

// Vérifier le statut du vote
export function checkVotingStatus() {
    const now = new Date();
    const today = new Date();
    const closingTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), CONFIG.CLOSING_HOUR, CONFIG.CLOSING_MINUTE, 0);
    
    return now < closingTime;
}

// Nettoyer lors du déchargement de la page
export function cleanup(unsubscribeFunction) {
    if (unsubscribeFunction) {
        unsubscribeFunction();
    }
}