import { getTextColor, calculateEventColor } from '../utils/colorUtils.js';
import { SUPERVISOR_PASSWORD } from '../config.js';
import { loadPublishedEvents, loadEventsForEditing } from '../storage/localStorageManager.js';
import { updateScheduleInfo } from '../components/versionManager.js';
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
    let html = '<div class="fc-event-main-frame"><div class="fc-event-title-container"><div class="fc-event-title fc-sticky">';
    lines.forEach(line => {
        if (line.startsWith('School:')) {
            html += `<div style="background-color: #ffeb3b; color: #000; padding: 2px 4px; margin-top: 2px;">${line}</div>`;
        } else if (line.startsWith('Off:')) {
            html += `<div style="background-color: #9e9e9e; color: #fff; padding: 2px 4px; margin-top: 2px;">${line}</div>`;
        } else {
            html += `<div>${line}</div>`;
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
        const dayShift = existingEvent.extendedProps.dayShift || '';
        const nightShift = existingEvent.extendedProps.nightShift || '';
        window.openEditModal(info.dateStr, dayShift, nightShift, existingEvent.backgroundColor);
    } else {
        window.openEditModal(info.dateStr);
    }
}

function handleEventClick(info) {
    const event = info.event;
    const dayShift = event.extendedProps.dayShift || '';
    const nightShift = event.extendedProps.nightShift || '';
    window.openEditModal(info.event.startStr, dayShift, nightShift, event.backgroundColor);
}