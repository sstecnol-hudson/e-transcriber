# E-Qualify - Inteligência Artificial Médica

Sistema avançado de transcrição médica e estruturação de prontuários com IA, desenvolvido para profissionais de saúde.

## 📚 DOCUMENTAÇÃO

- **[📘 MANUAL COMPLETO DE OPERAÇÃO](MANUAL-COMPLETO.md)** - Guia detalhado passo a passo com exemplos de uso
- **[🔍 Guia de Teste do QR Code](TESTE-QRCODE.md)** - Solução de problemas do QR Code

## 🚀 Como Executar o Projeto

### ⚠️ IMPORTANTE: Não abra diretamente pelo arquivo!

Este projeto é uma PWA (Progressive Web App) que precisa ser executada através de um servidor HTTP devido a:
- Service Workers
- Recursos CORS
- Funcionalidades PWA

### 📋 Pré-requisitos

- Python 3.x instalado no sistema
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### 🖥️ Executando Localmente

1. **Abra o PowerShell** na pasta do projeto:
   ```powershell
   cd C:\Projects\e-transciber
   ```

2. **Execute o script** para iniciar o servidor HTTP local (porta padrão 8000):
   ```powershell
   .\run_server.ps1
   ```
   Ou especifique outra porta:
   ```powershell
   .\run_server.ps1 8080
   ```

   O script verifica a presença do Python no PATH e inicia `python -m http.server` com saída em tempo real.

3. **Abra no navegador** na URL indicada pelo script, normalmente:
   ```
   http://localhost:8000
   ```

*Observação:* Caso a política de execução do PowerShell impeça a execução, permita scripts temporariamente com:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 🌐 Alternativas de Servidor

**Node.js (se disponível):**
```bash
npx http-server -p 8000
```

**PHP (se disponível):**
```bash
php -S localhost:8000
```

**Live Server (VS Code):**
- Instale a extensão "Live Server"
- Clique direito no `index.html` → "Open with Live Server"

## ✨ Funcionalidades

### 🏥 Modo Consultas
- **Transcrição em tempo real** via Groq Whisper
- **Geração automática** de prontuários estruturados
- **Gestão de pacientes** com autocomplete
- **Exportação em PDF** profissional
- **Histórico completo** de consultas

### 🤝 Modo Reuniões
- **Gravação presencial e online** (microfone + tela)
- **Atas automáticas** estruturadas
- **QR Code de presença** com check-in móvel
- **Lista de participantes** com exportação Excel/PDF
- **Histórico independente** de reuniões

### 🎨 Interface
- **Tema claro/escuro** adaptável
- **Design responsivo** mobile-first
- **Glassmorphism** moderno
- **Acessibilidade** completa (WCAG)

### 📱 PWA Features
- **Instalável** como app nativo
- **Funcionamento offline** (cache inteligente)
- **Notificações** e sincronização
- **Performance otimizada**

## 🔧 Configuração

### 🔑 Chave da API Groq

1. Acesse [console.groq.com](https://console.groq.com)
2. Crie uma conta gratuita
3. Gere uma API Key
4. No app, vá em **Configurações** → Cole sua chave

### 🏢 Informações da Clínica

Configure os dados da sua clínica em **Configurações**:
- Nome da clínica/consultório
- Endereço completo
- Dados para cabeçalhos de documentos

## 🛡️ Segurança e Privacidade

- ✅ **Dados locais**: Tudo armazenado no navegador
- ✅ **Sem servidor**: Não enviamos dados para nossos servidores
- ✅ **API direta**: Comunicação direta com Groq (criptografada)
- ✅ **LGPD compliant**: Controle total dos dados pelo usuário

## 🔄 Atualizações

O projeto é atualizado automaticamente via GitHub Pages:
- **URL de produção**: https://e-transcriber.com.br
- **Atualizações automáticas** do Service Worker
- **Cache inteligente** para performance

## 🐛 Solução de Problemas

### Erro de CORS / Service Worker
- ✅ **Solução**: Use servidor HTTP (não abra arquivo diretamente)
- ✅ **Comando**: `python -m http.server 8000`

### QR Code não funciona
- ✅ **Verifique**: Bibliotecas carregadas (conexão com internet)
- ✅ **Teste**: Recarregue a página

### Transcrição não funciona
- ✅ **Verifique**: Chave da API Groq configurada
- ✅ **Teste**: Permissões de microfone no navegador

## 📞 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@e-qualify.com.br
- 🌐 Site: https://e-transcriber.com.br
- 📱 WhatsApp: Disponível no app

---

**Desenvolvido com ❤️ para profissionais de saúde**