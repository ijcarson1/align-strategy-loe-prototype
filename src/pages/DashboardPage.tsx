import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { computeKPIs } from '../lib/forecasting';
import { getCurveById } from '../constants/decayCurves';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import KPICards from '../components/dashboard/KPICards';
import VolumeChart from '../components/dashboard/VolumeChart';
import RevenueChart from '../components/dashboard/RevenueChart';
import ScenarioPanel from '../components/dashboard/ScenarioPanel';

function formatLoeDate(loeDate: string) {
  const [year, month] = loeDate.split('-');
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function getLOECountdown(loeDate: string) {
  const [year, month] = loeDate.split('-').map(Number);
  const diffDays = Math.round((new Date(year, month - 1, 1).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays < 30) return `${diffDays} days away`;
  const months = Math.round(diffDays / 30);
  return `${months} month${months !== 1 ? 's' : ''} away`;
}

export default function DashboardPage() {
  const { state, setActiveScenario } = useApp();
  const navigate = useNavigate();
  const activeForecast = state.forecast[state.activeScenario];
  const drug = state.scenarios[state.activeScenario].drug;
  const kpis = computeKPIs(activeForecast);
  const curve = getCurveById(drug.selectedDecayCurveId);
  const isPast = new Date(drug.loeDate.split('-').map(Number)[0], drug.loeDate.split('-').map(Number)[1] - 1, 1) < new Date();

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* LOE Banner */}
      <div className="px-4 lg:px-6">
        <div className="rounded-xl bg-sidebar text-sidebar-foreground px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-11 rounded-xl bg-primary/30 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="9" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.8"/>
                <path d="M11 6v5l3 3" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">Loss of Exclusivity</p>
              <p className="text-xl font-bold mt-0.5">{formatLoeDate(drug.loeDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-xs text-sidebar-foreground/40">Countdown</p>
              <p className={`text-sm font-semibold mt-0.5 ${isPast ? 'text-destructive' : ''}`}>
                {getLOECountdown(drug.loeDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-sidebar-foreground/40">Erosion model</p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: curve.color }}>{curve.label}</p>
            </div>
            <Button size="sm" onClick={() => navigate('/inputs')}>Edit inputs</Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 lg:px-6">
        <KPICards kpis={kpis} drug={drug} />
      </div>

      {/* Scenario switcher */}
      <div className="px-4 lg:px-6 flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Viewing:</span>
        {(['base', 'alternate'] as const).map(s => (
          <Button
            key={s}
            size="sm"
            variant={state.activeScenario === s ? 'default' : 'outline'}
            onClick={() => setActiveScenario(s)}
            className={state.activeScenario === s && s === 'alternate' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {s === 'base' ? 'Base Case' : 'Alternate Case'}
          </Button>
        ))}
        <Badge variant="outline" className="text-xs text-muted-foreground hidden sm:inline-flex">
          Switch to compare scenarios
        </Badge>
      </div>

      <div className="px-4 lg:px-6">
        <Separator />
      </div>

      {/* Charts */}
      <div className="px-4 lg:px-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <VolumeChart forecast={activeForecast} loeDate={drug.loeDate} />
        </div>
        <ScenarioPanel
          baseForecast={state.forecast.base}
          alternateForecast={state.forecast.alternate}
          baseLabel={state.scenarios.base.label}
          alternateLabel={state.scenarios.alternate.label}
          baseCurve={getCurveById(state.scenarios.base.drug.selectedDecayCurveId)}
          alternateCurve={getCurveById(state.scenarios.alternate.drug.selectedDecayCurveId)}
        />
      </div>

      <div className="px-4 lg:px-6">
        <RevenueChart forecast={activeForecast} loeDate={drug.loeDate} />
      </div>
    </div>
  );
}
