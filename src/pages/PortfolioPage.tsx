import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getVisibleDrugs } from '../lib/state';
import { buildForecast, computeKPIs } from '../lib/forecasting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function fmtM(v: number, symbol = '€') {
  if (Math.abs(v) >= 1_000_000) return `${symbol}${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${symbol}${(v / 1_000).toFixed(0)}K`;
  return `${symbol}${v.toFixed(0)}`;
}

function formatLoeDate(loeDate: string) {
  const [year, month] = loeDate.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

const REGION_BADGE_COLORS: Record<string, string> = {
  nordics: 'bg-blue-100 text-blue-700',
  uk:      'bg-green-100 text-green-700',
  germany: 'bg-yellow-100 text-yellow-700',
};

export default function PortfolioPage() {
  const { state, setActiveDrug, setActiveRegion } = useApp();
  const navigate = useNavigate();
  const visibleDrugs = getVisibleDrugs(state);

  if (state.user?.role !== 'global') {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Portfolio view is available to global users only.
      </div>
    );
  }

  const openDrug = (drugId: string) => {
    setActiveDrug(drugId);
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Header */}
      <div className="px-4 lg:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Drug Portfolio</h2>
          <p className="text-sm text-muted-foreground">All assets · Peak revenue and EBIT in local currency</p>
        </div>
        {/* Region filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Region:</span>
          <Select
            value={state.activeRegionId ?? 'all'}
            onValueChange={v => setActiveRegion(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {state.regions.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assets ({visibleDrugs.length})</CardTitle>
            <CardDescription>Click Open to switch the active asset and go to dashboard</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 min-w-36">Drug / Asset</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>LOE Date</TableHead>
                  <TableHead>Scenario</TableHead>
                  <TableHead className="text-right">Peak Revenue</TableHead>
                  <TableHead className="text-right">5-Yr Revenue</TableHead>
                  <TableHead className="text-right">5-Yr EBIT</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDrugs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No assets match the current region filter.
                    </TableCell>
                  </TableRow>
                )}
                {visibleDrugs.flatMap(entry => {
                  const region = state.regions.find(r => r.id === entry.regionId);
                  const sym = region?.currencySymbol ?? '€';

                  return (['base', 'alternate'] as const).map(scenarioId => {
                    const scenario = entry.scenarios[scenarioId];
                    const drug = scenario.drug;
                    const forecast = buildForecast(drug);
                    const kpis = computeKPIs(forecast);
                    const postLOE = forecast.filter(p => p.isPostLOE);
                    const cumEBIT = postLOE.reduce((s, p) => s + p.ebit, 0);
                    const isActive = entry.id === state.activeDrugId && state.activeScenario === scenarioId;

                    return (
                      <TableRow
                        key={`${entry.id}-${scenarioId}`}
                        className={isActive ? 'bg-accent/30' : ''}
                      >
                        <TableCell className="pl-6 font-medium text-sm">
                          {drug.drugName}
                          {isActive && (
                            <Badge className="ml-2 text-[10px] bg-primary/20 text-primary border-0 py-0">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] border-0 ${REGION_BADGE_COLORS[entry.regionId] ?? 'bg-muted text-muted-foreground'}`}
                          >
                            {region?.name ?? entry.regionId}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatLoeDate(drug.loeDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={scenarioId === 'base' ? 'default' : 'destructive'}
                            className="text-[10px]"
                          >
                            {scenario.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {fmtM(kpis.peakPreLOERevenue, sym)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {fmtM(kpis.cumulativePostLOERevenue, sym)}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums text-sm ${cumEBIT < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {fmtM(cumEBIT, sym)}
                        </TableCell>
                        <TableCell>
                          {scenarioId === 'base' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => openDrug(entry.id)}
                            >
                              Open
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
