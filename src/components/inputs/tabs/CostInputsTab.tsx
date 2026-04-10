import { useNavigate } from 'react-router-dom';
import type { DrugModel, MarketSegment } from '../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

interface Props { drug: DrugModel; onChange: (drug: DrugModel) => void; onBack: () => void; }

function fmtCcy(v: number) { return `€${v.toFixed(2)}`; }

export default function CostInputsTab({ drug, onChange, onBack }: Props) {
  const navigate = useNavigate();

  function updateSegment(idx: number, patch: Partial<MarketSegment>) {
    onChange({ ...drug, segments: drug.segments.map((s, i) => i === idx ? { ...s, ...patch } : s) });
  }

  const wAvgPrice = drug.segments.reduce((s, seg) => s + seg.weight * seg.pricePerUnit, 0);
  const wAvgCOGS = drug.segments.reduce((s, seg) => s + seg.weight * seg.cogsPerUnit, 0);
  const wGM = wAvgPrice > 0 ? (wAvgPrice - wAvgCOGS) / wAvgPrice : 0;

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing & Cost of Goods</CardTitle>
          <CardDescription>Average selling price and COGS per unit for each market segment.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead className="text-center">Weight</TableHead>
                <TableHead className="text-right">Price / Unit</TableHead>
                <TableHead className="text-right">COGS / Unit</TableHead>
                <TableHead className="text-right">Gross Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drug.segments.map((seg, idx) => {
                const gm = seg.pricePerUnit > 0 ? ((seg.pricePerUnit - seg.cogsPerUnit) / seg.pricePerUnit) * 100 : 0;
                const gmColor = gm >= 70 ? 'text-green-600' : gm >= 50 ? 'text-amber-600' : 'text-destructive';
                return (
                  <TableRow key={seg.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{seg.name}</p>
                        <p className="text-xs text-muted-foreground">{Math.round(seg.weight * 100)}% of volume</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="h-1.5 rounded-full bg-primary/50" style={{ width: `${seg.weight * 56}px` }} />
                        <span className="text-xs text-muted-foreground">{Math.round(seg.weight * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-muted-foreground text-xs">€</span>
                        <Input
                          type="number"
                          value={seg.pricePerUnit}
                          min={0}
                          step={0.1}
                          onChange={e => updateSegment(idx, { pricePerUnit: Number(e.target.value) })}
                          className="w-20 text-right tabular-nums"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-muted-foreground text-xs">€</span>
                        <Input
                          type="number"
                          value={seg.cogsPerUnit}
                          min={0}
                          step={0.05}
                          onChange={e => updateSegment(idx, { cogsPerUnit: Number(e.target.value) })}
                          className="w-20 text-right tabular-nums"
                        />
                      </div>
                    </TableCell>
                    <TableCell className={`text-right text-sm font-semibold tabular-nums ${gmColor}`}>
                      {gm.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Blended</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold tabular-nums">{fmtCcy(wAvgPrice)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{fmtCcy(wAvgCOGS)}</TableCell>
                <TableCell className={`text-right font-bold tabular-nums ${wGM >= 0.7 ? 'text-green-600' : wGM >= 0.5 ? 'text-amber-600' : 'text-destructive'}`}>
                  {(wGM * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Blended Avg. Price', value: fmtCcy(wAvgPrice), sub: 'Volume-weighted', color: 'text-primary' },
          { label: 'Blended Avg. COGS', value: fmtCcy(wAvgCOGS), sub: 'Volume-weighted', color: 'text-foreground' },
          { label: 'Blended Gross Margin', value: `${(wGM * 100).toFixed(1)}%`, sub: 'Pre-LOE benchmark',
            color: wGM >= 0.7 ? 'text-green-600' : wGM >= 0.5 ? 'text-amber-600' : 'text-destructive' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{c.label}</p>
              <p className={`text-xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Complete note */}
      <div className="rounded-lg border border-primary/20 bg-accent/30 p-4 flex items-start gap-3">
        <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 4" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">All inputs configured</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your forecast is live. Changes update charts immediately.</p>
          <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-primary text-xs" onClick={() => navigate('/dashboard')}>
            View Dashboard →
          </Button>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13l-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </Button>
        <Button onClick={() => navigate('/dashboard')}>
          View Dashboard
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Button>
      </div>
    </div>
  );
}
