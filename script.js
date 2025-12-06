// State Management
const state = {
    user: null,
    isAdmin: false,
    transactions: [],
    balance: 0,
    currentPayment: null,
    countdownInterval: null,
    adminFee: 2500,
    qrisImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VXBsb2FkIFFSSVMgQW5kYSBkaSBBZG1pbjwvdGV4dD48L3N2Zz4=',
    nmid: 'ID102539166558',
    brandName: 'QRISPay'
};

// Google OAuth
function loginWithGoogle() {
    // Simulasi login Google - Ganti dengan implementasi OAuth yang sebenarnya
    const mockUser = {
        email: 'user@example.com',
        name: 'Demo User',
        picture: 'https://via.placeholder.com/40',
        id: 'user_' + Math.random().toString(36).substr(2, 9)
    };
    
    state.user = mockUser;
    
    // Check admin (untuk demo, email admin@example.com adalah admin)
    if (mockUser.email === 'fakstore8@gmail.com') {
        state.isAdmin = true;
        document.getElementById('adminTab').style.display = 'block';
    }
    
    showApp();
    loadUserData();
}

function showApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    
    document.getElementById('userProfile').innerHTML = `
        <img src="${state.user.picture}" class="user-avatar" alt="Avatar">
        <div>
            <div style="font-weight: 600; font-size: 14px;">${state.user.name}</div>
            <div style="font-size: 12px; color: var(--text-gray);">${state.user.email}</div>
        </div>
    `;
}

function logout() {
    if (confirm('Yakin ingin keluar?')) {
        state.user = null;
        state.isAdmin = false;
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        document.getElementById('adminTab').style.display = 'none';
    }
}

// Tab Navigation
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(tabName + 'Tab').classList.remove('hidden');
    event.target.classList.add('active');
    
    if (tabName === 'admin') {
        loadAdminData();
        startAdminRefresh();
    } else {
        stopAdminRefresh();
    }
}

// Load User Data
function loadUserData() {
    const savedData = localStorage.getItem('qrispay_' + state.user.id);
    if (savedData) {
        const data = JSON.parse(savedData);
        state.balance = data.balance || 0;
        state.transactions = data.transactions || [];
    }
    
    updateDashboard();
}

function saveUserData() {
    const data = {
        balance: state.balance,
        transactions: state.transactions
    };
    localStorage.setItem('qrispay_' + state.user.id, JSON.stringify(data));
}

function updateDashboard() {
    document.getElementById('userBalance').textContent = formatCurrency(state.balance);
    
    const topupTotal = state.transactions
        .filter(t => t.type === 'topup' && t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const withdrawTotal = state.transactions
        .filter(t => t.type === 'withdraw' && t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0);
    
    document.getElementById('totalTopup').textContent = formatCurrency(topupTotal);
    document.getElementById('totalWithdraw').textContent = formatCurrency(withdrawTotal);
    
    // Recent transactions
    const recent = state.transactions.slice(-5).reverse();
    const tbody = document.getElementById('recentTransactions');
    
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Tidak ada transaksi</td></tr>';
    } else {
        tbody.innerHTML = recent.map(t => `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.type === 'topup' ? 'Top Up' : 'Withdraw'}</td>
                <td>${formatCurrency(t.amount)}</td>
                <td><span class="badge badge-${getStatusClass(t.status)}">${getStatusText(t.status)}</span></td>
            </tr>
        `).join('');
    }
    
    updateHistoryTable();
}

// Top Up
function selectAmount(amount) {
    document.getElementById('topupAmount').value = amount;
    document.querySelectorAll('.amount-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function submitTopup(e) {
    e.preventDefault();
    if (!checkSpam()) return;
    
    const amount = parseInt(document.getElementById('topupAmount').value);
    const sender = document.getElementById('senderName').value;
    const recipient = document.getElementById('recipientName').value;
    const note = document.getElementById('topupNote').value;
    
    if (amount < 10000) {
        showNotification('⚠ Minimal top up Rp 10.000', 'error');
        return;
    }
    
    const transaction = {
        id: generateSecureRef(),
        type: 'topup',
        amount: amount,
        sender: validateInput(document.getElementById('senderName')),
        recipient: validateInput(document.getElementById('recipientName')),
        note: validateInput(document.getElementById('topupNote')),
        date: new Date().toISOString(),
        status: 'pending',
        userId: state.user.id,
        userName: state.user.name,
        userEmail: state.user.email,
        proof: null
    };
    
    state.transactions.push(transaction);
    state.currentPayment = transaction;
    saveUserData();
    saveToGlobal(transaction);
    
    showPaymentModal(transaction);
    document.getElementById('topupForm').reset();
}

function showPaymentModal(transaction) {
    document.getElementById('refNumber').textContent = transaction.id;
    document.getElementById('qrisRecipient').textContent = transaction.recipient;
    document.getElementById('qrisNMID').textContent = state.nmid;
    document.getElementById('paymentAmount').textContent = formatCurrency(transaction.amount);
    document.getElementById('qrisImage').src = state.qrisImage;
    
    document.getElementById('paymentModal').classList.add('active');
    
    startCountdown();
}

function startCountdown() {
    let timeLeft = 15 * 60;
    const countdownEl = document.getElementById('countdown');
    
    if (state.countdownInterval) clearInterval(state.countdownInterval);
    
    state.countdownInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        countdownEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(state.countdownInterval);
            alert('Waktu pembayaran habis!');
            closeModal('paymentModal');
        }
    }, 1000);
}

function previewProof() {
    const file = document.getElementById('proofUpload').files[0];
    
    if (!file) return;
    
    if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
        alert('Format harus JPG atau PNG!');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('proofPreview').src = e.target.result;
        document.getElementById('proofPreview').classList.remove('hidden');
        document.getElementById('submitProofBtn').disabled = false;
    };
    reader.readAsDataURL(file);
}

function submitProof() {
    if (!state.currentPayment) return;
    
    const proofData = document.getElementById('proofPreview').src;
    
    const transaction = state.transactions.find(t => t.id === state.currentPayment.id);
    if (transaction) {
        transaction.proof = proofData;
        saveUserData();
        saveToGlobal(transaction);
    }
    
    showNotification('✓ Bukti transfer berhasil diupload!', 'success');
    closeModal('paymentModal');
    updateDashboard();
    
    if (state.countdownInterval) clearInterval(state.countdownInterval);
}

// Withdraw
function selectEwallet(wallet) {
    document.querySelectorAll('.ewallet-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.ewallet-btn').classList.add('active');
    document.getElementById('selectedEwallet').value = wallet;
}

function submitWithdraw(e) {
    e.preventDefault();
    if (!checkSpam()) return;
    
    const ewallet = document.getElementById('selectedEwallet').value;
    const phone = document.getElementById('withdrawPhone').value;
    const name = document.getElementById('withdrawName').value;
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    
    if (!ewallet) {
        showNotification('⚠ Pilih e-wallet terlebih dahulu!', 'error');
        return;
    }
    
    if (amount < 10000) {
        showNotification('⚠ Minimal withdraw Rp 10.000', 'error');
        return;
    }
    
    const totalAmount = amount + state.adminFee;
    
    if (totalAmount > state.balance) {
        showNotification('⚠ Saldo tidak mencukupi!', 'error');
        return;
    }
    
    const transaction = {
        id: generateSecureRef(),
        type: 'withdraw',
        amount: amount,
        fee: state.adminFee,
        total: totalAmount,
        ewallet: ewallet,
        phone: phone,
        name: name,
        date: new Date().toISOString(),
        status: 'processing',
        userId: state.user.id,
        userName: state.user.name,
        userEmail: state.user.email
    };
    
    state.transactions.push(transaction);
    state.balance -= totalAmount;
    saveUserData();
    saveToGlobal(transaction);
    
    showNotification('✓ Withdraw berhasil diajukan!', 'success');
    document.getElementById('withdrawForm').reset();
    document.querySelectorAll('.ewallet-btn').forEach(btn => btn.classList.remove('active'));
    updateDashboard();
}

// History
function updateHistoryTable() {
    const tbody = document.getElementById('historyTable');
    const transactions = state.transactions.slice().reverse();
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tidak ada riwayat</td></tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => `
        <tr data-type="${t.type}">
            <td>${formatDate(t.date)}</td>
            <td style="font-family: monospace; font-size: 12px;">${t.id}</td>
            <td>${t.type === 'topup' ? 'Top Up' : 'Withdraw'}</td>
            <td>${formatCurrency(t.amount)}</td>
            <td><span class="badge badge-${getStatusClass(t.status)}">${getStatusText(t.status)}</span></td>
            <td>
                ${t.type === 'topup' && t.proof ? `<button class="btn btn-secondary" onclick='viewProof(${JSON.stringify(t.proof).replace(/'/g, "&apos;")})'>Lihat Bukti</button>` : '-'}
            </td>
        </tr>
    `).join('');
}

function filterHistory(type) {
    const rows = document.querySelectorAll('#historyTable tr[data-type]');
    rows.forEach(row => {
        if (type === 'all' || row.dataset.type === type) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function viewProof(proofData) {
    document.getElementById('proofView').src = proofData;
    document.getElementById('proofModal').classList.add('active');
}

// Admin Functions
function showAdminSection(section) {
    document.getElementById('adminTopupsSection').classList.add('hidden');
    document.getElementById('adminWithdrawsSection').classList.add('hidden');
    document.getElementById('adminSettingsSection').classList.add('hidden');
    
    document.getElementById('admin' + section.charAt(0).toUpperCase() + section.slice(1) + 'Section').classList.remove('hidden');
    
    if (section === 'topups' || section === 'withdraws') {
        loadAdminData();
    }
}

function loadAdminData() {
    const allTransactions = getAllTransactions();
    
    const pendingTopups = allTransactions.filter(t => t.type === 'topup' && t.status === 'pending');
    const pendingWithdraws = allTransactions.filter(t => t.type === 'withdraw' && t.status === 'processing');
    
    document.getElementById('pendingTopupCount').textContent = pendingTopups.length;
    document.getElementById('pendingWithdrawCount').textContent = pendingWithdraws.length;
    document.getElementById('totalTransactions').textContent = allTransactions.length;
    
    // Top Up Table
    const topupTbody = document.getElementById('adminTopupTable');
    if (pendingTopups.length === 0) {
        topupTbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Tidak ada data</td></tr>';
    } else {
        topupTbody.innerHTML = pendingTopups.map(t => `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.userName}<br><small style="color: var(--text-gray);">${t.userEmail}</small></td>
                <td>${formatCurrency(t.amount)}</td>
                <td><span class="badge badge-${getStatusClass(t.status)}">${getStatusText(t.status)}</span></td>
                <td>
                    ${t.proof ? `<button class="btn btn-secondary" onclick='viewProof(${JSON.stringify(t.proof).replace(/'/g, "&apos;")})'>Lihat</button>` : 'Belum upload'}
                </td>
                <td>
                    ${t.proof ? `<button class="btn" onclick="confirmTopup('${t.id}', '${t.userId}', ${t.amount})">Konfirmasi</button>` : '-'}
                </td>
            </tr>
        `).join('');
    }
    
    // Withdraw Table
    const withdrawTbody = document.getElementById('adminWithdrawTable');
    if (pendingWithdraws.length === 0) {
        withdrawTbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Tidak ada data</td></tr>';
    } else {
        withdrawTbody.innerHTML = pendingWithdraws.map(t => `
            <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.userName}<br><small style="color: var(--text-gray);">${t.userEmail}</small></td>
                <td>${t.ewallet.toUpperCase()}</td>
                <td>${t.phone}<br><small style="color: var(--text-gray);">${t.name}</small></td>
                <td>${formatCurrency(t.amount)}</td>
                <td><span class="badge badge-${getStatusClass(t.status)}">${getStatusText(t.status)}</span></td>
                <td>
                    <button class="btn" onclick="confirmWithdraw('${t.id}', '${t.userId}')">Selesai</button>
                </td>
            </tr>
        `).join('');
    }
}

function confirmTopup(transactionId, userId, amount) {
    if (!confirm('Konfirmasi saldo untuk transaksi ini?')) return;
    
    updateGlobalTransaction(transactionId, 'success');
    
    if (userId === state.user.id) {
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (transaction) {
            transaction.status = 'success';
            state.balance += amount;
            saveUserData();
            updateDashboard();
        }
    }
    
    showNotification('✓ Saldo berhasil dikonfirmasi!', 'success');
    loadAdminData();
}

function confirmWithdraw(transactionId, userId) {
    if (!confirm('Selesaikan withdraw ini?')) return;
    
    updateGlobalTransaction(transactionId, 'success');
    
    if (userId === state.user.id) {
        const transaction = state.transactions.find(t => t.id === transactionId);
        if (transaction) {
            transaction.status = 'success';
            saveUserData();
            updateDashboard();
        }
    }
    
    showNotification('✓ Withdraw berhasil diselesaikan!', 'success');
    loadAdminData();
}

function updateAdminFee() {
    const fee = parseInt(document.getElementById('adminFeeInput').value);
    state.adminFee = fee;
    document.getElementById('adminFeeDisplay').textContent = formatCurrency(fee);
    localStorage.setItem('qrispay_admin_fee', fee);
}

function uploadQRIS() {
    const file = document.getElementById('qrisUpload').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        state.qrisImage = e.target.result;
        localStorage.setItem('qrispay_qris', state.qrisImage);
        alert('QRIS berhasil diupload!');
    };
    reader.readAsDataURL(file);
}

function updateNMID() {
    state.nmid = document.getElementById('nmidInput').value;
    localStorage.setItem('qrispay_nmid', state.nmid);
}

function updateBrand() {
    state.brandName = document.getElementById('brandInput').value;
    document.querySelectorAll('.logo').forEach(el => {
        el.childNodes[1].textContent = state.brandName;
    });
    localStorage.setItem('qrispay_brand', state.brandName);
}

// Global Storage
function saveToGlobal(transaction) {
    const allTransactions = getAllTransactions();
    const index = allTransactions.findIndex(t => t.id === transaction.id);
    
    if (index >= 0) {
        allTransactions[index] = transaction;
    } else {
        allTransactions.push(transaction);
    }
    
    localStorage.setItem('qrispay_all_transactions', JSON.stringify(allTransactions));
}

function getAllTransactions() {
    const saved = localStorage.getItem('qrispay_all_transactions');
    return saved ? JSON.parse(saved) : [];
}

function updateGlobalTransaction(id, status) {
    const allTransactions = getAllTransactions();
    const transaction = allTransactions.find(t => t.id === id);
    
    if (transaction) {
        transaction.status = status;
        localStorage.setItem('qrispay_all_transactions', JSON.stringify(allTransactions));
    }
}

// Utilities
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusClass(status) {
    const statusMap = {
        'pending': 'pending',
        'processing': 'processing',
        'success': 'success'
    };
    return statusMap[status] || 'pending';
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'Menunggu',
        'processing': 'Diproses',
        'success': 'Selesai'
    };
    return statusMap[status] || status;
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    
    if (modalId === 'paymentModal' && state.countdownInterval) {
        clearInterval(state.countdownInterval);
    }
}

// Anti Spam Protection
let lastSubmitTime = 0;
const SPAM_DELAY = 3000;

function checkSpam() {
    const now = Date.now();
    if (now - lastSubmitTime < SPAM_DELAY) {
        alert('Mohon tunggu beberapa saat sebelum submit lagi.');
        return false;
    }
    lastSubmitTime = now;
    return true;
}

// Input Validation
function validateInput(input) {
    const value = input.value.trim();
    const sanitized = value.replace(/[<>"']/g, '');
    
    if (value !== sanitized) {
        input.value = sanitized;
        alert('Karakter tidak valid terdeteksi dan dihapus.');
    }
    
    return sanitized;
}

// Security: Hash reference number
function generateSecureRef() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    const hash = btoa(timestamp + random).substr(0, 12).toUpperCase();
    return 'TRX' + hash;
}

// Notification system
function showNotification(message, type = 'succes