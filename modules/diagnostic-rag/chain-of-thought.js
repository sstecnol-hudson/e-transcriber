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

  class ChainOfThoughtProcessor {
    constructor() {
      this.defaultModel = 'llama-3.3-70b-versatile';
    }

    /**
     * Obtém a chave de API do Groq do local apropriado
     * @returns {string}
     */
    getApiKey() {
      if (typeof AppState !== 'undefined' && AppState.apiKey) {
        return AppState.apiKey;
      }
      return _storage.getItem('etranscriber_groq_key') || '';
    }

    /**
     * Obtém o modelo configurado no aplicativo ou o padrão
     * @returns {string}
     */
    getConfiguredModel() {
      if (typeof DOM !== 'undefined' && DOM.aiModel) {
        return DOM.aiModel.value;
      }
      return this.defaultModel;
    }

    /**
     * Constrói o System Prompt para o raciocínio CoT
     * @param {string} specialty 
     * @param {Object[]} protocols 
     * @returns {string}
     */
    buildSystemPrompt(specialty, protocols) {
      const protocolsCtx = protocols && protocols.length > 0 
        ? protocols.map((p, idx) => `[Protocolo ${idx + 1}] Título: ${p.title} | Fonte: ${p.source} | Conteúdo: ${p.content}`).join('\n\n')
        : 'Nenhum protocolo específico recuperado. Utilize as diretrizes clínicas gerais e consensos do Ministério da Saúde / SUS.';

      return `Você é um assistente de inteligência artificial médica especializado em raciocínio diagnóstico e estruturação de prontuários clínicos para a Atenção Primária à Saúde (SUS).
Sua tarefa é analisar a transcrição de uma consulta clínica, correlacionar com os protocolos médicos fornecidos e gerar uma análise diagnóstica estruturada usando Chain of Thought (Cadeia de Raciocínio).

PROTOCOLOS DE REFERÊNCIA DISPONÍVEIS:
${protocolsCtx}

Você deve estruturar seu raciocínio CLINICAMENTE em 5 passos:
1. DADOS APRESENTADOS: Identificar idade, sexo, sintomas principais (duração/intensidade), sinais vitais e resultados de exames citados na transcrição.
2. CRITÉRIOS DIAGNÓSTICOS RELEVANTES: Listar quais critérios dos protocolos de referência são aplicáveis ao caso do paciente.
3. ANÁLISE DE CORRESPONDÊNCIA: Mapear os dados do paciente com os critérios do protocolo, indicando quais estão "Confirmado", "Indeterminado" ou "Contraditório", citando o protocolo de origem.
4. HIPÓTESES DIAGNÓSTICAS CONSIDERADAS: Listar hipóteses diagnósticas com probabilidades estimadas (Alta/Média/Baixa), código CID-10, critérios atendidos e justificativa.
5. CONCLUSÃO E JUSTIFICATIVA: Definir o diagnóstico principal (com CID-10 e CID-11) embasado nas evidências e citando a fonte do protocolo de referência.

Responda EXCLUSIVAMENTE em formato JSON com a seguinte estrutura de propriedades:
{
  "presentedData": "string com o resumo dos dados clínicos identificados",
  "relevantCriteria": [
    { "criterion": "nome do critério", "source": "título do protocolo de origem" }
  ],
  "correspondenceAnalysis": [
    { "criterion": "nome do critério", "status": "Confirmado|Indeterminado|Contraditório", "evidence": "evidência clínica baseada nos dados", "source": "título do protocolo" }
  ],
  "hypotheses": [
    { "diagnosis": "nome do diagnóstico", "icd10": "código CID-10", "probability": "Alta|Média|Baixa", "supportingCriteria": ["critérios que apoiam"], "reasoning": "justificativa clínica" }
  ],
  "conclusion": {
    "primaryDiagnosis": "diagnóstico principal com CID-10",
    "icd10": "código CID-10",
    "icd11": "código CID-11",
    "reasoning": "raciocínio final unificado",
    "protocolSource": "título e versão do protocolo principal utilizado como base",
    "confidence": 0 a 100
  }
}`;
    }

    /**
     * Processa a Chain of Thought chamando a API do Groq
     * @param {Object} request 
     * @param {Object[]} protocols 
     * @returns {Promise<Object>} Resultado JSON da análise CoT
     */
    async processCoT(request, protocols) {
      const { transcript, specialty, extractedData } = request;
      const apiKey = this.getApiKey();
      if (!apiKey) {
        throw new Error('Chave de API do Groq ausente!');
      }

      const systemPrompt = this.buildSystemPrompt(specialty, protocols);
      const userContent = `DADOS EXTRAÍDOS AUTOMATICAMENTE DA CONSULTA:
${JSON.stringify(extractedData || {}, null, 2)}

TRANSCRIÇÃO COMPLETA DA CONSULTA:
${transcript}`;

      const model = this.getConfiguredModel();

      try {
        const fallbackChain = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];
        let modelsToTry = [model, ...fallbackChain.filter(m => m !== model)];
        
        for (let i = 0; i < modelsToTry.length; i++) {
          const currentModel = modelsToTry[i];
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: currentModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
              ],
              temperature: 0.0,
              response_format: { type: "json_object" }
            })
          });

          if (response.ok) {
            const resJson = await response.json();
            const contentStr = resJson.choices[0].message.content;
            return JSON.parse(contentStr);
          }

          if ((response.status === 429 || response.status === 400 || response.status === 404) && i < modelsToTry.length - 1) {
            console.warn(`Erro/Rate limit no modelo ${currentModel} (Status ${response.status}). Tentando fallback para ${modelsToTry[i+1]}...`);
            continue;
          }

          const errorText = await response.text();
          throw new Error(`Groq API Error (${response.status}): ${errorText}`);
        }
      } catch (err) {
        console.error('Erro no Chain of Thought Processor:', err);
        // Fallback local se a chamada de IA falhar completamente
        return this.generateLocalFallbackResult(specialty, extractedData, transcript);
      }
    }

    /**
     * Fallback de baixo nível se a API falhar, para graceful degradation
     * @param {string} specialty 
     * @param {Object} extractedData 
     * @param {string} transcript 
     * @returns {Object}
     */
    generateLocalFallbackResult(specialty, extractedData, transcript = '') {
      const demographics = extractedData?.demographics || {};
      const patientName = demographics.name?.value || 'Paciente';
      const age = demographics.age?.value || '';

      // Sugere diagnósticos comuns por especialidade
      let diagnosis = 'A avaliar';
      let icd10 = '';
      let icd11 = '';
      let reasoning = 'Análise offline. Requer conexão com a internet para gerar raciocínio clínico completo.';
      
      const specLower = specialty.toLowerCase();
      if (specLower === 'endocrinologia') {
        diagnosis = 'Diabetes Mellitus Tipo 2';
        icd10 = 'E11';
        icd11 = '5A11';
        reasoning = 'Suspeita baseada na especialidade Endocrinologia. Requer confirmação de exames.';
      } else if (specLower === 'cardiologia') {
        diagnosis = 'Hipertensão Arterial Sistêmica';
        icd10 = 'I10';
        icd11 = 'BA00';
        reasoning = 'Suspeita baseada na especialidade Cardiologia. Requer aferição de PA em repouso.';
      } else if (specLower === 'reumatologia') {
        // Tenta detectar se há termos associados a Lúpus na transcrição ou dados
        const textToAnalyze = (JSON.stringify(extractedData || {}) + ' ' + transcript).toLowerCase();
        const hasLupusKeywords = textToAnalyze.includes('lupus') || textToAnalyze.includes('lúpus') || textToAnalyze.includes('les') || textToAnalyze.includes('malar') || textToAnalyze.includes('borboleta');
        
        if (hasLupusKeywords) {
          diagnosis = 'Lupus Eritematoso Sistemico';
          icd10 = 'M32.9';
          icd11 = '4A40';
          reasoning = 'Suspeita de Lúpus Eritematoso Sistêmico devido a manifestações dermatológicas/sistêmicas descritas. Necessita de FAN e encaminhamento para Reumatologia.';
        } else {
          diagnosis = 'Artrite Reumatoide';
          icd10 = 'M06';
          icd11 = 'FA10';
          reasoning = 'Suspeita baseada na especialidade Reumatologia. Requer exames sorológicos.';
        }
      }

      return {
        presentedData: `Paciente: ${patientName}, Idade: ${age}. Atendimento em ${specialty}. (Modo Offline/Fallback)`,
        relevantCriteria: [],
        correspondenceAnalysis: [],
        hypotheses: [
          {
            diagnosis: diagnosis,
            icd10: icd10,
            probability: 'Média',
            supportingCriteria: [],
            reasoning: reasoning
          }
        ],
        conclusion: {
          primaryDiagnosis: `${diagnosis} (Suspeita)`,
          icd10: icd10,
          icd11: icd11,
          reasoning: reasoning,
          protocolSource: 'Nenhum protocolo consultado (Offline)',
          confidence: 50
        }
      };
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChainOfThoughtProcessor;
  } else {
    window.ChainOfThoughtProcessor = ChainOfThoughtProcessor;
  }
})();
