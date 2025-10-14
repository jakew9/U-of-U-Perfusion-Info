import { authManager } from '../auth/authManager.js';
import { showPage } from './navigation.js';

// Login Modal Functions
export function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('loginUsernameInput').focus();
}

export function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    clearLoginForm();
}

export function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
    document.getElementById('registerEmailInput').focus();
}

export function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
    clearRegisterForm();
}

export function showUserManagementModal() {
    if (!authManager.isAdmin()) {
        alert('Access denied. Administrator privileges required.');
        return;
    }
    displayPendingRegistrations();
    displayApprovedUsers();
    document.getElementById('userManagementModal').style.display = 'block';
}

export function closeUserManagementModal() {
    document.getElementById('userManagementModal').style.display = 'none';
}

// Login function
export async function attemptLogin() {
    const username = document.getElementById('loginUsernameInput').value.trim();
    const password = document.getElementById('loginPasswordInput').value;
    const errorDiv = document.getElementById('loginError');

    if (!username || !password) {
        showLoginError('Please enter both username/email and password');
        return;
    }

    try {
        const user = await authManager.login(username, password);
        closeLoginModal();
        
        // Show success message
        alert(`Welcome back, ${user.fullName || user.username}!`);
        
        // Update UI to show logged-in state
        updateUIForLoggedInUser();
        
        // Redirect to main schedule page
        showPage('publishedSchedulePage');
        
    } catch (error) {
        showLoginError(error.message);
    }
}

// Register function
export async function attemptRegister() {
    const email = document.getElementById('registerEmailInput').value.trim();
    const username = document.getElementById('registerUsernameInput').value.trim();
    const fullName = document.getElementById('registerFullNameInput').value.trim();
    const password = document.getElementById('registerPasswordInput').value;
    const confirmPassword = document.getElementById('registerConfirmPasswordInput').value;
    const errorDiv = document.getElementById('registerError');

    // Validation
    if (!email || !username || !fullName || !password || !confirmPassword) {
        showRegisterError('Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showRegisterError('Passwords do not match');
        return;
    }

    if (password.length < 8) {
        showRegisterError('Password must be at least 8 characters long');
        return;
    }

    if (!email.includes('@')) {
        showRegisterError('Please enter a valid email address');
        return;
    }

    try {
        await authManager.registerUser(email, username, password, fullName);
        closeRegisterModal();
        alert('Registration submitted successfully! Your account is pending approval by an administrator.');
    } catch (error) {
        showRegisterError(error.message);
    }
}

// Logout function
export function logout() {
    if (confirm('Are you sure you want to log out?')) {
        authManager.logout();
        updateUIForLoggedOutUser();
        showPage('loginPage');
    }
}

// Approve registration
export async function approveRegistration(registrationId) {
    try {
        const user = await authManager.approveRegistration(registrationId);
        alert(`User ${user.username} has been approved successfully!`);
        displayPendingRegistrations();
        displayApprovedUsers();
    } catch (error) {
        alert('Error approving registration: ' + error.message);
    }
}

// Reject registration
export async function rejectRegistration(registrationId) {
    const reason = prompt('Reason for rejection (optional):');
    try {
        await authManager.rejectRegistration(registrationId, reason || '');
        alert('Registration has been rejected.');
        displayPendingRegistrations();
    } catch (error) {
        alert('Error rejecting registration: ' + error.message);
    }
}

// Delete user
export async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    try {
        await authManager.deleteUser(userId);
        alert('User deleted successfully.');
        displayApprovedUsers();
    } catch (error) {
        alert('Error deleting user: ' + error.message);
    }
}

// UI Helper Functions
function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function showRegisterError(message) {
    const errorDiv = document.getElementById('registerError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function clearLoginForm() {
    document.getElementById('loginUsernameInput').value = '';
    document.getElementById('loginPasswordInput').value = '';
    document.getElementById('loginError').style.display = 'none';
}

function clearRegisterForm() {
    document.getElementById('registerEmailInput').value = '';
    document.getElementById('registerUsernameInput').value = '';
    document.getElementById('registerFullNameInput').value = '';
    document.getElementById('registerPasswordInput').value = '';
    document.getElementById('registerConfirmPasswordInput').value = '';
    document.getElementById('registerError').style.display = 'none';
}

function updateUIForLoggedInUser() {
    const user = authManager.getCurrentUser();
    
    // Show user info in header
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = `
            <span>Welcome, ${user.fullName || user.username}!</span>
            <button class="logout-btn" onclick="logout()">Logout</button>
        `;
        userInfo.style.display = 'block';
    }

    // Show admin menu if user is admin
    if (authManager.isAdmin()) {
        const adminMenu = document.getElementById('adminMenu');
        if (adminMenu) {
            adminMenu.style.display = 'block';
        }
    }
}

function updateUIForLoggedOutUser() {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.style.display = 'none';
    }

    const adminMenu = document.getElementById('adminMenu');
    if (adminMenu) {
        adminMenu.style.display = 'none';
    }
}

function displayPendingRegistrations() {
    const container = document.getElementById('pendingRegistrationsList');
    const registrations = authManager.getPendingRegistrations().filter(r => r.status !== 'rejected');
    
    if (registrations.length === 0) {
        container.innerHTML = '<p>No pending registrations.</p>';
        return;
    }

    container.innerHTML = registrations.map(reg => `
        <div class="registration-item">
            <div class="registration-info">
                <strong>${reg.fullName}</strong> (${reg.username})
                <br>Email: ${reg.email}
                <br>Requested: ${new Date(reg.createdAt).toLocaleDateString()}
            </div>
            <div class="registration-actions">
                <button class="approve-btn" onclick="approveRegistration(${reg.id})">Approve</button>
                <button class="reject-btn" onclick="rejectRegistration(${reg.id})">Reject</button>
            </div>
        </div>
    `).join('');
}

function displayApprovedUsers() {
    const container = document.getElementById('approvedUsersList');
    const users = authManager.getApprovedUsers();
    
    container.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-info">
                <strong>${user.fullName || user.username}</strong> (${user.username})
                <br>Email: ${user.email}
                <br>Role: ${user.role}
                <br>Approved: ${new Date(user.approvedAt || user.createdAt).toLocaleDateString()}
            </div>
            <div class="user-actions">
                ${user.email !== 'jakeweston@gmail.com' ? 
                    `<button class="delete-btn" onclick="deleteUser(${user.id})">Delete</button>` : 
                    '<span class="admin-label">Admin</span>'
                }
            </div>
        </div>
    `).join('');
}

// Initialize authentication on page load
export function initializeAuth() {
    if (authManager.isLoggedIn()) {
        updateUIForLoggedInUser();
        return true;
    } else {
        updateUIForLoggedOutUser();
        return false;
    }
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Login form enter key support
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                attemptLogin();
            }
        });
    }

    // Register form enter key support
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                attemptRegister();
            }
        });
    }
});