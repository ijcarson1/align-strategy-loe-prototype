import type { DrugModel, CostStructure } from '../types';

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

export const DEMO_DRUG: DrugModel = {
  drugName: 'BRANDEX',
  loeDate: '2026-01',
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
      pricePerUnit: 5.50,
      cogsPerUnit: 1.10,
      dampeningFactor: 0.7,
    },
    {
      id: 'low_private',
      name: 'Low-income Private',
      weight: 0.30,
      pricePerUnit: 6.40,
      cogsPerUnit: 1.28,
      dampeningFactor: 0.7,
    },
    {
      id: 'high_private',
      name: 'High-income Private',
      weight: 0.40,
      pricePerUnit: 6.40,
      cogsPerUnit: 1.28,
      dampeningFactor: 0.65,
    },
  ],
  selectedDecayCurveId: 'moderate',
  customDecayCurve: Array.from({ length: 61 }, (_, i) => Math.max(0.25, 1 - (i / 60) * 0.75)),
  priceEvents: [],
  costStructure: DEFAULT_COST_STRUCTURE,
};

export const DEMO_DRUG_ALTERNATE: DrugModel = {
  ...DEMO_DRUG,
  segments: DEMO_DRUG.segments.map(s => ({ ...s })),
  priceEvents: [],
  costStructure: { ...DEFAULT_COST_STRUCTURE },
  selectedDecayCurveId: 'rapid',
};
