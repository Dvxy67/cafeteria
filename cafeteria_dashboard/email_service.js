// email-service.js - Service de gestion des emails

import { 
    EMAIL_CONFIG, 
    DOM_ELEMENTS, 
    MESSAGES, 
    UTILS, 
    appState 
} from './config.js';

/**
 * GESTION DES DESTINATAIRES
 */
export function addRecipient() {
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

export function removeRecipient(button) {
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

export function updateNextSendInfo() {
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

export function updateSchedulerStatus() {
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

export function loadEmailConfig() {
    console.log('📂 Chargement configuration email');
    
    const config = JSON.parse(localStorage.getItem('autoEmailConfig') || '{}');
    const recipientsList = document.getElementById(DOM_ELEMENTS.RECIPIENTS_LIST);
    
    if (!recipientsList) {
        console.error('❌ Liste des destinataires non trouvée');
        return;
    }
    
    recipientsList.innerHTML = '';
    
    if (config.recipients && config.recipients.length > 0) {
        console.log(`Ajout de ${config.recipients.length} destinataires sauvegardés`);
        
        config.recipients.forEach((email, index) => {
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
    if (config.days) {
        const select = document.getElementById(DOM_ELEMENTS.EMAIL_DAYS);
        if (select) {
            Array.from(select.options).forEach(option => {
                option.selected = config.days.includes(parseInt(option.value));
            });
        }
    }
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
export function startEmailScheduler() {
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
    
    return isConfigured;
}

/**
 * FONCTIONS EXPOSÉES GLOBALEMENT
 */
export function sendManualEmail() {
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

export function setupAutoEmail() {
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
    
    localStorage.setItem('autoEmailConfig', JSON.stringify(config));
    
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const selectedDayNames = days.map(day => dayNames[day]).join(', ');
    
    alert(`✅ Configuration sauvée !\n\nDestinaires: ${uniqueRecipients.join(', ')}\nHeure: ${time}\nJours: ${selectedDayNames}\n\nL'envoi automatique est maintenant activé.`);
    
    updateSchedulerStatus();
    updateNextSendInfo();
    loadEmailConfig();
    startEmailScheduler();
}

export function stopAutoEmail() {
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

// Exposer les fonctions nécessaires globalement
window.addRecipient = addRecipient;
window.removeRecipient = removeRecipient;
window.sendManualEmail = sendManualEmail;
window.setupAutoEmail = setupAutoEmail;
window.stopAutoEmail = stopAutoEmail;

console.log('📧 Service email chargé et fonctions exposées');