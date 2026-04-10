import { useState } from 'react';
import type { DrugModel, MarketSegment } from '../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Props {
  drug: DrugModel;
  onChange: (drug: DrugModel) => void;
  onNext: () => void;
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export default function MarketDetailsTab({ drug, onChange, onNext }: Props) {
  const [loeMonth, setLoeMonth] = useState(() => drug.loeDate.split('-')[1]);
  const [loeYear, setLoeYear] = useState(() => drug.loeDate.split('-')[0]);

  const totalWeight = drug.segments.reduce((s, seg) => s + seg.weight, 0);
  const weightOk = Math.abs(totalWeight - 1.0) <= 0.001;

  function updateSegment(idx: number, patch: Partial<MarketSegment>) {
    onChange({ ...drug, segments: drug.segments.map((s, i) => i === idx ? { ...s, ...patch } : s) });
  }

  function updateLoe(month: string, year: string) {
    onChange({ ...drug, loeDate: `${year}-${month.padStart(2, '0')}` });
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      {/* Drug name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Details</CardTitle>
          <CardDescription>Basic identification for this forecasting asset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5 max-w-xs">
            <Label htmlFor="drugName">Drug / Brand Name</Label>
            <Input
              id="drugName"
              value={drug.drugName}
              onChange={e => onChange({ ...drug, drugName: e.target.value })}
              placeholder="e.g. BRANDEX"
            />
          </div>
        </CardContent>
      </Card>

      {/* LOE Date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loss of Exclusivity Date</CardTitle>
          <CardDescription>The month and year when generics / biosimilars are expected to enter the market</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Month</Label>
              <Select value={loeMonth} onValueChange={v => { setLoeMonth(v); updateLoe(v, loeYear); }}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loeYear">Year</Label>
              <Input
                id="loeYear"
                type="number"
                value={loeYear}
                min={2024}
                max={2040}
                onChange={e => { setLoeYear(e.target.value); updateLoe(loeMonth, e.target.value); }}
                className="w-24"
              />
            </div>
            <Badge variant="secondary" className="mb-0.5">
              {MONTHS[parseInt(loeMonth) - 1]} {loeYear}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Segments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Market Segments</CardTitle>
          <CardDescription>Define 3 market segments. Weights must sum to 100%.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Segment Name</TableHead>
                <TableHead className="text-right w-32">Weight (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drug.segments.map((seg, idx) => (
                <TableRow key={seg.id}>
                  <TableCell className="text-muted-foreground font-medium">{idx + 1}</TableCell>
                  <TableCell>
                    <Input
                      value={seg.name}
                      onChange={e => updateSegment(idx, { name: e.target.value })}
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
                      placeholder="Segment name"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Input
                        type="number"
                        value={Math.round(seg.weight * 100)}
                        min={0}
                        max={100}
                        onChange={e => updateSegment(idx, { weight: Number(e.target.value) / 100 })}
                        className="w-16 text-right tabular-nums"
                      />
                      <span className="text-muted-foreground text-xs">%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className={weightOk ? 'bg-green-50' : 'bg-destructive/5'}>
                <TableCell colSpan={2} className={`text-xs font-semibold ${weightOk ? 'text-green-700' : 'text-destructive'}`}>
                  {weightOk ? '✓ Weights sum to 100%' : '⚠ Weights must sum to 100%'}
                </TableCell>
                <TableCell className={`text-right text-sm font-bold tabular-nums ${weightOk ? 'text-green-700' : 'text-destructive'}`}>
                  {Math.round(totalWeight * 100)}%
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!weightOk}>
          Next: Baseline Volume
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Button>
      </div>
    </div>
  );
}
