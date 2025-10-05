// Page navigation functions
export function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    
    initializePageContent(pageId);
}

function initializePageContent(pageId) {
    switch(pageId) {
        case 'supervisorPage':
            // Supervisor page initialization
            break;
        case 'supervisorViewPage':
            if (!supervisorViewCalendar) {
                initializeSupervisorViewCalendar();
            }
            break;
        case 'supervisorEditPage':
            if (!supervisorEditCalendar) {
                initializeSupervisorEditCalendar();
            }
            break;
        case 'publishedSchedulePage':
            initializePublishedCalendar();
            break;
        case 'previousSchedulePage':
            if (!previousCalendar) {
                initializePreviousCalendar();
            }
            break;
        case 'managePublishedPage':
            initializeManagePublished();
            break;
    }
}

export function showSupervisorPage() {
    showPasswordModal();
}

export function showManagePublished() {
    showPage('managePublishedPage');
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    showPage('welcomePage');
});