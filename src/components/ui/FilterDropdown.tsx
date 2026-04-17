import { useState, useEffect } from 'react'
import { Search, X, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react'

interface FilterDropdownProps {
    label: string
    activeValues: string[] // e.g. ['Active', 'Pending'] or []
    options: string[]
    onApply: (vals: string[]) => void
    onClose: () => void
    onSort?: (dir: 'asc' | 'desc') => void
}

export function FilterDropdown({
    label,
    activeValues,
    options,
    onApply,
    onClose,
    onSort
}: FilterDropdownProps) {
    const [search, setSearch] = useState('')
    const [tempSelected, setTempSelected] = useState<string[]>(activeValues)

    // reset temp on open
    useEffect(() => { setTempSelected(activeValues) }, [activeValues])

    const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()))

    const toggleOption = (opt: string) => {
        if (tempSelected.includes(opt)) {
            setTempSelected(tempSelected.filter(v => v !== opt))
        } else {
            setTempSelected([...tempSelected, opt])
        }
    }

    const handleSelectAll = () => {
        if (tempSelected.length === filteredOptions.length) setTempSelected([])
        else setTempSelected(filteredOptions)
    }

    return (
        <div
            className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
        >
            {/* Header / Search */}
            <div className="p-3 bg-gray-50 border-b border-gray-100 space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Filter {label}</span>
                    <button onClick={onClose} aria-label="Close Filters"><X size={14} className="text-gray-400 hover:text-red-500" /></button>
                </div>
                <div className="relative">
                    <Search size={12} className="absolute left-2 top-2 text-gray-400" />
                    <input
                        className="w-full pl-7 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Sort Options */}
            {onSort && (
                <div className="flex border-b border-gray-100 divide-x divide-gray-100">
                    <button onClick={() => onSort('asc')} className="flex-1 py-2 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex justify-center items-center gap-1">
                        <ArrowUp size={12} /> A-Z
                    </button>
                    <button onClick={() => onSort('desc')} className="flex-1 py-2 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 flex justify-center items-center gap-1">
                        <ArrowDown size={12} /> Z-A
                    </button>
                </div>
            )}

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto">
                <button
                    onClick={handleSelectAll}
                    className="w-full px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 text-left border-b border-gray-50"
                >
                    {tempSelected.length === filteredOptions.length ? 'Unselect All' : 'Select All'}
                </button>
                {filteredOptions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">No results</div>
                ) : (
                    filteredOptions.map(opt => {
                        const isSelected = tempSelected.includes(opt)
                        return (
                            <div key={opt}>
                                {isSelected ? (
                                    <div
                                        onClick={() => toggleOption(opt)}
                                        className="px-4 py-2 text-xs flex items-center gap-2 cursor-pointer hover:bg-gray-50 bg-indigo-50/50"
                                        role="checkbox"
                                        aria-checked="true"
                                        aria-label={`Select ${opt}`}
                                    >
                                        <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors bg-indigo-600 border-indigo-600">
                                            <CheckCircle size={10} className="text-white" />
                                        </div>
                                        <span className="font-semibold text-gray-900">{opt}</span>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => toggleOption(opt)}
                                        className="px-4 py-2 text-xs flex items-center gap-2 cursor-pointer hover:bg-gray-50"
                                        role="checkbox"
                                        aria-checked="false"
                                        aria-label={`Select ${opt}`}
                                    >
                                        <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors border-gray-300"></div>
                                        <span className="text-gray-600">{opt}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-2 bg-gray-50 border-t border-gray-100 flex justify-between gap-2">
                <button
                    onClick={() => { onApply([]); onClose() }}
                    className="flex-1 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 rounded-md hover:bg-red-50"
                >
                    Clear
                </button>
                <button
                    onClick={() => { onApply(tempSelected); onClose() }}
                    className="flex-1 py-1.5 text-xs font-medium bg-black text-white rounded-md hover:scale-95 transition-transform"
                >
                    Apply
                </button>
            </div>
        </div>
    )
}
