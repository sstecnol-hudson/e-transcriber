# Requirements Document - Integração Audio Processor

## Introdução

O E-Transcriber é um sistema de transcrição médica e corporativa com IA que utiliza a API Groq para transcrição de áudio. Atualmente, o sistema utiliza código de gravação básico que não aproveita técnicas modernas de processamento de áudio.

Este documento especifica os requisitos para integrar o módulo `audio-processor.js` (1.000+ linhas, já desenvolvido) no projeto E-Transcriber. O objetivo é melhorar significativamente a qualidade de captura de áudio, reduzir tamanho de arquivo em 40% com compressão inteligente, fornecer visualização em tempo real e monitorar qualidade de áudio em tempo real, mantendo compatibilidade total com a transcrição Groq API.

---

## Glossário

- **AudioProcessor**: Classe principal que gerencia captura, compressão, pré-processamento e visualização de áudio
- **AudioVisualizer**: Classe responsável por renderizar visualizações de áudio em tempo real (barras, waveform, circular)
- **AudioQualityMonitor**: Classe que monitora e reporta métricas de qualidade de áudio (ruído, clipping, frequência)
- **Compressão**: Redução de tamanho de arquivo de áudio mantendo qualidade suficiente para transcrição
- **Pré-processamento**: Aplicação de filtros e normalizações para melhorar qualidade antes de transcrição
- **Gravação Presencial**: Captura de áudio apenas do microfone do usuário
- **Gravação Online**: Captura combinada de áudio do microfone + áudio do sistema (para telemedicina/reuniões)
- **Groq API**: Serviço de transcrição (Whisper) e processamento de linguagem natural (Llama)
- **WAV**: Formato de áudio sem compressão com qualidade preservada
- **48kHz**: Taxa de amostragem de 48.000 amostras por segundo (qualidade profissional)
- **16kHz**: Taxa de amostragem de 16.000 amostras por segundo (suficiente para fala)
- **Clipping**: Distorção de áudio causada por picos de volume que excedem o limite máximo
- **Ruído**: Som indesejado de fundo que interfere com a qualidade da gravação

---

## Requirements

### Requirement 1: Integração do AudioProcessor em app.js

**User Story:** Como desenvolvedor, quero substituir o código antigo de gravação em app.js pelo novo AudioProcessor, para que a captura de áudio seja mais robusta e de melhor qualidade.

#### Acceptance Criteria

1. WHEN app.js é carregado, THE AudioProcessor SHALL be instantiated and available globally
2. WHEN user clicks "Presencial" button, THE AudioProcessor SHALL start presential recording with 48kHz sample rate
3. WHEN user clicks "Telemedicina" button, THE AudioProcessor SHALL start online recording combining microphone and system audio
4. WHEN user clicks "Parar/Processar" button, THE AudioProcessor SHALL stop recording and return audio blob
5. WHEN recording is stopped, THE recorded audio blob SHALL be passed to sendAudioToWhisper() function without modification
6. IF an error occurs during recording, THE AudioProcessor SHALL return error message and display it via showToast()
7. WHILE recording is active, THE recordingTimer SHALL update every second showing elapsed time in MM:SS format

### Requirement 2: Integração do AudioProcessor em meetings.js

**User Story:** Como desenvolvedor, quero usar AudioProcessor em meetings.js para melhorar qualidade de gravação de reuniões, para que atas geradas sejam mais precisas.

#### Acceptance Criteria

1. WHEN startMeetingRecording() is called, THE AudioProcessor SHALL initialize and start recording
2. WHEN isOnline parameter is true, THE AudioProcessor SHALL combine microphone and display audio streams
3. WHEN recording is stopped, THE AudioProcessor SHALL return audio blob compatible with Groq API
4. IF display stream is not available, THE AudioProcessor SHALL fall back to microphone-only recording
5. WHEN display stream ends, THE AudioProcessor SHALL automatically stop recording

### Requirement 3: Adicionar Script Tag no index.html

**User Story:** Como desenvolvedor, quero que audio-processor.js seja carregado no HTML, para que as classes AudioProcessor, AudioVisualizer e AudioQualityMonitor estejam disponíveis.

#### Acceptance Criteria

1. THE index.html file SHALL contain a <script> tag loading audio-processor.js
2. THE script tag SHALL be placed before app.js and meetings.js scripts
3. WHEN index.html is loaded, THE AudioProcessor class SHALL be available in global scope
4. WHEN index.html is loaded, THE AudioVisualizer class SHALL be available in global scope
5. WHEN index.html is loaded, THE AudioQualityMonitor class SHALL be available in global scope

### Requirement 4: Implementar Seletor de Estilo de Visualização

**User Story:** Como usuário, quero escolher entre diferentes estilos de visualização de áudio (barras, waveform, circular), para que eu possa escolher o visual que prefiro durante a gravação.

#### Acceptance Criteria

1. WHEN recording is active, THE UI SHALL display visualization style selector with three options: "Barras", "Waveform", "Circular"
2. WHEN user selects "Barras", THE AudioVisualizer SHALL render frequency bars in real-time
3. WHEN user selects "Waveform", THE AudioVisualizer SHALL render waveform line in real-time
4. WHEN user selects "Circular", THE AudioVisualizer SHALL render circular visualization in real-time
5. WHEN user changes visualization style, THE AudioVisualizer SHALL smoothly transition to new style without interrupting recording
6. WHEN recording stops, THE visualization SHALL stop updating and canvas SHALL be cleared

### Requirement 5: Exibir Métricas de Qualidade de Áudio em Tempo Real

**User Story:** Como usuário, quero ver métricas de qualidade de áudio em tempo real durante a gravação, para que eu possa verificar se a qualidade está adequada antes de processar.

#### Acceptance Criteria

1. WHEN recording is active, THE UI SHALL display real-time audio quality metrics
2. THE quality metrics panel SHALL show: Nível de Ruído, Clipping (Sim/Não), Frequência Dominante, Qualidade Geral
3. WHEN noise level is low (< 50), THE quality indicator SHALL show "Excelente" with green color
4. WHEN noise level is medium (50-100), THE quality indicator SHALL show "Bom" with green color
5. WHEN noise level is high (> 100), THE quality indicator SHALL show "Razoável" with yellow color
6. WHEN clipping is detected, THE quality indicator SHALL show "Ruim" with red color and warning message
7. THE metrics SHALL update every 500ms during recording
8. WHEN recording stops, THE metrics panel SHALL be hidden or reset

### Requirement 6: Implementar Compressão de Áudio

**User Story:** Como desenvolvedor, quero que o áudio seja comprimido antes de ser enviado para a API Groq, para que o tamanho do arquivo seja reduzido em aproximadamente 40%.

#### Acceptance Criteria

1. WHEN recording is stopped, THE AudioProcessor SHALL compress the audio automatically
2. THE compression SHALL reduce file size by at least 35% while maintaining quality sufficient for transcription
3. THE compressed audio SHALL be converted to WAV format with 16kHz sample rate
4. WHEN compression is complete, THE compressed blob SHALL be passed to sendAudioToWhisper() function
5. IF compression fails, THE original audio blob SHALL be used as fallback
6. THE compression process SHALL not block the UI (use async/await)

### Requirement 7: Implementar Pré-processamento de Áudio

**User Story:** Como desenvolvedor, quero que o áudio seja pré-processado antes de transcrição, para que ruído de fundo seja reduzido e qualidade de transcrição seja melhorada.

#### Acceptance Criteria

1. WHEN user uploads an audio file, THE AudioProcessor SHALL offer option to preprocess before transcription
2. THE preprocessing SHALL include: normalization, silence trimming, high-pass filter (80Hz), dynamics compression
3. WHEN preprocessing is applied, THE file size SHALL be reduced and audio quality SHALL be improved
4. THE preprocessed audio SHALL be compatible with Groq API
5. WHEN preprocessing is complete, THE preprocessed blob SHALL be passed to sendAudioToWhisper() function

### Requirement 8: Manter Compatibilidade com Groq API

**User Story:** Como desenvolvedor, quero que o áudio processado seja totalmente compatível com a API Groq, para que a transcrição funcione sem erros.

#### Acceptance Criteria

1. THE AudioProcessor output SHALL be a Blob object compatible with FormData
2. THE audio format SHALL be supported by Groq API (WAV, WebM, MP3, M4A, MP4)
3. THE audio file size SHALL not exceed 25MB (Groq API limit)
4. WHEN audio is sent to Groq API, THE transcription SHALL succeed without format errors
5. THE transcription quality SHALL be equal or better than original unprocessed audio
6. WHEN audio is processed, THE language detection by Groq API SHALL work correctly

### Requirement 9: Integração com Visualizador Existente

**User Story:** Como desenvolvedor, quero que o novo AudioVisualizer funcione com o canvas existente em app.js e meetings.js, para que não seja necessário modificar HTML.

#### Acceptance Criteria

1. WHEN AudioProcessor.setupVisualizer() is called with existing canvas element, THE AudioVisualizer SHALL render correctly
2. THE AudioVisualizer SHALL use the canvas dimensions provided by the HTML element
3. WHEN canvas is resized, THE AudioVisualizer SHALL adapt to new dimensions
4. THE visualization SHALL not cause performance issues (maintain 60 FPS)
5. WHEN recording stops, THE canvas SHALL be cleared and visualization SHALL stop

### Requirement 10: Tratamento de Erros Robusto

**User Story:** Como desenvolvedor, quero que erros de áudio sejam tratados graciosamente, para que o usuário receba mensagens claras e o sistema não quebre.

#### Acceptance Criteria

1. IF microphone permission is denied, THE AudioProcessor SHALL return error message "Permissão negada. Verifique as permissões de microfone."
2. IF no audio device is found, THE AudioProcessor SHALL return error message "Nenhum dispositivo de áudio encontrado."
3. IF audio device is not readable, THE AudioProcessor SHALL return error message "Não foi possível acessar o dispositivo de áudio."
4. IF file size exceeds 25MB, THE AudioProcessor SHALL return error message with actual file size
5. IF compression fails, THE original audio SHALL be used as fallback
6. IF preprocessing fails, THE original audio SHALL be used as fallback
7. WHEN error occurs, THE error message SHALL be displayed to user via showToast()
8. WHEN error occurs, THE recording state SHALL be properly cleaned up (streams closed, AudioContext closed)

### Requirement 11: Monitoramento de Qualidade de Áudio

**User Story:** Como desenvolvedor, quero que o sistema monitore qualidade de áudio em tempo real, para que eu possa detectar problemas de captura.

#### Acceptance Criteria

1. WHEN recording is active, THE AudioQualityMonitor SHALL calculate noise level from frequency data
2. THE AudioQualityMonitor SHALL detect clipping when peak level exceeds 240/255
3. THE AudioQualityMonitor SHALL identify dominant frequency in audio
4. THE AudioQualityMonitor SHALL determine overall quality as: excellent, good, fair, or poor
5. THE quality metrics SHALL be updated every 500ms
6. WHEN quality is "excellent", THE indicator SHALL show green color
7. WHEN quality is "good", THE indicator SHALL show green color
8. WHEN quality is "fair", THE indicator SHALL show yellow color
9. WHEN quality is "poor", THE indicator SHALL show red color with warning

### Requirement 12: Conversão para WAV

**User Story:** Como desenvolvedor, quero que o áudio seja convertido para formato WAV, para que seja compatível com todos os navegadores e APIs.

#### Acceptance Criteria

1. WHEN AudioProcessor.audioBufferToWav() is called, THE method SHALL convert AudioBuffer to WAV Blob
2. THE WAV file SHALL have proper header with correct sample rate and channel count
3. THE WAV file SHALL be 16-bit PCM format
4. WHEN WAV is created, THE file SHALL be playable in standard audio players
5. WHEN WAV is sent to Groq API, THE transcription SHALL work correctly

### Requirement 13: Compatibilidade com Navegadores

**User Story:** Como desenvolvedor, quero que AudioProcessor funcione em navegadores modernos, para que o sistema seja acessível a todos os usuários.

#### Acceptance Criteria

1. THE AudioProcessor SHALL work in Chrome/Chromium (latest version)
2. THE AudioProcessor SHALL work in Firefox (latest version)
3. THE AudioProcessor SHALL work in Safari (latest version)
4. THE AudioProcessor SHALL work in Edge (latest version)
5. WHEN browser doesn't support AudioContext, THE AudioProcessor SHALL return appropriate error message
6. WHEN browser doesn't support MediaRecorder, THE AudioProcessor SHALL return appropriate error message
7. WHEN browser doesn't support getDisplayMedia, THE online recording SHALL fall back to microphone-only

### Requirement 14: Documentação de Integração

**User Story:** Como desenvolvedor, quero ter documentação clara sobre como integrar AudioProcessor, para que eu possa implementar corretamente.

#### Acceptance Criteria

1. THE GUIA-AUDIO-PROCESSOR.md file SHALL contain complete API documentation
2. THE documentation SHALL include usage examples for presential and online recording
3. THE documentation SHALL include examples for compression and preprocessing
4. THE documentation SHALL include troubleshooting section
5. THE documentation SHALL be updated with integration examples for app.js and meetings.js

---

## Acceptance Criteria Patterns - Property-Based Testing Strategy

### Requirement 1-3: Recording and Integration

**Pattern: Round-Trip Property**
- Property: `compress(audio) → decompress(audio) ≈ audio` (quality preserved)
- Property: `preprocess(audio) → transcribe(audio)` produces valid transcription
- Property: `record() → getBlob() → send(blob)` succeeds without format errors

**Pattern: Invariants**
- Recording duration must be positive: `duration > 0`
- Audio blob size must be positive: `blob.size > 0`
- Compressed size must be less than original: `compressed.size < original.size`
- Quality metrics must be within valid ranges: `0 ≤ noiseLevel ≤ 255`, `0 ≤ peakLevel ≤ 255`

**Pattern: Idempotence**
- Multiple calls to `getQualityMetrics()` with same audio should return same values
- Calling `stopRecording()` twice should not cause errors
- Calling `stopVisualizer()` twice should not cause errors

### Requirement 4-5: Visualization and Quality Metrics

**Pattern: Metamorphic Properties**
- Property: `visualizer.style = 'bars'` → canvas has bars
- Property: `visualizer.style = 'waveform'` → canvas has waveform
- Property: `visualizer.style = 'circular'` → canvas has circular pattern
- Property: `qualityMetrics.quality ∈ {excellent, good, fair, poor}`

**Pattern: Error Conditions**
- Invalid canvas element should throw error
- Invalid stream should throw error
- Invalid audio data should throw error

### Requirement 6-7: Compression and Preprocessing

**Pattern: Round-Trip Property**
- Property: `compress(audio) → decompress(audio)` produces audio with similar characteristics
- Property: `preprocess(audio) → transcribe(audio)` produces valid transcription
- Property: `normalize(audio) → max(audio) ≤ targetLevel`

**Pattern: Invariants**
- Compression ratio must be positive: `0 < ratio < 100%`
- Preprocessed audio must have same duration (approximately): `|duration_before - duration_after| < 100ms`
- Normalized audio must not exceed target level: `max(normalized) ≤ targetLevel`

### Requirement 8: Groq API Compatibility

**Pattern: Round-Trip Property**
- Property: `process(audio) → send(blob) → transcribe()` succeeds
- Property: `format(audio) → validate(format)` returns true for supported formats

**Pattern: Invariants**
- File size must not exceed 25MB: `blob.size ≤ 25 * 1024 * 1024`
- Audio format must be supported: `format ∈ {wav, webm, mp3, m4a, mp4}`

### Requirement 10: Error Handling

**Pattern: Error Conditions**
- Test with denied microphone permission
- Test with no audio device
- Test with unreadable audio device
- Test with file size > 25MB
- Test with invalid audio format
- Test with corrupted audio data

**Pattern: Idempotence**
- Calling error handler multiple times should not cause cascading errors
- Cleanup should be idempotent (calling twice should be safe)

### Requirement 11: Quality Monitoring

**Pattern: Invariants**
- Noise level must be in range: `0 ≤ noiseLevel ≤ 255`
- Peak level must be in range: `0 ≤ peakLevel ≤ 255`
- Quality must be one of valid values: `quality ∈ {excellent, good, fair, poor}`
- Clipping detection must be boolean: `clipping ∈ {true, false}`

**Pattern: Metamorphic Properties**
- Property: `noiseLevel < 50 → quality = excellent`
- Property: `50 ≤ noiseLevel < 100 → quality = good`
- Property: `100 ≤ noiseLevel → quality = fair`
- Property: `clipping = true → quality = poor`

### Requirement 12: WAV Conversion

**Pattern: Round-Trip Property**
- Property: `audioBuffer → WAV → decode → audioBuffer` produces similar audio
- Property: `WAV.header.sampleRate = audioBuffer.sampleRate`
- Property: `WAV.header.channels = audioBuffer.numberOfChannels`

**Pattern: Invariants**
- WAV file must have valid header: `header.startsWith('RIFF')`
- WAV file must have valid format: `format = 1 (PCM)`
- WAV file must have valid bit depth: `bitDepth = 16`

---

## Integration Points

### app.js Integration
- Replace `startRecording()` with `audioProcessor.startPresentialRecording()`
- Replace `stopRecording()` with `audioProcessor.stopRecording()`
- Replace `getRecordedAudioBlob()` with `audioProcessor.getRecordedAudioBlob()`
- Replace waveform visualization with `audioProcessor.setupVisualizer()`
- Add quality metrics display using `audioProcessor.getQualityMetrics()`

### meetings.js Integration
- Replace `startMeetingRecording()` with `audioProcessor.startPresentialRecording()` or `startOnlineRecording()`
- Replace `stopMeetingRecording()` with `audioProcessor.stopRecording()`
- Replace waveform visualization with `audioProcessor.setupVisualizer()`
- Add quality metrics display using `audioProcessor.getQualityMetrics()`

### index.html Integration
- Add `<script src="audio-processor.js"></script>` before app.js and meetings.js

---

## Non-Functional Requirements

### Performance
- Visualization must maintain 60 FPS during recording
- Quality metrics update must not cause UI lag
- Compression must complete within 5 seconds for typical audio files
- Preprocessing must complete within 3 seconds for typical audio files

### Compatibility
- Must work in Chrome, Firefox, Safari, Edge (latest versions)
- Must support both HTTP and HTTPS
- Must work in PWA mode (offline capable)

### Reliability
- Recording must not lose audio data
- Compression must not corrupt audio
- Error handling must prevent application crashes
- Cleanup must properly release resources (streams, AudioContext)

### Security
- No audio data should be sent to external services except Groq API
- Audio processing should happen client-side only
- No sensitive data should be logged

---

## Success Criteria

1. ✅ AudioProcessor is successfully integrated in app.js and meetings.js
2. ✅ Audio quality is improved (48kHz capture, preprocessing, compression)
3. ✅ File size is reduced by at least 35% through compression
4. ✅ Visualization works with multiple styles (bars, waveform, circular)
5. ✅ Quality metrics are displayed in real-time during recording
6. ✅ Transcription quality is equal or better than before
7. ✅ All error cases are handled gracefully
8. ✅ System works in all major browsers
9. ✅ No breaking changes to existing functionality
10. ✅ Documentation is complete and clear
