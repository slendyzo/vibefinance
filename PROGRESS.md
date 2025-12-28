# VibeFinance Development Progress

## Project Overview
High-end, minimalist expense tracking app with "Survival vs Lifestyle" cost analysis.

**Tech Stack:** Next.js 15, Prisma 7, PostgreSQL (Neon), NextAuth v5, Tailwind CSS

---

## Completed Features

### 1. Database Schema (Prisma)
- **File:** `prisma/schema.prisma`
- **Models:** User, Workspace, WorkspaceMember, BankAccount, Category, Project, Expense, RecurringTemplate, KeywordMapping, PurchaseReceipt, ImportLog
- **Enums:** SubscriptionStatus, WorkspaceType, ExpenseType (SURVIVAL_FIXED, SURVIVAL_VARIABLE, LIFESTYLE, PROJECT), ExpenseStatus, RecurrenceInterval
- **Database:** Neon PostgreSQL (EU West 2 - London)

### 2. Authentication (NextAuth v5)
- **Files:**
  - `src/lib/auth.ts` - NextAuth config with Prisma adapter
  - `src/lib/db.ts` - Prisma client singleton with pg adapter
  - `src/app/api/auth/[...nextauth]/route.ts` - Auth API routes
  - `src/app/api/auth/register/route.ts` - User registration
  - `src/middleware.ts` - Route protection
- **Features:**
  - Email/password authentication (bcryptjs)
  - Google OAuth (credentials needed in .env)
  - JWT sessions
  - Auto-creates personal workspace on signup

### 3. Core Pages & Navigation

- **Landing:** `src/app/page.tsx`
- **Sign In:** `src/app/auth/signin/page.tsx`
- **Sign Up:** `src/app/auth/signup/page.tsx`
- **Dashboard Layout:** `src/app/dashboard/layout.tsx`
  - Sidebar navigation (Overview, Expenses, Projects, Categories, Bank Accounts, Import)
  - Top bar with user info and sign out
  - Light mode design
- **Dashboard Overview:** `src/app/dashboard/page.tsx` + `overview-client.tsx`
  - **View Mode Tabs:** Month, Quarter, Year, All
  - **Date Selectors:** Month/Year, Quarter/Year, or Year only based on view
  - **Project Filter:** All, No Project, or specific project
  - **Type Filter:** All, Survival Only, Lifestyle Only, Projects Only
  - **Stats Cards:**
    - Monthly/Period Total
    - Survival Fixed (excludes project expenses)
    - Survival Variable (excludes project expenses)
    - Lifestyle (excludes project expenses)
    - Projects Only
    - Grand Total (all time)
  - Recent expenses list with delete functionality
  - Color-coded expense types
  - Floating Action Button (+) for quick add
- **Sidebar Component:** `src/components/sidebar.tsx`
  - Icon-based navigation
  - Active state highlighting

### 4. Import System - FLEXIBLE COLUMN MAPPING
- **Files:**
  - `src/lib/parser.ts` - Smart keyword parsing (Level 1)
  - `src/lib/importer.ts` - Flexible Excel/CSV importer with custom column mapping
  - `src/app/api/import/route.ts` - Import API endpoint
  - `src/app/api/import/preview/route.ts` - File preview/analysis endpoint
  - `src/app/dashboard/import/page.tsx` - 3-step import wizard UI
- **Features:**
  - **Step 1: Upload** - Drag & drop or click to upload Excel/CSV
  - **Step 2: Column Mapping** - Interactive UI to map columns:
    - Auto-detects header row (scans first 5 rows)
    - Auto-suggests Date, Name, Amount columns based on header keywords
    - Shows data preview with color-coded column mapping
    - Multi-sheet support: select which sheets to import
    - Project sheet tagging: mark sheets as project expenses
  - **Step 3: Import** - Shows results with stats breakdown
  - **Smart Classification:**
    - No date = SURVIVAL_FIXED/VARIABLE based on keywords
    - Has date = LIFESTYLE
    - Project sheets = PROJECT type
  - **Keyword Detection:**
    - Date keywords: data, date, dia, day, when, quando
    - Name keywords: tipo, type, name, description, custo, expense, item
    - Amount keywords: valor, value, amount, custo, cost, price, total, €
  - Import logging with error tracking
  - Stores `rawInput` for every expense

### 5. Add Expense Feature

- **Files:**
  - `src/components/add-expense-modal.tsx` - Modal component
  - `src/app/api/expenses/route.ts` - CRUD API endpoint (GET, POST, DELETE)
- **Features:**
  - **Quick-add mode:** Parse "mcd 12€" or "uber 8.50 millennium"
  - **Manual mode:** Full form with type, category, date, bank account
  - Smart keyword parsing auto-detects merchant & category
  - Floating Action Button on dashboard
  - Auto-refresh after adding
  - **Delete expenses** with confirmation dialog

### 6. Expense Filtering & Stats

- **API Filtering:** `GET /api/expenses` supports:
  - `startDate` / `endDate` - Date range filtering
  - `projectId` - Filter by project (use `__none__` for no project)
  - `type` - Filter by expense type
  - `limit` / `offset` - Pagination
- **Stats Calculation:**
  - Correctly excludes project expenses from survival/lifestyle totals
  - Separate "Projects Only" total for project tracking

---

## Environment Variables (.env)
```
DATABASE_URL="postgresql://..." # Neon connection string
AUTH_SECRET="..." # Generate with: npx auth secret
AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="" # Optional
GOOGLE_CLIENT_SECRET="" # Optional
```

---

## File Structure

```
vibefinance/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── prisma.config.ts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── expenses/route.ts         ← GET, POST, DELETE
│   │   │   └── import/
│   │   │       ├── route.ts
│   │   │       └── preview/route.ts
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                ← Dashboard layout with sidebar
│   │   │   ├── page.tsx                  ← Overview (server component)
│   │   │   ├── overview-client.tsx       ← Overview (client component)
│   │   │   ├── expenses/page.tsx         ← Expenses list page
│   │   │   ├── projects/page.tsx         ← Projects page
│   │   │   ├── categories/page.tsx       ← Categories page
│   │   │   ├── accounts/page.tsx         ← Bank accounts page
│   │   │   └── import/page.tsx           ← 3-step import wizard
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── add-expense-modal.tsx
│   │   └── sidebar.tsx                   ← Navigation sidebar
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── importer.ts
│   │   └── parser.ts
│   └── middleware.ts
├── .env
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── SPEC.md
├── TECHNICAL_BLUEPRINT.md
└── PROGRESS.md
```

---

## Next Steps (from SPEC.md)

1. [x] **Add Expense Modal** - Quick-add functionality with smart parsing
2. [x] **Flexible Import System** - Column mapping for any Excel/CSV structure
3. [x] **Dashboard Navigation** - Sidebar with all feature links
4. [x] **Expense Filtering** - Filter by date range, project, type
5. [x] **Delete Expenses** - Remove expenses with confirmation
6. [x] **Light Mode UI** - Clean, light theme throughout
7. [ ] **Shadcn UI Setup** - Install and configure component library
8. [ ] **Visualizations** - Survival Gauge, Burn Chart (Tremor.so)
9. [ ] **Bank Accounts CRUD** - Manage bank accounts
10. [ ] **Categories CRUD** - Manage expense categories
11. [ ] **Projects CRUD** - Manage projects
12. [ ] **Recurring Templates** - Auto-generate survival expenses monthly
13. [ ] **Docker** - Self-hosted community version

---

## Known Issues / Notes
- Google OAuth requires credentials from Google Cloud Console
- Using ExcelJS instead of xlsx (xlsx has security vulnerabilities)
- Prisma 7 requires adapter pattern for database connections
- Middleware uses cookie-based auth check (not importing auth to avoid Edge runtime issues)

---

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:migrate   # Run Prisma migrations
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Generate Prisma client
```

---

*Last Updated: 2025-12-28*
