'use client'

import { useState } from 'react'
import { updateLeadStatus } from '@/app/actions/campus-dashboard-actions'
import { CheckCircle, Phone, MoreHorizontal, Download } from 'lucide-react'
import { generatePDFReport } from '@/lib/pdf-export'
import { toast } from 'sonner'

interface CampusLeadsClientProps {
    referrals: any[]
}

export function CampusLeadsClient({ referrals }: CampusLeadsClientProps) {
    const [loading, setLoading] = useState<number | null>(null)
    const [leads, setLeads] = useState(referrals)

    const handleStatusUpdate = async (leadId: number, newStatus: 'New' | 'Follow-up' | 'Confirmed') => {
        setLoading(leadId)
        try {
            const result = await updateLeadStatus(leadId, newStatus)
            if (result.success) {
                toast.success(result.message)
                // Update local state
                setLeads(prev => prev.map(lead =>
                    lead.leadId === leadId ? { ...lead, leadStatus: newStatus } : lead
                ))
            } else {
                toast.error(result.error || 'Failed to update status')
            }
        } catch (error) {
            toast.error('Something went wrong')
        }
        setLoading(null)
    }

    const handleExportPDF = () => {
        const columns = ['Student Name', 'Grade', 'Parent', 'Parent Mobile', 'Referred By', 'Status']
        const data = leads.map(lead => [
            lead.studentName || 'N/A',
            lead.gradeInterested || 'N/A',
            lead.parentName,
            lead.parentMobile,
            lead.user?.fullName || 'N/A',
            lead.leadStatus
        ])

        generatePDFReport({
            title: 'Campus Leads Report',
            subtitle: `Generated on ${new Date().toLocaleDateString()}`,
            columns,
            data,
            fileName: `campus_leads_${Date.now()}`
        })
        toast.success('PDF exported successfully!')
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Confirmed': return 'bg-green-100 text-green-700'
            case 'New': return 'bg-blue-100 text-blue-700'
            case 'Follow-up': return 'bg-yellow-100 text-yellow-700'
            default: return 'bg-gray-100 text-gray-600'
        }
    }

    return (
        <div className="space-y-4">
            {/* Header with Export */}
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm text-gray-500">{leads.length} total leads</p>
                </div>
                <button
                    onClick={handleExportPDF}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-maroon text-white rounded-lg text-sm font-medium hover:bg-primary-maroon/90 transition-colors"
                >
                    <Download size={16} />
                    Export PDF
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Parent Details</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Referred By</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {leads.length > 0 ? (
                            leads.map((lead) => (
                                <tr key={lead.leadId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-gray-900">{lead.studentName || 'N/A'}</td>
                                    <td className="py-4 px-6 text-gray-600">{lead.gradeInterested}</td>
                                    <td className="py-4 px-6 text-gray-600">
                                        <div className="flex flex-col">
                                            <span>{lead.parentName}</span>
                                            <span className="text-xs text-gray-400">{lead.parentMobile}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-gray-600">
                                        <div className="flex flex-col">
                                            <span>{lead.user?.fullName}</span>
                                            <span className="text-xs bg-gray-100 px-1 rounded inline-block w-fit">{lead.user?.role}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.leadStatus)}`}>
                                            {lead.leadStatus}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            {lead.leadStatus === 'New' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(lead.leadId, 'Follow-up')}
                                                    disabled={loading === lead.leadId}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium hover:bg-yellow-200 disabled:opacity-50"
                                                >
                                                    <Phone size={12} />
                                                    {loading === lead.leadId ? '...' : 'Contacted'}
                                                </button>
                                            )}
                                            {lead.leadStatus !== 'Confirmed' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(lead.leadId, 'Confirmed')}
                                                    disabled={loading === lead.leadId}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                                                >
                                                    <CheckCircle size={12} />
                                                    {loading === lead.leadId ? '...' : 'Confirm'}
                                                </button>
                                            )}
                                            {lead.leadStatus === 'Confirmed' && (
                                                <span className="text-xs text-gray-400">✓ Completed</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">
                                    No active referrals found for this campus.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
