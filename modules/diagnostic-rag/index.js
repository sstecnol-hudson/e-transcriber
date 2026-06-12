// Importar componentes do módulo
// Suporta imports tanto no browser (se carregados como scripts globais) quanto no Node.js (via require)

let ProtocolRetrieverClass, ChainOfThoughtProcessorClass, RedFlagDetectorClass, CIDMapperClass, PrimaryCareContextualizerClass, QualityValidatorClass, SOAPGeneratorClass;

if (typeof window !== 'undefined' && window.ProtocolRetriever) {
  ProtocolRetrieverClass = window.ProtocolRetriever;
  ChainOfThoughtProcessorClass = window.ChainOfThoughtProcessor;
  RedFlagDetectorClass = window.RedFlagDetector;
  CIDMapperClass = window.CIDMapper;
  PrimaryCareContextualizerClass = window.PrimaryCareContextualizer;
  QualityValidatorClass = window.QualityValidator;
  SOAPGeneratorClass = window.SOAPGenerator;
} else {
  // Node.js environment fallback to require
  const req = path => require(path);
  ProtocolRetrieverClass = req('./protocol-retriever');
  ChainOfThoughtProcessorClass = req('./chain-of-thought');
  RedFlagDetectorClass = req('./red-flag-detector');
  CIDMapperClass = req('./cid-mapper');
  PrimaryCareContextualizerClass = req('./primary-care-contextualizer');
  QualityValidatorClass = req('./quality-validator');
  SOAPGeneratorClass = req('./soap-generator');
}

class DiagnosticRAG {
  constructor() {
    // Resolve class constructors with fallback to window globals or require (Node.js)
    const resolveClass = (globalName, requirePath) => {
      if (typeof window !== 'undefined' && window[globalName]) {
        return window[globalName];
      }
      if (typeof require !== 'undefined') {
        // In Node.js environment
        // eslint-disable-next-line global-require
        return require(requirePath);
      }
      throw new Error(`${globalName} is not available`);
    };

    const ProtocolRetrieverClass = resolveClass('ProtocolRetriever', './protocol-retriever');
    const ChainOfThoughtProcessorClass = resolveClass('ChainOfThoughtProcessor', './chain-of-thought');
    const RedFlagDetectorClass = resolveClass('RedFlagDetector', './red-flag-detector');
    const CIDMapperClass = resolveClass('CIDMapper', './cid-mapper');
    const PrimaryCareContextualizerClass = resolveClass('PrimaryCareContextualizer', './primary-care-contextualizer');
    const QualityValidatorClass = resolveClass('QualityValidator', './quality-validator');
    const SOAPGeneratorClass = resolveClass('SOAPGenerator', './soap-generator');

    this.retriever = new ProtocolRetrieverClass();
    this.cotProcessor = new ChainOfThoughtProcessorClass();
    this.redFlagDetector = new RedFlagDetectorClass();
    this.cidMapper = new CIDMapperClass();
    this.contextualizer = new PrimaryCareContextualizerClass();
    this.qualityValidator = new QualityValidatorClass();
    this.soapGenerator = new SOAPGeneratorClass();
  }

  /**
   * Executa o pipeline completo de diagnóstico RAG-Assistido
   * @param {Object} request - { transcript, specialty, extractedData, dataExtractorConfidence }
   * @returns {Promise<Object>} Resultado estruturado completo
   */
  async analyze(request) {
    if (!request) {
      return { success: false, error: 'Requisição inválida ou vazia.' };
    }

    try {
      // 1. Busca inteligente de protocolos (RAG)
      const rResult = await this.retriever.retrieveProtocols(request);
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
        age: request.extractedData?.demographics?.age?.value,
        gender: request.extractedData?.demographics?.gender?.value
      };
      
      const primaryDiagName = cotResult.conclusion?.primaryDiagnosis || request.specialty;
      const cidResult = await this.cidMapper.mapDiagnosis(primaryDiagName, clinicalContext);

      // 5. Contextualização para Atenção Primária (SUS)
      const susContext = await this.contextualizer.contextualize(
        cotResult, 
        redFlags, 
        request.extractedData
      );

      // 6. Validação de Qualidade
      const qualityScore = this.qualityValidator.validateQuality(
        cotResult, 
        request, 
        protocols, 
        redFlags
      );

      // 7. Geração do SOAP enriquecido
      const soapMarkdown = this.soapGenerator.generateSOAP(
        request,
        cotResult,
        redFlags,
        qualityScore,
        susContext,
        protocols
      );

      return {
        success: true,
        soap: soapMarkdown,
        redFlags: redFlags,
        cid: cidResult,
        quality: qualityScore,
        susContext: susContext,
        disclaimer: rResult.disclaimer,
        cotResult: cotResult,
        protocolsConsulted: protocols.map(p => p.title)
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
