import { getCampusStudents } from '@/app/actions/campus-dashboard-actions'
import { Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CampusStudents({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const params = await searchParams
    const query = params.q || ''
    const { success, data: students, error } = await getCampusStudents(query)

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">My Students</h1>
                <div className="bg-white rounded-lg border border-gray-200 p-2 flex items-center gap-2 w-64 shadow-sm">
                    <Search size={18} className="text-gray-400" />
                    <form action="">
                        <input
                            name="q"
                            type="text"
                            placeholder="Search by name..."
                            defaultValue={query}
                            className="bg-transparent outline-none w-full text-sm"
                        />
                    </form>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Grade</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Parent</th>
                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {students && students.length > 0 ? (
                            students.map((student: any) => (
                                <tr key={student.studentId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-gray-900">{student.fullName}</td>
                                    <td className="py-4 px-6 text-gray-600">{student.grade}</td>
                                    <td className="py-4 px-6 text-gray-600">
                                        <div className="flex flex-col">
                                            <span>{student.parent.fullName}</span>
                                            <span className="text-xs text-gray-400">{student.parent.mobileNumber}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {student.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-500">
                                    No students found for this campus matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
