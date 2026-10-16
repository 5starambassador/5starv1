'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { UserTable } from '@/components/superadmin/UserTable'
import { toast } from 'sonner'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
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
    campuses?: { id: number; campusName: string }[]
}

export function CampusUsersClient({ initialUsers, query, pagination, campuses = [] }: CampusUsersClientProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Instant local state ensures 0ms typing delay
    const [searchTerm, setSearchTerm] = useState(query || '')

    // Keep local search term synchronized if the URL query changes
    useEffect(() => {
        setSearchTerm(query || '')
    }, [query])

    // Filter states initialized from URL params
    const [statusFilter, setStatusFilter] = useState<string[]>(() => {
        const urlStatus = searchParams.get('status')
        return urlStatus ? urlStatus.split(',').filter(Boolean) : []
    })
    const [roleFilter, setRoleFilter] = useState<string[]>(() => {
        const urlRole = searchParams.get('role')
        return urlRole ? urlRole.split(',').filter(Boolean) : []
    })
    const [sourceFilter, setSourceFilter] = useState<string[]>(() => {
        const urlSource = searchParams.get('source')
        return urlSource ? urlSource.split(',').filter(Boolean) : []
    })
    const [campusFilter, setCampusFilter] = useState<string[]>(() => {
        const urlCampus = searchParams.get('campus')
        return urlCampus ? urlCampus.split(',').filter(Boolean) : []
    })
    const [referralsFilter, setReferralsFilter] = useState<string[]>(() => {
        const urlReferrals = searchParams.get('referrals')
        return urlReferrals ? urlReferrals.split(',').filter(Boolean) : []
    })

    // Keep filter states synchronized when URL changes (e.g. Back/Forward)
    useEffect(() => {
        const urlStatus = searchParams.get('status')
        setStatusFilter(urlStatus ? urlStatus.split(',').filter(Boolean) : [])

        const urlRole = searchParams.get('role')
        setRoleFilter(urlRole ? urlRole.split(',').filter(Boolean) : [])

        const urlSource = searchParams.get('source')
        setSourceFilter(urlSource ? urlSource.split(',').filter(Boolean) : [])

        const urlCampus = searchParams.get('campus')
        setCampusFilter(urlCampus ? urlCampus.split(',').filter(Boolean) : [])

        const urlReferrals = searchParams.get('referrals')
        setReferralsFilter(urlReferrals ? urlReferrals.split(',').filter(Boolean) : [])
    }, [searchParams])

    const debouncedSearch = useCallback(
        debounce((term: string) => {
            const params = new URLSearchParams(window.location.search)
            if (term.trim()) {
                params.set('q', term.trim())
            } else {
                params.delete('q')
            }
            params.set('page', '1') // Reset to page 1 on new search
            router.replace(`${pathname}?${params.toString()}`)
        }, 500),
        [router, pathname]
    )

    const handleSearch = (term: string) => {
        setSearchTerm(term)
        debouncedSearch(term)
    }

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('page', page.toString())
        router.replace(`${pathname}?${params.toString()}`)
    }

    const handlePageSizeChange = (newPageSize: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('pageSize', newPageSize.toString())
        params.set('page', '1')
        router.replace(`${pathname}?${params.toString()}`)
    }

    const handleStatusFilterChange = (status: string[] | ((prev: string[]) => string[])) => {
        const newStatus = typeof status === 'function' ? status(statusFilter) : status
        setStatusFilter(newStatus)
        const params = new URLSearchParams(window.location.search)
        if (newStatus.length > 0) params.set('status', newStatus.join(','))
        else params.delete('status')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleRoleFilterChange = (role: string[] | ((prev: string[]) => string[])) => {
        const newRole = typeof role === 'function' ? role(roleFilter) : role
        setRoleFilter(newRole)
        const params = new URLSearchParams(window.location.search)
        if (newRole.length > 0) params.set('role', newRole.join(','))
        else params.delete('role')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleSourceFilterChange = (source: string[] | ((prev: string[]) => string[])) => {
        const newSource = typeof source === 'function' ? source(sourceFilter) : source
        setSourceFilter(newSource)
        const params = new URLSearchParams(window.location.search)
        if (newSource.length > 0) params.set('source', newSource.join(','))
        else params.delete('source')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleCampusFilterChange = (campus: string[] | ((prev: string[]) => string[])) => {
        const newCampus = typeof campus === 'function' ? campus(campusFilter) : campus
        setCampusFilter(newCampus)
        const params = new URLSearchParams(window.location.search)
        if (newCampus.length > 0) params.set('campus', newCampus.join(','))
        else params.delete('campus')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleReferralsFilterChange = (refs: string[] | ((prev: string[]) => string[])) => {
        const newRefs = typeof refs === 'function' ? refs(referralsFilter) : refs
        setReferralsFilter(newRefs)
        const params = new URLSearchParams(window.location.search)
        if (newRefs.length > 0) params.set('referrals', newRefs.join(','))
        else params.delete('referrals')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleClearAllFilters = () => {
        setRoleFilter([])
        setSourceFilter([])
        setStatusFilter([])
        setCampusFilter([])
        setReferralsFilter([])
        const params = new URLSearchParams(window.location.search)
        params.delete('role')
        params.delete('source')
        params.delete('status')
        params.delete('campus')
        params.delete('referrals')
        params.delete('q')
        params.delete('page')
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
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
                campuses={campuses}
                statusFilterValue={statusFilter}
                onStatusFilterChange={handleStatusFilterChange}
                roleFilterValue={roleFilter}
                onRoleFilterChange={handleRoleFilterChange}
                sourceFilterValue={sourceFilter}
                onSourceFilterChange={handleSourceFilterChange}
                campusFilterValue={campusFilter}
                onCampusFilterChange={handleCampusFilterChange}
                referralsFilterValue={referralsFilter}
                onReferralsFilterChange={handleReferralsFilterChange}
                onClearAllFilters={handleClearAllFilters}
                showCampusFilter={false}
            />
        </div>
    )
}

