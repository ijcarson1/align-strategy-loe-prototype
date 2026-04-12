import type { DrugModel } from '../../../types';
import { buildForecast } from '../../../lib/forecasting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';

interface Props {
  drug: DrugModel;
  onChange: (drug: DrugModel) => void;
  onBack: () => void;
  onNext: () => void;
}

function fmtVol(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));
}

export default function BaselineVolumeTab({ drug, onChange, onBack, onNext }: Props) {
  const preview = buildForecast(drug);
  const chartData = preview.map(p => ({ label: p.label, units: p.brandVolume + p.genericVolume }));
  const loeYear = drug.loeDate.split('-')[0];
  const sorted = [...drug.historicalVolumes].sort((a, b) => a.year - b.year);

  function updateVolume(year: number, units: number) {
    onChange({ ...drug, historicalVolumes: drug.historicalVolumes.map(v => v.year === year ? { ...v, units } : v) });
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      {/* Historical volumes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historical Volume Data</CardTitle>
          <CardDescription>Annual volume (units / doses). Forecast uses last 4 years for momentum.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Volume (units)</TableHead>
                <TableHead className="text-right">YoY Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((hv, idx) => {
                const prev = sorted[idx - 1];
                const growth = prev && prev.units > 0 ? ((hv.units / prev.units) - 1) * 100 : null;
                return (
                  <TableRow key={hv.year}>
                    <TableCell className="font-medium">{hv.year}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        value={hv.units}
                        min={0}
                        step={100}
                        onChange={e => updateVolume(hv.year, Number(e.target.value))}
                        className="w-28 text-right tabular-nums ml-auto"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {growth !== null ? (
                        <Badge variant={growth >= 0 ? 'default' : 'destructive'} className="text-xs tabular-nums">
                          {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                        </Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per-segment Dampening Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Growth Dampening Factors</CardTitle>
          <CardDescription>Controls how quickly historical momentum fades per segment. 1.0 = full momentum, 0.5 = 50% of trend.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {drug.segments.map((seg, idx) => (
              <div key={seg.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span className="text-sm font-medium w-40 flex-shrink-0">{seg.name}</span>
                <Slider
                  value={[seg.dampeningFactor]}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  onValueChange={([v]) => onChange({
                    ...drug,
                    segments: drug.segments.map((s, i) => i === idx ? { ...s, dampeningFactor: v } : s),
                  })}
                  className="w-48"
                />
                <Badge variant="secondary" className="font-mono text-sm tabular-nums w-12 justify-center">
                  {seg.dampeningFactor.toFixed(2)}
                </Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">0.10 — Conservative · 0.70 — Default · 1.00 — Full momentum</p>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume Projection Preview</CardTitle>
          <CardDescription>Updates live as you adjust inputs above</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtVol} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip formatter={(v) => [fmtVol(Number(v ?? 0)) + ' units', 'Volume']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <ReferenceLine x={loeYear} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="units" stroke="#7a00df" strokeWidth={2} fill="url(#volGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13l-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </Button>
        <Button onClick={onNext}>
          Next: Post-LOE Impact
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Button>
      </div>
    </div>
  );
}
