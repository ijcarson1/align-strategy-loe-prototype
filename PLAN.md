# LOE Forecasting Prototype — Development Plan

## Status: Sprint 1 complete (as of 2026-04-12)

---

## What's Built

### Core (complete)
- **Login page** — two-column layout (shadcn login-02 pattern), demo credentials hint, brand right panel
- **AppShell** — shadcn dashboard-01 pattern: `SidebarProvider` → `AppSidebar` + `SidebarInset`, collapsible sidebar
- **Sidebar** — NavUser with DropdownMenu, active route highlighting, drug/LOE display
- **Dashboard page** — LOE countdown banner, 4 KPI cards, volume chart (stacked bar), revenue chart (bar+line), scenario comparison panel
- **Inputs page** — 4-tab form: Market Details, Baseline Volume, Post-LOE Impact, Cost Inputs
- **Forecast engine** — momentum-based pre-LOE growth, decay curve post-LOE erosion, segment revenue/GP
- **Scenario system** — Base Case + Alternate Case, independently editable, live chart updates
- **localStorage persistence** — key `loe_forecast_v1`

### Tech stack
- React 18 + TypeScript, Vite (port 5173: `npm run dev`)
- Tailwind CSS v4 + shadcn/ui (nova preset, radix base)
- Recharts for all charts
- React Router v6: `/` (login), `/dashboard`, `/inputs`

---

## Excel Gap Analysis — Features to Implement

Analysed: `LOE Forecasting Tool_02APR26_Example data.xlsm` (15 sheets)

### Priority 1 — Full P&L with Gross-to-Net + Opex ⬅ Sprint 1
**Excel sheets**: COSTS, P&L

P&L flow:
```
Gross Sales
× Gross-to-Net ratio (default 0.95)
= Net Sales
− COGS
= Gross Profit
− S&M costs (headcount + other)
− Non-S&M costs (headcount + other)
= EBIT
```

Types to add to `DrugModel`:
```typescript
interface HeadcountLine {
  id: string;
  name: string;       // e.g. "Sales Reps", "MSLs"
  fte: number;
  costPerFte: number; // annual €
}

interface OtherCostLine {
  id: string;
  name: string;
  annualCost: number;
}

interface CostStructure {
  grossToNetRatio: number;          // 0–1, default 0.95
  smHeadcount: HeadcountLine[];     // 5 lines (Sales Reps, MSLs, KAMs, Marketing, Other)
  smOtherCosts: OtherCostLine[];    // 3 lines
  nonSmHeadcount: HeadcountLine[];  // 5 lines (Medical, Regulatory, Finance, HR, Other)
  nonSmOtherCosts: OtherCostLine[]; // 3 lines
}
```

Add `costStructure: CostStructure` to `DrugModel`.

Extend `ForecastPeriod`:
```typescript
netSales: number;
smCosts: number;
nonSmCosts: number;
ebit: number;
ebitMarginPct: number;
```

New routes: `/pl` (P&L table) and `/sales` (Sales by segment table) — add to sidebar.

### Priority 2 — Price Events ⬅ Sprint 1
**Excel sheet**: INPUT (up to 4 price events per segment, each with month + % impact)

```typescript
interface PriceEvent {
  id: string;
  segmentId: string;
  effectiveMonth: string; // "YYYY-MM"
  pctChange: number;      // e.g. -0.05 = −5%
}
```

Add `priceEvents: PriceEvent[]` to `DrugModel`.
Extend `buildForecast()` to apply cumulative price adjustments from event month onward.

### Priority 3 — Volume Events / New SKUs ⬅ Sprint 2
**Excel sheet**: Data Input (New SKU section with launch month, peak share, uptake curve, per-scenario toggle)

```typescript
interface VolumeEvent {
  id: string;
  name: string;
  launchMonth: string;    // "YYYY-MM"
  peakSharePct: number;   // 0–1, share of total molecule volume at peak
  uptakeCurveId: string;  // references one of the decay curves used in reverse
  includeInBase: boolean;
  includeInAlternate: boolean;
}
```

Add `volumeEvents: VolumeEvent[]` to `DrugModel`.

### Priority 4 — Per-Segment Dampening Factors ⬅ Sprint 1 (quick win)
**Excel sheet**: INPUT (separate dampening per segment: 0.5–0.8)

Move `dampeningFactor` from top-level `DrugModel` to `MarketSegment`:
```typescript
interface MarketSegment {
  ...
  dampeningFactor: number; // was top-level
}
```

Update `buildForecast()` and all input UI.

### Priority 5 — Analog Curves Reference Panel ⬅ Sprint 2
**Excel sheet**: ANALOG (static dataset of 3–5 analog molecules for benchmarking decay)

Static reference data, no user input. Display in Post-LOE Impact tab or a new `/analogs` page.

### Priority 6 — Scenario Export ⬅ Sprint 3
Export P&L / Sales tables as CSV. Possibly PDF via `@react-pdf/renderer`.

---

## Sprint 1 — COMPLETE

All items delivered:

1. ✅ **Storage migration** — `loe_forecast_v2` with v1→v2 migration (adds dampening per segment, costStructure, priceEvents)
2. ✅ **Types** — `CostStructure`, `HeadcountLine`, `OtherCostLine`, `PriceEvent` added; `dampeningFactor` moved to `MarketSegment`
3. ✅ **demoData** — `DEMO_DRUG` updated with realistic demo `costStructure` (22 FTEs) and empty `priceEvents`
4. ✅ **forecasting.ts** — per-segment blended dampening, price events applied by month, EBIT = Net Sales − COGS − S&M − Non-S&M
5. ✅ **Cost inputs tab** — G2N ratio slider, headcount tables (5 S&M + 5 non-S&M), other cost lines (3+3)
6. ✅ **Price Events tab** — new tab 4 in Inputs; add/remove events per segment with month picker and % impact
7. ✅ **P&L page** (`/pl`) — full P&L table (Gross Sales → G2N → Net Sales → COGS → GP → Opex → EBIT) with KPI strip and cost breakdowns
8. ✅ **Sales page** (`/sales`) — stacked bar chart + volume table + revenue table by segment
9. ✅ **Sidebar nav** — Sales (`TrendingUpIcon`) and P&L (`TableIcon`) added

---

## Sprint 2 — Next

- Volume Events / New SKUs (Priority 3) — `VolumeEvent[]` with launch month, peak share, uptake curve
- Analog Curves Reference Panel (Priority 5)
- Scenario Export CSV (Priority 6)
- UI polish pass: ensure all shadcn components consistent, responsive at all breakpoints

## Known Minor Issues

- `hsl(var(--...))` in `PostLOEImpactTab` area chart gradient — cosmetic only, no functional impact
- Large bundle (869 kB) — consider code-splitting `/pl` and `/sales` pages in Sprint 2

---

## Key Constants

| Item | Value |
|------|-------|
| Demo login | `demo@alignstrategy.com` / `Pharma2026!` |
| Brand purple | `#7a00df` → `oklch(0.42 0.26 292)` |
| Sidebar charcoal | `#313131` → `oklch(0.245 0 0)` |
| Storage key | `loe_forecast_v2` (after migration) |
| Chart hex colors | brand `#7a00df`, generic `#c084fc`, historical `#9ca3af`, grid `#e5e7eb`, LOE line `#ef4444`, GP line `#10b981` |
