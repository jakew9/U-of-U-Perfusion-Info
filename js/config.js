// API Configuration
export const API_KEY = 'AIzaSyCyCEmSvunsn8C82AwhSyX5joXy2hstPls';
export const SHEET_ID = '1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E';
export const RANGE = 'Sheet2!A13:X100';
export const SUPERVISOR_PASSWORD = "UofUPerfusion2025!";

// Global calendar instances
export let calendar = null;
export let supervisorViewCalendar = null;
export let supervisorEditCalendar = null;
export let previousCalendar = null;
export let currentEditingDate = null;
export let currentPublishedVersion = 1;

// Function to open Google Sheets
export function openGoogleSheet() {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${1pKNJK3nvpcwQor1obQm1V6qiWfwOPmImV361Qfqul8E}/edit`;
    window.open(sheetUrl, '_blank');
}