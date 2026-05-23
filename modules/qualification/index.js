/**
 * Índice do Módulo - Qualificador de Encaminhamentos Médicos
 * 
 * Arquivo central que exporta todas as classes e funcionalidades do módulo.
 * Facilita a importação e uso do módulo em outras partes da aplicação.
 */

// ============================================================================
// IMPORTAR TIPOS
// ============================================================================

// Tipos e constantes (JSDoc)
// Importar types.js para ter acesso aos tipos

// ============================================================================
// IMPORTAR MODELOS DE DADOS
// ============================================================================

// Classes de modelos (data-models.js)
// Specialty, Question, QuestionnaireSection, Questionnaire, Response, 
// QualificationResult, Qualification, AuditLog

// ============================================================================
// IMPORTAR CAMADA DE PERSISTÊNCIA
// ============================================================================

// PersistenceManager, SessionStorage (persistence.js)

// ============================================================================
// IMPORTAR MÓDULO PRINCIPAL
// ============================================================================

// QualificationModule, Validator, StorageManager (qualification.js)

// ============================================================================
// EXPORTAR TUDO
// ============================================================================

/**
 * Objeto que agrupa todas as funcionalidades do módulo
 */
const QualificationModuleExports = {
  // ========================================================================
  // MODELOS DE DADOS
  // ========================================================================
  
  /**
   * Specialty - Representa uma especialidade médica
   * @type {typeof Specialty}
   */
  Specialty: typeof Specialty !== 'undefined' ? Specialty : null,
  
  /**
   * Question - Representa uma pergunta do questionário
   * @type {typeof Question}
   */
  Question: typeof Question !== 'undefined' ? Question : null,
  
  /**
   * QuestionnaireSection - Agrupa perguntas em seções
   * @type {typeof QuestionnaireSection}
   */
  QuestionnaireSection: typeof QuestionnaireSection !== 'undefined' ? QuestionnaireSection : null,
  
  /**
   * Questionnaire - Questionário completo
   * @type {typeof Questionnaire}
   */
  Questionnaire: typeof Questionnaire !== 'undefined' ? Questionnaire : null,
  
  /**
   * Response - Resposta do usuário
   * @type {typeof Response}
   */
  Response: typeof Response !== 'undefined' ? Response : null,
  
  /**
   * QualificationResult - Resultado da análise
   * @type {typeof QualificationResult}
   */
  QualificationResult: typeof QualificationResult !== 'undefined' ? QualificationResult : null,
  
  /**
   * Qualification - Qualificação completa
   * @type {typeof Qualification}
   */
  Qualification: typeof Qualification !== 'undefined' ? Qualification : null,
  
  /**
   * AuditLog - Registro de auditoria
   * @type {typeof AuditLog}
   */
  AuditLog: typeof AuditLog !== 'undefined' ? AuditLog : null,

  // ========================================================================
  // CAMADA DE PERSISTÊNCIA
  // ========================================================================
  
  /**
   * PersistenceManager - Gerencia localStorage
   * @type {typeof PersistenceManager}
   */
  PersistenceManager: typeof PersistenceManager !== 'undefined' ? PersistenceManager : null,
  
  /**
   * SessionStorage - Gerencia sessionStorage
   * @type {typeof SessionStorage}
   */
  SessionStorage: typeof SessionStorage !== 'undefined' ? SessionStorage : null,

  // ========================================================================
  // MÓDULO PRINCIPAL
  // ========================================================================
  
  /**
   * QualificationModule - Orquestrador principal
   * @type {typeof QualificationModule}
   */
  QualificationModule: typeof QualificationModule !== 'undefined' ? QualificationModule : null,
  
  /**
   * Validator - Validação de dados
   * @type {typeof Validator}
   */
  Validator: typeof Validator !== 'undefined' ? Validator : null,
  
  /**
   * StorageManager - Gerenciamento de armazenamento
   * @type {typeof StorageManager}
   */
  StorageManager: typeof StorageManager !== 'undefined' ? StorageManager : null,

  // ========================================================================
  // CONSTANTES E ENUMS
  // ========================================================================
  
  /**
   * Status de Qualificação
   */
  QualificationStatus: {
    QUALIFIED: 'QUALIFICADO',
    NOT_QUALIFIED: 'NAO_QUALIFICADO',
    URGENCY: 'URGENCIA',
    QUALIFIED_WITH_CAVEATS: 'QUALIFICADO_COM_RESSALVAS'
  },

  /**
   * Tipos de Pergunta
   */
  QuestionType: {
    BOOLEAN: 'boolean',
    TEXT: 'text',
    NUMBER: 'number',
    SELECT: 'select',
    EXAM_STATUS: 'exam_status'
  },

  /**
   * Tipos de Filtro
   */
  FilterType: {
    ALERT_TRIGGER: 'alert_trigger',
    QUALIFICATION_CRITERIA: 'qualification_criteria'
  },

  /**
   * Lógica de Filtro
   */
  FilterLogic: {
    IF_YES_THEN_URGENCY: 'if_yes_then_urgency',
    IF_YES_THEN_QUALIFIED: 'if_yes_then_qualified',
    IF_NO_THEN_NOT_QUALIFIED: 'if_no_then_not_qualified'
  },

  /**
   * Severidade de Alerta
   */
  AlertSeverity: {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
  },

  /**
   * Status de Exame
   */
  ExamStatus: {
    NOT_PERFORMED: 'Não Realizado',
    PERFORMED: 'Realizado',
    RESULT_AVAILABLE: 'Resultado Disponível'
  },

  /**
   * Ações de Auditoria
   */
  AuditAction: {
    SESSION_STARTED: 'QUALIFICATION_SESSION_STARTED',
    SESSION_ABANDONED: 'QUALIFICATION_SESSION_ABANDONED',
    RESPONSE_SAVED: 'RESPONSE_SAVED',
    ANALYSIS_COMPLETED: 'ANALYSIS_COMPLETED',
    QUALIFICATION_COMPLETED: 'QUALIFICATION_COMPLETED',
    REPORT_GENERATED: 'REPORT_GENERATED',
    REPORT_DOWNLOADED: 'REPORT_DOWNLOADED',
    REPORT_PRINTED: 'REPORT_PRINTED'
  },

  // ========================================================================
  // FUNÇÕES AUXILIARES
  // ========================================================================

  /**
   * Inicializa o módulo de qualificação
   * @returns {Promise<QualificationModule>} Módulo inicializado
   */
  async initialize() {
    if (typeof QualificationModule === 'undefined') {
      throw new Error('QualificationModule não está carregado');
    }
    
    const module = new QualificationModule();
    await module.initPromise;
    return module;
  },

  /**
   * Cria uma instância de PersistenceManager
   * @param {string} prefix - Prefixo de armazenamento
   * @returns {PersistenceManager} Gerenciador de persistência
   */
  createPersistenceManager(prefix = 'qualification_') {
    if (typeof PersistenceManager === 'undefined') {
      throw new Error('PersistenceManager não está carregado');
    }
    return new PersistenceManager(prefix);
  },

  /**
   * Cria uma instância de SessionStorage
   * @param {string} prefix - Prefixo de armazenamento
   * @returns {SessionStorage} Gerenciador de sessão
   */
  createSessionStorage(prefix = 'qualification_session_') {
    if (typeof SessionStorage === 'undefined') {
      throw new Error('SessionStorage não está carregado');
    }
    return new SessionStorage(prefix);
  },

  /**
   * Cria uma nova especialidade
   * @param {string} id - ID da especialidade
   * @param {string} name - Nome
   * @param {string} description - Descrição
   * @param {string} icon - Ícone
   * @returns {Specialty} Especialidade criada
   */
  createSpecialty(id, name, description, icon = '🩺') {
    if (typeof Specialty === 'undefined') {
      throw new Error('Specialty não está carregado');
    }
    return new Specialty(id, name, description, icon);
  },

  /**
   * Cria uma nova pergunta
   * @param {string} id - ID da pergunta
   * @param {string} text - Texto
   * @param {string} type - Tipo
   * @param {boolean} required - Obrigatória
   * @param {Array} options - Opções
   * @param {string} prefilledFrom - Caminho para pré-preenchimento
   * @param {string} hint - Dica
   * @returns {Question} Pergunta criada
   */
  createQuestion(id, text, type, required = true, options = null, prefilledFrom = null, hint = null) {
    if (typeof Question === 'undefined') {
      throw new Error('Question não está carregado');
    }
    return new Question(id, text, type, required, options, prefilledFrom, hint);
  },

  /**
   * Cria um novo resultado de qualificação
   * @param {string} status - Status
   * @param {string} justification - Justificativa
   * @param {Array} alerts - Alertas
   * @param {Array} missingExams - Exames faltantes
   * @param {string} recommendations - Recomendações
   * @returns {QualificationResult} Resultado criado
   */
  createQualificationResult(status, justification = '', alerts = [], missingExams = [], recommendations = '') {
    if (typeof QualificationResult === 'undefined') {
      throw new Error('QualificationResult não está carregado');
    }
    return new QualificationResult(status, justification, alerts, missingExams, recommendations);
  },

  /**
   * Valida uma resposta
   * @param {*} response - Resposta
   * @param {Question} question - Pergunta
   * @returns {boolean} True se válida
   */
  validateResponse(response, question) {
    if (typeof Validator === 'undefined') {
      throw new Error('Validator não está carregado');
    }
    return Validator.validateResponse(response, question);
  },

  /**
   * Sanitiza entrada do usuário
   * @param {string} input - Entrada
   * @returns {string} Entrada sanitizada
   */
  sanitizeInput(input) {
    if (typeof Validator === 'undefined') {
      throw new Error('Validator não está carregado');
    }
    return Validator.sanitizeInput(input);
  },

  /**
   * Obtém informações de versão do módulo
   * @returns {Object} Informações de versão
   */
  getVersion() {
    return {
      name: 'Qualificador de Encaminhamentos Médicos',
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      author: 'E-Transcriber+ Team',
      description: 'Módulo para qualificação de pacientes para encaminhamento a especialistas'
    };
  },

  /**
   * Obtém informações de compatibilidade
   * @returns {Object} Informações de compatibilidade
   */
  getCompatibility() {
    return {
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      JSON: typeof JSON !== 'undefined',
      Promise: typeof Promise !== 'undefined',
      fetch: typeof fetch !== 'undefined'
    };
  },

  /**
   * Verifica se o navegador é compatível
   * @returns {boolean} True se compatível
   */
  isCompatible() {
    const compat = this.getCompatibility();
    return Object.values(compat).every(v => v === true);
  }
};

// ============================================================================
// EXPORTAR
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QualificationModuleExports;
}

// Disponibilizar globalmente se em navegador
if (typeof window !== 'undefined') {
  window.QualificationModule = QualificationModuleExports;
}
