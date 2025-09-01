// Configuration
const apiKey = 'AIzaSyCyCEmSvunsn8C82AwhSyX5joXy2hstPls';
const spreadsheetId = '1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E';
const range = 'Sheet2!A13:V54'; // Extended to include column V to ensure we get columns S and T 

let calendar;
let supervisorViewCalendar;
let supervisorEditCalendar;
let publishedCalendar;
let previousCalendar;
let originalScheduleData = [];
let editedScheduleData = [];
let currentEditDate = null;
let currentDisplayedVersion = null;

// --- Data Management Functions ---

// Load saved data on page load and set editedScheduleData properly
function loadSavedData() {
    try {
        const savedPublished = localStorage.getItem('perfusionPublishedSchedule');
        const savedEdits = localStorage.getItem('perfusionScheduleEdits');
        
        // Load published data first (highest priority)
        if (savedPublished) {
            const publishedData = JSON.parse(savedPublished);
            console.log('Found published schedule data with', publishedData.schedule?.length || 0, 'rows');
            // Also update editedScheduleData to the published schedule
            if (publishedData.schedule) {
                editedScheduleData = JSON.parse(JSON.stringify(publishedData.schedule));
            }
            return publishedData;
        }
        
        // Fall back to saved edits if no published data
        if (savedEdits) {
            const editsData = JSON.parse(savedEdits);
            editedScheduleData = JSON.parse(JSON.stringify(editsData));
            console.log('Loaded saved edits from localStorage with', editsData.length, 'rows');
            return { schedule: editsData, timestamp: new Date().toISOString() };
        }
    } catch (error) {
        console.error('Error loading saved data:', error);
    }
    return null;
}

// Save edits to localStorage
function saveEditsToStorage() {
    try {
        localStorage.setItem('perfusionScheduleEdits', JSON.stringify(editedScheduleData));
        console.log('Saved edits to localStorage');
    } catch (error) {
        console.error('Error saving edits:', error);
    }
}

// Save published schedule to localStorage
function savePublishedToStorage() {
    try {
        const publishedData = {
            schedule: editedScheduleData,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('perfusionPublishedSchedule', JSON.stringify(publishedData));
        console.log('Saved published schedule to localStorage');
    } catch (error) {
        console.error('Error saving published schedule:', error);
    }
}

// Version Management Functions
function getVersionNumber() {
    try {
        const history = localStorage.getItem('perfusionScheduleHistory');
        if (history) {
            const versions = JSON.parse(history);
            return versions.length + 1;
        }
    } catch (error) {
        console.error('Error getting version number:', error);
    }
    return 1;
}

// --- Page and Modal Management ---

// Page Navigation
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'schedulePage' && !calendar) {
        initializeCalendar();
    } else if (pageId === 'supervisorViewPage' && !supervisorViewCalendar) {
        initializeSupervisorViewCalendar();
    } else if (pageId === 'supervisorEditPage' && !supervisorEditCalendar) {
        initializeSupervisorEditCalendar();
    } else if (pageId === 'publishedSchedulePage') {
        // Always reinitialize the published calendar to refresh tabs
        initializePublishedCalendar();
    } else if (pageId === 'previousSchedulePage' && !previousCalendar) {
        initializePreviousCalendar();
    }
}

// Password protection for edit access
function requestEditAccess() {
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('passwordInput').focus();
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').style.display = 'none';
}

function checkPassword() {
    const password = document.getElementById('passwordInput').value;
    const correctPassword = 'CHRIS';
    
    if (password === correctPassword) {
        closePasswordModal();
        showPage('supervisorEditPage');
    } else {
        document.getElementById('passwordError').textContent = 'Incorrect password. Please try again.';
        document.getElementById('passwordError').style.display = 'block';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// Allow Enter key to submit password
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
});

// Edit modal functions
function openEditModal(dateStr, dayShift, nightShift) {
    currentEditDate = dateStr;
    document.getElementById('editModalTitle').textContent = `Edit Schedule for ${dateStr}`;
    document.getElementById('dayShiftInput').value = dayShift || '';
    document.getElementById('nightShiftInput').value = nightShift || '';
    
    // Reset color selection to auto
    document.querySelector('input[name="backgroundColor"][value="auto"]').checked = true;
    
    // Check if this date has a custom color stored at index 20
    const existingRow = editedScheduleData.find(row => parseDate(row[0]) === dateStr);
    if (existingRow && existingRow[20] && existingRow[20].startsWith('#')) {
        const colorOption = document.querySelector(`input[name="backgroundColor"][value="${existingRow[20]}"]`);
        if (colorOption) {
            colorOption.checked = true;
        }
    }
    
    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditDate = null;
}

function saveEdit() {
    if (!currentEditDate) return;
    
    const dayShift = document.getElementById('dayShiftInput').value.trim();
    const nightShift = document.getElementById('nightShiftInput').value.trim();
    const selectedColor = document.querySelector('input[name="backgroundColor"]:checked').value;
    
    // Parse the date correctly
    const [year, month, day] = currentEditDate.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day); // month is 0-indexed
    let rowFound = false;
    
    editedScheduleData.forEach(row => {
        if (row[0]) {
            const rowDate = parseDate(row[0]);
            if (rowDate === currentEditDate) {
                row[16] = dayShift;
                row[17] = nightShift;
                // Ensure row is long enough and store custom color at index 20
                while (row.length <= 20) {
                    row.push('');
                }
                row[20] = selectedColor === 'auto' ? '' : selectedColor; // Store custom color at index 20
                rowFound = true;
            }
        }
    });
    
    if (!rowFound) {
        const newRow = new Array(21).fill(''); // Create array with 21 elements
        newRow[0] = currentEditDate;
        newRow[16] = dayShift;
        newRow[17] = nightShift;
        newRow[20] = selectedColor === 'auto' ? '' : selectedColor;
        editedScheduleData.push(newRow);
    }
    
    // Completely refresh the supervisor calendar to avoid stacking
    supervisorEditCalendar.destroy();
    initializeSupervisorEditCalendarFromData();
    
    // Save edits automatically
    saveEditsToStorage();
    
    closeEditModal();
}

// MODIFIED: publishSchedule function to refresh tabs
function publishSchedule() {
    // Save current published schedule to history before updating
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    if (currentPublished) {
        saveToHistory(JSON.parse(currentPublished));
    }
    
    // Create new published data
    const publishedData = {
        schedule: editedScheduleData,
        timestamp: new Date().toISOString(),
        version: getVersionNumber()
    };
    
    // Save new published schedule
    localStorage.setItem('perfusionPublishedSchedule', JSON.stringify(publishedData));
    
    alert(`Schedule published successfully as Version ${publishedData.version}!`);
    
    // If we're currently on the published schedule page, refresh the tabs and display
    const publishedPage = document.getElementById('publishedSchedulePage');
    if (publishedPage && publishedPage.classList.contains('active')) {
        createVersionTabs();
        displayVersion('current', publishedData);
    }
}

function saveToHistory(publishedData) {
    try {
        let history = [];
        const existingHistory = localStorage.getItem('perfusionScheduleHistory');
        if (existingHistory) {
            history = JSON.parse(existingHistory);
        }
        
        // Add current published schedule to history
        history.unshift(publishedData); // Add to beginning
        
        // Keep only last 5 versions
        if (history.length > 5) {
            history = history.slice(0, 5);
        }
        
        localStorage.setItem('perfusionScheduleHistory', JSON.stringify(history));
        console.log('Saved to schedule history');
    } catch (error) {
        console.error('Error saving to history:', error);
    }
}

// --- Helper Functions ---

// Date functions
function parseDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCorrectDayOfWeek(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDay();
}

// Event creation functions
function createEventsFromData(data) {
    const events = [];
    
    data.forEach(row => {
        const date = row[0];        
        const dayShiftData = row[16];   
        const nightShiftData = row[17];
        const schoolData = row[18];     // Column S (index 18) - School assignments only
        const offData = row[19];        // Column T (index 19) - People requesting off
        // Check if there's a custom color stored beyond the normal data range
        const customColor = row.length > 20 ? row[20] : ''; // Use index 20 for custom color to avoid conflicts
        
        const formattedDate = parseDate(date);
        
        if (formattedDate) {
            const dayOfWeek = getCorrectDayOfWeek(formattedDate);
            let titleHTML = '';

            // Add Day shift
            if (dayShiftData && dayShiftData.trim()) {
                titleHTML += `<div>Day: ${dayShiftData.trim()}</div>`;
            }
            
            // Add Night shift
            if (nightShiftData && nightShiftData.trim()) {
                titleHTML += `<div>Night: ${nightShiftData.trim()}</div>`;
            }
            
            // Add blank line before Off/School section (if there's either Off or School data)
            if ((offData && offData.trim()) || (schoolData && schoolData.trim())) {
                titleHTML += `<div><br></div>`;
            }
            
            // Add Off data
            if (offData && offData.trim()) {
                titleHTML += `<div style="color:#FFFFFF; background-color:#FF0000; padding:1px 2px; border-radius:2px; font-weight:bold;">Off: ${offData.trim()}</div>`;
            }
            
            // Add School assignments
            if (schoolData && schoolData.trim()) {
                titleHTML += `<div style="color:#FFFFFF; background-color:#0066CC; padding:1px 2px; border-radius:2px; font-weight:bold;">School: ${schoolData.trim()}</div>`;
            }

            if (titleHTML) {
                const eventData = {
                    title: titleHTML,
                    start: formattedDate,
                    allDay: true
                };
                
                // Check for custom color first (only if it's a valid color, not employee initials)
                if (customColor && customColor.startsWith('#')) {
                    eventData.backgroundColor = customColor;
                    eventData.borderColor = customColor;
                    eventData.textColor = '#ffffff';
                } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                    // Weekend styling
                    eventData.backgroundColor = 'transparent';
                    eventData.borderColor = 'transparent';
                    eventData.textColor = '#000000';
                    eventData.classNames = ['weekend-event'];
                } else {
                    // Weekday automatic color coding
                    const allShifts = [dayShiftData, nightShiftData].filter(Boolean).join('/');
                    const employees = allShifts.split('/').filter(initial => initial.trim() !== '');
                    const employeeCount = employees.length;

                    if (employeeCount >= 6) {
                        eventData.backgroundColor = '#FFFFFF';
                        eventData.borderColor = '#FFFFFF';
                        eventData.textColor = '#000000'; 
                    } else if (employeeCount === 5) {
                        eventData.backgroundColor = '#228B22';
                        eventData.borderColor = '#228B22';
                        eventData.textColor = '#ffffff';
                    } else if (employeeCount <= 4) {
                        eventData.backgroundColor = '#B22222';
                        eventData.borderColor = '#B22222';
                        eventData.textColor = '#ffffff';
                    }
                }
                
                events.push(eventData);
            }
        }
    });
    
    return events;
}

function createEditableEvents(data) {
    const events = createEventsFromData(data);
    
    // Add extended props and editable class
    events.forEach(event => {
        const dateRow = data.find(row => parseDate(row[0]) === event.start);
        if (dateRow) {
            event.extendedProps = {
                dayShift: dateRow[16] || '',
                nightShift: dateRow[17] || '',
                school: dateRow[18] || '',     // Column S
                off: dateRow[19] || '',        // Column T
                customColor: dateRow[20] || ''
            };
        }
        event.classNames = event.classNames || [];
        event.classNames.push('editable');
    });
    
    return events;
}

// --- Calendar Initialization Functions ---

function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const values = data.values;
            const events = createEventsFromData(values || []);

            calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek,dayGridDay'
                },
                showNonCurrentDates: false,
                fixedWeekCount: false,
                events: events,
                eventContent: function(arg) {
                    return { html: arg.event.title };
                }
            });

            calendar.render();
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
            calendarEl.innerHTML = '<p style="text-align: center;">Error fetching data. Check the console for details.</p>';
        });
}

function initializeSupervisorViewCalendar() {
    const calendarEl = document.getElementById('supervisorViewCalendar');

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const values = data.values;
            const events = createEventsFromData(values || []);

            supervisorViewCalendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek,dayGridDay'
                },
                showNonCurrentDates: false,
                fixedWeekCount: false,
                events: events,
                eventContent: function(arg) {
                    return { html: arg.event.title };
                }
            });

            supervisorViewCalendar.render();
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
            calendarEl.innerHTML = '<p style="text-align: center;">Error fetching data. Check the console for details.</p>';
        });
}

function initializeSupervisorEditCalendar() {
    const calendarEl = document.getElementById('supervisorEditCalendar');

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const values = data.values;
            originalScheduleData = values || [];
            
            // Load saved data and set editedScheduleData properly
            const savedPublishedData = loadSavedData();
            
            if (savedPublishedData && savedPublishedData.schedule) {
                // Use the published schedule as the starting point
                editedScheduleData = JSON.parse(JSON.stringify(savedPublishedData.schedule));
                console.log('Loaded published schedule for editing:', editedScheduleData.length, 'rows');
            } else {
                // Fall back to original data if no saved data
                editedScheduleData = JSON.parse(JSON.stringify(originalScheduleData));
                console.log('Using original Google Sheets data:', editedScheduleData.length, 'rows');
            }
            
            const events = createEditableEvents(editedScheduleData);
            console.log('Created', events.length, 'events for supervisor edit calendar');

            supervisorEditCalendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,dayGridWeek,dayGridDay'
                },
                showNonCurrentDates: false,
                fixedWeekCount: false,
                events: events,
                eventContent: function(arg) {
                    return { html: arg.event.title };
                },
                eventClick: function(info) {
                    openEditModal(info.event.startStr, info.event.extendedProps.dayShift, info.event.extendedProps.nightShift);
                },
                dateClick: function(info) {
                    openEditModal(info.dateStr, '', '');
                }
            });

            supervisorEditCalendar.render();
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
            calendarEl.innerHTML = '<p style="text-align: center;">Error fetching data. Check the console for details.</p>';
        });
}

function initializeSupervisorEditCalendarFromData() {
    const calendarEl = document.getElementById('supervisorEditCalendar');
    const events = createEditableEvents(editedScheduleData);

    supervisorEditCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
        },
        showNonCurrentDates: false,
        fixedWeekCount: false,
        events: events,
        eventContent: function(arg) {
            return { html: arg.event.title };
        },
        eventClick: function(info) {
            openEditModal(info.event.startStr, info.event.extendedProps.dayShift, info.event.extendedProps.nightShift);
        },
        dateClick: function(info) {
            openEditModal(info.dateStr, '', '');
        }
    });

    supervisorEditCalendar.render();
}

// MODIFIED: initializePublishedCalendar function with version tabs
function initializePublishedCalendar() {
    createVersionTabs();
    
    // Load and display the current (latest) version by default
    const savedData = loadSavedData();
    if (savedData && savedData.schedule) {
        displayVersion('current', savedData);
    } else {
        // Fallback: load original data from Google Sheets
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`)
            .then(response => response.json())
            .then(data => {
                const fallbackData = {
                    schedule: data.values || [],
                    timestamp: new Date().toISOString(),
                    version: 1
                };
                displayVersion('current', fallbackData);
            })
            .catch(error => {
                console.error('Error fetching data: ', error);
                document.getElementById('publishedCalendar').innerHTML = 
                    '<p style="text-align: center;">Error loading schedule data.</p>';
            });
    }
}

// Initialize Previous Calendar Function
function initializePreviousCalendar() {
    const calendarEl = document.getElementById('previousCalendar');
    
    try {
        const history = localStorage.getItem('perfusionScheduleHistory');
        if (history) {
            const versions = JSON.parse(history);
            if (versions.length > 0) {
                const previousVersion = versions[0]; // Most recent previous version
                const events = createEventsFromData(previousVersion.schedule || []);

                previousCalendar = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,dayGridWeek,dayGridDay'
                    },
                    showNonCurrentDates: false,
                    fixedWeekCount: false,
                    events: events,
                    eventContent: function(arg) {
                        return { html: arg.event.title };
                    }
                });

                previousCalendar.render();
                return;
            }
        }
        
        // If no previous version found, show message
        calendarEl.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No previous version available</p>';
        
    } catch (error) {
        console.error('Error initializing previous calendar:', error);
        calendarEl.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Error loading previous version</p>';
    }
}

// --- Version Tab Functions ---

// Create version tabs based on available versions
function createVersionTabs() {
    const tabsContainer = document.getElementById('versionTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    // Get current published version
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    
    // Get version history
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    
    // Create tabs for previous versions (in reverse order - oldest to newest)
    const reversedHistory = [...history].reverse();
    reversedHistory.forEach((version, index) => {
        const versionNum = index + 1;
        const tab = createVersionTab(versionNum, version, false);
        tabsContainer.appendChild(tab);
    });
    
    // Create tab for current version
    if (currentPublished) {
        const currentData = JSON.parse(currentPublished);
        const currentVersionNum = history.length + 1;
        const tab = createVersionTab(currentVersionNum, currentData, true);
        tabsContainer.appendChild(tab);
        
        // Set current version as active by default
        tab.classList.add('active');
        currentDisplayedVersion = 'current';
    }
    
    // Show/hide tabs container based on whether we have multiple versions
    const tabsContainerDiv = document.getElementById('versionTabsContainer');
    if (tabsContainerDiv) {
        if (history.length === 0 && !currentPublished) {
            tabsContainerDiv.style.display = 'none';
        } else {
            tabsContainerDiv.style.display = 'block';
        }
    }
}

// Create individual version tab
function createVersionTab(versionNum, versionData, isCurrent) {
    const tab = document.createElement('div');
    tab.className = `version-tab ${isCurrent ? 'current' : ''}`;
    tab.setAttribute('data-version', isCurrent ? 'current' : versionNum);
    
    const date = new Date(versionData.timestamp);
    const shortDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
    });
    const shortTime = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    tab.innerHTML = `
        <div>Vers. ${versionNum}</div>
        <div class="version-info">${shortDate}</div>
        <div class="version-info">${shortTime}</div>
    `;
    
    // Add click handler
    tab.addEventListener('click', () => {
        selectVersionTab(isCurrent ? 'current' : versionNum, versionData);
    });
    
    return tab;
}

// Handle version tab selection
function selectVersionTab(version, versionData) {
    // Update active tab styling
    document.querySelectorAll('.version-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const selectedTab = document.querySelector(`[data-version="${version}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Display the selected version
    displayVersion(version, versionData);
    currentDisplayedVersion = version;
}

// Display a specific version in the calendar
function displayVersion(version, versionData) {
    const calendarEl = document.getElementById('publishedCalendar');
    
    // Destroy existing calendar
    if (publishedCalendar) {
        publishedCalendar.destroy();
    }
    
    // Create events from the version data
    const events = createEventsFromData(versionData.schedule || []);
    
    // Create new calendar
    publishedCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
        },
        showNonCurrentDates: false,
        fixedWeekCount: false,
        events: events,
        eventContent: function(arg) {
            return { html: arg.event.title };
        }
    });
    
    publishedCalendar.render();
    
    // Update last updated info
    updateLastUpdatedForVersion(versionData, version);
}

// Update the last updated timestamp for the displayed version
function updateLastUpdatedForVersion(versionData, version) {
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
        const timestamp = new Date(versionData.timestamp);
        const versionText = version === 'current' ? 'Current Version' : `Version ${version}`;
        lastUpdatedEl.textContent = `${versionText} - Published: ${timestamp.toLocaleString()}`;
    }
}
