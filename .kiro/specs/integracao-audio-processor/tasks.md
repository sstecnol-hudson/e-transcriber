# Implementation Plan: Integração Audio Processor no E-Transcriber

## Overview

Este plano implementa a integração do módulo `audio-processor.js` (1.000+ linhas) no E-Transcriber em 10 fases sequenciais. O objetivo é melhorar qualidade de captura de áudio, reduzir tamanho de arquivo em 40% com compressão inteligente, fornecer visualização em tempo real e monitorar qualidade de áudio, mantendo compatibilidade total com a API Groq.

**Linguagem de Implementação**: JavaScript (ES6+)

---

## Tasks

### FASE 1: Setup Inicial (1-2 horas)

- [x] 1.1 Adicionar script tag audio-processor.js em index.html
  - Localizar a posição correta em index.html (antes de app.js e meetings.js)
  - Adicionar `<script src="audio-processor.js"></script>` na linha apropriada
  - Verificar que arquivo audio-processor.js existe no diretório raiz
  - Testar no console que `AudioProcessor`, `AudioVisualizer` e `AudioQualityMonitor` estão disponíveis
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.2 Criar instância global AppState.audioProcessor em app.js
  - Adicionar `AppState.audioProcessor = new AudioProcessor();` na função `init()` após inicializar AppState
  - Adicionar `AppState.recordingState = {};` para armazenar estado de gravação
  - Verificar que instância está acessível globalmente
  - _Requirements: 1.1, 1.2_

- [x] 1.3 Criar instância global MeetingState.audioProcessor em meetings.js
  - Adicionar `MeetingState.audioProcessor = new AudioProcessor();` na função `initMeetingModule()`
  - Adicionar `MeetingState.recordingState = {};` para armazenar estado de gravação
  - Verificar que instância está acessível globalmente
  - _Requirements: 2.1, 2.2_

### FASE 2: Integração app.js - Gravação Presencial (2-3 horas)

- [x] 2.1 Substituir startRecording() para usar audioProcessor.startPresentialRecording()
  - Remover código antigo de gravação presencial em `startRecording()`
  - Implementar chamada a `AppState.audioProcessor.startPresentialRecording()`
  - Adicionar validação de API key antes de iniciar
  - Tratar resultado com sucesso/erro
  - _Requirements: 1.1, 1.3, 1.7, 10.1_

- [x] 2.2 Substituir stopRecording() para usar audioProcessor.stopRecording()
  - Remover código antigo de parada de gravação
  - Implementar chamada a `AppState.audioProcessor.stopRecording()`
  - Obter blob com `AppState.audioProcessor.getRecordedAudioBlob()`
  - Passar blob para `sendAudioToWhisper()` sem modificação
  - _Requirements: 1.1, 1.5_

- [x] 2.3 Implementar setupVisualizer() com canvas existente
  - Chamar `AppState.audioProcessor.setupVisualizer(canvas, stream)` após iniciar gravação
  - Iniciar visualizador com estilo 'bars': `visualizer.start('bars')`
  - Armazenar referência em `AppState.recordingState.visualizer`
  - Parar visualizador ao parar gravação: `visualizer.stop()`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2, 9.3_

- [x] 2.4 Implementar startQualityMonitoring() com atualização a cada 500ms
  - Chamar `AppState.audioProcessor.startQualityMonitoring()` após iniciar gravação
  - Criar intervalo que chama `AppState.audioProcessor.getQualityMetrics()` a cada 500ms
  - Chamar `updateQualityDisplay(metrics)` com métricas retornadas
  - Armazenar intervalo em `AppState.recordingState.qualityInterval`
  - Limpar intervalo ao parar gravação
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 2.5 Adicionar compressão antes de enviar para Groq
  - Após parar gravação, chamar `AppState.audioProcessor.compressAudio(audioBlob)`
  - Usar blob comprimido se sucesso, caso contrário usar original
  - Validar tamanho com `AppState.audioProcessor.validateFileSize(blob, 25)`
  - Passar blob final para `sendAudioToWhisper()`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 8.1, 8.2, 8.3_

- [~] 2.6 Testar gravação presencial completa
  - Gravar áudio presencial de 30 segundos
  - Verificar que visualizador renderiza corretamente
  - Verificar que métricas de qualidade são exibidas
  - Verificar que áudio é comprimido
  - Verificar que transcrição funciona corretamente
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

### FASE 3: Integração app.js - Gravação Telemedicina (1-2 horas)

- [-] 3.1 Substituir startTelemedicineRecording() para usar audioProcessor.startOnlineRecording()
  - Remover código antigo de gravação online
  - Implementar chamada a `AppState.audioProcessor.startOnlineRecording()`
  - Adicionar validação de API key
  - Tratar resultado com sucesso/erro
  - _Requirements: 1.2, 1.3, 1.7, 10.1_

- [~] 3.2 Testar combinação de áudio (mic + tela)
  - Iniciar gravação online
  - Compartilhar tela com áudio
  - Verificar que áudio do microfone e da tela são capturados
  - Verificar que transcrição inclui ambos os áudios
  - _Requirements: 1.2, 1.3, 1.4_

- [~] 3.3 Testar fallback para mic-only se tela não disponível
  - Iniciar gravação online
  - Cancelar compartilhamento de tela
  - Verificar que gravação continua com microfone apenas
  - Verificar que transcrição funciona
  - _Requirements: 1.2, 2.5, 10.2, 10.3_

### FASE 4: Integração meetings.js (2-3 horas)

- [-] 4.1 Substituir startMeetingRecording() para usar audioProcessor
  - Remover código antigo de gravação de reuniões
  - Implementar chamada a `MeetingState.audioProcessor.startPresentialRecording()` ou `startOnlineRecording()`
  - Adicionar validação de API key
  - Tratar resultado com sucesso/erro
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4.2 Substituir stopMeetingRecording() para usar audioProcessor
  - Remover código antigo de parada
  - Implementar chamada a `MeetingState.audioProcessor.stopRecording()`
  - Obter blob com `MeetingState.audioProcessor.getRecordedAudioBlob()`
  - Comprimir e enviar para Groq
  - _Requirements: 2.1, 2.2, 2.3_

- [~] 4.3 Implementar visualizador e monitoramento de qualidade para reuniões
  - Chamar `MeetingState.audioProcessor.setupVisualizer()` após iniciar gravação
  - Implementar monitoramento de qualidade com intervalo de 500ms
  - Chamar `updateMeetingQualityDisplay(metrics)` com métricas
  - Parar visualizador ao parar gravação
  - _Requirements: 2.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 11.1, 11.2, 11.3, 11.4, 11.5_

- [~] 4.4 Testar gravação de reuniões presencial
  - Gravar reunião presencial de 30 segundos
  - Verificar que visualizador funciona
  - Verificar que métricas são exibidas
  - Verificar que ata é gerada corretamente
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [~] 4.5 Testar gravação de reuniões online
  - Gravar reunião online com compartilhamento de tela
  - Verificar que áudio do microfone e da tela são capturados
  - Verificar que ata inclui informações de ambos os áudios
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

### FASE 5: UI/UX - Seletor de Visualização (1 hora)

- [~] 5.1 Adicionar HTML para seletor de estilo de visualização
  - Adicionar div com id `visualizationControls` em index.html dentro de `capture-panel-record`
  - Adicionar 3 botões: "Barras", "Waveform", "Circular"
  - Adicionar atributo `data-style` em cada botão
  - _Requirements: 4.1, 4.2_

- [~] 5.2 Adicionar CSS para botões de seleção
  - Adicionar estilos para `.visualization-controls` em styles.css
  - Adicionar estilos para `.viz-btn` e `.viz-btn.active`
  - Adicionar transições suaves
  - _Requirements: 4.1, 4.2_

- [~] 5.3 Implementar JavaScript para mudar estilo em tempo real
  - Adicionar event listeners em botões de visualização
  - Chamar `AppState.recordingState.visualizer.style = style` ao clicar
  - Atualizar classe `active` do botão
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [~] 5.4 Testar transição suave entre estilos
  - Iniciar gravação
  - Clicar em cada estilo de visualização
  - Verificar que visualização muda sem interrupção
  - Verificar que gravação continua normalmente
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

### FASE 6: UI/UX - Painel de Qualidade (1 hora)

- [~] 6.1 Adicionar HTML para painel de métricas
  - Adicionar div com id `qualityMetricsPanel` em index.html
  - Adicionar elementos para: Qualidade, Ruído, Clipping, Pico
  - Adicionar ids para cada valor: `qualityValue`, `noiseValue`, `clippingValue`, `peakValue`
  - _Requirements: 5.1, 5.2_

- [~] 6.2 Adicionar CSS com cores (verde, amarelo, vermelho)
  - Adicionar estilos para `.quality-metrics-panel` em styles.css
  - Adicionar classes `.excellent`, `.good`, `.fair`, `.poor` com cores apropriadas
  - Verde para excellent/good, amarelo para fair, vermelho para poor
  - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [~] 6.3 Implementar atualização de métricas a cada 500ms
  - Criar função `updateQualityDisplay(metrics)` em app.js
  - Atualizar valores de cada métrica
  - Atualizar classe de cor baseado em qualidade
  - Mostrar painel quando gravação ativa
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [~] 6.4 Testar exibição correta de valores
  - Iniciar gravação
  - Verificar que painel é exibido
  - Verificar que valores são atualizados a cada 500ms
  - Verificar que cores mudam corretamente
  - Verificar que painel é ocultado ao parar gravação
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

### FASE 7: Tratamento de Erros (1-2 horas)

- [~] 7.1 Implementar tratamento de NotAllowedError
  - Capturar erro `NotAllowedError` em startRecording() e startTelemedicineRecording()
  - Exibir mensagem: "Permissão negada. Verifique as permissões de microfone."
  - Permitir retry
  - _Requirements: 10.1, 10.8_

- [~] 7.2 Implementar tratamento de NotFoundError
  - Capturar erro `NotFoundError` em startRecording() e startTelemedicineRecording()
  - Exibir mensagem: "Nenhum dispositivo de áudio encontrado."
  - Desabilitar botões de gravação
  - _Requirements: 10.2, 10.8_

- [~] 7.3 Implementar tratamento de NotReadableError
  - Capturar erro `NotReadableError` em startRecording() e startTelemedicineRecording()
  - Exibir mensagem: "Não foi possível acessar o dispositivo de áudio."
  - Permitir retry
  - _Requirements: 10.3, 10.8_

- [~] 7.4 Implementar tratamento de arquivo > 25MB
  - Validar tamanho em `sendAudioToWhisper()` e `sendMeetingAudioToWhisper()`
  - Exibir mensagem com tamanho real do arquivo
  - Sugerir compressão
  - _Requirements: 8.1, 8.2, 8.3, 10.4_

- [~] 7.5 Implementar fallbacks para compressão/pré-processamento
  - Se compressão falhar, usar blob original
  - Se pré-processamento falhar, usar blob original
  - Log warning em console
  - _Requirements: 6.5, 7.5, 10.5, 10.6_

- [~] 7.6 Testar todos os cenários de erro
  - Testar negação de permissão de microfone
  - Testar sem dispositivo de áudio
  - Testar arquivo > 25MB
  - Testar compressão com arquivo corrompido
  - Verificar que mensagens de erro são claras
  - Verificar que aplicação não quebra
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

### FASE 8: Testes (2-3 horas)

- [~] 8.1 Escrever unit tests para AudioProcessor
  - Testar `initAudioContext()` retorna AudioContext válido
  - Testar `getAudioConstraints()` retorna constraints corretos
  - Testar `validateFileSize()` com arquivo > 25MB
  - Testar `getErrorMessage()` com diferentes erros
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.1, 8.2, 8.3_

- [~] 8.2 Escrever unit tests para AudioVisualizer
  - Testar `start()` com diferentes estilos
  - Testar `stop()` limpa canvas
  - Testar `drawBars()`, `drawWaveform()`, `drawCircular()`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.1, 9.2, 9.3, 9.4_

- [~] 8.3 Escrever unit tests para AudioQualityMonitor
  - Testar `update()` retorna métricas válidas
  - Testar `calculateNoiseLevel()` com diferentes dados
  - Testar `detectClipping()` com picos > 240
  - Testar `determineQuality()` retorna valor válido
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9_

- [~] 8.4 Escrever integration tests para app.js
  - Testar fluxo completo: gravar → comprimir → transcrever
  - Testar fluxo telemedicina: gravar online → comprimir → transcrever
  - Testar fallback para mic-only
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5_

- [~] 8.5 Escrever E2E tests com Cypress
  - Testar gravação presencial completa
  - Testar gravação telemedicina completa
  - Testar upload de arquivo
  - Testar visualização de qualidade
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5_

- [~] 8.6 Executar todos os testes
  - Executar unit tests
  - Executar integration tests
  - Executar E2E tests
  - Verificar que todos passam
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5_

### FASE 9: Otimização e Polimento (1-2 horas)

- [~] 9.1 Verificar FPS da visualização (deve ser 60)
  - Usar DevTools para medir FPS durante gravação
  - Verificar que visualização mantém 60 FPS
  - Otimizar se necessário
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.1, 9.2, 9.3, 9.4_

- [~] 9.2 Verificar que compressão não bloqueia UI
  - Gravar áudio de 1 minuto
  - Comprimir
  - Verificar que UI permanece responsiva durante compressão
  - Verificar que não há travamentos
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [~] 9.3 Verificar limpeza de recursos (sem memory leaks)
  - Gravar e parar múltiplas vezes
  - Usar DevTools Memory para verificar leaks
  - Verificar que streams são fechados
  - Verificar que AudioContext é fechado
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.8_

- [~] 9.4 Testar em diferentes navegadores
  - Testar em Chrome (latest)
  - Testar em Firefox (latest)
  - Testar em Safari (latest)
  - Testar em Edge (latest)
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [~] 9.5 Testar em diferentes dispositivos
  - Testar em desktop
  - Testar em tablet
  - Testar em smartphone
  - Verificar que UI é responsiva
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

### FASE 10: Documentação (1 hora)

- [~] 10.1 Atualizar GUIA-AUDIO-PROCESSOR.md com exemplos de integração
  - Adicionar exemplos de uso em app.js
  - Adicionar exemplos de uso em meetings.js
  - Adicionar exemplos de compressão
  - Adicionar exemplos de pré-processamento
  - _Requirements: 14.1, 14.2, 14.3_

- [~] 10.2 Adicionar comentários no código
  - Adicionar comentários explicativos em app.js
  - Adicionar comentários explicativos em meetings.js
  - Documentar funções principais
  - _Requirements: 14.1, 14.2_

- [~] 10.3 Criar documento de troubleshooting
  - Documentar erros comuns
  - Documentar soluções
  - Documentar como debugar
  - _Requirements: 14.1, 14.4_

- [~] 10.4 Documentar mudanças em CHANGELOG
  - Adicionar entrada para integração AudioProcessor
  - Listar todas as mudanças
  - Listar melhorias de performance
  - _Requirements: 14.1, 14.5_

---

## Checkpoint Tasks

- [~] Checkpoint 1: Após Fase 1
  - Verificar que AudioProcessor está disponível globalmente
  - Verificar que instâncias foram criadas em app.js e meetings.js
  - Testar no console que classes estão acessíveis

- [~] Checkpoint 2: Após Fase 4
  - Testar gravação presencial completa
  - Testar gravação telemedicina completa
  - Testar gravação de reuniões
  - Verificar que transcrição funciona

- [~] Checkpoint 3: Após Fase 7
  - Testar todos os cenários de erro
  - Verificar que mensagens de erro são claras
  - Verificar que aplicação não quebra

- [~] Checkpoint 4: Após Fase 9
  - Testar em todos os navegadores
  - Testar em todos os dispositivos
  - Verificar performance
  - Verificar memory leaks

---

## Notes

- Todas as tarefas devem ser implementadas em JavaScript ES6+
- Manter compatibilidade com código existente
- Não fazer breaking changes
- Testar em múltiplos navegadores
- Verificar performance regularmente
- Documentar todas as mudanças
- Usar `showToast()` para mensagens de erro
- Usar `console.error()` para logs de erro
- Usar `console.warn()` para logs de aviso
- Usar `console.log()` para logs de debug

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5", "3.1", "4.1", "4.2"] },
    { "id": 2, "tasks": ["2.6", "3.2", "3.3", "4.3", "4.4", "4.5"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3", "6.1", "6.2", "6.3"] },
    { "id": 4, "tasks": ["5.4", "6.4", "7.1", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 5, "tasks": ["7.6", "8.1", "8.2", "8.3", "8.4", "8.5"] },
    { "id": 6, "tasks": ["8.6", "9.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3", "10.4"] }
  ]
}
```
