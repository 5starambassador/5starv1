'use client'

import dynamic from 'next/dynamic'

// Dynamic imports for bundle optimization
const CommandPalette = dynamic(() => import('@/components/superadmin/CommandPalette').then(m => m.CommandPalette), { ssr: false })
const InstallPrompt = dynamic(() => import('@/components/InstallPrompt').then(m => m.InstallPrompt), { ssr: false })
const MobileConfig = dynamic(() => import('@/components/MobileConfig').then(m => m.MobileConfig), { ssr: false })
const OfflineAlert = dynamic(() => import('@/components/OfflineAlert').then(m => m.OfflineAlert), { ssr: false })
const NavigationLoader = dynamic(() => import('@/components/NavigationLoader').then(m => m.NavigationLoader), { ssr: false })

/**
 * LayoutOverlays
 * 
 * This component acts as a container for all dynamically loaded UI elements
 * that should only run on the client. Moving these here resolves issues with
 * using "ssr: false" directly in Server Components (like layout.tsx).
 */
export function LayoutOverlays() {
    return (
        <>
            <CommandPalette />
            <InstallPrompt />
            <MobileConfig />
            <OfflineAlert />
            <NavigationLoader />
        </>
    )
}
