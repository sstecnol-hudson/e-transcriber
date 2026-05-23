/**
 * Data Extractor Module
 * Extracts demographic data, diagnoses, medications, vital signs, and lab results
 * from consultation transcripts and maps them to questionnaire fields
 */

class DataExtractor {
  /**
   * Extracts all relevant data from consultation transcript
   * @param {Object} consultationData - Consultation data object
   * @returns {Object} Extracted data with demographic, clinical, and lab information
   */
  static extractConsultationData(consultationData) {
    if (!consultationData) {
      return this.getEmptyExtraction();
    }

    return {
      demographics: this.extractDemographics(consultationData),
      diagnoses: this.extractDiagnoses(consultationData),
      medications: this.extractMedications(consultationData),
      vitalSigns: this.extractVitalSigns(consultationData),
      labResults: this.extractLabResults(consultationData),
      symptoms: this.extractSymptoms(consultationData),
      medicalHistory: this.extractMedicalHistory(consultationData),
      rawText: consultationData.rawText || consultationData.transcript || ''
    };
  }

  /**
   * Gets empty extraction structure
   * @returns {Object} Empty extraction object
   */
  static getEmptyExtraction() {
    return {
      demographics: {},
      diagnoses: [],
      medications: [],
      vitalSigns: {},
      labResults: {},
      symptoms: [],
      medicalHistory: {},
      rawText: ''
    };
  }

  /**
   * Extracts demographic data (age, gender, name)
   * @param {Object} consultationData - Consultation data
   * @returns {Object} Demographic information
   */
  static extractDemographics(consultationData) {
    const demographics = {};

    // Extract name
    if (consultationData.patientName) {
      demographics.name = consultationData.patientName;
    }

    // Extract age
    if (consultationData.patientAge) {
      demographics.age = consultationData.patientAge;
      // Check if age is less than 15 (for Endocrinology filter_2)
      demographics.isMinor = consultationData.patientAge < 15;
    } else if (consultationData.age) {
      demographics.age = consultationData.age;
      demographics.isMinor = consultationData.age < 15;
    }

    // Extract gender
    if (consultationData.patientGender) {
      demographics.gender = consultationData.patientGender;
    } else if (consultationData.gender) {
      demographics.gender = consultationData.gender;
    }

    // Extract pregnancy status
    if (consultationData.pregnancyStatus !== undefined) {
      demographics.pregnancyStatus = consultationData.pregnancyStatus;
    } else if (consultationData.isPregnant !== undefined) {
      demographics.pregnancyStatus = consultationData.isPregnant;
    }

    return demographics;
  }

  /**
   * Extracts diagnoses from consultation data
   * @param {Object} consultationData - Consultation data
   * @returns {Array} List of diagnoses
   */
  static extractDiagnoses(consultationData) {
    const diagnoses = [];

    // Direct diagnoses array
    if (Array.isArray(consultationData.diagnoses)) {
      diagnoses.push(...consultationData.diagnoses);
    }

    // Diagnoses from assessment
    if (consultationData.assessment && consultationData.assessment.diagnoses) {
      if (Array.isArray(consultationData.assessment.diagnoses)) {
        diagnoses.push(...consultationData.assessment.diagnoses);
      } else if (typeof consultationData.assessment.diagnoses === 'string') {
        diagnoses.push(consultationData.assessment.diagnoses);
      }
    }

    // Diagnoses from SOAP assessment
    if (consultationData.soap && consultationData.soap.assessment) {
      const assessment = consultationData.soap.assessment;
      if (Array.isArray(assessment)) {
        diagnoses.push(...assessment);
      } else if (typeof assessment === 'string') {
        diagnoses.push(assessment);
      }
    }

    // Extract from raw text using keywords
    if (consultationData.rawText || consultationData.transcript) {
      const text = (consultationData.rawText || consultationData.transcript).toLowerCase();
      const diagnosisKeywords = {
        diabetes: ['diabetes', 'dm', 'glicemia', 'hiperglicemia'],
        hypertension: ['hipertensão', 'pressão alta', 'pa elevada', 'hta'],
        arthritis: ['artrite', 'artralgia', 'artrose', 'reumatóide'],
        lupus: ['lúpus', 'les', 'fator antinuclear'],
        heartDisease: ['cardiopatia', 'insuficiência cardíaca', 'ic', 'infarto'],
        kidney: ['insuficiência renal', 'irc', 'nefropatia', 'creatinina'],
        vision: ['retinopatia', 'catarata', 'glaucoma', 'visão'],
        foot: ['pé diabético', 'úlcera', 'neuropatia']
      };

      Object.entries(diagnosisKeywords).forEach(([condition, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          diagnoses.push(condition);
        }
      });
    }

    return [...new Set(diagnoses)]; // Remove duplicates
  }

  /**
   * Extracts medications from consultation data
   * @param {Object} consultationData - Consultation data
   * @returns {Array} List of medications
   */
  static extractMedications(consultationData) {
    const medications = [];

    // Direct medications array
    if (Array.isArray(consultationData.medications)) {
      medications.push(...consultationData.medications);
    }

    // Medications from plan
    if (consultationData.plan && consultationData.plan.medications) {
      if (Array.isArray(consultationData.plan.medications)) {
        medications.push(...consultationData.plan.medications);
      }
    }

    // Medications from SOAP plan
    if (consultationData.soap && consultationData.soap.plan) {
      const plan = consultationData.soap.plan;
      if (plan.medications && Array.isArray(plan.medications)) {
        medications.push(...plan.medications);
      }
    }

    // Extract from raw text using medication keywords
    if (consultationData.rawText || consultationData.transcript) {
      const text = consultationData.rawText || consultationData.transcript;
      const medicationKeywords = {
        insulin: ['insulina', 'nph', 'regular', 'glargina', 'detemir'],
        metformin: ['metformina', 'glucofage'],
        antihypertensive: ['losartana', 'enalapril', 'amlodipina', 'hidroclorotiazida', 'atenolol'],
        statin: ['atorvastatina', 'sinvastatina', 'rosuvastatina'],
        anticoagulant: ['warfarina', 'apixabana', 'rivaroxabana'],
        antiinflammatory: ['ibuprofeno', 'naproxeno', 'diclofenaco']
      };

      Object.entries(medicationKeywords).forEach(([medClass, keywords]) => {
        if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
          medications.push(medClass);
        }
      });
    }

    return [...new Set(medications)]; // Remove duplicates
  }

  /**
   * Extracts vital signs from consultation data
   * @param {Object} consultationData - Consultation data
   * @returns {Object} Vital signs
   */
  static extractVitalSigns(consultationData) {
    const vitalSigns = {};

    // Direct vital signs
    if (consultationData.vitalSigns) {
      Object.assign(vitalSigns, consultationData.vitalSigns);
    }

    // Vital signs from objective
    if (consultationData.objective && consultationData.objective.vitalSigns) {
      Object.assign(vitalSigns, consultationData.objective.vitalSigns);
    }

    // Vital signs from SOAP objective
    if (consultationData.soap && consultationData.soap.objective) {
      const objective = consultationData.soap.objective;
      if (objective.vitalSigns) {
        Object.assign(vitalSigns, objective.vitalSigns);
      }
    }

    // Extract from raw text
    if (consultationData.rawText || consultationData.transcript) {
      const text = consultationData.rawText || consultationData.transcript;
      
      // Blood pressure
      const bpMatch = text.match(/(?:pa|pressão|blood pressure)[:\s]+(\d+)\s*\/\s*(\d+)/i);
      if (bpMatch) {
        vitalSigns.bloodPressure = `${bpMatch[1]}/${bpMatch[2]}`;
      }

      // Heart rate
      const hrMatch = text.match(/(?:fc|frequência cardíaca|heart rate)[:\s]+(\d+)/i);
      if (hrMatch) {
        vitalSigns.heartRate = parseInt(hrMatch[1]);
      }

      // Temperature
      const tempMatch = text.match(/(?:temp|temperatura|temperature)[:\s]+(\d+[.,]\d+)/i);
      if (tempMatch) {
        vitalSigns.temperature = parseFloat(tempMatch[1].replace(',', '.'));
      }

      // Blood glucose
      const glucoseMatch = text.match(/(?:glicemia|glucose|blood glucose)[:\s]+(\d+)/i);
      if (glucoseMatch) {
        vitalSigns.bloodGlucose = parseInt(glucoseMatch[1]);
      }
    }

    return vitalSigns;
  }

  /**
   * Extracts lab results from consultation data
   * @param {Object} consultationData - Consultation data
   * @returns {Object} Lab results
   */
  static extractLabResults(consultationData) {
    const labResults = {};

    // Direct lab results
    if (consultationData.labResults) {
      Object.assign(labResults, consultationData.labResults);
    }

    // Lab results from objective
    if (consultationData.objective && consultationData.objective.labResults) {
      Object.assign(labResults, consultationData.objective.labResults);
    }

    // Lab results from SOAP objective
    if (consultationData.soap && consultationData.soap.objective) {
      const objective = consultationData.soap.objective;
      if (objective.labResults) {
        Object.assign(labResults, objective.labResults);
      }
    }

    // Extract from raw text
    if (consultationData.rawText || consultationData.transcript) {
      const text = consultationData.rawText || consultationData.transcript;

      // HbA1c
      const hba1cMatch = text.match(/(?:hba1c|hemoglobina glicada)[:\s]+(\d+[.,]\d+)/i);
      if (hba1cMatch) {
        labResults.hba1c = parseFloat(hba1cMatch[1].replace(',', '.'));
      }

      // Creatinine
      const creatinineMatch = text.match(/(?:creatinina)[:\s]+(\d+[.,]\d+)/i);
      if (creatinineMatch) {
        labResults.creatinine = parseFloat(creatinineMatch[1].replace(',', '.'));
      }

      // Cholesterol
      const cholesterolMatch = text.match(/(?:colesterol total)[:\s]+(\d+)/i);
      if (cholesterolMatch) {
        labResults.totalCholesterol = parseInt(cholesterolMatch[1]);
      }

      // HDL
      const hdlMatch = text.match(/(?:hdl)[:\s]+(\d+)/i);
      if (hdlMatch) {
        labResults.hdl = parseInt(hdlMatch[1]);
      }

      // LDL
      const ldlMatch = text.match(/(?:ldl)[:\s]+(\d+)/i);
      if (ldlMatch) {
        labResults.ldl = parseInt(ldlMatch[1]);
      }

      // Triglycerides
      const triglyceridesMatch = text.match(/(?:triglicerídeos)[:\s]+(\d+)/i);
      if (triglyceridesMatch) {
        labResults.triglycerides = parseInt(triglyceridesMatch[1]);
      }
    }

    return labResults;
  }

  /**
   * Extracts symptoms from consultation data
   * @param {Object} consultationData - Consultation data
   * @returns {Array} List of symptoms
   */
  static extractSymptoms(consultationData) {
    const symptoms = [];

    // Direct symptoms
    if (Array.isArray(consultationData.symptoms)) {
      symptoms.push(...consultationData.symptoms);
    }

    // Symptoms from subjective
    if (consultationData.subjective && consultationData.subjective.symptoms) {
      if (Array.isArray(consultationData.subjective.symptoms)) {
        symptoms.push(...consultationData.subjective.symptoms);
      }
    }

    // Symptoms from SOAP subjective
    if (consultationData.soap && consultationData.soap.subjective) {
      const subjective = consultationData.soap.subjective;
      if (subjective.symptoms && Array.isArray(subjective.symptoms)) {
        symptoms.push(...subjective.symptoms);
      }
    }

    // Extract from raw text
    if (consultationData.rawText || consultationData.transcript) {
      const text = (consultationData.rawText || consultationData.transcript).toLowerCase();
      const symptomKeywords = {
        polyuria: ['poliúria', 'urina frequente', 'micção frequente'],
        polydipsia: ['polidipsia', 'sede excessiva'],
        fatigue: ['fadiga', 'cansaço', 'astenia'],
        jointPain: ['dor articular', 'artralgia', 'dor nas articulações'],
        jointSwelling: ['inchaço articular', 'edema articular', 'tumefação'],
        morningStiffness: ['rigidez matinal', 'rigidez ao acordar'],
        chestPain: ['dor no peito', 'dor torácica', 'angina'],
        dyspnea: ['falta de ar', 'dispneia', 'dificuldade respiratória'],
        fever: ['febre', 'temperatura elevada'],
        weightLoss: ['perda de peso', 'emagrecimento'],
        rash: ['erupção', 'rash', 'lesão de pele']
      };

      Object.entries(symptomKeywords).forEach(([symptom, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
          symptoms.push(symptom);
        }
      });
    }

    return [...new Set(symptoms)]; // Remove duplicates
  }

  /**
   * Extracts medical history from consultation data
   * @param {Object} consultationData - Consultation data
   * @returns {Object} Medical history
   */
  static extractMedicalHistory(consultationData) {
    const history = {};

    // Direct medical history
    if (consultationData.medicalHistory) {
      Object.assign(history, consultationData.medicalHistory);
    }

    // History from subjective
    if (consultationData.subjective && consultationData.subjective.medicalHistory) {
      Object.assign(history, consultationData.subjective.medicalHistory);
    }

    // History from SOAP subjective
    if (consultationData.soap && consultationData.soap.subjective) {
      const subjective = consultationData.soap.subjective;
      if (subjective.medicalHistory) {
        Object.assign(history, subjective.medicalHistory);
      }
    }

    // Extract from raw text
    if (consultationData.rawText || consultationData.transcript) {
      const text = (consultationData.rawText || consultationData.transcript).toLowerCase();

      // Check for previous events
      if (text.includes('infarto') || text.includes('iam')) {
        history.previousMI = true;
      }
      if (text.includes('avc') || text.includes('acidente vascular')) {
        history.previousStroke = true;
      }
      if (text.includes('insuficiência cardíaca') || text.includes('ic')) {
        history.heartFailure = true;
      }
    }

    return history;
  }

  /**
   * Maps extracted data to questionnaire responses
   * @param {Object} extractedData - Extracted consultation data
   * @param {Object} questionnaire - Questionnaire structure
   * @returns {Object} Mapped responses for pre-filling
   */
  static mapDataToQuestionnaire(extractedData, questionnaire) {
    const responses = {};

    if (!questionnaire || !questionnaire.sections) {
      return responses;
    }

    // Iterate through all questions in the questionnaire
    questionnaire.sections.forEach(section => {
      if (!section.questions) return;

      section.questions.forEach(question => {
        if (!question.prefilledFrom) return;

        // Parse the prefilledFrom path (e.g., "transcript.age")
        const value = this.getValueFromPath(extractedData, question.prefilledFrom);
        
        if (value !== null && value !== undefined) {
          responses[question.id] = this.convertValueToQuestionType(value, question.type);
        }
      });
    });

    return responses;
  }

  /**
   * Gets value from nested object using dot notation path
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path (e.g., "demographics.age")
   * @returns {*} Value at path or null
   */
  static getValueFromPath(obj, path) {
    if (!path || typeof path !== 'string') return null;

    // Remove "transcript." prefix if present
    const cleanPath = path.replace(/^transcript\./, '');
    
    const parts = cleanPath.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current;
  }

  /**
   * Converts extracted value to appropriate question type
   * @param {*} value - Extracted value
   * @param {string} questionType - Question type (boolean, text, number, select, exam_status)
   * @returns {*} Converted value
   */
  static convertValueToQuestionType(value, questionType) {
    if (value === null || value === undefined) return null;

    switch (questionType) {
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value.toLowerCase() === 'sim' || value === '1';
        }
        if (typeof value === 'number') return value !== 0;
        return Boolean(value);

      case 'number':
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const num = parseFloat(value.replace(',', '.'));
          return isNaN(num) ? null : num;
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
   * Determines if a field was auto-populated
   * @param {string} questionId - Question ID
   * @param {Object} responses - All responses
   * @param {Object} questionnaire - Questionnaire structure
   * @returns {boolean} True if field was auto-populated
   */
  static isAutoPopulated(questionId, responses, questionnaire) {
    if (!questionnaire || !questionnaire.sections) return false;

    for (const section of questionnaire.sections) {
      if (!section.questions) continue;

      for (const question of section.questions) {
        if (question.id === questionId && question.prefilledFrom) {
          return responses[questionId] !== null && responses[questionId] !== undefined;
        }
      }
    }

    return false;
  }

  /**
   * Gets list of auto-populated field IDs
   * @param {Object} responses - All responses
   * @param {Object} questionnaire - Questionnaire structure
   * @returns {Array} List of auto-populated question IDs
   */
  static getAutoPopulatedFields(responses, questionnaire) {
    const autoPopulated = [];

    if (!questionnaire || !questionnaire.sections) return autoPopulated;

    questionnaire.sections.forEach(section => {
      if (!section.questions) return;

      section.questions.forEach(question => {
        if (question.prefilledFrom && responses[question.id] !== null && responses[question.id] !== undefined) {
          autoPopulated.push(question.id);
        }
      });
    });

    return autoPopulated;
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataExtractor;
}
