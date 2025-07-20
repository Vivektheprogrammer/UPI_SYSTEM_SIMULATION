// Global variables
let users = JSON.parse(localStorage.getItem('upi_users')) || {};
let currentUser = JSON.parse(localStorage.getItem('current_user')) || null;
let inactivityTimer;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (currentUser) {
        window.location.href = 'dashboard.html';
    }
    
    // Setup event listeners
    setupEventListeners();
    setupInactivityDetection();
});

function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// Auto-logout after inactivity
function setupInactivityDetection() {
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        if (currentUser) {
            inactivityTimer = setTimeout(() => {
                showMessage('Session expired due to inactivity', 'info');
                setTimeout(() => {
                    localStorage.removeItem('current_user');
                    window.location.href = 'index.html';
                }, 2000);
            }, 30 * 60 * 1000); // 30 minutes
        }
    }

    // Reset timer on user activity
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();
}

// Modal functions
function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegister() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
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

// Registration handler
function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const phone = document.getElementById('registerPhone').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const pin = document.getElementById('registerPin').value;
    const confirmPin = document.getElementById('confirmPin').value;
    
    // Validation
    if (!validateName(name)) {
        showMessage('Please enter a valid name', 'error');
        return;
    }
    
    if (!validatePhone(phone)) {
        showMessage('Please enter a valid 10-digit mobile number', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    if (pin.length !== 4 || !isNumeric(pin)) {
        showMessage('PIN must be exactly 4 digits', 'error');
        return;
    }
    
    if (pin !== confirmPin) {
        showMessage('PINs do not match', 'error');
        return;
    }
    
    if (users[phone]) {
        showMessage('User already exists with this mobile number', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        name: name,
        phone: phone,
        email: email,
        pin: pin,
        upiId: phone + '@mca',
        balance: 5000.00, // Starting balance
        transactions: [],
        createdAt: new Date().toISOString()
    };
    
    users[phone] = newUser;
    localStorage.setItem('upi_users', JSON.stringify(users));
    
    showMessage('Account created successfully! Please login.', 'success');
    closeModal('registerModal');
    
    // Clear form
    document.getElementById('registerForm').reset();
    
    // Show login modal
    setTimeout(() => {
        showLogin();
    }, 1500);
}

// Login handler
function handleLogin(event) {
    event.preventDefault();
    
    const phone = document.getElementById('loginPhone').value.trim();
    const pin = document.getElementById('loginPin').value;
    
    if (!validatePhone(phone)) {
        showMessage('Please enter a valid 10-digit mobile number', 'error');
        return;
    }
    
    if (!users[phone]) {
        showMessage('User not found. Please register first.', 'error');
        return;
    }
    
    if (users[phone].pin !== pin) {
        showMessage('Invalid PIN. Please try again.', 'error');
        return;
    }
    
    // Successful login
    currentUser = users[phone];
    localStorage.setItem('current_user', JSON.stringify(currentUser));
    
    showMessage('Login successful! Redirecting...', 'success');
    
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

// Utility functions
function validateName(name) {
    return name.length >= 2 && /^[a-zA-Z\s]+$/.test(name);
}

function validatePhone(phone) {
    return /^\d{10}$/.test(phone);
}

function isNumeric(str) {
    return /^\d+$/.test(str);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at the beginning of the current modal or page
    const modal = document.querySelector('.modal[style*="block"]');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        modalContent.insertBefore(messageDiv, modalContent.firstChild);
    } else {
        document.body.insertBefore(messageDiv, document.body.firstChild);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv && messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Generate unique transaction ID
function generateTransactionId() {
    return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
