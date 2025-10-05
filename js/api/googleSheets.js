import { API_KEY, SHEET_ID, RANGE } from '../config.js';

// Fetch schedule data from Google Sheets
export async function fetchScheduleFromGoogleSheets() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        console.log('Fetching from Google Sheets...', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Successfully fetched data, rows:', data.values ? data.values.length : 0);
        return parseScheduleData(data.values || []);
    } catch (error) {
        console.error('Error fetching schedule data:', error);
        throw error;
    }
}

function parseDateValue(dateValue) {
    try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch (error) {
        console.error('Error parsing date:', dateValue, error);
    }
    return null;
}

function createEventFromData(date, dayShift, nightShift, school, off) {
    let title = '';
    if (dayShift) title += `Day Shift:\n${dayShift}\n`;
    if (nightShift) title += `Night Shift:\n${nightShift}\n`;
    if (school) title += `School:\n${school}\n`;
    if (off) title += `Off:\n${off}`;
    
    if (!title) return null;
    
    return {
        title: title.trim(),
        start: date,
        allDay: true,
        extendedProps: {
            dayShift,
            nightShift,
            school,
            off
        }
    };
}

// Parse the Google Sheets data into calendar events
function parseScheduleData(rows) {
    const events = [];
    
    if (!Array.isArray(rows)) {
        console.error('Invalid data format received from Google Sheets');
        return events;
    }
    
    for (const row of rows) {
        if (!row || row.length < 20) continue;
        
        const dateValue = row[0];
        if (!dateValue) continue;

        const date = parseDateValue(dateValue);
        if (!date) continue;

        const dayShift = row[16] || '';
        const nightShift = row[17] || '';
        const school = row[18] || '';
        const off = row[19] || '';
        
        const event = createEventFromData(date, dayShift, nightShift, school, off);
        if (event) {
            events.push(event);
        }
    }
    
    return events;
}

function createEventFromData(date, dayShift, nightShift, school, off) {
    let title = '';
    if (dayShift) title += `Day Shift:\n${dayShift}\n`;
    if (nightShift) title += `Night Shift:\n${nightShift}\n`;
    if (school) title += `School:\n${school}\n`;
    if (off) title += `Off:\n${off}`;
    
    if (!title) return null;
    
    return {
        title: title.trim(),
        start: date,
        allDay: true,
        extendedProps: {
            dayShift,
            nightShift,
            school,
            off
        }
    };
}

function parseDateValue(dateValue) {
    // Try parsing various date formats
    const formats = [
        new Date(dateValue), // Try native parsing
        new Date(dateValue.replace(/-/g, '/')), // Replace hyphens with slashes
        new Date(dateValue.split('T')[0]) // Try removing time component
    ];
    
    for (let date of formats) {
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    
    console.error('Could not parse date:', dateValue);
    return null;
}
    
    if (typeof dateValue === 'string') {
        let date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            const parts = dateValue.split('/');
            if (parts.length === 3) {
                date = new Date(parts[2], parts[0] - 1, parts[1]);
            }
        }
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    return null;
}