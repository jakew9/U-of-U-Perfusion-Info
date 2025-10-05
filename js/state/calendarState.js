// Calendar state management
export const calendarState = {
    calendar: null,
    supervisorViewCalendar: null,
    supervisorEditCalendar: null,
    previousCalendar: null,
    currentEditingDate: null,
    currentPublishedVersion: 1,

    setCalendar(cal) {
        this.calendar = cal;
    },
    setSupervisorViewCalendar(cal) {
        this.supervisorViewCalendar = cal;
    },
    setSupervisorEditCalendar(cal) {
        this.supervisorEditCalendar = cal;
    },
    setPreviousCalendar(cal) {
        this.previousCalendar = cal;
    },
    setCurrentEditingDate(date) {
        this.currentEditingDate = date;
    }
};