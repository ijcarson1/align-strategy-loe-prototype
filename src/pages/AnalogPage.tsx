import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getActiveDrug } from '../lib/state';
import type { AnalogCurve } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PlusIcon, Trash2Icon, EditIcon, CheckIcon, XIcon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── Key-point config ─────────────────────────────────────────────────────────

const KEY_MONTHS = [0, 6, 12, 18, 24, 36, 48, 60];

// ─── Interpolation ────────────────────────────────────────────────────────────

function interpolate61(keyPoints: number[]): number[] {
  // keyPoints[i] = retention at KEY_MONTHS[i]
  const result: number[] = [];
  for (let m = 0; m <= 60; m++) {
    let lo = 0;
    let hi = KEY_MONTHS.length - 1;
    for (let i = 0; i < KEY_MONTHS.length - 1; i++) {
      if (m >= KEY_MONTHS[i] && m <= KEY_MONTHS[i + 1]) {
        lo = i;
        hi = i + 1;
        break;
      }
    }
    if (KEY_MONTHS[lo] === KEY_MONTHS[hi]) {
      result.push(keyPoints[lo]);
    } else {
      const t = (m - KEY_MONTHS[lo]) / (KEY_MONTHS[hi] - KEY_MONTHS[lo]);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      result.push(keyPoints[lo] + (keyPoints[hi] - keyPoints[lo]) * eased);
    }
  }
  return result;
}

function generateId() {
  return `analog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Analog colors ────────────────────────────────────────────────────────────

const ANALOG_COLORS = ['#7a00df', '#10b981', '#f59e0b', '#3b82f6'];

// ─── Key-point editor ────────────────────────────────────────────────────────

interface KeyPointEditorProps {
  name: string;
  keyValues: number[];
  onChangeName: (n: string) => void;
  onChangeValues: (v: number[]) => void;
  onSave: () => void;
  onCancel: () => void;
}

function KeyPointEditor({ name, keyValues, onChangeName, onChangeValues, onSave, onCancel }: KeyPointEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={e => onChangeName(e.target.value)}
          placeholder="Analog name"
          className="max-w-xs"
        />
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {KEY_MONTHS.map((month, idx) => (
          <div key={month} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">M{month}</span>
            <Input
              type="number"
              min={0} max={100} step={1}
              value={Math.round(keyValues[idx] * 100)}
              onChange={e => {
                const next = [...keyValues];
                next[idx] = Math.max(0, Math.min(1, Number(e.target.value) / 100));
                onChangeValues(next);
              }}
              className="text-center tabular-nums h-8 px-1 text-xs"
            />
            <span className="text-[10px] text-muted-foreground">%</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={!name.trim()}>
          <CheckIcon className="size-3.5 mr-1" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <XIcon className="size-3.5 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalogPage() {
  const { state, addAnalogCurve, updateAnalogCurve, removeAnalogCurve } = useApp();
  const entry = getActiveDrug(state);
  const baseDrug = entry?.scenarios.base.drug;
  const altDrug = entry?.scenarios.alternate.drug;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftValues, setDraftValues] = useState<number[]>([1, 0.85, 0.70, 0.58, 0.50, 0.40, 0.33, 0.28]);
  const [visibleCurves, setVisibleCurves] = useState<Record<string, boolean>>({
    __base: true,
    __alt: true,
  });

  const toggleVisible = (id: string) =>
    setVisibleCurves(v => ({ ...v, [id]: !v[id] }));

  // Get decay curve monthly multipliers for a drug
  const getDecayCurveMultipliers = (drug: typeof baseDrug): number[] => {
    if (!drug) return Array.from({ length: 61 }, () => 1);
    if (drug.forecastApproach === 'analog' && drug.analogCurveId) {
      const curve = state.analogCurves.find(c => c.id === drug.analogCurveId);
      if (curve) return curve.monthlyRetention;
    }
    // Import inline to avoid circular deps — use the global decay curve
    // We re-use the interpolate61 approach with a simple flat default
    return Array.from({ length: 61 }, (_, i) => Math.max(0.1, 1 - (i / 60) * 0.9));
  };

  // Chart data: one row per month
  const chartData = Array.from({ length: 61 }, (_, m) => {
    const row: Record<string, number | string> = { month: m };
    if (baseDrug) {
      const mults = getDecayCurveMultipliers(baseDrug);
      row['Base Case'] = Math.round(mults[m] * 100);
    }
    if (altDrug) {
      const mults = getDecayCurveMultipliers(altDrug);
      row['Alternate'] = Math.round(mults[m] * 100);
    }
    for (const curve of state.analogCurves) {
      row[curve.name] = Math.round(curve.monthlyRetention[m] * 100);
    }
    return row;
  });

  const startAdd = () => {
    setDraftName('');
    setDraftValues([1, 0.85, 0.70, 0.58, 0.50, 0.40, 0.33, 0.28]);
    setIsAdding(true);
    setEditingId(null);
  };

  const saveNew = () => {
    const curve: AnalogCurve = {
      id: generateId(),
      name: draftName.trim(),
      monthlyRetention: interpolate61(draftValues),
    };
    addAnalogCurve(curve);
    setVisibleCurves(v => ({ ...v, [curve.id]: true }));
    setIsAdding(false);
  };

  const startEdit = (curve: AnalogCurve) => {
    setEditingId(curve.id);
    setDraftName(curve.name);
    // Extract key-point values by sampling interpolated data
    setDraftValues(KEY_MONTHS.map(m => curve.monthlyRetention[m]));
    setIsAdding(false);
  };

  const saveEdit = (id: string) => {
    const curve: AnalogCurve = {
      id,
      name: draftName.trim(),
      monthlyRetention: interpolate61(draftValues),
    };
    updateAnalogCurve(curve);
    setEditingId(null);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-2.5 shadow-md text-xs min-w-36">
        <p className="font-semibold text-foreground mb-1.5">Month {label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex justify-between gap-3">
            <span style={{ color: p.stroke }}>{p.dataKey}</span>
            <span className="font-medium tabular-nums">{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header */}
      <div className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold">Analog Library</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define retention curves based on comparable LOE events and compare against active scenarios.
        </p>
      </div>

      {/* Library cards */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Defined Analogs</CardTitle>
                <CardDescription>Up to 4 analog curves · Enter retention % at key months</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={startAdd}
                disabled={state.analogCurves.length >= 4 || isAdding}
              >
                <PlusIcon className="size-3.5 mr-1" />
                Add Analog
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add form */}
            {isAdding && (
              <div className="rounded-lg border border-primary/20 bg-accent/10 p-4">
                <p className="text-sm font-medium mb-3">New Analog</p>
                <KeyPointEditor
                  name={draftName}
                  keyValues={draftValues}
                  onChangeName={setDraftName}
                  onChangeValues={setDraftValues}
                  onSave={saveNew}
                  onCancel={() => setIsAdding(false)}
                />
              </div>
            )}

            {state.analogCurves.length === 0 && !isAdding && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-muted-foreground">
                <div className="size-9 rounded-full bg-muted flex items-center justify-center mb-1">
                  <PlusIcon className="size-4" />
                </div>
                <p className="text-sm font-medium">No analogs defined</p>
                <p className="text-xs max-w-xs">Add up to 4 named curves based on comparable LOE events in similar markets.</p>
              </div>
            )}

            {state.analogCurves.map((curve, idx) => (
              <div key={curve.id} className="rounded-lg border border-border p-4 space-y-3">
                {editingId === curve.id ? (
                  <>
                    <KeyPointEditor
                      name={draftName}
                      keyValues={draftValues}
                      onChangeName={setDraftName}
                      onChangeValues={setDraftValues}
                      onSave={() => saveEdit(curve.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="size-3 rounded-full flex-shrink-0" style={{ backgroundColor: ANALOG_COLORS[idx] }} />
                      <div>
                        <p className="text-sm font-medium">{curve.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          M0: {Math.round(curve.monthlyRetention[0] * 100)}% →
                          M12: {Math.round(curve.monthlyRetention[12] * 100)}% →
                          M36: {Math.round(curve.monthlyRetention[36] * 100)}% →
                          M60: {Math.round(curve.monthlyRetention[60] * 100)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => startEdit(curve)}>
                        <EditIcon className="size-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeAnalogCurve(curve.id)}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Comparison chart */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm">Retention Comparison</CardTitle>
                <CardDescription>Brand share retention over 60 months post-LOE</CardDescription>
              </div>
              {/* Visibility toggles */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: '__base', label: 'Base Case', color: '#9ca3af' },
                  { id: '__alt',  label: 'Alternate', color: '#c084fc' },
                  ...state.analogCurves.map((c, i) => ({ id: c.id, label: c.name, color: ANALOG_COLORS[i] })),
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleVisible(item.id)}
                    className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1 border transition-opacity ${
                      (visibleCurves[item.id] ?? true) ? 'opacity-100 border-border' : 'opacity-40 border-border'
                    }`}
                  >
                    <div className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={m => `M${m}`}
                  ticks={KEY_MONTHS}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={0} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'LOE', fill: '#ef4444', fontSize: 10 }} />
                {(visibleCurves['__base'] ?? true) && (
                  <Line
                    dataKey="Base Case"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="5 3"
                  />
                )}
                {(visibleCurves['__alt'] ?? true) && (
                  <Line
                    dataKey="Alternate"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="3 2"
                  />
                )}
                {state.analogCurves.map((curve, idx) =>
                  (visibleCurves[curve.id] ?? true) ? (
                    <Line
                      key={curve.id}
                      dataKey={curve.name}
                      stroke={ANALOG_COLORS[idx]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Separator />
      </div>

      {/* Usage callout */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border border-primary/20 bg-accent/10 px-4 py-3 flex gap-3">
          <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M7 4v3.5M7 10h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Use an analog as the forecast basis</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Go to <strong>Forecast Inputs → Post-LOE Impact</strong>, switch the approach to <strong>Analog</strong>,
              then select a curve from this library. The analog retention curve replaces the statistical decay model
              for that scenario.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
