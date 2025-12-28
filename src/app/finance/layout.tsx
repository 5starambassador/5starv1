import React from 'react'
import { getCurrentUser } from '@/lib/auth-service'
import { getMyPermissions } from '@/lib/permission-service'
import { redirect } from 'next/navigation'
import FinanceLayoutClient from './finance-layout-client'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser()
    const permissions = await getMyPermissions()

    if (!user) {
        redirect('/')
    }

    return (
        <FinanceLayoutClient userRole={user.role} permissions={permissions}>
            {children}
        </FinanceLayoutClient>
    )
}
