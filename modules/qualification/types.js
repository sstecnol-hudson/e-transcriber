/**
 * Definições de Tipos e Interfaces
 * Qualificador de Encaminhamentos Médicos
 * 
 * Este arquivo contém as definições de tipos (JSDoc) para toda a aplicação.
 * Serve como documentação e referência para a estrutura de dados.
 */

// ============================================================================
// TIPOS BÁSICOS
// ============================================================================

/**
 * @typedef {Object} Protocol
 * @property {string} id - Identificador único do protocolo (ex: 'endocrinologia')
 * @property {string} name - Nome completo do protocolo
 * @property {string} description - Descrição detalhada do protocolo
 * @property {string} version - Versão do protocolo (ex: '1.0')
 * @property {string} lastUpdated - Data da última atualização (ISO 8601)
 * @property {string} specialty - Especialidade médica
 * @property {string} focus - Foco clínico (ex: 'Diabetes Mellitus tipo 2')
 * @property {Questionnaire} questionnaire - Questionário dinâmico
 * @property {Array<EligibilityFilter>} eligibilityFilters - Filtros de elegibilidade
 * @property {Array<Alert>} alerts - Sinais de alerta clínicos
 * @property {Array<RequiredExam>} requiredExams - Exames obrigatórios
 * @property {Object} decisionLogic - Lógica de decisão em passos
 */

/**
 * @typedef {Object} Questionnaire
 * @property {Array<QuestionnaireSection>} sections - Seções do questionário
 */

/**
 * @typedef {Object} QuestionnaireSection
 * @property {string} id - Identificador único da seção
 * @property {string} title - Título da seção
 * @property {string} description - Descrição da seção
 * @property {Array<Question>} questions - Perguntas da seção
 */

/**
 * @typedef {Object} Question
 * @property {string} id - Identificador único da pergunta
 * @property {string} text - Texto da pergunta
 * @property {string} type - Tipo: 'boolean', 'text', 'number', 'select', 'exam_status'
 * @property {boolean} required - Se a pergunta é obrigatória
 * @property {string} [prefilledFrom] - Caminho para pré-preenchimento (ex: 'transcript.age')
 * @property {string} [hint] - Dica para o usuário
 * @property {Array<string>} [options] - Opções para tipo 'select' ou 'exam_status'
 */

/**
 * @typedef {Object} EligibilityFilter
 * @property {string} id - Identificador único
 * @property {string} question - Texto da pergunta
 * @property {string} type - Tipo: 'alert_trigger' ou 'qualification_criteria'
 * @property {string} logic - Lógica: 'if_yes_then_urgency', 'if_yes_then_qualified', 'if_no_then_not_qualified'
 * @property {string} [urgencyReason] - Motivo da urgência (se aplicável)
 */

/**
 * @typedef {Object} Alert
 * @property {string} id - Identificador único
 * @property {string} name - Nome do alerta (ex: 'Cetoacidose Diabética')
 * @property {Array<string>} conditions - Condições que disparam o alerta
 * @property {string} recommendation - Recomendação de ação
 * @property {string} severity - Severidade: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
 */

/**
 * @typedef {Object} RequiredExam
 * @property {string} id - Identificador único
 * @property {string} name - Nome do exame
 * @property {number} maxAgeDays - Idade máxima do exame em dias
 * @property {boolean} mandatory - Se o exame é obrigatório
 */

// ============================================================================
// TIPOS DE QUALIFICAÇÃO
// ============================================================================

/**
 * @typedef {Object} QualificationSession
 * @property {string} id - Identificador único da sessão
 * @property {string} patientId - ID do paciente
 * @property {string} specialty - Especialidade selecionada
 * @property {Object} consultationData - Dados da consulta para pré-preenchimento
 * @property {Object} responses - Respostas do questionário
 * @property {number} startedAt - Timestamp de início
 * @property {string} status - Status: 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'
 */

/**
 * @typedef {Object} Qualification
 * @property {string} id - Identificador único (ex: 'qual_1704067200000')
 * @property {string} patientId - ID do paciente
 * @property {string} patientName - Nome do paciente
 * @property {number} patientAge - Idade do paciente
 * @property {string} specialty - Especialidade (ex: 'endocrinologia')
 * @property {Object} responses - Respostas do questionário
 * @property {QualificationResult} result - Resultado da análise
 * @property {QualificationMetadata} metadata - Metadados
 * @property {AuditTrail} auditTrail - Trilha de auditoria
 */

/**
 * @typedef {Object} QualificationResult
 * @property {string} status - Status: 'QUALIFICADO', 'NAO_QUALIFICADO', 'URGENCIA', 'QUALIFICADO_COM_RESSALVAS'
 * @property {string} justification - Justificativa clínica
 * @property {Array<string>} alerts - Sinais de alerta detectados
 * @property {Array<string>} missingExams - Exames faltantes
 * @property {string} recommendations - Recomendações para encaminhamento
 */

/**
 * @typedef {Object} QualificationMetadata
 * @property {number} createdAt - Timestamp de criação
 * @property {string} createdBy - ID do usuário que criou
 * @property {string} doctorName - Nome do médico
 * @property {string} clinicName - Nome da clínica
 * @property {Array<string>} autoPopulatedFields - Campos pré-preenchidos
 * @property {Array<string>} manuallyEnteredFields - Campos editados manualmente
 * @property {Object} consultationData - Dados da consulta original
 */

/**
 * @typedef {Object} AuditTrail
 * @property {number} timestamp - Timestamp do evento
 * @property {string} userId - ID do usuário
 * @property {string} action - Ação realizada
 * @property {string} ipAddress - Endereço IP
 * @property {string} userAgent - User Agent do navegador
 * @property {string} dataHash - Hash dos dados para integridade
 */

// ============================================================================
// TIPOS DE AUDITORIA
// ============================================================================

/**
 * @typedef {Object} AuditLog
 * @property {string} id - Identificador único
 * @property {number} timestamp - Timestamp do evento
 * @property {string} userId - ID do usuário
 * @property {string} action - Ação realizada
 * @property {Object} details - Detalhes do evento
 * @property {string} ipAddress - Endereço IP
 * @property {string} userAgent - User Agent
 * @property {string} status - Status: 'SUCCESS', 'FAILURE'
 */

// ============================================================================
// TIPOS DE VALIDAÇÃO
// ============================================================================

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Se a validação passou
 * @property {Array<string>} errors - Lista de erros
 * @property {Array<string>} warnings - Lista de avisos
 */

/**
 * @typedef {Object} DataIntegrityResult
 * @property {boolean} valid - Se os dados estão íntegros
 * @property {Array<string>} errors - Erros encontrados
 */

// ============================================================================
// TIPOS DE CONSULTA
// ============================================================================

/**
 * @typedef {Object} ConsultationData
 * @property {string} patientName - Nome do paciente
 * @property {number} patientAge - Idade do paciente
 * @property {string} patientGender - Sexo do paciente
 * @property {string} specialty - Especialidade da consulta
 * @property {SubjectiveData} subjective - Dados subjetivos (SOAP)
 * @property {ObjectiveData} objective - Dados objetivos (SOAP)
 * @property {AssessmentData} assessment - Avaliação (SOAP)
 * @property {PlanData} plan - Plano (SOAP)
 */

/**
 * @typedef {Object} SubjectiveData
 * @property {string} chiefComplaint - Queixa principal
 * @property {string} historyOfPresentIllness - História da doença atual
 * @property {string} relevantHistory - Histórico relevante
 */

/**
 * @typedef {Object} ObjectiveData
 * @property {VitalSigns} vitalSigns - Sinais vitais
 * @property {string} physicalExam - Exame físico
 * @property {LabResults} labResults - Resultados de laboratório
 */

/**
 * @typedef {Object} VitalSigns
 * @property {string} bloodPressure - Pressão arterial (ex: '140/90')
 * @property {number} heartRate - Frequência cardíaca
 * @property {number} temperature - Temperatura
 * @property {number} bloodGlucose - Glicemia
 */

/**
 * @typedef {Object} LabResults
 * @property {number} hba1c - Hemoglobina glicada
 * @property {number} creatinine - Creatinina
 * @property {string} urinalysis - Análise de urina
 */

/**
 * @typedef {Object} AssessmentData
 * @property {Array<string>} diagnoses - Diagnósticos
 * @property {string} clinicalReasoning - Raciocínio clínico
 */

/**
 * @typedef {Object} PlanData
 * @property {Array<Medication>} medications - Medicações
 * @property {Array<string>} requestedExams - Exames solicitados
 * @property {string} recommendations - Recomendações
 */

/**
 * @typedef {Object} Medication
 * @property {string} name - Nome do medicamento
 * @property {string} dose - Dosagem
 * @property {string} frequency - Frequência
 */

// ============================================================================
// ENUMS E CONSTANTES
// ============================================================================

/**
 * Status de Qualificação
 * @enum {string}
 */
const QualificationStatus = {
  QUALIFIED: 'QUALIFICADO',
  NOT_QUALIFIED: 'NAO_QUALIFICADO',
  URGENCY: 'URGENCIA',
  QUALIFIED_WITH_CAVEATS: 'QUALIFICADO_COM_RESSALVAS'
};

/**
 * Tipos de Pergunta
 * @enum {string}
 */
const QuestionType = {
  BOOLEAN: 'boolean',
  TEXT: 'text',
  NUMBER: 'number',
  SELECT: 'select',
  EXAM_STATUS: 'exam_status'
};

/**
 * Tipos de Filtro
 * @enum {string}
 */
const FilterType = {
  ALERT_TRIGGER: 'alert_trigger',
  QUALIFICATION_CRITERIA: 'qualification_criteria'
};

/**
 * Lógica de Filtro
 * @enum {string}
 */
const FilterLogic = {
  IF_YES_THEN_URGENCY: 'if_yes_then_urgency',
  IF_YES_THEN_QUALIFIED: 'if_yes_then_qualified',
  IF_NO_THEN_NOT_QUALIFIED: 'if_no_then_not_qualified'
};

/**
 * Severidade de Alerta
 * @enum {string}
 */
const AlertSeverity = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

/**
 * Status de Exame
 * @enum {string}
 */
const ExamStatus = {
  NOT_PERFORMED: 'Não Realizado',
  PERFORMED: 'Realizado',
  RESULT_AVAILABLE: 'Resultado Disponível'
};

/**
 * Ações de Auditoria
 * @enum {string}
 */
const AuditAction = {
  SESSION_STARTED: 'QUALIFICATION_SESSION_STARTED',
  SESSION_ABANDONED: 'QUALIFICATION_SESSION_ABANDONED',
  RESPONSE_SAVED: 'RESPONSE_SAVED',
  ANALYSIS_COMPLETED: 'ANALYSIS_COMPLETED',
  QUALIFICATION_COMPLETED: 'QUALIFICATION_COMPLETED',
  REPORT_GENERATED: 'REPORT_GENERATED',
  REPORT_DOWNLOADED: 'REPORT_DOWNLOADED',
  REPORT_PRINTED: 'REPORT_PRINTED'
};

// ============================================================================
// EXPORTAR TIPOS E CONSTANTES
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    QualificationStatus,
    QuestionType,
    FilterType,
    FilterLogic,
    AlertSeverity,
    ExamStatus,
    AuditAction
  };
}
