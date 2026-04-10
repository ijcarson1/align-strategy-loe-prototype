import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { AppState, DrugModel, User } from '../types';
import { DEMO_CREDENTIALS, DEMO_USER } from '../constants/auth';
import { DEMO_DRUG, DEMO_DRUG_ALTERNATE } from '../constants/demoData';
import { buildForecast } from '../lib/forecasting';
import { saveState, loadState, clearState } from '../lib/storage';

// ─── Initial State ────────────────────────────────────────────────────────────

const DEFAULT_STATE: AppState = {
  isAuthenticated: false,
  user: null,
  activeScenario: 'base',
  scenarios: {
    base: { id: 'base', label: 'Base Case', drug: DEMO_DRUG },
    alternate: { id: 'alternate', label: 'Alternate Case', drug: DEMO_DRUG_ALTERNATE },
  },
  forecast: {
    base: buildForecast(DEMO_DRUG),
    alternate: buildForecast(DEMO_DRUG_ALTERNATE),
  },
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOGIN'; user: User }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_DRUG'; scenario: 'base' | 'alternate'; drug: DrugModel }
  | { type: 'SET_ACTIVE_SCENARIO'; scenario: 'base' | 'alternate' }
  | { type: 'LOAD_FROM_STORAGE'; state: Omit<AppState, 'forecast'> };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isAuthenticated: true, user: action.user };

    case 'LOGOUT':
      return { ...DEFAULT_STATE, isAuthenticated: false, user: null };

    case 'UPDATE_DRUG': {
      const updatedScenarios = {
        ...state.scenarios,
        [action.scenario]: {
          ...state.scenarios[action.scenario],
          drug: action.drug,
        },
      };
      return {
        ...state,
        scenarios: updatedScenarios,
        forecast: {
          ...state.forecast,
          [action.scenario]: buildForecast(action.drug),
        },
      };
    }

    case 'SET_ACTIVE_SCENARIO':
      return { ...state, activeScenario: action.scenario };

    case 'LOAD_FROM_STORAGE':
      return {
        ...action.state,
        forecast: {
          base: buildForecast(action.state.scenarios.base.drug),
          alternate: buildForecast(action.state.scenarios.alternate.drug),
        },
      };

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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_STATE, (initial) => {
    const saved = loadState();
    if (saved) {
      return {
        ...saved,
        forecast: {
          base: buildForecast(saved.scenarios.base.drug),
          alternate: buildForecast(saved.scenarios.alternate.drug),
        },
      };
    }
    return initial;
  });

  // Persist on every state change (excluding forecast which is derived)
  useEffect(() => {
    const { forecast: _forecast, ...toSave } = state;
    saveState(toSave);
  }, [state]);

  const login = useCallback((email: string, password: string): boolean => {
    if (
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password
    ) {
      dispatch({ type: 'LOGIN', user: DEMO_USER });
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

  return (
    <AppContext.Provider value={{ state, login, logout, updateDrug, setActiveScenario }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
