# 🧪 Guia de Teste - Qualificador de Encaminhamentos Médicos

## ✅ Integração Completa

O módulo Qualificador de Encaminhamentos Médicos foi **totalmente integrado** com a plataforma de gestão clínica. Aqui está como testar:

---

## 🚀 Opção 1: Teste Interativo (Recomendado)

### Passo 1: Abrir a Interface de Teste

Abra o arquivo de teste interativo no seu navegador:

```
file:///c:/Projects/e-transciber +/modules/qualification/test-integration.html
```

Ou acesse através da plataforma:
- Abra `index.html` da plataforma
- Clique em "Qualificador" no menu lateral
- Você verá a interface de teste

### Passo 2: Executar os Testes

A interface oferece 9 testes:

1. **Inicializar Sistema** - Carrega o módulo e protocolos
2. **Listar Especialidades** - Exibe as 3 especialidades disponíveis
3. **Iniciar Qualificação** - Inicia uma sessão de qualificação
4. **Simular Respostas** - Preenche o questionário automaticamente
5. **Analisar Qualificação** - Processa as respostas
6. **Gerar Relatório** - Cria o relatório final
7. **Histórico** - Recupera qualificações anteriores
8. **Validação** - Testa validação de dados
9. **Fluxo Completo** - Executa tudo de uma vez

### Passo 3: Verificar Resultados

Cada teste mostra:
- ✅ Sucesso (verde)
- ❌ Erro (vermelho)
- ℹ️ Informação (azul)

A saída detalhada aparece na seção "Saída de Teste" abaixo dos botões.

---

## 🧬 Opção 2: Teste na Plataforma

### Passo 1: Abrir a Plataforma

Abra `index.html` no navegador:

```
file:///c:/Projects/e-transciber +/index.html
```

### Passo 2: Gerar um Prontuário

1. Clique em "Nova Consulta"
2. Grave ou carregue um áudio de consulta
3. Clique em "Processar com IA"
4. Aguarde a geração do prontuário

### Passo 3: Qualificar o Paciente

1. Após gerar o prontuário, clique em **"Qualificar para Encaminhamento"**
2. Selecione uma especialidade:
   - 🩺 **Endocrinologia** (Diabetes Mellitus tipo 2)
   - ❤️ **Cardiologia** (Hipertensão Arterial)
   - 🦴 **Reumatologia** (Lúpus, Artrite, Artrose)

### Passo 4: Responder o Questionário

1. O sistema pré-preencherá os campos com dados da consulta
2. Responda as perguntas adicionais
3. Clique em **"Analisar"**

### Passo 5: Visualizar Relatório

1. O sistema gerará um relatório com:
   - Resultado (Qualificado / Não Qualificado / Urgência)
   - Justificativa clínica
   - Sinais de alerta detectados
   - Exames faltantes
   - Recomendações

2. Você pode:
   - 📄 **Visualizar** o relatório na tela
   - 🖨️ **Imprimir** o relatório
   - 📥 **Baixar** em PDF
   - 💾 **Salvar** no histórico

### Passo 6: Acessar Histórico

1. Clique em **"Qualificador"** no menu lateral
2. Veja todas as qualificações realizadas
3. Clique em **"Visualizar"** para ver qualquer relatório anterior

---

## 📋 Casos de Teste Recomendados

### Caso 1: Paciente Qualificado (Endocrinologia)

**Dados:**
- Paciente: João Silva, 45 anos
- Diagnóstico: Diabetes Mellitus tipo 2
- HbA1c: 10.2% (> 9%)
- Medicação: Insulina NPH há 8 meses
- Exames: Todos realizados

**Resultado Esperado:** ✅ **QUALIFICADO**

### Caso 2: Urgência (Cardiologia)

**Dados:**
- Paciente: Maria Santos, 52 anos
- Diagnóstico: Hipertensão Arterial
- PA: 185/125 mmHg
- Sintomas: Dor no peito, falta de ar
- Medicação: 3+ anti-hipertensivos

**Resultado Esperado:** 🔴 **URGÊNCIA**

### Caso 3: Não Qualificado (Reumatologia)

**Dados:**
- Paciente: Pedro Costa, 60 anos
- Diagnóstico: Artrose leve
- Sintomas: Dor mecânica, sem inflamação
- Sem rigidez matinal
- Sem inchaço em múltiplas articulações

**Resultado Esperado:** ❌ **NÃO QUALIFICADO**

### Caso 4: Qualificado com Ressalvas

**Dados:**
- Paciente: Ana Silva, 48 anos
- Diagnóstico: Diabetes Mellitus tipo 2
- HbA1c: 10.5% (> 9%)
- Medicação: Insulina há 7 meses
- Exames: Faltam 2 exames obrigatórios

**Resultado Esperado:** ⚠️ **QUALIFICADO COM RESSALVAS**

---

## 🔍 O Que Testar

### ✅ Funcionalidades Principais

- [ ] Inicialização do sistema
- [ ] Carregamento de protocolos
- [ ] Seleção de especialidade
- [ ] Pré-preenchimento de dados
- [ ] Validação de respostas
- [ ] Análise de elegibilidade
- [ ] Detecção de sinais de alerta
- [ ] Validação de exames
- [ ] Geração de relatório
- [ ] Download de PDF
- [ ] Impressão de relatório
- [ ] Salvamento no histórico
- [ ] Recuperação de histórico

### ✅ Segurança e Conformidade

- [ ] Validação de entrada
- [ ] Sanitização de dados
- [ ] Auditoria de ações
- [ ] Persistência em localStorage
- [ ] Recuperação de sessão

### ✅ Interface

- [ ] Modal de especialidades
- [ ] Questionário dinâmico
- [ ] Relatório responsivo
- [ ] Botões funcionando
- [ ] Mensagens de erro claras
- [ ] Notificações de sucesso

---

## 🐛 Troubleshooting

### Problema: "Sistema não inicializado"

**Solução:**
1. Verifique se todos os scripts foram carregados
2. Abra o console (F12) e procure por erros
3. Recarregue a página

### Problema: "Módulo não encontrado"

**Solução:**
1. Verifique se os arquivos estão em `modules/qualification/`
2. Verifique os caminhos dos scripts no `index.html`
3. Verifique se não há erros de CORS

### Problema: "Dados não salvos"

**Solução:**
1. Verifique se localStorage está habilitado
2. Verifique se há espaço disponível (5MB)
3. Abra o DevTools → Application → Local Storage

### Problema: "Relatório não exibe"

**Solução:**
1. Verifique se a análise foi bem-sucedida
2. Verifique se há erros no console
3. Tente recarregar a página

---

## 📊 Métricas de Sucesso

Você saberá que a integração está funcionando quando:

✅ **Inicialização**
- Sistema carrega sem erros
- Protocolos são carregados
- Especialidades aparecem

✅ **Qualificação**
- Questionário exibe corretamente
- Respostas são salvas
- Análise processa sem erros

✅ **Relatório**
- Relatório é gerado
- Resultado está correto
- PDF pode ser baixado

✅ **Histórico**
- Qualificações são salvas
- Histórico pode ser recuperado
- Dados persistem após recarregar

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique o console** (F12 → Console)
2. **Leia as mensagens de erro** com atenção
3. **Consulte a documentação:**
   - `README.md` - Documentação completa
   - `INTEGRATION_GUIDE.md` - Guia de integração
   - `design.md` - Especificações técnicas
   - `requirements.md` - Requisitos funcionais

---

## 🎉 Próximos Passos

Após validar a integração:

1. **Integração com Pacientes** - Vincular histórico ao cadastro de pacientes
2. **Dashboard** - Criar dashboard com estatísticas
3. **Exportação** - Adicionar exportação para SISREG
4. **Notificações** - Adicionar alertas para urgências
5. **Mais Especialidades** - Expandir para outras especialidades

---

**Status:** ✅ **INTEGRAÇÃO COMPLETA E PRONTA PARA TESTE**

Divirta-se testando! 🚀
