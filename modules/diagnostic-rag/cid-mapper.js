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

  class CIDMapper {
    constructor() {
      this.cidConfig = null;
    }

    /**
     * Carrega as configurações do CID de forma assíncrona
     * @param {boolean} force - Força o recarregamento do arquivo ignorando o cache em memória
     */
    async loadConfig(force = false) {
      if (this.cidConfig && !force) return;

      try {
        // Se estiver em ambiente Node (testes)
        if (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
          const path = require('path');
          const fs = require('fs');
          const filePath = path.resolve(__dirname, './data/cid-map.json');
          if (fs.existsSync(filePath)) {
            this.cidConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return;
          }
        } else {
          // Se estiver no browser
          const res = await fetch('modules/diagnostic-rag/data/cid-map.json?t=' + Date.now());
          if (res.ok) {
            this.cidConfig = await res.json();
            return;
          }
        }
      } catch (err) {
        console.error('Erro ao carregar cid-map.json:', err);
      }

      // Fallback básico caso o arquivo JSON falhe
      this.cidConfig = {
        "Diabetes Mellitus Tipo 2": {
          "icd10": "E11",
          "icd11": "5A11",
          "description": "Diabetes mellitus tipo 2",
          "aliases": ["diabetes tipo 2", "dm2", "diabetes", "diabética", "diabetico", "glicemia alta", "açúcar alto"],
          "variants": [
            { "code": "E11.9", "description": "Sem complicações" },
            { "code": "E11.2", "description": "Com complicações renais" }
          ],
          "contextualRules": { "minAge": 18 }
        },
        "Hipertensão Arterial": {
          "icd10": "I10",
          "icd11": "BA00",
          "description": "Hipertensão essencial (primária)",
          "aliases": ["hipertensao", "pressão alta", "pressao alta", "has"],
          "variants": [
            { "code": "I10", "description": "Hipertensão essencial" }
          ]
        },
        "Lupus Eritematoso Sistemico": {
          "icd10": "M32",
          "icd11": "4A40",
          "description": "Lúpus eritematoso sistêmico",
          "aliases": ["lupus", "lúpus", "les", "lupus eritematoso", "lúpus eritematoso", "lupus eritematoso sistemico", "lúpus eritematoso sistêmico", "doença autoimune", "doença do colágeno"],
          "variants": [
            { "code": "M32.1", "description": "Lúpus eritematoso sistêmico com acometimento de órgãos e sistemas" },
            { "code": "M32.9", "description": "Lúpus eritematoso sistêmico não especificado" }
          ],
          "contextualRules": {
            "warning": "Doença autoimune sistêmica. Solicitar ANA, Anti-dsDNA, Anti-Sm, C3, C4. Requer encaminhamento reumatológico especializado."
          }
        },
        "Síndrome de Cushing": {
          "icd10": "E24",
          "icd11": "5A70",
          "description": "Síndrome de Cushing",
          "aliases": ["cushing", "síndrome de cushing", "sindrome de cushing", "hipercortisolismo", "doença de cushing"],
          "variants": [
            { "code": "E24.9", "description": "Síndrome de Cushing não especificada" },
            { "code": "E24.0", "description": "Doença de Cushing dependente da hipófise" }
          ],
          "contextualRules": {
            "warning": "Suspeita de hipercortisolismo (Síndrome de Cushing). Solicitar cortisol salivar noturno, cortisol livre urinário de 24h ou teste de supressão com dexametasona. Requer encaminhamento ao endocrinologista."
          }
        }
      };
    }

    /**
     * Mapeia um diagnóstico informado para códigos CID-10 e CID-11
     * @param {string} diagnosis 
     * @param {Object} clinicalContext 
     * @returns {Promise<Object>} Resultado estruturado do mapeamento CID
     */
    async mapDiagnosis(diagnosis, clinicalContext = {}) {
      // Debug flag can be set via environment variable or global variable
      const debug = (typeof process !== 'undefined' && process.env && process.env.DEBUG_CID) || (typeof window !== 'undefined' && window.DEBUG_CID);
      if (debug) console.log('[DEBUG_CID] Starting mapDiagnosis for:', diagnosis, 'with context', clinicalContext);
      await this.loadConfig();

      const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedDiag = removeAccents((diagnosis || '').trim().toLowerCase());
      let bestKey = null;
      let highestScore = 0;

      // Busca pela melhor correspondência de nome
      for (const key of Object.keys(this.cidConfig)) {
        const keyLower = removeAccents(key.toLowerCase());
        
        // Correspondência exata
        if (normalizedDiag === keyLower) {
          bestKey = key;
          highestScore = 1.0;
          if (debug) console.log('[DEBUG_CID] Exact match found:', bestKey);
          break;
        }
        
        // Correspondência parcial (subtrings)
        if (normalizedDiag.includes(keyLower) || keyLower.includes(normalizedDiag)) {
          const score = Math.min(keyLower.length, normalizedDiag.length) / Math.max(keyLower.length, normalizedDiag.length);
          if (score > highestScore) {
            highestScore = score;
            bestKey = key;
          }
          if (debug) console.log('[DEBUG_CID] Alias match candidate:', key, 'score', score);
        }
      }

      // Se não encontrou correspondência exata/parcial direta de alta confiança, busca nos aliases
      if (highestScore < 0.8) {
        for (const key of Object.keys(this.cidConfig)) {
          const mapData = this.cidConfig[key];
          const aliases = mapData.aliases || [];
          for (const alias of aliases) {
            const aliasLower = removeAccents(alias.toLowerCase());
            if (normalizedDiag === aliasLower) {
              if (1.0 > highestScore) {
                highestScore = 1.0;
                bestKey = key;
              }
              break;
            }
            if (normalizedDiag.includes(aliasLower) || aliasLower.includes(normalizedDiag)) {
              const diagWords = normalizedDiag.split(/[\s,.;()]+/);
              const isWordMatch = diagWords.includes(aliasLower);
              let score = Math.min(aliasLower.length, normalizedDiag.length) / Math.max(aliasLower.length, normalizedDiag.length) * 0.9;
              if (isWordMatch) {
                score = Math.max(score, 0.75);
              }
              if (score > highestScore) {
                highestScore = score;
                bestKey = key;
              }
            }
          }
        }
      }

      // Se a correspondência for muito baixa (< 0.3), tenta encontrar por termos-chave
      if (highestScore < 0.3) {
        const stopWords = ['sindrome', 'doenca', 'transtorno', 'infeccao', 'insuficiencia', 'agudo', 'aguda', 'cronico', 'cronica', 'sistemico', 'sistemica', 'tipo', 'corporal', 'massa', 'indice', 'essencial', 'primaria', 'secundaria', 'complicacoes', 'sem'];
        for (const key of Object.keys(this.cidConfig)) {
          const words = removeAccents(key.toLowerCase()).split(' ');
          const matches = words.filter(w => w.length > 3 && !stopWords.includes(w) && normalizedDiag.includes(w));
          if (debug && matches.length > 0) console.log('[DEBUG_CID] Keyword fallback matches for', key, ':', matches);
          if (matches.length > 0) {
            bestKey = key;
            highestScore = 0.5; // score fixo para correspondência por palavras-chave
            break;
          }
        }
      }

      if (!bestKey || highestScore < 0.3) {
        // Nenhum mapeamento encontrado
        if (debug) console.log('[DEBUG_CID] Final mapping result:', { bestKey, highestScore });
        return {
          primary: {
            diagnosis: diagnosis,
            icd10: { code: 'N/A', description: 'Não encontrado' },
            icd11: { code: 'N/A', description: 'Não encontrado' },
            confidence: 0
          },
          secondary: [],
          contextualIssues: [
            {
              issue: 'Código não encontrado',
              description: `Não foi possível mapear o diagnóstico "${diagnosis}" para a tabela local.`,
              recommended: 'Realize busca manual do CID-10 adequado.',
              severity: 'warning'
            }
          ],
          status: 'INCERTO'
        };
      }

      const mapData = this.cidConfig[bestKey];
      let confidence = Math.round(highestScore * 100);
      const contextualIssues = [];
      let status = 'VÁLIDO';

      // Valida regras contextuais (demográficas)
      const age = clinicalContext.age !== undefined ? Number(clinicalContext.age) : undefined;
      const gender = clinicalContext.gender ? String(clinicalContext.gender).toUpperCase() : undefined;

      if (mapData.contextualRules) {
        const rules = mapData.contextualRules;
        
        if (rules.minAge !== undefined && age !== undefined && age < rules.minAge) {
          contextualIssues.push({
            issue: 'Inconsistência demográfica',
            description: rules.warning || `A condição clínico-diagnóstica é incomum para a idade informada (${age} anos).`,
            severity: 'warning'
          });
          confidence = Math.max(10, confidence - 30);
          status = 'INCERTO';
        }

        if (rules.genderRestrict !== undefined && gender !== undefined && gender !== rules.genderRestrict.toUpperCase()) {
          contextualIssues.push({
            issue: 'Inconsistência de gênero',
            description: `Diagnóstico tipicamente restrito ou inadequado para o sexo biológico do paciente.`,
            severity: 'warning'
          });
          confidence = Math.max(10, confidence - 40);
          status = 'INCERTO';
        }
      }

      // Valida especificidade (se possui variantes, mas o diagnóstico mapeado é o código raiz)
      if (mapData.variants && mapData.variants.length > 0) {
        const hasSpecificVariant = mapData.variants.some(v => normalizedDiag.includes(removeAccents(v.description.toLowerCase())));
        if (!hasSpecificVariant) {
          contextualIssues.push({
            issue: 'Falta de especificidade',
            description: `O código de base ${mapData.icd10} necessita de especificação de complicação, tipo ou gravidade.`,
            recommended: `Selecione um subcódigo adequado (ex: ${mapData.variants.map(v => v.code).join(', ')}).`,
            severity: 'warning'
          });
          confidence = Math.max(10, confidence - 15);
          status = 'INCERTO';
        }
      }

      // Monta o retorno
      const result = {
        primary: {
          diagnosis: bestKey,
          icd10: {
            code: mapData.variants && mapData.variants.length > 0 ? mapData.variants[0].code : mapData.icd10,
            description: mapData.variants && mapData.variants.length > 0 ? mapData.variants[0].description : mapData.description,
            validity: 'Válido'
          },
          icd11: {
            code: mapData.icd11,
            description: mapData.description,
            validity: 'Válido'
          },
          confidence: confidence
        },
        secondary: [],
        contextualIssues: contextualIssues,
        status: status
      };

      // Adiciona as variantes como sugestões de alternativas
      if (mapData.variants && mapData.variants.length > 1) {
        result.alternatives = mapData.variants.slice(1).map(v => ({
          icd10: v.code,
          description: v.description,
          type: 'Variante específica'
        }));
      }

      return result;
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CIDMapper;
  } else {
    window.CIDMapper = CIDMapper;
  }
})();
