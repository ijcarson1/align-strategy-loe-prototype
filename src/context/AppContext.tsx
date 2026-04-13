import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { AppState, DrugModel, User, AnalogCurve } from '../types';
import { DEMO_USERS } from '../constants/auth';
import { DEMO_DRUG_ENTRIES, DEMO_REGIONS } from '../constants/demoData';
import { buildForecast } from '../lib/forecasting';
import { getActiveDrug } from '../lib/state';
import { saveState, loadState, clearState } from '../lib/storage';

// ─── Initial State ────────────────────────────────────────────────────────────

function buildDefaultForecast(drugs: typeof DEMO_DRUG_ENTRIES, activeDrugId: string) {
  const entry = drugs.find(d => d.id === activeDrugId);
  if (!entry) return { base: [], alternate: [] };
  return {
    base: buildForecast(entry.scenarios.base.drug),
    alternate: buildForecast(entry.scenarios.alternate.drug),
  };
}

const DEFAULT_STATE: AppState = {
  isAuthenticated: false,
  user: null,
  activeScenario: 'base',
  drugs: DEMO_DRUG_ENTRIES,
  activeDrugId: 'drug_1',
  regions: DEMO_REGIONS,
  analogCurves: [],
  activeRegionId: undefined,
  forecast: buildDefaultForecast(DEMO_DRUG_ENTRIES, 'drug_1'),
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_DRUG'; scenario: 'base' | 'alternate'; drug: DrugModel }
  | { type: 'SET_ACTIVE_SCENARIO'; scenario: 'base' | 'alternate' }
  | { type: 'SET_ACTIVE_DRUG'; drugId: string }
  | { type: 'SET_ACTIVE_REGION'; regionId: string | undefined }
  | { type: 'ADD_ANALOG_CURVE'; curve: AnalogCurve }
  | { type: 'UPDATE_ANALOG_CURVE'; curve: AnalogCurve }
  | { type: 'REMOVE_ANALOG_CURVE'; curveId: string }
  | { type: 'LOAD_FROM_STORAGE'; state: Omit<AppState, 'forecast'> };

// ─── Forecast rebuilder ───────────────────────────────────────────────────────

function rebuildForecast(state: AppState): AppState['forecast'] {
  const entry = getActiveDrug(state);
  if (!entry) return { base: [], alternate: [] };
  const baseDrug = entry.scenarios.base.drug;
  const altDrug = entry.scenarios.alternate.drug;

  // Resolve analog multipliers if forecastApproach === 'analog'
  const resolveAnalog = (drug: DrugModel): number[] | undefined => {
    if (drug.forecastApproach !== 'analog' || !drug.analogCurveId) return undefined;
    const curve = state.analogCurves.find(c => c.id === drug.analogCurveId);
    return curve?.monthlyRetention;
  };

  return {
    base: buildForecast(baseDrug, resolveAnalog(baseDrug)),
    alternate: buildForecast(altDrug, resolveAnalog(altDrug)),
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isAuthenticated: true, user: action.user };

    case 'LOGOUT':
      return { ...DEFAULT_STATE, isAuthenticated: false, user: null };

    case 'UPDATE_DRUG': {
      const updatedDrugs = state.drugs.map(entry => {
        if (entry.id !== state.activeDrugId) return entry;
        return {
          ...entry,
          scenarios: {
            ...entry.scenarios,
            [action.scenario]: {
              ...entry.scenarios[action.scenario],
              drug: action.drug,
            },
          },
        };
      });
      const next = { ...state, drugs: updatedDrugs };
      return { ...next, forecast: rebuildForecast(next) };
    }

    case 'SET_ACTIVE_SCENARIO':
      return { ...state, activeScenario: action.scenario };

    case 'SET_ACTIVE_DRUG': {
      const next = { ...state, activeDrugId: action.drugId };
      return { ...next, forecast: rebuildForecast(next) };
    }

    case 'SET_ACTIVE_REGION':
      return { ...state, activeRegionId: action.regionId };

    case 'ADD_ANALOG_CURVE':
      return { ...state, analogCurves: [...state.analogCurves, action.curve] };

    case 'UPDATE_ANALOG_CURVE': {
      const curves = state.analogCurves.map(c => c.id === action.curve.id ? action.curve : c);
      const next = { ...state, analogCurves: curves };
      return { ...next, forecast: rebuildForecast(next) };
    }

    case 'REMOVE_ANALOG_CURVE': {
      const curves = state.analogCurves.filter(c => c.id !== action.curveId);
      return { ...state, analogCurves: curves };
    }

    case 'LOAD_FROM_STORAGE': {
      const next = { ...action.state };
      return { ...next, forecast: rebuildForecast(next as AppState) };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateDrug: (scenario: 'base' | 'alternate', drug: DrugModel) => void;
  setActiveScenario: (scenario: 'base' | 'alternate') => void;
  setActiveDrug: (drugId: string) => void;
  setActiveRegion: (regionId: string | undefined) => void;
  addAnalogCurve: (curve: AnalogCurve) => void;
  updateAnalogCurve: (curve: AnalogCurve) => void;
  removeAnalogCurve: (curveId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE, (initial) => {
    const saved = loadState();
    if (saved) {
      // Merge saved drugs with demo entries: prefer saved, fill in any missing demo entries
      const savedDrugIds = new Set(saved.drugs.map((d: { id: string }) => d.id));
      const mergedDrugs = [
        ...saved.drugs,
        ...DEMO_DRUG_ENTRIES.filter(d => !savedDrugIds.has(d.id)),
      ];
      const merged = { ...saved, drugs: mergedDrugs, regions: DEMO_REGIONS };
      return { ...merged, forecast: rebuildForecast(merged as AppState) };
    }
    return initial;
  });

  // Persist on every state change (excluding derived forecast)
  useEffect(() => {
    const { forecast: _forecast, ...toSave } = state;
    saveState(toSave);
  }, [state]);

  const login = useCallback((email: string, password: string): boolean => {
    const match = DEMO_USERS.find(
      u => u.email === email.trim().toLowerCase() && u.password === password
    );
    if (match) {
      dispatch({ type: 'LOGIN', user: match.user });
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    clearState();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateDrug = useCallback((scenario: 'base' | 'alternate', drug: DrugModel) => {
    dispatch({ type: 'UPDATE_DRUG', scenario, drug });
  }, []);

  const setActiveScenario = useCallback((scenario: 'base' | 'alternate') => {
    dispatch({ type: 'SET_ACTIVE_SCENARIO', scenario });
  }, []);

  const setActiveDrug = useCallback((drugId: string) => {
    dispatch({ type: 'SET_ACTIVE_DRUG', drugId });
  }, []);

  const setActiveRegion = useCallback((regionId: string | undefined) => {
    dispatch({ type: 'SET_ACTIVE_REGION', regionId });
  }, []);

  const addAnalogCurve = useCallback((curve: AnalogCurve) => {
    dispatch({ type: 'ADD_ANALOG_CURVE', curve });
  }, []);

  const updateAnalogCurve = useCallback((curve: AnalogCurve) => {
    dispatch({ type: 'UPDATE_ANALOG_CURVE', curve });
  }, []);

  const removeAnalogCurve = useCallback((curveId: string) => {
    dispatch({ type: 'REMOVE_ANALOG_CURVE', curveId });
  }, []);

  return (
    <AppContext.Provider value={{
      state, login, logout, updateDrug, setActiveScenario,
      setActiveDrug, setActiveRegion,
      addAnalogCurve, updateAnalogCurve, removeAnalogCurve,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
