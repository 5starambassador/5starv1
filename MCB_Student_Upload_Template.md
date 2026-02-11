# MCB ERP Student Data Import Guide

This guide describes how to import your master student database from MCB ERP into the 5-Star Ambassador System.

## CSV Template Format

The system now expects the exact header format from your MCB export:

| Column | Description | Mandatory |
| :--- | :--- | :--- |
| `admissionNumber` | The student's ERP / Admission Number | Yes |
| `studentName` | Full name of the student | Yes |
| `parentName` | Full name of the parent | Yes |
| `parentMobile` | Parent's unique 10-digit mobile number | Yes |
| `campusName` | Name of the campus (e.g., Mannadipet, Anna Nagar) | Yes |
| `grade` | Current grade of the student (e.g., MONT 2, Grade 5) | Yes |
| `section` | Student's section (e.g., A, B, C) | No |
| `status` | Enrollment status (e.g., Active, Inactive) | No (Default: Active) |
| `academicYear` | Academic year (e.g., 2025-2026) | No (Default: 2025-2026) |
| `Feeplan` | Fee plan type: **OTP** or **WOTP** | No (Default: WOTP) |

## Key System Logic

### 1. Passive Parent Creation (Safe Registration)
If a parent's mobile number is not found in the system, a **Passive Parent** record is created:
- **No Referral Code**: They cannot refer others yet.
- **Pending Status**: They are not active ambassadors.
- **Protected Revenue**: To join the program and get a referral code, they MUST register through the website and pay the standard registration fee.

### 2. Auto-Verification of Ambassadors
If an imported student belongs to an **existing Staff or Parent Ambassador** who is currently "Pending Verification":
- The system will **automatically verify** them.
- Their status becomes **Active** immediately.
- This unlocks their "Child Benefit" logic without any manual intervention.

### 3. Fee Plan & Grade Fee Calculation
When you specify a `Feeplan` (OTP or WOTP) in the CSV:
- The system looks up the **exact fee** from the `GradeFee` table for that grade, campus, and academic year.
- **OTP** uses the `annualFee_otp` column.
- **WOTP** uses the `annualFee_wotp` column.
- This calculated fee is then **displayed in the Student Table** alongside the fee plan badge.
- If no `Feeplan` is specified, the system defaults to **WOTP** and uses the `annualFee_wotp` as the fallback.

**Example**:
- Student in `Grade 5`, `Mannadipet` campus, with `Feeplan: OTP` → System fetches the OTP fee for Grade 5 at Mannadipet.
- This amount will be visible immediately after import in the "Fee" column of the Student Table.

---
**Location to Upload**: SuperAdmin Dashboard → [Verification Queue](file:///superadmin/verification) → **Upload ERP Data (MCB)**
