import { SUPERVISOR_PASSWORD } from '../config.js';
import { showPage } from './navigation.js';
import { calendarState } from '../state/calendarState.js';

// Global variables
let currentEditingDate = null;
let currentAccessType = null;
let supervisorEditCalendar = null;

// Initialize the calendar reference
export function setSupervisorCalendar(calendar) {
    supervisorEditCalendar = calendar;
}

// Password Modal Functions
export function showPasswordModal(accessType = 'view') {
    currentAccessType = accessType;
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('passwordInput').focus();
}

export function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').style.display = 'none';
    currentAccessType = null;
}

export function checkPassword() {
    const enteredPassword = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('passwordError');
    
    if (enteredPassword === SUPERVISOR_PASSWORD) {
        closePasswordModal();
        sessionStorage.setItem('isAuthenticated', 'true');
        showPage('supervisorPage');
    } else {
        errorDiv.textContent = 'Incorrect password. Please try again.';
        errorDiv.style.display = 'block';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

// Edit Modal Functions
export function openEditModal(date, dayShift = '', nightShift = '', school = '', off = '', backgroundColor = 'auto', extraShift = '') {
    currentEditingDate = date;
    document.getElementById('editModalTitle').textContent = `Edit Schedule for ${date}`;
    document.getElementById('dayShiftInput').value = dayShift;
    document.getElementById('nightShiftInput').value = nightShift;
    document.getElementById('schoolInput').value = school;
    document.getElementById('offInput').value = off;
    
    // Set extraShift if the element exists
    const extraShiftElement = document.getElementById('extraShiftInput');
    if (extraShiftElement) {
        extraShiftElement.value = extraShift;
    }
    
    const colorRadios = document.querySelectorAll('input[name="backgroundColor"]');
    colorRadios.forEach(radio => {
        radio.checked = radio.value === backgroundColor;
    });
    
    document.getElementById('editModal').style.display = 'block';
    document.getElementById('dayShiftInput').focus();
}

export function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    currentEditingDate = null;
}

export function saveEdit() {
    // Check if all required elements exist
    const extraShiftElement = document.getElementById('extraShiftInput');
    const dayShiftElement = document.getElementById('dayShiftInput');
    const nightShiftElement = document.getElementById('nightShiftInput');
    const schoolElement = document.getElementById('schoolInput');
    const offElement = document.getElementById('offInput');
    
    if (!extraShiftElement || !dayShiftElement || !nightShiftElement || !schoolElement || !offElement) {
        alert('Error: Some form elements are missing. Please refresh the page and try again.');
        return;
    }
    
    const extraShift = extraShiftElement.value.trim();
    const dayShift = dayShiftElement.value.trim();
    const nightShift = nightShiftElement.value.trim();
    const school = schoolElement.value.trim();
    const off = offElement.value.trim();
    
    const selectedColorElement = document.querySelector('input[name="backgroundColor"]:checked');
    const selectedColor = selectedColorElement ? selectedColorElement.value : 'auto';
    
    if (!currentEditingDate) {
        alert('Error: No date selected for editing');
        return;
    }

    if (!supervisorEditCalendar) {
        alert('Error: Calendar not initialized');
        return;
    }

    let existingEvent = supervisorEditCalendar.getEvents().find(event => 
        event.startStr === currentEditingDate
    );

    let backgroundColor, borderColor;
    
    if (selectedColor === 'auto') {
        const colorResult = calculateEventColor(dayShift, nightShift);
        backgroundColor = colorResult.backgroundColor;
        borderColor = colorResult.borderColor;
    } else {
        backgroundColor = selectedColor;
        borderColor = selectedColor;
    }

    // Create event title with all fields
    const isWeekend = !nightShift || nightShift.trim() === '';
    const parts = [];
    
    // Add extra shift first (priority) - only if someone is assigned
    if (extraShift && extraShift.trim()) {
        parts.push(`+1: ${extraShift}`);
    }
    
    if (dayShift) {
        if (isWeekend) {
            parts.push(dayShift);
        } else {
            parts.push(`Day: ${dayShift}`);
        }
    }
    
    if (nightShift) parts.push(`Night: ${nightShift}`);
    if (school) parts.push(`School: ${school}`);
    parts.push(`Off: ${off || ''}`); // Always show Off line

    const eventData = {
        title: parts.join('\n\u200B\n'),
        start: currentEditingDate,
        allDay: true,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textColor: backgroundColor ? '#ffffff' : undefined,
        extendedProps: {
            extraShift: extraShift,
            dayShift: dayShift,
            nightShift: nightShift,
            school: school,
            off: off,
            manualColor: selectedColor !== 'auto'
        }
    };

    if (existingEvent) {
        existingEvent.setProp('title', eventData.title);
        existingEvent.setProp('backgroundColor', eventData.backgroundColor);
        existingEvent.setProp('borderColor', eventData.borderColor);
        existingEvent.setExtendedProp('extraShift', extraShift);
        existingEvent.setExtendedProp('dayShift', dayShift);
        existingEvent.setExtendedProp('nightShift', nightShift);
        existingEvent.setExtendedProp('school', school);
        existingEvent.setExtendedProp('off', off);
        existingEvent.setExtendedProp('manualColor', selectedColor !== 'auto');
    } else {
        supervisorEditCalendar.addEvent(eventData);
    }

    closeEditModal();
    alert('Schedule updated successfully!');
}

// Helper function to calculate automatic colors
function calculateEventColor(dayShift, nightShift) {
    const countStaff = (shiftString) => {
        if (!shiftString) return 0;
        return shiftString.split('/').filter(name => 
            name.trim() && name.trim().toLowerCase() !== 'blank' && name.trim() !== '_'
        ).length;
    };
    
    const nightCount = countStaff(nightShift);
    const dayCount = countStaff(dayShift);
    const totalCount = nightCount + dayCount;
    const isWeekend = !nightShift || nightShift.trim() === '';
    
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
    
    return { backgroundColor, borderColor };
}

// Close modals when clicking outside
window.onclick = function(event) {
    const passwordModal = document.getElementById('passwordModal');
    const editModal = document.getElementById('editModal');
    
    if (event.target === passwordModal) {
        closePasswordModal();
    } else if (event.target === editModal) {
        closeEditModal();
    }
};