import { 
    initializeSupervisorViewCalendar,
    initializeSupervisorEditCalendar,
    initializePublishedCalendar,
    initializePreviousCalendar
} from '../calendar/calendarInit.js';
import { displayPublishedVersions } from './versionManager.js';
import { showPasswordModal } from './modals.js';

// Page navigation functions
export function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    
    // Initialize specific page content
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

export function showSupervisorPage() {
    if (sessionStorage.getItem('isAuthenticated')) {
        showPage('supervisorPage');
    } else {
        showPasswordModal('supervisor');
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
window.showSupervisorPage = showSupervisorPage;

export function requestManageAccess() {
    if (sessionStorage.getItem('isAuthenticated')) {
        showPage('managePublishedPage');
    } else {
        showPasswordModal('manage');
    }
}