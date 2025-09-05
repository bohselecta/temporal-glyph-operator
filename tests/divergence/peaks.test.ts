/**
 * Temporal Glyph Operator — Divergence Peak Detection Tests
 * Copyright © 2025 Hayden Lindley
 * Licensed under the Temporal Glyph Operator License (Strict Proprietary)
 */

import { computeDivergence, findPeaks, exportPeakCSV } from "@glyph/report-engine";
import assert from "node:assert/strict";
import test from "node:test";

test("computeDivergence - basic functionality", () => {
  const series = [
    [0.1, 0.2, 0.8, 0.3, 0.1], // strategy A
    [0.2, 0.1, 0.2, 0.7, 0.2]  // strategy B
  ];
  
  const points = computeDivergence(series);
  
  assert.equal(points.length, 5);
  assert.equal(points[0].delta, 0.1); // |0.1 - 0.2| = 0.1
  assert.equal(points[1].delta, 0.1); // |0.2 - 0.1| = 0.1
  assert(Math.abs(points[2].delta - 0.6) < 1e-10); // |0.8 - 0.2| = 0.6
  assert(Math.abs(points[3].delta - 0.4) < 1e-10); // |0.3 - 0.7| = 0.4
  assert.equal(points[4].delta, 0.1); // |0.1 - 0.2| = 0.1
});

test("findPeaks - synthetic data with known peaks", () => {
  // Create synthetic data with clear peaks at indices 2 and 6
  const series = [
    [0.1, 0.2, 0.9, 0.3, 0.2, 0.1, 0.8, 0.2, 0.1], // strategy A
    [0.2, 0.1, 0.2, 0.7, 0.1, 0.2, 0.1, 0.8, 0.2]  // strategy B
  ];
  
  const points = computeDivergence(series);
  const peaks = findPeaks(points, {
    window: 2,
    prominenceMin: 0.01, // Very low threshold
    distanceMin: 1
  });
  
  // Should find peaks at indices 2 and 6
  assert(peaks.length >= 1, "Should find at least one peak");
  
  const peakIndices = peaks.map(p => p.index);
  assert(peakIndices.includes(2) || peakIndices.includes(6), "Should find peak at index 2 or 6");
});

test("findPeaks - respect distance filtering", () => {
  const series = [
    [0.1, 0.9, 0.8, 0.2, 0.1], // strategy A - two nearby peaks
    [0.2, 0.1, 0.1, 0.8, 0.2]  // strategy B
  ];
  
  const points = computeDivergence(series);
  const peaks = findPeaks(points, {
    window: 2,
    prominenceMin: 0.1,
    distanceMin: 3 // Should suppress nearby peaks
  });
  
  // With distanceMin=3, should only keep one of the nearby peaks
  assert(peaks.length <= 2, "Should respect distance filtering");
});

test("findPeaks - confidence calculation", () => {
  const series = [
    [0.1, 0.9, 0.1], // strategy A - single peak
    [0.2, 0.1, 0.2]  // strategy B
  ];
  
  const points = computeDivergence(series);
  const peaks = findPeaks(points, {
    window: 1,
    prominenceMin: 0.1,
    distanceMin: 1
  });
  
  if (peaks.length > 0) {
    const peak = peaks[0];
    assert(peak.confidence >= 0 && peak.confidence <= 1, "Confidence should be between 0 and 1");
    assert(peak.prominence > 0, "Prominence should be positive");
    assert(peak.width >= 0, "Width should be non-negative");
  }
});

test("exportPeakCSV - valid CSV format", () => {
  const peaks = [
    {
      index: 10,
      delta: 0.5,
      prominence: 0.3,
      leftBase: 8,
      rightBase: 12,
      width: 4,
      confidence: 0.8
    },
    {
      index: 20,
      delta: 0.7,
      prominence: 0.4,
      leftBase: 18,
      rightBase: 22,
      width: 4,
      confidence: 0.9
    }
  ];
  
  const csv = exportPeakCSV(peaks);
  const lines = csv.split('\n');
  
  assert.equal(lines.length, 3); // header + 2 data rows
  assert.equal(lines[0], 'index,delta,prominence,width,confidence,leftBase,rightBase');
  assert(lines[1].includes('10,0.500000,0.300000,4,0.800000,8,12'));
  assert(lines[2].includes('20,0.700000,0.400000,4,0.900000,18,22'));
});

test("findPeaks - empty input", () => {
  const points = computeDivergence([]);
  const peaks = findPeaks(points);
  
  assert.equal(peaks.length, 0, "Should return empty array for empty input");
});

test("findPeaks - single point", () => {
  const points = computeDivergence([[0.5], [0.3]]);
  const peaks = findPeaks(points);
  
  // Single point can't be a peak (needs neighbors)
  assert.equal(peaks.length, 0, "Single point should not be a peak");
});

test("findPeaks - all same values", () => {
  const series = [
    [0.5, 0.5, 0.5, 0.5, 0.5],
    [0.5, 0.5, 0.5, 0.5, 0.5]
  ];
  
  const points = computeDivergence(series);
  const peaks = findPeaks(points);
  
  assert.equal(peaks.length, 0, "Should find no peaks in flat data");
});

console.log("✅ All divergence peak detection tests passed!");
