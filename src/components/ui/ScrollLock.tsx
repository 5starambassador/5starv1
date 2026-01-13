'use client'

import { useEffect } from 'react'

export function ScrollLock() {
    useEffect(() => {
        // Save original overflow style
        const originalStyle = window.getComputedStyle(document.body).overflow
        const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow

        // Lock body and html scroll
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'

        // Restoration on cleanup
        return () => {
            document.body.style.overflow = originalStyle
            document.documentElement.style.overflow = originalHtmlStyle
        }
    }, [])

    return null
}
