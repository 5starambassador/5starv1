export const ADMIN_ROLES = {
    SUPER_ADMIN: 'Super Admin',
    CAMPUS_HEAD: 'Campus Head',
    FINANCE_ADMIN: 'Finance Admin',
    ADMISSION_ADMIN: 'Admission Admin',
    CAMPUS_ADMIN: 'Campus Admin',
} as const

export const AMBASSADOR_ROLES = {
    STAFF: 'Staff',
    PARENT: 'Parent',
} as const

export const ALL_ROLES = {
    ...ADMIN_ROLES,
    ...AMBASSADOR_ROLES,
} as const

export type AdminRole = typeof ADMIN_ROLES[keyof typeof ADMIN_ROLES]
export type AmbassadorRole = typeof AMBASSADOR_ROLES[keyof typeof AMBASSADOR_ROLES]
export type UserRole = typeof ALL_ROLES[keyof typeof ALL_ROLES]

export const ROLE_HIERARCHY: Record<UserRole, number> = {
    [ADMIN_ROLES.SUPER_ADMIN]: 100,
    [ADMIN_ROLES.CAMPUS_HEAD]: 80,
    [ADMIN_ROLES.FINANCE_ADMIN]: 70,
    [ADMIN_ROLES.ADMISSION_ADMIN]: 60,
    [ADMIN_ROLES.CAMPUS_ADMIN]: 50,
    [AMBASSADOR_ROLES.STAFF]: 20,
    [AMBASSADOR_ROLES.PARENT]: 10,
}
