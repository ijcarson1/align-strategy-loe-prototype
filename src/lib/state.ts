import type { AppState, DrugEntry } from '../types';

/**
 * Returns the currently active DrugEntry, or undefined if not found.
 */
export function getActiveDrug(state: AppState): DrugEntry | undefined {
  return state.drugs.find(d => d.id === state.activeDrugId);
}

/**
 * Returns the list of drugs visible to the current user:
 * - Global users: all drugs, optionally filtered by activeRegionId
 * - Regional users: only drugs matching user.regionId
 */
export function getVisibleDrugs(state: AppState): DrugEntry[] {
  const user = state.user;
  if (!user) return [];

  if (user.role === 'regional' && user.regionId) {
    return state.drugs.filter(d => d.regionId === user.regionId);
  }

  // Global user — apply region filter if set
  if (state.activeRegionId) {
    return state.drugs.filter(d => d.regionId === state.activeRegionId);
  }

  return state.drugs;
}
