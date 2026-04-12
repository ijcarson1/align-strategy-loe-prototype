import type { DrugModel, ForecastPeriod, HistoricalVolume } from '../types';
import { getCurveById } from '../constants/decayCurves';

// ─── Volume Forecast Helpers ──────────────────────────────────────────────────

function computeWeightedGrowthRate(volumes: number[]): number {
  if (volumes.length < 4) return 0;
  const last = volumes.length - 1;
  const r1 = volumes[last] / volumes[last - 1] - 1;
  const r2 = volumes[last - 1] / volumes[last - 2] - 1;
  const r3 = volumes[last - 2] / volumes[last - 3] - 1;
  return r1 * 0.6 + r2 * 0.3 + r3 * 0.1;
}

/**
 * Project annual volumes using per-segment weighted dampening.
 * Computes a single blended dampening factor from segment weights.
 */
function projectVolumes(
  historical: HistoricalVolume[],
  blendedDampening: number,
  throughYear: number
): { year: number; units: number; isHistorical: boolean }[] {
  const sorted = [...historical].sort((a, b) => a.year - b.year);
  const result: { year: number; units: number; isHistorical: boolean }[] = sorted.map(h => ({
    ...h,
    isHistorical: true,
  }));

  let rollingVolumes = sorted.map(h => h.units);
  let currentYear = sorted[sorted.length - 1].year;

  while (currentYear < throughYear) {
    const growth = computeWeightedGrowthRate(rollingVolumes);
    const dampened = growth * blendedDampening;
    const nextVol = Math.max(0, rollingVolumes[rollingVolumes.length - 1] * (1 + dampened));
    currentYear++;
    result.push({ year: currentYear, units: Math.round(nextVol), isHistorical: false });
    rollingVolumes = [...rollingVolumes.slice(1), nextVol];
  }

  return result;
}

// ─── LOE Date Helpers ─────────────────────────────────────────────────────────

function parseLoEDate(loeDate: string): { year: number; month: number } {
  const [y, m] = loeDate.split('-').map(Number);
  return { year: y, month: m };
}

function monthsBetween(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): number {
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

// ─── Price Event Helpers ──────────────────────────────────────────────────────

/**
 * For a given year, compute the effective price per unit for each segment,
 * applying any price events that have taken effect by that year.
 * Returns a map of segmentId → effective price.
 */
function effectivePrices(
  drug: DrugModel,
  year: number
): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const seg of drug.segments) {
    prices[seg.id] = seg.pricePerUnit;
  }

  for (const event of drug.priceEvents) {
    const eventYear = parseInt(event.effectiveMonth.split('-')[0], 10);
    if (eventYear <= year) {
      if (prices[event.segmentId] !== undefined) {
        prices[event.segmentId] *= (1 + event.pctChange);
      }
    }
  }

  return prices;
}

// ─── Opex Helpers ─────────────────────────────────────────────────────────────

function computeAnnualOpex(drug: DrugModel): { smCosts: number; nonSmCosts: number } {
  const cs = drug.costStructure;
  const smHC = cs.smHeadcount.reduce((s, l) => s + l.fte * l.costPerFte, 0);
  const smOther = cs.smOtherCosts.reduce((s, l) => s + l.annualCost, 0);
  const nonSmHC = cs.nonSmHeadcount.reduce((s, l) => s + l.fte * l.costPerFte, 0);
  const nonSmOther = cs.nonSmOtherCosts.reduce((s, l) => s + l.annualCost, 0);
  return {
    smCosts: smHC + smOther,
    nonSmCosts: nonSmHC + nonSmOther,
  };
}

// ─── Master Forecast Builder ─────────────────────────────────────────────────

export function buildForecast(drug: DrugModel): ForecastPeriod[] {
  const { year: loeYear, month: loeMonth } = parseLoEDate(drug.loeDate);

  // Blended dampening = volume-weighted average of per-segment dampening
  const totalWeight = drug.segments.reduce((s, seg) => s + seg.weight, 0) || 1;
  const blendedDampening = drug.segments.reduce(
    (s, seg) => s + (seg.dampeningFactor * seg.weight) / totalWeight,
    0
  );

  const throughYear = loeYear + 5;
  const allYears = projectVolumes(drug.historicalVolumes, blendedDampening, throughYear);

  const curve =
    drug.selectedDecayCurveId === 'custom'
      ? { monthlyMultipliers: drug.customDecayCurve }
      : getCurveById(drug.selectedDecayCurveId);

  const { smCosts, nonSmCosts } = computeAnnualOpex(drug);
  const g2n = drug.costStructure.grossToNetRatio;

  const periods: ForecastPeriod[] = [];

  for (const { year, units, isHistorical } of allYears) {
    const isPostLOE = year > loeYear || (year === loeYear && loeMonth === 1);

    let brandVolume: number;
    let genericVolume: number;

    if (isHistorical) {
      brandVolume = units;
      genericVolume = 0;
    } else if (!isPostLOE) {
      brandVolume = units;
      genericVolume = 0;
    } else {
      const yearStart = monthsBetween(loeYear, loeMonth, year, 1);
      const yearEnd = Math.min(monthsBetween(loeYear, loeMonth, year, 12), 60);

      if (yearStart > 60) {
        brandVolume = Math.round(units * (curve.monthlyMultipliers[60] ?? 0.1));
      } else {
        const startIdx = Math.max(0, yearStart);
        const endIdx = Math.min(60, Math.max(0, yearEnd));
        const relevantMonths = curve.monthlyMultipliers.slice(startIdx, endIdx + 1);
        const avgMultiplier =
          relevantMonths.length > 0
            ? relevantMonths.reduce((s, v) => s + v, 0) / relevantMonths.length
            : curve.monthlyMultipliers[60] ?? 0.1;
        brandVolume = Math.round(units * avgMultiplier);
      }
      genericVolume = Math.max(0, units - brandVolume);
    }

    // Prices adjusted for price events
    const prices = effectivePrices(drug, year);

    const totalVol = brandVolume;
    let totalGrossSales = 0;
    let totalGrossProfit = 0;

    const segmentBreakdown = drug.segments.map(seg => {
      const segVol = totalVol * seg.weight;
      const segPrice = prices[seg.id] ?? seg.pricePerUnit;
      const segRevenue = segVol * segPrice;
      const segGP = segVol * (segPrice - seg.cogsPerUnit);
      totalGrossSales += segRevenue;
      totalGrossProfit += segGP;
      return {
        segmentId: seg.id,
        segmentName: seg.name,
        volume: segVol,
        revenue: segRevenue,
        grossProfit: segGP,
      };
    });

    const grossMarginPct = totalGrossSales > 0 ? totalGrossProfit / totalGrossSales : 0;
    const netSales = totalGrossSales * g2n;
    // EBIT = Net Sales − COGS − S&M costs − Non-S&M costs
    const cogs = totalGrossSales - totalGrossProfit;
    const ebitCalc = netSales - cogs - smCosts - nonSmCosts;
    const ebitMarginPct = netSales > 0 ? ebitCalc / netSales : 0;

    periods.push({
      label: String(year),
      year,
      isPostLOE,
      isHistorical,
      brandVolume,
      genericVolume,
      totalMoleculeVolume: brandVolume + genericVolume,
      grossSales: totalGrossSales,
      netSales,
      brandGrossProfit: totalGrossProfit,
      grossMarginPct,
      smCosts,
      nonSmCosts,
      ebit: ebitCalc,
      ebitMarginPct,
      segmentBreakdown,
    });
  }

  return periods;
}

// ─── Derived KPI Helpers ─────────────────────────────────────────────────────

export function computeKPIs(forecast: ForecastPeriod[]) {
  const preLOE = forecast.filter(p => !p.isPostLOE && !p.isHistorical);
  const postLOE = forecast.filter(p => p.isPostLOE);
  const historical = forecast.filter(p => p.isHistorical);

  const peakPreLOERevenue = preLOE.length > 0
    ? Math.max(...preLOE.map(p => p.grossSales))
    : (historical.length > 0 ? Math.max(...historical.map(p => p.grossSales)) : 0);

  const cumulativePostLOERevenue = postLOE.reduce((s, p) => s + p.grossSales, 0);

  const revenueAtRisk = peakPreLOERevenue > 0 && postLOE.length >= 3
    ? peakPreLOERevenue - (postLOE[2]?.grossSales ?? 0)
    : 0;

  const avgPostLOEGM = postLOE.length > 0
    ? postLOE.reduce((s, p) => s + p.grossMarginPct, 0) / postLOE.length
    : 0;

  return {
    peakPreLOERevenue,
    cumulativePostLOERevenue,
    revenueAtRisk,
    avgPostLOEGrossMargin: avgPostLOEGM,
  };
}
