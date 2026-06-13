/**
 * Testes Unitários para o Módulo de Diagnóstico RAG-Assistido
 */

const ProtocolRetriever = require('./protocol-retriever');
const RedFlagDetector = require('./red-flag-detector');
const CIDMapper = require('./cid-mapper');
const QualityValidator = require('./quality-validator');
const DataExtractor = require('./data-extractor');

// Mock global fetch para os testes de integração
global.fetch = jest.fn();

describe('Módulo Diagnostic RAG - Testes', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ProtocolRetriever', () => {
    let retriever;

    beforeEach(() => {
      retriever = new ProtocolRetriever();
    });

    test('deve extrair palavras-chave relevantes da transcrição', () => {
      const transcript = 'Paciente com sintomas de diabetes mellitus tipo 2, muita sede e poliúria. HbA1c de 8.5% e glicemia alterada.';
      const keywords = retriever.extractKeywords(transcript, 'Endocrinologia');
      
      expect(keywords).toContain('Endocrinologia');
      expect(keywords).toContain('diabetes');
      expect(keywords).toContain('glicemia');
      expect(keywords).toContain('hba1c');
    });

    test('deve aplicar boost e priorizar fontes do SUS (.gov.br)', () => {
      const mockProtocols = [
        { title: 'Diretriz Diabetes', url: 'https://diabetes.org.br/diretrizes', score: 80 },
        { title: 'Protocolo SUS DM2', url: 'https://saude.gov.br/protocolos', score: 80 },
        { title: 'Artigo Científico', url: 'https://scielo.br/artigo', score: 60 }
      ];

      const prioritized = retriever.prioritizeBySource(mockProtocols);

      expect(prioritized[0].title).toBe('Protocolo SUS DM2'); // Recebe +20 boost
      expect(prioritized[1].title).toBe('Diretriz Diabetes'); // Recebe +10 boost
    });
  });

  describe('RedFlagDetector', () => {
    let detector;

    beforeEach(() => {
      detector = new RedFlagDetector();
    });

    test('deve detectar Síndrome Coronária Aguda quando dor no peito e sudorese estão presentes', async () => {
      const clinicalData = {
        vitalSigns: { pa_systolic: 130, pa_diastolic: 80 },
        symptoms: [{ name: 'dor no peito' }, { name: 'sudorese' }]
      };
      
      // Simula a transcrição contendo os sintomas
      const transcript = 'Paciente queixando de forte dor no peito irradiada e suando frio.';
      
      const detected = await detector.detectRedFlags(clinicalData, 'Cardiologia', transcript);
      
      expect(detected.length).toBeGreaterThan(0);
      const scaAlert = detected.find(d => d.id === 'sca');
      expect(scaAlert).toBeDefined();
      expect(scaAlert.urgency).toBe('Emergência');
    });

    test('deve detectar Febre com Eritema Malar (Suspeita de LES) a partir da transcrição', async () => {
      const clinicalData = {};
      const transcript = 'Paciente apresenta eritema malar, febre persistente e artralgia nas mãos.';
      
      const detected = await detector.detectRedFlags(clinicalData, 'Reumatologia', transcript);
      
      expect(detected.length).toBeGreaterThan(0);
      const lesSuspect = detected.find(d => d.id === 'febre_eritema_malar');
      expect(lesSuspect).toBeDefined();
      expect(lesSuspect.urgency).toBe('Investigação');
    });

    test('deve retornar vazio se nenhum sinal de alarme estiver presente', async () => {
      const clinicalData = {
        vitalSigns: { pa_systolic: 120, pa_diastolic: 80 },
        symptoms: [{ name: 'cefaleia leve' }]
      };

      const detected = await detector.detectRedFlags(clinicalData, 'Cardiologia', 'Paciente com dor de cabeça leve.');
      expect(detected.length).toBe(0);
    });
  });

  describe('CIDMapper', () => {
    let mapper;

    beforeEach(() => {
      mapper = new CIDMapper();
    });

    test('deve mapear Diabetes Mellitus Tipo 2 para códigos correspondentes', async () => {
      const result = await mapper.mapDiagnosis('Diabetes Mellitus Tipo 2 sem complicações', { age: 45 });
      
      expect(result.status).toBe('VÁLIDO');
      expect(result.primary.icd10.code).toBe('E11.9');
      expect(result.primary.icd11.code).toBe('5A11');
    });

    test('deve mapear Lúpus via alias para código M32', async () => {
      const result = await mapper.mapDiagnosis('les suspeito');
      
      expect(result.primary.diagnosis).toBe('Lupus Eritematoso Sistemico');
      expect(result.primary.icd10.code).toBe('M32.1');
    });

    test('deve marcar como INCERTO se houver falta de especificidade ou faixa etária inconsistente', async () => {
      // Idade baixa para Diabetes Tipo 2
      const result = await mapper.mapDiagnosis('Diabetes Mellitus Tipo 2', { age: 10 });
      
      expect(result.status).toBe('INCERTO');
      const hasAgeIssue = result.contextualIssues.some(i => i.issue === 'Inconsistência demográfica');
      expect(hasAgeIssue).toBe(true);
    });

    test('deve mapear Síndrome de Cushing corretamente', async () => {
      const result = await mapper.mapDiagnosis('Síndrome de Cushing (CID-10: E24.9 | CID-11: 5A70.0)');
      expect(result.primary.diagnosis).toBe('Síndrome de Cushing');
      expect(result.primary.icd10.code).toBe('E24.9');
      expect(result.primary.icd11.code).toBe('5A70');
    });

    test('não deve mapear incorretamente Síndrome de Cushing para Síndrome de Sjögren devido a palavra-chave síndrome', async () => {
      const result = await mapper.mapDiagnosis('Síndrome de Cushing');
      expect(result.primary.diagnosis).not.toBe('Síndrome de Sjögren');
      expect(result.primary.diagnosis).toBe('Síndrome de Cushing');
    });
  });

  describe('QualityValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new QualityValidator();
    });

    test('deve calcular score de completude e apontar gaps', () => {
      const request = {
        specialty: 'Cardiologia',
        extractedData: {
          vitalSigns: { pa_systolic: 150 }, // Falta pa_diastolic, heart_rate, chest_pain
          demographics: { age: 60 }
        }
      };

      const cotResult = {
        conclusion: { primaryDiagnosis: 'Hipertensão Arterial', protocolSource: 'Protocolo SUS' }
      };

      const report = validator.validateQuality(cotResult, request, [{ title: 'Protocolo SUS' }], []);
      
      expect(report.overall).toBeLessThan(90);
      expect(report.components.dataCompleteness.missing).toContain('pa_diastolic');
      expect(report.gaps.length).toBeGreaterThan(0);
    });
  });

  describe('DataExtractor', () => {
    test('deve extrair o peso corretamente sem confundir com IMC', () => {
      const transcript = 'Sinais Vitais: PA: 145 × 95 mmHg; FC: 88 bpm; IMC: 31 kg/m².';
      const weight = DataExtractor.extractWeight(transcript);
      expect(weight).toBe('');
      
      const transcriptWithWeight = 'Paciente relata que está pesando 72 kg ultimamente.';
      const weight2 = DataExtractor.extractWeight(transcriptWithWeight);
      expect(weight2).toBe('72 kg');
    });

    test('deve extrair o IMC do texto corretamente', () => {
      const transcript = 'Sinais Vitais: PA: 145 × 95 mmHg; FC: 88 bpm; IMC: 31 kg/m².';
      const imc = DataExtractor.extractIMC(transcript);
      expect(imc).toBe('31 kg/m²');

      const transcriptShort = 'O IMC do paciente está em 28.5 no momento.';
      const imc2 = DataExtractor.extractIMC(transcriptShort);
      expect(imc2).toBe('28,5 kg/m²');
    });

    test('deve estruturar dados de consulta mapeando IMC e sem contaminar peso', () => {
      const transcript = 'Sinais Vitais: PA: 145 × 95 mmHg; FC: 88 bpm; IMC: 31 kg/m².';
      const data = DataExtractor.extractConsultationData({ transcript });

      expect(data.vitalSigns.weight).toBeUndefined();
      expect(data.vitalSigns.imc).toBe(31);
      expect(data.vitalSigns.pa_systolic).toBe(145);
      expect(data.vitalSigns.pa_diastolic).toBe(95);
    });
  });
});
