'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtpOnly, loginUser, registerUser, getLoginRedirect, getRegistrationCampuses } from './actions'
import { Star, ShieldCheck, User, CreditCard, GraduationCap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Mobile, 2: OTP, 3: Register Details
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(false)

  // Registration Form State
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'Parent',
    childInAchariya: 'Yes',
    childName: '',
    grade: 'Grade 1',
    campusId: '',
    bankAccountDetails: ''
  })
  const [campuses, setCampuses] = useState<any[]>([])

  const handleSendOtp = async () => {
    if (mobile.length < 10) return alert('Enter valid mobile')
    setLoading(true)
    try {
      const res = await sendOtp(mobile)
      setLoading(false)
      if (res && res.success) {
        setIsNewUser(!res.exists)
        setStep(2)
      } else {
        // Display error message (e.g., registration disabled)
        alert(res?.error || 'Failed to send OTP. Please try again.')
      }
    } catch (error: any) {
      setLoading(false)
      alert('Connection error: ' + (error.message || 'Please try again'))
    }
  }

  const handleVerifyOtp = async () => {
    if (otp !== '123') return alert('Invalid OTP (hint: 123)')
    setLoading(true)
    const valid = await verifyOtpOnly(otp)
    if (valid) {
      if (isNewUser) {
        setStep(3)
        setLoading(false)
        // Fetch campuses
        const res = await getRegistrationCampuses()
        if (res.success && res.campuses) setCampuses(res.campuses)
      } else {
        const result = await loginUser(mobile)
        if (result.success) {
          const redirectPath = await getLoginRedirect(mobile)
          router.push(redirectPath)
        } else {
          alert('Login failed')
          setLoading(false)
        }
      }
    } else {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    // Validate
    if (!formData.fullName) return alert('Name Required')

    setLoading(true)
    const res = await registerUser({
      ...formData,
      mobileNumber: mobile
    })

    if (res.success) {
      router.push('/dashboard')
    } else {
      alert(res.error)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-elite-radial">
      {/* Decorative background elements for "Elite" feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#CC0000] opacity-20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#CC0000] opacity-10 blur-[120px] rounded-full"></div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-10">
          {/* Achariya Logo with premium elevation */}
          <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 bg-white/10 blur-[20px] rounded-full"></div>
            <img
              src="https://achariya.in/wp-content/uploads/2025/01/Achariya-Logo-01-scaled.avif"
              alt="Achariya Logo"
              className="mx-auto relative z-10"
              style={{ height: '110px', width: 'auto', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))' }}
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <div className="flex gap-2 mb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse-gold" style={{ animationDelay: `${i * 150}ms` }}>
                  <Star size={32} fill="#FFD700" stroke="none" className="gold-glow" />
                </div>
              ))}
            </div>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: '700',
              color: '#FFFFFF',
              lineHeight: '1',
              textShadow: '0 4px 12px rgba(0,0,0,0.5)',
              fontFamily: 'var(--font-heading)',
              margin: 0
            }}>
              Ambassador
            </h1>
          </div>

          <div className="inline-block px-6 py-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm">
            <p className="text-lg font-bold uppercase tracking-[3px]" style={{
              background: 'linear-gradient(90deg, #FFD700, #FDB931, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              25th Year Celebration
            </p>
          </div>
        </div>

        {/* Form Section - No Card */}
        <div className="mt-8">
          <div className="relative">
            {step === 1 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '32px', textAlign: 'center', color: '#FFFFFF' }}>Member Access</h2>

                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>Mobile Identity</label>
                  <input
                    type="tel"
                    className="w-full bg-white border border-white/50 rounded-xl px-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FFD700] transition-all text-xl font-medium tracking-wide text-center"
                    placeholder="00000 00000"
                    value={mobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      if (value.length <= 10) {
                        setMobile(value)
                      }
                    }}
                    maxLength={10}
                  />
                  {mobile.length > 0 && mobile.length < 10 && (
                    <p style={{ fontSize: '10px', color: '#F87171', marginTop: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '-0.05em', padding: '0 4px' }}>Incomplete Identity Number</p>
                  )}
                </div>

                <button
                  className="w-full py-4 rounded-xl transition-all active:scale-[0.98] bg-white text-[#CC0000] font-bold tracking-widest text-sm uppercase hover:bg-gray-100"
                  onClick={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : 'Secure Access'}
                </button>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ height: '1px', width: '100%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)', marginBottom: '24px' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px' }}>
                    <ShieldCheck size={14} />
                    <span>Identity Verification: 123</span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center', color: '#FFFFFF' }}>Verify Secret</h2>
                <p style={{ fontSize: '12px', textAlign: 'center', marginBottom: '32px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Identity: +91 {mobile}</p>

                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>OTP Code</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-white/50 rounded-xl px-4 py-5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#FFD700] transition-all text-4xl font-bold tracking-[1rem] text-center"
                    placeholder="••••"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>

                <button
                  className="w-full py-4 rounded-xl transition-all active:scale-[0.98] bg-white text-[#CC0000] font-bold tracking-widest text-sm uppercase hover:bg-gray-100"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Unlock Dashboard'}
                </button>

                <button
                  style={{ width: '100%', marginTop: '16px', padding: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => setStep(1)}
                >
                  Revise Identity Number
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center', color: '#FFFFFF' }}>Elite Profile</h2>
                <p style={{ fontSize: '10px', textAlign: 'center', marginBottom: '32px', color: '#FFD700', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '3px' }}>Welcome Ambassador</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Full Membership Name</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/40 transition-all font-medium"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2 block">Membership Designation</label>
                    <div className="flex gap-4">
                      <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer transition-all hover:bg-white/10 has-[:checked]:border-[#FFD700]/50 has-[:checked]:bg-[#FFD700]/10">
                        <input className="hidden" type="radio" name="role" checked={formData.role === 'Parent'} onChange={() => setFormData({ ...formData, role: 'Parent' })} />
                        <User size={16} className={formData.role === 'Parent' ? 'text-[#FFD700]' : 'text-white/40'} />
                        <span className={`text-xs font-bold ${formData.role === 'Parent' ? 'text-white' : 'text-white/40'}`}>Parent</span>
                      </label>
                      <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer transition-all hover:bg-white/10 has-[:checked]:border-[#FFD700]/50 has-[:checked]:bg-[#FFD700]/10">
                        <input className="hidden" type="radio" name="role" checked={formData.role === 'Staff'} onChange={() => setFormData({ ...formData, role: 'Staff' })} />
                        <ShieldCheck size={16} className={formData.role === 'Staff' ? 'text-[#FFD700]' : 'text-white/40'} />
                        <span className={`text-xs font-bold ${formData.role === 'Staff' ? 'text-white' : 'text-white/40'}`}>Staff</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1 block">Student Parent?</label>
                      <div className="relative">
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/40 transition-all font-medium text-xs appearance-none"
                          value={formData.childInAchariya}
                          onChange={(e) => setFormData({ ...formData, childInAchariya: e.target.value })}
                        >
                          <option className="bg-[#1a1a1a]">Yes</option>
                          <option className="bg-[#1a1a1a]">No</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                          <GraduationCap size={16} />
                        </div>
                      </div>
                    </div>

                    {formData.childInAchariya === 'Yes' && (
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1 block">Current School</label>
                        <div className="px-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white/40 text-[10px] font-bold">
                          ACHRIYA OFFICIAL
                        </div>
                      </div>
                    )}
                  </div>

                  {formData.childInAchariya === 'Yes' ? (
                    <>
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1 block">Child Identity (Name & Section)</label>
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/40 transition-all text-sm"
                          placeholder="e.g. Rahul S, 10-A"
                          value={formData.childName}
                          onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1 block">Campus</label>
                          <select
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/40 transition-all text-xs appearance-none"
                            value={formData.campusId}
                            onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                          >
                            <option value="" className="bg-[#1a1a1a]">Select Campus</option>
                            {campuses.map(c => (
                              <option key={c.id} value={c.id} className="bg-[#1a1a1a]">{c.campusName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1 block">Grade</label>
                          <select
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/40 transition-all text-xs appearance-none"
                            value={formData.grade}
                            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                          >
                            {[
                              "Pre-KG", "LKG", "UKG",
                              "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
                              "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
                              "Grade 11", "Grade 12"
                            ].map(g => (
                              <option key={g} value={g} className="bg-[#1a1a1a]">{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1 block">Benefit Settlement Details (Secure)</label>
                      <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#FFD700]/40 transition-all text-xs"
                        rows={2}
                        placeholder="Bank Account, IFSC, Branch Details"
                        value={formData.bankAccountDetails}
                        onChange={(e) => setFormData({ ...formData, bankAccountDetails: e.target.value })}
                      ></textarea>
                    </div>
                  )}

                  <button
                    className="w-full relative group overflow-hidden py-4 rounded-xl transition-all active:scale-[0.98] mt-4"
                    onClick={handleRegister}
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] to-[#DAB200] group-hover:from-[#FFE04D] group-hover:to-[#E6C200] transition-all"></div>
                    <span className="relative z-10 text-black font-extrabold tracking-widest text-xs uppercase">
                      {loading ? 'Initializing...' : 'Claim Ambassador Status'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <p style={{ marginTop: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '4px' }}>
          © 2025 Achariya Group of Institutions
        </p>
      </div>
    </main >
  )
}
