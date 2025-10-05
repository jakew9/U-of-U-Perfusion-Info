import { getTextColor, calculateEventColor } from '../utils/colorUtils.js';
import { calendar, supervisorViewCalendar, supervisorEditCalendar, previousCalendar } from '../config.js';

export function initializeSupervisorViewCalendar(events) {
    const calendarEl = document.getElementById('supervisorViewCalendar');
    supervisorViewCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: getDefaultHeaderToolbar(),
        events: events,
        height: 'auto',
        eventDisplay: 'block',
        eventContent: formatEventContent,
        eventClick: handleViewEventClick
    });
    
    supervisorViewCalendar.render();
}

export function initializeSupervisorEditCalendar(events) {
    const calendarEl = document.getElementById('supervisorEditCalendar');
    supervisorEditCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: getDefaultHeaderToolbar(),
        events: events,
        height: 'auto',
        eventDisplay: 'block',
        eventContent: formatEventContent,
        dateClick: handleEditDateClick,
        eventClick: handleEditEventClick
    });
    
    supervisorEditCalendar.render();
}

export function initializePublishedCalendar(events) {
    if (calendar) {
        calendar.destroy();
    }
    
    const calendarEl = document.getElementById('publishedCalendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: getDefaultHeaderToolbar(),
        events: events,
        height: 'auto',
        eventDisplay: 'block',
        eventContent: formatEventContent,
        eventClick: handleViewEventClick
    });
    
    calendar.render();
    updateScheduleInfo(events);
}

export function initializePreviousCalendar() {
    const calendarEl = document.getElementById('previousCalendar');
    previousCalendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: getDefaultHeaderToolbar(),
        events: [],
        height: 'auto',
        eventDisplay: 'block'
    });
    previousCalendar.render();
}

function getDefaultHeaderToolbar() {
    return {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
    };
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