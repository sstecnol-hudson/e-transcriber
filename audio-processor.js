// ============================================================================
// AUDIO PROCESSOR - Módulo de Processamento de Áudio Avançado
// ============================================================================
// Captura, compressão, pré-processamento e visualização de áudio de alta qualidade

class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.stream = null;
    this.displayStream = null;
    this.analyser = null;
    this.visualizer = null;
    this.qualityMonitor = null;
    this.recordingStartTime = null;
    this.recordingDuration = 0;
  }

  // ========================================================================
  // INICIALIZAÇÃO
  // ========================================================================

  /**
   * Inicializar AudioContext com configurações otimizadas
   */
  initAudioContext() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return this.audioContext;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: 48000, // 48kHz para melhor qualidade
        latency: 'interactive'
      });
      return this.audioContext;
    } catch (err) {
      console.error('Erro ao criar AudioContext:', err);
      throw new Error('AudioContext não suportado neste navegador');
    }
  }

  /**
   * Obter configurações de áudio otimizadas
   */
  getAudioConstraints(mode = 'presencial') {
    const baseConstraints = {
      audio: {
        // Processamento de áudio
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,

        // Qualidade
        sampleRate: { ideal: 48000 },
        channelCount: 1, // Mono
        latency: { ideal: 0.01 },

        // Processamento avançado
        typingNoiseDetection: true,
        experimentalEchoCancellation: true,
        experimentalNoiseSuppression: true,
        experimentalAutoGainControl: true
      }
    };

    return baseConstraints;
  }

  // ========================================================================
  // GRAVAÇÃO DE ÁUDIO
  // ========================================================================

  /**
   * Iniciar gravação presencial (microfone apenas)
   */
  async startPresentialRecording() {
    try {
      this.initAudioContext();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(e => console.warn('Falha ao resumir AudioContext:', e));
      }
      const constraints = this.getAudioConstraints('presencial');

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      await this.setupRecording(this.stream);

      this.recordingStartTime = Date.now();
      this.isRecording = true;

      return {
        success: true,
        message: 'Gravação presencial iniciada',
        stream: this.stream
      };
    } catch (err) {
      console.error('Erro ao iniciar gravação presencial:', err);
      return {
        success: false,
        message: this.getErrorMessage(err),
        error: err
      };
    }
  }

  /**
   * Iniciar gravação online (microfone + áudio do sistema)
   */
  async startOnlineRecording() {
    try {
      this.initAudioContext();
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume().catch(e => console.warn('Falha ao resumir AudioContext:', e));
      }
      const constraints = this.getAudioConstraints('online');

      // Iniciar ambas as requisições em paralelo (no mesmo tick síncrono do clique)
      // para preservar o token de gesto do usuário para a tela/sistema
      const micPromise = navigator.mediaDevices.getUserMedia(constraints);
      const displayPromise = navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      }).catch(err => {
        console.warn('Áudio da tela não disponível ou cancelado pelo usuário:', err);
        return null;
      });

      // Aguardar resultados
      this.stream = await micPromise;
      this.displayStream = await displayPromise;

      let systemAudioActive = false;

      if (this.displayStream) {
        // Verificar se áudio foi realmente compartilhado
        const displayAudioTracks = this.displayStream.getAudioTracks();
        if (displayAudioTracks.length > 0) {
          // Combinar áudio do microfone e da tela
          const combinedStream = this.combineAudioStreams(this.stream, this.displayStream);
          await this.setupRecording(combinedStream);
          systemAudioActive = true;
        } else {
          console.warn('Tela compartilhada sem marcar a opção de compartilhar áudio do sistema.');
          // Parar a transmissão de vídeo do display que não tem áudio
          this.displayStream.getTracks().forEach(track => track.stop());
          this.displayStream = null;
          await this.setupRecording(this.stream);
        }

        // Parar gravação se usuário parar de compartilhar tela
        if (this.displayStream && this.displayStream.getVideoTracks().length > 0) {
          this.displayStream.getVideoTracks()[0].onended = () => {
            if (this.isRecording) {
              this.stopRecording();
            }
          };
        }
      } else {
        // Sem áudio de tela/sistema, usa apenas microfone
        await this.setupRecording(this.stream);
      }

      this.recordingStartTime = Date.now();
      this.isRecording = true;

      return {
        success: true,
        message: 'Gravação online iniciada',
        systemAudioActive: systemAudioActive,
        stream: this.stream
      };
    } catch (err) {
      console.error('Erro ao iniciar gravação online:', err);
      return {
        success: false,
        message: this.getErrorMessage(err),
        error: err
      };
    }
  }

  /**
   * Combinar áudio de múltiplas fontes
   */
  combineAudioStreams(micStream, displayStream) {
    const micSource = this.audioContext.createMediaStreamSource(micStream);
    const displaySource = this.audioContext.createMediaStreamSource(displayStream);
    const dest = this.audioContext.createMediaStreamDestination();

    // Conectar ambas as fontes ao destino
    micSource.connect(dest);

    // Conectar áudio da tela se disponível
    const displayAudioTracks = displayStream.getAudioTracks();
    if (displayAudioTracks.length > 0) {
      displaySource.connect(dest);
    }

    return dest.stream;
  }

  /**
   * Configurar MediaRecorder
   */
  async setupRecording(stream) {
    // Determinar MIME type suportado
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/ogg';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/mp4';
    }

    this.audioChunks = [];

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      audioBitsPerSecond: 128000 // 128kbps
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(250); // Coletar dados a cada 250ms
  }

  /**
   * Parar gravação
   * NOTA: NÃO fecha o AudioContext aqui — ele ainda é necessário para
   * compressAudio() e preprocessAudio() que rodam APÓS esta chamada.
   * Use cleanup() para liberar recursos depois do processamento.
   */
  stopRecording() {
    if (!this.isRecording) return null;

    this.isRecording = false;
    this.recordingDuration = Date.now() - this.recordingStartTime;

    // Parar MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Parar apenas os tracks de mídia (microfone/tela)
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.displayStream) {
      this.displayStream.getTracks().forEach(track => track.stop());
    }

    // NÃO fechar o audioContext aqui!
    // O contexto é necessário para compressAudio() e preprocessAudio().
    // Chame cleanup() após o processamento estar concluído.

    return {
      success: true,
      duration: this.recordingDuration,
      chunks: this.audioChunks
    };
  }

  /**
   * Liberar todos os recursos de áudio.
   * Chamar APÓS o processamento do blob (compressAudio / preprocessAudio).
   */
  async cleanup() {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.stream = null;
    this.displayStream = null;
    this.analyser = null;
    this.audioChunks = [];
  }

  /**
   * Obter blob de áudio gravado
   */
  getRecordedAudioBlob() {
    if (this.audioChunks.length === 0) {
      throw new Error('Nenhum áudio foi gravado');
    }

    const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
    return new Blob(this.audioChunks, { type: mimeType });
  }

  // ========================================================================
  // COMPRESSÃO E PRÉ-PROCESSAMENTO
  // ========================================================================

  /**
   * Comprimir áudio mantendo qualidade
   */
  async compressAudio(blob) {
    try {
      const audioContext = this.initAudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Reduzir sample rate de 48kHz para 16kHz (suficiente para fala)
      const targetSampleRate = 16000;
      const offlineContext = new OfflineAudioContext(
        1,
        Math.ceil(audioBuffer.duration * targetSampleRate),
        targetSampleRate
      );

      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;

      // Aplicar compressor dinâmico com parâmetros otimizados para voz humana
      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = -24; // Começa a comprimir em -24dB (ideal para fala)
      compressor.knee.value = 30;       // Transição suave
      compressor.ratio.value = 4;       // Ratio natural para voz (4:1 vs 12:1 anterior)
      compressor.attack.value = 0.003;  // Ataque rápido (mantém consoantes)
      compressor.release.value = 0.25;  // Release natural

      source.connect(compressor);
      compressor.connect(offlineContext.destination);
      source.start();

      const compressedBuffer = await offlineContext.startRendering();

      // Converter para WAV
      const wavBlob = this.audioBufferToWav(compressedBuffer);

      return {
        success: true,
        blob: wavBlob,
        originalSize: blob.size,
        compressedSize: wavBlob.size,
        compressionRatio: ((1 - wavBlob.size / blob.size) * 100).toFixed(2) + '%'
      };
    } catch (err) {
      console.error('Erro ao comprimir áudio:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Pré-processar áudio antes de enviar para transcrição
   */
  async preprocessAudio(blob) {
    try {
      const audioContext = this.initAudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 1. Normalizar volume
      let normalized = this.normalizeAudio(audioBuffer.getChannelData(0));

      // 2. Remover silêncio no início e fim
      normalized = this.trimSilence(normalized);

      // 3. Aplicar filtro passa-alta (remover ruído baixo)
      const filtered = await this.applyHighPassFilter(normalized, audioContext);

      // 4. Comprimir dinamicamente
      const compressed = await this.applyDynamicsCompression(filtered.getChannelData(0), audioContext);

      // 5. Converter para WAV
      const wavBlob = this.audioBufferToWav(compressed);

      return {
        success: true,
        blob: wavBlob,
        originalSize: blob.size,
        processedSize: wavBlob.size
      };
    } catch (err) {
      console.error('Erro ao pré-processar áudio:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Normalizar volume de áudio
   */
  normalizeAudio(audioData, targetLevel = 0.95) {
    let max = 0;

    for (let i = 0; i < audioData.length; i++) {
      max = Math.max(max, Math.abs(audioData[i]));
    }

    if (max === 0) return audioData;

    const normalized = new Float32Array(audioData.length);
    const factor = targetLevel / max;

    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] * factor;
    }

    return normalized;
  }

  /**
   * Remover silêncio no início e fim com threshold adaptativo.
   * Estima o ruído de fundo nos primeiros 100ms para definir
   * automaticamente o limiar de corte (mínimo de 0.01).
   */
  trimSilence(audioData, threshold = null) {
    // Threshold adaptativo: usa o ruído dos primeiros 100ms como referência
    if (threshold === null) {
      threshold = this.estimateNoiseFloor(audioData);
    }

    let start = 0;
    let end = audioData.length - 1;

    // Encontrar início do áudio
    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) > threshold) {
        start = Math.max(0, i - 100); // margem de 100 amostras
        break;
      }
    }

    // Encontrar fim do áudio
    for (let i = audioData.length - 1; i >= 0; i--) {
      if (Math.abs(audioData[i]) > threshold) {
        end = Math.min(audioData.length - 1, i + 100); // margem de 100 amostras
        break;
      }
    }

    return audioData.slice(start, end);
  }

  /**
   * Estima o nível de ruído de fundo usando os primeiros 100ms da gravação.
   * Retorna um threshold mínimo de 0.01 para evitar cortes indevidos.
   */
  estimateNoiseFloor(audioData, sampleMs = 100, sampleRate = 48000) {
    const sampleLength = Math.min(Math.floor(sampleRate * (sampleMs / 1000)), audioData.length);
    let sum = 0;
    for (let i = 0; i < sampleLength; i++) {
      sum += Math.abs(audioData[i]);
    }
    const noiseFloor = sum / sampleLength;
    // Threshold = 3× o ruído de fundo, mínimo 0.01
    return Math.max(0.01, noiseFloor * 3);
  }

  /**
   * Aplicar filtro passa-alta
   */
  async applyHighPassFilter(audioData, audioContext) {
    const offlineContext = new OfflineAudioContext(
      1,
      audioData.length,
      audioContext.sampleRate
    );

    const buffer = offlineContext.createBuffer(1, audioData.length, audioContext.sampleRate);
    buffer.getChannelData(0).set(audioData);

    const source = offlineContext.createBufferSource();
    source.buffer = buffer;

    const filter = offlineContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 80; // 80Hz para remover ruído baixo
    filter.Q.value = 1;

    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start();

    return offlineContext.startRendering();
  }

  /**
   * Aplicar compressão dinâmica
   */
  async applyDynamicsCompression(audioData, audioContext) {
    const offlineContext = new OfflineAudioContext(
      1,
      audioData.length,
      audioContext.sampleRate
    );

    const buffer = offlineContext.createBuffer(1, audioData.length, audioContext.sampleRate);
    buffer.getChannelData(0).set(audioData);

    const source = offlineContext.createBufferSource();
    source.buffer = buffer;

    // Parâmetros otimizados para voz humana
    const compressor = offlineContext.createDynamicsCompressor();
    compressor.threshold.value = -24; // Ideal para fala
    compressor.knee.value = 30;       // Transição suave
    compressor.ratio.value = 4;       // Natural para voz
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    source.connect(compressor);
    compressor.connect(offlineContext.destination);
    source.start();

    return offlineContext.startRendering();
  }

  /**
   * Converter AudioBuffer para WAV
   */
  audioBufferToWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const channelData = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    const interleaved = this.interleaveChannels(channelData);
    const dataLength = interleaved.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // Escrever WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    // Escrever dados de áudio
    let offset = 44;
    const volume = 0.8;
    for (let i = 0; i < interleaved.length; i++) {
      view.setInt16(offset, interleaved[i] * (0x7FFF * volume), true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Intercalar canais de áudio
   */
  interleaveChannels(channels) {
    const length = channels[0].length * channels.length;
    const result = new Float32Array(length);
    let index = 0;

    for (let i = 0; i < channels[0].length; i++) {
      for (let j = 0; j < channels.length; j++) {
        result[index++] = channels[j][i];
      }
    }

    return result;
  }

  // ========================================================================
  // VISUALIZAÇÃO DE ÁUDIO
  // ========================================================================

  /**
   * Configurar visualizador de áudio
   */
  setupVisualizer(canvasElement, stream) {
    if (!canvasElement) {
      console.warn('setupVisualizer: canvasElement is null, skipping');
      return { start: () => {}, stop: () => {} }; // safe no-op
    }

    if (!this.audioContext) {
      this.initAudioContext();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;

    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);

    // NOTE: Do NOT call this.visualizer.start() here.
    // The caller (meetings.js / app.js) is responsible for calling start(style).
    this.visualizer = new AudioVisualizer(canvasElement, this.analyser);

    return this.visualizer;
  }

  /**
   * Parar visualizador
   */
  stopVisualizer() {
    if (this.visualizer) {
      this.visualizer.stop();
    }
  }

  // ========================================================================
  // MONITORAMENTO DE QUALIDADE
  // ========================================================================

  /**
   * Iniciar monitoramento de qualidade
   */
  startQualityMonitoring() {
    if (!this.analyser) {
      console.warn('startQualityMonitoring: analyser não configurado, monitoramento ignorado.');
      return null;
    }

    this.qualityMonitor = new AudioQualityMonitor(this.analyser);
    return this.qualityMonitor;
  }

  /**
   * Obter métricas de qualidade
   */
  getQualityMetrics() {
    if (!this.qualityMonitor) {
      return null;
    }

    return this.qualityMonitor.update();
  }

  // ========================================================================
  // UTILITÁRIOS
  // ========================================================================

  /**
   * Obter mensagem de erro amigável
   */
  getErrorMessage(err) {
    if (err.name === 'NotAllowedError') {
      return 'Permissão negada. Verifique as permissões de microfone.';
    }
    if (err.name === 'NotFoundError') {
      return 'Nenhum dispositivo de áudio encontrado.';
    }
    if (err.name === 'NotReadableError') {
      return 'Não foi possível acessar o dispositivo de áudio.';
    }
    return err.message || 'Erro desconhecido ao acessar áudio.';
  }

  /**
   * Validar tamanho de arquivo
   */
  validateFileSize(blob, maxSizeMB = 25) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (blob.size > maxSizeBytes) {
      return {
        valid: false,
        message: `Arquivo muito grande! Máximo: ${maxSizeMB}MB. Seu arquivo: ${(blob.size / 1024 / 1024).toFixed(2)}MB`
      };
    }
    return { valid: true };
  }

  /**
   * Obter informações do arquivo
   */
  getFileInfo(blob) {
    return {
      size: blob.size,
      sizeFormatted: (blob.size / 1024 / 1024).toFixed(2) + ' MB',
      type: blob.type,
      duration: this.recordingDuration ? (this.recordingDuration / 1000).toFixed(2) + 's' : 'N/A'
    };
  }
}

// ============================================================================
// AUDIO VISUALIZER - Visualizador de Áudio
// ============================================================================

class AudioVisualizer {
  constructor(canvasElement, analyser) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.analyser = analyser;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount);
    this.animationId = null;
    this.style = 'bars'; // bars, waveform, circular
    this.isRunning = false;
  }

  /**
   * Iniciar visualização
   */
  start(style = 'bars') {
    this.style = style;
    this.isRunning = true;
    this.draw();
  }

  /**
   * Parar visualização
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.clearCanvas();
  }

  /**
   * Desenhar frame
   */
  draw() {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(() => this.draw());

    this.analyser.getByteFrequencyData(this.dataArray);

    switch (this.style) {
      case 'bars':
        this.drawBars();
        break;
      case 'waveform':
        this.drawWaveform();
        break;
      case 'circular':
        this.drawCircular();
        break;
    }
  }

  /**
   * Desenhar barras
   */
  drawBars() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#6366f1');
    gradient.addColorStop(0.5, '#8b5cf6');
    gradient.addColorStop(1, '#14b8a6');

    const barWidth = (width / this.dataArray.length) * 2.5;
    let x = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const barHeight = (this.dataArray[i] / 255) * height;

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

      x += barWidth;
    }
  }

  /**
   * Desenhar waveform
   */
  drawWaveform() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.strokeStyle = '#6366f1';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const sliceWidth = width / this.dataArray.length;
    let x = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.lineTo(width, height / 2);
    this.ctx.stroke();
  }

  /**
   * Desenhar circular
   */
  drawCircular() {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    this.ctx.clearRect(0, 0, width, height);

    this.ctx.strokeStyle = '#6366f1';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    for (let i = 0; i < this.dataArray.length; i++) {
      const angle = (i / this.dataArray.length) * Math.PI * 2;
      const value = this.dataArray[i] / 255;
      const r = radius + value * 50;

      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.closePath();
    this.ctx.stroke();
  }

  /**
   * Limpar canvas
   */
  clearCanvas() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
  }
}

// ============================================================================
// AUDIO QUALITY MONITOR - Monitor de Qualidade de Áudio
// ============================================================================

class AudioQualityMonitor {
  constructor(analyser) {
    this.analyser = analyser;
    this.metrics = {
      noiseLevel: 0,
      clipping: false,
      frequency: 0,
      quality: 'good',
      peakLevel: 0
    };
  }

  /**
   * Atualizar métricas
   */
  update() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    this.metrics.noiseLevel = this.calculateNoiseLevel(dataArray);
    this.metrics.clipping = this.detectClipping(dataArray);
    this.metrics.frequency = this.findDominantFrequency(dataArray);
    this.metrics.peakLevel = Math.max(...dataArray);
    this.metrics.quality = this.determineQuality();

    return this.metrics;
  }

  /**
   * Calcular nível de ruído
   */
  calculateNoiseLevel(dataArray) {
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return Math.round(sum / dataArray.length);
  }

  /**
   * Detectar clipping
   */
  detectClipping(dataArray) {
    const maxValue = Math.max(...dataArray);
    return maxValue > 240;
  }

  /**
   * Encontrar frequência dominante
   */
  findDominantFrequency(dataArray) {
    let maxValue = 0;
    let maxIndex = 0;

    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxValue) {
        maxValue = dataArray[i];
        maxIndex = i;
      }
    }

    return maxIndex;
  }

  /**
   * Determinar qualidade
   */
  determineQuality() {
    if (this.metrics.clipping) return 'poor';
    if (this.metrics.noiseLevel > 100) return 'fair';
    if (this.metrics.noiseLevel > 50) return 'good';
    return 'excellent';
  }

  /**
   * Obter descrição de qualidade
   */
  getQualityDescription() {
    const descriptions = {
      excellent: '✅ Excelente - Áudio de alta qualidade',
      good: '✅ Bom - Qualidade adequada',
      fair: '⚠️ Razoável - Qualidade aceitável',
      poor: '❌ Ruim - Qualidade baixa (clipping detectado)'
    };

    return descriptions[this.metrics.quality] || 'Desconhecido';
  }
}

// ============================================================================
// EXPORTAR MÓDULO
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AudioProcessor,
    AudioVisualizer,
    AudioQualityMonitor
  };
}
