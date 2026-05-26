# 📘 MANUAL COMPLETO DE OPERAÇÃO - E-TRANSCRIBER

## 🎯 Índice

1. [Introdução](#1-introdução)
2. [Primeiros Passos](#2-primeiros-passos)
3. [Configuração Inicial](#3-configuração-inicial)
4. [Modo Consultas Médicas](#4-modo-consultas-médicas)
5. [Modo Reuniões Corporativas](#5-modo-reuniões-corporativas)
6. [Gerenciamento de Pacientes](#6-gerenciamento-de-pacientes)
7. [Histórico e Relatórios](#7-histórico-e-relatórios)
8. [Modelos de IA](#8-modelos-de-ia)
9. [Funcionalidades Avançadas](#9-funcionalidades-avançadas)
10. [Solução de Problemas](#10-solução-de-problemas)

---

## 1. INTRODUÇÃO

### 1.1 O que é o E-Transcriber?

O **E-Transcriber** é um sistema inteligente de transcrição e documentação que utiliza Inteligência Artificial para:

- 🏥 **Consultas Médicas**: Transcrever consultas e gerar prontuários estruturados
- 🏢 **Reuniões Corporativas**: Gravar reuniões e gerar atas profissionais
- 👥 **Gestão de Participantes**: Controlar presença com QR Code
- 📊 **Relatórios**: Exportar documentos em PDF e Excel

### 1.2 Tecnologias Utilizadas

- **Groq API**: Transcrição (Whisper) e geração de texto (Llama)
- **PWA**: Funciona offline e pode ser instalado como app
- **Armazenamento Local**: Todos os dados ficam no seu navegador

### 1.3 Requisitos

✅ **Navegador moderno**: Chrome, Edge, Firefox, Safari  
✅ **Conexão com internet**: Para usar IA (Groq API)  
✅ **Microfone**: Para gravação de áudio  
✅ **Chave Groq API**: Gratuita em [console.groq.com](https://console.groq.com)

---

## 2. PRIMEIROS PASSOS

### 2.1 Acessando o Sistema

**Opção 1: Online (Vercel)**
```
https://e-transcriber.vercel.app
```

**Opção 2: Local (Desenvolvimento)**
```bash
# Navegue até a pasta do projeto
cd c:\Projects\e-transciber

# Inicie um servidor HTTP
python -m http.server 8000

# Acesse no navegador
http://localhost:8000
```

### 2.2 Instalando como PWA

1. Acesse o site no navegador
2. Clique no ícone de **instalação** na barra de endereços
3. Confirme "Instalar"
4. O app será adicionado ao menu iniciar/área de trabalho

### 2.3 Interface Principal

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR          │  ÁREA PRINCIPAL                 │
│                   │                                  │
│  [CONSULTAS]      │  ┌──────────────────────────┐  │
│  [REUNIÕES]       │  │  Conteúdo da Aba Ativa   │  │
│                   │  │                          │  │
│  • Nova Consulta  │  │                          │  │
│  • Reuniões       │  │                          │  │
│  • Pacientes      │  │                          │  │
│  • Histórico      │  └──────────────────────────┘  │
│  • Modelos IA     │                                  │
│  • Configurações  │                                  │
│                   │                                  │
│  [Status Groq]    │                                  │
└─────────────────────────────────────────────────────┘
```

---

## 3. CONFIGURAÇÃO INICIAL

### 3.1 Obtendo a Chave Groq API

**Passo 1: Criar Conta**
1. Acesse: https://console.groq.com
2. Clique em **Sign Up** (ou faça login)
3. Confirme seu email

**Passo 2: Gerar Chave API**
1. No console Groq, vá em **API Keys**
2. Clique em **Create API Key**
3. Dê um nome (ex: "E-Transcriber")
4. Copie a chave (começa com `gsk_...`)
5. ⚠️ **IMPORTANTE**: Guarde em local seguro, não será mostrada novamente

**Passo 3: Configurar no E-Transcriber**
1. Abra o E-Transcriber
2. Clique em **Configurações** na sidebar
3. Cole a chave no campo **Chave API do Groq**
4. Clique em **💾 Salvar Chave**
5. Clique em **🧪 Testar Conexão** para validar

✅ **Status deve mudar para**: "Groq Configurado" (bolinha verde)

### 3.2 Configurar Dados do Consultório/Empresa

**Para Consultas Médicas:**
1. Vá em **Configurações**
2. Preencha o card **Dados do Consultório**:
   - Nome da Clínica/Consultório
   - Nome do Médico
   - CRM (opcional)
   - Telefone (opcional)
3. Clique em **💾 Salvar Informações**

**Para Reuniões Corporativas:**
1. Vá em **Configurações**
2. Preencha o card **Dados da Empresa**:
   - Nome da Empresa
   - Endereço (opcional)
3. Clique em **💾 Salvar Dados da Empresa**

💡 **Dica**: Esses dados aparecem nos PDFs gerados!

### 3.3 Escolher Tema (Claro/Escuro)

- Clique no ícone **🌙/☀️** no canto superior direito
- O tema é salvo automaticamente

---

## 4. MODO CONSULTAS MÉDICAS

### 4.1 Iniciando uma Nova Consulta

**Passo 1: Acessar**
1. Clique no botão **CONSULTAS** no topo da sidebar
2. Clique em **Nova Consulta** no menu

**Passo 2: Preencher Dados do Paciente**
```
┌─────────────────────────────────────────────────┐
│  Dados da Consulta e Paciente                   │
├─────────────────────────────────────────────────┤
│  Nome do Paciente: [João Silva          ]      │
│  Idade/Data Nasc.: [45 anos             ]      │
│  Especialidade:    [Clínica Médica      ]      │
│  Idioma do Áudio:  [Português (Brasil) ▼]      │
└─────────────────────────────────────────────────┘
```

💡 **Dica**: O campo **Nome** tem autocomplete! Digite e selecione pacientes já cadastrados.

### 4.2 Gravando a Consulta

**Opção A: Gravação Presencial (Microfone)**

1. Clique na aba **Gravar Áudio**
2. Clique no botão **🔴 Presencial**
3. Permita acesso ao microfone quando solicitado
4. Fale normalmente durante a consulta
5. Clique em **⏹️ Parar / Processar** quando terminar

**Opção B: Gravação Telemedicina (Microfone + Áudio do Computador)**

1. Clique na aba **Gravar Áudio**
2. Clique no botão **📹 Telemedicina**
3. Permita acesso ao microfone
4. Selecione a **guia/janela** da videochamada
5. ⚠️ **IMPORTANTE**: Marque "Compartilhar áudio da guia"
6. Clique em **⏹️ Parar / Processar** quando terminar

**Opção C: Enviar Arquivo de Áudio**

1. Clique na aba **Enviar Arquivo**
2. Arraste um arquivo ou clique para selecionar
3. Formatos aceitos: MP3, WAV, M4A, WEBM, MP4
4. Tamanho máximo: 25MB
5. Clique em **Transcrever Arquivo**

### 4.3 Editando a Transcrição

Após o processamento:

1. A transcrição aparece no campo **Transcrição Original Bruta**
2. ✏️ **Edite o texto** para corrigir:
   - Nomes de medicamentos
   - Termos médicos
   - Ruídos ou erros
3. Escolha o **Modelo Clínico**:
   - **SOAP**: Subjetivo, Objetivo, Avaliação, Plano
   - **Anamnese Completa**: Formato tradicional
   - **Evolução Clínica**: Para acompanhamento
   - **Orientação Rápida**: Resumo para paciente
4. Escolha o **Modelo LLM**:
   - **Llama 3.3 70B**: Recomendado (melhor qualidade)
   - **Mixtral 8x7B**: Alternativa
   - **Llama 3.1 8B**: Mais rápido
5. Clique em **✨ Estruturar com IA**

### 4.4 Revisando e Salvando

**Passo 1: Revisar Documentos Gerados**

Dois documentos são gerados:

```
┌──────────────────────────────────────────┐
│  📋 PRONTUÁRIO (Aguardando Validação)    │
│  ┌────────────────────────────────────┐  │
│  │ ### SUBJETIVO (S)                  │  │
│  │ - Queixa Principal: ...            │  │
│  │ - HDA: ...                         │  │
│  │                                    │  │
│  │ ### OBJETIVO (O)                   │  │
│  │ - Sinais Vitais: ...               │  │
│  │ ...                                │  │
│  └────────────────────────────────────┘  │
│  [📋 Copiar] [📄 Exportar PDF]           │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  💬 MENSAGEM PARA O PACIENTE             │
│  ┌────────────────────────────────────┐  │
│  │ Olá João! 😊                       │  │
│  │                                    │  │
│  │ 💊 Como Tomar seus Remédios        │  │
│  │ - Losartana 50mg: 1x ao dia...    │  │
│  │ ...                                │  │
│  └────────────────────────────────────┘  │
│  [📋 Copiar] [📱 WhatsApp]               │
└──────────────────────────────────────────┘
```

**Passo 2: Editar se Necessário**
- Clique nos campos de texto para editar
- Corrija qualquer informação incorreta
- ⚠️ **VALIDAÇÃO MÉDICA OBRIGATÓRIA**

**Passo 3: Exportar/Compartilhar**
- **📋 Copiar**: Copia para área de transferência
- **📄 Exportar PDF**: Baixa prontuário em PDF
- **📱 WhatsApp**: Abre WhatsApp com mensagem pronta

**Passo 4: Salvar no Histórico**
- Clique em **💾 Salvar no Histórico Local**
- A consulta fica disponível em **Histórico**

### 4.5 Exemplo Prático Completo

**Cenário**: Consulta de Hipertensão

```
1. DADOS DO PACIENTE
   Nome: Maria Santos
   Idade: 52 anos
   Especialidade: Cardiologia

2. GRAVAÇÃO (Presencial - 3min 45s)
   Médico: "Bom dia Dona Maria, como está se sentindo?"
   Paciente: "Doutor, estou com dor de cabeça há 3 dias..."
   [conversa continua...]

3. TRANSCRIÇÃO GERADA
   "Paciente relata cefaleia há 3 dias, principalmente 
   pela manhã. Nega náuseas. Histórico de HAS em uso 
   irregular de losartana..."

4. EDIÇÃO
   ✏️ Corrigir: "losartana" → "Losartana 50mg"
   ✏️ Adicionar: "PA: 150/95 mmHg"

5. ESTRUTURAÇÃO (Modelo SOAP)
   ✨ Clique em "Estruturar com IA"
   ⏳ Aguarde 10-15 segundos

6. PRONTUÁRIO GERADO
   ### SUBJETIVO (S)
   - QP: Cefaleia há 3 dias
   - HDA: Dor de cabeça matinal, sem náuseas
   - Histórico: HAS, uso irregular de Losartana 50mg
   
   ### OBJETIVO (O)
   - PA: 150/95 mmHg
   - FC: 78 bpm
   
   ### AVALIAÇÃO (A)
   - I10 - Hipertensão Arterial Sistêmica descompensada
   
   ### PLANO (P)
   - Losartana 50mg - 1cp pela manhã
   - Hidroclorotiazida 25mg - 1cp pela manhã
   - Retorno em 30 dias

7. MENSAGEM PARA PACIENTE
   Olá Maria! 😊
   
   💊 Como Tomar seus Remédios
   - Losartana 50mg: 1 comprimido pela manhã
   - Hidroclorotiazida 25mg: 1 comprimido pela manhã
   
   🥗 Cuidados no Dia a Dia
   - Reduzir sal na alimentação
   - Praticar atividade física leve
   
   📅 Seu Retorno
   Volte em 30 dias para reavaliação

8. SALVAR
   💾 Clique em "Salvar no Histórico Local"
   ✅ Consulta salva com sucesso!
```

---

## 5. MODO REUNIÕES CORPORATIVAS

### 5.1 Criando uma Nova Reunião

**Passo 1: Acessar**
1. Clique no botão **REUNIÕES** no topo da sidebar
2. Clique em **Reuniões** no menu

**Passo 2: Preencher Dados da Reunião**
```
┌─────────────────────────────────────────────────┐
│  Dados da Reunião                               │
├─────────────────────────────────────────────────┤
│  Título/Pauta:  [Planejamento Q3 2026    ]     │
│  Tipo:          [Reunião Geral          ▼]     │
│  Modalidade:    [Presencial             ▼]     │
│  Idioma:        [Português (Brasil)     ▼]     │
└─────────────────────────────────────────────────┘
```

**Tipos de Reunião:**
- Reunião Geral
- Assembleia
- Reunião de Diretoria

**Modalidades:**
- Presencial
- Online
- Híbrida

### 5.2 Gravando a Reunião

**Opção A: Reunião Presencial**
1. Clique em **🔴 Presencial**
2. Permita acesso ao microfone
3. Posicione o microfone no centro da mesa
4. Clique em **⏹️ Parar** ao final

**Opção B: Reunião Online**
1. Clique em **💻 Online**
2. Permita acesso ao microfone
3. Selecione a guia da videochamada
4. ⚠️ Marque "Compartilhar áudio da guia"
5. Clique em **⏹️ Parar** ao final

**Opção C: Enviar Arquivo**
- Mesmo processo das consultas médicas

### 5.3 Gerando a Ata

**Passo 1: Revisar Transcrição**
1. Edite a transcrição se necessário
2. Escolha o **Modelo LLM**
3. Clique em **✨ Gerar Ata de Reunião**

**Passo 2: Revisar Ata Gerada**

A ata é estruturada automaticamente:

```
# ATA DE REUNIÃO

**1. OBJETIVO DA REUNIÃO**
Planejamento estratégico do terceiro trimestre de 2026

**2. PRINCIPAIS TÓPICOS DISCUTIDOS**
- Metas de vendas: Discussão sobre aumento de 15%
- Expansão regional: Abertura de nova filial
- Contratações: Necessidade de 5 novos colaboradores

**3. DECISÕES TOMADAS**
- Aprovado orçamento de R$ 500.000 para expansão
- Definido prazo de 90 dias para inauguração
- Autorizada abertura de processo seletivo

**4. PRÓXIMOS PASSOS E RESPONSÁVEIS**
- [Buscar imóvel para filial] - Responsável: João Silva - Prazo: 30 dias
- [Elaborar plano de contratação] - Responsável: Maria RH - Prazo: 15 dias
- [Apresentar projeção financeira] - Responsável: Carlos CFO - Prazo: 7 dias
```

**Passo 3: Exportar**
- **📋 Copiar**: Copia ata completa
- **📄 Exportar PDF**: Baixa ata em PDF profissional

**Passo 4: Salvar**
- **💾 Salvar no Histórico**: Fica disponível em "Hist. Reuniões"

### 5.4 Gerenciamento de Participantes

**Funcionalidade EXCLUSIVA de Reuniões** - Funciona SEM chave Groq!

**Passo 1: Configurar Reunião**
1. Role até **Gerenciar Participantes e Presença**
2. Preencha:
   - Data da Reunião
   - Horário de Início
   - Horário de Término
3. Clique em **💾 Salvar Configurações**

**Passo 2: Gerar QR Code**
1. Clique em **📱 Gerar QR Code de Check-in**
2. QR Code aparece na tela
3. Participantes escaneiam para fazer check-in

**Passo 3: Adicionar Participantes Manualmente**
1. Clique em **👥 Gerenciar Lista de Participantes**
2. No modal, clique em **➕ Adicionar Participante**
3. Preencha:
   - Nome Completo
   - Cargo/Função
   - Email (opcional)
4. Clique em **💾 Adicionar**

**Passo 4: Marcar Presença Manual**
- Na lista de participantes, clique em **✓ Presente**
- Status muda de "Ausente" para "Presente"

**Passo 5: Exportar Lista de Presença**
- **📊 Exportar Excel**: Planilha com todos os dados
- **📄 Exportar PDF**: Lista formatada para impressão

### 5.5 Exemplo Prático Completo

**Cenário**: Reunião de Diretoria

```
1. DADOS DA REUNIÃO
   Título: Reunião de Diretoria - Maio 2026
   Tipo: Reunião de Diretoria
   Modalidade: Híbrida
   Data: 20/05/2026
   Horário: 14:00 - 16:00

2. CONFIGURAR PARTICIPANTES
   ✅ Salvar configurações de data/hora
   📱 Gerar QR Code
   
   Adicionar manualmente:
   - João Silva (CEO)
   - Maria Santos (CFO)
   - Carlos Oliveira (CTO)
   - Ana Costa (CMO)

3. CHECK-IN
   ✅ João Silva - Escaneou QR às 13:58
   ✅ Maria Santos - Escaneou QR às 14:02
   ✅ Carlos Oliveira - Marcado manualmente
   ❌ Ana Costa - Ausente

4. GRAVAÇÃO (Online - 1h 45min)
   [Reunião gravada com áudio da videochamada]

5. TRANSCRIÇÃO
   "João: Vamos iniciar a reunião de diretoria.
   Primeiro ponto: resultados do Q1..."

6. GERAR ATA
   ✨ Clique em "Gerar Ata de Reunião"
   ⏳ Aguarde 15-20 segundos

7. ATA GERADA
   # ATA DE REUNIÃO DE DIRETORIA
   
   **1. OBJETIVO**
   Análise de resultados Q1 e planejamento Q2
   
   **2. TÓPICOS DISCUTIDOS**
   - Resultados Q1: Crescimento de 12%
   - Metas Q2: Projeção de 18%
   - Investimentos: Aprovação de novos projetos
   
   **3. DECISÕES**
   - Aprovado budget de R$ 2M para marketing
   - Contratação de 10 desenvolvedores
   
   **4. ACTION ITEMS**
   - [Contratar devs] - Carlos CTO - 60 dias
   - [Campanha marketing] - Ana CMO - 30 dias

8. EXPORTAR PRESENÇA
   📊 Excel: lista_presenca_20-05-2026.xlsx
   📄 PDF: ata_diretoria_20-05-2026.pdf

9. SALVAR
   💾 Reunião salva no histórico
```

---

## 6. GERENCIAMENTO DE PACIENTES

### 6.1 Cadastrando Novo Paciente

**Passo 1: Acessar**
1. Clique em **CONSULTAS** (modo)
2. Clique em **Pacientes** no menu
3. Clique em **➕ Novo Paciente**

**Passo 2: Preencher Dados**
```
┌─────────────────────────────────────────────────┐
│  Novo Paciente                                  │
├─────────────────────────────────────────────────┤
│  Nome Completo*:    [João da Silva       ]     │
│  Data Nascimento:   [12/04/1981          ]     │
│  Gênero:            [Masculino          ▼]     │
│  CPF:               [123.456.789-00      ]     │
│  Telefone:          [(11) 98765-4321     ]     │
│  Convênio:          [Unimed              ]     │
│  Email:             [joao@email.com      ]     │
│  Observações:       [Alérgico a dipirona ]     │
│                     [                    ]     │
└─────────────────────────────────────────────────┘
   [Cancelar]  [💾 Salvar Paciente]
```

**Campos Obrigatórios:**
- ✅ Nome Completo

**Campos Opcionais:**
- Data de Nascimento
- Gênero
- CPF
- Telefone
- Convênio
- Email
- Observações (alergias, comorbidades, etc.)

**Passo 3: Salvar**
- Clique em **💾 Salvar Paciente**
- Paciente aparece na lista

### 6.2 Editando Paciente

1. Na lista de pacientes, clique no ícone **✏️ Editar**
2. Modifique os dados necessários
3. Clique em **💾 Salvar Paciente**

### 6.3 Iniciando Consulta para Paciente

1. Na lista de pacientes, clique no ícone **💬 Iniciar Consulta**
2. Sistema abre aba "Nova Consulta" com dados preenchidos
3. Continue o processo normal de consulta

### 6.4 Visualizando Histórico do Paciente

- Na coluna **Consultas**, veja o número de consultas realizadas
- Clique no número para filtrar histórico daquele paciente

### 6.5 Excluindo Paciente

1. Clique no ícone **🗑️ Excluir**
2. Confirme a exclusão
3. ⚠️ **ATENÇÃO**: Ação irreversível!

### 6.6 Buscando Pacientes


Use a barra de busca no topo da tabela:

```
🔍 [Buscar por nome, CPF ou convênio...]
```

A busca é em tempo real e filtra:
- Nome do paciente
- CPF
- Convênio

---

## 7. HISTÓRICO E RELATÓRIOS

### 7.1 Histórico de Consultas

**Acessar:**
1. Modo **CONSULTAS**
2. Clique em **Histórico**

**Visualizar Consulta:**
1. Clique no ícone **👁️ Visualizar**
2. Modal abre com 3 abas:
   - **Prontuário**: Documento estruturado
   - **Mensagem Paciente**: Orientações
   - **Transcrição**: Texto original

**Copiar Documentos:**
- Clique em **📋 Copiar Prontuário**
- Clique em **📋 Copiar Mensagem**

**Excluir Consulta:**
- Clique em **🗑️ Excluir**
- Confirme a exclusão

**Buscar no Histórico:**
```
🔍 [Buscar por paciente, data ou especialidade...]
```

**Limpar Histórico:**
- Clique em **🗑️ Limpar Histórico**
- ⚠️ Exclui TODAS as consultas

### 7.2 Histórico de Reuniões

**Acessar:**
1. Modo **REUNIÕES**
2. Clique em **Hist. Reuniões**

**Carregar Reunião:**
1. Clique em **👁️ Carregar Ata**
2. Ata é carregada na aba principal
3. Você pode editar e exportar novamente

**Excluir Reunião:**
- Clique em **🗑️ Excluir**

**Buscar:**
```
🔍 [Buscar por título, tipo ou data...]
```

### 7.3 Exportando Relatórios

**PDF de Prontuário:**
1. Abra uma consulta ou gere uma nova
2. Clique em **📄 Exportar PDF**
3. PDF é baixado com:
   - Cabeçalho com logo da clínica
   - Dados do paciente
   - Prontuário completo
   - Rodapé com data/hora

**PDF de Ata:**
1. Abra uma reunião ou gere uma nova
2. Clique em **📄 Exportar PDF**
3. PDF profissional com:
   - Cabeçalho corporativo
   - Dados da reunião
   - Ata estruturada
   - Rodapé

**Excel de Presença:**
1. Na aba Reuniões, seção Participantes
2. Clique em **📊 Exportar Excel**
3. Planilha contém:
   - Nome
   - Cargo
   - Email
   - Status (Presente/Ausente)
   - Horário de Check-in

---

## 8. MODELOS DE IA

### 8.1 Acessando Modelos

1. Modo **CONSULTAS**
2. Clique em **Modelos de IA**

### 8.2 Modelos Disponíveis

**SOAP (Padrão)**
```
Estrutura:
- SUBJETIVO: Queixa, HDA, histórico
- OBJETIVO: Exame físico, sinais vitais
- AVALIAÇÃO: Diagnósticos, CID-10
- PLANO: Medicamentos, exames, retorno
```

**Anamnese Completa**
```
Estrutura tradicional:
- Queixa Principal
- História da Doença Atual
- Histórico Patológico Pessoal/Familiar
- Exame Físico
- Conduta Terapêutica
```

**Evolução Clínica**
```
Formato de acompanhamento:
- Estado geral do paciente
- Adesão ao tratamento
- Achados de exame
- Mudanças de conduta
```

**Orientação Rápida**
```
Resumo simplificado para paciente:
- Linguagem acessível
- Tópicos com emojis
- Foco em orientações práticas
```

**Modelo Personalizado**
```
Você pode criar seu próprio modelo!
```

### 8.3 Personalizando Modelos

**Passo 1: Selecionar Modelo**
- Clique em um dos botões (SOAP, Anamnese, etc.)

**Passo 2: Editar Prompt**
```
┌─────────────────────────────────────────────────┐
│  Prompt do Sistema - SOAP                       │
├─────────────────────────────────────────────────┤
│  Você é um assistente de IA médica...          │
│                                                 │
│  Estruture sua resposta nas seções:            │
│  ### 1. SUBJETIVO (S)                          │
│  - Queixa Principal...                         │
│  ...                                           │
└─────────────────────────────────────────────────┘
```

**Passo 3: Modificar**
- Edite o texto do prompt
- Adicione instruções específicas
- Defina formato desejado

**Passo 4: Salvar**
- Clique em **💾 Salvar Prompt Personalizado**
- Modelo fica salvo localmente

**Passo 5: Restaurar Padrão**
- Clique em **🔄 Restaurar Padrão**
- Volta ao prompt original

### 8.4 Exemplo de Personalização

**Cenário**: Criar modelo para Pediatria

```
ANTES (SOAP Genérico):
"Você é um assistente de IA médica..."

DEPOIS (SOAP Pediátrico):
"Você é um assistente de IA médica especializado em PEDIATRIA.

Estruture o prontuário considerando:
- Idade da criança e marcos de desenvolvimento
- Histórico de vacinação
- Crescimento e desenvolvimento
- Orientações aos pais/responsáveis

### 1. SUBJETIVO (S)
- Queixa Principal (relatada pelos pais)
- História da Doença Atual
- Histórico de Vacinação
- Desenvolvimento Neuropsicomotor

### 2. OBJETIVO (O)
- Peso, Altura, IMC, Percentis
- Sinais Vitais
- Exame Físico Pediátrico

### 3. AVALIAÇÃO (A)
- Hipótese Diagnóstica com CID-10
- Avaliação do Desenvolvimento

### 4. PLANO (P)
- Medicamentos (doses pediátricas)
- Orientações aos Pais
- Próxima Consulta/Vacina
"

💾 Salvar Prompt Personalizado
```

---

## 9. FUNCIONALIDADES AVANÇADAS

### 9.1 Atalhos de Teclado

```
Ctrl + S     = Salvar consulta/reunião
Ctrl + C     = Copiar texto selecionado
Ctrl + V     = Colar
Ctrl + Z     = Desfazer
Ctrl + Shift + R = Recarregar (limpar cache)
F12          = Abrir DevTools (debug)
```

### 9.2 Trabalhando Offline

**O que funciona SEM internet:**
- ✅ Cadastro de pacientes
- ✅ Edição de textos
- ✅ Visualização de histórico
- ✅ Geração de QR Code
- ✅ Gerenciamento de participantes
- ✅ Exportação de Excel/PDF (se bibliotecas já carregadas)

**O que NÃO funciona SEM internet:**
- ❌ Transcrição de áudio (Whisper)
- ❌ Geração de prontuários/atas (Llama)
- ❌ Teste de conexão Groq

### 9.3 Backup e Restauração

**Fazer Backup Manual:**
1. Abra DevTools (F12)
2. Vá em **Application** > **Local Storage**
3. Clique com botão direito > **Copy**
4. Cole em arquivo de texto e salve

**Restaurar Backup:**
1. Abra DevTools (F12)
2. Vá em **Console**
3. Cole o código do backup
4. Recarregue a página

**Exportar Todos os Dados:**
```javascript
// Cole no Console (F12)
const backup = {
    patients: localStorage.getItem('etranscriber_patients'),
    history: localStorage.getItem('etranscriber_history'),
    meetings: localStorage.getItem('etranscriber_meetings_history'),
    clinic: localStorage.getItem('etranscriber_clinic_info')
};
console.log(JSON.stringify(backup, null, 2));
// Copie o resultado e salve em arquivo
```

### 9.4 Compartilhamento via WhatsApp

**Para Mensagem de Paciente:**
1. Gere a mensagem para o paciente
2. Clique em **📱 WhatsApp**
3. WhatsApp Web abre com mensagem pronta
4. Selecione o contato do paciente
5. Envie

**Formato da Mensagem:**
```
Olá [Nome]! 😊

💊 Como Tomar seus Remédios
- Medicamento 1: dosagem e horário
- Medicamento 2: dosagem e horário

🩺 Exames para Fazer
- Exame 1
- Exame 2

🥗 Cuidados no Dia a Dia
- Orientação 1
- Orientação 2

📅 Seu Retorno
Data e horário do retorno

Qualquer dúvida, entre em contato!
```

### 9.5 Instalação como App Desktop

**Windows:**
1. Abra o site no Chrome/Edge
2. Clique nos 3 pontos > **Instalar E-Transcriber**
3. App aparece no Menu Iniciar
4. Funciona como programa nativo

**Mac:**
1. Abra no Safari/Chrome
2. Clique em **Compartilhar** > **Adicionar à Dock**
3. App fica disponível no Dock

**Linux:**
1. Abra no Chrome/Firefox
2. Clique no ícone de instalação na barra
3. App fica no menu de aplicativos

### 9.6 Múltiplos Dispositivos

**Sincronização:**
- ⚠️ Dados ficam salvos LOCALMENTE em cada dispositivo
- Não há sincronização automática entre dispositivos

**Para usar em múltiplos dispositivos:**
1. Configure a chave Groq em cada um
2. Faça backup manual dos dados
3. Importe em outro dispositivo

**Alternativa (Futuro):**
- Integração com Google Drive
- Sincronização em nuvem
- Login multi-dispositivo

---

## 10. SOLUÇÃO DE PROBLEMAS

### 10.1 Problemas Comuns

**❌ "Groq Desconectado"**

**Causa:** Chave API não configurada ou inválida

**Solução:**
1. Vá em **Configurações**
2. Verifique se a chave está correta
3. Clique em **🧪 Testar Conexão**
4. Se falhar, gere nova chave em console.groq.com

---

**❌ "Biblioteca QRCode não encontrada"**

**Causa:** Biblioteca não carregou da CDN

**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Del)
2. Recarregue com Ctrl+Shift+R
3. Verifique conexão com internet
4. Teste em aba anônima

---

**❌ "Erro ao transcrever áudio"**

**Causas possíveis:**
- Arquivo maior que 25MB
- Formato não suportado
- Sem conexão com internet
- Chave Groq inválida

**Solução:**
1. Verifique tamanho do arquivo
2. Converta para MP3/WAV se necessário
3. Teste conexão com internet
4. Valide chave Groq

---

**❌ "Microfone não funciona"**

**Causa:** Permissão negada

**Solução:**
1. Clique no ícone de cadeado na barra de endereços
2. Permita acesso ao microfone
3. Recarregue a página
4. Tente gravar novamente

---

**❌ "PDF não gera"**

**Causa:** Biblioteca jsPDF não carregada

**Solução:**
1. Recarregue a página
2. Aguarde 5 segundos antes de gerar PDF
3. Verifique Console (F12) por erros
4. Limpe cache e tente novamente

---

**❌ "Dados sumiram"**

**Causa:** Cache do navegador limpo ou localStorage corrompido

**Solução:**
1. Verifique se não mudou de navegador
2. Verifique se não está em modo anônimo
3. Restaure backup se tiver
4. ⚠️ Sempre faça backups periódicos!

---

**❌ "Service Worker não registra"**

**Causa:** Protocolo file:// ou HTTP sem localhost

**Solução:**
1. Use HTTPS ou localhost
2. Inicie servidor local: `python -m http.server 8000`
3. Acesse via http://localhost:8000
4. Ou use versão online (Vercel)

---

### 10.2 Logs de Debug

**Abrir Console:**
1. Pressione F12
2. Vá na aba **Console**
3. Veja mensagens de log

**Logs Úteis:**
```
✅ Service Worker registrado
✅ Biblioteca QRCode carregada
✅ Groq API: Transcrição concluída
❌ Erro ao gerar PDF: [detalhes]
🔍 Testando bibliotecas...
```

### 10.3 Resetar Sistema

**Reset Completo:**
1. Vá em **Configurações**
2. Role até o final
3. Clique em **🔄 Resetar Tudo**
4. Confirme a ação
5. ⚠️ **ATENÇÃO**: Apaga TODOS os dados!

**Reset Seletivo via Console:**
```javascript
// Apagar apenas histórico de consultas
localStorage.removeItem('etranscriber_history');

// Apagar apenas pacientes
localStorage.removeItem('etranscriber_patients');

// Apagar apenas reuniões
localStorage.removeItem('etranscriber_meetings_history');

// Recarregar página
location.reload();
```

### 10.4 Verificar Versão

**No Console (F12):**
```javascript
// Versão do cache
console.log('Cache:', 'etranscriber-cache-v4');

// Verificar bibliotecas
console.log('QRCode:', typeof QRCode);
console.log('jsPDF:', typeof window.jspdf);
console.log('XLSX:', typeof XLSX);
```

### 10.5 Suporte e Contato

**Repositório GitHub:**
```
https://github.com/sstecnol-hudson/e-transcriber
```

**Reportar Bug:**
1. Abra uma Issue no GitHub
2. Descreva o problema
3. Inclua prints de tela
4. Copie logs do Console (F12)

**Documentação Adicional:**
- `README.md` - Visão geral
- `TESTE-QRCODE.md` - Guia de teste do QR Code
- `MANUAL-COMPLETO.md` - Este manual

---

## 📋 CHECKLIST DE USO DIÁRIO

### Para Consultas Médicas

```
□ Abrir E-Transcriber
□ Verificar status Groq (bolinha verde)
□ Clicar em "Nova Consulta"
□ Preencher dados do paciente
□ Gravar ou enviar áudio
□ Revisar transcrição
□ Escolher modelo clínico
□ Gerar prontuário com IA
□ Revisar e editar documentos
□ Exportar PDF se necessário
□ Enviar mensagem ao paciente (WhatsApp)
□ Salvar no histórico
```

### Para Reuniões

```
□ Abrir E-Transcriber
□ Clicar em "Reuniões"
□ Preencher dados da reunião
□ Configurar data/hora
□ Gerar QR Code (se presencial)
□ Adicionar participantes
□ Gravar reunião
□ Revisar transcrição
□ Gerar ata com IA
□ Revisar e editar ata
□ Exportar PDF da ata
□ Exportar lista de presença (Excel/PDF)
□ Salvar no histórico
```

---

## 🎓 DICAS E BOAS PRÁTICAS

### Gravação de Áudio

✅ **FAÇA:**
- Use microfone de qualidade
- Grave em ambiente silencioso
- Fale claramente e pausadamente
- Posicione microfone próximo aos falantes
- Teste antes de reuniões importantes

❌ **EVITE:**
- Ambientes com muito ruído
- Falar muito rápido
- Sobrepor falas (espere a vez)
- Microfone muito longe
- Arquivos maiores que 25MB

### Edição de Transcrições

✅ **SEMPRE:**
- Revise a transcrição antes de estruturar
- Corrija nomes de medicamentos
- Adicione informações faltantes
- Verifique dosagens e unidades
- Valide termos médicos

### Segurança e Privacidade

✅ **BOAS PRÁTICAS:**
- Não compartilhe sua chave Groq
- Faça backup regular dos dados
- Use HTTPS (versão online)
- Não deixe sessão aberta em computador público
- Revise documentos antes de enviar

### Organização

✅ **RECOMENDAÇÕES:**
- Cadastre pacientes antes das consultas
- Use nomes padronizados
- Preencha todos os campos importantes
- Exporte PDFs importantes
- Limpe histórico antigo periodicamente

---

## 📊 GLOSSÁRIO

**API**: Interface de Programação de Aplicações  
**Groq**: Plataforma de IA usada para transcrição e geração de texto  
**Whisper**: Modelo de IA para transcrição de áudio  
**Llama**: Modelo de IA para geração de texto  
**PWA**: Progressive Web App (aplicativo web progressivo)  
**QR Code**: Código de barras 2D para check-in  
**SOAP**: Subjetivo, Objetivo, Avaliação, Plano  
**HDA**: História da Doença Atual  
**CID-10**: Classificação Internacional de Doenças  
**LLM**: Large Language Model (Modelo de Linguagem Grande)  
**CDN**: Content Delivery Network (rede de distribuição de conteúdo)

---

## 📅 ATUALIZAÇÕES E VERSÕES

**Versão Atual**: 1.2  
**Última Atualização**: Maio 2026

**Histórico de Versões:**
- v1.2: Correção QRCode, melhorias de performance
- v1.1: Modo reuniões, gerenciamento de participantes
- v1.0: Lançamento inicial com consultas médicas

---

## ✅ CONCLUSÃO

O **E-Transcriber** é uma ferramenta poderosa que combina IA com praticidade para:

- 🏥 Otimizar consultas médicas
- 🏢 Profissionalizar reuniões corporativas
- 📊 Organizar documentação
- ⏱️ Economizar tempo

**Próximos Passos:**
1. Configure sua chave Groq
2. Cadastre seus primeiros pacientes
3. Faça uma consulta de teste
4. Explore os modelos de IA
5. Personalize conforme sua necessidade

**Lembre-se:**
- ⚠️ Sempre valide informações médicas
- 💾 Faça backups regulares
- 🔒 Mantenha dados seguros
- 📚 Consulte este manual quando necessário

---

**🎉 Bom uso do E-Transcriber!**

*Manual criado em: 20/05/2026*  
*Versão do Manual: 1.0*
