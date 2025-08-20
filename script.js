// Configuration
const apiKey = 'AIzaSyCyCEmSvunsn8C82AwhSyX5joXy2hstPls';
const spreadsheetId = '1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E';
const range = 'Sheet2!A13:V54'; // Extended to include column V to ensure we get columns S and T 

let calendar;
let supervisorViewCalendar;
let supervisorEditCalendar;
let publishedCalendar;
let supervisorPublishedCalendar;
let originalScheduleData = [];
let editedScheduleData = [];
let currentEditDate = null;

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
    
    // Reset supervisor access when leaving supervisor pages
    if (pageId !== 'supervisorEditPage' && pageId !== 'supervisorViewPage' && pageId !== 'supervisorPage' && pageId !== 'supervisorPublishedPage') {
        hasSupervisorAccess = false;
    }
    
    if (pageId === 'schedulePage' && !calendar) {
        initializeCalendar();
    } else if (pageId === 'supervisorViewPage' && !supervisorViewCalendar) {
        initializeSupervisorViewCalendar();
    } else if (pageId === 'supervisorEditPage' && !supervisorEditCalendar) {
        initializeSupervisorEditCalendar();
    } else if (pageId === 'publishedSchedulePage' && !publishedCalendar) {
        initializePublishedCalendar();
    } else if (pageId === 'supervisorPublishedPage' && !supervisorPublishedCalendar) {
        initializeSupervisorPublishedCalendar();
    }
}

// Password protection for edit access
function requestEditAccess() {
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('passwordInput').focus();
}

// New function for manage published access
function requestManagePublishedAccess() {
    if (hasSupervisorAccess) {
        showPage('supervisorPublishedPage');
    } else {
        document.getElementById('passwordModal').style.display = 'block';
        document.getElementById('passwordInput').focus();
        // Set a flag to know we're accessing manage published after password
        sessionStorage.setItem('pendingPageAfterPassword', 'supervisorPublishedPage');
    }
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').style.display = 'none';
    sessionStorage.removeItem('pendingPageAfterPassword');
}

// Track if user has supervisor access
let hasSupervisorAccess = false;

function checkPassword() {
    const password = document.getElementById('passwordInput').value;
    const correctPassword = 'chris';
    
    if (password === correctPassword) {
        hasSupervisorAccess = true; // Grant supervisor access
        closePasswordModal();
        
        // Check if we have a pending page to navigate to
        const pendingPage = sessionStorage.getItem('pendingPageAfterPassword');
        if (pendingPage) {
            showPage(pendingPage);
        } else {
            showPage('supervisorEditPage');
        }
    } else {
        document.getElementById('passwordError').textContent = 'Incorrect password. Please try again.';
        document.getElementById('passwordError').style.display = 'block';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

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
    
    // Clear ALL saved data from localStorage - this is the key fix
    localStorage.removeItem('perfusionScheduleEdits');
    localStorage.removeItem('perfusionPublishedSchedule');
    localStorage.removeItem('perfusionPublishedVersions');
    localStorage.removeItem('perfusionScheduleHistory');
    
    console.log('All localStorage data cleared:', {
        edits: localStorage.getItem('perfusionScheduleEdits'),
        published: localStorage.getItem('perfusionPublishedSchedule'),
        versions: localStorage.getItem('perfusionPublishedVersions'),
        history: localStorage.getItem('perfusionScheduleHistory')
    });
    
    // Refresh the calendar with original data
    supervisorEditCalendar.destroy();
    initializeSupervisorEditCalendarFromData(currentViewDate);
    
    console.log('Edits cleared - reverted to original Google Sheets data');
    alert('All edits have been cleared. Calendar reverted to original Google Sheets data.');
}

function publishSchedule() {
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

function getCurrentMonthName() {
    const currentDate = supervisorEditCalendar ? supervisorEditCalendar.getDate() : new Date();
    return currentDate.toLocaleDateString('en-US', { month: 'long' });
}

// --- Helper Functions ---

// Date functions
function parseDate(dateString) {
    if (!dateString) return null;
    
    // Handle different date formats and ensure consistency
    let date;
    if (typeof dateString === 'string') {
        // If it's already in YYYY-MM-DD format, use it directly
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
        } else {
            date = new Date(dateString);
        }
    } else {
        date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return null;
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const result = `${year}-${month}-${day}`;
    return result;
}

function getCorrectDayOfWeek(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDay();
}

// Event creation functions
function createEventsFromData(data) {
    const events = [];
    
    data.forEach((row, rowIndex) => {
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

            // Create event if there's any content
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

function initializeSupervisorPublishedCalendar() {
    const calendarEl = document.getElementById('supervisorPublishedCalendar');
    hasSupervisorAccess = true; // Ensure supervisor access for this page
    refreshSupervisorPublishedScheduleDisplay();
}

function refreshSupervisorPublishedScheduleDisplay() {
    const calendarEl = document.getElementById('supervisorPublishedCalendar');
    if (!calendarEl) return;
    
    // Get published versions
    const publishedVersions = getPublishedVersions();
    
    if (publishedVersions.length === 0) {
        calendarEl.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No published schedules yet. Go to Supervisor Edit to publish a schedule.</p>';
        return;
    }
    
    // Show the most recent version by default
    displaySupervisorPublishedVersion(0, publishedVersions);
}

function displaySupervisorPublishedVersion(versionIndex, versions) {
    const calendarEl = document.getElementById('supervisorPublishedCalendar');
    if (!calendarEl || !versions || versions.length === 0) return;
    
    currentVersionIndex = versionIndex;
    const version = versions[versionIndex];
    
    if (!version) return;
    
    // Always show delete button in supervisor section (if more than 1 version)
    const showDeleteButton = versions.length > 1;
    
    // Create the version display
    calendarEl.innerHTML = `
        <div class="published-version-container">
            <div class="version-header">
                <div class="version-info">
                    <h2>${version.month} ${version.year} Schedule</h2>
                    <p class="version-meta">Published: ${new Date(version.timestamp).toLocaleString()}</p>
                    <p class="version-number">Version ${versionIndex + 1} of ${versions.length}</p>
                </div>
                <div class="version-controls">
                    <div class="version-navigation">
                        <button class="nav-btn prev-btn" onclick="showSupervisorPreviousVersion()" ${versionIndex >= versions.length - 1 ? 'disabled' : ''}>
                            ← Previous
                        </button>
                        <button class="nav-btn next-btn" onclick="showSupervisorNextVersion()" ${versionIndex <= 0 ? 'disabled' : ''}>
                            Next →
                        </button>
                    </div>
                    ${showDeleteButton ? `
                    <div class="version-actions">
                        <button class="delete-btn" onclick="deleteSupervisorVersion(${versionIndex})" title="Delete this version">
                            🗑️ Delete
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="version-calendar" id="supervisorVersionCalendar">
                <!-- Calendar will be rendered here -->
            </div>
        </div>
    `;
    
    // Render the calendar snapshot
    setTimeout(() => {
        renderSupervisorVersionCalendar(version.snapshot);
    }, 100);
}

function renderSupervisorVersionCalendar(snapshotData) {
    const container = document.getElementById('supervisorVersionCalendar');
    if (!container || !snapshotData) return;
    
    if (!snapshotData.events || snapshotData.events.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No calendar data available for this version</p>';
        return;
    }
    
    // Generate the calendar grid
    container.innerHTML = `<div id="supervisorCalendarGrid" class="snapshot-calendar-grid"></div>`;
    generateFullCalendarGrid('supervisorCalendarGrid', snapshotData);
}

function initializePublishedCalendar() {
    const calendarEl = document.getElementById('publishedCalendar');
    refreshPublishedScheduleDisplay();
}

function displayPublishedVersion(versionIndex, versions) {
    const calendarEl = document.getElementById('publishedCalendar');
    if (!calendarEl || !versions || versions.length === 0) return;
    
    currentVersionIndex = versionIndex;
    const version = versions[versionIndex];
    
    if (!version) return;
    
    // Regular published schedule - no delete functionality
    calendarEl.innerHTML = `
        <div class="published-version-container">
            <div class="version-header">
                <div class="version-info">
                    <h2>${version.month} ${version.year} Schedule</h2>
                    <p class="version-meta">Published: ${new Date(version.timestamp).toLocaleString()}</p>
                    <p class="version-number">Version ${versionIndex + 1} of ${versions.length}</p>
                </div>
                <div class="version-controls">
                    <div class="version-navigation">
                        <button class="nav-btn prev-btn" onclick="showPreviousVersion()" ${versionIndex >= versions.length - 1 ? 'disabled' : ''}>
                            ← Previous
                        </button>
                        <button class="nav-btn next-btn" onclick="showNextVersion()" ${versionIndex <= 0 ? 'disabled' : ''}>
                            Next →
                        </button>
                    </div>
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

function getPublishedVersions() {
    const versions = localStorage.getItem('perfusionPublishedVersions');
    return versions ? JSON.parse(versions) : [];
}

let currentVersionIndex = 0;

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

// Make all functions globally accessible for onclick handlers
window.showPage = showPage;
window.requestEditAccess = requestEditAccess;
window.requestManagePublishedAccess = requestManagePublishedAccess;
window.closePasswordModal = closePasswordModal;
window.checkPassword = checkPassword;
window.clearEdits = clearEdits;
window.publishSchedule = publishSchedule;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveEdit = saveEdit;

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

// Supervisor published schedule navigation functions
window.showSupervisorPreviousVersion = function() {
    const versions = getPublishedVersions();
    if (currentVersionIndex < versions.length - 1) {
        displaySupervisorPublishedVersion(currentVersionIndex + 1, versions);
    }
};

window.showSupervisorNextVersion = function() {
    const versions = getPublishedVersions();
    if (currentVersionIndex > 0) {
        displaySupervisorPublishedVersion(currentVersionIndex - 1, versions);
    }
};

// Supervisor delete function
window.deleteSupervisorVersion = function(versionIndex) {
    const versions = getPublishedVersions();
    
    if (versions.length <= 1) {
        alert('Cannot delete the last remaining version.');
        return;
    }
    
    const version = versions[versionIndex];
    const confirmDelete = confirm(`Are you sure you want to delete this version?\n\n${version.month} ${version.year} Schedule\nPublished: ${new Date(version.timestamp).toLocaleString()}\n\nThis action cannot be undone.`);
    
    if (!confirmDelete) {
        return;
    }
    
    // Remove the version from the array
    versions.splice(versionIndex, 1);
    
    // Save updated versions back to localStorage
    localStorage.setItem('perfusionPublishedVersions', JSON.stringify(versions));
    
    // Determine which version to show next
    let newVersionIndex = versionIndex;
    if (newVersionIndex >= versions.length) {
        newVersionIndex = versions.length - 1; // Show the last version if we deleted the current last one
    }
    
    // Update the current index
    currentVersionIndex = newVersionIndex;
    
    // Refresh the supervisor display
    displaySupervisorPublishedVersion(newVersionIndex, versions);
    
    console.log(`Deleted version ${versionIndex + 1}. Now showing version ${newVersionIndex + 1} of ${versions.length}`);
    alert(`Version deleted successfully. Now showing version ${newVersionIndex + 1} of ${versions.length}.`);
};

// Navigation functions for published versions
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
