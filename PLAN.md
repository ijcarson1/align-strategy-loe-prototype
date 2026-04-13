# LOE Forecasting Prototype — Development Plan

## Status: Sprint 3 complete (as of 2026-04-12)

---

## What's Built

### Stack
- React 18 + TypeScript, Vite (port 5173: `npm run dev`)
- Tailwind CSS v4 + shadcn/ui (nova preset, radix base)
- Recharts for all charts
- React Router v6: `/` login, `/dashboard`, `/inputs`, `/sales`, `/pl`
- localStorage key `loe_forecast_v3`

### Sprint 1 — complete
- Login page (shadcn login-02, two-column, 3 demo credential sets)
- AppShell (dashboard-01: SidebarProvider → AppSidebar + SidebarInset)
- Sidebar (NavUser dropdown, active route, drug/LOE display, 4 nav items)
- Dashboard (LOE banner, 4 KPI cards, volume chart, revenue chart, scenario comparison)
- Inputs page — 5-tab form: Market Details, Baseline Volume, Post-LOE Impact, Price Events, Cost Inputs
- Forecast engine — momentum pre-LOE, global decay curve post-LOE, segment revenue/GP
- P&L page — Gross Sales → G2N → Net Sales → COGS → GP → Opex → EBIT
- Sales page — stacked bar chart + volume/revenue tables by segment
- Cost inputs — G2N ratio, headcount (S&M + Non-S&M), other costs

### Sprint 2 — complete
### Sprint 3 — complete

- **Types** — `UserRole`, `Region`, `AnalogCurve`, `DrugEntry` added; `User` gains `role`/`regionId`; `DrugModel` gains `regionId`, `currency`, `currencySymbol`, `exchangeRateToBase`; `AppState` replaces `scenarios` with `drugs: DrugEntry[]`, `activeDrugId`, `regions`, `analogCurves`, `activeRegionId?`
- **Storage v4** — migration from v3/v2/v1; wraps legacy `scenarios` into a `DrugEntry`
- **Auth** — `DEMO_USERS[]` array: global (`demo@`), Nordics regional (`nordic@`), UK regional (`uk@`); all `Pharma2026!`
- **Demo data** — `DEMO_REGIONS` (Nordics/DKK, UK/GBP, Germany/EUR); `BRANDEX_UK` drug model (LOE 2027-06, NHS + Private segments); `DEMO_DRUG_ENTRIES[]` with 2 drugs for global portfolio
- **lib/state.ts** — `getActiveDrug(state)`, `getVisibleDrugs(state)` (role-aware)
- **Context** — full refactor: `UPDATE_DRUG` targets `drugs[]` by `activeDrugId`; new actions `SET_ACTIVE_DRUG`, `SET_ACTIVE_REGION`, `ADD/UPDATE/REMOVE_ANALOG_CURVE`; analog multipliers resolved automatically for `forecastApproach === 'analog'`; merged drug list preserves saved edits + fills missing demo entries
- **Page consumers** — all `state.scenarios` refs replaced with `getActiveDrug(state)` in Dashboard, Inputs, PL, Sales, AppShell, Sidebar
- **AnalogPage** (`/analog`) — analog library (up to 4 named curves, key-point input at M0/6/12/18/24/36/48/60 → 61-point interpolation), retention comparison LineChart with per-curve visibility toggles, usage callout
- **PortfolioPage** (`/portfolio`) — global users only; table of all visible drugs (both scenarios) with peak revenue / 5-yr revenue / 5-yr EBIT in local currency; region filter; Open button switches active drug + navigates to dashboard
- **Sidebar** — drug switcher Select (when visibleDrugs > 1), region filter Select (global only), Analogs + Portfolio nav items
- **LoginPage** — shows all 3 credential sets with role labels

---

### Sprint 2 — complete
- **Types** — `CurveType`, `VolumeEvent`, `MoleculeExpansion` added; `MarketSegment.erosionEvents[]`; `DrugModel.moleculeExpansion`, `brandCaptureOfExpansion`, `preLOEPriceEvents`, `forecastApproach`, `analogCurveId`
- **Storage v3** — migration from v2/v1 with safe defaults
- **Demo data** — BRANDEX with per-segment erosion events (Public: rapid generic launch, Low-income: pharmacy substitution) + molecule expansion (OTC 8k peak, S-curve) + 10% brand capture
- **Forecast engine** — `computeRampProgress` (6 curve shapes), `computeSegmentRetention` (multiplicative event overlay), `computeExpansionVolumeForYear`; per-segment erosion when configured, global curve as fallback; accepts `analogMultipliers` (Sprint 3)
- **PostLOEImpactTab** — approach toggle, per-segment erosion event editor (collapsible, ≤3 events), fallback curve selector, blended retention preview chart, molecule expansion card + brand capture slider
- **PriceEventsTab** — Pre-LOE and Post-LOE sections sharing `PriceEventList` sub-component

---

## Sprint 3 — Complete: Analog Page + Multi-Region/Global Roles

### Type changes (`src/types/index.ts`)
- Add `UserRole`, `Region`, `AnalogCurve`, `DrugEntry`
- `User`: add `role: UserRole`, `regionId?: string`
- `DrugModel`: add `regionId`, `currency`, `exchangeRateToBase`
- `AppState`: remove `scenarios`, add `regions`, `drugs: DrugEntry[]`, `activeDrugId`, `analogCurves`, `activeRegionId?`

### New file: `src/lib/state.ts`
- `getActiveDrug(state)` — returns active `DrugEntry`
- `getVisibleDrugs(state)` — global: all or filtered by `activeRegionId`; regional: only their region

### Storage → v4
- Wrap existing `scenarios` into `DrugEntry`, initialize `drugs[]`, `regions`, `analogCurves`

### Auth (`src/constants/auth.ts`)
- Replace single user with `DEMO_USERS[]`:
  - `demo@alignstrategy.com` → global
  - `nordic@alignstrategy.com` → regional, regionId: 'nordics'
  - `uk@alignstrategy.com` → regional, regionId: 'uk'

### Demo data (`src/constants/demoData.ts`)
- `DEMO_REGIONS[]` — Nordics/DKK, UK/GBP, Germany/EUR
- `BRANDEX_UK` drug model
- `DEMO_DRUG_ENTRIES[]` — two drugs for global user's portfolio

### Context refactor (`src/context/AppContext.tsx`)
- New actions: `SET_ACTIVE_DRUG`, `SET_ACTIVE_REGION`, `ADD/UPDATE/REMOVE_ANALOG_CURVE`
- `UPDATE_DRUG` targets `state.drugs` by `activeDrugId`
- Context value: `setActiveDrug`, `setActiveRegion`, `addAnalogCurve`, etc.

### Update all page consumers
- Replace `state.scenarios[scenario].drug` → `getActiveDrug(state)?.scenarios[scenario].drug`
- In: `DashboardPage`, `InputsPage`, `PLPage`, `SalesPage`, `AppShell`, `Sidebar`

### New pages
- `/analog` — analog library (key-point input → 61-value interpolation), comparison chart (base/alternate + analogs), "use as basis" callout
- `/portfolio` — global users only; table of all drugs with KPIs; `setActiveDrug` + navigate to dashboard

### Sidebar changes
- Drug switcher (when `visibleDrugs.length > 1`)
- Region filter (global users only)
- "Analogs" nav item
- "Portfolio" nav item (global only)

---

## Sprint 4 — FX + Scenario Clone + Polish

- `ForecastPeriod`: add `grossSalesBase`, `netSalesBase`, `ebitBase` (÷ exchangeRateToBase)
- `AppState`: add `showBaseCurrency: boolean`
- New hook `src/hooks/useCurrencyFormat.ts` — used by PLPage and SalesPage
- `CLONE_SCENARIO` reducer action + "Copy Base → Alternate" button with AlertDialog
- Portfolio always shows EUR base values
- Dashboard: drug name + region badge, "View Portfolio →" CTA for global users

---

## Key constants

| Item | Value |
|---|---|
| Demo login (global) | `demo@alignstrategy.com` / `Pharma2026!` |
| Demo login (nordic) | `nordic@alignstrategy.com` / `Pharma2026!` |
| Demo login (UK) | `uk@alignstrategy.com` / `Pharma2026!` |
| Brand purple | `#7a00df` → `oklch(0.42 0.26 292)` |
| Sidebar charcoal | `#313131` → `oklch(0.245 0 0)` |
| Storage key | `loe_forecast_v3` (v4 after Sprint 3) |
| Chart hex colors | brand `#7a00df`, generic `#c084fc`, hist `#9ca3af`, grid `#e5e7eb`, LOE `#ef4444`, GP `#10b981` |
| Segment colors (Sales) | `#7a00df`, `#c084fc`, `#a855f7`, `#9333ea`, `#7c3aed` |
