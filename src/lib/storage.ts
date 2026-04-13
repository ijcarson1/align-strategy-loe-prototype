import type { AppState, DrugModel, DrugEntry, Scenario } from '../types';
import { DEMO_REGIONS } from '../constants/demoData';

const STORAGE_KEY = 'loe_forecast_v4';
const LEGACY_KEYS = ['loe_forecast_v3', 'loe_forecast_v2', 'loe_forecast_v1'];

// ─── Migration helpers ────────────────────────────────────────────────────────

function migrateDrug(drug: DrugModel): DrugModel {
  const legacy = drug as DrugModel & { dampeningFactor?: number };
  const defaultDampening = legacy.dampeningFactor ?? 0.7;

  return {
    ...drug,
    segments: drug.segments.map(seg => ({
      ...seg,
      dampeningFactor: (seg as typeof seg & { dampeningFactor?: number }).dampeningFactor ?? defaultDampening,
      erosionEvents: (seg as typeof seg & { erosionEvents?: unknown[] }).erosionEvents ?? [],
    })),
    priceEvents: drug.priceEvents ?? [],
    preLOEPriceEvents: (drug as DrugModel & { preLOEPriceEvents?: unknown[] }).preLOEPriceEvents ?? [],
    moleculeExpansion: (drug as DrugModel & { moleculeExpansion?: unknown }).moleculeExpansion ?? undefined,
    brandCaptureOfExpansion: (drug as DrugModel & { brandCaptureOfExpansion?: number }).brandCaptureOfExpansion ?? 0,
    forecastApproach: (drug as DrugModel & { forecastApproach?: string }).forecastApproach as 'statistical' | 'analog' ?? 'statistical',
    analogCurveId: (drug as DrugModel & { analogCurveId?: string }).analogCurveId ?? undefined,
    regionId: (drug as DrugModel & { regionId?: string }).regionId ?? 'nordics',
    currency: (drug as DrugModel & { currency?: string }).currency ?? 'EUR',
    currencySymbol: (drug as DrugModel & { currencySymbol?: string }).currencySymbol ?? '€',
    exchangeRateToBase: (drug as DrugModel & { exchangeRateToBase?: number }).exchangeRateToBase ?? 1,
    costStructure: drug.costStructure ?? {
      grossToNetRatio: 0.95,
      smHeadcount: [
        { id: 'sm_reps', name: 'Sales Reps', fte: 0, costPerFte: 80000 },
        { id: 'sm_msls', name: 'MSLs', fte: 0, costPerFte: 95000 },
        { id: 'sm_kams', name: 'KAMs', fte: 0, costPerFte: 90000 },
        { id: 'sm_mktg', name: 'Marketing', fte: 0, costPerFte: 85000 },
        { id: 'sm_other', name: 'Other S&M', fte: 0, costPerFte: 70000 },
      ],
      smOtherCosts: [
        { id: 'sm_oc1', name: 'Promotional Materials', annualCost: 0 },
        { id: 'sm_oc2', name: 'Events & Conferences', annualCost: 0 },
        { id: 'sm_oc3', name: 'Digital Marketing', annualCost: 0 },
      ],
      nonSmHeadcount: [
        { id: 'nsm_med', name: 'Medical Affairs', fte: 0, costPerFte: 95000 },
        { id: 'nsm_reg', name: 'Regulatory', fte: 0, costPerFte: 85000 },
        { id: 'nsm_fin', name: 'Finance', fte: 0, costPerFte: 80000 },
        { id: 'nsm_hr', name: 'HR', fte: 0, costPerFte: 70000 },
        { id: 'nsm_other', name: 'Other Non-S&M', fte: 0, costPerFte: 70000 },
      ],
      nonSmOtherCosts: [
        { id: 'nsm_oc1', name: 'IT & Systems', annualCost: 0 },
        { id: 'nsm_oc2', name: 'Legal & Compliance', annualCost: 0 },
        { id: 'nsm_oc3', name: 'Other Overheads', annualCost: 0 },
      ],
    },
  };
}

function migrateScenario(s: Scenario): Scenario {
  return { ...s, drug: migrateDrug(s.drug) };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function saveState(state: Omit<AppState, 'forecast'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: 4 }));
  } catch {
    // storage unavailable — silent fail
  }
}

export function loadState(): Omit<AppState, 'forecast'> | null {
  try {
    // Try current version first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === 4) return parsed;
    }

    // Migrate from v3/v2/v1 — all had a `scenarios` field
    for (const legacyKey of LEGACY_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      const legacy = JSON.parse(legacyRaw);
      if (legacy.scenarios) {
        const base = migrateScenario(legacy.scenarios.base);
        const alternate = migrateScenario(legacy.scenarios.alternate);
        const drugEntry: DrugEntry = {
          id: 'drug_1',
          regionId: base.drug.regionId,
          scenarios: { base, alternate },
        };
        const migrated: Omit<AppState, 'forecast'> = {
          isAuthenticated: legacy.isAuthenticated ?? false,
          user: legacy.user
            ? { ...legacy.user, role: legacy.user.role ?? 'global', regionId: legacy.user.regionId ?? undefined }
            : null,
          activeScenario: legacy.activeScenario ?? 'base',
          drugs: [drugEntry],
          activeDrugId: 'drug_1',
          regions: DEMO_REGIONS,
          analogCurves: [],
          activeRegionId: undefined,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...migrated, version: 4 }));
        localStorage.removeItem(legacyKey);
        return migrated;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    // silent
  }
}
