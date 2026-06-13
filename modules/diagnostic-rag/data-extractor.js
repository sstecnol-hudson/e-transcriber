(() => {
  const DataExtractor = {
    /**
     * Extrai informações estruturadas de demographics, vitalSigns e symptoms do texto da consulta
     * @param {Object} input - { transcript, patientName, patientAge, patientGender, patientHeight, patientWeight, patientBP }
     * @returns {Object} Dados estruturados compatíveis com o pipeline RAG
     */
    extractConsultationData: function(input) {
      if (!input) return {};
      const transcript = input.transcript || '';

      // 1. Demographics
      let ageStr = input.patientAge || '';
      if (!ageStr) {
        ageStr = this.extractAge(transcript);
      }
      let ageVal = undefined;
      if (ageStr) {
        const matchDigits = ageStr.match(/\d+/);
        if (matchDigits) {
          ageVal = parseInt(matchDigits[0], 10);
        }
      }

      let genderStr = input.patientGender || '';
      if (!genderStr || genderStr === 'Não informado') {
        genderStr = this.extractGender(transcript);
      }

      // 2. Vitals - Altura
      let heightStr = input.patientHeight || '';
      if (!heightStr) {
        heightStr = this.extractHeight(transcript);
      }
      let heightVal = undefined;
      if (heightStr) {
        const cleanHeight = heightStr.replace(',', '.').replace(/[^\d.]/g, '');
        if (cleanHeight) {
          heightVal = parseFloat(cleanHeight);
        }
      }

      // Vitals - Peso
      let weightStr = input.patientWeight || '';
      if (!weightStr) {
        weightStr = this.extractWeight(transcript);
      }
      let weightVal = undefined;
      if (weightStr) {
        const cleanWeight = weightStr.replace(',', '.').replace(/[^\d.]/g, '');
        if (cleanWeight) {
          weightVal = parseFloat(cleanWeight);
        }
      }

      // Vitals - IMC
      let imcStr = input.patientIMC || '';
      if (!imcStr) {
        imcStr = this.extractIMC(transcript);
      }
      let imcVal = undefined;
      if (imcStr) {
        const cleanIMC = imcStr.replace(',', '.').replace(/[^\d.]/g, '');
        if (cleanIMC) {
          imcVal = parseFloat(cleanIMC);
        }
      }

      // Vitals - Pressão Arterial
      let bpStr = input.patientBP || '';
      let sysNum = undefined;
      let diaNum = undefined;
      if (bpStr) {
        const parts = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
        if (parts) {
          sysNum = parseInt(parts[1], 10);
          diaNum = parseInt(parts[2], 10);
        }
      } else {
        const extractedBP = this.extractBP(transcript);
        if (extractedBP) {
          sysNum = extractedBP.systolic;
          diaNum = extractedBP.diastolic;
        }
      }

      // 3. Symptoms
      const symptoms = this.extractSymptoms(transcript);

      return {
        demographics: {
          age: ageVal !== undefined ? { value: ageVal, unit: 'anos' } : undefined,
          gender: genderStr ? { value: genderStr } : undefined
        },
        vitalSigns: {
          pa_systolic: sysNum,
          pa_diastolic: diaNum,
          weight: weightVal,
          height: heightVal,
          imc: imcVal
        },
        symptoms: symptoms
      };
    },

    /**
     * Extrai a idade do texto
     */
    extractAge: function(text) {
      if (!text) return '';
      const patterns = [
        /\bidade(?:[\s:]+(?:de\s+)?)?(\d+)\s*anos\b/i,
        /\b(\d+)\s*anos\s*(?:de\s+)?idade\b/i,
        /\bpaciente(?:\s+\w+){1,3}?\s+(?:com|de)\s+(\d+)\s*anos\b/i,
        /\btem\s+(\d+)\s*anos\b/i,
        /,\s*(\d{1,3})\s*anos\b/i,         // ex: "feminino, 45 anos"
        /\b(\d{2,3})\s*anos\b/i             // fallback genérico
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1];
      }
      return '';
    },

    /**
     * Extrai o sexo biológico / gênero do texto
     */
    extractGender: function(text) {
      if (!text) return '';
      const patterns = [
        /\bsexo[:\s]+(feminino|masculino|indeterminado)\b/i,
        /\bg(?:ê|e)nero[:\s]+(feminino|masculino|indeterminado)\b/i,
        /\bpaciente\s+do\s+sexo\s+(feminino|masculino|indeterminado)\b/i,
        /\bsexo\s+biol(?:ó|o)gico\s+(feminino|masculino)\b/i,
        /\b(masculino|feminino|indeterminado)\b/i
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const val = match[1].toLowerCase();
          if (val.startsWith('fem')) return 'Feminino';
          if (val.startsWith('masc')) return 'Masculino';
          if (val.startsWith('indet')) return 'Indeterminado';
        }
      }
      // Pistas adicionais contextuais
      const lower = text.toLowerCase();
      if (lower.includes('paciente feminina') || lower.includes('paciente mulher') || lower.includes('ela tem')) {
        return 'Feminino';
      }
      if (lower.includes('paciente masculino') || lower.includes('paciente homem') || lower.includes('ele tem')) {
        return 'Masculino';
      }
      return '';
    },

    /**
     * Extrai a altura do texto e normaliza em metros (ex: 1,75 m)
     */
    extractHeight: function(text) {
      if (!text) return '';
      const patterns = [
        /\baltura(?:[\s:]+(?:de\s+)?)?(\d(?:[.,]\d{1,2})?)\s*(?:m|metro|metros)?\b/i,
        /\b(\d(?:[.,]\d{2})?)\s*(?:m|metro|metros)?\s+de\s+altura\b/i,
        /\bmede\s+(\d(?:[.,]\d{1,2})?)\s*(?:m|metro|metros)?\b/i
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          let val = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(val)) {
            if (val > 100) val = val / 100; // cm para metros (ex: 175 -> 1.75)
            if (val >= 0.5 && val <= 2.5) {
              return val.toFixed(2).replace('.', ',') + ' m';
            }
          }
        }
      }
      // Trata "1 metro e 75"
      const compositeMatch = text.match(/\b1\s*(?:m|metro|metros)?\s*(?:e)?\s*(\d{2})\b/i);
      if (compositeMatch) {
        const cm = parseInt(compositeMatch[1], 10);
        if (cm >= 0 && cm <= 99) {
          return `1,${cm.toString().padStart(2, '0')} m`;
        }
      }
      return '';
    },

    /**
     * Extrai o peso do texto e normaliza em kg (ex: 72 kg)
     */
    extractWeight: function(text) {
      if (!text) return '';
      const patterns = [
        /\bpeso(?:[\s:]+(?:de\s+)?)?(\d+(?:[.,]\d+)?)(?!\s*(?:kg|kilos|quilos|quilo)?\s*(?:\/|por)\s*m)\s*(?:kg|kilos|quilos|quilo)?\b/i,
        /\bpesando\s+(\d+(?:[.,]\d+)?)(?!\s*(?:kg|kilos|quilos|quilo)?\s*(?:\/|por)\s*m)\s*(?:kg|kilos|quilos|quilo)?\b/i,
        /\bpesa\s+(\d+(?:[.,]\d+)?)(?!\s*(?:kg|kilos|quilos|quilo)?\s*(?:\/|por)\s*m)\s*(?:kg|kilos|quilos|quilo)?\b/i,
        /\b(\d+(?:[.,]\d+)?)(?!\s*(?:kg|kilos|quilos|quilo)?\s*(?:\/|por)\s*m)\s*(?:kg|kilos|quilos)\b/i
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          let val = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(val) && val >= 1 && val <= 500) {
            return val.toString().replace('.', ',') + ' kg';
          }
        }
      }
      return '';
    },

    /**
     * Extrai o IMC do texto e normaliza (ex: 31 kg/m²)
     */
    extractIMC: function(text) {
      if (!text) return '';
      const patterns = [
        /(?:^|[\s,;:])(?:imc|índice de massa corporal|indice de massa corporal)(?:\s+[^\s]+){0,6}?\s*(?:de|em|:|est(?:á|a)|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:kg\/m²|kg\/m2)?\b/i
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          let val = parseFloat(match[1].replace(',', '.'));
          if (!isNaN(val) && val >= 10 && val <= 100) {
            return val.toString().replace('.', ',') + ' kg/m²';
          }
        }
      }
      return '';
    },

    /**
     * Extrai a pressão arterial do texto (ex: 120/80 mmHg)
     */
    extractBP: function(text) {
      if (!text) return null;
      const patterns = [
        /\b(?:pa|press(?:ã|a)o(?:\s+arterial)?)(?:[\s:]+(?:de\s+)?)?(\d{1,3})\s*(?:\/|por|sobre|x|×|\*)\s*(\d{1,3})\b/i,
        /\b(\d{1,3})\s*(?:\/|x|×|\*)\s*(\d{1,3})\s*(?:mmhg)?\b/i
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          let sys = parseInt(match[1], 10);
          let dia = parseInt(match[2], 10);
          if (!isNaN(sys) && !isNaN(dia)) {
            // Se falado em formato simplificado (ex: 12 por 8), multiplica por 10
            if (sys < 30) sys = sys * 10;
            if (dia < 20) dia = dia * 10;
            if (sys >= 50 && sys <= 250 && dia >= 30 && dia <= 150) {
              return { systolic: sys, diastolic: dia };
            }
          }
        }
      }
      return null;
    },

    /**
     * Extrai sintomas comuns mencionados no texto
     */
    extractSymptoms: function(text) {
      if (!text) return [];
      const lower = text.toLowerCase();
      const symptomsMap = {
        'dor no peito': ['dor no peito', 'dor torácica', 'aperto no peito', 'desconforto torácico'],
        'sudorese': ['sudorese', 'suor frio', 'suando muito'],
        'vômito': ['vômito', 'vomitando', 'vomito'],
        'náusea': ['náusea', 'nausea', 'enjoo', 'enjoado'],
        'febre': ['febre', 'febril', 'temperatura alta'],
        'falta de ar': ['falta de ar', 'dispneia', 'dificuldade para respirar', 'ortopneia'],
        'cefaleia': ['dor de cabeça', 'cefaleia', 'enxaqueca'],
        'tosse': ['tosse', 'tossindo'],
        'fadiga': ['fadiga', 'cansaço', 'cansado', 'fraqueza'],
        'tontura': ['tontura', 'tonto', 'vertigem']
      };
      const found = [];
      for (const [symptom, keywords] of Object.entries(symptomsMap)) {
        if (keywords.some(kw => lower.includes(kw))) {
          found.push({ name: symptom });
        }
      }
      return found;
    }
  };

  // Exporta globalmente para browser e como modulo para Node (testes)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataExtractor;
  } else {
    window.DataExtractor = DataExtractor;
  }
})();
