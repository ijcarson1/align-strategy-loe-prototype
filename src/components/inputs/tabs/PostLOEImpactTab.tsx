import { useState } from 'react';
import type { DrugModel, DecayCurveId, VolumeEvent, MarketSegment, CurveType } from '../../../types';
import { DECAY_CURVES, getCurveById } from '../../../constants/decayCurves';
import { computeRampProgress } from '../../../lib/forecasting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PlusIcon, Trash2Icon, ChevronDownIcon } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  drug: DrugModel;
  onChange: (drug: DrugModel) => void;
  onBack: () => void;
  onNext: () => void;
}

const CURVE_TYPE_OPTIONS: { value: CurveType; label: string }[] = [
  { value: 'rapid', label: 'Rapid' },
  { value: 'fast', label: 'Fast' },
  { value: 'moderate', label: 'Moderate' },
  { value: 's-curve', label: 'S-Curve' },
  { value: 'linear', label: 'Linear' },
  { value: 'exponential', label: 'Exponential' },
];

function generateId() {
  return `ve_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Mini sparkline for decay curve cards ─────────────────────────────────────

function MiniCurve({ multipliers, color }: { multipliers: number[]; color: string }) {
  const data = multipliers.filter((_, i) => i % 3 === 0).map((v, i) => ({ m: i * 3, v: Math.round(v * 100) }));
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`g${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g${color.replace('#', '')})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Blended retention preview chart ─────────────────────────────────────────

function RetentionPreview({ drug }: { drug: DrugModel }) {
  const [loeYear, loeMonth] = drug.loeDate.split('-').map(Number);
  const hasEvents = drug.segments.some(s => s.erosionEvents.length > 0);

  const data = Array.from({ length: 61 }, (_, m) => {
    let blendedRetention = 0;
    const totalWeight = drug.segments.reduce((s, seg) => s + seg.weight, 0) || 1;

    if (hasEvents) {
      for (const seg of drug.segments) {
        if (seg.erosionEvents.length === 0) {
          const globalCurve = drug.selectedDecayCurveId === 'custom'
            ? drug.customDecayCurve
            : getCurveById(drug.selectedDecayCurveId).monthlyMultipliers;
          blendedRetention += (seg.weight / totalWeight) * (globalCurve[Math.min(m, 60)] ?? 0.1);
        } else {
          let segRetention = 1.0;
          for (const evt of seg.erosionEvents) {
            const [evYear, evMonth] = evt.startMonth.split('-').map(Number);
            const evStartOffset = (evYear - loeYear) * 12 + (evMonth - loeMonth);
            const monthsSince = m - evStartOffset;
            const progress = computeRampProgress(monthsSince, evt.monthsToPeak, evt.curveType);
            segRetention *= (1 - evt.peakErosionPct * progress);
          }
          blendedRetention += (seg.weight / totalWeight) * Math.max(0, segRetention);
        }
      }
    } else {
      const globalCurve = drug.selectedDecayCurveId === 'custom'
        ? drug.customDecayCurve
        : getCurveById(drug.selectedDecayCurveId).monthlyMultipliers;
      blendedRetention = globalCurve[Math.min(m, 60)] ?? 0.1;
    }

    return {
      month: m,
      brand: Math.round(blendedRetention * 100),
      generic: Math.round((1 - blendedRetention) * 100),
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Blended Retention Preview</CardTitle>
        <CardDescription>
          {hasEvents ? 'Weighted average of per-segment erosion events' : 'Global decay curve applied to all segments'}
          {' · 60 months post-LOE'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="month" tickFormatter={m => m % 12 === 0 ? `Y${m / 12}` : ''} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} width={36} />
            <Tooltip formatter={(v, name) => [`${v}%`, name === 'brand' ? 'Brand share' : 'Generic share']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <defs>
              <linearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7a00df" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#7a00df" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="brand" name="brand" stroke="#7a00df" strokeWidth={2} fill="url(#brandGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Per-segment erosion event editor ────────────────────────────────────────

function SegmentErosionCard({
  segment,
  onUpdate,
}: {
  segment: MarketSegment;
  onUpdate: (seg: MarketSegment) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  function addEvent() {
    const newEvt: VolumeEvent = {
      id: generateId(),
      description: 'New erosion event',
      startMonth: '2026-01',
      peakErosionPct: 0.5,
      monthsToPeak: 12,
      curveType: 'moderate',
    };
    onUpdate({ ...segment, erosionEvents: [...segment.erosionEvents, newEvt] });
  }

  function updateEvent(id: string, patch: Partial<VolumeEvent>) {
    onUpdate({ ...segment, erosionEvents: segment.erosionEvents.map(e => e.id === id ? { ...e, ...patch } : e) });
  }

  function removeEvent(id: string) {
    onUpdate({ ...segment, erosionEvents: segment.erosionEvents.filter(e => e.id !== id) });
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{segment.name}</span>
          <Badge variant="outline" className="text-[10px]">{Math.round(segment.weight * 100)}%</Badge>
          {segment.erosionEvents.length > 0 && (
            <Badge className="text-[10px] bg-primary/15 text-primary border-0">
              {segment.erosionEvents.length} event{segment.erosionEvents.length > 1 ? 's' : ''}
            </Badge>
          )}
          {segment.erosionEvents.length === 0 && (
            <Badge variant="secondary" className="text-[10px]">Using global curve</Badge>
          )}
        </div>
        <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-3">
          {segment.erosionEvents.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No events configured — the global fallback curve is applied to this segment.
              Add events to model specific erosion dynamics.
            </p>
          )}

          {segment.erosionEvents.map((evt, idx) => (
            <div key={evt.id} className="rounded-md border border-border/60 bg-muted/20 p-3 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Event {idx + 1}</span>
                </div>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => removeEvent(evt.id)}>
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs mb-1 block">Description</Label>
                  <Input
                    value={evt.description}
                    onChange={e => updateEvent(evt.id, { description: e.target.value })}
                    placeholder="e.g. Generic launch — tender channel"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Start month</Label>
                  <Input
                    type="month"
                    value={evt.startMonth}
                    onChange={e => updateEvent(evt.id, { startMonth: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Curve type</Label>
                  <Select value={evt.curveType} onValueChange={v => updateEvent(evt.id, { curveType: v as CurveType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURVE_TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block flex justify-between">
                    Peak erosion <span className="font-mono">{Math.round(evt.peakErosionPct * 100)}%</span>
                  </Label>
                  <Slider
                    value={[evt.peakErosionPct * 100]}
                    min={0} max={100} step={1}
                    onValueChange={([v]) => updateEvent(evt.id, { peakErosionPct: v / 100 })}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Months to peak</Label>
                  <Input
                    type="number"
                    value={evt.monthsToPeak}
                    min={1} max={60} step={1}
                    onChange={e => updateEvent(evt.id, { monthsToPeak: Number(e.target.value) })}
                    className="tabular-nums"
                  />
                </div>
              </div>
            </div>
          ))}

          {segment.erosionEvents.length < 3 && (
            <Button variant="outline" size="sm" onClick={addEvent} className="self-start">
              <PlusIcon className="size-3.5 mr-1" />
              Add event
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main tab component ───────────────────────────────────────────────────────

export default function PostLOEImpactTab({ drug, onChange, onBack, onNext }: Props) {
  function updateSegment(idx: number, seg: MarketSegment) {
    onChange({ ...drug, segments: drug.segments.map((s, i) => i === idx ? seg : s) });
  }

  function updateCustom(monthIdx: number, value: number) {
    const updated = [...drug.customDecayCurve];
    updated[monthIdx] = Math.max(0, Math.min(1, value / 100));
    onChange({ ...drug, customDecayCurve: updated });
  }

  const expansionEnabled = !!drug.moleculeExpansion;

  return (
    <div className="max-w-3xl flex flex-col gap-6">

      {/* Forecast approach toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Forecast Approach</CardTitle>
          <CardDescription>Statistical uses event-based erosion logic. Analog uses a reference curve directly (configure analogs in the Analog page first).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(['statistical', 'analog'] as const).map(approach => (
              <button
                key={approach}
                disabled={approach === 'analog'}
                onClick={() => onChange({ ...drug, forecastApproach: approach })}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium border transition-all',
                  drug.forecastApproach === approach
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/40',
                  approach === 'analog' && 'opacity-40 cursor-not-allowed'
                )}
              >
                {approach === 'statistical' ? 'Statistical (Event-based)' : 'Analog (coming soon)'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Per-segment erosion events */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Post-LOE Volume Erosion Events</CardTitle>
          <CardDescription>
            Define up to 3 timed erosion events per segment (e.g. generic launch, tender loss, reference pricing).
            Segments with no events use the fallback curve below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {drug.segments.map((seg, idx) => (
            <SegmentErosionCard
              key={seg.id}
              segment={seg}
              onUpdate={updated => updateSegment(idx, updated)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Fallback global decay curve */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Fallback Decay Curve</CardTitle>
              <CardDescription>Applied to segments with no erosion events configured.</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs flex-shrink-0 mt-0.5">
              {drug.segments.filter(s => s.erosionEvents.length === 0).length} segment{drug.segments.filter(s => s.erosionEvents.length === 0).length !== 1 ? 's' : ''} using this
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DECAY_CURVES.map(curve => {
              const selected = drug.selectedDecayCurveId === curve.id;
              return (
                <button
                  key={curve.id}
                  onClick={() => onChange({ ...drug, selectedDecayCurveId: curve.id as DecayCurveId })}
                  className={cn(
                    'text-left rounded-lg border-2 p-2.5 transition-all hover:shadow-sm',
                    selected ? 'shadow-sm' : 'border-border'
                  )}
                  style={{ borderColor: selected ? curve.color : undefined, backgroundColor: selected ? `${curve.color}08` : undefined }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: selected ? curve.color : undefined }}>
                      {curve.shortLabel}
                    </span>
                    {selected && (
                      <div className="size-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: curve.color }}>
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <MiniCurve multipliers={curve.monthlyMultipliers} color={curve.color} />
                  <p className="mt-1 text-[10px] font-medium" style={{ color: curve.color }}>
                    Y5: {Math.round(curve.monthlyMultipliers[60] * 100)}%
                  </p>
                </button>
              );
            })}
          </div>

          {drug.selectedDecayCurveId === 'custom' && (
            <div className="mt-4 grid grid-cols-6 gap-2">
              {[1, 3, 6, 9, 12, 18, 24, 30, 36, 42, 48, 60].map(m => (
                <div key={m} className="flex flex-col gap-1">
                  <Label className="text-center text-[10px]">M{m}</Label>
                  <div className="relative">
                    <Input
                      type="number" min={0} max={100}
                      value={Math.round((drug.customDecayCurve[m] ?? 1) * 100)}
                      onChange={e => updateCustom(m, Number(e.target.value))}
                      className="text-center pr-4 tabular-nums text-xs"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blended retention preview */}
      <RetentionPreview drug={drug} />

      <Separator />

      {/* Molecule expansion */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">Molecule Expansion After LOE</CardTitle>
              <CardDescription>
                Model total market growth driven by generic entry (e.g. OTC conversion, new indications, price-driven uptake).
              </CardDescription>
            </div>
            <button
              onClick={() => onChange({
                ...drug,
                moleculeExpansion: expansionEnabled ? undefined : {
                  description: 'Market expansion from generic entry',
                  startMonth: drug.loeDate,
                  peakAdditionalVolume: 5000,
                  monthsToPeak: 18,
                  curveType: 's-curve',
                },
                brandCaptureOfExpansion: expansionEnabled ? 0 : drug.brandCaptureOfExpansion,
              })}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex-shrink-0 mt-0.5',
                expansionEnabled
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              {expansionEnabled ? 'Enabled' : 'Enable'}
            </button>
          </div>
        </CardHeader>

        {expansionEnabled && drug.moleculeExpansion && (
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs mb-1 block">Description</Label>
                <Input
                  value={drug.moleculeExpansion.description}
                  onChange={e => onChange({ ...drug, moleculeExpansion: { ...drug.moleculeExpansion!, description: e.target.value } })}
                  placeholder="e.g. OTC label expansion"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Start month</Label>
                <Input
                  type="month"
                  value={drug.moleculeExpansion.startMonth}
                  onChange={e => onChange({ ...drug, moleculeExpansion: { ...drug.moleculeExpansion!, startMonth: e.target.value } })}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Peak additional volume (units)</Label>
                <Input
                  type="number" min={0} step={100}
                  value={drug.moleculeExpansion.peakAdditionalVolume}
                  onChange={e => onChange({ ...drug, moleculeExpansion: { ...drug.moleculeExpansion!, peakAdditionalVolume: Number(e.target.value) } })}
                  className="tabular-nums"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Months to peak</Label>
                <Input
                  type="number" min={1} max={60}
                  value={drug.moleculeExpansion.monthsToPeak}
                  onChange={e => onChange({ ...drug, moleculeExpansion: { ...drug.moleculeExpansion!, monthsToPeak: Number(e.target.value) } })}
                  className="tabular-nums"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Growth curve</Label>
                <Select
                  value={drug.moleculeExpansion.curveType}
                  onValueChange={v => onChange({ ...drug, moleculeExpansion: { ...drug.moleculeExpansion!, curveType: v as CurveType } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURVE_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs mb-2 block flex justify-between">
                Brand capture of expansion volume
                <span className="font-mono">{Math.round(drug.brandCaptureOfExpansion * 100)}%</span>
              </Label>
              <Slider
                value={[drug.brandCaptureOfExpansion * 100]}
                min={0} max={100} step={1}
                onValueChange={([v]) => onChange({ ...drug, brandCaptureOfExpansion: v / 100 })}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Brand retains {Math.round(drug.brandCaptureOfExpansion * 100)}% of new molecule volume.
                Remaining {100 - Math.round(drug.brandCaptureOfExpansion * 100)}% goes to generics.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13l-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </Button>
        <Button onClick={onNext}>
          Next: Price Events
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Button>
      </div>
    </div>
  );
}
