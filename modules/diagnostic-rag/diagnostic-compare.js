// diagnostic-compare.js
// Utility to compare COT (Chain of Thought) results with CID mapping results
// Returns a simple consistency report used by the pipeline and UI.

class DiagnosticCompare {
  /**
   * Compare the primary diagnosis from the COT conclusion with the CID mapping result.
   * @param {Object} cotResult - Result from ChainOfThoughtProcessor, expected to contain `conclusion.primaryDiagnosis` or `conclusion.diagnosis`.
   * @param {Object} cidResult - Result from CIDMapper, expected to contain `primary.diagnosis`.
   * @returns {Object} Consistency info with fields:
   *   - match: boolean indicating whether the diagnoses match (case‑insensitive).
   *   - cotDiagnosis: string from COT.
   *   - cidDiagnosis: string from CID.
   *   - note: optional textual note.
   */
  compare(cotResult, cidResult) {
    const cotDiagnosis = cotResult?.conclusion?.primaryDiagnosis || cotResult?.conclusion?.diagnosis || '';
    const cidDiagnosis = cidResult?.primary?.diagnosis || '';
    const normalizedCot = cotDiagnosis.trim().toLowerCase();
    const normalizedCid = cidDiagnosis.trim().toLowerCase();
    const match = normalizedCot && normalizedCid && normalizedCot === normalizedCid;
    const note = match
      ? 'Diagnóstico consistente entre COT e mapeamento CID.'
      : `Diagnóstico diverge: COT "${cotDiagnosis}" vs CID "${cidDiagnosis}"`;
    return { match, cotDiagnosis, cidDiagnosis, note };
  }
}

// Export for Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagnosticCompare;
} else {
  window.DiagnosticCompare = DiagnosticCompare;
}
