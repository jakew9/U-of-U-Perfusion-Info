import { API_KEY, SHEET_ID, RANGE } from '../config.js';

// Fetch schedule data from Google Sheets
export async function fetchScheduleFromGoogleSheets() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
        console.log('Fetching from Google Sheets...', url);
        
        const response = await fetch(url);
        
        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Successfully fetched data, rows:', data.values ? data.values.length : 0);
        return parseScheduleData(data.values || []);
    } catch (error) {
        console.error('Detailed error fetching schedule data:', error);
        console.error('Error type:', error.name);
        console.error('Error message:', error.message);
        alert('Error loading schedule from Google Sheets: ' + error.message + '\n\nUsing local data instead. Check console for details.');
        return [];
    }
}

// Parse the Google Sheets data into calendar events
export function parseScheduleData(rows) {
    const events = [];
    
    rows.forEach((row, index) => {
        const dateValue = row[0];
        if (!dateValue) return;

        // Parse date
        let date = parseDateValue(dateValue);
        if (!date) return;

        const dayShift = row[16] || '';
        const nightShift = row[17] || '';
        const school = row[18] || '';
        const off = row[19] || '';
        
        const event = createEventFromData(date, dayShift, nightShift, school, off);
        if (event) {
            events.push(event);
        }
    });
    
    return events;
}

function parseDateValue(dateValue) {
    if (dateValue instanceof Date) {
        return dateValue;
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