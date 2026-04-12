import { useApp } from '../context/AppContext';
import { computeKPIs } from '../lib/forecasting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function fmtM(v: number, decimals = 1) {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(decimals)}M`;
  if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v.toFixed(0)}`;
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function rowColor(label: string, v: number) {
  if (label === 'EBIT') return v >= 0 ? 'text-green-600' : 'text-destructive';
  return '';
}

export default function PLPage() {
  const { state } = useApp();
  const forecast = state.forecast[state.activeScenario];
  const drug = state.scenarios[state.activeScenario].drug;
  const kpis = computeKPIs(forecast);

  // Only show post-historical periods (projected + post-LOE)
  const periods = forecast.filter(p => !p.isHistorical);
  const loeYear = parseInt(drug.loeDate.split('-')[0], 10);

  const cs = drug.costStructure;
  const totalSmCosts = [
    ...cs.smHeadcount.map(l => l.fte * l.costPerFte),
    ...cs.smOtherCosts.map(l => l.annualCost),
  ].reduce((a, b) => a + b, 0);
  const totalNonSmCosts = [
    ...cs.nonSmHeadcount.map(l => l.fte * l.costPerFte),
    ...cs.nonSmOtherCosts.map(l => l.annualCost),
  ].reduce((a, b) => a + b, 0);

  const postLOE = forecast.filter(p => p.isPostLOE);
  const cumEBIT = postLOE.reduce((s, p) => s + p.ebit, 0);

  const rows: { label: string; isSection?: boolean; isBold?: boolean; values: (number | null)[]; pcts?: (number | null)[]; pctLabel?: string }[] = [
    {
      label: 'Gross Sales', isBold: true,
      values: periods.map(p => p.grossSales),
    },
    {
      label: `Gross-to-Net (${(cs.grossToNetRatio * 100).toFixed(0)}%)`, isSection: false,
      values: periods.map(p => p.netSales - p.grossSales), // negative deduction
    },
    {
      label: 'Net Sales', isBold: true,
      values: periods.map(p => p.netSales),
    },
    {
      label: 'COGS', isSection: false,
      values: periods.map(p => -(p.grossSales - p.brandGrossProfit)),
    },
    {
      label: 'Gross Profit', isBold: true,
      values: periods.map(p => p.brandGrossProfit),
      pcts: periods.map(p => p.grossMarginPct),
      pctLabel: '% of Net Sales',
    },
    {
      label: 'S&M Costs', isSection: false,
      values: periods.map(() => -totalSmCosts),
    },
    {
      label: 'Non-S&M / Overhead', isSection: false,
      values: periods.map(() => -totalNonSmCosts),
    },
    {
      label: 'EBIT', isBold: true,
      values: periods.map(p => p.ebit),
      pcts: periods.map(p => p.ebitMarginPct),
      pctLabel: '% of Net Sales',
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header */}
      <div className="px-4 lg:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{drug.drugName} — P&L</h2>
          <p className="text-sm text-muted-foreground">
            {state.activeScenario === 'base' ? 'Base Case' : 'Alternate Case'} · LOE {drug.loeDate}
          </p>
        </div>
        <Badge variant={state.activeScenario === 'base' ? 'default' : 'destructive'}>
          {state.activeScenario === 'base' ? 'Base Case' : 'Alternate Case'}
        </Badge>
      </div>

      {/* KPI strip */}
      <div className="px-4 lg:px-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Peak Pre-LOE Revenue', value: fmtM(kpis.peakPreLOERevenue) },
          { label: '5-Year Post-LOE Revenue', value: fmtM(kpis.cumulativePostLOERevenue) },
          { label: 'Avg. Gross Margin', value: fmtPct(kpis.avgPostLOEGrossMargin) },
          { label: '5-Year Cumulative EBIT', value: fmtM(cumEBIT), negative: cumEBIT < 0 },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{c.label}</p>
              <p className={`text-xl font-bold tabular-nums ${(c as any).negative ? 'text-destructive' : 'text-primary'}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="px-4 lg:px-6">
        <Separator />
      </div>

      {/* P&L Table */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Annual P&L (€)</CardTitle>
            <CardDescription>Projected periods only · Opex held constant year-over-year</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-44">Line item</TableHead>
                  {periods.map(p => (
                    <TableHead key={p.label} className="text-right min-w-24 whitespace-nowrap">
                      <span className={p.year === loeYear ? 'text-destructive font-semibold' : ''}>
                        {p.label}
                      </span>
                      {p.year === loeYear && <span className="ml-1 text-[10px] text-destructive">LOE</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <TableRow
                    key={row.label}
                    className={row.isBold ? 'bg-muted/40 font-semibold' : ''}
                  >
                    <TableCell className={`text-sm ${row.isBold ? 'font-semibold' : 'text-muted-foreground pl-6'}`}>
                      {row.label}
                    </TableCell>
                    {row.values.map((v, i) => (
                      <TableCell
                        key={i}
                        className={`text-right tabular-nums text-sm ${
                          row.isBold ? `font-semibold ${rowColor(row.label, v ?? 0)}` : ''
                        } ${(v ?? 0) < 0 && !row.isBold ? 'text-muted-foreground' : ''}`}
                      >
                        {v === null ? '—' : fmtM(v)}
                        {row.pcts && (
                          <div className="text-[10px] text-muted-foreground font-normal">
                            {fmtPct(row.pcts[i] ?? 0)}
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Cost breakdown */}
      <div className="px-4 lg:px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">S&M Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {cs.smHeadcount.filter(l => l.fte > 0).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground">{l.name}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtM(l.fte * l.costPerFte)}</TableCell>
                  </TableRow>
                ))}
                {cs.smOtherCosts.filter(l => l.annualCost > 0).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground">{l.name}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtM(l.annualCost)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/40">
                  <TableCell>Total S&M</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtM(totalSmCosts)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Non-S&M Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {cs.nonSmHeadcount.filter(l => l.fte > 0).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground">{l.name}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtM(l.fte * l.costPerFte)}</TableCell>
                  </TableRow>
                ))}
                {cs.nonSmOtherCosts.filter(l => l.annualCost > 0).map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground">{l.name}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtM(l.annualCost)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/40">
                  <TableCell>Total Non-S&M</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtM(totalNonSmCosts)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
