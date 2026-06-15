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
          const res = await fetch('modules/diagnostic-rag/data/red-flags.json?t=' + Date.now());
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
        ],
        "vascular": [
          {
            "id": "isquemia_digital_aguda",
            "name": "Isquemia Digital Aguda",
            "signs": [
              { "key": "digital_ischemia", "operator": "==", "value": true }
            ],
            "urgency": "Emergência",
            "action": "Encaminhamento IMEDIATO para Pronto-Socorro com Cirurgia Vascular — risco de amputação em horas.",
            "protocol": "Protocolo de Isquemia de Membro — SBACV",
            "time_window": "Imediato (< 6h)"
          },
          {
            "id": "isquemia_membro_aguda",
            "name": "Isquemia Aguda de Membro (6 Ps)",
            "signs": [
              { "key": "acute_limb_ischemia", "operator": "==", "value": true }
            ],
            "urgency": "Emergência",
            "action": "SAMU (192) imediato — janela terapêutica para trombólise ou cirurgia é de 4–6h.",
            "protocol": "Guideline de Isquemia Aguda de Membro — ACC/AHA 2022 / SBACV",
            "time_window": "Imediato (< 4h)"
          }
        ],
        "reumatologia": [
          {
            "id": "artrite_septica",
            "name": "Artrite Séptica",
            "signs": [
              { "key": "joint_pain_severe", "operator": "==", "value": true },
              { "key": "joint_fever", "operator": "==", "value": true },
              { "key": "joint_effusion_or_warmth", "operator": "==", "value": true }
            ],
            "urgency": "Urgente",
            "action": "Encaminhamento para Pronto-Socorro com Ortopedia para artrocentese de urgência",
            "protocol": "Consenso de Artrite Séptica - Sociedade Brasileira de Reumatologia",
            "time_window": "24h"
          },
          {
            "id": "les_acometimento_renal",
            "name": "Crise Lúpica com Acometimento Renal",
            "signs": [
              { "key": "lupus_diagnosis", "operator": "==", "value": true },
              { "key": "proteinuria", "operator": "==", "value": true },
              { "key": "hematuria", "operator": "==", "value": true }
            ],
            "urgency": "Urgente",
            "action": "Encaminhamento com prioridade para Nefrologia/Reumatologia para biópsia renal",
            "protocol": "Diretrizes Brasileiras para o Manejo de Nefrite Lúpica - SBR",
            "time_window": "Até 7 dias"
          },
          {
            "id": "serosite_lupica",
            "name": "Serosite Lúpica / Derrame Pleural ou Pericárdico",
            "signs": [
              { "key": "lupus_diagnosis", "operator": "==", "value": true },
              { "key": "pleuritic_pain", "operator": "==", "value": true },
              { "key": "pericarditis", "operator": "==", "value": true }
            ],
            "urgency": "Urgente",
            "action": "Encaminhamento para Pronto-Atendimento para realização de ecocardiograma e RX de tórax",
            "protocol": "Consenso Latino-Americano de Lúpus Eritematoso Sistêmico",
            "time_window": "Até 48h"
          },
          {
            "id": "les_neuropsiquiatrico",
            "name": "Manifestação Neuropsiquiátrica Lúpica",
            "signs": [
              { "key": "lupus_diagnosis", "operator": "==", "value": true },
              { "key": "confusion_or_psychosis", "operator": "==", "value": true }
            ],
            "urgency": "Emergência",
            "action": "Encaminhamento imediato para Pronto-Socorro/Hospital para investigação com RM e LCR",
            "protocol": "Consenso de Lúpus Neuropsiquiátrico - Sociedade Brasileira de Reumatologia",
            "time_window": "Imediato"
          }
        ],
        "geral": [
          {
            "id": "perda_peso_febre",
            "name": "Perda de Peso Involuntária com Febre Sem Foco",
            "signs": [
              { "key": "weight_loss_10_percent", "operator": "==", "value": true },
              { "key": "fever_prolonged", "operator": "==", "value": true }
            ],
            "urgency": "Investigação",
            "action": "Solicitar exames laboratoriais amplos e agendar retorno/encaminhamento em até 30 dias",
            "protocol": "Protocolo de Investigação de Síndrome Consumptiva",
            "time_window": "30 dias"
          },
          {
            "id": "febre_eritema_malar",
            "name": "Febre com Eritema Malar (Suspeita de LES)",
            "signs": [
              { "key": "malar_rash", "operator": "==", "value": true },
              { "key": "fever", "operator": "==", "value": true },
              { "key": "arthralgia", "operator": "==", "value": true }
            ],
            "urgency": "Investigação",
            "action": "Solicitar FAN (ANA), hemograma, VHS, PCR, EAS e referenciar para Reumatologista",
            "protocol": "Critérios de Classificação do Lúpus (ACR/EULAR 2019)",
            "time_window": "Até 14 dias"
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
          'fever_prolonged': ['febre', 'febril', 'calafrio'],
          'lupus_diagnosis': ['lupus', 'lúpus', 'les', 'lupus eritematoso', 'lúpus eritematoso'],
          'proteinuria': ['proteinuria', 'proteinúria', 'proteína na urina', 'proteina na urina', 'perda de proteina', 'nefrite'],
          'hematuria': ['hematuria', 'hematúria', 'sangue na urina', 'urina com sangue', 'urina escura', 'urina avermelhada'],
          'pleuritic_pain': ['dor pleurítica', 'dor pleuritica', 'dor ao respirar', 'dor no peito ao inspirar', 'dor pleura'],
          'pericarditis': ['pericardite', 'derrame pericárdico', 'derrame pericardico', 'inflamação no coração', 'dor pericárdica'],
          'confusion_or_psychosis': ['confusão mental', 'confusao mental', 'delírio', 'delirio', 'psicose', 'convulsão', 'convulsao', 'alteração de comportamento'],
          'malar_rash': ['eritema malar', 'asa de borboleta', 'mancha vermelha no rosto', 'mancha no rosto', 'manchas nas bochechas'],
          'fever': ['febre', 'febril', 'temperatura elevada', 'calafrio', 'calafrios'],
          'arthralgia': ['artralgia', 'dor nas articulações', 'dor nas articulacoes', 'dor nas juntas', 'juntas doloridas'],
          // ── Vascular ──────────────────────────────────────────────────────────
          'digital_ischemia': [
            'isquemia digital', 'isquemia digital aguda', 'dedo azul', 'dedo azul agudo',
            'síndrome do dedo azul', 'sindrome do dedo azul', 'blue toe', 'cianose digital',
            'dedo cianótico', 'dedo cianotico', 'palidez digital', 'necrose digital',
            'gangrena digital', 'oclusão arterial digital', 'oclusao arterial digital',
            'isquemia dos dedos', 'dedo isquêmico', 'dedo isquemico'
          ],
          'acute_limb_ischemia': [
            'isquemia aguda de membro', 'isquemia de membro', 'membro isquêmico',
            'membro isquemico', 'ausência de pulso', 'ausencia de pulso', 'pulso ausente',
            'extremidade fria', 'perna fria', 'mão fria', 'pé frio', 'dor em repouso vascular',
            'palidez de membro', 'parestesia de membro', 'paralisia de membro',
            'oclusão arterial aguda', 'oclusao arterial aguda', 'embolia arterial',
            'trombose arterial aguda', '6 ps', 'seis ps'
          ],
          'aortic_dissection': [
            'dissecção aórtica', 'disseccao aortica', 'dissecção de aorta', 'dissecção aortica',
            'dor torácica em rasgo', 'dor em rasgo', 'dor para o dorso',
            'síndrome aórtica aguda', 'sindrome aortica aguda'
          ]
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

      // Mapa de aliases: normaliza nomes compostos de especialidades para a chave do JSON
      const SPECIALTY_ALIASES = {
        'cirurgia vascular / angiologia': 'vascular',
        'cirurgia vascular':              'vascular',
        'angiologia':                     'vascular',
        'cardiologia e cirurgia vascular':'vascular',
        'endocrinologia e metabolismo':   'endocrinologia',
        'ginecologia e obstetrícia':      'ginecologia',
        'ginecologia e obstetricia':      'ginecologia',
        'ortopedia e traumatologia':      'ortopedia',
        'clínica geral':                  'geral',
        'clinica geral':                  'geral'
      };
      const resolvedKey = SPECIALTY_ALIASES[specLower] || specLower;
      
      // Obter definições para a especialidade resolvida e também do grupo "geral"
      const definitions = [
        ...(this.redFlagsConfig[resolvedKey] || []),
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
