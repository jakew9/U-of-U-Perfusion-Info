// Google Sheets API Configuration
const API_KEY = 'AIzaSyB5KKSmVFrKNfEs0B7VJYdnMhyY7JB12bE';
const SHEET_ID = '1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E';
const RANGE = 'Sheet1!A13:R100'; // Adjust range as needed

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
            date = new Date(dateValue);
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
            // Determine color based on staffing level
            const dayStaffCount = dayShift ? dayShift.split('/').filter(s => s.trim()).length : 0;
            const nightStaffCount = nightShift ? nightShift.split('/').filter(s => s.trim()).length : 0;
            const totalStaff = dayStaffCount + nightStaffCount;
            
            let backgroundColor;
            if (totalStaff >= 6) {
                backgroundColor = '#26de81'; // Green - well staffed
            } else if (totalStaff >= 4) {
                backgroundColor = '#f9ca24'; // Yellow - adequately staffed
            } else if (totalStaff >= 2) {
                backgroundColor = '#ff6b6b'; // Red - understaffed
            } else {
                backgroundColor = '#6c757d'; // Gray - minimal staff
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

// Modified function to load events from Google Sheets instead of localStorage
async function loadPublishedEvents() {
    // Try to load from Google Sheets first
    const googleSheetsEvents = await fetchScheduleFromGoogleSheets();
    
    if (googleSheetsEvents.length > 0) {
        return googleSheetsEvents;
    }
    
    // Fallback to localStorage if Google Sheets fails
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    if (publishedData) {
        const data = JSON.parse(publishedData);
        return data.events || [];
    }
    
    return [];
}

// Modified calendar initialization to use Google Sheets data
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
    
    // Update the version tabs and last updated info
    updateScheduleInfo(events);
}

// Modified supervisor view calendar
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

// Modified supervisor edit calendar to start with Google Sheets data
async function initializeSupervisorEditCalendar() {
    const events = await loadPublishedEvents();
    
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

// Update schedule information display
function updateScheduleInfo(events) {
    const lastUpdatedDiv = document.getElementById('lastUpdated');
    
    if (events.length > 0) {
        const now = new Date();
        lastUpdatedDiv.textContent = `Schedule loaded from Google Sheets at ${now.toLocaleTimeString()}`;
    } else {
        lastUpdatedDiv.textContent = 'No schedule data available';
    }
    
    // Hide version tabs since we're using live Google Sheets data
    const versionTabsContainer = document.getElementById('versionTabsContainer');
    if (versionTabsContainer) {
        versionTabsContainer.style.display = 'none';
    }
}

// Add refresh button functionality
function refreshScheduleFromSheets() {
    if (calendar) {
        initializePublishedCalendar();
    }
    if (supervisorViewCalendar) {
        initializeSupervisorViewCalendar();
    }
    alert('Schedule refreshed from Google Sheets!');
}
