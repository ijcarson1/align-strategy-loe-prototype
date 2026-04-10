import type { AppState } from '../types';

const STORAGE_KEY = 'loe_forecast_v1';

export function saveState(state: Omit<AppState, 'forecast'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: 1 }));
  } catch {
    // storage unavailable — silent fail
  }
}

export function loadState(): Omit<AppState, 'forecast'> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}
