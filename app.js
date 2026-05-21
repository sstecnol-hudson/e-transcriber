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

// ---- PROMPTS DE SISTEMA PADRÃO ----
const DEFAULT_PROMPTS = {
    soap: `Você é um assistente de inteligência artificial médica especializado em estruturação de prontuários médicos. Sua tarefa é analisar a transcrição de uma consulta clínica e gerar um prontuário médico estruturado no padrão SOAP.

Estruture sua resposta EXCLUSIVAMENTE nas seguintes seções:

### 1. SUBJETIVO (S)
- **Queixa Principal (QP)**: O motivo principal da consulta na voz do paciente.
- **História da Doença Atual (HDA)**: Cronologia dos sintomas, localização, intensidade, fatores de melhora/piora.
- **Histórico Relevante**: Comorbidades, alergias e medicações mencionadas.

### 2. OBJETIVO (O)
- **Sinais Vitais e Exame Físico**: Registre dados mencionados. Caso ausentes, escreva "Não avaliado/Não relatado".
- **Exames Complementares**: Resultados de exames trazidos ou mencionados pelo paciente.

### 3. AVALIAÇÃO (A)
- **Hipótese Diagnóstica / Diagnósticos**: Conclusões clínicas geradas. Indique o código CID-10 quando possível (ex: I10 - Hipertensão Essencial).
- **Raciocínio Clínico**: Breve resumo do quadro clínico.

### 4. PLANO (P)
- **Terapêutica / Medicamentos**: Prescrições com dosagens e frequência descritas na consulta.
- **Exames Solicitados**: Exames laboratoriais ou de imagem pedidos.
- **Recomendações e Retorno**: Orientações gerais e data de retorno.

DIRETRIZES IMPORTANTES:
- Mantenha terminologia médica formal e precisa em português do Brasil.
- Não invente dados clínicos não mencionados no áudio.
- Responda apenas com o prontuário em Markdown.`,

    anamnese: `Você é um redator médico especializado em prontuários clínicos. Converta a transcrição em uma Anamnese Tradicional completa.

# ANAMNESE CLÍNICA E CONDUTA

**1. QUEIXA PRINCIPAL (QP)**
**2. HISTÓRIA DA DOENÇA ATUAL (HDA)**
**3. HISTÓRICO PATOLÓGICO PESSOAL E FAMILIAR (HPP / HF)**
**4. EXAME FÍSICO / EXAMES COMPLEMENTARES**
**5. CONDUTA TERAPÊUTICA E PLANO DE AÇÃO**

DIRETRIZES: Não invente informações. Use tom estritamente clínico e formal. Responda apenas com a estrutura em Markdown.`,

    evolucao: `Você é um assistente de IA médica. Converta a consulta em uma Evolução Clínica de acompanhamento diário/periódico em texto corrido profissional, contendo: estado geral do paciente, adesão ao tratamento, achados de exame físico e mudanças de conduta. Seja conciso. Responda apenas com a evolução clínica em Markdown.`,

    orientacao: `Você é um médico empático. Redija um resumo de orientações fácil de ler destinado diretamente ao paciente.

Use linguagem simples, amigável e sem termos médicos complexos. Organize com tópicos e emojis:
💊 **Como Tomar seus Remédios**
🩺 **Exames para Fazer**
🥗 **Cuidados no Dia a Dia**
📅 **Seu Retorno**

Adicione uma mensagem de incentivo e simpatia. Responda exclusivamente com este texto acolhedor.`,

    custom: `Você é um assistente médico de alto desempenho. Organize a transcrição da consulta de acordo com as preferências do médico de forma profissional e objetiva. Responda em Markdown.`
};

const PATIENT_INSTRUCTIONS_PROMPT = `Você é um médico atencioso e empático. Crie uma mensagem direta de orientações de saúde para o paciente com base na transcrição fornecida. 
- Use linguagem muito acessível, sem jargões médicos.
- Organize as instruções com tópicos limpos e emojis (💊 📅 🩺 🥗).
- Destaque claramente dosagem e horários dos medicamentos.
- Diga quais exames ele precisa fazer e quando deve retornar.
- Crie um visual agradável pronto para ser copiado e enviado diretamente no WhatsApp.
- Baseie-se APENAS nas informações da consulta. Não invente dados.`;

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
    toast: document.getElementById('toast')
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

    if (!AppState.apiKey) DOM.apiKeyAlert.classList.remove('hidden');

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

    if ('serviceWorker' in navigator) {
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
    const saved = localStorage.getItem('etranscriber_theme') || 'dark';
    applyTheme(saved);
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('etranscriber_theme', next);
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    if (theme === 'light') {
        DOM.iconMoon.classList.add('hidden');
        DOM.iconSun.classList.remove('hidden');
    } else {
        DOM.iconMoon.classList.remove('hidden');
        DOM.iconSun.classList.add('hidden');
    }
}

// ==========================================================================
// 3. GERENCIAMENTO DE STATUS E UTILITÁRIOS
// ==========================================================================
function updateApiStatusUI() {
    if (AppState.apiKey) {
        DOM.apiStatusDot.className = 'status-dot green';
        DOM.apiStatusText.textContent = 'Groq Configurado';
        DOM.apiKeyAlert.classList.add('hidden');
    } else {
        DOM.apiStatusDot.className = 'status-dot red';
        DOM.apiStatusText.textContent = 'Groq Desconectado';
    }
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
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');
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
    // Preencher dados do paciente
    DOM.patientName.value = p.name;
    DOM.patientAge.value = p.birthdate || '';
    // Limpar sessão anterior
    DOM.rawTranscript.value = '';
    DOM.outputRecord.value = '';
    DOM.outputPatientMsg.value = '';
    DOM.btnGenerateDocs.disabled = true;
    DOM.btnSaveConsult.disabled = false;
    DOM.btnSaveConsult.textContent = 'Salvar no Histórico Local';
    DOM.resultsSection.classList.add('hidden');
    DOM.actionsSaveRow.classList.add('hidden');
    AppState.currentTranscription = '';
    AppState.currentRecordOutput = '';
    AppState.currentPatientMsgOutput = '';
    switchTab('tab-consulta');
    showToast(`Consulta iniciada para ${p.name}`);
}

// ==========================================================================
// 6. AUTOCOMPLETE DE PACIENTES NO CAMPO NOME
// ==========================================================================
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
            DOM.patientAutocomplete.classList.add('hidden');
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
            DOM.patientAutocomplete.classList.add('hidden');
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

async function startRecording(isTelemed = false) {
    if (!AppState.apiKey) {
        showToast('Configure sua chave Groq nas Configurações primeiro!');
        switchTab('tab-config');
        return;
    }
    AppState.audioChunks = [];
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
        AppState.audioStream = stream;
        let finalStream = stream;

        if (isTelemed) {
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: true, 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    } 
                });
                AppState.displayStream = displayStream;

                const hasAudio = displayStream.getAudioTracks().length > 0;
                if (!hasAudio) {
                    showToast('AVISO: Áudio da guia não compartilhado. Grave novamente e marque "Compartilhar áudio".', 5000);
                }

                AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                AppState.dest = AppState.audioContext.createMediaStreamDestination();

                const micSource = AppState.audioContext.createMediaStreamSource(stream);
                micSource.connect(AppState.dest);

                if (hasAudio) {
                    const displayAudioStream = new MediaStream(displayStream.getAudioTracks());
                    const displaySource = AppState.audioContext.createMediaStreamSource(displayAudioStream);
                    displaySource.connect(AppState.dest);
                }

                finalStream = AppState.dest.stream;

                // Para a gravação se o usuário parar de compartilhar a tela
                displayStream.getVideoTracks()[0].onended = () => {
                    if (AppState.isRecording) stopRecording();
                };
            } catch (err) {
                console.error('Display media error:', err);
                showToast('Erro ao capturar tela para telemedicina. Compartilhamento cancelado.');
                stream.getTracks().forEach(t => t.stop());
                return;
            }
        }

        let options = {};
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) options = { mimeType: 'audio/webm;codecs=opus' };
        else if (MediaRecorder.isTypeSupported('audio/webm')) options = { mimeType: 'audio/webm' };
        else if (MediaRecorder.isTypeSupported('audio/ogg')) options = { mimeType: 'audio/ogg' };
        else if (MediaRecorder.isTypeSupported('audio/mp4')) options = { mimeType: 'audio/mp4' };

        AppState.mediaRecorder = new MediaRecorder(finalStream, options);
        AppState.mediaRecorder.ondataavailable = e => { if (e.data?.size > 0) AppState.audioChunks.push(e.data); };
        AppState.mediaRecorder.onstop = processRecordedAudio;
        AppState.mediaRecorder.start(250);
        AppState.isRecording = true;

        DOM.btnRecordStart.disabled = true;
        DOM.btnRecordTelemed.disabled = true;
        DOM.btnRecordStop.disabled = false;

        AppState.recordingDuration = 0;
        DOM.recordingTimer.textContent = '00:00';
        AppState.recordingTimerInterval = setInterval(() => {
            AppState.recordingDuration++;
            const m = Math.floor(AppState.recordingDuration / 60).toString().padStart(2, '0');
            const s = (AppState.recordingDuration % 60).toString().padStart(2, '0');
            DOM.recordingTimer.textContent = `${m}:${s}`;
        }, 1000);

        setupAudioVisualizer(finalStream);
        showToast(isTelemed ? 'Gravação de Telemedicina iniciada.' : 'Gravação Presencial iniciada.');
    } catch (err) {
        console.error(err);
        showToast('Erro ao acessar microfone ou tela. Verifique as permissões.');
    }
}

function setupAudioVisualizer(stream) {
    // Em modo telemedicina o AudioContext já foi criado para mixar os streams.
    // Reutilizá-lo evita leak de recursos; só cria um novo se ainda não existir.
    if (!AppState.audioContext || AppState.audioContext.state === 'closed') {
        AppState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    AppState.analyser = AppState.audioContext.createAnalyser();
    AppState.source = AppState.audioContext.createMediaStreamSource(stream);
    AppState.source.connect(AppState.analyser);
    AppState.analyser.fftSize = 128;
    AppState.dataArray = new Uint8Array(AppState.analyser.frequencyBinCount);
    animateWaveform();
}

function animateWaveform() {
    if (!AppState.isRecording) return;
    AppState.animationFrameId = requestAnimationFrame(animateWaveform);
    const canvas = DOM.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    AppState.analyser.getByteFrequencyData(AppState.dataArray);
    ctx.clearRect(0, 0, width, height);

    // Gradiente criado uma vez por frame (não por barra) — evita 3840 objetos/s
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(0.5, '#8b5cf6');
    grad.addColorStop(1, '#14b8a6');
    ctx.fillStyle = grad;

    const barWidth = (width / AppState.dataArray.length) * 1.5;
    let x = 0;
    for (let i = 0; i < AppState.dataArray.length; i++) {
        const barHeight = Math.max(4, (AppState.dataArray[i] / 255) * height * 0.9);
        const y = (height - barHeight) / 2;
        drawRoundRect(ctx, x, y, barWidth - 3, barHeight, 4);
        x += barWidth;
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

function stopRecording() {
    if (!AppState.isRecording) return;
    AppState.isRecording = false;
    clearInterval(AppState.recordingTimerInterval);
    cancelAnimationFrame(AppState.animationFrameId);
    AppState.audioStream?.getTracks().forEach(t => t.stop());
    AppState.displayStream?.getTracks().forEach(t => t.stop());
    if (AppState.audioContext && AppState.audioContext.state !== 'closed') {
        AppState.audioContext.close();
    }
    AppState.mediaRecorder?.stop();
    DOM.btnRecordStart.disabled = false;
    DOM.btnRecordTelemed.disabled = false;
    DOM.btnRecordStop.disabled = true;
    drawStaticWaveform();
    showToast('Processando áudio gravado...');
}

// ==========================================================================
// 9. UPLOAD DE ARQUIVOS (DRAG & DROP)
// ==========================================================================
function handleFileSelection(file) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
        showToast('Arquivo maior do que 25MB (limite da API do Groq).');
        return;
    }
    AppState.uploadedFile = file;
    DOM.uploadedFileName.textContent = file.name;
    DOM.uploadedFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    DOM.fileInfoContainer.classList.remove('hidden');
    DOM.btnProcessUpload.disabled = false;
    showToast('Arquivo carregado com sucesso.');
}

function clearUploadedFile() {
    AppState.uploadedFile = null;
    DOM.audioFileInput.value = '';
    DOM.fileInfoContainer.classList.add('hidden');
    DOM.btnProcessUpload.disabled = true;
}

// ==========================================================================
// 10. CHAMADAS DA API DO GROQ
// ==========================================================================
async function processRecordedAudio() {
    if (!AppState.audioChunks.length) return;
    const blob = new Blob(AppState.audioChunks, { type: AppState.mediaRecorder.mimeType || 'audio/webm' });
    await sendAudioToWhisper(new File([blob], `consulta_${Date.now()}.webm`, { type: blob.type }));
}

async function sendAudioToWhisper(file) {
    if (!AppState.apiKey) { showToast('Chave de API do Groq ausente!'); return; }
    DOM.transcriptionLoader.classList.remove('hidden');
    DOM.transcriptionLoaderText.textContent = 'Transcrevendo áudio via Groq Whisper...';
    DOM.rawTranscript.value = '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', DOM.transcriptionLang.value);
    formData.append('response_format', 'json');

    try {
        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AppState.apiKey}` },
            body: formData
        });
        if (!res.ok) throw new Error(`Erro ${res.status}: ${await res.text()}`);
        const data = await res.json();
        DOM.rawTranscript.value = data.text || '';
        AppState.currentTranscription = data.text || '';
        DOM.btnGenerateDocs.disabled = !data.text?.trim();
        showToast(data.text?.trim() ? 'Transcrição concluída!' : 'Aviso: nenhum áudio detectado.');
    } catch (err) {
        DOM.rawTranscript.value = `Erro: ${err.message}`;
        showToast('Erro ao transcrever áudio.');
        console.error(err);
    } finally {
        DOM.transcriptionLoader.classList.add('hidden');
    }
}

async function generateClinicalDocuments() {
    const rawText = DOM.rawTranscript.value.trim();
    if (!rawText) { showToast('Transcreva ou escreva um texto antes!'); return; }
    if (!AppState.apiKey) { showToast('Configure sua chave Groq nas Configurações!'); return; }

    // Guard against double-click / race condition
    DOM.btnGenerateDocs.disabled = true;

    DOM.resultsSection.classList.remove('hidden');
    DOM.prontuarioLoader.classList.remove('hidden');
    DOM.pacienteLoader.classList.remove('hidden');
    DOM.actionsSaveRow.classList.add('hidden');
    DOM.outputRecord.value = '';
    DOM.outputPatientMsg.value = '';
    setTimeout(() => DOM.resultsSection.scrollIntoView({ behavior: 'smooth' }), 100);

    const pName = DOM.patientName.value.trim() || 'Não Identificado';
    const pAge = DOM.patientAge.value.trim() || 'Não Informado';
    const spec = DOM.doctorSpecialty.value.trim() || 'Clínica Geral';
    const model = DOM.aiModel.value;
    const userContent = `DADOS DO ATENDIMENTO:\nPaciente: ${pName}\nIdade: ${pAge}\nEspecialidade: ${spec}\n\nTRANSCRIÇÃO DA CONSULTA:\n${rawText}`;

    const callGroq = (systemPrompt, temperature = 0.1, overrideModel = null) => fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AppState.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: overrideModel || model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], temperature })
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

    let prontuarioOk = false;
    try {
        // Passo 1: Gera o Prontuário Clínico
        const prontuario = await callGroq(getSystemPrompt(DOM.clinicalTemplate.value), 0.1);
        DOM.outputRecord.value = prontuario.choices[0].message.content || '';
        AppState.currentRecordOutput = DOM.outputRecord.value;
        prontuarioOk = true;
    } catch (err) {
        DOM.outputRecord.value = `⚠️ Erro ao gerar prontuário: ${err.message}`;
        showToast(`Erro no prontuário: ${err.message}`);
    } finally {
        DOM.prontuarioLoader.classList.add('hidden');
    }

    try {
        // Passo 2: Gera as Orientações (modelo 8B para economizar tokens/min)
        const orientacoes = await callGroq(PATIENT_INSTRUCTIONS_PROMPT, 0.3, 'llama-3.1-8b-instant');
        DOM.outputPatientMsg.value = orientacoes.choices[0].message.content || '';
        AppState.currentPatientMsgOutput = DOM.outputPatientMsg.value;
    } catch (err) {
        DOM.outputPatientMsg.value = `⚠️ Erro ao gerar orientações: ${err.message}`;
        if (prontuarioOk) showToast(`Erro nas orientações: ${err.message}`);
    } finally {
        DOM.pacienteLoader.classList.add('hidden');
    }

    if (prontuarioOk) {
        DOM.actionsSaveRow.classList.remove('hidden');
        showToast('Documentos estruturados com sucesso!');
    }

    // Re-enable button only after processing
    DOM.btnGenerateDocs.disabled = false;
}

async function testGroqConnection() {
    const key = DOM.groqApiKeyInput.value.trim();
    if (!key) { showToast('Digite a chave primeiro!'); return; }
    DOM.btnTestKey.disabled = true;
    DOM.btnTestKey.textContent = 'Testando...';
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'Diga apenas Ok.' }], max_tokens: 5 })
        });
        showToast(res.ok ? '✓ Conexão bem-sucedida! Chave válida.' : `Erro ${res.status}: Chave inválida.`);
    } catch {
        showToast('Falha na conexão. Verifique a internet.');
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
// 16. CONFIGURAÇÃO DE TODOS OS EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
    // Tema
    DOM.btnThemeToggle.addEventListener('click', toggleTheme);

    // Configurações API
    DOM.btnSaveKey.addEventListener('click', saveGroqKey);
    DOM.btnToggleKey.addEventListener('click', toggleKeyVisibility);
    DOM.btnTestKey.addEventListener('click', testGroqConnection);
    DOM.btnResetAll.addEventListener('click', resetApplicationData);
    DOM.btnSaveClinicInfo.addEventListener('click', saveClinicInfo);
    DOM.aiModel.addEventListener('change', () => {
        AppState.aiModel = DOM.aiModel.value;
        localStorage.setItem('etranscriber_ai_model', DOM.aiModel.value);
    });

    // Captura de Áudio
    DOM.btnModeRecord.addEventListener('click', () => setAudioMode('record'));
    DOM.btnModeUpload.addEventListener('click', () => setAudioMode('upload'));
    DOM.btnRecordStart.addEventListener('click', () => startRecording(false));
    DOM.btnRecordTelemed.addEventListener('click', () => startRecording(true));
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
    DOM.btnProcessUpload.addEventListener('click', () => { if (AppState.uploadedFile) sendAudioToWhisper(AppState.uploadedFile); });

    // Transcrição
    DOM.rawTranscript.addEventListener('input', () => {
        DOM.btnGenerateDocs.disabled = DOM.rawTranscript.value.trim().length === 0;
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

    // Tecla ESC fecha modais
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeConsultModal();
            closePatientModal();
        }
    });

    // Atalhos de teclado
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && AppState.activeTab === 'tab-consulta') {
            e.preventDefault();
            if (!AppState.isRecording) startRecording();
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
window.addEventListener('DOMContentLoaded', init);
