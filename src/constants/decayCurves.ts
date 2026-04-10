import type { DecayCurveId } from '../types';

export interface DecayCurve {
  id: DecayCurveId;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  monthlyMultipliers: number[]; // index 0 = month of LOE, index 60 = month 60 post-LOE
                                // values = brand share RETENTION (1.0 = no erosion, 0.1 = 90% eroded)
}

function interpolate(points: [number, number][], months: number): number[] {
  const result: number[] = [];
  for (let m = 0; m <= months; m++) {
    // find surrounding control points
    let lo = points[0];
    let hi = points[points.length - 1];
    for (let i = 0; i < points.length - 1; i++) {
      if (m >= points[i][0] && m <= points[i + 1][0]) {
        lo = points[i];
        hi = points[i + 1];
        break;
      }
    }
    if (lo[0] === hi[0]) {
      result.push(lo[1]);
    } else {
      const t = (m - lo[0]) / (hi[0] - lo[0]);
      // ease-in-out interpolation for smoother curves
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      result.push(lo[1] + (hi[1] - lo[1]) * eased);
    }
  }
  return result;
}

export const DECAY_CURVES: DecayCurve[] = [
  {
    id: 'rapid',
    label: 'Rapid Erosion',
    shortLabel: 'Rapid',
    description: 'Strong multi-source generic entry. 80%+ market share lost by year 2.',
    color: '#ef4444',
    monthlyMultipliers: interpolate(
      [[0, 1.0], [6, 0.6], [12, 0.35], [18, 0.22], [24, 0.15], [36, 0.12], [60, 0.10]],
      60
    ),
  },
  {
    id: 'moderate',
    label: 'Moderate Erosion',
    shortLabel: 'Moderate',
    description: 'Typical small-molecule LOE. 50–60% share loss over 3 years.',
    color: '#f97316',
    monthlyMultipliers: interpolate(
      [[0, 1.0], [6, 0.85], [12, 0.68], [18, 0.56], [24, 0.46], [36, 0.34], [48, 0.25], [60, 0.20]],
      60
    ),
  },
  {
    id: 'slow',
    label: 'Slow Erosion',
    shortLabel: 'Slow',
    description: 'Limited generic competition or strong brand loyalty. ~40% share loss by year 5.',
    color: '#eab308',
    monthlyMultipliers: interpolate(
      [[0, 1.0], [12, 0.90], [24, 0.80], [36, 0.70], [48, 0.62], [60, 0.56]],
      60
    ),
  },
  {
    id: 'biosimilar',
    label: 'Biosimilar Entry',
    shortLabel: 'Biosimilar',
    description: 'Specialty/biologic product. Slower uptake, 30% share loss by year 5.',
    color: '#22c55e',
    monthlyMultipliers: interpolate(
      [[0, 1.0], [6, 0.97], [12, 0.93], [18, 0.88], [24, 0.84], [36, 0.78], [48, 0.74], [60, 0.70]],
      60
    ),
  },
  {
    id: 'reference_pricing',
    label: 'Reference Pricing Impact',
    shortLabel: 'Ref. Pricing',
    description: 'Policy-driven step-down. Sharp drop at policy implementation, then stabilises.',
    color: '#6366f1',
    monthlyMultipliers: interpolate(
      [[0, 1.0], [6, 0.92], [12, 0.88], [18, 0.58], [24, 0.52], [36, 0.50], [48, 0.50], [60, 0.48]],
      60
    ),
  },
  {
    id: 'custom',
    label: 'Custom Blend',
    shortLabel: 'Custom',
    description: 'Define your own erosion curve based on local market intelligence.',
    color: '#7a00df',
    monthlyMultipliers: interpolate(
      [[0, 1.0], [12, 0.75], [24, 0.55], [36, 0.40], [48, 0.30], [60, 0.25]],
      60
    ),
  },
];

export function getCurveById(id: DecayCurveId): DecayCurve {
  return DECAY_CURVES.find(c => c.id === id) ?? DECAY_CURVES[1];
}
