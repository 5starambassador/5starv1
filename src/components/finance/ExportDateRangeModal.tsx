'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Download, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ExportDateRangeModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    description?: string
    showStatusFilter?: boolean
    columns?: { id: string; label: string; defaultChecked?: boolean }[]
    onExport: (startDate: Date, endDate: Date, status?: string, selectedColumns?: string[]) => Promise<void>
}

export function ExportDateRangeModal({
    isOpen,
    onClose,
    onExport,
    title = 'Export Report',
    description = 'Select a date range to export data.',
    showStatusFilter = false,
    columns = []
}: ExportDateRangeModalProps) {
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')
    const [status, setStatus] = useState<string>('All')
    const [selectedColumns, setSelectedColumns] = useState<string[]>([])
    const [isExporting, setIsExporting] = useState(false)

    // Initialize defaults
    useEffect(() => {
        if (columns.length > 0) {
            setSelectedColumns(columns.filter(c => c.defaultChecked !== false).map(c => c.id))
        }
    }, [columns])

    if (!isOpen) return null

    const handleExport = async () => {
        if (!startDate || !endDate) return

        setIsExporting(true)
        try {
            await onExport(new Date(startDate), new Date(endDate), status, columns.length > 0 ? selectedColumns : undefined)
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setIsExporting(false)
        }
    }

    // Preset helpers
    const setPreset = (days: number) => {
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - days)

        setEndDate(end.toISOString().split('T')[0])
        setStartDate(start.toISOString().split('T')[0])
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-50"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <Download size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                                        <p className="text-xs text-gray-500">{description}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6 space-y-6">
                                {/* Presets */}
                                <div className="flex gap-2">
                                    {[7, 30, 90].map((days) => (
                                        <button
                                            key={days}
                                            onClick={() => setPreset(days)}
                                            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors border border-transparent hover:border-gray-300"
                                        >
                                            Last {days} Days
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const start = new Date(new Date().getFullYear(), 0, 1)
                                            const end = new Date()
                                            setStartDate(start.toISOString().split('T')[0])
                                            setEndDate(end.toISOString().split('T')[0])
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                                    >
                                        YTD
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium"
                                        />
                                    </div>
                                </div>

                                {showStatusFilter && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Status</label>
                                        <select
                                            value={status}
                                            onChange={(e) => setStatus(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium bg-white"
                                        >
                                            <option value="All">All Statuses</option>
                                            <option value="Pending">Pending</option>
                                            <option value="Processed">Processed</option>
                                        </select>
                                    </div>
                                )}

                                {columns.length > 0 && (
                                    <div className="space-y-3 pt-2 border-t border-gray-100">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-gray-900">Include Columns</label>
                                            <button
                                                onClick={() => {
                                                    if (selectedColumns.length === columns.length) {
                                                        setSelectedColumns([])
                                                    } else {
                                                        setSelectedColumns(columns.map(c => c.id))
                                                    }
                                                }}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                            >
                                                {selectedColumns.length === columns.length ? 'Deselect All' : 'Select All'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                                            {columns.map(col => (
                                                <label key={col.id} className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedColumns.includes(col.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedColumns([...selectedColumns, col.id])
                                                            } else {
                                                                setSelectedColumns(selectedColumns.filter(id => id !== col.id))
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    {col.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-0 flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={!startDate || !endDate || isExporting}
                                    className="px-4 py-2 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-xl transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isExporting ? 'Generating...' : 'Download CSV'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
