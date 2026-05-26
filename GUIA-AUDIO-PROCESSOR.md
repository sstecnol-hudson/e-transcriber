# 🎙️ GUIA DE USO - AUDIO PROCESSOR

**Arquivo:** `audio-processor.js`  
**Versão:** 1.0  
**Data:** 25/05/2026

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Instalação](#instalação)
3. [Uso Básico](#uso-básico)
4. [Exemplos Práticos](#exemplos-práticos)
5. [API Completa](#api-completa)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 VISÃO GERAL

O `AudioProcessor` é um módulo completo para captura, processamento e análise de áudio de alta qualidade. Inclui:

- ✅ Captura de áudio presencial e online
- ✅ Compressão inteligente
- ✅ Pré-processamento avançado
- ✅ Visualização em tempo real
- ✅ Monitoramento de qualidade
- ✅ Conversão para WAV

---

## 📦 INSTALAÇÃO

### 1. Adicionar Script ao HTML

```html
<!-- No final do <body> -->
<script src="audio-processor.js"></script>
```

### 2. Inicializar

```javascript
// Criar instância
const audioProcessor = new AudioProcessor();

// Pronto para usar!
```

---

## 🚀 USO BÁSICO

### Gravação Presencial

```javascript
// Iniciar gravação
const result = await audioProcessor.startPresentialRecording();

if (result.success) {
  console.log('Gravação iniciada');
  
  // ... usuário fala ...
  
  // Parar gravação
  const stopped = audioProcessor.stopRecording();
  console.log('Duração:', stopped.duration, 'ms');
  
  // Obter blob de áudio
  const audioBlob = audioProcessor.getRecordedAudioBlob();
  console.log('Tamanho:', audioBlob.size, 'bytes');
} else {
  console.error('Erro:', result.message);
}
```

### Gravação Online

```javascript
// Iniciar gravação com tela
const result = await audioProcessor.startOnlineRecording();

if (result.success) {
  console.log('Gravação online iniciada');
  
  // ... usuário compartilha tela e fala ...
  
  // Parar gravação
  audioProcessor.stopRecording();
  
  // Obter áudio
  const audioBlob = audioProcessor.getRecordedAudioBlob();
}
```

---

## 💡 EXEMPLOS PRÁTICOS

### Exemplo 1: Gravação com Visualização

```javascript
const audioProcessor = new AudioProcessor();

// Iniciar gravação
await audioProcessor.startPresentialRecording();

// Configurar visualizador
const canvas = document.getElementById('waveform');
const visualizer = audioProcessor.setupVisualizer(canvas, audioProcessor.stream);

// Iniciar monitoramento de qualidade
const qualityMonitor = audioProcessor.startQualityMonitoring();

// Atualizar qualidade a cada 500ms
const qualityInterval = setInterval(() => {
  const metrics = audioProcessor.getQualityMetrics();
  console.log('Qualidade:', metrics.quality);
  console.log('Nível de ruído:', metrics.noiseLevel);
  console.log('Clipping:', metrics.clipping);
}, 500);

// Parar gravação
setTimeout(() => {
  clearInterval(qualityInterval);
  audioProcessor.stopRecording();
  audioProcessor.stopVisualizer();
  
  const audioBlob = audioProcessor.getRecordedAudioBlob();
  console.log('Áudio gravado:', audioBlob);
}, 10000); // 10 segundos
```

### Exemplo 2: Compressão de Áudio

```javascript
const audioProcessor = new AudioProcessor();

// Obter arquivo de áudio
const audioFile = document.getElementById('audioInput').files[0];

// Comprimir
const result = await audioProcessor.compressAudio(audioFile);

if (result.success) {
  console.log('Compressão bem-sucedida!');
  console.log('Tamanho original:', result.originalSize, 'bytes');
  console.log('Tamanho comprimido:', result.compressedSize, 'bytes');
  console.log('Taxa de compressão:', result.compressionRatio);
  
  // Usar blob comprimido
  const compressedBlob = result.blob;
} else {
  console.error('Erro:', result.error);
}
```

### Exemplo 3: Pré-processamento Completo

```javascript
const audioProcessor = new AudioProcessor();

// Obter arquivo
const audioFile = document.getElementById('audioInput').files[0];

// Pré-processar
const result = await audioProcessor.preprocessAudio(audioFile);

if (result.success) {
  console.log('Pré-processamento concluído!');
  console.log('Tamanho original:', result.originalSize);
  console.log('Tamanho processado:', result.processedSize);
  
  // Enviar para transcrição
  const processedBlob = result.blob;
  await sendToGroqAPI(processedBlob);
} else {
  console.error('Erro:', result.error);
}
```

### Exemplo 4: Validação e Informações

```javascript
const audioProcessor = new AudioProcessor();

// Obter arquivo
const audioFile = document.getElementById('audioInput').files[0];

// Validar tamanho
const validation = audioProcessor.validateFileSize(audioFile, 25); // 25MB máximo

if (!validation.valid) {
  console.error(validation.message);
  return;
}

// Obter informações
const info = audioProcessor.getFileInfo(audioFile);
console.log('Informações do arquivo:');
console.log('- Tamanho:', info.sizeFormatted);
console.log('- Tipo:', info.type);
console.log('- Duração:', info.duration);
```

### Exemplo 5: Visualizadores Diferentes

```javascript
const audioProcessor = new AudioProcessor();

// Iniciar gravação
await audioProcessor.startPresentialRecording();

// Configurar visualizador
const canvas = document.getElementById('waveform');
const visualizer = audioProcessor.setupVisualizer(canvas, audioProcessor.stream);

// Mudar estilo de visualização
document.getElementById('btnBars').onclick = () => {
  visualizer.stop();
  visualizer.style = 'bars';
  visualizer.start();
};

document.getElementById('btnWaveform').onclick = () => {
  visualizer.stop();
  visualizer.style = 'waveform';
  visualizer.start();
};

document.getElementById('btnCircular').onclick = () => {
  visualizer.stop();
  visualizer.style = 'circular';
  visualizer.start();
};
```

---

## 📚 API COMPLETA

### AudioProcessor

#### Métodos de Inicialização

```javascript
// Inicializar AudioContext
audioProcessor.initAudioContext()
// Retorna: AudioContext

// Obter configurações de áudio
audioProcessor.getAudioConstraints(mode)
// Parâmetros: mode = 'presencial' | 'online'
// Retorna: { audio: {...} }
```

#### Métodos de Gravação

```javascript
// Iniciar gravação presencial
await audioProcessor.startPresentialRecording()
// Retorna: { success, message, stream }

// Iniciar gravação online
await audioProcessor.startOnlineRecording()
// Retorna: { success, message, stream }

// Parar gravação
audioProcessor.stopRecording()
// Retorna: { success, duration, chunks }

// Obter blob de áudio
audioProcessor.getRecordedAudioBlob()
// Retorna: Blob
```

#### Métodos de Processamento

```javascript
// Comprimir áudio
await audioProcessor.compressAudio(blob)
// Retorna: { success, blob, originalSize, compressedSize, compressionRatio }

// Pré-processar áudio
await audioProcessor.preprocessAudio(blob)
// Retorna: { success, blob, originalSize, processedSize }

// Normalizar volume
audioProcessor.normalizeAudio(audioData, targetLevel)
// Retorna: Float32Array

// Remover silêncio
audioProcessor.trimSilence(audioData, threshold)
// Retorna: Float32Array

// Aplicar filtro passa-alta
await audioProcessor.applyHighPassFilter(audioData, audioContext)
// Retorna: AudioBuffer

// Aplicar compressão dinâmica
await audioProcessor.applyDynamicsCompression(audioData, audioContext)
// Retorna: AudioBuffer

// Converter para WAV
audioProcessor.audioBufferToWav(audioBuffer)
// Retorna: Blob
```

#### Métodos de Visualização

```javascript
// Configurar visualizador
audioProcessor.setupVisualizer(canvasElement, stream)
// Retorna: AudioVisualizer

// Parar visualizador
audioProcessor.stopVisualizer()
```

#### Métodos de Qualidade

```javascript
// Iniciar monitoramento
audioProcessor.startQualityMonitoring()
// Retorna: AudioQualityMonitor

// Obter métricas
audioProcessor.getQualityMetrics()
// Retorna: { noiseLevel, clipping, frequency, quality, peakLevel }
```

#### Métodos Utilitários

```javascript
// Validar tamanho
audioProcessor.validateFileSize(blob, maxSizeMB)
// Retorna: { valid, message }

// Obter informações
audioProcessor.getFileInfo(blob)
// Retorna: { size, sizeFormatted, type, duration }

// Obter mensagem de erro
audioProcessor.getErrorMessage(err)
// Retorna: string
```

---

### AudioVisualizer

```javascript
// Iniciar visualização
visualizer.start(style)
// Parâmetros: style = 'bars' | 'waveform' | 'circular'

// Parar visualização
visualizer.stop()

// Limpar canvas
visualizer.clearCanvas()

// Mudar estilo
visualizer.style = 'bars'
```

---

### AudioQualityMonitor

```javascript
// Atualizar métricas
monitor.update()
// Retorna: { noiseLevel, clipping, frequency, quality, peakLevel }

// Obter descrição
monitor.getQualityDescription()
// Retorna: string descritivo
```

---

## 🔧 TROUBLESHOOTING

### Erro: "Permissão negada"

**Problema:** Usuário não permitiu acesso ao microfone

**Solução:**
```javascript
try {
  await audioProcessor.startPresentialRecording();
} catch (err) {
  if (err.name === 'NotAllowedError') {
    alert('Por favor, permita acesso ao microfone nas configurações do navegador');
  }
}
```

### Erro: "Nenhum dispositivo de áudio encontrado"

**Problema:** Computador não tem microfone

**Solução:**
```javascript
try {
  await audioProcessor.startPresentialRecording();
} catch (err) {
  if (err.name === 'NotFoundError') {
    alert('Nenhum dispositivo de áudio encontrado. Conecte um microfone.');
  }
}
```

### Áudio com Ruído Alto

**Problema:** Gravação com muito ruído de fundo

**Solução:**
```javascript
// Usar pré-processamento
const result = await audioProcessor.preprocessAudio(audioBlob);
if (result.success) {
  // Usar blob processado
  const cleanAudio = result.blob;
}
```

### Arquivo Muito Grande

**Problema:** Arquivo de áudio excede 25MB

**Solução:**
```javascript
// Comprimir antes de enviar
const result = await audioProcessor.compressAudio(audioBlob);
if (result.success) {
  console.log('Redução:', result.compressionRatio);
  // Usar blob comprimido
}
```

### Visualizador Não Aparece

**Problema:** Canvas não mostra visualização

**Solução:**
```javascript
// Verificar se canvas existe
const canvas = document.getElementById('waveform');
if (!canvas) {
  console.error('Canvas não encontrado');
  return;
}

// Verificar se stream está ativo
if (!audioProcessor.stream) {
  console.error('Stream não está ativo');
  return;
}

// Configurar visualizador
const visualizer = audioProcessor.setupVisualizer(canvas, audioProcessor.stream);
visualizer.start('bars');
```

---

## 📊 COMPARAÇÃO: ANTES vs DEPOIS

### Antes (Sem AudioProcessor)
- ❌ Captura básica
- ❌ Sem compressão
- ❌ Sem pré-processamento
- ❌ Sem visualização
- ❌ Sem monitoramento de qualidade

### Depois (Com AudioProcessor)
- ✅ Captura HQ (48kHz)
- ✅ Compressão inteligente (-40%)
- ✅ Pré-processamento completo
- ✅ Visualização em tempo real
- ✅ Monitoramento de qualidade
- ✅ Conversão para WAV
- ✅ Tratamento de erros robusto

---

## 🎯 PRÓXIMOS PASSOS

1. **Integrar no app.js**
   - Substituir código de gravação antigo
   - Usar novo AudioProcessor

2. **Integrar no meetings.js**
   - Usar novo AudioProcessor
   - Melhorar qualidade de reuniões

3. **Atualizar UI**
   - Adicionar seletor de visualizador
   - Mostrar métricas de qualidade
   - Indicador de compressão

4. **Testar**
   - Testar em diferentes navegadores
   - Testar com diferentes microfones
   - Testar qualidade de transcrição

---

## 📞 SUPORTE

Para dúvidas ou problemas:
- Consulte este guia
- Verifique os exemplos práticos
- Abra uma issue no GitHub

---

**Documento Concluído:** 25/05/2026  
**Status:** ✅ Pronto para Integração
