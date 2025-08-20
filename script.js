// Global variables
let currentScheduleData = [];
let previousScheduleData = [];
let scheduleVersions = [];
let currentVersion = 1;
let editingEvent = null;
let calendars = {};

// Password for supervisor access
const SUPERVISOR_PASSWORD = "perfusion2024";

// Sample schedule data
const sampleScheduleData = [
    {
        id: 'day-1', title: 'Day: GB/HB/JR/JR\nNight: CB/JW', 
        start: '2025-09-02', color: '#B22222', 
        dayShift: 'GB/HB/JR/JR', nightShift: 'CB/JW'
    },
    {
        id: 'school-1', title: 'School: JH', 
        start: '2025-09-02', color: '#4169E1',
        dayShift: '', nightShift: '', isSchool: true, schoolPerson: 'JH'
    },
    {
        id: 'day-2', title: 'Day: HB/JR/JR/TR/JW\nNight: JCB', 
        start: '2025-09-03', color: '#32CD32',
        dayShift: 'HB/JR/JR/TR/JW', nightShift: 'JCB'
    },
    {
        id: 'school-2', title: 'School: GB', 
        start: '2025-09-03', color: '#4169E1',
        dayShift: '', nightShift: '', isSchool: true, schoolPerson: 'GB'
    },
    {
        id: 'off-1', title: 'Off: JH/CB', 
        start: '2025-09-03', color: '#DC143C',
        dayShift: '', nightShift: '', isOff: true, offPeople: 'JH/CB'
    },
    {
        id: 'day-3', title: 'Day: KB/JR/TR/JCB\nNight: HB/GB', 
        start: '2025-09-04', color: '#20B2AA',
        dayShift: 'KB/JR/TR/JCB', nightShift: 'HB/GB'
    },
    {
        id: 'school-3', title: 'School: JW', 
        start: '2025-09-04', color: '#4169E1',
        dayShift: '', nightShift: '', isSchool: true, schoolPerson: 'JW'
    },
    {
        id: 'off-2', title: 'Off: MI', 
        start: '2025-09-05', color: '#DC143C',
        dayShift: '', nightShift: '', isOff: true, offPeople: 'MI'
    },
    {
        id: 'school-4', title: 'School: JR', 
        start: '2025-09-05', color: '#4169E1',
        dayShift: '', nightShift: '', isSchool: true, schoolPerson: 'JR'
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize with sample data
    currentScheduleData = [...sampleScheduleData];
    
    // Create initial version
    scheduleVersions.push({
        version: 1,
        data: [...currentScheduleData],
        publishedDate: new Date(),
        title: "September 2025 - Version 1"
    });
    
    updateVersionInfo();
    updateLastUpdated();
});

// Page navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Initialize calendar for the page
    setTimeout(() => {
        initializeCalendarForPage(pageId);
    }, 100);
}

// Initialize calendar based on page
function initializeCalendarForPage(pageId) {
    switch(pageId) {
        case 'publishedSchedulePage':
            initializePublishedCalendar();
            break;
        case 'supervisorViewPage':
            initializeSupervisorViewCalendar();
            break;
        case 'supervisorEditPage':
            initializeSupervisorEditCalendar();
            break;
        case 'previousSchedulePage':
            initializePreviousCalendar();
            break;
    }
}

// Initialize published calendar (read-only)
function initializePublishedCalendar() {
    const calendarEl = document.getElementById('publishedCalendar');
    
    if (calendars.published) {
        calendars.published.destroy();
    }
    
    calendars.published = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        initialDate: '2025-09-01',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        events: currentScheduleData,
        eventDidMount: function(info) {
            // Make weekend events transparent
            const date = new Date(info.event.start);
            if (date.getDay() === 0 || date.getDay() === 6) {
                info.el.classList.add('weekend-event');
            }
        },
        height: 'auto'
    });
    
    calendars.published.render();
}

// Initialize supervisor view calendar (read-only)
function initializeSupervisorViewCalendar() {
    const calendarEl = document.getElementById('supervisorViewCalendar');
    
    if (calendars.supervisorView) {
        calendars.supervisorView.destroy();
    }
    
    calendars.supervisorView = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        initialDate: '2025-09-01',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        events: currentScheduleData,
        eventDidMount: function(info) {
            const date = new Date(info.event.start);
            if (date.getDay() === 0 || date.getDay() === 6) {
                info.el.classList.add('weekend-event');
            }
        },
        height: 'auto'
    });
    
    calendars.supervisorView.render();
}

// Initialize supervisor edit calendar (editable)
function initializeSupervisorEditCalendar() {
    const calendarEl = document.getElementById('supervisorEditCalendar');
    
    if (calendars.supervisorEdit) {
        calendars.supervisorEdit.destroy();
    }
    
    calendars.supervisorEdit = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        initialDate: '2025-09-01',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        events: currentScheduleData,
        eventDidMount: function(info) {
            const date = new Date(info.event.start);
            if (date.getDay() === 0 || date.getDay() === 6) {
                info.el.classList.add('weekend-event');
            } else {
                info.el.classList.add('editable');
            }
        },
        eventClick: function(info) {
            // Only allow editing non-weekend events
            const date = new Date(info.event.start);
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                openEditModal(info.event);
            }
        },
        dateClick: function(info) {
            // Allow creating new events on empty dates
            const date = new Date(info.date);
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                openEditModal(null, info.date);
            }
        },
        height: 'auto'
    });
    
    calendars.supervisorEdit.render();
}

// Initialize previous calendar
function initializePreviousCalendar() {
    const calendarEl = document.getElementById('previousCalendar');
    
    if (calendars.previous) {
        calendars.previous.destroy();
    }
    
    calendars.previous = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        initialDate: '2025-09-01',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth'
        },
        events: previousScheduleData,
        eventDidMount: function(info) {
            const date = new Date(info.event.start);
            if (date.getDay() === 0 || date.getDay() === 6) {
                info.el.classList.add('weekend-event');
            }
        },
        height: 'auto'
    });
    
    calendars.previous.render();
}

// Password modal functions
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
    if (password === SUPERVISOR_PASSWORD) {
        closePasswordModal();
        showPage('supervisorEditPage');
    } else {
        document.getElementById('passwordError').textContent = 'Incorrect password';
        document.getElementById('passwordError').style.display = 'block';
    }
}

// Edit modal functions
function openEditModal(event, date) {
    editingEvent = event;
    const modal = document.getElementById('editModal');
    const title = document.getElementById('editModalTitle');
    const dayShiftInput = document.getElementById('dayShiftInput');
    const nightShiftInput = document.getElementById('nightShiftInput');
    
    if (event) {
        title.textContent = `Edit Schedule for ${event.startStr}`;
        dayShiftInput.value = event.extendedProps.dayShift || '';
        nightShiftInput.value = event.extendedProps.nightShift || '';
        
        // Set color selection
        const colorRadios = document.querySelectorAll('input[name="backgroundColor"]');
        colorRadios.forEach(radio => {
            radio.checked = radio.value === event.backgroundColor;
        });
    } else {
        title.textContent = `Add Schedule for ${date}`;
        dayShiftInput.value = '';
        nightShiftInput.value = '';
        document.querySelector('input[name="backgroundColor"][value="auto"]').checked = true;
    }
    
    modal.style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    editingEvent = null;
}

function saveEdit() {
    const dayShift = document.getElementById('dayShiftInput').value;
    const nightShift = document.getElementById('nightShiftInput').value;
    const selectedColor = document.querySelector('input[name="backgroundColor"]:checked').value;
    
    let backgroundColor = selectedColor;
    if (selectedColor === 'auto') {
        backgroundColor = determineAutoColor(dayShift, nightShift);
    }
    
    const title = buildEventTitle(dayShift, nightShift);
    
    if (editingEvent) {
        // Update existing event
        editingEvent.setProp('title', title);
        editingEvent.setProp('backgroundColor', backgroundColor);
        editingEvent.setExtendedProp('dayShift', dayShift);
        editingEvent.setExtendedProp('nightShift', nightShift);
        
        // Update in data array
        const dataEvent = currentScheduleData.find(e => e.id === editingEvent.id);
        if (dataEvent) {
            dataEvent.title = title;
            dataEvent.color = backgroundColor;
            dataEvent.dayShift = dayShift;
            dataEvent.nightShift = nightShift;
        }
    } else {
        // Create new event
        const newEvent = {
            id: 'new-' + Date.now(),
            title: title,
            start: editingEvent ? editingEvent.startStr : document.getElementById('editModalTitle').textContent.split(' ').pop(),
            color: backgroundColor,
            dayShift: dayShift,
            nightShift: nightShift
        };
        
        currentScheduleData.push(newEvent);
        calendars.supervisorEdit.addEvent(newEvent);
    }
    
    closeEditModal();
}

// Helper functions
function buildEventTitle(dayShift, nightShift) {
    let title = '';
    if (dayShift) title += `Day: ${dayShift}`;
    if (nightShift) {
        if (title) title += '\n';
        title += `Night: ${nightShift}`;
    }
    return title;
}

function determineAutoColor(dayShift, nightShift) {
    const dayCount = dayShift ? dayShift.split('/').length : 0;
    const nightCount = nightShift ? nightShift.split('/').length : 0;
    const totalStaff = dayCount + nightCount;
    
    if (totalStaff >= 6) return '#228B22'; // Green - well staffed
    if (totalStaff >= 4) return '#DAA520'; // Gold - adequately staffed
    return '#B22222'; // Red - understaffed
}

function publishSchedule() {
    // Save current schedule as previous version
    if (scheduleVersions.length > 0) {
        previousScheduleData = [...scheduleVersions[scheduleVersions.length - 1].data];
    }
    
    // Create new version
    currentVersion++;
    scheduleVersions.push({
        version: currentVersion,
        data: [...currentScheduleData],
        publishedDate: new Date(),
        title: `September 2025 - Version ${currentVersion}`
    });
    
    updateVersionInfo();
    updateLastUpdated();
    
    alert('Schedule published successfully!');
    showPage('publishedSchedulePage');
}

function showPreviousVersion() {
    if (scheduleVersions.length > 1) {
        const previousVersion = scheduleVersions[scheduleVersions.length - 2];
        previousScheduleData = [...previousVersion.data];
        
        // Update previous schedule page info
        document.getElementById('previousSchedulePageTitle').textContent = `Previous Schedule - Version ${previousVersion.version}`;
        document.getElementById('previousScheduleTitle').textContent = previousVersion.title;
        document.getElementById('previousScheduleDate').textContent = previousVersion.publishedDate.toLocaleDateString();
        document.getElementById('previousLastUpdated').textContent = `Published: ${previousVersion.publishedDate.toLocaleString()}`;
        
        showPage('previousSchedulePage');
    }
}

function updateVersionInfo() {
    const previousBtn = document.getElementById('previousVersionBtn');
    const versionNumber = document.getElementById('previousVersionNumber');
    
    if (scheduleVersions.length > 1) {
        const previousVersion = scheduleVersions[scheduleVersions.length - 2];
        previousBtn.disabled = false;
        versionNumber.textContent = `V${previousVersion.version}`;
    } else {
        previousBtn.disabled = true;
        versionNumber.textContent = `V1`;
    }
    
    // Update current schedule info
    const currentVersionInfo = scheduleVersions[scheduleVersions.length - 1];
    document.getElementById('currentScheduleTitle').textContent = currentVersionInfo.title;
    document.getElementById('currentScheduleDate').textContent = currentVersionInfo.publishedDate.toLocaleDateString();
}

function updateLastUpdated() {
    const lastUpdated = scheduleVersions[scheduleVersions.length - 1].publishedDate;
    document.getElementById('lastUpdated').textContent = `Last updated: ${lastUpdated.toLocaleString()}`;
}

// Handle enter key in password field
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const passwordModal = document.getElementById('passwordModal');
        if (passwordModal.style.display === 'block') {
            checkPassword();
        }
    }
});

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    const passwordModal = document.getElementById('passwordModal');
    const editModal = document.getElementById('editModal');
    
    if (e.target === passwordModal) {
        closePasswordModal();
    }
    if (e.target === editModal) {
        closeEditModal();
    }
});
