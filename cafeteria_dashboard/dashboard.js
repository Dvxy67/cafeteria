// dashboard.js - Version complète avec toutes les fonctions email

import {
    FIREBASE_CONFIG,
    EMAIL_CONFIG,
    APP_CONFIG,
    DOM_ELEMENTS,
    MESSAGES,
    UTILS,
    appState
} from './config.js';

import {
    saveEmailConfigToFirebase,
    loadEmailConfigFromFirebase,
    checkGitHubActionsStatus,
    displayEmailLogs
} from './firebase_email_service.js';

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
            deleteDoc,
            collection,
            getDocs,
            orderBy,
            query,
            limit
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

// Chargement du service d'images
async function loadImageService() {
    try {
        if (!imageServiceLoaded) {
            const imageModule = await import('./image_menu_service.js');
            
            // Exposer les fonctions globalement
            window.previewImage = imageModule.previewImage;
            window.uploadImage = imageModule.uploadImage;
            window.refreshCurrentImage = imageModule.refreshCurrentImage;
            window.showImageDetails = imageModule.showImageDetails;
            window.loadTodayImage = imageModule.loadTodayImage;
            
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
        
        // Forcer le chargement de l'image après connexion admin
        setTimeout(async () => {
            if (window.loadTodayImage) {
                await window.loadTodayImage();
                console.log('🔄 Image rechargée après connexion admin');
            }
        }, 1500);
        
        // Initialiser le dashboard
        checkEmailConfig();
        await loadAllData();
        await loadEmailConfig();
        updateSchedulerStatus();
        updateNextSendInfo();
        startEmailScheduler();
        
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
        
        // Recharger l'image du jour aussi si disponible
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
 * ===== FONCTIONS EMAIL COMPLÈTES =====
 * (Copiées depuis votre email_service.js original)
 */

/**
 * GESTION DES DESTINATAIRES
 */
function addRecipient() {
    console.log('➕ Ajout d\'un nouveau destinataire');
    
    const recipientsList = document.getElementById(DOM_ELEMENTS.RECIPIENTS_LIST);
    if (!recipientsList) {
        console.error('❌ Liste des destinataires non trouvée');
        return;
    }
    
    const newRecipient = document.createElement('div');
    newRecipient.className = 'recipient-input';
    newRecipient.innerHTML = `
        <input type="email" placeholder="Email destinataire" class="recipient-email">
        <button class="remove-recipient" onclick="removeRecipient(this)">Supprimer</button>
    `;
    recipientsList.appendChild(newRecipient);
    updateRemoveButtons();
}

function removeRecipient(button) {
    console.log('➖ Suppression d\'un destinataire');
    
    if (button && button.parentElement) {
        button.parentElement.remove();
        updateRemoveButtons();
    }
}

function updateRemoveButtons() {
    const recipients = document.querySelectorAll('.recipient-input');
    recipients.forEach((recipient, index) => {
        const removeBtn = recipient.querySelector('.remove-recipient');
        if (removeBtn) {
            removeBtn.style.display = recipients.length > 1 ? 'block' : 'none';
        }
    });
}

function getRecipients() {
    console.log('📋 Collecte des destinataires');
    
    const recipientsList = document.getElementById(DOM_ELEMENTS.RECIPIENTS_LIST);
    if (!recipientsList) {
        console.error('❌ Liste des destinataires non trouvée');
        return [];
    }
    
    const inputs = recipientsList.querySelectorAll('input[type="email"], .recipient-email');
    console.log(`Inputs trouvés: ${inputs.length}`);
    
    const validEmails = [];
    const seenEmails = new Set();
    
    inputs.forEach((input, index) => {
        if (input.offsetParent === null) {
            console.log(`Input ${index} ignoré (caché)`);
            return;
        }
        
        const email = input.value.trim();
        const normalizedEmail = email.toLowerCase();
        
        console.log(`Input ${index + 1}: "${email}"`);
        
        if (email && 
            UTILS.validateEmail(email) &&
            !seenEmails.has(normalizedEmail)) {
            
            seenEmails.add(normalizedEmail);
            validEmails.push(email);
            console.log(`✅ Email ajouté: ${email}`);
        } else if (seenEmails.has(normalizedEmail)) {
            console.log(`⚠️ Email dupliqué ignoré: ${email}`);
        } else {
            console.log(`❌ Email invalide: ${email}`);
        }
    });
    
    console.log(`📋 Résultat final: ${validEmails.length} emails uniques`);
    return validEmails;
}

function getSelectedDays() {
    const select = document.getElementById(DOM_ELEMENTS.EMAIL_DAYS);
    if (!select) return [];
    
    const selectedDays = [];
    for (let option of select.selectedOptions) {
        selectedDays.push(parseInt(option.value));
    }
    return selectedDays;
}

/**
 * GESTION DE LA PLANIFICATION
 */
function getNextSendDate(time, days) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    for (let i = 0; i < 7; i++) {
        const testDate = new Date(now);
        testDate.setDate(testDate.getDate() + i);
        testDate.setHours(hours, minutes, 0, 0);
        
        const dayOfWeek = testDate.getDay();
        
        if (i === 0 && testDate <= now) {
            continue;
        }
        
        if (days.includes(dayOfWeek)) {
            return testDate;
        }
    }
    
    return null;
}

function updateNextSendInfo() {
    const config = JSON.parse(localStorage.getItem('autoEmailConfig') || '{}');
    const infoDiv = document.getElementById(DOM_ELEMENTS.NEXT_SEND_INFO);
    
    if (!infoDiv) return;
    
    if (!config.enabled) {
        infoDiv.textContent = '';
        return;
    }
    
    const nextSend = getNextSendDate(config.time, config.days);
    if (nextSend) {
        infoDiv.textContent = `Prochain envoi : ${UTILS.formatDateTime(nextSend)} à ${UTILS.formatTime(nextSend)}`;
    }
}

function updateSchedulerStatus() {
    const config = JSON.parse(localStorage.getItem('autoEmailConfig') || '{}');
    const statusDiv = document.getElementById(DOM_ELEMENTS.SCHEDULER_STATUS);
    const stopButton = document.getElementById(DOM_ELEMENTS.STOP_BUTTON);
    
    if (statusDiv) {
        if (config.enabled) {
            statusDiv.className = 'auto-email-status status-active';
            statusDiv.innerHTML = '<span>🟢 Envoi automatique activé</span>';
        } else {
            statusDiv.className = 'auto-email-status status-inactive';
            statusDiv.innerHTML = '<span>🔴 Envoi automatique désactivé</span>';
        }
    }
    
    if (stopButton) {
        stopButton.style.display = config.enabled ? 'inline-block' : 'none';
    }
}

async function loadEmailConfig() {
    console.log('📂 Chargement configuration email');

    let config = {};

    try {
        config = await loadEmailConfigFromFirebase();
    } catch (error) {
        console.error('❌ Erreur chargement configuration Firebase:', error);
        config = JSON.parse(localStorage.getItem('autoEmailConfig') || '{}');
    }

    if (!config || typeof config !== 'object') {
        config = {};
    }

    const recipientsList = document.getElementById(DOM_ELEMENTS.RECIPIENTS_LIST);

    if (!recipientsList) {
        console.error('❌ Liste des destinataires non trouvée');
        return;
    }

    recipientsList.innerHTML = '';

    if (Array.isArray(config.recipients) && config.recipients.length > 0) {
        console.log(`Ajout de ${config.recipients.length} destinataires sauvegardés`);

        config.recipients.forEach((email) => {
            const recipientDiv = document.createElement('div');
            recipientDiv.className = 'recipient-input';
            recipientDiv.innerHTML = `
                <input type="email"
                       placeholder="Email destinataire"
                       class="recipient-email"
                       value="${email}">
                <button class="remove-recipient" onclick="removeRecipient(this)">Supprimer</button>
            `;
            recipientsList.appendChild(recipientDiv);
        });
    } else {
        addRecipient();
    }

    updateRemoveButtons();

    // Charger l'heure configurée
    const emailTimeInput = document.getElementById(DOM_ELEMENTS.EMAIL_TIME);
    if (config.time && emailTimeInput) {
        emailTimeInput.value = config.time;
    }

    // Charger les jours configurés
    if (Array.isArray(config.days)) {
        const select = document.getElementById(DOM_ELEMENTS.EMAIL_DAYS);
        if (select) {
            Array.from(select.options).forEach(option => {
                option.selected = config.days.includes(parseInt(option.value));
            });
        }
    }

    await checkGitHubActionsStatus();
    await displayEmailLogs();
}

/**
 * ENVOI DES EMAILS
 */
async function sendDailyReport(recipients = null) {
    console.log('📧 Préparation envoi rapport quotidien');
    
    if (!appState.allData) {
        console.error('❌ Aucune donnée disponible');
        alert('Aucune donnée disponible pour l\'envoi');
        return;
    }
    
    const today = UTILS.getTodayKey();
    const todayData = appState.allData[today] || {};
    
    const oui = todayData.oui || [];
    const non = todayData.non || [];
    const total = oui.length + non.length;
    
    // Calculer la moyenne de la semaine
    const dates = Object.keys(appState.allData).sort().slice(-7);
    let totalWeek = 0;
    dates.forEach(date => {
        const dayData = appState.allData[date];
        const dayOui = dayData.oui ? dayData.oui.length : 0;
        const dayNon = dayData.non ? dayData.non.length : 0;
        totalWeek += dayOui + dayNon;
    });
    const weekAverage = dates.length > 0 ? Math.round(totalWeek / dates.length) : 0;
    
    const recipientList = recipients || getRecipients();
    
    if (recipientList.length === 0) {
        alert(MESSAGES.NO_RECIPIENTS);
        return;
    }
    
    // Vérifier que EmailJS est disponible
    if (typeof emailjs === 'undefined') {
        console.error('❌ EmailJS non disponible');
        alert('EmailJS n\'est pas chargé. Veuillez recharger la page.');
        return;
    }
    
    console.log('📄 Envoi en cours vers:', recipientList);
    
    const commonData = {
        date_fr: new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        time: UTILS.formatTime(new Date()),
        oui_count: oui.length,
        non_count: non.length,
        total_count: total,
        oui_percent: total > 0 ? Math.round((oui.length / total) * 100) : 0,
        non_percent: total > 0 ? Math.round((non.length / total) * 100) : 0,
        average_week: weekAverage
    };
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < recipientList.length; i++) {
        const email = recipientList[i];
        
        try {
            console.log(`📧 Envoi ${i + 1}/${recipientList.length} vers: ${email}`);
            
            const now = new Date();
            const uniqueId = UTILS.generateUniqueId();
            const microtime = performance.now();
            
            const templateParams = {
                to_email: email,
                ...commonData,
                unique_send_id: uniqueId,
                recipient_index: i + 1,
                total_recipients: recipientList.length,
                send_timestamp: now.getTime(),
                microtime: microtime,
                random_suffix: Math.random().toString(36).substr(2, 9),
                batch_id: Date.now(),
                email_hash: btoa(email).substr(0, 10),
                sequence_number: i * 1000 + Math.floor(Math.random() * 1000)
            };
            
            console.log(`Paramètres uniques: ${templateParams.unique_send_id}`);
            
            const response = await emailjs.send(
                EMAIL_CONFIG.serviceId,
                EMAIL_CONFIG.templateId,
                templateParams
            );
            
            console.log(`✅ Succès pour ${email}:`, response.status);
            successCount++;
            
            // Attente entre les envois
            if (i < recipientList.length - 1) {
                console.log('⏳ Attente 4 secondes...');
                await new Promise(resolve => setTimeout(resolve, 4000));
            }
            
        } catch (error) {
            console.error(`❌ Erreur envoi email à ${email}:`, error);
            errorCount++;
        }
    }
    
    // Affichage du résultat
    if (successCount > 0 && errorCount === 0) {
        alert(`${MESSAGES.EMAIL_SUCCESS} à ${successCount} destinataire(s) !`);
    } else if (successCount > 0 && errorCount > 0) {
        alert(`📧 Email envoyé à ${successCount} destinataire(s)\n❌ ${errorCount} erreur(s)`);
    } else {
        alert(`${MESSAGES.EMAIL_ERROR} à tous les destinataires`);
    }
}

/**
 * PLANIFICATEUR AUTOMATIQUE
 */
function startEmailScheduler() {
    console.log('⏰ Démarrage du planificateur email');
    
    if (appState.emailSchedulerInterval) {
        clearInterval(appState.emailSchedulerInterval);
    }
    
    appState.emailSchedulerInterval = setInterval(() => {
        const config = JSON.parse(localStorage.getItem('autoEmailConfig') || '{}');
        
        if (!config.enabled || !config.recipients || config.recipients.length === 0) {
            return;
        }
        
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = now.getDay();
        const today = now.toISOString().split('T')[0];
        const lastSent = localStorage.getItem('lastEmailSent');
        
        if (currentTime === config.time && 
            config.days.includes(currentDay) && 
            lastSent !== today) {
            
            console.log('🤖 Envoi automatique du rapport...');
            sendDailyReport(config.recipients);
            localStorage.setItem('lastEmailSent', today);
            
            setTimeout(() => {
                updateNextSendInfo();
            }, 1000);
        }
    }, 60000); // Vérifier chaque minute
    
    console.log('📧 Planificateur d\'email démarré');
}

/**
 * FONCTION DE VÉRIFICATION DE CONFIGURATION
 */
function checkEmailConfig() {
    const isConfigured = EMAIL_CONFIG.serviceId !== 'VOTRE_SERVICE_ID' && 
                        EMAIL_CONFIG.serviceId !== '' &&
                        EMAIL_CONFIG.templateId !== 'VOTRE_TEMPLATE_ID' &&
                        EMAIL_CONFIG.publicKey !== 'VOTRE_PUBLIC_KEY';
    
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

/**
 * FONCTIONS EXPOSÉES GLOBALEMENT
 */
function sendManualEmail() {
    console.log('📧 Envoi manuel demandé');
    
    const recipients = getRecipients();
    
    if (recipients.length === 0) {
        alert(MESSAGES.NO_RECIPIENTS);
        return;
    }
    
    if (!checkEmailConfig()) {
        alert(MESSAGES.EMAIL_CONFIG_NOT_SETUP);
        return;
    }
    
    console.log('🔍 DEBUG - Destinataires détectés:', recipients);
    
    // Vérifier les doublons
    const uniqueCheck = [...new Set(recipients.map(email => email.toLowerCase()))];
    if (uniqueCheck.length !== recipients.length) {
        alert(MESSAGES.DUPLICATES_DETECTED);
        return;
    }
    
    const recipientList = recipients.join('\n- ');
    if (confirm(`Envoyer le rapport à ${recipients.length} destinataire(s) :\n\n- ${recipientList}\n\nConfirmer l'envoi ?`)) {
        sendDailyReport(recipients);
    }
}

async function setupAutoEmail() {
    console.log('⏰ Configuration envoi automatique');

    const recipients = getRecipients();
    const time = document.getElementById(DOM_ELEMENTS.EMAIL_TIME)?.value || '18:00';
    const days = getSelectedDays();
    
    if (recipients.length === 0) {
        alert(MESSAGES.NO_RECIPIENTS);
        return;
    }
    
    if (days.length === 0) {
        alert(MESSAGES.NO_DAYS_SELECTED);
        return;
    }
    
    if (!checkEmailConfig()) {
        alert(MESSAGES.EMAIL_CONFIG_NOT_SETUP);
        return;
    }
    
    // Supprimer les doublons
    const uniqueRecipients = [...new Set(recipients.map(email => email.toLowerCase()))]
        .map(lowerEmail => recipients.find(email => email.toLowerCase() === lowerEmail));
    
    if (uniqueRecipients.length !== recipients.length) {
        alert(MESSAGES.DUPLICATES_REMOVED);
    }
    
    const config = {
        recipients: uniqueRecipients,
        time: time,
        days: days,
        enabled: true
    };

    let savedToFirebase = false;

    try {
        savedToFirebase = await saveEmailConfigToFirebase(config);
    } catch (error) {
        console.error('❌ Impossible de sauvegarder la configuration dans Firebase:', error);
        localStorage.setItem('autoEmailConfig', JSON.stringify(config));
    }

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const selectedDayNames = days.map(day => dayNames[day]).join(', ');

    if (savedToFirebase) {
        alert(`✅ Configuration sauvée !\n\nDestinaires: ${uniqueRecipients.join(', ')}\nHeure: ${time}\nJours: ${selectedDayNames}\n\nL'envoi automatique est maintenant activé.`);
    } else {
        alert(`⚠️ Configuration sauvegardée localement.\n\nDestinaires: ${uniqueRecipients.join(', ')}\nHeure: ${time}\nJours: ${selectedDayNames}\n\nLa connexion à Firebase doit être vérifiée.`);
    }

    updateSchedulerStatus();
    updateNextSendInfo();
    await loadEmailConfig();
    startEmailScheduler();
}

function stopAutoEmail() {
    if (confirm(MESSAGES.CONFIRM_STOP_AUTO_EMAIL)) {
        const config = JSON.parse(localStorage.getItem('autoEmailConfig') || '{}');
        config.enabled = false;
        localStorage.setItem('autoEmailConfig', JSON.stringify(config));
        
        if (appState.emailSchedulerInterval) {
            clearInterval(appState.emailSchedulerInterval);
            appState.emailSchedulerInterval = null;
        }
        
        updateSchedulerStatus();
        updateNextSendInfo();
        
        alert(MESSAGES.AUTO_EMAIL_STOPPED);
    }
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
window.stopAutoEmail = stopAutoEmail;

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