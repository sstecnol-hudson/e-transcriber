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
    MeetingState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    MeetingState.analyser = MeetingState.audioContext.createAnalyser();
    MeetingState.source = MeetingState.audioContext.createMediaStreamSource(stream);
    MeetingState.source.connect(MeetingState.analyser);
    MeetingState.analyser.fftSize = 128;
    MeetingState.dataArray = new Uint8Array(MeetingState.analyser.frequencyBinCount);
    animateMeetingWaveform();
}

function animateMeetingWaveform() {
    if (!MeetingState.isRecording) return;
    MeetingState.animationFrameId = requestAnimationFrame(animateMeetingWaveform);
    const canvas = MeetingDOM.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    MeetingState.analyser.getByteFrequencyData(MeetingState.dataArray);
    ctx.clearRect(0, 0, width, height);

    const barWidth = (width / MeetingState.dataArray.length) * 1.5;
    let x = 0;
    for (let i = 0; i < MeetingState.dataArray.length; i++) {
        const barHeight = Math.max(4, (MeetingState.dataArray[i] / 255) * height * 0.9);
        const grad = ctx.createLinearGradient(0, (height - barHeight) / 2, 0, (height + barHeight) / 2);
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(0.5, '#8b5cf6');
        grad.addColorStop(1, '#14b8a6');
        ctx.fillStyle = grad;
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
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
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
    if (file.size > 25 * 1024 * 1024) {
        showToast('Arquivo maior do que 25MB (limite da API do Groq).');
        return;
    }
    MeetingState.uploadedFile = file;
    MeetingDOM.uploadedFileName.textContent = file.name;
    MeetingDOM.uploadedFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    MeetingDOM.fileInfoContainer.classList.remove('hidden');
    MeetingDOM.btnProcessUpload.disabled = false;
    showToast('Arquivo da reunião carregado.');
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
        if (!res.ok) throw new Error(`Erro ${res.status}: ${await res.text()}`);
        const data = await res.json();
        MeetingDOM.rawTranscript.value = data.text || '';
        MeetingState.currentTranscription = data.text || '';
        MeetingDOM.btnGenerateDocs.disabled = !data.text?.trim();
        showToast(data.text?.trim() ? 'Transcrição da reunião concluída!' : 'Aviso: nenhum áudio detectado.');
    } catch (err) {
        MeetingDOM.rawTranscript.value = `Erro: ${err.message}`;
        showToast('Erro ao transcrever áudio.');
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

    const companyName = AppState.clinicInfo.name || 'Empresa';
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
        MeetingDOM.historyTableBody.innerHTML = \`
            <tr class="empty-row">
                <td colspan="5">
                    <div class="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        <p>Nenhuma reunião encontrada.</p>
                    </div>
                </td>
            </tr>\`;
        return;
    }

    filtered.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
            <td><span class="font-medium">\${m.dateString}</span></td>
            <td>\${m.title}</td>
            <td><span class="badge">\${m.type}</span></td>
            <td><span class="badge badge-light">\${m.modality}</span></td>
            <td class="actions-col">
                <button class="btn-action-small" onclick="loadMeetingHistory('\${m.id}')" title="Carregar Ata">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn-action-small btn-danger" onclick="deleteMeetingHistory('\${m.id}')" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        \`;
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
// EVENT LISTENERS
// ==========================================================================
function setupMeetingEventListeners() {
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

    // Historico Actions
    MeetingDOM.searchMeetingHistory.addEventListener('input', e => renderMeetingHistory(e.target.value));
    MeetingDOM.btnClearMeetingHistory.addEventListener('click', () => {
        if (confirm('ATENÇÃO: Isto apagará TODO o histórico de reuniões. Confirmar?')) {
            MeetingState.history = [];
            localStorage.removeItem('etranscriber_meetings_history');
            renderMeetingHistory();
            showToast('Histórico limpo com sucesso.');
        }
    });
}

// Inicializar após carregamento completo
window.addEventListener('DOMContentLoaded', () => {
    // Timeout para garantir que app.js terminou seu init e funções base estão disponíveis (showToast, etc)
    setTimeout(initMeetingModule, 100);
});
