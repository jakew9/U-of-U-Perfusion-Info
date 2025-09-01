// Configuration
const apiKey = 'AIzaSyCyCEmSvunsn8C82AwhSyX5joXy2hstPls';
const spreadsheetId = '1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E';
const range = 'Sheet2!A13:V54';

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

function loadSavedData() {
    try {
        const savedPublished = localStorage.getItem('perfusionPublishedSchedule');
        const savedEdits = localStorage.getItem('perfusionScheduleEdits');
        
        if (savedPublished) {
            const publishedData = JSON.parse(savedPublished);
            console.log('Found published schedule data with', publishedData.schedule?.length || 0, 'rows');
            if (publishedData.schedule) {
                editedScheduleData = JSON.parse(JSON.stringify(publishedData.schedule));
            }
            return publishedData;
        }
        
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

function saveEditsToStorage() {
    try {
        localStorage.setItem('perfusionScheduleEdits', JSON.stringify(editedScheduleData));
        console.log('Saved edits to localStorage');
    } catch (error) {
        console.error('Error saving edits:', error);
    }
}

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
        initializePublishedCalendar();
    } else if (pageId === 'previousSchedulePage' && !previousCalendar) {
        initializePreviousCalendar();
    } else if (pageId === 'managePublishedPage') {
        initializeManagePublished();
    }
}

function showManagePublished() {
    showPage('managePublishedPage');
}

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

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('passwordInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });
});

function openEditModal(dateStr, dayShift, nightShift) {
    currentEditDate = dateStr;
    document.getElementById('editModalTitle').textContent = `Edit Schedule for ${dateStr}`;
    document.getElementById('dayShiftInput').value = dayShift || '';
    document.getElementById('nightShiftInput').value = nightShift || '';
    
    document.querySelector('input[name="backgroundColor"][value="auto"]').checked = true;
    
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
    
    const [year, month, day] = currentEditDate.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    let rowFound = false;
    
    editedScheduleData.forEach(row => {
        if (row[0]) {
            const rowDate = parseDate(row[0]);
            if (rowDate === currentEditDate) {
                row[16] = dayShift;
                row[17] = nightShift;
                while (row.length <= 20) {
                    row.push('');
                }
                row[20] = selectedColor === 'auto' ? '' : selectedColor;
                rowFound = true;
            }
        }
    });
    
    if (!rowFound) {
        const newRow = new Array(21).fill('');
        newRow[0] = currentEditDate;
        newRow[16] = dayShift;
        newRow[17] = nightShift;
        newRow[20] = selectedColor === 'auto' ? '' : selectedColor;
        editedScheduleData.push(newRow);
    }
    
    supervisorEditCalendar.destroy();
    initializeSupervisorEditCalendarFromData();
    
    saveEditsToStorage();
    closeEditModal();
}

function publishSchedule() {
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    if (currentPublished) {
        saveToHistory(JSON.parse(currentPublished));
    }
    
    const publishedData = {
        schedule: editedScheduleData,
        timestamp: new Date().toISOString(),
        version: getVersionNumber()
    };
    
    localStorage.setItem('perfusionPublishedSchedule', JSON.stringify(publishedData));
    
    alert(`Schedule published successfully as Version ${publishedData.version}!`);
    
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
        
        history.unshift(publishedData);
        
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

function createEventsFromData(data) {
    const events = [];
    
    data.forEach(row => {
        const date = row[0];        
        const dayShiftData = row[16];   
        const nightShiftData = row[17];
        const schoolData = row[18];
        const offData = row[19];
        const customColor = row.length > 20 ? row[20] : '';
        
        const formattedDate = parseDate(date);
        
        if (formattedDate) {
            const dayOfWeek = getCorrectDayOfWeek(formattedDate);
            let titleHTML = '';

            if (dayShiftData && dayShiftData.trim()) {
                titleHTML += `<div>Day: ${dayShiftData.trim()}</div>`;
            }
            
            if (nightShiftData && nightShiftData.trim()) {
                titleHTML += `<div>Night: ${nightShiftData.trim()}</div>`;
            }
            
            if ((offData && offData.trim()) || (schoolData && schoolData.trim())) {
                titleHTML += `<div><br></div>`;
            }
            
            if (offData && offData.trim()) {
                titleHTML += `<div style="color:#FFFFFF; background-color:#FF0000; padding:1px 2px; border-radius:2px; font-weight:bold;">Off: ${offData.trim()}</div>`;
            }
            
            if (schoolData && schoolData.trim()) {
                titleHTML += `<div style="color:#FFFFFF; background-color:#0066CC; padding:1px 2px; border-radius:2px; font-weight:bold;">School: ${schoolData.trim()}</div>`;
            }

            if (titleHTML) {
                const eventData = {
                    title: titleHTML,
                    start: formattedDate,
                    allDay: true
                };
                
                if (customColor && customColor.startsWith('#')) {
                    eventData.backgroundColor = customColor;
                    eventData.borderColor = customColor;
                    eventData.textColor = '#ffffff';
                } else if (dayOfWeek === 0 || dayOfWeek === 6) {
                    eventData.backgroundColor = 'transparent';
                    eventData.borderColor = 'transparent';
                    eventData.textColor = '#000000';
                    eventData.classNames = ['weekend-event'];
                } else {
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
    
    events.forEach(event => {
        const dateRow = data.find(row => parseDate(row[0]) === event.start);
        if (dateRow) {
            event.extendedProps = {
                dayShift: dateRow[16] || '',
                nightShift: dateRow[17] || '',
                school: dateRow[18] || '',
                off: dateRow[19] || '',
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
        .then(response => response.json())
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
            calendarEl.innerHTML = '<p style="text-align: center;">Error fetching data.</p>';
        });
}

function initializeSupervisorViewCalendar() {
    const calendarEl = document.getElementById('supervisorViewCalendar');

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`)
        .then(response => response.json())
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
            calendarEl.innerHTML = '<p style="text-align: center;">Error fetching data.</p>';
        });
}

function initializeSupervisorEditCalendar() {
    const calendarEl = document.getElementById('supervisorEditCalendar');

    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`)
        .then(response => response.json())
        .then(data => {
            const values = data.values;
            originalScheduleData = values || [];
            
            const savedPublishedData = loadSavedData();
            
            if (savedPublishedData && savedPublishedData.schedule) {
                editedScheduleData = JSON.parse(JSON.stringify(savedPublishedData.schedule));
            } else {
                editedScheduleData = JSON.parse(JSON.stringify(originalScheduleData));
            }
            
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
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
            calendarEl.innerHTML = '<p style="text-align: center;">Error fetching data.</p>';
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
    createVersionTabs();
    
    const savedData = loadSavedData();
    if (savedData && savedData.schedule) {
        displayVersion('current', savedData);
    } else {
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

function initializePreviousCalendar() {
    const calendarEl = document.getElementById('previousCalendar');
    
    try {
        const history = localStorage.getItem('perfusionScheduleHistory');
        if (history) {
            const versions = JSON.parse(history);
            if (versions.length > 0) {
                const previousVersion = versions[0];
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
        
        calendarEl.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No previous version available</p>';
        
    } catch (error) {
        console.error('Error initializing previous calendar:', error);
        calendarEl.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">Error loading previous version</p>';
    }
}

// --- Version Tab Functions ---

function createVersionTabs() {
    const tabsContainer = document.getElementById('versionTabs');
    if (!tabsContainer) return;
    
    tabsContainer.innerHTML = '';
    
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    
    const reversedHistory = [...history].reverse();
    reversedHistory.forEach((version, index) => {
        const versionNum = index + 1;
        const tab = createVersionTab(versionNum, version, false);
        tabsContainer.appendChild(tab);
    });
    
    if (currentPublished) {
        const currentData = JSON.parse(currentPublished);
        const currentVersionNum = history.length + 1;
        const tab = createVersionTab(currentVersionNum, currentData, true);
        tabsContainer.appendChild(tab);
        
        tab.classList.add('active');
        currentDisplayedVersion = 'current';
    }
    
    const tabsContainerDiv = document.getElementById('versionTabsContainer');
    if (tabsContainerDiv) {
        if (history.length === 0 && !currentPublished) {
            tabsContainerDiv.style.display = 'none';
        } else {
            tabsContainerDiv.style.display = 'block';
        }
    }
}

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
    
    tab.addEventListener('click', () => {
        selectVersionTab(isCurrent ? 'current' : versionNum, versionData);
    });
    
    return tab;
}

function selectVersionTab(version, versionData) {
    document.querySelectorAll('.version-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const selectedTab = document.querySelector(`[data-version="${version}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    displayVersion(version, versionData);
    currentDisplayedVersion = version;
}

function displayVersion(version, versionData) {
    const calendarEl = document.getElementById('publishedCalendar');
    
    if (publishedCalendar) {
        publishedCalendar.destroy();
    }
    
    const events = createEventsFromData(versionData.schedule || []);
    
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
    updateLastUpdatedForVersion(versionData, version);
}

function updateLastUpdatedForVersion(versionData, version) {
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
        const timestamp = new Date(versionData.timestamp);
        const versionText = version === 'current' ? 'Current Version' : `Version ${version}`;
        lastUpdatedEl.textContent = `${versionText} - Published: ${timestamp.toLocaleString()}`;
    }
}

// --- Manage Published Functions ---

function initializeManagePublished() {
    displayPublishedVersions();
}

function displayPublishedVersions() {
    const versionsList = document.getElementById('publishedVersionsList');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    
    versionsList.innerHTML = '';
    
    if (currentPublished) {
        const currentData = JSON.parse(currentPublished);
        const currentVersionNum = history.length + 1;
        const versionItem = createVersionItem(currentVersionNum, currentData, true);
        versionsList.appendChild(versionItem);
    }
    
    history.forEach((version, index) => {
        const versionNum = history.length - index;
        const versionItem = createVersionItem(versionNum, version, false);
        versionsList.appendChild(versionItem);
    });
    
    if (history.length === 0 && !currentPublished) {
        versionsList.innerHTML = '<div class="no-versions-message">No published versions found.</div>';
        clearAllBtn.style.display = 'none';
    } else if (history.length > 0) {
        clearAllBtn.style.display = 'block';
    } else {
        clearAllBtn.style.display = 'none';
    }
}

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

function confirmDeleteVersion(versionNum) {
    if (confirm(`Are you sure you want to delete Version ${versionNum}? This action cannot be undone.`)) {
        deleteVersion(versionNum);
    }
}

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
