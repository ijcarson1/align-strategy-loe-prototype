# Align Strategy — LOE Forecasting Prototype

## Project context
Prototype web app for Align Strategy's LOE (Loss of Exclusivity) Forecasting SaaS.
Simulates a pharma client managing a single drug/brand (BRANDEX demo).

## Stack
- **React 18 + TypeScript** via Vite (`npm run dev` → port 5173)
- **Tailwind CSS v4** + **shadcn/ui** (nova preset, radix base) — components in `src/components/ui/`
- **Recharts** for all charts
- **React Router v6** — routes: `/` (login), `/dashboard`, `/inputs`, `/sales`, `/pl`
- **localStorage** key `loe_forecast_v2` for persistence (no backend); migrates from v1 automatically

## Demo credentials
- Email: `demo@alignstrategy.com`
- Password: `Pharma2026!`

## Brand
- Primary purple: `#7a00df` → `oklch(0.42 0.26 292)` in CSS vars
- Sidebar charcoal: `#313131` → `oklch(0.245 0 0)`
- **CRITICAL**: Recharts SVG attrs cannot use `hsl(var(--token))` — always use direct hex values in stroke/fill props

## Key source files
```
src/
├── types/index.ts              # DrugModel, ForecastPeriod, CostStructure, PriceEvent, AppState
├── constants/
│   ├── decayCurves.ts          # 6 decay curve arrays (61 monthly multipliers each)
│   ├── demoData.ts             # BRANDEX pre-filled data (with costStructure + priceEvents)
│   └── auth.ts                 # Hardcoded demo credentials
├── lib/
│   ├── forecasting.ts          # buildForecast(), computeKPIs() — pure functions
│   └── storage.ts              # localStorage helpers + v1→v2 migration
├── context/AppContext.tsx       # useReducer state — LOGIN, LOGOUT, UPDATE_DRUG, SET_ACTIVE_SCENARIO
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx       # LOE banner + KPIs + charts + scenario switcher
│   ├── InputsPage.tsx          # 5-tab form (market, volume, post-LOE, prices, costs)
│   ├── PLPage.tsx              # P&L table: Gross Sales → G2N → Net Sales → GP → EBIT
│   └── SalesPage.tsx           # Sales by segment: stacked bar chart + volume/revenue tables
└── components/
    ├── layout/
    │   ├── AppShell.tsx        # SidebarProvider + SidebarInset wrapping (dashboard-01 pattern)
    │   └── Sidebar.tsx         # shadcn Sidebar with NavUser dropdown; 4 nav items
    ├── dashboard/
    │   ├── KPICards.tsx
    │   ├── VolumeChart.tsx     # BarChart — stacked brand/generic
    │   ├── RevenueChart.tsx    # ComposedChart — bar revenue + line GP
    │   └── ScenarioPanel.tsx   # LineChart — base vs alternate post-LOE
    └── inputs/tabs/
        ├── MarketDetailsTab.tsx
        ├── BaselineVolumeTab.tsx   # Per-segment dampening sliders
        ├── PostLOEImpactTab.tsx    # Decay curve selector
        ├── PriceEventsTab.tsx      # Add/remove price events per segment
        └── CostInputsTab.tsx       # G2N ratio + headcount + other opex
```

## Layout pattern
Uses shadcn **dashboard-01** block pattern:
- `SidebarProvider` → `<AppSidebar />` + `<SidebarInset>`
- Header: `h-(--header-height)` with `SidebarTrigger` + content
- Page content: `px-4 lg:px-6` padding on all sections
- CSS var: `--header-height: 3.5rem` in `:root`

## Key type changes (Sprint 1)
- `dampeningFactor` moved from `DrugModel` to `MarketSegment` (per-segment)
- `brandRevenue` renamed to `grossSales` on `ForecastPeriod`
- New on `ForecastPeriod`: `netSales`, `smCosts`, `nonSmCosts`, `ebit`, `ebitMarginPct`
- New on `DrugModel`: `priceEvents: PriceEvent[]`, `costStructure: CostStructure`

## Forecast formulas
```
BlendedDampening = Σ(segment.weight × segment.dampeningFactor)
WeightedGrowth = (Y3/Y2-1)*0.6 + (Y2/Y1-1)*0.3 + (Y1/Y0-1)*0.1
PreLOEVol = PriorVol × (1 + WeightedGrowth × blendedDampening)
PostLOEBrandVol = annualVol × avg(decayCurve[monthStart..monthEnd])
EffectivePrice = basePrice × Π(1 + event.pctChange) for events before year
Revenue = vol × segmentWeight × effectivePrice (summed across segments)
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
