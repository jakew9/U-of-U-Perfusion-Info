// Google Sheets API Configuration
const API_KEY = 'AIzaSyCyCEmSvunsn8C82AwhSyX5joXy2hstPls';
const SHEET_ID = '1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E';
const RANGE = 'Sheet2!A13:R100'; // Changed from Sheet1 to Sheet2

// Global variables
let calendar, supervisorViewCalendar, supervisorEditCalendar, previousCalendar;
let currentEditingDate = null;
let currentPublishedVersion = 1;
const SUPERVISOR_PASSWORD = "admin123"; // Change this to your desired password

// Fetch schedule data from Google Sheets
async function fetchScheduleFromGoogleSheets() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return parseScheduleData(data.values || []);
    } catch (error) {
        console.error('Error fetching schedule data:', error);
        alert('Error loading schedule from Google Sheets. Using local data instead.');
        return [];
    }
}

// Parse the Google Sheets data into calendar events
function parseScheduleData(rows) {
    const events = [];
    
    rows.forEach((row, index) => {
        // Column A (index 0) = Date
        // Column Q (index 16) = Day shift 
        // Column R (index 17) = Night shift
        
        const dateValue = row[0];
        const dayShift = row[16] || '';
        const nightShift = row[17] || '';
        
        if (!dateValue) return; // Skip rows without dates
        
        // Parse date - handle different date formats
        let date;
        if (dateValue instanceof Date) {
            date = dateValue;
        } else if (typeof dateValue === 'string') {
            // Try parsing different date formats
            date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                // Try parsing as MM/DD/YYYY format
                const parts = dateValue.split('/');
                if (parts.length === 3) {
                    date = new Date(parts[2], parts[0] - 1, parts[1]);
                }
            }
        } else {
            return; // Skip invalid dates
        }
        
        // Skip invalid dates
        if (isNaN(date.getTime())) return;
        
        // Format date for FullCalendar (YYYY-MM-DD)
        const formattedDate = date.toISOString().split('T')[0];
        
        // Create event title from day and night shifts
        let title = '';
        if (dayShift.trim()) {
            title += `Day: ${dayShift.trim()}`;
        }
        if (nightShift.trim()) {
            if (title) title += '\n';
            title += `Night: ${nightShift.trim()}`;
        }
        
        // Only add event if there's actual schedule data
        if (title.trim()) {
            // Count staff for each shift
            const dayStaffCount = dayShift ? dayShift.split('/').filter(s => s.trim()).length : 0;
            const nightStaffCount = nightShift ? nightShift.split('/').filter(s => s.trim()).length : 0;
            const totalStaff = dayStaffCount + nightStaffCount;
            
            let backgroundColor;
            
            // Check if night shift is missing (highest priority)
            if (nightStaffCount === 0 && dayStaffCount > 0) {
                backgroundColor = '#26de81'; // Green - missing night shift needs attention
            }
            // 6 total people = fully staffed (no color/default)
            else if (totalStaff === 6) {
                backgroundColor = '#f8f9fa'; // Light gray/no color - fully staffed
            }
            // 5 people = 1 missing (green)
            else if (totalStaff === 5) {
                backgroundColor = '#26de81'; // Green - 1 person short
            }
            // 4 or less people = understaffed (red)
            else if (totalStaff <= 4 && totalStaff > 0) {
                backgroundColor = '#ff6b6b'; // Red - critically understaffed
            }
            // No staff at all
            else {
                backgroundColor = '#6c757d'; // Gray - no staff assigned
            }
            
            events.push({
                title: title,
                start: formattedDate,
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
                textColor: getTextColor(backgroundColor),
                allDay: true,
                extendedProps: {
                    dayShift: dayShift.trim(),
                    nightShift: nightShift.trim(),
                    source: 'googleSheets'
                }
            });
        }
    });
    
    return events;
}

// Get appropriate text color based on background
function getTextColor(backgroundColor) {
    const darkColors = ['#6c757d', '#dc3545', '#6c5ce7', '#a55eea'];
    return darkColors.includes(backgroundColor) ? 'white' : 'black';
}

// Modified function to load events - prioritizes published versions over Google Sheets
async function loadPublishedEvents() {
    // First check for locally published version
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    if (publishedData) {
        const data = JSON.parse(publishedData);
        return data.events || [];
    }
    
    // If no published version, fallback to Google Sheets
    const googleSheetsEvents = await fetchScheduleFromGoogleSheets();
    return googleSheetsEvents;
}

// Modified function to load events for EDITING - starts with latest published, falls back to Google Sheets
async function loadEventsForEditing() {
    // First check for locally published version (latest approved schedule)
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    if (publishedData) {
        const data = JSON.parse(publishedData);
        return data.events || [];
    }
    
    // If no published version exists, start with Google Sheets as baseline
    const googleSheetsEvents = await fetchScheduleFromGoogleSheets();
    return googleSheetsEvents;
}

// Page navigation function
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    
    // Initialize calendars when needed
    if (pageId === 'supervisorPage') {
        // Supervisor page - no additional initialization needed
    } else if (pageId === 'supervisorViewPage' && !supervisorViewCalendar) {
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

// Function to show supervisor page with password protection
function showSupervisorPage() {
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('passwordInput').focus();
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
    
    // Show previous versions (newest first - descending order)
    for (let i = history.length - 1; i >= 0; i--) {
        const version = history[i];
        const versionNum = i + 1; // Version numbers 1, 2, 3... oldest to newest
        const versionItem = createVersionItem(versionNum, version, false);
        versionsList.appendChild(versionItem);
    }
    
    // Show/hide clear all button and no versions message
    if (history.length === 0 && !currentPublished) {
        versionsList.innerHTML = '<div class="no-versions-message">No published versions found.<br><br><em>Note: The schedule is now loaded directly from Google Sheets. Manual publishing is only needed for saving specific versions.</em></div>';
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
                    selectVersionTab(versionNum, versionData, false);
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
    // No longer needs password - already behind supervisor wall
    showPage('supervisorEditPage');
}

function requestManageAccess() {
    // No longer needs password - already behind supervisor wall
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
        showPage('supervisorPage'); // Go to supervisor menu after successful login
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
            
            // Check if night shift is missing (highest priority)
            if (nightCount === 0 && dayCount > 0) {
                eventColor = '#26de81'; // Green - missing night shift needs attention
            }
            // 6 total people = fully staffed (no color/default)
            else if (totalStaff === 6) {
                eventColor = '#f8f9fa'; // Light gray/no color - fully staffed
            }
            // 5 people = 1 missing (green)
            else if (totalStaff === 5) {
                eventColor = '#26de81'; // Green - 1 person short
            }
            // 4 or less people = understaffed (red)
            else if (totalStaff <= 4 && totalStaff > 0) {
                eventColor = '#ff6b6b'; // Red - critically understaffed
            }
            // No staff at all
            else {
                eventColor = '#6c757d'; // Gray - no staff assigned
            }
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
                allDay: true,
                extendedProps: {
                    dayShift: dayShift,
                    nightShift: nightShift,
                    source: 'manual'
                }
            });
        }
        
        closeEditModal();
    }
}

// Calendar initialization functions
async function initializeSupervisorViewCalendar() {
    const events = await loadPublishedEvents();
    
    supervisorViewCalendar = new FullCalendar.Calendar(document.getElementById('supervisorViewCalendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        height: 'auto',
        eventDisplay: 'block',
        eventClick: function(info) {
            // Show detailed information when clicking on an event
            const event = info.event;
            const dayShift = event.extendedProps.dayShift || '';
            const nightShift = event.extendedProps.nightShift || '';
            
            let message = `Schedule for ${event.start.toLocaleDateString()}:\n\n`;
            if (dayShift) message += `Day Shift: ${dayShift}\n`;
            if (nightShift) message += `Night Shift: ${nightShift}`;
            
            alert(message);
        }
    });
    
    supervisorViewCalendar.render();
}

async function initializeSupervisorEditCalendar() {
    // Start with latest published version, or Google Sheets if no published version exists
    const events = await loadEventsForEditing();
    
    supervisorEditCalendar = new FullCalendar.Calendar(document.getElementById('supervisorEditCalendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        height: 'auto',
        eventDisplay: 'block',
        dateClick: function(info) {
            const existingEvent = supervisorEditCalendar.getEvents().find(event => 
                event.startStr === info.dateStr
            );
            
            if (existingEvent) {
                const dayShift = existingEvent.extendedProps.dayShift || '';
                const nightShift = existingEvent.extendedProps.nightShift || '';
                
                openEditModal(info.dateStr, dayShift, nightShift, existingEvent.backgroundColor);
            } else {
                openEditModal(info.dateStr);
            }
        },
        eventClick: function(info) {
            const event = info.event;
            const dayShift = event.extendedProps.dayShift || '';
            const nightShift = event.extendedProps.nightShift || '';
            
            openEditModal(info.event.startStr, dayShift, nightShift, event.backgroundColor);
        }
    });
    
    supervisorEditCalendar.render();
}

async function initializePublishedCalendar() {
    if (calendar) {
        calendar.destroy();
    }
    
    const events = await loadPublishedEvents();
    
    calendar = new FullCalendar.Calendar(document.getElementById('publishedCalendar'), {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        height: 'auto',
        eventDisplay: 'block',
        eventClick: function(info) {
            // Show detailed information when clicking on an event
            const event = info.event;
            const dayShift = event.extendedProps.dayShift || '';
            const nightShift = event.extendedProps.nightShift || '';
            
            let message = `Schedule for ${event.start.toLocaleDateString()}:\n\n`;
            if (dayShift) message += `Day Shift: ${dayShift}\n`;
            if (nightShift) message += `Night Shift: ${nightShift}`;
            
            alert(message);
        }
    });
    
    calendar.render();
    
    // Update schedule information display
    updateScheduleInfo(events);
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
        allDay: event.allDay,
        extendedProps: event.extendedProps
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

// Version tabs functions - now shows all versions with navigation
function initializeVersionTabs() {
    const tabsContainer = document.getElementById('versionTabs');
    const tabsContainerDiv = document.getElementById('versionTabsContainer');
    
    // Get current and historical versions
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    
    tabsContainer.innerHTML = '';
    
    // If we have versions to show, display the tabs
    if (currentPublished || history.length > 0) {
        tabsContainerDiv.style.display = 'block';
        
        // Add current version tab
        if (currentPublished) {
            const currentData = JSON.parse(currentPublished);
            const currentVersionNum = history.length + 1;
            const tab = createVersionTab(currentVersionNum, currentData, true);
            tabsContainer.appendChild(tab);
        }
        
        // Add historical version tabs (newest to oldest)
        history.forEach((version, index) => {
            const versionNum = history.length - index; // This makes newest = highest number
            const tab = createVersionTab(versionNum, version, false);
            tabsContainer.appendChild(tab);
        });
    } else {
        // Hide tabs container if no versions
        tabsContainerDiv.style.display = 'none';
    }
}

function createVersionTab(versionNum, versionData, isCurrent) {
    const tab = document.createElement('button');
    tab.className = `version-tab ${isCurrent ? 'active' : ''}`;
    tab.textContent = `Version ${versionNum}${isCurrent ? ' (Current)' : ''}`;
    tab.onclick = () => selectVersionTab(versionNum, versionData, isCurrent);
    return tab;
}

function selectVersionTab(versionNum, versionData, isCurrent) {
    // Update active tab
    document.querySelectorAll('.version-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Find and activate the clicked tab
    const tabs = document.querySelectorAll('.version-tab');
    tabs.forEach(tab => {
        if (tab.textContent.includes(`Version ${versionNum}`)) {
            tab.classList.add('active');
        }
    });
    
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
    const status = isCurrent ? 'Current Published Schedule' : `Version ${versionNum} (Archived)`;
    lastUpdatedDiv.textContent = `${status} - Published: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
}

// Update schedule information display
function updateScheduleInfo(events) {
    const lastUpdatedDiv = document.getElementById('lastUpdated');
    
    // Check if we have a published version
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    
    if (publishedData) {
        const data = JSON.parse(publishedData);
        const date = new Date(data.timestamp);
        lastUpdatedDiv.textContent = `Current Published Schedule - Last published: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    } else if (events.length > 0) {
        const now = new Date();
        lastUpdatedDiv.textContent = `Schedule loaded from Google Sheets at ${now.toLocaleString()}`;
    } else {
        lastUpdatedDiv.textContent = 'No schedule data available';
    }
    
    // Initialize version tabs
    initializeVersionTabs();
}

// Add refresh button functionality
async function refreshScheduleFromSheets() {
    if (calendar) {
        await initializePublishedCalendar();
    }
    if (supervisorViewCalendar) {
        supervisorViewCalendar.destroy();
        supervisorViewCalendar = null;
        await initializeSupervisorViewCalendar();
    }
    alert('Schedule refreshed from Google Sheets!');
}

// Restart schedule from Google Sheets (clears local data)
async function restartFromGoogleSheets() {
    const confirmMsg = `This will clear all published versions and restart with fresh data from Google Sheets. This action cannot be undone. Are you sure?`;
    
    if (confirm(confirmMsg)) {
        try {
            // Clear all local storage data
            localStorage.removeItem('perfusionPublishedSchedule');
            localStorage.removeItem('perfusionScheduleHistory');
            
            // Reset version counter
            currentPublishedVersion = 1;
            
            // Reinitialize the edit calendar with fresh Google Sheets data
            if (supervisorEditCalendar) {
                supervisorEditCalendar.destroy();
                supervisorEditCalendar = null;
            }
            
            // Load fresh data from Google Sheets
            const googleSheetsEvents = await fetchScheduleFromGoogleSheets();
            
            supervisorEditCalendar = new FullCalendar.Calendar(document.getElementById('supervisorEditCalendar'), {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                events: googleSheetsEvents,
                height: 'auto',
                eventDisplay: 'block',
                dateClick: function(info) {
                    const existingEvent = supervisorEditCalendar.getEvents().find(event => 
                        event.startStr === info.dateStr
                    );
                    
                    if (existingEvent) {
                        const dayShift = existingEvent.extendedProps.dayShift || '';
                        const nightShift = existingEvent.extendedProps.nightShift || '';
                        
                        openEditModal(info.dateStr, dayShift, nightShift, existingEvent.backgroundColor);
                    } else {
                        openEditModal(info.dateStr);
                    }
                },
                eventClick: function(info) {
                    const event = info.event;
                    const dayShift = event.extendedProps.dayShift || '';
                    const nightShift = event.extendedProps.nightShift || '';
                    
                    openEditModal(info.event.startStr, dayShift, nightShift, event.backgroundColor);
                }
            });
            
            supervisorEditCalendar.render();
            
            alert('Schedule restarted with fresh data from Google Sheets! All local versions have been cleared.');
        } catch (error) {
            console.error('Error restarting from Google Sheets:', error);
            alert('Error loading fresh data from Google Sheets. Please try again.');
        }
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
