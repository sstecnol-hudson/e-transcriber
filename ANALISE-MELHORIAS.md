# 🎙️ Guia de Melhoria de Captação de Som — E-Transcriber

> Diagnóstico técnico e recomendações práticas para maximizar a qualidade do áudio transcrito.

---

## 1. O que já está implementado ✅

O `audio-processor.js` já conta com uma base sólida:

| Recurso | Status |
|---|---|
| Sample rate 48kHz na captura | ✅ |
| Redução para 16kHz antes de enviar à API | ✅ |
| `echoCancellation` ativado | ✅ |
| `noiseSuppression` ativado | ✅ |
| `autoGainControl` ativado | ✅ |
| Compressor dinâmico (DynamicsCompressor) | ✅ |
| Filtro passa-alta 80Hz | ✅ |
| Normalização de volume | ✅ |
| Remoção de silêncio nas pontas (trimSilence) | ✅ |
| Gravação em `audio/webm;codecs=opus` (128kbps) | ✅ |
| Monitor de qualidade (clipping, ruído, pico) | ✅ |

---

## 2. Oportunidades de Melhoria no Código 🔧

### 2.1 Pipeline de processamento não está sendo chamado

**Problema:** A função `preprocessAudio()` existe no `audio-processor.js` mas **não é chamada** em lugar nenhum do fluxo de transcrição. O áudio é enviado direto para a API Groq sem passar pelos filtros.

**Solução:** Integrar o pré-processamento no fluxo de transcrição em `app.js`:

```javascript
// Em app.js, antes de enviar para a API Whisper:
async function transcribeAudio(audioBlob) {
  showLoadingState('Pré-processando áudio...');
  
  // Aplicar filtros de qualidade
  const preprocessed = await audioProcessor.preprocessAudio(audioBlob);
  const blobParaEnviar = preprocessed.success ? preprocessed.blob : audioBlob;
  
  showLoadingState('Enviando para transcrição...');
  // ... resto do código de transcrição
}
```

---

### 2.2 Constraints por modo (presencial vs online) iguais

**Problema:** `getAudioConstraints()` ignora o parâmetro `mode` — presencial e online recebem as mesmas configurações.

**Melhoria sugerida:**

```javascript
getAudioConstraints(mode = 'presencial') {
  const base = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: { ideal: 48000 },
    channelCount: 1,
  };

  if (mode === 'online') {
    // Online: cancelamento de eco mais agressivo (para voz via alto-falante)
    return { audio: { ...base, echoCancellation: { exact: true } } };
  }

  if (mode === 'presencial') {
    // Presencial: priorizar qualidade de captação (sala)
    return { audio: { ...base, latency: { ideal: 0.01 } } };
  }

  return { audio: base };
}
```

---

### 2.3 Threshold de silêncio muito baixo

**Problema:** `trimSilence(audioData, threshold = 0.01)` usa um threshold fixo muito baixo, o que pode manter ruído de fundo na gravação.

**Melhoria:** Threshold adaptativo baseado no nível de ruído do início da gravação:

```javascript
trimSilenceAdaptive(audioData) {
  // Estimar ruído de fundo nos primeiros 500ms
  const noiseFloor = this.estimateNoiseFloor(audioData.slice(0, 8000));
  const threshold = Math.max(0.01, noiseFloor * 3);
  return this.trimSilence(audioData, threshold);
}

estimateNoiseFloor(sample) {
  const sum = sample.reduce((acc, val) => acc + Math.abs(val), 0);
  return sum / sample.length;
}
```

---

### 2.4 Compressor com parâmetros muito agressivos

**Problema atual:**
```javascript
compressor.threshold.value = -50;  // Muito baixo: comprime quase tudo
compressor.ratio.value = 12;       // Ratio muito alto: distorce fala natural
```

**Parâmetros otimizados para voz humana:**
```javascript
compressor.threshold.value = -24;  // Começa a comprimir em -24dB
compressor.knee.value = 30;        // Transição suave
compressor.ratio.value = 4;        // Ratio natural para voz (3:1 a 6:1)
compressor.attack.value = 0.003;   // Rápido (mantém)
compressor.release.value = 0.25;   // Mantém natural
```

---

### 2.5 AudioContext fechado antes do pré-processamento

**Problema:** `stopRecording()` chama `audioContext.close()` imediatamente. Se `compressAudio()` ou `preprocessAudio()` for chamado depois (o que é o fluxo esperado), o contexto estará fechado.

**Solução:** Não fechar o AudioContext dentro de `stopRecording()`:

```javascript
stopRecording() {
  // ... parar mediaRecorder e streams ...
  
  // REMOVER: não fechar o audioContext aqui
  // O contexto deve ser fechado APÓS o processamento do blob
  
  return { success: true, duration: this.recordingDuration, chunks: this.audioChunks };
}

// Chamar cleanup() manualmente após o processamento:
async cleanup() {
  if (this.audioContext && this.audioContext.state !== 'closed') {
    await this.audioContext.close();
    this.audioContext = null;
  }
}
```

---

## 3. Melhorias de Hardware 🎤

### Para consultas presenciais (médico/paciente na mesma sala)

| Situação | Recomendação | Faixa de preço |
|---|---|---|
| Básico | Microfone de lapela (lavalier) USB | R$ 50–150 |
| Intermediário | Microfone de mesa cardioide (ex: Blue Snowball) | R$ 300–600 |
| Profissional | Microfone condensador XLR + interface (ex: Rode NT1) | R$ 800+ |

**Dica:** Microfone **cardioide** ou **omnidirecional de mesa** com posicionamento central entre médico e paciente funciona muito bem.

---

### Para reuniões online (captura de tela + microfone)

| Situação | Recomendação |
|---|---|
| Headset com microfone boom | Melhor opção: posiciona microfone próximo à boca |
| Fone de ouvido com cabo (não bluetooth) | Reduz latência e interferência |
| Microfone USB dedicado | Superior a microfones embutidos de notebook |

**Evitar:**
- ❌ Microfone embutido do notebook (capta ventilador, teclado, eco de sala)
- ❌ Bluetooth com A2DP ativo (qualidade cai drasticamente durante gravação)

---

## 4. Melhorias de Ambiente 🏠

### Redução de ruído na sala

| Problema | Solução |
|---|---|
| Eco e reverberação | Colocar tapetes, cortinas, estantes com livros |
| Ruído externo | Fechar janelas, gravar em sala interna |
| Ruído do computador | Afastar microfone do ventilador do PC/notebook |
| Ar-condicionado | Ligar no modo silencioso ou desligar durante gravação |

### Posicionamento do microfone

- **Distância ideal:** 15–30cm da boca do falante
- **Ângulo:** Levemente inclinado (não direto para a boca — reduz plosivos)
- **Altura:** Na altura da boca ou ligeiramente abaixo
- **Nunca:** Sobre a mesa sem espuma/suporte (vibração da mesa entra na gravação)

---

## 5. Configurações do Sistema Operacional 🖥️

### Windows

1. **Painel de controle de som** → Gravação → Microfone → Propriedades
2. **Nível de gravação:** Manter entre **70–85%** (100% aumenta o ruído)
3. **Aprimoramentos:** Desabilitar "Supressão de ruído" e "Cancelamento de eco" do Windows se usar o processamento do app (conflito)
4. **Formato:** Definir para **48.000 Hz, 16 bits** no painel avançado

### Chrome/Edge (navegador)

- Verificar permissão de microfone em `chrome://settings/content/microphone`
- Selecionar o microfone correto na lista suspensa
- Evitar abas concorrentes usando o microfone ao mesmo tempo

---

## 6. Checklist Rápido de Qualidade 📋

Antes de iniciar uma transcrição importante:

- [ ] Microfone posicionado a 15–30cm do falante principal
- [ ] Sala sem ruído de fundo audível
- [ ] Nível de gravação do SO entre 70–85%
- [ ] Modo de gravação correto selecionado (presencial/online)
- [ ] Teste de conexão realizado com sucesso
- [ ] Arquivo de áudio abaixo de 25MB (limite da API Groq)
- [ ] Indicador de qualidade no app mostrando ✅ Bom ou ✅ Excelente

---

## 7. Plano de Implementação das Melhorias no Código

| Prioridade | Melhoria | Esforço |
|---|---|---|
| 🔴 Alta | Integrar `preprocessAudio()` no fluxo de transcrição | Médio |
| 🔴 Alta | Corrigir fechamento do AudioContext antes do processamento | Baixo |
| 🟡 Média | Ajustar parâmetros do compressor para voz | Baixo |
| 🟡 Média | Threshold adaptativo no trimSilence | Médio |
| 🟢 Baixa | Diferenciar constraints por modo (presencial/online) | Baixo |

---

*Documento gerado em: {{ DATA ATUAL }}*
*Versão do E-Transcriber: v1.2*
