'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtpAndResetPassword, loginWithPassword, registerUser, getLoginRedirect, getRegistrationCampuses, checkSession, verifyOtpOnly } from './actions'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { MobileEntry } from '@/components/auth/MobileEntry'
import { PasswordChallenge } from '@/components/auth/PasswordChallenge'
import { OtpVerification } from '@/components/auth/OtpVerification'
import { RegistrationBasic } from '@/components/auth/RegistrationBasic'
import { RegistrationRole } from '@/components/auth/RegistrationRole'
import { PaymentGateway } from '@/components/auth/PaymentGateway'
import { ResetPassword } from '@/components/auth/ResetPassword'
import { MobileWelcome } from '@/components/auth/MobileWelcome'

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

  // Steps: 0: Welcome, 1: Mobile, 1.5: Password (Existing), 2: OTP (New/Forgot), 3: Register Details, 4: Payment, 5: Reset Password
  const [step, setStep] = useState(0)
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('') // For login
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isForgotMode, setIsForgotMode] = useState(false)

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
    confirmPassword: '',
    passoutYear: ''
  })
  const [campuses, setCampuses] = useState<any[]>([])

  // Skip Welcome screen on Desktop (Large Screens)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setStep(prev => prev === 0 ? 1 : prev)
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
              console.log('MOCK OTP:', res.otp)
            }
          } else {
            toast.success(`OTP Sent to ${mobile}`)
          }
          setIsNewUser(!res.exists)
          setStep(2)
          setOtp('') // CLEAR STALE OTP to prevent confusion
        }
      } else {
        toast.error(res?.error || 'Failed to verify mobile. Please try again.')
      }
    } catch (error: any) {
      setLoading(false)
      toast.error('Connection error: ' + (error.message || 'Please try again'))
    }
  }


  const handleLoginPassword = async (pwd: string) => {
    if (!pwd) return toast.error('Enter Password')
    setLoading(true)
    const res = await loginWithPassword(mobile, pwd)
    if (res.success) {
      const redirectPath = await getLoginRedirect(mobile)
      router.push(redirectPath)
    } else {
      setLoading(false)
      toast.error(res.error || 'Login Failed')
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) return toast.error('Enter valid 4-digit OTP')
    setLoading(true)
    const res = await verifyOtpOnly(otp, mobile)
    if (res.success) {
      if (isForgotMode) {
        setStep(5)
        setLoading(false)
      } else if (isNewUser) {
        setStep(3)
        setLoading(false)
        // Campuses loaded in next step transition
      } else {
        toast.info('Please use password to login')
        setStep(1.5)
        setLoading(false)
      }
    } else {
      setLoading(false)
      toast.error(res.error || 'Invalid OTP')
    }
  }

  const handleForgotPassword = async () => {
    setLoading(true)
    try {
      const res = await sendOtp(mobile, true, 'forgot-password')
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

  const handleResetPassword = async (newPwd: string, confirmNewPwd: string) => {
    if (newPwd.length < 8) return toast.error('Password too short')
    if (newPwd !== confirmNewPwd) return toast.error('Passwords do not match')

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(newPwd)) {
      return toast.error('Password must have 1 Uppercase, 1 Special Char, 1 Number, and be 8+ chars.')
    }

    setLoading(true)
    const res = await verifyOtpAndResetPassword(mobile, otp, newPwd)
    if (res.success) {
      toast.success('Password updated successfully! Please login.')
      setStep(1.5)
      setIsForgotMode(false)
      setOtp('')
    } else {
      toast.error(res.error || 'Reset failed')
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!formData.transactionId) return toast.error('Payment Reference Required')

    // Validate again just in case
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[A-Z])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      return toast.error('Password too weak. Please go back and fix it.')
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
    <AuthLayout animationKey={step}>
      {step === 0 && (
        <MobileWelcome onGetStarted={() => setStep(1)} />
      )}

      {step === 1 && (
        <MobileEntry
          mobile={mobile}
          setMobile={setMobile}
          onNext={handleSendOtp}
          loading={loading}
        />
      )}

      {step === 1.5 && (
        <PasswordChallenge
          mobile={mobile}
          onLogin={handleLoginPassword}
          onBack={() => setStep(1)}
          onForgotPassword={handleForgotPassword}
          loading={loading}
        />
      )}

      {step === 2 && (
        <OtpVerification
          mobile={mobile}
          otp={otp}
          setOtp={setOtp}
          onVerify={handleVerifyOtp}
          onBack={() => setStep(1)}
          onResend={handleSendOtp}
          loading={loading}
          isNewUser={isNewUser}
          isForgotMode={isForgotMode}
        />
      )}

      {step === 3 && (
        <RegistrationBasic
          formData={formData}
          setFormData={setFormData}
          onNext={() => {
            // Pre-fetch campuses when moving to role step
            getRegistrationCampuses().then(res => {
              if (res.success && res.campuses) setCampuses(res.campuses)
            })
            setStep(3.5)
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3.5 && (
        <RegistrationRole
          formData={formData}
          setFormData={setFormData}
          campuses={campuses}
          onNext={() => setStep(4)}
          onBack={() => setStep(3)}
          loading={loading}
        />
      )}

      {step === 4 && (
        <PaymentGateway
          transactionId={formData.transactionId}
          setTransactionId={(id) => setFormData({ ...formData, transactionId: id })}
          onComplete={handleRegister}
          onBack={() => setStep(3.5)}
          loading={loading}
        />
      )}

      {step === 5 && (
        <ResetPassword
          onReset={handleResetPassword}
          onCancel={() => { setStep(1.5); setIsForgotMode(false); }}
          loading={loading}
        />
      )}
    </AuthLayout>
  )
}
