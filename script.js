// Global variables
let calendar, supervisorViewCalendar, supervisorEditCalendar, previousCalendar;
let currentEditingDate = null;
let currentPublishedVersion = 1;
const SUPERVISOR_PASSWORD = "admin123"; // Change this to your desired password

// Page navigation function
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    
    // Initialize calendars when needed
    if (pageId === 'supervisorViewPage' && !supervisorViewCalendar) {
        initializeSupervisorViewCalendar();
    } else if (pageId === 'supervisorEditPage' && !supervisorEditCalendar) {
        initializeSupervisorEditCalendar();
    } else if (pageId === 'publishedSchedulePage') {
        initializePublishedCalendar();
    } else if (pageId === 'previousSchedulePage' && !previousCalendar) {
        initializePreviousCalendar();
    } else if (pageId === 'managePublishedPage') {
        initializeManagePublished();
    }
}

// Function to show the manage published page
function showManagePublished() {
    showPage('managePublishedPage');
}

// Initialize the manage published page
function initializeManagePublished() {
    displayPublishedVersions();
}

// Display all published versions
function displayPublishedVersions() {
    const versionsList = document.getElementById('publishedVersionsList');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    // Get current published version
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    
    // Get version history
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    
    versionsList.innerHTML = '';
    
    // Show current version
    if (currentPublished) {
        const currentData = JSON.parse(currentPublished);
        const currentVersionNum = history.length + 1;
        const versionItem = createVersionItem(currentVersionNum, currentData, true);
        versionsList.appendChild(versionItem);
    }
    
    // Show previous versions (newest first)
    history.forEach((version, index) => {
        const versionNum = history.length - index;
        const versionItem = createVersionItem(versionNum, version, false);
        versionsList.appendChild(versionItem);
    });
    
    // Show/hide clear all button and no versions message
    if (history.length === 0 && !currentPublished) {
        versionsList.innerHTML = '<div class="no-versions-message">No published versions found.</div>';
        clearAllBtn.style.display = 'none';
    } else if (history.length > 0) {
        clearAllBtn.style.display = 'block';
    } else {
        clearAllBtn.style.display = 'none';
    }
}

// Create a version item element
function createVersionItem(versionNum, versionData, isCurrent) {
    const item = document.createElement('div');
    item.className = `version-item ${isCurrent ? 'current-version' : ''}`;
    
    const date = new Date(versionData.timestamp);
    const formattedDate = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    item.innerHTML = `
        <div class="version-info-left">
            <div class="version-title">
                Version ${versionNum}
                <span class="version-status ${isCurrent ? 'status-current' : 'status-archived'}">
                    ${isCurrent ? 'Current' : 'Archived'}
                </span>
            </div>
            <div class="version-details">
                Published on ${formattedDate} at ${formattedTime}
            </div>
        </div>
        <div class="version-actions">
            <button class="preview-button" onclick="previewVersion(${versionNum}, ${isCurrent})">
                Preview
            </button>
            ${!isCurrent ? `<button class="delete-button" onclick="confirmDeleteVersion(${versionNum})">Delete</button>` : 
              '<button class="delete-button" disabled title="Cannot delete current version">Delete</button>'}
        </div>
    `;
    
    return item;
}

// Preview a specific version
function previewVersion(versionNum, isCurrent) {
    if (isCurrent) {
        showPage('publishedSchedulePage');
    } else {
        const historyData = localStorage.getItem('perfusionScheduleHistory');
        const history = historyData ? JSON.parse(historyData) : [];
        
        if (history.length > 0) {
            const versionIndex = history.length - versionNum;
            const versionData = history[versionIndex];
            
            if (versionData) {
                showPage('publishedSchedulePage');
                setTimeout(() => {
                    selectVersionTab(versionNum, versionData);
                }, 500);
            }
        }
    }
}

// Confirm deletion of a version
function confirmDeleteVersion(versionNum) {
    if (confirm(`Are you sure you want to delete Version ${versionNum}? This action cannot be undone.`)) {
        deleteVersion(versionNum);
    }
}

// Delete a specific version
function deleteVersion(versionNum) {
    try {
        const historyData = localStorage.getItem('perfusionScheduleHistory');
        let history = historyData ? JSON.parse(historyData) : [];
        
        if (history.length > 0) {
            const versionIndex = history.length - versionNum;
            
            if (versionIndex >= 0 && versionIndex < history.length) {
                history.splice(versionIndex, 1);
                localStorage.setItem('perfusionScheduleHistory', JSON.stringify(history));
                displayPublishedVersions();
                alert(`Version ${versionNum} has been deleted successfully.`);
            } else {
                alert('Error: Version not found.');
            }
        }
    } catch (error) {
        console.error('Error deleting version:', error);
        alert('Error deleting version. Please try again.');
    }
}

// Clear all old versions
function clearAllVersions() {
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    
    if (history.length === 0) {
        alert('No old versions to clear.');
        return;
    }
    
    const confirmMsg = `Are you sure you want to delete all ${history.length} old versions? This will keep only the current version and cannot be undone.`;
    
    if (confirm(confirmMsg)) {
        try {
            localStorage.removeItem('perfusionScheduleHistory');
            displayPublishedVersions();
            alert('All old versions have been cleared successfully.');
        } catch (error) {
            console.error('Error clearing versions:', error);
            alert('Error clearing versions. Please try again.');
        }
    }
}

// Password modal functions
function requestEditAccess() {
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('passwordInput').focus();
}

function requestManageAccess() {
    showManagePublished();
}

function requestManageAccess() {
    showManagePublished();
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').style.display = 'none';
}

function checkPassword() {
    const enteredPassword = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('passwordError');
    
    if (enteredPassword === SUPERVISOR_PASSWORD) {
        closePasswordModal();
        showPage('supervisorEditPage');
    } else {
        errorDiv.textContent = 'Incorrect password. Please try again.';
        errorDiv.style.display = 'block';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// Allow Enter key to submit password
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
    }
});

// Edit modal functions
function openEditModal(date, dayShift = '', nightShift = '', backgroundColor = 'auto') {
    currentEditingDate = date;
    document.getElementById('editModalTitle').textContent = `Edit Schedule for ${date}`;
    document.getElementById('dayShiftInput').value = dayShift;
    document.getElementById('nightShiftInput').value = nightShift;
    
    // Set background color
    const colorRadios = document.querySelectorAll('input[name="backgroundColor"]');
    colorRadios.forEach(radio => {
        radio.checked = radio.value === backgroundColor;
    });
    
    document.getElementById('editModal').style.display = 'block';
    document.getElementById('dayShiftInput').focus();
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingDate = null;
}

function saveEdit() {
    const dayShift = document.getElementById('dayShiftInput').value;
    const nightShift = document.getElementById('nightShiftInput').value;
    const backgroundColor = document.querySelector('input[name="backgroundColor"]:checked').value;
    
    if (currentEditingDate && supervisorEditCalendar) {
        // Create event title
        let title = '';
        if (dayShift) title += `Day: ${dayShift}`;
        if (nightShift) {
            if (title) title += '\n';
            title += `Night: ${nightShift}`;
        }
        
        // Determine background color
        let eventColor = backgroundColor;
        if (backgroundColor === 'auto') {
            const dayCount = dayShift ? dayShift.split('/').filter(s => s.trim()).length : 0;
            const nightCount = nightShift ? nightShift.split('/').filter(s => s.trim()).length : 0;
            const totalStaff = dayCount + nightCount;
            
            if (totalStaff >= 6) eventColor = '#26de81'; // Green - well staffed
            else if (totalStaff >= 4) eventColor = '#f9ca24'; // Yellow - adequately staffed  
            else if (totalStaff >= 2) eventColor = '#ff6b6b'; // Red - understaffed
            else eventColor = '#6c757d'; // Gray - no staff
        }
        
        // Remove existing event for this date
        const existingEvents = supervisorEditCalendar.getEvents();
        existingEvents.forEach(event => {
            if (event.startStr === currentEditingDate) {
                event.remove();
            }
        });
        
        // Add new event if there's content
        if (title.trim()) {
            supervisorEditCalendar.addEvent({
                title: title,
                start: currentEditingDate,
                backgroundColor: eventColor,
                borderColor: eventColor,
                textColor: getTextColor(eventColor),
                allDay: true
            });
        }
        
        closeEditModal();
    }
}

// Get appropriate text color based on background
function getTextColor(backgroundColor) {
    const darkColors = ['#6c757d', '#dc3545', '#6c5ce7', '#a55eea'];
    return darkColors.includes(backgroundColor) ? 'white' : 'black';
}

// Calendar initialization functions
function initializeSupervisorViewCalendar() {
    supervisorViewCalendar = new FullCalendar.Calendar(document.getElementById('supervisorViewCalendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: loadPublishedEvents(),
        height: 'auto',
        eventDisplay: 'block'
    });
    supervisorViewCalendar.render();
}

function initializeSupervisorEditCalendar() {
    supervisorEditCalendar = new FullCalendar.Calendar(document.getElementById('supervisorEditCalendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: loadPublishedEvents(),
        height: 'auto',
        eventDisplay: 'block',
        dateClick: function(info) {
            const existingEvent = supervisorEditCalendar.getEvents().find(event => 
                event.startStr === info.dateStr
            );
            
            if (existingEvent) {
                const lines = existingEvent.title.split('\n');
                let dayShift = '', nightShift = '';
                
                lines.forEach(line => {
                    if (line.startsWith('Day: ')) {
                        dayShift = line.replace('Day: ', '');
                    } else if (line.startsWith('Night: ')) {
                        nightShift = line.replace('Night: ', '');
                    }
                });
                
                openEditModal(info.dateStr, dayShift, nightShift, existingEvent.backgroundColor);
            } else {
                openEditModal(info.dateStr);
            }
        }
    });
    supervisorEditCalendar.render();
}

function initializePublishedCalendar() {
    if (calendar) {
        calendar.destroy();
    }
    
    calendar = new FullCalendar.Calendar(document.getElementById('publishedCalendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: loadPublishedEvents(),
        height: 'auto',
        eventDisplay: 'block'
    });
    calendar.render();
    
    // Initialize version tabs
    initializeVersionTabs();
    updateLastUpdated();
}

function initializePreviousCalendar() {
    previousCalendar = new FullCalendar.Calendar(document.getElementById('previousCalendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: [],
        height: 'auto',
        eventDisplay: 'block'
    });
    previousCalendar.render();
}

// Load published events from localStorage
function loadPublishedEvents() {
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    if (publishedData) {
        const data = JSON.parse(publishedData);
        return data.events || [];
    }
    return [];
}

// Publish schedule function
function publishSchedule() {
    if (!supervisorEditCalendar) {
        alert('No calendar data to publish.');
        return;
    }
    
    const events = supervisorEditCalendar.getEvents().map(event => ({
        title: event.title,
        start: event.startStr,
        backgroundColor: event.backgroundColor,
        borderColor: event.borderColor,
        textColor: event.textColor,
        allDay: event.allDay
    }));
    
    const publishData = {
        events: events,
        timestamp: new Date().toISOString(),
        version: currentPublishedVersion
    };
    
    // Save current version to history before publishing new one
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    if (currentPublished) {
        const historyData = localStorage.getItem('perfusionScheduleHistory');
        const history = historyData ? JSON.parse(historyData) : [];
        history.push(JSON.parse(currentPublished));
        localStorage.setItem('perfusionScheduleHistory', JSON.stringify(history));
    }
    
    // Save new published version
    localStorage.setItem('perfusionPublishedSchedule', JSON.stringify(publishData));
    currentPublishedVersion++;
    
    alert('Schedule published successfully!');
    showPage('publishedSchedulePage');
}

// Version tabs functions
function initializeVersionTabs() {
    const tabsContainer = document.getElementById('versionTabs');
    tabsContainer.innerHTML = '';
    
    // Get current and historical versions
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    
    // Add current version tab
    if (currentPublished) {
        const currentData = JSON.parse(currentPublished);
        const currentVersionNum = history.length + 1;
        const tab = createVersionTab(currentVersionNum, currentData, true);
        tabsContainer.appendChild(tab);
    }
    
    // Add historical version tabs
    history.forEach((version, index) => {
        const versionNum = history.length - index;
        const tab = createVersionTab(versionNum, version, false);
        tabsContainer.appendChild(tab);
    });
    
    // Hide tabs container if no versions
    const tabsContainerDiv = document.getElementById('versionTabsContainer');
    if (tabsContainer.children.length === 0) {
        tabsContainerDiv.style.display = 'none';
    } else {
        tabsContainerDiv.style.display = 'block';
    }
}

function createVersionTab(versionNum, versionData, isCurrent) {
    const tab = document.createElement('button');
    tab.className = `version-tab ${isCurrent ? 'active' : ''}`;
    tab.textContent = `Version ${versionNum}`;
    tab.onclick = () => selectVersionTab(versionNum, versionData);
    return tab;
}

function selectVersionTab(versionNum, versionData) {
    // Update active tab
    document.querySelectorAll('.version-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update calendar with version data
    if (calendar) {
        calendar.removeAllEvents();
        if (versionData.events) {
            versionData.events.forEach(eventData => {
                calendar.addEvent(eventData);
            });
        }
    }
    
    // Update last updated info
    const lastUpdatedDiv = document.getElementById('lastUpdated');
    const date = new Date(versionData.timestamp);
    lastUpdatedDiv.textContent = `Version ${versionNum} - Last updated: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
}

function updateLastUpdated() {
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    const lastUpdatedDiv = document.getElementById('lastUpdated');
    
    if (currentPublished) {
        const data = JSON.parse(currentPublished);
        const date = new Date(data.timestamp);
        lastUpdatedDiv.textContent = `Last updated: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    } else {
        lastUpdatedDiv.textContent = 'No published schedule available';
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const passwordModal = document.getElementById('passwordModal');
    const editModal = document.getElementById('editModal');
    
    if (event.target === passwordModal) {
        closePasswordModal();
    } else if (event.target === editModal) {
        closeEditModal();
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Show welcome page by default
    showPage('welcomePage');
});
