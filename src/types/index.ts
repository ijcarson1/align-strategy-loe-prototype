export type DecayCurveId =
  | 'rapid'
  | 'moderate'
  | 'slow'
  | 'biosimilar'
  | 'reference_pricing'
  | 'custom';

export interface MarketSegment {
  id: string;
  name: string;
  weight: number;        // 0.0–1.0, all segments must sum to 1.0
  pricePerUnit: number;  // EUR
  cogsPerUnit: number;   // EUR
}

export interface HistoricalVolume {
  year: number;
  units: number;
}

export interface DrugModel {
  drugName: string;
  loeDate: string;                      // "YYYY-MM" e.g. "2026-01"
  historicalVolumes: HistoricalVolume[]; // 2018–2025
  dampeningFactor: number;              // 0.1–1.0, default 0.7
  segments: MarketSegment[];
  selectedDecayCurveId: DecayCurveId;
  customDecayCurve: number[];           // 61 monthly multipliers, only used if 'custom'
}

export interface ForecastPeriod {
  label: string;                        // "2026", "2027", etc. (annual) or "2026-01" (monthly)
  year: number;
  isPostLOE: boolean;
  isHistorical: boolean;
  brandVolume: number;
  genericVolume: number;
  totalMoleculeVolume: number;
  brandRevenue: number;
  brandGrossProfit: number;
  grossMarginPct: number;
  segmentBreakdown: {
    segmentId: string;
    segmentName: string;
    volume: number;
    revenue: number;
    grossProfit: number;
  }[];
}

export interface Scenario {
  id: 'base' | 'alternate';
  label: string;
  drug: DrugModel;
}

export interface User {
  email: string;
  name: string;
  company: string;
  title: string;
}

export interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  activeScenario: 'base' | 'alternate';
  scenarios: {
    base: Scenario;
    alternate: Scenario;
  };
  forecast: {
    base: ForecastPeriod[];
    alternate: ForecastPeriod[];
  };
}
