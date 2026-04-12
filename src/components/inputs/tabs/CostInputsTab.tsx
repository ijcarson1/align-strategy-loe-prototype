import { useNavigate } from 'react-router-dom';
import type { DrugModel, MarketSegment, HeadcountLine, OtherCostLine, CostStructure } from '../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Props { drug: DrugModel; onChange: (drug: DrugModel) => void; onBack: () => void; }

function fmtCcy(v: number) { return `€${v.toFixed(2)}`; }
function fmtK(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v.toFixed(0)}`;
}

function updateCost(drug: DrugModel, patch: Partial<CostStructure>): DrugModel {
  return { ...drug, costStructure: { ...drug.costStructure, ...patch } };
}

function HeadcountSection({
  title, lines, onUpdate,
}: {
  title: string;
  lines: HeadcountLine[];
  onUpdate: (lines: HeadcountLine[]) => void;
}) {
  const total = lines.reduce((s, l) => s + l.fte * l.costPerFte, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant="secondary" className="tabular-nums text-xs">{fmtK(total)}</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead className="text-right w-20">FTEs</TableHead>
            <TableHead className="text-right w-32">Cost / FTE (€)</TableHead>
            <TableHead className="text-right w-28">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, idx) => (
            <TableRow key={line.id}>
              <TableCell className="text-sm">{line.name}</TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  value={line.fte}
                  min={0}
                  step={0.5}
                  onChange={e => onUpdate(lines.map((l, i) => i === idx ? { ...l, fte: Number(e.target.value) } : l))}
                  className="w-16 text-right tabular-nums"
                />
              </TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  value={line.costPerFte}
                  min={0}
                  step={1000}
                  onChange={e => onUpdate(lines.map((l, i) => i === idx ? { ...l, costPerFte: Number(e.target.value) } : l))}
                  className="w-28 text-right tabular-nums"
                />
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                {fmtK(line.fte * line.costPerFte)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</TableCell>
            <TableCell className="text-right font-bold tabular-nums">{fmtK(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function OtherCostsSection({
  title, lines, onUpdate,
}: {
  title: string;
  lines: OtherCostLine[];
  onUpdate: (lines: OtherCostLine[]) => void;
}) {
  const total = lines.reduce((s, l) => s + l.annualCost, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant="secondary" className="tabular-nums text-xs">{fmtK(total)}</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line item</TableHead>
            <TableHead className="text-right w-36">Annual cost (€)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, idx) => (
            <TableRow key={line.id}>
              <TableCell className="text-sm">{line.name}</TableCell>
              <TableCell className="text-right">
                <Input
                  type="number"
                  value={line.annualCost}
                  min={0}
                  step={1000}
                  onChange={e => onUpdate(lines.map((l, i) => i === idx ? { ...l, annualCost: Number(e.target.value) } : l))}
                  className="w-32 text-right tabular-nums"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</TableCell>
            <TableCell className="text-right font-bold tabular-nums">{fmtK(total)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export default function CostInputsTab({ drug, onChange, onBack }: Props) {
  const navigate = useNavigate();
  const cs = drug.costStructure;

  function updateSegment(idx: number, patch: Partial<MarketSegment>) {
    onChange({ ...drug, segments: drug.segments.map((s, i) => i === idx ? { ...s, ...patch } : s) });
  }

  const wAvgPrice = drug.segments.reduce((s, seg) => s + seg.weight * seg.pricePerUnit, 0);
  const wAvgCOGS = drug.segments.reduce((s, seg) => s + seg.weight * seg.cogsPerUnit, 0);
  const wGM = wAvgPrice > 0 ? (wAvgPrice - wAvgCOGS) / wAvgPrice : 0;

  const totalSmCosts = [
    ...cs.smHeadcount.map(l => l.fte * l.costPerFte),
    ...cs.smOtherCosts.map(l => l.annualCost),
  ].reduce((a, b) => a + b, 0);

  const totalNonSmCosts = [
    ...cs.nonSmHeadcount.map(l => l.fte * l.costPerFte),
    ...cs.nonSmOtherCosts.map(l => l.annualCost),
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl flex flex-col gap-6">

      {/* Pricing & COGS */}
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
                        <Input type="number" value={seg.pricePerUnit} min={0} step={0.1}
                          onChange={e => updateSegment(idx, { pricePerUnit: Number(e.target.value) })}
                          className="w-20 text-right tabular-nums" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-muted-foreground text-xs">€</span>
                        <Input type="number" value={seg.cogsPerUnit} min={0} step={0.05}
                          onChange={e => updateSegment(idx, { cogsPerUnit: Number(e.target.value) })}
                          className="w-20 text-right tabular-nums" />
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

      {/* Gross-to-Net */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gross-to-Net Ratio</CardTitle>
          <CardDescription>Adjusts gross sales to net sales (rebates, discounts, chargebacks). Default 95%.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Slider
              value={[cs.grossToNetRatio]}
              min={0.5}
              max={1.0}
              step={0.01}
              onValueChange={([v]) => onChange(updateCost(drug, { grossToNetRatio: v }))}
              className="w-64"
            />
            <Badge variant="secondary" className="font-mono text-sm tabular-nums">
              {(cs.grossToNetRatio * 100).toFixed(0)}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              Net sales = Gross sales × {(cs.grossToNetRatio * 100).toFixed(0)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* S&M Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales & Marketing Costs</CardTitle>
          <CardDescription>Annual headcount and non-headcount S&M spend.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <HeadcountSection
            title="Headcount"
            lines={cs.smHeadcount}
            onUpdate={lines => onChange(updateCost(drug, { smHeadcount: lines }))}
          />
          <Separator />
          <OtherCostsSection
            title="Other S&M Costs"
            lines={cs.smOtherCosts}
            onUpdate={lines => onChange(updateCost(drug, { smOtherCosts: lines }))}
          />
          <div className="flex justify-end">
            <div className="text-sm font-semibold">Total S&M: <span className="text-primary tabular-nums">{fmtK(totalSmCosts)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Non-S&M Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Non-S&M / Overhead Costs</CardTitle>
          <CardDescription>Medical affairs, regulatory, finance, and other overhead spend.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <HeadcountSection
            title="Headcount"
            lines={cs.nonSmHeadcount}
            onUpdate={lines => onChange(updateCost(drug, { nonSmHeadcount: lines }))}
          />
          <Separator />
          <OtherCostsSection
            title="Other Non-S&M Costs"
            lines={cs.nonSmOtherCosts}
            onUpdate={lines => onChange(updateCost(drug, { nonSmOtherCosts: lines }))}
          />
          <div className="flex justify-end">
            <div className="text-sm font-semibold">Total Non-S&M: <span className="text-primary tabular-nums">{fmtK(totalNonSmCosts)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Total opex summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Blended Gross Margin', value: `${(wGM * 100).toFixed(1)}%`, color: wGM >= 0.7 ? 'text-green-600' : wGM >= 0.5 ? 'text-amber-600' : 'text-destructive' },
          { label: 'Total S&M', value: fmtK(totalSmCosts), color: 'text-foreground' },
          { label: 'Total Non-S&M', value: fmtK(totalNonSmCosts), color: 'text-foreground' },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{c.label}</p>
              <p className={`text-xl font-bold tabular-nums ${c.color}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
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
