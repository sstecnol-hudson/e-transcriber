/**
 * Motor de Análise de Elegibilidade
 * Avalia respostas contra protocolos clínicos e determina elegibilidade
 */

class EligibilityEngine {
  constructor(protocol) {
    if (!protocol) {
      throw new Error('Protocolo é obrigatório');
    }
    this.protocol = protocol;
  }

  /**
   * Analisa respostas e determina elegibilidade
   * @param {Object} responses - Respostas do questionário
   * @returns {Object} Resultado da análise
   */
  analyze(responses) {
    if (!responses || typeof responses !== 'object') {
      throw new Error('Respostas inválidas');
    }

    // Passo 1: Avaliar Filtros de Elegibilidade
    const eligibilityResult = this.evaluateEligibilityFilters(responses);
    
    if (!eligibilityResult.passed) {
      return {
        status: 'NAO_QUALIFICADO',
        statusLabel: 'Não Qualificado',
        reason: eligibilityResult.failedFilter,
        alerts: [],
        missingExams: [],
        justification: `O paciente não atende ao critério de elegibilidade: ${eligibilityResult.failedFilter}`
      };
    }

    // Passo 2: Detectar Sinais de Alerta
    const alerts = this.detectAlerts(responses);
    
    if (alerts.length > 0) {
      return {
        status: 'URGENCIA',
        statusLabel: 'Urgência',
        alerts: alerts,
        missingExams: [],
        justification: `Sinais de alerta detectados: ${alerts.map(a => a.name).join(', ')}`
      };
    }

    // Passo 3: Validar Exames Obrigatórios
    const examResult = this.validateExams(responses);
    
    if (examResult.allPresent) {
      return {
        status: 'QUALIFICADO',
        statusLabel: 'Qualificado',
        alerts: [],
        missingExams: [],
        justification: 'O paciente atende a todos os critérios de elegibilidade e possui todos os exames obrigatórios.'
      };
    } else {
      return {
        status: 'QUALIFICADO_COM_RESSALVAS',
        statusLabel: 'Qualificado com Ressalvas',
        alerts: [],
        missingExams: examResult.missing,
        justification: `O paciente atende aos critérios de elegibilidade, mas está faltando os seguintes exames: ${examResult.missing.map(e => e.name).join(', ')}`
      };
    }
  }

  /**
   * Avalia Filtros de Elegibilidade
   * Aplica a lógica de decisão: filters → alerts → exams
   * @param {Object} responses - Respostas do questionário
   * @returns {Object} Resultado da avaliação
   */
  evaluateEligibilityFilters(responses) {
    const filters = this.protocol.eligibilityFilters || [];

    // 1. Validar que todas as perguntas foram respondidas
    for (const filter of filters) {
      const response = responses[filter.id];

      // Verificar se a resposta existe
      if (response === null || response === undefined) {
        return {
          passed: false,
          failedFilter: `Pergunta não respondida: ${filter.question}`
        };
      }
    }

    // 2. Verificar filtros de exclusão (if_no_then_not_qualified)
    for (const filter of filters) {
      if (filter.logic === 'if_no_then_not_qualified') {
        const response = responses[filter.id];
        if (response === true) {
          return {
            passed: false,
            failedFilter: filter.question
          };
        }
      }
    }

    // 3. Verificar se há pelo menos um critério de qualificação atendido (if_yes_then_qualified)
    const qualifyingFilters = filters.filter(f => f.logic === 'if_yes_then_qualified');
    if (qualifyingFilters.length > 0) {
      const hasQualifying = qualifyingFilters.some(f => responses[f.id] === true);
      if (!hasQualifying) {
        return {
          passed: false,
          failedFilter: 'O paciente não atende a nenhum dos critérios de qualificação clínica do protocolo.'
        };
      }
    }

    return { passed: true };
  }

  /**
   * Detecta Sinais de Alerta
   * @param {Object} responses - Respostas do questionário
   * @returns {Array<Object>} Alertas detectados
   */
  detectAlerts(responses) {
    const alerts = [];
    const protocolAlerts = this.protocol.alerts || [];

    // Verificar cada alerta definido no protocolo
    for (const alert of protocolAlerts) {
      const alertTriggered = this.checkAlertConditions(alert, responses);
      
      if (alertTriggered) {
        alerts.push({
          id: alert.id,
          name: alert.name,
          recommendation: alert.recommendation,
          severity: alert.severity || 'HIGH'
        });
      }
    }

    // Verificar alertas customizados (campos de texto)
    const customAlertFields = Object.keys(responses).filter(key => 
      key.startsWith('alert_') && typeof responses[key] === 'string' && responses[key].trim()
    );

    if (customAlertFields.length > 0) {
      alerts.push({
        id: 'custom_alert',
        name: 'Alerta Customizado',
        recommendation: 'Revisar com especialista',
        severity: 'MEDIUM'
      });
    }

    return alerts;
  }

  /**
   * Verifica se as condições de um alerta são atendidas
   * Detecta sinais de alerta clínicos que indicam urgência
   * @param {Object} alert - Definição do alerta
   * @param {Object} responses - Respostas do questionário
   * @returns {boolean} True se alerta é disparado
   */
  checkAlertConditions(alert, responses) {
    // Procurar por campo de pergunta correspondente ao alerta
    // O ID do alerta é usado para encontrar a pergunta correspondente
    const alertQuestionId = alert.id;
    
    // Verificar se a resposta para a pergunta de alerta é SIM (true)
    if (responses[alertQuestionId] === true) {
      return true;
    }

    return false;
  }

  /**
   * Valida Exames Obrigatórios
   * Verifica se todos os exames obrigatórios foram realizados
   * @param {Object} responses - Respostas do questionário
   * @returns {Object} Resultado da validação
   */
  validateExams(responses) {
    const requiredExams = this.protocol.requiredExams || [];
    const missing = [];

    for (const exam of requiredExams) {
      // Procurar pela resposta do exame usando o ID do exame
      const examResponse = responses[exam.id];

      // Verificar se exame foi realizado ou resultado está disponível
      // Aceita "Realizado" ou "Resultado Disponível", rejeita "Não Realizado" ou vazio
      if (!examResponse || examResponse === 'Não Realizado' || examResponse === '') {
        missing.push({
          id: exam.id,
          name: exam.name,
          maxAgeDays: exam.maxAgeDays
        });
      }
    }

    return {
      allPresent: missing.length === 0,
      missing: missing
    };
  }

  /**
   * Obtém recomendações baseadas no resultado
   * @param {Object} result - Resultado da análise
   * @returns {Array<string>} Recomendações
   */
  getRecommendations(result) {
    const recommendations = [];

    switch (result.status) {
      case 'QUALIFICADO':
        recommendations.push('Encaminhar para especialista conforme protocolo');
        recommendations.push('Agendar consulta na especialidade');
        break;

      case 'QUALIFICADO_COM_RESSALVAS':
        recommendations.push('Solicitar exames faltantes antes do encaminhamento');
        recommendations.push('Encaminhar após obtenção de todos os exames');
        break;

      case 'NAO_QUALIFICADO':
        recommendations.push('Manter acompanhamento na Atenção Primária');
        recommendations.push('Revisar diagnóstico e indicação de encaminhamento');
        break;

      case 'URGENCIA':
        recommendations.push('Encaminhamento URGENTE para especialista');
        recommendations.push('Considerar encaminhamento para Pronto Socorro se necessário');
        result.alerts.forEach(alert => {
          recommendations.push(`Atenção: ${alert.recommendation}`);
        });
        break;
    }

    return recommendations;
  }

  /**
   * Valida que o protocolo tem estrutura correta
   * @returns {Object} Resultado da validação
   */
  validateProtocol() {
    const errors = [];

    if (!this.protocol.id) errors.push('Protocolo sem ID');
    if (!this.protocol.name) errors.push('Protocolo sem nome');
    if (!Array.isArray(this.protocol.eligibilityFilters)) {
      errors.push('Filtros de elegibilidade não é um array');
    }
    if (!Array.isArray(this.protocol.alerts)) {
      errors.push('Alertas não é um array');
    }
    if (!Array.isArray(this.protocol.requiredExams)) {
      errors.push('Exames obrigatórios não é um array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtém estatísticas sobre o protocolo
   * @returns {Object} Estatísticas
   */
  getProtocolStats() {
    return {
      protocolId: this.protocol.id,
      protocolName: this.protocol.name,
      totalFilters: (this.protocol.eligibilityFilters || []).length,
      totalAlerts: (this.protocol.alerts || []).length,
      totalExams: (this.protocol.requiredExams || []).length,
      questionnaireSections: (this.protocol.questionnaire?.sections || []).length,
      totalQuestions: (this.protocol.questionnaire?.sections || []).reduce(
        (sum, section) => sum + (section.questions?.length || 0),
        0
      )
    };
  }
}

// ============================================================================
// EXPORTAR CLASSE
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EligibilityEngine;
}
