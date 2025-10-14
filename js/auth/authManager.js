// User authentication and management
export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initializeDefaultUsers();
    }

    // Initialize with default approved users
    initializeDefaultUsers() {
        const defaultUsers = [
            {
                id: 1,
                email: 'jakeweston@gmail.com',
                username: 'jakew',
                password: 'UofUPerfusion2025!', // In production, this would be hashed
                role: 'admin',
                approved: true,
                approvedBy: 'system',
                createdAt: new Date().toISOString()
            }
        ];

        // Only set if no users exist yet
        if (!localStorage.getItem('approvedUsers')) {
            localStorage.setItem('approvedUsers', JSON.stringify(defaultUsers));
        }
    }

    // Get all approved users
    getApprovedUsers() {
        return JSON.parse(localStorage.getItem('approvedUsers') || '[]');
    }

    // Get pending registrations
    getPendingRegistrations() {
        return JSON.parse(localStorage.getItem('pendingRegistrations') || '[]');
    }

    // Save approved users
    saveApprovedUsers(users) {
        localStorage.setItem('approvedUsers', JSON.stringify(users));
    }

    // Save pending registrations
    savePendingRegistrations(registrations) {
        localStorage.setItem('pendingRegistrations', JSON.stringify(registrations));
    }

    // Register new user (pending approval)
    async registerUser(email, username, password, fullName) {
        const existingUsers = this.getApprovedUsers();
        const pendingUsers = this.getPendingRegistrations();

        // Check if email or username already exists
        if (existingUsers.find(u => u.email === email || u.username === username)) {
            throw new Error('Email or username already exists');
        }

        if (pendingUsers.find(u => u.email === email || u.username === username)) {
            throw new Error('Registration already pending for this email or username');
        }

        const registration = {
            id: Date.now(),
            email,
            username,
            password, // In production, hash this
            fullName,
            approved: false,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        pendingUsers.push(registration);
        this.savePendingRegistrations(pendingUsers);

        return registration;
    }

    // Login user
    async login(usernameOrEmail, password) {
        const users = this.getApprovedUsers();
        const user = users.find(u => 
            (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
            u.password === password && 
            u.approved
        );

        if (!user) {
            throw new Error('Invalid credentials or account not approved');
        }

        this.currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    }

    // Logout user
    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('isAuthenticated');
    }

    // Check if user is logged in
    isLoggedIn() {
        if (this.currentUser) return true;
        
        const stored = sessionStorage.getItem('currentUser');
        if (stored) {
            this.currentUser = JSON.parse(stored);
            return true;
        }
        return false;
    }

    // Get current user
    getCurrentUser() {
        if (!this.currentUser) {
            const stored = sessionStorage.getItem('currentUser');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    // Check if current user is admin
    isAdmin() {
        const user = this.getCurrentUser();
        return user && (user.role === 'admin' || user.email === 'jakeweston@gmail.com');
    }

    // Approve a pending registration (admin only)
    async approveRegistration(registrationId) {
        if (!this.isAdmin()) {
            throw new Error('Only administrators can approve registrations');
        }

        const pending = this.getPendingRegistrations();
        const approved = this.getApprovedUsers();
        
        const registrationIndex = pending.findIndex(r => r.id === registrationId);
        if (registrationIndex === -1) {
            throw new Error('Registration not found');
        }

        const registration = pending[registrationIndex];
        
        // Move to approved users
        const newUser = {
            ...registration,
            id: approved.length + 1,
            approved: true,
            approvedBy: this.currentUser.username,
            approvedAt: new Date().toISOString(),
            role: 'user'
        };

        approved.push(newUser);
        pending.splice(registrationIndex, 1);

        this.saveApprovedUsers(approved);
        this.savePendingRegistrations(pending);

        return newUser;
    }

    // Reject a pending registration (admin only)
    async rejectRegistration(registrationId, reason = '') {
        if (!this.isAdmin()) {
            throw new Error('Only administrators can reject registrations');
        }

        const pending = this.getPendingRegistrations();
        const registrationIndex = pending.findIndex(r => r.id === registrationId);
        
        if (registrationIndex === -1) {
            throw new Error('Registration not found');
        }

        pending[registrationIndex].status = 'rejected';
        pending[registrationIndex].rejectedBy = this.currentUser.username;
        pending[registrationIndex].rejectedAt = new Date().toISOString();
        pending[registrationIndex].rejectionReason = reason;

        this.savePendingRegistrations(pending);
    }

    // Delete user (admin only)
    async deleteUser(userId) {
        if (!this.isAdmin()) {
            throw new Error('Only administrators can delete users');
        }

        const users = this.getApprovedUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Prevent deleting yourself
        if (users[userIndex].email === this.currentUser.email) {
            throw new Error('You cannot delete your own account');
        }

        users.splice(userIndex, 1);
        this.saveApprovedUsers(users);
    }

    // Promote user to admin (admin only)
    async promoteToAdmin(userId) {
        if (!this.isAdmin()) {
            throw new Error('Only administrators can promote users');
        }

        const users = this.getApprovedUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        if (users[userIndex].role === 'admin') {
            throw new Error('User is already an administrator');
        }

        users[userIndex].role = 'admin';
        users[userIndex].promotedBy = this.currentUser.username;
        users[userIndex].promotedAt = new Date().toISOString();

        this.saveApprovedUsers(users);
        return users[userIndex];
    }

    // Demote admin to regular user (admin only)
    async demoteFromAdmin(userId) {
        if (!this.isAdmin()) {
            throw new Error('Only administrators can demote users');
        }

        const users = this.getApprovedUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }

        // Prevent demoting yourself
        if (users[userIndex].email === this.currentUser.email) {
            throw new Error('You cannot demote your own account');
        }

        // Prevent demoting the original admin (jakeweston@gmail.com)
        if (users[userIndex].email === 'jakeweston@gmail.com') {
            throw new Error('Cannot demote the original administrator');
        }

        if (users[userIndex].role !== 'admin') {
            throw new Error('User is not an administrator');
        }

        users[userIndex].role = 'user';
        users[userIndex].demotedBy = this.currentUser.username;
        users[userIndex].demotedAt = new Date().toISOString();

        this.saveApprovedUsers(users);
        return users[userIndex];
    }
}

// Create global auth manager instance
export const authManager = new AuthManager();