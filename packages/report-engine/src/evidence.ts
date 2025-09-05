/**
 * Evidence Bullets — Confidence scoring for motif analysis
 * 
 * Transforms raw motif data into evidence bullets with:
 * - count: per-window motif occurrences
 * - persisted: run-length across recent windows  
 * - confidence: blended score from convergence, persistence, and stability
 */

export type EvidenceBullet = {
  motif: string;
  count: number;
  persisted: number; // run-length in windows
  confidence: number; // 0..1
};

export type EvidenceConfig = {
  wConvergence: number; // weight for convergence share (default 0.4)
  wPersistence: number; // weight for run-length persistence (default 0.4) 
  wStability: number;   // weight for stability S (default 0.2)
  minPersistence: number; // minimum windows to consider "persistent" (default 2)
};

const DEFAULT_CONFIG: EvidenceConfig = {
  wConvergence: 0.4,
  wPersistence: 0.4,
  wStability: 0.2,
  minPersistence: 2
};

/**
 * Compute evidence bullets from motif history and current report
 */
export function computeEvidence(
  currentMotifs: { motif: string; count: number }[],
  motifHistory: string[][], // recent window motif sets
  stabilityS: number,
  config: Partial<EvidenceConfig> = {}
): EvidenceBullet[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (currentMotifs.length === 0) return [];
  
  // Calculate persistence (run-length) for each current motif
  const persistence = new Map<string, number>();
  
  for (const motif of currentMotifs) {
    let runLength = 0;
    // Count consecutive windows where this motif appears
    for (let i = motifHistory.length - 1; i >= 0; i--) {
      if (motifHistory[i]?.includes(motif.motif)) {
        runLength++;
      } else {
        break;
      }
    }
    persistence.set(motif.motif, runLength);
  }
  
  // Calculate total motif count for convergence share
  const totalMotifs = currentMotifs.reduce((sum, m) => sum + m.count, 0);
  
  // Generate evidence bullets
  const evidence: EvidenceBullet[] = currentMotifs.map(({ motif, count }) => {
    const persisted = persistence.get(motif) ?? 0;
    const convergenceShare = totalMotifs > 0 ? count / totalMotifs : 0;
    
    // Confidence blending: convergence + persistence + stability
    const convergenceScore = Math.min(1, convergenceShare * 2); // amplify convergence
    const persistenceScore = Math.min(1, persisted / Math.max(cfg.minPersistence, 3));
    const stabilityScore = Math.min(1, stabilityS);
    
    const confidence = 
      cfg.wConvergence * convergenceScore +
      cfg.wPersistence * persistenceScore + 
      cfg.wStability * stabilityScore;
    
    return {
      motif,
      count,
      persisted,
      confidence: Math.max(0, Math.min(1, confidence))
    };
  });
  
  // Sort by confidence (highest first)
  return evidence.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Format evidence bullets for display
 */
export function formatEvidenceBullets(evidence: EvidenceBullet[]): string[] {
  return evidence.map(e => {
    const confPct = Math.round(e.confidence * 100);
    const status = e.persisted >= 2 ? "persistent" : "new";
    return `• ${e.motif} ×${e.count} (${status} ${e.persisted}w) — confidence ${confPct}%`;
  });
}

/**
 * Calculate evidence summary statistics
 */
export function evidenceStats(evidence: EvidenceBullet[]): {
  totalBullets: number;
  avgConfidence: number;
  persistentCount: number;
  highConfidenceCount: number; // confidence > 0.7
} {
  if (evidence.length === 0) {
    return { totalBullets: 0, avgConfidence: 0, persistentCount: 0, highConfidenceCount: 0 };
  }
  
  const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;
  const persistentCount = evidence.filter(e => e.persisted >= 2).length;
  const highConfidenceCount = evidence.filter(e => e.confidence > 0.7).length;
  
  return {
    totalBullets: evidence.length,
    avgConfidence,
    persistentCount,
    highConfidenceCount
  };
}
