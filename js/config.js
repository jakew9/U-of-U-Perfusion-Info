// API Configuration
export const API_KEY = 'AIzaSyCyCEmSvunsn8C82AwhSyX5joXy2hstPls';
export const SHEET_ID = '1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E';
export const RANGE = 'Sheet2!A13:X100';
export const SUPERVISOR_PASSWORD = "admin123";

// Global calendar instances
export let calendar = null;
export let supervisorViewCalendar = null;
export let supervisorEditCalendar = null;
export let previousCalendar = null;
export let currentEditingDate = null;
export let currentPublishedVersion = 1;