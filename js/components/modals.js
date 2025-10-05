import { SUPERVISOR_PASSWORD } from '../config.js';

// Password Modal Functions
export function showPasswordModal() {
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('passwordInput').focus();
}

export function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').style.display = 'none';
}

export function checkPassword() {
    const enteredPassword = document.getElementById('passwordInput').value;
    const errorDiv = document.getElementById('passwordError');
    
    if (enteredPassword === SUPERVISOR_PASSWORD) {
        closePasswordModal();
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
    currentEditingDate = date;
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