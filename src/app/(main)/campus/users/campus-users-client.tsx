'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { UserTable } from '@/components/superadmin/UserTable'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import debounce from 'lodash/debounce'

interface CampusUsersClientProps {
    initialUsers: any[]
    query: string
    pagination?: {
        page: number
        pageSize: number
        totalCount: number
        totalPages: number
    } | null
}

export function CampusUsersClient({ initialUsers, query, pagination }: CampusUsersClientProps) {
    const router = useRouter()
    // Instant local state ensures 0ms typing delay
    const [searchTerm, setSearchTerm] = useState(query || '')

    // Keep local search term synchronized if the URL query changes
    useEffect(() => {
        setSearchTerm(query || '')
    }, [query])

    const debouncedSearch = useCallback(
        debounce((term: string) => {
            const params = new URLSearchParams(window.location.search)
            if (term.trim()) {
                params.set('q', term.trim())
            } else {
                params.delete('q')
            }
            params.set('page', '1') // Reset to page 1 on new search
            router.replace(`?${params.toString()}`)
        }, 500),
        [router]
    )

    const handleSearch = (term: string) => {
        setSearchTerm(term) // Instant local state update: typing is 100% fluid!
        debouncedSearch(term)
    }

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('page', page.toString())
        router.replace(`?${params.toString()}`)
    }

    const handlePageSizeChange = (newPageSize: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('pageSize', newPageSize.toString())
        params.set('page', '1') // Reset to page 1 on pageSize change
        router.replace(`?${params.toString()}`)
    }

    // Basic handlers (restricted for Campus Admins if needed)
    const handleAddUser = () => {
        toast.info("Create User feature for Campus Admin coming soon")
    }

    const handleBulkAdd = () => {
        toast.info("Bulk Upload feature coming soon")
    }

    const handleDelete = (userId: number) => {
        toast.error("Permission Denied: Only Super Admin can delete users")
    }

    const handleToggleStatus = (userId: number, currentStatus: string) => {
        toast.info("Status toggle requested")
    }

    return (
        <div>
            <UserTable
                users={initialUsers}
                pagination={pagination}
                searchTerm={searchTerm}
                onSearchChange={handleSearch}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                onAddUser={handleAddUser}
                onBulkAdd={handleBulkAdd}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                statusFilterValue={[]}
                onStatusFilterChange={() => { }}
                roleFilterValue={[]}
                onRoleFilterChange={() => { }}
                sourceFilterValue={[]}
                onSourceFilterChange={() => { }}
                campusFilterValue={[]}
                onCampusFilterChange={() => { }}
                referralsFilterValue={[]}
                onReferralsFilterChange={() => { }}
                onClearAllFilters={() => {
                    const params = new URLSearchParams(window.location.search)
                    params.delete('q')
                    params.delete('page')
                    router.replace(`?${params.toString()}`)
                }}
            />
        </div>
    )
}
