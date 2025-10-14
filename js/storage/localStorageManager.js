import { currentPublishedVersion } from '../config.js';
import { calendarState } from '../state/calendarState.js';
import { fetchScheduleFromGoogleSheets as fetchFromAPI } from '../api/sheetsApi.js';

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
    
    return await fetchFromAPI();
}

export async function loadEventsForEditing() {
    const publishedData = localStorage.getItem('perfusionPublishedSchedule');
    if (publishedData) {
        const data = JSON.parse(publishedData);
        return data.events || [];
    }
    
    return await fetchFromAPI();
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
        // If no events provided, try to gather from the Supervisor Edit calendar
        if (!events) {
            const editCal = calendarState && calendarState.supervisorEditCalendar;
            if (editCal) {
                events = editCal.getEvents().map(e => ({
                    title: e.title,
                    start: e.startStr,
                    end: e.endStr || undefined,
                    backgroundColor: e.backgroundColor || undefined,
                    extendedProps: { ...e.extendedProps }
                }));
            } else {
                alert('No events to publish. Open the Edit Schedule page first.');
                return false;
            }
        }
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
        console.log('Starting refresh from Google Sheets...'); // Debug logging
        const events = await fetchFromAPI();
        console.log('Fetched events:', events);
        if (events && events.length > 0) {
            if (savePublishedSchedule(events)) {
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
    if (confirm('This will create a new version from Google Sheets data, preserving your existing versions. Continue?')) {
        try {
            const success = await refreshScheduleFromSheets();
            if (success) {
                // Navigate to published page to show the new version
                if (window.showPage) {
                    window.showPage('publishedSchedulePage');
                } else {
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Error restarting from sheets:', error);
            alert('Error restarting from Google Sheets. Please try again.');
        }
    }
}