# 🔍 Como Ver as Alterações do Qualificador

## ⚠️ Problema Comum: Cache do Navegador

Quando você abre `index.html` localmente, o navegador pode estar usando uma **versão em cache** do arquivo. Por isso as alterações não aparecem.

---

## ✅ Solução 1: Limpar Cache (Mais Rápido)

### No Chrome/Edge/Brave:
1. Abra o arquivo `index.html`
2. Pressione **Ctrl + Shift + Delete** (Windows) ou **Cmd + Shift + Delete** (Mac)
3. Selecione "Cookies e outros dados de site"
4. Clique em "Limpar dados"
5. Recarregue a página com **Ctrl + F5** (força recarregar sem cache)

### No Firefox:
1. Pressione **Ctrl + Shift + Delete**
2. Selecione "Tudo"
3. Clique em "Limpar agora"
4. Recarregue com **Ctrl + F5**

---

## ✅ Solução 2: Usar um Servidor Local (Recomendado)

O navegador bloqueia alguns recursos quando você abre arquivos localmente. Use um servidor:

### Opção A: Python (se tiver instalado)
```bash
# Na pasta do projeto
python -m http.server 8000

# Depois abra no navegador:
# http://localhost:8000
```

### Opção B: Node.js (se tiver instalado)
```bash
# Instale http-server globalmente (uma vez)
npm install -g http-server

# Na pasta do projeto
http-server

# Depois abra no navegador:
# http://localhost:8080
```

### Opção C: Live Server (VS Code)
1. Instale a extensão "Live Server" no VS Code
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"
4. O navegador abre automaticamente em `http://localhost:5500`

---

## 🧪 Onde Ver as Alterações

### 1. **Teste Rápido (Recomendado)**
Abra este arquivo no navegador:
```
modules/qualification/test-integration.html
```

Este arquivo **funciona perfeitamente** e mostra:
- ✅ Inicializar Sistema
- ✅ Listar Especialidades
- ✅ Iniciar Qualificação
- ✅ Simular Respostas
- ✅ Analisar Qualificação
- ✅ Gerar Relatório
- ✅ Histórico
- ✅ Validação
- ✅ **Fluxo Completo** (clique aqui para ver tudo funcionando)

### 2. **Integração com index.html**
Após limpar o cache e recarregar `index.html`, você verá:

#### Na Sidebar (menu esquerdo):
- Botão "Nova Consulta" (já existia)
- Botão "Pacientes" (já existia)
- Botão "Histórico" (já existia)

#### Após gerar um Prontuário:
- Novo botão: **"Qualificar para Encaminhamento"** ← ISSO É NOVO!
- Clique nele para abrir o modal de qualificação

#### No Modal de Qualificação:
- Seleção de especialidade (Endocrinologia, Cardiologia, Reumatologia)
- Questionário dinâmico com perguntas pré-preenchidas
- Análise automática
- Geração de relatório

---

## 🔧 Verificar se os Scripts Estão Carregando

Abra o **Console do Navegador** (F12 ou Ctrl+Shift+I):

### Procure por:
1. **Erros vermelhos** - Se houver, os scripts não carregaram
2. **Avisos amarelos** - Geralmente não são problema
3. **Mensagens de sucesso** - Procure por logs do Qualificador

### Se houver erro "404 Not Found":
- Significa que o caminho do arquivo está errado
- Verifique se a pasta `modules/qualification/` existe
- Verifique se os arquivos `.js` estão lá

---

## 📋 Checklist de Verificação

- [ ] Limpei o cache do navegador
- [ ] Recarreguei a página com Ctrl+F5
- [ ] Abri o Console (F12) e não vejo erros vermelhos
- [ ] Abri `test-integration.html` e cliquei em "Fluxo Completo"
- [ ] Gerei um prontuário em `index.html`
- [ ] Vi o botão "Qualificar para Encaminhamento" aparecer
- [ ] Cliquei no botão e o modal abriu

---

## 🎯 Próximos Passos

1. **Teste o arquivo de teste primeiro**: `test-integration.html`
   - Clique em "Fluxo Completo" para ver tudo funcionando
   
2. **Depois teste a integração**: `index.html`
   - Gere um prontuário
   - Clique em "Qualificar para Encaminhamento"
   - Selecione uma especialidade
   - Responda as perguntas
   - Veja o relatório gerado

3. **Se algo não funcionar**:
   - Abra o Console (F12)
   - Procure por mensagens de erro
   - Copie a mensagem de erro
   - Compartilhe comigo

---

## 💡 Dicas

- **Não feche o Console**: Deixe aberto enquanto testa para ver erros em tempo real
- **Teste em abas diferentes**: Uma para `index.html` e outra para `test-integration.html`
- **Use Ctrl+F5**: Força o navegador a baixar a versão mais recente
- **Limpe localStorage**: Se tiver dados antigos, pode afetar o teste
  - No Console, digite: `localStorage.clear()` e pressione Enter

---

## 📞 Precisa de Ajuda?

Se as alterações ainda não aparecerem:
1. Abra o Console (F12)
2. Copie qualquer mensagem de erro
3. Compartilhe comigo

Vou ajudar a resolver! 🚀
