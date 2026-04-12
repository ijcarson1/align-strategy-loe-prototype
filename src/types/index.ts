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
  weight: number;           // 0.0–1.0, all segments must sum to 1.0
  pricePerUnit: number;     // EUR
  cogsPerUnit: number;      // EUR
  dampeningFactor: number;  // 0.1–1.0 per segment (was top-level)
}

export interface HistoricalVolume {
  year: number;
  units: number;
}

export interface PriceEvent {
  id: string;
  segmentId: string;
  effectiveMonth: string; // "YYYY-MM"
  pctChange: number;      // e.g. -0.05 = −5%
}

export interface HeadcountLine {
  id: string;
  name: string;
  fte: number;
  costPerFte: number; // annual EUR
}

export interface OtherCostLine {
  id: string;
  name: string;
  annualCost: number; // EUR
}

export interface CostStructure {
  grossToNetRatio: number;       // 0–1, default 0.95
  smHeadcount: HeadcountLine[];  // Sales & Marketing headcount (5 lines)
  smOtherCosts: OtherCostLine[]; // S&M other costs (3 lines)
  nonSmHeadcount: HeadcountLine[]; // Non-S&M headcount (5 lines)
  nonSmOtherCosts: OtherCostLine[]; // Non-S&M other costs (3 lines)
}

export interface DrugModel {
  drugName: string;
  loeDate: string;                      // "YYYY-MM" e.g. "2026-01"
  historicalVolumes: HistoricalVolume[]; // 2018–2025
  segments: MarketSegment[];
  selectedDecayCurveId: DecayCurveId;
  customDecayCurve: number[];           // 61 monthly multipliers, only used if 'custom'
  priceEvents: PriceEvent[];
  costStructure: CostStructure;
}

export interface ForecastPeriod {
  label: string;                        // "2026", "2027", etc.
  year: number;
  isPostLOE: boolean;
  isHistorical: boolean;
  brandVolume: number;
  genericVolume: number;
  totalMoleculeVolume: number;
  grossSales: number;       // was brandRevenue
  netSales: number;         // grossSales × grossToNetRatio
  brandGrossProfit: number;
  grossMarginPct: number;
  smCosts: number;
  nonSmCosts: number;
  ebit: number;
  ebitMarginPct: number;
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
