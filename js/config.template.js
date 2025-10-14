// Configuration Template
// Copy this file to config.js and fill in your actual values
export const API_KEY = 'YOUR_GOOGLE_SHEETS_API_KEY_HERE';
export const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
export const RANGE = 'Sheet2!A13:X100';
export const SUPERVISOR_PASSWORD = "YOUR_SECURE_PASSWORD_HERE";

// Global calendar instances
export let calendar = null;
export let supervisorViewCalendar = null;
export let supervisorEditCalendar = null;
export let currentEditingDate = null;
export let currentPublishedVersion = 1;