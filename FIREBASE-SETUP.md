# Firebase Kurulum Talimatları

## Adım 1: Firebase Projesi Oluştur

1. https://console.firebase.google.com/ adresine git
2. "Add project" (Proje ekle) butonuna tıkla
3. Proje adı gir (örn: "futbol-bahis")
4. Google Analytics'i istersen aktif et (opsiyonel)
5. "Create project" butonuna tıkla

## Adım 2: Web App Ekle

1. Firebase Console'da projenin ana sayfasında
2. Web ikonu (</>) tıkla
3. App nickname gir (örn: "Bahis Web")
4. "Register app" butonuna tıkla
5. Firebase SDK configuration kodunu kopyala

## Adım 3: Firestore Database Oluştur

1. Sol menüden "Firestore Database" seç
2. "Create database" butonuna tıkla
3. "Start in test mode" seç (geliştirme için)
4. Location seç (Europe-west3 - Frankfurt önerilir)
5. "Enable" butonuna tıkla

## Adım 4: Authentication Aktif Et

1. Sol menüden "Authentication" seç
2. "Get started" butonuna tıkla
3. "Email/Password" seçeneğini aktif et
4. "Save" butonuna tıkla

## Adım 5: Firebase Config'i Güncelle

1. Firebase Console'dan aldığın config kodunu kopyala
2. `firebase-config.js` dosyasını aç
3. `firebaseConfig` objesini kendi bilgilerinle değiştir:

```javascript
const firebaseConfig = {
    apiKey: "BURAYA-KENDI-API-KEY",
    authDomain: "BURAYA-KENDI-AUTH-DOMAIN",
    databaseURL: "BURAYA-KENDI-DATABASE-URL",
    projectId: "BURAYA-KENDI-PROJECT-ID",
    storageBucket: "BURAYA-KENDI-STORAGE-BUCKET",
    messagingSenderId: "BURAYA-KENDI-SENDER-ID",
    appId: "BURAYA-KENDI-APP-ID"
};
```

## Adım 6: Firestore Kurallarını Güncelle

Firebase Console > Firestore Database > Rules sekmesine git ve şu kuralları ekle:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true;
    }
    match /bets/{betId} {
      allow read, write: if true;
    }
  }
}
```

"Publish" butonuna tıkla.

## Adım 7: Test Et

1. Siteyi aç
2. Yeni kullanıcı kaydı yap
3. Firebase Console > Firestore Database'de kullanıcıyı göreceksin
4. Admin paneline giriş yap (admin@admin.com / admin123)
5. Tüm kullanıcıları görebileceksin

## Önemli Notlar

- Test mode 30 gün sonra kapanır, production kuralları yazman gerekir
- API Key'i public olarak paylaşmak güvenlidir (Firebase'in tasarımı böyle)
- Güvenlik için Firestore Rules'u düzgün yapılandır

## Sorun Giderme

Eğer Firebase çalışmazsa:
1. Console'da (F12) hata mesajlarını kontrol et
2. Firebase config'in doğru olduğundan emin ol
3. Internet bağlantını kontrol et
4. Firestore Database'in aktif olduğunu kontrol et
