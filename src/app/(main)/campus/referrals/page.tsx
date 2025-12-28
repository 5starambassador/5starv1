import { getCampusReferrals } from '@/app/actions/campus-dashboard-actions'

export const dynamic = 'force-dynamic'

export default async function CampusReferrals() {
    const { success, data: referrals, error } = await getCampusReferrals()

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Campus Leads & Referrals</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Grade Interested</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Parent Details</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Referred By</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {referrals && referrals.length > 0 ? (
                            referrals.map((lead: any) => (
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
                                            <span>{lead.user.fullName}</span>
                                            <span className="text-xs bg-gray-100 px-1 rounded inline-block w-fit">{lead.user.role}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${lead.leadStatus === 'Confirmed' ? 'bg-green-100 text-green-700' :
                                                lead.leadStatus === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {lead.leadStatus}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-500">
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
