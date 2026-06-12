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

  class RedFlagDetector {
    constructor() {
      this.redFlagsConfig = null;
    }

    /**
     * Carrega as configurações de Red Flags de forma assíncrona
     */
    async loadConfig() {
      if (this.redFlagsConfig) return;

      try {
        // Se estiver em ambiente Node (testes)
        if (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
          const path = require('path');
          const fs = require('fs');
          const filePath = path.resolve(__dirname, './data/red-flags.json');
          if (fs.existsSync(filePath)) {
            this.redFlagsConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return;
          }
        } else {
          // Se estiver no browser
          const res = await fetch('modules/diagnostic-rag/data/red-flags.json');
          if (res.ok) {
            this.redFlagsConfig = await res.json();
            return;
          }
        }
      } catch (err) {
        console.error('Erro ao carregar red-flags.json:', err);
      }

      // Fallback em código caso falhe o carregamento do arquivo
      this.redFlagsConfig = {
        "cardiologia": [
          {
            "id": "sca",
            "name": "Síndrome Coronária Aguda",
            "signs": [
              { "key": "chest_pain", "operator": "==", "value": true },
              { "key": "diaphoresis", "operator": "==", "value": true }
            ],
            "urgency": "Emergência",
            "action": "Encaminhamento SAMU (192) - Pronto-Socorro com ECG imediato",
            "protocol": "Protocolo SUS: Síndromes Coronárias Agudas, 2023",
            "time_window": "Imediato"
          }
        ],
        "endocrinologia": [
          {
            "id": "cad",
            "name": "Cetoacidose Diabética",
            "signs": [
              { "key": "glucose", "operator": ">=", "value": 250 },
              { "key": "vomiting", "operator": "==", "value": true }
            ],
            "urgency": "Emergência",
            "action": "Encaminhamento para Pronto-Socorro/UPA imediatamente",
            "protocol": "Protocolo SUS: Diabetes Mellitus Complicações Agudas",
            "time_window": "Imediato"
          }
        ]
      };
    }

    /**
     * Avalia uma condição clínica individual
     * @param {Object} cond 
     * @param {Object} clinicalData 
     * @param {string} transcript 
     * @returns {boolean}
     */
    evaluateCondition(cond, clinicalData, transcript) {
      const { key, operator, value } = cond;
      
      // Obter o valor atual a partir de clinicalData (vários caminhos possíveis)
      let actualValue = undefined;

      if (clinicalData) {
        // Tenta no nível raiz, vitalSigns, demographics, etc.
        if (clinicalData[key] !== undefined) {
          actualValue = clinicalData[key];
        } else if (clinicalData.vitalSigns && clinicalData.vitalSigns[key] !== undefined) {
          actualValue = clinicalData.vitalSigns[key];
        } else if (clinicalData.demographics && clinicalData.demographics[key] !== undefined) {
          actualValue = clinicalData.demographics[key];
        }
        
        // Se não encontrou e for um sintoma booleano, pesquisa na lista de sintomas
        if (actualValue === undefined && typeof value === 'boolean') {
          const symptoms = clinicalData.symptoms || [];
          const hasSymptom = symptoms.some(s => {
            const sName = typeof s === 'string' ? s : (s.name || '');
            return sName.toLowerCase().includes(key.replace('_', ' '));
          });
          if (hasSymptom) {
            actualValue = true;
          }
        }
      }

      // Se continuar indefinido, tenta buscar por palavras-chave na transcrição
      if (actualValue === undefined && transcript && typeof value === 'boolean') {
        const lowerTranscript = transcript.toLowerCase();
        const keywordsMap = {
          'chest_pain': ['dor no peito', 'dor torácica', 'dor toracica', 'desconforto no peito', 'aperto no peito'],
          'diaphoresis': ['suor', 'suando', 'diapforese', 'diaphoresis', 'sudorese'],
          'vomiting': ['vômito', 'vomito', 'ansiado', 'nausea', 'náusea'],
          'ketone_breath': ['hálito cetônico', 'halito cetonico', 'hálito de maçã', 'hálito doce'],
          'neurological_symptoms': ['confuso', 'desorientado', 'desmai', 'perda de fala', 'paralis', 'fraqueza súbita'],
          'pulmonary_edema': ['edema pulmonar', 'água no pulmão', 'agua no pulmao', 'falta de ar deitar', 'ortopneia'],
          'diabetic_foot_ulcer': ['pé diabético', 'pe diabetico', 'úlcera no pé', 'ulcera no pe', 'ferida no pé'],
          'infection_or_necrosis': ['necrose', 'preto', 'infecc', 'infecção', 'pus', 'secreção'],
          'joint_pain_severe': ['dor articular grave', 'dor na articulação', 'dor no joelho', 'dor no quadril', 'muita dor'],
          'joint_fever': ['febre', 'quente', 'temperatura alta'],
          'joint_effusion_or_warmth': ['inchaço', 'inchado', 'articulacao quente', 'articulação quente', 'vermelho'],
          'weight_loss_10_percent': ['perdi peso', 'perda de peso', 'emagreci', 'perdi 10kg', 'perdi 5kg'],
          'fever_prolonged': ['febre', 'febril', 'calafrio']
        };

        const keywords = keywordsMap[key] || [key.replace('_', ' ')];
        const foundInTranscript = keywords.some(kw => lowerTranscript.includes(kw));
        if (foundInTranscript) {
          actualValue = true;
        }
      }

      // Se mesmo assim não achou valor, assume falso ou falha de condição
      if (actualValue === undefined) {
        return false;
      }

      // Avaliação de operadores
      switch (operator) {
        case '==':
          return actualValue === value;
        case '!=':
          return actualValue !== value;
        case '>=':
          return Number(actualValue) >= Number(value);
        case '<=':
          return Number(actualValue) <= Number(value);
        case '>':
          return Number(actualValue) > Number(value);
        case '<':
          return Number(actualValue) < Number(value);
        case 'contains':
          return String(actualValue).toLowerCase().includes(String(value).toLowerCase());
        default:
          return false;
      }
    }

    /**
     * Detecta Red Flags baseando-se nos dados e transcrição
     * @param {Object} clinicalData 
     * @param {string} specialty 
     * @param {string} transcript 
     * @returns {Promise<Object[]>} Array de Red Flags detectadas
     */
    async detectRedFlags(clinicalData, specialty, transcript = '') {
      await this.loadConfig();
      
      const detected = [];
      const specLower = (specialty || '').toLowerCase();
      
      // Obter definições para a especialidade e também do grupo "geral"
      const definitions = [
        ...(this.redFlagsConfig[specLower] || []),
        ...(this.redFlagsConfig['geral'] || [])
      ];

      for (const def of definitions) {
        const signsStatus = [];
        let allSignsMet = true;

        for (const cond of def.signs) {
          const met = this.evaluateCondition(cond, clinicalData, transcript);
          signsStatus.push({
            sign: cond.key.replace('_', ' '),
            detected: met
          });
          
          if (!met) {
            allSignsMet = false;
          }
        }

        if (allSignsMet) {
          detected.push({
            id: def.id,
            name: def.name,
            urgency: def.urgency,
            action: def.action,
            protocol_origin: def.protocol,
            time_window: def.time_window,
            signs_detected: signsStatus,
            justification: `Alerta de Red Flag "${def.name}" detectado com base na presença de todos os sinais clínicos monitorados.`
          });
        }
      }

      return detected;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RedFlagDetector;
  } else {
    window.RedFlagDetector = RedFlagDetector;
  }
})();
