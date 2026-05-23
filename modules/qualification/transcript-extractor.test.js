/**
 * Tests for TranscriptExtractor
 * Validates extraction of demographic data, diagnoses, medications,
 * vital signs, lab results, and mapping to questionnaire field IDs.
 *
 * Requirements: 10
 */

const TranscriptExtractor = require('./transcript-extractor');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal questionnaire stub for mapping tests */
function makeQuestionnaire(questions) {
  return {
    sections: [{ id: 'test', title: 'Test', questions }],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. DEMOGRAPHICS
// ══════════════════════════════════════════════════════════════════════════════

describe('TranscriptExtractor – Demographics', () => {
  test('extracts age from "45 anos"', () => {
    const result = TranscriptExtractor.extract('Paciente com 45 anos de idade.');
    expect(result.age).toBe(45);
  });

  test('extracts age from "idade: 32"', () => {
    const result = TranscriptExtractor.extract('Idade: 32. Queixa principal: dor.');
    expect(result.age).toBe(32);
  });

  test('extracts age from structured object', () => {
    const result = TranscriptExtractor.extract({ patientAge: 60 });
    expect(result.age).toBe(60);
  });

  test('returns null age when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com queixa de dor.');
    expect(result.age).toBeNull();
  });

  test('extracts female gender', () => {
    const result = TranscriptExtractor.extract('Paciente do sexo feminino, 30 anos.');
    expect(result.gender).toBe('F');
  });

  test('extracts male gender', () => {
    const result = TranscriptExtractor.extract('Paciente masculino, 50 anos.');
    expect(result.gender).toBe('M');
  });

  test('extracts name from structured object', () => {
    const result = TranscriptExtractor.extract({ patientName: 'Maria Silva' });
    expect(result.name).toBe('Maria Silva');
  });

  test('detects pregnancy from text', () => {
    const result = TranscriptExtractor.extract('Paciente gestante, 28 anos.');
    expect(result.pregnancy_status).toBe(true);
  });

  test('returns null pregnancy when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com diabetes.');
    expect(result.pregnancy_status).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. ENDOCRINOLOGY FIELDS
// ══════════════════════════════════════════════════════════════════════════════

describe('TranscriptExtractor – Endocrinology', () => {
  test('detects HbA1c > 9% from numeric value in text', () => {
    const result = TranscriptExtractor.extract('HbA1c: 10,2%. Paciente em uso de insulina.');
    expect(result.hba1c_value).toBe(true);
  });

  test('detects HbA1c <= 9% as false', () => {
    const result = TranscriptExtractor.extract('Hemoglobina glicada: 7.5%.');
    expect(result.hba1c_value).toBe(false);
  });

  test('detects HbA1c from structured labResults', () => {
    const result = TranscriptExtractor.extract({ labResults: { hba1c: 9.5 } });
    expect(result.hba1c_value).toBe(true);
  });

  test('returns null hba1c_value when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com hipertensão.');
    expect(result.hba1c_value).toBeNull();
  });

  test('detects diabetic complications (pé diabético)', () => {
    const result = TranscriptExtractor.extract('Paciente com pé diabético e úlcera infectada.');
    expect(result.complications).toBe(true);
  });

  test('detects diabetic complications (retinopatia)', () => {
    const result = TranscriptExtractor.extract('Apresenta retinopatia diabética.');
    expect(result.complications).toBe(true);
  });

  test('returns null complications when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com diabetes controlada.');
    expect(result.complications).toBeNull();
  });

  test('detects insulin use from text', () => {
    const result = TranscriptExtractor.extract('Em uso de insulina NPH há 8 meses.');
    expect(result.insulin_use).toBe(true);
  });

  test('detects insulin use from medication keyword', () => {
    const result = TranscriptExtractor.extract('Medicações: insulina glargina 20UI.');
    expect(result.insulin_use).toBe(true);
  });

  test('returns null insulin_use when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente em uso de metformina.');
    expect(result.insulin_use).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. CARDIOLOGY FIELDS
// ══════════════════════════════════════════════════════════════════════════════

describe('TranscriptExtractor – Cardiology', () => {
  test('detects elevated blood pressure from text (160/100)', () => {
    const result = TranscriptExtractor.extract('PA: 160/100 mmHg.');
    expect(result.blood_pressure).toBe(true);
  });

  test('detects elevated blood pressure from structured vitalSigns', () => {
    const result = TranscriptExtractor.extract({ vitalSigns: { bloodPressure: '180/120' } });
    expect(result.blood_pressure).toBe(true);
  });

  test('detects normal blood pressure as false', () => {
    const result = TranscriptExtractor.extract('Pressão arterial: 120/80 mmHg.');
    expect(result.blood_pressure).toBe(false);
  });

  test('detects hypertension keyword as true', () => {
    const result = TranscriptExtractor.extract('Paciente com hipertensão arterial.');
    expect(result.blood_pressure).toBe(true);
  });

  test('detects cardiac history (infarto)', () => {
    const result = TranscriptExtractor.extract('Histórico de infarto agudo do miocárdio.');
    expect(result.medical_history).toBe(true);
  });

  test('detects cardiac history (AVC)', () => {
    const result = TranscriptExtractor.extract('Paciente com AVC prévio.');
    expect(result.medical_history).toBe(true);
  });

  test('returns null medical_history when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com diabetes tipo 2.');
    expect(result.medical_history).toBeNull();
  });

  test('detects renal markers (proteinúria)', () => {
    const result = TranscriptExtractor.extract('Exame de urina com proteinúria.');
    expect(result.lab_results).toBe(true);
  });

  test('detects renal markers (elevated creatinine)', () => {
    const result = TranscriptExtractor.extract('Creatinina: 1.8 mg/dL.');
    expect(result.lab_results).toBe(true);
  });

  test('returns null lab_results when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com dor articular.');
    expect(result.lab_results).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. RHEUMATOLOGY FIELDS
// ══════════════════════════════════════════════════════════════════════════════

describe('TranscriptExtractor – Rheumatology', () => {
  test('detects morning stiffness', () => {
    const result = TranscriptExtractor.extract('Rigidez matinal de 45 minutos ao acordar.');
    expect(result.joint_symptoms).toBe(true);
  });

  test('returns null joint_symptoms when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com diabetes.');
    expect(result.joint_symptoms).toBeNull();
  });

  test('detects joint swelling', () => {
    const result = TranscriptExtractor.extract('Inchaço articular em múltiplas articulações.');
    expect(result.swelling).toBe(true);
  });

  test('returns null swelling when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com hipertensão.');
    expect(result.swelling).toBeNull();
  });

  test('detects lupus symptoms (mancha em borboleta)', () => {
    const result = TranscriptExtractor.extract('Paciente com mancha em borboleta e queda de cabelo.');
    expect(result.lupus_symptoms).toBe(true);
  });

  test('detects lupus symptoms (LES keyword)', () => {
    const result = TranscriptExtractor.extract('Suspeita de LES com FAN positivo.');
    expect(result.lupus_symptoms).toBe(true);
  });

  test('returns null lupus_symptoms when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com artrose.');
    expect(result.lupus_symptoms).toBeNull();
  });

  test('detects osteoarthritis only (no inflammation)', () => {
    const result = TranscriptExtractor.extract('Paciente com artrose leve no joelho, dor mecânica.');
    expect(result.osteoarthritis).toBe(true);
  });

  test('does NOT flag osteoarthritis when inflammation is present', () => {
    const result = TranscriptExtractor.extract('Artrose com inflamação e rigidez matinal.');
    expect(result.osteoarthritis).toBe(false);
  });

  test('returns null osteoarthritis when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com diabetes.');
    expect(result.osteoarthritis).toBeNull();
  });

  test('detects systemic symptoms (febre + artralgia)', () => {
    const result = TranscriptExtractor.extract('Febre e artralgia há 3 semanas.');
    expect(result.systemic_symptoms).toBe(true);
  });

  test('detects systemic symptoms (fadiga alone)', () => {
    const result = TranscriptExtractor.extract('Fadiga intensa e perda de peso.');
    expect(result.systemic_symptoms).toBe(true);
  });

  test('returns null systemic_symptoms when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com pressão alta.');
    expect(result.systemic_symptoms).toBeNull();
  });

  test('detects polyarthritis keyword', () => {
    const result = TranscriptExtractor.extract('Diagnóstico de poliartrite.');
    expect(result.polyarthritis).toBe(true);
  });

  test('detects polyarthritis from "múltiplas articulações"', () => {
    const result = TranscriptExtractor.extract('Envolvimento de múltiplas articulações.');
    expect(result.polyarthritis).toBe(true);
  });

  test('returns null polyarthritis when not mentioned', () => {
    const result = TranscriptExtractor.extract('Paciente com diabetes.');
    expect(result.polyarthritis).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. QUESTIONNAIRE MAPPING
// ══════════════════════════════════════════════════════════════════════════════

describe('TranscriptExtractor – mapToQuestionnaire', () => {
  const endoQuestionnaire = makeQuestionnaire([
    { id: 'filter_1', type: 'boolean', prefilledFrom: 'transcript.pregnancy_status' },
    { id: 'filter_2', type: 'boolean', prefilledFrom: 'transcript.age' },
    { id: 'filter_3', type: 'boolean', prefilledFrom: 'transcript.hba1c_value' },
    { id: 'filter_4', type: 'boolean', prefilledFrom: 'transcript.complications' },
    { id: 'filter_5', type: 'boolean', prefilledFrom: 'transcript.insulin_use' },
  ]);

  test('maps pregnancy_status to filter_1', () => {
    const extracted = TranscriptExtractor.extract('Paciente gestante com diabetes.');
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, endoQuestionnaire);
    expect(responses['filter_1']).toBe(true);
  });

  test('maps hba1c_value to filter_3', () => {
    const extracted = TranscriptExtractor.extract('HbA1c: 10.5%. Em uso de insulina.');
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, endoQuestionnaire);
    expect(responses['filter_3']).toBe(true);
  });

  test('maps insulin_use to filter_5', () => {
    const extracted = TranscriptExtractor.extract('Paciente em uso de insulina NPH há 1 ano.');
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, endoQuestionnaire);
    expect(responses['filter_5']).toBe(true);
  });

  test('does not map fields with null extracted values', () => {
    const extracted = TranscriptExtractor.extract('Paciente com hipertensão.');
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, endoQuestionnaire);
    // pregnancy_status, hba1c_value, complications, insulin_use should not be set
    expect(responses['filter_1']).toBeUndefined();
    expect(responses['filter_3']).toBeUndefined();
    expect(responses['filter_4']).toBeUndefined();
    expect(responses['filter_5']).toBeUndefined();
  });

  test('returns empty object for null questionnaire', () => {
    const extracted = TranscriptExtractor.extract('Paciente com diabetes.');
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, null);
    expect(responses).toEqual({});
  });

  test('returns empty object for questionnaire without sections', () => {
    const extracted = TranscriptExtractor.extract('Paciente com diabetes.');
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, {});
    expect(responses).toEqual({});
  });

  test('skips questions without prefilledFrom', () => {
    const q = makeQuestionnaire([
      { id: 'alert_1', type: 'boolean' }, // no prefilledFrom
    ]);
    const extracted = TranscriptExtractor.extract('Paciente gestante.');
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, q);
    expect(responses['alert_1']).toBeUndefined();
  });

  test('getAutoPopulatedFields returns correct IDs', () => {
    const responses = { filter_1: true, filter_3: true };
    const fields = TranscriptExtractor.getAutoPopulatedFields(responses);
    expect(fields).toContain('filter_1');
    expect(fields).toContain('filter_3');
    expect(fields).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. EDGE CASES
// ══════════════════════════════════════════════════════════════════════════════

describe('TranscriptExtractor – Edge Cases', () => {
  test('returns empty object for null input', () => {
    const result = TranscriptExtractor.extract(null);
    expect(result).toEqual({});
  });

  test('returns empty object for undefined input', () => {
    const result = TranscriptExtractor.extract(undefined);
    expect(result).toEqual({});
  });

  test('handles empty string gracefully', () => {
    const result = TranscriptExtractor.extract('');
    // Empty string produces an extraction object; fields not found return null or undefined
    expect(result.age == null).toBe(true);
    expect(result.pregnancy_status == null).toBe(true);
  });

  test('handles structured object with no text fields', () => {
    const result = TranscriptExtractor.extract({ patientAge: 45, patientGender: 'M' });
    expect(result.age).toBe(45);
    expect(result.gender).toBe('M');
  });

  test('structured values take precedence over text parsing', () => {
    // Structured says 30, text says 45 anos
    const result = TranscriptExtractor.extract({ patientAge: 30, rawText: 'Paciente com 45 anos.' });
    expect(result.age).toBe(30);
  });

  test('converts boolean value for boolean question type', () => {
    const q = makeQuestionnaire([
      { id: 'filter_1', type: 'boolean', prefilledFrom: 'transcript.pregnancy_status' },
    ]);
    const extracted = { pregnancy_status: true };
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, q);
    expect(typeof responses['filter_1']).toBe('boolean');
    expect(responses['filter_1']).toBe(true);
  });

  test('converts number value for number question type', () => {
    const q = makeQuestionnaire([
      { id: 'q_age', type: 'number', prefilledFrom: 'transcript.age' },
    ]);
    const extracted = { age: 45 };
    const responses = TranscriptExtractor.mapToQuestionnaire(extracted, q);
    expect(typeof responses['q_age']).toBe('number');
    expect(responses['q_age']).toBe(45);
  });
});
