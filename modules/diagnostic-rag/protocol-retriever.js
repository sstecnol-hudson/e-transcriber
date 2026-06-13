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

  class ProtocolRetriever {
    constructor() {
      this.cacheKey = 'etranscriber_rag_protocol_cache';
      this.maxCacheSize = 50;
      this.cacheExpirationMs = 7 * 24 * 60 * 60 * 1000; // 7 dias
    }

    /**
     * Extrai palavras-chave simplificadas da transcrição e especialidade
     * @param {string} transcript 
     * @param {string} specialty 
     * @returns {string[]}
     */
    extractKeywords(transcript, specialty) {
      if (!transcript) return [specialty];
      
      const keywords = [specialty];
      
      // Lista de termos clínicos comuns para busca de protocolos
      const clinicalTerms = [
        'diabetes', 'hipertensão', 'pressão alta', 'infarto', 'iam', 'dor no peito',
        'avc', 'derrame', 'insuficiência cardíaca', 'asma', 'dpoc', 'artrite',
        'reumatismo', 'depressão', 'ansiedade', 'hipotireoidismo', 'tireoide',
        'dislipidemia', 'colesterol', 'obesidade', 'glicemia', 'hba1c'
      ];

      const lowerTranscript = transcript.toLowerCase();
      
      clinicalTerms.forEach(term => {
        if (lowerTranscript.includes(term) && !keywords.includes(term)) {
          keywords.push(term);
        }
      });

      return keywords;
    }

    /**
     * Gera um hash simples ou string chave para o cache a partir da especialidade e palavras-chave
     * @param {string} specialty 
     * @param {string[]} keywords 
     * @returns {string}
     */
    getCacheKey(specialty, keywords) {
      const sortedKeywords = [...keywords].sort().join(',');
      return `${specialty.toLowerCase()}_${sortedKeywords}`;
    }

    /**
     * Recupera do cache do localStorage
     * @param {string} key 
     * @returns {Object|null}
     */
    getFromCache(key) {
      try {
        const cacheStr = _storage.getItem(this.cacheKey);
        if (!cacheStr) return null;
        
        const cache = JSON.parse(cacheStr);
        const entry = cache[key];
        
        if (!entry) return null;
        
        // Verifica expiração
        if (Date.now() - entry.timestamp > this.cacheExpirationMs) {
          this.removeFromCache(key);
          return null;
        }
        
        // Atualiza o timestamp de acesso para LRU
        entry.lastAccess = Date.now();
        cache[key] = entry;
        _storage.setItem(this.cacheKey, JSON.stringify(cache));
        
        return entry.protocols;
      } catch (e) {
        console.error('Erro ao ler cache RAG:', e);
        return null;
      }
    }

    /**
     * Salva no cache com lógica LRU
     * @param {string} key 
     * @param {Object} protocols 
     */
    saveToCache(key, protocols) {
      try {
        let cache = {};
        const cacheStr = _storage.getItem(this.cacheKey);
        if (cacheStr) {
          cache = JSON.parse(cacheStr);
        }

        // Se excedeu tamanho, remove o menos recentemente acessado (LRU)
        const keys = Object.keys(cache);
        if (keys.length >= this.maxCacheSize) {
          let oldestKey = null;
          let oldestTime = Infinity;
          
          for (const k of keys) {
            const entry = cache[k];
            const accessTime = entry.lastAccess || entry.timestamp;
            if (accessTime < oldestTime) {
              oldestTime = accessTime;
              oldestKey = k;
            }
          }
          
          if (oldestKey) {
            delete cache[oldestKey];
          }
        }

        cache[key] = {
          protocols,
          timestamp: Date.now(),
          lastAccess: Date.now()
        };

        _storage.setItem(this.cacheKey, JSON.stringify(cache));
      } catch (e) {
        console.error('Erro ao salvar no cache RAG:', e);
      }
    }

    /**
     * Remove uma entrada específica do cache
     * @param {string} key 
     */
    removeFromCache(key) {
      try {
        const cacheStr = _storage.getItem(this.cacheKey);
        if (!cacheStr) return;
        const cache = JSON.parse(cacheStr);
        delete cache[key];
        _storage.setItem(this.cacheKey, JSON.stringify(cache));
      } catch (e) {
        console.error('Erro ao remover do cache RAG:', e);
      }
    }

    /**
     * Carrega protocolo local como fallback
     * @param {string} specialty 
     * @returns {Object|null}
     */
    async loadLocalProtocolFallback(specialty) {
      const specLower = specialty.toLowerCase();
      
      // Lista de especialidades suportadas localmente
      const localSpecs = ['cardiologia', 'endocrinologia', 'reumatologia'];
      if (!localSpecs.includes(specLower)) {
        return null;
      }

      try {
        // Se estiver em ambiente Node (testes)
        if (typeof module !== 'undefined' && module.exports && typeof require !== 'undefined') {
          const path = require('path');
          const fs = require('fs');
          const filePath = path.resolve(__dirname, `../qualification/data/protocol-${specLower}.json`);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
          }
        } else {
          // Se estiver no browser
          const res = await fetch(`modules/qualification/data/protocol-${specLower}.json`);
          if (res.ok) {
            return await res.json();
          }
        }
      } catch (err) {
        console.error(`Erro ao carregar protocolo local de fallback (${specialty}):`, err);
      }
      
      return null;
    }

    /**
     * Busca protocolos via Tavily com domínios confiáveis
     * @param {string} query 
     * @param {string} apiKey 
     * @returns {Promise<Object[]>}
     */
    async callTavily(query, apiKey) {
      const body = {
        api_key: apiKey,
        query: `protocolo diretrizes tratamento SUS ${query}`,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5
      };

      let url = 'https://api.tavily.com/search';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Erro na API Tavily: ${res.status}`);
        }

        const data = await res.json();
        return data.results || [];
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('Erro ao chamar Tavily RAG:', err);
        throw err;
      }
    }

    /**
     * Prioriza protocols por relevância e fonte
     * @param {Object[]} protocols 
     * @returns {Object[]}
     */
    prioritizeBySource(protocols) {
      if (!protocols || !Array.isArray(protocols)) return [];
      
      return protocols.map(p => {
        let boost = 0;
        const url = (p.url || '').toLowerCase();
        
        if (url.includes('saude.gov.br')) {
          boost = 20; // Prioridade máxima para Ministério da Saúde / SUS
        } else if (url.includes('.org.br')) {
          boost = 10; // Sociedades brasileiras
        } else if (url.includes('scielo.br')) {
          boost = 5;  // Literatura científica brasileira
        }
        
        return {
          ...p,
          score: (p.score || 50) + boost
        };
      }).sort((a, b) => b.score - a.score);
    }

    /**
     * Método principal para buscar protocolos (RAG)
     * @param {Object} request 
     * @returns {Promise<Object>} Resultado RAG com protocolos e disclaimer
     */
    async retrieveProtocols(request) {
      const { transcript, specialty } = request;
      const keywords = this.extractKeywords(transcript, specialty);
      const cacheKey = this.getCacheKey(specialty, keywords);
      
      // 1. Tentar Cache
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        const hasTavily = cached.some(p => p.url && !p.url.startsWith('local://'));
        return {
          protocols: cached,
          disclaimer: hasTavily 
            ? 'Protocolos clínicos recuperados do cache local (Tavily).' 
            : 'Protocolos clínicos recuperados do cache local (Offline).',
          fromCache: true
        };
      }

      // Obter API Key do Tavily
      let apiKey = '';
      if (typeof AppState !== 'undefined' && AppState.tavilyApiKey) {
        apiKey = AppState.tavilyApiKey;
      } else {
        apiKey = _storage.getItem('etranscriber_tavily_key') || '';
      }

      // 2. Se tiver API Key, tenta Tavily
      if (apiKey) {
        try {
          const query = keywords.join(' ');
          const rawResults = await this.callTavily(query, apiKey);
          const prioritized = this.prioritizeBySource(rawResults);
          
          if (prioritized && prioritized.length > 0) {
            const formatted = prioritized.map(r => ({
              title: r.title,
              url: r.url,
              content: r.content,
              score: r.score,
              source: r.url.includes('saude.gov.br') ? 'Ministério da Saúde (SUS)' : 'Sociedade Médica/Diretrizes'
            }));
            
            this.saveToCache(cacheKey, formatted);
            return {
              protocols: formatted,
              disclaimer: 'Busca inteligente de protocolos realizada em tempo real via Tavily API.',
              fromCache: false
            };
          }
        } catch (err) {
          console.warn('Falha no Tavily, usando fallback local...', err);
        }
      }

      // 3. Fallback: Protocolos Locais Pré-cadastrados
      const localProtocol = await this.loadLocalProtocolFallback(specialty);
      if (localProtocol) {
        const formatted = [{
          title: localProtocol.name,
          url: `local://protocol-${specialty.toLowerCase()}.json`,
          content: localProtocol.description + '. ' + (localProtocol.decisionLogic ? Object.values(localProtocol.decisionLogic).join(' ') : ''),
          score: 100,
          source: 'Protocolo de Referência Local (SUS)'
        }];
        
        return {
          protocols: formatted,
          disclaimer: 'Modo Offline: Utilizando protocolos de referência local pré-cadastrados.',
          fromCache: false
        };
      }

      return {
        protocols: [],
        disclaimer: 'Nenhum protocolo clínico correspondente pôde ser recuperado.',
        fromCache: false
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProtocolRetriever;
  } else {
    window.ProtocolRetriever = ProtocolRetriever;
  }
})();
