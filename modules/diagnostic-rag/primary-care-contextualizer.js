(() => {
  // Polyfill de localStorage para ambientes Node.js (testes)
  const _storage = (() => {
    if (typeof localStorage !== 'undefined') return localStorage;
    let store = {};
    return {
      getItem: (k) => store[k] !== undefined ? store[k] : null,
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { store = {}; }
    };
  })();

  class PrimaryCareContextualizer {
    constructor() {
      this.renameConfig = null;
      this.susProgramsConfig = null;
    }

    /**
     * Carrega as configurações de RENAME e programas SUS
     */
    async loadConfig() {
      if (this.renameConfig && this.susProgramsConfig) return;

      try {
        if (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
          const path = require('path');
          const fs = require('fs');
          
          const renamePath = path.resolve(__dirname, './data/rename.json');
          if (fs.existsSync(renamePath)) {
            this.renameConfig = JSON.parse(fs.readFileSync(renamePath, 'utf-8'));
          }
          
          const susPath = path.resolve(__dirname, './data/sus-programs.json');
          if (fs.existsSync(susPath)) {
            this.susProgramsConfig = JSON.parse(fs.readFileSync(susPath, 'utf-8'));
          }
        } else {
          const resRename = await fetch('modules/diagnostic-rag/data/rename.json?t=' + Date.now());
          if (resRename.ok) this.renameConfig = await resRename.json();
          
          const resSus = await fetch('modules/diagnostic-rag/data/sus-programs.json?t=' + Date.now());
          if (resSus.ok) this.susProgramsConfig = await resSus.json();
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de Atenção Primária:', err);
      }

      // Fallbacks
      if (!this.renameConfig) {
        this.renameConfig = { rename_list: ['metformina', 'losartana', 'enalapril', 'captopril'], alternatives: {} };
      }
      if (!this.susProgramsConfig) {
        this.susProgramsConfig = { programs: [] };
      }
    }

    /**
     * Valida medicações sugeridas contra a lista da RENAME
     * @param {Object[]} medications 
     * @returns {Object[]}
     */
    validateMedications(medications) {
      if (!medications || !Array.isArray(medications)) return [];

      const renameList = this.renameConfig.rename_list || [];
      const alternatives = this.renameConfig.alternatives || {};

      return medications.map(med => {
        const name = typeof med === 'string' ? med : (med.name || '');
        const nameLower = name.toLowerCase();
        
        let isRename = false;
        let altInfo = null;

        // Verifica se está na RENAME
        for (const rMed of renameList) {
          if (nameLower.includes(rMed) || rMed.includes(nameLower)) {
            isRename = true;
            break;
          }
        }

        // Se não estiver na RENAME, verifica se há sugestões
        if (!isRename) {
          for (const altKey of Object.keys(alternatives)) {
            if (nameLower.includes(altKey)) {
              altInfo = alternatives[altKey];
              break;
            }
          }
        }

        return {
          name: name,
          dose: med.dose || 'A definir',
          frequency: med.frequency || 'A definir',
          isRename: isRename,
          alternative: altInfo ? altInfo.rename_alternative : null,
          notes: altInfo ? altInfo.notes : null
        };
      });
    }

    /**
     * Classifica exames com base em sua complexidade e local de realização
     * @param {string[]|Object[]} exams 
     * @returns {Object}
     */
    classifyExams(exams) {
      if (!exams || !Array.isArray(exams)) {
        return { basic: [], laboratory: [], specialized: [] };
      }

      const classified = {
        basic: [],        // Disponível na UBS
        laboratory: [],   // Solicitar ao laboratório central
        specialized: []   // Exames especializados (requer encaminhamento)
      };

      const examNames = exams.map(e => typeof e === 'string' ? e : (e.name || ''));

      const basicKeywords = ['glicemia capilar', 'pressão arterial', 'peso', 'altura', 'fita de urina', 'pa', 'imc'];
      const labKeywords = ['glicemia de jejum', 'glicemia jejum', 'hba1c', 'hemoglobina glicada', 'creatinina', 'potássio', 'potassio', 'eas', 'urina simples', 'lipidograma', 'colesterol', 'triglicerídeos', 'triglicerideos', 'microalbuminúria', 'microalbuminuria'];
      const specializedKeywords = ['ecg', 'eletrocardiograma', 'rx', 'raio-x', 'raio x', 'oftalmológica', 'fundo de olho', 'ecocardiograma', 'ultrassonografia', 'ultrassom', 'ressonância', 'tomografia'];

      examNames.forEach(name => {
        const nameLower = name.toLowerCase();
        
        let matched = false;
        for (const kw of basicKeywords) {
          if (nameLower.includes(kw)) {
            classified.basic.push(name);
            matched = true;
            break;
          }
        }
        if (!matched) {
          for (const kw of labKeywords) {
            if (nameLower.includes(kw)) {
              classified.laboratory.push(name);
              matched = true;
              break;
            }
          }
        }
        if (!matched) {
          for (const kw of specializedKeywords) {
            if (nameLower.includes(kw)) {
              classified.specialized.push(name);
              matched = true;
              break;
            }
          }
        }
        
        // Se não coincidir, classifica como laboratorial por padrão
        if (!matched && name) {
          classified.laboratory.push(name);
        }
      });

      return classified;
    }

    /**
     * Identifica os programas de saúde pública do SUS aplicáveis
     * @param {Object} cotResult 
     * @returns {Object[]}
     */
    suggestSUSPrograms(cotResult, cidResult = null) {
      if (!cotResult || !cotResult.conclusion) return [];

      let cid10 = cotResult.conclusion.icd10 || '';
      if (cidResult && cidResult.primary && cidResult.primary.icd10 && cidResult.primary.icd10.code) {
        cid10 = cidResult.primary.icd10.code;
      }
      const suggested = [];
      const programs = this.susProgramsConfig.programs || [];

      programs.forEach(prog => {
        const isTarget = prog.target_conditions.some(cond => cid10.startsWith(cond));
        
        // Regra especial para Hiperdia (HAS e DM2)
        let matchesSpecialRules = false;
        if (prog.id === 'hiperdia') {
          const diagText = (cotResult.conclusion.primaryDiagnosis || '').toLowerCase();
          if (diagText.includes('diabetes') || diagText.includes('hipertensão') || diagText.includes('hipertensao')) {
            matchesSpecialRules = true;
          }
        }

        if (isTarget || matchesSpecialRules) {
          suggested.push({
            id: prog.id,
            name: prog.name,
            criteria: prog.criteria,
            frequency: prog.frequency,
            covered_medications: prog.covered_medications,
            documents: prog.documents
          });
        }
      });

      return suggested;
    }

    /**
     * Define a urgência clínica de encaminhamento
     * @param {Object[]} redFlags 
     * @param {Object} cotResult 
     * @returns {string} Eletivo / Até 30 dias / Até 10 dias / Urgente / Emergência
     */
    determineReferralUrgency(redFlags, cotResult) {
      if (redFlags && redFlags.length > 0) {
        const hasEmergency = redFlags.some(rf => rf.urgency === 'Emergência');
        if (hasEmergency) return 'Emergência';
        
        const hasUrgent = redFlags.some(rf => rf.urgency === 'Urgente');
        if (hasUrgent) return 'Urgente';
        
        return 'Até 10 dias';
      }

      if (cotResult && cotResult.conclusion) {
        const confidence = cotResult.conclusion.confidence || 0;
        const diagText = (cotResult.conclusion.primaryDiagnosis || '').toLowerCase();
        
        // Casos crônicos descompensados necessitam acompanhamento mais rápido
        if (diagText.includes('diabetes') && confidence > 80) {
          return 'Até 30 dias';
        }
        
        // Casos suspeitos ou confirmados de Lúpus/LES necessitam acompanhamento especializado em até 30 dias
        if ((diagText.includes('lupus') || diagText.includes('lúpus') || diagText.includes('les')) && confidence > 70) {
          return 'Até 30 dias';
        }
      }

      return 'Eletivo';
    }

    /**
     * Orquestra a contextualização SUS
     * @param {Object} cotResult 
     * @param {Object[]} redFlags 
     * @param {Object} extractedData 
     * @param {Object} cidResult
     * @returns {Promise<Object>} Recomendações e status SUS
     */
    async contextualize(cotResult, redFlags, extractedData, cidResult = null) {
      await this.loadConfig();

      // Extrair medicações recomendadas pelo CoT (se houver)
      let rawMeds = [];
      if (extractedData && extractedData.medications) {
        rawMeds = extractedData.medications;
      }
      
      // Extrair exames recomendados
      let rawExams = [];
      if (extractedData && extractedData.exams) {
        rawExams = extractedData.exams;
      }

      const validatedMeds = this.validateMedications(rawMeds);
      const classifiedExams = this.classifyExams(rawExams);
      const suggestedPrograms = this.suggestSUSPrograms(cotResult, cidResult);
      const urgency = this.determineReferralUrgency(redFlags, cotResult);

      return {
        medications: validatedMeds,
        exams: classifiedExams,
        susPrograms: suggestedPrograms,
        referralUrgency: urgency
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrimaryCareContextualizer;
  } else {
    window.PrimaryCareContextualizer = PrimaryCareContextualizer;
  }
})();
