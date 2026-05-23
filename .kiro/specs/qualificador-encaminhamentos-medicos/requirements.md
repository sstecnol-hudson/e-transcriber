# Requirements Document - Qualificador de Encaminhamentos Médicos

## Executive Summary

O **Qualificador de Encaminhamentos Médicos** é um módulo complementar da plataforma de gestão clínica integrada que automatiza e padroniza o processo de qualificação de pacientes para encaminhamento a especialistas. O sistema implementa protocolos clínicos validados pelo Ministério da Saúde e TelessaúdeRS, reduzindo filas de espera e garantindo que apenas pacientes elegíveis sejam encaminhados.

**Objetivo Principal:** Transformar a plataforma em um ecossistema completo de gestão clínica, onde o Qualificador de Encaminhamentos é um dos muitos módulos (junto com Transcrição, Prontuários, Pacientes, etc.), permitindo que médicos da Atenção Primária qualifiquem pacientes para especialidades de forma padronizada e baseada em evidências.

---

## Introduction

### Visão Geral

O Qualificador de Encaminhamentos Médicos é um módulo da plataforma de gestão clínica integrada que analisa consultas médicas e qualifica pacientes para encaminhamento a especialistas. O sistema implementa protocolos baseados em diretrizes do Ministério da Saúde e TelessaúdeRS para três especialidades iniciais:

1. **Endocrinologia** - Foco em Diabetes Mellitus tipo 2
2. **Cardiologia** - Foco em Hipertensão Arterial Crônica
3. **Reumatologia** - Foco em Lúpus, Artrite Reumatóide e Artrose

### Contexto e Justificativa

No Brasil, o Sistema de Regulação (SISREG) gerencia encaminhamentos entre níveis de atenção. Atualmente, muitos encaminhamentos são inadequados, resultando em:
- Filas desnecessárias para especialistas
- Pacientes com condições que poderiam ser tratadas na Atenção Primária ocupando vagas
- Falta de padronização nos critérios de encaminhamento
- Demora no atendimento de casos urgentes

O Qualificador resolve esses problemas ao:
- Implementar protocolos validados do Ministério da Saúde
- Automatizar a análise de elegibilidade
- Identificar casos urgentes automaticamente
- Gerar documentação padronizada para regulação

### Escopo

**Incluído:**
- Qualificação para três especialidades iniciais (Endocrinologia, Cardiologia, Reumatologia)
- Questionários dinâmicos baseados em protocolos do Ministério da Saúde
- Análise automática de elegibilidade e sinais de alerta
- Geração de relatórios estruturados
- Integração com dados da consulta transcrita
- Histórico de qualificações por paciente
- Auditoria e conformidade LGPD/HIPAA

**Não Incluído (Fases Futuras):**
- Integração com SISREG (Sistema de Regulação)
- Agendamento automático de consultas
- Notificações por SMS/Email
- Suporte a mais de 3 especialidades (será extensível, mas não implementado inicialmente)
- Análise de imagens ou documentos anexados

### Restrições e Limitações

1. **Dados Locais:** Todos os dados são armazenados no navegador do usuário (localStorage)
2. **Sem Backend:** O sistema não possui servidor próprio; usa apenas Groq API para transcrição
3. **Protocolos Estáticos:** Os protocolos são definidos no código; atualizações requerem deploy
4. **Navegador Moderno:** Requer navegador com suporte a Service Workers e localStorage
5. **Conformidade:** Deve estar em conformidade com LGPD (Lei Geral de Proteção de Dados)

---

## Introduction

### Fluxo de Uso Esperado

```
1. Médico registra consulta na plataforma
   ↓
2. Sistema gera prontuário estruturado (SOAP, Anamnese, etc.)
   ↓
3. Aparece botão "Qualificar para Encaminhamento"
   ↓
4. Médico seleciona especialidade (Endocrinologia, Cardiologia, Reumatologia)
   ↓
5. Sistema exibe questionário dinâmico pré-preenchido com dados da consulta
   ↓
6. Médico responde perguntas e confirma exames realizados
   ↓
7. Sistema analisa respostas contra protocolos
   ↓
8. Sistema gera relatório com resultado (Qualificado / Não Qualificado / Urgência)
   ↓
9. Médico pode baixar/imprimir relatório ou salvar no histórico do paciente
```

---

## Glossary

## Glossary

- **Sistema**: O módulo Qualificador de Encaminhamentos Médicos integrado à plataforma de gestão clínica
- **Médico**: Profissional de saúde que utiliza a plataforma para gerenciar consultas e qualificar pacientes
- **Paciente**: Indivíduo submetido à consulta médica
- **Consulta**: Atendimento médico registrado e processado pela plataforma
- **Prontuário**: Documento estruturado gerado após consulta (SOAP, Anamnese, Evolução, etc.)
- **Especialidade**: Área médica para a qual o paciente pode ser encaminhado (Endocrinologia, Cardiologia, Reumatologia)
- **Questionário**: Conjunto de perguntas dinâmicas específicas de cada especialidade
- **Elegibilidade**: Condição que determina se o paciente atende aos critérios para encaminhamento
- **Sinais de Alerta**: Indicadores clínicos que sugerem urgência no encaminhamento
- **Checklist de Exames**: Lista de exames obrigatórios que devem estar presentes para qualificação
- **Relatório de Qualificação**: Documento final com resultado (Qualificado/Não Qualificado/Urgência), justificativa e recomendações
- **Protocolo**: Conjunto de regras e critérios baseados em diretrizes do Ministério da Saúde
- **Filtro de Elegibilidade**: Critério que determina se o paciente pode ser avaliado para uma especialidade
- **Exame Obrigatório**: Teste diagnóstico necessário para validar a qualificação
- **Recomendação**: Sugestão de ação baseada no resultado da qualificação
- **SISREG**: Sistema de Regulação - sistema nacional de gerenciamento de encaminhamentos
- **Atenção Primária**: Primeiro nível de atenção à saúde (Unidades Básicas de Saúde)
- **Urgência**: Classificação que indica necessidade de atendimento prioritário ou emergencial
- **Qualificado**: Paciente que atende a todos os critérios de elegibilidade e possui exames obrigatórios
- **Qualificado com Ressalvas**: Paciente que atende aos critérios mas está faltando alguns exames obrigatórios
- **Não Qualificado**: Paciente que não atende aos critérios de elegibilidade para a especialidade

---

## Objectives and Goals

### Objetivos Primários

1. **Padronização**: Implementar protocolos validados do Ministério da Saúde para qualificação de encaminhamentos
2. **Eficiência**: Reduzir tempo de análise de elegibilidade de horas para minutos
3. **Qualidade**: Garantir que apenas pacientes elegíveis sejam encaminhados, reduzindo filas
4. **Rastreabilidade**: Manter auditoria completa de todas as qualificações para conformidade regulatória

### Objetivos Secundários

1. **Integração**: Funcionar perfeitamente com o fluxo existente da plataforma
2. **Usabilidade**: Interface intuitiva que não requer treinamento extensivo
3. **Extensibilidade**: Preparado para adicionar novas especialidades no futuro
4. **Segurança**: Proteger dados de pacientes em conformidade com LGPD

### Métricas de Sucesso

- 95% de acurácia na qualificação (validado contra especialistas)
- Tempo médio de qualificação < 5 minutos por paciente
- 100% de conformidade com protocolos do Ministério da Saúde
- Zero vazamentos de dados de pacientes
- Adoção por 80% dos usuários da plataforma em 6 meses

---

## Use Cases

### Use Case 1: Qualificação de Paciente com Diabetes Descontrolado

**Ator Principal:** Médico da Atenção Primária

**Pré-condições:**
- Médico completou transcrição de consulta com paciente diabético
- Prontuário foi gerado com sucesso
- Paciente tem HbA1c > 9% e está em uso de múltiplos medicamentos

**Fluxo Principal:**
1. Médico clica em "Qualificar para Encaminhamento"
2. Sistema exibe modal com três especialidades
3. Médico seleciona "Endocrinologia"
4. Sistema carrega questionário pré-preenchido com dados da consulta
5. Médico confirma dados e responde perguntas adicionais
6. Médico marca exames realizados (HbA1c, Creatinina, EAS, Fundo de Olho)
7. Médico clica "Analisar"
8. Sistema detecta que paciente atende a todos os critérios
9. Sistema gera relatório "Qualificado para Endocrinologia"
10. Médico baixa PDF e envia para regulação

**Pós-condições:**
- Qualificação é salva no histórico do paciente
- Relatório está disponível para download
- Auditoria registra a qualificação

---

### Use Case 2: Detecção de Urgência Hipertensiva

**Ator Principal:** Médico da Atenção Primária

**Pré-condições:**
- Médico completou transcrição de consulta com paciente hipertenso
- Prontuário foi gerado com sucesso
- Paciente apresenta PA ≥180/120 mmHg com sintomas de emergência

**Fluxo Principal:**
1. Médico clica em "Qualificar para Encaminhamento"
2. Sistema exibe modal com três especialidades
3. Médico seleciona "Cardiologia"
4. Sistema carrega questionário pré-preenchido
5. Médico responde que PA está ≥180/120 com dor no peito
6. Médico clica "Analisar"
7. Sistema detecta Sinal de Alerta: "Emergência Hipertensiva"
8. Sistema gera relatório "URGÊNCIA - Encaminhar para Pronto Socorro"
9. Sistema exibe alerta visual proeminente em vermelho
10. Médico vê recomendação de encaminhamento imediato

**Pós-condições:**
- Qualificação é marcada como "Urgência"
- Relatório destaca a necessidade de atendimento emergencial
- Auditoria registra a urgência detectada

---

### Use Case 3: Paciente Não Elegível para Reumatologia

**Ator Principal:** Médico da Atenção Primária

**Pré-condições:**
- Médico completou transcrição de consulta com paciente com dor articular
- Prontuário foi gerado com sucesso
- Paciente apresenta apenas artrose leve (dor mecânica, sem inflamação)

**Fluxo Principal:**
1. Médico clica em "Qualificar para Encaminhamento"
2. Sistema exibe modal com três especialidades
3. Médico seleciona "Reumatologia"
4. Sistema carrega questionário pré-preenchido
5. Médico responde que não há rigidez matinal > 30 min, sem inchaço em 3+ articulações
6. Médico clica "Analisar"
7. Sistema detecta que paciente não atende aos critérios de elegibilidade
8. Sistema gera relatório "Não Qualificado para Reumatologia"
9. Sistema recomenda: "Manejo na Atenção Primária com fisioterapia e analgesia"
10. Médico vê recomendação e mantém paciente em acompanhamento local

**Pós-condições:**
- Qualificação é marcada como "Não Qualificado"
- Relatório fornece recomendações de manejo local
- Auditoria registra a não-elegibilidade

---

## Correctness Properties

As seguintes propriedades de correção devem ser verificadas através de testes:

### Property 1: Elegibilidade Determinística
**Propriedade:** Para um mesmo conjunto de respostas, o sistema sempre produz o mesmo resultado de elegibilidade.

**Formalização:** 
```
∀ respostas, especialidade: 
  qualificar(respostas, especialidade) = qualificar(respostas, especialidade)
```

**Teste:** Executar a mesma qualificação 10 vezes com dados idênticos; resultado deve ser 100% consistente.

---

### Property 2: Sinais de Alerta Têm Prioridade
**Propriedade:** Se um Sinal de Alerta é detectado, o resultado é sempre "Urgência", independentemente de outros critérios.

**Formalização:**
```
∀ respostas, especialidade:
  detectarSinalAlerta(respostas, especialidade) = true 
  ⟹ resultado(respostas, especialidade) = "Urgência"
```

**Teste:** Criar casos de teste onde Sinais de Alerta são detectados; verificar que resultado é sempre "Urgência".

---

### Property 3: Exames Obrigatórios Validam Qualificação
**Propriedade:** Um paciente só é "Qualificado" se todos os exames obrigatórios estão presentes.

**Formalização:**
```
∀ respostas, especialidade:
  resultado(respostas, especialidade) = "Qualificado"
  ⟹ ∀ exame ∈ examesObrigatorios(especialidade): exame.status ∈ {"Realizado", "Resultado Disponível"}
```

**Teste:** Criar casos onde exames faltam; verificar que resultado é "Qualificado com Ressalvas", nunca "Qualificado".

---

### Property 4: Filtros de Elegibilidade São Necessários
**Propriedade:** Se qualquer Filtro de Elegibilidade não é atendido, o resultado é "Não Qualificado".

**Formalização:**
```
∀ respostas, especialidade:
  (∃ filtro ∈ filtrosElegibilidade(especialidade): ¬atendeFiltro(respostas, filtro))
  ⟹ resultado(respostas, especialidade) = "Não Qualificado"
```

**Teste:** Criar casos onde cada filtro falha individualmente; verificar que resultado é sempre "Não Qualificado".

---

### Property 5: Dados Pré-preenchidos São Editáveis
**Propriedade:** Campos pré-preenchidos podem ser editados pelo usuário sem restrições.

**Formalização:**
```
∀ campo ∈ questionário:
  campo.preenchido = true ⟹ campo.editável = true
```

**Teste:** Para cada campo pré-preenchido, tentar editar; verificar que edição é aceita.

---

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

**Teste:** Completar 10 qualificações; verificar que 10 registros de auditoria foram criados com dados corretos.

---

## Requirements

### Protocolo Detalhado: Endocrinologia (Diabetes Mellitus tipo 2)

#### Filtros de Elegibilidade

| # | Pergunta | Resposta SIM | Resposta NÃO | Lógica |
|---|----------|-------------|------------|--------|
| 1 | O paciente é gestante? | 🔴 Urgência (Pré-natal alto risco) | Continuar | Se SIM, marca como Urgência |
| 2 | O paciente tem menos de 15 anos? | 🔴 Urgência (Provável DM Tipo 1) | Continuar | Se SIM, marca como Urgência |
| 3 | HbA1c > 9% mesmo com insulina/múltiplos remédios? | 🟢 Qualificado | Continuar | Se SIM, atende critério |
| 4 | Complicações graves ativas (pé diabético, perda visão, IRC avançada)? | 🟢 Qualificado | Continuar | Se SIM, atende critério |
| 5 | Paciente em uso de insulina há > 6 meses com controle inadequado? | 🟢 Qualificado | ❌ Não Qualificado | Se NÃO, falha elegibilidade |

#### Sinais de Alerta (Urgência)

- Glicemia > 300 mg/dL + vômitos + hálito cetônico + confusão → **Cetoacidose Diabética** → Encaminhar para UPA
- Glicemia < 70 mg/dL com sintomas neurológicos graves → **Hipoglicemia Severa** → Encaminhar para UPA
- Paciente com pé diabético com úlcera infectada/necrose → **Risco de Amputação** → Encaminhar para cirurgia

#### Checklist de Exames Obrigatórios

- [ ] Hemoglobina Glicada (HbA1c) - últimos 3-6 meses
- [ ] Creatinina sérica - últimos 6 meses
- [ ] Exame de Urina (EAS/Microalbuminúria) - últimos 6 meses
- [ ] Fundo de Olho / Avaliação Oftalmológica - últimos 12 meses
- [ ] Lipidograma - últimos 6 meses
- [ ] Eletrocardiograma - últimos 12 meses

---

### Protocolo Detalhado: Cardiologia (Hipertensão Arterial Crônica)

#### Filtros de Elegibilidade

| # | Pergunta | Resposta SIM | Resposta NÃO | Lógica |
|---|----------|-------------|------------|--------|
| 1 | Paciente usa 3+ anti-hipertensivos em doses máximas + PA > 140/90? | 🟢 Qualificado | Continuar | Hipertensão Resistente |
| 2 | Suspeita de Hipertensão Secundária (idade < 30 + HAS súbita/grave)? | 🟢 Qualificado | Continuar | Investigar causa secundária |
| 3 | Histórico de IAM, AVC recente ou IC com piora? | 🟢 Qualificado | Continuar | Lesão em órgão-alvo |
| 4 | PA > 160/100 persistente apesar de tratamento? | 🟢 Qualificado | Continuar | Controle inadequado |
| 5 | Paciente com proteinúria ou redução de TFG? | 🟢 Qualificado | ❌ Não Qualificado | Se NÃO, falha elegibilidade |

#### Sinais de Alerta (Urgência)

- PA ≥ 180/120 + dor no peito + falta de ar aguda + dor de cabeça súbita → **Emergência Hipertensiva** → Encaminhar para PS
- PA ≥ 180/120 + perda de movimentos/fala → **Possível AVC** → Encaminhar para PS
- PA ≥ 180/120 + edema pulmonar → **Insuficiência Cardíaca Aguda** → Encaminhar para PS

#### Checklist de Exames Obrigatórios

- [ ] Eletrocardiograma (ECG) de repouso - últimos 6 meses
- [ ] Creatinina e Potássio sérico - últimos 3 meses
- [ ] Exame de Urina Simples (EAS) - últimos 6 meses
- [ ] Raio-X de Tórax - últimos 12 meses
- [ ] MAPA 24h ou MRPA (desejável) - últimos 12 meses

---

### Protocolo Detalhado: Reumatologia (Lúpus, Artrite, Artrose)

#### Filtros de Elegibilidade

| # | Pergunta | Resposta SIM | Resposta NÃO | Lógica |
|---|----------|-------------|------------|--------|
| 1 | Rigidez articular ao acordar > 30-60 minutos? | 🟢 Qualificado | Continuar | Sinal de inflamação |
| 2 | Inchaço + calor + vermelhidão em 3+ articulações > 6 semanas? | 🟢 Qualificado | Continuar | Artrite inflamatória |
| 3 | Suspeita de Lúpus (manchas em borboleta + dor articular + queda cabelo)? | 🟢 Qualificado | Continuar | LES provável |
| 4 | Apenas artrose leve/moderada (dor mecânica, sem inflamação)? | ❌ Não Qualificado | Continuar | Manejo na AP |
| 5 | Sintomas sistêmicos (febre, fadiga, perda peso) + artralgia? | 🟢 Qualificado | ❌ Não Qualificado | Se NÃO, falha elegibilidade |

#### Sinais de Alerta (Urgência)

- Febre alta + uma articulação extremamente inchada/quente/imóvel → **Artrite Séptica** → Encaminhar para PS
- Edema facial + dor articular + febre + rash → **Possível Lúpus Ativo** → Encaminhar para especialista
- Artrite com deformidade rápida + sintomas sistêmicos → **Artrite Reumatóide Agressiva** → Encaminhar urgente

#### Checklist de Exames Obrigatórios

- [ ] Hemograma Completo + Plaquetas - últimos 3 meses
- [ ] VHS (Velocidade de Hemossedimentação) - últimos 3 meses
- [ ] PCR (Proteína C Reativa) - últimos 3 meses
- [ ] Fator Reumatóide (FR) - últimos 6 meses
- [ ] FAN (Fator Antinuclear) - últimos 6 meses
- [ ] Raio-X das articulações afetadas - últimos 6 meses
- [ ] Função renal (Creatinina) - últimos 3 meses

---

### Requisitos Funcionais

**User Story:** Como médico, quero acessar a funcionalidade de qualificação após gerar um prontuário, para que eu possa qualificar o paciente para encaminhamento sem sair da plataforma.

#### Acceptance Criteria

1. WHEN a prontuário is successfully generated (SOAP, Anamnese, Evolução, or Orientação), THE System SHALL display a "Qualificar para Encaminhamento" button in the results panel
2. WHEN the "Qualificar para Encaminhamento" button is clicked, THE System SHALL display a modal with a list of available specialties (Endocrinologia, Cardiologia, Reumatologia)
3. WHEN a specialty is selected from the modal, THE System SHALL load and display the corresponding dynamic questionnaire
4. THE System SHALL preserve the current prontuário data while the qualification modal is open
5. WHEN the qualification modal is closed without completing the questionnaire, THE System SHALL return to the prontuário view without losing data

---

### Requisito 2: Seleção de Especialidade

**User Story:** Como médico, quero selecionar a especialidade para a qual desejo qualificar o paciente, para que o sistema exiba o questionário apropriado.

#### Acceptance Criteria

1. WHEN the qualification modal is displayed, THE System SHALL show three specialty options: Endocrinologia, Cardiologia, and Reumatologia
2. WHEN a specialty is selected, THE System SHALL validate that the specialty is one of the three supported options
3. WHEN a specialty is selected, THE System SHALL load the corresponding protocol and questionnaire from the backend
4. IF the specialty selection fails to load, THEN THE System SHALL display an error message and allow the user to retry
5. THE System SHALL display the specialty name and a brief description of the protocol in the questionnaire header

---

### Requisito 3: Questionário Dinâmico para Endocrinologia

**User Story:** Como médico, quero responder um questionário estruturado para Diabetes Mellitus tipo 2, para que o sistema qualifique o paciente com base em critérios clínicos validados.

#### Acceptance Criteria

1. WHEN Endocrinologia is selected, THE System SHALL display a questionnaire with the following sections:
   - Filtros de Elegibilidade (5 perguntas)
   - Sinais de Alerta (4 perguntas)
   - Checklist de Exames Obrigatórios (6 exames)
2. WHEN the questionnaire is displayed, THE System SHALL pre-populate answers from the consulta transcript where applicable (e.g., age, diabetes diagnosis, current medications)
3. WHEN a question is answered, THE System SHALL validate the response format (text, number, boolean, or selection)
4. IF a required field is not answered, THEN THE System SHALL prevent form submission and highlight the missing field
5. WHEN the user scrolls through the questionnaire, THE System SHALL maintain the scroll position and answered values

---

### Requisito 4: Questionário Dinâmico para Cardiologia

**User Story:** Como médico, quero responder um questionário estruturado para Hipertensão Arterial Crônica, para que o sistema qualifique o paciente com base em critérios clínicos validados.

#### Acceptance Criteria

1. WHEN Cardiologia is selected, THE System SHALL display a questionnaire with the following sections:
   - Filtros de Elegibilidade (5 perguntas)
   - Sinais de Alerta (4 perguntas)
   - Checklist de Exames Obrigatórios (5 exames)
2. WHEN the questionnaire is displayed, THE System SHALL pre-populate answers from the consulta transcript where applicable (e.g., blood pressure readings, hypertension diagnosis, current medications)
3. WHEN a question is answered, THE System SHALL validate the response format (text, number, boolean, or selection)
4. IF a required field is not answered, THEN THE System SHALL prevent form submission and highlight the missing field
5. WHEN the user scrolls through the questionnaire, THE System SHALL maintain the scroll position and answered values

---

### Requisito 5: Questionário Dinâmico para Reumatologia

**User Story:** Como médico, quero responder um questionário estruturado para Lúpus, Artrite e Artrose, para que o sistema qualifique o paciente com base em critérios clínicos validados.

#### Acceptance Criteria

1. WHEN Reumatologia is selected, THE System SHALL display a questionnaire with the following sections:
   - Filtros de Elegibilidade (6 perguntas)
   - Sinais de Alerta (5 perguntas)
   - Checklist de Exames Obrigatórios (7 exames)
2. WHEN the questionnaire is displayed, THE System SHALL pre-populate answers from the consulta transcript where applicable (e.g., joint symptoms, autoimmune markers, current medications)
3. WHEN a question is answered, THE System SHALL validate the response format (text, number, boolean, or selection)
4. IF a required field is not answered, THEN THE System SHALL prevent form submission and highlight the missing field
5. WHEN the user scrolls through the questionnaire, THE System SHALL maintain the scroll position and answered values

---

### Requisito 6: Análise de Elegibilidade

**User Story:** Como médico, quero que o sistema analise automaticamente se o paciente atende aos critérios de elegibilidade, para que eu receba uma qualificação precisa baseada em protocolos validados.

#### Acceptance Criteria

1. WHEN the questionnaire is submitted, THE System SHALL evaluate all Filtros de Elegibilidade against the protocol rules
2. IF all elegibility filters are met, THE System SHALL proceed to evaluate Sinais de Alerta
3. IF any elegibility filter is not met, THEN THE System SHALL mark the patient as "Não Qualificado" and display the specific filter that failed
4. WHEN evaluating filters, THE System SHALL apply the exact logic defined in the protocol (e.g., age ranges, diagnostic criteria, medication requirements)
5. THE System SHALL log the evaluation results for audit purposes

---

### Requisito 7: Detecção de Sinais de Alerta

**User Story:** Como médico, quero que o sistema identifique sinais de alerta clínicos, para que eu saiba se o encaminhamento é urgente.

#### Acceptance Criteria

1. WHEN the questionnaire is submitted, THE System SHALL evaluate all Sinais de Alerta against the protocol rules
2. IF any Sinal de Alerta is detected, THEN THE System SHALL mark the qualification as "Urgência" and highlight the specific alert
3. IF no Sinais de Alerta are detected, THEN THE System SHALL proceed to evaluate Checklist de Exames
4. WHEN evaluating alerts, THE System SHALL apply the exact logic defined in the protocol
5. THE System SHALL display all detected alerts in the final report with clinical justification

---

### Requisito 8: Validação de Exames Obrigatórios

**User Story:** Como médico, quero que o sistema verifique se os exames obrigatórios foram realizados, para que eu saiba se o paciente está pronto para encaminhamento.

#### Acceptance Criteria

1. WHEN the questionnaire is submitted and no Sinais de Alerta are detected, THE System SHALL evaluate the Checklist de Exames Obrigatórios
2. WHEN evaluating exams, THE System SHALL check if each required exam is marked as "Realizado" or "Resultado Disponível"
3. IF all required exams are present, THEN THE System SHALL mark the patient as "Qualificado"
4. IF any required exam is missing, THEN THE System SHALL mark the patient as "Qualificado com Ressalvas" and list the missing exams
5. THE System SHALL display the exam checklist in the final report with status for each exam

---

### Requisito 9: Geração de Relatório de Qualificação

**User Story:** Como médico, quero receber um relatório estruturado com o resultado da qualificação, para que eu tenha documentação clara para o encaminhamento.

#### Acceptance Criteria

1. WHEN the questionnaire analysis is complete, THE System SHALL generate a Relatório de Qualificação with the following sections:
   - Resultado Final (Qualificado / Não Qualificado / Urgência)
   - Justificativa Clínica (explicação baseada nas regras aplicadas)
   - Sinais de Alerta Detectados (se houver)
   - Exames Obrigatórios Faltantes (se houver)
   - Recomendações para Encaminhamento
   - Data e Hora da Qualificação
   - Médico Responsável
2. WHEN the report is generated, THE System SHALL display it in a readable format with clear visual hierarchy
3. THE System SHALL allow the user to download the report as PDF
4. THE System SHALL allow the user to print the report
5. THE System SHALL save the report to the patient's record for future reference

---

### Requisito 10: Integração com Dados da Consulta

**User Story:** Como médico, quero que o sistema use automaticamente os dados da consulta transcrita, para que eu não precise re-inserir informações já disponíveis.

#### Acceptance Criteria

1. WHEN a questionnaire is loaded, THE System SHALL extract relevant data from the consulta transcript (patient demographics, symptoms, diagnoses, medications, vital signs)
2. WHEN relevant data is found, THE System SHALL pre-populate the corresponding questionnaire fields
3. IF a field cannot be automatically populated, THE System SHALL leave it empty for manual entry
4. WHEN a field is pre-populated, THE System SHALL allow the user to edit or override the value
5. THE System SHALL track which fields were auto-populated vs. manually entered in the final report

---

### Requisito 11: Persistência de Dados de Qualificação

**User Story:** Como médico, quero que os dados de qualificação sejam salvos automaticamente, para que eu não perca informações em caso de desconexão.

#### Acceptance Criteria

1. WHEN the user answers a question in the questionnaire, THE System SHALL save the response to local storage
2. WHEN the page is refreshed or the user navigates away, THE System SHALL preserve the questionnaire state
3. WHEN the user returns to the qualification modal, THE System SHALL restore the previous questionnaire state
4. WHEN the questionnaire is submitted successfully, THE System SHALL clear the local storage for that qualification session
5. THE System SHALL display a notification if data is recovered from local storage

---

### Requisito 12: Histórico de Qualificações

**User Story:** Como médico, quero acessar o histórico de qualificações anteriores de um paciente, para que eu possa acompanhar a evolução do encaminhamento.

#### Acceptance Criteria

1. WHEN viewing a patient's record, THE System SHALL display a "Histórico de Qualificações" section
2. WHEN the section is expanded, THE System SHALL list all previous qualifications with date, specialty, and result
3. WHEN a previous qualification is clicked, THE System SHALL display the full report
4. WHEN comparing qualifications, THE System SHALL allow the user to view side-by-side results
5. THE System SHALL display the most recent qualification first

---

### Requisito 13: Validação de Segurança e Conformidade

**User Story:** Como administrador, quero garantir que o sistema valide dados de forma segura, para que a qualificação seja confiável e em conformidade com regulamentações.

#### Acceptance Criteria

1. WHEN data is submitted, THE System SHALL validate all inputs against expected data types and ranges
2. WHEN invalid data is detected, THEN THE System SHALL reject the submission and display a specific error message
3. WHEN processing patient data, THE System SHALL apply HIPAA/LGPD compliance checks
4. WHEN generating reports, THE System SHALL include audit trails with timestamp and user identification
5. THE System SHALL encrypt sensitive patient data in transit and at rest

---

### Requisito 14: Interface Responsiva e Acessível

**User Story:** Como usuário, quero que a interface de qualificação funcione em diferentes dispositivos, para que eu possa qualificar pacientes em qualquer lugar.

#### Acceptance Criteria

1. WHEN the qualification modal is displayed on a mobile device, THE System SHALL adapt the layout for small screens
2. WHEN the questionnaire is displayed, THE System SHALL ensure all fields are easily tappable on touch devices
3. WHEN the report is generated, THE System SHALL format it for readability on mobile and desktop
4. WHEN using keyboard navigation, THE System SHALL allow users to navigate through all questionnaire fields using Tab and Shift+Tab
5. WHEN using a screen reader, THE System SHALL provide appropriate ARIA labels and semantic HTML for all interactive elements

---

### Requisito 15: Tratamento de Erros e Recuperação

**User Story:** Como usuário, quero que o sistema trate erros de forma clara, para que eu saiba o que fazer em caso de problema.

#### Acceptance Criteria

1. IF the questionnaire fails to load, THEN THE System SHALL display a user-friendly error message with a retry button
2. IF the analysis fails, THEN THE System SHALL display an error message and allow the user to resubmit
3. IF the report generation fails, THEN THE System SHALL display an error message and provide options to retry or save the questionnaire data
4. WHEN an error occurs, THE System SHALL log the error details for debugging purposes
5. THE System SHALL provide a "Contact Support" option if errors persist

---

### Requisito 16: Integração com Sistema de Pacientes

**User Story:** Como médico, quero que a qualificação seja associada ao paciente no sistema, para que eu possa acompanhar o histórico completo.

#### Acceptance Criteria

1. WHEN a qualification is completed, THE System SHALL associate it with the patient record
2. WHEN viewing a patient's profile, THE System SHALL display the most recent qualification result
3. WHEN a new qualification is created for the same patient and specialty, THE System SHALL allow the user to update or create a new record
4. WHEN exporting patient data, THE System SHALL include all qualifications in the export
5. THE System SHALL maintain referential integrity between qualifications and patient records

---

### Requisito 17: Suporte a Múltiplas Especialidades por Paciente

**User Story:** Como médico, quero qualificar um paciente para múltiplas especialidades, para que eu possa encaminhar para vários especialistas se necessário.

#### Acceptance Criteria

1. WHEN a patient is qualified for one specialty, THE System SHALL allow the user to qualify for another specialty
2. WHEN multiple qualifications exist for the same patient, THE System SHALL display all results in the patient's record
3. WHEN generating a comprehensive report, THE System SHALL include all qualifications
4. WHEN a new qualification is created for a specialty where one already exists, THE System SHALL prompt the user to update or create a new record
5. THE System SHALL track the date and time of each qualification separately

---

### Requisito 18: Documentação e Auditoria

**User Story:** Como administrador, quero manter registros completos de todas as qualificações, para que eu possa auditar o sistema e garantir conformidade.

#### Acceptance Criteria

1. WHEN a qualification is completed, THE System SHALL create an audit log entry with timestamp, user ID, patient ID, specialty, and result
2. WHEN a report is generated, THE System SHALL include metadata (creation date, user, version of protocol used)
3. WHEN accessing audit logs, THE System SHALL allow filtering by date, user, patient, or specialty
4. WHEN exporting audit logs, THE System SHALL provide CSV or JSON format
5. THE System SHALL retain audit logs for a minimum of 5 years

---

### Requisito 19: Notificações e Alertas

**User Story:** Como médico, quero receber notificações sobre qualificações urgentes, para que eu possa priorizar encaminhamentos críticos.

#### Acceptance Criteria

1. WHEN a qualification results in "Urgência", THE System SHALL display a prominent alert in the report
2. WHEN a qualification results in "Urgência", THE System SHALL optionally send a notification to the user (if notifications are enabled)
3. WHEN viewing the patient list, THE System SHALL highlight patients with urgent qualifications
4. WHEN filtering the patient list, THE System SHALL allow filtering by qualification status (Qualificado, Não Qualificado, Urgência)
5. THE System SHALL allow users to configure notification preferences in settings

---

### Requisito 20: Extensibilidade para Novas Especialidades

**User Story:** Como administrador, quero que o sistema seja preparado para adicionar novas especialidades, para que eu possa expandir a funcionalidade no futuro.

#### Acceptance Criteria

1. WHEN adding a new specialty, THE System SHALL support a modular protocol structure (Filtros, Sinais de Alerta, Exames)
2. WHEN a new specialty is added, THE System SHALL automatically integrate it into the specialty selection modal
3. WHEN a new specialty is added, THE System SHALL validate the protocol structure before activation
4. WHEN a new specialty is added, THE System SHALL not affect existing specialties or qualifications
5. THE System SHALL provide documentation for adding new specialties

---

## Non-Functional Requirements

### Performance

**NFR-1: Tempo de Carregamento do Questionário**
- O questionário deve carregar em < 2 segundos após seleção da especialidade
- Pré-preenchimento de dados deve completar em < 1 segundo
- Análise de elegibilidade deve completar em < 3 segundos

**NFR-2: Responsividade da Interface**
- Todas as interações devem ter feedback visual em < 100ms
- Scroll do questionário deve ser suave (60 FPS)
- Transições entre telas devem ser < 300ms

### Scalability

**NFR-3: Suporte a Múltiplos Usuários**
- Sistema deve suportar 1000+ usuários simultâneos (cada um com dados locais)
- Sem limite de qualificações por paciente (armazenadas localmente)
- Sem limite de pacientes por usuário

### Reliability

**NFR-4: Disponibilidade**
- Sistema deve estar disponível 99.5% do tempo (excluindo manutenção planejada)
- Falhas de rede não devem resultar em perda de dados (recuperação via localStorage)
- Service Worker deve funcionar offline para acesso a qualificações anteriores

**NFR-5: Recuperação de Falhas**
- Se a análise falhar, usuário deve poder resubmeter sem perder dados
- Se o navegador fechar, dados devem ser recuperáveis ao retornar
- Relatórios parcialmente gerados devem ser recuperáveis

### Security

**NFR-6: Proteção de Dados**
- Dados de pacientes devem ser criptografados em localStorage (AES-256)
- Comunicação com Groq API deve usar HTTPS/TLS 1.2+
- Nenhum dado de paciente deve ser enviado para servidores terceiros (exceto Groq para transcrição)

**NFR-7: Autenticação e Autorização**
- Cada usuário tem acesso apenas aos seus próprios dados
- Dados de pacientes não são compartilhados entre usuários
- Auditoria registra quem acessou quais dados e quando

**NFR-8: Conformidade Regulatória**
- Sistema deve estar em conformidade com LGPD (Lei Geral de Proteção de Dados)
- Usuários podem solicitar exclusão de seus dados (direito ao esquecimento)
- Auditoria deve ser mantida por mínimo 5 anos
- Relatórios devem incluir informações de rastreabilidade

### Usability

**NFR-9: Acessibilidade**
- Interface deve estar em conformidade com WCAG 2.1 AA
- Todos os elementos interativos devem ser acessíveis via teclado
- Leitores de tela devem funcionar corretamente
- Contraste de cores deve atender WCAG AA (4.5:1 para texto)

**NFR-10: Responsividade**
- Interface deve funcionar em dispositivos com tela de 320px até 2560px
- Touch targets devem ter mínimo 44x44px
- Formulários devem ser preenchíveis em dispositivos móveis

**NFR-11: Localização**
- Interface deve estar em português do Brasil
- Datas devem usar formato DD/MM/YYYY
- Números devem usar separador decimal "," (vírgula)

### Maintainability

**NFR-12: Documentação**
- Código deve ter comentários explicando lógica complexa
- Cada protocolo deve ter documentação clara das regras
- Deve haver guia para adicionar novas especialidades

**NFR-13: Testabilidade**
- Código deve ser estruturado para facilitar testes unitários
- Lógica de qualificação deve ser separada da UI
- Deve haver testes para cada propriedade de correção

### Compatibility

**NFR-14: Suporte a Navegadores**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Navegadores móveis (iOS Safari 14+, Chrome Mobile 90+)

**NFR-15: Compatibilidade com Plataforma de Gestão Clínica**
- Deve funcionar sem modificar código existente da plataforma
- Deve usar mesma estrutura de dados de pacientes
- Deve integrar-se com histórico existente

---

## Data Model

### Estrutura de Dados: Qualificação

```json
{
  "id": "qual_1234567890",
  "patientId": "p_9876543210",
  "specialty": "endocrinologia",
  "status": "qualificado",
  "createdAt": "2024-05-23T10:30:00Z",
  "completedAt": "2024-05-23T10:35:00Z",
  "userId": "user_123",
  "responses": {
    "eligibilityFilters": [
      { "filterId": "endo_filter_1", "question": "...", "answer": true, "met": true },
      { "filterId": "endo_filter_2", "question": "...", "answer": false, "met": false }
    ],
    "alertSigns": [
      { "alertId": "endo_alert_1", "description": "...", "detected": false }
    ],
    "exams": [
      { "examId": "endo_exam_1", "name": "HbA1c", "status": "realizado", "date": "2024-05-20" },
      { "examId": "endo_exam_2", "name": "Creatinina", "status": "faltando" }
    ]
  },
  "result": {
    "classification": "qualificado",
    "justification": "Paciente atende a todos os critérios de elegibilidade...",
    "missingExams": [],
    "detectedAlerts": [],
    "recommendations": "Encaminhar para endocrinologista..."
  },
  "report": {
    "html": "<html>...</html>",
    "pdf": "base64_encoded_pdf"
  }
}
```

### Estrutura de Dados: Auditoria

```json
{
  "id": "audit_1234567890",
  "timestamp": "2024-05-23T10:35:00Z",
  "userId": "user_123",
  "action": "qualification_completed",
  "qualificationId": "qual_1234567890",
  "patientId": "p_9876543210",
  "specialty": "endocrinologia",
  "result": "qualificado",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

## Acceptance Criteria Summary

| Requisito | Critério Principal | Validação |
|-----------|-------------------|-----------|
| 1 | Botão aparece após prontuário | Teste manual |
| 2 | Especialidades carregam corretamente | Teste unitário |
| 3-5 | Questionários dinâmicos funcionam | Teste de integração |
| 6-8 | Lógica de qualificação é correta | Teste de propriedades |
| 9 | Relatório é gerado e exportável | Teste de PDF |
| 10 | Dados são pré-preenchidos | Teste de extração |
| 11 | Persistência funciona | Teste de localStorage |
| 12 | Histórico é acessível | Teste de UI |
| 13 | Validação de segurança | Teste de penetração |
| 14 | Interface é responsiva | Teste de responsividade |
| 15 | Erros são tratados | Teste de exceções |
| 16 | Integração com pacientes | Teste de integração |
| 17 | Múltiplas especialidades | Teste de fluxo |
| 18 | Auditoria funciona | Teste de logs |
| 19 | Notificações funcionam | Teste de alertas |
| 20 | Extensibilidade é possível | Teste de arquitetura |

---

## Approval and Sign-Off

**Documento Versão:** 1.0  
**Data de Criação:** 23 de Maio de 2024  
**Última Atualização:** 23 de Maio de 2024  
**Status:** Pronto para Revisão

**Stakeholders:**
- [ ] Médico (Usuário Final)
- [ ] Administrador de Sistema
- [ ] Especialista em Conformidade LGPD
- [ ] Arquiteto de Software

---

## Appendix: Protocol References

### Referências do Ministério da Saúde

1. **Diabetes Mellitus tipo 2**
   - Diretrizes da Sociedade Brasileira de Diabetes (SBD)
   - Protocolo de Encaminhamento TelessaúdeRS

2. **Hipertensão Arterial Crônica**
   - Diretrizes Brasileiras de Hipertensão Arterial (SBC/SBH)
   - Protocolo de Encaminhamento TelessaúdeRS

3. **Reumatologia**
   - Diretrizes da Sociedade Brasileira de Reumatologia (SBR)
   - Protocolo de Encaminhamento TelessaúdeRS

### Conformidade Regulatória

- **LGPD** - Lei Geral de Proteção de Dados (Lei 13.709/2018)
- **HIPAA** - Health Insurance Portability and Accountability Act (para compatibilidade internacional)
- **Resolução CFM 1638/2002** - Telemedicina
- **Resolução CFM 2227/2018** - Prontuário Eletrônico

---

**Fim do Documento de Requisitos**