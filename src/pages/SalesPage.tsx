import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

function fmtM(v: number) {
  if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v.toFixed(0)}`;
}

function fmtVol(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));
}

const SEG_COLORS = ['#7a00df', '#c084fc', '#a855f7', '#9333ea', '#7c3aed'];

export default function SalesPage() {
  const { state } = useApp();
  const forecast = state.forecast[state.activeScenario];
  const drug = state.scenarios[state.activeScenario].drug;

  const periods = forecast.filter(p => !p.isHistorical);
  const loeYear = parseInt(drug.loeDate.split('-')[0], 10);

  // Chart data — stacked by segment
  const chartData = periods.map(p => {
    const row: Record<string, number | string> = { label: p.label };
    for (const seg of p.segmentBreakdown) {
      row[seg.segmentName] = Math.round(seg.revenue);
    }
    return row;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-md text-xs min-w-40">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {[...payload].reverse().map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full" style={{ backgroundColor: p.fill }} />
              <span className="text-muted-foreground">{p.dataKey}</span>
            </div>
            <span className="font-medium tabular-nums">{fmtM(p.value)}</span>
          </div>
        ))}
        <div className="pt-1 mt-1 border-t border-border flex justify-between font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{fmtM(total)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header */}
      <div className="px-4 lg:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{drug.drugName} — Sales by Segment</h2>
          <p className="text-sm text-muted-foreground">
            {state.activeScenario === 'base' ? 'Base Case' : 'Alternate Case'} · Gross sales (pre-G2N)
          </p>
        </div>
        <Badge variant={state.activeScenario === 'base' ? 'default' : 'destructive'}>
          {state.activeScenario === 'base' ? 'Base Case' : 'Alternate Case'}
        </Badge>
      </div>

      {/* Stacked bar chart */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Revenue by Segment — Annual (€)</CardTitle>
                <CardDescription>Stacked gross sales · LOE in {drug.loeDate}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                {drug.segments.map((seg, i) => (
                  <div key={seg.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="size-2.5 rounded-sm" style={{ backgroundColor: SEG_COLORS[i] }} />
                    {seg.name}
                  </div>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtM} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={54} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', opacity: 0.8 }} />
                {drug.segments.map((seg, i) => (
                  <Bar key={seg.id} dataKey={seg.name} stackId="rev" fill={SEG_COLORS[i]} radius={i === drug.segments.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}>
                    {chartData.map((_entry, idx) => {
                      const p = periods[idx];
                      return <Cell key={idx} opacity={p.isPostLOE ? 0.65 : 1} />;
                    })}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Separator />
      </div>

      {/* Volume table */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Volume by Segment (units)</CardTitle>
            <CardDescription>Brand volume allocated by segment weight</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-44">Segment</TableHead>
                  {periods.map(p => (
                    <TableHead key={p.label} className="text-right min-w-20 whitespace-nowrap">
                      <span className={p.year === loeYear ? 'text-destructive font-semibold' : ''}>{p.label}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drug.segments.map((seg, si) => (
                  <TableRow key={seg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SEG_COLORS[si] }} />
                        <span className="text-sm">{seg.name}</span>
                        <Badge variant="outline" className="text-[10px]">{Math.round(seg.weight * 100)}%</Badge>
                      </div>
                    </TableCell>
                    {periods.map(p => {
                      const sd = p.segmentBreakdown.find(s => s.segmentId === seg.id);
                      return (
                        <TableCell key={p.label} className="text-right tabular-nums text-sm">
                          {fmtVol(sd?.volume ?? 0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold text-sm">Total brand volume</TableCell>
                  {periods.map(p => (
                    <TableCell key={p.label} className="text-right tabular-nums font-semibold text-sm">
                      {fmtVol(p.brandVolume)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Revenue table */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue by Segment (€)</CardTitle>
            <CardDescription>Gross sales · segment price applied per year</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-44">Segment</TableHead>
                  {periods.map(p => (
                    <TableHead key={p.label} className="text-right min-w-24 whitespace-nowrap">
                      <span className={p.year === loeYear ? 'text-destructive font-semibold' : ''}>{p.label}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {drug.segments.map((seg, si) => (
                  <TableRow key={seg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SEG_COLORS[si] }} />
                        <span className="text-sm">{seg.name}</span>
                      </div>
                    </TableCell>
                    {periods.map(p => {
                      const sd = p.segmentBreakdown.find(s => s.segmentId === seg.id);
                      return (
                        <TableCell key={p.label} className="text-right tabular-nums text-sm">
                          {fmtM(sd?.revenue ?? 0)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold text-sm">Total gross sales</TableCell>
                  {periods.map(p => (
                    <TableCell key={p.label} className="text-right tabular-nums font-semibold text-sm text-primary">
                      {fmtM(p.grossSales)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
