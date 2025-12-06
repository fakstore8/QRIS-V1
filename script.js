// QRISPay - Script.js

// Google Sign-In Configuration
const GOOGLE_CLIENT_ID = '926752189712-erj4stvbi8rvbf15m4pt6361friqgv0g.apps.googleusercontent.com'; // Ganti dengan Client ID Anda

// State Management
let currentUser = null;
let balance = 0;
let totalTopup = 0;
let totalWithdraw = 0;
let transactions = [];
let countdownInterval = null;
let selectedEwallet = 'Dana';
let selectedAmount = 0;

// Initialize Google Sign-In
function initGoogleSignIn() {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });
    }
}

// Handle Google Sign-In Response
function handleCredentialResponse(response) {
    try {
        // Decode JWT token
        const token = response.credential;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const userData = JSON.parse(jsonPayload);
        
        // Set current user
        currentUser = {
            name: userData.name,
            email: userData.email,
            initial: userData.name.charAt(0).toUpperCase(),
            picture: userData.picture,
            loginMethod: 'google'
        };
        
        showPage('dashboard');
        document.getElementById('userName').textContent = currentUser.name;
        showSuccessAlert('Login dengan Google berhasil! Selamat datang, ' + currentUser.name);
        
    } catch (error) {
        console.error('Error parsing Google token:', error);
        alert('Terjadi kesalahan saat login dengan Google. Silakan coba lagi.');
    }
}

// Manual Google Login (for button click)
function handleGoogleLogin() {
    if (typeof google !== 'undefined') {
        google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Fallback: show One Tap dialog
                console.log('One Tap not displayed:', notification.getNotDisplayedReason());
                
                // Alternative: Create a temporary div for the button
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'fixed';
                tempDiv.style.top = '50%';
                tempDiv.style.left = '50%';
                tempDiv.style.transform = 'translate(-50%, -50%)';
                tempDiv.style.zIndex = '9999';
                tempDiv.style.background = 'white';
                tempDiv.style.padding = '20px';
                tempDiv.style.borderRadius = '8px';
                tempDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                document.body.appendChild(tempDiv);
                
                google.accounts.id.renderButton(tempDiv, {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    width: 300
                });
                
                // Close button
                const closeBtn = document.createElement('button');
                closeBtn.textContent = '✕';
                closeBtn.style.position = 'absolute';
                closeBtn.style.top = '10px';
                closeBtn.style.right = '10px';
                closeBtn.style.border = 'none';
                closeBtn.style.background = 'none';
                closeBtn.style.fontSize = '20px';
                closeBtn.style.cursor = 'pointer';
                closeBtn.onclick = () => document.body.removeChild(tempDiv);
                tempDiv.appendChild(closeBtn);
            }
        });
    } else {
        // Fallback jika Google API belum dimuat
        alert('Google Sign-In sedang dimuat. Silakan coba lagi dalam beberapa detik.');
        setTimeout(() => {
            initGoogleSignIn();
        }, 1000);
    }
}

// Initialize
window.onload = function() {
    updateHeader();
    
    // Initialize Google Sign-In after page load
    setTimeout(() => {
        initGoogleSignIn();
    }, 500);
};

// Page Navigation
function showPage(page) {
    // Hide all pages
    document.querySelectorAll('[id$="Page"]').forEach(el => el.classList.add('hidden'));
    
    // Show selected page
    document.getElementById(page + 'Page').classList.remove('hidden');
    
    // Update header
    updateHeader();
    
    // Close menu if open
    closeMenu();

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Scroll to top
    window.scrollTo(0, 0);

    // Page specific actions
    if (page === 'dashboard') {
        updateDashboard();
        // Hide success alert after 5 seconds
        setTimeout(() => {
            document.getElementById('successAlert').classList.add('hidden');
        }, 5000);
    } else if (page === 'withdraw') {
        document.getElementById('availableBalance').textContent = formatRupiah(balance);
    }
}

function updateHeader() {
    const headerRight = document.getElementById('headerRight');
    
    if (currentUser) {
        headerRight.innerHTML = `
            <div class="saldo-badge">
                💰 ${formatRupiah(balance)}
            </div>
            <div class="user-initial" onclick="openMenu()">
                ${currentUser.initial}
            </div>
        `;
    } else {
        headerRight.innerHTML = `
            <button class="auth-btn" onclick="showPage('login')">Masuk</button>
            <button class="auth-btn" onclick="showPage('register')" style="background: white; color: #1a1a2e; border: 1px solid #1a1a2e;">Daftar</button>
        `;
    }
}

// Authentication
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = this.querySelector('input[type="email"]').value;
    const name = email.split('@')[0];
    
    currentUser = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email: email,
        initial: name.charAt(0).toUpperCase()
    };
    
    showPage('dashboard');
    document.getElementById('userName').textContent = currentUser.name;
    showSuccessAlert('Login berhasil! Selamat datang kembali.');
});

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = this.querySelector('input[type="text"]').value;
    const email = this.querySelector('input[type="email"]').value;
    const password = this.querySelectorAll('input[type="password"]')[0].value;
    const confirmPassword = this.querySelectorAll('input[type="password"]')[1].value;
    
    if (password !== confirmPassword) {
        alert('Password tidak cocok!');
        return;
    }
    
    currentUser = {
        name: name,
        email: email,
        initial: name.charAt(0).toUpperCase()
    };
    
    showPage('dashboard');
    document.getElementById('userName').textContent = currentUser.name;
    showSuccessAlert('Akun berhasil dibuat! Selamat datang.');
});

function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        currentUser = null;
        balance = 0;
        totalTopup = 0;
        totalWithdraw = 0;
        transactions = [];
        showPage('landing');
    }
}

// Top Up Functions
function selectAmount(amount) {
    selectedAmount = amount;
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('customAmount').value = formatRupiah(amount);
}

function formatAmountInput(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        selectedAmount = parseInt(value);
        input.value = formatRupiah(parseInt(value));
    } else {
        selectedAmount = 0;
    }
}

document.getElementById('topupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const amountInput = document.getElementById('customAmount').value;
    const amount = parseInt(amountInput.replace(/[^0-9]/g, ''));
    const receiverName = document.getElementById('receiverName').value;
    
    if (amount < 10000) {
        alert('Nominal minimal Rp 10.000');
        return;
    }
    
    // Generate reference number
    const refNumber = 'TU' + Date.now() + 'LUV1XG';
    
    // Set payment data
    document.getElementById('refNumber').textContent = refNumber;
    document.getElementById('paymentAmount').textContent = formatRupiah(amount);
    document.getElementById('paymentSender').textContent = currentUser.name;
    document.getElementById('qrisReceiverName').textContent = receiverName;
    document.getElementById('exactAmount').textContent = formatRupiah(amount);
    
    // Set date
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    }) + ' pukul ' + now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.getElementById('paymentDate').textContent = dateStr;
    
    // Start countdown
    startCountdown(1800);
    
    // Store payment info
    window.currentPayment = {
        refNumber: refNumber,
        amount: amount,
        receiverName: receiverName,
        date: dateStr
    };
    
    showPage('payment');
});

function startCountdown(seconds) {
    let remaining = seconds;
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        remaining--;
        
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        document.getElementById('countdown').textContent = 
            `${mins}:${secs.toString().padStart(2, '0')}`;
        
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            alert('Waktu pembayaran habis. Silakan buat transaksi baru.');
            showPage('dashboard');
        }
    }, 1000);
}

function copyRef() {
    const refNumber = document.getElementById('refNumber').textContent;
    navigator.clipboard.writeText(refNumber).then(() => {
        document.getElementById('copyIcon').textContent = '✓';
        setTimeout(() => {
            document.getElementById('copyIcon').textContent = '📋';
        }, 2000);
    });
}

function handleFileUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran file maksimal 5MB');
            return;
        }
        
        // Simulate upload
        setTimeout(() => {
            document.getElementById('uploadSuccess').classList.remove('hidden');
            
            // Add transaction
            setTimeout(() => {
                const payment = window.currentPayment;
                balance += payment.amount;
                totalTopup += payment.amount;
                
                transactions.push({
                    type: 'topup',
                    amount: payment.amount,
                    date: payment.date,
                    ref: payment.refNumber,
                    status: 'success'
                });
                
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                }
                
                showSuccessAlert('Top up berhasil! Saldo Anda telah ditambahkan.');
                showPage('dashboard');
            }, 2000);
        }, 1000);
    }
}

// Withdraw Functions
function selectEwallet(name) {
    selectedEwallet = name;
    document.querySelectorAll('.ewallet-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.ewallet-btn').classList.add('active');
}

document.getElementById('withdrawForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const amountInput = document.getElementById('withdrawAmount').value;
    const amount = parseInt(amountInput.replace(/[^0-9]/g, ''));
    const phone = this.querySelector('input[type="tel"]').value;
    const receiverName = this.querySelectorAll('input[type="text"]')[0].value;
    
    if (amount < 10000) {
        alert('Nominal minimal Rp 10.000');
        return;
    }
    
    if (amount > balance) {
        alert('Saldo tidak mencukupi');
        return;
    }
    
    // Process withdrawal
    balance -= amount;
    totalWithdraw += amount;
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    }) + ' pukul ' + now.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    transactions.push({
        type: 'withdraw',
        amount: amount,
        date: dateStr,
        ewallet: selectedEwallet,
        phone: phone,
        receiver: receiverName,
        status: 'pending'
    });
    
    this.reset();
    showSuccessAlert(`Penarikan sebesar ${formatRupiah(amount)} ke ${selectedEwallet} sedang diproses.`);
    showPage('dashboard');
});

// Dashboard Functions
function updateDashboard() {
    document.getElementById('currentBalance').textContent = formatRupiah(balance);
    document.getElementById('totalTopup').textContent = formatRupiah(totalTopup);
    document.getElementById('totalWithdraw').textContent = formatRupiah(totalWithdraw);
    
    // Update top up history
    const topupHistory = transactions.filter(t => t.type === 'topup');
    const topupHistoryEl = document.getElementById('topupHistory');
    
    if (topupHistory.length > 0) {
        topupHistoryEl.innerHTML = topupHistory.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <h4>Top Up via QRIS</h4>
                    <p class="transaction-date">${t.date}</p>
                </div>
                <div class="transaction-amount positive">+${formatRupiah(t.amount)}</div>
            </div>
        `).join('');
    } else {
        topupHistoryEl.innerHTML = '<div class="empty-state">Belum ada transaksi top up</div>';
    }
    
    // Update withdraw history
    const withdrawHistory = transactions.filter(t => t.type === 'withdraw');
    const withdrawHistoryEl = document.getElementById('withdrawHistory');
    
    if (withdrawHistory.length > 0) {
        withdrawHistoryEl.innerHTML = withdrawHistory.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <h4>Tarik ke ${t.ewallet}</h4>
                    <p class="transaction-date">${t.date}</p>
                </div>
                <div class="transaction-amount negative">-${formatRupiah(t.amount)}</div>
            </div>
        `).join('');
    } else {
        withdrawHistoryEl.innerHTML = '<div class="empty-state">Belum ada transaksi penarikan</div>';
    }
}

function showSuccessAlert(message) {
    const alert = document.getElementById('successAlert');
    document.getElementById('successMessage').textContent = message;
    alert.classList.remove('hidden');
    
    setTimeout(() => {
        alert.classList.add('hidden');
    }, 5000);
}

// Menu Functions
function openMenu() {
    document.getElementById('menuOverlay').classList.add('show');
    document.getElementById('menuSidebar').classList.add('show');
}

function closeMenu() {
    document.getElementById('menuOverlay').classList.remove('show');
    document.getElementById('menuSidebar').classList.remove('show');
}

// Help Functions
function toggleFaq(element) {
    const answer = element.nextElementSibling;
    const arrow = element.querySelector('span:last-child');
    
    if (answer.classList.contains('show')) {
        answer.classList.remove('show');
        arrow.textContent = '▼';
    } else {
        // Close all other FAQs
        document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('show'));
        document.querySelectorAll('.faq-question span:last-child').forEach(a => a.textContent = '▼');
        
        answer.classList.add('show');
        arrow.textContent = '▲';
    }
}

// Utility Functions
function formatRupiah(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID');
}