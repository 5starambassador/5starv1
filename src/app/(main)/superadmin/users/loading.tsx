
import React from 'react'

export default function Loading() {
    return (
        <div className="space-y-6 animate-pulse p-6">
            <div className="flex justify-between items-center">
                <div className="h-10 w-48 bg-gray-200 rounded-lg"></div>
                <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
            </div>

            <div className="h-12 w-64 bg-gray-100 rounded-2xl border border-gray-200/50"></div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <div className="h-10 w-64 bg-gray-100 rounded-xl"></div>
                    <div className="flex gap-2">
                        <div className="h-10 w-24 bg-gray-100 rounded-xl"></div>
                        <div className="h-10 w-24 bg-gray-100 rounded-xl"></div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <th key={i} className="px-6 py-4">
                                        <div className="h-4 w-20 bg-gray-200 rounded mx-auto"></div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="border-b border-gray-50/50">
                                    {[1, 2, 3, 4, 5, 6].map(j => (
                                        <td key={j} className="px-6 py-4">
                                            <div className="h-4 w-full max-w-[120px] bg-gray-100 rounded mx-auto"></div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
