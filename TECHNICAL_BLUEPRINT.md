# Amigo: Technical Blueprint

## 1. Database Schema (Prisma)
The schema must support multi-tenancy (Workspaces) and the specific "Survival" logic.

- **User:** Auth data, `subscriptionStatus` (BASIC, PRO, LIFETIME), `aiCredits`.
- **Workspace:** `name`, `type` (PERSONAL, SHARED), `ownerId`.
- **BankAccount:** `name` (e.g., "Millennium Pessoal"), `balance`, `currency`.
- **Expense:** - `type`: SURVIVAL_FIXED, SURVIVAL_VARIABLE, LIFESTYLE, PROJECT.
    - `status`: PAID, PENDING.
    - `amount`: Original value.
    - `currency`: Original currency (e.g., USD).
    - `amountEur`: Converted value at time of entry.
- **RecurringTemplate:** For auto-generating Survival expenses each month.

## 2. Smart Parsing Pipeline
To save on API costs and ensure privacy, implement this logic in `lib/parser.ts`:

1.  **Level 1 (Local):** Hardcoded Map + User History. 
    - If input contains "mcd", map to "McDonalds" + Category "Dining".
2.  **Level 2 (LLM - Opt-in):** - Triggered only if Level 1 fails AND user has "AI Processing" enabled.
    - Prompt: "Extract [Name, Amount, Category] from this sloppy string: '{input}'".

## 3. Security & Anti-Piracy
- **Middleware:** Every `/api` request must verify the `workspaceId` against the `session.user.id`.
- **Logic Isolation:** The `calculateMonthlyBurn` and `parseStatement` functions must live on the server, not the client.
- **Verification Gate:** A `/api/auth/verify-purchase` endpoint that checks a signed receipt from Apple/Google before setting `subscriptionStatus = PRO`.

## 4. Import Logic (Legacy Support)
The system must handle the "Expenses.xlsx" legacy format:
- **Columns:** `Data`, `Tipo de Custo`, `Custo`.
- **Mapping:** - If `Data` is null and it's in the top block -> `SURVIVAL_FIXED`.
    - If `Data` is present -> `LIFESTYLE`.
    - Files named "Casa" -> Tag all entries as `PROJECT: Casa`.

## 5. Deployment Toggles
- `HYBRID_MODE`: 
    - `true`: Use PostgreSQL + Stripe + Google Auth (App Store build).
    - `false`: Use SQLite + Credentials Auth + Local Storage (Docker build).