function showBet(teamName, odds) {
    const modal = document.getElementById('betModal');
    const teamNameElement = document.getElementById('teamName');
    const modalBalance = document.getElementById('modalBalance');
    const betResult = document.getElementById('betResult');
    const betAmount = document.getElementById('betAmount');
    
    // Güncel bakiyeyi göster
    teamNameElement.textContent = teamName + ` (Oran: %${odds})`;
    modalBalance.textContent = currentUser.balance || 0;
    betResult.style.display = 'none';
    betAmount.value = '';
    
    // Oran bilgisini sakla
    modal.setAttribute('data-odds', odds);
    modal.setAttribute('data-team', teamName);
    
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('betModal');
    modal.style.display = 'none';
}

function confirmBet() {
    const betAmountInput = document.getElementById('betAmount');
    const amount = parseInt(betAmountInput.value);
    const modal = document.getElementById('betModal');
    const teamName = modal.getAttribute('data-team');
    const odds = parseInt(modal.getAttribute('data-odds'));
    
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
    
    // Kazanç hesapla
    const potentialWin = amount + (amount * odds / 100);
    
    // Bakiyeden düş
    const newBalance = currentBalance - amount;
    currentUser.balance = newBalance;
    
    // Firebase veya LocalStorage'a kaydet
    if (firebaseInitialized && currentUser.id) {
        // Firebase'e kaydet
        db.collection('users').doc(currentUser.id).update({
            balance: newBalance
        }).then(() => {
            console.log('✅ Bakiye Firebase\'e kaydedildi');
        }).catch(error => {
            console.error('Firebase kayıt hatası:', error);
        });
    } else {
        // LocalStorage'a kaydet
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const userIndex = users.findIndex(u => u.name === currentUser.name);
        if (userIndex !== -1) {
            users[userIndex].balance = newBalance;
            localStorage.setItem('users', JSON.stringify(users));
        }
    }
    
    // CurrentUser'ı güncelle
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Bakiyeleri güncelle
    document.getElementById('userBalance').textContent = newBalance;
    document.getElementById('modalBalance').textContent = newBalance;
    
    // Bahis geçmişini kaydet
    const betData = {
        team: teamName,
        amount: amount,
        odds: odds,
        potentialWin: potentialWin,
        date: new Date().toLocaleString('tr-TR'),
        resultDate: '01.03.2026 23:00'
    };
    
    if (firebaseInitialized && currentUser.id) {
        // Firebase'e bahis geçmişini kaydet
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
    
    // LocalStorage'a da kaydet (yedek)
    let betHistory = JSON.parse(localStorage.getItem('betHistory_' + currentUser.name)) || [];
    betHistory.push(betData);
    localStorage.setItem('betHistory_' + currentUser.name, JSON.stringify(betHistory));
    
    // Sonuç mesajını göster
    document.getElementById('betResult').style.display = 'block';
    betAmountInput.value = '';
    
    alert(`✅ Bahis başarıyla alındı!\n💰 Yatırılan: ${amount} TL\n🎯 Kazanç Oranı: %${odds}\n💵 Kazanırsanız: ${potentialWin} TL alacaksınız`);
}

window.onclick = function(event) {
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
window.onload = function() {
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
            document.addEventListener('click', function() {
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
        
        // Kullanıcının güncel bakiyesini users listesinden al
        let users = JSON.parse(localStorage.getItem('users')) || [];
        const savedUser = users.find(u => u.name === currentUser.name);
        
        if (savedUser) {
            if (savedUser.balance === undefined || savedUser.balance === null) {
                savedUser.balance = 2000;
                const userIndex = users.findIndex(u => u.name === currentUser.name);
                users[userIndex] = savedUser;
                localStorage.setItem('users', JSON.stringify(users));
            }
            currentUser = savedUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
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
    
    // Bakiye göster
    document.getElementById('userBalance').textContent = currentUser.balance || 2000;
    
    // Menüyü başlangıçta kapalı tut
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
document.getElementById('registerForm').addEventListener('submit', async function(e) {
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
document.getElementById('loginForm').addEventListener('submit', async function(e) {
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
document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('menuOverlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
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
                        betDetails += `<div style="margin: 3px 0; color: #00ffff;">${i+1}. ${bet.team}: ${bet.amount} 💰</div>`;
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
                    betDetails += `<div style="margin: 3px 0; color: #00ffff;">${i+1}. ${bet.team}: ${bet.amount} 💰</div>`;
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
    document.getElementById('betHistoryPage').style.display = 'block';
    
    loadBetHistory();
}

function showMainContent() {
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('betHistoryPage').style.display = 'none';
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
