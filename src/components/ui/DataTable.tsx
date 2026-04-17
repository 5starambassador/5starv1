'use client'

import { useState, useMemo, useEffect, useRef, Fragment } from 'react'
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter, X, Check, MinusSquare, CheckSquare, Square } from 'lucide-react'
import { useClickOutside } from '@/hooks/use-click-outside'

interface Column<T> {
    header: string | React.ReactNode
    accessorKey: keyof T | ((row: T) => any)
    cell?: (row: T) => React.ReactNode
    sortable?: boolean
    filterable?: boolean
    filterOptions?: string[]
}

interface DataTableProps<T> {
    data: T[]
    columns: Column<T>[]
    searchPlaceholder?: string
    searchKey?: keyof T | (keyof T)[]
    pageSize?: number
    className?: string
    renderExpandedRow?: (row: T) => React.ReactNode
    searchValue?: string
    onSearchChange?: (value: string) => void
    enableMultiSelection?: boolean
    onSelectionChange?: (selectedItems: T[]) => void
    uniqueKey?: keyof T
    manualPagination?: boolean
    pageCount?: number
    rowCount?: number
    onPageChange?: (page: number) => void
    currentPage?: number
    emptyState?: React.ReactNode
    onRowClick?: (row: T) => void
}

export function DataTable<T>({
    data,
    columns,
    searchPlaceholder = 'Search...',
    searchKey,
    pageSize = 10,
    className = '',
    renderExpandedRow,
    searchValue,
    onSearchChange,
    enableMultiSelection = false,
    onSelectionChange,
    uniqueKey,
    manualPagination = false,
    pageCount,
    rowCount,
    onPageChange,
    currentPage: propCurrentPage,
    emptyState,
    onRowClick
}: DataTableProps<T>) {
    const [internalSearchTerm, setInternalSearchTerm] = useState('')

    // Determine effective search term (controlled vs uncontrolled)
    const searchTerm = searchValue !== undefined ? searchValue : internalSearchTerm
    const [internalPage, setInternalPage] = useState(1)
    const currentPage = propCurrentPage !== undefined ? propCurrentPage : internalPage

    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' })
    const [expandedRows, setExpandedRows] = useState<Set<any>>(new Set())

    // Selection State
    const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set())

    // Extended Filter State
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
    const [openFilterColumn, setOpenFilterColumn] = useState<number | null>(null)
    const [filterSearchTerm, setFilterSearchTerm] = useState('')
    const filterRef = useRef<HTMLDivElement>(null)

    useClickOutside(filterRef, () => setOpenFilterColumn(null))

    // Identify Items (Unique Key)
    const getItemId = (item: T, index: number): any => {
        if (uniqueKey) return item[uniqueKey]
        return index // Fallback to index if no unique key (not recommended for selection)
    }

    const getRawValue = (item: T, column: Column<T>): string => {
        if (typeof column.accessorKey === 'function') {
            return String(column.accessorKey(item))
        }
        const val = item[column.accessorKey]
        return val != null ? String(val) : ''
    }

    // Get unique values for a column (for filter dropdown)
    const getUniqueValues = (column: Column<T>) => {
        if (column.filterOptions) return column.filterOptions;
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
        if (!manualPagination) setInternalPage(1)
        if (onPageChange && manualPagination) onPageChange(1)
    }

    // Helper to check if a column has active filters
    const isColumnFiltered = (colIndex: number) => !!activeFilters[String(colIndex)]


    // Helper to get nested value
    const getNestedValue = (obj: any, path: string) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj)
    }

    // Filtering Logic
    const filteredData = useMemo(() => {
        return data.filter(item => {
            // 1. Global Search
            if (!manualPagination && searchKey && searchTerm) {
                const lowerTerm = searchTerm.toLowerCase()
                if (Array.isArray(searchKey)) {
                    const hasMatch = searchKey.some(key => {
                        const value = getNestedValue(item, String(key))
                        return (value ? String(value) : '').toLowerCase().includes(lowerTerm)
                    })
                    if (!hasMatch) return false
                } else {
                    const value = getNestedValue(item, String(searchKey))
                    if (!(value ? String(value) : '').toLowerCase().includes(lowerTerm)) {
                        return false
                    }
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

            // Support both string keys and function accessors
            const column = columns.find(c => String(c.header) === sortConfig.key || String(c.accessorKey) === sortConfig.key)
            const aValue = column && typeof column.accessorKey === 'function'
                ? column.accessorKey(a)
                : (a as any)[sortConfig.key as any]
            const bValue = column && typeof column.accessorKey === 'function'
                ? column.accessorKey(b)
                : (b as any)[sortConfig.key as any]

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
            return 0
        })
    }, [filteredData, sortConfig, columns])

    // Pagination
    const computedTotalPages = Math.ceil(sortedData.length / pageSize)
    const totalPages = manualPagination ? (pageCount || 1) : computedTotalPages

    // If manual pagination, we assume 'data' is already the slice for the current page
    const paginatedData = manualPagination ? sortedData : sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    // Selection Logic
    const handleSelectAll = () => {
        if (selectedRows.size === filteredData.length && filteredData.length > 0) {
            // Deselect all
            setSelectedRows(new Set())
            onSelectionChange?.([])
        } else {
            // Select all visible (filtered) data
            const allIds = filteredData.map((item, idx) => getItemId(item, idx))
            setSelectedRows(new Set(allIds))
            onSelectionChange?.(filteredData)
        }
    }

    const toggleRowSelection = (id: any, item: T) => {
        const next = new Set(selectedRows)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedRows(next)

        // Convert ID set back to Item array for callback
        // This is slow for large datasets, might want to optimize if list is huge
        if (onSelectionChange) {
            const selectedItems = data.filter((d, i) => next.has(getItemId(d, i)))
            onSelectionChange(selectedItems)
        }
    }

    // Clear selection when data changes significantly
    useEffect(() => {
        // Optional: clear selection on filter change? Keeping it for now.
    }, [filteredData])

    // Auto-reset pagination if current page becomes invalid
    useEffect(() => {
        if (!manualPagination && sortedData.length > 0) {
            const maxPage = Math.max(1, Math.ceil(sortedData.length / pageSize))
            if (currentPage > maxPage) {
                setInternalPage(1)
                onPageChange?.(1)
            }
        }
    }, [sortedData.length, pageSize, manualPagination, currentPage, onPageChange])


    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex justify-between items-end gap-4">
                {searchKey && (
                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-red transition-colors" size={16} />
                        <input
                            type="text"
                            id="table-global-search"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => {
                                const val = e.target.value
                                if (searchValue === undefined) setInternalSearchTerm(val)
                                onSearchChange?.(val)
                                if (!manualPagination) setInternalPage(1)
                            }}
                            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary-red/10 focus:border-primary-red"
                            aria-label={searchPlaceholder || "Search table"}
                            suppressHydrationWarning
                        />
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    if (searchValue === undefined) setInternalSearchTerm('')
                                    onSearchChange?.('')
                                    if (!manualPagination) setInternalPage(1)
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 hover:bg-gray-200 rounded-full transition-all"
                                title="Clear search"
                                aria-label="Clear search"
                                suppressHydrationWarning
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100/50 shadow-2xl shadow-gray-200/40 overflow-x-auto backdrop-blur-xl min-h-[300px]">
                <table className="w-full border-collapse block md:table">
                    <thead className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 hidden md:table-header-group">
                        <tr>
                            {enableMultiSelection && (
                                <th className="p-4 pl-6 w-4">
                                    {selectedRows.size > 0 && selectedRows.size === filteredData.length ? (
                                        <div
                                            onClick={handleSelectAll}
                                            className="cursor-pointer text-gray-400 hover:text-primary-red transition-colors"
                                            role="checkbox"
                                            aria-checked="true"
                                            aria-label="Select all rows"
                                            suppressHydrationWarning={true}
                                        >
                                            <CheckSquare size={20} />
                                        </div>
                                    ) : selectedRows.size > 0 ? (
                                        <div
                                            onClick={handleSelectAll}
                                            className="cursor-pointer text-gray-400 hover:text-primary-red transition-colors"
                                            role="checkbox"
                                            aria-checked="mixed"
                                            aria-label="Select all rows"
                                            suppressHydrationWarning={true}
                                        >
                                            <MinusSquare size={20} />
                                        </div>
                                    ) : (
                                        <div
                                            onClick={handleSelectAll}
                                            className="cursor-pointer text-gray-400 hover:text-primary-red transition-colors"
                                            role="checkbox"
                                            aria-checked="false"
                                            aria-label="Select all rows"
                                            suppressHydrationWarning={true}
                                        >
                                            <Square size={20} />
                                        </div>
                                    )}
                                </th>
                            )}

                            {columns.map((column, i) => {
                                const isFiltered = isColumnFiltered(i)
                                return (
                                    <th
                                        key={i}
                                        className={`
                                            px-1.5 py-3.5 text-left text-[11px] font-black uppercase tracking-tight text-gray-400 relative whitespace-nowrap group hover:bg-gray-50/80 transition-colors ${!enableMultiSelection && i === 0 ? 'pl-3' : ''}
                                            ${isFiltered ? 'text-red-600 bg-red-50/30' : ''}
                                        `}
                                    >
                                        <div className="flex items-center gap-3 justify-between">
                                            <div
                                                className={`${column.sortable ? 'cursor-pointer hover:text-gray-900 select-none' : ''} flex items-center gap-2`}
                                                onClick={() => {
                                                    if (column.sortable) {
                                                        const sortKey = typeof column.accessorKey === 'string' ? column.accessorKey : String(column.header)
                                                        handleSort(sortKey)
                                                    }
                                                }}
                                            >
                                                {column.header}
                                                {column.sortable && <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400" />}
                                            </div>

                                            {column.filterable && (
                                                <div className="relative">
                                                    {openFilterColumn === i ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setOpenFilterColumn(null)
                                                                setFilterSearchTerm('')
                                                            }}
                                                            className={`p-2 rounded-lg transition-all ${isFiltered ? 'bg-red-100 text-red-600 shadow-sm' : 'bg-white shadow-sm text-gray-500'}`}
                                                            aria-label={`Close ${typeof column.header === 'string' ? column.header : 'column'} filter`}
                                                            aria-expanded="true"
                                                            suppressHydrationWarning
                                                        >
                                                            <Filter size={14} fill={isFiltered ? "currentColor" : "none"} strokeWidth={2.5} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setOpenFilterColumn(i)
                                                                setFilterSearchTerm('')
                                                            }}
                                                            className={`p-2 rounded-lg transition-all ${isFiltered ? 'bg-red-100 text-red-600 shadow-sm' : 'hover:bg-white hover:shadow-sm text-gray-300 hover:text-gray-500'}`}
                                                            aria-label={`Open ${typeof column.header === 'string' ? column.header : 'column'} filter`}
                                                            aria-expanded="false"
                                                            suppressHydrationWarning
                                                        >
                                                            <Filter size={14} fill={isFiltered ? "currentColor" : "none"} strokeWidth={2.5} />
                                                        </button>
                                                    )}


                                                    {/* Filter Dropdown Popover */}
                                                    {openFilterColumn === i && (
                                                        <div
                                                            ref={filterRef}
                                                            className="absolute top-full right-0 mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl shadow-gray-200/50 border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden min-w-[240px]"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                                                <span className="text-xs font-black uppercase tracking-wider text-gray-500">Filter {column.header}</span>
                                                                <button onClick={() => setOpenFilterColumn(null)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Close filter" suppressHydrationWarning><X size={16} /></button>
                                                            </div>
                                                            <div className="p-3 border-b border-gray-50">
                                                                <div className="relative">
                                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search values..."
                                                                        className="w-full pl-9 pr-3 py-2 text-xs font-bold border-none bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 text-gray-700 placeholder:text-gray-400"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        value={filterSearchTerm}
                                                                        onChange={(e) => setFilterSearchTerm(e.target.value)}
                                                                        autoFocus
                                                                        aria-label="Search filter values"
                                                                        suppressHydrationWarning
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                                                {getUniqueValues(column)
                                                                    .filter(val => val.toLowerCase().includes(filterSearchTerm.toLowerCase()))
                                                                    .map(val => (
                                                                        <label key={val} className="flex items-center gap-3 p-2.5 hover:bg-red-50/50 rounded-xl cursor-pointer text-sm font-medium text-gray-700 select-none transition-colors group">
                                                                            <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all ${activeFilters[String(i)]?.includes(val) ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-500/30' : 'border-gray-200 bg-white group-hover:border-red-300'}`}>
                                                                                {activeFilters[String(i)]?.includes(val) && <Check size={12} strokeWidth={4} />}
                                                                            </div>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="hidden"
                                                                                checked={activeFilters[String(i)]?.includes(val) || false}
                                                                                onChange={() => toggleFilterValue(i, val)}
                                                                                suppressHydrationWarning
                                                                            />
                                                                            <span className="truncate flex-1">{val}</span>
                                                                        </label>
                                                                    ))}
                                                                {getUniqueValues(column).filter(val => val.toLowerCase().includes(filterSearchTerm.toLowerCase())).length === 0 && (
                                                                    <div className="p-8 text-center">
                                                                        <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">No matches</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-3 border-t border-gray-50 bg-gray-50/30">
                                                                <button
                                                                    onClick={() => {
                                                                        const { [String(i)]: _, ...rest } = activeFilters
                                                                        setActiveFilters(rest)
                                                                        setOpenFilterColumn(null)
                                                                    }}
                                                                    className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-50/80 rounded-xl transition-all active:scale-95"
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
                            paginatedData.map((row, i) => {
                                const rowId = getItemId(row, (currentPage - 1) * pageSize + i) // Must map to global ID
                                const isExpanded = expandedRows.has(rowId)
                                const isSelected = selectedRows.has(rowId)

                                return (
                                    <Fragment key={rowId}>
                                        <tr
                                            onClick={() => {
                                                if (onRowClick) {
                                                    onRowClick(row)
                                                }
                                                if (renderExpandedRow) {
                                                    const next = new Set(expandedRows)
                                                    if (expandedRows.has(rowId)) next.delete(rowId)
                                                    else next.add(rowId)
                                                    setExpandedRows(next)
                                                }
                                            }}
                                            className={`
                                                group block md:table-row bg-white rounded-[24px] md:rounded-none border border-gray-100 md:border-b md:border-x-0 md:border-t-0 mb-4 md:mb-0 shadow-sm md:shadow-none 
                                                hover:bg-gradient-to-r hover:from-red-50/30 hover:to-white hover:scale-[1.002] hover:shadow-lg hover:shadow-gray-200/20 hover:z-10 relative transition-all duration-300
                                                ${renderExpandedRow ? 'cursor-pointer' : ''}
                                                ${isSelected ? 'bg-red-50/30' : ''}
                                            `}
                                        >
                                            {enableMultiSelection && (
                                                <td className="hidden md:table-cell p-4 pl-6" onClick={(e) => e.stopPropagation()}>
                                                    {isSelected ? (
                                                        <div
                                                            onClick={() => toggleRowSelection(rowId, row)}
                                                            className="cursor-pointer transition-colors text-red-600"
                                                            role="checkbox"
                                                            aria-checked="true"
                                                            aria-label="Select row"
                                                            suppressHydrationWarning={true}
                                                        >
                                                            <CheckSquare size={20} />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => toggleRowSelection(rowId, row)}
                                                            className="cursor-pointer transition-colors text-gray-300 hover:text-gray-400"
                                                            role="checkbox"
                                                            aria-checked="false"
                                                            aria-label="Select row"
                                                            suppressHydrationWarning={true}
                                                        >
                                                            <Square size={20} />
                                                        </div>
                                                    )}
                                                </td>
                                            )}

                                            {columns.map((column, j) => (
                                                <td
                                                    key={j}
                                                    className={`block md:table-cell px-2 py-3 text-sm font-medium text-gray-600 border-b last:border-0 md:border-none md:first:pl-4 flex justify-between items-center md:block ${!enableMultiSelection && j === 0 ? 'md:first:pl-4' : ''}`}
                                                >
                                                    <span className="md:hidden font-black text-gray-400 text-[10px] uppercase tracking-widest">{column.header}</span>
                                                    <div className="text-right md:text-left w-full md:w-auto pl-4 md:pl-0 group-hover:text-gray-900 transition-colors">
                                                        {column.cell
                                                            ? column.cell(row)
                                                            : typeof column.accessorKey === 'function'
                                                                ? column.accessorKey(row)
                                                                : ((row as any)[column.accessorKey] != null ? ((row as any)[column.accessorKey] as any) : 'N/A')}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        {isExpanded && renderExpandedRow && (
                                            <tr className="block md:table-row">
                                                <td colSpan={columns.length + (enableMultiSelection ? 1 : 0)} className="block md:table-cell p-0 border-b border-gray-100">
                                                    <div className="bg-gray-50/50 p-6 shadow-inner">
                                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                                            {renderExpandedRow!(row)}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (enableMultiSelection ? 1 : 0)} className="p-24 text-center block md:table-cell">
                                    {emptyState ? (
                                        emptyState
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="p-6 bg-gray-50 rounded-full text-gray-300">
                                                <Search size={48} strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-lg font-black text-gray-900 tracking-tight">No records found</p>
                                                <p className="text-sm font-medium text-gray-400">Try adjusting your search or filters.</p>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between p-4 mt-6 bg-white/50 backdrop-blur-sm rounded-[24px] border border-gray-100 gap-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">
                    SHOWING <span className="text-gray-900 mx-1">
                        {(currentPage - 1) * pageSize + 1}
                        {' '}TO{' '}
                        {manualPagination ? Math.min(currentPage * pageSize, (rowCount || pageCount! * pageSize)) : Math.min(currentPage * pageSize, sortedData.length)}
                    </span> OF <span className="text-gray-900 mx-1">{(manualPagination || (rowCount && rowCount > sortedData.length)) ? rowCount : sortedData.length}</span> RESULTS
                </p>

                <div className="flex items-center gap-3">
                        <button
                        onClick={(e) => {
                            e.preventDefault()
                            const next = Math.max(1, currentPage - 1)
                            if (!manualPagination) setInternalPage(next)
                            onPageChange?.(next)
                        }}
                        disabled={currentPage === 1}
                        className={`p-2.5 rounded-xl border transition-all duration-200 ${currentPage === 1
                            ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600 hover:shadow-lg hover:shadow-red-500/10 active:scale-95'
                            }`}
                        aria-label="Previous page"
                        suppressHydrationWarning
                    >
                        <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>

                    {/* Mobile: Simple Page Indicator */}
                    <div className="md:hidden px-4 py-2 bg-gray-100/50 rounded-xl border border-gray-200">
                        <span className="text-[10px] font-black text-gray-600">PAGE {currentPage} / {totalPages}</span>
                    </div>

                    {/* Desktop: Page Numbers with Dynamic Window */}
                    <div className="hidden md:flex items-center gap-1.5">
                        {(() => {
                            const pages: (number | string)[] = []
                            if (totalPages <= 7) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i)
                            } else {
                                pages.push(1)
                                if (currentPage > 3) pages.push('...')

                                let start = Math.max(2, currentPage - 1)
                                let end = Math.min(totalPages - 1, currentPage + 1)

                                if (currentPage <= 3) end = 4
                                if (currentPage >= totalPages - 2) start = totalPages - 3

                                for (let i = start; i <= end; i++) pages.push(i)
                                if (currentPage < totalPages - 2) pages.push('...')
                                pages.push(totalPages)
                            }

                        return pages.map((p, i) => {
                            if (typeof p !== 'number') {
                                return <span key={i} className="px-2 text-gray-400 font-bold tracking-widest">...</span>
                            }

                            if (currentPage === p) {
                                return (
                                    <button
                                        key={i}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            if (!manualPagination) setInternalPage(p)
                                            onPageChange?.(p)
                                        }}
                                        className="w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200 bg-gradient-to-br from-red-600 to-red-700 text-white shadow-xl shadow-red-600/20 scale-105"
                                        aria-current="page"
                                        suppressHydrationWarning
                                    >
                                        {p}
                                    </button>
                                )
                            }

                            return (
                                <button
                                    key={i}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        if (!manualPagination) setInternalPage(p)
                                        onPageChange?.(p)
                                    }}
                                    className="w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
                                    suppressHydrationWarning
                                >
                                    {p}
                                </button>
                            )
                        })
                    })()}
                </div>

                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            const next = Math.min(totalPages, currentPage + 1)
                            if (!manualPagination) setInternalPage(next)
                            onPageChange?.(next)
                        }}
                        disabled={currentPage === totalPages}
                        className={`p-2.5 rounded-xl border transition-all duration-200 ${currentPage === totalPages
                            ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600 hover:shadow-lg hover:shadow-red-500/10 active:scale-95'
                            }`}
                        aria-label="Next page"
                        suppressHydrationWarning
                    >
                        <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </div>
    )
}
