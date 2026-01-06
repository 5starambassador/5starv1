'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtpAndResetPassword, loginWithPassword, registerUser, getLoginRedirect, getRegistrationCampuses, checkSession, verifyOtpOnly } from './actions'
import { Star, ShieldCheck, User, CreditCard, GraduationCap, Lock, Eye, EyeOff, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { NativeLogin } from '@/components/NativeLogin'
import { PrivacyModal } from '@/components/PrivacyModal'
import { logger } from '@/lib/logger'

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    async function verify() {
      const res = await checkSession()
      if (res.authenticated && res.redirect) {
        router.push(res.redirect)
      }
    }
    verify()
  }, [router])

  // Steps: 1: Mobile, 1.5: Password (Existing), 2: OTP (New), 3: Register Details, 4: Payment, 5: Reset Password
  const [step, setStep] = useState(1)
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [isForgotMode, setIsForgotMode] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

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
          setStep(1.5)
        } else {
          if (res.otp) {
            toast.success(`Your Verification Code is: ${res.otp}`, { duration: 6000 })
            if (process.env.NODE_ENV === 'development') {
              logger.info('MOCK OTP:', res.otp)
            }
          } else {
            toast.success(`OTP Sent to ${mobile}`)
          }
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
    if (!otp || otp.length < 6) return toast.error('Enter valid 6-digit OTP')
    setLoading(true)
    const valid = await verifyOtpOnly(otp, mobile)
    if (valid) {
      if (isForgotMode) {
        setStep(5)
        setLoading(false)
      } else if (isNewUser) {
        setStep(3)
        setLoading(false)
        const res = await getRegistrationCampuses()
        if (res.success && res.campuses) setCampuses(res.campuses)
      } else {
        toast.info('Please use password to login')
        setStep(1.5)
        setLoading(false)
      }
    } else {
      setLoading(false)
      toast.error('Invalid OTP')
    }
  }

  const handleForgotPassword = async () => {
    setLoading(true)
    try {
      const res = await sendOtp(mobile, true)
      setLoading(false)
      if (res.success) {
        setIsForgotMode(true)
        setStep(2)
        toast.success('Recovery OTP sent to ' + mobile)
      } else {
        toast.error(res.error || 'Failed to send recovery OTP')
      }
    } catch (e) {
      setLoading(false)
      toast.error('Recovery failed. Try again.')
    }
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 8) return toast.error('Password too short')
    if (newPassword !== confirmNewPassword) return toast.error('Passwords do not match')

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return toast.error('Password must have 1 Uppercase, 1 Special Char, 1 Number, and be 8+ chars.')
    }

    setLoading(true)
    const res = await verifyOtpAndResetPassword(mobile, otp, newPassword)
    if (res.success) {
      toast.success('Password updated successfully! Please login.')
      setStep(1.5)
      setIsForgotMode(false)
      setNewPassword('')
      setConfirmNewPassword('')
      setPassword('')
    } else {
      toast.error(res.error || 'Reset failed')
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!formData.fullName) return toast.error('Name Required')
    if (!formData.password) return toast.error('Password Required')
    if (formData.password !== formData.confirmPassword) return toast.error('Passwords do not match!')

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
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-[#1A0000] to-[#2D0000]">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-red-600/20 blur-[150px] rounded-full animate-pulse-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-amber-600/10 blur-[150px] rounded-full animate-pulse-slow delay-1000"></div>
      <div className="absolute inset-0 bg-[url('/bg-pattern.png')] bg-cover opacity-10"></div>

      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in-95 duration-700 mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <img
            src="/achariya_25_logo.jpg"
            alt="Achariya 25th Year Logo"
            className="mx-auto relative z-10 h-[150px] w-auto shadow-[0_0_50px_-12px_rgba(251,191,36,0.6)] border border-amber-400/20 hover:shadow-[0_0_60px_-5px_rgba(251,191,36,0.8)] hover:scale-105 transition-all duration-500"
          />
        </div>

        <div className="flex flex-col items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-0 mb-3 justify-center -space-x-3">
            {[1, 2, 3, 4, 5].map((i, index) => {
              let size = 45;
              if (index === 2) size = 85;
              else if (index === 1 || index === 3) size = 60;
              const delay = Math.abs(index - 2) * 100;

              return (
                <div key={i} className="animate-pulse-gold relative" style={{ animationDelay: `${delay}ms` }}>
                  <div className="absolute inset-0 bg-amber-400 blur-md opacity-40 rounded-full scale-75"></div>
                  <Star
                    size={size}
                    fill="#F59E0B"
                    stroke="none"
                    className="text-amber-500 relative z-10 drop-shadow-lg"
                  />
                </div>
              )
            })}
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-200 tracking-tight drop-shadow-sm font-heading leading-tight">
            Ambassador
          </h1>
        </div>


        <div className="text-center">
          <div className="inline-block px-6 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
            <p className="text-lg font-bold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300">
              25th Year Celebration
            </p>
          </div>
        </div>


        {/* Form Section */}
        <div className="mt-4">
          <div className="relative">
            {step === 1 && (
              <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                <h2 className="text-2xl font-bold mb-4 text-center text-white tracking-wide">Member Access</h2>

                <div className="mb-6 text-center group">
                  <label className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-2 block group-focus-within:text-amber-400/80 transition-colors">Mobile Number</label>
                  <input
                    type="tel"
                    autoFocus
                    autoComplete="tel"
                    inputMode="numeric"
                    disabled={loading}
                    className={`block mx-auto w-[280px] bg-white/5 border border-white/10 rounded-full px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 focus:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)] transition-all text-lg font-bold tracking-[0.1em] text-center backdrop-blur-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="Enter 10-digit mobile"
                    value={mobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      if (value.length <= 10) setMobile(value)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && mobile.length === 10 && handleSendOtp()}
                    maxLength={10}
                  />
                  {mobile.length > 0 && mobile.length < 10 && (
                    <p className="text-[10px] text-red-400 mt-2 font-bold uppercase tracking-wider animate-pulse">
                      Enter {10 - mobile.length} more digit{10 - mobile.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="text-center">
                  <button
                    className="block mx-auto w-auto px-12 min-w-[200px] h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black tracking-[0.15em] text-sm uppercase shadow-lg shadow-amber-900/40 hover:shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? 'Authenticating...' : 'Secure Access'}
                  </button>
                </div>

                <div className="mt-8 flex flex-col items-center">
                  <div className="h-px w-full max-w-[200px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"></div>
                  <NativeLogin onMobileFill={setMobile} />
                </div>
              </div>
            )}

            {step === 1.5 && (
              <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                <h2 className="text-2xl font-bold mb-2 text-center text-white tracking-wide">Welcome Back</h2>
                <p className="text-xs text-center mb-6 text-white/40 tracking-[0.1em] uppercase">+91 {mobile}</p>

                <div className="mb-6 text-center">
                  <label className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-2 block">Password</label>
                  <div className="relative mx-auto w-[250px]">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoFocus
                      autoComplete="current-password"
                      disabled={loading}
                      className={`w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-12 h-12 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-bold tracking-wider text-center backdrop-blur-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && password && handleLoginPassword()}
                    />
                    <button
                      type="button"
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-white/40 hover:text-amber-400 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    className="block mx-auto w-[280px] h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black tracking-[0.15em] text-sm uppercase shadow-lg shadow-amber-900/40 hover:shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={handleLoginPassword}
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Login'}
                  </button>

                  <button
                    className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/60 hover:text-amber-400 transition-colors"
                    onClick={handleForgotPassword}
                    disabled={loading}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  className="w-full mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => { setStep(1); setPassword(''); setIsForgotMode(false); }}
                >
                  Back to Mobile
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                <h2 className="text-2xl font-bold mb-2 text-center text-white tracking-wide">Verify Identity</h2>
                <p className="text-xs text-center mb-8 text-white/40 tracking-[0.1em] uppercase">
                  {isNewUser ? 'New Identity' : 'Secure Login'}: +91 {mobile}
                </p>

                <div className="mb-8 text-center group">
                  <label className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-3 block group-focus-within:text-amber-400/80 transition-colors">OTP Code</label>
                  <input
                    type="text"
                    autoFocus
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={loading}
                    className={`block mx-auto w-[280px] bg-white/5 border border-white/10 rounded-full px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-2xl font-black tracking-[0.5em] text-center backdrop-blur-md ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    placeholder="••••••"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && handleVerifyOtp()}
                  />
                  <p className="text-white/30 text-[10px] mt-4 tracking-widest uppercase">Check your SMS for the code</p>
                </div>

                <div className="text-center">
                  <button
                    className="block mx-auto w-[280px] h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black tracking-[0.15em] text-sm uppercase shadow-lg shadow-amber-900/40 hover:shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                  >
                    {loading ? 'Verifying...' : 'Set Password'}
                  </button>
                </div>

                <button
                  className="w-full mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => setStep(1)}
                >
                  Change Mobile Number
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                <h2 className="text-2xl font-bold mb-2 text-center text-white tracking-wide">Elite Profile</h2>
                <p className="text-[10px] text-center mb-8 text-amber-400 font-bold uppercase tracking-[0.3em]">Welcome Ambassador</p>

                <div className="flex flex-col gap-6">

                  {/* Password Set Field */}
                  <div>
                    <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Create Password</label>
                    <div className="relative w-full">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                        value={formData.password}
                        placeholder='Use a strong password'
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-amber-400 transition-colors"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-white/30 text-[10px] mt-2 ml-1">At least 8 chars, 1 uppercase, 1 special char & 1 number.</p>
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Retype Password</label>
                    <div className="relative w-full">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                        value={formData.confirmPassword}
                        placeholder='Retype your password'
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Full Membership Name</label>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Membership Designation</label>
                    <div className="flex gap-2">
                      {['Parent', 'Staff', 'Alumni'].map((role) => (
                        <div
                          key={role}
                          onClick={() => {
                            const newRole = role as 'Parent' | 'Staff' | 'Alumni'
                            // Clear grade if switching TO Alumni to prevent "Grade 1" appearing in "Year of Passout"
                            // Or set to "Grade 1" if switching TO Parent
                            const updatedGrade = newRole === 'Alumni' ? '' : (newRole === 'Parent' ? 'Grade 1' : '')
                            setFormData({ ...formData, role: newRole, grade: updatedGrade })
                          }}
                          className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl cursor-pointer transition-all border ${formData.role === role ? 'border-amber-400/50 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                            }`}
                        >
                          {role === 'Parent' && <User size={18} className={formData.role === role ? 'text-amber-400' : 'text-white/40'} />}
                          {role === 'Staff' && <ShieldCheck size={18} className={formData.role === role ? 'text-amber-400' : 'text-white/40'} />}
                          {role === 'Alumni' && <GraduationCap size={18} className={formData.role === role ? 'text-amber-400' : 'text-white/40'} />}
                          <span className={`text-[10px] font-bold uppercase ${formData.role === role ? 'text-white' : 'text-white/40'}`}>{role === 'Alumni' ? 'Alumni/Other' : role}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Role Specific Fields */}
                  {formData.role === 'Parent' && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Child ERP NO</label>
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                          placeholder="Enter Child ERP Number"
                          value={formData.childEprNo || ''}
                          onChange={(e) => setFormData({ ...formData, childEprNo: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Mail ID</label>
                        <input
                          type="email"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                          placeholder="parent@example.com"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Choose Your Campus</label>
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md appearance-none"
                          value={formData.campusId}
                          onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                        >
                          <option value="" className="text-gray-500">Select Campus</option>
                          {campuses.map(c => (
                            <option key={c.id} value={c.id} className="text-black">{c.campusName}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {formData.role === 'Staff' && (
                    <div className="flex flex-col gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Emp.ID</label>
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                          placeholder="Enter Employee ID"
                          value={formData.empId || ''}
                          onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Mail ID</label>
                        <input
                          type="email"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                          placeholder="staff@example.com"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Campus Currently Working</label>
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md appearance-none"
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
                    <div className="flex flex-col gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Your Aadhar No</label>
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
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
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Mail ID</label>
                        <input
                          type="email"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                          placeholder="you@example.com"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Year of Passout</label>
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                          placeholder="e.g. 2020"
                          value={formData.grade || ''} // Using grade field map
                          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Campus Studied</label>
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md appearance-none"
                          value={formData.campusId}
                          onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                        >
                          <option value="" className="text-gray-500">Select Campus</option>
                          {campuses.map(c => (
                            <option key={c.id} value={c.id} className="text-black">{c.campusName}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Privacy Consent */}
                  <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl border border-white/10 mt-4">
                    <input
                      type="checkbox"
                      id="privacy-consent"
                      checked={agreedToPrivacy}
                      onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="privacy-consent" className="text-[11px] text-white/60 leading-tight cursor-pointer">
                      I have read and agree to the <button type="button" onClick={() => setShowPrivacy(true)} className="text-amber-400 font-bold hover:underline">Privacy Policy</button>. I consent to the collection and use of my data for referral tracking and identity verification.
                    </label>
                  </div>

                  <button
                    className={`w-full relative group overflow-hidden rounded-xl h-14 transition-all active:scale-[0.98] mt-4 ${(!formData.fullName || !formData.email || !formData.password || !agreedToPrivacy ||
                      (formData.role === 'Parent' && !formData.childEprNo) ||
                      (formData.role === 'Staff' && (!formData.empId || !formData.campusId)) ||
                      (formData.role === 'Alumni' && !formData.aadharNo)
                    ) ? 'opacity-50 cursor-not-allowed grayscale' : ''
                      }`}
                    onClick={() => {
                      setStep(4)
                    }}
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="relative z-10 text-black font-black tracking-widest text-sm uppercase flex items-center justify-center gap-2 drop-shadow-sm">
                      Proceed to Payment &raquo;
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                <h2 className="text-2xl font-bold mb-2 text-center text-white tracking-wide">Secure Payment</h2>
                <p className="text-[10px] text-center mb-8 text-amber-400 font-bold uppercase tracking-[0.3em]">Final Step</p>

                <div className="bg-white/5 p-8 rounded-[32px] mb-8 text-center border border-white/10 backdrop-blur-xl shadow-2xl">
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-6">Scan to Pay Rs. 1000</p>

                  {/* QR Code */}
                  <div className="w-56 h-56 mx-auto bg-white p-3 rounded-2xl mb-6 flex items-center justify-center relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 border-[4px] border-black opacity-5"></div>
                    <div className="absolute top-3 left-3 w-12 h-12 border-[4px] border-black rounded-lg"></div>
                    <div className="absolute top-3 right-3 w-12 h-12 border-[4px] border-black rounded-lg"></div>
                    <div className="absolute bottom-3 left-3 w-12 h-12 border-[4px] border-black rounded-lg"></div>
                    <p className="text-black font-black text-2xl tracking-widest opacity-80">QR CODE</p>
                  </div>

                  <p className="text-white text-sm font-bold tracking-wide">Achariya Educational Public Trust</p>
                  <p className="text-amber-400 text-xs font-mono mt-2 bg-amber-400/10 inline-block px-3 py-1 rounded-lg">UPI: achariya@okicici</p>
                </div>

                <div className="mb-8">
                  <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-3 block">Enter Transaction ID / Ref No.</label>
                  <input
                    className="w-full bg-white border border-white/10 rounded-xl px-4 h-14 text-black focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20 transition-all font-mono text-center tracking-widest text-lg placeholder-gray-400 shadow-xl"
                    placeholder="e.g. 352627181920"
                    value={formData.transactionId || ''}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 h-14 rounded-xl border border-white/10 text-white/60 font-bold text-xs uppercase hover:bg-white/5 transition-all"
                  >
                    Back
                  </button>
                  <button
                    className="flex-[2] relative group overflow-hidden h-14 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-amber-900/40"
                    onClick={handleRegister}
                    disabled={loading || !formData.transactionId}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="relative z-10 text-black font-black tracking-widest text-xs uppercase drop-shadow-sm">
                      {loading ? 'Finalizing...' : 'Complete Registration'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="animate-in slide-in-from-right-8 fade-in duration-500">
                <h2 className="text-2xl font-bold mb-2 text-center text-white tracking-wide">Reset Password</h2>
                <p className="text-[10px] text-center mb-8 text-amber-400 font-bold uppercase tracking-[0.3em]">Set your new credentials</p>

                <div className="flex flex-col gap-6">
                  <div>
                    <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">New Password</label>
                    <div className="relative w-full">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                        value={newPassword}
                        placeholder='Min 8 chars, 1 Upper, 1 Special'
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-amber-400 transition-colors"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      >
                        {showRegisterPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-white/60 text-[10px] font-bold uppercase tracking-[0.1em] mb-2 block">Confirm New Password</label>
                    <input
                      type="password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-14 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all text-lg font-medium tracking-wide backdrop-blur-md"
                      value={confirmNewPassword}
                      placeholder='Retype new password'
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>

                  <button
                    className="w-full relative group overflow-hidden rounded-xl h-14 transition-all active:scale-[0.98] mt-4"
                    onClick={handleResetPassword}
                    disabled={loading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 group-hover:scale-110 transition-transform duration-500"></div>
                    <span className="relative z-10 text-black font-black tracking-widest text-sm uppercase flex items-center justify-center gap-2 drop-shadow-sm">
                      {loading ? 'Updating...' : 'Save New Password'}
                    </span>
                  </button>

                  <button
                    className="w-full mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white/60 transition-colors"
                    onClick={() => { setStep(1.5); setIsForgotMode(false); }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 pb-8 flex flex-col items-center gap-4">
          <button
            onClick={() => setShowPrivacy(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white/60 hover:bg-white/10 transition-all font-heading"
          >
            <Shield size={12} />
            Privacy & Data Policy
          </button>
          <p className="text-white/40 text-[10px] font-medium uppercase tracking-[0.3em]">
            © 2025 ACHARIYA WORLD CLASS EDUCATION
          </p>
        </div>
      </div>
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </main >
  )
}
