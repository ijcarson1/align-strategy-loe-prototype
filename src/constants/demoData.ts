import type { DrugModel } from '../types';

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
  dampeningFactor: 0.7,
  segments: [
    {
      id: 'public',
      name: 'Public',
      weight: 0.30,
      pricePerUnit: 5.50,
      cogsPerUnit: 1.10,
    },
    {
      id: 'low_private',
      name: 'Low-income Private',
      weight: 0.30,
      pricePerUnit: 6.40,
      cogsPerUnit: 1.28,
    },
    {
      id: 'high_private',
      name: 'High-income Private',
      weight: 0.40,
      pricePerUnit: 6.40,
      cogsPerUnit: 1.28,
    },
  ],
  selectedDecayCurveId: 'moderate',
  customDecayCurve: Array.from({ length: 61 }, (_, i) => Math.max(0.25, 1 - (i / 60) * 0.75)),
};

export const DEMO_DRUG_ALTERNATE: DrugModel = {
  ...DEMO_DRUG,
  selectedDecayCurveId: 'rapid',
};
