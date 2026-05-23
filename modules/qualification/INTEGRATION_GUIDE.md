# Guia de Integração - Qualificador de Encaminhamentos Médicos

## Visão Geral

Este guia descreve como integrar o módulo de Qualificação com a plataforma de gestão clínica existente.

## Pré-requisitos

- Navegador moderno com suporte a localStorage e sessionStorage
- JavaScript ES6+
- Acesso aos dados da consulta (SOAP, Anamnese, etc.)

## Instalação

### 1. Incluir Scripts

Adicione os scripts na ordem correta (dependências primeiro):

```html
<!-- Tipos e Constantes -->
<script src="modules/qualification/types.js"></script>

<!-- Modelos de Dados -->
<script src="modules/qualification/data-models.js"></script>

<!-- Persistência -->
<script src="modules/qualification/persistence.js"></script>

<!-- Módulo Principal -->
<script src="modules/qualification/qualification.js"></script>

<!-- Motores e Gerenciadores (quando implementados) -->
<script src="modules/qualification/eligibility-engine.js"></script>
<script src="modules/qualification/report-generator.js"></script>
<script src="modules/qualification/history-manager.js"></script>

<!-- Integração com Plataforma -->
<script src="modules/qualification/qualification-integration.js"></script>

<!-- Índice (opcional, para facilitar acesso) -->
<script src="modules/qualification/index.js"></script>
```

### 2. Incluir Estilos

```html
<link rel="stylesheet" href="modules/qualification/qualification-styles-platform.css">
```

## Inicialização

### Inicializar o Módulo

```javascript
// Criar instância do módulo
const qualificationModule = new QualificationModule();

// Aguardar inicialização (carregamento de protocolos)
qualificationModule.initPromise.then(() => {
  console.log('✅ Módulo de Qualificação inicializado');
}).catch(error => {
  console.error('❌ Erro ao inicializar módulo:', error);
});
```

## Integração com Fluxo de Consulta

### 1. Adicionar Botão de Qualificação

Após a geração bem-sucedida de um prontuário, adicione um botão para qualificação:

```javascript
function displayProntuarioResults(prontuario) {
  // ... código existente para exibir prontuário ...
  
  // Adicionar botão de qualificação
  const qualifyButton = document.createElement('button');
  qualifyButton.id = 'btn-qualify-referral';
  qualifyButton.className = 'btn btn-primary';
  qualifyButton.textContent = 'Qualificar para Encaminhamento';
  qualifyButton.addEventListener('click', () => {
    openQualificationModal(prontuario);
  });
  
  resultsPanel.appendChild(qualifyButton);
}
```

### 2. Abrir Modal de Qualificação

```javascript
function openQualificationModal(prontuario) {
  // Extrair dados da consulta
  const consultationData = extractConsultationData(prontuario);
  
  // Criar modal
  const modal = createQualificationModal(consultationData);
  
  // Exibir modal
  document.body.appendChild(modal);
  modal.showModal();
}
```

### 3. Extrair Dados da Consulta

```javascript
function extractConsultationData(prontuario) {
  return {
    patientName: prontuario.patient?.name || '',
    patientAge: calculateAge(prontuario.patient?.birthDate),
    patientGender: prontuario.patient?.gender || '',
    
    // Dados do SOAP
    subjective: {
      chiefComplaint: prontuario.subjective?.chiefComplaint || '',
      historyOfPresentIllness: prontuario.subjective?.history || '',
      relevantHistory: prontuario.subjective?.relevantHistory || ''
    },
    
    objective: {
      vitalSigns: {
        bloodPressure: prontuario.objective?.bloodPressure || '',
        heartRate: prontuario.objective?.heartRate || '',
        temperature: prontuario.objective?.temperature || '',
        bloodGlucose: prontuario.objective?.bloodGlucose || ''
      },
      physicalExam: prontuario.objective?.physicalExam || '',
      labResults: prontuario.objective?.labResults || {}
    },
    
    assessment: {
      diagnoses: prontuario.assessment?.diagnoses || [],
      clinicalReasoning: prontuario.assessment?.reasoning || ''
    },
    
    plan: {
      medications: prontuario.plan?.medications || [],
      requestedExams: prontuario.plan?.exams || [],
      recommendations: prontuario.plan?.recommendations || ''
    }
  };
}
```

## Fluxo de Qualificação

### 1. Iniciar Sessão

```javascript
function startQualification(patientId, specialty, consultationData) {
  try {
    const session = qualificationModule.startQualificationSession(
      patientId,
      specialty,
      consultationData
    );
    
    console.log('✅ Sessão iniciada:', session.id);
    return session;
  } catch (error) {
    console.error('❌ Erro ao iniciar sessão:', error);
    showErrorMessage('Erro ao iniciar qualificação');
  }
}
```

### 2. Pré-preencher Questionário

```javascript
function prefillQuestionnaire(questionnaire, consultationData) {
  const prefilled = {};
  
  questionnaire.getAllQuestions().forEach(question => {
    if (question.prefilledFrom) {
      const value = getValueByPath(consultationData, question.prefilledFrom);
      if (value !== undefined) {
        prefilled[question.id] = value;
      }
    }
  });
  
  return prefilled;
}

function getValueByPath(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}
```

### 3. Salvar Respostas

```javascript
function handleQuestionResponse(questionId, response) {
  try {
    // Validar resposta
    const question = questionnaire.getQuestion(questionId);
    if (!question.validateResponse(response)) {
      showErrorMessage(`Resposta inválida para: ${question.text}`);
      return false;
    }
    
    // Salvar resposta
    qualificationModule.saveResponse(questionId, response);
    
    // Atualizar UI
    updateQuestionUI(questionId, response);
    
    return true;
  } catch (error) {
    console.error('Erro ao salvar resposta:', error);
    return false;
  }
}
```

### 4. Analisar Elegibilidade

```javascript
function analyzeEligibility() {
  try {
    // Validar questionário completo
    const validation = Validator.validateQuestionnaire(
      qualificationModule.currentSession.responses,
      questionnaire
    );
    
    if (!validation.valid) {
      showErrorMessage('Por favor, preencha todos os campos obrigatórios');
      return null;
    }
    
    // Analisar elegibilidade
    const engine = new EligibilityEngine(protocol);
    const result = engine.analyze(qualificationModule.currentSession.responses);
    
    console.log('✅ Análise concluída:', result.status);
    return result;
  } catch (error) {
    console.error('Erro ao analisar elegibilidade:', error);
    showErrorMessage('Erro ao analisar elegibilidade');
    return null;
  }
}
```

### 5. Gerar Relatório

```javascript
function generateReport(result) {
  try {
    const qualification = qualificationModule.completeQualification(result);
    
    // Gerar relatório
    const generator = new ReportGenerator(qualification);
    const html = generator.generateHTML();
    
    // Exibir relatório
    displayReport(html);
    
    // Permitir download/impressão
    enableReportActions(qualification);
    
    return qualification;
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    showErrorMessage('Erro ao gerar relatório');
    return null;
  }
}
```

## Integração com Histórico de Pacientes

### 1. Carregar Histórico

```javascript
function loadPatientQualificationHistory(patientId) {
  try {
    const history = qualificationModule.getPatientQualificationHistory(patientId);
    
    if (history.length === 0) {
      console.log('Nenhuma qualificação anterior');
      return [];
    }
    
    console.log(`✅ ${history.length} qualificações encontradas`);
    return history;
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    return [];
  }
}
```

### 2. Exibir Histórico

```javascript
function displayQualificationHistory(patientId) {
  const history = loadPatientQualificationHistory(patientId);
  
  if (history.length === 0) {
    return '<p>Nenhuma qualificação anterior</p>';
  }
  
  let html = '<div class="qualification-history">';
  html += '<h3>Histórico de Qualificações</h3>';
  html += '<ul>';
  
  history.forEach(qual => {
    const date = new Date(qual.metadata.createdAt).toLocaleDateString('pt-BR');
    const statusClass = `status-${qual.result.status.toLowerCase()}`;
    
    html += `
      <li class="${statusClass}">
        <strong>${qual.specialty}</strong> - ${date}
        <span class="status">${qual.result.status}</span>
        <button onclick="viewQualification('${qual.id}')">Ver Detalhes</button>
      </li>
    `;
  });
  
  html += '</ul></div>';
  return html;
}
```

### 3. Visualizar Qualificação Anterior

```javascript
function viewQualification(qualificationId) {
  const qualification = qualificationModule.getQualification(qualificationId);
  
  if (!qualification) {
    showErrorMessage('Qualificação não encontrada');
    return;
  }
  
  const generator = new ReportGenerator(qualification);
  const html = generator.generateHTML();
  
  displayReport(html);
}
```

## Tratamento de Erros

### Validação de Compatibilidade

```javascript
function checkBrowserCompatibility() {
  const required = {
    localStorage: typeof localStorage !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined',
    JSON: typeof JSON !== 'undefined',
    Promise: typeof Promise !== 'undefined'
  };
  
  const missing = Object.entries(required)
    .filter(([_, available]) => !available)
    .map(([feature, _]) => feature);
  
  if (missing.length > 0) {
    console.error('❌ Navegador não compatível. Recursos faltantes:', missing);
    showErrorMessage('Seu navegador não é compatível com este módulo');
    return false;
  }
  
  console.log('✅ Navegador compatível');
  return true;
}
```

### Recuperação de Sessão

```javascript
function recoverSession(patientId) {
  const session = qualificationModule.recoverSession(patientId);
  
  if (session) {
    console.log('✅ Sessão anterior recuperada');
    showInfoMessage('Sua qualificação anterior foi recuperada');
    return session;
  }
  
  return null;
}
```

### Validação de Integridade

```javascript
function validateDataIntegrity() {
  const persistence = new PersistenceManager();
  const integrity = persistence.validateIntegrity();
  
  if (!integrity.valid) {
    console.warn('⚠️ Problemas de integridade detectados:', integrity.errors);
    
    // Tentar recuperar
    const recovery = persistence.recoverCorruptedData();
    console.log(`Recuperados: ${recovery.recovered}, Erros: ${recovery.errors}`);
  }
  
  return integrity.valid;
}
```

## Exemplos de Uso Completo

### Exemplo 1: Fluxo Simples

```javascript
// 1. Inicializar
const module = new QualificationModule();
await module.initPromise;

// 2. Iniciar sessão
const session = module.startQualificationSession(
  'patient_123',
  'endocrinologia',
  consultationData
);

// 3. Salvar respostas
module.saveResponse('filter_1', true);
module.saveResponse('filter_2', false);

// 4. Analisar
const engine = new EligibilityEngine(protocol);
const result = engine.analyze(session.responses);

// 5. Completar
const qualification = module.completeQualification(result);

console.log('✅ Qualificação concluída:', qualification.id);
```

### Exemplo 2: Com Tratamento de Erros

```javascript
async function qualifyPatient(patientId, specialty, prontuario) {
  try {
    // Validar compatibilidade
    if (!checkBrowserCompatibility()) {
      return;
    }
    
    // Inicializar
    const module = new QualificationModule();
    await module.initPromise;
    
    // Extrair dados
    const consultationData = extractConsultationData(prontuario);
    
    // Iniciar sessão
    const session = module.startQualificationSession(
      patientId,
      specialty,
      consultationData
    );
    
    // Pré-preencher
    const protocol = module.protocols[specialty];
    const questionnaire = Questionnaire.fromJSON(protocol.questionnaire);
    const prefilled = prefillQuestionnaire(questionnaire, consultationData);
    
    // Salvar respostas pré-preenchidas
    Object.entries(prefilled).forEach(([questionId, value]) => {
      module.saveResponse(questionId, value);
    });
    
    // Analisar
    const engine = new EligibilityEngine(protocol);
    const result = engine.analyze(module.currentSession.responses);
    
    // Completar
    const qualification = module.completeQualification(result);
    
    // Gerar relatório
    const generator = new ReportGenerator(qualification);
    const html = generator.generateHTML();
    
    // Exibir
    displayReport(html);
    
    return qualification;
    
  } catch (error) {
    console.error('❌ Erro na qualificação:', error);
    showErrorMessage(`Erro: ${error.message}`);
    return null;
  }
}
```

## Boas Práticas

### 1. Sempre Validar Dados

```javascript
// ✅ BOM
const question = questionnaire.getQuestion(questionId);
if (question && question.validateResponse(response)) {
  module.saveResponse(questionId, response);
}

// ❌ RUIM
module.saveResponse(questionId, response);
```

### 2. Usar Try-Catch

```javascript
// ✅ BOM
try {
  const result = engine.analyze(responses);
} catch (error) {
  console.error('Erro:', error);
  showErrorMessage('Erro ao analisar');
}

// ❌ RUIM
const result = engine.analyze(responses);
```

### 3. Verificar Compatibilidade

```javascript
// ✅ BOM
if (typeof localStorage !== 'undefined') {
  persistence.save('key', value);
}

// ❌ RUIM
persistence.save('key', value); // Pode falhar
```

### 4. Sanitizar Entrada

```javascript
// ✅ BOM
const sanitized = Validator.sanitizeInput(userInput);
module.saveResponse(questionId, sanitized);

// ❌ RUIM
module.saveResponse(questionId, userInput);
```

## Troubleshooting

### Problema: "localStorage não disponível"

**Solução:** Verificar se o navegador está em modo privado ou se localStorage está desabilitado.

```javascript
if (typeof localStorage === 'undefined') {
  console.error('localStorage não disponível');
  // Usar sessionStorage como fallback
}
```

### Problema: "Protocolo não encontrado"

**Solução:** Verificar se os arquivos JSON estão no caminho correto.

```javascript
// Verificar se protocolo foi carregado
if (!module.protocols.endocrinologia) {
  console.error('Protocolo não carregado');
  // Tentar carregar manualmente
}
```

### Problema: "Dados corrompidos"

**Solução:** Validar e recuperar dados.

```javascript
const persistence = new PersistenceManager();
const integrity = persistence.validateIntegrity();

if (!integrity.valid) {
  persistence.recoverCorruptedData();
}
```

## Próximos Passos

1. Implementar componentes visuais (modal, questionário, relatório)
2. Integrar com sistema de autenticação
3. Adicionar notificações e alertas
4. Implementar testes automatizados
5. Documentar APIs específicas

## Referências

- [STRUCTURE.md](./STRUCTURE.md) - Estrutura do módulo
- [types.js](./types.js) - Definições de tipos
- [data-models.js](./data-models.js) - Modelos de dados
- [persistence.js](./persistence.js) - Persistência
- [qualification.js](./qualification.js) - Módulo principal
