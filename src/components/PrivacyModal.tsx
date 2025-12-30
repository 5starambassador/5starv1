'use client'

import { X, Shield, Lock, Eye, Database } from 'lucide-react'

interface Props {
    isOpen: boolean
    onClose: () => void
}

export function PrivacyModal({ isOpen, onClose }: Props) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Privacy Policy</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Data Usage & Protection</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-gray-600 transition-all shadow-sm bg-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-8 max-h-[calc(85vh-100px)] custom-scrollbar space-y-8">
                    {/* Hero Section */}
                    <div className="p-6 bg-emerald-50 rounded-[24px] border border-emerald-100/50">
                        <p className="text-sm text-emerald-900 leading-relaxed font-medium">
                            At <strong>ACHARIYA WORLD CLASS EDUCATION</strong>, your privacy is our priority. We are committed to protecting your personal data and being transparent about how we use it for the 5-Star Ambassador network.
                        </p>
                    </div>

                    {/* Personal Data Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <Database size={16} className="text-blue-500" />
                            Data We Collect
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                                { title: 'Identity', desc: 'Full Name, Mobile Number, Aadhar Number (for Alumni only).' },
                                { title: 'Professional', desc: 'Employee ID and Campus details (for Staff members).' },
                                { title: 'System', desc: 'Referral links, transaction history, and reward credits.' },
                                { title: 'Media', desc: 'Profile photos you choose to upload.' }
                            ].map((item, i) => (
                                <div key={i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <p className="text-xs font-black text-gray-900 mb-1 uppercase tracking-tighter">{item.title}</p>
                                    <p className="text-xs text-gray-500 font-medium leading-tight">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* How We Use Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <Eye size={16} className="text-amber-500" />
                            How We Use It
                        </h4>
                        <ul className="space-y-3">
                            <li className="flex gap-3 text-sm text-gray-600">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-2" />
                                <span>To track referrals and calculate fee benefits accurately.</span>
                            </li>
                            <li className="flex gap-3 text-sm text-gray-600">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-2" />
                                <span>To verify your status as a parent, staff, or alumni of Achariya.</span>
                            </li>
                            <li className="flex gap-3 text-sm text-gray-600">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-2" />
                                <span>To process and verify registration payments via transaction IDs.</span>
                            </li>
                        </ul>
                    </div>

                    {/* Security Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <Lock size={16} className="text-red-500" />
                            Your Rights
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            You have the right to access, correct, or request deletion of your data through the Profile section of this app. All deletion requests are processed manually by our Super Admin to ensure data integrity.
                        </p>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                            Last Updated: January 2025 • ACHARIYA WORLD CLASS EDUCATION
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-12 py-3 bg-gray-900 text-white font-black text-sm rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
                    >
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    )
}
