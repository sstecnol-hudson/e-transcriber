# Design Técnico - Qualificador de Encaminhamentos Médicos

## 1. Overview

O **Qualificador de Encaminhamentos Médicos** é um módulo da plataforma de gestão clínica integrada que automatiza a qualificação de pacientes para encaminhamento a especialistas. O sistema implementa protocolos clínicos validados pelo Ministério da Saúde para três especialidades iniciais: Endocrinologia, Cardiologia e Reumatologia.

### Objetivos Técnicos

- Integrar perfeitamente com o fluxo de consultas da plataforma
- Implementar lógica de elegibilidade baseada em protocolos clínicos
- Detectar sinais de alerta clínicos automaticamente
- Gerar relatórios estruturados para encaminhamento
- Manter auditoria completa de todas as qualificações
- Garantir conformidade com LGPD/HIPAA

### Contexto de Integração

O módulo é acionado após a geração bem-sucedida de um prontuário (SOAP, Anamnese, Evolução ou Orientação) de uma consulta médica. Um botão "Qualificar para Encaminhamento" aparece nos resultados, permitindo que o médico qualifique o paciente sem sair da plataforma.

---

## 2. Arquitetura Geral

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│         PLATAFORMA DE GESTÃO CLÍNICA INTEGRADA                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Módulos da Plataforma (Transcrição, Prontuários, etc.)  │  │
│  │  - Captura de Dados Clínicos                             │  │
│  │  - Geração de Prontuários (SOAP, Anamnese, etc.)        │  │
│  │  - Gestão de Pacientes                                   │  │
│  │  - Histórico de Consultas                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Qualificador de Encaminhamentos (NOVO)                  │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ Modal de Seleção de Especialidade                 │ │  │
│  │  │ - Endocrinologia                                  │ │  │
│  │  │ - Cardiologia                                     │ │  │
│  │  │ - Reumatologia                                    │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                      ↓                                   │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ Questionário Dinâmico                              │ │  │
│  │  │ - Pré-preenchimento de dados da consulta           │ │  │
│  │  │ - Validação de respostas                           │ │  │
│  │  │ - Persistência em localStorage                     │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                      ↓                                   │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ Motor de Análise de Elegibilidade                  │ │  │
│  │  │ - Avaliação de Filtros de Elegibilidade            │ │  │
│  │  │ - Detecção de Sinais de Alerta                     │ │  │
│  │  │ - Validação de Exames Obrigatórios                 │ │  │
│  │  │ - Aplicação de Protocolos Clínicos                 │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                      ↓                                   │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ Gerador de Relatórios                              │ │  │
│  │  │ - Resultado Final (Qualificado/Não/Urgência)       │ │  │
│  │  │ - Justificativa Clínica                            │ │  │
│  │  │ - Exames Faltantes                                 │ │  │
│  │  │ - Recomendações                                    │ │  │
│  │  │ - Export PDF/Print                                 │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                      ↓                                   │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ Gerenciador de Histórico                           │ │  │
│  │  │ - Persistência de Qualificações                    │ │  │
│  │  │ - Auditoria e Conformidade                         │ │  │
│  │  │ - Recuperação de Dados                             │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Camada de Persistência (localStorage)                   │  │
│  │  - Protocolos Clínicos                                   │  │
│  │  - Qualificações Completadas                             │  │
│  │  - Estado de Sessão                                      │  │
│  │  - Logs de Auditoria                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Dados

```
Prontuário Gerado
       ↓
Botão "Qualificar" Aparece
       ↓
Usuário Clica Botão
       ↓
Modal de Especialidades Abre
       ↓
Usuário Seleciona Especialidade
       ↓
Sistema Carrega Protocolo
       ↓
Questionário Pré-preenchido com Dados da Consulta
       ↓
Usuário Responde Perguntas
       ↓
Respostas Salvas em localStorage (auto-save)
       ↓
Usuário Clica "Analisar"
       ↓
Motor de Elegibilidade Processa:
  1. Avalia Filtros de Elegibilidade
  2. Detecta Sinais de Alerta
  3. Valida Exames Obrigatórios
       ↓
Resultado Determinado:
  - Qualificado
  - Qualificado com Ressalvas
  - Não Qualificado
  - Urgência
       ↓
Relatório Gerado
       ↓
Usuário Pode:
  - Visualizar Relatório
  - Baixar PDF
  - Imprimir
  - Salvar no Histórico
       ↓
Qualificação Persistida em localStorage
       ↓
Auditoria Registrada
```

---

## 3. Componentes Principais

### 3.1 Modal de Seleção de Especialidade

**Responsabilidade:** Permitir que o usuário selecione a especialidade para qualificação.

**Estrutura:**
```javascript
{
  id: 'qualification-specialty-modal',
  title: 'Selecione a Especialidade',
  specialties: [
    {
      id: 'endocrinologia',
      name: 'Endocrinologia',
      description: 'Diabetes Mellitus tipo 2 e complicações',
      icon: '🩺'
    },
    {
      id: 'cardiologia',
      name: 'Cardiologia',
      description: 'Hipertensão Arterial Crônica',
      icon: '❤️'
    },
    {
      id: 'reumatologia',
      name: 'Reumatologia',
      description: 'Lúpus, Artrite Reumatóide e Artrose',
      icon: '🦴'
    }
  ]
}
```

**Comportamento:**
- Exibe três opções de especialidade com descrição
- Valida seleção contra lista de especialidades suportadas
- Carrega protocolo correspondente ao selecionar
- Trata erros de carregamento com mensagem clara
- Permite cancelamento sem perder dados

### 3.2 Questionário Dinâmico

**Responsabilidade:** Coletar respostas estruturadas do médico baseadas no protocolo.

**Estrutura:**
```javascript
{
  specialtyId: 'endocrinologia',
  sections: [
    {
      id: 'elegibilidade',
      title: 'Filtros de Elegibilidade',
      questions: [
        {
          id: 'q1',
          text: 'O paciente é gestante?',
          type: 'boolean',
          required: true,
          prefilledFrom: 'transcript.pregnancy_status'
        },
        // ... mais perguntas
      ]
    },
    {
      id: 'sinais_alerta',
      title: 'Sinais de Alerta',
      questions: [
        // ... perguntas sobre sinais de alerta
      ]
    },
    {
      id: 'exames',
      title: 'Checklist de Exames Obrigatórios',
      questions: [
        {
          id: 'exam_hba1c',
          text: 'Hemoglobina Glicada (HbA1c)',
          type: 'exam_status',
          options: ['Não Realizado', 'Realizado', 'Resultado Disponível'],
          required: true
        },
        // ... mais exames
      ]
    }
  ]
}
```

**Funcionalidades:**
- Pré-preenchimento automático de dados da consulta
- Validação de respostas em tempo real
- Persistência automática em localStorage
- Recuperação de estado anterior se página for recarregada
- Suporte a diferentes tipos de pergunta (boolean, text, number, select, exam_status)
- Scroll position preservation

### 3.3 Motor de Análise de Elegibilidade

**Responsabilidade:** Avaliar respostas contra protocolos clínicos e determinar elegibilidade.

**Estrutura:**
```javascript
class EligibilityEngine {
  constructor(protocol) {
    this.protocol = protocol;
  }

  analyze(responses) {
    // 1. Avaliar Filtros de Elegibilidade
    const eligibilityResult = this.evaluateEligibilityFilters(responses);
    if (!eligibilityResult.passed) {
      return {
        status: 'NAO_QUALIFICADO',
        reason: eligibilityResult.failedFilter,
        alerts: [],
        missingExams: []
      };
    }

    // 2. Detectar Sinais de Alerta
    const alerts = this.detectAlerts(responses);
    if (alerts.length > 0) {
      return {
        status: 'URGENCIA',
        alerts: alerts,
        missingExams: []
      };
    }

    // 3. Validar Exames Obrigatórios
    const examResult = this.validateExams(responses);
    return {
      status: examResult.allPresent ? 'QUALIFICADO' : 'QUALIFICADO_COM_RESSALVAS',
      alerts: [],
      missingExams: examResult.missing
    };
  }

  evaluateEligibilityFilters(responses) {
    // Aplicar lógica de cada filtro conforme protocolo
  }

  detectAlerts(responses) {
    // Detectar sinais de alerta conforme protocolo
  }

  validateExams(responses) {
    // Validar presença de exames obrigatórios
  }
}
```

**Lógica de Decisão:**
1. Se qualquer Filtro de Elegibilidade falha → "Não Qualificado"
2. Se algum Sinal de Alerta é detectado → "Urgência" (prioridade máxima)
3. Se todos os exames obrigatórios presentes → "Qualificado"
4. Se alguns exames faltam → "Qualificado com Ressalvas"

### 3.4 Gerador de Relatórios

**Responsabilidade:** Gerar relatório estruturado com resultado da qualificação.

**Estrutura:**
```javascript
{
  id: 'qual_' + timestamp,
  patientId: 'patient_123',
  specialty: 'endocrinologia',
  timestamp: Date.now(),
  result: {
    status: 'QUALIFICADO',
    justification: 'Paciente atende a todos os critérios...',
    alerts: [],
    missingExams: [],
    recommendations: 'Encaminhar para Endocrinologia...'
  },
  metadata: {
    doctor: 'Dr. João Silva',
    clinic: 'Clínica ABC',
    autoPopulatedFields: ['age', 'diagnosis'],
    manuallyEnteredFields: ['hba1c_value']
  },
  auditTrail: {
    createdAt: timestamp,
    createdBy: 'doctor_id',
    ipAddress: 'xxx.xxx.xxx.xxx',
    userAgent: 'Mozilla/5.0...'
  }
}
```

**Formatos de Saída:**
- HTML (visualização na tela)
- PDF (download)
- Texto (impressão)

### 3.5 Gerenciador de Histórico

**Responsabilidade:** Persistir e recuperar qualificações anteriores.

**Estrutura:**
```javascript
{
  patientId: 'patient_123',
  qualifications: [
    {
      id: 'qual_1704067200000',
      specialty: 'endocrinologia',
      date: '2024-01-01',
      result: 'QUALIFICADO',
      status: 'QUALIFICADO'
    },
    // ... mais qualificações
  ]
}
```

**Funcionalidades:**
- Listar todas as qualificações de um paciente
- Recuperar qualificação anterior completa
- Comparar qualificações lado a lado
- Ordenar por data (mais recente primeiro)
- Filtrar por especialidade

---

## 4. Estrutura de Dados

### 4.1 Protocolos Clínicos

Cada protocolo é um objeto JSON que define as regras de elegibilidade, sinais de alerta e exames obrigatórios.

**Protocolo Endocrinologia:**
```javascript
{
  id: 'endocrinologia',
  name: 'Endocrinologia - Diabetes Mellitus tipo 2',
  version: '1.0',
  lastUpdated: '2024-01-01',
  
  eligibilityFilters: [
    {
      id: 'filter_1',
      question: 'O paciente é gestante?',
      type: 'alert_trigger',
      logic: 'if_yes_then_urgency'
    },
    {
      id: 'filter_2',
      question: 'O paciente tem menos de 15 anos?',
      type: 'alert_trigger',
      logic: 'if_yes_then_urgency'
    },
    {
      id: 'filter_3',
      question: 'HbA1c > 9% mesmo com insulina/múltiplos remédios?',
      type: 'qualification_criteria',
      logic: 'if_yes_then_qualified'
    },
    {
      id: 'filter_4',
      question: 'Complicações graves ativas?',
      type: 'qualification_criteria',
      logic: 'if_yes_then_qualified'
    },
    {
      id: 'filter_5',
      question: 'Paciente em uso de insulina há > 6 meses com controle inadequado?',
      type: 'qualification_criteria',
      logic: 'if_no_then_not_qualified'
    }
  ],

  alerts: [
    {
      id: 'alert_1',
      name: 'Cetoacidose Diabética',
      conditions: ['glicemia > 300', 'vômitos', 'hálito cetônico', 'confusão'],
      recommendation: 'Encaminhar para UPA imediatamente'
    },
    {
      id: 'alert_2',
      name: 'Hipoglicemia Severa',
      conditions: ['glicemia < 70', 'sintomas neurológicos graves'],
      recommendation: 'Encaminhar para UPA imediatamente'
    },
    {
      id: 'alert_3',
      name: 'Risco de Amputação',
      conditions: ['pé diabético', 'úlcera infectada', 'necrose'],
      recommendation: 'Encaminhar para cirurgia urgentemente'
    }
  ],

  requiredExams: [
    { id: 'exam_1', name: 'Hemoglobina Glicada (HbA1c)', maxAgeDays: 180 },
    { id: 'exam_2', name: 'Creatinina sérica', maxAgeDays: 180 },
    { id: 'exam_3', name: 'Exame de Urina (EAS/Microalbuminúria)', maxAgeDays: 180 },
    { id: 'exam_4', name: 'Fundo de Olho / Avaliação Oftalmológica', maxAgeDays: 365 },
    { id: 'exam_5', name: 'Lipidograma', maxAgeDays: 180 },
    { id: 'exam_6', name: 'Eletrocardiograma', maxAgeDays: 365 }
  ]
}
```

**Protocolo Cardiologia:**
```javascript
{
  id: 'cardiologia',
  name: 'Cardiologia - Hipertensão Arterial Crônica',
  version: '1.0',
  // ... estrutura similar
}
```

**Protocolo Reumatologia:**
```javascript
{
  id: 'reumatologia',
  name: 'Reumatologia - Lúpus, Artrite e Artrose',
  version: '1.0',
  // ... estrutura similar
}
```

### 4.2 Qualificações

Cada qualificação completada é persistida com metadados completos.

```javascript
{
  id: 'qual_1704067200000',
  patientId: 'patient_123',
  patientName: 'João Silva',
  patientAge: 45,
  specialty: 'endocrinologia',
  
  responses: {
    'filter_1': false,
    'filter_2': false,
    'filter_3': true,
    'filter_4': false,
    'filter_5': true,
    'exam_hba1c': 'Resultado Disponível',
    'exam_creatinina': 'Realizado',
    // ... mais respostas
  },

  result: {
    status: 'QUALIFICADO',
    justification: 'Paciente atende aos critérios de elegibilidade...',
    alerts: [],
    missingExams: [],
    recommendations: 'Encaminhar para Endocrinologia para avaliação...'
  },

  metadata: {
    createdAt: 1704067200000,
    createdBy: 'doctor_123',
    doctorName: 'Dr. João Silva',
    clinicName: 'Clínica ABC',
    autoPopulatedFields: ['age', 'diagnosis'],
    manuallyEnteredFields: ['hba1c_value']
  },

  auditTrail: {
    timestamp: 1704067200000,
    userId: 'doctor_123',
    action: 'QUALIFICATION_COMPLETED',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    dataHash: 'sha256_hash_of_responses'
  }
}
```

### 4.3 Auditoria

Logs de auditoria para conformidade LGPD/HIPAA.

```javascript
{
  id: 'audit_1704067200000',
  timestamp: 1704067200000,
  userId: 'doctor_123',
  action: 'QUALIFICATION_STARTED',
  resource: 'qualification',
  resourceId: 'qual_1704067200000',
  details: {
    patientId: 'patient_123',
    specialty: 'endocrinologia'
  },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  status: 'SUCCESS'
}
```

---

## 5. Fluxos de Dados Detalhados

### 5.1 Fluxo de Qualificação Completo

```
1. INICIALIZAÇÃO
   - Prontuário gerado com sucesso
   - Botão "Qualificar" aparece
   - Usuário clica botão
   - Modal de especialidades abre

2. SELEÇÃO DE ESPECIALIDADE
   - Usuário seleciona especialidade
   - Sistema valida seleção
   - Sistema carrega protocolo
   - Sistema carrega questionário

3. PRÉ-PREENCHIMENTO
   - Sistema extrai dados da consulta:
     * Dados demográficos (idade, sexo)
     * Diagnósticos mencionados
     * Medicações prescritas
     * Sinais vitais registrados
     * Exames mencionados
   - Sistema pré-popula campos correspondentes
   - Usuário pode editar qualquer campo

4. RESPOSTA AO QUESTIONÁRIO
   - Usuário responde perguntas
   - Cada resposta é validada
   - Respostas são salvas em localStorage
   - Usuário pode sair e voltar sem perder dados

5. ANÁLISE DE ELEGIBILIDADE
   - Usuário clica "Analisar"
   - Motor de elegibilidade processa:
     a) Avalia Filtros de Elegibilidade
     b) Se algum falha → "Não Qualificado"
     c) Se todos passam → continua
     d) Detecta Sinais de Alerta
     e) Se algum detectado → "Urgência"
     f) Se nenhum → continua
     g) Valida Exames Obrigatórios
     h) Se todos presentes → "Qualificado"
     i) Se alguns faltam → "Qualificado com Ressalvas"

6. GERAÇÃO DE RELATÓRIO
   - Sistema gera relatório com:
     * Resultado final
     * Justificativa clínica
     * Sinais de alerta detectados
     * Exames faltantes
     * Recomendações
     * Metadados (data, médico, clínica)

7. AÇÕES DO USUÁRIO
   - Visualizar relatório na tela
   - Baixar como PDF
   - Imprimir
   - Salvar no histórico do paciente

8. PERSISTÊNCIA
   - Qualificação salva em localStorage
   - Auditoria registrada
   - Histórico atualizado
```

### 5.2 Pré-preenchimento de Dados

```
Dados Extraídos da Consulta:
├── Dados Demográficos
│   ├── Nome do paciente
│   ├── Idade / Data de nascimento
│   └── Sexo
├── Diagnósticos
│   ├── Diagnóstico principal
│   └── Comorbidades mencionadas
├── Medicações
│   ├── Medicações atuais
│   ├── Dosagens
│   └── Frequência
├── Sinais Vitais
│   ├── Pressão arterial
│   ├── Frequência cardíaca
│   ├── Temperatura
│   └── Glicemia (se mencionada)
└── Exames
    ├── Exames realizados
    ├── Resultados disponíveis
    └── Datas dos exames

Mapeamento para Campos do Questionário:
├── Endocrinologia
│   ├── "Paciente é gestante?" ← transcript.pregnancy_status
│   ├── "Idade do paciente" ← transcript.age
│   ├── "HbA1c > 9%?" ← transcript.hba1c_value
│   └── "Medicações atuais" ← transcript.medications
├── Cardiologia
│   ├── "Pressão arterial" ← transcript.blood_pressure
│   ├── "Medicações anti-hipertensivas" ← transcript.medications
│   └── "Histórico de IAM/AVC?" ← transcript.medical_history
└── Reumatologia
    ├── "Rigidez articular ao acordar" ← transcript.joint_symptoms
    ├── "Inchaço em articulações" ← transcript.swelling
    └── "Sintomas sistêmicos" ← transcript.systemic_symptoms
```

### 5.3 Análise de Elegibilidade

```
ENDOCRINOLOGIA - Fluxo de Decisão:

┌─ Filtro 1: Gestante?
│  ├─ SIM → URGÊNCIA (Pré-natal alto risco)
│  └─ NÃO → Continuar
│
├─ Filtro 2: Idade < 15 anos?
│  ├─ SIM → URGÊNCIA (Provável DM Tipo 1)
│  └─ NÃO → Continuar
│
├─ Filtro 3: HbA1c > 9% com insulina/múltiplos remédios?
│  ├─ SIM → Critério atendido
│  └─ NÃO → Continuar
│
├─ Filtro 4: Complicações graves ativas?
│  ├─ SIM → Critério atendido
│  └─ NÃO → Continuar
│
├─ Filtro 5: Insulina > 6 meses com controle inadequado?
│  ├─ SIM → Critério atendido
│  └─ NÃO → NÃO QUALIFICADO
│
├─ Se todos os filtros passam → Verificar Sinais de Alerta
│  ├─ Cetoacidose? → URGÊNCIA
│  ├─ Hipoglicemia severa? → URGÊNCIA
│  ├─ Risco de amputação? → URGÊNCIA
│  └─ Nenhum alerta → Continuar
│
└─ Verificar Exames Obrigatórios
   ├─ Todos presentes? → QUALIFICADO
   └─ Alguns faltam? → QUALIFICADO COM RESSALVAS
```

### 5.4 Geração de Relatório

```
ESTRUTURA DO RELATÓRIO:

┌─────────────────────────────────────────────────────┐
│ RELATÓRIO DE QUALIFICAÇÃO PARA ENCAMINHAMENTO      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ RESULTADO FINAL: [QUALIFICADO / NÃO / URGÊNCIA]   │
│                                                     │
│ DADOS DO PACIENTE:                                  │
│ - Nome: João Silva                                  │
│ - Idade: 45 anos                                    │
│ - Especialidade: Endocrinologia                     │
│                                                     │
│ JUSTIFICATIVA CLÍNICA:                              │
│ O paciente atende aos seguintes critérios:          │
│ ✓ HbA1c > 9% (valor: 10.2%)                        │
│ ✓ Em uso de insulina há > 6 meses                   │
│ ✓ Controle inadequado apesar de medicação           │
│                                                     │
│ SINAIS DE ALERTA DETECTADOS:                        │
│ Nenhum sinal de alerta detectado                    │
│                                                     │
│ EXAMES OBRIGATÓRIOS:                                │
│ ✓ Hemoglobina Glicada (HbA1c) - Resultado Disponível
│ ✓ Creatinina sérica - Realizado                     │
│ ✓ Exame de Urina - Realizado                        │
│ ✓ Fundo de Olho - Realizado                         │
│ ✓ Lipidograma - Realizado                           │
│ ✓ Eletrocardiograma - Realizado                     │
│                                                     │
│ RECOMENDAÇÕES:                                      │
│ Encaminhar para Endocrinologia para avaliação       │
│ especializada e otimização do controle glicêmico.   │
│                                                     │
│ METADADOS:                                          │
│ - Data: 01/01/2024 às 14:30                         │
│ - Médico: Dr. João Silva (CRM: 12345)               │
│ - Clínica: Clínica ABC                              │
│ - Campos pré-preenchidos: idade, diagnóstico        │
│ - Campos editados: HbA1c, medicações                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 6. Integração com Plataforma de Gestão Clínica

### 6.1 Ponto de Entrada

O botão "Qualificar para Encaminhamento" aparece após a geração bem-sucedida de um prontuário de uma consulta médica.

**Localização no Código:**
```javascript
// Após a geração do prontuário
function displayProntuarioResults(prontuario) {
  // ... código existente para exibir prontuário ...
  
  // NOVO: Adicionar botão de qualificação
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

### 6.2 Acesso aos Dados da Consulta

O módulo de qualificação acessa os dados da consulta através de um objeto estruturado.

```javascript
// Estrutura de dados da consulta disponível para pré-preenchimento
const consultationData = {
  patientName: 'João Silva',
  patientAge: 45,
  patientGender: 'M',
  specialty: 'Clínica Médica',
  
  // Dados extraídos do prontuário SOAP
  subjective: {
    chiefComplaint: 'Diabetes descontrolada',
    historyOfPresentIllness: '...',
    relevantHistory: '...'
  },
  
  objective: {
    vitalSigns: {
      bloodPressure: '140/90',
      heartRate: 78,
      temperature: 36.5,
      bloodGlucose: 280
    },
    physicalExam: '...',
    labResults: {
      hba1c: 10.2,
      creatinine: 1.1,
      urinalysis: 'Normal'
    }
  },
  
  assessment: {
    diagnoses: ['E11 - Diabetes Mellitus tipo 2'],
    clinicalReasoning: '...'
  },
  
  plan: {
    medications: [
      { name: 'Metformina', dose: '1000mg', frequency: '2x/dia' },
      { name: 'Insulina NPH', dose: '20UI', frequency: '1x/dia' }
    ],
    requestedExams: ['HbA1c', 'Creatinina', 'EAS'],
    recommendations: '...'
  }
};
```

### 6.3 Salvamento de Qualificações no Histórico

As qualificações são salvas no histórico do paciente e podem ser recuperadas posteriormente.

```javascript
// Salvar qualificação no histórico
function saveQualificationToHistory(qualification) {
  // 1. Recuperar histórico do paciente
  const patientHistory = JSON.parse(
    localStorage.getItem(`patient_${qualification.patientId}_qualifications`) || '[]'
  );
  
  // 2. Adicionar nova qualificação
  patientHistory.unshift(qualification);
  
  // 3. Salvar de volta
  localStorage.setItem(
    `patient_${qualification.patientId}_qualifications`,
    JSON.stringify(patientHistory)
  );
  
  // 4. Registrar auditoria
  logAuditEvent({
    action: 'QUALIFICATION_SAVED',
    resourceId: qualification.id,
    patientId: qualification.patientId,
    timestamp: Date.now()
  });
}

// Recuperar histórico de qualificações de um paciente
function getPatientQualificationHistory(patientId) {
  return JSON.parse(
    localStorage.getItem(`patient_${patientId}_qualifications`) || '[]'
  );
}
```

### 6.4 Integração com Módulo de Pacientes

O módulo de qualificação integra-se com o cadastro de pacientes existente.

```javascript
// Quando um paciente é selecionado, seu histórico de qualificações é carregado
function selectPatient(patientId) {
  const patient = AppState.patients.find(p => p.id === patientId);
  
  // Carregar qualificações do paciente
  const qualifications = getPatientQualificationHistory(patientId);
  
  // Exibir seção de histórico de qualificações
  displayQualificationHistory(qualifications);
}
```

---

## 7. Tecnologias e Padrões

### 7.1 Stack Tecnológico

- **Linguagem:** JavaScript ES6+
- **Persistência:** localStorage (sem backend)
- **Padrão Arquitetural:** MVC/MVP
- **Validação:** Validação de entrada no cliente
- **Segurança:** Sanitização de dados, LGPD compliance

### 7.2 Padrões de Código

**Padrão MVC:**
```javascript
// Model: Dados e lógica de negócio
class QualificationModel {
  constructor() {
    this.qualifications = [];
    this.protocols = {};
  }
  
  addQualification(qualification) {
    this.qualifications.push(qualification);
    this.persist();
  }
  
  persist() {
    localStorage.setItem('qualifications', JSON.stringify(this.qualifications));
  }
}

// View: Apresentação
class QualificationView {
  renderModal(specialties) {
    // Renderizar modal de especialidades
  }
  
  renderQuestionnaire(questionnaire) {
    // Renderizar questionário
  }
}

// Controller: Orquestração
class QualificationController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }
  
  handleSpecialtySelection(specialty) {
    const questionnaire = this.model.getQuestionnaire(specialty);
    this.view.renderQuestionnaire(questionnaire);
  }
}
```

**Padrão de Validação:**
```javascript
class Validator {
  static validateResponse(response, question) {
    switch (question.type) {
      case 'boolean':
        return typeof response === 'boolean';
      case 'number':
        return !isNaN(response) && response >= 0;
      case 'text':
        return typeof response === 'string' && response.trim().length > 0;
      case 'select':
        return question.options.includes(response);
      default:
        return false;
    }
  }
  
  static validateQuestionnaire(responses, questionnaire) {
    const errors = [];
    questionnaire.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.required && !responses[question.id]) {
          errors.push(`Campo obrigatório: ${question.text}`);
        }
      });
    });
    return errors;
  }
}
```

### 7.3 Estrutura de Diretórios

```
plataforma-gestao-clinica/
├── app.js (existente)
├── index.html (existente)
├── styles.css (existente)
│
├── modules/
│   └── qualification/
│       ├── qualification.js (novo)
│       ├── protocols.js (novo)
│       ├── eligibility-engine.js (novo)
│       ├── report-generator.js (novo)
│       ├── qualification-styles.css (novo)
│       └── data/
│           ├── protocol-endocrinologia.json (novo)
│           ├── protocol-cardiologia.json (novo)
│           └── protocol-reumatologia.json (novo)
```

---

## 8. Considerações de Segurança

### 8.1 Validação de Entrada

Todas as entradas do usuário são validadas antes de serem processadas.

```javascript
function validateUserInput(input, expectedType) {
  // Sanitizar entrada
  const sanitized = escapeHtml(input);
  
  // Validar tipo
  switch (expectedType) {
    case 'number':
      const num = parseFloat(sanitized);
      if (isNaN(num)) throw new Error('Entrada inválida: esperado número');
      return num;
    
    case 'text':
      if (sanitized.length === 0) throw new Error('Campo não pode estar vazio');
      if (sanitized.length > 500) throw new Error('Texto muito longo');
      return sanitized;
    
    case 'boolean':
      if (sanitized !== 'true' && sanitized !== 'false') {
        throw new Error('Entrada inválida: esperado booleano');
      }
      return sanitized === 'true';
    
    default:
      return sanitized;
  }
}
```

### 8.2 Sanitização de Dados

Dados são sanitizados antes de serem exibidos ou armazenados.

```javascript
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeForStorage(data) {
  // Remover dados sensíveis antes de armazenar
  const sanitized = { ...data };
  delete sanitized.ipAddress; // Não armazenar IP
  delete sanitized.userAgent; // Não armazenar user agent completo
  return sanitized;
}
```

### 8.3 Criptografia de Dados Sensíveis

Dados sensíveis são criptografados antes de serem armazenados em localStorage.

```javascript
// Nota: Implementação simplificada. Em produção, usar biblioteca criptográfica robusta
class DataEncryption {
  static encrypt(data, key) {
    // Usar Web Crypto API ou biblioteca como TweetNaCl.js
    // Exemplo simplificado:
    return btoa(JSON.stringify(data)); // Base64 encoding (NÃO é criptografia real)
  }
  
  static decrypt(encrypted, key) {
    return JSON.parse(atob(encrypted));
  }
}

// Armazenar dados sensíveis criptografados
function saveEncryptedQualification(qualification) {
  const encrypted = DataEncryption.encrypt(qualification, ENCRYPTION_KEY);
  localStorage.setItem(`qual_${qualification.id}`, encrypted);
}
```

### 8.4 Auditoria e Conformidade LGPD

Todas as ações são registradas para conformidade com LGPD.

```javascript
class AuditLogger {
  static logAction(action, details) {
    const auditEntry = {
      id: generateUUID(),
      timestamp: Date.now(),
      action: action,
      userId: getCurrentUserId(),
      details: details,
      ipAddress: getClientIP(), // Apenas últimos octetos
      userAgent: navigator.userAgent,
      status: 'SUCCESS'
    };
    
    // Armazenar em localStorage
    const auditLog = JSON.parse(localStorage.getItem('audit_log') || '[]');
    auditLog.push(auditEntry);
    localStorage.setItem('audit_log', JSON.stringify(auditLog));
    
    // Enviar para servidor de auditoria (futuro)
    // sendToAuditServer(auditEntry);
  }
  
  static getAuditLog(filters = {}) {
    const log = JSON.parse(localStorage.getItem('audit_log') || '[]');
    
    // Filtrar por data, usuário, ação, etc.
    return log.filter(entry => {
      if (filters.userId && entry.userId !== filters.userId) return false;
      if (filters.action && entry.action !== filters.action) return false;
      if (filters.startDate && entry.timestamp < filters.startDate) return false;
      if (filters.endDate && entry.timestamp > filters.endDate) return false;
      return true;
    });
  }
}
```

---

## 9. Performance e Otimizações

### 9.1 Lazy Loading de Protocolos

Protocolos são carregados sob demanda para reduzir tamanho inicial.

```javascript
class ProtocolManager {
  constructor() {
    this.protocols = {};
    this.loadedProtocols = new Set();
  }
  
  async getProtocol(specialtyId) {
    // Se já carregado, retornar do cache
    if (this.loadedProtocols.has(specialtyId)) {
      return this.protocols[specialtyId];
    }
    
    // Carregar protocolo
    const protocol = await this.loadProtocol(specialtyId);
    this.protocols[specialtyId] = protocol;
    this.loadedProtocols.add(specialtyId);
    
    return protocol;
  }
  
  async loadProtocol(specialtyId) {
    // Carregar de arquivo JSON
    const response = await fetch(`./modules/qualification/data/protocol-${specialtyId}.json`);
    return await response.json();
  }
}
```

### 9.2 Cache de Questionários

Questionários são cacheados após primeira renderização.

```javascript
class QuestionnaireCache {
  constructor() {
    this.cache = new Map();
  }
  
  get(specialtyId) {
    return this.cache.get(specialtyId);
  }
  
  set(specialtyId, questionnaire) {
    this.cache.set(specialtyId, questionnaire);
  }
  
  clear() {
    this.cache.clear();
  }
}
```

### 9.3 Debouncing de Eventos

Eventos de entrada são debounced para evitar processamento excessivo.

```javascript
// Debounce para auto-save
const debouncedAutoSave = debounce((responses) => {
  localStorage.setItem('current_qualification_draft', JSON.stringify(responses));
}, 1000);

// Listener para mudanças de resposta
document.addEventListener('change', (e) => {
  if (e.target.closest('.questionnaire')) {
    const responses = collectResponses();
    debouncedAutoSave(responses);
  }
});
```

### 9.4 Otimizações de Renderização

```javascript
// Usar DocumentFragment para múltiplas inserções
function renderQuestions(questions) {
  const fragment = document.createDocumentFragment();
  
  questions.forEach(question => {
    const questionElement = createQuestionElement(question);
    fragment.appendChild(questionElement);
  });
  
  container.appendChild(fragment);
}

// Usar event delegation para listeners
document.addEventListener('click', (e) => {
  if (e.target.matches('.question-option')) {
    handleQuestionOptionClick(e.target);
  }
});
```

---

## 10. Correctness Properties

*A property é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas do sistema - essencialmente, uma declaração formal sobre o que o sistema deve fazer. Properties servem como ponte entre especificações legíveis por humanos e garantias de correção verificáveis por máquina.*

### Property 1: Determinismo de Elegibilidade

**Propriedade:** Para um mesmo conjunto de respostas, o sistema sempre produz o mesmo resultado de elegibilidade.

**Formalização:**
```
∀ respostas, especialidade:
  qualificar(respostas, especialidade) = qualificar(respostas, especialidade)
```

**Validação:** Executar a mesma qualificação 10 vezes com dados idênticos; resultado deve ser 100% consistente.

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 1: Determinismo de Elegibilidade
test('qualification result is deterministic', () => {
  const responses = generateRandomResponses();
  const specialty = 'endocrinologia';
  
  const result1 = engine.analyze(responses, specialty);
  const result2 = engine.analyze(responses, specialty);
  const result3 = engine.analyze(responses, specialty);
  
  expect(result1.status).toBe(result2.status);
  expect(result2.status).toBe(result3.status);
});
```

### Property 2: Sinais de Alerta Têm Prioridade

**Propriedade:** Se um Sinal de Alerta é detectado, o resultado é sempre "Urgência", independentemente de outros critérios.

**Formalização:**
```
∀ respostas, especialidade:
  detectarSinalAlerta(respostas, especialidade) = true
  ⟹ resultado(respostas, especialidade) = "URGENCIA"
```

**Validação:** Criar casos de teste onde Sinais de Alerta são detectados; verificar que resultado é sempre "Urgência".

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 2: Sinais de Alerta Têm Prioridade
test('alert always results in urgency', () => {
  const responsesWithAlert = {
    ...generateRandomResponses(),
    'alert_cetoacidose': true
  };
  
  const result = engine.analyze(responsesWithAlert, 'endocrinologia');
  expect(result.status).toBe('URGENCIA');
});
```

### Property 3: Exames Obrigatórios Validam Qualificação

**Propriedade:** Um paciente só é "Qualificado" se todos os exames obrigatórios estão presentes.

**Formalização:**
```
∀ respostas, especialidade:
  resultado(respostas, especialidade) = "QUALIFICADO"
  ⟹ ∀ exame ∈ examesObrigatorios(especialidade):
    exame.status ∈ {"Realizado", "Resultado Disponível"}
```

**Validação:** Criar casos onde exames faltam; verificar que resultado é "Qualificado com Ressalvas", nunca "Qualificado".

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 3: Exames Obrigatórios Validam Qualificação
test('missing exams prevent full qualification', () => {
  const responsesWithMissingExams = {
    ...generateQualifyingResponses(),
    'exam_hba1c': 'Não Realizado'
  };
  
  const result = engine.analyze(responsesWithMissingExams, 'endocrinologia');
  expect(result.status).not.toBe('QUALIFICADO');
  expect(result.missingExams).toContain('exam_hba1c');
});
```

### Property 4: Filtros de Elegibilidade São Necessários

**Propriedade:** Se qualquer Filtro de Elegibilidade não é atendido, o resultado é "Não Qualificado".

**Formalização:**
```
∀ respostas, especialidade:
  (∃ filtro ∈ filtrosElegibilidade(especialidade):
    ¬atendeFiltro(respostas, filtro))
  ⟹ resultado(respostas, especialidade) = "NAO_QUALIFICADO"
```

**Validação:** Criar casos onde cada filtro falha individualmente; verificar que resultado é sempre "Não Qualificado".

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 4: Filtros de Elegibilidade São Necessários
test('failing any eligibility filter results in not qualified', () => {
  const protocol = getProtocol('endocrinologia');
  
  protocol.eligibilityFilters.forEach(filter => {
    const responses = generateQualifyingResponses();
    responses[filter.id] = false; // Falhar este filtro
    
    const result = engine.analyze(responses, 'endocrinologia');
    expect(result.status).toBe('NAO_QUALIFICADO');
  });
});
```

### Property 5: Dados Pré-preenchidos São Editáveis

**Propriedade:** Campos pré-preenchidos podem ser editados pelo usuário sem restrições.

**Formalização:**
```
∀ campo ∈ questionário:
  campo.preenchido = true ⟹ campo.editável = true
```

**Validação:** Para cada campo pré-preenchido, tentar editar; verificar que edição é aceita.

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 5: Dados Pré-preenchidos São Editáveis
test('prefilled fields can be edited', () => {
  const questionnaire = loadQuestionnaire('endocrinologia');
  const prefilledFields = questionnaire.sections
    .flatMap(s => s.questions)
    .filter(q => q.prefilled);
  
  prefilledFields.forEach(field => {
    const newValue = generateRandomValue(field.type);
    updateFieldValue(field.id, newValue);
    
    const savedValue = getFieldValue(field.id);
    expect(savedValue).toBe(newValue);
  });
});
```

### Property 6: Auditoria Registra Todas as Qualificações

**Propriedade:** Toda qualificação completada gera um registro de auditoria com timestamp e usuário.

**Formalização:**
```
∀ qualificação ∈ qualificaçõesCompletadas:
  ∃ auditLog ∈ auditLogs:
    auditLog.qualificacaoId = qualificação.id ∧
    auditLog.timestamp ≠ null ∧
    auditLog.usuarioId ≠ null
```

**Validação:** Completar 10 qualificações; verificar que 10 registros de auditoria foram criados com dados corretos.

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 6: Auditoria Registra Todas as Qualificações
test('all qualifications are audited', () => {
  const initialAuditCount = getAuditLog().length;
  
  for (let i = 0; i < 10; i++) {
    const qualification = generateRandomQualification();
    saveQualification(qualification);
  }
  
  const finalAuditCount = getAuditLog().length;
  expect(finalAuditCount - initialAuditCount).toBe(10);
  
  const recentLogs = getAuditLog().slice(0, 10);
  recentLogs.forEach(log => {
    expect(log.timestamp).toBeDefined();
    expect(log.userId).toBeDefined();
    expect(log.action).toBe('QUALIFICATION_SAVED');
  });
});
```

### Property 7: Persistência de Estado de Sessão

**Propriedade:** Respostas do questionário são persistidas em localStorage e podem ser recuperadas após recarregar a página.

**Formalização:**
```
∀ respostas:
  salvarRespostas(respostas) ∧ recarregarPágina()
  ⟹ recuperarRespostas() = respostas
```

**Validação:** Responder questionário, recarregar página, verificar que respostas são restauradas.

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 7: Persistência de Estado de Sessão
test('questionnaire responses persist across page reload', () => {
  const responses = generateRandomResponses();
  saveQuestionnaireDraft(responses);
  
  // Simular recarregamento
  const recovered = recoverQuestionnaireDraft();
  
  expect(recovered).toEqual(responses);
});
```

### Property 8: Validação de Entrada Rejeita Dados Inválidos

**Propriedade:** Dados inválidos são rejeitados e não são salvos ou processados.

**Formalização:**
```
∀ entrada ∈ entradaInválida:
  validar(entrada) = false
  ⟹ ¬salvo(entrada) ∧ ¬processado(entrada)
```

**Validação:** Tentar submeter dados inválidos; verificar que são rejeitados.

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 8: Validação de Entrada Rejeita Dados Inválidos
test('invalid input is rejected', () => {
  const invalidInputs = [
    { field: 'age', value: -5 },
    { field: 'age', value: 'abc' },
    { field: 'hba1c', value: 'invalid' },
    { field: 'required_field', value: '' }
  ];
  
  invalidInputs.forEach(input => {
    const result = validateInput(input.field, input.value);
    expect(result.valid).toBe(false);
  });
});
```

### Property 9: Relatório Contém Todas as Informações Necessárias

**Propriedade:** Todo relatório gerado contém resultado, justificativa, sinais de alerta, exames faltantes e recomendações.

**Formalização:**
```
∀ relatório ∈ relatóriosGerados:
  relatório.status ≠ null ∧
  relatório.justification ≠ null ∧
  relatório.alerts ≠ null ∧
  relatório.missingExams ≠ null ∧
  relatório.recommendations ≠ null
```

**Validação:** Gerar 20 relatórios com diferentes resultados; verificar que todos contêm campos obrigatórios.

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 9: Relatório Contém Todas as Informações Necessárias
test('all reports contain required fields', () => {
  for (let i = 0; i < 20; i++) {
    const responses = generateRandomResponses();
    const report = generateReport(responses, 'endocrinologia');
    
    expect(report.status).toBeDefined();
    expect(report.justification).toBeDefined();
    expect(report.alerts).toBeDefined();
    expect(report.missingExams).toBeDefined();
    expect(report.recommendations).toBeDefined();
  }
});
```

### Property 10: Histórico Mantém Ordem Cronológica

**Propriedade:** Qualificações no histórico são sempre ordenadas por data, com a mais recente primeiro.

**Formalização:**
```
∀ histórico ∈ históricos:
  ∀ i ∈ [0, len(histórico)-2]:
    histórico[i].timestamp ≥ histórico[i+1].timestamp
```

**Validação:** Gerar múltiplas qualificações; verificar que histórico está ordenado corretamente.

**Teste:**
```javascript
// Feature: qualificador-encaminhamentos-medicos, Property 10: Histórico Mantém Ordem Cronológica
test('qualification history is chronologically ordered', () => {
  const patientId = 'patient_123';
  
  // Gerar 10 qualificações com timestamps diferentes
  for (let i = 0; i < 10; i++) {
    const qualification = generateRandomQualification();
    qualification.timestamp = Date.now() + i * 1000;
    saveQualification(qualification);
  }
  
  const history = getPatientQualificationHistory(patientId);
  
  // Verificar que está em ordem decrescente (mais recente primeiro)
  for (let i = 0; i < history.length - 1; i++) {
    expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i + 1].timestamp);
  }
});
```

---

## 11. Error Handling

### 11.1 Estratégia de Tratamento de Erros

```javascript
class QualificationErrorHandler {
  static handle(error, context) {
    const errorType = this.classifyError(error);
    
    switch (errorType) {
      case 'VALIDATION_ERROR':
        return this.handleValidationError(error, context);
      case 'PROTOCOL_ERROR':
        return this.handleProtocolError(error, context);
      case 'STORAGE_ERROR':
        return this.handleStorageError(error, context);
      case 'NETWORK_ERROR':
        return this.handleNetworkError(error, context);
      default:
        return this.handleUnknownError(error, context);
    }
  }
  
  static handleValidationError(error, context) {
    showToast(`Erro de validação: ${error.message}`, 'error');
    logAuditEvent({
      action: 'VALIDATION_ERROR',
      error: error.message,
      context: context
    });
  }
  
  static handleProtocolError(error, context) {
    showToast('Erro ao carregar protocolo. Tente novamente.', 'error');
    logAuditEvent({
      action: 'PROTOCOL_ERROR',
      error: error.message,
      context: context
    });
  }
  
  static handleStorageError(error, context) {
    showToast('Erro ao salvar dados. Verifique espaço disponível.', 'error');
    logAuditEvent({
      action: 'STORAGE_ERROR',
      error: error.message,
      context: context
    });
  }
  
  static handleNetworkError(error, context) {
    showToast('Erro de conexão. Verifique sua internet.', 'error');
    logAuditEvent({
      action: 'NETWORK_ERROR',
      error: error.message,
      context: context
    });
  }
  
  static handleUnknownError(error, context) {
    showToast('Erro desconhecido. Contate o suporte.', 'error');
    logAuditEvent({
      action: 'UNKNOWN_ERROR',
      error: error.message,
      context: context,
      stack: error.stack
    });
  }
}
```

### 11.2 Recuperação de Erros

```javascript
// Recuperação automática de falhas
class RecoveryManager {
  static async recoverFromError(error, operation) {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        return await operation();
      } catch (e) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw new Error(`Operação falhou após ${maxRetries} tentativas: ${e.message}`);
        }
        // Aguardar antes de tentar novamente (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
  }
}
```

---

## 12. Testing Strategy

### 12.1 Estratégia de Testes

O módulo de qualificação utiliza uma abordagem dual de testes:

1. **Testes Unitários (Unit Tests):** Verificam componentes individuais
2. **Testes de Propriedade (Property-Based Tests):** Verificam propriedades universais
3. **Testes de Integração (Integration Tests):** Verificam fluxos completos
4. **Testes de Aceitação (Acceptance Tests):** Verificam requisitos de negócio

### 12.2 Testes Unitários

```javascript
describe('EligibilityEngine', () => {
  let engine;
  let protocol;
  
  beforeEach(() => {
    protocol = loadProtocol('endocrinologia');
    engine = new EligibilityEngine(protocol);
  });
  
  describe('evaluateEligibilityFilters', () => {
    it('should mark patient as not qualified if any filter fails', () => {
      const responses = {
        'filter_1': false,
        'filter_2': false,
        'filter_3': false, // Este falha
        'filter_4': true,
        'filter_5': true
      };
      
      const result = engine.evaluateEligibilityFilters(responses);
      expect(result.passed).toBe(false);
      expect(result.failedFilter).toBe('filter_3');
    });
  });
  
  describe('detectAlerts', () => {
    it('should detect cetoacidosis alert', () => {
      const responses = {
        'glicemia': 350,
        'vomitos': true,
        'halito_cetonico': true,
        'confusao': true
      };
      
      const alerts = engine.detectAlerts(responses);
      expect(alerts).toContainEqual(expect.objectContaining({
        name: 'Cetoacidose Diabética'
      }));
    });
  });
  
  describe('validateExams', () => {
    it('should mark as qualified if all exams present', () => {
      const responses = {
        'exam_hba1c': 'Resultado Disponível',
        'exam_creatinina': 'Realizado',
        'exam_eas': 'Realizado',
        'exam_fundo_olho': 'Realizado',
        'exam_lipidograma': 'Realizado',
        'exam_ecg': 'Realizado'
      };
      
      const result = engine.validateExams(responses);
      expect(result.allPresent).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
  });
});
```

### 12.3 Testes de Propriedade

Os testes de propriedade são implementados usando uma biblioteca como `fast-check` ou `hypothesis.js`.

```javascript
import fc from 'fast-check';

describe('Qualification Properties', () => {
  // Property 1: Determinismo
  it('should produce deterministic results (Property 1)', () => {
    fc.assert(
      fc.property(fc.object(), (responses) => {
        const result1 = engine.analyze(responses, 'endocrinologia');
        const result2 = engine.analyze(responses, 'endocrinologia');
        return result1.status === result2.status;
      }),
      { numRuns: 100 }
    );
  });
  
  // Property 2: Sinais de Alerta têm prioridade
  it('should prioritize alerts (Property 2)', () => {
    fc.assert(
      fc.property(fc.object(), (responses) => {
        const responsesWithAlert = {
          ...responses,
          'alert_cetoacidose': true
        };
        const result = engine.analyze(responsesWithAlert, 'endocrinologia');
        return result.status === 'URGENCIA';
      }),
      { numRuns: 100 }
    );
  });
  
  // Property 3: Exames obrigatórios validam qualificação
  it('should require all exams for full qualification (Property 3)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('Não Realizado', 'Realizado', 'Resultado Disponível')),
        (examStatuses) => {
          const responses = {
            ...generateQualifyingResponses(),
            'exam_hba1c': examStatuses[0],
            'exam_creatinina': examStatuses[1],
            'exam_eas': examStatuses[2],
            'exam_fundo_olho': examStatuses[3],
            'exam_lipidograma': examStatuses[4],
            'exam_ecg': examStatuses[5]
          };
          
          const result = engine.analyze(responses, 'endocrinologia');
          const allPresent = examStatuses.every(s => s !== 'Não Realizado');
          
          if (allPresent) {
            return result.status === 'QUALIFICADO';
          } else {
            return result.status !== 'QUALIFICADO';
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Property 4: Filtros de elegibilidade são necessários
  it('should require all eligibility filters (Property 4)', () => {
    fc.assert(
      fc.property(fc.object(), (responses) => {
        const protocol = getProtocol('endocrinologia');
        
        for (const filter of protocol.eligibilityFilters) {
          const testResponses = {
            ...generateQualifyingResponses(),
            [filter.id]: false
          };
          
          const result = engine.analyze(testResponses, 'endocrinologia');
          if (result.status === 'QUALIFICADO') {
            return false; // Falhou - não deveria estar qualificado
          }
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
```

### 12.4 Testes de Integração

```javascript
describe('Qualification Integration', () => {
  it('should complete full qualification flow', async () => {
    // 1. Carregar protocolo
    const protocol = await protocolManager.getProtocol('endocrinologia');
    expect(protocol).toBeDefined();
    
    // 2. Carregar questionário
    const questionnaire = loadQuestionnaire('endocrinologia');
    expect(questionnaire.sections).toHaveLength(3);
    
    // 3. Pré-preencher dados
    const consultation = generateMockConsultation();
    const prefilledResponses = prefillQuestionnaire(questionnaire, consultation);
    expect(prefilledResponses).toBeDefined();
    
    // 4. Validar respostas
    const responses = {
      ...prefilledResponses,
      'filter_3': true,
      'filter_5': true,
      'exam_hba1c': 'Resultado Disponível'
    };
    
    const validationErrors = validateQuestionnaire(responses, questionnaire);
    expect(validationErrors).toHaveLength(0);
    
    // 5. Analisar elegibilidade
    const result = engine.analyze(responses, 'endocrinologia');
    expect(result.status).toBe('QUALIFICADO');
    
    // 6. Gerar relatório
    const report = reportGenerator.generate(result, responses, consultation);
    expect(report.id).toBeDefined();
    expect(report.status).toBe('QUALIFICADO');
    
    // 7. Salvar qualificação
    saveQualification(report);
    const saved = getQualification(report.id);
    expect(saved).toEqual(report);
    
    // 8. Verificar auditoria
    const auditLog = getAuditLog({ resourceId: report.id });
    expect(auditLog).toHaveLength(1);
  });
});
```

### 12.5 Cobertura de Testes

- **Cobertura de Código:** Mínimo 80%
- **Cobertura de Linhas:** Mínimo 85%
- **Cobertura de Branches:** Mínimo 75%
- **Cobertura de Funções:** Mínimo 90%

### 12.6 Configuração de Testes

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'modules/qualification/**/*.js',
    '!modules/qualification/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ]
};
```

---

## 13. Deployment e Manutenção

### 13.1 Checklist de Deployment

- [ ] Todos os testes passam (unit, property, integration)
- [ ] Cobertura de código atende aos requisitos
- [ ] Documentação está atualizada
- [ ] Protocolos clínicos foram validados por especialistas
- [ ] Conformidade LGPD/HIPAA foi verificada
- [ ] Performance foi testada com dados reais
- [ ] Segurança foi auditada
- [ ] Backup de dados foi configurado
- [ ] Plano de rollback foi preparado

### 13.2 Monitoramento

```javascript
class QualificationMonitoring {
  static trackMetrics() {
    return {
      totalQualifications: getTotalQualifications(),
      qualificationsBySpecialty: getQualificationsBySpecialty(),
      averageQualificationTime: getAverageQualificationTime(),
      errorRate: getErrorRate(),
      userSatisfaction: getUserSatisfaction()
    };
  }
  
  static alertOnAnomalies() {
    const metrics = this.trackMetrics();
    
    if (metrics.errorRate > 0.05) {
      sendAlert('Error rate exceeded 5%');
    }
    
    if (metrics.averageQualificationTime > 300000) { // 5 minutos
      sendAlert('Average qualification time exceeded 5 minutes');
    }
  }
}
```

### 13.3 Manutenção de Protocolos

Protocolos devem ser atualizados regularmente conforme novas diretrizes do Ministério da Saúde.

```javascript
class ProtocolMaintenance {
  static updateProtocol(specialtyId, newProtocol) {
    // 1. Validar novo protocolo
    if (!this.validateProtocol(newProtocol)) {
      throw new Error('Protocolo inválido');
    }
    
    // 2. Criar backup do protocolo antigo
    const oldProtocol = this.getProtocol(specialtyId);
    this.backupProtocol(specialtyId, oldProtocol);
    
    // 3. Salvar novo protocolo
    this.saveProtocol(specialtyId, newProtocol);
    
    // 4. Registrar auditoria
    logAuditEvent({
      action: 'PROTOCOL_UPDATED',
      specialty: specialtyId,
      timestamp: Date.now()
    });
  }
}
```

---

## 14. Roadmap Futuro

### 14.1 Fases de Expansão

**Fase 2 (Q2 2024):**
- Adicionar 3 novas especialidades (Pneumologia, Gastroenterologia, Neurologia)
- Integração com SISREG para encaminhamento automático
- Notificações por email/SMS

**Fase 3 (Q3 2024):**
- Análise de IA para sugestões de encaminhamento
- Relatórios de conformidade para gestores
- Dashboard de métricas

**Fase 4 (Q4 2024):**
- Integração com prontuários eletrônicos (EHR)
- Suporte a múltiplos idiomas
- API para terceiros

### 14.2 Melhorias Técnicas

- Migração para backend (Node.js/Express)
- Banco de dados (PostgreSQL)
- Cache distribuído (Redis)
- Análise de dados (BigQuery)
- Machine Learning para previsão de elegibilidade

---

## 15. Referências e Recursos

### 15.1 Documentos Clínicos

- Ministério da Saúde - Protocolos Clínicos e Diretrizes Terapêuticas
- TelessaúdeRS - Diretrizes de Encaminhamento
- SISREG - Sistema de Regulação

### 15.2 Conformidade

- LGPD - Lei Geral de Proteção de Dados
- HIPAA - Health Insurance Portability and Accountability Act
- ISO 27001 - Segurança da Informação

### 15.3 Tecnologias

- JavaScript ES6+
- localStorage API
- Web Crypto API
- jsPDF (geração de PDF)
- fast-check (property-based testing)

---

## Conclusão

O Qualificador de Encaminhamentos Médicos é um módulo bem-estruturado que integra-se perfeitamente com a plataforma de gestão clínica integrada. A arquitetura modular, testes abrangentes e conformidade regulatória garantem que o sistema seja confiável, seguro e fácil de manter.

O design foi desenvolvido seguindo as melhores práticas de engenharia de software, com ênfase em:
- **Correção:** Propriedades verificáveis e testes abrangentes
- **Segurança:** Validação, sanitização e auditoria
- **Performance:** Lazy loading, cache e otimizações
- **Manutenibilidade:** Código limpo, bem documentado e modular
- **Conformidade:** LGPD, HIPAA e protocolos clínicos validados

