// ==========================================================================
// E-TRANSCRIBER v1.2 - LÓGICA COMPLETA (GROQ API + PACIENTES + TEMA + PDF)
// ==========================================================================

// ==========================================================================
// 0. UTILITÁRIOS GLOBAIS
// ==========================================================================

/** Escapa HTML para prevenir XSS ao inserir dados do usuário via innerHTML */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Debounce: evita chamadas excessivas em eventos de input */
function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/** Fetch com timeout integrado via AbortController */
async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 30000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            throw new Error('⏱️ A requisição excedeu o tempo limite. Verifique sua conexão e tente novamente.');
        }
        throw error;
    }
}
window.fetchWithTimeout = fetchWithTimeout;

/** Fetch com timeout e retry em caso de erros temporários (429, 5xx) */
async function fetchWithRetry(resource, options = {}, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetchWithTimeout(resource, options);
            
            if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1500; // 1.5s, 3s
                if (typeof showToast === 'function') {
                    showToast(`⚠️ Servidor ocupado. Tentando novamente em ${(delay / 1000).toFixed(1)}s...`);
                }
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            return res;
        } catch (err) {
            if (attempt === maxRetries) throw err;
            
            const delay = 1500 * (attempt + 1); // 1.5s, 3.0s
            if (typeof showToast === 'function') {
                showToast(`⚠️ Conexão instável. Nova tentativa em ${(delay / 1000).toFixed(1)}s...`);
            }
            await new Promise(r => setTimeout(r, delay));
        }
    }
}
window.fetchWithRetry = fetchWithRetry;

/** Habilita ou desabilita dinamicamente os botões que dependem da API Groq */
function toggleAiButtonsState() {
    const hasKey = !!AppState.apiKey;
    
    // Módulo Clínico
    const rawText = DOM.rawTranscript.value.trim();
    DOM.btnGenerateDocs.disabled = !hasKey || rawText.length === 0;
    DOM.btnProcessUpload.disabled = !hasKey || !AppState.uploadedFile;
    
    // Módulo de Reuniões
    const btnMeetingDocs = document.getElementById('btn-generate-meeting-docs');
    const rawMeetingTranscript = document.getElementById('rawMeetingTranscript');
    if (btnMeetingDocs && rawMeetingTranscript) {
        btnMeetingDocs.disabled = !hasKey || rawMeetingTranscript.value.trim().length === 0;
    }
    
    const btnMeetingProcessUpload = document.getElementById('btn-process-meeting-upload');
    const meetingFile = (typeof MeetingState !== 'undefined') ? MeetingState.uploadedFile : null;
    if (btnMeetingProcessUpload) {
        btnMeetingProcessUpload.disabled = !hasKey || !meetingFile;
    }
}
window.toggleAiButtonsState = toggleAiButtonsState;


// ---- PROMPTS DE SISTEMA PADRÃO ----
const DEFAULT_PROMPTS = {
    soap: `Você é um assistente de inteligência artificial médica especializado em estruturação de prontuários médicos. Sua tarefa é analisar a transcrição de uma consulta clínica e gerar um prontuário médico estruturado no padrão SOAP.

Estruture sua resposta EXCLUSIVAMENTE nas seguintes seções:

### 1. SUBJETIVO (S)
- **Queixa Principal (QP)**: O motivo principal da consulta na voz do paciente.
- **História da Doença Atual (HDA)**: Cronologia dos sintomas, localização, intensidade, fatores de melhora/piora.
- **Histórico Relevante**: Comorbidades, alergias e medicações em uso MENCIONADAS EXPLICITAMENTE na transcrição.

### 2. OBJETIVO (O)
- **Sinais Vitais e Exame Físico**: Registre APENAS dados explicitamente mencionados. Caso ausentes, escreva "Não avaliado / Não relatado".
- **Exames Complementares**: Resultados de exames trazidos ou citados na consulta. Se não houver, escreva "Nenhum relatado".

### 3. AVALIAÇÃO (A)
- **Hipótese Diagnóstica / Diagnósticos**: Baseie-se SOMENTE nas informações da transcrição. Indique o código CID-10 quando possível (ex: I10 - Hipertensão Essencial). Se a transcrição for insuficiente para uma hipótese segura, escreva "Dados insuficientes para hipótese diagnóstica".
- **Raciocínio Clínico**: Breve resumo do quadro clínico, sem extrapolar o que foi dito.

### 4. PLANO (P)
- **Terapêutica / Medicamentos**: Liste APENAS medicamentos, dosagens e frequências que foram EXPLICITAMENTE prescritos pelo médico na transcrição. ⚠️ NUNCA sugira, complete ou infira nomes de medicamentos, dosagens ou posologias que não tenham sido ditos literalmente. Se nenhuma prescrição foi mencionada, escreva "Nenhuma prescrição registrada nesta transcrição".
- **Exames Solicitados**: Liste apenas exames pedidos explicitamente. Se nenhum, escreva "Nenhum solicitado".
- **Recomendações e Retorno**: Orientações gerais e data de retorno mencionadas. Se não houver, escreva "Não informado".

DIRETRIZES DE SEGURANÇA CLÍNICA:
- Mantenha terminologia médica formal e precisa em português do Brasil.
- ⛔ PROIBIDO inventar ou inferir dados clínicos não mencionados explicitamente na transcrição.
- ⛔ PROIBIDO citar nomes de medicamentos, doses ou esquemas terapêuticos que não tenham sido ditos pelo médico.
- Em caso de dúvida sobre um dado, prefira "Não mencionado" a qualquer suposição.
- Responda apenas com o prontuário em Markdown.`,

    anamnese: `Você é um redator médico especializado em prontuários clínicos. Converta a transcrição em uma Anamnese Tradicional completa.

# ANAMNESE CLÍNICA E CONDUTA

**1. QUEIXA PRINCIPAL (QP)**: Registre o motivo da consulta nas palavras do paciente.
**2. HISTÓRIA DA DOENÇA ATUAL (HDA)**: Cronologia, caracterização e evolução dos sintomas mencionados.
**3. HISTÓRICO PATOLÓGICO PESSOAL E FAMILIAR (HPP / HF)**: Comorbidades, cirurgias, medicamentos em uso e histórico familiar MENCIONADOS na consulta.
**4. EXAME FÍSICO / EXAMES COMPLEMENTARES**: Registre apenas achados e resultados explicitamente citados. Se ausentes, escreva "Não avaliado / Não relatado".
**5. CONDUTA TERAPÊUTICA E PLANO DE AÇÃO**: Inclua SOMENTE prescrições, exames e orientações ditas pelo médico na transcrição. ⚠️ Não complete nem sugira condutas não mencionadas.

DIRETRIZES DE SEGURANÇA:
- Use tom estritamente clínico e formal.
- ⛔ PROIBIDO inventar informações, completar dados ausentes ou inferir medicamentos não citados.
- Sempre que um dado não estiver disponível na transcrição, escreva "Não informado".
- Responda apenas com a estrutura em Markdown.`,

    evolucao: `Você é um assistente de IA médica. Converta a consulta em uma Evolução Clínica de acompanhamento diário/periódico em texto corrido profissional, contendo: estado geral do paciente, adesão ao tratamento mencionada, achados de exame físico registrados e mudanças de conduta descritas pelo médico.

DIRETRIZES DE SEGURANÇA:
- Seja conciso e baseie-se EXCLUSIVAMENTE no que foi dito na transcrição.
- ⛔ PROIBIDO citar ou ajustar medicamentos, doses ou esquemas que não tenham sido explicitamente mencionados.
- Se dados de exame físico ou conduta não foram registrados, escreva "Não avaliado nesta evolução".
- Responda apenas com a evolução clínica em Markdown.`,

    orientacao: `Você é um assistente de saúde empático. Redija um resumo de orientações fácil de ler destinado diretamente ao paciente, baseado EXCLUSIVAMENTE na transcrição da consulta.

Use linguagem simples, amigável e sem termos médicos complexos. Organize com tópicos e emojis:
💊 **Seus Medicamentos** *(liste APENAS os remédios que o médico prescreveu explicitamente na consulta — nome, dose e horário exatamente como foram ditos. Se nenhum remédio foi prescrito, escreva: "Nenhum medicamento foi prescrito nesta consulta.")*
🩺 **Exames para Fazer** *(apenas os exames solicitados explicitamente)*
🥗 **Cuidados no Dia a Dia** *(apenas orientações mencionadas pelo médico)*
📅 **Seu Retorno** *(data ou prazo mencionado, ou "A combinar com seu médico" se não informado)*

⚠️ REGRAS CRÍTICAS:
- ⛔ NUNCA cite nomes de medicamentos, dosagens ou esquemas posológicos que não tenham sido ditos pelo médico na transcrição.
- ⛔ NUNCA sugira tratamentos, remédios ou cuidados além do que foi explicitamente prescrito.
- Se uma informação não foi mencionada, omita aquele tópico ou escreva "Não informado pelo médico".
- Adicione uma mensagem de incentivo e cuidado ao final. Responda exclusivamente com este texto acolhedor.`,

    custom: `Você é um assistente médico de alto desempenho. Organize a transcrição da consulta de acordo com as preferências do médico de forma profissional e objetiva.

DIRETRIZES: Baseie-se APENAS nas informações da transcrição. Não invente dados clínicos, não sugira medicamentos e não complete informações ausentes. Responda em Markdown.`
};

const PATIENT_INSTRUCTIONS_PROMPT = `Você é um assistente de saúde empático. Crie uma mensagem de orientações de saúde para o paciente com base EXCLUSIVAMENTE na transcrição fornecida.

REGRAS DE SEGURANÇA (OBRIGATÓRIAS):
- ⛔ PROIBIDO citar nomes de medicamentos, dosagens ou posologias que NÃO tenham sido explicitamente prescritos pelo médico na transcrição. Se nenhum medicamento foi mencionado, escreva "Nenhum medicamento foi prescrito nesta consulta. Siga as orientações do seu médico".
- ⛔ PROIBIDO sugerir, complementar ou inferir qualquer tipo de tratamento, remédio ou conduta não dita na transcrição.
- Baseie-se APENAS nas informações da consulta. Não invente dados.

FORMATO:
- Use linguagem muito acessível, sem jargões médicos.
- Organize as instruções com tópicos limpos e emojis (💊 📅 🩺 🥗).
- Se medicamento foi prescrito: destaque nome, dose e horário EXATAMENTE como dito pelo médico.
- Diga quais exames ele precisa fazer e quando deve retornar (somente os mencionados).
- Crie um visual agradável pronto para ser copiado e enviado diretamente no WhatsApp.
- Ao final, adicione sempre este aviso: "⚕️ _Este resumo é apenas um lembrete das orientações do seu médico. Em caso de dúvidas, entre em contato com o consultório._"`;

// ---- ESTADO DA APLICAÇÃO ----
const AppState = {
    apiKey: '',
    activeTab: 'tab-consulta',
    activeMode: 'consultas',
    meetingCompanyInfo: { name: '', address: '' },
    audioMode: 'record',
    history: [],
    patients: [],
    customPrompts: {},
    currentSelectedPromptId: 'soap',
    clinicInfo: { name: '', doctor: '', crm: '', phone: '' },

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
    currentRecordOutput: '',
    currentPatientMsgOutput: ''
};

// Configurações globais para transcrição via Groq
const GROQ_TRANSCRIBE_MODEL = 'whisper-large-v3'; // modelo Whisper suportado pela API Groq

// Função utilitária para gerar hash SHA‑256 do Blob de áudio
async function getAudioHash(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    // converte para hex string
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Wrapper de transcrição que verifica cache antes de chamar a API Groq
async function transcribeWithCache(fileBlob, language = 'pt') {
    const hash = await getAudioHash(fileBlob);
    const cacheKey = `groq_whisper_${hash}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        console.log('🔄 Transcrição carregada do cache');
        return cached;
    }
    // Caso não esteja em cache, envia para a API
    const formData = new FormData();
    const filename = fileBlob.name || (fileBlob.type && fileBlob.type.includes('wav') ? 'audio.wav' : 'audio.webm');
    formData.append('file', fileBlob, filename);
    formData.append('model', GROQ_TRANSCRIBE_MODEL);
    formData.append('language', language);
    formData.append('response_format', 'json');
    const res = await fetchWithRetry('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AppState.apiKey}` },
        body: formData
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Transcrição Groq falhou (${res.status}): ${errText}`);
    }
    const data = await res.json();
    localStorage.setItem(cacheKey, data.text);
    return data.text;
}

// ---- ELEMENTOS DO DOM ----
const DOM = {
    // Navegação
    menuItems: document.querySelectorAll('.menu-item'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    headerTitle: document.getElementById('header-title'),
    headerSubtitle: document.getElementById('header-subtitle'),
    apiStatusDot: document.getElementById('api-status-dot'),
    apiStatusText: document.getElementById('api-status-text'),
    apiKeyAlert: document.getElementById('apiKeyAlert'),

    // Tema
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    iconMoon: document.getElementById('icon-moon'),
    iconSun: document.getElementById('icon-sun'),
    iconAuto: document.getElementById('icon-auto'),
    themeSelect: document.getElementById('themeSelect'),

    // Modal de Ajuda
    btnHelp: document.getElementById('btn-help'),
    helpModal: document.getElementById('helpModal'),
    btnHelpModalClose: document.getElementById('btn-help-modal-close'),
    helpContent: document.getElementById('helpContent'),
    helpSearch: document.getElementById('helpSearch'),
    helpNavItems: document.querySelectorAll('.help-nav-item'),

    // Configurações
    groqApiKeyInput: document.getElementById('groqApiKey'),
    btnToggleKey: document.getElementById('btn-toggle-key-visibility'),
    btnSaveKey: document.getElementById('btn-save-key'),
    btnTestKey: document.getElementById('btn-test-key'),
    btnResetAll: document.getElementById('btn-reset-all'),
    clinicName: document.getElementById('clinicName'),
    doctorName: document.getElementById('doctorName'),
    doctorCRM: document.getElementById('doctorCRM'),
    clinicPhone: document.getElementById('clinicPhone'),
    btnSaveClinicInfo: document.getElementById('btn-save-clinic-info'),

    // Formulário do Paciente (Nova Consulta)
    patientName: document.getElementById('patientName'),
    patientAutocomplete: document.getElementById('patientAutocomplete'),
    patientAge: document.getElementById('patientAge'),
    doctorSpecialty: document.getElementById('doctorSpecialty'),
    transcriptionLang: document.getElementById('transcriptionLang'),

    // Captura de Áudio
    btnModeRecord: document.getElementById('btn-mode-record'),
    btnModeUpload: document.getElementById('btn-mode-upload'),
    panelRecord: document.getElementById('capture-panel-record'),
    panelUpload: document.getElementById('capture-panel-upload'),

    // Gravação
    waveformCanvas: document.getElementById('waveformCanvas'),
    recordingTimer: document.getElementById('recordingTimer'),
    btnRecordStart: document.getElementById('btn-record-start'),
    btnRecordTelemed: document.getElementById('btn-record-telemed'),
    btnRecordStop: document.getElementById('btn-record-stop'),

    // Upload
    audioDropZone: document.getElementById('audioDropZone'),
    audioFileInput: document.getElementById('audioFileInput'),
    fileInfoContainer: document.getElementById('file-info-container'),
    uploadedFileName: document.getElementById('uploaded-file-name'),
    uploadedFileSize: document.getElementById('uploaded-file-size'),
    btnClearFile: document.getElementById('btn-clear-file'),
    btnProcessUpload: document.getElementById('btn-process-upload'),

    // Transcrição
    rawTranscript: document.getElementById('rawTranscript'),
    transcriptionLoader: document.getElementById('transcription-loader'),
    transcriptionLoaderText: document.getElementById('transcription-loader-text'),
    clinicalTemplate: document.getElementById('clinicalTemplate'),
    aiModel: document.getElementById('aiModel'),
    btnGenerateDocs: document.getElementById('btn-generate-documents'),
    
    // BVS Dynamic Button
    bvsDynamicContainer: document.getElementById('bvs-dynamic-container'),
    bvsDynamicText: document.getElementById('bvs-dynamic-text'),

    // Resultados
    resultsSection: document.getElementById('results-section'),
    outputRecord: document.getElementById('outputRecord'),
    outputPatientMsg: document.getElementById('outputPatientMsg'),
    prontuarioLoader: document.getElementById('prontuario-loader'),
    pacienteLoader: document.getElementById('paciente-loader'),
    btnCopyRecord: document.getElementById('btn-copy-record'),
    btnDownloadPdf: document.getElementById('btn-download-pdf'),
    btnCopyPatient: document.getElementById('btn-copy-patient'),
    btnShareWhatsApp: document.getElementById('btn-share-whatsapp'),
    actionsSaveRow: document.getElementById('actions-save-row'),
    btnSaveConsult: document.getElementById('btn-save-consult'),

    // Histórico
    searchHistory: document.getElementById('searchHistory'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    historyTableBody: document.getElementById('historyTableBody'),

    // Pacientes
    searchPatients: document.getElementById('searchPatients'),
    btnNewPatient: document.getElementById('btn-new-patient'),
    patientsTableBody: document.getElementById('patientsTableBody'),
    patientsCountBadge: document.getElementById('patients-count-badge'),

    // Modal Histórico
    viewConsultModal: document.getElementById('viewConsultModal'),
    modalPatientName: document.getElementById('modalPatientName'),
    modalDate: document.getElementById('modalDate'),
    modalAge: document.getElementById('modalAge'),
    modalSpecialty: document.getElementById('modalSpecialty'),
    modalProntuarioText: document.getElementById('modalProntuarioText'),
    modalPacienteText: document.getElementById('modalPacienteText'),
    modalTranscricaoText: document.getElementById('modalTranscricaoText'),
    btnModalClose: document.getElementById('btn-modal-close'),
    btnModalCopyProntuario: document.getElementById('btn-modal-copy-prontuario'),
    btnModalCopyPaciente: document.getElementById('btn-modal-copy-paciente'),
    modalTabBtns: document.querySelectorAll('.modal-tab-btn'),
    modalPanes: document.querySelectorAll('.modal-pane'),

    // Modal Paciente
    patientModal: document.getElementById('patientModal'),
    patientModalTitle: document.getElementById('patientModalTitle'),
    patientModalId: document.getElementById('patientModalId'),
    pmName: document.getElementById('pmName'),
    pmBirthdate: document.getElementById('pmBirthdate'),
    pmGender: document.getElementById('pmGender'),
    pmCPF: document.getElementById('pmCPF'),
    pmPhone: document.getElementById('pmPhone'),
    pmInsurance: document.getElementById('pmInsurance'),
    pmEmail: document.getElementById('pmEmail'),
    pmNotes: document.getElementById('pmNotes'),
    btnPatientModalClose: document.getElementById('btn-patient-modal-close'),
    btnPatientModalCancel: document.getElementById('btn-patient-modal-cancel'),
    btnPatientModalSave: document.getElementById('btn-patient-modal-save'),

    // Modelos de Prompt
    modelSelectBtns: document.querySelectorAll('.model-select-btn'),
    promptSystemTitle: document.getElementById('promptSystemTitle'),
    promptSystemContent: document.getElementById('promptSystemContent'),
    btnRestoreDefaultPrompt: document.getElementById('btn-restore-default-prompt'),
    btnSaveCustomPrompt: document.getElementById('btn-save-custom-prompt'),

    // Empresa (Reuniões) — campos na aba Configurações
    meetingCompanyName: document.getElementById('meetingCompanyName'),
    meetingCompanyAddress: document.getElementById('meetingCompanyAddress'),

    // Toast
    toast: document.getElementById('toast'),

    // Banner de Segurança Clínica
    clinicalSafetyBanner: document.getElementById('clinical-safety-banner'),
    btnSafetyBannerClose: document.getElementById('btn-safety-banner-close')
};

// ==========================================================================
// 1. INICIALIZAÇÃO
// ==========================================================================
function init() {
    // Carregar dados do localStorage
    AppState.apiKey = localStorage.getItem('etranscriber_groq_key') || '';
    DOM.groqApiKeyInput.value = AppState.apiKey;
    AppState.activeMode = localStorage.getItem('etranscriber_active_mode') || 'consultas';
    // Carregar informações da empresa para reuniões
    try { AppState.meetingCompanyInfo = JSON.parse(localStorage.getItem('etranscriber_meeting_company')) || { name: '', address: '' }; } catch { AppState.meetingCompanyInfo = { name: '', address: '' }; }
    AppState.aiModel = localStorage.getItem('etranscriber_ai_model') || 'llama-3.3-70b-versatile';

    try { AppState.customPrompts = JSON.parse(localStorage.getItem('etranscriber_custom_prompts')) || {}; } catch { AppState.customPrompts = {}; }
    try { AppState.history = JSON.parse(localStorage.getItem('etranscriber_history')) || []; } catch { AppState.history = []; }
    try { AppState.patients = JSON.parse(localStorage.getItem('etranscriber_patients')) || []; } catch { AppState.patients = []; }
    try { AppState.clinicInfo = JSON.parse(localStorage.getItem('etranscriber_clinic_info')) || { name: '', doctor: '', crm: '', phone: '' }; } catch { AppState.clinicInfo = { name: '', doctor: '', crm: '', phone: '' }; }

    // Preencher campos de configurações
    DOM.clinicName.value = AppState.clinicInfo.name || '';
    DOM.doctorName.value = AppState.clinicInfo.doctor || '';
    DOM.doctorCRM.value = AppState.clinicInfo.crm || '';
    DOM.clinicPhone.value = AppState.clinicInfo.phone || '';
    // Preencher campos de empresa para reuniões
    if (DOM.meetingCompanyName) DOM.meetingCompanyName.value = AppState.meetingCompanyInfo.name || '';
    if (DOM.meetingCompanyAddress) DOM.meetingCompanyAddress.value = AppState.meetingCompanyInfo.address || '';
    // Restaurar modelo de IA selecionado
    if (DOM.aiModel && AppState.aiModel) DOM.aiModel.value = AppState.aiModel;

    // Inicializar AudioProcessor e estado de gravação
    AppState.audioProcessor = new AudioProcessor();
    AppState.recordingState = {};

    // Inicializar UI
    updateApiStatusUI();
    initTheme();
    loadPromptEditor(AppState.currentSelectedPromptId);
    renderHistoryTable();
    renderPatientsTable();
    updatePatientsBadge();
    setupNavigation();
    switchMode('consultas'); // Aplica filtro inicial: mostrar só itens de Consultas
    setupEventListeners();
    setupPatientAutocomplete();
    drawStaticWaveform();

    if (!AppState.apiKey) {
        DOM.apiKeyAlert.classList.remove('hidden');
        setTimeout(() => showToast('⚠️ Configure sua chave Groq em Configurações para usar IA'), 500);
    }

    // Listener para salvar dados da empresa de reuniões
    const btnSaveMeetingCompany = document.getElementById('btn-save-meeting-company');
    if (btnSaveMeetingCompany) {
        btnSaveMeetingCompany.addEventListener('click', () => {
            const name = DOM.meetingCompanyName?.value.trim() || '';
            const address = DOM.meetingCompanyAddress?.value.trim() || '';
            AppState.meetingCompanyInfo = { name, address };
            localStorage.setItem('etranscriber_meeting_company', JSON.stringify(AppState.meetingCompanyInfo));
            showToast('Dados da empresa salvos!');
        });
    }

    // Registrar Service Worker apenas em produção (HTTPS ou localhost)
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registrado com sucesso:', reg.scope))
                .catch(err => console.error('Erro ao registrar Service Worker:', err));
        });
    }
}

// ==========================================================================
// 2. SISTEMA DE TEMA CLARO / ESCURO
// ==========================================================================
function initTheme() {
    const saved = localStorage.getItem('etranscriber_theme') || 'auto';
    applyTheme(saved);

    // Dynamic listener for system theme changes when set to auto
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
        const currentPref = localStorage.getItem('etranscriber_theme') || 'auto';
        if (currentPref === 'auto') {
            applyTheme('auto');
        }
    };
    if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleSystemThemeChange);
    }
}

function toggleTheme() {
    const currentPref = localStorage.getItem('etranscriber_theme') || 'auto';
    let nextPref;
    if (currentPref === 'auto') {
        nextPref = 'light';
    } else if (currentPref === 'light') {
        nextPref = 'dark';
    } else {
        nextPref = 'auto';
    }
    applyTheme(nextPref);
    localStorage.setItem('etranscriber_theme', nextPref);

    const labels = { auto: 'Automático (Sistema)', light: 'Tema Claro', dark: 'Tema Escuro' };
    showToast(`Tema alterado para: ${labels[nextPref]}`);
}

function applyTheme(themeMode) {
    let themeToApply = themeMode;
    if (themeMode === 'auto') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeToApply = isSystemDark ? 'dark' : 'light';
    }

    document.body.setAttribute('data-theme', themeToApply);

    // Update icons visibility
    if (themeMode === 'light') {
        DOM.iconMoon.classList.add('hidden');
        DOM.iconSun.classList.remove('hidden');
        if (DOM.iconAuto) DOM.iconAuto.classList.add('hidden');
    } else if (themeMode === 'dark') {
        DOM.iconMoon.classList.remove('hidden');
        DOM.iconSun.classList.add('hidden');
        if (DOM.iconAuto) DOM.iconAuto.classList.add('hidden');
    } else {
        DOM.iconMoon.classList.add('hidden');
        DOM.iconSun.classList.add('hidden');
        if (DOM.iconAuto) DOM.iconAuto.classList.remove('hidden');
    }

    // Update select dropdown selection if it exists
    if (DOM.themeSelect) {
        DOM.themeSelect.value = themeMode;
    }
}

// ==========================================================================
// 3. GERENCIAMENTO DE STATUS E UTILITÁRIOS
// ==========================================================================
function updateApiStatusUI() {
    const hasKey = !!AppState.apiKey;
    if (hasKey) {
        DOM.apiStatusDot.className = 'status-dot green';
        DOM.apiStatusText.textContent = 'Groq Configurado';
        DOM.apiKeyAlert.classList.add('hidden');
    } else {
        DOM.apiStatusDot.className = 'status-dot red';
        DOM.apiStatusText.textContent = 'Groq Desconectado';
        DOM.apiKeyAlert.classList.add('hidden');
    }
    
    // Atualizar estado de botões que dependem da API
    toggleAiButtonsState();
}

let toastTimeout = null;
function showToast(message, duration = 3500) {
    DOM.toast.textContent = message;
    DOM.toast.classList.remove('hidden');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => DOM.toast.classList.add('hidden'), duration);
}

function getSystemPrompt(templateId) {
    return AppState.customPrompts[templateId] || DEFAULT_PROMPTS[templateId];
}

// ==========================================================================
// 4. NAVEGAÇÃO ENTRE ABAS
// ==========================================================================
function setupNavigation() {
    DOM.menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const targetTab = item.getAttribute('data-tab');
            if (targetTab === 'tab-consulta') {
                const proceed = handleNewConsultClick();
                if (!proceed) {
                    e.preventDefault();
                    return;
                }
            } else if (targetTab === 'tab-reunioes') {
                const proceed = typeof handleNewMeetingClick === 'function' ? handleNewMeetingClick() : true;
                if (!proceed) {
                    e.preventDefault();
                    return;
                }
            }
            switchTab(targetTab, item);
        });
    });

    // Botões de modo: CONSULTAS / REUNIÕES
    const btnModeConsultas = document.getElementById('btn-mode-consultas');
    const btnModeReunioes = document.getElementById('btn-mode-reunioes');

    if (btnModeConsultas && btnModeReunioes) {
        btnModeConsultas.addEventListener('click', () => switchMode('consultas'));
        btnModeReunioes.addEventListener('click', () => switchMode('reunioes'));
    }
}

function switchMode(mode) {
    // Verificar dados não salvos no modo atual antes de alternar
    if (AppState.activeMode === 'consultas' && mode === 'reunioes') {
        const proceed = handleNewConsultClick();
        if (!proceed) return;
    } else if (AppState.activeMode === 'reunioes' && mode === 'consultas') {
        const proceed = typeof handleNewMeetingClick === 'function' ? handleNewMeetingClick() : true;
        if (!proceed) return;
    }

    AppState.activeMode = mode;
    localStorage.setItem('etranscriber_active_mode', mode);

    // Atualizar botões de modo
    document.getElementById('btn-mode-consultas')?.classList.toggle('active', mode === 'consultas');
    document.getElementById('btn-mode-reunioes')?.classList.toggle('active', mode === 'reunioes');

    // Atualizar visibilidade dos itens de menu
    DOM.menuItems.forEach(item => {
        const itemMode = item.getAttribute('data-mode');
        if (itemMode === 'both' || itemMode === mode) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    // Atualizar visibilidade de outros elementos (ex.: cards de configuração)
    document.querySelectorAll('[data-mode]').forEach(el => {
        const elMode = el.getAttribute('data-mode');
        if (elMode === 'both' || elMode === mode) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    // Navegar para a aba padrão do modo selecionado
    if (mode === 'consultas') {
        switchTab('tab-consulta');
    } else {
        switchTab('tab-reunioes');
    }
}

function switchTab(tabId, menuItemElement = null) {
    DOM.menuItems.forEach(m => m.classList.remove('active'));
    if (menuItemElement) {
        menuItemElement.classList.add('active');
    } else {
        const btn = document.querySelector(`.menu-item[data-tab="${tabId}"]`);
        if (btn) btn.classList.add('active');
    }
    DOM.tabPanes.forEach(pane => {
        pane.classList.toggle('active', pane.id === tabId);
    });
    AppState.activeTab = tabId;
    updateHeader(tabId);
    if (tabId === 'tab-historico') renderHistoryTable();
    if (tabId === 'tab-pacientes') renderPatientsTable();
    if (tabId === 'tab-historico-reunioes' && typeof renderMeetingHistory === 'function') renderMeetingHistory();
}

function updateHeader(tabId) {
    const map = {
        'tab-consulta':   ['Nova Consulta', 'Grave e processe a consulta com Inteligência Artificial'],
        'tab-pacientes':  ['Cadastro de Pacientes', 'Gerencie seus pacientes e inicie novas consultas com um clique'],
        'tab-historico':  ['Histórico de Consultas', 'Acesse e exporte prontuários gerados anteriormente'],
        'tab-historico-reunioes': ['Histórico de Reuniões', 'Acesse e exporte atas geradas anteriormente'],
        'tab-modelos':    ['Modelos de Prompt', 'Ajuste as diretrizes da IA para cada tipo de prontuário'],
        'tab-reunioes':   ['Reuniões', 'Grave e gere atas de reuniões corporativas automaticamente'],
        'tab-config':     ['Configurações', 'Gerencie sua chave do Groq e dados do consultório']
    };
    const [title, subtitle] = map[tabId] || ['E-Transcriber', ''];
    DOM.headerTitle.textContent = title;
    DOM.headerSubtitle.textContent = subtitle;
}

/** Verifica se há dados não salvos e solicita confirmação do usuário */
function handleNewConsultClick() {
    const hasUnsavedData = (
        (DOM.patientName && DOM.patientName.value.trim() !== '') ||
        (DOM.patientAge && DOM.patientAge.value.trim() !== '') ||
        (DOM.doctorSpecialty && DOM.doctorSpecialty.value.trim() !== '') ||
        (DOM.rawTranscript && DOM.rawTranscript.value.trim() !== '') ||
        (DOM.outputRecord && DOM.outputRecord.value.trim() !== '') ||
        AppState.uploadedFile !== null
    );

    const isSaved = DOM.btnSaveConsult ? DOM.btnSaveConsult.disabled : false;
    
    if (hasUnsavedData && !isSaved) {
        if (!confirm('Deseja iniciar uma nova consulta? A consulta atual não foi salva e seus dados serão perdidos.')) {
            return false;
        }
    }

    resetConsultationFields();
    return true;
}

/** Reseta todos os campos da tela de consulta, limpando o estado */
function resetConsultationFields() {
    if (DOM.patientName) DOM.patientName.value = '';
    if (DOM.patientAge) DOM.patientAge.value = '';
    if (DOM.doctorSpecialty) DOM.doctorSpecialty.value = '';
    
    if (DOM.rawTranscript) DOM.rawTranscript.value = '';
    AppState.currentTranscription = '';
    
    if (DOM.outputRecord) DOM.outputRecord.value = '';
    AppState.currentRecordOutput = '';
    
    if (DOM.outputPatientMsg) DOM.outputPatientMsg.value = '';
    AppState.currentPatientMsgOutput = '';
    
    clearUploadedFile();
    
    if (DOM.resultsSection) DOM.resultsSection.classList.add('hidden');

    if (DOM.actionsSaveRow) DOM.actionsSaveRow.classList.add('hidden');
    if (DOM.bvsDynamicContainer) DOM.bvsDynamicContainer.classList.add('hidden');

    // Ocultar banner de segurança clínica e remover avisos de medicamentos
    if (DOM.clinicalSafetyBanner) DOM.clinicalSafetyBanner.classList.add('hidden');
    ['med-hallucination-warning', 'med-hallucination-warning-patient'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });


    
    if (DOM.btnSaveConsult) {
        DOM.btnSaveConsult.disabled = false;
        DOM.btnSaveConsult.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Salvar no Histórico Local</span>
        `;
    }
    
    // Parar gravações ativas (fire-and-forget — função síncrona)
    if (AppState.audioProcessor && AppState.audioProcessor.isRecording) {
        AppState.audioProcessor.stopRecording().catch(() => {});
        if (AppState.recordingTimerInterval) clearInterval(AppState.recordingTimerInterval);
        if (AppState.recordingState?.qualityInterval) clearInterval(AppState.recordingState.qualityInterval);
        AppState.recordingState?.visualizer?.stop();
        AppState.audioProcessor.cleanup().catch(() => {});
    }
    
    if (DOM.btnRecordStart) DOM.btnRecordStart.disabled = false;
    if (DOM.btnRecordTelemed) DOM.btnRecordTelemed.disabled = false;
    if (DOM.btnRecordStop) DOM.btnRecordStop.disabled = true;
    if (DOM.recordingTimer) DOM.recordingTimer.textContent = '00:00';
    
    drawStaticWaveform();
    toggleAiButtonsState();
}

// ==========================================================================
// 5. CADASTRO DE PACIENTES (MINI-CRM)
// ==========================================================================
function updatePatientsBadge() {
    const count = AppState.patients.length;
    DOM.patientsCountBadge.textContent = count;
    DOM.patientsCountBadge.classList.toggle('hidden', count === 0);
}

function renderPatientsTable() {
    const body = DOM.patientsTableBody;
    body.innerHTML = '';
    const filter = (DOM.searchPatients.value || '').toLowerCase().trim();

    const filtered = AppState.patients.filter(p =>
        p.name.toLowerCase().includes(filter) ||
        (p.cpf || '').toLowerCase().includes(filter) ||
        (p.insurance || '').toLowerCase().includes(filter)
    );

    if (filtered.length === 0) {
        body.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <p>${filter ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado. Clique em "Novo Paciente" para começar.'}</p>
        </div></td></tr>`;
        return;
    }

    filtered.slice().reverse().forEach(p => {
        // Contar consultas deste paciente no histórico
        const consultCount = AppState.history.filter(h => h.patientName.toLowerCase() === p.name.toLowerCase()).length;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>${escapeHtml(p.birthdate) || '-'}</td>
            <td>${escapeHtml(p.cpf) || '-'}</td>
            <td>${escapeHtml(p.phone) || '-'}</td>
            <td>${escapeHtml(p.insurance) || '-'}</td>
            <td style="text-align:center"><span class="count-badge" style="display:inline-block;background:var(--primary)">${consultCount}</span></td>
            <td class="actions-col">
                <div class="table-actions">
                    <button class="btn-icon btn-start-consult-for-patient" data-id="${escapeHtml(p.id)}" title="Iniciar Nova Consulta" aria-label="Iniciar consulta para ${escapeHtml(p.name)}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--primary)"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                    <button class="btn-icon btn-edit-patient" data-id="${escapeHtml(p.id)}" title="Editar Paciente" aria-label="Editar ${escapeHtml(p.name)}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-delete-patient" data-id="${escapeHtml(p.id)}" title="Excluir Paciente" aria-label="Excluir ${escapeHtml(p.name)}" style="color:var(--danger)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>`;
        body.appendChild(tr);
    });

    // Event listeners da tabela
    body.querySelectorAll('.btn-start-consult-for-patient').forEach(btn => {
        btn.addEventListener('click', () => startConsultForPatient(btn.getAttribute('data-id')));
    });
    body.querySelectorAll('.btn-edit-patient').forEach(btn => {
        btn.addEventListener('click', () => openPatientModal(btn.getAttribute('data-id')));
    });
    body.querySelectorAll('.btn-delete-patient').forEach(btn => {
        btn.addEventListener('click', () => deletePatient(btn.getAttribute('data-id')));
    });
}

function openPatientModal(patientId = null) {
    // Limpar formulário
    DOM.patientModalId.value = '';
    DOM.pmName.value = '';
    DOM.pmBirthdate.value = '';
    DOM.pmGender.value = '';
    DOM.pmCPF.value = '';
    DOM.pmPhone.value = '';
    DOM.pmInsurance.value = '';
    DOM.pmEmail.value = '';
    DOM.pmNotes.value = '';

    if (patientId) {
        const p = AppState.patients.find(x => x.id === patientId);
        if (!p) return;
        DOM.patientModalTitle.textContent = 'Editar Paciente';
        DOM.patientModalId.value = p.id;
        DOM.pmName.value = p.name || '';
        DOM.pmBirthdate.value = p.birthdate || '';
        DOM.pmGender.value = p.gender || '';
        DOM.pmCPF.value = p.cpf || '';
        DOM.pmPhone.value = p.phone || '';
        DOM.pmInsurance.value = p.insurance || '';
        DOM.pmEmail.value = p.email || '';
        DOM.pmNotes.value = p.notes || '';
    } else {
        DOM.patientModalTitle.textContent = 'Novo Paciente';
    }

    DOM.patientModal.classList.remove('hidden');
    setTimeout(() => DOM.pmName.focus(), 100);
}

function closePatientModal() {
    DOM.patientModal.classList.add('hidden');
}

function savePatient() {
    const name = DOM.pmName.value.trim();
    if (!name) {
        showToast('O nome do paciente é obrigatório!');
        DOM.pmName.focus();
        return;
    }

    const patientData = {
        id: DOM.patientModalId.value || 'p_' + Date.now(),
        name,
        birthdate: DOM.pmBirthdate.value.trim(),
        gender: DOM.pmGender.value,
        cpf: DOM.pmCPF.value.trim(),
        phone: DOM.pmPhone.value.trim(),
        insurance: DOM.pmInsurance.value.trim(),
        email: DOM.pmEmail.value.trim(),
        notes: DOM.pmNotes.value.trim(),
        createdAt: DOM.patientModalId.value ? undefined : new Date().toISOString()
    };

    const existingIdx = AppState.patients.findIndex(p => p.id === patientData.id);
    if (existingIdx >= 0) {
        // Preservar data de criação
        patientData.createdAt = AppState.patients[existingIdx].createdAt;
        AppState.patients[existingIdx] = patientData;
        showToast('Paciente atualizado com sucesso!');
    } else {
        AppState.patients.push(patientData);
        showToast('Paciente cadastrado com sucesso!');
    }

    localStorage.setItem('etranscriber_patients', JSON.stringify(AppState.patients));
    closePatientModal();
    renderPatientsTable();
    updatePatientsBadge();
}

function deletePatient(id) {
    if (confirm('Deseja excluir este paciente do cadastro permanentemente?')) {
        AppState.patients = AppState.patients.filter(p => p.id !== id);
        localStorage.setItem('etranscriber_patients', JSON.stringify(AppState.patients));
        renderPatientsTable();
        updatePatientsBadge();
        showToast('Paciente excluído.');
    }
}

// Botão "Iniciar Consulta" a partir da tabela de pacientes
function startConsultForPatient(patientId) {
    const p = AppState.patients.find(x => x.id === patientId);
    if (!p) return;

    // Verificar se há dados não salvos
    const hasUnsavedData = (
        (DOM.patientName && DOM.patientName.value.trim() !== '') ||
        (DOM.patientAge && DOM.patientAge.value.trim() !== '') ||
        (DOM.doctorSpecialty && DOM.doctorSpecialty.value.trim() !== '') ||
        (DOM.rawTranscript && DOM.rawTranscript.value.trim() !== '') ||
        (DOM.outputRecord && DOM.outputRecord.value.trim() !== '') ||
        AppState.uploadedFile !== null
    );

    const isSaved = DOM.btnSaveConsult ? DOM.btnSaveConsult.disabled : false;
    
    if (hasUnsavedData && !isSaved) {
        if (!confirm('Deseja iniciar uma nova consulta? A consulta atual não foi salva e seus dados serão perdidos.')) {
            return;
        }
    }

    resetConsultationFields();

    // Preencher dados do paciente
    DOM.patientName.value = p.name;
    DOM.patientAge.value = p.birthdate || '';
    
    switchTab('tab-consulta');
    showToast(`Consulta iniciada para ${p.name}`);
}

function setupPatientAutocomplete() {
    DOM.patientName.addEventListener('input', handleAutocompleteInput);
    DOM.patientName.addEventListener('focus', handleAutocompleteInput);

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrapper')) {
            DOM.patientAutocomplete.classList.add('hidden');
        }
    });
}

function handleAutocompleteInput() {
    const query = DOM.patientName.value.trim().toLowerCase();

    if (AppState.patients.length === 0) {
        DOM.patientAutocomplete.classList.add('hidden');
        return;
    }

    const matches = query
        ? AppState.patients.filter(p => p.name.toLowerCase().includes(query)).slice(0, 6)
        : AppState.patients.slice(-6).reverse();

    if (matches.length === 0 && query.length > 0) {
        // Mostrar opção de criar novo paciente
        DOM.patientAutocomplete.innerHTML = `
            <div class="autocomplete-item-new" id="autocomplete-create-new">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                Cadastrar "${escapeHtml(DOM.patientName.value)}" como novo paciente
            </div>`;
        DOM.patientAutocomplete.classList.remove('hidden');
        document.getElementById('autocomplete-create-new').addEventListener('click', () => {
            openPatientModal();
            DOM.pmName.value = DOM.patientName.value;
            DOM.patientAutocomplete.classList.remove('hidden');
        });
        return;
    }

    if (matches.length === 0) {
        DOM.patientAutocomplete.classList.add('hidden');
        return;
    }

    DOM.patientAutocomplete.innerHTML = matches.map(p => {
        const initials = p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        const sub = [p.birthdate, p.insurance].filter(Boolean).join(' · ') || 'Paciente cadastrado';
        return `<div class="autocomplete-item" data-patient-id="${escapeHtml(p.id)}">
            <div class="autocomplete-avatar">${escapeHtml(initials)}</div>
            <div class="autocomplete-info">
                <span class="autocomplete-name">${escapeHtml(p.name)}</span>
                <span class="autocomplete-sub">${escapeHtml(sub)}</span>
            </div>
        </div>`;
    }).join('');

    DOM.patientAutocomplete.classList.remove('hidden');

    DOM.patientAutocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
            const pid = item.getAttribute('data-patient-id');
            const patient = AppState.patients.find(p => p.id === pid);
            if (patient) {
                DOM.patientName.value = patient.name;
                DOM.patientAge.value = patient.birthdate || '';
                if (patient.notes) showToast(`⚠️ Obs: ${patient.notes}`);
            }
            DOM.patientAutocomplete.classList.remove('hidden');
        });
    });
}

// ==========================================================================
// 7. EXPORTAÇÃO DE PDF PROFISSIONAL (jsPDF)
// ==========================================================================
function generatePDF() {
    const recordText = DOM.outputRecord.value.trim();
    if (!recordText) {
        showToast('Nenhum prontuário gerado para exportar!');
        return;
    }
    if (!window.jspdf) {
        showToast('Biblioteca PDF não carregada. Verifique sua conexão.');
        return;
    }
    try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const contentWidth = pageWidth - marginX * 2;
    let y = 0;

    // ---- CABEÇALHO ----
    // Faixa superior colorida
    doc.setFillColor(99, 102, 241); // Indigo
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Nome do consultório
    const clinicName = AppState.clinicInfo.name || 'Consultório';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(clinicName, marginX, 13);

    // Médico e CRM
    const doctorText = [AppState.clinicInfo.doctor, AppState.clinicInfo.crm].filter(Boolean).join(' | ');
    if (doctorText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(doctorText, marginX, 21);
    }

    // Telefone alinhado à direita
    if (AppState.clinicInfo.phone) {
        doc.setFontSize(9);
        doc.text(`Tel: ${AppState.clinicInfo.phone}`, pageWidth - marginX, 21, { align: 'right' });
    }

    y = 36;

    // ---- DADOS DO PACIENTE ----
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(marginX, y, contentWidth, 28, 2, 2, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DADOS DO ATENDIMENTO', marginX + 5, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const pName = DOM.patientName.value || 'Não Identificado';
    const pAge = DOM.patientAge.value || 'Não Informado';
    const pSpec = DOM.doctorSpecialty.value || 'Clínica Geral';
    const pDate = new Date().toLocaleString('pt-BR');

    doc.text(`Paciente: ${pName}`, marginX + 5, y + 16);
    doc.text(`Idade: ${pAge}   |   Especialidade: ${pSpec}`, marginX + 5, y + 22);
    doc.text(`Data/Hora: ${pDate}`, pageWidth - marginX - 5, y + 16, { align: 'right' });

    y += 36;

    // ---- LINHA SEPARADORA ----
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 6;

    // ---- CONTEÚDO DO PRONTUÁRIO ----
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('PRONTUÁRIO MÉDICO', marginX, y);
    y += 7;

    // Remover marcação Markdown para o PDF e renderizar linha a linha
    const lines = recordText.split('\n');
    doc.setFontSize(9);

    for (const rawLine of lines) {
        // Verificar quebra de página
        if (y > pageHeight - 28) {
            doc.addPage();
            y = 18;
        }

        const line = rawLine.trim();

        if (line.startsWith('### ') || line.startsWith('## ')) {
            // Subtítulo nível 2 ou 3 - negrito, indigo
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(99, 102, 241);
            const clean = line.replace(/^#{2,3}\s/, '');
            doc.text(clean, marginX, y);
            y += 6;
            // Underline leve
            doc.setDrawColor(200, 200, 240);
            doc.setLineWidth(0.3);
            doc.line(marginX, y - 1, pageWidth - marginX, y - 1);
            y += 2;
            doc.setFontSize(9);
        } else if (line.startsWith('# ')) {
            // Título nível 1
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(line.replace('# ', ''), marginX, y);
            y += 7;
            doc.setFontSize(9);
        } else if (line.startsWith('- **') || line.startsWith('- ')) {
            // Bullets
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            const cleanLine = line.replace(/\*\*/g, '');
            const wrapped = doc.splitTextToSize('• ' + cleanLine.replace(/^-\s/, ''), contentWidth - 4);
            doc.text(wrapped, marginX + 3, y);
            y += wrapped.length * 5;
        } else if (line.startsWith('**') && line.endsWith('**')) {
            // Linha toda em negrito
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

    // ---- RODAPÉ ----
    const footerY = pageHeight - 14;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Este documento foi gerado com auxílio de Inteligência Artificial e deve ser revisado e validado pelo médico responsável antes de qualquer uso clínico ou legal.', marginX, footerY, { maxWidth: contentWidth * 0.75 });

    // Número de páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, footerY, { align: 'right' });
    }

    // Salvar o PDF
    const safePatientName = (DOM.patientName.value || 'paciente').toLowerCase().replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`prontuario_${safePatientName}_${dateStr}.pdf`);
    showToast('PDF exportado com sucesso!');
    } catch (err) {
        showToast('Erro ao gerar PDF. Tente novamente.');
        console.error('generatePDF error:', err);
    }
}

// ==========================================================================
// 8. CAPTURA E GRAVAÇÃO DE ÁUDIO
// ==========================================================================
function setAudioMode(mode) {
    AppState.audioMode = mode;
    DOM.btnModeRecord.classList.toggle('active', mode === 'record');
    DOM.btnModeUpload.classList.toggle('active', mode === 'upload');
    DOM.panelRecord.classList.toggle('active', mode === 'record');
    DOM.panelUpload.classList.toggle('active', mode === 'upload');
}

async function startRecording() {
    if (!AppState.apiKey) {
        showToast('Configure sua chave Groq em Configurações primeiro!');
        switchTab('tab-config');
        return;
    }

    try {
        // Gravação presencial - usar audioProcessor
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
            // Atualizar VU Meter de consultas
            updateVuMeter('vu-meter-consulta', AppState.audioProcessor.getVolumeLevelPercent());
        }, 80);

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
        // Mostrar VU Meter
        const vuConsulta = document.getElementById('vu-meter-consulta');
        if (vuConsulta) vuConsulta.classList.remove('hidden');

        // Armazenar estado
        AppState.recordingState = {
            visualizer,
            qualityInterval,
            qualityMonitor
        };

        showToast('Gravação presencial iniciada');
    } catch (err) {
        console.error('Erro ao iniciar gravação presencial:', err);
        showToast(`Erro: ${err.message}`);
    }
}

// ==========================================================================
// 3.1 GRAVAÇÃO TELEMEDICINA - Usar audioProcessor.startOnlineRecording()
// ==========================================================================

/**
 * Inicia gravação de telemedicina combinando áudio do microfone e da tela
 * Valida API key antes de iniciar
 * Trata resultado com sucesso/erro
 * 
 * Requirements: 1.2, 1.3, 1.7, 10.1
 */
async function startTelemedicineRecording() {
    // Validar API key
    if (!AppState.apiKey) {
        showToast('Configure sua chave Groq em Configurações primeiro!');
        switchTab('tab-config');
        return;
    }

    try {
        // Implementar chamada a audioProcessor.startOnlineRecording()
        const result = await AppState.audioProcessor.startOnlineRecording();
        
        // Tratar resultado com erro
        if (!result.success) {
            showToast(result.message);
            return;
        }

        AppState.audioProcessor.onDisplayStreamEnded = () => {
            console.log('[Telemedicine] Screen sharing stopped by user, ending recording...');
            stopRecording();
        };

        // Configurar visualizador
        const canvas = DOM.waveformCanvas;
        const visualizer = AppState.audioProcessor.setupVisualizer(canvas, result.stream);
        visualizer.start('bars');

        // Iniciar monitoramento de qualidade
        const qualityMonitor = AppState.audioProcessor.startQualityMonitoring();
        const qualityInterval = setInterval(() => {
            const metrics = AppState.audioProcessor.getQualityMetrics();
            updateQualityDisplay(metrics);
            // Atualizar VU Meter de consultas
            updateVuMeter('vu-meter-consulta', AppState.audioProcessor.getVolumeLevelPercent());
        }, 80);

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
        // Mostrar VU Meter
        const vuConsulta = document.getElementById('vu-meter-consulta');
        if (vuConsulta) vuConsulta.classList.remove('hidden');

        // Armazenar estado
        AppState.recordingState = {
            visualizer,
            qualityInterval,
            qualityMonitor
        };

        // Tratar resultado com sucesso
        if (!result.systemAudioActive) {
            showToast('⚠️ Áudio do sistema não compartilhado. Gravando apenas microfone.', 5000);
        } else {
            showToast('Gravação de Telemedicina iniciada.');
        }
    } catch (err) {
        console.error('Erro ao iniciar gravação de telemedicina:', err);
        showToast(`Erro: ${err.message}`);
    }
}



function drawRoundRect(ctx, x, y, w, h, r) {
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

function drawStaticWaveform() {
    const canvas = DOM.waveformCanvas;
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

function updateQualityDisplay(metrics) {
    const qualityPanel = document.getElementById('quality-metrics-panel');
    const vizControls = document.getElementById('visualization-controls');
    
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
    const qualityValue = document.getElementById('qualityValue');
    const noiseValue = document.getElementById('noiseValue');
    const clippingValue = document.getElementById('clippingValue');
    const peakValue = document.getElementById('peakValue');

    if (qualityValue) {
        qualityValue.textContent = qualityText;
        qualityValue.style.color = qualityColor;
    }
    if (noiseValue) noiseValue.textContent = metrics ? metrics.noiseLevel : '0';
    if (clippingValue) clippingValue.textContent = metrics ? (metrics.clipping ? 'SIM' : 'NÃO') : 'NÃO';
    if (peakValue) peakValue.textContent = metrics ? metrics.peakLevel : '0';
}

/**
 * Atualiza o VU Meter visual com base no nível de volume (0–100).
 * @param {string} meterId - ID do elemento VU Meter no DOM
 * @param {number} level - Nível de volume de 0 a 100
 */
function updateVuMeter(meterId, level) {
    const meter = document.getElementById(meterId);
    if (!meter) return;
    const segments = meter.querySelectorAll('.vu-segment');
    const activeCount = Math.round((level / 100) * segments.length);
    segments.forEach((seg, i) => {
        seg.classList.toggle('active', i < activeCount);
    });
}

async function stopRecording() {
    if (!AppState.audioProcessor.isRecording) return;

    try {
        // Parar gravação (AudioContext permanece aberto para processamento)
        // stopRecording() retorna uma Promise que resolve após o evento 'stop'
        // do MediaRecorder, garantindo que todos os chunks estejam disponíveis.
        const result = await AppState.audioProcessor.stopRecording();
        if (!result.success) {
            showToast('Erro ao parar gravação');
            return;
        }

        // Limpar UI de gravação
        clearInterval(AppState.recordingTimerInterval);
        clearInterval(AppState.recordingState.qualityInterval);
        AppState.recordingState.visualizer?.stop();

        // Validar duração mínima (Item 4)
        if (result.duration < 3000) {
            showToast('⚠️ Gravação muito curta (mínimo 3 segundos). Tente novamente.');
            await AppState.audioProcessor.cleanup().catch(() => {});
            // Ocultar VU Meter ao parar
            const vuConsulta = document.getElementById('vu-meter-consulta');
            if (vuConsulta) {
                updateVuMeter('vu-meter-consulta', 0);
                vuConsulta.classList.add('hidden');
            }
            DOM.btnRecordStart.disabled = false;
            DOM.btnRecordTelemed.disabled = false;
            DOM.btnRecordStop.disabled = true;
            DOM.recordingTimer.textContent = '00:00';
            drawStaticWaveform();
            return;
        }

        // Obter blob bruto
        const audioBlob = AppState.audioProcessor.getRecordedAudioBlob();

        // 1ª etapa: pré-processamento (filtros de voz: passa-alta, normalização, compressor de voz)
        showToast('⏳ Pré-processando áudio...');
        const preprocessed = await AppState.audioProcessor.preprocessAudio(audioBlob);
        const preprocessedBlob = preprocessed.success ? preprocessed.blob : audioBlob;
        if (!preprocessed.success) {
            console.warn('Pré-processamento falhou, usando áudio original:', preprocessed.error);
        }

        // 2ª etapa: compressão para reduzir tamanho (16kHz, WAV)
        showToast('⏳ Comprimindo áudio...');
        const compressed = await AppState.audioProcessor.compressAudio(preprocessedBlob);
        const finalBlob = compressed.success ? compressed.blob : preprocessedBlob;

        // Liberar AudioContext e recursos (processamento concluído)
        await AppState.audioProcessor.cleanup();

        // 3ª etapa: enviar para Groq Whisper
        await sendAudioToWhisper(finalBlob);

        // Ocultar VU Meter ao finalizar gravação
        const vuConsulta2 = document.getElementById('vu-meter-consulta');
        if (vuConsulta2) {
            updateVuMeter('vu-meter-consulta', 0);
            vuConsulta2.classList.add('hidden');
        }

        // Resetar UI
        DOM.btnRecordStart.disabled = false;
        DOM.btnRecordTelemed.disabled = false;
        DOM.btnRecordStop.disabled = true;
        DOM.recordingTimer.textContent = '00:00';
    } catch (err) {
        console.error('Erro ao parar gravação:', err);
        // Garantir limpeza mesmo em caso de erro
        await AppState.audioProcessor.cleanup().catch(() => {});
        handleRecordingError(err);
    }
}

// ==========================================================================
// 8.5 TRATAMENTO DE ERROS DE GRAVAÇÃO
// ==========================================================================

function handleRecordingError(err) {
    let errorMessage = 'Erro desconhecido ao acessar áudio.';

    if (err.name === 'NotAllowedError') {
        errorMessage = '❌ Permissão negada. Verifique as permissões de microfone nas configurações do navegador.';
    } else if (err.name === 'NotFoundError') {
        errorMessage = '❌ Nenhum dispositivo de áudio encontrado. Conecte um microfone e tente novamente.';
    } else if (err.name === 'NotReadableError') {
        errorMessage = '❌ Não foi possível acessar o dispositivo de áudio. Verifique se outro aplicativo está usando o microfone.';
    } else if (err.name === 'SecurityError') {
        errorMessage = '❌ Erro de segurança. Use HTTPS ou localhost para acessar o microfone.';
    } else if (err.message) {
        errorMessage = `❌ Erro: ${err.message}`;
    }

    showToast(errorMessage, 5000);
    
    // Resetar UI em caso de erro
    DOM.btnRecordStart.disabled = false;
    DOM.btnRecordTelemed.disabled = false;
    DOM.btnRecordStop.disabled = true;
    DOM.recordingTimer.textContent = '00:00';
    
    // Limpar intervalo se existir
    if (AppState.recordingTimerInterval) {
        clearInterval(AppState.recordingTimerInterval);
    }
    if (AppState.recordingState.qualityInterval) {
        clearInterval(AppState.recordingState.qualityInterval);
    }
    if (AppState.recordingState.visualizer) {
        AppState.recordingState.visualizer.stop();
    }
}

// ==========================================================================
// 9. UPLOAD DE ARQUIVOS (DRAG & DROP)
// ==========================================================================
function handleFileSelection(file) {
    if (!file) return;
    
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB — chunking automático acima deste limite
    // Não bloquear o upload: o chunking em sendAudioToWhisper gerenciará arquivos maiores
    if (file.size > MAX_SIZE) {
        showToast(`⚠️ Arquivo grande (${(file.size/1024/1024).toFixed(1)}MB). Será dividido automaticamente em partes para transcrição.`, 5000);
    }
    
    AppState.uploadedFile = file;
    DOM.uploadedFileName.textContent = file.name;
    DOM.uploadedFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    DOM.fileInfoContainer.classList.remove('hidden');
    toggleAiButtonsState();
    showToast('✅ Arquivo carregado com sucesso.');
}

function clearUploadedFile() {
    AppState.uploadedFile = null;
    DOM.audioFileInput.value = '';
    DOM.fileInfoContainer.classList.add('hidden');
    toggleAiButtonsState();
}

// ==========================================================================
async function processRecordedAudio() {
    if (!AppState.audioChunks.length) return;
    const audioBlob = new Blob(AppState.audioChunks, { type: AppState.mediaRecorder.mimeType || 'audio/webm' });
    
    // 1ª etapa: pré-processamento de voz
    showToast('⏳ Pré-processando áudio...');
    const preprocessed = await AppState.audioProcessor.preprocessAudio(audioBlob);
    const preprocessedBlob = preprocessed.success ? preprocessed.blob : audioBlob;
    
    // 2ª etapa: comprimir para API
    showToast('⏳ Comprimindo áudio...');
    const compressed = await AppState.audioProcessor.compressAudio(preprocessedBlob);
    const finalBlob = compressed.success ? compressed.blob : preprocessedBlob;
    
    // Liberar AudioContext
    await AppState.audioProcessor.cleanup().catch(() => {});
    
    // Validar tamanho
    const validation = AppState.audioProcessor.validateFileSize(finalBlob, 25);
    if (!validation.valid) {
        showToast(validation.message);
        return;
    }
    
    // Enviar para Groq
    const fileExt = finalBlob.type.includes('wav') ? 'wav' : 'webm';
    await sendAudioToWhisper(new File([finalBlob], `consulta_${Date.now()}.${fileExt}`, { type: finalBlob.type }));
}

async function sendAudioToWhisper(file) {
    try {
        DOM.transcriptionLoader.classList.remove('hidden');
        DOM.transcriptionLoaderText.textContent = '⏳ Verificando áudio...';

        // Chunking automático: se o arquivo exceder 24MB, dividir em partes
        const MAX_CHUNK_MB = 20;
        const MAX_SIZE_BYTES = 24 * 1024 * 1024;
        let transcription = '';

        if (file.size > MAX_SIZE_BYTES && AppState.audioProcessor) {
            showToast('⏳ Áudio longo — dividindo em partes...');
            const chunks = await AppState.audioProcessor.splitAudioBlob(file, MAX_CHUNK_MB);
            const texts = [];
            for (let i = 0; i < chunks.length; i++) {
                DOM.transcriptionLoaderText.textContent = `⏳ Transcrevendo parte ${i + 1} de ${chunks.length}...`;
                const ext = chunks[i].type.includes('wav') ? 'wav' : 'webm';
                const chunkFile = new File([chunks[i]], `consulta_parte${i + 1}.${ext}`, { type: chunks[i].type });
                const text = await transcribeWithCache(chunkFile);
                texts.push(text);
            }
            transcription = texts.join('\n\n');
            showToast(`✅ Transcrição concluída (${chunks.length} partes).`);
        } else {
            DOM.transcriptionLoaderText.textContent = '⏳ Transcrevendo áudio...';
            transcription = await transcribeWithCache(file);
            showToast('✅ Transcrição concluída.');
        }

        AppState.currentTranscription = transcription;
        DOM.rawTranscript.value = transcription;
        toggleAiButtonsState(); // habilita botão Estruturar com IA automaticamente
    } catch (err) {
        showToast(err.message || 'Erro ao transcrever áudio.');
        console.error(err);
    } finally {
        DOM.transcriptionLoader.classList.add('hidden');
    }
}

/**
 * Detecta se o texto gerado contém medicamentos que provavelmente
 * não foram mencionados na transcrição original.
 * Retorna array de termos suspeitos ou array vazio.
 */
function detectMedicationHallucinations(generatedText, originalTranscript) {
    // Padrões comuns de medicamentos em português:
    // - Palavras terminadas em sufixos farmacêuticos comuns
    // - Padrões de dosagem como "500mg", "2x ao dia"
    const medPatterns = [
        /\b\w+(?:cilina|micina|oxacina|prazol|sartan|statina|dipina|tidina|mab|nib|pride|glip|formin|xetina|triptan|zosin|olol|dopa|pril|artan|drona|triptan|fenac|pirin|profen|codona|tramol|diazem)\b/gi,
        /\b(?:amoxicilina|azitromicina|dipirona|paracetamol|ibuprofeno|omeprazol|metformina|atorvastatina|losartana|enalapril|amlodipina|levotiroxina|fluoxetina|sertralina|clonazepam|alprazolam|metoprolol|sinvastatina|prednisona|dexametasona|ciprofloxacino|cefalexina|claritromicina|metronidazol|fluconazol|ranitidina|esomeprazol|pantoprazol|clopidogrel|aspirina|ácido acetilsalicílico|sulfato ferroso|carbonato de cálcio|vitamina d|complexo b|bromoprida|ondansetrona|domperidona|loperamida|buscopan|escopolamina|captopril|hidroclorotiazida|furosemida|espironolactona|carvedilol|digoxina|varfarina|rivaroxabana|apixabana|insulina|glibenclamida|glicazida|sitagliptina|empagliflozina|dapagliflozina|dulaglutida|semaglutida|tadalafila|sildenafila|finasterida|tamsulosina)\b/gi
    ];

    const transcriptLower = originalTranscript.toLowerCase();
    const suspicious = [];

    for (const pattern of medPatterns) {
        const matches = generatedText.match(pattern) || [];
        for (const match of matches) {
            // Verifica se o termo aparece na transcrição original
            if (!transcriptLower.includes(match.toLowerCase()) && !suspicious.includes(match.toLowerCase())) {
                suspicious.push(match);
            }
        }
    }
    return suspicious;
}

async function generateClinicalDocuments() {
    const rawText = DOM.rawTranscript.value.trim();
    if (!rawText) { showToast('Transcreva ou escreva um texto antes!'); return; }
    if (!AppState.apiKey) { showToast('Configure sua chave Groq nas Configurações!'); return; }

    // Validação de transcrição mínima
    const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 15) {
        showToast('⚠️ Transcrição muito curta (menos de 15 palavras). Verifique o áudio ou edite o texto antes de continuar.', 5000);
        return;
    }
    if (wordCount < 40) {
        // Aviso mas permite continuar
        showToast('⚠️ Transcrição curta. O documento gerado pode ser incompleto. Revise com atenção.', 5000);
    }

    // Guard against double-click / race condition
    DOM.btnGenerateDocs.disabled = true;

    // Mostrar banner de segurança clínica
    if (DOM.clinicalSafetyBanner) DOM.clinicalSafetyBanner.classList.remove('hidden');

    DOM.resultsSection.classList.remove('hidden');
    DOM.prontuarioLoader.classList.remove('hidden');
    DOM.pacienteLoader.classList.remove('hidden');
    DOM.actionsSaveRow.classList.add('hidden');
    DOM.outputRecord.value = '';
    DOM.outputPatientMsg.value = '';
    setTimeout(() => {
        DOM.clinicalSafetyBanner?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        DOM.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    const pName = DOM.patientName.value.trim() || 'Não Identificado';
    const pAge = DOM.patientAge.value.trim() || 'Não Informado';
    const spec = DOM.doctorSpecialty.value.trim() || 'Clínica Geral';
    const model = DOM.aiModel.value;
    const userContent = `DADOS DO ATENDIMENTO:\nPaciente: ${pName}\nIdade: ${pAge}\nEspecialidade: ${spec}\n\nTRANSCRIÇÃO DA CONSULTA:\n${rawText}`;

    const callGroq = (systemPrompt, temperature = 0.1, overrideModel = null) => fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AppState.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: overrideModel || model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature }),
        timeout: 45000 // 45 segundos
    }).then(async r => {
        if (!r.ok) {
            const errText = await r.text();
            try {
                const errJson = JSON.parse(errText);
                throw new Error(errJson.error?.message || errText);
            } catch (e) {
                throw new Error(errText);
            }
        }
        return r.json();
    });

    let bvsContextText = "";
    let extractedKeyword = "";

    try {
        // Passo 0: Extrair tema clínico e buscar na BVS para RAG (Retrieval-Augmented Generation)
        DOM.transcriptionLoaderText && (DOM.transcriptionLoaderText.textContent = 'Buscando evidências clínicas...');
        
        const keywordPrompt = "Leia a transcrição médica abaixo e identifique a DOENÇA ou SINTOMA principal. Responda APENAS com 1 ou 2 palavras no máximo (ex: 'Dengue', 'Hipertensão', 'Diabetes', 'Infecção Urinária'). Não use pontuação, nem conectivos, nem explique nada. Seja extremamente genérico para facilitar a busca em um banco de dados.\n\nTranscrição: " + rawText;
        const keywordRes = await callGroq(keywordPrompt, 0.1, 'llama-3.1-8b-instant');
        extractedKeyword = keywordRes.choices[0].message.content.trim().replace(/['"]/g, '');
        
        if (extractedKeyword && typeof bvsService !== 'undefined') {
            const bvsResults = await bvsService.search(extractedKeyword, 2);
            if (bvsResults && bvsResults.length > 0) {
                bvsContextText = `\n\n=== DIRETRIZES OFICIAIS DE APOIO CLÍNICO (BVS APS) ===\nATENÇÃO: Você é um assistente rigorosamente baseado em evidências. É OBRIGATÓRIO que a sua avaliação, plano e orientações estejam em total conformidade com as diretrizes oficiais abaixo.\nNo final do prontuário gerado, você DEVE adicionar uma seção chamada "📌 BASEADO EM EVIDÊNCIAS" citando brevemente qual recomendação oficial foi utilizada para a conduta (cite o título da evidência).\n\n`;
                bvsResults.forEach((res, idx) => {
                    // Passar um limite de texto maior (4000 caracteres) para não perder a conduta que fica no final da SOF
                    bvsContextText += `[Evidência ${idx+1}] Título: ${res.title}\nConteúdo da Diretriz: ${res.content.replace(/<[^>]*>?/gm, '').substring(0, 4000)}...\n\n`;
                });
            }
        }
    } catch (err) {
        console.warn("Erro ao buscar contexto BVS para RAG:", err);
    }

    let prontuarioOk = false;
    try {
        // Passo 1: Gera o Prontuário Clínico (com suporte da BVS se existir)
        const sysPromptProntuario = getSystemPrompt(DOM.clinicalTemplate.value) + bvsContextText;
        const prontuario = await callGroq(sysPromptProntuario, 0.1);
        const prontuarioContent = prontuario.choices[0].message.content || '';
        DOM.outputRecord.value = prontuarioContent;
        AppState.currentRecordOutput = prontuarioContent;
        prontuarioOk = true;

        // Pós-geração: detectar medicamentos possivelmente inventados
        const suspectedMeds = detectMedicationHallucinations(prontuarioContent, rawText);
        if (suspectedMeds.length > 0) {
            // Injeta aviso visual acima do textarea de prontuário
            const warningId = 'med-hallucination-warning';
            const existing = document.getElementById(warningId);
            if (existing) existing.remove();
            const strip = document.createElement('div');
            strip.id = warningId;
            strip.className = 'med-warning-strip';
            strip.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            <span>⚠️ <strong>Verificação necessária:</strong> O prontuário menciona medicamento(s) possivelmente não citado(s) na transcrição: <em>${suspectedMeds.slice(0,5).join(', ')}</em>. Confirme se foram prescritos.</span>`;
            DOM.outputRecord.parentNode.insertBefore(strip, DOM.outputRecord);
        } else {
            // Limpar aviso anterior se agora está ok
            const existing = document.getElementById('med-hallucination-warning');
            if (existing) existing.remove();
        }
    } catch (err) {
        DOM.outputRecord.value = `⚠️ Erro ao gerar prontuário: ${err.message}`;
        showToast(`Erro no prontuário: ${err.message}`);
    } finally {
        DOM.prontuarioLoader.classList.add('hidden');
    }

    try {
        // Passo 2: Gera as Orientações
        const sysPromptOrientacoes = PATIENT_INSTRUCTIONS_PROMPT + bvsContextText;
        const orientacoes = await callGroq(sysPromptOrientacoes, 0.3, 'llama-3.1-8b-instant');
        const orientacoesContent = orientacoes.choices[0].message.content || '';
        DOM.outputPatientMsg.value = orientacoesContent;
        AppState.currentPatientMsgOutput = orientacoesContent;

        // Pós-geração: verificar medicamentos nas orientações ao paciente
        const suspectedMedsOrient = detectMedicationHallucinations(orientacoesContent, rawText);
        if (suspectedMedsOrient.length > 0) {
            const warningIdO = 'med-hallucination-warning-patient';
            const existingO = document.getElementById(warningIdO);
            if (existingO) existingO.remove();
            const stripO = document.createElement('div');
            stripO.id = warningIdO;
            stripO.className = 'med-warning-strip';
            stripO.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
            <span>⚠️ <strong>Revise os medicamentos:</strong> Podem conter nome(s) não citado(s) na consulta: <em>${suspectedMedsOrient.slice(0,5).join(', ')}</em>.</span>`;
            DOM.outputPatientMsg.parentNode.insertBefore(stripO, DOM.outputPatientMsg);
        } else {
            const existingO = document.getElementById('med-hallucination-warning-patient');
            if (existingO) existingO.remove();
        }
    } catch (err) {
        DOM.outputPatientMsg.value = `⚠️ Erro ao gerar orientações: ${err.message}`;
        if (prontuarioOk) showToast(`Erro nas orientações: ${err.message}`);
    } finally {
        DOM.pacienteLoader.classList.add('hidden');
    }

    if (prontuarioOk) {
        DOM.actionsSaveRow.classList.remove('hidden');
        showToast('Documentos gerados com suporte de evidências! Revise antes de usar.');
        
        // BVS APS Dinâmico na UI
        if (extractedKeyword && typeof bvsService !== 'undefined') {
            DOM.bvsDynamicContainer.classList.remove('hidden');
            DOM.bvsDynamicText.textContent = `Evidências BVS APS: ${extractedKeyword}`;
            // Salva a keyword no input de busca para quando abrir
            const bvsInput = document.getElementById('bvs-search-input');
            if (bvsInput) bvsInput.value = extractedKeyword;
        } else {
            DOM.bvsDynamicContainer.classList.add('hidden');
        }
    }

    // Re-enable button only after processing and checking key/transcription state
    toggleAiButtonsState();
}

async function testGroqConnection() {
    const key = DOM.groqApiKeyInput.value.trim();
    if (!key) { showToast('Digite a chave primeiro!'); return; }
    DOM.btnTestKey.disabled = true;
    DOM.btnTestKey.textContent = 'Testando...';
    try {
        const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'Diga apenas Ok.' }], max_tokens: 5 }),
            timeout: 15000 // 15 segundos
        });
        showToast(res.ok ? '✓ Conexão bem-sucedida! Chave válida.' : `Erro ${res.status}: Chave inválida.`);
    } catch (err) {
        showToast(err.message.includes('tempo limite') ? err.message : 'Falha na conexão. Verifique a internet.');
    } finally {
        DOM.btnTestKey.disabled = false;
        DOM.btnTestKey.textContent = 'Testar Conexão';
    }
}

// ==========================================================================
// 11. HISTÓRICO LOCAL
// ==========================================================================
function renderHistoryTable() {
    const body = DOM.historyTableBody;
    body.innerHTML = '';
    const filter = (DOM.searchHistory.value || '').toLowerCase().trim();
    const filtered = AppState.history.filter(i =>
        i.patientName.toLowerCase().includes(filter) ||
        (i.specialty || '').toLowerCase().includes(filter) ||
        (i.dateString || '').toLowerCase().includes(filter)
    );

    if (!filtered.length) {
        const msg = filter ? 'Nenhuma correspondência encontrada.' : 'Nenhuma consulta registrada até o momento.';
        body.innerHTML = `<tr class="empty-row"><td colspan="6"><div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <p>${msg}</p></div></td></tr>`;
        return;
    }

    const labels = { soap: 'SOAP', anamnese: 'Anamnese', evolucao: 'Evolução', orientacao: 'Orientação', custom: 'Personalizado' };
    filtered.slice().reverse().forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(item.dateString)}</td>
            <td><strong>${escapeHtml(item.patientName)}</strong></td>
            <td>${escapeHtml(item.patientAge) || '-'}</td>
            <td>${escapeHtml(item.specialty) || '-'}</td>
            <td><span class="btn-action-small" style="pointer-events:none;cursor:default">${escapeHtml(labels[item.template] || item.template)}</span></td>
            <td class="actions-col"><div class="table-actions">
                <button class="btn-icon btn-view-consult" data-id="${escapeHtml(item.id)}" title="Ver Detalhes" aria-label="Ver detalhes de ${escapeHtml(item.patientName)}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn-icon btn-delete-consult" data-id="${escapeHtml(item.id)}" style="color:var(--danger)" title="Excluir" aria-label="Excluir consulta de ${escapeHtml(item.patientName)}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div></td>`;
        body.appendChild(tr);
    });

    body.querySelectorAll('.btn-view-consult').forEach(btn => btn.addEventListener('click', () => openConsultModal(btn.getAttribute('data-id'))));
    body.querySelectorAll('.btn-delete-consult').forEach(btn => btn.addEventListener('click', () => deleteConsult(btn.getAttribute('data-id'))));
}

function saveCurrentConsult() {
    // Guard against duplicate saves
    DOM.btnSaveConsult.disabled = true;
    DOM.btnSaveConsult.textContent = 'Salvo!';

    const record = {
        id: 'c_' + Date.now(),
        dateString: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        patientName: DOM.patientName.value.trim() || 'Sem Nome',
        patientAge: DOM.patientAge.value.trim(),
        specialty: DOM.doctorSpecialty.value.trim(),
        template: DOM.clinicalTemplate.value,
        rawTranscript: DOM.rawTranscript.value,
        recordText: DOM.outputRecord.value,
        patientMsg: DOM.outputPatientMsg.value
    };
    AppState.history.push(record);
    localStorage.setItem('etranscriber_history', JSON.stringify(AppState.history));
    showToast('Consulta salva no histórico!');
}

function deleteConsult(id) {
    if (confirm('Excluir este prontuário permanentemente?')) {
        AppState.history = AppState.history.filter(i => i.id !== id);
        localStorage.setItem('etranscriber_history', JSON.stringify(AppState.history));
        renderHistoryTable();
        showToast('Consulta excluída.');
    }
}

function clearAllHistory() {
    if (confirm('ATENÇÃO: Isso apagará PERMANENTEMENTE todo o histórico de consultas salvas. Confirmar?')) {
        AppState.history = [];
        localStorage.removeItem('etranscriber_history');
        renderHistoryTable();
        showToast('Histórico limpo.');
    }
}

// ==========================================================================
// 12. MODAL DE DETALHES DA CONSULTA
// ==========================================================================
function openConsultModal(id) {
    const c = AppState.history.find(x => x.id === id);
    if (!c) return;
    DOM.modalPatientName.textContent = c.patientName;
    DOM.modalDate.textContent = c.dateString;
    DOM.modalAge.textContent = c.patientAge || '-';
    DOM.modalSpecialty.textContent = c.specialty || '-';
    DOM.modalProntuarioText.value = c.recordText || 'Nenhum prontuário.';
    DOM.modalPacienteText.value = c.patientMsg || 'Nenhuma mensagem.';
    DOM.modalTranscricaoText.value = c.rawTranscript || 'Nenhuma transcrição.';
    DOM.modalTabBtns.forEach(b => b.classList.remove('active'));
    DOM.modalPanes.forEach(p => p.classList.remove('active'));
    document.querySelector('.modal-tab-btn[data-modal-tab="modal-tab-prontuario"]').classList.add('active');
    document.getElementById('modal-tab-prontuario').classList.add('active');
    DOM.viewConsultModal.classList.remove('hidden');
}

function closeConsultModal() {
    DOM.viewConsultModal.classList.add('hidden');
}

// ==========================================================================
// 13. EDITOR DE PROMPTS
// ==========================================================================
function loadPromptEditor(id) {
    AppState.currentSelectedPromptId = id;
    DOM.modelSelectBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-model-id') === id));
    const names = { soap: 'Modelo SOAP', anamnese: 'Anamnese Tradicional', evolucao: 'Evolução Clínica Diária', orientacao: 'Orientação ao Paciente', custom: 'Modelo Personalizado' };
    DOM.promptSystemTitle.value = names[id] || id;
    DOM.promptSystemContent.value = getSystemPrompt(id);
}

function saveCustomPrompt() {
    const text = DOM.promptSystemContent.value.trim();
    if (!text) { showToast('Prompt não pode estar em branco!'); return; }
    AppState.customPrompts[AppState.currentSelectedPromptId] = text;
    localStorage.setItem('etranscriber_custom_prompts', JSON.stringify(AppState.customPrompts));
    showToast('Prompt salvo com sucesso!');
}

function restoreDefaultPrompt() {
    if (confirm('Restaurar as diretrizes originais para este modelo?')) {
        DOM.promptSystemContent.value = DEFAULT_PROMPTS[AppState.currentSelectedPromptId];
        delete AppState.customPrompts[AppState.currentSelectedPromptId];
        localStorage.setItem('etranscriber_custom_prompts', JSON.stringify(AppState.customPrompts));
        showToast('Prompt restaurado para o padrão.');
    }
}

// ==========================================================================
// 14. CONFIGURAÇÕES DO CONSULTÓRIO E DA CHAVE API
// ==========================================================================
function saveClinicInfo() {
    AppState.clinicInfo = {
        name: DOM.clinicName.value.trim(),
        doctor: DOM.doctorName.value.trim(),
        crm: DOM.doctorCRM.value.trim(),
        phone: DOM.clinicPhone.value.trim()
    };
    localStorage.setItem('etranscriber_clinic_info', JSON.stringify(AppState.clinicInfo));
    showToast('Dados do consultório salvos!');
}

function saveGroqKey() {
    const key = DOM.groqApiKeyInput.value.trim();
    if (key && !key.startsWith('gsk_')) {
        showToast('⚠️ Chave inválida. Chaves Groq começam com "gsk_".');
        return;
    }
    localStorage.setItem('etranscriber_groq_key', key);
    AppState.apiKey = key;
    updateApiStatusUI();
    showToast(key ? 'Chave de API salva localmente.' : 'Chave removida.');
}

function toggleKeyVisibility() {
    const t = DOM.groqApiKeyInput.type === 'password' ? 'text' : 'password';
    DOM.groqApiKeyInput.type = t;
    const icon = document.getElementById('eye-icon');
    icon.innerHTML = t === 'text'
        ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" x2="23" y1="1" y2="23"/>`
        : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
}

function resetApplicationData() {
    if (confirm('ATENÇÃO: Esta ação é irreversível. Apagará histórico, cadastro de pacientes, chave de API e configurações. Confirmar?')) {
        localStorage.clear();
        showToast('Sistema redefinido! Recarregando...');
        setTimeout(() => window.location.reload(), 1500);
    }
}

// ==========================================================================
// 14.1 BACKUP E RESTAURAÇÃO DE DADOS (LGPD)
// ==========================================================================

/**
 * Exporta todos os dados do E-Transcriber como um arquivo JSON.
 * Inclui histórico, pacientes, configurações e chave de API.
 */
function exportBackup() {
    const backupData = {
        _meta: {
            app: 'E-Transcriber',
            version: '1.0',
            exportedAt: new Date().toISOString(),
            info: 'Backup gerado automaticamente pelo E-Transcriber. Não compartilhe este arquivo pois contém sua chave de API.'
        }
    };

    // Coletar todas as chaves etranscriber_* (EXCETO chave de API — segurança)
    const BACKUP_SENSITIVE_KEYS = ['etranscriber_groq_key'];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('etranscriber_') && !BACKUP_SENSITIVE_KEYS.includes(key)) {
            try {
                backupData[key] = JSON.parse(localStorage.getItem(key));
            } catch {
                backupData[key] = localStorage.getItem(key);
            }
        }
    }

    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `etranscriber-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ Backup exportado com sucesso!');
}

/**
 * Importa um arquivo de backup JSON e restaura os dados no localStorage.
 * @param {File} file - Arquivo JSON selecionado pelo usuário
 */
async function importBackup(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validar formato do backup
        if (!data._meta || data._meta.app !== 'E-Transcriber') {
            showToast('❌ Arquivo inválido. Selecione um backup gerado pelo E-Transcriber.');
            return;
        }

        const confirmed = confirm(
            `Restaurar backup de ${new Date(data._meta.exportedAt).toLocaleDateString('pt-BR')}?\n\n` +
            'ATENÇÃO: Os dados atuais serão substituídos pelos dados do backup. Esta ação não pode ser desfeita.'
        );
        if (!confirmed) return;

        // Restaurar cada chave no localStorage
        let count = 0;
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('etranscriber_')) {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                count++;
            }
        }

        showToast(`✅ Backup restaurado! (${count} itens). Recarregando...`);
        setTimeout(() => window.location.reload(), 1800);
    } catch (err) {
        console.error('Erro ao importar backup:', err);
        showToast('❌ Erro ao importar backup. Verifique se o arquivo está correto.');
    }
}

// ==========================================================================
// 15. UTILITÁRIOS (COPIAR, DOWNLOAD, WHATSAPP)
// ==========================================================================
function copyToClipboard(text, msg = 'Copiado!') {
    navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => showToast('Erro ao copiar texto.'));
}

function shareOnWhatsApp(text) {
    if (!text.trim()) { showToast('Nenhum conteúdo para compartilhar.'); return; }
    const win = window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    if (!win) showToast('Popup bloqueado. Permita popups para este site e tente novamente.');
}

// ==========================================================================
// 16. MODAL DE AJUDA
// ==========================================================================
const HELP_CONTENT = {
    'intro': `
        <h1>📘 Introdução ao E-Transcriber</h1>
        <p>O <strong>E-Transcriber</strong> é um sistema inteligente de transcrição e documentação que utiliza Inteligência Artificial para:</p>
        <ul>
            <li>🏥 <strong>Consultas Médicas</strong>: Transcrever consultas e gerar prontuários estruturados</li>
            <li>🏢 <strong>Reuniões Corporativas</strong>: Gravar reuniões e gerar atas profissionais</li>
            <li>👥 <strong>Gestão de Participantes</strong>: Controlar presença com QR Code</li>
            <li>📊 <strong>Relatórios</strong>: Exportar documentos em PDF e Excel</li>
        </ul>
        <h2>Tecnologias Utilizadas</h2>
        <ul>
            <li><strong>Groq API</strong>: Transcrição (Whisper) e geração de texto (Llama)</li>
            <li><strong>PWA</strong>: Funciona offline e pode ser instalado como app</li>
            <li><strong>Armazenamento Local</strong>: Todos os dados ficam no seu navegador</li>
        </ul>
        <h2>Requisitos</h2>
        <ul>
            <li>✅ Navegador moderno: Chrome, Edge, Firefox, Safari</li>
            <li>✅ Conexão com internet: Para usar IA (Groq API)</li>
            <li>✅ Microfone: Para gravação de áudio</li>
            <li>✅ Chave Groq API: Gratuita em <a href="https://console.groq.com" target="_blank">console.groq.com</a></li>
        </ul>
    `,
    'primeiros-passos': `
        <h1>🚀 Primeiros Passos</h1>
        <h2>Acessando o Sistema</h2>
        <p><strong>Online (Vercel):</strong></p>
        <p><code>https://e-transcriber.vercel.app</code></p>
        <p><strong>Local (Desenvolvimento):</strong></p>
        <pre><code># Navegue até a pasta do projeto
cd c:\\Projects\\e-transciber

# Inicie um servidor HTTP
python -m http.server 8000

# Acesse no navegador
http://localhost:8000</code></pre>
        <h2>Instalando como PWA</h2>
        <ol>
            <li>Acesse o site no navegador</li>
            <li>Clique no ícone de <strong>instalação</strong> na barra de endereços</li>
            <li>Confirme "Instalar"</li>
            <li>O app será adicionado ao menu iniciar/área de trabalho</li>
        </ol>
    `,
    'configuracao': `
        <h1>⚙️ Configuração Inicial</h1>
        <h2>Obtendo a Chave Groq API</h2>
        <h3>Passo 1: Criar Conta</h3>
        <ol>
            <li>Acesse: <a href="https://console.groq.com" target="_blank">https://console.groq.com</a></li>
            <li>Clique em <strong>Sign Up</strong> (ou faça login)</li>
            <li>Confirme seu email</li>
        </ol>
        <h3>Passo 2: Gerar Chave API</h3>
        <ol>
            <li>No console Groq, vá em <strong>API Keys</strong></li>
            <li>Clique em <strong>Create API Key</strong></li>
            <li>Dê um nome (ex: "E-Transcriber")</li>
            <li>Copie a chave (começa com <code>gsk_...</code>)</li>
            <li>⚠️ <strong>IMPORTANTE</strong>: Guarde em local seguro, não será mostrada novamente</li>
        </ol>
        <h3>Passo 3: Configurar no E-Transcriber</h3>
        <ol>
            <li>Abra o E-Transcriber</li>
            <li>Clique em <strong>Configurações</strong> na sidebar</li>
            <li>Cole a chave no campo <strong>Chave API do Groq</strong></li>
            <li>Clique em <strong>💾 Salvar Chave</strong></li>
            <li>Clique em <strong>🧪 Testar Conexão</strong> para validar</li>
        </ol>
        <div class="help-success">
            <strong>✅ Status deve mudar para:</strong> "Groq Configurado" (bolinha verde)
        </div>
    `,
    'consultas': `
        <h1>🏥 Modo Consultas Médicas</h1>
        <h2>Iniciando uma Nova Consulta</h2>
        <ol>
            <li>Clique no botão <strong>CONSULTAS</strong> no topo da sidebar</li>
            <li>Clique em <strong>Nova Consulta</strong> no menu</li>
            <li>Preencha os dados do paciente</li>
        </ol>
        <h2>Gravando a Consulta</h2>
        <h3>Opção A: Gravação Presencial</h3>
        <ol>
            <li>Clique na aba <strong>Gravar Áudio</strong></li>
            <li>Clique no botão <strong>🔴 Presencial</strong></li>
            <li>Permita acesso ao microfone</li>
            <li>Fale normalmente durante a consulta</li>
            <li>Clique em <strong>⏹️ Parar / Processar</strong> quando terminar</li>
        </ol>
        <h3>Opção B: Gravação Telemedicina</h3>
        <ol>
            <li>Clique no botão <strong>📹 Telemedicina</strong></li>
            <li>Permita acesso ao microfone</li>
            <li>Selecione a guia/janela da videochamada</li>
            <li>⚠️ <strong>IMPORTANTE</strong>: Marque "Compartilhar áudio da guia"</li>
            <li>Clique em <strong>⏹️ Parar / Processar</strong> quando terminar</li>
        </ol>
        <h3>Opção C: Enviar Arquivo</h3>
        <ol>
            <li>Clique na aba <strong>Enviar Arquivo</strong></li>
            <li>Arraste um arquivo ou clique para selecionar</li>
            <li>Formatos aceitos: MP3, WAV, M4A, WEBM, MP4</li>
            <li>Tamanho máximo: 25MB</li>
            <li>Clique em <strong>Transcrever Arquivo</strong></li>
        </ol>
        <h2>Editando e Estruturando</h2>
        <ol>
            <li>Edite a transcrição para corrigir erros</li>
            <li>Escolha o <strong>Modelo Clínico</strong> (SOAP, Anamnese, etc.)</li>
            <li>Escolha o <strong>Modelo LLM</strong></li>
            <li>Clique em <strong>✨ Estruturar com IA</strong></li>
            <li>Revise os documentos gerados</li>
            <li>Clique em <strong>💾 Salvar no Histórico</strong></li>
        </ol>
    `,
    'reunioes': `
        <h1>🏢 Modo Reuniões Corporativas</h1>
        <h2>Criando uma Nova Reunião</h2>
        <ol>
            <li>Clique no botão <strong>REUNIÕES</strong> no topo da sidebar</li>
            <li>Clique em <strong>Reuniões</strong> no menu</li>
            <li>Preencha os dados da reunião</li>
        </ol>
        <h2>Gerenciamento de Participantes</h2>
        <div class="help-tip">
            <strong>💡 Funciona SEM chave Groq!</strong> Esta é uma funcionalidade local.
        </div>
        <h3>Configurar Reunião</h3>
        <ol>
            <li>Role até <strong>Gerenciar Participantes e Presença</strong></li>
            <li>Preencha Data, Horário de Início e Término</li>
            <li>Clique em <strong>💾 Salvar Configurações</strong></li>
        </ol>
        <h3>Gerar QR Code</h3>
        <ol>
            <li>Clique em <strong>📱 Gerar QR Code de Check-in</strong></li>
            <li>QR Code aparece na tela</li>
            <li>Participantes escaneiam para fazer check-in</li>
        </ol>
        <h3>Adicionar Participantes Manualmente</h3>
        <ol>
            <li>Clique em <strong>👥 Gerenciar Lista de Participantes</strong></li>
            <li>Clique em <strong>➕ Adicionar Participante</strong></li>
            <li>Preencha Nome, Cargo e Email</li>
            <li>Clique em <strong>💾 Adicionar</strong></li>
        </ol>
        <h3>Exportar Lista de Presença</h3>
        <ul>
            <li><strong>📊 Exportar Excel</strong>: Planilha com todos os dados</li>
            <li><strong>📄 Exportar PDF</strong>: Lista formatada para impressão</li>
        </ul>
    `,
    'pacientes': `
        <h1>👥 Gerenciamento de Pacientes</h1>
        <h2>Cadastrando Novo Paciente</h2>
        <ol>
            <li>Clique em <strong>CONSULTAS</strong> (modo)</li>
            <li>Clique em <strong>Pacientes</strong> no menu</li>
            <li>Clique em <strong>➕ Novo Paciente</strong></li>
            <li>Preencha os dados</li>
            <li>Clique em <strong>💾 Salvar Paciente</strong></li>
        </ol>
        <h2>Campos Disponíveis</h2>
        <ul>
            <li><strong>Nome Completo</strong> (obrigatório)</li>
            <li>Data de Nascimento</li>
            <li>Gênero</li>
            <li>CPF</li>
            <li>Telefone</li>
            <li>Convênio</li>
            <li>Email</li>
            <li>Observações (alergias, comorbidades, etc.)</li>
        </ul>
        <h2>Iniciando Consulta para Paciente</h2>
        <ol>
            <li>Na lista de pacientes, clique no ícone <strong>💬 Iniciar Consulta</strong></li>
            <li>Sistema abre aba "Nova Consulta" com dados preenchidos</li>
            <li>Continue o processo normal de consulta</li>
        </ol>
        <h2>Buscando Pacientes</h2>
        <p>Use a barra de busca no topo da tabela para filtrar por:</p>
        <ul>
            <li>Nome do paciente</li>
            <li>CPF</li>
            <li>Convênio</li>
        </ul>
    `,
    'historico': `
        <h1>📊 Histórico e Relatórios</h1>
        <h2>Histórico de Consultas</h2>
        <ol>
            <li>Modo <strong>CONSULTAS</strong></li>
            <li>Clique em <strong>Histórico</strong></li>
            <li>Clique em <strong>👁️ Visualizar</strong> para ver uma consulta</li>
        </ol>
        <h3>Modal de Visualização</h3>
        <p>O modal tem 3 abas:</p>
        <ul>
            <li><strong>Prontuário</strong>: Documento estruturado</li>
            <li><strong>Mensagem Paciente</strong>: Orientações</li>
            <li><strong>Transcrição</strong>: Texto original</li>
        </ul>
        <h2>Histórico de Reuniões</h2>
        <ol>
            <li>Modo <strong>REUNIÕES</strong></li>
            <li>Clique em <strong>Hist. Reuniões</strong></li>
            <li>Clique em <strong>👁️ Carregar Ata</strong></li>
        </ol>
        <h2>Exportando Relatórios</h2>
        <h3>PDF de Prontuário</h3>
        <ol>
            <li>Abra uma consulta ou gere uma nova</li>
            <li>Clique em <strong>📄 Exportar PDF</strong></li>
            <li>PDF é baixado com cabeçalho, dados e rodapé</li>
        </ol>
        <h3>Excel de Presença</h3>
        <ol>
            <li>Na aba Reuniões, seção Participantes</li>
            <li>Clique em <strong>📊 Exportar Excel</strong></li>
            <li>Planilha contém: Nome, Cargo, Email, Status, Horário</li>
        </ol>
    `,
    'modelos': `
        <h1>🤖 Modelos de IA</h1>
        <h2>Modelos Disponíveis</h2>
        <h3>SOAP (Padrão)</h3>
        <p>Estrutura:</p>
        <ul>
            <li><strong>SUBJETIVO</strong>: Queixa, HDA, histórico</li>
            <li><strong>OBJETIVO</strong>: Exame físico, sinais vitais</li>
            <li><strong>AVALIAÇÃO</strong>: Diagnósticos, CID-10</li>
            <li><strong>PLANO</strong>: Medicamentos, exames, retorno</li>
        </ul>
        <h3>Anamnese Completa</h3>
        <p>Formato tradicional com histórico detalhado</p>
        <h3>Evolução Clínica</h3>
        <p>Formato de acompanhamento para consultas de retorno</p>
        <h3>Orientação Rápida</h3>
        <p>Resumo simplificado para o paciente com linguagem acessível</p>
        <h2>Personalizando Modelos</h2>
        <ol>
            <li>Vá em <strong>Modelos de IA</strong></li>
            <li>Clique em um dos botões (SOAP, Anamnese, etc.)</li>
            <li>Edite o texto do prompt</li>
            <li>Adicione instruções específicas</li>
            <li>Clique em <strong>💾 Salvar Prompt Personalizado</strong></li>
        </ol>
        <div class="help-tip">
            <strong>💡 Dica:</strong> Você pode criar modelos específicos para sua especialidade (Pediatria, Cardiologia, etc.)
        </div>
    `,
    'avancado': `
        <h1>⚡ Funcionalidades Avançadas</h1>
        <h2>Atalhos de Teclado</h2>
        <ul>
            <li><code>Ctrl + S</code> = Salvar consulta/reunião</li>
            <li><code>Ctrl + C</code> = Copiar texto selecionado</li>
            <li><code>Ctrl + V</code> = Colar</li>
            <li><code>Ctrl + Z</code> = Desfazer</li>
            <li><code>F12</code> = Abrir DevTools (debug)</li>
        </ul>
        <h2>Trabalhando Offline</h2>
        <h3>O que funciona SEM internet:</h3>
        <ul>
            <li>✅ Cadastro de pacientes</li>
            <li>✅ Edição de textos</li>
            <li>✅ Visualização de histórico</li>
            <li>✅ Geração de QR Code</li>
            <li>✅ Gerenciamento de participantes</li>
        </ul>
        <h3>O que NÃO funciona SEM internet:</h3>
        <ul>
            <li>❌ Transcrição de áudio (Whisper)</li>
            <li>❌ Geração de prontuários/atas (Llama)</li>
        </ul>
        <h2>Compartilhamento via WhatsApp</h2>
        <ol>
            <li>Gere a mensagem para o paciente</li>
            <li>Clique em <strong>📱 WhatsApp</strong></li>
            <li>WhatsApp Web abre com mensagem pronta</li>
            <li>Selecione o contato do paciente</li>
            <li>Envie</li>
        </ol>
    `,
    'problemas': `
        <h1>🔧 Solução de Problemas</h1>
        <h2>❌ "Groq Desconectado"</h2>
        <p><strong>Causa:</strong> Chave API não configurada ou inválida</p>
        <p><strong>Solução:</strong></p>
        <ol>
            <li>Vá em <strong>Configurações</strong></li>
            <li>Verifique se a chave está correta</li>
            <li>Clique em <strong>🧪 Testar Conexão</strong></li>
            <li>Se falhar, gere nova chave em console.groq.com</li>
        </ol>
        <h2>❌ "Biblioteca QRCode não encontrada"</h2>
        <p><strong>Causa:</strong> Biblioteca não carregou da CDN</p>
        <p><strong>Solução:</strong></p>
        <ol>
            <li>Limpe o cache do navegador (Ctrl+Shift+Del)</li>
            <li>Recarregue com Ctrl+Shift+R</li>
            <li>Verifique conexão com internet</li>
            <li>Teste em aba anônima</li>
        </ol>
        <h2>❌ "Erro ao transcrever áudio"</h2>
        <p><strong>Causas possíveis:</strong></p>
        <ul>
            <li>Arquivo maior que 25MB</li>
            <li>Formato não suportado</li>
            <li>Sem conexão com internet</li>
            <li>Chave Groq inválida</li>
        </ul>
        <p><strong>Solução:</strong></p>
        <ol>
            <li>Verifique tamanho do arquivo</li>
            <li>Converta para MP3/WAV se necessário</li>
            <li>Teste conexão com internet</li>
            <li>Valide chave Groq</li>
        </ol>
        <h2>❌ "Microfone não funciona"</h2>
        <p><strong>Causa:</strong> Permissão negada</p>
        <p><strong>Solução:</strong></p>
        <ol>
            <li>Clique no ícone de cadeado na barra de endereços</li>
            <li>Permita acesso ao microfone</li>
            <li>Recarregue a página</li>
            <li>Tente gravar novamente</li>
        </ol>
        <h2>🔄 Reset Completo</h2>
        <ol>
            <li>Vá em <strong>Configurações</strong></li>
            <li>Role até o final</li>
            <li>Clique em <strong>🔄 Resetar Tudo</strong></li>
            <li>⚠️ <strong>ATENÇÃO</strong>: Apaga TODOS os dados!</li>
        </ol>
    `
};

function openHelpModal() {
    if (!DOM.helpModal) return;
    DOM.helpModal.classList.remove('hidden');
    loadHelpSection('intro');
}

function closeHelpModal() {
    if (!DOM.helpModal) return;
    DOM.helpModal.classList.add('hidden');
}

function loadHelpSection(sectionId) {
    if (!DOM.helpContent) return;
    
    // Atualizar navegação
    document.querySelectorAll('.help-nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });
    
    // Carregar conteúdo
    const content = HELP_CONTENT[sectionId] || '<p>Seção não encontrada.</p>';
    DOM.helpContent.innerHTML = content;
    DOM.helpContent.scrollTop = 0;
}
// Expor globalmente para uso em onclick dinâmico
window.loadHelpSection = loadHelpSection;

function searchHelp(query) {
    if (!query.trim()) {
        loadHelpSection('intro');
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    let results = '<h1>🔍 Resultados da Busca</h1>';
    let found = false;
    
    Object.keys(HELP_CONTENT).forEach(sectionId => {
        const content = HELP_CONTENT[sectionId];
        if (content.toLowerCase().includes(lowerQuery)) {
            found = true;
            const sectionName = document.querySelector(`[data-section="${sectionId}"]`)?.textContent || sectionId;
            results += `<h2><a href="#" onclick="loadHelpSection('${sectionId}'); return false;">${sectionName}</a></h2>`;
            
            // Extrair trecho relevante
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            const text = tempDiv.textContent;
            const index = text.toLowerCase().indexOf(lowerQuery);
            if (index !== -1) {
                const start = Math.max(0, index - 100);
                const end = Math.min(text.length, index + 200);
                const snippet = '...' + text.substring(start, end) + '...';
                results += `<p>${snippet}</p>`;
            }
        }
    });
    
    if (!found) {
        results += '<p>Nenhum resultado encontrado. Tente outros termos.</p>';
    }
    
    DOM.helpContent.innerHTML = results;
}

// ==========================================================================
// 16.5 BVS APS (MATERIAL DE APOIO)
// ==========================================================================
function toggleBvsSidebar() {
    const sidebar = document.getElementById('bvs-sidebar');
    const overlay = document.getElementById('bvs-sidebar-overlay');
    if (sidebar.classList.contains('active')) {
        closeBvsSidebar();
    } else {
        sidebar.classList.add('active');
        overlay.classList.remove('hidden');
        setTimeout(() => document.getElementById('bvs-search-input')?.focus(), 300);
    }
}

function closeBvsSidebar() {
    document.getElementById('bvs-sidebar').classList.remove('active');
    document.getElementById('bvs-sidebar-overlay').classList.add('hidden');
}

async function performBvsSearch(query, autoOpen = false) {
    if (!query || query.trim() === '') return;
    
    const container = document.getElementById('bvs-results-container');
    const loader = document.getElementById('bvs-loader');
    
    if (autoOpen) {
        document.getElementById('bvs-sidebar').classList.add('active');
        document.getElementById('bvs-sidebar-overlay').classList.remove('hidden');
    }
    
    container.innerHTML = '';
    loader.classList.remove('hidden');
    
    try {
        const results = await bvsService.search(query.trim());
        loader.classList.add('hidden');
        renderBvsResults(results, query);
    } catch (err) {
        loader.classList.add('hidden');
        container.innerHTML = `<div class="bvs-empty-state"><p>❌ Erro ao buscar na BVS. Tente novamente.</p></div>`;
    }
}

function renderBvsResults(results, query) {
    const container = document.getElementById('bvs-results-container');
    
    if (!results || results.length === 0) {
        container.innerHTML = `
            <div class="bvs-empty-state">
                <p>Nenhuma evidência encontrada para "<strong>${escapeHtml(query)}</strong>".</p>
                <p style="font-size:0.85em; margin-top:10px;">Tente buscar com termos mais genéricos (ex: "hipertensão", "diabetes").</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'bvs-card';
        // Segurança: validar protocolo do link antes de usar como href (previne javascript: URLs)
        const safeLink = /^https?:\/\//.test(item.link) ? item.link : '#';

        const cardTitle = document.createElement('div');
        cardTitle.className = 'bvs-card-title';
        cardTitle.textContent = item.title; // textContent previne XSS

        const cardContent = document.createElement('div');
        cardContent.className = 'bvs-card-content';
        cardContent.id = `bvs-content-${item.id}`;
        // O conteúdo da BVS é HTML confiável (fonte oficial), mas removemos scripts e estilos inline no BVSService.formatResults()
        cardContent.innerHTML = item.content;

        const readBtn = document.createElement('button');
        readBtn.className = 'bvs-btn-read';
        readBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> Ler mais';
        readBtn.addEventListener('click', () => cardContent.classList.toggle('expanded'));

        const sourceLink = document.createElement('a');
        sourceLink.href = safeLink;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.className = 'bvs-link';
        sourceLink.title = 'Ver na íntegra (Abre nova guia)';
        sourceLink.innerHTML = 'Fonte Oficial <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>';

        const cardActions = document.createElement('div');
        cardActions.className = 'bvs-card-actions';
        cardActions.appendChild(readBtn);
        cardActions.appendChild(sourceLink);

        card.appendChild(cardTitle);
        card.appendChild(cardContent);
        card.appendChild(cardActions);
        container.appendChild(card);
    });
}

// ==========================================================================
// 17. CONFIGURAÇÃO DE TODOS OS EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
    // Tema
    DOM.btnThemeToggle.addEventListener('click', toggleTheme);
    if (DOM.themeSelect) {
        DOM.themeSelect.addEventListener('change', (e) => {
            const nextPref = e.target.value;
            applyTheme(nextPref);
            localStorage.setItem('etranscriber_theme', nextPref);
            const labels = { auto: 'Automático (Sistema)', light: 'Tema Claro', dark: 'Tema Escuro' };
            showToast(`Tema alterado para: ${labels[nextPref]}`);
        });
    }

    // Modal de Ajuda
    if (DOM.btnHelp) DOM.btnHelp.addEventListener('click', openHelpModal);
    if (DOM.btnHelpModalClose) DOM.btnHelpModalClose.addEventListener('click', closeHelpModal);
    if (DOM.helpModal) DOM.helpModal.addEventListener('click', e => { if (e.target === DOM.helpModal) closeHelpModal(); });
    if (DOM.helpSearch) DOM.helpSearch.addEventListener('input', debounce(e => searchHelp(e.target.value), 300));
    document.querySelectorAll('.help-nav-item').forEach(item => {
        item.addEventListener('click', () => loadHelpSection(item.getAttribute('data-section')));
    });

    // Configurações API
    DOM.btnSaveKey.addEventListener('click', saveGroqKey);
    DOM.btnToggleKey.addEventListener('click', toggleKeyVisibility);
    DOM.btnTestKey.addEventListener('click', testGroqConnection);
    DOM.btnResetAll.addEventListener('click', resetApplicationData);

    // Backup e Restauração de Dados
    const btnExportBackup = document.getElementById('btn-export-backup');
    const btnImportBackup = document.getElementById('btn-import-backup');
    const backupFileInput = document.getElementById('backup-file-input');

    if (btnExportBackup) btnExportBackup.addEventListener('click', exportBackup);
    if (btnImportBackup) btnImportBackup.addEventListener('click', () => backupFileInput?.click());
    if (backupFileInput) {
        backupFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                importBackup(file);
                backupFileInput.value = ''; // reset para permitir reimportar o mesmo arquivo
            }
        });
    }
    DOM.btnSaveClinicInfo.addEventListener('click', saveClinicInfo);
    DOM.aiModel.addEventListener('change', () => {
        AppState.aiModel = DOM.aiModel.value;
        localStorage.setItem('etranscriber_ai_model', DOM.aiModel.value);
    });

    // Banner de Segurança Clínica — fechar ao clicar no ✕
    if (DOM.btnSafetyBannerClose) {
        DOM.btnSafetyBannerClose.addEventListener('click', () => {
            if (DOM.clinicalSafetyBanner) DOM.clinicalSafetyBanner.classList.add('hidden');
        });
    }


    // Captura de Áudio
    DOM.btnModeRecord.addEventListener('click', () => setAudioMode('record'));
    DOM.btnModeUpload.addEventListener('click', () => setAudioMode('upload'));
    DOM.btnRecordStart.addEventListener('click', () => startRecording());
    DOM.btnRecordTelemed.addEventListener('click', () => startTelemedicineRecording());
    DOM.btnRecordStop.addEventListener('click', stopRecording);

    // Upload
    DOM.audioDropZone.addEventListener('click', () => DOM.audioFileInput.click());
    DOM.audioFileInput.addEventListener('change', e => handleFileSelection(e.target.files[0]));
    DOM.audioDropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.audioDropZone.classList.add('hover'); });
    DOM.audioDropZone.addEventListener('dragleave', () => DOM.audioDropZone.classList.remove('hover'));
    DOM.audioDropZone.addEventListener('drop', e => {
        e.preventDefault();
        DOM.audioDropZone.classList.remove('hover');
        if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
    });
    DOM.btnClearFile.addEventListener('click', clearUploadedFile);
    DOM.btnProcessUpload.addEventListener('click', async () => {
        if (!AppState.uploadedFile) return;
        DOM.btnProcessUpload.disabled = true;
        
        try {
            showToast('⏳ Pré-processando áudio...');
            const preprocessed = await AppState.audioProcessor.preprocessAudio(AppState.uploadedFile);
            const preprocessedBlob = preprocessed.success ? preprocessed.blob : AppState.uploadedFile;
            
            showToast('⏳ Comprimindo áudio...');
            const compressed = await AppState.audioProcessor.compressAudio(preprocessedBlob);
            const finalBlob = compressed.success ? compressed.blob : preprocessedBlob;
            
            await AppState.audioProcessor.cleanup().catch(() => {});
            
            const file = new File([finalBlob], `upload_${Date.now()}.wav`, { type: finalBlob.type });
            await sendAudioToWhisper(file);
        } catch (err) {
            console.error('Erro ao processar upload:', err);
            showToast('Erro ao processar áudio de upload.');
        } finally {
            DOM.btnProcessUpload.disabled = false;
        }
    });

    // Transcrição
    DOM.rawTranscript.addEventListener('input', () => {
        toggleAiButtonsState();
    });
    DOM.btnGenerateDocs.addEventListener('click', generateClinicalDocuments);

    // Resultados
    DOM.btnCopyRecord.addEventListener('click', () => copyToClipboard(DOM.outputRecord.value, 'Prontuário copiado!'));
    DOM.btnDownloadPdf.addEventListener('click', generatePDF);
    DOM.btnCopyPatient.addEventListener('click', () => copyToClipboard(DOM.outputPatientMsg.value, 'Orientações copiadas!'));
    DOM.btnShareWhatsApp.addEventListener('click', () => shareOnWhatsApp(DOM.outputPatientMsg.value));
    DOM.btnSaveConsult.addEventListener('click', saveCurrentConsult);

    // Histórico
    DOM.searchHistory.addEventListener('input', debounce(renderHistoryTable, 200));
    DOM.btnClearHistory.addEventListener('click', clearAllHistory);

    // Pacientes
    DOM.searchPatients.addEventListener('input', debounce(renderPatientsTable, 200));
    DOM.btnNewPatient.addEventListener('click', () => openPatientModal());
    DOM.btnPatientModalClose.addEventListener('click', closePatientModal);
    DOM.btnPatientModalCancel.addEventListener('click', closePatientModal);
    DOM.btnPatientModalSave.addEventListener('click', savePatient);
    DOM.patientModal.addEventListener('click', e => { if (e.target === DOM.patientModal) closePatientModal(); });

    // Modal Histórico
    DOM.btnModalClose.addEventListener('click', closeConsultModal);
    DOM.viewConsultModal.addEventListener('click', e => { if (e.target === DOM.viewConsultModal) closeConsultModal(); });
    DOM.btnModalCopyProntuario.addEventListener('click', () => copyToClipboard(DOM.modalProntuarioText.value, 'Prontuário copiado!'));
    DOM.btnModalCopyPaciente.addEventListener('click', () => copyToClipboard(DOM.modalPacienteText.value, 'Mensagem copiada!'));

    // Tabs do Modal Histórico
    DOM.modalTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.modalTabBtns.forEach(b => b.classList.remove('active'));
            DOM.modalPanes.forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-modal-tab')).classList.add('active');
        });
    });

    // Prompts de IA
    DOM.modelSelectBtns.forEach(btn => btn.addEventListener('click', () => loadPromptEditor(btn.getAttribute('data-model-id'))));
    DOM.btnSaveCustomPrompt.addEventListener('click', saveCustomPrompt);
    DOM.btnRestoreDefaultPrompt.addEventListener('click', restoreDefaultPrompt);

    // Controles de Visualização de Áudio
    const vizControls = document.querySelectorAll('.viz-btn');
    vizControls.forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.getAttribute('data-style');
            if (AppState.recordingState.visualizer) {
                AppState.recordingState.visualizer.style = style;
                vizControls.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Tecla ESC fecha modais
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeConsultModal();
            closePatientModal();
            closeHelpModal();
            closeBvsSidebar();
        }
    });

    // BVS APS 
    const btnToggleBvs = document.getElementById('btn-toggle-bvs');
    const bvsOverlay = document.getElementById('bvs-sidebar-overlay');
    const btnCloseBvs = document.getElementById('btn-close-bvs');
    const btnBvsSearch = document.getElementById('btn-bvs-search');
    const inputBvsSearch = document.getElementById('bvs-search-input');

    if (btnToggleBvs) btnToggleBvs.addEventListener('click', toggleBvsSidebar);
    if (DOM.bvsDynamicContainer) {
        DOM.bvsDynamicContainer.addEventListener('click', () => {
            const input = document.getElementById('bvs-search-input');
            if (input && input.value) {
                performBvsSearch(input.value, true);
            } else {
                toggleBvsSidebar();
            }
        });
    }
    if (btnCloseBvs) btnCloseBvs.addEventListener('click', closeBvsSidebar);
    if (bvsOverlay) bvsOverlay.addEventListener('click', closeBvsSidebar);
    
    if (btnBvsSearch) {
        btnBvsSearch.addEventListener('click', () => performBvsSearch(inputBvsSearch.value));
    }
    if (inputBvsSearch) {
        inputBvsSearch.addEventListener('keypress', e => {
            if (e.key === 'Enter') performBvsSearch(inputBvsSearch.value);
        });
    }

    // Atalhos de teclado
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && AppState.activeTab === 'tab-consulta') {
            e.preventDefault();
            const isRec = AppState.audioProcessor && AppState.audioProcessor.isRecording;
            if (!isRec) startRecording();
            else stopRecording();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && AppState.activeTab === 'tab-consulta') {
            e.preventDefault();
            if (!DOM.btnGenerateDocs.disabled) generateClinicalDocuments();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && AppState.activeTab === 'tab-consulta') {
            e.preventDefault();
            if (!DOM.actionsSaveRow.classList.contains('hidden')) saveCurrentConsult();
        }
    });
}

// Inicializar ao carregar a página
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
