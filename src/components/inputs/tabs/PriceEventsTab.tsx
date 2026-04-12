import type { DrugModel, PriceEvent } from '../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlusIcon, Trash2Icon } from 'lucide-react';

interface Props {
  drug: DrugModel;
  onChange: (drug: DrugModel) => void;
  onBack: () => void;
  onNext: () => void;
}

function generateId() {
  return `pe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function formatMonth(m: string) {
  if (!m) return '—';
  const [year, month] = m.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

// ─── Shared event list component ─────────────────────────────────────────────

function PriceEventList({
  title,
  description,
  events,
  drug,
  onUpdate,
  maxEvents,
}: {
  title: string;
  description: string;
  events: PriceEvent[];
  drug: DrugModel;
  onUpdate: (events: PriceEvent[]) => void;
  maxEvents: number;
}) {
  function addEvent() {
    const newEvent: PriceEvent = {
      id: generateId(),
      segmentId: drug.segments[0]?.id ?? '',
      effectiveMonth: drug.loeDate,
      pctChange: -0.05,
    };
    onUpdate([...events, newEvent]);
  }

  function updateEvent(id: string, patch: Partial<PriceEvent>) {
    onUpdate(events.map(e => e.id === id ? { ...e, ...patch } : e));
  }

  function removeEvent(id: string) {
    onUpdate(events.filter(e => e.id !== id));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Button size="sm" onClick={addEvent} disabled={events.length >= maxEvents}>
            <PlusIcon className="size-3.5 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-muted-foreground">
            <div className="size-9 rounded-full bg-muted flex items-center justify-center mb-1">
              <PlusIcon className="size-4" />
            </div>
            <p className="text-sm font-medium">No events configured</p>
            <p className="text-xs max-w-xs">{description}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segment</TableHead>
                <TableHead>Effective month</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">New price</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(event => {
                const seg = drug.segments.find(s => s.id === event.segmentId);
                const pct = event.pctChange * 100;
                const isNeg = pct < 0;
                const newPrice = seg ? seg.pricePerUnit * (1 + event.pctChange) : null;
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Select
                        value={event.segmentId}
                        onValueChange={v => updateEvent(event.id, { segmentId: v })}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {drug.segments.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="month"
                        value={event.effectiveMonth}
                        onChange={e => updateEvent(event.id, { effectiveMonth: e.target.value })}
                        className="w-36"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          value={(event.pctChange * 100).toFixed(1)}
                          min={-100} max={100} step={0.5}
                          onChange={e => updateEvent(event.id, { pctChange: Number(e.target.value) / 100 })}
                          className="w-20 text-right tabular-nums"
                        />
                        <span className="text-muted-foreground text-xs">%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={isNeg ? 'destructive' : 'default'}
                          className="tabular-nums text-[10px]"
                        >
                          {isNeg ? '' : '+'}{pct.toFixed(1)}%
                        </Badge>
                        {newPrice !== null && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            €{newPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeEvent(event.id)}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {events.length > 0 && (
          <div className="mt-3 rounded-md border border-primary/15 bg-accent/20 px-3 py-2 flex flex-col gap-1">
            {events.map(e => {
              const seg = drug.segments.find(s => s.id === e.segmentId);
              return (
                <div key={e.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{seg?.name ?? e.segmentId}</span>
                  <span className="font-mono">{formatMonth(e.effectiveMonth)}</span>
                  <Badge
                    variant={e.pctChange < 0 ? 'destructive' : 'default'}
                    className="tabular-nums text-[10px]"
                  >
                    {e.pctChange >= 0 ? '+' : ''}{(e.pctChange * 100).toFixed(1)}%
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function PriceEventsTab({ drug, onChange, onBack, onNext }: Props) {
  const maxPerSection = 4 * drug.segments.length;

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <PriceEventList
        title="Pre-LOE Price Events"
        description="Step-changes to segment prices before the LOE date — e.g. scheduled price reductions, tender outcomes, formulary changes."
        events={drug.preLOEPriceEvents ?? []}
        drug={drug}
        onUpdate={events => onChange({ ...drug, preLOEPriceEvents: events })}
        maxEvents={maxPerSection}
      />

      <PriceEventList
        title="Post-LOE Price Events"
        description="Step-changes after generic entry — e.g. mandatory reference price cuts, voluntary price adjustments to remain competitive."
        events={drug.priceEvents}
        drug={drug}
        onUpdate={events => onChange({ ...drug, priceEvents: events })}
        maxEvents={maxPerSection}
      />

      <Separator />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 13l-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </Button>
        <Button onClick={onNext}>
          Next: Cost Inputs
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Button>
      </div>
    </div>
  );
}
