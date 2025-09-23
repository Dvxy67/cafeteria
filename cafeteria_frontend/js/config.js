// config.js - Configuration simplifiée sans administration

// Configuration Firebase
export const firebaseConfig = {
    apiKey: "AIzaSyAeotUUuHLEmDoQHn3wUE9iXQdA8-T6cig",
    authDomain: "cafeteria-du-foyer.firebaseapp.com",
    projectId: "cafeteria-du-foyer",
    storageBucket: "cafeteria-du-foyer.firebasestorage.app",
    messagingSenderId: "762470338871",
    appId: "1:762470338871:web:4a6380d0f5618b0c060ab2"
};

// Configuration de l'application
export const CONFIG = {
    CLOSING_HOUR: 10,
    CLOSING_MINUTE: 30,
    IMAGE_URL: "https://res.cloudinary.com/dvtv7bku4/image/upload/v1732203557/cafeteria-menus/menu_placeholder.jpg"
};

// Variables globales d'état
export let appState = {
    votes: {},
    isVotingOpen: true,
    hasVotedToday: false,
    unsubscribe: null,
    db: null,
    currentImageURL: null
};