import type { DrugModel } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPIs {
  peakPreLOERevenue: number;
  cumulativePostLOERevenue: number;
  revenueAtRisk: number;
  avgPostLOEGrossMargin: number;
}

function fmt(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v.toFixed(0)}`;
}

interface CardDef {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
}

function KPICard({ label, value, sub, color, icon }: CardDef) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
            {label}
          </CardTitle>
          <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
            <span style={{ color }}>{icon}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-bold tabular-nums')} style={{ color, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function KPICards({ kpis, drug }: { kpis: KPIs; drug: DrugModel }) {
  const cards: CardDef[] = [
    {
      label: 'Peak Pre-LOE Revenue',
      value: fmt(kpis.peakPreLOERevenue),
      sub: 'Highest annual revenue before LOE',
      color: 'hsl(var(--primary))',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12L6 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      label: '5-Year Post-LOE Revenue',
      value: fmt(kpis.cumulativePostLOERevenue),
      sub: 'Cumulative brand revenue after LOE',
      color: '#a040ff',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="8" width="3" height="6" rx="1" fill="currentColor"/><rect x="6.5" y="5" width="3" height="9" rx="1" fill="currentColor"/><rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor"/></svg>,
    },
    {
      label: 'Revenue at Risk',
      value: fmt(kpis.revenueAtRisk),
      sub: 'Year 3 shortfall vs. peak pre-LOE',
      color: 'hsl(var(--destructive))',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 12l3 2 3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/></svg>,
    },
    {
      label: 'Avg. Post-LOE Gross Margin',
      value: `${(kpis.avgPostLOEGrossMargin * 100).toFixed(1)}%`,
      sub: `Across ${drug.segments.length} segments · 5-year avg.`,
      color: '#10b981',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1 0 12 0A6 6 0 0 0 2 8z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(c => <KPICard key={c.label} {...c} />)}
    </div>
  );
}
