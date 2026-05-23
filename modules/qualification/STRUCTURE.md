# Estrutura do Módulo - Qualificador de Encaminhamentos Médicos

## Visão Geral

O módulo de Qualificação é organizado em camadas bem definidas, seguindo o padrão MVC (Model-View-Controller) com separação clara de responsabilidades.

## Estrutura de Diretórios

```
modules/qualification/
├── types.js                          # Definições de tipos e interfaces (JSDoc)
├── data-models.js                    # Classes de modelos de dados
├── persistence.js                    # Camada de persistência (localStorage)
├── qualification.js                  # Módulo principal (QualificationModule)
├── eligibility-engine.js             # Motor de análise de elegibilidade
├── report-generator.js               # Gerador de relatórios
├── history-manager.js                # Gerenciador de histórico
├── qualification-integration.js      # Integração com plataforma
├── qualification-styles-platform.css # Estilos específicos
├── qualification.test.js             # Testes unitários
├── data/
│   ├── protocol-endocrinologia.json  # Protocolo: Endocrinologia
│   ├── protocol-cardiologia.json     # Protocolo: Cardiologia
│   └── protocol-reumatologia.json    # Protocolo: Reumatologia
├── README.md                         # Documentação geral
├── STRUCTURE.md                      # Este arquivo
├── INTEGRATION_GUIDE.md              # Guia de integração
└── example-usage.html                # Exemplo de uso
```

## Camadas da Arquitetura

### 1. Camada de Tipos (types.js)

Define todas as interfaces e tipos usando JSDoc. Fornece documentação e autocomplete para IDEs.

**Responsabilidades:**
- Definir tipos de dados (Protocol, Question, Qualification, etc.)
- Definir enums (QualificationStatus, QuestionType, etc.)
- Documentar estruturas de dados

**Exemplo:**
```javascript
/**
 * @typedef {Object} Protocol
 * @property {string} id - Identificador único
 * @property {string} name - Nome do protocolo
 * @property {Array<Question>} questions - Perguntas
 */
```

### 2. Camada de Modelos (data-models.js)

Implementa classes para representar entidades do domínio com validação e serialização.

**Classes Principais:**
- `Specialty` - Representa uma especialidade médica
- `Question` - Representa uma pergunta do questionário
- `QuestionnaireSection` - Agrupa perguntas em seções
- `Questionnaire` - Questionário completo
- `Response` - Resposta do usuário
- `QualificationResult` - Resultado da análise
- `Qualification` - Qualificação completa
- `AuditLog` - Registro de auditoria

**Funcionalidades:**
- Validação de dados
- Serialização/desserialização (toJSON/fromJSON)
- Métodos de manipulação específicos do domínio

**Exemplo:**
```javascript
const question = new Question(
  'q1',
  'O paciente é gestante?',
  'boolean',
  true,
  null,
  'transcript.pregnancy_status'
);

if (question.validate()) {
  console.log('Pergunta válida');
}
```

### 3. Camada de Persistência (persistence.js)

Gerencia armazenamento e recuperação de dados em localStorage com validação e recuperação de falhas.

**Classes Principais:**
- `PersistenceManager` - Gerencia localStorage
- `SessionStorage` - Gerencia sessionStorage

**Funcionalidades:**
- Salvar/carregar dados com validação
- Verificar espaço disponível
- Exportar/importar dados
- Validar integridade
- Recuperar dados corrompidos
- Criar/restaurar backups

**Exemplo:**
```javascript
const persistence = new PersistenceManager('qualification_');

// Salvar dados
const result = persistence.save('qualifications', qualifications);

// Carregar com validação
const data = persistence.loadWithValidation(
  'qualifications',
  (value) => Array.isArray(value),
  []
);

// Obter informações de armazenamento
const info = persistence.getStorageInfo();
console.log(`Uso: ${info.usagePercent}%`);
```

### 4. Camada de Lógica de Negócio (qualification.js)

Módulo principal que orquestra o fluxo de qualificação.

**Classes Principais:**
- `QualificationModule` - Orquestrador principal
- `Validator` - Validação de dados
- `StorageManager` - Gerenciamento de armazenamento

**Responsabilidades:**
- Inicializar o módulo
- Carregar protocolos
- Gerenciar sessões de qualificação
- Salvar/recuperar qualificações
- Registrar auditoria
- Validar dados

**Exemplo:**
```javascript
const module = new QualificationModule();
await module.initPromise;

// Iniciar sessão
const session = module.startQualificationSession(
  'patient_123',
  'endocrinologia',
  consultationData
);

// Salvar resposta
module.saveResponse('filter_1', true);

// Completar qualificação
const qualification = module.completeQualification(result);
```

### 5. Camada de Análise (eligibility-engine.js)

Motor que analisa respostas contra protocolos e determina elegibilidade.

**Responsabilidades:**
- Avaliar filtros de elegibilidade
- Detectar sinais de alerta
- Validar exames obrigatórios
- Aplicar lógica de decisão

**Exemplo:**
```javascript
const engine = new EligibilityEngine(protocol);
const result = engine.analyze(responses);
// Retorna: { status, justification, alerts, missingExams }
```

### 6. Camada de Relatórios (report-generator.js)

Gera relatórios estruturados em diferentes formatos.

**Responsabilidades:**
- Gerar HTML do relatório
- Exportar para PDF
- Formatar para impressão
- Incluir metadados

**Exemplo:**
```javascript
const generator = new ReportGenerator(qualification);
const html = generator.generateHTML();
const pdf = generator.generatePDF();
```

### 7. Camada de Histórico (history-manager.js)

Gerencia histórico de qualificações por paciente.

**Responsabilidades:**
- Salvar qualificações
- Recuperar histórico
- Filtrar por especialidade
- Ordenar cronologicamente

**Exemplo:**
```javascript
const manager = new HistoryManager();
manager.saveQualification(qualification);
const history = manager.getPatientHistory('patient_123');
```

### 8. Camada de Integração (qualification-integration.js)

Integra o módulo com a plataforma de gestão clínica.

**Responsabilidades:**
- Adicionar botão de qualificação
- Extrair dados da consulta
- Integrar com UI da plataforma
- Sincronizar com histórico de pacientes

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INICIALIZAÇÃO                                            │
│    - QualificationModule.initialize()                       │
│    - Carregar protocolos do localStorage ou JSON            │
│    - Carregar qualificações anteriores                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SELEÇÃO DE ESPECIALIDADE                                 │
│    - Usuário seleciona especialidade                        │
│    - Validar especialidade                                  │
│    - Carregar protocolo correspondente                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PRÉ-PREENCHIMENTO                                        │
│    - Extrair dados da consulta (ConsultationData)           │
│    - Mapear para campos do questionário                     │
│    - Exibir questionário pré-preenchido                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RESPOSTA AO QUESTIONÁRIO                                 │
│    - Usuário responde perguntas                             │
│    - Validar cada resposta (Validator)                      │
│    - Salvar em sessionStorage (auto-save)                   │
│    - Persistir em localStorage periodicamente               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. ANÁLISE DE ELEGIBILIDADE                                 │
│    - EligibilityEngine.analyze(responses)                   │
│    - Avaliar filtros → Detectar alertas → Validar exames   │
│    - Retornar resultado (QualificationResult)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. GERAÇÃO DE RELATÓRIO                                     │
│    - ReportGenerator.generateHTML()                         │
│    - Incluir resultado, justificativa, alertas, exames      │
│    - Formatar para PDF/impressão                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. PERSISTÊNCIA                                             │
│    - Salvar qualificação em localStorage                    │
│    - Atualizar histórico do paciente                        │
│    - Registrar auditoria                                    │
│    - Limpar sessão temporária                               │
└─────────────────────────────────────────────────────────────┘
```

## Padrões de Uso

### Inicializar o Módulo

```javascript
const qualificationModule = new QualificationModule();
await qualificationModule.initPromise;
```

### Iniciar Qualificação

```javascript
const session = qualificationModule.startQualificationSession(
  'patient_123',
  'endocrinologia',
  {
    patientName: 'João Silva',
    patientAge: 45,
    // ... mais dados da consulta
  }
);
```

### Salvar Respostas

```javascript
qualificationModule.saveResponse('filter_1', true);
qualificationModule.saveResponse('filter_2', false);
qualificationModule.saveResponse('exam_hba1c', 'Resultado Disponível');
```

### Analisar Elegibilidade

```javascript
const engine = new EligibilityEngine(protocol);
const result = engine.analyze(qualificationModule.currentSession.responses);
```

### Completar Qualificação

```javascript
const qualification = qualificationModule.completeQualification(result);
```

### Gerar Relatório

```javascript
const generator = new ReportGenerator(qualification);
const html = generator.generateHTML();
const pdf = generator.generatePDF();
```

### Recuperar Histórico

```javascript
const history = qualificationModule.getPatientQualificationHistory('patient_123');
```

## Validação de Dados

### Validação de Resposta

```javascript
const question = new Question('q1', 'Pergunta?', 'boolean', true);
const isValid = question.validateResponse(true);
```

### Validação de Questionário

```javascript
const validator = new Validator();
const result = validator.validateQuestionnaire(responses, questionnaire);
if (!result.valid) {
  console.log('Erros:', result.errors);
}
```

### Validação de Integridade

```javascript
const persistence = new PersistenceManager();
const integrity = persistence.validateIntegrity();
if (!integrity.valid) {
  console.log('Erros encontrados:', integrity.errors);
}
```

## Persistência de Dados

### Salvar Dados

```javascript
const persistence = new PersistenceManager();
const result = persistence.save('qualifications', qualifications);
if (result.success) {
  console.log(`Dados salvos: ${result.size} bytes`);
}
```

### Carregar Dados

```javascript
const qualifications = persistence.load('qualifications', []);
```

### Carregar com Validação

```javascript
const qualifications = persistence.loadWithValidation(
  'qualifications',
  (value) => Array.isArray(value),
  []
);
```

### Exportar/Importar

```javascript
// Exportar
const backup = persistence.exportAll();
const backupString = JSON.stringify(backup);

// Importar
const result = persistence.importAll(JSON.parse(backupString));
```

## Auditoria

Todos os eventos importantes são registrados em logs de auditoria:

```javascript
qualificationModule.logAuditEvent('QUALIFICATION_COMPLETED', {
  qualificationId: 'qual_123',
  patientId: 'patient_123',
  specialty: 'endocrinologia',
  result: 'QUALIFICADO'
});
```

## Tratamento de Erros

O módulo implementa tratamento robusto de erros:

```javascript
try {
  const session = qualificationModule.startQualificationSession(...);
} catch (error) {
  console.error('Erro ao iniciar sessão:', error.message);
  // Exibir mensagem ao usuário
}
```

## Conformidade e Segurança

### Validação de Entrada

Todas as entradas são validadas antes de serem processadas:

```javascript
const sanitized = Validator.sanitizeInput(userInput);
```

### Integridade de Dados

Dados são verificados quanto à integridade:

```javascript
const integrity = persistence.validateIntegrity();
if (!integrity.valid) {
  persistence.recoverCorruptedData();
}
```

### Auditoria Completa

Todas as ações são registradas para conformidade LGPD/HIPAA:

```javascript
const auditLogs = qualificationModule.auditLogs;
```

## Próximos Passos

1. **Implementar EligibilityEngine** - Motor de análise de elegibilidade
2. **Implementar ReportGenerator** - Gerador de relatórios
3. **Implementar HistoryManager** - Gerenciador de histórico
4. **Integrar com UI** - Criar componentes visuais
5. **Testes** - Escrever testes unitários e de integração
6. **Documentação** - Criar guias de uso

## Referências

- [types.js](./types.js) - Definições de tipos
- [data-models.js](./data-models.js) - Modelos de dados
- [persistence.js](./persistence.js) - Persistência
- [qualification.js](./qualification.js) - Módulo principal
- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Guia de integração
