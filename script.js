// Configuration
const apiKey = 'AIzaSyCyCEmSvunsn8C82AwhSyX5joXy2hstPls';
const spreadsheetId = '1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E';
const range = 'Sheet2!A13:V54'; // Extended to include column V to ensure we get columns S and T 

let calendar;
let supervisorViewCalendar;
let supervisorEditCalendar;
let publishedCalendar;
let originalScheduleData = [];
let editedScheduleData = [];
let currentEditDate = null;

// --- Page and Modal Management ---

// Page Navigation - MUST BE DEFINED FIRST
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
    } else if (pageId === 'publishedSchedulePage' && !publishedCalendar) {
        initializePublishedCalendar();
    }
}

// Make showPage globally accessible
window.showPage = showPage;

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
    } else if (pageId === 'publishedSchedulePage' && !publishedCalendar) {
        initializePublishedCalendar();
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
    const correctPassword = 'chris';
    
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

// Make functions globally accessible for onclick handlers
window.requestEditAccess = requestEditAccess;
window.closePasswordModal = closePasswordModal;
window.checkPassword = checkPassword;

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
    
    // Store the current date being viewed before destroying calendar
    const currentViewDate = supervisorEditCalendar ? supervisorEditCalendar.getDate() : new Date();
    
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
    initializeSupervisorEditCalendarFromData(currentViewDate); // Pass the current view date
    
    // Save edits automatically
    saveEditsToStorage();
    
    closeEditModal();
}

function clearEdits() {
    // Show confirmation dialog
    const confirmClear = confirm('Are you sure you want to clear all edits and revert to the original Google Sheets data? This action cannot be undone.');
    
    if (!confirmClear) {
        return; // User cancelled
    }
    
    // Store the current date being viewed before clearing
    const currentViewDate = supervisorEditCalendar ? supervisorEditCalendar.getDate() : new Date();
    
    // Revert editedScheduleData back to the original Google Sheets data
    editedScheduleData = JSON.parse(JSON.stringify(originalScheduleData));
    
    // Clear any saved edits from localStorage
    localStorage.removeItem('perfusionScheduleEdits');
    
    // Refresh the calendar with original data
    supervisorEditCalendar.destroy();
    initializeSupervisorEditCalendarFromData(currentViewDate);
    
    console.log('Edits cleared - reverted to original Google Sheets data');
    alert('All edits have been cleared. Calendar reverted to original Google Sheets data.');
}

// Make functions globally accessible for onclick handlers
window.clearEdits = clearEdits;
window.publishSchedule = publishSchedule;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEdit = saveEdit;
    // Get the current month being viewed in the edit calendar
    const currentDate = supervisorEditCalendar ? supervisorEditCalendar.getDate() : new Date();
    const currentMonth = currentDate.toLocaleDateString('en-US', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    
    // Capture snapshot of the current month being edited
    const snapshotData = captureCurrentMonthSnapshot();
    
    // Create new published version
    const newVersion = {
        id: Date.now(), // Unique ID for this version
        month: currentMonth,
        year: currentYear,
        timestamp: new Date().toISOString(),
        snapshot: snapshotData,
        schedule: JSON.parse(JSON.stringify(editedScheduleData)) // Deep copy
    };
    
    // Get existing published versions
    let publishedVersions = [];
    const existingVersions = localStorage.getItem('perfusionPublishedVersions');
    if (existingVersions) {
        publishedVersions = JSON.parse(existingVersions);
    }
    
    // Add new version to the beginning (most recent first)
    publishedVersions.unshift(newVersion);
    
    // Keep only last 10 versions to prevent storage bloat
    if (publishedVersions.length > 10) {
        publishedVersions = publishedVersions.slice(0, 10);
    }
    
    // Save updated versions
    localStorage.setItem('perfusionPublishedVersions', JSON.stringify(publishedVersions));
    
    // Refresh the published schedule display
    refreshPublishedScheduleDisplay();
    
    // Update last modified time in header
    const now = new Date();
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last updated: ${now.toLocaleString()}`;
    }
    
    alert(`${currentMonth} ${currentYear} schedule published successfully!`);
}

function captureCurrentMonthSnapshot() {
    const currentDate = supervisorEditCalendar ? supervisorEditCalendar.getDate() : new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get events for the current month being edited
    const events = createEventsFromData(editedScheduleData || []);
    const monthEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
    
    return {
        month: currentDate.toLocaleDateString('en-US', { month: 'long' }),
        year: year,
        events: monthEvents,
        capturedAt: new Date().toISOString()
    };
}

function createCalendarSnapshot(data) {
    // Create a simplified calendar representation
    const currentDate = supervisorEditCalendar ? supervisorEditCalendar.getDate() : new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get events for the current month
    const events = createEventsFromData(data || []);
    const monthEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    });
    
    return {
        month: getCurrentMonthName(),
        year: year,
        events: monthEvents,
        capturedAt: new Date().toISOString()
    };
}

function getCurrentMonthName() {
    const currentDate = supervisorEditCalendar ? supervisorEditCalendar.getDate() : new Date();
    return currentDate.toLocaleDateString('en-US', { month: 'long' });
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
        
        // DEBUG: Log the data for troubleshooting
        if (formattedDate === '2025-09-03') {
            console.log(`FULL ROW DATA for Sep 3:`, row);
            console.log(`Row length: ${row.length}`);
            console.log(`Index 18 (School): "${row[18]}"`);
            console.log(`Index 19 (Off): "${row[19]}"`);
        }
        console.log(`Date: ${formattedDate}, Day: ${dayShiftData}, Night: ${nightShiftData}, School: ${schoolData}, Off: ${offData}`);
        
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
                
                // Debug: log color decisions
                console.log(`Date: ${formattedDate}, Custom Color: ${customColor}, Day of Week: ${dayOfWeek}`);
                
                // Check for custom color first (only if it's a valid color, not employee initials)
                if (customColor && customColor.startsWith('#')) {
                    eventData.backgroundColor = customColor;
                    eventData.borderColor = customColor;
                    eventData.textColor = '#ffffff';
                    console.log(`Applied custom color: ${customColor}`);
                } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                    // Weekend styling
                    eventData.backgroundColor = 'transparent';
                    eventData.borderColor = 'transparent';
                    eventData.textColor = '#000000';
                    eventData.classNames = ['weekend-event'];
                    console.log('Applied weekend styling');
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
                    console.log(`Applied auto color for ${employeeCount} employees: ${eventData.backgroundColor}`);
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

function initializeSupervisorEditCalendarFromData(preserveDate = null) {
    const calendarEl = document.getElementById('supervisorEditCalendar');
    const events = createEditableEvents(editedScheduleData);

    supervisorEditCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        initialDate: preserveDate || new Date(), // Use preserved date or default to current
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

function initializePublishedCalendar() {
    const calendarEl = document.getElementById('publishedCalendar');
    refreshPublishedScheduleDisplay();
}

function refreshPublishedScheduleDisplay() {
    const calendarEl = document.getElementById('publishedCalendar');
    if (!calendarEl) return;
    
    // Get published versions
    const publishedVersions = getPublishedVersions();
    
    if (publishedVersions.length === 0) {
        calendarEl.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No published schedules yet. Go to Supervisor Edit to publish a schedule.</p>';
        return;
    }
    
    // Show the most recent version by default
    displayPublishedVersion(0, publishedVersions);
}

function getPublishedVersions() {
    const versions = localStorage.getItem('perfusionPublishedVersions');
    return versions ? JSON.parse(versions) : [];
}

let currentVersionIndex = 0;

function displayPublishedVersion(versionIndex, versions) {
    const calendarEl = document.getElementById('publishedCalendar');
    if (!calendarEl || !versions || versions.length === 0) return;
    
    currentVersionIndex = versionIndex;
    const version = versions[versionIndex];
    
    if (!version) return;
    
    // Create the version display
    calendarEl.innerHTML = `
        <div class="published-version-container">
            <div class="version-header">
                <div class="version-info">
                    <h2>${version.month} ${version.year} Schedule</h2>
                    <p class="version-meta">Published: ${new Date(version.timestamp).toLocaleString()}</p>
                    <p class="version-number">Version ${versionIndex + 1} of ${versions.length}</p>
                </div>
                <div class="version-navigation">
                    <button class="nav-btn prev-btn" onclick="showPreviousVersion()" ${versionIndex >= versions.length - 1 ? 'disabled' : ''}>
                        ← Previous
                    </button>
                    <button class="nav-btn next-btn" onclick="showNextVersion()" ${versionIndex <= 0 ? 'disabled' : ''}>
                        Next →
                    </button>
                </div>
            </div>
            <div class="version-calendar" id="versionCalendar">
                <!-- Calendar will be rendered here -->
            </div>
        </div>
    `;
    
    // Render the calendar snapshot
    setTimeout(() => {
        renderVersionCalendar(version.snapshot);
    }, 100);
}

function renderVersionCalendar(snapshotData) {
    const container = document.getElementById('versionCalendar');
    if (!container || !snapshotData) return;
    
    if (!snapshotData.events || snapshotData.events.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No calendar data available for this version</p>';
        return;
    }
    
    // Generate the calendar grid
    container.innerHTML = `<div id="calendarGrid" class="snapshot-calendar-grid"></div>`;
    generateFullCalendarGrid('calendarGrid', snapshotData);
}

// Navigation functions
window.showPreviousVersion = function() {
    const versions = getPublishedVersions();
    if (currentVersionIndex < versions.length - 1) {
        displayPublishedVersion(currentVersionIndex + 1, versions);
    }
};

window.showNextVersion = function() {
    const versions = getPublishedVersions();
    if (currentVersionIndex > 0) {
        displayPublishedVersion(currentVersionIndex - 1, versions);
    }
};

function createScheduleStack(container) {
    // Get all schedule versions from localStorage
    const scheduleHistory = getScheduleHistory();
    
    container.innerHTML = '<div class="schedule-stack"></div>';
    const stackContainer = container.querySelector('.schedule-stack');
    
    scheduleHistory.forEach((schedule, index) => {
        const paper = createSchedulePaper(schedule, index);
        stackContainer.appendChild(paper);
    });
}

function getScheduleHistory() {
    const history = [];
    
    // Get current published schedule
    const published = localStorage.getItem('perfusionPublishedSchedule');
    if (published) {
        const publishedData = JSON.parse(published);
        history.push({
            type: 'current',
            title: `${publishedData.month || 'Current'} ${publishedData.year || new Date().getFullYear()} Schedule`,
            date: new Date(publishedData.timestamp).toLocaleDateString(),
            time: new Date(publishedData.timestamp).toLocaleTimeString(),
            snapshot: publishedData.snapshot || null,
            month: publishedData.month || 'Current',
            timestamp: publishedData.timestamp
        });
    }
    
    // Get previous versions from history
    const previousVersions = localStorage.getItem('perfusionScheduleHistory');
    if (previousVersions) {
        const versions = JSON.parse(previousVersions);
        versions.forEach((version, index) => {
            history.push({
                type: 'previous',
                title: `${version.month || 'Previous'} ${version.year || new Date().getFullYear()} - Version ${index + 1}`,
                date: new Date(version.timestamp).toLocaleDateString(),
                time: new Date(version.timestamp).toLocaleTimeString(),
                snapshot: version.snapshot || null,
                month: version.month || `Previous #${index + 1}`,
                timestamp: version.timestamp
            });
        });
    }
    
    // Create sample previous schedules if none exist (for demo purposes)
    if (history.length === 1) {
        // Create 2 sample previous versions
        for (let i = 1; i <= 2; i++) {
            const sampleDate = new Date();
            sampleDate.setDate(sampleDate.getDate() - (i * 7));
            history.push({
                type: 'previous',
                title: `September 2025 - Version ${i}`,
                date: sampleDate.toLocaleDateString(),
                time: sampleDate.toLocaleTimeString(),
                snapshot: createSampleSnapshot(),
                month: 'September',
                timestamp: sampleDate.toISOString()
            });
        }
    }
    
    return history;
}

function createSampleSnapshot() {
    return {
        month: 'September',
        year: 2025,
        events: [],
        capturedAt: new Date().toISOString()
    };
}

function createSchedulePaper(schedule, index) {
    const paper = document.createElement('div');
    paper.className = `schedule-paper ${index === 0 ? 'current' : `previous-${index}`}`;
    
    const isCurrent = schedule.type === 'current';
    
    if (isCurrent) {
        // Current schedule - show snapshot
        paper.innerHTML = `
            <div class="schedule-header">
                <div>
                    <h3 class="schedule-title">${schedule.title}</h3>
                    <div class="schedule-date">${schedule.date} at ${schedule.time}</div>
                </div>
                <span class="status-badge status-current">Current</span>
            </div>
            <div class="schedule-content" id="schedule-content-${index}">
                <div id="snapshot-${index}" class="calendar-snapshot"></div>
            </div>
        `;
    } else {
        // Previous schedule - just a tab and hidden snapshot
        const shortDate = new Date(schedule.timestamp).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        const shortTime = new Date(schedule.timestamp).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        paper.innerHTML = `
            <div class="schedule-tab" onclick="toggleSchedule(${index})">
                ${schedule.month}<br>${shortDate}<br>${shortTime}
            </div>
            <div class="schedule-header previous" style="display: none;">
                <div>
                    <h3 class="schedule-title">${schedule.title}</h3>
                    <div class="schedule-date">${schedule.date} at ${schedule.time}</div>
                </div>
                <span class="status-badge status-previous">Previous</span>
            </div>
            <div class="schedule-content collapsed" id="schedule-content-${index}" style="display: none;">
                <div id="snapshot-${index}" class="calendar-snapshot"></div>
            </div>
        `;
    }
    
    // Create snapshot view instead of live calendar
    setTimeout(() => {
        createSnapshotView(`snapshot-${index}`, schedule.snapshot);
    }, 100);
    
    return paper;
}

function createSnapshotView(containerId, snapshotData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!snapshotData || !snapshotData.events || snapshotData.events.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No calendar data available</p>';
        return;
    }
    
    // Create a full calendar view from the snapshot
    container.innerHTML = `
        <div class="snapshot-calendar-header">
            <h2>${snapshotData.month} ${snapshotData.year}</h2>
        </div>
        <div class="snapshot-calendar-grid" id="grid-${containerId}">
            <!-- Calendar grid will be generated here -->
        </div>
    `;
    
    // Generate the actual calendar grid
    generateFullCalendarGrid(`grid-${containerId}`, snapshotData);
}

function generateFullCalendarGrid(gridId, snapshotData) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    const events = snapshotData.events || [];
    const year = snapshotData.year || new Date().getFullYear();
    const monthIndex = new Date(`${snapshotData.month} 1, ${year}`).getMonth();
    
    // Create event map by date
    const eventsByDate = {};
    events.forEach(event => {
        const date = event.start;
        if (!eventsByDate[date]) {
            eventsByDate[date] = [];
        }
        eventsByDate[date].push(event);
    });
    
    // Generate calendar grid
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    let calendarHTML = `
        <div class="calendar-grid">
            <div class="calendar-header">
                <div class="day-header">Sun</div>
                <div class="day-header">Mon</div>
                <div class="day-header">Tue</div>
                <div class="day-header">Wed</div>
                <div class="day-header">Thu</div>
                <div class="day-header">Fri</div>
                <div class="day-header">Sat</div>
            </div>
            <div class="calendar-body">
    `;
    
    // Generate 6 weeks of calendar
    for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + (week * 7) + day);
            
            const dateStr = currentDate.toISOString().split('T')[0];
            const isCurrentMonth = currentDate.getMonth() === monthIndex;
            const dayEvents = eventsByDate[dateStr] || [];
            
            calendarHTML += `
                <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''}">
                    <div class="day-number">${currentDate.getDate()}</div>
                    <div class="day-events">
                        ${dayEvents.map(event => `
                            <div class="event-content" style="background-color: ${event.backgroundColor || '#ccc'}; color: ${event.textColor || '#000'};">
                                ${event.title || ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    calendarHTML += `
            </div>
        </div>
    `;
    
    grid.innerHTML = calendarHTML;
}

// Make toggleSchedule globally accessible
window.toggleSchedule = function(index) {
    console.log('Toggling schedule:', index);
    const paper = document.querySelector(`.schedule-paper.previous-${index}`);
    const tab = paper?.querySelector('.schedule-tab');
    const header = paper?.querySelector('.schedule-header');
    const content = paper?.querySelector('.schedule-content');
    
    if (!paper || !content) {
        console.error('Could not find schedule elements for index:', index);
        return;
    }
    
    if (paper.classList.contains('previous-expanded')) {
        // Collapse back to tab
        paper.classList.remove('previous-expanded');
        tab.style.display = 'block';
        header.style.display = 'none';
        content.style.display = 'none';
    } else {
        // Collapse any other expanded papers first
        document.querySelectorAll('.schedule-paper.previous-expanded').forEach(p => {
            const pIndex = p.className.match(/previous-(\d+)/)?.[1];
            if (pIndex && pIndex !== index.toString()) {
                window.toggleSchedule(parseInt(pIndex));
            }
        });
        
        // Expand this one
        paper.classList.add('previous-expanded');
        tab.style.display = 'none';
        header.style.display = 'flex';
        content.style.display = 'block';
    }
};

function initializePublishedCalendarFromData() {
    const calendarEl = document.getElementById('publishedCalendar');
    const events = createEventsFromData(editedScheduleData);

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
}
