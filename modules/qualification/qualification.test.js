/**
 * Testes Unitários - Módulo de Qualificação
 * Valida funcionalidade core do sistema
 */

// Importar dependências
const { QualificationModule, Validator, StorageManager } = require('./qualification');
const EligibilityEngine = require('./eligibility-engine');
const ReportGenerator = require('./report-generator');
const HistoryManager = require('./history-manager');

// Mocks do Ambiente de Navegador para Node.js/Jest
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => (key in store ? store[key] : null)),
    setItem: jest.fn((key, value) => { store[key] = String(value); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn((index) => Object.keys(store)[index] || null),
    _getStore: () => store
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

global.navigator = {
  userAgent: 'jest'
};

global.document = {
  createElement: jest.fn(() => {
    let text = '';
    return {
      set textContent(val) { text = val; },
      get innerHTML() {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
    };
  })
};

global.Blob = class Blob {
  constructor(content, options) {
    this.content = content;
    this.options = options;
  }
};

global.URL = {
  createObjectURL: jest.fn((blob) => 'blob-url')
};

// btoa polyfill para Node.js
if (typeof global.btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}

// fetch mock (nunca deve ser chamado nos testes - protocolos vêm do localStorage)
global.fetch = jest.fn(() => Promise.reject(new Error('fetch não disponível em testes')));

// Protocolos mínimos para testes
const MOCK_PROTOCOLS = {
  endocrinologia: {
    id: 'endocrinologia',
    name: 'Endocrinologia - Diabetes Mellitus tipo 2',
    eligibilityFilters: [
      { id: 'filter_1', logic: 'if_yes_then_qualified' }
    ],
    alerts: [],
    requiredExams: []
  },
  cardiologia: {
    id: 'cardiologia',
    name: 'Cardiologia',
    eligibilityFilters: [],
    alerts: [],
    requiredExams: []
  },
  reumatologia: {
    id: 'reumatologia',
    name: 'Reumatologia',
    eligibilityFilters: [],
    alerts: [],
    requiredExams: []
  }
};

// ============================================================================
// TESTES: QualificationModule
// ============================================================================

describe('QualificationModule', () => {
  let module;

  beforeEach(async () => {
    // Limpar localStorage e semear protocolos ANTES de criar o módulo
    // para que loadProtocols() os encontre sem precisar de fetch
    localStorage.clear();
    localStorage.setItem('qualification_protocols', JSON.stringify(MOCK_PROTOCOLS));
    module = new QualificationModule();
    // Aguardar a inicialização assíncrona completar
    await module.initPromise;
  });

  describe('Inicialização', () => {
    test('deve inicializar com estrutura correta', () => {
      expect(module.protocols).toBeDefined();
      expect(module.qualifications).toBeDefined();
      expect(module.auditLogs).toBeDefined();
      expect(module.storagePrefix).toBe('qualification_');
    });

    test('deve carregar dados do localStorage', async () => {
      const testQual = { id: 'test_1', patientId: 'p1', specialty: 'endocrinologia' };
      localStorage.setItem('qualification_qualifications', JSON.stringify([testQual]));
      
      const newModule = new QualificationModule();
      await newModule.initPromise;
      expect(newModule.qualifications).toHaveLength(1);
      expect(newModule.qualifications[0].id).toBe('test_1');
    });
  });

  describe('Sessão de Qualificação', () => {
    test('deve iniciar sessão com dados válidos', () => {
      const session = module.startQualificationSession('patient_1', 'endocrinologia', {});
      
      expect(session).toBeDefined();
      expect(session.patientId).toBe('patient_1');
      expect(session.specialty).toBe('endocrinologia');
      expect(session.status).toBe('IN_PROGRESS');
    });

    test('deve lançar erro para especialidade inválida', () => {
      expect(() => {
        module.startQualificationSession('patient_1', 'especialidade_invalida', {});
      }).toThrow();
    });

    test('deve salvar resposta na sessão', () => {
      module.startQualificationSession('patient_1', 'endocrinologia', {});
      module.saveResponse('filter_1', true);
      
      expect(module.currentSession.responses['filter_1']).toBe(true);
    });

    test('deve lançar erro ao salvar resposta sem sessão ativa', () => {
      expect(() => {
        module.saveResponse('filter_1', true);
      }).toThrow();
    });
  });

  describe('Persistência', () => {
    test('deve persistir estado da sessão', () => {
      module.startQualificationSession('patient_1', 'endocrinologia', {});
      module.saveResponse('filter_1', true);
      module.persistSessionState();
      
      const stored = localStorage.getItem('qualification_session_patient_1');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored);
      expect(parsed.responses['filter_1']).toBe(true);
    });

    test('deve recuperar sessão anterior', () => {
      const originalSession = {
        id: 'session_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        responses: { filter_1: true },
        status: 'IN_PROGRESS'
      };
      
      localStorage.setItem('qualification_session_patient_1', JSON.stringify(originalSession));
      
      const recovered = module.recoverSession('patient_1');
      expect(recovered).toBeDefined();
      expect(recovered.responses['filter_1']).toBe(true);
    });

    test('deve retornar null ao recuperar sessão inexistente', () => {
      const recovered = module.recoverSession('patient_inexistente');
      expect(recovered).toBeNull();
    });
  });

  describe('Qualificação Completa', () => {
    test('deve completar qualificação e salvar', () => {
      module.startQualificationSession('patient_1', 'endocrinologia', {});
      module.saveResponse('filter_1', false);
      
      const result = {
        status: 'QUALIFICADO',
        statusLabel: 'Qualificado',
        justification: 'Paciente atende aos critérios'
      };
      
      const qualification = module.completeQualification(result);
      
      expect(qualification).toBeDefined();
      expect(qualification.id).toBeDefined();
      expect(qualification.patientId).toBe('patient_1');
      expect(qualification.result.status).toBe('QUALIFICADO');
      expect(module.qualifications).toHaveLength(1);
    });

    test('deve limpar sessão após completar qualificação', () => {
      module.startQualificationSession('patient_1', 'endocrinologia', {});
      
      const result = { status: 'QUALIFICADO', statusLabel: 'Qualificado' };
      module.completeQualification(result);
      
      expect(module.currentSession).toBeNull();
    });

    test('deve lançar erro ao completar sem sessão ativa', () => {
      expect(() => {
        module.completeQualification({ status: 'QUALIFICADO' });
      }).toThrow();
    });
  });

  describe('Histórico de Qualificações', () => {
    test('deve retornar histórico de paciente', () => {
      // Criar múltiplas qualificações
      for (let i = 0; i < 3; i++) {
        module.startQualificationSession('patient_1', 'endocrinologia', {});
        module.completeQualification({ status: 'QUALIFICADO', statusLabel: 'Qualificado' });
      }
      
      const history = module.getPatientQualificationHistory('patient_1');
      expect(history).toHaveLength(3);
    });

    test('deve retornar histórico vazio para paciente sem qualificações', () => {
      const history = module.getPatientQualificationHistory('patient_inexistente');
      expect(history).toHaveLength(0);
    });

    test('deve ordenar histórico por data decrescente', () => {
      // Criar qualificações com delay
      module.startQualificationSession('patient_1', 'endocrinologia', {});
      module.completeQualification({ status: 'QUALIFICADO', statusLabel: 'Qualificado' });
      
      const qual1 = module.qualifications[0];
      
      // Simular qualificação mais recente
      module.startQualificationSession('patient_1', 'cardiologia', {});
      module.completeQualification({ status: 'QUALIFICADO', statusLabel: 'Qualificado' });
      
      const history = module.getPatientQualificationHistory('patient_1');
      expect(history[0].metadata.createdAt).toBeGreaterThanOrEqual(
        history[1].metadata.createdAt
      );
    });
  });

  describe('Auditoria', () => {
    test('deve registrar evento de auditoria', () => {
      module.logAuditEvent('TEST_ACTION', { detail: 'test' });
      
      expect(module.auditLogs).toHaveLength(1);
      expect(module.auditLogs[0].action).toBe('TEST_ACTION');
      expect(module.auditLogs[0].details.detail).toBe('test');
    });

    test('deve persistir logs de auditoria', () => {
      module.logAuditEvent('TEST_ACTION', {});
      
      const stored = localStorage.getItem('qualification_audit_logs');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
    });
  });

  describe('Validação de Integridade', () => {
    test('deve validar dados íntegros', () => {
      module.startQualificationSession('patient_1', 'endocrinologia', {});
      module.completeQualification({ status: 'QUALIFICADO', statusLabel: 'Qualificado' });
      
      const validation = module.validateDataIntegrity();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('deve detectar dados corrompidos', () => {
      // Adicionar qualificação inválida
      module.qualifications.push({ id: null, patientId: null });
      
      const validation = module.validateDataIntegrity();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('deve limpar dados corrompidos', () => {
      module.qualifications.push({ id: null, patientId: null });
      module.clearCorruptedData();
      
      expect(module.qualifications).toHaveLength(0);
    });
  });
});

// ============================================================================
// TESTES: Validator
// ============================================================================

describe('Validator', () => {
  describe('Validação de Resposta', () => {
    test('deve validar resposta booleana', () => {
      const question = { type: 'boolean', required: true };
      
      expect(Validator.validateResponse(true, question)).toBe(true);
      expect(Validator.validateResponse(false, question)).toBe(true);
      expect(Validator.validateResponse('true', question)).toBe(false);
    });

    test('deve validar resposta numérica', () => {
      const question = { type: 'number', required: true };
      
      expect(Validator.validateResponse(42, question)).toBe(true);
      expect(Validator.validateResponse(0, question)).toBe(true);
      expect(Validator.validateResponse(-5, question)).toBe(false);
      expect(Validator.validateResponse('42', question)).toBe(true);
      expect(Validator.validateResponse('abc', question)).toBe(false);
    });

    test('deve validar resposta de texto', () => {
      const question = { type: 'text', required: true };
      
      expect(Validator.validateResponse('texto válido', question)).toBe(true);
      expect(Validator.validateResponse('', question)).toBe(false);
      expect(Validator.validateResponse(null, question)).toBe(false);
    });

    test('deve validar resposta de seleção', () => {
      const question = {
        type: 'select',
        required: true,
        options: ['opção1', 'opção2', 'opção3']
      };
      
      expect(Validator.validateResponse('opção1', question)).toBe(true);
      expect(Validator.validateResponse('opção_invalida', question)).toBe(false);
    });

    test('deve validar status de exame', () => {
      const question = { type: 'exam_status', required: true };
      
      expect(Validator.validateResponse('Realizado', question)).toBe(true);
      expect(Validator.validateResponse('Resultado Disponível', question)).toBe(true);
      expect(Validator.validateResponse('Não Realizado', question)).toBe(true);
      expect(Validator.validateResponse('Status Inválido', question)).toBe(false);
    });

    test('deve validar campo não obrigatório vazio', () => {
      const question = { type: 'text', required: false };
      
      expect(Validator.validateResponse('', question)).toBe(true);
      expect(Validator.validateResponse(null, question)).toBe(true);
    });
  });

  describe('Validação de Questionário', () => {
    test('deve validar questionário completo', () => {
      const questionnaire = {
        sections: [
          {
            questions: [
              { id: 'q1', type: 'boolean', required: true },
              { id: 'q2', type: 'text', required: true }
            ]
          }
        ]
      };

      const responses = {
        q1: true,
        q2: 'resposta'
      };

      const validation = Validator.validateQuestionnaire(responses, questionnaire);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('deve detectar campo obrigatório não preenchido', () => {
      const questionnaire = {
        sections: [
          {
            questions: [
              { id: 'q1', type: 'boolean', required: true, text: 'Pergunta 1' }
            ]
          }
        ]
      };

      const responses = {};

      const validation = Validator.validateQuestionnaire(responses, questionnaire);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('deve detectar resposta inválida', () => {
      const questionnaire = {
        sections: [
          {
            questions: [
              { id: 'q1', type: 'number', required: true, text: 'Pergunta 1' }
            ]
          }
        ]
      };

      const responses = {
        q1: 'não é número'
      };

      const validation = Validator.validateQuestionnaire(responses, questionnaire);
      expect(validation.valid).toBe(false);
    });
  });

  describe('Sanitização de Entrada', () => {
    test('deve sanitizar HTML', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = Validator.sanitizeInput(input);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;');
    });

    test('deve preservar texto normal', () => {
      const input = 'Texto normal sem HTML';
      const sanitized = Validator.sanitizeInput(input);
      
      expect(sanitized).toBe(input);
    });
  });

  describe('Validação de Tipo', () => {
    test('deve validar tipos corretamente', () => {
      expect(Validator.validateType('texto', 'string')).toBe(true);
      expect(Validator.validateType(42, 'number')).toBe(true);
      expect(Validator.validateType(true, 'boolean')).toBe(true);
      expect(Validator.validateType([], 'array')).toBe(true);
      expect(Validator.validateType({}, 'object')).toBe(true);
      
      expect(Validator.validateType(42, 'string')).toBe(false);
      expect(Validator.validateType('texto', 'number')).toBe(false);
    });
  });
});

// ============================================================================
// TESTES: StorageManager
// ============================================================================

describe('StorageManager', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new StorageManager('test_');
  });

  describe('Operações Básicas', () => {
    test('deve salvar e carregar dados', () => {
      const data = { name: 'Test', value: 42 };
      manager.save('test_key', data);
      
      const loaded = manager.load('test_key');
      expect(loaded).toEqual(data);
    });

    test('deve retornar valor padrão se não encontrado', () => {
      const defaultValue = { default: true };
      const loaded = manager.load('inexistente', defaultValue);
      
      expect(loaded).toEqual(defaultValue);
    });

    test('deve remover dados', () => {
      manager.save('test_key', { data: 'test' });
      manager.remove('test_key');
      
      const loaded = manager.load('test_key');
      expect(loaded).toBeNull();
    });

    test('deve limpar todos os dados', () => {
      manager.save('key1', { data: 1 });
      manager.save('key2', { data: 2 });
      
      manager.clear();
      
      expect(manager.load('key1')).toBeNull();
      expect(manager.load('key2')).toBeNull();
    });
  });

  describe('Tamanho de Armazenamento', () => {
    test('deve calcular tamanho de armazenamento', () => {
      manager.save('key1', { data: 'test' });
      
      const size = manager.getStorageSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('Tratamento de Erros', () => {
    test('deve lidar com dados inválidos', () => {
      const result = manager.save('key', undefined);
      expect(result).toBe(true); // JSON.stringify(undefined) é válido
    });

    test('deve lidar com localStorage cheio', () => {
      // Simular localStorage cheio substituindo setItem do mock
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const result = manager.save('key', { data: 'test' });
      expect(result).toBe(false);

      localStorage.setItem = originalSetItem;
    });
  });
});

// ============================================================================
// TESTES: EligibilityEngine
// ============================================================================

describe('EligibilityEngine', () => {
  let engine;
  let mockProtocol;

  beforeEach(() => {
    mockProtocol = {
      id: 'test_protocol',
      name: 'Test Protocol',
      eligibilityFilters: [
        { id: 'filter_1', logic: 'if_yes_then_qualified' },
        { id: 'filter_2', logic: 'if_no_then_not_qualified' }
      ],
      alerts: [
        { id: 'alert_1', name: 'Test Alert' }
      ],
      requiredExams: [
        { id: 'exam_1', name: 'Test Exam' }
      ]
    };

    engine = new EligibilityEngine(mockProtocol);
  });

  describe('Análise de Elegibilidade', () => {
    test('deve analisar respostas válidas', () => {
      const responses = {
        filter_1: true,
        filter_2: false,
        exam_1: 'Realizado'
      };

      const result = engine.analyze(responses);
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    test('deve lançar erro para respostas inválidas', () => {
      expect(() => {
        engine.analyze(null);
      }).toThrow();

      expect(() => {
        engine.analyze('não é objeto');
      }).toThrow();
    });
  });

  describe('Validação de Protocolo', () => {
    test('deve validar protocolo válido', () => {
      const validation = engine.validateProtocol();
      expect(validation.valid).toBe(true);
    });

    test('deve detectar protocolo inválido', () => {
      const invalidEngine = new EligibilityEngine({
        id: 'test',
        eligibilityFilters: 'não é array'
      });

      const validation = invalidEngine.validateProtocol();
      expect(validation.valid).toBe(false);
    });
  });

  describe('Estatísticas do Protocolo', () => {
    test('deve retornar estatísticas corretas', () => {
      const stats = engine.getProtocolStats();
      
      expect(stats.protocolId).toBe('test_protocol');
      expect(stats.totalFilters).toBe(2);
      expect(stats.totalAlerts).toBe(1);
      expect(stats.totalExams).toBe(1);
    });
  });
});

// ============================================================================
// TESTES: ReportGenerator
// ============================================================================

describe('ReportGenerator', () => {
  let generator;
  let mockQualification;
  let mockProtocol;

  beforeEach(() => {
    mockProtocol = {
      id: 'endocrinologia',
      name: 'Endocrinologia - Diabetes Mellitus tipo 2'
    };

    mockQualification = {
      id: 'qual_1',
      patientId: 'patient_1',
      specialty: 'endocrinologia',
      responses: {},
      result: {
        status: 'QUALIFICADO',
        statusLabel: 'Qualificado',
        justification: 'Paciente atende aos critérios',
        alerts: [],
        missingExams: []
      },
      metadata: {
        createdAt: Date.now(),
        doctorName: 'Dr. Test',
        clinicName: 'Clínica Test'
      },
      auditTrail: {
        timestamp: Date.now()
      }
    };

    generator = new ReportGenerator(mockQualification, mockProtocol);
  });

  describe('Geração de Relatório', () => {
    test('deve gerar HTML válido', () => {
      const html = generator.generateHTML();
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Qualificado');
      expect(html).toContain('Endocrinologia');
    });

    test('deve gerar texto válido', () => {
      const text = generator.generateText();
      
      expect(text).toContain('RELATÓRIO DE QUALIFICAÇÃO');
      expect(text).toContain('Qualificado');
    });

    test('deve gerar PDF', () => {
      const pdf = generator.generatePDF();
      expect(pdf).toBeDefined();
    });
  });

  describe('Cores e Ícones de Status', () => {
    test('deve retornar cor correta para cada status', () => {
      expect(generator.getStatusColor('QUALIFICADO')).toBe('#27ae60');
      expect(generator.getStatusColor('NAO_QUALIFICADO')).toBe('#e74c3c');
      expect(generator.getStatusColor('URGENCIA')).toBe('#c0392b');
    });

    test('deve retornar ícone correto para cada status', () => {
      expect(generator.getStatusIcon('QUALIFICADO')).toBe('✅');
      expect(generator.getStatusIcon('NAO_QUALIFICADO')).toBe('❌');
      expect(generator.getStatusIcon('URGENCIA')).toBe('🚨');
    });
  });

  describe('Download de Relatório', () => {
    test('deve gerar URL de download HTML', () => {
      const download = generator.getDownloadUrl('html');
      
      expect(download.url).toBeDefined();
      expect(download.filename).toContain('qual_1');
      expect(download.filename).toContain('.html');
    });

    test('deve gerar URL de download TXT', () => {
      const download = generator.getDownloadUrl('txt');
      
      expect(download.filename).toContain('.txt');
    });

    test('deve lançar erro para formato desconhecido', () => {
      expect(() => {
        generator.getDownloadUrl('formato_invalido');
      }).toThrow();
    });
  });
});

// ============================================================================
// TESTES: HistoryManager
// ============================================================================

describe('HistoryManager', () => {
  let manager;

  beforeEach(() => {
    localStorage.clear();
    manager = new HistoryManager();
  });

  describe('Operações Básicas', () => {
    test('deve salvar qualificação', () => {
      const qual = {
        id: 'qual_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      };

      const result = manager.save(qual);
      expect(result).toBe(true);
      expect(manager.qualifications).toHaveLength(1);
    });

    test('deve recuperar qualificação', () => {
      const qual = {
        id: 'qual_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      };

      manager.save(qual);
      const retrieved = manager.getQualification('qual_1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe('qual_1');
    });

    test('deve remover qualificação', () => {
      const qual = {
        id: 'qual_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      };

      manager.save(qual);
      const removed = manager.remove('qual_1');
      
      expect(removed).toBe(true);
      expect(manager.qualifications).toHaveLength(0);
    });
  });

  describe('Histórico de Paciente', () => {
    test('deve retornar histórico de paciente', () => {
      for (let i = 0; i < 3; i++) {
        manager.save({
          id: `qual_${i}`,
          patientId: 'patient_1',
          specialty: 'endocrinologia',
          result: { status: 'QUALIFICADO' },
          metadata: { createdAt: Date.now() + i }
        });
      }

      const history = manager.getPatientHistory('patient_1');
      expect(history).toHaveLength(3);
    });

    test('deve ordenar histórico por data decrescente', () => {
      manager.save({
        id: 'qual_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: 1000 }
      });

      manager.save({
        id: 'qual_2',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: 2000 }
      });

      const history = manager.getPatientHistory('patient_1');
      expect(history[0].metadata.createdAt).toBeGreaterThan(
        history[1].metadata.createdAt
      );
    });
  });

  describe('Filtros', () => {
    test('deve filtrar por especialidade', () => {
      manager.save({
        id: 'qual_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      });

      manager.save({
        id: 'qual_2',
        patientId: 'patient_1',
        specialty: 'cardiologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      });

      const endoQuals = manager.getBySpecialty('endocrinologia');
      expect(endoQuals).toHaveLength(1);
      expect(endoQuals[0].specialty).toBe('endocrinologia');
    });

    test('deve filtrar por status', () => {
      manager.save({
        id: 'qual_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      });

      manager.save({
        id: 'qual_2',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'NAO_QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      });

      const qualQuals = manager.getByStatus('QUALIFICADO');
      expect(qualQuals).toHaveLength(1);
    });
  });

  describe('Estatísticas', () => {
    test('deve retornar estatísticas corretas', () => {
      manager.save({
        id: 'qual_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      });

      const stats = manager.getStatistics();
      expect(stats.totalQualifications).toBe(1);
      expect(stats.byStatus['QUALIFICADO']).toBe(1);
      expect(stats.bySpecialty['endocrinologia']).toBe(1);
    });
  });

  describe('Validação', () => {
    test('deve validar dados íntegros', () => {
      manager.save({
        id: 'qual_1',
        patientId: 'patient_1',
        specialty: 'endocrinologia',
        result: { status: 'QUALIFICADO' },
        metadata: { createdAt: Date.now() }
      });

      const validation = manager.validate();
      expect(validation.valid).toBe(true);
    });

    test('deve detectar dados corrompidos', () => {
      manager.qualifications.push({ id: null });
      
      const validation = manager.validate();
      expect(validation.valid).toBe(false);
    });
  });
});
