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