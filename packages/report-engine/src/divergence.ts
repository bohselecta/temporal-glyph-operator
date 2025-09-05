/**
 * Temporal Glyph Operator — Divergence Peak Detection
 * Copyright © 2025 Hayden Lindley
 * Licensed under the Temporal Glyph Operator License (Strict Proprietary)
 * 
 * Automatically detect and surface time windows where strategies disagree most,
 * providing one-click navigation and actionable insights for researchers.
 */

export type DivergencePoint = {
  index: number;         // timeline index
  delta: number;         // primary Δ at index
  baseline: number;      // rolling baseline at index
};

export type Peak = {
  index: number;
  delta: number;
  prominence: number;
  leftBase: number;
  rightBase: number;
  width: number;         // samples at half-prominence
  confidence: number;    // 0..1
};

export type PeakParams = {
  window?: number;         // rolling baseline window
  prominenceMin?: number;
  distanceMin?: number;
  alpha?: number; beta?: number; gamma?: number; // confidence weights
};

const DEFAULT_PARAMS: Required<PeakParams> = {
  window: 15,
  prominenceMin: 0.08,
  distanceMin: 10,
  alpha: 0.6,
  beta: 0.2,
  gamma: 0.2
};

/**
 * Compute divergence timeline from multiple strategy series
 * 
 * @param series Array of aligned numeric series (e.g., convergence for each strategy)
 * @returns Per-timestep divergence points using max-min approach
 */
export function computeDivergence(series: number[][]): DivergencePoint[] {
  if (series.length === 0) return [];
  
  const length = Math.min(...series.map(s => s.length));
  if (length === 0) return [];
  
  const points: DivergencePoint[] = [];
  
  for (let i = 0; i < length; i++) {
    const values = series.map(s => s[i] ?? 0).filter(v => !isNaN(v));
    
    if (values.length === 0) {
      points.push({ index: i, delta: 0, baseline: 0 });
      continue;
    }
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    const delta = max - min;
    
    // Simple baseline: average of all values
    const baseline = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    points.push({ index: i, delta, baseline });
  }
  
  return points;
}

/**
 * Find peaks in divergence timeline using prominence-based detection
 * 
 * @param points Divergence timeline points
 * @param params Peak detection parameters
 * @returns Array of detected peaks sorted by confidence
 */
export function findPeaks(points: DivergencePoint[], params: PeakParams = {}): Peak[] {
  const p = { ...DEFAULT_PARAMS, ...params };
  const peaks: Peak[] = [];
  
  if (points.length === 0) return peaks;
  
  // Calculate rolling baseline
  const baselines = calculateRollingBaseline(points.map(pt => pt.delta), p.window);
  
  // Find local maxima
  const candidates = findLocalMaxima(points, baselines);
  
  // Calculate prominence for each candidate
  for (const candidate of candidates) {
    const prominence = calculateProminence(points, candidate.index, baselines);
    
    if (prominence >= p.prominenceMin) {
      const { leftBase, rightBase, width } = calculatePeakWidth(points, candidate.index, prominence, baselines);
      const confidence = calculateConfidence(prominence, width, points.length, candidate.delta, p);
      
      peaks.push({
        index: candidate.index,
        delta: candidate.delta,
        prominence,
        leftBase,
        rightBase,
        width,
        confidence
      });
    }
  }
  
  // Apply distance filtering
  const filteredPeaks = applyDistanceFilter(peaks, p.distanceMin);
  
  // Sort by confidence (highest first)
  return filteredPeaks.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) < 1e-6) {
      if (Math.abs(a.delta - b.delta) < 1e-6) {
        return a.index - b.index; // deterministic tie-break
      }
      return b.delta - a.delta;
    }
    return b.confidence - a.confidence;
  });
}

/**
 * Summarize peaks by returning top-K most significant
 */
export function summarizePeaks(peaks: Peak[], k: number = 10): Peak[] {
  return peaks.slice(0, k);
}

/**
 * Calculate rolling baseline using median
 */
function calculateRollingBaseline(values: number[], window: number): number[] {
  const baselines: number[] = [];
  const halfWindow = Math.floor(window / 2);
  
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(values.length, i + halfWindow + 1);
    const windowValues = values.slice(start, end);
    
    // Use median for robustness
    windowValues.sort((a, b) => a - b);
    const median = windowValues.length % 2 === 0
      ? ((windowValues[windowValues.length / 2 - 1] ?? 0) + (windowValues[windowValues.length / 2] ?? 0)) / 2
      : (windowValues[Math.floor(windowValues.length / 2)] ?? 0);
    
    baselines.push(median);
  }
  
  return baselines;
}

/**
 * Find local maxima in the divergence timeline
 */
function findLocalMaxima(points: DivergencePoint[], baselines: number[]): DivergencePoint[] {
  const maxima: DivergencePoint[] = [];
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]?.delta ?? 0;
    const curr = points[i]?.delta ?? 0;
    const next = points[i + 1]?.delta ?? 0;
    
    // Local maximum: higher than neighbors
    if (curr > prev && curr > next) {
      // Must be above baseline (with some tolerance)
      const baseline = baselines[i] ?? 0;
      if (curr > baseline + 0.01) {
        const point = points[i];
        if (point) {
          maxima.push(point);
        }
      }
    }
  }
  
  return maxima;
}

/**
 * Calculate prominence of a peak
 */
function calculateProminence(points: DivergencePoint[], peakIndex: number, baselines: number[]): number {
  const peakValue = points[peakIndex]?.delta ?? 0;
  const peakBaseline = baselines[peakIndex] ?? 0;
  
  // Find the highest point on each side that is lower than the peak
  let leftMax = 0;
  let rightMax = 0;
  
  // Search left
  for (let i = peakIndex - 1; i >= 0; i--) {
    const delta = points[i]?.delta ?? 0;
    if (delta < peakValue) {
      leftMax = Math.max(leftMax, delta);
    }
  }
  
  // Search right
  for (let i = peakIndex + 1; i < points.length; i++) {
    const delta = points[i]?.delta ?? 0;
    if (delta < peakValue) {
      rightMax = Math.max(rightMax, delta);
    }
  }
  
  // Prominence is the height above the higher of the two surrounding valleys
  const surroundingValley = Math.max(leftMax, rightMax);
  const prominence = Math.max(0, peakValue - surroundingValley);
  
  
  return prominence;
}

/**
 * Calculate peak width at half-prominence
 */
function calculatePeakWidth(
  points: DivergencePoint[], 
  peakIndex: number, 
  prominence: number, 
  baselines: number[]
): { leftBase: number; rightBase: number; width: number } {
  const peakValue = points[peakIndex]?.delta ?? 0;
  const halfHeight = peakValue - prominence / 2;
  
  // Find left base
  let leftBase = peakIndex;
  for (let i = peakIndex - 1; i >= 0; i--) {
    const delta = points[i]?.delta ?? 0;
    if (delta <= halfHeight) {
      leftBase = i;
      break;
    }
  }
  
  // Find right base
  let rightBase = peakIndex;
  for (let i = peakIndex + 1; i < points.length; i++) {
    const delta = points[i]?.delta ?? 0;
    if (delta <= halfHeight) {
      rightBase = i;
      break;
    }
  }
  
  return {
    leftBase,
    rightBase,
    width: rightBase - leftBase
  };
}

/**
 * Calculate confidence score for a peak
 */
function calculateConfidence(
  prominence: number,
  width: number,
  seriesLength: number,
  delta: number,
  params: Required<PeakParams>
): number {
  const widthNorm = Math.min(1, width / seriesLength);
  const deltaNorm = Math.min(1, delta);
  
  const confidence = 
    params.alpha * prominence +
    params.beta * widthNorm +
    params.gamma * deltaNorm;
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Apply distance filtering to remove nearby peaks
 */
function applyDistanceFilter(peaks: Peak[], minDistance: number): Peak[] {
  if (peaks.length === 0) return peaks;
  
  const firstPeak = peaks[0];
  if (!firstPeak) return peaks;
  
  const filtered: Peak[] = [firstPeak]; // Always keep the first (highest confidence)
  
  for (let i = 1; i < peaks.length; i++) {
    const current = peaks[i];
    const lastKept = filtered[filtered.length - 1];
    
    if (current && lastKept && Math.abs(current.index - lastKept.index) >= minDistance) {
      filtered.push(current);
    }
  }
  
  return filtered;
}

/**
 * Export peaks to CSV format
 */
export function exportPeakCSV(peaks: Peak[]): string {
  const headers = ['index', 'delta', 'prominence', 'width', 'confidence', 'leftBase', 'rightBase'];
  const rows = peaks.map(peak => [
    peak.index,
    peak.delta.toFixed(6),
    peak.prominence.toFixed(6),
    peak.width,
    peak.confidence.toFixed(6),
    peak.leftBase,
    peak.rightBase
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Find peaks in session events (convenience function)
 */
export function findPeaksInSession(
  session: { events: Array<{ type: string; report?: any }> },
  params: PeakParams = {}
): Peak[] {
  // Extract convergence series from session events
  const series: number[][] = [];
  const reports = session.events.filter(e => e.type === 'report' && e.report?.metrics?.convergence !== undefined);
  
  if (reports.length === 0) return [];
  
  // Simple heuristic: alternate between strategies
  const uniform: number[] = [];
  const energyBiased: number[] = [];
  
  for (const report of reports) {
    const conv = report.report.metrics.convergence;
    if (uniform.length <= energyBiased.length) {
      uniform.push(conv);
    } else {
      energyBiased.push(conv);
    }
  }
  
  // Ensure both series have the same length
  const minLength = Math.min(uniform.length, energyBiased.length);
  const alignedSeries = [
    uniform.slice(0, minLength),
    energyBiased.slice(0, minLength)
  ];
  
  const divergencePoints = computeDivergence(alignedSeries);
  return findPeaks(divergencePoints, params);
}
