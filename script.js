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

function publishSchedule() {
    // Save current published schedule to history before updating
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    if (currentPublished) {
        saveToHistory(JSON.parse(currentPublished));
    }
    
    // Save new published schedule
    savePublishedToStorage();
    
    // Recreate the schedule stack
    const calendarEl = document.getElementById('publishedCalendar');
    if (calendarEl) {
        createScheduleStack(calendarEl);
    }
    
    // Update last modified time in header
    const now = new Date();
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last updated: ${now.toLocaleString()}`;
    }
    
    alert('Schedule published successfully! Previous version saved to history.');
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

function initializePublishedCalendar() {
    const calendarEl = document.getElementById('publishedCalendar');
    
    // Create the schedule stack instead of a single calendar
    createScheduleStack(calendarEl);
}

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
            title: 'Current Published Schedule',
            date: new Date(publishedData.timestamp).toLocaleDateString(),
            time: new Date(publishedData.timestamp).toLocaleTimeString(),
            data: publishedData.schedule,
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
                title: `Previous Schedule #${index + 1}`,
                date: new Date(version.timestamp).toLocaleDateString(),
                time: new Date(version.timestamp).toLocaleTimeString(),
                data: version.schedule,
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
                title: `Previous Schedule #${i}`,
                date: sampleDate.toLocaleDateString(),
                time: sampleDate.toLocaleTimeString(),
                data: history[0].data, // Same data as current for demo
                timestamp: sampleDate.toISOString()
            });
        }
    }
    
    return history;
}

function createSchedulePaper(schedule, index) {
    const paper = document.createElement('div');
    paper.className = `schedule-paper ${index === 0 ? 'current' : `previous-${index}`}`;
    
    const isCurrent = schedule.type === 'current';
    
    if (isCurrent) {
        // Current schedule - full paper
        paper.innerHTML = `
            <div class="schedule-header">
                <div>
                    <h3 class="schedule-title">${schedule.title}</h3>
                    <div class="schedule-date">${schedule.date} at ${schedule.time}</div>
                </div>
                <span class="status-badge status-current">Current</span>
            </div>
            <div class="schedule-content" id="schedule-content-${index}">
                <div id="calendar-${index}"></div>
            </div>
        `;
    } else {
        // Previous schedule - just a tab and hidden content
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
                ${shortDate}<br>${shortTime}
            </div>
            <div class="schedule-header previous" style="display: none;">
                <div>
                    <h3 class="schedule-title">${schedule.title}</h3>
                    <div class="schedule-date">${schedule.date} at ${schedule.time}</div>
                </div>
                <span class="status-badge status-previous">Previous</span>
            </div>
            <div class="schedule-content collapsed" id="schedule-content-${index}" style="display: none;">
                <div id="calendar-${index}"></div>
            </div>
        `;
    }
    
    // Create mini calendar for this schedule version
    setTimeout(() => {
        createMiniCalendar(`calendar-${index}`, schedule.data);
    }, 100);
    
    return paper;
}

function createMiniCalendar(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const events = createEventsFromData(data || []);
    
    const calendar = new FullCalendar.Calendar(container, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'today'
        },
        height: 'auto',
        events: events,
        eventContent: function(arg) {
            return { html: arg.event.title };
        }
    });
    
    calendar.render();
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
