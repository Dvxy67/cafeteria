// cafeteria_dashboard/firebase_email_service.js - Service complet pour Firebase + GitHub Actions

import { 
    EMAIL_CONFIG, 
    DOM_ELEMENTS, 
    MESSAGES, 
    UTILS, 
    appState 
} from './config.js';

/**
 * SAUVEGARDER LA CONFIGURATION DANS FIREBASE
 */
export async function saveEmailConfigToFirebase(config) {
    try {
        console.log('💾 Sauvegarde configuration dans Firebase...');
        
        if (!appState.db || !window.firebaseFunctions) {
            throw new Error('Firebase non initialisé');
        }

        const { doc, setDoc } = window.firebaseFunctions;
        const configRef = doc(appState.db, "email_config", "settings");
        
        // Enrichir la configuration pour GitHub Actions
        const enrichedConfig = {
            ...config,
            lastUpdated: new Date().toISOString(),
            version: "2.0",
            githubActionsEnabled: true,
            emailConfig: {
                serviceId: EMAIL_CONFIG.serviceId,
                templateId: EMAIL_CONFIG.templateId,
                publicKey: EMAIL_CONFIG.publicKey
            },
            timezone: 'Europe/Paris',
            adminInfo: {
                setupDate: new Date().toISOString(),
                userAgent: navigator.userAgent.substring(0, 100)
            }
        };
        
        await setDoc(configRef, enrichedConfig);
        
        // Aussi sauvegarder en local pour compatibilité
        localStorage.setItem('autoEmailConfig', JSON.stringify(config));
        
        console.log('✅ Configuration sauvée dans Firebase et localStorage');
        
        // Vérifier que GitHub Actions peut lire la config
        await testGitHubActionsCompatibility(enrichedConfig);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde Firebase:', error);
        
        // Fallback vers localStorage si Firebase échoue
        localStorage.setItem('autoEmailConfig', JSON.stringify(config));
        console.log('⚠️ Sauvegarde en localStorage uniquement');
        return false;
    }
}

/**
 * CHARGER LA CONFIGURATION DEPUIS FIREBASE
 */
export async function loadEmailConfigFromFirebase() {
    try {
        console.log('📂 Chargement configuration depuis Firebase...');
        
        if (!appState.db || !window.firebaseFunctions) {
            throw new Error('Firebase non initialisé');
        }

        const { doc, getDoc } = window.firebaseFunctions;
        const configRef = doc(appState.db, "email_config", "settings");
        
        const docSnap = await getDoc(configRef);
        
        if (docSnap.exists()) {
            const firebaseConfig = docSnap.data();
            
            // Synchroniser avec localStorage pour compatibilité
            localStorage.setItem('autoEmailConfig', JSON.stringify(firebaseConfig));
            
            console.log('✅ Configuration chargée depuis Firebase');
            console.log('📊 Config:', {
                enabled: firebaseConfig.enabled,
                recipients: firebaseConfig.recipients?.length || 0,
                githubEnabled: firebaseConfig.githubActionsEnabled,
                lastUpdated: firebaseConfig.lastUpdated
            });
            
            return firebaseConfig;
        } else {
            console.log('📋 Aucune configuration Firebase, tentative localStorage...');
            
            // Essayer de charger depuis localStorage
            const localConfig = JSON.parse(localStorage.getItem('autoEmailConfig') || '{}');
            
            if (Object.keys(localConfig).length > 0) {
                console.log('📋 Configuration trouvée en localStorage, migration vers Firebase...');
                // Migrer vers Firebase
                const migrated = await saveEmailConfigToFirebase(localConfig);
                if (migrated) {
                    console.log('✅ Migration localStorage → Firebase réussie');
                }
                return localConfig;
            }
            
            console.log('📋 Aucune configuration trouvée');
            return {};
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement Firebase:', error);
        
        // Fallback vers localStorage
        const localConfig = JSON.parse(localStorage.getItem('autoEmailConfig') || '{}');
        console.log('⚠️ Utilisation localStorage en fallback');
        return localConfig;
    }
}

/**
 * TESTER LA COMPATIBILITÉ GITHUB ACTIONS
 */
async function testGitHubActionsCompatibility(config) {
    try {
        console.log('🔍 Test compatibilité GitHub Actions...');
        
        // Vérifier que tous les champs requis sont présents
        const requiredFields = ['recipients', 'time', 'days', 'enabled'];
        const missingFields = requiredFields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
            console.warn('⚠️ Champs manquants pour GitHub Actions:', missingFields);
            return false;
        }
        
        // Vérifier que EmailJS est configuré
        if (!config.emailConfig || 
            !config.emailConfig.serviceId || 
            !config.emailConfig.templateId) {
            console.warn('⚠️ Configuration EmailJS incomplète');
            return false;
        }
        
        // Vérifier le format des destinataires
        if (!Array.isArray(config.recipients) || config.recipients.length === 0) {
            console.warn('⚠️ Aucun destinataire valide');
            return false;
        }
        
        // Vérifier le format de l'heure
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(config.time)) {
            console.warn('⚠️ Format d\'heure invalide:', config.time);
            return false;
        }
        
        console.log('✅ Configuration compatible avec GitHub Actions');
        return true;
        
    } catch (error) {
        console.error('❌ Erreur test compatibilité:', error);
        return false;
    }
}

/**
 * RÉCUPÉRER LES LOGS D'ENVOI
 */
export async function getEmailLogs(limit = 7) {
    try {
        if (!appState.db || !window.firebaseFunctions) {
            console.warn('Firebase non disponible pour les logs');
            return [];
        }

        const { collection, query, orderBy, limit: limitQuery, getDocs } = 
            await import('https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js');
        
        const logsCollection = collection(appState.db, 'email_logs');
        const logsQuery = query(
            logsCollection, 
            orderBy('timestamp', 'desc'), 
            limitQuery(limit)
        );
        
        const querySnapshot = await getDocs(logsQuery);
        const logs = [];
        
        querySnapshot.forEach((doc) => {
            logs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`📊 ${logs.length} logs d'envoi récupérés`);
        return logs;
        
    } catch (error) {
        console.error('❌ Erreur récupération logs:', error);
        return [];
    }
}

/**
 * AFFICHER LES LOGS D'ENVOI
 */
export async function displayEmailLogs() {
    try {
        const logs = await getEmailLogs();
        
        let logsHtml = '<h5>📊 Historique des envois automatiques</h5>';
        
        if (logs.length === 0) {
            logsHtml += '<p style="color: #999; font-style: italic;">Aucun envoi automatique enregistré</p>';
        } else {
            logsHtml += '<div style="max-height: 200px; overflow-y: auto; margin-top: 10px;">';
            
            logs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleDateString('fr-FR');
                const time = new Date(log.timestamp).toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const statusIcon = log.error_count === 0 ? '✅' : '⚠️';
                const statusColor = log.error_count === 0 ? '#10b981' : '#f59e0b';
                
                logsHtml += `
                    <div style="
                        padding: 10px; 
                        margin: 5px 0; 
                        background: rgba(255,255,255,0.1); 
                        border-radius: 8px;
                        border-left: 3px solid ${statusColor};
                        font-size: 12px;
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${statusIcon} ${date} à ${time}</span>
                            <span style="color: #666;">${log.source || 'manual'}</span>
                        </div>
                        <div style="color: #666; margin-top: 3px;">
                            ✉️ ${log.success_count} envois réussis
                            ${log.error_count > 0 ? `| ❌ ${log.error_count} erreurs` : ''}
                            | 📊 ${log.votes_total} votes
                        </div>
                    </div>
                `;
            });
            
            logsHtml += '</div>';
        }
        
        // Injecter dans l'interface si possible
        const logsContainer = document.getElementById('emailLogs');
        if (logsContainer) {
            logsContainer.innerHTML = logsHtml;
        } else {
            // Créer le container s'il n'existe pas
            const emailConfig = document.getElementById('emailConfig');
            if (emailConfig) {
                const logsDiv = document.createElement('div');
                logsDiv.id = 'emailLogs';
                logsDiv.innerHTML = logsHtml;
                logsDiv.style.cssText = `
                    margin-top: 20px;
                    padding: 20px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.2);
                `;
                emailConfig.appendChild(logsDiv);
            }
        }
        
    } catch (error) {
        console.error('❌ Erreur affichage logs:', error);
    }
}

/**
 * VÉRIFIER LE STATUT GITHUB ACTIONS
 */
export async function checkGitHubActionsStatus() {
    try {
        const config = await loadEmailConfigFromFirebase();
        
        const statusDiv = document.getElementById('githubActionsStatus') || createGitHubStatusDiv();
        
        if (config.enabled && config.githubActionsEnabled) {
            statusDiv.className = 'github-status active';
            statusDiv.innerHTML = `
                <span>🤖 GitHub Actions: Actif</span>
                <div style="font-size: 11px; color: #666; margin-top: 5px;">
                    Envoi automatique configuré pour ${config.time} 
                    les ${getDaysNames(config.days || [])}
                </div>
            `;
        } else if (config.enabled) {
            statusDiv.className = 'github-status warning';
            statusDiv.innerHTML = `
                <span>⚠️ GitHub Actions: Configuration locale uniquement</span>
                <div style="font-size: 11px; color: #666; margin-top: 5px;">
                    Reconfigurer pour activer l'envoi automatique
                </div>
            `;
        } else {
            statusDiv.className = 'github-status inactive';
            statusDiv.innerHTML = `
                <span>🔴 GitHub Actions: Inactif</span>
                <div style="font-size: 11px; color: #666; margin-top: 5px;">
                    Configurer l'envoi automatique pour activer
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ Erreur vérification statut GitHub Actions:', error);
    }
}

function createGitHubStatusDiv() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'githubActionsStatus';
    statusDiv.style.cssText = `
        margin: 15px 0;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
    `;
    
    const emailConfig = document.getElementById('emailConfig');
    if (emailConfig) {
        const firstChild = emailConfig.firstChild;
        if (firstChild) {
            emailConfig.insertBefore(statusDiv, firstChild.nextSibling);
        } else {
            emailConfig.appendChild(statusDiv);
        }
    }
    
    return statusDiv;
}

function getDaysNames(dayNumbers) {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return dayNumbers.map(num => dayNames[num]).join(', ');
}

/**
 * INITIALISER LE SERVICE
 */
export function initFirebaseEmailService() {
    console.log('🚀 Initialisation service email Firebase...');
    
    // Ajouter les styles CSS pour les nouveaux éléments
    addCustomStyles();
    
    // Exposer les fonctions globalement si nécessaire
    window.checkGitHubActionsStatus = checkGitHubActionsStatus;
    window.displayEmailLogs = displayEmailLogs;
    
    console.log('✅ Service email Firebase initialisé');
}

function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .github-status {
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            margin: 15px 0;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        
        .github-status.active {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #047857;
        }
        
        .github-status.warning {
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            color: #92400e;
        }
        
        .github-status.inactive {
            background: rgba(107, 114, 128, 0.15);
            border: 1px solid rgba(107, 114, 128, 0.3);
            color: #374151;
        }
    `;
    document.head.appendChild(style);
}

// Auto-initialisation si le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebaseEmailService);
} else {
    initFirebaseEmailService();
}