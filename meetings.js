// E-TRANSCRIBER - MÓDULO DE REUNIÕES (meetings.js)

const MeetingState = {
    audioMode: 'record',
    history: [],
    
    // Gravação
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    recordingTimerInterval: null,
    recordingDuration: 0,
    audioStream: null,
    displayStream: null,
    audioContext: null,
    dest: null,
    analyser: null,
    dataArray: null,
    source: null,
    animationFrameId: null,

    // Upload
    uploadedFile: null,

    // Saídas atuais
    currentTranscription: '',
    currentRecordOutput: ''
};

const MEETING_PROMPTS = {
    geral: `Você é um assistente corporativo especializado em redação de atas de reuniões. Sua tarefa é analisar a transcrição de uma reunião corporativa e gerar uma ata profissional bem estruturada.

Considere as informações fornecidas (Título, Tipo e Modalidade) para adequar o tom e a estrutura, mas inclua SEMPRE os seguintes pontos:

# ATA DE REUNIÃO

**1. OBJETIVO DA REUNIÃO**
Resumo claro e conciso do propósito principal da reunião.

**2. PRINCIPAIS TÓPICOS DISCUTIDOS**
- Tópico: Resumo da discussão.
(Adicione mais tópicos conforme necessário)

**3. DECISÕES TOMADAS**
- Lista clara das deliberações acordadas durante a reunião.

**4. PRÓXIMOS PASSOS E RESPONSÁVEIS (ACTION ITEMS)**
- [Ação a ser tomada] - Responsável: [Nome/Cargo] - Prazo: [Se aplicável].

DIRETRIZES IMPORTANTES:
- Seja claro, objetivo e profissional.
- Não invente informações não mencionadas na transcrição.
- Responda apenas com a ata formatada em Markdown.`,

    clinica: `Você é um assistente médico especializado em documentar discussões clínicas, reuniões médicas e revisões de casos. Sua tarefa é estruturar uma ata técnica, formal e precisa.

Considere as informações fornecidas (Título, Tipo e Modalidade) para adequar o tom e a estrutura, incluindo sempre os seguintes pontos:

# ATA DE REUNIÃO CLÍNICA

**1. OBJETIVO CLÍNICO**
Discussão principal da sessão (casos clínicos, protocolos de saúde, atualização de condutas, etc.).

**2. CASOS CLÍNICOS E SINTOMATOLOGIAS DISCUTIDOS**
- Caso/Paciente/Discussão: Sintomas, análises, diagnósticos diferenciais e histórico clínico debatidos pela equipe médica.

**3. CONDUTAS, TRATAMENTOS E PROTOCOLOS DEFINIDOS**
- Protocolo/Conduta: Diretrizes adotadas, medicamentos, terapias ou encaminhamentos acordados na reunião.

**4. AÇÕES DE ACOMPANHAMENTO E RESPONSÁVEIS**
- [Ação Clínica] - Profissional Responsável: [Nome] - Prazo: [Se aplicável].

DIRETRIZES IMPORTANTES:
- Mantenha terminologia médica formal e precisa em português do Brasil.
- Não invente informações clínicas ou diagnósticos não descritos na transcrição.
- Responda apenas com a ata formatada em Markdown.`,

    equipe: `Você é um facilitador ágil e coordenador de equipe. Sua tarefa é estruturar a ata de sincronização diária, semanal ou alinhamento operacional do time, mantendo o tom objetivo, direto e colaborativo.

Considere as informações fornecidas e inclua sempre a estrutura abaixo:

# ATA DE ALINHAMENTO DE EQUIPE

**1. OBJETIVO DO ENCONTRO**
Alinhamento das atividades e metas da equipe.

**2. ATUALIZAÇÕES INDIVIDUAIS OU DE ÁREAS**
- [Área/Nome]: O que foi realizado, prioridades atuais e o que está planejado a seguir.

**3. IMPEDIMENTOS E PONTOS DE ATENÇÃO**
- Bloqueio/Gargalo: Detalhes do problema apresentado e como a equipe pretende resolvê-lo.

**4. QUADRO DE ATIVIDADES E RESPONSABILIDADES (ACTION ITEMS)**
- [Tarefa/Ação] - Responsável: [Nome] - Prazo: [Se aplicável].

DIRETRIZES IMPORTANTES:
- Seja sucinto e focado em ação e progresso.
- Não crie conquistas ou atividades não ditas pela equipe.
- Responda apenas com a ata formatada em Markdown.`,

    tecnica: `Você é um líder técnico de engenharia / arquiteto de soluções. Sua tarefa é estruturar a ata de alinhamento de infraestrutura, desenvolvimento de software ou decisões de engenharia. O tom deve ser altamente técnico e preciso.

Considere as informações fornecidas e estruture a ata conforme abaixo:

# ATA DE REUNIÃO TÉCNICA

**1. ESCOPO E ARQUITETURA**
Problemas de engenharia discutidos, requisitos de sistema ou arquitetura analisada.

**2. DECISÕES DE TECNOLOGIA E IMPLEMENTAÇÃO**
- Decisão: Justificativa técnica, infraestrutura, APIs, códigos ou ferramentas adotadas pela equipe.

**3. IMPEDIMENTOS TÉCNICOS E SOLUÇÕES DE CONTORNO**
- Impedimento: Descrição do bug, débito técnico ou gargalo de infraestrutura e a solução combinada.

**4. TAREFAS DE DESENVOLVIMENTO (ACTION ITEMS)**
- [Ação de Engenharia/Código] - Desenvolvedor/Responsável: [Nome] - Prazo: [Se aplicável].

DIRETRIZES IMPORTANTES:
- Preserve termos técnicos (APIs, deploys, infra, etc.) mantendo a precisão das decisões de engenharia.
- Não invente bibliotecas ou decisões que não foram tomadas na discussão.
- Responda apenas com a ata formatada em Markdown.`,

    administrativa: `Você é um gestor administrativo e operacional. Sua tarefa é estruturar a ata de decisões administrativas, financeiras, de conformidade ou recursos humanos da empresa. O tom deve ser formal e documental.

Considere as informações e estruture a ata conforme abaixo:

# ATA DE REUNIÃO ADMINISTRATIVA

**1. OBJETIVO DA PAUTA**
Resumo das metas de gestão, finanças ou administração abordadas na sessão.

**2. APRESENTAÇÃO DE RELATRIOS E RESULTADOS**
- Relatório/Pauta: Dados, números de performance, orçamentos ou temas internos de recursos humanos.

**3. RESOLUÇÕES ADMINISTRATIVAS E OPERACIONAIS**
- Resolução: Regulamentos, ajustes de orçamento, contratações ou mudanças administrativas deliberadas.

**4. PRÓXIMOS PASSOS E RESPONSÁVEIS**
- [Ação Administrativa] - Responsável: [Nome/Setor] - Prazo: [Se aplicável].

DIRETRIZES IMPORTANTES:
- Mantenha um tom sóbrio, formal e documental.
- Não adicione valores financeiros ou contratações que não foram citados na gravação.
- Responda apenas com a ata formatada em Markdown.`,

    planejamento: `Você é um gerente de projetos e planejador estratégico. Sua tarefa é elaborar a ata de reuniões de planejamento de projetos, definição de cronogramas, escopos ou metas trimestrais (OKRs). O tom deve ser estratégico e focado em metas.

Considere as informações e estruture a ata conforme abaixo:

# ATA DE PLANEJAMENTO ESTRATÉGICO

**1. ESCOPO E OBJETIVOS DE PROJETO**
Descrição geral dos objetivos do projeto ou ciclo discutido.

**2. CRONOGRAMA, MARCOS (MILESTONES) E METAS**
- Milestone/Meta: Prazos principais, entregáveis definidos e métricas de sucesso (KPIs/OKRs) estabelecidas.

**3. RISCOS MAPEADOS E ESTRATÉGIAS DE MITIGAÇÃO**
- Risco: Fatores internos ou externos que podem atrasar a entrega e o plano de mitigação adotado.

**4. PLANO DE AÇÃO E CRONOGRAMA DE TAREFAS**
- [Entregável/Ação] - Responsável: [Nome] - Prazo: [Data].

DIRETRIZES IMPORTANTES:
- Mantenha foco em entregas, prazos e donos de tarefas.
- Não invente metas ou prazos arbitrários não mencionados na reunião.
- Responda apenas com a ata formatada em Markdown.`,

    assembleia: `Você é um secretário formal especialista em atas de assembleias gerais ordinárias, extraordinárias ou reuniões de acionistas/membros com valor estatutário. O tom deve ser altamente formal, legal e protocolar.

Considere as informações fornecidas e estruture a ata conforme abaixo:

# ATA DE ASSEMBLEIA GERAL

**1. ABERTURA E QUÓRUM**
Registro formal da abertura dos trabalhos da assembleia, identificação do presidente, secretário e verificação de quórum de presença.

**2. ORDEM DO DIA E DEBATES**
- Item da Ordem do Dia: Resumo dos debates, relatórios e ponderações dos participantes.

**3. DELIBERAÇÕES E VOTAÇÕES REALIZADAS**
- Deliberação: Resultado das propostas votadas (Aprovado/Rejeitado), registrando quantidade de votos a favor, contra e abstenções, se informados.

**4. ENCERRAMENTO E PRÓXIMAS ASSEMBLEIAS**
- Detalhes de encerramento da ata, lavratura e próximos passos legais necessários.

DIRETRIZES IMPORTANTES:
- Use linguagem estritamente formal, passiva e documental (ex: "Deliberou-se que...", "Aprovou-se por maioria...").
- Não invente votos, nomes ou decisões que não constem na transcrição.
- Responda apenas com a ata formatada em Markdown.`,

    diretoria: `Você é um assessor executivo especializado em reuniões de diretoria e conselhos de administração. O tom deve ser de alto nível corporativo, conciso e focado em governança e decisões corporativas.

Considere as informações fornecidas e estruture a ata conforme abaixo:

# ATA DE REUNIÃO DE DIRETORIA

**1. DIRETRIZES E PAUTAS ESTRATÉGICAS**
Ponto central e status estratégico da empresa discutidos pela diretoria.

**2. APRESENTAÇÃO DE BALANÇOS E MACROINDICADORES**
- Pauta Estratégica: Discussões de investimentos, orçamentos anuais, parcerias ou fusões em debate.

**3. DECISÕES DE GOVERNANÇA E DIRETORIAS**
- Resolução da Diretoria: Mudanças estruturais, aprovação de verba, expansão ou posicionamento de mercado deliberados.

**4. DIRETRIZES E RESPONSABILIDADES DA EXECUTIVA**
- [Macro-ação] - Diretor/Responsável: [Nome/Cargo] - Prazo: [Se aplicável].

DIRETRIZES IMPORTANTES:
- Seja sucinto e focado em tópicos de alta relevância (sem minúcias operacionais).
- Não invente orçamentos ou estratégias de negócios não descritos na transcrição.
- Responda apenas com a ata formatada em Markdown.`
};

const MeetingDOM = {
    // Captação
    btnModeRecord: document.getElementById('btn-meeting-mode-record'),
    btnModeUpload: document.getElementById('btn-meeting-mode-upload'),
    panelRecord: document.getElementById('capture-meeting-panel-record'),
    panelUpload: document.getElementById('capture-meeting-panel-upload'),
    
    // Gravação
    waveformCanvas: document.getElementById('waveformMeetingCanvas'),
    recordingTimer: document.getElementById('recordingMeetingTimer'),
    btnRecordStart: document.getElementById('btn-meeting-record-start'),
    btnRecordOnline: document.getElementById('btn-meeting-record-online'),
    btnRecordStop: document.getElementById('btn-meeting-record-stop'),

    // Upload
    audioDropZone: document.getElementById('audioMeetingDropZone'),
    audioFileInput: document.getElementById('audioMeetingFileInput'),
    fileInfoContainer: document.getElementById('file-meeting-info-container'),
    uploadedFileName: document.getElementById('uploaded-meeting-file-name'),
    uploadedFileSize: document.getElementById('uploaded-meeting-file-size'),
    btnClearFile: document.getElementById('btn-clear-meeting-file'),
    btnProcessUpload: document.getElementById('btn-process-meeting-upload'),

    // Transcrição
    rawTranscript: document.getElementById('rawMeetingTranscript'),
    transcriptionLoader: document.getElementById('meeting-transcription-loader'),
    transcriptionLoaderText: document.getElementById('meeting-transcription-loader-text'),
    aiModel: document.getElementById('aiMeetingModel'),
    btnGenerateDocs: document.getElementById('btn-generate-meeting-docs'),

    // Resultados
    resultsSection: document.getElementById('meeting-results-section'),
    outputRecord: document.getElementById('outputMeetingRecord'),
    ataLoader: document.getElementById('ata-loader'),
    btnCopyRecord: document.getElementById('btn-copy-meeting-record'),
    btnDownloadPdf: document.getElementById('btn-download-meeting-pdf'),
    actionsSaveRow: document.getElementById('actions-meeting-save-row'),
    btnSaveMeeting: document.getElementById('btn-save-meeting'),

    // Form
    meetingTitle: document.getElementById('meetingTitle'),
    meetingType: document.getElementById('meetingType'),
    meetingModality: document.getElementById('meetingModality'),
    meetingLang: document.getElementById('meetingLang'),

    // History
    historyTableBody: document.getElementById('meetingHistoryTableBody'),
    searchMeetingHistory: document.getElementById('searchMeetingHistory'),
    btnClearMeetingHistory: document.getElementById('btn-clear-meeting-history')
};

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================
function initMeetingModule() {
    try { MeetingState.history = JSON.parse(localStorage.getItem('etranscriber_meetings_history')) || []; } catch { MeetingState.history = []; }

    // Re-resolver todos os elementos do DOM incondicionalmente para evitar referências nulas
    console.log('[MeetingModule] Resolvendo elementos DOM...');
    MeetingDOM.btnModeRecord = document.getElementById('btn-meeting-mode-record');
    MeetingDOM.btnModeUpload = document.getElementById('btn-meeting-mode-upload');
    MeetingDOM.panelRecord = document.getElementById('capture-meeting-panel-record');
    MeetingDOM.panelUpload = document.getElementById('capture-meeting-panel-upload');
    MeetingDOM.waveformCanvas = document.getElementById('waveformMeetingCanvas');
    MeetingDOM.recordingTimer = document.getElementById('recordingMeetingTimer');
    MeetingDOM.btnRecordStart = document.getElementById('btn-meeting-record-start');
    MeetingDOM.btnRecordOnline = document.getElementById('btn-meeting-record-online');
    MeetingDOM.btnRecordStop = document.getElementById('btn-meeting-record-stop');
    MeetingDOM.audioDropZone = document.getElementById('audioMeetingDropZone');
    MeetingDOM.audioFileInput = document.getElementById('audioMeetingFileInput');
    MeetingDOM.fileInfoContainer = document.getElementById('file-meeting-info-container');
    MeetingDOM.uploadedFileName = document.getElementById('uploaded-meeting-file-name');
    MeetingDOM.uploadedFileSize = document.getElementById('uploaded-meeting-file-size');
    MeetingDOM.btnClearFile = document.getElementById('btn-clear-meeting-file');
    MeetingDOM.btnProcessUpload = document.getElementById('btn-process-meeting-upload');
    MeetingDOM.rawTranscript = document.getElementById('rawMeetingTranscript');
    MeetingDOM.transcriptionLoader = document.getElementById('meeting-transcription-loader');
    MeetingDOM.transcriptionLoaderText = document.getElementById('meeting-transcription-loader-text');
    MeetingDOM.aiModel = document.getElementById('aiMeetingModel');
    MeetingDOM.btnGenerateDocs = document.getElementById('btn-generate-meeting-docs');
    MeetingDOM.resultsSection = document.getElementById('meeting-results-section');
    MeetingDOM.outputRecord = document.getElementById('outputMeetingRecord');
    MeetingDOM.ataLoader = document.getElementById('ata-loader');
    MeetingDOM.btnCopyRecord = document.getElementById('btn-copy-meeting-record');
    MeetingDOM.btnDownloadPdf = document.getElementById('btn-download-meeting-pdf');
    MeetingDOM.actionsSaveRow = document.getElementById('actions-meeting-save-row');
    MeetingDOM.btnSaveMeeting = document.getElementById('btn-save-meeting');
    MeetingDOM.meetingTitle = document.getElementById('meetingTitle');
    MeetingDOM.meetingType = document.getElementById('meetingType');
    MeetingDOM.meetingModality = document.getElementById('meetingModality');
    MeetingDOM.meetingLang = document.getElementById('meetingLang');
    MeetingDOM.historyTableBody = document.getElementById('meetingHistoryTableBody');
    MeetingDOM.searchMeetingHistory = document.getElementById('searchMeetingHistory');
    MeetingDOM.btnClearMeetingHistory = document.getElementById('btn-clear-meeting-history');

    // Inicializar AudioProcessor
    MeetingState.audioProcessor = new AudioProcessor();
    MeetingState.recordingState = {};
    
    setupMeetingEventListeners();
    drawMeetingStaticWaveform();
    renderMeetingHistory();
    if (typeof toggleAiButtonsState === 'function') toggleAiButtonsState();
}

// ==========================================================================
// ÁUDIO MODO (Record vs Upload)
// ==========================================================================
function setMeetingAudioMode(mode) {
    MeetingState.audioMode = mode;
    MeetingDOM.btnModeRecord.classList.toggle('active', mode === 'record');
    MeetingDOM.btnModeUpload.classList.toggle('active', mode === 'upload');
    MeetingDOM.panelRecord.classList.toggle('active', mode === 'record');
    MeetingDOM.panelUpload.classList.toggle('active', mode === 'upload');
}

// ==========================================================================
// GRAVAÇÃO DE REUNIÕES
// ==========================================================================
async function startMeetingRecording(isOnline = false) {
    if (!AppState.apiKey) {
        showToast('Configure sua chave Groq nas Configurações primeiro!');
        switchTab('tab-config');
        return;
    }

    try {
        let result;
        
        if (!isOnline) {
            // Gravação presencial - usar audioProcessor
            result = await MeetingState.audioProcessor.startPresentialRecording();
        } else {
            // Gravação online - usar audioProcessor
            result = await MeetingState.audioProcessor.startOnlineRecording();
            if (result.success) {
                MeetingState.audioProcessor.onDisplayStreamEnded = () => {
                    console.log('[Meetings] Screen sharing stopped by user, ending recording...');
                    stopMeetingRecording();
                };
            }
        }

        if (!result.success) {
            showToast(result.message);
            return;
        }

        // Configurar visualizador
        const canvas = MeetingDOM.waveformCanvas;
        const visualizer = MeetingState.audioProcessor.setupVisualizer(canvas, result.stream);
        visualizer.start('bars');

        // Iniciar monitoramento de qualidade
        const qualityMonitor = MeetingState.audioProcessor.startQualityMonitoring();
        const qualityInterval = setInterval(() => {
            const metrics = MeetingState.audioProcessor.getQualityMetrics();
            updateMeetingQualityDisplay(metrics);
            // Atualizar VU Meter de reuniões
            if (typeof updateVuMeter === 'function') {
                updateVuMeter('vu-meter-reuniao', MeetingState.audioProcessor.getVolumeLevelPercent());
            }
        }, 80);

        // Iniciar timer
        MeetingState.recordingStartTime = Date.now();
        MeetingState.recordingTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - MeetingState.recordingStartTime) / 1000);
            const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const s = (elapsed % 60).toString().padStart(2, '0');
            MeetingDOM.recordingTimer.textContent = `${m}:${s}`;
        }, 1000);

        // Atualizar UI
        MeetingDOM.btnRecordStart.disabled = true;
        MeetingDOM.btnRecordOnline.disabled = true;
        MeetingDOM.btnRecordStop.disabled = false;
        // Mostrar VU Meter de reuniões
        const vuReuniao = document.getElementById('vu-meter-reuniao');
        if (vuReuniao) vuReuniao.classList.remove('hidden');

        // Armazenar estado
        MeetingState.recordingState = {
            visualizer,
            qualityInterval,
            qualityMonitor
        };

        if (isOnline && !result.systemAudioActive) {
            showToast('⚠️ Áudio do sistema não compartilhado. Gravando apenas microfone.', 5000);
        } else {
            showToast(isOnline ? 'Gravação de Reunião Online iniciada.' : 'Gravação de Reunião Presencial iniciada.');
        }
    } catch (err) {
        console.error('Erro ao iniciar gravação de reunião:', err);
        showToast(`Erro: ${err.message}`);
    }
}

function drawMeetingStaticWaveform() {
    const canvas = MeetingDOM.waveformCanvas;
    // Corrigir resolução em telas HiDPI (retina)
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.offsetWidth || 300;
    const cssHeight = 80;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const { width, height } = { width: cssWidth, height: cssHeight };
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 2;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(99, 102, 241, 0.4)';
    const spacing = 12;
    for (let i = 0; i < Math.floor(width / spacing); i++) {
        ctx.fillRect(i * spacing + (spacing / 2), height / 2 - 2, 4, 4);
    }
}

async function stopMeetingRecording() {
    if (!MeetingState.audioProcessor.isRecording) return;

    try {
        // 1. Parar gravação (AudioContext permanece aberto para processamento)
        // stopRecording() retorna uma Promise que resolve após o evento 'stop'
        // do MediaRecorder, garantindo que todos os chunks estejam disponíveis.
        const result = await MeetingState.audioProcessor.stopRecording();
        if (!result || !result.success) {
            showToast('Erro ao parar gravação');
            return;
        }

        // 2. Limpar UI de gravação
        clearInterval(MeetingState.recordingTimerInterval);
        clearInterval(MeetingState.recordingState.qualityInterval);
        MeetingState.recordingState.visualizer?.stop();

        // Validar duração mínima (Item 4)
        if (result.duration < 3000) {
            showToast('⚠️ Gravação muito curta (mínimo 3 segundos). Tente novamente.');
            await MeetingState.audioProcessor.cleanup().catch(() => {});
            
            MeetingDOM.btnRecordStart.disabled = false;
            MeetingDOM.btnRecordOnline.disabled = false;
            MeetingDOM.btnRecordStop.disabled = true;
            MeetingDOM.recordingTimer.textContent = '00:00';
            drawMeetingStaticWaveform();
            return;
        }

        // 3. Obter blob bruto
        const audioBlob = MeetingState.audioProcessor.getRecordedAudioBlob();

        // 4. Pré-processamento (filtros de voz: passa-alta, normalização, compressor)
        showToast('⏳ Pré-processando áudio...');
        const preprocessed = await MeetingState.audioProcessor.preprocessAudio(audioBlob);
        const preprocessedBlob = preprocessed.success ? preprocessed.blob : audioBlob;
        if (!preprocessed.success) {
            console.warn('Pré-processamento falhou, usando áudio original:', preprocessed.error);
        }

        // 5. Compressão para reduzir tamanho (16kHz, WAV)
        showToast('⏳ Comprimindo áudio...');
        const compressed = await MeetingState.audioProcessor.compressAudio(preprocessedBlob);
        const finalBlob = compressed.success ? compressed.blob : preprocessedBlob;

        // 6. Liberar AudioContext e recursos (processamento concluído)
        await MeetingState.audioProcessor.cleanup();

        // 7. Validar tamanho do arquivo resultante (máximo 25MB para Groq)
        const validation = MeetingState.audioProcessor.validateFileSize(finalBlob, 25);
        if (!validation.valid) {
            showToast(validation.message);
            MeetingDOM.btnRecordStart.disabled = false;
            MeetingDOM.btnRecordOnline.disabled = false;
            MeetingDOM.btnRecordStop.disabled = true;
            MeetingDOM.recordingTimer.textContent = '00:00';
            return;
        }

        // 8. Enviar para Groq Whisper
        // Garantir que finalBlob seja um File nomeado corretamente
        const fileExt = finalBlob.type.includes('wav') ? 'wav' : 'webm';
        const audioFile = finalBlob instanceof File
            ? finalBlob
            : new File([finalBlob], `reuniao_${Date.now()}.${fileExt}`, { type: finalBlob.type });
        await sendMeetingAudioToWhisper(audioFile);

        // 9. Resetar UI
        MeetingDOM.btnRecordStart.disabled = false;
        MeetingDOM.btnRecordOnline.disabled = false;
        MeetingDOM.btnRecordStop.disabled = true;
        MeetingDOM.recordingTimer.textContent = '00:00';
    } catch (err) {
        console.error('Erro ao parar gravação de reunião:', err);
        // Garantir limpeza mesmo em caso de erro
        await MeetingState.audioProcessor.cleanup().catch(() => {});
        showToast(`Erro: ${err.message}`);

        // Resetar UI mesmo com erro
        MeetingDOM.btnRecordStart.disabled = false;
        MeetingDOM.btnRecordOnline.disabled = false;
        MeetingDOM.btnRecordStop.disabled = true;
        MeetingDOM.recordingTimer.textContent = '00:00';
    }
}

// ==========================================================================
// MONITORAMENTO DE QUALIDADE DE ÁUDIO PARA REUNIÕES
// ==========================================================================
function updateMeetingQualityDisplay(metrics) {
    const qualityPanel = document.getElementById('quality-meeting-metrics-panel');
    const vizControls = document.getElementById('meeting-visualization-controls');
    
    if (!qualityPanel || !vizControls) return;
    
    // Mostrar painéis
    qualityPanel.classList.remove('hidden');
    vizControls.classList.remove('hidden');

    // Determinar cor baseado na qualidade
    let qualityColor = '#10b981'; // green - excellent
    let qualityText = 'EXCELENTE';
    
    if (metrics && metrics.clipping) {
        qualityColor = '#ef4444'; // red - poor
        qualityText = 'RUIM';
    } else if (metrics && metrics.noiseLevel > 100) {
        qualityColor = '#f59e0b'; // yellow - fair
        qualityText = 'RAZOÁVEL';
    } else if (metrics && metrics.noiseLevel > 50) {
        qualityColor = '#10b981'; // green - good
        qualityText = 'BOM';
    }

    // Atualizar valores
    const qualityValue = document.getElementById('meetingQualityValue');
    const noiseValue = document.getElementById('meetingNoiseValue');
    const clippingValue = document.getElementById('meetingClippingValue');
    const peakValue = document.getElementById('meetingPeakValue');

    if (qualityValue) {
        qualityValue.textContent = qualityText;
        qualityValue.style.color = qualityColor;
    }
    if (noiseValue) noiseValue.textContent = metrics ? metrics.noiseLevel : '0';
    if (clippingValue) clippingValue.textContent = metrics ? (metrics.clipping ? 'SIM' : 'NÃO') : 'NÃO';
    if (peakValue) peakValue.textContent = metrics ? metrics.peakLevel : '0';
}

// ==========================================================================
// UPLOAD DE ARQUIVOS DE REUNIÃO
// ==========================================================================
function handleMeetingFileSelection(file) {
    if (!file) return;
    
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB — chunking automático acima deste limite
    if (file.size > MAX_SIZE) {
        showToast(`⚠️ Arquivo grande (${(file.size/1024/1024).toFixed(1)}MB). Será dividido automaticamente em partes para transcrição.`, 5000);
    }
    
    MeetingState.uploadedFile = file;
    MeetingDOM.uploadedFileName.textContent = file.name;
    MeetingDOM.uploadedFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    MeetingDOM.fileInfoContainer.classList.remove('hidden');
    if (typeof toggleAiButtonsState === 'function') toggleAiButtonsState();
    showToast('✅ Arquivo da reunião carregado.');
}

function clearMeetingUploadedFile() {
    MeetingState.uploadedFile = null;
    MeetingDOM.audioFileInput.value = '';
    MeetingDOM.fileInfoContainer.classList.add('hidden');
    if (typeof toggleAiButtonsState === 'function') toggleAiButtonsState();
}

// ==========================================================================
// CHAMADAS DA API DO GROQ (Whisper + Llama)

// Função utilitária para gerar hash SHA-256 do Blob de áudio
async function getAudioHash(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Wrapper de transcrição que verifica cache antes de chamar a API Groq
async function transcribeWithCache(blob, language = 'pt') {
  const hash = await getAudioHash(blob);
  const cacheKey = `groq_whisper_${hash}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    console.log('🔄 Transcrição carregada do cache');
    return cached;
  }
  const formData = new FormData();
  // Garante nome de arquivo correto para o Whisper aceitar
  const filename = (blob instanceof File && blob.name)
      ? blob.name
      : (blob.type && blob.type.includes('wav') ? 'audio.wav' : 'audio.webm');
  formData.append('file', blob, filename);
  formData.append('model', GROQ_TRANSCRIBE_MODEL);
  formData.append('language', language);
  formData.append('response_format', 'json');
  // Usar timeout de 90s para transcrição (arquivos podem ser grandes)
  const res = await fetchWithRetry('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AppState.apiKey}` },
    body: formData,
    timeout: 90000
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Transcrição Groq falhou (${res.status}): ${errText}`);
  }
  const data = await res.json();
  localStorage.setItem(cacheKey, data.text);
  return data.text;
}

// ==========================================================================
// A função obsoleta processMeetingRecordedAudio foi removida.
// O processamento agora ocorre no stopMeetingRecording.

async function sendMeetingAudioToWhisper(file) {
    if (!AppState.apiKey) { showToast('Chave de API do Groq ausente!'); return; }

    MeetingDOM.transcriptionLoader.classList.remove('hidden');
    MeetingDOM.transcriptionLoaderText.textContent = '⏳ Verificando áudio...';
    MeetingDOM.rawTranscript.value = '';
    MeetingState.currentTranscription = '';

    // Ocultar VU Meter ao término da gravação
    const vuReuniao = document.getElementById('vu-meter-reuniao');
    if (vuReuniao) {
        if (typeof updateVuMeter === 'function') updateVuMeter('vu-meter-reuniao', 0);
        vuReuniao.classList.add('hidden');
    }

    try {
        const MAX_CHUNK_MB = 20;
        const MAX_SIZE_BYTES = 24 * 1024 * 1024;
        let transcriptText = '';

        // Chunking automático: se o arquivo exceder 24MB, dividir em partes
        if (file.size > MAX_SIZE_BYTES && MeetingState.audioProcessor) {
            showToast('⏳ Áudio longo — dividindo em partes...');
            const chunks = await MeetingState.audioProcessor.splitAudioBlob(file, MAX_CHUNK_MB);
            const texts = [];
            for (let i = 0; i < chunks.length; i++) {
                MeetingDOM.transcriptionLoaderText.textContent = `⏳ Transcrevendo parte ${i + 1} de ${chunks.length}...`;
                const ext = chunks[i].type.includes('wav') ? 'wav' : 'webm';
                const chunkFile = new File([chunks[i]], `reuniao_parte${i + 1}.${ext}`, { type: chunks[i].type });
                const text = await transcribeWithCache(chunkFile, MeetingDOM.meetingLang.value);
                texts.push(text);
            }
            transcriptText = texts.join('\n\n');
            showToast(`✅ Transcrição concluída (${chunks.length} partes)!`);
        } else {
            MeetingDOM.transcriptionLoaderText.textContent = 'Transcrevendo áudio via Groq Whisper...';
            transcriptText = await transcribeWithCache(file, MeetingDOM.meetingLang.value);
            showToast(transcriptText?.trim() ? '✅ Transcrição da reunião concluída!' : 'Aviso: nenhum áudio detectado.');
        }

        MeetingDOM.rawTranscript.value = transcriptText;
        MeetingState.currentTranscription = transcriptText;
        if (typeof toggleAiButtonsState === 'function') toggleAiButtonsState();
    } catch (err) {
        MeetingDOM.rawTranscript.value = `Erro: ${err.message}`;
        showToast(err.message || 'Erro ao transcrever áudio.');
        console.error(err);
    } finally {
        MeetingDOM.transcriptionLoader.classList.add('hidden');
    }
}

async function generateMeetingMinutes() {
    const rawText = MeetingDOM.rawTranscript.value.trim();
    if (!rawText) { showToast('Transcreva ou escreva um texto antes!'); return; }
    if (!AppState.apiKey) { showToast('Configure sua chave Groq nas Configurações!'); return; }

    MeetingDOM.resultsSection.classList.remove('hidden');
    MeetingDOM.ataLoader.classList.remove('hidden');
    MeetingDOM.actionsSaveRow.classList.add('hidden');
    MeetingDOM.outputRecord.value = '';
    setTimeout(() => MeetingDOM.resultsSection.scrollIntoView({ behavior: 'smooth' }), 100);

    const mTitle = MeetingDOM.meetingTitle.value.trim() || 'Reunião';
    const mType = MeetingDOM.meetingType.options[MeetingDOM.meetingType.selectedIndex].text;
    const mMod = MeetingDOM.meetingModality.options[MeetingDOM.meetingModality.selectedIndex].text;
    const model = MeetingDOM.aiModel.value;
    
    const userContent = `DADOS DA REUNIÃO:\nTítulo: ${mTitle}\nTipo: ${mType}\nModalidade: ${mMod}\n\nTRANSCRIÇÃO:\n${rawText}`;

    // Evitar cliques duplos
    MeetingDOM.btnGenerateDocs.disabled = true;

    const selectedType = MeetingDOM.meetingType.value;
    const systemPrompt = MEETING_PROMPTS[selectedType] || MEETING_PROMPTS['geral'];

    try {
        const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AppState.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: model, 
                messages: [
                    { role: 'system', content: systemPrompt }, 
                    { role: 'user', content: userContent }
                ], 
                temperature: 0.1 
            }),
            timeout: 45000 // 45 segundos
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText);
        }

        const data = await res.json();
        MeetingDOM.outputRecord.value = data.choices[0].message.content || '';
        MeetingState.currentRecordOutput = MeetingDOM.outputRecord.value;

        MeetingDOM.actionsSaveRow.classList.remove('hidden');
        showToast('Ata de reunião gerada com sucesso!');
    } catch (err) {
        showToast(`Erro API Groq: ${err.message}`);
        console.error(err);
    } finally {
        MeetingDOM.ataLoader.classList.add('hidden');
        if (typeof toggleAiButtonsState === 'function') toggleAiButtonsState();
    }
}

// ==========================================================================
// PDF DA REUNIÃO
// ==========================================================================
function generateMeetingPDF() {
    const recordText = MeetingDOM.outputRecord.value.trim();
    if (!recordText) {
        showToast('Nenhuma ata gerada para exportar!');
        return;
    }

    try {
        if (typeof window.jspdf === 'undefined') {
            showToast('Biblioteca jsPDF não carregada. Recarregue a página.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const contentWidth = pageWidth - marginX * 2;
    let y = 0;

    // Cabeçalho
    doc.setFillColor(15, 23, 42); // Darker blue for corporate feel
    doc.rect(0, 0, pageWidth, 28, 'F');

    const companyName = AppState.meetingCompanyInfo?.name || AppState.clinicInfo?.name || 'Empresa';
    const mType = (MeetingDOM.meetingType && MeetingDOM.meetingType.options && MeetingDOM.meetingType.selectedIndex !== -1)
        ? MeetingDOM.meetingType.options[MeetingDOM.meetingType.selectedIndex].text
        : 'Reunião';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('ATA DE REUNIÃO - ' + companyName, marginX, 17);

    y = 36;

    // Dados
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(marginX, y, contentWidth, 28, 2, 2, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DADOS DA REUNIÃO', marginX + 5, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const mTitle = MeetingDOM.meetingTitle.value || 'Reunião Geral';
    const mMod = MeetingDOM.meetingModality.options[MeetingDOM.meetingModality.selectedIndex].text;
    const mDate = new Date().toLocaleString('pt-BR');

    doc.text(`Título/Pauta: ${mTitle}`, marginX + 5, y + 16);
    doc.text(`Tipo: ${mType}   |   Modalidade: ${mMod}`, marginX + 5, y + 22);
    doc.text(`Data/Hora: ${mDate}`, pageWidth - marginX - 5, y + 16, { align: 'right' });

    y += 36;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 6;

    // Conteúdo
    const lines = recordText.split('\n');
    doc.setFontSize(9);

    for (const rawLine of lines) {
        if (y > pageHeight - 28) {
            doc.addPage();
            y = 18;
        }

        const line = rawLine.trim();

        if (line.startsWith('### ') || line.startsWith('## ')) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42);
            const clean = line.replace(/^#{2,3}\s/, '');
            doc.text(clean, marginX, y);
            y += 6;
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.3);
            doc.line(marginX, y - 1, pageWidth - marginX, y - 1);
            y += 2;
            doc.setFontSize(9);
        } else if (line.startsWith('# ')) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(line.replace('# ', ''), marginX, y);
            y += 7;
            doc.setFontSize(9);
        } else if (line.startsWith('- **') || line.startsWith('- ')) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            const cleanLine = line.replace(/\*\*/g, '');
            const wrapped = doc.splitTextToSize('• ' + cleanLine.replace(/^-\s/, ''), contentWidth - 4);
            doc.text(wrapped, marginX + 3, y);
            y += wrapped.length * 5;
        } else if (line.startsWith('**') && line.endsWith('**')) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(line.replace(/\*\*/g, ''), marginX, y);
            y += 5;
        } else if (line === '' || line === '---') {
            y += 4;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
            const clean = line.replace(/\*\*/g, '');
            const wrapped = doc.splitTextToSize(clean, contentWidth);
            doc.text(wrapped, marginX, y);
            y += wrapped.length * 5;
        }
    }

    // Rodapé
    const footerY = pageHeight - 14;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Ata de reunião gerada automaticamente.', marginX, footerY, { maxWidth: contentWidth * 0.75 });

        const safeName = (mTitle || 'reuniao').toLowerCase().replace(/\s+/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);
        doc.save(`ata_${safeName}_${dateStr}.pdf`);
        showToast('Ata em PDF exportada com sucesso!');
    } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        showToast('Erro ao gerar PDF. Verifique se a biblioteca está carregada.');
    }
}

function saveMeetingHistory() {
    if (MeetingDOM.btnSaveMeeting) {
        MeetingDOM.btnSaveMeeting.disabled = true;
        MeetingDOM.btnSaveMeeting.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Salvo!</span>
        `;
    }

    const record = {
        id: 'm_' + Date.now(),
        dateString: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        title: MeetingDOM.meetingTitle.value.trim() || 'Reunião sem título',
        type: MeetingDOM.meetingType.options[MeetingDOM.meetingType.selectedIndex].text,
        modality: MeetingDOM.meetingModality.options[MeetingDOM.meetingModality.selectedIndex].text,
        rawTranscript: MeetingDOM.rawTranscript.value,
        recordText: MeetingDOM.outputRecord.value
    };
    MeetingState.history.unshift(record);
    localStorage.setItem('etranscriber_meetings_history', JSON.stringify(MeetingState.history));
    showToast('Reunião salva no histórico independente!');
    renderMeetingHistory();
}

/** Reseta todos os campos da tela de reunião, limpando o estado */
function resetMeetingFields() {
    if (MeetingDOM.meetingTitle) MeetingDOM.meetingTitle.value = '';
    if (MeetingDOM.meetingType) MeetingDOM.meetingType.selectedIndex = 0;
    if (MeetingDOM.meetingModality) MeetingDOM.meetingModality.selectedIndex = 0;
    
    if (MeetingDOM.rawTranscript) MeetingDOM.rawTranscript.value = '';
    MeetingState.currentTranscription = '';
    
    if (MeetingDOM.outputRecord) MeetingDOM.outputRecord.value = '';
    MeetingState.currentRecordOutput = '';
    
    clearMeetingUploadedFile();
    
    if (MeetingDOM.resultsSection) MeetingDOM.resultsSection.classList.add('hidden');
    if (MeetingDOM.actionsSaveRow) MeetingDOM.actionsSaveRow.classList.add('hidden');
    
    if (MeetingDOM.btnSaveMeeting) {
        MeetingDOM.btnSaveMeeting.disabled = false;
        MeetingDOM.btnSaveMeeting.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Salvar Reunião no Histórico Local</span>
        `;
    }
    
    // Parar gravações de reuniões ativas (fire-and-forget — função síncrona)
    if (MeetingState.audioProcessor && MeetingState.audioProcessor.isRecording) {
        MeetingState.audioProcessor.stopRecording().catch(() => {});
        if (MeetingState.recordingTimerInterval) clearInterval(MeetingState.recordingTimerInterval);
        if (MeetingState.recordingState.qualityInterval) clearInterval(MeetingState.recordingState.qualityInterval);
        if (MeetingState.recordingState.visualizer) MeetingState.recordingState.visualizer.stop();
        MeetingState.audioProcessor.cleanup().catch(() => {});
    }

    // Resetar UI de gravação
    if (MeetingDOM.btnRecordStart) MeetingDOM.btnRecordStart.disabled = false;
    if (MeetingDOM.btnRecordOnline) MeetingDOM.btnRecordOnline.disabled = false;
    if (MeetingDOM.btnRecordStop) MeetingDOM.btnRecordStop.disabled = true;
    if (MeetingDOM.recordingTimer) MeetingDOM.recordingTimer.textContent = '00:00';
}

/** Verifica se há dados não salvos e solicita confirmação do usuário */
window.handleNewMeetingClick = function() {
    const hasUnsavedData = (
        (MeetingDOM.meetingTitle && MeetingDOM.meetingTitle.value.trim() !== '') ||
        (MeetingDOM.rawTranscript && MeetingDOM.rawTranscript.value.trim() !== '') ||
        (MeetingDOM.outputRecord && MeetingDOM.outputRecord.value.trim() !== '') ||
        MeetingState.uploadedFile !== null
    );

    const isSaved = MeetingDOM.btnSaveMeeting ? MeetingDOM.btnSaveMeeting.disabled : false;
    
    if (hasUnsavedData && !isSaved) {
        if (!confirm('Deseja iniciar uma nova reunião? A reunião atual não foi salva e seus dados serão perdidos.')) {
            return false;
        }
    }

    resetMeetingFields();
    return true;
};

function renderMeetingHistory(filter = '') {
    if (!MeetingDOM.historyTableBody) return;
    MeetingDOM.historyTableBody.innerHTML = '';
    
    const filtered = MeetingState.history.filter(m => 
        (m.title || '').toLowerCase().includes(filter.toLowerCase()) || 
        (m.type || '').toLowerCase().includes(filter.toLowerCase()) ||
        (m.modality || '').toLowerCase().includes(filter.toLowerCase()) ||
        (m.dateString || '').toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
        MeetingDOM.historyTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        <p>Nenhuma reunião encontrada.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    filtered.forEach(m => {
        const tr = document.createElement('tr');
        
        // Criar células de forma segura
        const dateCell = document.createElement('td');
        const dateSpan = document.createElement('span');
        dateSpan.className = 'font-medium';
        dateSpan.textContent = m.dateString;
        dateCell.appendChild(dateSpan);
        
        const titleCell = document.createElement('td');
        titleCell.textContent = m.title;
        
        const typeCell = document.createElement('td');
        const typeBadge = document.createElement('span');
        typeBadge.className = 'badge';
        typeBadge.textContent = m.type;
        typeCell.appendChild(typeBadge);
        
        const modalityCell = document.createElement('td');
        const modalityBadge = document.createElement('span');
        modalityBadge.className = 'badge badge-light';
        modalityBadge.textContent = m.modality;
        modalityCell.appendChild(modalityBadge);
        
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-col';
        
        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn-action-small';
        loadBtn.title = 'Carregar Ata';
        loadBtn.onclick = () => loadMeetingHistory(m.id);
        loadBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-action-small btn-danger';
        deleteBtn.title = 'Excluir';
        deleteBtn.onclick = () => deleteMeetingHistory(m.id);
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        
        actionsCell.appendChild(loadBtn);
        actionsCell.appendChild(deleteBtn);
        
        tr.appendChild(dateCell);
        tr.appendChild(titleCell);
        tr.appendChild(typeCell);
        tr.appendChild(modalityCell);
        tr.appendChild(actionsCell);
        
        MeetingDOM.historyTableBody.appendChild(tr);
    });
}

window.loadMeetingHistory = function(id) {
    const record = MeetingState.history.find(m => m.id === id);
    if (!record) return;

    MeetingDOM.meetingTitle.value = record.title;
    MeetingDOM.rawTranscript.value = record.rawTranscript || '';
    MeetingDOM.outputRecord.value = record.recordText || '';
    MeetingState.currentRecordOutput = record.recordText || '';
    
    // Select correct type and modality based on text
    Array.from(MeetingDOM.meetingType.options).forEach(opt => {
        if(opt.text === record.type) MeetingDOM.meetingType.value = opt.value;
    });
    Array.from(MeetingDOM.meetingModality.options).forEach(opt => {
        if(opt.text === record.modality) MeetingDOM.meetingModality.value = opt.value;
    });

    MeetingDOM.resultsSection.classList.remove('hidden');
    if (typeof toggleAiButtonsState === 'function') toggleAiButtonsState();
    
    // Switch to Reuniões tab
    switchTab('tab-reunioes');
    showToast('Ata carregada com sucesso!');
};

window.deleteMeetingHistory = function(id) {
    if (confirm('Tem certeza que deseja excluir esta ata?')) {
        MeetingState.history = MeetingState.history.filter(m => m.id !== id);
        localStorage.setItem('etranscriber_meetings_history', JSON.stringify(MeetingState.history));
        renderMeetingHistory(MeetingDOM.searchMeetingHistory.value);
        showToast('Ata excluída.');
    }
};

// ==========================================================================
// ATTENDANCE STATE
// ==========================================================================
const AttendanceState = {
    participants: [],        // { id, name, role, email, confirmed, confirmedAt }
    currentQRToken: null,    // { token, expiresAt (ms timestamp), meetingTitle }
    qrExpiryInterval: null
};

// ==========================================================================
// QR CODE GENERATION
// ==========================================================================

// Função de diagnóstico (pode ser chamada no console do navegador)
window.debugQRCode = function() {
    const stored = JSON.parse(localStorage.getItem('etranscriber_qr_token') || 'null');
    const now = Date.now();
    
    console.log('🔍 DIAGNÓSTICO DO QR CODE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📅 Agora:', new Date(now).toLocaleString('pt-BR'));
    
    if (!stored) {
        console.log('❌ Nenhum QR Code gerado ainda');
        return;
    }
    
    console.log('📋 Token:', stored.token);
    console.log('📝 Reunião:', stored.meetingTitle);
    console.log('⏰ Expira em:', new Date(stored.expiresAt).toLocaleString('pt-BR'));
    console.log('🕐 Timestamp de expiração:', stored.expiresAt);
    console.log('🕐 Timestamp atual:', now);
    console.log('⏱️ Diferença (ms):', stored.expiresAt - now);
    console.log('⏱️ Minutos restantes:', Math.round((stored.expiresAt - now) / 1000 / 60));
    console.log('✅ Válido?', now < stored.expiresAt ? 'SIM' : 'NÃO (EXPIRADO)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};

function generateAttendanceQR() {
    console.log('🔍 Iniciando geração do QR Code...');
    console.log('ℹ️ NOTA: QR Code funciona SEM chave Groq - é funcionalidade local!');
    
    // Verificar se a biblioteca QRCode está carregada
    if (typeof QRCode === 'undefined') {
        console.error('❌ Biblioteca QRCode não encontrada');
        showToast('Biblioteca QRCode não carregada. Recarregue a página.');
        return;
    }
    console.log('✅ Biblioteca QRCode carregada');

    const endTimeEl = document.getElementById('meetingEndTime');
    const dateEl    = document.getElementById('meetingDate');
    const titleEl   = document.getElementById('meetingTitle');

    console.log('🔍 Elementos encontrados:', {
        endTime: !!endTimeEl,
        date: !!dateEl,
        title: !!titleEl
    });

    const meetingDate  = dateEl?.value  || new Date().toISOString().slice(0, 10);
    const meetingEnd   = endTimeEl?.value || '';
    const meetingTitle = titleEl?.value?.trim() || 'Reunião';

    console.log('📋 Dados da reunião:', { meetingDate, meetingEnd, meetingTitle });

    // Build expiry timestamp
    // SEMPRE gera QR válido por pelo menos 4 horas a partir de AGORA
    let expiresAt;
    const now = Date.now();
    const fourHoursFromNow = now + 4 * 60 * 60 * 1000;
    
    if (meetingDate && meetingEnd) {
        const meetingEndTime = new Date(`${meetingDate}T${meetingEnd}:00`).getTime();
        
        // Se o horário de término é válido E está no futuro, usa ele
        // MAS garante que seja pelo menos 4h a partir de agora
        if (!isNaN(meetingEndTime) && meetingEndTime > now) {
            expiresAt = Math.max(meetingEndTime, fourHoursFromNow);
            console.log('✅ QR expira no horário da reunião ou em 4h (o que for maior)');
        } else {
            // Horário já passou ou é inválido: usa 4h a partir de agora
            expiresAt = fourHoursFromNow;
            console.log('⚠️ Horário de término no passado/inválido — QR expira em 4h');
            showToast('QR Code válido por 4 horas a partir de agora', 3000);
        }
    } else {
        // Sem horário definido: sempre 4h a partir de agora
        expiresAt = fourHoursFromNow;
        console.log('ℹ️ Horário não definido — QR expira em 4h');
        showToast('QR Code válido por 4 horas', 3000);
    }
    
    console.log('⏰ QR Code expira em:', new Date(expiresAt).toLocaleString('pt-BR'));

    // Token criptograficamente seguro (não usa Math.random() que não é seguro)
    const tokenBytes = new Uint8Array(16);
    crypto.getRandomValues(tokenBytes);
    const token = 'qr_' + Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    AttendanceState.currentQRToken = { token, expiresAt, meetingTitle };

    // Persist token so checkin page can validate
    localStorage.setItem('etranscriber_qr_token', JSON.stringify(AttendanceState.currentQRToken));

    // Build check-in URL (same page with hash param)
    const baseUrl = window.location.href.split('#')[0].split('?')[0];
    const checkinUrl = `${baseUrl}?checkin=${token}`;

    console.log('🔗 URL do QR Code:', checkinUrl);

    // Render QR
    const container = document.getElementById('qrCodeContainer');
    const canvas    = document.getElementById('qrCodeCanvas');
    
    console.log('🔍 Elementos QR:', {
        container: !!container,
        canvas: !!canvas
    });
    
    if (!container || !canvas) {
        console.error('❌ Elementos do QR Code não encontrados');
        showToast('Elementos do QR Code não encontrados.');
        return;
    }
    
    // Limpar container
    canvas.innerHTML = '';
    console.log('🧹 Container limpo');

    try {
        console.log('🎨 Tentando gerar QR Code...');
        
        // Método mais simples e direto
        const qrDiv = document.createElement('div');
        qrDiv.style.background = '#ffffff';
        qrDiv.style.padding = '16px';
        qrDiv.style.borderRadius = '12px';
        qrDiv.style.display = 'inline-block';
        
        canvas.appendChild(qrDiv);
        
        // Usar a biblioteca QRCode.js
        const qr = new QRCode(qrDiv, {
            text: checkinUrl,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
        });
        
        console.log('✅ QR Code gerado com sucesso!');
        
    } catch (err) {
        console.error('❌ Erro ao gerar QR Code:', err);
        
        // Fallback: mostrar URL como texto
        canvas.innerHTML = `
            <div style="padding:20px;text-align:center;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;max-width:250px;">
                <h4 style="margin:0 0 10px 0;color:#495057;">Link de Check-in</h4>
                <p style="margin:0;font-size:12px;word-break:break-all;color:#6c757d;">${checkinUrl}</p>
                <small style="color:#6c757d;margin-top:8px;display:block;">Escaneie este link ou copie manualmente</small>
            </div>
        `;
        
        showToast('QR Code gerado como texto. Use o botão "Copiar Link".');
    }

    // Expire info + countdown
    updateQRExpireDisplay(expiresAt);
    if (AttendanceState.qrExpiryInterval) clearInterval(AttendanceState.qrExpiryInterval);
    AttendanceState.qrExpiryInterval = setInterval(() => updateQRExpireDisplay(expiresAt), 30000);

    container.classList.remove('hidden');
    console.log('👁️ Container QR exibido');

    // Wire download & copy
    const downloadBtn = document.getElementById('btn-download-qr');
    const copyBtn = document.getElementById('btn-copy-qr-link');
    
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            console.log('📥 Tentando download...');
            downloadQRCode(canvas, meetingTitle);
        };
    }
    
    if (copyBtn) {
        copyBtn.onclick = () => {
            console.log('📋 Copiando link...');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(checkinUrl)
                    .then(() => {
                        console.log('✅ Link copiado com sucesso');
                        showToast('Link do QR copiado!');
                    })
                    .catch(() => {
                        console.log('❌ Erro ao copiar via clipboard API');
                        showToast('Erro ao copiar.');
                    });
            } else {
                // Fallback para navegadores mais antigos
                console.log('🔄 Usando fallback para cópia');
                const textArea = document.createElement('textarea');
                textArea.value = checkinUrl;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    showToast('Link do QR copiado!');
                    console.log('✅ Link copiado via execCommand');
                } catch (err) {
                    console.log('❌ Erro no execCommand:', err);
                    showToast('Erro ao copiar.');
                }
                document.body.removeChild(textArea);
            }
        };
    }

    showToast('QR Code gerado! Expira em ' + formatExpiry(expiresAt));
    console.log('🎉 Processo de geração do QR Code concluído!');
}

function renderQRCanvas(url, container) {
    try {
        const cvs = document.createElement('canvas');
        container.appendChild(cvs);
        QRCode.toCanvas(cvs, url, { 
            width: 200, 
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, (err) => {
            if (err) {
                console.error('Erro QRCode.toCanvas:', err);
                container.innerHTML = `<div style="padding:20px;text-align:center;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;">
                    <p style="margin:0;color:#6c757d;">Erro ao gerar QR Code</p>
                    <small style="color:#6c757d;">${url}</small>
                </div>`;
            }
        });
    } catch (err) {
        console.error('Erro renderQRCanvas:', err);
        renderQRImg(url, container);
    }
}

function renderQRImg(url, container) {
    try {
        // Limpar container
        container.innerHTML = '';
        
        // Criar QR Code usando a biblioteca alternativa
        const qr = new QRCode(container, { 
            text: url, 
            width: 200, 
            height: 200, 
            correctLevel: QRCode.CorrectLevel.H,
            colorDark: '#000000',
            colorLight: '#FFFFFF'
        });
    } catch (err) {
        console.error('Erro renderQRImg:', err);
        container.innerHTML = `<div style="padding:20px;text-align:center;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;">
            <p style="margin:0;color:#6c757d;">Erro ao gerar QR Code</p>
            <small style="color:#6c757d;">${url}</small>
        </div>`;
    }
}

function downloadQRCode(canvasContainer, title) {
    try {
        const cvs = canvasContainer.querySelector('canvas');
        const img = canvasContainer.querySelector('img');
        
        if (!cvs && !img) { 
            showToast('QR Code não disponível para download.'); 
            return; 
        }
        
        const link = document.createElement('a');
        
        if (cvs) {
            // Canvas method
            link.href = cvs.toDataURL('image/png');
        } else if (img) {
            // Image method - convert to canvas first
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width || 200;
            canvas.height = img.height || 200;
            ctx.drawImage(img, 0, 0);
            link.href = canvas.toDataURL('image/png');
        }
        
        const safeName = (title || 'reuniao').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        link.download = `qr_presenca_${safeName}_${new Date().toISOString().slice(0, 10)}.png`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('QR Code baixado!');
    } catch (err) {
        console.error('Erro ao baixar QR Code:', err);
        showToast('Erro ao baixar QR Code.');
    }
}

function updateQRExpireDisplay(expiresAt) {
    const el = document.getElementById('qrExpireInfo');
    if (!el) return;
    const now = Date.now();
    
    console.log('🕐 Atualizando display de expiração:', {
        now: new Date(now).toLocaleString('pt-BR'),
        expiresAt: new Date(expiresAt).toLocaleString('pt-BR'),
        expired: now >= expiresAt,
        minutesRemaining: Math.round((expiresAt - now) / 1000 / 60)
    });
    
    if (now >= expiresAt) {
        el.innerHTML = '<span style="color:#ef4444;">⏰ QR Code expirado</span>';
        clearInterval(AttendanceState.qrExpiryInterval);
    } else {
        const minutesRemaining = Math.round((expiresAt - now) / 1000 / 60);
        el.innerHTML = `⏱ Válido até: <strong>${formatExpiry(expiresAt)}</strong> (${minutesRemaining} min restantes)`;
    }
}

function formatExpiry(ts) {
    const date = new Date(ts);
    const formatted = date.toLocaleString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
    });
    return formatted;
}

// ==========================================================================
// QR CHECK-IN (runs on page load when ?checkin=TOKEN)
// ==========================================================================
function handleQRCheckinParam() {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('checkin');
    if (!token) return;

    const modal = document.getElementById('qrCheckinModal');
    const content = document.getElementById('qr-checkin-content');
    const expired = document.getElementById('qr-checkin-expired');
    const successDiv = document.getElementById('qr-checkin-success');

    modal.classList.remove('hidden');

    // Validate token
    let stored;
    try { stored = JSON.parse(localStorage.getItem('etranscriber_qr_token')); } catch { stored = null; }

    console.log('🔍 Validando check-in:', {
        token: token,
        stored: stored,
        tokenMatch: stored?.token === token,
        now: Date.now(),
        expiresAt: stored?.expiresAt,
        expired: stored ? Date.now() > stored.expiresAt : 'N/A',
        timeUntilExpiry: stored ? Math.round((stored.expiresAt - Date.now()) / 1000 / 60) + ' minutos' : 'N/A'
    });

    if (!stored || stored.token !== token || Date.now() > stored.expiresAt) {
        console.error('❌ Check-in inválido:', {
            noStored: !stored,
            tokenMismatch: stored?.token !== token,
            expired: stored ? Date.now() > stored.expiresAt : false
        });
        content.classList.add('hidden');
        expired.classList.remove('hidden');
        return;
    }
    
    console.log('✅ Check-in válido!');

    // Wire confirm button
    document.getElementById('btn-confirm-checkin').addEventListener('click', () => {
        const name = document.getElementById('checkin-name').value.trim();
        if (!name) { showToast('Por favor, informe seu nome!'); return; }
        const role  = document.getElementById('checkin-role').value.trim();
        const email = document.getElementById('checkin-email').value.trim();

        addOrConfirmParticipant({ name, role, email, confirmed: true });

        content.classList.add('hidden');
        successDiv.classList.remove('hidden');
        document.getElementById('qr-checkin-success-name').textContent = `Bem-vindo(a), ${name}! 🎉`;
        showToast('Presença registrada com sucesso!');

        // Clean URL without reload
        window.history.replaceState({}, '', window.location.pathname);
    });

    document.getElementById('btn-qr-checkin-close').addEventListener('click', () => {
        modal.classList.add('hidden');
        window.history.replaceState({}, '', window.location.pathname);
    });
}

// ==========================================================================
// PARTICIPANTS MANAGEMENT
// ==========================================================================
function loadAttendanceState() {
    try {
        AttendanceState.participants = JSON.parse(localStorage.getItem('etranscriber_participants_meeting')) || [];
    } catch {
        AttendanceState.participants = [];
    }
    try {
        AttendanceState.currentQRToken = JSON.parse(localStorage.getItem('etranscriber_qr_token')) || null;
    } catch {
        AttendanceState.currentQRToken = null;
    }
}

function saveAttendanceState() {
    localStorage.setItem('etranscriber_participants_meeting', JSON.stringify(AttendanceState.participants));
}

function addOrConfirmParticipant({ name, role = '', email = '', confirmed = false }) {
    // Check if participant already exists (by name, case-insensitive)
    const existing = AttendanceState.participants.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
        if (confirmed && !existing.confirmed) {
            existing.confirmed  = true;
            existing.confirmedAt = new Date().toISOString();
        }
    } else {
        AttendanceState.participants.push({
            id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name, role, email,
            confirmed,
            confirmedAt: confirmed ? new Date().toISOString() : null,
            addedAt: new Date().toISOString()
        });
    }
    saveAttendanceState();
    renderParticipantsTable();
}

function removeParticipant(id) {
    AttendanceState.participants = AttendanceState.participants.filter(p => p.id !== id);
    saveAttendanceState();
    renderParticipantsTable();
    showToast('Participante removido.');
}

function toggleParticipantPresence(id) {
    const p = AttendanceState.participants.find(x => x.id === id);
    if (!p) return;
    p.confirmed    = !p.confirmed;
    p.confirmedAt  = p.confirmed ? new Date().toISOString() : null;
    saveAttendanceState();
    renderParticipantsTable();
}

function renderParticipantsTable() {
    const tbody = document.getElementById('participantsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = AttendanceState.participants;
    const total     = list.length;
    const confirmed = list.filter(p => p.confirmed).length;
    const pending   = total - confirmed;

    document.getElementById('stat-total').textContent     = total;
    document.getElementById('stat-confirmed').textContent = confirmed;
    document.getElementById('stat-pending').textContent   = pending;

    if (total === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="5"><div class="empty-state">Nenhum participante cadastrado.</div></td></tr>`;
        return;
    }

    list.forEach(p => {
        const tr = document.createElement('tr');
        
        // Nome
        const nameCell = document.createElement('td');
        const nameStrong = document.createElement('strong');
        nameStrong.textContent = p.name;
        nameCell.appendChild(nameStrong);
        
        // Cargo
        const roleCell = document.createElement('td');
        roleCell.textContent = p.role || '-';
        
        // Email
        const emailCell = document.createElement('td');
        emailCell.textContent = p.email || '-';
        
        // Presença
        const presenceCell = document.createElement('td');
        presenceCell.style.textAlign = 'center';
        
        const presenceBtn = document.createElement('button');
        presenceBtn.onclick = () => toggleParticipantPresence(p.id);
        presenceBtn.style.border = 'none';
        presenceBtn.style.background = 'transparent';
        presenceBtn.style.cursor = 'pointer';
        presenceBtn.style.fontSize = '1.3rem';
        presenceBtn.title = 'Alternar presença';
        presenceBtn.textContent = p.confirmed ? '✅' : '⬜';
        
        presenceCell.appendChild(presenceBtn);
        
        if (p.confirmed && p.confirmedAt) {
            const timeDiv = document.createElement('div');
            timeDiv.style.fontSize = '0.7rem';
            timeDiv.style.color = 'var(--text-muted)';
            timeDiv.textContent = new Date(p.confirmedAt).toLocaleString('pt-BR', { hour:'2-digit', minute:'2-digit' });
            presenceCell.appendChild(timeDiv);
        }
        
        // Ações
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-col';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-icon btn-danger';
        removeBtn.title = 'Remover';
        removeBtn.onclick = () => removeParticipant(p.id);
        removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        
        actionsCell.appendChild(removeBtn);
        
        tr.appendChild(nameCell);
        tr.appendChild(roleCell);
        tr.appendChild(emailCell);
        tr.appendChild(presenceCell);
        tr.appendChild(actionsCell);
        
        tbody.appendChild(tr);
    });
}

// Expose to inline onclick
window.toggleParticipantPresence = toggleParticipantPresence;
window.removeParticipant         = removeParticipant;

// ==========================================================================
// EXPORT: EXCEL
// ==========================================================================
function exportAttendanceExcel() {
    if (!AttendanceState.participants.length) {
        showToast('Nenhum participante para exportar!');
        return;
    }
    
    try {
        if (typeof XLSX === 'undefined') {
            showToast('Biblioteca XLSX não carregada. Recarregue a página.');
            return;
        }
        
        const meetingTitle = document.getElementById('meetingTitle')?.value?.trim() || 'Reunião';
        const meetingDate  = document.getElementById('meetingDate')?.value  || new Date().toISOString().slice(0, 10);

    const rows = [
        ['Lista de Presença'],
        [`Reunião: ${meetingTitle}`],
        [`Data: ${meetingDate}`],
        [`Gerado em: ${new Date().toLocaleString('pt-BR')}`],
        [],
        ['#', 'Nome', 'Cargo / Função', 'E-mail', 'Presença Confirmada', 'Horário da Confirmação']
    ];

    AttendanceState.participants.forEach((p, i) => {
        rows.push([
            i + 1,
            p.name,
            p.role  || '',
            p.email || '',
            p.confirmed ? 'Sim' : 'Não',
            p.confirmedAt ? new Date(p.confirmedAt).toLocaleString('pt-BR') : '-'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 22 }, { wch: 28 }, { wch: 20 }, { wch: 20 }];

    // Bold header row (row index 5)
    const headerRow = 5;
    ['A','B','C','D','E','F'].forEach(col => {
        const cell = ws[`${col}${headerRow + 1}`];
        if (cell) { if (!cell.s) cell.s = {}; cell.s.font = { bold: true }; }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presenças');

    const safeName = meetingTitle.toLowerCase().replace(/\s+/g, '_');
    XLSX.writeFile(wb, `presencas_${safeName}_${meetingDate}.xlsx`);
    showToast('Lista exportada em Excel!');
    } catch (err) {
        console.error('Erro ao exportar Excel:', err);
        showToast('Erro ao exportar Excel. Verifique se a biblioteca está carregada.');
    }
}

// ==========================================================================
// EXPORT: PDF
// ==========================================================================
function exportAttendancePDF() {
    if (!AttendanceState.participants.length) {
        showToast('Nenhum participante para exportar!');
        return;
    }

    try {
        if (typeof window.jspdf === 'undefined') {
            showToast('Biblioteca jsPDF não carregada. Recarregue a página.');
            return;
        }

        const meetingTitle = document.getElementById('meetingTitle')?.value?.trim() || 'Reunião';
        const meetingDate  = document.getElementById('meetingDate')?.value  || new Date().toISOString().slice(0, 10);
        const companyName  = (typeof AppState !== 'undefined' && AppState.meetingCompanyInfo?.name) || 'Empresa';

        const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const mx = 18;
    const cw = pw - mx * 2;
    let y = 0;

    // Header band
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('LISTA DE PRESENÇA', mx, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(companyName, mx, 21);
    y = 36;

    // Meeting info box
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(mx, y, cw, 22, 2, 2, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DADOS DA REUNIÃO', mx + 5, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Título/Pauta: ${meetingTitle}`, mx + 5, y + 15);
    doc.text(`Data: ${meetingDate}   |   Gerado em: ${new Date().toLocaleString('pt-BR')}`, mx + 5, y + 21);
    y += 30;

    // Stats
    const total     = AttendanceState.participants.length;
    const confirmed = AttendanceState.participants.filter(p => p.confirmed).length;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total de participantes: ${total}   |   Confirmados: ${confirmed}   |   Pendentes: ${total - confirmed}`, mx, y);
    y += 8;

    // Table header
    doc.setFillColor(30, 41, 59);
    doc.rect(mx, y, cw, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('#',        mx + 3,       y + 5.5);
    doc.text('Nome',     mx + 10,      y + 5.5);
    doc.text('Cargo',    mx + 70,      y + 5.5);
    doc.text('E-mail',   mx + 110,     y + 5.5);
    doc.text('Presença', pw - mx - 20, y + 5.5);
    y += 10;

    // Table rows
    AttendanceState.participants.forEach((p, i) => {
        if (y > ph - 25) { doc.addPage(); y = 18; }
        if (i % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(mx, y - 3, cw, 8, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(String(i + 1),           mx + 3,       y + 2.5);
        doc.text(p.name.slice(0, 28),     mx + 10,      y + 2.5);
        doc.text((p.role  || '-').slice(0, 18), mx + 70, y + 2.5);
        doc.text((p.email || '-').slice(0, 24), mx + 110, y + 2.5);
        doc.text(p.confirmed ? 'Sim' : '-', pw - mx - 18, y + 2.5);
        y += 8;
    });

    // Signature area
    y += 12;
    if (y > ph - 40) { doc.addPage(); y = 18; }
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    for (let s = 0; s < Math.min(3, total); s++) {
        doc.line(mx + s * 60, y, mx + s * 60 + 50, y);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        const p = AttendanceState.participants[s];
        if (p) doc.text(p.name.slice(0, 20), mx + s * 60, y + 4);
    }

    // Footer
    const fy = ph - 12;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Lista gerada automaticamente pelo E-Transcriber.', mx, fy);

    const safe = meetingTitle.toLowerCase().replace(/\s+/g, '_');
    doc.save(`presencas_${safe}_${meetingDate}.pdf`);
    showToast('Lista exportada em PDF!');
    } catch (err) {
        console.error('Erro ao exportar PDF:', err);
        showToast('Erro ao exportar PDF. Verifique se a biblioteca está carregada.');
    }
}

// ==========================================================================
// ATTENDANCE MODAL
// ==========================================================================
function openAttendanceModal() {
    console.log('👥 Abrindo modal de participantes...');
    console.log('ℹ️ NOTA: Gerenciamento de participantes funciona SEM chave Groq - é funcionalidade local!');
    
    loadAttendanceState();
    renderParticipantsTable();
    document.getElementById('attendanceModal')?.classList.remove('hidden');
    document.getElementById('ap-name')?.focus();
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal')?.classList.add('hidden');
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function setupMeetingEventListeners() {
    MeetingDOM.btnModeRecord?.addEventListener('click', () => setMeetingAudioMode('record'));
    MeetingDOM.btnModeUpload?.addEventListener('click', () => setMeetingAudioMode('upload'));

    MeetingDOM.btnRecordStart?.addEventListener('click', () => startMeetingRecording(false));
    MeetingDOM.btnRecordOnline?.addEventListener('click', () => startMeetingRecording(true));
    MeetingDOM.btnRecordStop?.addEventListener('click', stopMeetingRecording);

    // Controles de Visualização de Áudio para Reuniões
    const meetingVizControls = document.querySelectorAll('#meeting-visualization-controls .viz-btn');
    meetingVizControls.forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.getAttribute('data-style');
            if (MeetingState.recordingState?.visualizer) {
                MeetingState.recordingState.visualizer.style = style;
                meetingVizControls.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    MeetingDOM.audioDropZone?.addEventListener('click', () => MeetingDOM.audioFileInput?.click());
    MeetingDOM.audioFileInput?.addEventListener('change', e => handleMeetingFileSelection(e.target.files[0]));
    MeetingDOM.audioDropZone?.addEventListener('dragover', e => { e.preventDefault(); MeetingDOM.audioDropZone?.classList.add('hover'); });
    MeetingDOM.audioDropZone?.addEventListener('dragleave', () => MeetingDOM.audioDropZone?.classList.remove('hover'));
    MeetingDOM.audioDropZone?.addEventListener('drop', e => {
        e.preventDefault();
        MeetingDOM.audioDropZone?.classList.remove('hover');
        if (e.dataTransfer.files.length > 0) handleMeetingFileSelection(e.dataTransfer.files[0]);
    });
    MeetingDOM.btnClearFile?.addEventListener('click', clearMeetingUploadedFile);
    MeetingDOM.btnProcessUpload?.addEventListener('click', async () => {
        if (!MeetingState.uploadedFile) return;
        MeetingDOM.btnProcessUpload.disabled = true;
        
        try {
            showToast('⏳ Pré-processando áudio da reunião...');
            const preprocessed = await MeetingState.audioProcessor.preprocessAudio(MeetingState.uploadedFile);
            const preprocessedBlob = preprocessed.success ? preprocessed.blob : MeetingState.uploadedFile;
            
            showToast('⏳ Comprimindo áudio da reunião...');
            const compressed = await MeetingState.audioProcessor.compressAudio(preprocessedBlob);
            const finalBlob = compressed.success ? compressed.blob : preprocessedBlob;
            
            await MeetingState.audioProcessor.cleanup().catch(() => {});
            
            const file = new File([finalBlob], `reuniao_upload_${Date.now()}.wav`, { type: finalBlob.type });
            await sendMeetingAudioToWhisper(file);
        } catch (err) {
            console.error('Erro ao processar upload de reunião:', err);
            showToast('Erro ao processar áudio de upload.');
        } finally {
            MeetingDOM.btnProcessUpload.disabled = false;
        }
    });

    const enableSaveMeeting = () => {
        if (MeetingDOM.btnSaveMeeting && MeetingDOM.btnSaveMeeting.disabled) {
            MeetingDOM.btnSaveMeeting.disabled = false;
            MeetingDOM.btnSaveMeeting.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <span>Salvar Reunião no Histórico Local</span>
            `;
        }
    };
    MeetingDOM.meetingTitle?.addEventListener('input', enableSaveMeeting);
    MeetingDOM.rawTranscript?.addEventListener('input', () => {
        if (typeof toggleAiButtonsState === 'function') toggleAiButtonsState();
        enableSaveMeeting();
    });
    MeetingDOM.outputRecord?.addEventListener('input', enableSaveMeeting);

    MeetingDOM.btnGenerateDocs?.addEventListener('click', generateMeetingMinutes);

    MeetingDOM.btnCopyRecord?.addEventListener('click', () => {
        navigator.clipboard.writeText(MeetingDOM.outputRecord.value).then(() => showToast('Ata copiada!')).catch(() => showToast('Erro ao copiar.'));
    });
    MeetingDOM.btnDownloadPdf?.addEventListener('click', generateMeetingPDF);
    MeetingDOM.btnSaveMeeting?.addEventListener('click', saveMeetingHistory);

    // History
    MeetingDOM.searchMeetingHistory?.addEventListener('input', e => renderMeetingHistory(e.target.value));
    MeetingDOM.btnClearMeetingHistory?.addEventListener('click', () => {
        if (confirm('ATENÇÃO: Isto apagará TODO o histórico de reuniões. Confirmar?')) {
            MeetingState.history = [];
            localStorage.removeItem('etranscriber_meetings_history');
            renderMeetingHistory();
            showToast('Histórico limpo com sucesso.');
        }
    });

    // QR Code
    document.getElementById('btn-generate-qr')?.addEventListener('click', generateAttendanceQR);
    
    // Botão de teste QR
    document.getElementById('btn-test-qr')?.addEventListener('click', () => {
        console.log('🧪 TESTE DO QR CODE');
        console.log('QRCode library:', typeof QRCode);
        console.log('QRCode.toCanvas:', typeof QRCode?.toCanvas);
        console.log('QRCode.CorrectLevel:', QRCode?.CorrectLevel);
        
        if (typeof QRCode !== 'undefined') {
            showToast('✅ Biblioteca QRCode está funcionando!');
        } else {
            showToast('❌ Biblioteca QRCode não carregada!');
        }
    });

    // Attendance modal
    document.getElementById('btn-show-attendance')?.addEventListener('click', openAttendanceModal);
    document.getElementById('btn-attendance-modal-close')?.addEventListener('click', closeAttendanceModal);
    document.getElementById('attendanceModal')?.addEventListener('click', e => {
        if (e.target.id === 'attendanceModal') closeAttendanceModal();
    });

    // Add participant
    document.getElementById('btn-add-participant')?.addEventListener('click', () => {
        const name  = document.getElementById('ap-name').value.trim();
        const role  = document.getElementById('ap-role').value.trim();
        const email = document.getElementById('ap-email').value.trim();
        if (!name) { showToast('Informe o nome do participante!'); return; }
        addOrConfirmParticipant({ name, role, email, confirmed: false });
        document.getElementById('ap-name').value  = '';
        document.getElementById('ap-role').value  = '';
        document.getElementById('ap-email').value = '';
        document.getElementById('ap-name').focus();
        showToast(`${name} adicionado(a)!`);
    });

    // Enter key on name field adds participant
    document.getElementById('ap-name')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-add-participant').click();
    });

    // Export buttons
    document.getElementById('btn-export-attendance-excel')?.addEventListener('click', exportAttendanceExcel);
    document.getElementById('btn-export-attendance-pdf')?.addEventListener('click', exportAttendancePDF);

    // Clear attendance
    document.getElementById('btn-clear-attendance')?.addEventListener('click', () => {
        if (confirm('Apagar toda a lista de participantes desta sessão?')) {
            AttendanceState.participants = [];
            saveAttendanceState();
            renderParticipantsTable();
            showToast('Lista de participantes limpa.');
        }
    });
}

// Inicializar após carregamento completo
function runMeetingsInitSequence() {
    initMeetingModule();
    loadAttendanceState();
    handleQRCheckinParam();     // Handle ?checkin=TOKEN in URL
    
    // Teste da biblioteca QRCode
    console.log('🔍 Testando bibliotecas...');
    console.log('QRCode disponível:', typeof QRCode !== 'undefined');
    console.log('jsPDF disponível:', typeof window.jspdf !== 'undefined');
    console.log('XLSX disponível:', typeof XLSX !== 'undefined');
    
    if (typeof QRCode === 'undefined') {
        console.error('❌ QRCode não carregou. Verifique a conexão com a internet.');
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(runMeetingsInitSequence, 100);
    });
} else {
    setTimeout(runMeetingsInitSequence, 100);
}
