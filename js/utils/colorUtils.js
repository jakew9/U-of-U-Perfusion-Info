// Color utility functions
export function getTextColor(backgroundColor) {
    const darkColors = ['#6c757d', '#dc3545', '#6c5ce7', '#a55eea'];
    return darkColors.includes(backgroundColor) ? 'white' : 'black';
}

// Clean and format shift data
export function cleanShiftData(shift) {
    return shift
        .replace(/blank/gi, '')
        .replace(/[\s\u00A0]/g, '')
        .replace(/\/+/g, '/')
        .replace(/^\/|\/$/g, '');
}

// Calculate event background color based on staffing
export function calculateEventColor(dayShift, nightShift, isWeekend) {
    const cleanDayShift = cleanShiftData(dayShift);
    const cleanNightShift = cleanShiftData(nightShift);
    
    const dayCount = cleanDayShift ? cleanDayShift.split('/').filter(s => s.trim()).length : 0;
    const nightCount = cleanNightShift ? cleanNightShift.split('/').filter(s => s.trim()).length : 0;
    const totalStaff = dayCount + nightCount;
    
    if (isWeekend) {
        return calculateWeekendColor(totalStaff);
    } else {
        return calculateWeekdayColor(totalStaff, cleanNightShift, cleanDayShift);
    }
}

function calculateWeekendColor(totalStaff) {
    if (totalStaff === 2) return '#f8f9fa';
    if (totalStaff === 1) return '#26de81';
    if (totalStaff === 0) return '#ff6b6b';
    return '#f8f9fa';
}

function calculateWeekdayColor(totalStaff, cleanNightShift, cleanDayShift) {
    if (cleanNightShift === '' && cleanDayShift !== '') return '#26de81';
    if (totalStaff === 6) return '#f8f9fa';
    if (totalStaff === 5) return '#26de81';
    if (totalStaff <= 4 && totalStaff > 0) return '#ff6b6b';
    return '#6c757d';
}