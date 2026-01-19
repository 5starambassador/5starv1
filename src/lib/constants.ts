export const GRADES = [
    'Pre-Mont',
    'Mont-1',
    'Mont-2',
    'Grade-1',
    'Grade-2',
    'Grade-3',
    'Grade-4',
    'Grade-5',
    'Grade-6',
    'Grade-7',
    'Grade-8',
    'Grade-9',
    'Grade-10',
    'Grade-11',
    'Grade-12'
] as const

export type Grade = typeof GRADES[number]
