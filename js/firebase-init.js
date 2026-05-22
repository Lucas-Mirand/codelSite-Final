/* ============================================================
   ECOBIN — Firebase Initialization
   ============================================================ */

const firebaseConfig = {
    apiKey: "AIzaSyBxHk2vUHjuEkEukOGjhBAghEOXaSTlrKU",
    authDomain: "ecobin-9745c.firebaseapp.com",
    projectId: "ecobin-9745c",
    storageBucket: "ecobin-9745c.firebasestorage.app",
    messagingSenderId: "949198108086",
    appId: "1:949198108086:web:673d5314b28e19f5b73d17"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence: multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence: browser not supported');
    }
});

// Gemini API config
const GEMINI_API_KEY = 'AIzaSyCPQyGqyChQdX-mPw0vsJHTa8wRFS6-f9o';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
