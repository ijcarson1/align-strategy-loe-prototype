import type { DrugModel, ForecastPeriod, HistoricalVolume, MarketSegment, CurveType, MoleculeExpansion } from '../types';
import { getCurveById } from '../constants/decayCurves';

// ─── Ramp / Curve Helpers ─────────────────────────────────────────────────────

/**
 * Given months elapsed since an event started, returns a 0–1 progress value
 * shaped by the specified curve type. Returns 0 if event hasn't started.
 */
export function computeRampProgress(
  monthsSinceStart: number,
  monthsToPeak: number,
  curveType: CurveType
): number {
  if (monthsSinceStart <= 0 || monthsToPeak <= 0) return 0;
  const t = Math.min(monthsSinceStart / monthsToPeak, 1);

  switch (curveType) {
    case 'linear':
      return t;

    case 'rapid': {
      // Fast-starting exponential: k=4 → reaches ~98% of peak at t=1
      const k = 4;
      return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
    }

    case 'fast': {
      const k = 2.5;
      return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
    }

    case 'moderate':
    case 'exponential': {
      const k = 1.5;
      return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
    }

    case 's-curve': {
      // Logistic: centred at t=0.5, steepness=6
      const logistic = (x: number) => 1 / (1 + Math.exp(-6 * (x - 0.5)));
      return (logistic(t) - logistic(0)) / (logistic(1) - logistic(0));
    }

    default:
      return t;
  }
}

// ─── Per-Segment Retention ────────────────────────────────────────────────────

/**
 * Computes brand retention (0–1) for a segment at a given absolute month index
 * (monthsPostLOE = months since LOE date, 0-based). Combines all erosion events
 * multiplicatively. Returns 1.0 if no events are configured.
 */
function computeSegmentRetention(
  segment: MarketSegment,
  monthsPostLOE: number,
  loeYear: number,
  loeMonth: number
): number {
  if (segment.erosionEvents.length === 0) return NaN; // signal: use global curve

  let retention = 1.0;

  for (const event of segment.erosionEvents) {
    const [evYear, evMonth] = event.startMonth.split('-').map(Number);
    const monthsToEvent = (evYear - loeYear) * 12 + (evMonth - loeMonth);
    const monthsSinceStart = monthsPostLOE - monthsToEvent;
    if (monthsSinceStart <= 0) continue;

    const progress = computeRampProgress(monthsSinceStart, event.monthsToPeak, event.curveType);
    retention *= (1 - event.peakErosionPct * progress);
  }

  return Math.max(0, retention);
}

// ─── Molecule Expansion ───────────────────────────────────────────────────────

/**
 * Returns the annual average additional molecule volume contributed by expansion
 * for a forecast year, averaged over the months in that year.
 */
function computeExpansionVolumeForYear(
  expansion: MoleculeExpansion,
  loeYear: number,
  loeMonth: number,
  forecastYear: number
): number {
  const [expYear, expMonth] = expansion.startMonth.split('-').map(Number);
  const monthsToExpansionStart = (expYear - loeYear) * 12 + (expMonth - loeMonth);

  // months of the forecast year relative to LOE
  const yearStartIdx = (forecastYear - loeYear) * 12; // Jan of forecastYear
  const yearEndIdx = yearStartIdx + 11;                // Dec of forecastYear

  let total = 0;
  let count = 0;
  for (let m = yearStartIdx; m <= yearEndIdx; m++) {
    const monthsSinceExpStart = m - monthsToExpansionStart;
    const progress = computeRampProgress(monthsSinceExpStart, expansion.monthsToPeak, expansion.curveType);
    // After peak, hold at peak (progress clamped to 1 inside computeRampProgress)
    total += expansion.peakAdditionalVolume * progress;
    count++;
  }

  return total / count;
}

// ─── Volume Forecast Helpers ──────────────────────────────────────────────────

function computeWeightedGrowthRate(volumes: number[]): number {
  if (volumes.length < 4) return 0;
  const last = volumes.length - 1;
  const r1 = volumes[last] / volumes[last - 1] - 1;
  const r2 = volumes[last - 1] / volumes[last - 2] - 1;
  const r3 = volumes[last - 2] / volumes[last - 3] - 1;
  return r1 * 0.6 + r2 * 0.3 + r3 * 0.1;
}

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

function effectivePrices(drug: DrugModel, year: number): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const seg of drug.segments) {
    prices[seg.id] = seg.pricePerUnit;
  }
  // Combine pre-LOE and post-LOE price events — structurally identical, just UI-separated
  const allEvents = [...(drug.preLOEPriceEvents ?? []), ...drug.priceEvents];
  for (const event of allEvents) {
    const eventYear = parseInt(event.effectiveMonth.split('-')[0], 10);
    if (eventYear <= year && prices[event.segmentId] !== undefined) {
      prices[event.segmentId] *= (1 + event.pctChange);
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
  return { smCosts: smHC + smOther, nonSmCosts: nonSmHC + nonSmOther };
}

// ─── Master Forecast Builder ─────────────────────────────────────────────────

/**
 * Build full forecast for a drug model.
 * @param drug The drug model with all inputs
 * @param analogMultipliers Optional 61-month retention array for analog approach (Sprint 3)
 */
export function buildForecast(drug: DrugModel, analogMultipliers?: number[]): ForecastPeriod[] {
  const { year: loeYear, month: loeMonth } = parseLoEDate(drug.loeDate);

  // Blended dampening = volume-weighted average of per-segment dampening factors
  const totalWeight = drug.segments.reduce((s, seg) => s + seg.weight, 0) || 1;
  const blendedDampening = drug.segments.reduce(
    (s, seg) => s + (seg.dampeningFactor * seg.weight) / totalWeight,
    0
  );

  const throughYear = loeYear + 5;
  const allYears = projectVolumes(drug.historicalVolumes, blendedDampening, throughYear);

  // Determine decay curve (global fallback)
  const globalCurve = analogMultipliers
    ? { monthlyMultipliers: analogMultipliers }
    : drug.selectedDecayCurveId === 'custom'
      ? { monthlyMultipliers: drug.customDecayCurve }
      : getCurveById(drug.selectedDecayCurveId);

  // Does any segment have erosion events? If so, use per-segment path
  const hasSegmentEvents = drug.segments.some(s => s.erosionEvents.length > 0);

  const { smCosts, nonSmCosts } = computeAnnualOpex(drug);
  const g2n = drug.costStructure.grossToNetRatio;

  const periods: ForecastPeriod[] = [];

  for (const { year, units, isHistorical } of allYears) {
    const isPostLOE = year > loeYear || (year === loeYear && loeMonth === 1);

    let brandVolume: number;
    let genericVolume: number;
    let expansionVol = 0;

    if (isHistorical) {
      brandVolume = units;
      genericVolume = 0;
    } else if (!isPostLOE) {
      brandVolume = units;
      genericVolume = 0;
    } else {
      // ── Per-segment erosion path ──────────────────────────────────────────
      if (hasSegmentEvents && drug.forecastApproach === 'statistical') {
        // For each segment compute avg monthly retention over the year, then
        // derive segment brand volume and sum to total brand volume.
        let totalBrand = 0;

        const yearStartIdx = monthsBetween(loeYear, loeMonth, year, 1);
        const yearEndIdx = monthsBetween(loeYear, loeMonth, year, 12);

        for (const seg of drug.segments) {
          const retention = computeSegmentRetention(seg, 0, loeYear, loeMonth); // NaN check

          if (isNaN(retention)) {
            // Segment has no events — use global decay curve for this segment
            const startIdx = Math.max(0, yearStartIdx);
            const endIdx = Math.min(60, yearEndIdx);
            const slice = globalCurve.monthlyMultipliers.slice(startIdx, endIdx + 1);
            const avgMult = slice.length > 0
              ? slice.reduce((a, b) => a + b, 0) / slice.length
              : globalCurve.monthlyMultipliers[60] ?? 0.1;
            totalBrand += units * seg.weight * avgMult;
          } else {
            // Average segment retention over months in this year
            let retentionSum = 0;
            let retentionCount = 0;
            for (let m = yearStartIdx; m <= yearEndIdx; m++) {
              retentionSum += computeSegmentRetention(seg, m, loeYear, loeMonth);
              retentionCount++;
            }
            const avgRetention = retentionCount > 0 ? retentionSum / retentionCount : 0;
            totalBrand += units * seg.weight * avgRetention;
          }
        }

        brandVolume = Math.round(totalBrand);
        genericVolume = Math.max(0, units - brandVolume);

      } else {
        // ── Global decay curve path (original logic) ──────────────────────
        const yearStart = monthsBetween(loeYear, loeMonth, year, 1);
        const yearEnd = Math.min(monthsBetween(loeYear, loeMonth, year, 12), 60);

        if (yearStart > 60) {
          brandVolume = Math.round(units * (globalCurve.monthlyMultipliers[60] ?? 0.1));
        } else {
          const startIdx = Math.max(0, yearStart);
          const endIdx = Math.min(60, Math.max(0, yearEnd));
          const relevantMonths = globalCurve.monthlyMultipliers.slice(startIdx, endIdx + 1);
          const avgMultiplier = relevantMonths.length > 0
            ? relevantMonths.reduce((s, v) => s + v, 0) / relevantMonths.length
            : globalCurve.monthlyMultipliers[60] ?? 0.1;
          brandVolume = Math.round(units * avgMultiplier);
        }
        genericVolume = Math.max(0, units - brandVolume);
      }

      // ── Molecule expansion ──────────────────────────────────────────────
      if (drug.moleculeExpansion) {
        expansionVol = computeExpansionVolumeForYear(drug.moleculeExpansion, loeYear, loeMonth, year);
        const brandFromExpansion = Math.round(expansionVol * drug.brandCaptureOfExpansion);
        brandVolume += brandFromExpansion;
        genericVolume += Math.round(expansionVol * (1 - drug.brandCaptureOfExpansion));
      }
    }

    // ── Revenue & margin by segment ─────────────────────────────────────────
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
