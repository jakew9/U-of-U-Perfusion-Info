import { getVersionHistory } from '../storage/localStorageManager.js';
import { calendar } from '../config.js';
import { showPage } from './navigation.js';

export function updateScheduleInfo(events) {
    const totalEvents = events.length;
    const lastUpdateDate = new Date().toLocaleDateString();
    document.getElementById('scheduleStats').innerHTML = `
        <p>Total Assignments: ${totalEvents}</p>
        <p>Last Updated: ${lastUpdateDate}</p>
    `;
}

export function displayPublishedVersions() {
    const versionsList = document.getElementById('publishedVersionsList');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    const history = getVersionHistory();
    
    versionsList.innerHTML = '';
    
    if (currentPublished) {
        const currentData = JSON.parse(currentPublished);
        const currentVersionNum = history.length + 1;
        const versionItem = createVersionItem(currentVersionNum, currentData, true);
        versionsList.appendChild(versionItem);
    }
    
    for (let i = history.length - 1; i >= 0; i--) {
        const version = history[i];
        const versionNum = i + 1;
        const versionItem = createVersionItem(versionNum, version, false);
        versionsList.appendChild(versionItem);
    }
    
    updateVersionListUI(history.length, currentPublished, clearAllBtn);
}

export function createVersionItem(versionNum, versionData, isCurrent) {
    const item = document.createElement('div');
    item.className = `version-item ${isCurrent ? 'current-version' : ''}`;
    
    const date = new Date(versionData.timestamp);
    const formattedDate = formatDate(date);
    const formattedTime = formatTime(date);
    
    item.innerHTML = generateVersionItemHTML(versionNum, isCurrent, formattedDate, formattedTime);
    return item;
}

export function previewVersion(versionNum, isCurrent) {
    if (isCurrent) {
        showPage('publishedSchedulePage');
    } else {
        const history = getVersionHistory();
        
        if (history.length > 0) {
            const versionIndex = history.length - versionNum;
            const versionData = history[versionIndex];
            
            if (versionData) {
                showPage('publishedSchedulePage');
                setTimeout(() => {
                    selectVersionTab(versionNum, versionData, false);
                }, 500);
            }
        }
    }
}

export function deleteVersion(versionNum) {
    try {
        const history = getVersionHistory();
        
        if (history.length > 0) {
            const versionIndex = history.length - versionNum;
            
            if (versionIndex >= 0 && versionIndex < history.length) {
                history.splice(versionIndex, 1);
                localStorage.setItem('perfusionScheduleHistory', JSON.stringify(history));
                displayPublishedVersions();
                alert(`Version ${versionNum} has been deleted successfully.`);
            } else {
                alert('Error: Version not found.');
            }
        }
    } catch (error) {
        console.error('Error deleting version:', error);
        alert('Error deleting version. Please try again.');
    }
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
}

function generateVersionItemHTML(versionNum, isCurrent, formattedDate, formattedTime) {
    return `
        <div class="version-info-left">
            <div class="version-title">
                Version ${versionNum}
                <span class="version-status ${isCurrent ? 'status-current' : 'status-archived'}">
                    ${isCurrent ? 'Current' : 'Archived'}
                </span>
            </div>
            <div class="version-details">
                Published on ${formattedDate} at ${formattedTime}
            </div>
        </div>
        <div class="version-actions">
            <button class="preview-button" onclick="previewVersion(${versionNum}, ${isCurrent})">
                Preview
            </button>
            ${!isCurrent ? 
                `<button class="delete-button" onclick="confirmDeleteVersion(${versionNum})">Delete</button>` : 
                '<button class="delete-button" disabled title="Cannot delete current version">Delete</button>'}
        </div>
    `;
}

function updateVersionListUI(historyLength, currentPublished, clearAllBtn) {
    if (historyLength === 0 && !currentPublished) {
        document.getElementById('publishedVersionsList').innerHTML = 
            '<div class="no-versions-message">No published versions found.<br><br>' +
            '<em>Note: The schedule is now loaded directly from Google Sheets. ' +
            'Manual publishing is only needed for saving specific versions.</em></div>';
        clearAllBtn.style.display = 'none';
    } else if (historyLength > 0) {
        clearAllBtn.style.display = 'block';
    } else {
        clearAllBtn.style.display = 'none';
    }
}

export function confirmDeleteVersion(versionNum) {
    if (confirm(`Are you sure you want to delete Version ${versionNum}? This action cannot be undone.`)) {
        deleteVersion(versionNum);
    }
}

export function clearAllVersions() {
    if (confirm('Are you sure you want to clear all archived versions? This action cannot be undone.')) {
        try {
            localStorage.setItem('perfusionScheduleHistory', JSON.stringify([]));
            displayPublishedVersions();
            alert('All archived versions have been cleared successfully.');
        } catch (error) {
            console.error('Error clearing versions:', error);
            alert('Error clearing versions. Please try again.');
        }
    }
}