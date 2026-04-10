import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import type { ForecastPeriod } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Props { forecast: ForecastPeriod[]; loeDate: string; }

function fmtVol(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const brand = payload.find((p: any) => p.dataKey === 'brandVolume');
  const generic = payload.find((p: any) => p.dataKey === 'genericVolume');
  const total = (brand?.value ?? 0) + (generic?.value ?? 0);
  const share = total > 0 ? ((brand?.value ?? 0) / total * 100).toFixed(0) : '100';
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-md text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Brand:</span>
          <span className="font-medium tabular-nums">{fmtVol(brand?.value ?? 0)} units</span>
        </div>
        {(generic?.value ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-sm" style={{ backgroundColor: '#c084fc' }} />
            <span className="text-muted-foreground">Generic (est.):</span>
            <span className="font-medium tabular-nums">{fmtVol(generic?.value ?? 0)} units</span>
          </div>
        )}
        <div className="pt-1 mt-1 border-t border-border flex justify-between">
          <span className="text-muted-foreground">Brand share</span>
          <span className="font-semibold text-primary">{share}%</span>
        </div>
      </div>
    </div>
  );
};

export default function VolumeChart({ forecast, loeDate }: Props) {
  const loeYear = loeDate.split('-')[0];
  const data = forecast.map(p => ({
    label: p.label, brandVolume: p.brandVolume, genericVolume: p.genericVolume,
    isPostLOE: p.isPostLOE, isHistorical: p.isHistorical,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm">Volume Forecast</CardTitle>
            <CardDescription>Annual units · Historical + Projected</CardDescription>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm bg-primary" />Brand</div>
            <div className="flex items-center gap-1.5"><div className="size-3 rounded-sm" style={{ backgroundColor: '#c084fc' }} />Generic (est.)</div>
            <div className="flex items-center gap-1.5"><div className="w-6 border-t-2 border-dashed border-destructive" />LOE</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barSize={20} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtVol} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={38} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.8 }} />
            <ReferenceLine x={loeYear} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
              label={{ value: 'LOE', position: 'top', fill: '#ef4444', fontSize: 10, fontWeight: 600 }} />
            <Bar dataKey="brandVolume" name="Brand" stackId="a" radius={[3, 3, 0, 0]}>
              {data.map((e, i) => (
                <Cell key={i} fill={e.isHistorical ? '#9ca3af' : '#7a00df'} opacity={e.isPostLOE ? 0.7 : 1} />
              ))}
            </Bar>
            <Bar dataKey="genericVolume" name="Generic (est.)" stackId="a" radius={[3, 3, 0, 0]}>
              {data.map((_e, i) => <Cell key={i} fill="#c084fc" opacity={0.75} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-muted-foreground" />Grey = historical actuals</span>
          <span className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-primary" />Purple = projected (lighter post-LOE)</span>
        </div>
      </CardContent>
    </Card>
  );
}
