import { getVersionHistory } from '../storage/localStorageManager.js';
import { showPage } from './navigation.js';
import { calendarState } from '../state/calendarState.js';

export function updateScheduleInfo(events, overrideTimestamp) {
    const totalEvents = events.length;
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    let lastUpdatedText = '';
    if (overrideTimestamp) {
        const d = new Date(overrideTimestamp);
        lastUpdatedText = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } else if (publishedData) {
        try {
            const data = JSON.parse(publishedData);
            if (data.timestamp) {
                const d = new Date(data.timestamp);
                lastUpdatedText = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
            }
        } catch {}
    }
    // Fallback to now if no stored timestamp
    if (!lastUpdatedText) {
        const now = new Date();
        lastUpdatedText = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }

    // Update header last updated element if present
    const lastUpdatedEl = document.getElementById('lastUpdated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Last Updated: ${lastUpdatedText}`;
    }

    document.getElementById('scheduleStats').innerHTML = `
        <p>Total Assignments: ${totalEvents}</p>
        <p>Last Updated: ${lastUpdatedText}</p>
    `;
}

// Build version tabs on the Published page (Version 1, 2, ..., N)
export function renderPublishedVersionTabs() {
    const tabsContainer = document.getElementById('versionTabs');
    if (!tabsContainer) return; // No UI container present

    const currentStr = localStorage.getItem('perfusionPublishedSchedule');
    const history = getVersionHistory();
    const current = currentStr ? JSON.parse(currentStr) : null;
    const total = (history?.length || 0) + (current ? 1 : 0);

    tabsContainer.innerHTML = '';
    if (total === 0) {
        // Nothing to render
        document.getElementById('versionTabsContainer')?.classList.add('hidden');
        return;
    }
    document.getElementById('versionTabsContainer')?.classList.remove('hidden');

    for (let i = 1; i <= total; i++) {
        const btn = document.createElement('button');
        btn.className = 'version-tab';
        btn.textContent = `Version ${i}`;
        btn.dataset.versionNum = String(i);
        btn.onclick = () => selectVersionTab(i);
        tabsContainer.appendChild(btn);
    }

    // Mark latest (current) as active by default
    const latestBtn = tabsContainer.querySelector(`.version-tab[data-version-num="${total}"]`);
    if (latestBtn) latestBtn.classList.add('active');
}

function getVersionDataByNumber(versionNum) {
    const currentStr = localStorage.getItem('perfusionPublishedSchedule');
    const history = getVersionHistory();
    const current = currentStr ? JSON.parse(currentStr) : null;
    const total = (history?.length || 0) + (current ? 1 : 0);
    if (versionNum < 1 || versionNum > total) return null;
    if (versionNum <= (history?.length || 0)) {
        return history[versionNum - 1]; // history is oldest..newest order
    }
    // Latest/current
    return current;
}

// Switch the Published calendar to a specific version by number
export function selectVersionTab(versionNum, versionData = null, isCurrent = undefined) {
    try {
        const data = versionData || getVersionDataByNumber(versionNum);
        if (!data) return;

        // Update active tab UI
        const tabsContainer = document.getElementById('versionTabs');
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.version-tab').forEach(el => el.classList.remove('active'));
            const active = tabsContainer.querySelector(`.version-tab[data-version-num="${versionNum}"]`);
            if (active) active.classList.add('active');
        }

        // Update calendar events
        const cal = calendarState.calendar;
        if (cal) {
            cal.removeAllEvents();
            (data.events || []).forEach(evt => cal.addEvent(evt));
        }

        // Update stats/last updated to reflect this version
        updateScheduleInfo(data.events || [], data.timestamp);
    } catch (e) {
        console.error('Error selecting version tab:', e);
    }
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
    showPage('publishedSchedulePage');
    setTimeout(() => {
        selectVersionTab(versionNum);
    }, 300);
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