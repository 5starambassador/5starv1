'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter, X, Check } from 'lucide-react'

interface Column<T> {
    header: string
    accessorKey: keyof T | ((row: T) => any)
    cell?: (row: T) => React.ReactNode
    sortable?: boolean
    filterable?: boolean
}

interface DataTableProps<T> {
    data: T[]
    columns: Column<T>[]
    searchPlaceholder?: string
    searchKey?: keyof T
    pageSize?: number
    className?: string
}

export function DataTable<T>({
    data,
    columns,
    searchPlaceholder = 'Search...',
    searchKey,
    pageSize = 10,
    className = ''
}: DataTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [sortConfig, setSortConfig] = useState<{ key: keyof T | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' })

    // Extended Filter State
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
    const [openFilterColumn, setOpenFilterColumn] = useState<number | null>(null)
    const [filterSearchTerm, setFilterSearchTerm] = useState('')
    const filterRef = useRef<HTMLDivElement>(null)

    // Close filter dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setOpenFilterColumn(null)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const getRawValue = (item: T, column: Column<T>): string => {
        if (typeof column.accessorKey === 'function') {
            return String(column.accessorKey(item))
        }
        const val = item[column.accessorKey]
        return val != null ? String(val) : ''
    }

    // Get unique values for a column (for filter dropdown)
    const getUniqueValues = (column: Column<T>) => {
        const values = new Set<string>()
        data.forEach(item => {
            const val = getRawValue(item, column)
            if (val) values.add(val)
        })
        return Array.from(values).sort()
    }

    // Toggle a specific value in a filter
    const toggleFilterValue = (colIndex: number, value: string) => {
        const colKey = String(colIndex)
        setActiveFilters(prev => {
            const current = prev[colKey] || []
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value]

            // If empty, remove the key entirely
            if (updated.length === 0) {
                const { [colKey]: _, ...rest } = prev
                return rest
            }
            return { ...prev, [colKey]: updated }
        })
        setCurrentPage(1)
    }

    // Helper to check if a column has active filters
    const isColumnFiltered = (colIndex: number) => !!activeFilters[String(colIndex)]

    // Filtering Logic
    const filteredData = useMemo(() => {
        return data.filter(item => {
            // 1. Global Search
            if (searchKey && searchTerm) {
                const value = item[searchKey]
                if (!(value ? String(value) : '').toLowerCase().includes(searchTerm.toLowerCase())) {
                    return false
                }
            }

            // 2. Column Filters
            for (const [colIndex, selectedValues] of Object.entries(activeFilters)) {
                const column = columns[parseInt(colIndex)]
                const itemValue = getRawValue(item, column)
                if (!selectedValues.includes(itemValue)) {
                    return false
                }
            }

            return true
        })
    }, [data, searchTerm, searchKey, activeFilters, columns])

    // Sorting
    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            if (!sortConfig.key) return 0
            const aValue = a[sortConfig.key]
            const bValue = b[sortConfig.key]
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [filteredData, sortConfig])

    // Pagination
    const totalPages = Math.ceil(sortedData.length / pageSize)
    const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const handleSort = (key: keyof T) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {searchKey && (
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-4 focus:ring-red-600/5 focus:border-red-600 transition-all text-sm shadow-sm font-medium"
                    />
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden premium-border" style={{ minHeight: '300px' }}>
                <table className="w-full border-collapse block md:table">
                    <thead className="bg-gray-50/50 hidden md:table-header-group">
                        <tr>
                            {columns.map((column, i) => {
                                const isFiltered = isColumnFiltered(i)
                                return (
                                    <th
                                        key={i}
                                        className={`
                                            p-5 text-left text-[11px] font-black uppercase tracking-widest border-b border-gray-100 bg-gray-50/50 relative whitespace-nowrap
                                            ${isFiltered ? 'text-red-700' : 'text-gray-500'}
                                        `}
                                    >
                                        <div className="flex items-center gap-2 justify-between">
                                            <div
                                                className={`${column.sortable ? 'cursor-pointer hover:text-gray-900 select-none' : ''} flex items-center gap-2`}
                                                onClick={() => column.sortable && typeof column.accessorKey === 'string' && handleSort(column.accessorKey as keyof T)}
                                            >
                                                {column.header}
                                                {column.sortable && <ArrowUpDown size={12} className="opacity-50" />}
                                            </div>

                                            {column.filterable && (
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setOpenFilterColumn(openFilterColumn === i ? null : i)
                                                            setFilterSearchTerm('')
                                                        }}
                                                        className={`p-1.5 rounded-md transition-colors ${isFiltered ? 'bg-red-50 text-red-600' : 'hover:bg-gray-200 text-gray-400'}`}
                                                        suppressHydrationWarning
                                                    >
                                                        <Filter size={14} fill={isFiltered ? "currentColor" : "none"} />
                                                    </button>

                                                    {/* Filter Dropdown Popover */}
                                                    {openFilterColumn === i && (
                                                        <div
                                                            ref={filterRef}
                                                            className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-200"
                                                            style={{ minWidth: '200px' }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="p-3 border-b border-gray-50 flex justify-between items-center">
                                                                <span className="text-xs font-bold text-gray-500">Filter {column.header}</span>
                                                                <button onClick={() => setOpenFilterColumn(null)} className="text-gray-400 hover:text-gray-600" suppressHydrationWarning><X size={14} /></button>
                                                            </div>
                                                            <div className="p-2 border-b border-gray-50">
                                                                <div className="relative">
                                                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search..."
                                                                        className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        value={filterSearchTerm}
                                                                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                                                                        autoFocus
                                                                        suppressHydrationWarning
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                                                {getUniqueValues(column)
                                                                    .filter(val => val.toLowerCase().includes(filterSearchTerm.toLowerCase()))
                                                                    .map(val => (
                                                                        <label key={val} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer text-sm text-gray-700 select-none">
                                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${activeFilters[String(i)]?.includes(val) ? 'bg-red-600 border-red-600 text-white' : 'border-gray-300 bg-white'}`}>
                                                                                {activeFilters[String(i)]?.includes(val) && <Check size={10} strokeWidth={4} />}
                                                                            </div>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="hidden"
                                                                                checked={activeFilters[String(i)]?.includes(val) || false}
                                                                                onChange={() => toggleFilterValue(i, val)}
                                                                                suppressHydrationWarning
                                                                            />
                                                                            <span className="truncate">{val}</span>
                                                                        </label>
                                                                    ))}
                                                                {getUniqueValues(column).filter(val => val.toLowerCase().includes(filterSearchTerm.toLowerCase())).length === 0 && (
                                                                    <div className="p-4 text-center text-xs text-gray-400 font-medium">No values found</div>
                                                                )}
                                                            </div>
                                                            <div className="p-2 border-t border-gray-50 bg-gray-50/30">
                                                                <button
                                                                    onClick={() => {
                                                                        const { [String(i)]: _, ...rest } = activeFilters
                                                                        setActiveFilters(rest)
                                                                        setOpenFilterColumn(null)
                                                                    }}
                                                                    className="w-full py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    suppressHydrationWarning
                                                                >
                                                                    Clear Filter
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody className="block md:table-row-group p-4 md:p-0">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, i) => (
                                <tr key={i} className="group block md:table-row bg-white rounded-2xl md:rounded-none border border-gray-100 md:border-b md:border-x-0 md:border-t-0 mb-4 md:mb-0 shadow-sm md:shadow-none hover:bg-gray-50/80 transition-all">
                                    {columns.map((column, j) => (
                                        <td
                                            key={j}
                                            className="block md:table-cell p-4 md:p-5 text-sm text-gray-600 border-b last:border-0 md:border-none flex justify-between items-center md:block"
                                        >
                                            <span className="md:hidden font-bold text-gray-400 text-xs uppercase tracking-wider">{column.header}</span>
                                            <div className="text-right md:text-left w-full md:w-auto pl-4 md:pl-0">
                                                {column.cell
                                                    ? column.cell(row)
                                                    : typeof column.accessorKey === 'function'
                                                        ? column.accessorKey(row)
                                                        : (row[column.accessorKey] != null ? (row[column.accessorKey] as any) : 'N/A')}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="p-16 text-center block md:table-cell">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-gray-50 rounded-full text-gray-300">
                                            <Search size={32} />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400">No matching records found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px' }}>
                    <p style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        SHOWING <span style={{ color: '#111827' }}>{(currentPage - 1) * pageSize + 1} TO {Math.min(currentPage * pageSize, sortedData.length)}</span> OF <span style={{ color: '#111827' }}>{sortedData.length}</span>
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '10px',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                background: 'white',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.4 : 1
                            }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        background: currentPage === i + 1 ? '#CC0000' : 'transparent',
                                        color: currentPage === i + 1 ? 'white' : '#6B7280',
                                        border: 'none',
                                        boxShadow: currentPage === i + 1 ? '0 4px 6px -1px rgba(204, 0, 0, 0.4)' : 'none'
                                    }}
                                    suppressHydrationWarning
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '10px',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB',
                                background: 'white',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage === totalPages ? 0.4 : 1
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
