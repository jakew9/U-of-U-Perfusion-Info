// Bootstrap function to initialize app; runs on DOMContentLoaded or immediately if DOM already loaded
async function boot() {
    try {
        // Import all necessary modules
        const navigationModule = await import('./js/components/navigation.js');
        const {
            showPage,
            showSupervisorPage,
            showManagePublished,
            requestEditAccess
        } = navigationModule;
         // ADD THIS NEW IMPORT
        const configModule = await import('./js/config.js');
        const { openGoogleSheet } = configModule;
        const modalsModule = await import('./js/components/modals.js');
        const {
            checkPassword,
            closePasswordModal,
            openEditModal,
            closeEditModal,
            saveEdit
        } = modalsModule;

        const versionModule = await import('./js/components/versionManager.js');
        const {
            previewVersion,
            deleteVersion,
            confirmDeleteVersion,
            clearAllVersions
        } = versionModule;

        const storageModule = await import('./js/storage/localStorageManager.js');
        const {
            publishSchedule,
            refreshScheduleFromSheets,
            restartFromGoogleSheets
        } = storageModule;

        // Import calendar state so we can read current edit calendar events when publishing
        const { calendarState } = await import('./js/state/calendarState.js');

        // Import authentication modules
        const { authManager } = await import('./js/auth/authManager.js');
        const authUIModule = await import('./js/auth/authUI.js');
        const {
            showLoginModal,
            closeLoginModal,
            showRegisterModal,
            closeRegisterModal,
            showUserManagementModal,
            closeUserManagementModal,
            attemptLogin,
            attemptRegister,
            logout,
            approveRegistration,
            rejectRegistration,
            deleteUser,
            promoteToAdmin,
            demoteFromAdmin,
            initializeAuth
        } = authUIModule;

        // Wrapper: collect events from the Supervisor Edit calendar and publish them
        async function publishCurrentSchedule() {
            console.log('[Publish] Button clicked');
            try {
                const editCal = calendarState.supervisorEditCalendar;
                if (!editCal) {
                    console.warn('[Publish] Edit calendar not initialized');
                    alert('Edit calendar is not initialized yet. Open the Edit Schedule page first.');
                    return;
                }

                // Convert FullCalendar EventApi objects to plain objects for storage
                const events = editCal.getEvents().map(e => ({
                    title: e.title,
                    start: e.startStr,
                    end: e.endStr || undefined,
                    backgroundColor: e.backgroundColor || undefined,
                    extendedProps: { ...e.extendedProps }
                }));

                console.log('[Publish] Preparing to publish events count:', events.length);
                const success = await publishSchedule(events);
                if (success) {
                    console.log('[Publish] Success, navigating to Published tab');
                    // Navigate to the Published tab so the user sees the result
                    showPage('publishedSchedulePage');
                }
            } catch (err) {
                console.error('Failed to publish current schedule:', err);
                alert('Failed to publish schedule. Please try again.');
            }
        }

        // Expose all functions to window object
        Object.assign(window, {
            showPage,
            showSupervisorPage,
            showManagePublished,
            requestEditAccess,
            checkPassword,
            closePasswordModal,
            openEditModal,
            closeEditModal,
            saveEdit,
            previewVersion,
            deleteVersion,
            confirmDeleteVersion,
            clearAllVersions,
            publishSchedule, // keep original available if needed
            publishCurrentSchedule, // preferred UI entry point
            refreshScheduleFromSheets,
            restartFromGoogleSheets,
            openGoogleSheet,
            // Auth functions
            showLoginModal,
            closeLoginModal,
            showRegisterModal,
            closeRegisterModal,
            showUserManagementModal,
            closeUserManagementModal,
            attemptLogin,
            attemptRegister,
            logout,
            approveRegistration,
            rejectRegistration,
            deleteUser,
            promoteToAdmin,
            demoteFromAdmin,
            authManager
        });

        // Fallback binding in case inline onclick is blocked or overridden
        const publishBtn = document.getElementById('publishBtn');
        if (publishBtn) {
            publishBtn.addEventListener('click', (e) => {
                // Prevent duplicate triggers if inline handler exists
                if (!e.defaultPrevented) {
                    e.preventDefault();
                    window.publishCurrentSchedule();
                }
            });
        }

        // Set up password input handler
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    checkPassword();
                }
            });
        }

        // Set up modal click handlers
        window.onclick = (event) => {
            const passwordModal = document.getElementById('passwordModal');
            const editModal = document.getElementById('editModal');
            
            if (event.target === passwordModal) {
                closePasswordModal();
            } else if (event.target === editModal) {
                closeEditModal();
            }
        };

        // Initialize authentication and show appropriate page
        const isLoggedIn = initializeAuth();
        if (isLoggedIn) {
            showPage('publishedSchedulePage');
        } else {
            showPage('loginPage');
        }
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    // Document already parsed, run immediately
    boot();
}