# Design Técnico - Integração Audio Processor

## 1. Visão Geral da Arquitetura

### Objetivo
Integrar o módulo `audio-processor.js` (1.000+ linhas) no E-Transcriber para melhorar qualidade de captura de áudio, reduzir tamanho de arquivo em 40% e fornecer visualização e monitoramento em tempo real.

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        E-TRANSCRIBER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    app.js / meetings.js                   │   │
│  │  (Lógica de aplicação, UI, integração com Groq API)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ▲                                    │
│                              │ usa                                │
│                              ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AudioProcessor (audio-processor.js)          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │ • initAudioContext()                               │  │   │
│  │  │ • startPresentialRecording()                       │  │   │
│  │  │ • startOnlineRecording()                           │  │   │
│  │  │ • stopRecording()                                  │  │   │
│  │  │ • getRecordedAudioBlob()                           │  │   │
│  │  │ • compressAudio()                                  │  │   │
│  │  │ • preprocessAudio()                                │  │   │
│  │  │ • setupVisualizer()                                │  │   │
│  │  │ • startQualityMonitoring()                         │  │   │
│  │  │ • getQualityMetrics()                              │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ▲                                    │
│                              │                                    │
│         ┌────────────────────┼────────────────────┐              │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │
│  │ AudioVisualizer │ │AudioQualityMonitor│ │ Processamento    │ │
│  │                 │ │                  │ │ (Compressão,     │ │
│  │ • start()       │ │ • update()       │ │  Pré-proc)       │ │
│  │ • stop()        │ │ • getQuality()   │ │                  │ │
│  │ • drawBars()    │ │ • detectClipping()│ │ • normalizeAudio()│ │
│  │ • drawWaveform()│ │ • calcNoise()    │ │ • trimSilence()  │ │
│  │ • drawCircular()│ │                  │ │ • applyFilters() │ │
│  └─────────────────┘ └──────────────────┘ └──────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ▼
                    ┌──────────────────────┐
                    │   Groq API           │
                    │ (Whisper + Llama)    │
                    └──────────────────────┘
```

### Fluxo de Dados

```
GRAVAÇÃO PRESENCIAL:
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────┐
│  Microfone  │───▶│ AudioContext │───▶│ Compressão │───▶│ Groq API │
│  (48kHz)    │    │  (Captura)   │    │ (-40%)     │    │(Whisper) │
└─────────────┘    └──────────────┘    └────────────┘    └──────────┘
                          │
                          ├──▶ Visualizador (Canvas)
                          │
                          └──▶ Monitor de Qualidade

GRAVAÇÃO ONLINE:
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌──────────┐
│  Microfone  │───▶│ AudioContext │───▶│ Compressão │───▶│ Groq API │
│  (48kHz)    │    │  (Combina)   │    │ (-40%)     │    │(Whisper) │
└─────────────┘    └──────────────┘    └────────────┘    └──────────┘
       ▲                   ▲
       │                   │
┌──────────────┐           │
│ Áudio Sistema│───────────┘
│ (Tela/Guia)  │
└──────────────┘
```


## 2. Componentes Principais

### 2.1 AudioProcessor

**Responsabilidade**: Gerenciar ciclo completo de captura, processamento e conversão de áudio.

**Instanciação em app.js**:
```javascript
// No início de app.js, após carregar audio-processor.js
const audioProcessor = new AudioProcessor();

// Armazenar na AppState para acesso global
AppState.audioProcessor = audioProcessor;
```

**Métodos Principais**:

| Método | Parâmetros | Retorno | Uso |
|--------|-----------|---------|-----|
| `initAudioContext()` | - | AudioContext | Inicializar contexto de áudio (48kHz) |
| `startPresentialRecording()` | - | {success, message, stream} | Iniciar gravação presencial |
| `startOnlineRecording()` | - | {success, message, stream} | Iniciar gravação online (mic + tela) |
| `stopRecording()` | - | {success, duration, chunks} | Parar gravação e retornar chunks |
| `getRecordedAudioBlob()` | - | Blob | Obter blob de áudio gravado |
| `compressAudio(blob)` | blob | {success, blob, ratio} | Comprimir áudio (-40%) |
| `preprocessAudio(blob)` | blob | {success, blob} | Pré-processar (normalizar, filtrar) |
| `setupVisualizer(canvas, stream)` | canvas, stream | AudioVisualizer | Configurar visualizador |
| `startQualityMonitoring()` | - | AudioQualityMonitor | Iniciar monitoramento |
| `getQualityMetrics()` | - | {noiseLevel, clipping, quality} | Obter métricas atuais |

### 2.2 AudioVisualizer

**Responsabilidade**: Renderizar visualização de áudio em tempo real no canvas.

**Estilos Suportados**:
- `bars`: Barras de frequência (padrão)
- `waveform`: Linha de onda
- `circular`: Visualização circular

**Integração com Canvas Existente**:
```javascript
// Em app.js, após iniciar gravação
const canvas = document.getElementById('waveformCanvas');
const visualizer = audioProcessor.setupVisualizer(canvas, audioProcessor.stream);
visualizer.start('bars'); // Iniciar com estilo barras

// Mudar estilo
visualizer.style = 'waveform';
```

### 2.3 AudioQualityMonitor

**Responsabilidade**: Monitorar e reportar métricas de qualidade de áudio.

**Métricas Fornecidas**:
```javascript
{
  noiseLevel: 0-255,        // Nível de ruído (0=silêncio, 255=máximo)
  clipping: boolean,        // Detecta distorção (picos > 240)
  frequency: number,        // Frequência dominante
  quality: string,          // 'excellent' | 'good' | 'fair' | 'poor'
  peakLevel: 0-255          // Pico de volume
}
```

**Cores de Indicador**:
- Verde: excellent/good (noiseLevel < 100)
- Amarelo: fair (noiseLevel 100-150)
- Vermelho: poor (clipping detectado)


## 3. Fluxos de Implementação

### 3.1 Fluxo app.js - Gravação Presencial

**Localização**: Tab "Nova Consulta" → Botão "Presencial"

**Pseudocódigo**:
```javascript
async function handlePresentialRecording() {
  // 1. Validar API key
  if (!AppState.apiKey) {
    showToast('Configure chave Groq em Configurações');
    return;
  }

  // 2. Iniciar gravação
  const result = await audioProcessor.startPresentialRecording();
  if (!result.success) {
    showToast(result.message);
    return;
  }

  // 3. Configurar visualizador
  const canvas = document.getElementById('waveformCanvas');
  const visualizer = audioProcessor.setupVisualizer(canvas, result.stream);
  visualizer.start('bars');

  // 4. Iniciar monitoramento de qualidade
  const qualityMonitor = audioProcessor.startQualityMonitoring();
  const qualityInterval = setInterval(() => {
    const metrics = audioProcessor.getQualityMetrics();
    updateQualityDisplay(metrics);
  }, 500);

  // 5. Iniciar timer
  startRecordingTimer();

  // 6. Atualizar UI
  DOM.btnRecordStart.disabled = true;
  DOM.btnRecordTelemed.disabled = true;
  DOM.btnRecordStop.disabled = false;

  // Armazenar para uso em stopRecording()
  AppState.recordingState = {
    visualizer,
    qualityInterval,
    qualityMonitor
  };
}

async function handleStopRecording() {
  // 1. Parar gravação
  const result = audioProcessor.stopRecording();
  if (!result.success) {
    showToast('Erro ao parar gravação');
    return;
  }

  // 2. Limpar UI
  clearInterval(AppState.recordingState.qualityInterval);
  AppState.recordingState.visualizer.stop();
  stopRecordingTimer();

  // 3. Obter blob
  const audioBlob = audioProcessor.getRecordedAudioBlob();

  // 4. Comprimir
  showToast('Comprimindo áudio...');
  const compressed = await audioProcessor.compressAudio(audioBlob);
  const finalBlob = compressed.success ? compressed.blob : audioBlob;

  // 5. Enviar para Groq
  await sendAudioToWhisper(finalBlob);

  // 6. Resetar UI
  DOM.btnRecordStart.disabled = false;
  DOM.btnRecordTelemed.disabled = false;
  DOM.btnRecordStop.disabled = true;
}
```

### 3.2 Fluxo app.js - Gravação Telemedicina

**Localização**: Tab "Nova Consulta" → Botão "Telemedicina"

**Diferenças**:
- Usar `audioProcessor.startOnlineRecording()` em vez de `startPresentialRecording()`
- Combina áudio do microfone + áudio do sistema (paciente)
- Fallback automático para microfone se áudio da tela não disponível

**Pseudocódigo**:
```javascript
async function handleTelemedicineRecording() {
  const result = await audioProcessor.startOnlineRecording();
  if (!result.success) {
    showToast(result.message);
    return;
  }
  
  // Resto é idêntico ao fluxo presencial
  // AudioProcessor cuida de combinar streams automaticamente
}
```

### 3.3 Fluxo meetings.js - Gravação de Reuniões

**Localização**: Tab "Reuniões" → Botão "Presencial" ou "Online"

**Pseudocódigo**:
```javascript
async function startMeetingRecording(isOnline = false) {
  // 1. Validar API key
  if (!AppState.apiKey) {
    showToast('Configure chave Groq em Configurações');
    return;
  }

  // 2. Iniciar gravação
  const method = isOnline ? 
    audioProcessor.startOnlineRecording() : 
    audioProcessor.startPresentialRecording();
  
  const result = await method;
  if (!result.success) {
    showToast(result.message);
    return;
  }

  // 3. Configurar visualizador
  const canvas = document.getElementById('waveformMeetingCanvas');
  const visualizer = audioProcessor.setupVisualizer(canvas, result.stream);
  visualizer.start('bars');

  // 4. Iniciar monitoramento
  const qualityMonitor = audioProcessor.startQualityMonitoring();
  const qualityInterval = setInterval(() => {
    const metrics = audioProcessor.getQualityMetrics();
    updateMeetingQualityDisplay(metrics);
  }, 500);

  // 5. Armazenar estado
  MeetingState.recordingState = {
    visualizer,
    qualityInterval,
    qualityMonitor
  };

  // 6. Atualizar UI
  MeetingDOM.btnRecordStart.disabled = true;
  MeetingDOM.btnRecordOnline.disabled = true;
  MeetingDOM.btnRecordStop.disabled = false;
}

async function stopMeetingRecording() {
  // 1. Parar gravação
  const result = audioProcessor.stopRecording();
  
  // 2. Limpar UI
  clearInterval(MeetingState.recordingState.qualityInterval);
  MeetingState.recordingState.visualizer.stop();

  // 3. Obter blob
  const audioBlob = audioProcessor.getRecordedAudioBlob();

  // 4. Comprimir
  const compressed = await audioProcessor.compressAudio(audioBlob);
  const finalBlob = compressed.success ? compressed.blob : audioBlob;

  // 5. Enviar para Groq
  await sendMeetingAudioToWhisper(finalBlob);

  // 6. Resetar UI
  MeetingDOM.btnRecordStart.disabled = false;
  MeetingDOM.btnRecordOnline.disabled = false;
  MeetingDOM.btnRecordStop.disabled = true;
}
```

### 3.4 Fluxo de Compressão

**Quando**: Após parar gravação, antes de enviar para Groq

**Pseudocódigo**:
```javascript
async function compressBeforeSending(audioBlob) {
  // 1. Validar tamanho
  const validation = audioProcessor.validateFileSize(audioBlob, 25);
  if (!validation.valid) {
    showToast(validation.message);
    return null;
  }

  // 2. Comprimir
  const result = await audioProcessor.compressAudio(audioBlob);
  
  if (result.success) {
    console.log(`Compressão: ${result.originalSize} → ${result.compressedSize} (${result.compressionRatio})`);
    return result.blob;
  } else {
    console.warn('Compressão falhou, usando original');
    return audioBlob; // Fallback
  }
}
```

**Resultado Esperado**:
- Redução de 35-40% no tamanho
- Conversão para WAV 16kHz
- Qualidade suficiente para transcrição

### 3.5 Fluxo de Pré-processamento

**Quando**: Ao fazer upload de arquivo (opcional)

**Pseudocódigo**:
```javascript
async function preprocessUploadedAudio(audioFile) {
  // 1. Validar tamanho
  const validation = audioProcessor.validateFileSize(audioFile, 25);
  if (!validation.valid) {
    showToast(validation.message);
    return null;
  }

  // 2. Pré-processar
  const result = await audioProcessor.preprocessAudio(audioFile);
  
  if (result.success) {
    console.log(`Pré-processamento: ${result.originalSize} → ${result.processedSize}`);
    return result.blob;
  } else {
    console.warn('Pré-processamento falhou, usando original');
    return audioFile; // Fallback
  }
}
```

**Etapas de Pré-processamento**:
1. Normalizar volume (target 0.95)
2. Remover silêncio (threshold 0.01)
3. Filtro passa-alta 80Hz (remover ruído baixo)
4. Compressão dinâmica (ratio 12:1)
5. Converter para WAV


## 4. Modificações em Cada Arquivo

### 4.1 index.html

**Localização**: Adicionar antes de `app.js` e `meetings.js`

**Mudança**:
```html
<!-- Antes de app.js -->
<script src="audio-processor.js"></script>
<script src="app.js"></script>
<script src="meetings.js"></script>
```

**Posição Exata**: Linha ~1100 (antes das tags `</body>`)

### 4.2 app.js

**Mudanças Principais**:

#### 4.2.1 Inicialização (função `init()`)
```javascript
// Adicionar após inicializar AppState
AppState.audioProcessor = new AudioProcessor();
```

#### 4.2.2 Substituir `startRecording()` Presencial
```javascript
// ANTES (remover):
async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({...});
  // ... código antigo ...
}

// DEPOIS (novo):
async function startRecording() {
  if (!AppState.apiKey) {
    showToast('Configure sua chave Groq em Configurações primeiro!');
    switchTab('tab-config');
    return;
  }

  const result = await AppState.audioProcessor.startPresentialRecording();
  if (!result.success) {
    showToast(result.message);
    return;
  }

  // Configurar visualizador
  const canvas = DOM.waveformCanvas;
  const visualizer = AppState.audioProcessor.setupVisualizer(canvas, result.stream);
  visualizer.start('bars');

  // Iniciar monitoramento de qualidade
  const qualityMonitor = AppState.audioProcessor.startQualityMonitoring();
  const qualityInterval = setInterval(() => {
    const metrics = AppState.audioProcessor.getQualityMetrics();
    updateQualityDisplay(metrics);
  }, 500);

  // Iniciar timer
  AppState.recordingStartTime = Date.now();
  AppState.recordingTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - AppState.recordingStartTime) / 1000);
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    DOM.recordingTimer.textContent = `${m}:${s}`;
  }, 1000);

  // Atualizar UI
  DOM.btnRecordStart.disabled = true;
  DOM.btnRecordTelemed.disabled = true;
  DOM.btnRecordStop.disabled = false;

  // Armazenar estado
  AppState.recordingState = {
    visualizer,
    qualityInterval,
    qualityMonitor
  };

  showToast('Gravação presencial iniciada');
}
```

#### 4.2.3 Substituir `startTelemedicineRecording()`
```javascript
// ANTES (remover):
async function startTelemedicineRecording() {
  // ... código antigo ...
}

// DEPOIS (novo):
async function startTelemedicineRecording() {
  if (!AppState.apiKey) {
    showToast('Configure sua chave Groq em Configurações primeiro!');
    switchTab('tab-config');
    return;
  }

  const result = await AppState.audioProcessor.startOnlineRecording();
  if (!result.success) {
    showToast(result.message);
    return;
  }

  // Resto é idêntico a startRecording()
  // AudioProcessor cuida de combinar streams
  const canvas = DOM.waveformCanvas;
  const visualizer = AppState.audioProcessor.setupVisualizer(canvas, result.stream);
  visualizer.start('bars');

  // ... (mesmo código de monitoramento e UI)
}
```

#### 4.2.4 Substituir `stopRecording()`
```javascript
// ANTES (remover):
function stopRecording() {
  // ... código antigo ...
}

// DEPOIS (novo):
async function stopRecording() {
  if (!AppState.audioProcessor.isRecording) return;

  // Parar gravação
  const result = AppState.audioProcessor.stopRecording();
  if (!result.success) {
    showToast('Erro ao parar gravação');
    return;
  }

  // Limpar UI
  clearInterval(AppState.recordingTimerInterval);
  clearInterval(AppState.recordingState.qualityInterval);
  AppState.recordingState.visualizer.stop();

  // Obter blob
  const audioBlob = AppState.audioProcessor.getRecordedAudioBlob();

  // Comprimir
  showToast('Comprimindo áudio...');
  const compressed = await AppState.audioProcessor.compressAudio(audioBlob);
  const finalBlob = compressed.success ? compressed.blob : audioBlob;

  // Enviar para Groq
  await sendAudioToWhisper(finalBlob);

  // Resetar UI
  DOM.btnRecordStart.disabled = false;
  DOM.btnRecordTelemed.disabled = false;
  DOM.btnRecordStop.disabled = true;
  DOM.recordingTimer.textContent = '00:00';
}
```

#### 4.2.5 Adicionar Função de Atualização de Qualidade
```javascript
function updateQualityDisplay(metrics) {
  // Criar painel de qualidade se não existir
  let qualityPanel = document.getElementById('quality-metrics-panel');
  if (!qualityPanel) {
    qualityPanel = document.createElement('div');
    qualityPanel.id = 'quality-metrics-panel';
    qualityPanel.className = 'quality-metrics-panel';
    DOM.waveformCanvas.parentElement.appendChild(qualityPanel);
  }

  // Determinar cor
  let color = '#10b981'; // green
  if (metrics.clipping) {
    color = '#ef4444'; // red
  } else if (metrics.noiseLevel > 100) {
    color = '#f59e0b'; // yellow
  }

  // Atualizar conteúdo
  qualityPanel.innerHTML = `
    <div style="color: ${color}; font-weight: bold;">
      ${metrics.quality.toUpperCase()}
    </div>
    <div style="font-size: 12px; color: #666;">
      Ruído: ${metrics.noiseLevel} | 
      Clipping: ${metrics.clipping ? 'SIM' : 'NÃO'} | 
      Pico: ${metrics.peakLevel}
    </div>
  `;
}
```

### 4.3 meetings.js

**Mudanças Principais** (similares a app.js):

#### 4.3.1 Inicialização
```javascript
// Em initMeetingModule()
MeetingState.audioProcessor = new AudioProcessor();
```

#### 4.3.2 Substituir `startMeetingRecording()`
```javascript
// Usar audioProcessor em vez de código antigo
async function startMeetingRecording(isOnline = false) {
  if (!AppState.apiKey) {
    showToast('Configure sua chave Groq em Configurações primeiro!');
    return;
  }

  const method = isOnline ? 
    MeetingState.audioProcessor.startOnlineRecording() : 
    MeetingState.audioProcessor.startPresentialRecording();
  
  const result = await method;
  if (!result.success) {
    showToast(result.message);
    return;
  }

  // Configurar visualizador
  const canvas = MeetingDOM.waveformCanvas;
  const visualizer = MeetingState.audioProcessor.setupVisualizer(canvas, result.stream);
  visualizer.start('bars');

  // Iniciar monitoramento
  const qualityMonitor = MeetingState.audioProcessor.startQualityMonitoring();
  const qualityInterval = setInterval(() => {
    const metrics = MeetingState.audioProcessor.getQualityMetrics();
    updateMeetingQualityDisplay(metrics);
  }, 500);

  // Armazenar estado
  MeetingState.recordingState = {
    visualizer,
    qualityInterval,
    qualityMonitor
  };

  // Atualizar UI
  MeetingDOM.btnRecordStart.disabled = true;
  MeetingDOM.btnRecordOnline.disabled = true;
  MeetingDOM.btnRecordStop.disabled = false;

  showToast(isOnline ? 'Gravação online iniciada' : 'Gravação presencial iniciada');
}
```

#### 4.3.3 Substituir `stopMeetingRecording()`
```javascript
async function stopMeetingRecording() {
  if (!MeetingState.audioProcessor.isRecording) return;

  const result = MeetingState.audioProcessor.stopRecording();
  if (!result.success) {
    showToast('Erro ao parar gravação');
    return;
  }

  // Limpar UI
  clearInterval(MeetingState.recordingState.qualityInterval);
  MeetingState.recordingState.visualizer.stop();

  // Obter blob
  const audioBlob = MeetingState.audioProcessor.getRecordedAudioBlob();

  // Comprimir
  const compressed = await MeetingState.audioProcessor.compressAudio(audioBlob);
  const finalBlob = compressed.success ? compressed.blob : audioBlob;

  // Enviar para Groq
  await sendMeetingAudioToWhisper(finalBlob);

  // Resetar UI
  MeetingDOM.btnRecordStart.disabled = false;
  MeetingDOM.btnRecordOnline.disabled = false;
  MeetingDOM.btnRecordStop.disabled = true;
}
```


## 5. UI/UX Design

### 5.1 Seletor de Estilo de Visualização

**Localização**: Acima do canvas de waveform durante gravação

**HTML a Adicionar** (em index.html, dentro de `capture-panel-record`):
```html
<div class="visualization-controls" id="visualizationControls" style="display: none;">
  <label>Estilo de Visualização:</label>
  <div class="button-group">
    <button id="btn-viz-bars" class="viz-btn active" data-style="bars">
      <svg><!-- ícone de barras --></svg> Barras
    </button>
    <button id="btn-viz-waveform" class="viz-btn" data-style="waveform">
      <svg><!-- ícone de onda --></svg> Waveform
    </button>
    <button id="btn-viz-circular" class="viz-btn" data-style="circular">
      <svg><!-- ícone circular --></svg> Circular
    </button>
  </div>
</div>
```

**CSS** (adicionar em styles.css):
```css
.visualization-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
}

.button-group {
  display: flex;
  gap: 8px;
}

.viz-btn {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.viz-btn.active {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}

.viz-btn:hover {
  border-color: #6366f1;
}
```

**JavaScript** (em app.js):
```javascript
function setupVisualizationControls() {
  const buttons = document.querySelectorAll('.viz-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const style = btn.getAttribute('data-style');
      
      // Atualizar visualizador
      if (AppState.recordingState?.visualizer) {
        AppState.recordingState.visualizer.style = style;
      }
      
      // Atualizar UI
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// Chamar quando iniciar gravação
// setupVisualizationControls();
```

### 5.2 Painel de Métricas de Qualidade

**Localização**: Lado direito do canvas durante gravação

**HTML a Adicionar**:
```html
<div class="quality-metrics-panel" id="qualityMetricsPanel" style="display: none;">
  <div class="metric-item">
    <span class="metric-label">Qualidade</span>
    <span class="metric-value" id="qualityValue">--</span>
  </div>
  <div class="metric-item">
    <span class="metric-label">Ruído</span>
    <span class="metric-value" id="noiseValue">--</span>
  </div>
  <div class="metric-item">
    <span class="metric-label">Clipping</span>
    <span class="metric-value" id="clippingValue">--</span>
  </div>
  <div class="metric-item">
    <span class="metric-label">Pico</span>
    <span class="metric-value" id="peakValue">--</span>
  </div>
</div>
```

**CSS**:
```css
.quality-metrics-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  margin-top: 12px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
}

.metric-value {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.metric-value.excellent {
  color: #10b981;
}

.metric-value.good {
  color: #10b981;
}

.metric-value.fair {
  color: #f59e0b;
}

.metric-value.poor {
  color: #ef4444;
}
```

**JavaScript**:
```javascript
function updateQualityDisplay(metrics) {
  const panel = document.getElementById('qualityMetricsPanel');
  if (!panel) return;

  // Atualizar valores
  document.getElementById('qualityValue').textContent = metrics.quality.toUpperCase();
  document.getElementById('qualityValue').className = `metric-value ${metrics.quality}`;
  
  document.getElementById('noiseValue').textContent = metrics.noiseLevel;
  document.getElementById('clippingValue').textContent = metrics.clipping ? 'SIM ⚠️' : 'NÃO ✓';
  document.getElementById('peakValue').textContent = metrics.peakLevel;

  // Mostrar painel
  panel.style.display = 'grid';
}
```

### 5.3 Mensagens de Erro

**Usar `showToast()` existente**:
```javascript
// Permissão negada
showToast('❌ Permissão negada. Verifique as permissões de microfone.');

// Sem dispositivo
showToast('❌ Nenhum dispositivo de áudio encontrado.');

// Arquivo muito grande
showToast('❌ Arquivo muito grande! Máximo: 25MB. Seu arquivo: 5.2MB');

// Compressão bem-sucedida
showToast('✅ Áudio comprimido: 10MB → 6MB (40% redução)');
```


## 6. Estratégia de Compatibilidade com Groq API

### 6.1 Validação de Formato

**Formatos Suportados**: WAV, WebM, MP3, M4A, MP4

**Validação em app.js**:
```javascript
function validateAudioFormat(blob) {
  const supportedTypes = [
    'audio/wav',
    'audio/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a'
  ];

  if (!supportedTypes.includes(blob.type)) {
    showToast(`Formato não suportado: ${blob.type}`);
    return false;
  }

  return true;
}
```

### 6.2 Validação de Tamanho

**Limite**: 25MB (Groq API)

**Validação**:
```javascript
function validateAudioSize(blob) {
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB
  
  if (blob.size > MAX_SIZE) {
    const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
    showToast(`❌ Arquivo muito grande! Máximo: 25MB. Seu arquivo: ${sizeMB}MB`);
    return false;
  }

  return true;
}
```

### 6.3 Fluxo de Envio para Groq

**Pseudocódigo**:
```javascript
async function sendAudioToWhisper(audioBlob) {
  // 1. Validar formato
  if (!validateAudioFormat(audioBlob)) return;

  // 2. Validar tamanho
  if (!validateAudioSize(audioBlob)) return;

  // 3. Preparar FormData
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', DOM.transcriptionLang.value);
  formData.append('response_format', 'json');

  // 4. Enviar para Groq
  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AppState.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    DOM.rawTranscript.value = data.text;
    showToast('✅ Transcrição concluída!');
  } catch (err) {
    showToast(`❌ Erro na transcrição: ${err.message}`);
  }
}
```

### 6.4 Tratamento de Erros Groq

| Código | Causa | Solução |
|--------|-------|---------|
| 400 | Formato inválido | Verificar tipo de arquivo |
| 401 | Chave inválida | Verificar chave em Configurações |
| 413 | Arquivo muito grande | Comprimir ou dividir arquivo |
| 429 | Limite de requisições | Aguardar alguns minutos |
| 500 | Erro do servidor | Tentar novamente |


## 7. Tratamento de Erros

### 7.1 Mapeamento de Erros

| Erro | Mensagem | Ação |
|------|----------|------|
| NotAllowedError | Permissão negada. Verifique as permissões de microfone. | Mostrar toast, permitir retry |
| NotFoundError | Nenhum dispositivo de áudio encontrado. | Mostrar toast, desabilitar gravação |
| NotReadableError | Não foi possível acessar o dispositivo de áudio. | Mostrar toast, permitir retry |
| Arquivo > 25MB | Arquivo muito grande! Máximo: 25MB. | Sugerir compressão |
| Compressão falha | Compressão falhou, usando original. | Log warning, usar original |
| Pré-processamento falha | Pré-processamento falhou, usando original. | Log warning, usar original |

### 7.2 Tratamento de Permissões

```javascript
async function handleRecordingError(err) {
  console.error('Erro de gravação:', err);

  if (err.name === 'NotAllowedError') {
    showToast('❌ Permissão negada. Verifique as permissões de microfone nas configurações do navegador.');
  } else if (err.name === 'NotFoundError') {
    showToast('❌ Nenhum dispositivo de áudio encontrado. Conecte um microfone.');
  } else if (err.name === 'NotReadableError') {
    showToast('❌ Não foi possível acessar o dispositivo de áudio. Tente novamente.');
  } else {
    showToast(`❌ Erro: ${err.message}`);
  }

  // Limpar estado
  AppState.audioProcessor.isRecording = false;
  DOM.btnRecordStart.disabled = false;
  DOM.btnRecordTelemed.disabled = false;
  DOM.btnRecordStop.disabled = true;
}
```

### 7.3 Limpeza de Recursos

**Garantir que recursos sejam liberados**:
```javascript
async function cleanupRecording() {
  // Parar streams
  if (AppState.audioProcessor.stream) {
    AppState.audioProcessor.stream.getTracks().forEach(track => track.stop());
  }
  if (AppState.audioProcessor.displayStream) {
    AppState.audioProcessor.displayStream.getTracks().forEach(track => track.stop());
  }

  // Fechar AudioContext
  if (AppState.audioProcessor.audioContext && 
      AppState.audioProcessor.audioContext.state !== 'closed') {
    AppState.audioProcessor.audioContext.close();
  }

  // Parar visualizador
  if (AppState.recordingState?.visualizer) {
    AppState.recordingState.visualizer.stop();
  }

  // Limpar intervals
  if (AppState.recordingState?.qualityInterval) {
    clearInterval(AppState.recordingState.qualityInterval);
  }
  if (AppState.recordingTimerInterval) {
    clearInterval(AppState.recordingTimerInterval);
  }

  // Resetar estado
  AppState.recordingState = null;
  AppState.audioProcessor.isRecording = false;
}
```

### 7.4 Fallbacks

**Compressão falha**:
```javascript
const compressed = await audioProcessor.compressAudio(audioBlob);
const finalBlob = compressed.success ? compressed.blob : audioBlob;
// Usar audioBlob original se compressão falhar
```

**Pré-processamento falha**:
```javascript
const preprocessed = await audioProcessor.preprocessAudio(audioBlob);
const finalBlob = preprocessed.success ? preprocessed.blob : audioBlob;
// Usar audioBlob original se pré-processamento falhar
```

**Áudio da tela não disponível**:
```javascript
try {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({...});
  // Usar displayStream
} catch (err) {
  console.warn('Áudio da tela não disponível, usando apenas microfone');
  // Continuar com apenas microfone
}
```


## 8. Considerações de Performance

### 8.1 Manter 60 FPS na Visualização

**Técnicas**:
1. Usar `requestAnimationFrame()` (já implementado em AudioVisualizer)
2. Limitar atualizações de qualidade a 500ms (não 100ms)
3. Usar canvas 2D em vez de WebGL (mais eficiente para barras)
4. Cachear gradientes (já feito em meetings.js)

**Monitoramento**:
```javascript
// Adicionar em DevTools para verificar FPS
let frameCount = 0;
let lastTime = performance.now();

function measureFPS() {
  frameCount++;
  const currentTime = performance.now();
  if (currentTime - lastTime >= 1000) {
    console.log(`FPS: ${frameCount}`);
    frameCount = 0;
    lastTime = currentTime;
  }
  requestAnimationFrame(measureFPS);
}
```

### 8.2 Async/Await para Compressão e Pré-processamento

**Não bloquear UI**:
```javascript
// ✅ BOM: Usar async/await
async function handleStopRecording() {
  const audioBlob = audioProcessor.getRecordedAudioBlob();
  
  // Compressão não bloqueia UI
  const compressed = await audioProcessor.compressAudio(audioBlob);
  
  // Pré-processamento não bloqueia UI
  const preprocessed = await audioProcessor.preprocessAudio(audioBlob);
}

// ❌ RUIM: Bloquear UI
function handleStopRecording() {
  const audioBlob = audioProcessor.getRecordedAudioBlob();
  
  // Isso bloquearia UI
  const compressed = audioProcessor.compressAudio(audioBlob); // sem await
}
```

### 8.3 Otimizações de Memória

**Liberar referências**:
```javascript
// Após parar gravação
AppState.audioProcessor.audioChunks = [];
AppState.audioProcessor.stream = null;
AppState.audioProcessor.displayStream = null;
AppState.audioProcessor.analyser = null;
AppState.audioProcessor.visualizer = null;
AppState.audioProcessor.qualityMonitor = null;
```

**Limitar tamanho de buffer**:
```javascript
// Em AudioProcessor.setupRecording()
this.mediaRecorder.start(250); // Coletar dados a cada 250ms
// Não usar valores muito pequenos (ex: 10ms) que causam overhead
```

### 8.4 Benchmarks Esperados

| Operação | Tempo | Notas |
|----------|-------|-------|
| Iniciar gravação | < 500ms | Incluindo permissão do usuário |
| Parar gravação | < 100ms | Apenas parar MediaRecorder |
| Comprimir 10MB | 2-3s | Depende do dispositivo |
| Pré-processar 10MB | 1-2s | Depende do dispositivo |
| Visualização | 60 FPS | Mantido com requestAnimationFrame |
| Atualizar qualidade | 500ms | Intervalo configurável |


## 9. Testing Strategy

### 9.1 Unit Tests

**Testes para AudioProcessor**:
```javascript
describe('AudioProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new AudioProcessor();
  });

  // Inicialização
  test('initAudioContext deve criar AudioContext com 48kHz', () => {
    const ctx = processor.initAudioContext();
    expect(ctx.sampleRate).toBe(48000);
  });

  // Validação
  test('validateFileSize deve rejeitar arquivo > 25MB', () => {
    const blob = new Blob([new ArrayBuffer(26 * 1024 * 1024)]);
    const result = processor.validateFileSize(blob, 25);
    expect(result.valid).toBe(false);
  });

  // Compressão
  test('compressAudio deve reduzir tamanho em 35-40%', async () => {
    const blob = new Blob([new ArrayBuffer(10 * 1024 * 1024)]);
    const result = await processor.compressAudio(blob);
    expect(result.success).toBe(true);
    expect(result.compressionRatio).toMatch(/3[5-9]%|4[0]%/);
  });

  // Pré-processamento
  test('preprocessAudio deve retornar blob válido', async () => {
    const blob = new Blob([new ArrayBuffer(5 * 1024 * 1024)]);
    const result = await processor.preprocessAudio(blob);
    expect(result.success).toBe(true);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  // Tratamento de erros
  test('getErrorMessage deve retornar mensagem amigável', () => {
    const err = new Error();
    err.name = 'NotAllowedError';
    const msg = processor.getErrorMessage(err);
    expect(msg).toContain('Permissão');
  });
});

describe('AudioVisualizer', () => {
  let visualizer, canvas, analyser;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    analyser = {
      frequencyBinCount: 128,
      getByteFrequencyData: jest.fn()
    };
    visualizer = new AudioVisualizer(canvas, analyser);
  });

  test('start deve iniciar animação', () => {
    visualizer.start('bars');
    expect(visualizer.isRunning).toBe(true);
  });

  test('stop deve parar animação', () => {
    visualizer.start('bars');
    visualizer.stop();
    expect(visualizer.isRunning).toBe(false);
  });

  test('drawBars deve desenhar no canvas', () => {
    const ctx = canvas.getContext('2d');
    jest.spyOn(ctx, 'fillRect');
    visualizer.drawBars();
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

describe('AudioQualityMonitor', () => {
  let monitor, analyser;

  beforeEach(() => {
    analyser = {
      frequencyBinCount: 128,
      getByteFrequencyData: jest.fn()
    };
    monitor = new AudioQualityMonitor(analyser);
  });

  test('update deve retornar métricas válidas', () => {
    const metrics = monitor.update();
    expect(metrics).toHaveProperty('noiseLevel');
    expect(metrics).toHaveProperty('clipping');
    expect(metrics).toHaveProperty('quality');
  });

  test('detectClipping deve retornar true quando pico > 240', () => {
    const dataArray = new Uint8Array(128);
    dataArray[0] = 250;
    const result = monitor.detectClipping(dataArray);
    expect(result).toBe(true);
  });

  test('determineQuality deve retornar "poor" quando clipping', () => {
    monitor.metrics.clipping = true;
    const quality = monitor.determineQuality();
    expect(quality).toBe('poor');
  });
});
```

### 9.2 Integration Tests

**Testes de integração com app.js**:
```javascript
describe('app.js Integration', () => {
  test('startRecording deve iniciar AudioProcessor', async () => {
    const result = await startRecording();
    expect(AppState.audioProcessor.isRecording).toBe(true);
  });

  test('stopRecording deve comprimir e enviar para Groq', async () => {
    await startRecording();
    const sendSpy = jest.spyOn(window, 'sendAudioToWhisper');
    await stopRecording();
    expect(sendSpy).toHaveBeenCalled();
  });

  test('updateQualityDisplay deve atualizar painel', () => {
    const metrics = {
      quality: 'good',
      noiseLevel: 50,
      clipping: false,
      peakLevel: 100
    };
    updateQualityDisplay(metrics);
    const panel = document.getElementById('quality-metrics-panel');
    expect(panel).toBeInTheDocument();
  });
});
```

### 9.3 E2E Tests (Cypress)

```javascript
describe('Audio Recording E2E', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('deve gravar áudio presencial e transcrever', () => {
    // Clicar em "Presencial"
    cy.get('#btn-record-start').click();
    
    // Verificar que gravação iniciou
    cy.get('#recordingTimer').should('not.have.text', '00:00');
    
    // Aguardar 3 segundos
    cy.wait(3000);
    
    // Parar gravação
    cy.get('#btn-record-stop').click();
    
    // Verificar que transcrição iniciou
    cy.get('#transcription-loader').should('be.visible');
    
    // Aguardar transcrição
    cy.get('#rawTranscript', { timeout: 10000 }).should('not.be.empty');
  });

  it('deve mudar estilo de visualização', () => {
    cy.get('#btn-record-start').click();
    
    // Mudar para waveform
    cy.get('#btn-viz-waveform').click();
    cy.get('#btn-viz-waveform').should('have.class', 'active');
    
    // Mudar para circular
    cy.get('#btn-viz-circular').click();
    cy.get('#btn-viz-circular').should('have.class', 'active');
  });

  it('deve exibir métricas de qualidade', () => {
    cy.get('#btn-record-start').click();
    
    // Verificar que painel de qualidade aparece
    cy.get('#qualityMetricsPanel', { timeout: 2000 }).should('be.visible');
    
    // Verificar que métricas são atualizadas
    cy.get('#qualityValue').should('not.be.empty');
    cy.get('#noiseValue').should('not.be.empty');
  });
});
```

### 9.4 Property-Based Tests

**Usando fast-check (JavaScript)**:
```javascript
import fc from 'fast-check';

describe('AudioProcessor Properties', () => {
  // Property 1: Compressão reduz tamanho
  test('compressAudio deve reduzir tamanho', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1000, maxLength: 10000000 }),
        async (audioData) => {
          const blob = new Blob([audioData]);
          const result = await audioProcessor.compressAudio(blob);
          
          if (result.success) {
            return result.compressedSize < result.originalSize;
          }
          return true; // Fallback é aceitável
        }
      )
    );
  });

  // Property 2: Normalização não excede target
  test('normalizeAudio deve respeitar target level', () => {
    fc.assert(
      fc.property(
        fc.float32Array({ minLength: 100, maxLength: 10000 }),
        (audioData) => {
          const normalized = audioProcessor.normalizeAudio(audioData, 0.95);
          const max = Math.max(...normalized);
          return max <= 0.95;
        }
      )
    );
  });

  // Property 3: Métricas de qualidade em range válido
  test('getQualityMetrics deve retornar valores válidos', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 128, maxLength: 128 }),
        (frequencyData) => {
          const metrics = audioQualityMonitor.update();
          
          return (
            metrics.noiseLevel >= 0 && metrics.noiseLevel <= 255 &&
            metrics.peakLevel >= 0 && metrics.peakLevel <= 255 &&
            ['excellent', 'good', 'fair', 'poor'].includes(metrics.quality) &&
            typeof metrics.clipping === 'boolean'
          );
        }
      )
    );
  });

  // Property 4: Round-trip WAV
  test('audioBufferToWav deve ser decodificável', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float32Array({ minLength: 48000, maxLength: 480000 }),
        async (audioData) => {
          const audioContext = new AudioContext();
          const buffer = audioContext.createBuffer(1, audioData.length, 48000);
          buffer.getChannelData(0).set(audioData);
          
          const wavBlob = audioProcessor.audioBufferToWav(buffer);
          
          // Verificar que é um Blob válido
          return wavBlob instanceof Blob && wavBlob.size > 44; // WAV header é 44 bytes
        }
      )
    );
  });
});
```


## 10. Error Handling

### 10.1 Tratamento de Erros de Gravação

```javascript
async function startRecording() {
  try {
    const result = await AppState.audioProcessor.startPresentialRecording();
    
    if (!result.success) {
      handleRecordingError(new Error(result.message));
      return;
    }

    // Sucesso
    setupRecordingUI();
  } catch (err) {
    handleRecordingError(err);
  }
}

function handleRecordingError(err) {
  console.error('Erro de gravação:', err);

  let userMessage = 'Erro ao iniciar gravação';

  if (err.name === 'NotAllowedError') {
    userMessage = '❌ Permissão negada. Verifique as permissões de microfone nas configurações do navegador.';
  } else if (err.name === 'NotFoundError') {
    userMessage = '❌ Nenhum dispositivo de áudio encontrado. Conecte um microfone.';
  } else if (err.name === 'NotReadableError') {
    userMessage = '❌ Não foi possível acessar o dispositivo de áudio. Tente novamente.';
  } else if (err.name === 'SecurityError') {
    userMessage = '❌ Erro de segurança. Verifique se está usando HTTPS.';
  } else if (err.message) {
    userMessage = `❌ ${err.message}`;
  }

  showToast(userMessage);
  cleanupRecording();
}
```

### 10.2 Tratamento de Erros de Compressão

```javascript
async function compressAudioSafely(audioBlob) {
  try {
    const result = await AppState.audioProcessor.compressAudio(audioBlob);
    
    if (result.success) {
      console.log(`Compressão bem-sucedida: ${result.compressionRatio}`);
      return result.blob;
    } else {
      console.warn('Compressão falhou:', result.error);
      showToast('⚠️ Compressão falhou, usando áudio original');
      return audioBlob; // Fallback
    }
  } catch (err) {
    console.error('Erro ao comprimir:', err);
    showToast('⚠️ Erro na compressão, usando áudio original');
    return audioBlob; // Fallback
  }
}
```

### 10.3 Tratamento de Erros de Pré-processamento

```javascript
async function preprocessAudioSafely(audioBlob) {
  try {
    const result = await AppState.audioProcessor.preprocessAudio(audioBlob);
    
    if (result.success) {
      console.log('Pré-processamento bem-sucedido');
      return result.blob;
    } else {
      console.warn('Pré-processamento falhou:', result.error);
      showToast('⚠️ Pré-processamento falhou, usando áudio original');
      return audioBlob; // Fallback
    }
  } catch (err) {
    console.error('Erro ao pré-processar:', err);
    showToast('⚠️ Erro no pré-processamento, usando áudio original');
    return audioBlob; // Fallback
  }
}
```

### 10.4 Tratamento de Erros de Groq API

```javascript
async function sendAudioToWhisper(audioBlob) {
  try {
    // Validações
    if (!validateAudioFormat(audioBlob)) return;
    if (!validateAudioSize(audioBlob)) return;

    // Preparar requisição
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-large-v3');
    formData.append('language', DOM.transcriptionLang.value);
    formData.append('response_format', 'json');

    // Enviar
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AppState.apiKey}`
      },
      body: formData
    });

    // Tratar erros HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      handleGroqError(response.status, errorData);
      return;
    }

    // Sucesso
    const data = await response.json();
    DOM.rawTranscript.value = data.text || '';
    showToast('✅ Transcrição concluída!');
  } catch (err) {
    console.error('Erro ao enviar áudio:', err);
    showToast(`❌ Erro na transcrição: ${err.message}`);
  }
}

function handleGroqError(status, errorData) {
  const errorMessage = errorData?.error?.message || '';

  switch (status) {
    case 400:
      showToast('❌ Erro 400: Formato de áudio inválido. Tente outro arquivo.');
      break;
    case 401:
      showToast('❌ Erro 401: Chave Groq inválida. Verifique em Configurações.');
      break;
    case 413:
      showToast('❌ Erro 413: Arquivo muito grande! Máximo 25MB. Tente comprimir.');
      break;
    case 429:
      showToast('❌ Erro 429: Limite de requisições atingido. Aguarde alguns minutos.');
      break;
    case 500:
      showToast('❌ Erro 500: Servidor Groq indisponível. Tente novamente.');
      break;
    default:
      showToast(`❌ Erro ${status}: ${errorMessage || 'Erro desconhecido'}`);
  }
}
```


## 11. Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Compression Reduces File Size

**For any** valid audio blob, compressing it SHALL result in a file size reduction of at least 35% while maintaining audio quality sufficient for transcription.

**Validates: Requirements 6**

### Property 2: Preprocessed Audio Maintains Duration

**For any** audio blob, preprocessing (normalization, silence trimming, filtering) SHALL not change the audio duration by more than 100ms.

**Validates: Requirements 7**

### Property 3: Quality Metrics Within Valid Range

**For any** audio stream being recorded, the quality metrics returned by AudioQualityMonitor SHALL always have:
- noiseLevel: 0-255
- peakLevel: 0-255
- quality: one of {excellent, good, fair, poor}
- clipping: boolean

**Validates: Requirements 11**

### Property 4: Normalized Audio Respects Target Level

**For any** audio data, normalizing with target level 0.95 SHALL result in maximum amplitude ≤ 0.95.

**Validates: Requirements 7**

### Property 5: WAV Conversion Preserves Audio Characteristics

**For any** AudioBuffer, converting to WAV and decoding back SHALL produce audio with similar frequency characteristics (within 5% tolerance).

**Validates: Requirements 12**

### Property 6: Recording Blob Size is Positive

**For any** completed recording, the returned audio blob SHALL have size > 0 bytes.

**Validates: Requirements 1, 2**

### Property 7: Visualization Styles Render Without Errors

**For any** valid canvas element and audio stream, switching between visualization styles (bars, waveform, circular) SHALL not cause errors or memory leaks.

**Validates: Requirements 4**

### Property 8: Groq API Compatibility

**For any** audio blob processed by AudioProcessor, the output blob SHALL be compatible with Groq API (correct format, size ≤ 25MB, valid MIME type).

**Validates: Requirements 8**

### Property 9: Error Handling is Idempotent

**For any** error condition, calling error handlers multiple times SHALL not cause cascading errors or resource leaks.

**Validates: Requirements 10**

### Property 10: Quality Metrics Reflect Audio State

**For any** audio stream, when clipping is detected (peak > 240), the quality metric SHALL be "poor".

**Validates: Requirements 11**


## 12. Implementation Checklist

### Phase 1: Setup (1-2 horas)
- [ ] Adicionar `<script src="audio-processor.js"></script>` em index.html
- [ ] Criar instância global `AppState.audioProcessor = new AudioProcessor()`
- [ ] Testar que classes estão disponíveis no console

### Phase 2: app.js - Gravação Presencial (2-3 horas)
- [ ] Substituir `startRecording()` para usar `audioProcessor.startPresentialRecording()`
- [ ] Substituir `stopRecording()` para usar `audioProcessor.stopRecording()`
- [ ] Implementar `setupVisualizer()` com canvas existente
- [ ] Implementar `startQualityMonitoring()` com atualização a cada 500ms
- [ ] Adicionar compressão antes de enviar para Groq
- [ ] Testar gravação presencial completa

### Phase 3: app.js - Gravação Telemedicina (1-2 horas)
- [ ] Substituir `startTelemedicineRecording()` para usar `audioProcessor.startOnlineRecording()`
- [ ] Testar combinação de áudio (mic + tela)
- [ ] Testar fallback para mic-only se tela não disponível
- [ ] Testar parada automática quando tela é compartilhada

### Phase 4: meetings.js - Integração (2-3 horas)
- [ ] Criar instância `MeetingState.audioProcessor = new AudioProcessor()`
- [ ] Substituir `startMeetingRecording()` para usar audioProcessor
- [ ] Substituir `stopMeetingRecording()` para usar audioProcessor
- [ ] Implementar visualizador e monitoramento de qualidade
- [ ] Testar gravação de reuniões presencial e online

### Phase 5: UI/UX - Seletor de Visualização (1 hora)
- [ ] Adicionar HTML para seletor de estilo (barras, waveform, circular)
- [ ] Adicionar CSS para botões de seleção
- [ ] Implementar JavaScript para mudar estilo em tempo real
- [ ] Testar transição suave entre estilos

### Phase 6: UI/UX - Painel de Qualidade (1 hora)
- [ ] Adicionar HTML para painel de métricas
- [ ] Adicionar CSS com cores (verde, amarelo, vermelho)
- [ ] Implementar atualização de métricas a cada 500ms
- [ ] Testar exibição correta de valores

### Phase 7: Tratamento de Erros (1-2 horas)
- [ ] Implementar tratamento de NotAllowedError
- [ ] Implementar tratamento de NotFoundError
- [ ] Implementar tratamento de NotReadableError
- [ ] Implementar tratamento de arquivo > 25MB
- [ ] Implementar fallbacks para compressão/pré-processamento
- [ ] Testar todos os cenários de erro

### Phase 8: Testes (2-3 horas)
- [ ] Escrever unit tests para AudioProcessor
- [ ] Escrever unit tests para AudioVisualizer
- [ ] Escrever unit tests para AudioQualityMonitor
- [ ] Escrever integration tests para app.js
- [ ] Escrever E2E tests com Cypress
- [ ] Executar todos os testes

### Phase 9: Otimização e Polimento (1-2 horas)
- [ ] Verificar FPS da visualização (deve ser 60)
- [ ] Verificar que compressão não bloqueia UI
- [ ] Verificar limpeza de recursos (sem memory leaks)
- [ ] Testar em diferentes navegadores (Chrome, Firefox, Safari, Edge)
- [ ] Testar em diferentes dispositivos (desktop, tablet, mobile)

### Phase 10: Documentação (1 hora)
- [ ] Atualizar GUIA-AUDIO-PROCESSOR.md com exemplos de integração
- [ ] Adicionar comentários no código
- [ ] Criar documento de troubleshooting
- [ ] Documentar mudanças em CHANGELOG

**Tempo Total Estimado**: 14-20 horas


## 13. Resumo Executivo

### Objetivo
Integrar o módulo `audio-processor.js` no E-Transcriber para melhorar qualidade de captura de áudio, reduzir tamanho de arquivo em 40% e fornecer visualização e monitoramento em tempo real.

### Benefícios
1. **Qualidade Melhorada**: Captura em 48kHz com pré-processamento avançado
2. **Redução de Tamanho**: Compressão inteligente reduz arquivo em 35-40%
3. **Visualização em Tempo Real**: 3 estilos (barras, waveform, circular)
4. **Monitoramento de Qualidade**: Métricas em tempo real (ruído, clipping, qualidade)
5. **Compatibilidade Total**: Mantém compatibilidade com Groq API
6. **Tratamento Robusto de Erros**: Fallbacks e mensagens claras

### Arquitetura
- **AudioProcessor**: Gerencia ciclo completo de captura e processamento
- **AudioVisualizer**: Renderiza visualização em tempo real
- **AudioQualityMonitor**: Monitora qualidade de áudio

### Integração
- **app.js**: Substituir código de gravação presencial e telemedicina
- **meetings.js**: Substituir código de gravação de reuniões
- **index.html**: Adicionar script tag para audio-processor.js

### Fluxo Principal
```
Usuário clica "Gravar"
    ↓
AudioProcessor.startRecording()
    ↓
Visualizador + Monitoramento de Qualidade
    ↓
Usuário clica "Parar"
    ↓
AudioProcessor.stopRecording()
    ↓
Comprimir áudio (-40%)
    ↓
Enviar para Groq API
    ↓
Exibir transcrição
```

### Métricas de Sucesso
- ✅ Áudio capturado em 48kHz
- ✅ Arquivo reduzido em 35-40%
- ✅ Visualização mantém 60 FPS
- ✅ Qualidade de transcrição igual ou melhor
- ✅ Todos os erros tratados graciosamente
- ✅ Funciona em todos os navegadores modernos

### Próximos Passos
1. Revisar design com equipe
2. Implementar Phase 1-3 (setup + app.js)
3. Testar gravação presencial e telemedicina
4. Implementar Phase 4-6 (meetings.js + UI)
5. Implementar Phase 7-10 (erros, testes, otimização)

