import { SUPERVISOR_PASSWORD } from '../config.js';
import { showPage } from './navigation.js';
import { getTextColor, calculateEventColor } from '../utils/colorUtils.js';
import { calendarState } from '../state/calendarState.js';

let currentAccessType = null;

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
export function openEditModal(date, dayShift = '', nightShift = '', backgroundColor = 'auto') {
    calendarState.setCurrentEditingDate(date);
    document.getElementById('editModalTitle').textContent = `Edit Schedule for ${date}`;
    document.getElementById('dayShiftInput').value = dayShift;
    document.getElementById('nightShiftInput').value = nightShift;
    
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
    const dayShift = document.getElementById('dayShiftInput').value.trim();
    const nightShift = document.getElementById('nightShiftInput').value.trim();
    const selectedColor = document.querySelector('input[name="backgroundColor"]:checked').value;
    
    if (!currentEditingDate) {
        alert('Error: No date selected for editing');
        return;
    }

    // Find existing event or create new one
    let existingEvent = supervisorEditCalendar.getEvents().find(event => 
        event.startStr === currentEditingDate
    );

    const eventTitle = formatEventTitle(dayShift, nightShift);
    const backgroundColor = selectedColor === 'auto' ? calculateEventColor(dayShift, nightShift) : selectedColor;
    const textColor = getTextColor(backgroundColor);

    if (existingEvent) {
        existingEvent.setProp('title', eventTitle);
        existingEvent.setProp('backgroundColor', backgroundColor);
        existingEvent.setProp('textColor', textColor);
        existingEvent.setExtendedProp('dayShift', dayShift);
        existingEvent.setExtendedProp('nightShift', nightShift);
    } else {
        supervisorEditCalendar.addEvent({
            title: eventTitle,
            start: currentEditingDate,
            allDay: true,
            backgroundColor: backgroundColor,
            textColor: textColor,
            extendedProps: {
                dayShift: dayShift,
                nightShift: nightShift
            }
        });
    }

    closeEditModal();
}

function formatEventTitle(dayShift, nightShift) {
    let title = '';
    if (dayShift) title += `Day Shift:\n${dayShift}\n`;
    if (nightShift) title += `Night Shift:\n${nightShift}`;
    return title.trim();
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
}