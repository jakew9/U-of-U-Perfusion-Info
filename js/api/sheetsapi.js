import { API_KEY, SHEET_ID, RANGE } from '../config.js';

// Internal function declarations using const to prevent redeclaration
const parseDateValue = (dateValue) => {
    try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        
        if (typeof dateValue === 'string') {
            const parts = dateValue.split('/');
            if (parts.length === 3) {
                const mmddyyyy = new Date(parts[2], parts[0] - 1, parts[1]);
                if (!isNaN(mmddyyyy.getTime())) {
                    return mmddyyyy.toISOString().split('T')[0];
                }
            }
        }
    } catch (error) {
        console.error('Error parsing date:', dateValue, error);
    }
    return null;
};

const createEventFromData = (date, dayShift, nightShift, school, off, extraShift) => {
    // Helper function to replace "Blank" with "_"
    const cleanNames = (nameString) => {
        if (!nameString) return '';
        return nameString.replace(/Blank/g, '_');
    };
    
    // Check if this is a weekend (no night shift data typically means weekend)
    const isWeekend = !nightShift || nightShift.trim() === '';
    
    const parts = [];
    
    // Add extra shift first (priority) - only if someone is assigned
    if (extraShift && extraShift.trim() && extraShift.trim().toLowerCase() !== 'blank') {
        parts.push(`+1: ${cleanNames(extraShift)}`);
    }
    
    // Add "Day:" prefix only for weekdays
    if (dayShift) {
        if (isWeekend) {
            parts.push(cleanNames(dayShift));
        } else {
            parts.push(`Day: ${cleanNames(dayShift)}`);
        }
    }
    
    if (nightShift) parts.push(`Night Shift: ${cleanNames(nightShift)}`);
    if (school) parts.push(`School: ${cleanNames(school)}`);
    parts.push(`Off: ${off ? cleanNames(off) : 'None'}`); // Always show Off line with "None" if empty
    
    console.log('Creating event with parts:', parts); // Debug logging
    
    if (parts.length === 0) return null;
    
    // Count staff in each shift (still filter out "Blank" for counting)
    const countStaff = (shiftString) => {
        if (!shiftString) return 0;
        return shiftString.split('/').filter(name => name.trim() && name.trim().toLowerCase() !== 'blank').length;
    };
    
    const nightCount = countStaff(nightShift);
    const dayCount = countStaff(dayShift);
    const totalCount = nightCount + dayCount;
    
    let backgroundColor = null;
    let borderColor = null;
    
    if (isWeekend) {
        if (dayCount === 1) {
            backgroundColor = '#22c55e';
            borderColor = '#16a34a';
        } else if (dayCount === 0) {
            backgroundColor = '#ef4444';
            borderColor = '#dc2626';
        }
    } else {
        if (nightCount === 0) {
            backgroundColor = '#ef4444';
            borderColor = '#dc2626';
        } else if (nightCount === 1) {
            backgroundColor = '#22c55e';
            borderColor = '#16a34a';
        } else if (nightCount === 2) {
            if (totalCount === 5) {
                backgroundColor = '#22c55e';
                borderColor = '#16a34a';
            } else if (totalCount <= 4) {
                backgroundColor = '#ef4444';
                borderColor = '#dc2626';
            }
        }
    }
    
const event = {
    title: parts.join('\n\u200B\n'),  // \u200B is a zero-width space that forces line break
    start: date,
    allDay: true,
    textColor: backgroundColor ? '#ffffff' : undefined,
    extendedProps: { 
        extraShift,
        dayShift, 
        nightShift, 
        school, 
        off,
        nightCount,
        dayCount,
        totalCount,
        isWeekend
    }
};
    
    if (backgroundColor) {
        event.backgroundColor = backgroundColor;
        event.borderColor = borderColor;
    }
    
    return event;
};

const parseScheduleData = (rows) => {
    if (!Array.isArray(rows)) {
        console.error('Invalid data format received from Google Sheets');
        return [];
    }
    
    console.log('Parsing rows, total count:', rows.length);
    console.log('First row sample:', rows[0]);
    
    return rows.reduce((events, row, index) => {
        console.log(`Row ${index}:`, {
            length: row.length,
            date: row[0],
            extraShift: row[15], // Column P
            dayShift: row[16],
            nightShift: row[17],
            school: row[18],
            off: row[19]  // Added this
        });
        
        if (!row || row.length < 17) {
            console.log(`Skipping row ${index}: insufficient columns (${row?.length})`);
            return events;
        }
        
        const date = parseDateValue(row[0]);
        if (!date) {
            console.log(`Skipping row ${index}: invalid date (${row[0]})`);
            return events;
        }
        
        const event = createEventFromData(
            date,
            row[16] || '', // dayShift
            row[17] || '', // nightShift
            row[18] || '', // school
            row[19] || '', // off
            row[15] || ''  // extraShift - Column P
        );
        
        if (event) {
            console.log(`Created event for row ${index}:`, event);
            events.push(event);
        } else {
            console.log(`No event created for row ${index}: all fields empty`);
        }
        return events;
    }, []);
};

// Only export what's needed externally
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