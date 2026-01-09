'use client'

import React, { useState } from 'react'
import { UserTable } from '@/components/superadmin/UserTable'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CampusUsersClientProps {
    initialUsers: any[]
    query: string
}

export function CampusUsersClient({ initialUsers, query }: CampusUsersClientProps) {
    const [users, setUsers] = useState(initialUsers)
    const router = useRouter()

    const handleSearch = (term: string) => {
        // Implement debounced search or just route update
        const params = new URLSearchParams(window.location.search)
        if (term) {
            params.set('q', term)
        } else {
            params.delete('q')
        }
        router.replace(`?${params.toString()}`)
    }

    // Basic handlers (restricted for Campus Admins if needed)
    const handleAddUser = () => {
        // Redirect to a create user page or open modal
        // ideally reusing existing modals but for now just a toast if not fully implemented for campus
        toast.info("Create User feature for Campus Admin coming soon")
    }

    const handleBulkAdd = () => {
        toast.info("Bulk Upload feature coming soon")
    }

    const handleDelete = (userId: number) => {
        toast.error("Permission Denied: Only Super Admin can delete users")
    }

    const handleToggleStatus = (userId: number, currentStatus: string) => {
        // Allow status toggle or restrict? assuming allow for now
        toast.info("Status toggle requested")
    }

    return (
        <div>
            <UserTable
                users={users}
                searchTerm={query}
                onSearchChange={handleSearch}
                onAddUser={handleAddUser}
                onBulkAdd={handleBulkAdd}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
            />
        </div>
    )
}
