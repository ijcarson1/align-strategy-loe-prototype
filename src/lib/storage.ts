import type { AppState, DrugModel } from '../types';

const STORAGE_KEY = 'loe_forecast_v2';
const LEGACY_KEY = 'loe_forecast_v1';

// ─── Migration helpers ────────────────────────────────────────────────────────

function migrateDrug(drug: DrugModel): DrugModel {
  const defaultDampening = (drug as DrugModel & { dampeningFactor?: number }).dampeningFactor ?? 0.7;

  return {
    ...drug,
    segments: drug.segments.map(seg => ({
      ...seg,
      dampeningFactor: (seg as typeof seg & { dampeningFactor?: number }).dampeningFactor ?? defaultDampening,
    })),
    priceEvents: drug.priceEvents ?? [],
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

// ─── Public API ───────────────────────────────────────────────────────────────

export function saveState(state: Omit<AppState, 'forecast'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: 2 }));
  } catch {
    // storage unavailable — silent fail
  }
}

export function loadState(): Omit<AppState, 'forecast'> | null {
  try {
    // Try v2 first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === 2) return parsed;
    }

    // Migrate from v1
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy.version === 1 && legacy.scenarios) {
        const migrated = {
          ...legacy,
          version: 2,
          scenarios: {
            base: { ...legacy.scenarios.base, drug: migrateDrug(legacy.scenarios.base.drug) },
            alternate: { ...legacy.scenarios.alternate, drug: migrateDrug(legacy.scenarios.alternate.drug) },
          },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem(LEGACY_KEY);
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
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // silent
  }
}
