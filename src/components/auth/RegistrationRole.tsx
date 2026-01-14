'use client'

import { useState } from 'react' // Import useState
import { Star, ShieldCheck, User, GraduationCap, ChevronLeft } from 'lucide-react'
import { PrivacyModal } from '@/components/PrivacyModal'

interface RegistrationRoleProps {
    formData: any
    setFormData: (data: any) => void
    campuses: any[]
    onNext: () => void
    onBack: () => void
    loading: boolean
}

export const RegistrationRole = ({ formData, setFormData, campuses, onNext, onBack, loading }: RegistrationRoleProps) => {
    const [showPrivacy, setShowPrivacy] = useState(false)
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)

    const isFormValid = () => {
        if (formData.role === 'Parent' && !formData.childEprNo) return false
        if (formData.role === 'Staff' && (!formData.empId || !formData.campusId)) return false
        if (formData.role === 'Alumni' && ((formData.aadharNo?.length !== 12) || !formData.passoutYear || !formData.campusId)) return false
        if (formData.role === 'Others' && (formData.aadharNo?.length !== 12)) return false
        if (!agreedToPrivacy) return false
        return true
    }

    return (
        <>
            <div className="space-y-6">
                <div className="text-center space-y-2 relative">
                    <button
                        onClick={onBack}
                        className="absolute top-0 left-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/15 border border-white/20 text-white hover:bg-white/25 transition-all z-50 group shadow-lg"
                    >
                        <ChevronLeft className="w-5 h-5 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
                    </button>
                    <div className="flex flex-col items-center gap-2 mb-6 w-full">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 backdrop-blur-xl border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.15em] text-white shadow-lg">
                            <Star size={10} className="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                            <span>Achariya Partnership Program (APP)</span>
                        </div>
                        <div className="inline-flex items-center px-4 py-1 rounded-full bg-slate-950/40 backdrop-blur-md border border-amber-500/30 text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                            25<sup className="text-[0.6em] ml-0.5">th</sup> <span className="ml-1.5">Year Celebration</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-md">Select Profile</h2>
                    <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Step 2 of 2</p>
                </div>

                <div className="space-y-4">
                    {/* Role Selection */}
                    <div>
                        <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Membership Level</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['Parent', 'Staff', 'Alumni', 'Others'].map((role) => (
                                <div
                                    key={role}
                                    onClick={() => {
                                        const newRole = role as 'Parent' | 'Staff' | 'Alumni' | 'Others'
                                        const updatedGrade = newRole === 'Parent' ? 'Grade 1' : ''
                                        setFormData({ ...formData, role: newRole, grade: updatedGrade })
                                    }}
                                    className={`flex flex-col items-center justify-center gap-2 py-3 px-1 rounded-xl cursor-pointer transition-all border ${formData.role === role ? 'border-amber-400/50 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                    {role === 'Parent' && <User size={16} className={formData.role === role ? 'text-amber-400' : 'text-blue-200/60'} />}
                                    {role === 'Staff' && <ShieldCheck size={16} className={formData.role === role ? 'text-amber-400' : 'text-blue-200/60'} />}
                                    {role === 'Alumni' && <GraduationCap size={16} className={formData.role === role ? 'text-amber-400' : 'text-blue-200/60'} />}
                                    {role === 'Others' && <Star size={16} className={formData.role === role ? 'text-amber-400' : 'text-blue-200/60'} />}
                                    <span className={`text-[9px] font-bold uppercase ${formData.role === role ? 'text-white' : 'text-blue-200/60'}`}>{role}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Role Specifics */}
                    <div className="min-h-[140px]">
                        {formData.role === 'Parent' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div>
                                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Child ERP No</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium"
                                        placeholder="Enter Child ERP Number"
                                        value={formData.childEprNo || ''}
                                        onChange={(e) => setFormData({ ...formData, childEprNo: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Campus</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium appearance-none cursor-pointer"
                                        value={formData.campusId}
                                        onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                                    >
                                        <option value="" className="text-gray-500 bg-slate-900">Select Campus</option>
                                        {campuses.map(c => (
                                            <option key={c.id} value={c.id} className="text-white bg-slate-900">{c.campusName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {formData.role === 'Staff' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div>
                                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Employee ID</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium"
                                        placeholder="Enter Employee ID"
                                        value={formData.empId || ''}
                                        onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Working Campus</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium appearance-none cursor-pointer"
                                        value={formData.campusId}
                                        onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                                    >
                                        <option value="" className="text-gray-500 bg-slate-900">Select Campus</option>
                                        {campuses.map(c => (
                                            <option key={c.id} value={c.id} className="text-white bg-slate-900">{c.campusName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-amber-500/50 text-amber-500 focus:ring-amber-500 bg-transparent"
                                            checked={formData.childInAchariya === 'Yes'}
                                            onChange={(e) => setFormData({ ...formData, childInAchariya: e.target.checked ? 'Yes' : 'No' })}
                                        />
                                        <span className="text-sm font-bold text-white">My Child studies in Achariya</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {formData.role === 'Alumni' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div>
                                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Aadhar Number</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium"
                                        placeholder="12-digit UIDAI Number"
                                        maxLength={12}
                                        value={formData.aadharNo || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '')
                                            if (val.length <= 12) setFormData({ ...formData, aadharNo: val })
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Year of Passout</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium"
                                        placeholder="YYYY"
                                        maxLength={4}
                                        value={formData.passoutYear || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '')
                                            if (val.length <= 4) setFormData({ ...formData, passoutYear: val })
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Campus Studied</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium appearance-none cursor-pointer"
                                        value={formData.campusId}
                                        onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                                    >
                                        <option value="" className="text-gray-500 bg-slate-900">Select Campus</option>
                                        {campuses.map(c => (
                                            <option key={c.id} value={c.id} className="text-white bg-slate-900">{c.campusName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {formData.role === 'Others' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div>
                                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Aadhar Number</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium"
                                        placeholder="12-digit UIDAI Number"
                                        maxLength={12}
                                        value={formData.aadharNo || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '')
                                            if (val.length <= 12) setFormData({ ...formData, aadharNo: val })
                                        }}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Privacy Consent */}
                <div className="mt-6 flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="pt-0.5">
                        <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-white/30 bg-white/10 text-amber-500 focus:ring-amber-500"
                            checked={agreedToPrivacy}
                            onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                        />
                    </div>
                    <p className="text-[10px] text-blue-200/80 leading-relaxed font-medium">
                        I agree to the <button type="button" onClick={() => setShowPrivacy(true)} className="text-amber-400 font-bold underline cursor-pointer hover:text-amber-300">Privacy Policy</button> and consent to data collection for identity verification.
                    </p>
                </div>

                <div className="flex gap-4">
                    <button
                        className={`w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white font-bold tracking-[0.05em] text-sm shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 ${!isFormValid() || loading ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        onClick={onNext}
                        disabled={loading || !isFormValid()}
                    >
                        Proceed to Payment
                    </button>
                </div>
            </div>
            <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
        </>
    )
}
