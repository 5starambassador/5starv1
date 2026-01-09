'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ImportDataPanel } from '@/components/superadmin/ImportDataPanel'

interface CSVUploaderProps {
    type: 'students' | 'users' | 'fees' | 'campuses'
    onUpload?: (data: any[]) => Promise<{ success: boolean; added: number; failed: number; errors: string[] }>
    onClose: () => void
    userRole?: string
}

export default function CSVUploader({ type, onClose, userRole }: CSVUploaderProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    // Map legacy types to new ImportDataPanel types
    // 'users' in the old system maps to 'ambassadors' in the new system
    const importType = type === 'users' ? 'ambassadors' : type

    return createPortal(
        <div className="fixed inset-0 bg-black/50 z-[5000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full text-gray-500 hover:text-gray-900 transition-colors shadow-sm border border-gray-100"
                >
                    <X size={20} />
                </button>

                <div className="p-8 overflow-y-auto">
                    <ImportDataPanel
                        type={importType as any}
                        userRole={userRole}
                        onSuccess={() => {
                            // We keep the modal open so the user can see the report
                            // The onClose prop from parent will be called when user clicks the X button
                        }}
                    />
                </div>
            </div>
        </div>,
        document.body
    )
}
