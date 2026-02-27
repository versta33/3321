// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBhO3I3WCA4wGWjb46UQRoTlO7USikV0KE",
    authDomain: "futbol-bahis-2f82d.firebaseapp.com",
    projectId: "futbol-bahis-2f82d",
    storageBucket: "futbol-bahis-2f82d.firebasestorage.app",
    messagingSenderId: "916786631432",
    appId: "1:916786631432:web:74b8cf4b360738f2b2d2bd",
    measurementId: "G-32SDXFMZXD"
};

// Firebase'i başlat
let db;
let firebaseInitialized = false;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        firebaseInitialized = true;
        console.log('✅ Firebase başlatıldı');
    } else {
        console.log('⚠️ Firebase SDK yüklenmedi, LocalStorage kullanılacak');
    }
} catch (error) {
    console.error('❌ Firebase başlatma hatası:', error);
    console.log('⚠️ LocalStorage kullanılacak');
}
