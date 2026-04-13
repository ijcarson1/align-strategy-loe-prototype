# Align Strategy — LOE Forecasting Prototype

## Project context
Prototype web app for Align Strategy's LOE (Loss of Exclusivity) Forecasting SaaS.
Multi-drug, multi-region pharma portfolio with global and regional user roles.

## Stack
- **React 18 + TypeScript** via Vite (`npm run dev` → port 5173)
- **Tailwind CSS v4** + **shadcn/ui** (nova preset, radix base) — components in `src/components/ui/`
- **Recharts** for all charts
- **React Router v6** — routes: `/` (login), `/dashboard`, `/inputs`, `/sales`, `/pl`, `/analog`, `/portfolio`
- **localStorage** key `loe_forecast_v4` for persistence (no backend); migrates from v3/v2/v1 automatically

## Demo credentials
| Email | Password | Role |
|---|---|---|
| `demo@alignstrategy.com` | `Pharma2026!` | Global |
| `nordic@alignstrategy.com` | `Pharma2026!` | Regional (Nordics) |
| `uk@alignstrategy.com` | `Pharma2026!` | Regional (UK) |

## Brand
- Primary purple: `#7a00df` → `oklch(0.42 0.26 292)` in CSS vars
- Sidebar charcoal: `#313131` → `oklch(0.245 0 0)`
- **CRITICAL**: Recharts SVG attrs cannot use `hsl(var(--token))` — always use direct hex values in stroke/fill props

## Key source files
```
src/
├── types/index.ts              # All types: DrugModel, ForecastPeriod, Region, DrugEntry, AnalogCurve, AppState
├── constants/
│   ├── decayCurves.ts          # 6 decay curve arrays (61 monthly multipliers each)
│   ├── demoData.ts             # DEMO_DRUG, BRANDEX_UK, DEMO_DRUG_ENTRIES, DEMO_REGIONS
│   └── auth.ts                 # DEMO_USERS[] — global + 2 regional credentials
├── lib/
│   ├── forecasting.ts          # buildForecast(), computeKPIs(), computeRampProgress() — pure functions
│   ├── storage.ts              # localStorage helpers; v4 with migration from v3/v2/v1
│   └── state.ts                # getActiveDrug(state), getVisibleDrugs(state) — role-aware helpers
├── context/AppContext.tsx       # useReducer — LOGIN, LOGOUT, UPDATE_DRUG, SET_ACTIVE_DRUG, SET_ACTIVE_REGION,
│                               #   SET_ACTIVE_SCENARIO, ADD/UPDATE/REMOVE_ANALOG_CURVE, LOAD_FROM_STORAGE
├── pages/
│   ├── LoginPage.tsx           # Shows all 3 credential sets
│   ├── DashboardPage.tsx       # LOE banner (drug name + region badge) + KPIs + charts + scenario switcher
│   ├── InputsPage.tsx          # 5-tab form (market, volume, post-LOE, prices, costs)
│   ├── PLPage.tsx              # P&L table: Gross Sales → G2N → Net Sales → GP → EBIT
│   ├── SalesPage.tsx           # Sales by segment: stacked bar chart + volume/revenue tables
│   ├── AnalogPage.tsx          # Analog library: key-point curves + retention comparison chart
│   └── PortfolioPage.tsx       # Global users: drug table + region filter + KPIs per drug
└── components/
    ├── layout/
    │   ├── AppShell.tsx        # SidebarProvider + SidebarInset; page title map includes /analog, /portfolio
    │   └── Sidebar.tsx         # Drug switcher (>1 visible), region filter (global), Analogs + Portfolio nav
    ├── dashboard/
    │   ├── KPICards.tsx
    │   ├── VolumeChart.tsx     # BarChart — stacked brand/generic
    │   ├── RevenueChart.tsx    # ComposedChart — bar revenue + line GP
    │   └── ScenarioPanel.tsx   # LineChart — base vs alternate post-LOE
    └── inputs/tabs/
        ├── MarketDetailsTab.tsx
        ├── BaselineVolumeTab.tsx    # Per-segment dampening sliders
        ├── PostLOEImpactTab.tsx     # Approach toggle, per-segment erosion events, molecule expansion
        ├── PriceEventsTab.tsx       # Pre-LOE + Post-LOE price event sections
        └── CostInputsTab.tsx        # G2N ratio + headcount + other opex
```

## State shape (AppState — Sprint 3)
```typescript
{
  isAuthenticated: boolean;
  user: User | null;               // user.role: 'global' | 'regional'; user.regionId?: string
  activeScenario: 'base' | 'alternate';
  drugs: DrugEntry[];              // each DrugEntry: { id, regionId, scenarios: {base, alternate} }
  activeDrugId: string;
  regions: Region[];
  analogCurves: AnalogCurve[];
  activeRegionId?: string;         // global user region filter
  forecast: { base: ForecastPeriod[]; alternate: ForecastPeriod[] }; // derived, not persisted
}
```

## Access pattern
Always use helpers from `src/lib/state.ts`:
- `getActiveDrug(state)` → active `DrugEntry | undefined`
- `getVisibleDrugs(state)` → filtered by role/region

**Never access `state.scenarios` directly** — it was removed in Sprint 3.

## Layout pattern
Uses shadcn **dashboard-01** block pattern:
- `SidebarProvider` → `<AppSidebar />` + `<SidebarInset>`
- Header: `h-(--header-height)` with `SidebarTrigger` + content
- Page content: `px-4 lg:px-6` padding on all sections
- CSS var: `--header-height: 3.5rem` in `:root`

## Forecast formulas
```
BlendedDampening = Σ(segment.weight × segment.dampeningFactor)
WeightedGrowth = (Y3/Y2-1)*0.6 + (Y2/Y1-1)*0.3 + (Y1/Y0-1)*0.1
PreLOEVol = PriorVol × (1 + WeightedGrowth × blendedDampening)
PostLOEBrandVol (global curve) = annualVol × avg(decayCurve[monthStart..monthEnd])
PostLOEBrandVol (per-segment) = Σ(segVol × avgRetention) where retention = Π(1 - peakErosion × rampProgress)
  — NaN retention signals "use global curve for that segment"
ExpansionVol = avg(peakAdditionalVolume × rampProgress) over 12 months; brand gets brandCaptureOfExpansion share
EffectivePrice = basePrice × Π(1 + event.pctChange) for all events (pre + post) before year
EBIT = NetSales − COGS − SmCosts − NonSmCosts
```

## Hex colors used in charts (not CSS vars)
- Brand purple: `#7a00df`
- Generic purple: `#c084fc`
- Historical grey: `#9ca3af`
- Grid lines: `#e5e7eb`
- LOE reference line: `#ef4444`
- Gross profit line: `#10b981`
- Segment colors (Sales page): `#7a00df`, `#c084fc`, `#a855f7`, `#9333ea`, `#7c3aed`
- Analog curve colors: `#7a00df`, `#10b981`, `#f59e0b`, `#3b82f6`
