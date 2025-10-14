import { 
    initializeSupervisorViewCalendar,
    initializeSupervisorEditCalendar,
    initializePublishedCalendar,
    initializePreviousCalendar
} from '../calendar/calendarInit.js';
import { displayPublishedVersions } from './versionManager.js';
import { showPasswordModal } from './modals.js';

export function showSupervisorPage() {
    if (sessionStorage.getItem('isAuthenticated')) {
        showPage('supervisorPage');
    } else {
        showPasswordModal('view');
    }
}

// Page navigation functions
export function showPage(pageId) {
    // Import auth manager dynamically to avoid circular dependencies
    import('../auth/authManager.js').then(({ authManager }) => {
        // Check if user is logged in for protected pages
        const protectedPages = ['publishedSchedulePage', 'supervisorViewPage', 'supervisorEditPage', 'managePublishedPage', 'preferencesPage', 'importantDatesPage'];
        
        if (protectedPages.includes(pageId) && !authManager.isLoggedIn()) {
            // Redirect to login page if not authenticated
            showPage('loginPage');
            return;
        }
        
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.remove('active'));
        
        document.getElementById(pageId).classList.add('active');
        
        // Initialize specific page content
        initializePageContent(pageId);
    });
}

function initializePageContent(pageId) {
        switch(pageId) {
            case 'supervisorPage':
                // Supervisor page initialization
                break;
            case 'supervisorViewPage':
                initializeSupervisorViewCalendar();
                break;
            case 'supervisorEditPage':
                initializeSupervisorEditCalendar();
                break;
            case 'publishedSchedulePage':
                initializePublishedCalendar();
                break;
            case 'previousSchedulePage':
                initializePreviousCalendar();
                break;
            case 'managePublishedPage':
                displayPublishedVersions();
                break;
        }
}

export function showManagePublished() {
    if (sessionStorage.getItem('isAuthenticated')) {
        showPage('managePublishedPage');
    } else {
        showPasswordModal('manage');
    }
}

export function requestEditAccess() {
    if (sessionStorage.getItem('isAuthenticated')) {
        showPage('supervisorEditPage');
    } else {
        showPasswordModal('edit');
    }
}

// Expose navigation functions to window

export function requestManageAccess() {
    if (sessionStorage.getItem('isAuthenticated')) {
        showPage('managePublishedPage');
    } else {
        showPasswordModal('manage');
    }
}