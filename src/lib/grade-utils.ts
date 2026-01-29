import { GRADES } from './constants'

/**
 * Robustly parses a grade string from campus configuration.
 * Handles:
 * - Numeric strings (e.g. "1" -> "Grade 1")
 * - Legacy names (e.g. "LKG" -> "Mont-1")
 * - Spacing variations
 */
export function parseGrades(gradeString: string): string[] {
    if (!gradeString) return []
    const rawItems = gradeString.split(',').map(s => s.trim())
    const finalGrades: string[] = []

    rawItems.forEach(item => {
        let normalized = item

        // Handle pure numbers (e.g. "1,2,3")
        if (/^\d+$/.test(item)) {
            normalized = `Grade ${item}`
        }
        // Handle "Grade-1" or "Grade 1"
        else if (item.toLowerCase().startsWith('grade')) {
            const num = item.replace(/\D/g, '')
            if (num) normalized = `Grade ${num}`
        }
        // Specific mapping
        else if (item === 'Pre-KG') normalized = 'Pre-Mont'
        else if (item === 'LKG') normalized = 'Mont-1'
        else if (item === 'UKG') normalized = 'Mont-2'

        // Check if normalized matches any item in our master GRADES constants
        const match = (GRADES as readonly string[]).find(g =>
            g.replace(/[-\s]/g, '').toLowerCase() ===
            normalized.replace(/[-\s]/g, '').toLowerCase()
        )

        if (match) {
            finalGrades.push(match)
        } else {
            // If no match found in constants, keep original normalized but add to list if not empty
            if (normalized) finalGrades.push(normalized)
        }
    })

    // Remove duplicates
    return Array.from(new Set(finalGrades))
}

/**
 * Gets the list of supported grades for a specific campus.
 */
export function getGradesForCampus(campusId: number | string | undefined, campuses: any[]): string[] {
    if (!campusId || !campuses || campuses.length === 0) return []

    const selected = campuses.find(c => c.id.toString() === campusId.toString())
    if (!selected || !selected.grades) return []

    return parseGrades(selected.grades)
}

/**
 * Validates if a specific grade is supported by a campus.
 */
export function isGradeSupported(campusId: number | string | undefined, grade: string, campuses: any[]): boolean {
    const supportedGrades = getGradesForCampus(campusId, campuses)
    if (supportedGrades.length === 0) return true // Fallback to avoid breaking UX if data missing

    const normalizedTarget = grade.replace(/[-\s]/g, '').toLowerCase()
    return supportedGrades.some(g => g.replace(/[-\s]/g, '').toLowerCase() === normalizedTarget)
}
