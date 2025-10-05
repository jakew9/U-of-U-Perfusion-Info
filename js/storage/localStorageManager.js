import { currentPublishedVersion } from '../config.js';

// Local storage operations for schedule management
export function savePublishedSchedule(events) {
    const publishData = {
        events: events,
        timestamp: new Date().toISOString(),
        version: currentPublishedVersion
    };

    const currentPublished = localStorage.getItem('perfusionPublishedSchedule');
    if (currentPublished) {
        archiveCurrentVersion(currentPublished);
    }

    localStorage.setItem('perfusionPublishedSchedule', JSON.stringify(publishData));
    return true;
}

export async function loadPublishedEvents() {
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    if (publishedData) {
        const data = JSON.parse(publishedData);
        return data.events || [];
    }
    
    return await fetchScheduleFromGoogleSheets();
}

export async function loadEventsForEditing() {
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    if (publishedData) {
        const data = JSON.parse(publishedData);
        return data.events || [];
    }
    
    return await fetchScheduleFromGoogleSheets();
}

export function clearAllVersions() {
    localStorage.removeItem('perfusionPublishedSchedule');
    localStorage.removeItem('perfusionScheduleHistory');
}

function archiveCurrentVersion(currentPublished) {
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    history.push(JSON.parse(currentPublished));
    localStorage.setItem('perfusionScheduleHistory', JSON.stringify(history));
}

export function getVersionHistory() {
    const historyData = localStorage.getItem('perfusionScheduleHistory');
    return historyData ? JSON.parse(historyData) : [];
}

export async function publishSchedule(events) {
    try {
        if (savePublishedSchedule(events)) {
            alert('Schedule published successfully!');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error publishing schedule:', error);
        alert('Error publishing schedule. Please try again.');
        return false;
    }
}

export async function refreshScheduleFromSheets() {
    try {
        const events = await fetchScheduleFromGoogleSheets();
        if (events && events.length > 0) {
            if (await savePublishedSchedule(events)) {
                alert('Schedule refreshed successfully from Google Sheets!');
                return true;
            }
        }
        alert('No events found in Google Sheets.');
        return false;
    } catch (error) {
        console.error('Error refreshing from sheets:', error);
        alert('Error refreshing schedule. Please check your internet connection and try again.');
        return false;
    }
}

export async function restartFromGoogleSheets() {
    if (confirm('This will clear all saved versions and reload data from Google Sheets. Continue?')) {
        try {
            clearAllVersions();
            const success = await refreshScheduleFromSheets();
            if (success) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error restarting from sheets:', error);
            alert('Error restarting from Google Sheets. Please try again.');
        }
    }
}

import { fetchScheduleFromGoogleSheets as fetchFromAPI } from '../api/googleSheets.js';

async function fetchScheduleFromGoogleSheets() {
    try {
        const events = await fetchFromAPI();
        console.log('Fetched events:', events);
        return events;
    } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
        return [];
    }
}