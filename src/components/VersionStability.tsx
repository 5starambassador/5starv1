'use client'

import { useEffect } from 'react'

/**
 * Force-syncs the application version by performing a hard reload.
 * Includes a safety throttle to prevent infinite reload loops.
 */
export function triggerVersionSync() {
    const lastReload = sessionStorage.getItem('last_version_sync');
    const now = Date.now();

    // Throttle: Max 1 forced-sync every 30 seconds
    if (!lastReload || (now - parseInt(lastReload)) > 30000) {
        console.warn('[Senior Safety] Version desync detected. Forcing hard-sync...');
        sessionStorage.setItem('last_version_sync', now.toString());
        window.location.reload();
    }
}

export function VersionStability() {
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            const msg = event.message?.toLowerCase() || '';
            const isActionError = msg.includes('server action') && msg.includes('not found');

            if (isActionError) {
                triggerVersionSync();
            }
        };

        window.addEventListener('error', handleError);

        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason?.message || '';
            if (reason.toLowerCase().includes('server action') && reason.toLowerCase().includes('not found')) {
                triggerVersionSync();
            }
        };

        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    return null;
}
