/**
 * TranscriptExtractor
 * Parses consultation transcripts and maps extracted data to questionnaire field IDs.
 *
 * Extracts:
 *  - Demographic data (age, gender, name)
 *  - Diagnoses and medications
 *  - Vital signs and lab results
 *
 * Maps extracted data to the `prefilledFrom` paths used in protocol questionnaires:
 *  transcript.age, transcript.pregnancy_status, transcript.hba1c_value,
 *  transcript.complications, transcript.insulin_use, transcript.blood_pressure,
 *  transcript.medical_history, transcript.lab_results, transcript.joint_symptoms,
 *  transcript.swelling, transcript.lupus_symptoms, transcript.osteoarthritis,
 *  transcript.systemic_symptoms, transcript.polyarthritis
 */

class TranscriptExtractor {
  /**
   * Parses a consultation transcript (raw text or structured object) and
   * returns a flat "transcript" object whose keys match the `prefilledFrom`
   * paths declared in the protocol JSON files.
   *
   * @param {string|Object} transcript - Raw transcript text or structured consultation data
   * @returns {Object} Flat transcript object with extracted values
   */
  static extract(transcript) {
    if (!transcript) return {};

    // Normalise: accept both raw text and structured objects
    const text = typeof transcript === 'string'
      ? transcript
      : (transcript.rawText || transcript.transcript || transcript.text || '');

    const structured = typeof transcript === 'object' ? transcript : {};

    return {
      // ── Demographics ──────────────────────────────────────────────────────
      name:              TranscriptExtractor._extractName(text, structured),
      age:               TranscriptExtractor._extractAge(text, structured),
      gender:            TranscriptExtractor._extractGender(text, structured),
      pregnancy_status:  TranscriptExtractor._extractPregnancyStatus(text, structured),

      // ── Endocrinology-specific ────────────────────────────────────────────
      hba1c_value:       TranscriptExtractor._extractHba1cHigh(text, structured),
      complications:     TranscriptExtractor._extractDiabeticComplications(text, structured),
      insulin_use:       TranscriptExtractor._extractInsulinUse(text, structured),

      // ── Cardiology-specific ───────────────────────────────────────────────
      blood_pressure:    TranscriptExtractor._extractBloodPressureHigh(text, structured),
      medical_history:   TranscriptExtractor._extractCardiacHistory(text, structured),
      lab_results:       TranscriptExtractor._extractRenalMarkers(text, structured),

      // ── Rheumatology-specific ─────────────────────────────────────────────
      joint_symptoms:    TranscriptExtractor._extractMorningStiffness(text, structured),
      swelling:          TranscriptExtractor._extractJointSwelling(text, structured),
      lupus_symptoms:    TranscriptExtractor._extractLupusSymptoms(text, structured),
      osteoarthritis:    TranscriptExtractor._extractOsteoarthritisOnly(text, structured),
      systemic_symptoms: TranscriptExtractor._extractSystemicSymptoms(text, structured),
      polyarthritis:     TranscriptExtractor._extractPolyarthritis(text, structured),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DEMOGRAPHICS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Extracts patient name.
   * @param {string} text
   * @param {Object} structured
   * @returns {string|null}
   */
  static _extractName(text, structured) {
    if (structured.patientName) return structured.patientName;
    if (structured.name) return structured.name;

    // "Paciente: João Silva" or "Nome: Maria"
    const m = text.match(/(?:paciente|nome)[:\s]+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i);
    return m ? m[1].trim() : null;
  }

  /**
   * Extracts patient age as a number.
   * @param {string} text
   * @param {Object} structured
   * @returns {number|null}
   */
  static _extractAge(text, structured) {
    if (structured.patientAge != null) return Number(structured.patientAge);
    if (structured.age != null) return Number(structured.age);

    // "45 anos" or "idade: 45" or "45a"
    const patterns = [
      /(\d{1,3})\s*anos/i,
      /idade[:\s]+(\d{1,3})/i,
      /(\d{1,3})\s*a\b/,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const age = parseInt(m[1], 10);
        if (age > 0 && age < 130) return age;
      }
    }
    return null;
  }

  /**
   * Extracts patient gender.
   * @param {string} text
   * @param {Object} structured
   * @returns {string|null} 'M', 'F', or null
   */
  static _extractGender(text, structured) {
    if (structured.patientGender) return structured.patientGender;
    if (structured.gender) return structured.gender;

    const lower = text.toLowerCase();
    if (/\b(masculino|homem|paciente do sexo masculino)\b/.test(lower)) return 'M';
    if (/\b(feminino|mulher|paciente do sexo feminino)\b/.test(lower)) return 'F';
    return null;
  }

  /**
   * Detects pregnancy status (boolean).
   * Returns true if the transcript mentions pregnancy.
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractPregnancyStatus(text, structured) {
    if (structured.pregnancyStatus != null) return Boolean(structured.pregnancyStatus);
    if (structured.isPregnant != null) return Boolean(structured.isPregnant);

    const lower = text.toLowerCase();
    if (/\b(gestante|grávida|gravidez|gestação|prenha)\b/.test(lower)) return true;
    if (/\b(não gestante|não grávida)\b/.test(lower)) return false;
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENDOCRINOLOGY
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Detects whether HbA1c > 9% is mentioned (boolean).
   * Maps to filter_3 in Endocrinology: "HbA1c > 9% mesmo com insulina/múltiplos remédios?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractHba1cHigh(text, structured) {
    // Structured: check numeric value
    const hba1c = structured.hba1c
      || (structured.labResults && structured.labResults.hba1c)
      || (structured.objective && structured.objective.labResults && structured.objective.labResults.hba1c);
    if (hba1c != null) return Number(hba1c) > 9;

    // Text: "HbA1c: 10.2%" or "hemoglobina glicada de 9,5"
    const m = text.match(/(?:hba1c|hemoglobina glicada)[:\s=]+(\d+[.,]\d+)/i);
    if (m) return parseFloat(m[1].replace(',', '.')) > 9;

    // Explicit mention of high HbA1c
    if (/hba1c\s*[>≥]\s*9/i.test(text)) return true;
    return null;
  }

  /**
   * Detects active diabetic complications (boolean).
   * Maps to filter_4: "Complicações graves ativas (pé diabético, perda visão, IRC avançada)?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractDiabeticComplications(text, structured) {
    if (structured.complications != null) return Boolean(structured.complications);

    const lower = text.toLowerCase();
    const keywords = [
      'pé diabético', 'pe diabetico', 'úlcera', 'ulcera',
      'perda de visão', 'perda de visao', 'retinopatia',
      'irc avançada', 'irc avancada', 'insuficiência renal crônica',
      'nefropatia diabética', 'neuropatia grave',
    ];
    return keywords.some(k => lower.includes(k)) ? true : null;
  }

  /**
   * Detects insulin use > 6 months with inadequate control (boolean).
   * Maps to filter_5: "Paciente em uso de insulina há > 6 meses com controle inadequado?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractInsulinUse(text, structured) {
    if (structured.insulinUse != null) return Boolean(structured.insulinUse);

    const lower = text.toLowerCase();
    // Insulin use for > 6 months
    const insulinLong = /insulina.{0,60}(?:6\s*meses|mais de\s*\d+\s*meses|há\s*\d+\s*(?:meses|anos))/i.test(text)
      || /(?:6\s*meses|mais de\s*\d+\s*meses).{0,60}insulina/i.test(text);

    if (insulinLong) return true;

    // Insulin mentioned at all (weaker signal)
    if (/\b(insulina|nph|glargina|detemir|lispro|aspart)\b/i.test(lower)) return true;

    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CARDIOLOGY
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Detects elevated blood pressure (boolean).
   * Maps to filter_1 (PA > 140/90 with 3+ drugs) and filter_4 (PA > 160/100).
   * Returns true if systolic >= 140 or diastolic >= 90 is found.
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractBloodPressureHigh(text, structured) {
    // Structured
    const bp = (structured.vitalSigns && structured.vitalSigns.bloodPressure)
      || (structured.objective && structured.objective.vitalSigns && structured.objective.vitalSigns.bloodPressure)
      || structured.bloodPressure;

    if (bp) {
      const m = String(bp).match(/(\d+)\s*\/\s*(\d+)/);
      if (m) return parseInt(m[1], 10) >= 140 || parseInt(m[2], 10) >= 90;
    }

    // Text: "PA: 160/100" or "pressão 180/120"
    const m = text.match(/(?:pa|pressão arterial|blood pressure)[:\s]+(\d+)\s*\/\s*(\d+)/i);
    if (m) return parseInt(m[1], 10) >= 140 || parseInt(m[2], 10) >= 90;

    // Explicit mention
    if (/(?:hipertensão|pressão alta|pa elevada|hta)/i.test(text)) return true;

    return null;
  }

  /**
   * Detects cardiac history (IAM, AVC, IC) (boolean).
   * Maps to filter_3: "Histórico de IAM, AVC recente ou IC com piora?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractCardiacHistory(text, structured) {
    if (structured.medicalHistory) {
      const h = structured.medicalHistory;
      if (h.previousMI || h.previousStroke || h.heartFailure) return true;
    }

    const lower = text.toLowerCase();
    const keywords = [
      'infarto', 'iam', 'avc', 'acidente vascular',
      'insuficiência cardíaca', 'insuficiencia cardiaca', 'ic ',
    ];
    return keywords.some(k => lower.includes(k)) ? true : null;
  }

  /**
   * Detects renal markers (proteinuria / reduced GFR) (boolean).
   * Maps to filter_5: "Paciente com proteinúria ou redução de TFG?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractRenalMarkers(text, structured) {
    const lower = text.toLowerCase();
    const keywords = [
      'proteinúria', 'proteinuria', 'microalbuminúria', 'microalbuminuria',
      'redução de tfg', 'reducao de tfg', 'tfg reduzida',
      'insuficiência renal', 'insuficiencia renal', 'irc',
      'creatinina elevada',
    ];
    if (keywords.some(k => lower.includes(k))) return true;

    // Elevated creatinine
    const creatMatch = text.match(/creatinina[:\s]+(\d+[.,]\d+)/i);
    if (creatMatch && parseFloat(creatMatch[1].replace(',', '.')) > 1.2) return true;

    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RHEUMATOLOGY
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Detects morning stiffness > 30 min (boolean).
   * Maps to filter_1: "Rigidez articular ao acordar > 30-60 minutos?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractMorningStiffness(text, structured) {
    if (structured.morningStiffness != null) return Boolean(structured.morningStiffness);

    const lower = text.toLowerCase();
    if (/rigidez\s+(?:matinal|ao\s+acordar)/i.test(lower)) return true;
    if (/rigidez.{0,40}(?:30|60)\s*min/i.test(lower)) return true;
    return null;
  }

  /**
   * Detects joint swelling in 3+ joints > 6 weeks (boolean).
   * Maps to filter_2: "Inchaço + calor + vermelhidão em 3+ articulações > 6 semanas?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractJointSwelling(text, structured) {
    if (structured.jointSwelling != null) return Boolean(structured.jointSwelling);

    const lower = text.toLowerCase();
    const swellingTerms = ['inchaço articular', 'edema articular', 'tumefação', 'articulações inchadas'];
    if (swellingTerms.some(k => lower.includes(k))) return true;

    // Multiple joints mentioned with swelling
    if (/(?:inchaço|edema|tumefação).{0,60}(?:articulaç|articulações)/i.test(lower)) return true;
    return null;
  }

  /**
   * Detects lupus symptoms (butterfly rash, joint pain, hair loss) (boolean).
   * Maps to filter_3: "Suspeita de Lúpus (manchas em borboleta + dor articular + queda de cabelo)?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractLupusSymptoms(text, structured) {
    if (structured.lupusSymptoms != null) return Boolean(structured.lupusSymptoms);

    const lower = text.toLowerCase();
    const keywords = [
      'lúpus', 'lupus', 'les ', 'mancha em borboleta', 'rash malar',
      'eritema malar', 'queda de cabelo', 'alopecia',
      'fator antinuclear', 'fan positivo',
    ];
    return keywords.some(k => lower.includes(k)) ? true : null;
  }

  /**
   * Detects mild/moderate osteoarthritis only (boolean).
   * Maps to filter_4: "Apenas artrose leve/moderada (dor mecânica, sem inflamação)?"
   * Returns true only when osteoarthritis is mentioned WITHOUT inflammatory signs.
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractOsteoarthritisOnly(text, structured) {
    if (structured.osteoarthritis != null) return Boolean(structured.osteoarthritis);

    const lower = text.toLowerCase();
    const hasOsteoarthritis = /\b(artrose|osteoartrite|osteoartrose)\b/.test(lower);
    if (!hasOsteoarthritis) return null;

    // Check for inflammatory signs that would disqualify "only osteoarthritis"
    const inflammatoryTerms = [
      'inflamação', 'inflamatório', 'rigidez matinal', 'inchaço articular',
      'artrite', 'sinovite', 'lúpus', 'lupus',
    ];
    const hasInflammation = inflammatoryTerms.some(k => lower.includes(k));

    return hasOsteoarthritis && !hasInflammation;
  }

  /**
   * Detects systemic symptoms (fever, fatigue, weight loss) with arthralgia (boolean).
   * Maps to filter_5: "Sintomas sistêmicos (febre, fadiga, perda de peso) + artralgia?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractSystemicSymptoms(text, structured) {
    if (structured.systemicSymptoms != null) return Boolean(structured.systemicSymptoms);

    const lower = text.toLowerCase();
    const systemicTerms = ['febre', 'fadiga', 'cansaço', 'perda de peso', 'emagrecimento', 'astenia'];
    const arthralgiaTerms = ['artralgia', 'dor articular', 'dor nas articulações'];

    const hasSystemic = systemicTerms.some(k => lower.includes(k));
    const hasArthralgia = arthralgiaTerms.some(k => lower.includes(k));

    if (hasSystemic && hasArthralgia) return true;
    if (hasSystemic) return true; // systemic alone is a strong signal
    return null;
  }

  /**
   * Detects polyarthritis (multiple joint involvement) (boolean).
   * Maps to filter_6: "Envolvimento articular em múltiplas articulações (poliartrite)?"
   * @param {string} text
   * @param {Object} structured
   * @returns {boolean|null}
   */
  static _extractPolyarthritis(text, structured) {
    if (structured.polyarthritis != null) return Boolean(structured.polyarthritis);

    const lower = text.toLowerCase();
    if (/\b(poliartrite|poliartralgia)\b/.test(lower)) return true;
    if (/múltiplas\s+articulações/i.test(lower)) return true;
    if (/(?:3|três|quatro|cinco|várias|diversas)\s+articulações/i.test(lower)) return true;
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUESTIONNAIRE MAPPING
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Maps extracted transcript data to questionnaire field responses.
   *
   * Iterates over all questions in the questionnaire, reads their `prefilledFrom`
   * path (e.g. "transcript.age"), resolves the value from the extracted data,
   * and converts it to the appropriate question type.
   *
   * @param {Object} extractedData - Result of TranscriptExtractor.extract()
   * @param {Object} questionnaire - Protocol questionnaire object with sections/questions
   * @returns {Object} Map of questionId → pre-filled value
   */
  static mapToQuestionnaire(extractedData, questionnaire) {
    const responses = {};

    if (!questionnaire || !questionnaire.sections) return responses;

    questionnaire.sections.forEach(section => {
      if (!section.questions) return;

      section.questions.forEach(question => {
        if (!question.prefilledFrom) return;

        // Strip "transcript." prefix and resolve key
        const key = question.prefilledFrom.replace(/^transcript\./, '');
        const value = extractedData[key];

        if (value === null || value === undefined) return;

        const converted = TranscriptExtractor._convertValue(value, question);
        if (converted !== null && converted !== undefined) {
          responses[question.id] = converted;
        }
      });
    });

    return responses;
  }

  /**
   * Converts a raw extracted value to the type expected by a question.
   * @param {*} value
   * @param {Object} question
   * @returns {*}
   */
  static _convertValue(value, question) {
    if (value === null || value === undefined) return null;

    switch (question.type) {
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === 'sim' || lower === '1') return true;
          if (lower === 'false' || lower === 'não' || lower === 'nao' || lower === '0') return false;
        }
        return Boolean(value);

      case 'number':
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const n = parseFloat(value.replace(',', '.'));
          return isNaN(n) ? null : n;
        }
        return null;

      case 'text':
        return String(value);

      case 'select':
      case 'exam_status':
        return String(value);

      default:
        return value;
    }
  }

  /**
   * Returns the list of question IDs that were auto-populated.
   * @param {Object} responses - Result of mapToQuestionnaire()
   * @returns {string[]}
   */
  static getAutoPopulatedFields(responses) {
    return Object.keys(responses).filter(id => responses[id] !== null && responses[id] !== undefined);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TranscriptExtractor;
}
