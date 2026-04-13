import type { DrugModel, CostStructure, Region, DrugEntry } from '../types';

// ─── Regions ──────────────────────────────────────────────────────────────────

export const DEMO_REGIONS: Region[] = [
  { id: 'nordics', name: 'Nordics', currency: 'DKK', currencySymbol: 'kr', exchangeRateToBase: 0.134 },
  { id: 'uk',      name: 'UK',      currency: 'GBP', currencySymbol: '£',  exchangeRateToBase: 1.17  },
  { id: 'germany', name: 'Germany', currency: 'EUR', currencySymbol: '€',  exchangeRateToBase: 1.0   },
];

// ─── Shared cost structure template ──────────────────────────────────────────

const DEFAULT_COST_STRUCTURE: CostStructure = {
  grossToNetRatio: 0.95,
  smHeadcount: [
    { id: 'sm_reps', name: 'Sales Reps', fte: 12, costPerFte: 80000 },
    { id: 'sm_msls', name: 'MSLs', fte: 4, costPerFte: 95000 },
    { id: 'sm_kams', name: 'KAMs', fte: 3, costPerFte: 90000 },
    { id: 'sm_mktg', name: 'Marketing', fte: 2, costPerFte: 85000 },
    { id: 'sm_other', name: 'Other S&M', fte: 1, costPerFte: 70000 },
  ],
  smOtherCosts: [
    { id: 'sm_oc1', name: 'Promotional Materials', annualCost: 150000 },
    { id: 'sm_oc2', name: 'Events & Conferences', annualCost: 80000 },
    { id: 'sm_oc3', name: 'Digital Marketing', annualCost: 60000 },
  ],
  nonSmHeadcount: [
    { id: 'nsm_med', name: 'Medical Affairs', fte: 3, costPerFte: 95000 },
    { id: 'nsm_reg', name: 'Regulatory', fte: 2, costPerFte: 85000 },
    { id: 'nsm_fin', name: 'Finance', fte: 2, costPerFte: 80000 },
    { id: 'nsm_hr', name: 'HR', fte: 1, costPerFte: 70000 },
    { id: 'nsm_other', name: 'Other Non-S&M', fte: 1, costPerFte: 70000 },
  ],
  nonSmOtherCosts: [
    { id: 'nsm_oc1', name: 'IT & Systems', annualCost: 120000 },
    { id: 'nsm_oc2', name: 'Legal & Compliance', annualCost: 90000 },
    { id: 'nsm_oc3', name: 'Other Overheads', annualCost: 50000 },
  ],
};

const UK_COST_STRUCTURE: CostStructure = {
  ...DEFAULT_COST_STRUCTURE,
  smHeadcount: DEFAULT_COST_STRUCTURE.smHeadcount.map(l => ({ ...l, costPerFte: Math.round(l.costPerFte * 1.15) })),
  nonSmHeadcount: DEFAULT_COST_STRUCTURE.nonSmHeadcount.map(l => ({ ...l, costPerFte: Math.round(l.costPerFte * 1.15) })),
};

// ─── Nordics BRANDEX (base drug) ─────────────────────────────────────────────

export const DEMO_DRUG: DrugModel = {
  drugName: 'BRANDEX',
  loeDate: '2026-01',
  regionId: 'nordics',
  currency: 'DKK',
  currencySymbol: 'kr',
  exchangeRateToBase: 0.134,
  historicalVolumes: [
    { year: 2018, units: 12414 },
    { year: 2019, units: 15704 },
    { year: 2020, units: 18618 },
    { year: 2021, units: 22155 },
    { year: 2022, units: 26000 },
    { year: 2023, units: 29000 },
    { year: 2024, units: 32000 },
    { year: 2025, units: 34000 },
  ],
  segments: [
    {
      id: 'public',
      name: 'Public',
      weight: 0.30,
      pricePerUnit: 41.00,   // ~DKK (≈€5.50)
      cogsPerUnit: 8.20,
      dampeningFactor: 0.7,
      erosionEvents: [
        {
          id: 'evt_pub_1',
          description: 'Generic launch — tender channel',
          startMonth: '2026-01',
          peakErosionPct: 0.65,
          monthsToPeak: 6,
          curveType: 'rapid',
        },
      ],
    },
    {
      id: 'low_private',
      name: 'Low-income Private',
      weight: 0.30,
      pricePerUnit: 47.80,
      cogsPerUnit: 9.55,
      dampeningFactor: 0.7,
      erosionEvents: [
        {
          id: 'evt_lp_1',
          description: 'Pharmacy substitution',
          startMonth: '2026-03',
          peakErosionPct: 0.50,
          monthsToPeak: 9,
          curveType: 'moderate',
        },
      ],
    },
    {
      id: 'high_private',
      name: 'High-income Private',
      weight: 0.40,
      pricePerUnit: 47.80,
      cogsPerUnit: 9.55,
      dampeningFactor: 0.65,
      erosionEvents: [],
    },
  ],
  selectedDecayCurveId: 'moderate',
  customDecayCurve: Array.from({ length: 61 }, (_, i) => Math.max(0.25, 1 - (i / 60) * 0.75)),
  priceEvents: [],
  preLOEPriceEvents: [],
  costStructure: DEFAULT_COST_STRUCTURE,
  moleculeExpansion: {
    description: 'OTC label expansion driving new patients',
    startMonth: '2026-06',
    peakAdditionalVolume: 8000,
    monthsToPeak: 18,
    curveType: 's-curve',
  },
  brandCaptureOfExpansion: 0.10,
  forecastApproach: 'statistical',
};

export const DEMO_DRUG_ALTERNATE: DrugModel = {
  ...DEMO_DRUG,
  segments: DEMO_DRUG.segments.map(s => ({ ...s, erosionEvents: s.erosionEvents.map(e => ({ ...e })) })),
  priceEvents: [],
  preLOEPriceEvents: [],
  costStructure: { ...DEFAULT_COST_STRUCTURE },
  selectedDecayCurveId: 'rapid',
  moleculeExpansion: {
    description: 'OTC label expansion driving new patients',
    startMonth: '2026-06',
    peakAdditionalVolume: 5000,
    monthsToPeak: 24,
    curveType: 's-curve',
  },
  brandCaptureOfExpansion: 0.05,
  forecastApproach: 'statistical',
};

// ─── UK BRANDEX ───────────────────────────────────────────────────────────────

export const BRANDEX_UK: DrugModel = {
  drugName: 'BRANDEX',
  loeDate: '2027-06',
  regionId: 'uk',
  currency: 'GBP',
  currencySymbol: '£',
  exchangeRateToBase: 1.17,
  historicalVolumes: [
    { year: 2019, units: 8200 },
    { year: 2020, units: 10100 },
    { year: 2021, units: 12400 },
    { year: 2022, units: 14800 },
    { year: 2023, units: 17200 },
    { year: 2024, units: 19500 },
    { year: 2025, units: 21000 },
  ],
  segments: [
    {
      id: 'nhs',
      name: 'NHS',
      weight: 0.65,
      pricePerUnit: 4.20,
      cogsPerUnit: 0.90,
      dampeningFactor: 0.65,
      erosionEvents: [
        {
          id: 'evt_nhs_1',
          description: 'NHSE mandatory generic switch',
          startMonth: '2027-06',
          peakErosionPct: 0.70,
          monthsToPeak: 9,
          curveType: 'rapid',
        },
      ],
    },
    {
      id: 'private',
      name: 'Private',
      weight: 0.35,
      pricePerUnit: 7.80,
      cogsPerUnit: 1.50,
      dampeningFactor: 0.75,
      erosionEvents: [],
    },
  ],
  selectedDecayCurveId: 'moderate',
  customDecayCurve: Array.from({ length: 61 }, (_, i) => Math.max(0.20, 1 - (i / 60) * 0.80)),
  priceEvents: [],
  preLOEPriceEvents: [],
  costStructure: UK_COST_STRUCTURE,
  brandCaptureOfExpansion: 0,
  forecastApproach: 'statistical',
};

export const BRANDEX_UK_ALTERNATE: DrugModel = {
  ...BRANDEX_UK,
  segments: BRANDEX_UK.segments.map(s => ({ ...s, erosionEvents: s.erosionEvents.map(e => ({ ...e })) })),
  priceEvents: [],
  preLOEPriceEvents: [],
  costStructure: { ...UK_COST_STRUCTURE },
  selectedDecayCurveId: 'rapid',
};

// ─── Drug entries (multi-drug portfolio) ─────────────────────────────────────

export const DEMO_DRUG_ENTRIES: DrugEntry[] = [
  {
    id: 'drug_1',
    regionId: 'nordics',
    scenarios: {
      base:      { id: 'base',      label: 'Base Case',      drug: DEMO_DRUG },
      alternate: { id: 'alternate', label: 'Alternate Case', drug: DEMO_DRUG_ALTERNATE },
    },
  },
  {
    id: 'drug_2',
    regionId: 'uk',
    scenarios: {
      base:      { id: 'base',      label: 'Base Case',      drug: BRANDEX_UK },
      alternate: { id: 'alternate', label: 'Alternate Case', drug: BRANDEX_UK_ALTERNATE },
    },
  },
];
