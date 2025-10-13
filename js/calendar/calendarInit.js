import { setSupervisorCalendar } from '../components/modals.js';
import { getTextColor, calculateEventColor } from '../utils/colorUtils.js';
import { SUPERVISOR_PASSWORD } from '../config.js';
import { loadPublishedEvents, loadEventsForEditing } from '../storage/localStorageManager.js';
import { updateScheduleInfo, renderPublishedVersionTabs } from '../components/versionManager.js';
import { calendarState } from '../state/calendarState.js';

export async function initializeSupervisorViewCalendar() {
    if (calendarState.supervisorViewCalendar) {
        calendarState.supervisorViewCalendar.destroy();
    }
    const events = await loadPublishedEvents();
    const calendar = createCalendar('supervisorViewCalendar', events, true);
    calendarState.setSupervisorViewCalendar(calendar);
    calendar.render();
}

export async function initializeSupervisorEditCalendar() {
    if (calendarState.supervisorEditCalendar) {
        calendarState.supervisorEditCalendar.destroy();
    }
    const events = await loadEventsForEditing();
    const calendar = createCalendar('supervisorEditCalendar', events, false, true);
    calendarState.setSupervisorEditCalendar(calendar);
    setSupervisorCalendar(calendar);  // Make calendar available to modals
    calendar.render();
}

export async function initializePublishedCalendar() {
    if (calendarState.calendar) {
        calendarState.calendar.destroy();
    }
    const events = await loadPublishedEvents();
    const calendar = createCalendar('publishedCalendar', events, true);
    calendarState.setCalendar(calendar);
    calendar.render();
    // Build version tabs and update stats
    renderPublishedVersionTabs();
    updateScheduleInfo(events);
}

export function initializePreviousCalendar() {
    if (calendarState.previousCalendar) {
        calendarState.previousCalendar.destroy();
    }
    const calendar = createCalendar('previousCalendar', [], true);
    calendarState.setPreviousCalendar(calendar);
    calendar.render();
}

function createCalendar(elementId, events, readOnly = false, isEditable = false) {
    const config = {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: events,
        height: 'auto',
        eventDisplay: 'block',
        eventContent: formatEventContent
    };

    if (!readOnly) {
        config.dateClick = handleDateClick;
        config.eventClick = handleEventClick;
    } else if (!isEditable) {
        config.eventClick = handleViewEventClick;
    }

    return new FullCalendar.Calendar(document.getElementById(elementId), config);
}

function formatEventContent(arg) {
    const lines = arg.event.title.split('\n');
    console.log('Formatting event content, lines:', lines); // Debug logging
    
    // Extract shift personnel to identify double shifts and duplicates
    let extraShiftPeople = [];
    let dayShiftPeople = [];
    let nightShiftPeople = [];
    let schoolPeople = [];
    
    lines.forEach(line => {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('+1:')) {
            const names = cleanLine.replace('+1:', '').trim();
            extraShiftPeople = names.split('/').map(name => name.trim()).filter(name => name && name !== '_' && name !== '');
        } else if (cleanLine.startsWith('Day:')) {
            const names = cleanLine.replace('Day:', '').trim();
            dayShiftPeople = names.split('/').map(name => name.trim()).filter(name => name && name !== '_' && name !== '');
        } else if (cleanLine.startsWith('Night Shift:') || cleanLine.startsWith('Night:')) {
            // Handle both "Night Shift:" (from Google Sheets) and "Night:" (from manual edits)
            const names = cleanLine.replace(/^(Night Shift:|Night:)/, '').trim();
            nightShiftPeople = names.split('/').map(name => name.trim()).filter(name => name && name !== '_' && name !== '');
        } else if (cleanLine.startsWith('School:')) {
            const names = cleanLine.replace('School:', '').trim();
            schoolPeople = names.split('/').map(name => name.trim()).filter(name => name && name !== '_' && name !== '');
        } else if (!cleanLine.includes(':') && cleanLine && !cleanLine.startsWith('Off:') && cleanLine !== '​') {
            // Handle weekend format where it's just names without "Day:" prefix
            dayShiftPeople = cleanLine.split('/').map(name => name.trim()).filter(name => name && name !== '_' && name !== '');
        }
    });
    
    // Combine all people for cross-shift detection
    const allShiftPeople = [...extraShiftPeople, ...dayShiftPeople, ...nightShiftPeople, ...schoolPeople];
    
    // Find people working multiple shifts (green highlight)
    // School counts as a shift, so someone doing School + Extra should be highlighted
    const doubleShiftPeople = [];
    extraShiftPeople.forEach(person => {
        if (dayShiftPeople.includes(person) || nightShiftPeople.includes(person) || schoolPeople.includes(person)) {
            doubleShiftPeople.push(person);
        }
    });
    dayShiftPeople.forEach(person => {
        if ((nightShiftPeople.includes(person) || schoolPeople.includes(person)) && !doubleShiftPeople.includes(person)) {
            doubleShiftPeople.push(person);
        }
    });
    nightShiftPeople.forEach(person => {
        if (schoolPeople.includes(person) && !doubleShiftPeople.includes(person)) {
            doubleShiftPeople.push(person);
        }
    });
    
    // Find duplicates within each shift (red highlight - error)
    const extraShiftDuplicates = extraShiftPeople.filter((person, index) => 
        extraShiftPeople.indexOf(person) !== index
    );
    const dayShiftDuplicates = dayShiftPeople.filter((person, index) => 
        dayShiftPeople.indexOf(person) !== index
    );
    const nightShiftDuplicates = nightShiftPeople.filter((person, index) => 
        nightShiftPeople.indexOf(person) !== index
    );
    const schoolDuplicates = schoolPeople.filter((person, index) => 
        schoolPeople.indexOf(person) !== index
    );
    
    const allDuplicates = [...new Set([...extraShiftDuplicates, ...dayShiftDuplicates, ...nightShiftDuplicates, ...schoolDuplicates])];
    
    console.log('Extra shift people:', extraShiftPeople); // Debug logging
    console.log('Day shift people:', dayShiftPeople); // Debug logging
    console.log('Night shift people:', nightShiftPeople); // Debug logging
    console.log('School people:', schoolPeople); // Debug logging
    console.log('Night shift people:', nightShiftPeople); // Debug logging
    console.log('Double shift people:', doubleShiftPeople); // Debug logging
    console.log('Duplicate people (errors):', allDuplicates); // Debug logging
    
    // Function to highlight people based on their status
    const highlightPeople = (text) => {
        let highlightedText = text;
        
        // First highlight duplicates in red (errors take priority)
        allDuplicates.forEach(person => {
            const regex = new RegExp(`\\b${person}\\b`, 'g');
            highlightedText = highlightedText.replace(regex, `<span style="background-color: #f44336; color: white; padding: 1px 3px; border-radius: 3px; font-weight: bold;">${person}</span>`);
        });
        
        // Then highlight double shifts in green (only if not already highlighted as error)
        doubleShiftPeople.forEach(person => {
            if (!allDuplicates.includes(person)) {
                const regex = new RegExp(`\\b${person}\\b`, 'g');
                highlightedText = highlightedText.replace(regex, `<span style="background-color: #4CAF50; color: white; padding: 1px 3px; border-radius: 3px; font-weight: bold;">${person}</span>`);
            }
        });
        
        return highlightedText;
    };
    
    let html = '<div class="fc-event-main-frame"><div class="fc-event-title-container"><div class="fc-event-title fc-sticky">';
    lines.forEach(line => {
        if (line.startsWith('+1:')) {
            html += `<div style="background-color: #FF9800; color: #fff; padding: 2px 4px; margin-top: 2px; font-weight: bold;">${highlightPeople(line)}</div>`;
        } else if (line.startsWith('School:')) {
            html += `<div style="background-color: #ffeb3b; color: #000; padding: 2px 4px; margin-top: 2px;">${highlightPeople(line)}</div>`;
        } else if (line.startsWith('Off:')) {
            console.log('Found Off line:', line); // Debug logging
            html += `<div style="background-color: #9e9e9e; color: #fff; padding: 2px 4px; margin-top: 2px;">${line}</div>`;
        } else {
            html += `<div>${highlightPeople(line)}</div>`;
        }
    });
    html += '</div></div></div>';
    return { html: html };
}

function handleViewEventClick(info) {
    const event = info.event;
    const dayShift = event.extendedProps.dayShift || '';
    const nightShift = event.extendedProps.nightShift || '';
    const eventDate = event.start.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    let message = `Schedule for ${eventDate}\n\n`;
    if (dayShift) {
        message += `Day Shift:\n${dayShift}\n\n`;
    }
    if (nightShift) {
        message += `Night Shift:\n${nightShift}`;
    }
    
    if (!dayShift && !nightShift) {
        message += 'No staff assigned for this date.';
    }
    
    alert(message);
}

function handleDateClick(info) {
    const existingEvent = this.getEvents().find(event => 
        event.startStr === info.dateStr
    );
    
    if (existingEvent) {
        const extraShift = existingEvent.extendedProps.extraShift || '';
        const dayShift = existingEvent.extendedProps.dayShift || '';
        const nightShift = existingEvent.extendedProps.nightShift || '';
        const school = existingEvent.extendedProps.school || '';
        const off = existingEvent.extendedProps.off || '';
        window.openEditModal(info.dateStr, dayShift, nightShift, school, off, existingEvent.backgroundColor, extraShift);
    } else {
        window.openEditModal(info.dateStr);
    }
}

function handleEventClick(info) {
    const event = info.event;
    const extraShift = event.extendedProps.extraShift || '';
    const dayShift = event.extendedProps.dayShift || '';
    const nightShift = event.extendedProps.nightShift || '';
    const school = event.extendedProps.school || '';
    const off = event.extendedProps.off || '';
    window.openEditModal(info.event.startStr, dayShift, nightShift, school, off, event.backgroundColor, extraShift);
}