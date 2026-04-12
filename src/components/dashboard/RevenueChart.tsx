import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import type { ForecastPeriod } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Props { forecast: ForecastPeriod[]; loeDate: string; }

function fmtRev(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v.toFixed(0)}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const rev = payload.find((p: any) => p.dataKey === 'grossSales');
  const gp = payload.find((p: any) => p.dataKey === 'brandGrossProfit');
  const gm = (rev?.value ?? 0) > 0 ? ((gp?.value ?? 0) / rev.value * 100).toFixed(1) : '0';
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2"><div className="size-2.5 rounded-sm bg-primary" /><span className="text-muted-foreground">Revenue</span></div>
          <span className="font-medium tabular-nums">{fmtRev(rev?.value ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2"><div className="size-2.5 rounded-sm" style={{ backgroundColor: '#10b981' }} /><span className="text-muted-foreground">Gross Profit</span></div>
          <span className="font-medium tabular-nums">{fmtRev(gp?.value ?? 0)}</span>
        </div>
        <div className="pt-1 mt-1 border-t border-border flex justify-between">
          <span className="text-muted-foreground">Gross margin</span>
          <span className="font-semibold" style={{ color: '#10b981' }}>{gm}%</span>
        </div>
      </div>
    </div>
  );
};

export default function RevenueChart({ forecast, loeDate }: Props) {
  const loeYear = loeDate.split('-')[0];
  const data = forecast.map(p => ({
    label: p.label,
    grossSales: Math.round(p.grossSales),
    brandGrossProfit: Math.round(p.brandGrossProfit),
    isPostLOE: p.isPostLOE, isHistorical: p.isHistorical,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Revenue & Gross Profit</CardTitle>
            <CardDescription>Annual EUR · All segments combined</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm bg-primary" />Brand Revenue</div>
            <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />Gross Profit</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtRev} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.8 }} />
            <ReferenceLine x={loeYear} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: 'LOE', position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 600 }} />
            <Bar dataKey="grossSales" name="Brand Revenue" radius={[3, 3, 0, 0]}>
              {data.map((e, i) => (
                <Cell key={i} fill={e.isHistorical ? '#9ca3af' : '#7a00df'} opacity={e.isPostLOE ? 0.65 : 1} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="brandGrossProfit" name="Gross Profit" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
