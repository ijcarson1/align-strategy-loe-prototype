import type { DrugModel } from '../../../types';
import type { DecayCurveId } from '../../../types';
import { DECAY_CURVES, getCurveById } from '../../../constants/decayCurves';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  drug: DrugModel;
  onChange: (drug: DrugModel) => void;
  onBack: () => void;
  onNext: () => void;
}

function MiniCurve({ multipliers, color }: { multipliers: number[]; color: string }) {
  const data = multipliers.filter((_, i) => i % 3 === 0).map((v, i) => ({ m: i * 3, v: Math.round(v * 100) }));
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#g${color.replace('#','')})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LargePreview({ drug }: { drug: DrugModel }) {
  const curve = getCurveById(drug.selectedDecayCurveId);
  const mults = drug.selectedDecayCurveId === 'custom' ? drug.customDecayCurve : curve.monthlyMultipliers;
  const data = mults.map((v, i) => ({ month: i, brandShare: Math.round(v * 100), genericShare: Math.round((1 - v) * 100) }));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Selected Curve Preview</CardTitle>
        <CardDescription>Brand share retention over 60 months post-LOE</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tickFormatter={m => m % 12 === 0 ? `Y${m/12}` : ''} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
            <Tooltip formatter={(v, name) => [`${v}%`, name === 'brandShare' ? 'Brand share' : 'Generic share']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <defs>
              <linearGradient id="previewGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={curve.color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={curve.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="brandShare" stroke={curve.color} strokeWidth={2} fill="url(#previewGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function PostLOEImpactTab({ drug, onChange, onBack, onNext }: Props) {
  function updateCustom(monthIdx: number, value: number) {
    const updated = [...drug.customDecayCurve];
    updated[monthIdx] = Math.max(0, Math.min(1, value / 100));
    onChange({ ...drug, customDecayCurve: updated });
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      {/* Curve selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Erosion Curve Selection</CardTitle>
          <CardDescription>Choose the erosion model that best reflects your market's post-LOE dynamics.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DECAY_CURVES.map(curve => {
              const selected = drug.selectedDecayCurveId === curve.id;
              return (
                <button
                  key={curve.id}
                  onClick={() => onChange({ ...drug, selectedDecayCurveId: curve.id as DecayCurveId })}
                  className={cn(
                    'text-left rounded-lg border-2 p-3 transition-all hover:shadow-sm',
                    selected ? 'shadow-sm' : 'border-border'
                  )}
                  style={{ borderColor: selected ? curve.color : undefined, backgroundColor: selected ? `${curve.color}08` : undefined }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: selected ? curve.color : undefined }}>
                      {curve.label}
                    </span>
                    {selected && (
                      <div className="size-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: curve.color }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 leading-snug">{curve.description}</p>
                  <MiniCurve multipliers={curve.monthlyMultipliers} color={curve.color} />
                  <p className="mt-1.5 text-xs font-medium" style={{ color: curve.color }}>
                    Y5: {Math.round(curve.monthlyMultipliers[60] * 100)}% retained
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom editor */}
      {drug.selectedDecayCurveId === 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custom Curve — Monthly Multipliers</CardTitle>
            <CardDescription>Brand share retention (%) at key months. Intermediate months interpolated.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-3">
              {[1, 3, 6, 9, 12, 18, 24, 30, 36, 42, 48, 60].map(m => (
                <div key={m} className="flex flex-col gap-1">
                  <Label className="text-center text-[10px]">Month {m}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round((drug.customDecayCurve[m] ?? 1) * 100)}
                      onChange={e => updateCustom(m, Number(e.target.value))}
                      className="text-center pr-5 tabular-nums"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <LargePreview drug={drug} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13l-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </Button>
        <Button onClick={onNext}>
          Next: Cost Inputs
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Button>
      </div>
    </div>
  );
}
