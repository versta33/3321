function showBet(teamName, displayOdds, actualOdds) {
    const modal = document.getElementById('betModal');
    const teamNameElement = document.getElementById('teamName');
    const modalBalance = document.getElementById('modalBalance');
    const betResult = document.getElementById('betResult');
    const betAmount = document.getElementById('betAmount');

    // Güncel bakiyeyi göster
    teamNameElement.textContent = teamName + ` (Oran: %${displayOdds})`;
    modalBalance.textContent = currentUser.balance || 0;
    betResult.style.display = 'none';
    betAmount.value = '';

    // Oran bilgisini sakla (gerçek oran %400 veya %200)
    modal.setAttribute('data-odds', actualOdds);
    modal.setAttribute('data-display-odds', displayOdds);
    modal.setAttribute('data-team', teamName);

    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('betModal');
    modal.style.display = 'none';
}

function confirmBet() {
    const betAmountInput = document.getElementById('betAmount');
    const amount = parseFloat(betAmountInput.value);
    const modal = document.getElementById('betModal');
    const teamName = modal.getAttribute('data-team');
    const actualOdds = parseFloat(modal.getAttribute('data-odds'));
    const displayOdds = parseFloat(modal.getAttribute('data-display-odds'));

    // Kontroller
    if (!amount || amount <= 0) {
        alert('❌ Lütfen geçerli bir miktar girin!');
        return;
    }

    // currentUser kontrolü
    if (!currentUser || !currentUser.name) {
        alert('❌ Kullanıcı bilgisi bulunamadı!');
        return;
    }

    // Bakiye kontrolü
    const currentBalance = currentUser.balance || 0;
    if (amount > currentBalance) {
        alert('❌ Yetersiz bakiye! Mevcut bakiyeniz: ' + currentBalance);
        return;
    }

    // Kazanç hesapla (Oran neyse o kadar katı)
    const multiplier = displayOdds;
    const potentialWin = Math.floor(amount * multiplier);

    // Bakiyeden düş
    const newBalance = Math.floor(currentBalance - amount);
    currentUser.balance = newBalance;

    // ÖNCE LocalStorage users listesini güncelle
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.name === currentUser.name);
    if (userIndex !== -1) {
        users[userIndex].balance = newBalance;
        localStorage.setItem('users', JSON.stringify(users));
        console.log('✅ Users listesi güncellendi, yeni bakiye:', newBalance);
    }

    // SONRA currentUser'ı güncelle
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    console.log('✅ CurrentUser güncellendi, yeni bakiye:', newBalance);

    // Firebase varsa ona da kaydet
    if (firebaseInitialized && currentUser.id) {
        db.collection('users').doc(currentUser.id).update({
            balance: newBalance
        }).then(() => {
            console.log('✅ Bakiye Firebase\'e kaydedildi');
        }).catch(error => {
            console.error('Firebase kayıt hatası:', error);
        });
    }

    // Ekrandaki bakiyeleri güncelle
    document.getElementById('userBalance').textContent = newBalance;
    document.getElementById('modalBalance').textContent = newBalance;

    // Bahis geçmişini kaydet
    const betData = {
        team: teamName,
        amount: amount,
        odds: displayOdds,
        multiplier: multiplier,
        potentialWin: potentialWin,
        date: new Date().toLocaleString('tr-TR'),
        resultDate: '01.03.2026 23:00'
    };

    if (firebaseInitialized && currentUser.id) {
        db.collection('bets').add({
            userId: currentUser.id,
            userName: currentUser.name,
            ...betData,
            timestamp: new Date()
        }).then(() => {
            console.log('✅ Bahis Firebase\'e kaydedildi');
        }).catch(error => {
            console.error('Bahis kayıt hatası:', error);
        });
    }

    // LocalStorage'a bahis geçmişini kaydet
    let betHistory = JSON.parse(localStorage.getItem('betHistory_' + currentUser.name)) || [];
    betHistory.push(betData);
    localStorage.setItem('betHistory_' + currentUser.name, JSON.stringify(betHistory));

    // Sonuç mesajını göster
    document.getElementById('betResult').style.display = 'block';
    betAmountInput.value = '';

    alert(`✅ Bahis başarıyla alındı!\n💰 Yatırılan: ${amount} TL\n🎯 Kazanç Oranı: %${displayOdds}\n💵 Kazanırsanız: ${potentialWin} TL alacaksınız (${multiplier}x)`);
}

window.onclick = function (event) {
    const modal = document.getElementById('betModal');
    const overlay = document.getElementById('menuOverlay');

    // Modal dışına tıklanırsa modalı kapat
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Kullanıcı Yönetimi
let currentUser = null;

// Sayfa yüklendiğinde kontrol et
window.onload = function () {
    checkAuth();
    initMusic();
}

// Müzik başlatma
function initMusic() {
    const music = document.getElementById('bgMusic');
    if (music) {
        music.volume = 0.15; // %15 ses seviyesi

        // Mobil cihaz kontrolü
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            // Mobilde müziği başlatma (performans için)
            music.pause();
            console.log('📱 Mobil cihaz - Müzik devre dışı');
        } else {
            // Desktop'ta müziği başlat
            document.addEventListener('click', function () {
                music.play().catch(e => console.log('Müzik çalınamadı:', e));
            }, { once: true });
        }
    }
}

function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);

        // Admin kontrolü
        if (currentUser.name === 'Admin') {
            showAdminPanel();
            return;
        }

        // Users listesinden güncel bakiyeyi al
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const savedUser = users.find(u => u.name === currentUser.name);

        if (savedUser && savedUser.balance !== undefined && savedUser.balance !== null) {
            // Users listesindeki bakiye varsa onu kullan
            currentUser.balance = savedUser.balance;
            console.log('✅ Users listesinden bakiye alındı:', currentUser.balance);
        } else if (currentUser.balance === undefined || currentUser.balance === null) {
            // Hiçbir yerde bakiye yoksa 2000 ver
            currentUser.balance = 2000;
            console.log('⚠️ Bakiye bulunamadı, 2000 verildi');

            // Users listesine de kaydet
            if (savedUser) {
                savedUser.balance = 2000;
                const userIndex = users.findIndex(u => u.name === currentUser.name);
                users[userIndex] = savedUser;
                localStorage.setItem('users', JSON.stringify(users));
            }
        }

        // currentUser'ı güncelle
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showMainPage();
    } else {
        showAuthPage();
    }
}

function showMainPage() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('hamburgerMenu').style.display = 'flex';
    document.getElementById('userName').textContent = `👤 ${currentUser.name}`;

    // Set welcome name
    const welcomeNameElement = document.getElementById('welcomeName');
    if (welcomeNameElement) {
        welcomeNameElement.textContent = currentUser.name;
    }

    // Ana içeriği göster, bahis geçmişini, maç sayfasını, aviator'ı ve çarkı gizle
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('matchPage').style.display = 'none';
    document.getElementById('betHistoryPage').style.display = 'none';
    document.getElementById('aviatorPage').style.display = 'none';
    document.getElementById('spinWheelPage').style.display = 'none';
    document.getElementById('minesPage').style.display = 'none';
    document.getElementById('blackjackPage').style.display = 'none';
    // Bakiye göster - currentUser'daki güncel bakiyeyi kullan
    const currentBalance = currentUser.balance !== undefined && currentUser.balance !== null ? currentUser.balance : 2000;
    document.getElementById('userBalance').textContent = currentBalance;

    // Menüyü başlangıçta kapalı tut
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    if (menu) menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

function showMatchPage() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('aviatorPage').style.display = 'none';
    document.getElementById('betHistoryPage').style.display = 'none';
    document.getElementById('spinWheelPage').style.display = 'none';
    document.getElementById('minesPage').style.display = 'none';
    document.getElementById('blackjackPage').style.display = 'none';
    document.getElementById('matchPage').style.display = 'block';

    // Menüyü kapat
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    if (menu) menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

function showAuthPage() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('hamburgerMenu').style.display = 'none';

    // Menüyü kapat
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    if (menu) menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

function showLogin() {
    document.getElementById('authTitle').textContent = 'Giriş Yap';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('authTitle').textContent = 'Kayıt Ol';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Kayıt Formu
document.getElementById('registerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const password = document.getElementById('registerPassword').value;

    try {
        if (firebaseInitialized) {
            // Firebase ile kayıt
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('name', '==', name).get();

            if (!snapshot.empty) {
                alert('❌ Bu isim zaten kayıtlı!');
                return;
            }

            await usersRef.add({
                name: name,
                password: password,
                balance: 2000,
                createdAt: new Date()
            });

            alert('✅ Kayıt başarılı! 2000 bakiye hediye edildi! Şimdi giriş yapabilirsiniz.');
        } else {
            // LocalStorage ile kayıt
            let users = JSON.parse(localStorage.getItem('users')) || [];

            if (users.find(u => u.name === name)) {
                alert('❌ Bu isim zaten kayıtlı!');
                return;
            }

            const newUser = { name, password, balance: 2000 };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            alert('✅ Kayıt başarılı! 2000 bakiye hediye edildi! Şimdi giriş yapabilirsiniz.');
        }

        showLogin();
        document.getElementById('registerForm').reset();
    } catch (error) {
        console.error('Kayıt hatası:', error);
        alert('❌ Kayıt sırasında hata oluştu!');
    }
});

// Giriş Formu
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('loginName').value;
    const password = document.getElementById('loginPassword').value;

    // Admin kontrolü
    if (name === 'admin' && password === 'admin123') {
        currentUser = { name: 'Admin', password: 'admin123' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        alert('✅ Admin girişi başarılı!');
        showAdminPanel();
        document.getElementById('loginForm').reset();
        return;
    }

    try {
        if (firebaseInitialized) {
            // Firebase ile giriş
            const usersRef = db.collection('users');
            const snapshot = await usersRef.where('name', '==', name).where('password', '==', password).get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const userData = doc.data();

                if (!userData.balance && userData.balance !== 0) {
                    userData.balance = 2000;
                    await doc.ref.update({ balance: 2000 });
                }

                currentUser = {
                    id: doc.id,
                    name: userData.name,
                    password: userData.password,
                    balance: userData.balance
                };

                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                alert('✅ Giriş başarılı!');
                showMainPage();
                document.getElementById('loginForm').reset();
            } else {
                alert('❌ İsim veya şifre hatalı!');
            }
        } else {
            // LocalStorage ile giriş
            let users = JSON.parse(localStorage.getItem('users')) || [];
            const user = users.find(u => u.name === name && u.password === password);

            if (user) {
                if (!user.balance && user.balance !== 0) {
                    user.balance = 2000;
                    const userIndex = users.findIndex(u => u.name === name);
                    users[userIndex] = user;
                    localStorage.setItem('users', JSON.stringify(users));
                }

                currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                alert('✅ Giriş başarılı!');
                showMainPage();
                document.getElementById('loginForm').reset();
            } else {
                alert('❌ İsim veya şifre hatalı!');
            }
        }
    } catch (error) {
        console.error('Giriş hatası:', error);
        alert('❌ Giriş sırasında hata oluştu!');
    }
});

// Çıkış Yap
function logout() {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        localStorage.removeItem('currentUser');
        currentUser = null;
        showAuthPage();
    }
}

// Menü Toggle
function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    const hamburger = document.getElementById('hamburgerMenu');

    const isActive = menu.classList.contains('active');

    if (isActive) {
        // Kapat
        menu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    } else {
        // Aç
        menu.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Overlay'e tıklayınca menüyü kapat
document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.getElementById('menuOverlay');
    if (overlay) {
        overlay.addEventListener('click', function () {
            toggleMenu();
        });
    }
});

// Admin Paneli
function showAdminPanel() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('hamburgerMenu').style.display = 'none';

    loadAdminData();
}

function loadAdminData() {
    if (firebaseInitialized) {
        // Firebase'den kullanıcıları çek
        db.collection('users').get().then(snapshot => {
            const users = [];
            snapshot.forEach(doc => {
                users.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            console.log('Firebase kullanıcılar:', users);
            displayAdminData(users);
        }).catch(error => {
            console.error('Firebase veri çekme hatası:', error);
            alert('❌ Kullanıcılar yüklenirken hata oluştu');
        });
    } else {
        // LocalStorage'dan kullanıcıları çek
        let users = JSON.parse(localStorage.getItem('users')) || [];
        console.log('LocalStorage kullanıcılar:', users);
        displayAdminData(users);
    }
}

function displayAdminData(users) {
    // İstatistikler
    document.getElementById('totalUsers').textContent = users.length;

    let totalBalance = 0;
    let totalBets = 0;

    // Firebase'den bahisleri say
    if (firebaseInitialized) {
        db.collection('bets').get().then(snapshot => {
            totalBets = snapshot.size;
            document.getElementById('totalBets').textContent = totalBets;
        });
    }

    users.forEach(user => {
        totalBalance += user.balance || 0;
        if (!firebaseInitialized) {
            let betHistory = JSON.parse(localStorage.getItem('betHistory_' + user.name)) || [];
            totalBets += betHistory.length;
        }
    });

    document.getElementById('totalBalance').textContent = totalBalance;
    if (!firebaseInitialized) {
        document.getElementById('totalBets').textContent = totalBets;
    }

    // Kullanıcı tablosu
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #FFD700; font-size: 1.2em;">📭 Henüz kayıtlı kullanıcı yok</td></tr>';
        return;
    }

    users.forEach((user, index) => {
        const userId = user.id || user.name;
        const userName = user.name;

        // Bahis geçmişini göster
        let betDetails = '<span style="color: #888;">Yükleniyor...</span>';

        if (firebaseInitialized) {
            // Firebase'den bahisleri çek
            db.collection('bets').where('userName', '==', userName).get().then(snapshot => {
                let bets = [];
                snapshot.forEach(doc => {
                    bets.push(doc.data());
                });

                if (bets.length > 0) {
                    betDetails = '<div style="font-size: 0.9em;">';
                    bets.forEach((bet, i) => {
                        betDetails += `<div style="margin: 3px 0; color: #00ffff;">${i + 1}. ${bet.team}: ${bet.amount} 💰</div>`;
                    });
                    betDetails += '</div>';
                } else {
                    betDetails = '<span style="color: #888;">Bahis yok</span>';
                }

                // Tabloyu güncelle
                const cell = document.querySelector(`#bet-cell-${index}`);
                if (cell) cell.innerHTML = betDetails;
            });
        } else {
            // LocalStorage'dan bahisleri al
            let betHistory = JSON.parse(localStorage.getItem('betHistory_' + userName)) || [];

            if (betHistory.length > 0) {
                betDetails = '<div style="font-size: 0.9em;">';
                betHistory.forEach((bet, i) => {
                    betDetails += `<div style="margin: 3px 0; color: #00ffff;">${i + 1}. ${bet.team}: ${bet.amount} 💰</div>`;
                });
                betDetails += '</div>';
            } else {
                betDetails = '<span style="color: #888;">Bahis yok</span>';
            }
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${userName}</td>
            <td>${user.password || '***'}</td>
            <td class="balance-cell">${user.balance || 0}</td>
            <td id="bet-cell-${index}">${betDetails}</td>
            <td>
                <button class="admin-btn edit-btn" onclick="editUserBalance('${userId}', '${userName}')">✏️ Düzenle</button>
                <button class="admin-btn delete-btn" onclick="deleteUser('${userId}', '${userName}')">🗑️ Sil</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editUserBalance(userId, userName) {
    if (firebaseInitialized) {
        // Firebase'den kullanıcıyı bul
        db.collection('users').doc(userId).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const newBalance = prompt(`${userData.name} için yeni bakiye girin:`, userData.balance || 0);

                if (newBalance !== null && newBalance !== '') {
                    const balance = parseInt(newBalance);
                    if (!isNaN(balance) && balance >= 0) {
                        doc.ref.update({ balance: balance }).then(() => {
                            alert('✅ Bakiye güncellendi!');
                            loadAdminData();
                        }).catch(error => {
                            console.error('Bakiye güncelleme hatası:', error);
                            alert('❌ Bakiye güncellenirken hata oluştu');
                        });
                    } else {
                        alert('❌ Geçerli bir sayı girin!');
                    }
                }
            }
        }).catch(error => {
            console.error('Kullanıcı bulma hatası:', error);
            alert('❌ Kullanıcı bulunamadı!');
        });
    } else {
        // LocalStorage'dan kullanıcıyı bul
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.name === userName);

        if (user) {
            const newBalance = prompt(`${user.name} için yeni bakiye girin:`, user.balance || 0);

            if (newBalance !== null && newBalance !== '') {
                const balance = parseInt(newBalance);
                if (!isNaN(balance) && balance >= 0) {
                    const userIndex = users.findIndex(u => u.name === userName);
                    users[userIndex].balance = balance;
                    localStorage.setItem('users', JSON.stringify(users));

                    alert('✅ Bakiye güncellendi!');
                    loadAdminData();
                } else {
                    alert('❌ Geçerli bir sayı girin!');
                }
            }
        } else {
            alert('❌ Kullanıcı bulunamadı!');
        }
    }
}

function deleteUser(userId, userName) {
    if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
        if (firebaseInitialized) {
            // Firebase'den sil
            db.collection('users').doc(userId).delete().then(() => {
                // Kullanıcının bahislerini de sil
                db.collection('bets').where('userName', '==', userName).get().then(snapshot => {
                    snapshot.forEach(doc => {
                        doc.ref.delete();
                    });
                });

                localStorage.removeItem('betHistory_' + userName);
                alert('✅ Kullanıcı silindi!');
                loadAdminData();
            }).catch(error => {
                console.error('Kullanıcı silme hatası:', error);
                alert('❌ Kullanıcı silinirken hata oluştu');
            });
        } else {
            // LocalStorage'dan sil
            let users = JSON.parse(localStorage.getItem('users')) || [];
            users = users.filter(u => u.name !== userName);
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.removeItem('betHistory_' + userName);

            alert('✅ Kullanıcı silindi!');
            loadAdminData();
        }
    }
}

// Admin hesabı oluştur (KALDIRILDI - artık gerek yok)
// Admin direkt giriş yapabilir, users listesinde tutulmaz

// Bahis Geçmişi Sayfası
function showBetHistory() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('aviatorPage').style.display = 'none';
    document.getElementById('betHistoryPage').style.display = 'block';

    loadBetHistory();
}

function showMainContent() {
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('betHistoryPage').style.display = 'none';
    document.getElementById('aviatorPage').style.display = 'none';
}

function loadBetHistory() {
    let betHistory = JSON.parse(localStorage.getItem('betHistory_' + currentUser.name)) || [];

    // İstatistikler
    document.getElementById('totalBetsCount').textContent = betHistory.length;

    let totalSpent = 0;
    betHistory.forEach(bet => {
        totalSpent += bet.amount;
    });
    document.getElementById('totalSpent').textContent = totalSpent;

    // Bahis listesi
    const listContainer = document.getElementById('betHistoryList');

    if (betHistory.length === 0) {
        listContainer.innerHTML = '<div class="no-bets">📭 Henüz bahis yapmadınız.</div>';
        return;
    }

    listContainer.innerHTML = '';

    // Bahisleri ters sırada göster (en yeni üstte)
    betHistory.reverse().forEach((bet, index) => {
        const betCard = document.createElement('div');
        betCard.className = 'bet-card';
        betCard.innerHTML = `
            <div class="bet-card-header">
                <span class="bet-number">#${betHistory.length - index}</span>
                <span class="bet-date">📅 ${bet.date}</span>
            </div>
            <div class="bet-card-body">
                <div class="bet-team">⚽ ${bet.team}</div>
                <div class="bet-amount">💰 ${bet.amount} TL Bahis</div>
                <div class="bet-odds">🎯 Oran: %${bet.odds || 0}</div>
                <div class="bet-potential">💵 Kazanç: ${bet.potentialWin || bet.amount} TL</div>
            </div>
            <div class="bet-card-footer">
                <span class="bet-result-date">🕐 Sonuç: ${bet.resultDate}</span>
            </div>
        `;
        listContainer.appendChild(betCard);
    });
}

// Aviator Game Logic
let aviatorMultiplier = 1.00;
let aviatorInterval;
let aviatorGameActive = false;
let aviatorCrashed = false;
let currentAviatorBet = 0;
let aviatorCrashMultiplier = 0;

function showAviatorPage() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('betHistoryPage').style.display = 'none';
    document.getElementById('matchPage').style.display = 'none';
    document.getElementById('spinWheelPage').style.display = 'none';
    document.getElementById('minesPage').style.display = 'none';
    document.getElementById('blackjackPage').style.display = 'none';
    document.getElementById('aviatorPage').style.display = 'block';

    // Reset state
    resetAviatorGame();
}

function generateCrashMultiplier() {
    // 99% of crashes happen between 1.00x and 10.00x, 1% chance for big multiplier
    const r = Math.random();
    if (r < 0.01) {
        return (Math.random() * 90 + 10).toFixed(2); // 10x - 100x
    } else {
        // More skewed towards lower numbers (1.00 - 3.00 is very common)
        const val = 1.0 + Math.pow(Math.random(), 3) * 9.0;
        return val.toFixed(2);
    }
}

function resetAviatorGame() {
    const screen = document.getElementById('aviatorScreen');
    const plane = document.getElementById('aviatorPlane');
    const multiplierDisplay = document.getElementById('aviatorMultiplier');
    const crashMessage = document.getElementById('aviatorCrash');
    const betBtn = document.getElementById('aviatorBetBtn');
    const cashoutBtn = document.getElementById('aviatorCashoutBtn');
    const betInput = document.getElementById('aviatorBetAmount');

    aviatorGameActive = false;
    aviatorCrashed = false;
    aviatorMultiplier = 1.00;
    currentAviatorBet = 0;

    multiplierDisplay.textContent = '1.00x';
    multiplierDisplay.style.color = '#fff';
    crashMessage.style.display = 'none';
    plane.style.display = 'none';
    plane.style.bottom = '20px';
    plane.style.left = '20px';

    betBtn.style.display = 'block';
    betBtn.disabled = false;
    cashoutBtn.style.display = 'none';
    cashoutBtn.disabled = false;
    cashoutBtn.style.background = '#00cc66';
    betInput.disabled = false;
}

function startAviatorBet() {
    const betAmountInput = document.getElementById('aviatorBetAmount');
    const amount = parseInt(betAmountInput.value);

    if (!amount || amount <= 0) {
        alert('❌ Lütfen geçerli bir miktar girin!');
        return;
    }

    if (!currentUser || !currentUser.name) {
        alert('❌ Kullanıcı bilgisi bulunamadı!');
        return;
    }

    const currentBalance = currentUser.balance || 0;
    if (amount > currentBalance) {
        alert('❌ Yetersiz bakiye! Mevcut bakiyeniz: ' + currentBalance);
        return;
    }

    // Check if game already running
    if (aviatorGameActive) return;

    // Deduct bet from balance immediately
    updateUserBalance(currentBalance - amount);
    currentAviatorBet = amount;

    // UI Updates
    document.getElementById('aviatorBetAmount').disabled = true;
    const betBtn = document.getElementById('aviatorBetBtn');
    const cashoutBtn = document.getElementById('aviatorCashoutBtn');
    betBtn.style.display = 'none';

    // Start Game UI Changes
    cashoutBtn.style.display = 'block';
    cashoutBtn.textContent = `💵 Bozdur (${amount} TL)`;

    document.getElementById('aviatorPlane').style.display = 'block';
    document.getElementById('aviatorCrash').style.display = 'none';
    document.getElementById('aviatorMultiplier').style.color = '#fff';

    // Game initialization
    aviatorGameActive = true;
    aviatorCrashed = false;
    aviatorMultiplier = 1.00;
    aviatorCrashMultiplier = parseFloat(generateCrashMultiplier());

    // Animate
    let tick = 0;
    clearInterval(aviatorInterval);
    aviatorInterval = setInterval(() => {
        tick++;
        // Multiplier logic: slow at first, gets progressively faster.
        aviatorMultiplier += 0.01 * (1 + (tick / 50));

        document.getElementById('aviatorMultiplier').textContent = aviatorMultiplier.toFixed(2) + 'x';

        if (aviatorGameActive && currentAviatorBet > 0) {
            cashoutBtn.textContent = `💵 Bozdur (${(currentAviatorBet * aviatorMultiplier).toFixed(2)} TL)`;
        }

        // Plane Animation rough logic
        const plane = document.getElementById('aviatorPlane');
        // move up and right
        const newBottom = Math.min(80, 20 + (tick * 0.5));
        const newLeft = Math.min(80, 20 + (tick * 0.5));
        plane.style.bottom = newBottom + '%';
        plane.style.left = newLeft + '%';

        // Crash check
        if (aviatorMultiplier >= aviatorCrashMultiplier) {
            crashAviator();
        }
    }, 50); // 50ms interval ~ 20 FPS updates
}

function cashoutAviator() {
    if (!aviatorGameActive || aviatorCrashed) return;

    // Success bozdur
    const wonAmount = Math.floor(currentAviatorBet * aviatorMultiplier);

    // Disable cashout
    currentAviatorBet = 0;
    const cashoutBtn = document.getElementById('aviatorCashoutBtn');
    cashoutBtn.textContent = `✅ Bozduruldu: ${wonAmount} TL`;
    cashoutBtn.style.background = '#888';
    cashoutBtn.disabled = true;

    // Update balance
    const currentBalance = currentUser.balance || 0;
    updateUserBalance(currentBalance + wonAmount);

    alert(`✅ ${wonAmount} TL Kazandınız! (Çarpan: ${aviatorMultiplier.toFixed(2)}x)`);
}

function crashAviator() {
    clearInterval(aviatorInterval);
    aviatorGameActive = false;
    aviatorCrashed = true;

    document.getElementById('aviatorMultiplier').style.color = '#ff3366';
    document.getElementById('aviatorPlane').style.display = 'none';
    document.getElementById('aviatorCrash').style.display = 'block';

    const cashoutBtn = document.getElementById('aviatorCashoutBtn');
    if (currentAviatorBet > 0) {
        // Player didn't cash out
        cashoutBtn.textContent = '💥 KAYBETTİNİZ';
        currentAviatorBet = 0;
    }

    cashoutBtn.disabled = true;
    cashoutBtn.style.background = '#ff3366';

    // Reset after delay
    setTimeout(() => {
        resetAviatorGame();
    }, 4000);
}

function updateUserBalance(newBalance) {
    currentUser.balance = newBalance;

    // ÖNCE LocalStorage users listesini güncelle
    let users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(u => u.name === currentUser.name);
    if (userIndex !== -1) {
        users[userIndex].balance = newBalance;
        localStorage.setItem('users', JSON.stringify(users));
    }

    // SONRA currentUser'ı güncelle
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Firebase varsa ona da kaydet
    if (firebaseInitialized && currentUser.id) {
        db.collection('users').doc(currentUser.id).update({
            balance: newBalance
        }).catch(error => console.error('Firebase kayıt hatası:', error));
    }

    // Ekranı güncelle
    document.getElementById('userBalance').textContent = newBalance;
    const modalBalance = document.getElementById('modalBalance');
    if (modalBalance) modalBalance.textContent = newBalance;
}

// --- GÜNLÜK ÇARK (SPIN WHEEL) MANTIĞI ---

function showSpinWheelPage() {
    document.getElementById('mainContainer').style.display = 'block';

    // Tüm iç sayfaları gizle
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('betHistoryPage').style.display = 'none';
    document.getElementById('aviatorPage').style.display = 'none';
    document.getElementById('matchPage').style.display = 'none';
    document.getElementById('minesPage').style.display = 'none';
    document.getElementById('blackjackPage').style.display = 'none';
    // Çark sayfasını aç
    document.getElementById('spinWheelPage').style.display = 'block';

    // Menüyü kapat
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    if (menu) menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    checkSpinCooldown();
}

let isSpinning = false;
let currentRotation = 0;

const wheelSectors = [
    { start: 0, end: 40, prize: 1000, type: 'win', name: '1000💰' },
    { start: 40, end: 80, prize: 0, type: 'empty', name: 'BOŞ😒' },
    { start: 80, end: 120, prize: 50000, type: 'win', name: '50000💸' },
    { start: 120, end: 160, prize: 0, type: 'empty', name: 'BOŞ😒' },
    { start: 160, end: 200, prize: 200, type: 'win', name: '200💰' },
    { start: 200, end: 240, prize: 0, type: 'empty', name: 'BOŞ😒' },
    { start: 240, end: 280, prize: 2000, type: 'win', name: '2000💰' },
    { start: 280, end: 320, prize: 100, type: 'win', name: '100💰' },
    { start: 320, end: 360, prize: 500, type: 'win', name: '500💰' }
];

function checkSpinCooldown() {
    if (!currentUser || !currentUser.name) return;

    const btn = document.getElementById('spinBtn');
    const msg = document.getElementById('spinMessage');
    const lastSpinDate = localStorage.getItem(`lastSpin_${currentUser.name}`);
    const today = new Date().toDateString();

    if (lastSpinDate === today) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        msg.textContent = 'Bugünlük hakkını kullandın. Yarın tekrar gel! ⏳';
    } else {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        msg.textContent = 'Her gün 1 kez ücretsiz çevir ve kazan! 🎯';
    }
}

function spinWheel() {
    if (isSpinning) return;

    const lastSpinDate = localStorage.getItem(`lastSpin_${currentUser.name}`);
    const today = new Date().toDateString();
    if (lastSpinDate === today) {
        alert("Bugünlük hakkınızı zaten kullandınız!");
        return;
    }

    isSpinning = true;
    const wheel = document.getElementById('wheel');
    const btn = document.getElementById('spinBtn');
    const msg = document.getElementById('spinMessage');

    btn.disabled = true;
    msg.textContent = 'Çark dönüyor... 🎡';

    const extraSpins = 5;
    const randomDegree = Math.floor(Math.random() * 360);
    const totalRotation = currentRotation + (extraSpins * 360) + randomDegree;

    wheel.style.transform = `rotate(${totalRotation}deg)`;
    currentRotation = totalRotation;

    setTimeout(() => {
        isSpinning = false;
        calculateSpinResult(totalRotation);
        localStorage.setItem(`lastSpin_${currentUser.name}`, today);
        checkSpinCooldown();
    }, 4000);
}

function calculateSpinResult(totalRotation) {
    const msg = document.getElementById('spinMessage');
    let normalizedDegree = (360 - (totalRotation % 360)) % 360;

    let winningSector = null;
    for (let i = 0; i < wheelSectors.length; i++) {
        if (normalizedDegree >= wheelSectors[i].start && normalizedDegree < wheelSectors[i].end) {
            winningSector = wheelSectors[i];
            break;
        }
    }

    if (winningSector) {
        if (winningSector.type === 'empty') {
            msg.textContent = `Aboovv! ${winningSector.name} Çıktı! Şansına küs! 😭`;
        } else {
            msg.textContent = `Tebrikler! ${winningSector.name} kazandınız! 🎉`;

            const currentBalance = currentUser.balance || 0;
            const newBalance = currentBalance + winningSector.prize;
            updateUserBalance(newBalance);

            // Add to bet history as a "win"
            let history = JSON.parse(localStorage.getItem(`betHistory_${currentUser.name}`)) || [];
            history.push({
                date: new Date().toLocaleString(),
                team: '🎡 Günlük Çark Ödülü',
                amount: 0,
                status: 'won',
                winAmount: winningSector.prize
            });
            localStorage.setItem(`betHistory_${currentUser.name}`, JSON.stringify(history));

            // Update modal/balance display safely
            const modalBalance = document.getElementById('modalBalance');
            if (modalBalance) modalBalance.textContent = newBalance;
        }
    } else {
        msg.textContent = "Bir hata oluştu, tekrar deneyin.";
    }
}

// --- MAYIN OYUNU (MINES) MANTIĞI ---

function showMinesPage() {
    document.getElementById('mainContainer').style.display = 'block';

    // Tüm iç sayfaları gizle
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('betHistoryPage').style.display = 'none';
    document.getElementById('aviatorPage').style.display = 'none';
    document.getElementById('matchPage').style.display = 'none';
    document.getElementById('spinWheelPage').style.display = 'none';
    document.getElementById('blackjackPage').style.display = 'none';
    // Sayfayı aç
    document.getElementById('minesPage').style.display = 'block';

    // Menüyü kapat
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    if (menu) menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}
let minesGameActive = false;
let currentMinesBet = 0;
let totalMines = 3;
let safeSpotsRevealed = 0;
let currentMinesMultiplier = 1.00;
let minesGridData = []; // 0 = safe, 1 = mine

function initMinesGrid() {
    const grid = document.getElementById('minesGrid');
    grid.innerHTML = '';
    minesGridData = new Array(25).fill(0);

    for (let i = 0; i < 25; i++) {
        const btn = document.createElement('button');
        btn.className = 'mines-btn';
        btn.id = `mine-btn-${i}`;
        btn.textContent = '❓';
        btn.onclick = () => handleMineClick(i);
        btn.disabled = true; // startMinesBet çağrılana kadar kapalı
        grid.appendChild(btn);
    }
}

// Sayfa yüklendiğinde veya script çalıştığında ızgarayı hazırla
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMinesGrid);
} else {
    initMinesGrid();
}

function startMinesBet() {
    if (minesGameActive) return;

    const amountInput = document.getElementById('minesBetAmount').value;
    const amount = parseInt(amountInput);

    if (isNaN(amount) || amount <= 0) {
        alert('❌ Lütfen geçerli bir bahis miktarı girin!');
        return;
    }

    if (!currentUser || !currentUser.name) {
        alert('❌ Kullanıcı bilgisi bulunamadı!');
        return;
    }

    const currentBalance = currentUser.balance || 0;
    if (amount > currentBalance) {
        alert('❌ Yetersiz bakiye! Mevcut bakiyeniz: ' + currentBalance);
        return;
    }

    // Seçilen mayın sayısı
    totalMines = parseInt(document.getElementById('minesCount').value);

    // Bakiyeden düş
    updateUserBalance(currentBalance - amount);
    currentMinesBet = amount;

    // UI Güncelleme
    document.getElementById('minesBetAmount').disabled = true;
    document.getElementById('minesCount').disabled = true;

    document.getElementById('minesBetBtn').style.display = 'none';
    document.getElementById('minesCashoutBtn').style.display = 'block';
    document.getElementById('minesMultiplierDisplay').style.display = 'block';
    document.getElementById('minesOverlayMsg').style.display = 'none';

    safeSpotsRevealed = 0;
    currentMinesMultiplier = 1.00;
    updateMinesMultiplierUI();

    // Mayınları yerleştir (0 = safe, 1 = mine)
    minesGridData = new Array(25).fill(0);
    let minesPlaced = 0;
    while (minesPlaced < totalMines) {
        let randIndex = Math.floor(Math.random() * 25);
        if (minesGridData[randIndex] === 0) {
            minesGridData[randIndex] = 1;
            minesPlaced++;
        }
    }

    // Izgarayı sıfırla ve butonları aktifleştir
    const grid = document.getElementById('minesGrid');
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const btn = document.createElement('button');
        btn.className = 'mines-btn';
        btn.id = `mine-btn-${i}`;
        btn.textContent = '❓';
        btn.onclick = () => handleMineClick(i);
        grid.appendChild(btn);
    }

    minesGameActive = true;
}

function handleMineClick(index) {
    if (!minesGameActive) return;

    const btn = document.getElementById(`mine-btn-${index}`);
    if (btn.disabled) return; // Zaten tıklandıysa geç

    btn.disabled = true;

    if (minesGridData[index] === 1) {
        // Boom! Mayına bastı
        btn.textContent = '💣';
        btn.classList.add('revealed-mine');
        endMinesGame(false);
    } else {
        // Güvenli bölge (altın)
        safeSpotsRevealed++;
        btn.textContent = '💎';
        btn.classList.add('revealed-safe');

        // Çarpanı hesapla
        calculateNextMinesMultiplier();
        updateMinesMultiplierUI();

        // Eğer tüm güvenli bölgeler açıldıysa otomatik kazanır
        if (safeSpotsRevealed === (25 - totalMines)) {
            cashoutMines();
        }
    }
}

function calculateNextMinesMultiplier() {
    // Tam kombinasyon matematiği yerine pratik formül:
    let probability = 1.0;
    for (let i = 0; i < safeSpotsRevealed; i++) {
        probability *= (25 - totalMines - i) / (25 - i);
    }

    // Çarpan = (1 / Olasılık) * 0.97 (Kasa avantajı)
    if (probability > 0) {
        currentMinesMultiplier = (1 / probability) * 0.97;
    }
}

function updateMinesMultiplierUI() {
    document.getElementById('minesCurrentMultiplier').textContent = currentMinesMultiplier.toFixed(2);

    const potentialWin = (currentMinesBet * currentMinesMultiplier).toFixed(2);
    document.getElementById('minesCurrentWin').textContent = potentialWin;
}

function cashoutMines() {
    if (!minesGameActive || safeSpotsRevealed === 0) return;

    const winAmount = parseFloat((currentMinesBet * currentMinesMultiplier).toFixed(2));

    // Bakiyeye ekle
    const currentBalance = currentUser.balance || 0;
    updateUserBalance(currentBalance + winAmount);

    // Geçmişe ekle
    let history = JSON.parse(localStorage.getItem(`betHistory_${currentUser.name}`)) || [];
    history.push({
        date: new Date().toLocaleString(),
        team: `💣 Mayın (${totalMines} Mayın, ${currentMinesMultiplier.toFixed(2)}x)`,
        amount: currentMinesBet,
        status: 'won',
        winAmount: winAmount - currentMinesBet
    });
    localStorage.setItem(`betHistory_${currentUser.name}`, JSON.stringify(history));

    // UI Mesajı
    const overlay = document.getElementById('minesOverlayMsg');
    overlay.textContent = `KAZANDIN: ${winAmount} TL!`;
    overlay.style.color = '#00ff00';
    overlay.style.display = 'block';

    endMinesGame(true);
}

function endMinesGame(isWin) {
    minesGameActive = false;

    // Tüm mayınları ve elmasları göster
    for (let i = 0; i < 25; i++) {
        const btn = document.getElementById(`mine-btn-${i}`);
        btn.disabled = true;
        if (minesGridData[i] === 1) {
            btn.textContent = '💣';
            if (!btn.classList.contains('revealed-mine')) {
                btn.style.opacity = '0.5'; // patlamayan mayınlar soluk
            }
        } else {
            if (btn.textContent === '❓') {
                btn.textContent = '💎';
                btn.style.opacity = '0.3'; // açılmayan elmaslar saydam
            }
        }
    }

    if (!isWin) {
        // Kaybetme durumu geçmişe ekle
        let history = JSON.parse(localStorage.getItem(`betHistory_${currentUser.name}`)) || [];
        history.push({
            date: new Date().toLocaleString(),
            team: `💣 Mayın (${totalMines} Mayın)`,
            amount: currentMinesBet,
            status: 'lost',
            winAmount: -currentMinesBet
        });
        localStorage.setItem(`betHistory_${currentUser.name}`, JSON.stringify(history));

        const overlay = document.getElementById('minesOverlayMsg');
        overlay.textContent = `PATLADIN!`;
        overlay.style.color = '#ff0000';
        overlay.style.display = 'block';
    }

    // Araç çubuklarını sıfırla (Biraz bekleyip yeni oyun için açabiliriz)
    setTimeout(() => {
        document.getElementById('minesBetAmount').disabled = false;
        document.getElementById('minesCount').disabled = false;

        document.getElementById('minesBetBtn').style.display = 'block';
        document.getElementById('minesCashoutBtn').style.display = 'none';

        // Overlay kalsın bir süre, oyuncu görsün
        setTimeout(() => {
            document.getElementById('minesOverlayMsg').style.display = 'none';
            initMinesGrid();
        }, 1500);

    }, 2500);
}

// --- AI BLACKJACK MANTIĞI ---

let bjDeck = [];
let bjPlayerCards = [];
let bjDealerCards = [];
let bjCurrentBet = 0;
let bjGameActive = false;

function showBlackjackPage() {
    document.getElementById('mainContainer').style.display = 'block';

    // Tüm iç sayfaları gizle
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('betHistoryPage').style.display = 'none';
    document.getElementById('aviatorPage').style.display = 'none';
    document.getElementById('matchPage').style.display = 'none';
    document.getElementById('spinWheelPage').style.display = 'none';
    document.getElementById('minesPage').style.display = 'none';

    // BJ sayfasını aç
    document.getElementById('blackjackPage').style.display = 'block';

    // Menüyü kapat
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    if (menu) menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

function createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];

    for (let suit of suits) {
        for (let value of values) {
            let weight = parseInt(value);
            if (value === 'J' || value === 'Q' || value === 'K') weight = 10;
            if (value === 'A') weight = 11;

            deck.push({ Value: value, Suit: suit, Weight: weight });
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = 0; i < 1000; i++) {
        let location1 = Math.floor((Math.random() * deck.length));
        let location2 = Math.floor((Math.random() * deck.length));
        let tmp = deck[location1];
        deck[location1] = deck[location2];
        deck[location2] = tmp;
    }
}

function calculateScore(cards) {
    let score = 0;
    let aces = 0;

    for (let i = 0; i < cards.length; i++) {
        score += cards[i].Weight;
        if (cards[i].Value === 'A') aces++;
    }

    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }

    return score;
}

function renderCard(card, hidden = false) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'bj-card';
    if (hidden) {
        cardDiv.classList.add('hidden');
        cardDiv.innerHTML = '?';
        return cardDiv;
    }

    if (card.Suit === 'hearts' || card.Suit === 'diamonds') {
        cardDiv.classList.add('red');
    } else {
        cardDiv.classList.add('black');
    }

    let suitSymbol = '';
    switch (card.Suit) {
        case 'hearts': suitSymbol = '♥'; break;
        case 'diamonds': suitSymbol = '♦'; break;
        case 'clubs': suitSymbol = '♣'; break;
        case 'spades': suitSymbol = '♠'; break;
    }

    cardDiv.innerHTML = `${card.Value}<br>${suitSymbol}`;
    return cardDiv;
}

function updateBJBoard(dealerHidden = false) {
    const pContainer = document.getElementById('playerCards');
    const dContainer = document.getElementById('dealerCards');

    pContainer.innerHTML = '';
    dContainer.innerHTML = '';

    // Player
    for (let card of bjPlayerCards) {
        pContainer.appendChild(renderCard(card));
    }
    document.getElementById('playerScore').textContent = `(${calculateScore(bjPlayerCards)})`;

    // Dealer
    for (let i = 0; i < bjDealerCards.length; i++) {
        if (i === 1 && dealerHidden) {
            dContainer.appendChild(renderCard(bjDealerCards[i], true));
        } else {
            dContainer.appendChild(renderCard(bjDealerCards[i]));
        }
    }

    if (dealerHidden) {
        // Only show first card score
        document.getElementById('dealerScore').textContent = `(${bjDealerCards[0].Weight === 11 ? 11 : bjDealerCards[0].Weight})`;
    } else {
        document.getElementById('dealerScore').textContent = `(${calculateScore(bjDealerCards)})`;
    }
}

function startBlackjack() {
    if (bjGameActive) return;

    const amountInput = document.getElementById('bjBetAmount').value;
    const amount = parseInt(amountInput);

    if (isNaN(amount) || amount <= 0) {
        alert('❌ Lütfen geçerli bir bahis miktarı girin!');
        return;
    }

    if (!currentUser || !currentUser.name) {
        alert('❌ Kullanıcı bilgisi bulunamadı!');
        return;
    }

    const currentBalance = currentUser.balance || 0;
    if (amount > currentBalance) {
        alert('❌ Yetersiz bakiye! Mevcut bakiyeniz: ' + currentBalance);
        return;
    }

    // Bakiyeden düş
    updateUserBalance(currentBalance - amount);
    bjCurrentBet = amount;
    bjGameActive = true;

    // UI Update
    document.getElementById('bjBettingControls').style.display = 'none';
    document.getElementById('bjActionControls').style.display = 'flex';
    document.getElementById('bjMessage').textContent = 'Oyun başladı, bol şans!';

    // Setup Game
    bjDeck = createDeck();
    shuffleDeck(bjDeck);

    bjPlayerCards = [bjDeck.pop(), bjDeck.pop()];
    bjDealerCards = [bjDeck.pop(), bjDeck.pop()];

    updateBJBoard(true); // Dealer's second card is hidden

    // Check Blackjack
    const pScore = calculateScore(bjPlayerCards);
    if (pScore === 21) {
        endBlackjackGame();
    }
}

function hitBlackjack() {
    if (!bjGameActive) return;

    bjPlayerCards.push(bjDeck.pop());
    updateBJBoard(true);

    if (calculateScore(bjPlayerCards) > 21) {
        endBlackjackGame();
    }
}

function standBlackjack() {
    if (!bjGameActive) return;
    endBlackjackGame();
}

function endBlackjackGame() {
    bjGameActive = false;

    // Dealer plays (Hit until 17 or higher)
    let pScore = calculateScore(bjPlayerCards);

    if (pScore <= 21) {
        let dScore = calculateScore(bjDealerCards);
        while (dScore < 17) {
            bjDealerCards.push(bjDeck.pop());
            dScore = calculateScore(bjDealerCards);
        }
    }

    updateBJBoard(false); // Reveal all dealer cards

    const msg = document.getElementById('bjMessage');
    const finalDScore = calculateScore(bjDealerCards);

    let result = '';
    let payout = 0;

    if (pScore > 21) {
        msg.textContent = '❌ BUST! 21\'i geçtin ve kaybettin.';
        msg.style.color = '#ff3366';
        result = 'lost';
    } else if (finalDScore > 21) {
        msg.textContent = '✅ KURPİYER BATTI! Kazandın.';
        msg.style.color = '#00ff00';
        payout = bjCurrentBet * 2;
        result = 'won';
    } else if (pScore === finalDScore) {
        msg.textContent = '🤝 BERABERE! Şanslısın, bahsi sen kazandın!';
        msg.style.color = '#00ff00';
        payout = bjCurrentBet * 2; // changed from return bet to win
        result = 'won';
    } else if (pScore > finalDScore) {
        msg.textContent = '✅ KAZANDIN! Kurpiyeri alt ettin.';
        msg.style.color = '#00ff00';
        payout = bjCurrentBet * 2;
        // Blackjack payout (2.5x) if 21 on first 2 cards
        if (pScore === 21 && bjPlayerCards.length === 2) {
            payout = bjCurrentBet * 2.5;
            msg.textContent = '🔥 BLACKJACK! Kazandın.';
        }
        result = 'won';
    } else {
        msg.textContent = '❌ KAYBETTİN! Kurpiyerin eli daha yüksek.';
        msg.style.color = '#ff3366';
        result = 'lost';
    }

    // Payout and history
    if (payout > 0) {
        const currentBalance = currentUser.balance || 0;
        updateUserBalance(currentBalance + payout);
    }

    let history = JSON.parse(localStorage.getItem(`betHistory_${currentUser.name}`)) || [];
    let winAmt = payout - bjCurrentBet;
    if (result === 'push') winAmt = 0; // neither won nor lost extra

    history.push({
        date: new Date().toLocaleString(),
        team: `🃏 AI Blackjack`,
        amount: bjCurrentBet,
        status: result === 'won' ? 'won' : (result === 'push' ? 'pending' : 'lost'),
        winAmount: winAmt
    });
    localStorage.setItem(`betHistory_${currentUser.name}`, JSON.stringify(history));

    // Reset UI after delay
    setTimeout(() => {
        document.getElementById('bjBettingControls').style.display = 'flex';
        document.getElementById('bjActionControls').style.display = 'none';
    }, 3000);
}

