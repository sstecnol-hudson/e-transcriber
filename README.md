# E-Transcriber | Inteligência Artificial Médica

O **E-Transcriber** é um assistente de transcrição de consultas e estruturação de prontuários clínicos em tempo real, projetado especificamente para médicos e profissionais de saúde. A aplicação consome a API do **Groq** para transcrever áudio em segundos via Whisper e formatar prontuários com LLMs de alto desempenho (como o Llama 3.3).

Esta aplicação foi desenvolvida seguindo o conceito de **Zero Servidor (Client-Side)**. Ela roda 100% no seu próprio navegador web, o que garante facilidade de uso imediato e **100% de privacidade dos dados de saúde** sob as diretrizes da LGPD (Lei Geral de Proteção de Dados).

---

## ✨ Principais Funcionalidades

1. **Gravação e Transcrição em Tempo Real**:
   - Controle simplificado para iniciar e parar gravações da consulta pelo microfone.
   - Gráfico de onda de áudio animado em tempo real e cronômetro.
   - Suporte a múltiplos idiomas de transcrição (Português, Inglês e Espanhol).
   
2. **Carregamento de Arquivos Externos**:
   - Área dedicada para arrastar e soltar (drag-and-drop) arquivos de áudio ou vídeo pré-gravados de até 25MB (limite da API).

3. **Revisão Lado a Lado (Segurança Clínica)**:
   - A transcrição bruta gerada pelo **Groq Whisper** é exibida em uma caixa de texto totalmente editável. O médico pode revisar e corrigir termos técnicos, siglas ou ruídos de fala antes de enviar para a IA estruturar.

4. **Geração Automatizada de Documentação Dupla**:
   - **Prontuário Médico Estruturado**: Nos modelos **SOAP**, **Anamnese Tradicional**, **Evolução Clínica Diária** ou um **Modelo Personalizado** configurado pelo médico.
   - **Mensagem para o Paciente**: Explicação simples e resumida sobre tratamentos, dosagens de medicamentos e orientações da consulta em linguagem amigável com botão direto para envio via **WhatsApp**.

5. **Histórico Local e Banco de Dados Próprio**:
   - Todas as consultas processadas podem ser salvas localmente e pesquisadas no painel de Histórico (armazenado com segurança no banco de dados local do seu navegador).
   - Exportação rápida de prontuários em formato de arquivo `.txt`.

6. **Prompts Customizados**:
   - Menu dedicado para personalizar as instruções do sistema de cada um dos modelos de prontuário, permitindo que a IA se comporte exatamente conforme a sua especialidade clínica (Pediatria, Psiquiatria, Dermatologia, etc.).

---

## 🛠️ Como Iniciar a Aplicação (PWA & Offline)

Como o **E-Transcriber** foi estruturado como um **Progressive Web App (PWA)**, você pode usá-lo tanto localmente quanto publicá-lo na nuvem de forma 100% gratuita.

### Método 1: Uso Local Rápido
1. Dê um **duplo clique no arquivo `index.html`** para abrir no seu navegador.
2. Para **Instalar como Aplicativo**, clique no ícone de "Instalar E-Transcriber" que aparecerá no canto superior direito da barra de endereços do Chrome ou Edge. Ele criará um atalho na sua área de trabalho e abrirá como um programa nativo.

### Método 2: Hospedagem Gratuita na Nuvem (Para usar em qualquer lugar)
Como o projeto é composto apenas por arquivos estáticos e usa o banco de dados do próprio navegador do usuário, você pode publicá-lo na internet de graça e com segurança em menos de 2 minutos:

#### Opção A: Vercel (Recomendado)
1. Crie uma conta gratuita na [Vercel](https://vercel.com).
2. Instale o Vercel CLI ou conecte sua conta do GitHub.
3. Arraste a pasta do projeto para o painel da Vercel ou use o comando `vercel` no terminal dentro da pasta.
4. O site receberá um endereço seguro (ex: `etranscriber.vercel.app`) com certificado SSL (HTTPS), necessário para habilitar as permissões de gravação de áudio e telemedicina em celulares e outros computadores.

#### Opção B: Netlify
1. Crie uma conta gratuita na [Netlify](https://netlify.com).
2. Vá na aba "Sites" e arraste a pasta inteira `c:\Projects\e-transciber` para a área de upload indicada como "Drag and drop your site folder".
3. Em segundos, seu Web App estará online e seguro.

---

## ⚙️ Configuração da API do Groq (Gratuito)

Para que a inteligência artificial funcione, a aplicação precisa se comunicar com a API do Groq. Siga os passos:

1. Acesse o console do Groq: [console.groq.com/keys](https://console.groq.com/keys) (crie uma conta gratuita caso não tenha).
2. Clique em **"Create API Key"** e copie a chave gerada (ela começa com `gsk_`).
3. Abra a aba **Configurações** no E-Transcriber.
4. Cole a chave no campo indicado, clique em **"Testar Conexão"** para validar e depois em **"Salvar Chave"**.
5. Pronto! Suas consultas já podem ser transcritas e estruturadas.

---

## 🔒 Segurança, Privacidade e LGPD

* **Onde meus dados são salvos?** Todos os prontuários e as chaves de API são armazenados no `localStorage` do seu próprio navegador. Nenhum servidor externo, além da API do Groq, tem acesso às suas consultas.
* **Os arquivos de áudio são salvos?** Não. O áudio gravado fica temporariamente na memória do navegador e é enviado criptografado via HTTPS para a API do Groq transcrever. O arquivo é apagado imediatamente após a transcrição.
* **Consentimento**: Em conformidade com a LGPD, avise verbalmente ao paciente que a consulta será gravada exclusivamente para a criação automática do prontuário médico.
