import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { ForecastPeriod } from '../../types';
import type { DecayCurve } from '../../constants/decayCurves';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Props {
  baseForecast: ForecastPeriod[];
  alternateForecast: ForecastPeriod[];
  baseLabel: string;
  alternateLabel: string;
  baseCurve: DecayCurve;
  alternateCurve: DecayCurve;
}

function fmtRev(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v.toFixed(0)}`;
}

export default function ScenarioPanel({ baseForecast, alternateForecast, baseLabel, alternateLabel, baseCurve, alternateCurve }: Props) {
  const basePost = baseForecast.filter(p => p.isPostLOE);
  const altPost = alternateForecast.filter(p => p.isPostLOE);
  const chartData = basePost.map((p, i) => ({
    label: p.label,
    base: Math.round(p.grossSales),
    alternate: Math.round(altPost[i]?.grossSales ?? 0),
  }));
  const baseCum = basePost.reduce((s, p) => s + p.grossSales, 0);
  const altCum = altPost.reduce((s, p) => s + p.grossSales, 0);
  const delta = baseCum - altCum;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-2.5 shadow-md text-xs">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.dataKey === 'base' ? baseLabel : alternateLabel}:</span>
            <span className="font-medium">{fmtRev(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Scenario Comparison</CardTitle>
        <CardDescription>Post-LOE brand revenue</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        {/* Curve labels */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 rounded bg-primary" />
              <span className="text-muted-foreground">{baseLabel}</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">{baseCurve.shortLabel}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0 border-t-2 border-dashed border-destructive" />
              <span className="text-muted-foreground">{alternateLabel}</span>
            </div>
            <Badge variant="secondary" className="text-[10px]">{alternateCurve.shortLabel}</Badge>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmtRev(v)} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="base" stroke="#7a00df" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="alternate" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <Separator />

        {/* Delta summary */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">5-year cumulative delta</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{baseLabel}</p>
              <p className="text-base font-bold tabular-nums text-primary">{fmtRev(baseCum)}</p>
            </div>
            <Badge variant={delta >= 0 ? 'default' : 'destructive'} className="text-xs">
              {delta >= 0 ? '+' : ''}{fmtRev(Math.abs(delta))}
            </Badge>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{alternateLabel}</p>
              <p className="text-base font-bold tabular-nums text-destructive">{fmtRev(altCum)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
