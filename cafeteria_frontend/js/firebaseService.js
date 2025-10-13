// firebaseService.js - Gestion des opérations Firebase

import { firebaseConfig, appState } from './config.js';
import { updateResultsDisplay } from './ui.js';
import { getTodayKey } from './utils.js';

// Initialisation Firebase
export async function initializeFirebase() {
    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
        const {
            getFirestore,
            doc,
            setDoc,
            getDoc,
            onSnapshot,
            deleteDoc,
            collection,
            query,
            orderBy,
            limit,
            getDocs
        } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');

        const app = initializeApp(firebaseConfig);
        appState.db = getFirestore(app);
        
        // Exposer les fonctions Firebase globalement pour usage dans d'autres modules
        window.firebaseFunctions = {
            doc,
            setDoc,
            getDoc,
            onSnapshot,
            deleteDoc,
            collection,
            query,
            orderBy,
            limit,
            getDocs
        };
        
        return true;
    } catch (error) {
        console.error("Erreur d'initialisation Firebase:", error);
        return false;
    }
}

// Charger les données du jour avec écoute en temps réel
export async function loadTodayData() {
    const todayKey = getTodayKey();
    const userVoted = localStorage.getItem(`user_voted_${todayKey}`);
    appState.hasVotedToday = userVoted === 'true';
    
    document.getElementById('loading').style.display = 'block';
    
    try {
        const { doc, onSnapshot } = window.firebaseFunctions;
        const docRef = doc(appState.db, "votes", todayKey);
        
        // Écouter les changements en temps réel
        appState.unsubscribe = onSnapshot(docRef, (docSnap) => {
            document.getElementById('loading').style.display = 'none';
            
            if (docSnap.exists()) {
                appState.votes = docSnap.data().votes || {};
            } else {
                appState.votes = {};
            }
            
            updateResultsDisplay();
        }, (error) => {
            console.error("Erreur lors de l'écoute:", error);
            document.getElementById('loading').style.display = 'none';
            // Fallback vers localStorage
            const storedVotes = JSON.parse(localStorage.getItem(`votes_${todayKey}`) || '{}');
            appState.votes = storedVotes;
            updateResultsDisplay();
        });
        
    } catch (error) {
        console.error("Erreur Firebase:", error);
        document.getElementById('loading').style.display = 'none';
        // Fallback vers localStorage
        const storedVotes = JSON.parse(localStorage.getItem(`votes_${todayKey}`) || '{}');
        appState.votes = storedVotes;
        updateResultsDisplay();
    }
}

// Sauvegarder les données
export async function saveTodayData() {
    const todayKey = getTodayKey();
    
    try {
        const { doc, setDoc } = window.firebaseFunctions;
        const docRef = doc(appState.db, "votes", todayKey);
        await setDoc(docRef, {
            votes: appState.votes,
            lastUpdated: new Date().toISOString(),
            date: todayKey
        });
        
        // Backup local également
        localStorage.setItem(`votes_${todayKey}`, JSON.stringify(appState.votes));
        return true;
        
    } catch (error) {
        console.error("Erreur sauvegarde Firebase:", error);
        // Fallback vers localStorage
        localStorage.setItem(`votes_${todayKey}`, JSON.stringify(appState.votes));
        return false;
    }
}

// Reset des données
export async function resetDailyData() {
    try {
        const todayKey = getTodayKey();
        const { doc, deleteDoc } = window.firebaseFunctions;
        const docRef = doc(appState.db, "votes", todayKey);
        
        // Supprimer le document Firebase
        await deleteDoc(docRef);
        
        // Nettoyer localStorage aussi
        localStorage.removeItem(`votes_${todayKey}`);
        localStorage.removeItem(`user_voted_${todayKey}`);
        
        appState.votes = {};
        appState.hasVotedToday = false;
        
        return true;
        
    } catch (error) {
        console.error('Erreur lors du reset:', error);
        return false;
    }
}