/**
 * Modelos de Dados
 * Qualificador de Encaminhamentos Médicos
 * 
 * Define as classes e estruturas de dados para o módulo de qualificação.
 * Implementa validação, serialização e métodos de manipulação de dados.
 */

// ============================================================================
// CLASSE: Specialty
// ============================================================================

/**
 * Representa uma especialidade médica
 */
class Specialty {
  constructor(id, name, description, icon = '🩺') {
    this.id = id;
    this.name = name;
    this.description = description;
    this.icon = icon;
  }

  /**
   * Valida a especialidade
   * @returns {boolean} True se válida
   */
  validate() {
    return this.id && this.name && this.description;
  }

  /**
   * Converte para objeto simples
   * @returns {Object} Objeto serializado
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      icon: this.icon
    };
  }

  /**
   * Cria instância a partir de objeto
   * @param {Object} data - Dados
   * @returns {Specialty} Instância criada
   */
  static fromJSON(data) {
    return new Specialty(data.id, data.name, data.description, data.icon);
  }
}

// ============================================================================
// CLASSE: Question
// ============================================================================

/**
 * Representa uma pergunta do questionário
 */
class Question {
  constructor(id, text, type, required = true, options = null, prefilledFrom = null, hint = null) {
    this.id = id;
    this.text = text;
    this.type = type; // 'boolean', 'text', 'number', 'select', 'exam_status'
    this.required = required;
    this.options = options;
    this.prefilledFrom = prefilledFrom;
    this.hint = hint;
  }

  /**
   * Valida a pergunta
   * @returns {boolean} True se válida
   */
  validate() {
    if (!this.id || !this.text || !this.type) return false;
    
    const validTypes = ['boolean', 'text', 'number', 'select', 'exam_status'];
    if (!validTypes.includes(this.type)) return false;
    
    if (this.type === 'select' && (!this.options || this.options.length === 0)) {
      return false;
    }
    
    return true;
  }

  /**
   * Valida uma resposta para esta pergunta
   * @param {*} response - Resposta a validar
   * @returns {boolean} True se válida
   */
  validateResponse(response) {
    if (this.required && (response === null || response === undefined || response === '')) {
      return false;
    }

    switch (this.type) {
      case 'boolean':
        return typeof response === 'boolean';
      
      case 'number':
        const num = parseFloat(response);
        return !isNaN(num) && num >= 0;
      
      case 'text':
        return typeof response === 'string' && response.trim().length > 0;
      
      case 'select':
        return this.options && this.options.includes(response);
      
      case 'exam_status':
        return ['Não Realizado', 'Realizado', 'Resultado Disponível'].includes(response);
      
      default:
        return false;
    }
  }

  /**
   * Converte para objeto simples
   * @returns {Object} Objeto serializado
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      type: this.type,
      required: this.required,
      options: this.options,
      prefilledFrom: this.prefilledFrom,
      hint: this.hint
    };
  }

  /**
   * Cria instância a partir de objeto
   * @param {Object} data - Dados
   * @returns {Question} Instância criada
   */
  static fromJSON(data) {
    return new Question(
      data.id,
      data.text,
      data.type,
      data.required,
      data.options,
      data.prefilledFrom,
      data.hint
    );
  }
}

// ============================================================================
// CLASSE: QuestionnaireSection
// ============================================================================

/**
 * Representa uma seção do questionário
 */
class QuestionnaireSection {
  constructor(id, title, description = '', questions = []) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.questions = questions;
  }

  /**
   * Adiciona uma pergunta à seção
   * @param {Question} question - Pergunta a adicionar
   */
  addQuestion(question) {
    if (question.validate()) {
      this.questions.push(question);
    }
  }

  /**
   * Obtém pergunta por ID
   * @param {string} questionId - ID da pergunta
   * @returns {Question|null} Pergunta ou null
   */
  getQuestion(questionId) {
    return this.questions.find(q => q.id === questionId) || null;
  }

  /**
   * Valida a seção
   * @returns {boolean} True se válida
   */
  validate() {
    return this.id && this.title && this.questions.length > 0 && 
           this.questions.every(q => q.validate());
  }

  /**
   * Converte para objeto simples
   * @returns {Object} Objeto serializado
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      questions: this.questions.map(q => q.toJSON())
    };
  }

  /**
   * Cria instância a partir de objeto
   * @param {Object} data - Dados
   * @returns {QuestionnaireSection} Instância criada
   */
  static fromJSON(data) {
    const questions = (data.questions || []).map(q => Question.fromJSON(q));
    return new QuestionnaireSection(data.id, data.title, data.description, questions);
  }
}

// ============================================================================
// CLASSE: Questionnaire
// ============================================================================

/**
 * Representa um questionário completo
 */
class Questionnaire {
  constructor(sections = []) {
    this.sections = sections;
  }

  /**
   * Adiciona uma seção ao questionário
   * @param {QuestionnaireSection} section - Seção a adicionar
   */
  addSection(section) {
    if (section.validate()) {
      this.sections.push(section);
    }
  }

  /**
   * Obtém seção por ID
   * @param {string} sectionId - ID da seção
   * @returns {QuestionnaireSection|null} Seção ou null
   */
  getSection(sectionId) {
    return this.sections.find(s => s.id === sectionId) || null;
  }

  /**
   * Obtém pergunta por ID (busca em todas as seções)
   * @param {string} questionId - ID da pergunta
   * @returns {Question|null} Pergunta ou null
   */
  getQuestion(questionId) {
    for (const section of this.sections) {
      const question = section.getQuestion(questionId);
      if (question) return question;
    }
    return null;
  }

  /**
   * Obtém todas as perguntas
   * @returns {Array<Question>} Todas as perguntas
   */
  getAllQuestions() {
    const questions = [];
    this.sections.forEach(section => {
      questions.push(...section.questions);
    });
    return questions;
  }

  /**
   * Valida o questionário
   * @returns {boolean} True se válido
   */
  validate() {
    return this.sections.length > 0 && this.sections.every(s => s.validate());
  }

  /**
   * Converte para objeto simples
   * @returns {Object} Objeto serializado
   */
  toJSON() {
    return {
      sections: this.sections.map(s => s.toJSON())
    };
  }

  /**
   * Cria instância a partir de objeto
   * @param {Object} data - Dados
   * @returns {Questionnaire} Instância criada
   */
  static fromJSON(data) {
    const sections = (data.sections || []).map(s => QuestionnaireSection.fromJSON(s));
    return new Questionnaire(sections);
  }
}

// ============================================================================
// CLASSE: Response
// ============================================================================

/**
 * Representa uma resposta do usuário
 */
class Response {
  constructor(questionId, value, timestamp = null) {
    this.questionId = questionId;
    this.value = value;
    this.timestamp = timestamp || Date.now();
  }

  /**
   * Valida a resposta
   * @param {Question} question - Pergunta associada
   * @returns {boolean} True se válida
   */
  validate(question) {
    return question.validateResponse(this.value);
  }

  /**
   * Converte para objeto simples
   * @returns {Object} Objeto serializado
   */
  toJSON() {
    return {
      questionId: this.questionId,
      value: this.value,
      timestamp: this.timestamp
    };
  }

  /**
   * Cria instância a partir de objeto
   * @param {Object} data - Dados
   * @returns {Response} Instância criada
   */
  static fromJSON(data) {
    return new Response(data.questionId, data.value, data.timestamp);
  }
}

// ============================================================================
// CLASSE: QualificationResult
// ============================================================================

/**
 * Representa o resultado de uma qualificação
 */
class QualificationResult {
  constructor(status, justification = '', alerts = [], missingExams = [], recommendations = '') {
    this.status = status; // 'QUALIFICADO', 'NAO_QUALIFICADO', 'URGENCIA', 'QUALIFICADO_COM_RESSALVAS'
    this.justification = justification;
    this.alerts = alerts;
    this.missingExams = missingExams;
    this.recommendations = recommendations;
    this.timestamp = Date.now();
  }

  /**
   * Valida o resultado
   * @returns {boolean} True se válido
   */
  validate() {
    const validStatuses = ['QUALIFICADO', 'NAO_QUALIFICADO', 'URGENCIA', 'QUALIFICADO_COM_RESSALVAS'];
    return validStatuses.includes(this.status) && this.justification.length > 0;
  }

  /**
   * Converte para objeto simples
   * @returns {Object} Objeto serializado
   */
  toJSON() {
    return {
      status: this.status,
      justification: this.justification,
      alerts: this.alerts,
      missingExams: this.missingExams,
      recommendations: this.recommendations,
      timestamp: this.timestamp
    };
  }

  /**
   * Cria instância a partir de objeto
   * @param {Object} data - Dados
   * @returns {QualificationResult} Instância criada
   */
  static fromJSON(data) {
    return new QualificationResult(
      data.status,
      data.justification,
      data.alerts,
      data.missingExams,
      data.recommendations
    );
  }
}

// ============================================================================
// CLASSE: Qualification
// ============================================================================

/**
 * Representa uma qualificação completa
 */
class Qualification {
  constructor(id, patientId, specialty, responses, result, metadata = {}, auditTrail = {}) {
    this.id = id;
    this.patientId = patientId;
    this.specialty = specialty;
    this.responses = responses;
    this.result = result;
    this.metadata = metadata;
    this.auditTrail = auditTrail;
  }

  /**
   * Valida a qualificação
   * @returns {boolean} True se válida
   */
  validate() {
    return this.id && this.patientId && this.specialty && 
           this.responses && this.result && this.result.validate();
  }

  /**
   * Converte para objeto simples
   * @returns {Object} Objeto serializado
   */
  toJSON() {
    return {
      id: this.id,
      patientId: this.patientId,
      specialty: this.specialty,
      responses: this.responses,
      result: this.result.toJSON(),
      metadata: this.metadata,
      auditTrail: this.auditTrail
    };
  }

  /**
   * Cria instância a partir de objeto
   * @param {Object} data - Dados
   * @returns {Qualification} Instância criada
   */
  static fromJSON(data) {
    const result = QualificationResult.fromJSON(data.result);
    return new Qualification(
      data.id,
      data.patientId,
      data.specialty,
      data.responses,
      result,
      data.metadata,
      data.auditTrail
    );
  }
}

// ============================================================================
// CLASSE: AuditLog
// ============================================================================

/**
 * Representa um registro de auditoria
 */
class AuditLog {
  constructor(id, timestamp, userId, action, details = {}, ipAddress = 'local', userAgent = '', status = 'SUCCESS') {
    this.id = id;
    this.timestamp = timestamp;
    this.userId = userId;
    this.action = action;
    this.details = details;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.status = status;
  }

  /**
   * Valida o log de auditoria
   * @returns {boolean} True se válido
   */
  validate() {
    return this.id && this.timestamp && this.userId && this.action;
  }

  /**
   * Converte para objeto simples
   * @returns {Object} Objeto serializado
   */
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      userId: this.userId,
      action: this.action,
      details: this.details,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      status: this.status
    };
  }

  /**
   * Cria instância a partir de objeto
   * @param {Object} data - Dados
   * @returns {AuditLog} Instância criada
   */
  static fromJSON(data) {
    return new AuditLog(
      data.id,
      data.timestamp,
      data.userId,
      data.action,
      data.details,
      data.ipAddress,
      data.userAgent,
      data.status
    );
  }
}

// ============================================================================
// EXPORTAR CLASSES
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Specialty,
    Question,
    QuestionnaireSection,
    Questionnaire,
    Response,
    QualificationResult,
    Qualification,
    AuditLog
  };
}
