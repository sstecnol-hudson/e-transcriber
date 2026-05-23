/**
 * Testes para EligibilityEngine
 * Valida a lógica de decisão: filters → alerts → exams
 * Requisitos: 6, 7, 8
 */

const EligibilityEngine = require('./eligibility-engine');

describe('EligibilityEngine - Análise de Elegibilidade', () => {
  let engine;
  let endocrinologyProtocol;

  beforeEach(() => {
    // Protocolo de teste para Endocrinologia
    endocrinologyProtocol = {
      id: 'endocrinologia',
      name: 'Endocrinologia - Diabetes Mellitus tipo 2',
      eligibilityFilters: [
        {
          id: 'filter_1',
          question: 'O paciente é gestante?',
          logic: 'if_yes_then_urgency'
        },
        {
          id: 'filter_2',
          question: 'O paciente tem menos de 15 anos?',
          logic: 'if_yes_then_urgency'
        },
        {
          id: 'filter_3',
          question: 'HbA1c > 9% mesmo com insulina ou múltiplos medicamentos?',
          logic: 'if_yes_then_qualified'
        },
        {
          id: 'filter_4',
          question: 'Paciente apresenta complicações graves ativas?',
          logic: 'if_yes_then_qualified'
        },
        {
          id: 'filter_5',
          question: 'Paciente em uso de insulina há > 6 meses com controle inadequado?',
          logic: 'if_no_then_not_qualified'
        }
      ],
      alerts: [
        {
          id: 'alert_1',
          name: 'Cetoacidose Diabética',
          recommendation: 'Encaminhar para UPA imediatamente',
          severity: 'CRITICAL'
        },
        {
          id: 'alert_2',
          name: 'Hipoglicemia Severa',
          recommendation: 'Encaminhar para UPA imediatamente',
          severity: 'CRITICAL'
        },
        {
          id: 'alert_3',
          name: 'Risco de Amputação',
          recommendation: 'Encaminhar para cirurgia urgentemente',
          severity: 'CRITICAL'
        }
      ],
      requiredExams: [
        { id: 'exam_hba1c', name: 'Hemoglobina Glicada (HbA1c)', maxAgeDays: 180 },
        { id: 'exam_creatinina', name: 'Creatinina sérica', maxAgeDays: 180 },
        { id: 'exam_eas', name: 'Exame de Urina (EAS)', maxAgeDays: 180 },
        { id: 'exam_fundo_olho', name: 'Fundo de Olho', maxAgeDays: 365 },
        { id: 'exam_lipidograma', name: 'Lipidograma', maxAgeDays: 180 },
        { id: 'exam_ecg', name: 'Eletrocardiograma', maxAgeDays: 365 }
      ]
    };

    engine = new EligibilityEngine(endocrinologyProtocol);
  });

  // ========================================================================
  // TESTES: Requisito 6 - Análise de Elegibilidade
  // ========================================================================

  describe('Requisito 6: Análise de Elegibilidade', () => {
    test('deve avaliar filtros de elegibilidade corretamente', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        exam_hba1c: 'Realizado',
        exam_creatinina: 'Realizado',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.evaluateEligibilityFilters(responses);
      expect(result.passed).toBe(true);
    });

    test('deve falhar quando filtro obrigatório não é atendido', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: false,  // Falha: HbA1c não > 9%
        filter_4: false,
        filter_5: false
      };

      const result = engine.evaluateEligibilityFilters(responses);
      expect(result.passed).toBe(false);
    });

    test('deve falhar quando filter_5 (if_no_then_not_qualified) é SIM', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: true  // Falha: deve ser NÃO (false)
      };

      const result = engine.evaluateEligibilityFilters(responses);
      expect(result.passed).toBe(false);
      expect(result.failedFilter).toContain('insulina');
    });

    test('deve retornar erro quando pergunta não é respondida', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false
        // filter_5 está faltando
      };

      const result = engine.evaluateEligibilityFilters(responses);
      expect(result.passed).toBe(false);
      expect(result.failedFilter).toContain('não respondida');
    });

    test('deve aplicar lógica if_yes_then_urgency sem falhar elegibilidade', () => {
      const responses = {
        filter_1: true,  // Gestante - urgência, mas não falha elegibilidade
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false
      };

      const result = engine.evaluateEligibilityFilters(responses);
      expect(result.passed).toBe(true);  // Elegibilidade passa
    });

    test('deve aplicar lógica if_yes_then_qualified corretamente', () => {
      // Caso 1: filter_3 é SIM (atende critério)
      let responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,  // Atende critério
        filter_4: false,
        filter_5: false
      };

      let result = engine.evaluateEligibilityFilters(responses);
      expect(result.passed).toBe(true);

      // Caso 2: filter_3 é NÃO (não atende, mas continua verificando)
      responses = {
        filter_1: false,
        filter_2: false,
        filter_3: false,  // Não atende, mas pode atender filter_4
        filter_4: true,   // Atende critério
        filter_5: false
      };

      result = engine.evaluateEligibilityFilters(responses);
      expect(result.passed).toBe(true);
    });
  });

  // ========================================================================
  // TESTES: Requisito 7 - Detecção de Sinais de Alerta
  // ========================================================================

  describe('Requisito 7: Detecção de Sinais de Alerta', () => {
    test('deve detectar alerta de cetoacidose diabética', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: true,  // Cetoacidose
        alert_2: false,
        alert_3: false
      };

      const alerts = engine.detectAlerts(responses);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].name).toBe('Cetoacidose Diabética');
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    test('deve detectar múltiplos alertas', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: true,  // Cetoacidose
        alert_2: true,  // Hipoglicemia
        alert_3: false
      };

      const alerts = engine.detectAlerts(responses);
      expect(alerts.length).toBe(2);
      expect(alerts.map(a => a.name)).toContain('Cetoacidose Diabética');
      expect(alerts.map(a => a.name)).toContain('Hipoglicemia Severa');
    });

    test('deve retornar array vazio quando nenhum alerta é detectado', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: false,
        alert_2: false,
        alert_3: false
      };

      const alerts = engine.detectAlerts(responses);
      expect(alerts.length).toBe(0);
    });

    test('deve incluir recomendação em cada alerta detectado', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: true,
        alert_2: false,
        alert_3: false
      };

      const alerts = engine.detectAlerts(responses);
      expect(alerts[0].recommendation).toBeDefined();
      expect(alerts[0].recommendation.length).toBeGreaterThan(0);
    });

    test('deve detectar alerta customizado (texto)', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: false,
        alert_2: false,
        alert_3: false,
        alert_4: 'Paciente com sintomas adicionais'  // Alerta customizado
      };

      const alerts = engine.detectAlerts(responses);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.id === 'custom_alert')).toBe(true);
    });
  });

  // ========================================================================
  // TESTES: Requisito 8 - Validação de Exames Obrigatórios
  // ========================================================================

  describe('Requisito 8: Validação de Exames Obrigatórios', () => {
    test('deve validar quando todos os exames estão presentes', () => {
      const responses = {
        exam_hba1c: 'Realizado',
        exam_creatinina: 'Resultado Disponível',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Resultado Disponível',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.validateExams(responses);
      expect(result.allPresent).toBe(true);
      expect(result.missing.length).toBe(0);
    });

    test('deve detectar exames faltantes', () => {
      const responses = {
        exam_hba1c: 'Realizado',
        exam_creatinina: 'Não Realizado',  // Faltando
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Não Realizado',  // Faltando
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.validateExams(responses);
      expect(result.allPresent).toBe(false);
      expect(result.missing.length).toBe(2);
      expect(result.missing.map(e => e.id)).toContain('exam_creatinina');
      expect(result.missing.map(e => e.id)).toContain('exam_fundo_olho');
    });

    test('deve aceitar "Realizado" como válido', () => {
      const responses = {
        exam_hba1c: 'Realizado',
        exam_creatinina: 'Realizado',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.validateExams(responses);
      expect(result.allPresent).toBe(true);
    });

    test('deve aceitar "Resultado Disponível" como válido', () => {
      const responses = {
        exam_hba1c: 'Resultado Disponível',
        exam_creatinina: 'Resultado Disponível',
        exam_eas: 'Resultado Disponível',
        exam_fundo_olho: 'Resultado Disponível',
        exam_lipidograma: 'Resultado Disponível',
        exam_ecg: 'Resultado Disponível'
      };

      const result = engine.validateExams(responses);
      expect(result.allPresent).toBe(true);
    });

    test('deve rejeitar "Não Realizado"', () => {
      const responses = {
        exam_hba1c: 'Não Realizado',
        exam_creatinina: 'Realizado',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.validateExams(responses);
      expect(result.allPresent).toBe(false);
      expect(result.missing.length).toBe(1);
    });

    test('deve rejeitar exames vazios', () => {
      const responses = {
        exam_hba1c: '',
        exam_creatinina: 'Realizado',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.validateExams(responses);
      expect(result.allPresent).toBe(false);
      expect(result.missing.length).toBe(1);
    });

    test('deve rejeitar exames não respondidos', () => {
      const responses = {
        exam_hba1c: undefined,
        exam_creatinina: 'Realizado',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.validateExams(responses);
      expect(result.allPresent).toBe(false);
      expect(result.missing.length).toBe(1);
    });
  });

  // ========================================================================
  // TESTES: Lógica de Decisão Completa (filters → alerts → exams)
  // ========================================================================

  describe('Lógica de Decisão Completa', () => {
    test('deve retornar NAO_QUALIFICADO quando filtro falha', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: false,  // Falha
        filter_4: false,
        filter_5: false
      };

      const result = engine.analyze(responses);
      expect(result.status).toBe('NAO_QUALIFICADO');
      expect(result.statusLabel).toBe('Não Qualificado');
      expect(result.alerts.length).toBe(0);
    });

    test('deve retornar URGENCIA quando alerta é detectado', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: true,  // Alerta detectado
        alert_2: false,
        alert_3: false
      };

      const result = engine.analyze(responses);
      expect(result.status).toBe('URGENCIA');
      expect(result.statusLabel).toBe('Urgência');
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    test('deve retornar QUALIFICADO quando todos os critérios são atendidos', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: false,
        alert_2: false,
        alert_3: false,
        exam_hba1c: 'Realizado',
        exam_creatinina: 'Realizado',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.analyze(responses);
      expect(result.status).toBe('QUALIFICADO');
      expect(result.statusLabel).toBe('Qualificado');
      expect(result.missingExams.length).toBe(0);
    });

    test('deve retornar QUALIFICADO_COM_RESSALVAS quando exames faltam', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: false,
        alert_2: false,
        alert_3: false,
        exam_hba1c: 'Realizado',
        exam_creatinina: 'Não Realizado',  // Faltando
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.analyze(responses);
      expect(result.status).toBe('QUALIFICADO_COM_RESSALVAS');
      expect(result.statusLabel).toBe('Qualificado com Ressalvas');
      expect(result.missingExams.length).toBe(1);
    });

    test('deve priorizar URGENCIA sobre QUALIFICADO', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: true,  // Alerta detectado
        alert_2: false,
        alert_3: false,
        exam_hba1c: 'Realizado',
        exam_creatinina: 'Realizado',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.analyze(responses);
      expect(result.status).toBe('URGENCIA');  // Urgência tem prioridade
      expect(result.alerts.length).toBeGreaterThan(0);
    });

    test('deve incluir justificativa em cada resultado', () => {
      const responses = {
        filter_1: false,
        filter_2: false,
        filter_3: true,
        filter_4: false,
        filter_5: false,
        alert_1: false,
        alert_2: false,
        alert_3: false,
        exam_hba1c: 'Realizado',
        exam_creatinina: 'Realizado',
        exam_eas: 'Realizado',
        exam_fundo_olho: 'Realizado',
        exam_lipidograma: 'Realizado',
        exam_ecg: 'Realizado'
      };

      const result = engine.analyze(responses);
      expect(result.justification).toBeDefined();
      expect(result.justification.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // TESTES: Recomendações
  // ========================================================================

  describe('Recomendações', () => {
    test('deve gerar recomendações para QUALIFICADO', () => {
      const result = {
        status: 'QUALIFICADO',
        alerts: []
      };

      const recommendations = engine.getRecommendations(result);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('Encaminhar'))).toBe(true);
    });

    test('deve gerar recomendações para URGENCIA', () => {
      const result = {
        status: 'URGENCIA',
        alerts: [
          { name: 'Cetoacidose', recommendation: 'Encaminhar para UPA' }
        ]
      };

      const recommendations = engine.getRecommendations(result);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('URGENTE'))).toBe(true);
    });

    test('deve gerar recomendações para NAO_QUALIFICADO', () => {
      const result = {
        status: 'NAO_QUALIFICADO',
        alerts: []
      };

      const recommendations = engine.getRecommendations(result);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('Atenção Primária'))).toBe(true);
    });
  });

  // ========================================================================
  // TESTES: Validação de Protocolo
  // ========================================================================

  describe('Validação de Protocolo', () => {
    test('deve validar protocolo válido', () => {
      const validation = engine.validateProtocol();
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    test('deve detectar protocolo sem ID', () => {
      const invalidProtocol = {
        name: 'Test',
        eligibilityFilters: [],
        alerts: [],
        requiredExams: []
      };

      const invalidEngine = new EligibilityEngine(invalidProtocol);
      const validation = invalidEngine.validateProtocol();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('ID'))).toBe(true);
    });

    test('deve detectar filtros não-array', () => {
      const invalidProtocol = {
        id: 'test',
        name: 'Test',
        eligibilityFilters: 'não é array',
        alerts: [],
        requiredExams: []
      };

      const invalidEngine = new EligibilityEngine(invalidProtocol);
      const validation = invalidEngine.validateProtocol();
      expect(validation.valid).toBe(false);
    });
  });

  // ========================================================================
  // TESTES: Estatísticas do Protocolo
  // ========================================================================

  describe('Estatísticas do Protocolo', () => {
    test('deve retornar estatísticas corretas', () => {
      const stats = engine.getProtocolStats();
      
      expect(stats.protocolId).toBe('endocrinologia');
      expect(stats.protocolName).toBe('Endocrinologia - Diabetes Mellitus tipo 2');
      expect(stats.totalFilters).toBe(5);
      expect(stats.totalAlerts).toBe(3);
      expect(stats.totalExams).toBe(6);
    });
  });

  // ========================================================================
  // TESTES: Tratamento de Erros
  // ========================================================================

  describe('Tratamento de Erros', () => {
    test('deve lançar erro quando protocolo é nulo', () => {
      expect(() => {
        new EligibilityEngine(null);
      }).toThrow();
    });

    test('deve lançar erro quando respostas são nulas', () => {
      expect(() => {
        engine.analyze(null);
      }).toThrow();
    });

    test('deve lançar erro quando respostas não são objeto', () => {
      expect(() => {
        engine.analyze('não é objeto');
      }).toThrow();
    });
  });
});
