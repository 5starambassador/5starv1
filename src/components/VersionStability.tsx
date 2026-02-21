'use client'

import { useEffect } from 'react'

/**
 * VersionStability Component
 * 
 * Specifically designed to handle Next.js "Server Action not found" errors
 * which occur when a user has a stale client bundle/manifest open during a redeploy.
 */
export function VersionStability() {
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            // Check if error message contains the specific Server Action hash mismatch signature
            const isActionError =
                event.message?.toLowerCase().includes('server action') &&
                event.message?.toLowerCase().includes('not found');

            if (isActionError) {
                console.warn('[Senior Safety] Server Action mismatch detected. Forcing hard-sync...');

                // Set a flag to prevent infinite reload loops
                const lastReload = sessionStorage.getItem('last_version_sync');
                const now = Date.now();

                if (!lastReload || (now - parseInt(lastReload)) > 30000) {
                    sessionStorage.setItem('last_version_sync', now.toString());
                    window.location.reload();
                }
            }
        };

        window.addEventListener('error', handleError);

        // Also listen for unhandled promise rejections (where many fetch errors end up)
        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason?.message || '';
            if (reason.toLowerCase().includes('server action') && reason.toLowerCase().includes('not found')) {
                const lastReload = sessionStorage.getItem('last_version_sync');
                const now = Date.now();
                if (!lastReload || (now - parseInt(lastReload)) > 30000) {
                    sessionStorage.setItem('last_version_sync', now.toString());
                    window.location.reload();
                }
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
