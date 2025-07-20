// Dashboard specific variables
let currentUser = JSON.parse(localStorage.getItem('current_user'));
let users = JSON.parse(localStorage.getItem('upi_users')) || {};
let inactivityTimer;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    initializeDashboard();
    setupDashboardEventListeners();
    loadTransactions();
    generateUserQR();
    setupInactivityDetection();
    setupUserDropdown();
});

function initializeDashboard() {
    // Update user greeting
    document.getElementById('userGreeting').textContent = `Welcome back, ${currentUser.name}!`;
    
    // Update balance
    document.getElementById('walletBalance').textContent = currentUser.balance.toFixed(2);
    
    // Update UPI ID
    document.getElementById('userUpiId').textContent = currentUser.upiId;
    
    // Update dropdown user info
    if (document.getElementById('userNameDropdown')) {
        document.getElementById('userNameDropdown').textContent = currentUser.name;
        document.getElementById('userUpiDropdown').textContent = currentUser.upiId;
    }
}

function setupDashboardEventListeners() {
    // Send money form
    document.getElementById('sendMoneyForm').addEventListener('submit', handleSendMoney);
    
    // Request money form
    document.getElementById('requestMoneyForm').addEventListener('submit', handleRequestMoney);
    
    // Add money form
    document.getElementById('addMoneyForm').addEventListener('submit', handleAddMoney);
}

// Enhanced logout with confirmation
function logout() {
    document.getElementById('logoutModal').style.display = 'block';
}

function confirmLogout() {
    closeModal('logoutModal');
    
    // Show logout progress
    showMessage('Logging out...', 'info');
    
    // Add loading to logout button
    const logoutButtons = document.querySelectorAll('[onclick="confirmLogout()"]');
    logoutButtons.forEach(btn => {
        btn.innerHTML = '<div class="loading"></div> Logging out...';
        btn.disabled = true;
    });
    
    // Clear timers
    clearTimeout(inactivityTimer);
    
    // Clear session data
    localStorage.removeItem('current_user');
    
    // Optional: Keep user data but clear session
    // localStorage.clear(); // Uncomment to clear all data
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// Setup user dropdown menu
function setupUserDropdown() {
    document.addEventListener('click', function(event) {
        const userMenu = document.querySelector('.user-menu');
        const dropdown = document.getElementById('userDropdown');
        
        if (!userMenu || !dropdown) return;
        
        if (!userMenu.contains(event.target)) {
            dropdown.classList.remove('show');
        }
    });
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

// Auto-logout functionality
function setupInactivityDetection() {
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            showMessage('Session will expire in 1 minute due to inactivity', 'info');
            
            setTimeout(() => {
                showMessage('Session expired due to inactivity. Logging out...', 'info');
                setTimeout(() => {
                    localStorage.removeItem('current_user');
                    window.location.href = 'index.html';
                }, 2000);
            }, 60000); // 1 minute warning
        }, 29 * 60 * 1000); // 29 minutes
    }

    // Reset timer on user activity
    ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();
}

// Modal functions for dashboard
function showSendMoney() {
    document.getElementById('sendMoneyModal').style.display = 'block';
}

function showRequestMoney() {
    document.getElementById('requestMoneyModal').style.display = 'block';
}

function showAddMoney() {
    document.getElementById('addMoneyModal').style.display = 'block';
}

function showQRScanner() {
    document.getElementById('qrScannerModal').style.display = 'block';
    simulateQRScanning();
}

function showMyQR() {
    document.getElementById('myQRModal').style.display = 'block';
}

function showProfile() {
    // Placeholder for profile functionality
    showMessage('Profile feature - Coming soon!', 'info');
    document.getElementById('userDropdown').classList.remove('show');
}

function showSettings() {
    // Placeholder for settings functionality
    showMessage('Settings feature - Coming soon!', 'info');
    document.getElementById('userDropdown').classList.remove('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Send money handler
function handleSendMoney(event) {
    event.preventDefault();
    
    const recipientId = document.getElementById('recipientUPI').value.trim();
    const amount = parseFloat(document.getElementById('sendAmount').value);
    const note = document.getElementById('sendNote').value.trim();
    const pin = document.getElementById('sendPin').value;
    
    // Validation
    if (pin !== currentUser.pin) {
        showMessage('Invalid PIN', 'error');
        return;
    }
    
    if (amount <= 0) {
        showMessage('Please enter a valid amount', 'error');
        return;
    }
    
    if (amount > currentUser.balance) {
        showMessage('Insufficient balance', 'error');
        return;
    }
    
    // Find recipient
    let recipient = null;
    for (let phone in users) {
        if (users[phone].upiId === recipientId || users[phone].phone === recipientId) {
            recipient = users[phone];
            break;
        }
    }
    
    if (!recipient) {
        showMessage('Recipient not found', 'error');
        return;
    }
    
    if (recipient.phone === currentUser.phone) {
        showMessage('Cannot send money to yourself', 'error');
        return;
    }
    
    // Process transaction
    const transactionId = generateTransactionId();
    const transaction = {
        id: transactionId,
        type: 'sent',
        amount: amount,
        recipient: recipient.name,
        recipientUPI: recipient.upiId,
        note: note,
        timestamp: new Date().toISOString(),
        status: 'completed'
    };
    
    // Update balances
    currentUser.balance -= amount;
    recipient.balance += amount;
    
    // Add transaction to both users
    currentUser.transactions.unshift(transaction);
    recipient.transactions.unshift({
        ...transaction,
        type: 'received',
        recipient: currentUser.name,
        recipientUPI: currentUser.upiId
    });
    
    // Save to localStorage
    users[currentUser.phone] = currentUser;
    users[recipient.phone] = recipient;
    localStorage.setItem('upi_users', JSON.stringify(users));
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    
    showMessage(`₹${amount.toFixed(2)} sent successfully to ${recipient.name}`, 'success');
    closeModal('sendMoneyModal');
    document.getElementById('sendMoneyForm').reset();
    
    // Update UI
    updateBalance();
    loadTransactions();
}

// Request money handler
function handleRequestMoney(event) {
    event.preventDefault();
    
    const requestFromId = document.getElementById('requestFromUPI').value.trim();
    const amount = parseFloat(document.getElementById('requestAmount').value);
    const note = document.getElementById('requestNote').value.trim();
    
    if (amount <= 0) {
        showMessage('Please enter a valid amount', 'error');
        return;
    }
    
    // Find user to request from
    let requestFrom = null;
    for (let phone in users) {
        if (users[phone].upiId === requestFromId || users[phone].phone === requestFromId) {
            requestFrom = users[phone];
            break;
        }
    }
    
    if (!requestFrom) {
        showMessage('User not found', 'error');
        return;
    }
    
    if (requestFrom.phone === currentUser.phone) {
        showMessage('Cannot request money from yourself', 'error');
        return;
    }
    
    // In a real app, this would send a notification
    showMessage(`Money request of ₹${amount.toFixed(2)} sent to ${requestFrom.name}`, 'success');
    closeModal('requestMoneyModal');
    document.getElementById('requestMoneyForm').reset();
}

// Add money handler
function handleAddMoney(event) {
    event.preventDefault();
    
    const amount = parseFloat(document.getElementById('addAmount').value);
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    if (amount <= 0) {
        showMessage('Please enter a valid amount', 'error');
        return;
    }
    
    // Simulate payment processing
    showMessage('Processing payment...', 'info');
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<div class="loading"></div> Processing...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
        // Add money to wallet
        currentUser.balance += amount;
        
        // Add transaction
        const transaction = {
            id: generateTransactionId(),
            type: 'received',
            amount: amount,
            recipient: 'Wallet Top-up',
            recipientUPI: 'system',
            note: `Added via ${paymentMethod === 'card' ? 'Credit/Debit Card' : 'Net Banking'}`,
            timestamp: new Date().toISOString(),
            status: 'completed'
        };
        
        currentUser.transactions.unshift(transaction);
        
        // Save to localStorage
        users[currentUser.phone] = currentUser;
        localStorage.setItem('upi_users', JSON.stringify(users));
        localStorage.setItem('current_user', JSON.stringify(currentUser));
        
        showMessage(`₹${amount.toFixed(2)} added successfully to your wallet`, 'success');
        closeModal('addMoneyModal');
        document.getElementById('addMoneyForm').reset();
        
        // Reset button
        submitBtn.innerHTML = 'Add Money';
        submitBtn.disabled = false;
        
        // Update UI
        updateBalance();
        loadTransactions();
    }, 3000);
}

// Update balance display
function updateBalance() {
    document.getElementById('walletBalance').textContent = currentUser.balance.toFixed(2);
}

// Load and display transactions
function loadTransactions() {
    const transactionList = document.getElementById('transactionList');
    
    if (!currentUser.transactions || currentUser.transactions.length === 0) {
        transactionList.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-receipt" style="font-size: 3rem; color: #ddd; margin-bottom: 15px;"></i>
                <p style="color: #666;">No transactions yet</p>
                <p style="color: #999; font-size: 14px;">Start by sending money or adding funds to your wallet</p>
            </div>
        `;
        return;
    }
    
    // Show recent transactions (limit to 5)
    const recentTransactions = currentUser.transactions.slice(0, 5);
    
    transactionList.innerHTML = recentTransactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${transaction.type}">
                    <i class="fas fa-${transaction.type === 'sent' ? 'arrow-up' : 'arrow-down'}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${transaction.recipient}</h4>
                    <p>${formatDate(transaction.timestamp)}</p>
                    ${transaction.note ? `<p><small>${transaction.note}</small></p>` : ''}
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">
                ${transaction.type === 'sent' ? '-' : '+'}₹${transaction.amount.toFixed(2)}
            </div>
        </div>
    `).join('');
}

// Generate QR code for user
function generateUserQR() {
    const qrData = {
        upiId: currentUser.upiId,
        name: currentUser.name,
        type: 'receive'
    };
    
    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(document.getElementById('userQRCode'), JSON.stringify(qrData), {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }).catch(err => {
            document.getElementById('userQRCode').innerHTML = `
                <div style="width: 200px; height: 200px; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; flex-direction: column; margin: 0 auto;">
                    <i class="fas fa-qrcode" style="font-size: 3rem; color: #ccc;"></i>
                    <p style="color: #666; margin-top: 10px;">QR Code Generator</p>
                </div>
            `;
        });
    }
}

// Simulate QR code scanning
function simulateQRScanning() {
    const qrReader = document.getElementById('qrReader');
    qrReader.innerHTML = `
        <div class="scanner-frame">
            <div class="loading"></div>
            <p>Scanning...</p>
        </div>
    `;
    
    setTimeout(() => {
        // Simulate successful scan
        const scannedData = {
            upiId: '91843754545@mca',
            name: 'Demo Merchant',
            amount: 250.00
        };
        
        closeModal('qrScannerModal');
        
        // Pre-fill send money form
        document.getElementById('recipientUPI').value = scannedData.upiId;
        if (scannedData.amount) {
            document.getElementById('sendAmount').value = scannedData.amount;
        }
        
        showSendMoney();
        showMessage(`QR Code scanned: ${scannedData.name}`, 'success');
    }, 3000);
}

// Download QR code
function downloadQR() {
    const canvas = document.querySelector('#userQRCode canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `${currentUser.name.replace(/\s+/g, '_')}_QR.png`;
        link.href = canvas.toDataURL();
        link.click();
        showMessage('QR Code downloaded successfully', 'success');
    } else {
        showMessage('QR Code not available for download', 'error');
    }
}

// Share QR code
function shareQR() {
    if (navigator.share) {
        navigator.share({
            title: 'My UPI QR Code',
            text: `Pay me using UPI ID: ${currentUser.upiId}`,
        }).catch(err => {
            copyUPIId();
        });
    } else {
        copyUPIId();
    }
}

function copyUPIId() {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(currentUser.upiId).then(() => {
            showMessage('UPI ID copied to clipboard', 'success');
        }).catch(() => {
            showMessage('Unable to copy UPI ID', 'error');
        });
    } else {
        showMessage('Copy feature not supported', 'error');
    }
}

// Show all transactions
function showAllTransactions() {
    if (document.getElementById('userDropdown')) {
        document.getElementById('userDropdown').classList.remove('show');
    }
    
    // Create and show all transactions modal
    const allTransactionsModal = document.createElement('div');
    allTransactionsModal.id = 'allTransactionsModal';
    allTransactionsModal.className = 'modal';
    allTransactionsModal.style.display = 'block';
    
    allTransactionsModal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2>All Transactions</h2>
            <div class="transaction-list" style="max-height: 500px;">
                ${currentUser.transactions.length === 0 ? 
                    '<p style="text-align: center; color: #666;">No transactions found</p>' :
                    currentUser.transactions.map(transaction => `
                        <div class="transaction-item">
                            <div class="transaction-info">
                                <div class="transaction-icon ${transaction.type}">
                                    <i class="fas fa-${transaction.type === 'sent' ? 'arrow-up' : 'arrow-down'}"></i>
                                </div>
                                <div class="transaction-details">
                                    <h4>${transaction.recipient}</h4>
                                    <p>${formatDate(transaction.timestamp)}</p>
                                    <p><small>ID: ${transaction.id}</small></p>
                                    ${transaction.note ? `<p><small>${transaction.note}</small></p>` : ''}
                                </div>
                            </div>
                            <div class="transaction-amount ${transaction.type}">
                                ${transaction.type === 'sent' ? '-' : '+'}₹${transaction.amount.toFixed(2)}
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    
    document.body.appendChild(allTransactionsModal);
}

// Utility functions
function generateTransactionId() {
    return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showMessage(message, type) {
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const modal = document.querySelector('.modal[style*="block"]');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        modalContent.insertBefore(messageDiv, modalContent.firstChild);
    } else {
        document.body.insertBefore(messageDiv, document.body.firstChild);
    }
    
    setTimeout(() => {
        if (messageDiv && messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
});
