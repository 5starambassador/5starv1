import { useEffect, useCallback, RefObject } from 'react'

/**
 * Hook that alerts clicks outside of the passed ref
 */
export function useClickOutside(ref: RefObject<HTMLElement | null>, handler: () => void) {
    const listener = useCallback(
        (event: MouseEvent | TouchEvent) => {
            // Do nothing if clicking ref's element or descendent elements
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return
            }
            handler()
        },
        [ref, handler]
    )

    useEffect(() => {
        document.addEventListener('mousedown', listener)
        document.addEventListener('touchstart', listener)

        return () => {
            document.removeEventListener('mousedown', listener)
            document.removeEventListener('touchstart', listener)
        }
    }, [listener])
}
