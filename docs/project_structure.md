# Project Structure

A guide to the Achariya Ambassador codebase structure following the modular refactoring.

## Main Application Directory (`/src/app`)

- **`/(main)/`**: Protected routes accessible via common layouts.
    - **`/dashboard/`**: Ambassador (Parent/Staff) dashboards.
    - **`/superadmin/`**: High-level system administration (recently refactored into modular sub-routes).
        - **`/users/`**: User management, ambassador tracking, and exports.
        - **`/students/`**: Student enrollment management and bulk uploads.
        - **`/referrals/`**: Referral lead tracking and conversion logic.
        - **`/campuses/`**: Campus-wise target setting and performance tracking.
        - **`/campaigns/`**: Management of marketing campaigns and assets.
        - **`/settlements/`**: Benefit calculation and financial settlement tracking.
    - **`/admin/`**: Regional/Campus-level administrative oversight.
- **`/(auth)/`**: Login, registration, and OTP verification flows.

## Components Directory (`/src/components`)

- **`/superadmin/`**: Specific components for system administration.
    - **`DataTable.tsx`**: A unified, searchable, and filterable table component.
    - **`ReferralDetailPanel.tsx`**: The primary interface for lead confirmation and fee management.
    - **`BulkUpload.tsx`**: Core logic for CSV processing.
- **`/ui/`**: Reusable base components (buttons, inputs, cards, glassmorphism effects).
- **`/layout/`**: Shared navigation components (Navbar, Sidebar).

## Core Logic & Configurations

- **`/src/app/*.ts`**: Server Actions for different modules (`superadmin-actions.ts`, `admin-actions.ts`, etc.).
- **`/src/lib/`**: Utility functions, authentication services, and permission checks.
- **`/src/types/`**: Shared TypeScript interfaces for models like `User`, `Student`, and `ReferralLead`.
- **`/prisma/schema.prisma`**: The primary source of truth for the database structure.
- **`/capacitor.config.ts`**: Mobile build configuration for Android and iOS.
