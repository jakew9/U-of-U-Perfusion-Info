// Parse the Google Sheets data into calendar events
function parseScheduleData(rows) {
    const events = [];
    
    rows.forEach((row, index) => {
        const dateValue = row[0];
        if (!dateValue) return; // Skip rows without dates

        // Parse date
        let date;
        if (dateValue instanceof Date) {
            date = dateValue;
        } else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
            if (isNaN(date.getTime())) {
                const parts = dateValue.split('/');
                if (parts.length === 3) {
                    date = new Date(parts[2], parts[0] - 1, parts[1]);
                }
            }
        } else {
            return;
        }

        if (isNaN(date.getTime())) return;

        const dayShift = row[16] || '';
        const nightShift = row[17] || '';
        const school = row[18] || '';
        const displayDayShift = dayShift.replace(/blank/gi, '_');
        const displayNightShift = nightShift.replace(/blank/gi, '_');
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        // Clean shifts for calculations
        const cleanNightShift = nightShift
            .replace(/blank/gi, '')
            .replace(/[\s\u00A0]/g, '')
            .replace(/\/+/g, '/')
            .replace(/^\/|\/$/g, '');
        
        const cleanDayShift = dayShift
            .replace(/blank/gi, '')
            .replace(/[\s\u00A0]/g, '')
            .replace(/\/+/g, '/')
            .replace(/^\/|\/$/g, '');

        // Format date for FullCalendar
        const formattedDate = date.toISOString().split('T')[0];

        // Create event title
        let title = '';
        if (isWeekend) {
            if (displayDayShift.trim()) {
                title = displayDayShift.trim();
            }
        } else {
            if (displayDayShift.trim()) {
                title += `Day: ${displayDayShift.trim()}`;
            }
            if (displayNightShift.trim()) {
                if (title) title += '\nNight: ';
                else title += 'Night: ';
                title += displayNightShift.trim();
            }
            if (school.trim()) {
                if (title) title += '\n';
                title += `School: ${school.trim()}`;
            }
        }

        // Only add event if there's actual schedule data
        if (title.trim()) {
            const dayStaffCount = cleanDayShift ? cleanDayShift.split('/').filter(s => s.trim()).length : 0;
            const nightStaffCount = cleanNightShift ? cleanNightShift.split('/').filter(s => s.trim()).length : 0;
            const totalStaff = dayStaffCount + nightStaffCount;
            
            let backgroundColor;
            
            if (isWeekend) {
                if (totalStaff === 2) {
                    backgroundColor = '#f8f9fa';
                } else if (totalStaff === 1) {
                    backgroundColor = '#26de81';
                } else if (totalStaff === 0) {
                    backgroundColor = '#ff6b6b';
                } else {
                    backgroundColor = '#f8f9fa';
                }
            } else {
                const nightShiftBlankCount = (nightShift.match(/blank/gi) || []).length;
                
                if ((nightShiftBlankCount === 2 || cleanNightShift === '') && cleanDayShift !== '') {
                    backgroundColor = '#ff6b6b';
                } else if (nightShiftBlankCount === 1 && cleanDayShift !== '') {
                    backgroundColor = '#26de81';
                } else if (totalStaff === 6) {
                    backgroundColor = '#f8f9fa';
                } else if (totalStaff === 5) {
                    backgroundColor = '#26de81';
                } else if (totalStaff <= 4 && totalStaff > 0) {
                    backgroundColor = '#ff6b6b';
                } else {
                    backgroundColor = '#6c757d';
                }
            }

            events.push({
                title: title,
                start: formattedDate,
                backgroundColor: backgroundColor,
                borderColor: backgroundColor,
                textColor: getTextColor(backgroundColor),
                allDay: true,
                extendedProps: {
                    dayShift: displayDayShift.trim(),
                    nightShift: displayNightShift.trim(),
                    cleanDayShift: cleanDayShift,
                    cleanNightShift: cleanNightShift,
                    source: 'googleSheets'
                }
            });
        }
    }); // <-- Line 214: Closes forEach with });
    
    return events;
} // <-- Line 217: Closes function with } NOT })
