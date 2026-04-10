import type { DrugModel } from '../../types';
import {
  Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDownIcon, TrendingUpIcon } from 'lucide-react';

interface KPIs {
  peakPreLOERevenue: number;
  cumulativePostLOERevenue: number;
  revenueAtRisk: number;
  avgPostLOEGrossMargin: number;
}

function fmt(v: number) {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v.toFixed(0)}`;
}

export default function KPICards({ kpis, drug }: { kpis: KPIs; drug: DrugModel }) {
  return (
    <div className="*:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Peak Pre-LOE Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {fmt(kpis.peakPreLOERevenue)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              Brand
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="font-medium">Highest annual revenue before LOE</div>
          <div className="text-muted-foreground">Pre-exclusivity peak</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>5-Year Post-LOE Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-primary">
            {fmt(kpis.cumulativePostLOERevenue)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon />
              Post-LOE
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="font-medium">Cumulative brand revenue after LOE</div>
          <div className="text-muted-foreground">5-year total</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Revenue at Risk</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl text-destructive">
            {fmt(kpis.revenueAtRisk)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingDownIcon />
              Risk
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="font-medium">Year 3 shortfall vs. peak pre-LOE</div>
          <div className="text-muted-foreground">Erosion impact</div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Avg. Post-LOE Gross Margin</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl" style={{ color: '#10b981' }}>
            {(kpis.avgPostLOEGrossMargin * 100).toFixed(1)}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUpIcon />
              GM
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="font-medium">Across {drug.segments.length} segments</div>
          <div className="text-muted-foreground">5-year average</div>
        </CardFooter>
      </Card>
    </div>
  );
}
