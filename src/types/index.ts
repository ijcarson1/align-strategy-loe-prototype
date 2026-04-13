export type DecayCurveId =
  | 'rapid'
  | 'moderate'
  | 'slow'
  | 'biosimilar'
  | 'reference_pricing'
  | 'custom';

export type CurveType = 'linear' | 'exponential' | 's-curve' | 'rapid' | 'fast' | 'moderate';

export type UserRole = 'global' | 'regional';

export interface VolumeEvent {
  id: string;
  description: string;
  startMonth: string;      // "YYYY-MM"
  peakErosionPct: number;  // 0–1 (fraction of segment volume eroded at peak)
  monthsToPeak: number;    // months from start to reach peak erosion
  curveType: CurveType;
}

export interface MoleculeExpansion {
  description: string;
  startMonth: string;             // "YYYY-MM"
  peakAdditionalVolume: number;   // absolute units at peak
  monthsToPeak: number;
  curveType: CurveType;
}

export interface MarketSegment {
  id: string;
  name: string;
  weight: number;           // 0.0–1.0, all segments must sum to 1.0
  pricePerUnit: number;     // local currency
  cogsPerUnit: number;      // local currency
  dampeningFactor: number;  // 0.1–1.0 per segment pre-LOE growth dampening
  erosionEvents: VolumeEvent[]; // max 3; if empty, global decay curve is used
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
  costPerFte: number; // annual local currency
}

export interface OtherCostLine {
  id: string;
  name: string;
  annualCost: number; // local currency
}

export interface CostStructure {
  grossToNetRatio: number;
  smHeadcount: HeadcountLine[];
  smOtherCosts: OtherCostLine[];
  nonSmHeadcount: HeadcountLine[];
  nonSmOtherCosts: OtherCostLine[];
}

export interface Region {
  id: string;
  name: string;
  currency: string;          // ISO code e.g. "EUR", "GBP", "DKK"
  currencySymbol: string;    // e.g. "€", "£", "kr"
  exchangeRateToBase: number; // 1 local unit = N EUR
}

export interface AnalogCurve {
  id: string;
  name: string;
  description?: string;
  monthlyRetention: number[]; // 61 values (month 0–60 post-LOE)
}

export interface DrugModel {
  drugName: string;
  loeDate: string;                      // "YYYY-MM"
  historicalVolumes: HistoricalVolume[];
  segments: MarketSegment[];
  selectedDecayCurveId: DecayCurveId;   // fallback when no erosionEvents configured
  customDecayCurve: number[];           // 61 monthly multipliers
  priceEvents: PriceEvent[];            // post-LOE price events
  preLOEPriceEvents: PriceEvent[];      // pre-LOE price events
  costStructure: CostStructure;
  moleculeExpansion?: MoleculeExpansion;
  brandCaptureOfExpansion: number;      // 0–1, share of expansion volume brand retains
  forecastApproach: 'statistical' | 'analog';
  analogCurveId?: string;               // references AnalogCurve.id
  regionId: string;                     // references Region.id
  currency: string;                     // ISO code (denormalized for convenience)
  currencySymbol: string;               // e.g. "€"
  exchangeRateToBase: number;           // 1 local unit = N EUR
}

export interface ForecastPeriod {
  label: string;
  year: number;
  isPostLOE: boolean;
  isHistorical: boolean;
  brandVolume: number;
  genericVolume: number;
  totalMoleculeVolume: number;
  grossSales: number;
  netSales: number;
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

export interface DrugEntry {
  id: string;
  regionId: string;
  scenarios: {
    base: Scenario;
    alternate: Scenario;
  };
}

export interface User {
  email: string;
  name: string;
  company: string;
  title: string;
  role: UserRole;
  regionId?: string; // only set for regional users
}

export interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  activeScenario: 'base' | 'alternate';
  drugs: DrugEntry[];
  activeDrugId: string;
  regions: Region[];
  analogCurves: AnalogCurve[];
  activeRegionId?: string; // global user region filter
  forecast: {
    base: ForecastPeriod[];
    alternate: ForecastPeriod[];
  };
}
