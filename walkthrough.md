# Walkthrough: SMS OTP Length Update (6 to 4 Digits)

## Goal
The goal of this task was to change the OTP (One-Time Password) length from 6 digits to 4 digits across the entire application to streamline the user verification process. This includes Registration, Login, Forgot Password, and 2FA flows.

## Changes

### 1. OTP Generation Logic
**File:** `src/app/actions.ts`
- Updated the `sendOtp` function to generate a 4-digit random number instead of 6-digit.
```typescript
// Before
const otp = Math.floor(100000 + Math.random() * 900000).toString()

// After
const otp = Math.floor(1000 + Math.random() * 9000).toString()
```

### 2. Login & Forgot Password Flow
**File:** `src/app/page.tsx`
- Updated `handleVerifyOtp` to validate 4 digits.
- Updated error messages to reflect the new length.
```typescript
// Before
if (!otp || otp.length < 6) return toast.error('Enter valid 6-digit OTP')

// After
if (!otp || otp.length < 4) return toast.error('Enter valid 4-digit OTP')
```

### 3. OTP Verification Component
**File:** `src/components/auth/OtpVerification.tsx`
- Updated input `maxLength` to `4`.
- Updated label from "Enter 6-Digit Code" to "Enter OTP".
- Updated auto-submit logic to trigger when length is 4.

### 🔍 Global Search Fix
I have resolved the issue where searching only worked for the current page and didn't include important fields like ERP Number or Employee ID.

#### 1. Broadened Search Fields
Ambassadors can now be searched using any of the following fields:
- **ERP Number** (e.g., STU1234)
- **Employee ID** (e.g., EMP1234)
- **Child's Name**
- **Ambassador Name**
- **Mobile Number**
- **Referral Code**

- Updated Mock OTP logic from `123456` to `1234`.

### 5. Referral Flow
# Walkthrough: SMS OTP Length Update (6 to 4 Digits)

## Goal
The goal of this task was to change the OTP (One-Time Password) length from 6 digits to 4 digits across the entire application to streamline the user verification process. This includes Registration, Login, Forgot Password, and 2FA flows.

## Changes

### 1. OTP Generation Logic
**File:** `src/app/actions.ts`
- Updated the `sendOtp` function to generate a 4-digit random number instead of 6-digit.
```typescript
// Before
const otp = Math.floor(100000 + Math.random() * 900000).toString()

// After
const otp = Math.floor(1000 + Math.random() * 9000).toString()
```

### 2. Login & Forgot Password Flow
**File:** `src/app/page.tsx`
- Updated `handleVerifyOtp` to validate 4 digits.
- Updated error messages to reflect the new length.
```typescript
// Before
if (!otp || otp.length < 6) return toast.error('Enter valid 6-digit OTP')

// After
if (!otp || otp.length < 4) return toast.error('Enter valid 4-digit OTP')
```

### 3. OTP Verification Component
**File:** `src/components/auth/OtpVerification.tsx`
- Updated input `maxLength` to `4`.
- Updated label from "Enter 6-Digit Code" to "Enter OTP".
- Updated auto-submit logic to trigger when length is 4.

### 🔍 Global Search Fix
I have resolved the issue where searching only worked for the current page and didn't include important fields like ERP Number or Employee ID.

#### 1. Broadened Search Fields
Ambassadors can now be searched using any of the following fields:
- **ERP Number** (e.g., STU1234)
- **Employee ID** (e.g., EMP1234)
- **Child's Name**
- **Ambassador Name**
- **Mobile Number**
- **Referral Code**

- Updated Mock OTP logic from `123456` to `1234`.

### 5. Referral Flow
**File:** `src/app/refer/page.tsx`
- Updated OTP input `maxLength` to 6.
- Updated state handling to slice input at 4 characters.

## Verification
1.  **Login Flow:**  - [/] Final end-to-end testing of dynamic mappings.
  - [x] Fix MSG91 Bulk empty mobile processing silent error.
  - [x] Fix React pagination key duplication issue in WhatsAppLogTable.
  - [x] Fix MSG91 Webhook dropping Campaign updates due to missing CRQID in bulk webhook payloads.
  - [x] Fix Webhook race condition where MSG91 hits our server before the background log is saved in the database (added 3 retries with wait).
  - [x] Fix empty status labels in UI by mapping 'eventName' from MSG91 payload to the application status.it OTP triggers verification.
2.  **Forgot Password:** verified that the same logic applies since it shares the `handleVerifyOtp` function.
3.  **2FA:** Verified the UI shows 4 boxes and accepts 4 digits.
4.  **Mock OTP:** In development mode, mock OTP is now `1234` for 2FA.

## Conclusion
The application now consistently uses 4-digit OTPs for all verification steps.
