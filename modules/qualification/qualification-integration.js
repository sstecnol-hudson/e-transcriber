/**
 * Integração do Módulo de Qualificação
 * Orquestra todos os componentes do sistema
 */

class QualificationIntegration {
  constructor() {
    this.module = new QualificationModule();
    this.historyManager = new HistoryManager();
    this.protocols = {};
    this.currentEngine = null;
    this.currentReportGenerator = null;
    
    // Armazenar a Promise de inicialização para que possa ser aguardada depois
    this.initPromise = this.initialize();
  }

  /**
   * Inicializa a integração carregando protocolos
   */
  async initialize() {
    try {
      // Carregar protocolos
      await this.loadProtocols();
      console.log('Módulo de Qualificação inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar módulo:', error);
    }
  }

  /**
   * Carrega protocolos clínicos
   */
  async loadProtocols() {
    const protocolIds = ['endocrinologia', 'cardiologia', 'reumatologia'];
    
    for (const protocolId of protocolIds) {
      try {
        // Em produção, carregar de arquivo JSON
        // Por enquanto, usar dados mockados
        this.protocols[protocolId] = await this.loadProtocolData(protocolId);
      } catch (error) {
        console.error(`Erro ao carregar protocolo ${protocolId}:`, error);
      }
    }
  }

  /**
   * Carrega dados de protocolo
   * @param {string} protocolId - ID do protocolo
   * @returns {Promise<Object>} Dados do protocolo
   */
  async loadProtocolData(protocolId) {
    // Implementação simplificada - em produção carregar de arquivo
    const protocolPath = `modules/qualification/data/protocol-${protocolId}.json`;
    
    try {
      const response = await fetch(protocolPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Não foi possível carregar protocolo ${protocolId}:`, error);
      return this.getDefaultProtocol(protocolId);
    }
  }

  /**
   * Retorna protocolo padrão se arquivo não estiver disponível
   * @param {string} protocolId - ID do protocolo
   * @returns {Object} Protocolo padrão
   */
  getDefaultProtocol(protocolId) {
    const defaults = {
      endocrinologia: {
        id: 'endocrinologia',
        name: 'Endocrinologia - Diabetes Mellitus tipo 2',
        version: '1.0',
        eligibilityFilters: [],
        alerts: [],
        requiredExams: [],
        questionnaire: { sections: [] }
      },
      cardiologia: {
        id: 'cardiologia',
        name: 'Cardiologia - Hipertensão Arterial Crônica',
        version: '1.0',
        eligibilityFilters: [],
        alerts: [],
        requiredExams: [],
        questionnaire: { sections: [] }
      },
      reumatologia: {
        id: 'reumatologia',
        name: 'Reumatologia - Lúpus, Artrite e Artrose',
        version: '1.0',
        eligibilityFilters: [],
        alerts: [],
        requiredExams: [],
        questionnaire: { sections: [] }
      }
    };

    return defaults[protocolId] || defaults.endocrinologia;
  }

  /**
   * Inicia processo de qualificação
   * @param {string} patientId - ID do paciente
   * @param {string} specialty - Especialidade selecionada
   * @param {Object} consultationData - Dados da consulta
   * @returns {Object} Sessão iniciada
   */
  startQualification(patientId, specialty, consultationData = {}) {
    if (!this.protocols[specialty]) {
      throw new Error(`Protocolo não encontrado para especialidade: ${specialty}`);
    }

    // Iniciar sessão no módulo
    const session = this.module.startQualificationSession(
      patientId,
      specialty,
      consultationData
    );

    // Criar motor de elegibilidade
    this.currentEngine = new EligibilityEngine(this.protocols[specialty]);

    // Extrair dados da consulta e mapear para o questionário
    const prefilledResponses = this.extractAndMapConsultationData(
      consultationData,
      this.protocols[specialty].questionnaire
    );

    return {
      sessionId: session.id,
      specialty: specialty,
      questionnaire: this.protocols[specialty].questionnaire,
      consultationData: consultationData,
      prefilledResponses: prefilledResponses,
      autoPopulatedFields: DataExtractor.getAutoPopulatedFields(
        prefilledResponses,
        this.protocols[specialty].questionnaire
      )
    };
  }

  /**
   * Extrai dados da consulta e mapeia para o questionário
   * @param {Object} consultationData - Dados da consulta
   * @param {Object} questionnaire - Estrutura do questionário
   * @returns {Object} Respostas pré-preenchidas
   */
  extractAndMapConsultationData(consultationData, questionnaire) {
    try {
      // Extrair dados da consulta
      const extractedData = DataExtractor.extractConsultationData(consultationData);
      
      // Mapear para respostas do questionário
      const prefilledResponses = DataExtractor.mapDataToQuestionnaire(
        extractedData,
        questionnaire
      );

      console.log('✅ Dados da consulta extraídos e mapeados com sucesso');
      console.log('Campos pré-preenchidos:', Object.keys(prefilledResponses).length);

      return prefilledResponses;
    } catch (error) {
      console.error('Erro ao extrair e mapear dados da consulta:', error);
      return {};
    }
  }

  /**
   * Salva resposta do questionário
   * @param {string} questionId - ID da pergunta
   * @param {*} response - Resposta do usuário
   * @returns {boolean} True se salvo com sucesso
   */
  saveResponse(questionId, response) {
    try {
      // Validar resposta
      const question = this.findQuestion(questionId);
      if (question && !Validator.validateResponse(response, question)) {
        console.warn(`Resposta inválida para pergunta ${questionId}`);
        return false;
      }

      // Salvar resposta
      this.module.saveResponse(questionId, response);
      return true;
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
      return false;
    }
  }

  /**
   * Encontra pergunta no questionário atual
   * @param {string} questionId - ID da pergunta
   * @returns {Object|null} Pergunta ou null
   */
  findQuestion(questionId) {
    if (!this.module.currentSession) return null;

    const protocol = this.protocols[this.module.currentSession.specialty];
    if (!protocol || !protocol.questionnaire) return null;

    for (const section of protocol.questionnaire.sections) {
      for (const question of section.questions) {
        if (question.id === questionId) {
          return question;
        }
      }
    }

    return null;
  }

  /**
   * Recupera sessão anterior se existir
   * @param {string} patientId - ID do paciente
   * @returns {Object|null} Sessão anterior ou null
   */
  recoverSession(patientId) {
    const session = this.module.recoverSession(patientId);
    
    if (session) {
      // Recriar motor de elegibilidade
      this.currentEngine = new EligibilityEngine(
        this.protocols[session.specialty]
      );

      return {
        sessionId: session.id,
        specialty: session.specialty,
        questionnaire: this.protocols[session.specialty].questionnaire,
        responses: session.responses
      };
    }

    return null;
  }

  /**
   * Analisa respostas e gera resultado
   * @returns {Object} Resultado da análise
   */
  analyzeQualification() {
    if (!this.module.currentSession || !this.currentEngine) {
      throw new Error('Nenhuma sessão de qualificação ativa');
    }

    // Validar questionário completo
    const protocol = this.protocols[this.module.currentSession.specialty];
    const validation = Validator.validateQuestionnaire(
      this.module.currentSession.responses,
      protocol.questionnaire
    );

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    // Analisar elegibilidade
    const result = this.currentEngine.analyze(this.module.currentSession.responses);

    return {
      success: true,
      result: result
    };
  }

  /**
   * Completa qualificação e gera relatório
   * @returns {Object} Qualificação completa com relatório
   */
  completeQualification() {
    if (!this.module.currentSession || !this.currentEngine) {
      throw new Error('Nenhuma sessão de qualificação ativa');
    }

    // Analisar
    const analysisResult = this.analyzeQualification();
    if (!analysisResult.success) {
      throw new Error('Análise falhou: ' + analysisResult.errors.join(', '));
    }

    // Completar qualificação
    const qualification = this.module.completeQualification(analysisResult.result);

    // Salvar no histórico
    this.historyManager.save(qualification);

    // Gerar relatório
    const protocol = this.protocols[qualification.specialty];
    this.currentReportGenerator = new ReportGenerator(qualification, protocol);

    return {
      qualification: qualification,
      report: {
        html: this.currentReportGenerator.generateHTML(),
        text: this.currentReportGenerator.generateText()
      }
    };
  }

  /**
   * Obtém histórico de qualificações de um paciente
   * @param {string} patientId - ID do paciente
   * @returns {Array<Object>} Histórico de qualificações
   */
  getPatientHistory(patientId) {
    return this.historyManager.getPatientHistory(patientId);
  }

  /**
   * Obtém qualificação específica
   * @param {string} qualificationId - ID da qualificação
   * @returns {Object|null} Qualificação ou null
   */
  getQualification(qualificationId) {
    return this.historyManager.getQualification(qualificationId);
  }

  /**
   * Gera relatório para qualificação existente
   * @param {string} qualificationId - ID da qualificação
   * @returns {Object} Relatório
   */
  generateReport(qualificationId) {
    const qualification = this.historyManager.getQualification(qualificationId);
    if (!qualification) {
      throw new Error(`Qualificação não encontrada: ${qualificationId}`);
    }

    const protocol = this.protocols[qualification.specialty];
    const generator = new ReportGenerator(qualification, protocol);

    return {
      html: generator.generateHTML(),
      text: generator.generateText(),
      downloadUrl: generator.getDownloadUrl('html')
    };
  }

  /**
   * Exporta relatório para download
   * @param {string} qualificationId - ID da qualificação
   * @param {string} format - Formato: 'html', 'txt', 'pdf'
   * @returns {Object} Informações de download
   */
  exportReport(qualificationId, format = 'html') {
    const qualification = this.historyManager.getQualification(qualificationId);
    if (!qualification) {
      throw new Error(`Qualificação não encontrada: ${qualificationId}`);
    }

    const protocol = this.protocols[qualification.specialty];
    const generator = new ReportGenerator(qualification, protocol);

    return generator.getDownloadUrl(format);
  }

  /**
   * Obtém estatísticas do sistema
   * @returns {Object} Estatísticas
   */
  getStatistics() {
    const historyStats = this.historyManager.getStatistics();
    
    return {
      totalQualifications: historyStats.totalQualifications,
      byStatus: historyStats.byStatus,
      bySpecialty: historyStats.bySpecialty,
      byPatient: historyStats.byPatient,
      dateRange: historyStats.dateRange,
      protocolsLoaded: Object.keys(this.protocols).length
    };
  }

  /**
   * Valida integridade dos dados
   * @returns {Object} Resultado da validação
   */
  validateIntegrity() {
    const moduleValidation = this.module.validateDataIntegrity();
    const historyValidation = this.historyManager.validate();

    return {
      module: moduleValidation,
      history: historyValidation,
      overall: moduleValidation.valid && historyValidation.valid
    };
  }

  /**
   * Limpa dados corrompidos
   */
  cleanCorruptedData() {
    this.module.clearCorruptedData();
    this.historyManager.cleanCorruptedData();
  }

  /**
   * Exporta todos os dados
   * @returns {Object} Dados exportados
   */
  exportData() {
    return {
      qualifications: this.historyManager.qualifications,
      auditLogs: this.module.auditLogs,
      statistics: this.getStatistics(),
      exportDate: new Date().toISOString()
    };
  }

  /**
   * Importa dados
   * @param {Object} data - Dados a importar
   * @returns {boolean} True se importado com sucesso
   */
  importData(data) {
    try {
      if (data.qualifications && Array.isArray(data.qualifications)) {
        data.qualifications.forEach(q => this.historyManager.save(q));
      }

      return true;
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return false;
    }
  }

  /**
   * Obtém informações sobre especialidades disponíveis
   * @returns {Array<Object>} Especialidades
   */
  getAvailableSpecialties() {
    return [
      {
        id: 'endocrinologia',
        name: 'Endocrinologia',
        description: 'Diabetes Mellitus tipo 2',
        icon: '🩺'
      },
      {
        id: 'cardiologia',
        name: 'Cardiologia',
        description: 'Hipertensão Arterial Crônica',
        icon: '❤️'
      },
      {
        id: 'reumatologia',
        name: 'Reumatologia',
        description: 'Lúpus, Artrite e Artrose',
        icon: '🦴'
      }
    ];
  }

  /**
   * Obtém informações sobre protocolo
   * @param {string} specialtyId - ID da especialidade
   * @returns {Object} Informações do protocolo
   */
  getProtocolInfo(specialtyId) {
    const protocol = this.protocols[specialtyId];
    if (!protocol) {
      return null;
    }

    return {
      id: protocol.id,
      name: protocol.name,
      version: protocol.version,
      totalFilters: (protocol.eligibilityFilters || []).length,
      totalAlerts: (protocol.alerts || []).length,
      totalExams: (protocol.requiredExams || []).length,
      totalQuestions: (protocol.questionnaire?.sections || []).reduce(
        (sum, section) => sum + (section.questions?.length || 0),
        0
      )
    };
  }
}

// ============================================================================
// INSTÂNCIA GLOBAL
// ============================================================================

// Criar instância global do módulo
let qualificationSystem = null;

/**
 * Inicializa o sistema de qualificação
 * @returns {Promise<QualificationIntegration>} Sistema inicializado
 */
async function initializeQualificationSystem() {
  if (!qualificationSystem) {
    qualificationSystem = new QualificationIntegration();
    // Aguardar a inicialização completa
    await qualificationSystem.initPromise;
  }
  return qualificationSystem;
}

/**
 * Obtém instância do sistema de qualificação
 * @returns {QualificationIntegration} Sistema de qualificação
 */
function getQualificationSystem() {
  if (!qualificationSystem) {
    throw new Error('Sistema de qualificação não inicializado. Chame initializeQualificationSystem() primeiro.');
  }
  return qualificationSystem;
}

// ============================================================================
// EXPORTAR CLASSES E FUNÇÕES
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QualificationIntegration,
    initializeQualificationSystem,
    getQualificationSystem
  };
}
