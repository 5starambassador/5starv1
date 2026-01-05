'use client'

import { Download, FileText, Users, IndianRupee } from 'lucide-react'
import { generatePDFReport } from '@/lib/pdf-export'
import { toast } from 'sonner'

interface CampusReportsClientProps {
    campusName: string
    students: any[]
    referrals: any[]
    financeData: any[]
    financeSummary: {
        totalConfirmed: number
        totalBenefits: number
    }
}

export function CampusReportsClient({
    campusName,
    students,
    referrals,
    financeData,
    financeSummary
}: CampusReportsClientProps) {

    const handleDownloadStudents = () => {
        if (students.length === 0) {
            toast.error('No student data to export')
            return
        }

        generatePDFReport({
            title: 'Student Roster Report',
            subtitle: `Campus: ${campusName}`,
            fileName: `students_${campusName.replace(/\s/g, '_').toLowerCase()}`,
            columns: [
                { header: 'Name', dataKey: 'fullName' },
                { header: 'Grade', dataKey: 'grade' },
                { header: 'Section', dataKey: 'section' },
                { header: 'Roll No', dataKey: 'rollNumber' },
                { header: 'Parent Name', dataKey: 'parentName' },
                { header: 'Parent Mobile', dataKey: 'parentMobile' }
            ],
            data: students.map(s => ({
                fullName: s.fullName,
                grade: s.grade,
                section: s.section || '-',
                rollNumber: s.rollNumber || '-',
                parentName: s.parent?.fullName || '-',
                parentMobile: s.parent?.mobileNumber || '-'
            }))
        })
        toast.success('Student report downloaded!')
    }

    const handleDownloadReferrals = () => {
        if (referrals.length === 0) {
            toast.error('No referral data to export')
            return
        }

        generatePDFReport({
            title: 'Lead Pipeline Report',
            subtitle: `Campus: ${campusName}`,
            fileName: `leads_${campusName.replace(/\s/g, '_').toLowerCase()}`,
            columns: [
                { header: 'Student Name', dataKey: 'studentName' },
                { header: 'Parent Name', dataKey: 'parentName' },
                { header: 'Mobile', dataKey: 'parentMobile' },
                { header: 'Referred By', dataKey: 'referredBy' },
                { header: 'Status', dataKey: 'leadStatus' },
                { header: 'Date', dataKey: 'createdAt' }
            ],
            data: referrals.map(r => ({
                studentName: r.studentName || '-',
                parentName: r.parentName,
                parentMobile: r.parentMobile,
                referredBy: r.user?.fullName || '-',
                leadStatus: r.leadStatus,
                createdAt: new Date(r.createdAt).toLocaleDateString('en-IN')
            }))
        })
        toast.success('Lead report downloaded!')
    }

    const handleDownloadFinance = () => {
        if (financeData.length === 0) {
            toast.error('No finance data to export')
            return
        }

        generatePDFReport({
            title: 'Finance Report - Campus Incentives',
            subtitle: `Campus: ${campusName} | Total Confirmed: ${financeSummary.totalConfirmed} | Total Benefits: ₹${financeSummary.totalBenefits.toLocaleString()}`,
            fileName: `finance_${campusName.replace(/\s/g, '_').toLowerCase()}`,
            columns: [
                { header: 'Ambassador', dataKey: 'ambassadorName' },
                { header: 'Role', dataKey: 'role' },
                { header: 'Student', dataKey: 'studentName' },
                { header: 'Parent', dataKey: 'parentName' },
                { header: 'Base Fee (₹)', dataKey: 'baseFee' },
                { header: 'Benefit %', dataKey: 'benefitPercent' },
                { header: 'Est. Benefit (₹)', dataKey: 'estimatedBenefit' }
            ],
            data: financeData.map(r => ({
                ...r,
                baseFee: r.baseFee.toLocaleString(),
                estimatedBenefit: r.estimatedBenefit.toLocaleString()
            }))
        })
        toast.success('Finance report downloaded!')
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Student Report Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <Users size={20} className="text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Student Roster</h3>
                </div>
                <p className="text-sm text-gray-500 mb-2">Complete list of enrolled students</p>
                <p className="text-xs text-gray-400 mb-4">{students.length} records</p>
                <button
                    onClick={handleDownloadStudents}
                    className="btn btn-primary text-sm w-full flex items-center justify-center gap-2"
                >
                    <Download size={16} /> Download PDF
                </button>
            </div>

            {/* Lead Report Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-100 rounded-xl">
                        <FileText size={20} className="text-purple-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Lead Pipeline</h3>
                </div>
                <p className="text-sm text-gray-500 mb-2">All referral leads and their status</p>
                <p className="text-xs text-gray-400 mb-4">{referrals.length} records</p>
                <button
                    onClick={handleDownloadReferrals}
                    className="btn btn-outline text-sm w-full flex items-center justify-center gap-2"
                >
                    <Download size={16} /> Download PDF
                </button>
            </div>

            {/* Finance Report Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-xl">
                        <IndianRupee size={20} className="text-green-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Finance Report</h3>
                </div>
                <p className="text-sm text-gray-500 mb-2">Incentive calculations for campus</p>
                <p className="text-xs text-gray-400 mb-4">
                    {financeSummary.totalConfirmed} confirmed | ₹{financeSummary.totalBenefits.toLocaleString()} est.
                </p>
                <button
                    onClick={handleDownloadFinance}
                    className="btn btn-outline text-sm w-full flex items-center justify-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                >
                    <Download size={16} /> Download PDF
                </button>
            </div>
        </div>
    )
}
