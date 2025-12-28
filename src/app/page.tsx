'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtpOnly, loginWithPassword, registerUser, getLoginRedirect, getRegistrationCampuses } from './actions'
import { Star, ShieldCheck, User, CreditCard, GraduationCap, Lock, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  // Steps: 1: Mobile, 1.5: Password (Existing), 2: OTP (New), 3: Register Details, 4: Payment
  const [step, setStep] = useState(1)
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(false)

  // Registration Form State
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'Parent',
    password: '',
    childInAchariya: 'Yes',
    childName: '',
    grade: 'Grade 1',
    campusId: '',
    bankAccountDetails: '',
    transactionId: '',
    childEprNo: '',
    empId: '',
    aadharNo: '',
    email: '',
    confirmPassword: ''
  })
  const [campuses, setCampuses] = useState<any[]>([])

  const handleSendOtp = async () => {
    if (mobile.length < 10) return toast.error('Enter valid mobile')
    setLoading(true)
    try {
      const res = await sendOtp(mobile)
      setLoading(false)
      if (res && res.success) {
        if (res.exists && res.hasPassword) {
          // Go to Password Login
          setStep(1.5)
        } else {
          // Go to OTP Flow
          setIsNewUser(true)
          setStep(2)
        }
      } else {
        toast.error(res?.error || 'Failed to verify mobile. Please try again.')
      }
    } catch (error: any) {
      setLoading(false)
      toast.error('Connection error: ' + (error.message || 'Please try again'))
    }
  }

  const handleLoginPassword = async () => {
    if (!password) return toast.error('Enter Password')
    setLoading(true)
    const res = await loginWithPassword(mobile, password)
    if (res.success) {
      const redirectPath = await getLoginRedirect(mobile)
      router.push(redirectPath)
    } else {
      setLoading(false)
      toast.error(res.error || 'Login Failed')
    }
  }

  const handleVerifyOtp = async () => {
    if (otp !== '123') return toast.error('Invalid OTP (hint: 123)')
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
        // Fallback or shouldn't happen if existing users have passwords now
        toast.info('Please use password to login')
        setStep(1.5)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    // Validate
    if (!formData.fullName) return toast.error('Name Required')
    if (!formData.password) return toast.error('Password Required')
    if (formData.password !== formData.confirmPassword) return toast.error('Passwords do not match!')

    // Strict Password Validation
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      return toast.error('Password must have 1 Uppercase, 1 Special Char, 1 Number, and be 8+ chars.')
    }

    setLoading(true)
    const res = await registerUser({
      ...formData,
      mobileNumber: mobile
    })

    if (res.success) {
      router.push('/dashboard')
    } else {
      toast.error(res.error)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-premium-pink">
      {/* Decorative background elements for "Elite" feel */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#DE0C78] opacity-20 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#700124] opacity-30 blur-[120px] rounded-full"></div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-10">
          {/* Achariya Logo with premium elevation */}
          <div className="mb-8 relative inline-block">
            <div className="absolute inset-0 bg-white/10 blur-[20px] rounded-full"></div>
            <img
              src="/achariya_25_logo.jpg"
              alt="Achariya 25th Year Logo"
              className="mx-auto relative z-10"
              style={{
                height: '150px',
                width: 'auto',
                filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))'
              }}
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-0 mb-4 justify-center -space-x-3">
              {[1, 2, 3, 4, 5].map((i, index) => {
                // Pyramid sizing: Middle biggest, then neighbors, then ends
                let size = 45; // Default (ends)
                if (index === 2) size = 85;       // Middle
                else if (index === 1 || index === 3) size = 60; // Inner neighbors

                // Staggered delay for "wave" effect outward from center
                const delay = Math.abs(index - 2) * 100;

                return (
                  <div key={i} className="animate-pulse-gold relative" style={{ animationDelay: `${delay}ms` }}>
                    <div className="absolute inset-0 bg-yellow-400 blur-md opacity-40 rounded-full scale-75"></div>
                    <Star
                      size={size}
                      fill="#FFD700"
                      stroke="none"
                      className="gold-glow relative z-10"
                    />
                  </div>
                )
              })}
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
                  <label style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>Mobile Number</label>
                  <input
                    type="tel"
                    className="bg-white/90 border border-white/20 rounded-full px-4 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-bold tracking-wide text-center backdrop-blur-md"
                    style={{ width: '220px', maxWidth: '100%', borderRadius: '9999px', height: '56px', padding: '0', display: 'block', margin: '0 auto' }}
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

                <div style={{ textAlign: 'center' }}>
                  <button
                    className="rounded-full transition-all active:scale-[0.98] bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] text-black font-bold tracking-widest text-sm uppercase hover:shadow-lg hover:shadow-orange-500/40 hover:scale-[1.02] flex items-center justify-center gap-2"
                    style={{ width: '220px', maxWidth: '100%', borderRadius: '9999px', height: '50px', display: 'flex', margin: '0 auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                    onClick={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? 'Authenticating...' : 'Secure Access'}
                  </button>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ height: '1px', width: '100%', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)', marginBottom: '24px' }}></div>
                </div>
              </div>
            )}

            {step === 1.5 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center', color: '#FFFFFF' }}>Welcome Back</h2>
                <p style={{ fontSize: '12px', textAlign: 'center', marginBottom: '32px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>+91 {mobile}</p>

                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>Password</label>
                  <div className="relative mx-auto" style={{ width: '250px', height: '56px' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="bg-white/90 border border-white/20 rounded-full px-4 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-bold tracking-wide text-center backdrop-blur-md"
                      style={{ width: '100%', borderRadius: '9999px', height: '56px', padding: '0 40px 0 20px', display: 'block' }}
                      placeholder="******"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="text-gray-500 hover:text-[#CC0000] transition-colors z-20 flex items-center justify-center p-1"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    className="py-4 rounded-full transition-all active:scale-[0.98] bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] text-black font-bold tracking-widest text-sm uppercase hover:shadow-lg hover:shadow-orange-500/40 hover:scale-[1.02] flex items-center justify-center gap-2"
                    style={{ width: '220px', maxWidth: '100%', borderRadius: '9999px', height: '50px', display: 'flex', margin: '0 auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                    onClick={handleLoginPassword}
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Login'}
                  </button>
                </div>

                <button
                  style={{ width: '100%', marginTop: '16px', padding: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '2px', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => { setStep(1); setPassword(''); }}
                >
                  Back to Mobile
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center', color: '#FFFFFF' }}>Verify Secret</h2>
                <p style={{ fontSize: '12px', textAlign: 'center', marginBottom: '32px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {isNewUser ? 'New Identity' : 'Verify Identity'}: +91 {mobile}
                </p>

                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>OTP Code</label>
                  <input
                    type="password"
                    className="bg-white/90 border border-white/50 rounded-full px-4 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-bold tracking-[1rem] text-center backdrop-blur-md"
                    style={{ width: '220px', maxWidth: '100%', borderRadius: '9999px', height: '56px', padding: '0', display: 'block', margin: '0 auto' }}
                    placeholder="••••"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                  <p className="text-white/40 text-[10px] mt-4 tracking-widest uppercase">Use OTP: 123</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    className="py-4 rounded-full transition-all active:scale-[0.98] bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] text-black font-bold tracking-widest text-sm uppercase hover:shadow-lg hover:shadow-orange-500/40 hover:scale-[1.02] flex items-center justify-center gap-2"
                    style={{ width: '220px', maxWidth: '100%', borderRadius: '9999px', height: '50px', display: 'flex', margin: '0 auto', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                    onClick={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Set Password'}
                  </button>
                </div>

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

                  {/* Password Set Field */}
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Create Password</label>
                    <div className="relative w-full">
                      <style jsx>{`
                        input::-ms-reveal,
                        input::-ms-clear {
                          display: none !important;
                        }
                      `}</style>
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        className="w-full bg-white/90 border border-white/20 rounded-xl pl-4 pr-12 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-medium tracking-wide appearance-none backdrop-blur-md"
                        style={{ height: '56px' }}
                        value={formData.password}
                        placeholder='Use a strong password'
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="text-gray-500 hover:text-[#CC0000] transition-colors z-20 flex items-center justify-center p-1"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {showRegisterPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginTop: '6px', marginLeft: '4px' }}>
                      At least 8 chars, 1 uppercase, 1 special char & 1 number.
                    </p>
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Retype Password</label>
                    <div className="relative w-full">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="w-full bg-white/90 border border-white/20 rounded-xl pl-4 pr-12 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-medium tracking-wide appearance-none backdrop-blur-md"
                        style={{ height: '56px' }}
                        value={(formData as any).confirmPassword}
                        placeholder='Retype your password'
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value } as any)}
                      />
                      <button
                        type="button"
                        className="text-gray-500 hover:text-[#CC0000] transition-colors z-20 flex items-center justify-center p-1"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Full Membership Name</label>
                    <input
                      style={{ height: '56px' }}
                      className="w-full bg-white/90 border border-white/20 rounded-xl px-4 py-2 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-medium tracking-wide backdrop-blur-md"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>Membership Designation</label>
                    <div className="flex gap-2">
                      {/* Parent Option */}
                      <div
                        onClick={() => setFormData({ ...formData, role: 'Parent' })}
                        className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl cursor-pointer transition-all border ${formData.role === 'Parent' ? 'border-[#FFD700] bg-[#FFD700]/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <User size={18} color={formData.role === 'Parent' ? '#FFD700' : 'rgba(255,255,255,0.4)'} />
                        <span style={{ fontSize: '10px', fontWeight: '700', color: formData.role === 'Parent' ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}>Parent</span>
                      </div>

                      {/* Staff Option */}
                      <div
                        onClick={() => setFormData({ ...formData, role: 'Staff' })}
                        className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl cursor-pointer transition-all border ${formData.role === 'Staff' ? 'border-[#FFD700] bg-[#FFD700]/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <ShieldCheck size={18} color={formData.role === 'Staff' ? '#FFD700' : 'rgba(255,255,255,0.4)'} />
                        <span style={{ fontSize: '10px', fontWeight: '700', color: formData.role === 'Staff' ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}>Staff</span>
                      </div>

                      {/* Alumni Option */}
                      <div
                        onClick={() => setFormData({ ...formData, role: 'Alumni' })}
                        className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl cursor-pointer transition-all border ${formData.role === 'Alumni' ? 'border-[#FFD700] bg-[#FFD700]/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                      >
                        <GraduationCap size={18} color={formData.role === 'Alumni' ? '#FFD700' : 'rgba(255,255,255,0.4)'} />
                        <span style={{ fontSize: '10px', fontWeight: '700', color: formData.role === 'Alumni' ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}>Alumni/Other</span>
                      </div>
                    </div>
                  </div>

                  {/* Use specific content based on Role */}
                  {formData.role === 'Parent' && (
                    /* Parent Form Flow */
                    <div className="flex flex-col gap-4">
                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Child EPR NO</label>
                        <input
                          style={{ height: '56px' }}
                          className="w-full bg-white/90 border border-white/20 rounded-xl px-4 py-1 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-medium tracking-wide backdrop-blur-md"
                          placeholder="Enter Child EPR Number"
                          value={formData.childEprNo || ''}
                          onChange={(e) => setFormData({ ...formData, childEprNo: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Mail ID</label>
                        <input
                          style={{ height: '56px' }}
                          type="email"
                          className="w-full bg-white/90 border border-white/20 rounded-xl px-4 py-2 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-medium tracking-wide backdrop-blur-md"
                          placeholder="parent@example.com"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {formData.role === 'Staff' && (
                    /* Staff Form Flow */
                    <div className="flex flex-col gap-4">
                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Emp.ID</label>
                        <input
                          style={{ height: '56px' }}
                          className="w-full bg-white/90 border border-white/20 rounded-xl px-4 py-1 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-medium tracking-wide backdrop-blur-md"
                          placeholder="Enter Employee ID"
                          value={formData.empId || ''}
                          onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Mail ID</label>
                        <input
                          style={{ height: '56px' }}
                          type="email"
                          className="w-full bg-white/90 border border-white/20 rounded-xl px-4 py-2 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-medium tracking-wide backdrop-blur-md"
                          placeholder="staff@example.com"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Campus Currently Working</label>
                        <select
                          style={{ height: '56px' }}
                          className="w-full bg-white/90 border border-white/20 rounded-xl px-4 py-1 text-black focus:outline-none focus:border-[#FFD700] transition-all text-[20px] appearance-none font-bold tracking-wide backdrop-blur-md"
                          value={formData.campusId}
                          onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                        >
                          <option value="" className="text-gray-500">Select Your Campus</option>
                          {campuses.map(c => (
                            <option key={c.id} value={c.id} className="text-black">{c.campusName}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {formData.role === 'Alumni' && (
                    /* Alumni/Other Form Flow */
                    <div className="flex flex-col gap-4">
                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Your Aadhar No</label>
                        <input
                          style={{ height: '56px' }}
                          className="w-full bg-white/90 border border-white/20 rounded-xl px-4 py-1 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-medium tracking-wide backdrop-blur-md"
                          placeholder="Enter 12-digit Aadhar Number"
                          maxLength={12}
                          value={formData.aadharNo || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '')
                            if (val.length <= 12) setFormData({ ...formData, aadharNo: val })
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', display: 'block' }}>Mail ID</label>
                        <input
                          style={{ height: '56px' }}
                          type="email"
                          className="w-full bg-white border border-white/20 rounded-lg px-4 py-1 text-black placeholder-gray-500 focus:outline-none focus:border-[#FFD700] transition-all text-[20px] font-bold tracking-wide"
                          placeholder="you@example.com"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    style={{ height: '46px' }}
                    className={`w-full relative group overflow-hidden rounded-xl transition-all active:scale-[0.98] mt-4 ${
                      // Strict Validation Logic
                      (!formData.fullName || !formData.email || !formData.password ||
                        (formData.role === 'Parent' && !formData.childEprNo) ||
                        (formData.role === 'Staff' && (!formData.empId || !formData.campusId)) ||
                        (formData.role === 'Alumni' && !formData.aadharNo)
                      ) ? 'opacity-50 cursor-not-allowed grayscale' : ''
                      }`}
                    onClick={() => {
                      // Strict check before proceeding
                      if (!formData.fullName) return;
                      if (!formData.email) return;
                      if (!formData.password) return;

                      if (formData.role === 'Parent') {
                        if (!formData.childEprNo) return;
                      }
                      else if (formData.role === 'Staff') {
                        if (!formData.empId || !formData.campusId) return;
                      }
                      else if (formData.role === 'Alumni') {
                        if (!formData.aadharNo) return;
                      }

                      setStep(4)
                    }}
                    disabled={loading ||
                      (!formData.fullName || !formData.email || !formData.password ||
                        (formData.role === 'Parent' && !formData.childEprNo) ||
                        (formData.role === 'Staff' && (!formData.empId || !formData.campusId)) ||
                        (formData.role === 'Alumni' && !formData.aadharNo)
                      )
                    }
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="relative z-10 text-black font-extrabold tracking-widest text-lg uppercase flex items-center justify-center gap-2 drop-shadow-sm">
                      Proceed to Payment &raquo;
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in">
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center', color: '#FFFFFF' }}>Secure Payment</h2>
                <p style={{ fontSize: '10px', textAlign: 'center', marginBottom: '24px', color: '#FFD700', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '3px' }}>Final Step</p>

                <div className="bg-white/10 p-6 rounded-2xl mb-6 text-center border border-white/10 backdrop-blur-md">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-4">Scan to Pay Rs. 1000</p>

                  {/* Placeholder QR Code */}
                  <div className="w-48 h-48 mx-auto bg-white p-2 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 border-[4px] border-black opacity-10"></div>
                    <div className="absolute top-2 left-2 w-10 h-10 border-[4px] border-black"></div>
                    <div className="absolute top-2 right-2 w-10 h-10 border-[4px] border-black"></div>
                    <div className="absolute bottom-2 left-2 w-10 h-10 border-[4px] border-black"></div>
                    <p className="text-black font-bold text-xl tracking-widest">QR CODE</p>
                  </div>

                  <p className="text-white text-xs font-bold">Achariya Educational Public Trust</p>
                  <p className="text-[#FFD700] text-xs font-mono mt-1">UPI: achariya@okicici</p>
                </div>

                <div className="mb-6">
                  <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2 block">Enter Transaction ID / Ref No.</label>
                  <input
                    className="w-full bg-white border border-white/10 rounded-lg px-4 py-3 text-black focus:outline-none focus:border-[#FFD700]/40 transition-all font-mono text-center tracking-widest text-lg placeholder-black/50"
                    placeholder="e.g. 352627181920"
                    value={formData.transactionId || ''}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-4 rounded-xl border border-white/10 text-white/60 font-bold text-xs uppercase hover:bg-white/5 transition-all"
                  >
                    Back
                  </button>
                  <button
                    className="flex-[2] relative group overflow-hidden py-4 rounded-xl transition-all active:scale-[0.98]"
                    onClick={handleRegister}
                    disabled={loading || !formData.transactionId}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700] via-[#FDB931] to-[#FFD700] group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="relative z-10 text-black font-extrabold tracking-widest text-xs uppercase drop-shadow-sm">
                      {loading ? 'Finalizing...' : 'Complete Registration'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <p style={{ marginTop: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.9)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '4px' }}>
          © 2025 Achariya Group of Institutions
        </p>
      </div>
    </main >
  )
}
