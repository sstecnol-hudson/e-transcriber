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

const MEETING_PROMPT = `Você é um assistente corporativo especializado em redação de atas de reuniões. Sua tarefa é analisar a transcrição de uma reunião corporativa e gerar uma ata profissional bem estruturada.

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
- Responda apenas com a ata formatada em Markdown.`;

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
    // Verificar se os elementos de reunião existem (podem ter sido removidos)
    if (!document.getElementById('tab-reunioes')) {
        console.warn('⚠️ Módulo de Reuniões desabilitado - aba não encontrada');
        return;
    }
    
    try { MeetingState.history = JSON.parse(localStorage.getItem('etranscriber_meetings_history')) || []; } catch { MeetingState.history = []; }
    setupMeetingEventListeners();
    drawMeetingStaticWaveform();
    renderMeetingHistory();
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
    MeetingState.audioChunks = [];
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 48000,
                channelCount: 1
            } 
        });
        MeetingState.audioStream = stream;
        let finalStream = stream;

        if (isOnline) {
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: true, 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                });
                MeetingState.displayStream = displayStream;

                const hasAudio = displayStream.getAudioTracks().length > 0;
                if (!hasAudio) {
                    showToast('AVISO: Áudio da guia não compartilhado. Grave novamente e marque "Compartilhar áudio".', 5000);
                }

                MeetingState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                MeetingState.dest = MeetingState.audioContext.createMediaStreamDestination();

                const micSource = MeetingState.audioContext.createMediaStreamSource(stream);
                micSource.connect(MeetingState.dest);

                if (hasAudio) {
                    const displayAudioStream = new MediaStream(displayStream.getAudioTracks());
                    const displaySource = MeetingState.audioContext.createMediaStreamSource(displayAudioStream);
                    displaySource.connect(MeetingState.dest);
                }

                finalStream = MeetingState.dest.stream;

                // Para a gravação se o usuário parar de compartilhar a tela
                displayStream.getVideoTracks()[0].onended = () => {
                    if (MeetingState.isRecording) stopMeetingRecording();
                };
            } catch (err) {
                console.error('Display media error:', err);
                showToast('Erro ao capturar tela. Compartilhamento cancelado.');
                stream.getTracks().forEach(t => t.stop());
                return;
            }
        }

        let options = {};
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) options = { mimeType: 'audio/webm;codecs=opus' };
        else if (MediaRecorder.isTypeSupported('audio/webm')) options = { mimeType: 'audio/webm' };
        else if (MediaRecorder.isTypeSupported('audio/ogg')) options = { mimeType: 'audio/ogg' };
        else if (MediaRecorder.isTypeSupported('audio/mp4')) options = { mimeType: 'audio/mp4' };

        MeetingState.mediaRecorder = new MediaRecorder(finalStream, options);
        MeetingState.mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) MeetingState.audioChunks.push(e.data); };
        MeetingState.mediaRecorder.onstop = processMeetingRecordedAudio;
        MeetingState.mediaRecorder.start(250);
        MeetingState.isRecording = true;

        MeetingDOM.btnRecordStart.disabled = true;
        MeetingDOM.btnRecordOnline.disabled = true;
        MeetingDOM.btnRecordStop.disabled = false;

        MeetingState.recordingDuration = 0;
        MeetingDOM.recordingTimer.textContent = '00:00';
        MeetingState.recordingTimerInterval = setInterval(() => {
            MeetingState.recordingDuration++;
            const m = Math.floor(MeetingState.recordingDuration / 60).toString().padStart(2, '0');
            const s = (MeetingState.recordingDuration % 60).toString().padStart(2, '0');
            MeetingDOM.recordingTimer.textContent = `${m}:${s}`;
        }, 1000);

        setupMeetingAudioVisualizer(finalStream);
        showToast(isOnline ? 'Gravação de Reunião Online iniciada.' : 'Gravação de Reunião Presencial iniciada.');
    } catch (err) {
        console.error(err);
        showToast('Erro ao acessar microfone ou tela. Verifique as permissões.');
    }
}

function setupMeetingAudioVisualizer(stream) {
    // Reutilizar AudioContext existente para evitar leak
    if (!MeetingState.audioContext || MeetingState.audioContext.state === 'closed') {
        MeetingState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    MeetingState.analyser = MeetingState.audioContext.createAnalyser();
    MeetingState.source = MeetingState.audioContext.createMediaStreamSource(stream);
    MeetingState.source.connect(MeetingState.analyser);
    MeetingState.analyser.fftSize = 128;
    MeetingState.dataArray = new Uint8Array(MeetingState.analyser.frequencyBinCount);
    animateMeetingWaveform();
}

// Gradiente criado uma vez para otimização
let meetingGradientCache = null;

function animateMeetingWaveform() {
    if (!MeetingState.isRecording) return;
    MeetingState.animationFrameId = requestAnimationFrame(animateMeetingWaveform);
    const canvas = MeetingDOM.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    MeetingState.analyser.getByteFrequencyData(MeetingState.dataArray);
    ctx.clearRect(0, 0, width, height);

    // Criar gradiente apenas uma vez
    if (!meetingGradientCache) {
        meetingGradientCache = ctx.createLinearGradient(0, 0, 0, height);
        meetingGradientCache.addColorStop(0, '#6366f1');
        meetingGradientCache.addColorStop(0.5, '#8b5cf6');
        meetingGradientCache.addColorStop(1, '#14b8a6');
    }
    ctx.fillStyle = meetingGradientCache;

    const barWidth = (width / MeetingState.dataArray.length) * 1.5;
    let x = 0;
    for (let i = 0; i < MeetingState.dataArray.length; i++) {
        const barHeight = Math.max(4, (MeetingState.dataArray[i] / 255) * height * 0.9);
        const y = (height - barHeight) / 2;
        drawMeetingRoundRect(ctx, x, y, barWidth - 3, barHeight, 4);
        x += barWidth;
    }
}

function drawMeetingRoundRect(ctx, x, y, w, h, r) {
    if (w < 0) w = 0; if (h < 0) h = 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
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

function stopMeetingRecording() {
    if (!MeetingState.isRecording) return;
    MeetingState.isRecording = false;
    clearInterval(MeetingState.recordingTimerInterval);
    cancelAnimationFrame(MeetingState.animationFrameId);
    MeetingState.audioStream?.getTracks().forEach(t => t.stop());
    MeetingState.displayStream?.getTracks().forEach(t => t.stop());
    if (MeetingState.audioContext && MeetingState.audioContext.state !== 'closed') {
        MeetingState.audioContext.close();
    }
    MeetingState.mediaRecorder?.stop();
    MeetingDOM.btnRecordStart.disabled = false;
    MeetingDOM.btnRecordOnline.disabled = false;
    MeetingDOM.btnRecordStop.disabled = true;
    drawMeetingStaticWaveform();
    showToast('Processando áudio da reunião...');
}

// ==========================================================================
// UPLOAD DE ARQUIVOS DE REUNIÃO
// ==========================================================================
function handleMeetingFileSelection(file) {
    if (!file) return;
    
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        showToast(`❌ Arquivo muito grande! Máximo: 25MB. Seu arquivo: ${sizeMB}MB`);
        return;
    }
    
    MeetingState.uploadedFile = file;
    MeetingDOM.uploadedFileName.textContent = file.name;
    MeetingDOM.uploadedFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    MeetingDOM.fileInfoContainer.classList.remove('hidden');
    MeetingDOM.btnProcessUpload.disabled = false;
    showToast('✅ Arquivo da reunião carregado.');
}

function clearMeetingUploadedFile() {
    MeetingState.uploadedFile = null;
    MeetingDOM.audioFileInput.value = '';
    MeetingDOM.fileInfoContainer.classList.add('hidden');
    MeetingDOM.btnProcessUpload.disabled = true;
}

// ==========================================================================
// CHAMADAS DA API DO GROQ (Whisper + Llama)
// ==========================================================================
async function processMeetingRecordedAudio() {
    if (!MeetingState.audioChunks.length) return;
    const blob = new Blob(MeetingState.audioChunks, { type: MeetingState.mediaRecorder.mimeType || 'audio/webm' });
    await sendMeetingAudioToWhisper(new File([blob], `reuniao_${Date.now()}.webm`, { type: blob.type }));
}

async function sendMeetingAudioToWhisper(file) {
    if (!AppState.apiKey) { showToast('Chave de API do Groq ausente!'); return; }
    
    // Validar tamanho do arquivo (máximo 25MB para Groq)
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
        showToast(`❌ Arquivo muito grande! Máximo: 25MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
    }
    
    MeetingDOM.transcriptionLoader.classList.remove('hidden');
    MeetingDOM.transcriptionLoaderText.textContent = 'Transcrevendo áudio via Groq Whisper...';
    MeetingDOM.rawTranscript.value = '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', MeetingDOM.meetingLang.value);
    formData.append('response_format', 'json');

    try {
        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AppState.apiKey}` },
            body: formData
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            let errorMsg = `Erro ${res.status}`;
            
            // Tratamento específico para erro 413
            if (res.status === 413) {
                errorMsg = '❌ Arquivo muito grande! A API Groq aceita máximo 25MB. Tente comprimir o áudio ou dividir em partes menores.';
            } else if (res.status === 400) {
                errorMsg = '❌ Erro na requisição. Verifique o formato do áudio (MP3, WAV, M4A, WEBM, MP4).';
            } else if (res.status === 401) {
                errorMsg = '❌ Chave Groq inválida ou expirada. Verifique em Configurações.';
            } else if (res.status === 429) {
                errorMsg = '❌ Limite de requisições atingido. Aguarde alguns minutos e tente novamente.';
            }
            
            throw new Error(errorMsg);
        }
        
        const data = await res.json();
        MeetingDOM.rawTranscript.value = data.text || '';
        MeetingState.currentTranscription = data.text || '';
        MeetingDOM.btnGenerateDocs.disabled = !data.text?.trim();
        showToast(data.text?.trim() ? '✅ Transcrição da reunião concluída!' : 'Aviso: nenhum áudio detectado.');
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

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AppState.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: model, 
                messages: [
                    { role: 'system', content: MEETING_PROMPT }, 
                    { role: 'user', content: userContent }
                ], 
                temperature: 0.1 
            })
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('ATA DE REUNIÃO CORPORATIVA - ' + companyName, marginX, 17);

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
    const mType = MeetingDOM.meetingType.options[MeetingDOM.meetingType.selectedIndex].text;
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

function renderMeetingHistory(filter = '') {
    MeetingDOM.historyTableBody.innerHTML = '';
    
    const filtered = MeetingState.history.filter(m => 
        m.title.toLowerCase().includes(filter.toLowerCase()) || 
        m.type.toLowerCase().includes(filter.toLowerCase()) ||
        m.modality.toLowerCase().includes(filter.toLowerCase()) ||
        m.dateString.toLowerCase().includes(filter.toLowerCase())
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
    MeetingDOM.btnGenerateDocs.disabled = false;
    
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

    const token = 'qr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
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
    document.getElementById('attendanceModal').classList.remove('hidden');
    document.getElementById('ap-name').focus();
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').classList.add('hidden');
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================
function setupMeetingEventListeners() {
    // Verificar se os elementos existem antes de adicionar listeners
    if (!MeetingDOM.btnModeRecord || !MeetingDOM.btnModeUpload) {
        console.warn('⚠️ Elementos de reunião não encontrados - listeners não configurados');
        return;
    }
    
    MeetingDOM.btnModeRecord.addEventListener('click', () => setMeetingAudioMode('record'));
    MeetingDOM.btnModeUpload.addEventListener('click', () => setMeetingAudioMode('upload'));

    MeetingDOM.btnRecordStart.addEventListener('click', () => startMeetingRecording(false));
    MeetingDOM.btnRecordOnline.addEventListener('click', () => startMeetingRecording(true));
    MeetingDOM.btnRecordStop.addEventListener('click', stopMeetingRecording);

    MeetingDOM.audioDropZone.addEventListener('click', () => MeetingDOM.audioFileInput.click());
    MeetingDOM.audioFileInput.addEventListener('change', e => handleMeetingFileSelection(e.target.files[0]));
    MeetingDOM.audioDropZone.addEventListener('dragover', e => { e.preventDefault(); MeetingDOM.audioDropZone.classList.add('hover'); });
    MeetingDOM.audioDropZone.addEventListener('dragleave', () => MeetingDOM.audioDropZone.classList.remove('hover'));
    MeetingDOM.audioDropZone.addEventListener('drop', e => {
        e.preventDefault();
        MeetingDOM.audioDropZone.classList.remove('hover');
        if (e.dataTransfer.files.length > 0) handleMeetingFileSelection(e.dataTransfer.files[0]);
    });
    MeetingDOM.btnClearFile.addEventListener('click', clearMeetingUploadedFile);
    MeetingDOM.btnProcessUpload.addEventListener('click', () => { if (MeetingState.uploadedFile) sendMeetingAudioToWhisper(MeetingState.uploadedFile); });

    MeetingDOM.rawTranscript.addEventListener('input', () => {
        MeetingDOM.btnGenerateDocs.disabled = MeetingDOM.rawTranscript.value.trim().length === 0;
    });
    MeetingDOM.btnGenerateDocs.addEventListener('click', generateMeetingMinutes);

    MeetingDOM.btnCopyRecord.addEventListener('click', () => {
        navigator.clipboard.writeText(MeetingDOM.outputRecord.value).then(() => showToast('Ata copiada!')).catch(() => showToast('Erro ao copiar.'));
    });
    MeetingDOM.btnDownloadPdf.addEventListener('click', generateMeetingPDF);
    MeetingDOM.btnSaveMeeting.addEventListener('click', saveMeetingHistory);

    // History
    MeetingDOM.searchMeetingHistory.addEventListener('input', e => renderMeetingHistory(e.target.value));
    MeetingDOM.btnClearMeetingHistory.addEventListener('click', () => {
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
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
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
    }, 100);
});
