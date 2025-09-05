// dashboard.js - Logique principale du dashboard (VERSION CORRIGÉE)

import { 
    FIREBASE_CONFIG, 
    EMAIL_CONFIG, 
    APP_CONFIG, 
    DOM_ELEMENTS, 
    MESSAGES, 
    UTILS, 
    appState 
} from './config.js';

// Import des modules Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { 
    getFirestore, 
    collection,
    getDocs,
    doc,
    getDoc,
    orderBy,
    query,
    limit,
    setDoc,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

// Variables globales
let app, db;
let imageServiceLoaded = false;

// Initialisation Firebase
async function initFirebase() {
    try {
        app = initializeApp(FIREBASE_CONFIG);
        db = getFirestore(app);
        appState.db = db;
        console.log('✅ Firebase initialisé avec succès');
        
        // Exposer les fonctions Firebase globalement pour le service d'images
        window.firebaseFunctions = {
            doc,
            getDoc,
            setDoc,
            deleteDoc
        };
        
        return true;
    } catch (error) {
        console.error('❌ Erreur initialisation Firebase:', error);
        return false;
    }
}

// Initialisation EmailJS
function initEmailJS() {
    try {
        if (typeof emailjs !== 'undefined') {
            emailjs.init(EMAIL_CONFIG.publicKey);
            console.log('✅ EmailJS initialisé avec succès');
            return true;
        } else {
            console.warn('⚠️ EmailJS non disponible');
            return false;
        }
    } catch (error) {
        console.error('❌ Erreur EmailJS:', error);
        return false;
    }
}

// Chargement du service d'images - CORRECTION
async function loadImageService() {
    try {
        if (!imageServiceLoaded) {
            const imageModule = await import('./image_menu_service.js');
            
            // Exposer les fonctions globalement
            window.previewImage = imageModule.previewImage;
            window.uploadImage = imageModule.uploadImage;
            window.refreshCurrentImage = imageModule.refreshCurrentImage;
            window.showImageDetails = imageModule.showImageDetails;
            window.loadTodayImage = imageModule.loadTodayImage; // AJOUT IMPORTANT
            
            // Initialiser le service ET charger l'image immédiatement
            await imageModule.initImageService();
            
            // Force le rechargement de l'image après initialisation
            setTimeout(async () => {
                await imageModule.loadTodayImage();
                console.log('🔄 Image rechargée après initialisation complète');
            }, 500);
            
            imageServiceLoaded = true;
            console.log('✅ Service d\'images chargé et initialisé');
        }
    } catch (error) {
        console.error('❌ Erreur chargement service images:', error);
    }
}

/**
 * GESTION DE L'AUTHENTIFICATION
 */
// Dans la fonction login() - AJOUT IMPORTANT
async function login() {
    const passwordInput = document.getElementById(DOM_ELEMENTS.ADMIN_PASSWORD);
    if (!passwordInput) {
        console.error('❌ Élément mot de passe non trouvé');
        return;
    }
    
    const password = passwordInput.value;
    console.log('🔐 Tentative de connexion...');
    
    if (password === APP_CONFIG.ADMIN_PASSWORD) {
        console.log('✅ Mot de passe correct');
        
        // Initialiser Firebase d'abord
        const firebaseReady = await initFirebase();
        if (!firebaseReady) {
            alert('Erreur d\'initialisation Firebase');
            return;
        }
        
        // Initialiser EmailJS
        initEmailJS();
        
        appState.isLoggedIn = true;
        appState.isAdminLoggedIn = true;
        
        // Masquer la section de login
        const loginSection = document.getElementById(DOM_ELEMENTS.LOGIN_SECTION);
        const mainContent = document.getElementById(DOM_ELEMENTS.MAIN_CONTENT);
        
        if (loginSection) loginSection.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
        
        // Afficher la section d'upload d'image pour les admins
        const imageUploadSection = document.getElementById(DOM_ELEMENTS.IMAGE_UPLOAD_SECTION);
        if (imageUploadSection) {
            imageUploadSection.style.display = 'block';
        }
        
        // Charger le service d'images
        await loadImageService();
        
        // AJOUT: Forcer le chargement de l'image après connexion admin
        setTimeout(async () => {
            if (window.loadTodayImage) {
                await window.loadTodayImage();
                console.log('🔄 Image rechargée après connexion admin');
            }
        }, 1500);
        
        // Initialiser le dashboard
        checkEmailConfig();
        await loadAllData();
        loadEmailConfig();
        updateSchedulerStatus();
        updateNextSendInfo();
        
    } else {
        console.log('❌ Mot de passe incorrect');
        alert(MESSAGES.WRONG_PASSWORD);
    }
}

/**
 * CHARGEMENT ET AFFICHAGE DES DONNÉES
 */
async function loadAllData() {
    const loadingElement = document.getElementById(DOM_ELEMENTS.LOADING);
    if (loadingElement) loadingElement.style.display = 'block';
    
    try {
        console.log('📊 Chargement des données...');
        
        if (!db) {
            throw new Error('Base de données non initialisée');
        }
        
        const votesCollection = collection(db, 'votes');
        const querySnapshot = await getDocs(votesCollection);
        
        appState.allData = {};
        querySnapshot.forEach((doc) => {
            appState.allData[doc.id] = doc.data().votes || {};
        });
        
        console.log('✅ Données chargées:', Object.keys(appState.allData).length, 'jours');
        displayDashboard();
        
    } catch (error) {
        console.error('❌ Erreur lors du chargement:', error);
        alert('Erreur lors du chargement des données: ' + error.message);
    }
    
    if (loadingElement) loadingElement.style.display = 'none';
}

function displayDashboard() {
    console.log('🖼️ Affichage du dashboard');
    calculateStats();
    createCharts();
    createHistoryTable();
    
    // Afficher les sections
    const elements = [
        DOM_ELEMENTS.STATS_GRID,
        DOM_ELEMENTS.CHARTS_SECTION,
        DOM_ELEMENTS.HISTORY_SECTION,
        DOM_ELEMENTS.ACTIONS_SECTION
    ];
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = elementId === DOM_ELEMENTS.STATS_GRID ? 'grid' : 'block';
            if (elementId === DOM_ELEMENTS.ACTIONS_SECTION) {
                element.style.display = 'grid';
            }
        }
    });
}

/**
 * CALCUL DES STATISTIQUES
 */
function calculateStats() {
    const today = UTILS.getTodayKey();
    const todayData = appState.allData[today] || {};
    
    const todayOui = todayData.oui ? todayData.oui.length : 0;
    const todayNon = todayData.non ? todayData.non.length : 0;
    const todayTotal = todayOui + todayNon;
    
    // Mettre à jour les éléments DOM
    const elements = {
        [DOM_ELEMENTS.TODAY_TOTAL]: todayTotal,
        [DOM_ELEMENTS.TODAY_OUI]: todayOui,
        [DOM_ELEMENTS.TODAY_NON]: todayNon
    };
    
    Object.entries(elements).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value;
    });
    
    // Calculer les pourcentages
    if (todayTotal > 0) {
        const ouiPercent = Math.round((todayOui / todayTotal) * 100);
        const nonPercent = Math.round((todayNon / todayTotal) * 100);
        
        const ouiPercentElement = document.getElementById(DOM_ELEMENTS.TODAY_OUI_PERCENT);
        const nonPercentElement = document.getElementById(DOM_ELEMENTS.TODAY_NON_PERCENT);
        
        if (ouiPercentElement) ouiPercentElement.textContent = ouiPercent + '%';
        if (nonPercentElement) nonPercentElement.textContent = nonPercent + '%';
    }
    
    // Moyenne 7 jours
    const dates = Object.keys(appState.allData).sort().slice(-7);
    let totalWeek = 0;
    dates.forEach(date => {
        const dayData = appState.allData[date];
        const dayOui = dayData.oui ? dayData.oui.length : 0;
        const dayNon = dayData.non ? dayData.non.length : 0;
        totalWeek += dayOui + dayNon;
    });
    
    const weekAverage = dates.length > 0 ? Math.round(totalWeek / dates.length) : 0;
    const weekAverageElement = document.getElementById(DOM_ELEMENTS.WEEK_AVERAGE);
    if (weekAverageElement) weekAverageElement.textContent = weekAverage;
    
    console.log('📊 Stats calculées:', { todayTotal, todayOui, todayNon, weekAverage });
}

/**
 * CRÉATION DES GRAPHIQUES
 */
function createCharts() {
    createTrendChart();
    createPieChart();
}

function createTrendChart() {
    const canvas = document.getElementById(DOM_ELEMENTS.TREND_CANVAS);
    if (!canvas) {
        console.warn('⚠️ Canvas trend non trouvé');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Données des 7 derniers jours
    const dates = Object.keys(appState.allData).sort().slice(-7);
    const data = dates.map(date => {
        const dayData = appState.allData[date];
        const dayOui = dayData.oui ? dayData.oui.length : 0;
        const dayNon = dayData.non ? dayData.non.length : 0;
        return {
            date: new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            total: dayOui + dayNon,
            oui: dayOui
        };
    });
    
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data.length === 0) {
        ctx.fillStyle = APP_CONFIG.CHART_COLORS.gray;
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Aucune donnée disponible', canvas.width/2, canvas.height/2);
        return;
    }
    
    // Configuration du graphique
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    
    const maxValue = Math.max(...data.map(d => d.total), 1);
    
    // Dessiner les axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Dessiner les données
    if (data.length > 1) {
        ctx.strokeStyle = APP_CONFIG.CHART_COLORS.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = padding + (index * chartWidth / (data.length - 1));
            const y = canvas.height - padding - (point.total * chartHeight / maxValue);
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // Points
            ctx.fillStyle = APP_CONFIG.CHART_COLORS.primary;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });
        
        ctx.stroke();
    }
    
    // Labels des dates
    ctx.fillStyle = APP_CONFIG.CHART_COLORS.gray;
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    data.forEach((point, index) => {
        const x = padding + (index * chartWidth / Math.max(data.length - 1, 1));
        ctx.fillText(point.date, x, canvas.height - 10);
    });
}

function createPieChart() {
    const canvas = document.getElementById(DOM_ELEMENTS.PIE_CANVAS);
    if (!canvas) {
        console.warn('⚠️ Canvas pie non trouvé');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    const today = UTILS.getTodayKey();
    const todayData = appState.allData[today] || {};
    
    const todayOui = todayData.oui ? todayData.oui.length : 0;
    const todayNon = todayData.non ? todayData.non.length : 0;
    const total = todayOui + todayNon;
    
    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (total === 0) {
        ctx.fillStyle = APP_CONFIG.CHART_COLORS.gray;
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Aucun vote aujourd\'hui', canvas.width/2, canvas.height/2);
        return;
    }
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    // Segment "Oui"
    const ouiAngle = (todayOui / total) * 2 * Math.PI;
    ctx.fillStyle = APP_CONFIG.CHART_COLORS.success;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI/2, -Math.PI/2 + ouiAngle);
    ctx.closePath();
    ctx.fill();
    
    // Segment "Non"
    ctx.fillStyle = APP_CONFIG.CHART_COLORS.danger;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI/2 + ouiAngle, -Math.PI/2 + 2*Math.PI);
    ctx.closePath();
    ctx.fill();
    
    // Labels
    ctx.fillStyle = 'white';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    
    if (todayOui > 0) {
        const ouiLabelAngle = -Math.PI/2 + ouiAngle/2;
        const ouiLabelX = centerX + Math.cos(ouiLabelAngle) * radius/2;
        const ouiLabelY = centerY + Math.sin(ouiLabelAngle) * radius/2;
        ctx.fillText(`${todayOui}`, ouiLabelX, ouiLabelY + 5);
    }
    
    if (todayNon > 0) {
        const nonLabelAngle = -Math.PI/2 + ouiAngle + (2*Math.PI - ouiAngle)/2;
        const nonLabelX = centerX + Math.cos(nonLabelAngle) * radius/2;
        const nonLabelY = centerY + Math.sin(nonLabelAngle) * radius/2;
        ctx.fillText(`${todayNon}`, nonLabelX, nonLabelY + 5);
    }
    
    // Légende
    ctx.fillStyle = APP_CONFIG.CHART_COLORS.success;
    ctx.fillRect(centerX - 60, centerY + radius + 20, 15, 15);
    ctx.fillStyle = '#111827';
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Mangent', centerX - 40, centerY + radius + 32);
    
    ctx.fillStyle = APP_CONFIG.CHART_COLORS.danger;
    ctx.fillRect(centerX + 20, centerY + radius + 20, 15, 15);
    ctx.fillStyle = '#111827';
    ctx.fillText('Ne mangent pas', centerX + 40, centerY + radius + 32);
}

/**
 * CRÉATION DU TABLEAU D'HISTORIQUE
 */
function createHistoryTable() {
    const tbody = document.getElementById(DOM_ELEMENTS.HISTORY_TABLE_BODY);
    if (!tbody) {
        console.warn('⚠️ Tbody historique non trouvé');
        return;
    }
    
    tbody.innerHTML = '';
    
    const sortedDates = Object.keys(appState.allData).sort().reverse();
    
    sortedDates.forEach(date => {
        const dayData = appState.allData[date];
        const oui = dayData.oui ? dayData.oui.length : 0;
        const non = dayData.non ? dayData.non.length : 0;
        const total = oui + non;
        const percent = total > 0 ? Math.round((oui / total) * 100) : 0;
        
        const row = tbody.insertRow();
        row.insertCell(0).textContent = UTILS.formatDate(date);
        row.insertCell(1).textContent = oui;
        row.insertCell(2).textContent = non;
        row.insertCell(3).textContent = total;
        row.insertCell(4).textContent = percent + '%';
    });
}

// Fonction refreshData modifiée
function refreshData() {
    if (appState.isLoggedIn) {
        console.log('🔄 Actualisation des données');
        loadAllData();
        
        // Recharger l'image du jour aussi si disponible - CORRECTION
        if (imageServiceLoaded && window.loadTodayImage) {
            setTimeout(async () => {
                try {
                    await window.loadTodayImage();
                    console.log('🖼️ Image actualisée avec les données');
                } catch (error) {
                    console.error('❌ Erreur actualisation image:', error);
                }
            }, 1000);
        }
    }
}

function exportFullData() {
    console.log('📊 Export des données');
    const sortedDates = Object.keys(appState.allData).sort();
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Mangent,Ne mangent pas,Total,Pourcentage cantine\n";
    
    sortedDates.forEach(date => {
        const dayData = appState.allData[date];
        const oui = dayData.oui ? dayData.oui.length : 0;
        const non = dayData.non ? dayData.non.length : 0;
        const total = oui + non;
        const percent = total > 0 ? Math.round((oui / total) * 100) : 0;
        
        csvContent += `${date},${oui},${non},${total},${percent}%\n`;
    });
    
    // Détail des participants
    csvContent += "\n\nDétail des participants:\n";
    sortedDates.forEach(date => {
        const dayData = appState.allData[date];
        csvContent += `\n${date}:\n`;
        
        if (dayData.oui && dayData.oui.length > 0) {
            csvContent += "Mangent à la cantine:\n";
            dayData.oui.forEach(vote => {
                csvContent += `- ${vote.name}\n`;
            });
        }
        
        if (dayData.non && dayData.non.length > 0) {
            csvContent += "Ne mangent pas à la cantine:\n";
            dayData.non.forEach(vote => {
                csvContent += `- ${vote.name}\n`;
            });
        }
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `statistiques_cafeteria_${UTILS.getTodayKey()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleEmailConfig() {
    const config = document.getElementById(DOM_ELEMENTS.EMAIL_CONFIG);
    if (config) {
        config.style.display = config.style.display === 'none' ? 'block' : 'none';
    }
}

function clearOldData() {
    if (confirm(MESSAGES.CONFIRM_CLEAR_DATA)) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - APP_CONFIG.DATA_RETENTION_DAYS);
        const cutoffKey = cutoffDate.toISOString().split('T')[0];
        
        let deletedCount = 0;
        Object.keys(appState.allData).forEach(date => {
            if (date < cutoffKey) {
                delete appState.allData[date];
                deletedCount++;
            }
        });
        
        alert(`${deletedCount} jours de données supprimés`);
        displayDashboard();
    }
}

/**
 * GESTION DE LA CONFIGURATION EMAIL
 */
function checkEmailConfig() {
    const isConfigured = EMAIL_CONFIG.serviceId !== 'VOTRE_SERVICE_ID' && EMAIL_CONFIG.serviceId !== '';
    const statusDiv = document.getElementById(DOM_ELEMENTS.EMAIL_STATUS);
    
    if (statusDiv) {
        if (isConfigured) {
            statusDiv.className = 'email-status configured';
            statusDiv.innerHTML = '✅ EmailJS configuré - Prêt pour l\'envoi automatique';
        } else {
            statusDiv.className = 'email-status not-configured';
            statusDiv.innerHTML = '⚠️ EmailJS non configuré - Modifiez le code pour ajouter vos clés';
        }
    }
    
    return isConfigured;
}

// Fonctions temporaires pour les fonctionnalités email
function loadEmailConfig() {
    console.log('📧 Chargement configuration email...');
}

function updateSchedulerStatus() {
    console.log('⏰ Mise à jour statut planificateur...');
}

function updateNextSendInfo() {
    console.log('📅 Mise à jour prochaine envoi...');
}

// Fonctions email simplifiées
function addRecipient() {
    console.log('➕ Ajout destinataire');
}

function removeRecipient(button) {
    console.log('➖ Suppression destinataire');
    if (button && button.parentElement) {
        button.parentElement.remove();
    }
}

function sendManualEmail() {
    console.log('📧 Envoi manuel');
    alert('Fonctionnalité en cours de développement');
}

function setupAutoEmail() {
    console.log('⏰ Configuration envoi auto');
    alert('Fonctionnalité en cours de développement');
}

/**
 * EXPOSER LES FONCTIONS GLOBALEMENT
 */
window.login = login;
window.refreshData = refreshData;
window.exportFullData = exportFullData;
window.toggleEmailConfig = toggleEmailConfig;
window.clearOldData = clearOldData;
window.addRecipient = addRecipient;
window.removeRecipient = removeRecipient;
window.sendManualEmail = sendManualEmail;
window.setupAutoEmail = setupAutoEmail;

/**
 * INITIALISATION
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initialisé');
    
    // Écouter la touche Entrée pour la connexion
    const passwordInput = document.getElementById(DOM_ELEMENTS.ADMIN_PASSWORD);
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
});

// Nettoyer l'interval lors du déchargement de la page
window.addEventListener('beforeunload', () => {
    if (appState.emailSchedulerInterval) {
        clearInterval(appState.emailSchedulerInterval);
    }
});