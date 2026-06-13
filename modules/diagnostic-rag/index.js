// Importar componentes do módulo
// Suporta imports tanto no browser (se carregados como scripts globais) quanto no Node.js (via require)

class DiagnosticRAG {
  constructor() {
    // Resolve class constructors com fallback para window globals ou require (Node.js)
    const resolveClass = (globalName, requirePath) => {
      if (typeof window !== 'undefined' && window[globalName]) {
        return window[globalName];
      }
      if (typeof require !== 'undefined') {
        // eslint-disable-next-line global-require
        return require(requirePath);
      }
      throw new Error(`${globalName} não está disponível`);
    };

    const ProtocolRetrieverClass        = resolveClass('ProtocolRetriever',           './protocol-retriever');
    const ChainOfThoughtProcessorClass  = resolveClass('ChainOfThoughtProcessor',     './chain-of-thought');
    const RedFlagDetectorClass          = resolveClass('RedFlagDetector',             './red-flag-detector');
    const CIDMapperClass                = resolveClass('CIDMapper',                   './cid-mapper');
    const PrimaryCareContextualizerClass= resolveClass('PrimaryCareContextualizer',   './primary-care-contextualizer');
    const QualityValidatorClass         = resolveClass('QualityValidator',            './quality-validator');
    const SOAPGeneratorClass            = resolveClass('SOAPGenerator',               './soap-generator');
    const ReferralSuggesterClass        = resolveClass('ReferralSuggester',           './referral-suggester');
    const DiagnosticCompareClass        = resolveClass('DiagnosticCompare',           './diagnostic-compare');

    this.retriever         = new ProtocolRetrieverClass();
    this.cotProcessor      = new ChainOfThoughtProcessorClass();
    this.redFlagDetector   = new RedFlagDetectorClass();
    this.cidMapper         = new CIDMapperClass();
    this.contextualizer    = new PrimaryCareContextualizerClass();
    this.qualityValidator  = new QualityValidatorClass();
    this.soapGenerator     = new SOAPGeneratorClass();
    this.referralSuggester = new ReferralSuggesterClass();
    this.diagnosticCompare = new DiagnosticCompareClass();
  }

  /**
   * Executa o pipeline completo de diagnóstico RAG-Assistido.
   * @param {Object} request - { transcript, specialty, extractedData, dataExtractorConfidence }
   * @returns {Promise<Object>} Resultado estruturado completo
   */
  async analyze(request) {
    if (!request) {
      return { success: false, error: 'Requisição inválida ou vazia.' };
    }

    try {
      // 1. Busca inteligente de protocolos (RAG)
      const rResult   = await this.retriever.retrieveProtocols(request);
      const protocols = rResult.protocols || [];

      // 2. Detecção de Sinais de Alarme (Red Flags)
      const redFlags = await this.redFlagDetector.detectRedFlags(
        request.extractedData,
        request.specialty,
        request.transcript
      );

      // 3. Raciocínio Estruturado (Chain of Thought)
      const cotResult = await this.cotProcessor.processCoT(request, protocols);

      // 4. Mapeamento de CID-10 e CID-11
      const clinicalContext = {
        age:    request.extractedData?.demographics?.age?.value,
        gender: request.extractedData?.demographics?.gender?.value
      };
      const primaryDiagName = cotResult.conclusion?.primaryDiagnosis || request.specialty;
      const cidResult = await this.cidMapper.mapDiagnosis(primaryDiagName, clinicalContext);

      // 5. Verificação de Consistência COT vs CID
      const consistencyInfo = this.diagnosticCompare.compare(cotResult, cidResult);

      // 6. Sugestão de Encaminhamento — usa as Regras SUS oficiais (referral_rules.js)
      // para que o painel RAG e o botão "Sugerir Encaminhamento SUS" sejam consistentes.
      let referralInfo = { specialty: 'Clínica Geral', rationale: '' };
      try {
        const susRules = window.analisarEncaminhamento;
        if (typeof susRules === 'function') {
          // Constrói texto combinando transcrição + diagnóstico COT para melhor match
          const diagText = [
            request.transcript || '',
            cotResult?.conclusion?.primaryDiagnosis || '',
            cotResult?.conclusion?.diagnosis || '',
            (cotResult?.conclusion?.differentialDiagnoses || []).join(' ')
          ].join(' ');
          const susResult = susRules(diagText);
          referralInfo = {
            specialty: susResult.especialidade,
            rationale: susResult.justificativa,
            confidence: susResult.confiança,
            prioridade: susResult.prioridade || null,
            protocolo: susResult.protocolo || null,
            exames_obrigatorios: susResult.exames_obrigatorios || []
          };
        } else {
          // Fallback: ReferralSuggester próprio se regras SUS não estiverem carregadas
          referralInfo = this.referralSuggester.suggest(cotResult, cidResult);
          referralInfo.confidence = 70;
          referralInfo.prioridade = null;
          referralInfo.protocolo = null;
          referralInfo.exames_obrigatorios = [];
        }
      } catch (refErr) {
        console.warn('[RAG] Erro ao chamar regras SUS, usando fallback:', refErr);
        referralInfo = this.referralSuggester.suggest(cotResult, cidResult);
        referralInfo.confidence = 50;
        referralInfo.prioridade = null;
        referralInfo.protocolo = null;
        referralInfo.exames_obrigatorios = [];
      }

      // 7. Contextualização para Atenção Primária (SUS)
      const susContext = await this.contextualizer.contextualize(
        cotResult,
        redFlags,
        request.extractedData,
        cidResult
      );

      // 8. Validação de Qualidade
      const qualityScore = this.qualityValidator.validateQuality(
        cotResult,
        request,
        protocols,
        redFlags
      );

      // 9. Geração do SOAP enriquecido
      const soapMarkdown = this.soapGenerator.generateSOAP(
        request,
        cotResult,
        redFlags,
        qualityScore,
        susContext,
        protocols,
        cidResult,
        referralInfo
      );

      return {
        success:           true,
        soap:              soapMarkdown,
        redFlags:          redFlags,
        cid:               cidResult,
        quality:           qualityScore,
        susContext:        susContext,
        disclaimer:        rResult.disclaimer,
        cotResult:         cotResult,
        protocolsConsulted: protocols.map(p => p.title),
        consistency:       consistencyInfo,
        referralInfo:      referralInfo
      };

    } catch (error) {
      console.error('Erro no pipeline DiagnosticRAG:', error);
      return {
        success: false,
        error: error.message || 'Erro interno ao processar diagnóstico RAG.'
      };
    }
  }
}

// Exporta para uso em Node.js ou browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagnosticRAG;
} else {
  window.DiagnosticRAG = DiagnosticRAG;
}
