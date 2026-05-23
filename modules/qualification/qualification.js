/**
 * Qualificador de Encaminhamentos Médicos
 * Módulo principal para qualificação de pacientes para encaminhamento a especialistas
 * 
 * Implementa protocolos clínicos validados para:
 * - Endocrinologia (Diabetes Mellitus tipo 2)
 * - Cardiologia (Hipertensão Arterial Crônica)
 * - Reumatologia (Lúpus, Artrite, Artrose)
 */

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

/**
 * @typedef {Object} Protocol
 * @property {string} id - Identificador único do protocolo
 * @property {string} name - Nome do protocolo
 * @property {string} version - Versão do protocolo
 * @property {Array<EligibilityFilter>} eligibilityFilters - Filtros de elegibilidade
 * @property {Array<Alert>} alerts - Sinais de alerta
 * @property {Array<RequiredExam>} requiredExams - Exames obrigatórios
 */

/**
 * @typedef {Object} EligibilityFilter
 * @property {string} id - Identificador único
 * @property {string} question - Texto da pergunta
 * @property {string} type - Tipo: 'alert_trigger' ou 'qualification_criteria'
 * @property {string} logic - Lógica: 'if_yes_then_urgency', 'if_yes_then_qualified', 'if_no_then_not_qualified'
 */

/**
 * @typedef {Object} Alert
 * @property {string} id - Identificador único
 * @property {string} name - Nome do alerta
 * @property {Array<string>} conditions - Condições que disparam o alerta
 * @property {string} recommendation - Recomendação de ação
 */

/**
 * @typedef {Object} RequiredExam
 * @property {string} id - Identificador único
 * @property {string} name - Nome do exame
 * @property {number} maxAgeDays - Idade máxima do exame em dias
 */

/**
 * @typedef {Object} Qualification
 * @property {string} id - Identificador único
 * @property {string} patientId - ID do paciente
 * @property {string} specialty - Especialidade
 * @property {Object} responses - Respostas do questionário
 * @property {Object} result - Resultado da análise
 * @property {Object} metadata - Metadados da qualificação
 * @property {Object} auditTrail - Trilha de auditoria
 */

// ============================================================================
// CLASSE: QualificationModule
// ============================================================================

class QualificationModule {
  constructor() {
    this.protocols = {};
    this.qualifications = [];
    this.auditLogs = [];
    this.currentSession = null;
    this.storagePrefix = 'qualification_';
    
    // Inicializar de forma assíncrona
    this.initPromise = this.initialize();
  }

  /**
   * Inicializa o módulo carregando protocolos e dados persistidos
   */
  async initialize() {
    await this.loadProtocols();
    this.loadQualifications();
    this.loadAuditLogs();
  }

  /**
   * Carrega protocolos clínicos
   */
  async loadProtocols() {
    try {
      // Carregar protocolos do localStorage primeiro
      const stored = localStorage.getItem(`${this.storagePrefix}protocols`);
      if (stored) {
        this.protocols = JSON.parse(stored);
        console.log('✅ Protocolos carregados do localStorage');
        return;
      }
      
      // Se não estiver em localStorage, carregar dos arquivos JSON
      console.log('🔄 Carregando protocolos dos arquivos JSON...');
      
      const protocolFiles = {
        endocrinologia: './modules/qualification/data/protocol-endocrinologia.json',
        cardiologia: './modules/qualification/data/protocol-cardiologia.json',
        reumatologia: './modules/qualification/data/protocol-reumatologia.json'
      };
      
      this.protocols = {};
      
      for (const [specialty, filePath] of Object.entries(protocolFiles)) {
        try {
          const response = await fetch(filePath);
          if (!response.ok) {
            console.warn(`⚠️ Protocolo não encontrado: ${filePath} (HTTP ${response.status})`);
            this.protocols[specialty] = null;
            continue;
          }
          
          const protocol = await response.json();
          this.protocols[specialty] = protocol;
          console.log(`✅ Protocolo carregado: ${specialty}`);
        } catch (error) {
          console.error(`❌ Erro ao carregar protocolo ${specialty}:`, error);
          this.protocols[specialty] = null;
        }
      }
      
      // Salvar em localStorage para próximas vezes
      localStorage.setItem(`${this.storagePrefix}protocols`, JSON.stringify(this.protocols));
      console.log('✅ Protocolos salvos em localStorage');
      
    } catch (error) {
      console.error('❌ Erro ao carregar protocolos:', error);
      // Inicializar com valores padrão
      this.protocols = {
        endocrinologia: null,
        cardiologia: null,
        reumatologia: null
      };
    }
  }

  /**
   * Carrega qualificações do localStorage
   */
  loadQualifications() {
    try {
      const stored = localStorage.getItem(`${this.storagePrefix}qualifications`);
      this.qualifications = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao carregar qualificações:', error);
      this.qualifications = [];
    }
  }

  /**
   * Carrega logs de auditoria do localStorage
   */
  loadAuditLogs() {
    try {
      const stored = localStorage.getItem(`${this.storagePrefix}audit_logs`);
      this.auditLogs = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao carregar logs de auditoria:', error);
      this.auditLogs = [];
    }
  }

  /**
   * Inicia uma nova sessão de qualificação
   * @param {string} patientId - ID do paciente
   * @param {string} specialty - Especialidade selecionada
   * @param {Object} consultationData - Dados da consulta para pré-preenchimento
   * @returns {Object} Sessão iniciada
   */
  startQualificationSession(patientId, specialty, consultationData = {}) {
    if (!this.protocols[specialty]) {
      throw new Error(`Protocolo não encontrado para especialidade: ${specialty}`);
    }

    this.currentSession = {
      id: `session_${Date.now()}`,
      patientId,
      specialty,
      consultationData,
      responses: {},
      startedAt: Date.now(),
      status: 'IN_PROGRESS'
    };

    this.logAuditEvent('QUALIFICATION_SESSION_STARTED', {
      sessionId: this.currentSession.id,
      patientId,
      specialty
    });

    return this.currentSession;
  }

  /**
   * Salva uma resposta na sessão atual
   * @param {string} questionId - ID da pergunta
   * @param {*} response - Resposta do usuário
   */
  saveResponse(questionId, response) {
    if (!this.currentSession) {
      throw new Error('Nenhuma sessão de qualificação ativa');
    }

    this.currentSession.responses[questionId] = response;
    this.persistSessionState();
  }

  /**
   * Persiste o estado da sessão atual em localStorage
   */
  persistSessionState() {
    if (!this.currentSession) return;

    const key = `${this.storagePrefix}session_${this.currentSession.patientId}`;
    localStorage.setItem(key, JSON.stringify(this.currentSession));
  }

  /**
   * Recupera sessão anterior se existir
   * @param {string} patientId - ID do paciente
   * @returns {Object|null} Sessão anterior ou null
   */
  recoverSession(patientId) {
    const key = `${this.storagePrefix}session_${patientId}`;
    const stored = localStorage.getItem(key);
    
    if (stored) {
      try {
        this.currentSession = JSON.parse(stored);
        return this.currentSession;
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Completa a sessão atual e salva a qualificação
   * @param {Object} result - Resultado da análise
   * @returns {Qualification} Qualificação salva
   */
  completeQualification(result) {
    if (!this.currentSession) {
      throw new Error('Nenhuma sessão de qualificação ativa');
    }

    const qualification = {
      id: `qual_${Date.now()}`,
      patientId: this.currentSession.patientId,
      specialty: this.currentSession.specialty,
      responses: this.currentSession.responses,
      result,
      metadata: {
        createdAt: Date.now(),
        consultationData: this.currentSession.consultationData
      },
      auditTrail: {
        timestamp: Date.now(),
        userId: this.getCurrentUserId(),
        action: 'QUALIFICATION_COMPLETED',
        ipAddress: this.getClientIpAddress(),
        userAgent: navigator.userAgent,
        dataHash: this.hashData(this.currentSession.responses)
      }
    };

    this.qualifications.push(qualification);
    this.persistQualifications();

    this.logAuditEvent('QUALIFICATION_COMPLETED', {
      qualificationId: qualification.id,
      patientId: qualification.patientId,
      specialty: qualification.specialty,
      result: result.status
    });

    // Limpar sessão
    const sessionKey = `${this.storagePrefix}session_${this.currentSession.patientId}`;
    localStorage.removeItem(sessionKey);
    this.currentSession = null;

    return qualification;
  }

  /**
   * Persiste qualificações em localStorage
   */
  persistQualifications() {
    localStorage.setItem(
      `${this.storagePrefix}qualifications`,
      JSON.stringify(this.qualifications)
    );
  }

  /**
   * Obtém histórico de qualificações de um paciente
   * @param {string} patientId - ID do paciente
   * @returns {Array<Qualification>} Qualificações do paciente
   */
  getPatientQualificationHistory(patientId) {
    return this.qualifications
      .filter(q => q.patientId === patientId)
      .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
  }

  /**
   * Obtém uma qualificação específica
   * @param {string} qualificationId - ID da qualificação
   * @returns {Qualification|null} Qualificação ou null
   */
  getQualification(qualificationId) {
    return this.qualifications.find(q => q.id === qualificationId) || null;
  }

  /**
   * Registra um evento de auditoria
   * @param {string} action - Ação realizada
   * @param {Object} details - Detalhes do evento
   */
  logAuditEvent(action, details = {}) {
    const auditLog = {
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
      action,
      details,
      ipAddress: this.getClientIpAddress(),
      userAgent: navigator.userAgent,
      status: 'SUCCESS'
    };

    this.auditLogs.push(auditLog);
    this.persistAuditLogs();
  }

  /**
   * Persiste logs de auditoria em localStorage
   */
  persistAuditLogs() {
    localStorage.setItem(
      `${this.storagePrefix}audit_logs`,
      JSON.stringify(this.auditLogs)
    );
  }

  /**
   * Obtém ID do usuário atual
   * @returns {string} ID do usuário
   */
  getCurrentUserId() {
    // Será integrado com sistema de autenticação da plataforma
    return localStorage.getItem('current_user_id') || 'anonymous';
  }

  /**
   * Obtém endereço IP do cliente
   * @returns {string} Endereço IP
   */
  getClientIpAddress() {
    // Será obtido do servidor em produção
    return 'local';
  }

  /**
   * Gera hash dos dados para integridade
   * @param {Object} data - Dados a hashear
   * @returns {string} Hash dos dados
   */
  hashData(data) {
    // Implementação simplificada
    return btoa(JSON.stringify(data)).substring(0, 32);
  }

  /**
   * Valida integridade dos dados armazenados
   * @returns {Object} Resultado da validação
   */
  validateDataIntegrity() {
    const errors = [];

    // Validar qualificações
    this.qualifications.forEach(q => {
      if (!q.id || !q.patientId || !q.specialty) {
        errors.push(`Qualificação inválida: ${q.id}`);
      }
    });

    // Validar logs de auditoria
    this.auditLogs.forEach(log => {
      if (!log.id || !log.timestamp || !log.action) {
        errors.push(`Log de auditoria inválido: ${log.id}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Limpa dados corrompidos com segurança
   */
  clearCorruptedData() {
    const validation = this.validateDataIntegrity();
    
    if (!validation.valid) {
      console.warn('Dados corrompidos detectados:', validation.errors);
      
      // Manter apenas dados válidos
      this.qualifications = this.qualifications.filter(q => 
        q.id && q.patientId && q.specialty
      );
      
      this.auditLogs = this.auditLogs.filter(log => 
        log.id && log.timestamp && log.action
      );
      
      this.persistQualifications();
      this.persistAuditLogs();
    }
  }
}

// ============================================================================
// CLASSE: Validator
// ============================================================================

class Validator {
  /**
   * Valida uma resposta contra a definição da pergunta
   * @param {*} response - Resposta do usuário
   * @param {Object} question - Definição da pergunta
   * @returns {boolean} True se válido
   */
  static validateResponse(response, question) {
    const isEmpty = response === null || response === undefined || response === '';
    
    if (isEmpty) {
      return !question.required;
    }

    switch (question.type) {
      case 'boolean':
        return typeof response === 'boolean';
      
      case 'number':
        const num = parseFloat(response);
        return !isNaN(num) && num >= 0;
      
      case 'text':
        return typeof response === 'string' && response.trim().length > 0;
      
      case 'select':
        return question.options && question.options.includes(response);
      
      case 'exam_status':
        return ['Não Realizado', 'Realizado', 'Resultado Disponível'].includes(response);
      
      default:
        return false;
    }
  }

  /**
   * Valida um questionário completo
   * @param {Object} responses - Respostas do usuário
   * @param {Object} questionnaire - Definição do questionário
   * @returns {Object} Resultado da validação
   */
  static validateQuestionnaire(responses, questionnaire) {
    const errors = [];
    const warnings = [];

    questionnaire.sections.forEach(section => {
      section.questions.forEach(question => {
        const response = responses[question.id];
        
        if (question.required && !response) {
          errors.push(`Campo obrigatório não preenchido: ${question.text}`);
        } else if (response && !this.validateResponse(response, question)) {
          errors.push(`Resposta inválida para: ${question.text}`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitiza entrada de usuário para prevenir XSS
   * @param {string} input - Entrada do usuário
   * @returns {string} Entrada sanitizada
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  /**
   * Valida tipo de dado
   * @param {*} value - Valor a validar
   * @param {string} expectedType - Tipo esperado
   * @returns {boolean} True se válido
   */
  static validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null;
      default:
        return false;
    }
  }
}

// ============================================================================
// CLASSE: StorageManager
// ============================================================================

class StorageManager {
  constructor(prefix = 'qualification_') {
    this.prefix = prefix;
    this.maxStorageSize = 5 * 1024 * 1024; // 5MB
    this._keys = new Set(); // Track keys internally to avoid Object.keys(localStorage) issues
  }

  /**
   * Salva dados no localStorage
   * @param {string} key - Chave
   * @param {*} value - Valor
   * @returns {boolean} True se salvo com sucesso
   */
  save(key, value) {
    try {
      const serialized = JSON.stringify(value);
      const stored = serialized === undefined ? 'null' : serialized;

      // Verificar tamanho
      if (stored.length > this.maxStorageSize) {
        console.warn('Dados muito grandes para armazenar');
        return false;
      }

      localStorage.setItem(`${this.prefix}${key}`, stored);
      this._keys.add(key);
      return true;
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      return false;
    }
  }

  /**
   * Carrega dados do localStorage
   * @param {string} key - Chave
   * @param {*} defaultValue - Valor padrão se não encontrado
   * @returns {*} Valor armazenado ou padrão
   */
  load(key, defaultValue = null) {
    try {
      const stored = localStorage.getItem(`${this.prefix}${key}`);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      return defaultValue;
    }
  }

  /**
   * Remove dados do localStorage
   * @param {string} key - Chave
   * @returns {boolean} True se removido
   */
  remove(key) {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
      this._keys.delete(key);
      return true;
    } catch (error) {
      console.error('Erro ao remover dados:', error);
      return false;
    }
  }

  /**
   * Limpa todos os dados do módulo
   */
  clear() {
    try {
      this._keys.forEach(key => {
        localStorage.removeItem(`${this.prefix}${key}`);
      });
      this._keys.clear();
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
    }
  }

  /**
   * Obtém tamanho total dos dados armazenados
   * @returns {number} Tamanho em bytes
   */
  getStorageSize() {
    let size = 0;

    this._keys.forEach(key => {
      const val = localStorage.getItem(`${this.prefix}${key}`);
      if (val !== null) {
        size += val.length;
      }
    });

    return size;
  }
}

// ============================================================================
// EXPORTAR CLASSES
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QualificationModule,
    Validator,
    StorageManager
  };
}
