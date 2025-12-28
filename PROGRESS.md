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

### 7. Categories CRUD
- **Files:**
  - `src/app/api/categories/route.ts` - GET, POST
  - `src/app/api/categories/[id]/route.ts` - GET, PUT, DELETE
  - `src/app/dashboard/categories/page.tsx` - Categories management UI
- **Features:**
  - List all categories with expense counts
  - Create new categories
  - Edit category names
  - Delete categories (with expense unlinking)
  - System categories protected from deletion

### 8. Bank Accounts CRUD
- **Files:**
  - `src/app/api/bank-accounts/route.ts` - GET, POST
  - `src/app/api/bank-accounts/[id]/route.ts` - GET, PUT, DELETE
  - `src/app/dashboard/accounts/page.tsx` - Bank accounts management UI
- **Features:**
  - List all bank accounts with expense counts
  - Create new accounts (name, currency, default flag)
  - Edit account details
  - Delete accounts (with expense unlinking)
  - Set default account

### 9. Projects CRUD
- **Files:**
  - `src/app/api/projects/route.ts` - GET, POST
  - `src/app/api/projects/[id]/route.ts` - GET, PUT, DELETE
  - `src/app/dashboard/projects/page.tsx` - Projects management UI
- **Features:**
  - List projects with expense counts and total spent
  - Create new projects (name, description, budget)
  - Edit project details
  - Delete projects (expenses converted to LIFESTYLE)
  - Budget tracking with progress indicator
  - Active/inactive status toggle

### 10. Keyword Mappings CRUD
- **Files:**
  - `src/app/api/keyword-mappings/route.ts` - GET, POST
  - `src/app/api/keyword-mappings/[id]/route.ts` - GET, PUT, DELETE
  - `src/app/dashboard/mappings/page.tsx` - Mappings management UI
- **Features:**
  - Map keywords to categories and/or expense types
  - Auto-categorization during import and quick-add
  - System mappings protected from deletion
  - Support for expense type override (SURVIVAL_FIXED, SURVIVAL_VARIABLE, LIFESTYLE, PROJECT)

### 11. Expenses CRUD (Full)
- **Files:**
  - `src/app/api/expenses/[id]/route.ts` - GET, PUT, DELETE
  - `src/app/dashboard/expenses/page.tsx` - Full expenses list with editing
- **Features:**
  - Full expense list with pagination (10/25/50/100 per page)
  - Edit expense inline (name, amount, type, category, project, date)
  - Delete with confirmation
  - Monthly grouping view
  - Filter by type, category, project
  - Color-coded expense types

### 12. Shadcn UI Component Library
- **Files:**
  - `components.json` - Shadcn UI configuration
  - `src/components/ui/button.tsx` - Button component
  - `src/components/ui/card.tsx` - Card component
  - `src/components/ui/progress.tsx` - Progress bar component
- **Configuration:**
  - Electric Blue primary color (oklch(0.55 0.2 250))
  - Tailwind CSS integration
  - CSS variables for theming

### 13. Dashboard Visualizations
- **Files:**
  - `src/components/ui/living-gauge.tsx` - Survival budget circular gauge
  - `src/components/ui/burn-chart.tsx` - Monthly spending comparison chart
- **Living Gauge (Survival Budget):**
  - Circular SVG progress indicator
  - Shows current survival spending vs budget
  - Color changes based on usage (blue → amber → red)
  - Percentage display with amount details
- **Burn Chart (Spending Velocity):**
  - Line chart comparing current vs previous month
  - Cumulative daily spending visualization
  - Uses Recharts library (React 19 compatible)
  - Shows difference and percentage change
  - Responsive container with tooltip

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
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── expenses/
│   │   │   │   ├── route.ts              ← GET, POST
│   │   │   │   └── [id]/route.ts         ← GET, PUT, DELETE
│   │   │   ├── categories/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── projects/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── bank-accounts/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── keyword-mappings/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   └── import/
│   │   │       ├── route.ts
│   │   │       └── preview/route.ts
│   │   ├── auth/
│   │   │   ├── signin/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                ← Dashboard layout with sidebar
│   │   │   ├── page.tsx                  ← Overview (server component)
│   │   │   ├── overview-client.tsx       ← Overview with visualizations
│   │   │   ├── expenses/page.tsx         ← Full expenses CRUD
│   │   │   ├── projects/page.tsx         ← Projects CRUD
│   │   │   ├── categories/page.tsx       ← Categories CRUD
│   │   │   ├── accounts/page.tsx         ← Bank accounts CRUD
│   │   │   ├── mappings/page.tsx         ← Keyword mappings CRUD
│   │   │   └── import/page.tsx           ← 3-step import wizard
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx                ← Shadcn button
│   │   │   ├── card.tsx                  ← Shadcn card
│   │   │   ├── progress.tsx              ← Shadcn progress
│   │   │   ├── living-gauge.tsx          ← Survival budget gauge
│   │   │   └── burn-chart.tsx            ← Monthly comparison chart
│   │   ├── add-expense-modal.tsx
│   │   └── sidebar.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── importer.ts
│   │   ├── parser.ts
│   │   └── utils.ts                      ← Shadcn utilities (cn)
│   └── middleware.ts
├── .env.example                          ← Environment template
├── .gitignore
├── components.json                       ← Shadcn UI config
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── README.md
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
7. [x] **Shadcn UI Setup** - Install and configure component library
8. [x] **Visualizations** - Living Gauge, Burn Chart (Recharts - React 19 compatible)
9. [x] **Bank Accounts CRUD** - Manage bank accounts
10. [x] **Categories CRUD** - Manage expense categories
11. [x] **Projects CRUD** - Manage projects
12. [x] **Keyword Mappings CRUD** - Auto-categorization rules
13. [x] **Expenses CRUD (Full)** - Edit, pagination, monthly grouping
14. [ ] **Recurring Templates** - Auto-generate survival expenses monthly
15. [ ] **Docker** - Self-hosted community version

---

## Known Issues / Notes

- Google OAuth requires credentials from Google Cloud Console
- Using ExcelJS instead of xlsx (xlsx has security vulnerabilities)
- Prisma 7 requires adapter pattern for database connections
- Middleware uses cookie-based auth check (not importing auth to avoid Edge runtime issues)
- React 19: Changed `JSX.Element` to `ReactNode` for type compatibility
- Node 22/ExcelJS: Buffer type mismatch requires `@ts-expect-error` workaround
- Tremor.so incompatible with React 19 - using Recharts directly instead

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
