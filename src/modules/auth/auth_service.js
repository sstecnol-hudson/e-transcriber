/**
 * ============================================================
 * E-TRANSCRIBER — AUTH SERVICE (Supabase)
 * src/modules/auth/auth_service.js
 * ============================================================
 * Responsabilidades:
 *  - Geração de Device Fingerprint único por máquina
 *  - Login com Google Auth (Supabase OAuth)
 *  - Registro do dispositivo no Supabase
 *  - Verificação de status: PENDING | APPROVED | BLOCKED
 *  - Bloqueio de cópia, PDF, impressão e capturas de tela
 *  - Exposição de AuthState global
 * ============================================================
 */

console.log('[Auth] Service loaded');

// ---- CONFIGURAÇÃO — Projeto Supabase: sxxwuqmasjlxukmfwnyr ----
const SUPABASE_CONFIG = {
  url:     'https://sxxwuqmasjlxukmfwnyr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4eHd1cW1hc2pseHVrbWZ3bnlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NTI1MzIsImV4cCI6MjA5NzAyODUzMn0.8bvouPLkkdfgMtJkJmCTN-QeuS25UFN9XHvRhxtvlIE'
};

// ---- Estado Global de Autenticação ----
window.AuthState = {
  isAuthenticated: false,
  isDeviceApproved: false,
  user: null,          // { id, email, crm, name }
  deviceId: null,
  supabase: null
};

// ============================================================
// 1. Inicialização do cliente Supabase
// ============================================================
function initSupabase() {
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.error('[Auth] SDK do Supabase não encontrado. Verifique o script no index.html.');
    return false;
  }
  if (SUPABASE_CONFIG.url.includes('COLE_AQUI')) {
    console.warn('[Auth] Supabase não configurado. Defina SUPABASE_URL e SUPABASE_ANON_KEY.');
    return false;
  }
  window.AuthState.supabase = window.supabase.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
  );
  return true;
}

// ============================================================
// 2. Device Fingerprint (hash estável por navegador/máquina)
// ============================================================
async function generateDeviceFingerprint() {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform || ''
  ].join('|');

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('E-Transcriber🩺', 2, 2);
    const canvasData = canvas.toDataURL();
    const combined = raw + '|' + canvasData;
    const encoded = new TextEncoder().encode(combined);
    const hash = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback se canvas/crypto não disponíveis
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

// ============================================================
// 3. Login do Médico com Google
// ============================================================
async function loginComGoogle() {
  const client = window.AuthState.supabase;
  if (!client) {
    console.error('[Auth] Supabase client not initialized.');
    return;
  }
  try {
    // redirectTo garante que o OAuth retorne sempre ao domínio atual
    // (e-trascriber.com.br, Vercel ou localhost), sem fixar localhost
    const redirectTo = window.location.origin + '/';
    // For Supabase JS SDK v2 use signInWithOAuth
    if (typeof client.auth.signInWithOAuth === 'function') {
      await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    } else if (typeof client.auth.signIn === 'function') {
      // Fallback for older SDK versions
      await client.auth.signIn({ provider: 'google', options: { redirectTo } });
    } else {
      console.error('[Auth] No supported sign-in method available.');
    }
    console.log('[Auth] Initiated Google OAuth flow | redirectTo:', redirectTo);
  } catch (e) {
    console.error('[Auth] Google login error:', e);
  }
}

// ============================================================
// 3.5 Login do Administrador com E-mail e Senha (MASTER)
// ============================================================
async function loginComSenha(email, password) {
  const client = window.AuthState.supabase;
  if (!client) {
    if (typeof showToast === 'function') showToast('Sistema offline. Conexão com banco de dados indisponível.');
    return;
  }
  try {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (typeof showToast === 'function') showToast('Login Master efetuado com sucesso!');
  } catch (e) {
    console.error('[Auth] Erro no login master:', e);
    if (typeof showToast === 'function') showToast('Erro no login: ' + (e.message || 'Credenciais inválidas.'));
    else alert('Erro no login: ' + (e.message || 'Credenciais inválidas.'));
  }
}

async function alterarSenhaMaster(newPassword) {
  const client = window.AuthState.supabase;
  if (!client) return;
  try {
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
    if (typeof showToast === 'function') showToast('Senha alterada com sucesso!');
    else alert('Senha alterada com sucesso!');
  } catch (e) {
    console.error('[Auth] Erro ao alterar senha:', e);
    if (typeof showToast === 'function') showToast('Erro ao alterar senha: ' + e.message);
    else alert('Erro ao alterar senha: ' + e.message);
  }
}

// ============================================================
// 4. Logout
// ============================================================
async function logoutMedico() {
  const client = window.AuthState.supabase;
  if (client) await client.auth.signOut();
  window.AuthState.isAuthenticated = false;
  window.AuthState.isDeviceApproved = false;
  window.AuthState.user = null;
  mostrarModalLogin();
}

// ============================================================
// 5. Registro e Verificação de Dispositivo
// ============================================================
async function registrarOuVerificarDispositivo(crm = '', name = '') {
  const client = window.AuthState.supabase;
  const user   = window.AuthState.user;
  if (!client || !user) return 'ERRO';

  const deviceId = await generateDeviceFingerprint();
  window.AuthState.deviceId = deviceId;

  // Verifica se já existe registro
  const { data: existing } = await client
    .from('dispositivos')
    .select('*')
    .eq('device_id', deviceId)
    .eq('user_id', user.id)
    .maybeSingle();

  const deviceInfo = {
    device_id:   deviceId,
    user_id:     user.id,
    user_name:   name || user.name || user.email,
    user_email:  user.email,
    crm:         crm || user.crm || '',
    status:      existing ? existing.status : 'PENDING',
    user_agent:  navigator.userAgent,
    created_at:  existing ? existing.created_at : new Date().toISOString(),
    updated_at:  new Date().toISOString()
  };

  if (existing) {
    // Atualiza nome ou CRM se alterou nas configurações
    const updatedCrm = crm || existing.crm || '';
    const updatedName = name || existing.user_name || '';
    if (updatedCrm !== existing.crm || updatedName !== existing.user_name) {
      await client
        .from('dispositivos')
        .update({ crm: updatedCrm, user_name: updatedName, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
    window.AuthState.isDeviceApproved = existing.status === 'APPROVED';
    return existing.status; // 'APPROVED' | 'PENDING' | 'BLOCKED'
  }

  // Primeiro acesso: registrar como PENDING
  await client.from('dispositivos').insert([deviceInfo]);
  window.AuthState.isDeviceApproved = false;
  return 'PENDING';
}

// ============================================================
// 5.5 Validador de Recurso Ativo (Gating)
// ============================================================
function isFeatureUnlocked() {
  // Se o dispositivo estiver aprovado na nuvem, está liberado
  if (window.AuthState.isDeviceApproved) return true;

  // Se não estiver aprovado, mas ainda estiver dentro do limite de 3 usos de demonstração
  const uses = parseInt(localStorage.getItem('etranscriber_demo_uses') || '0', 10);
  if (uses < 3) {
    return true;
  }

  // Caso contrário, bloqueado
  return false;
}

// ============================================================
// 5.6 Validador e Contador de Usos de Demonstração
// ============================================================
function checkAndIncrementDemoUses() {
  if (window.AuthState.isDeviceApproved) return true;
  if (!window.AuthState.supabase) return true; // Offline local

  const uses = parseInt(localStorage.getItem('etranscriber_demo_uses') || '0', 10);
  if (uses < 3) {
    const nextUses = uses + 1;
    localStorage.setItem('etranscriber_demo_uses', nextUses);
    
    // Sincroniza UI de status
    atualizarUIAprovacao();

    if (typeof showToast === 'function') {
      showToast(`⚠️ Modo de demonstração ativo: Uso ${nextUses} de 3 realizado.`, 5000);
    } else {
      alert(`Modo de demonstração ativo: Uso ${nextUses} de 3 realizado.`);
    }
    return true;
  }

  // Limite excedido: abre o modal de ativação e bloqueia a ação
  showActivationModal();
  if (typeof showToast === 'function') {
    showToast('🔒 Limite de demonstração excedido. Solicite a liberação do sistema.', 6000);
  }
  return false;
}

// ============================================================
// 5.8 Configuração de Proteções de Segurança (Locks)
// ============================================================
function setupSecurityLocks() {
  // Injeta a regra de CSS para borrão
  if (!document.getElementById('security-blur-style')) {
    const style = document.createElement('style');
    style.id = 'security-blur-style';
    style.textContent = `
      .blurred-screen {
        filter: blur(18px) !important;
        transition: filter 0.1s ease;
        pointer-events: none !important;
        user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Bloqueia evento de cópia (Ctrl+C / Cmd+C)
  document.addEventListener('copy', (e) => {
    if (!isFeatureUnlocked()) {
      e.preventDefault();
      showActivationModal();
      if (typeof showToast === 'function') {
        showToast('⚠️ Cópia desativada. Solicite a liberação do seu dispositivo.');
      } else {
        alert('⚠️ Cópia desativada. Solicite a liberação do seu dispositivo.');
      }
    }
  });

  // Bloqueia evento de impressão (Ctrl+P / Cmd+P)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      if (!isFeatureUnlocked()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showActivationModal();
      }
    }
  });

  // Bloqueia tecla PrintScreen (limpa clipboard e mostra aviso)
  window.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen') {
      if (!isFeatureUnlocked()) {
        navigator.clipboard.writeText('').catch(() => {});
        showActivationModal();
      }
    }
  });

  // Borra o conteúdo quando a janela perde o foco (Ferramenta de Recorte / Captura)
  window.addEventListener('blur', () => {
    if (!isFeatureUnlocked()) {
      const appContainer = document.querySelector('.app-container');
      if (appContainer) appContainer.classList.add('blurred-screen');
    }
  });

  window.addEventListener('focus', () => {
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.classList.remove('blurred-screen');
  });
}

// ============================================================
// 6. Polling para aguardar aprovação (polling a cada 15s)
// ============================================================
let _approvalPollingInterval = null;

function iniciarPollingAprovacao() {
  if (_approvalPollingInterval) return;
  _approvalPollingInterval = setInterval(async () => {
    const client = window.AuthState.supabase;
    const user   = window.AuthState.user;
    const device = window.AuthState.deviceId;
    if (!client || !user || !device) return;

    const { data } = await client
      .from('dispositivos')
      .select('status')
      .eq('device_id', device)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data?.status === 'APPROVED') {
      clearInterval(_approvalPollingInterval);
      _approvalPollingInterval = null;
      window.AuthState.isDeviceApproved = true;
      esconderModalAuth();
      atualizarUIAprovacao();
      await window.CloudSync?.sincronizarDados();
      if (typeof showToast === 'function') showToast('✅ Dispositivo aprovado! Recursos liberados.');
    }
  }, 15000);
}

// ============================================================
// 7. Auxiliar: processa sessão válida (perfil + dispositivo)
// ============================================================
async function processarSessaoValida(session) {
  console.log('[Auth] Processando sessão:', session.user.email);

  const { data: profile } = await window.AuthState.supabase
    .from('medicos').select('*').eq('user_id', session.user.id).maybeSingle();

  window.AuthState.user = {
    id:      session.user.id,
    email:   session.user.email,
    crm:     profile?.crm || '',
    name:    profile?.name || session.user.user_metadata?.full_name || session.user.email,
    isAdmin: !!profile?.is_admin
  };
  window.AuthState.isAuthenticated = true;

  // ── Administrador tem acesso total automaticamente ──────────────────
  if (window.AuthState.user?.isAdmin) {
    window.AuthState.isDeviceApproved = true;
    console.log('[Auth] Usuário Master/Admin detectado — acesso total liberado.');
    atualizarUIAprovacao();
    await window.CloudSync?.sincronizarDados();
    return;
  }
  // ────────────────────────────────────────────────────────────────────

  const clinicRaw = localStorage.getItem('etranscriber_clinic_info');
  let clinicCrm = '';
  let clinicDoctor = '';
  if (clinicRaw) {
    try {
      const info = JSON.parse(clinicRaw);
      clinicCrm = info.crm || '';
      clinicDoctor = info.doctor || '';
    } catch {}
  }

  if (!clinicCrm || !clinicDoctor) {
    // Dados do consultório ainda não preenchidos — aguardar
    atualizarUIAprovacao();
  } else {
    const status = await registrarOuVerificarDispositivo(clinicCrm, clinicDoctor);
    atualizarUIAprovacao();
    if (status === 'APPROVED') {
      await window.CloudSync?.sincronizarDados();
    } else if (status === 'PENDING') {
      iniciarPollingAprovacao();
      console.log('[Auth] Dispositivo aguardando aprovação.');
    } else {
      console.warn('[Auth] Dispositivo bloqueado pelo administrador.');
    }
  }
}

// ============================================================
// 7. Fluxo Principal de Autenticação (chamado no init do app)
// ============================================================
async function iniciarFluxoAuth() {
  const ok = initSupabase();
  
  // Ativa as travas e listeners de segurança
  setupSecurityLocks();

  // Gera o fingerprint local imediatamente
  const deviceId = await generateDeviceFingerprint();
  window.AuthState.deviceId = deviceId;
  atualizarUIAprovacao();

  if (!ok) {
    console.warn('[Auth] Modo offline: Supabase não configurado.');
    window.AuthState.isDeviceApproved = true;
    atualizarUIAprovacao();
    return;
  }

  // ----------------------------------------------------------------
  // LISTENER PRINCIPAL: onAuthStateChange captura tanto sessões já
  // existentes quanto o redirect pós-OAuth (quando o SDK processa o
  // hash #access_token=... e troca pelo session object).
  // ----------------------------------------------------------------
  let _sessionHandled = false;

  window.AuthState.supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth] onAuthStateChange event:', event, '| user:', session?.user?.email ?? 'null');

    if (session?.user && !_sessionHandled) {
      _sessionHandled = true;
      await processarSessaoValida(session);
    } else if (!session && event === 'SIGNED_OUT') {
      window.AuthState.isAuthenticated = false;
      window.AuthState.isDeviceApproved = false;
      window.AuthState.user = null;
      console.log('[Auth] Sessão encerrada.');
    }
  });

  // ----------------------------------------------------------------
  // Fallback: verifica sessão já existente no storage local.
  // Se o listener já tratou (ex: redirect OAuth imediato), não faz nada.
  // ----------------------------------------------------------------
  setTimeout(async () => {
    if (_sessionHandled) return;

    console.log('[Auth] Verificando sessão existente (fallback)...');
    const { data: { session } } = await window.AuthState.supabase.auth.getSession();

    if (session?.user) {
      _sessionHandled = true;
      await processarSessaoValida(session);
    } else {
      console.log('[Auth] Sem sessão ativa.');
    }
  }, 500);
}

// ============================================================
// 7.5 Atualizar Visibilidade do Painel Admin
// ============================================================
function atualizarVisibilidadePainelAdmin() {
  const isOnline = !!window.AuthState.supabase;
  const isAdmin = !!window.AuthState.user?.isAdmin;
  const adminCard = document.getElementById('admin-devices-card');
  if (adminCard) {
    adminCard.style.display = (isOnline && isAdmin) ? 'block' : 'none';
    if (isOnline && isAdmin) {
      window.CloudSync?.renderizarPainelAdmin();
    }
  }

  // Oculta/mostra o botão de limpar logs de auditoria
  const btnClearAudit = document.getElementById('btn-clear-audit');
  if (btnClearAudit) {
    btnClearAudit.style.display = (!isOnline || isAdmin) ? 'inline-block' : 'none';
  }
}

// ============================================================
// 8. Controle da Modal de Auth (UI) — modal removida do HTML
// ============================================================
function mostrarModalLogin() { showActivationModal(); }
function mostrarModalAguardandoAprovacao() { showActivationModal(); }
function mostrarModalBloqueado() { showActivationModal(); }
function esconderModalAuth() { hideActivationModal(); }

// ============================================================
// 8. Controle de UI, Modal e Sincronização do Status
// ============================================================
function showActivationModal() {
  const modal = document.getElementById('activationModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const desc = document.getElementById('activation-modal-description');
  const uses = parseInt(localStorage.getItem('etranscriber_demo_uses') || '0', 10);
  if (desc) {
    if (uses < 3) {
      desc.innerHTML = `O E-Transcriber está rodando em <strong>modo de demonstração</strong>. Você já realizou <strong>${uses} de 3</strong> utilizações permitidas para testes.`;
    } else {
      desc.innerHTML = `O E-Transcriber está rodando em <strong>modo de demonstração</strong>. Você <strong>atingiu o limite máximo de 3 utilizações</strong> permitidas para testes.`;
    }
  }

  const clinicRaw = localStorage.getItem('etranscriber_clinic_info');
  let clinicCrm = '';
  let clinicDoctor = '';
  if (clinicRaw) {
    try {
      const info = JSON.parse(clinicRaw);
      clinicCrm = info.crm || '';
      clinicDoctor = info.doctor || '';
    } catch {}
  }

  const waName = document.getElementById('act-wa-name');
  const waCrm = document.getElementById('act-wa-crm');
  const onlineName = document.getElementById('act-online-name');
  const onlineCrm = document.getElementById('act-online-crm');

  if (waName && !waName.value) waName.value = clinicDoctor;
  if (waCrm && !waCrm.value) waCrm.value = clinicCrm;
  if (onlineName && !onlineName.value) onlineName.value = clinicDoctor;
  if (onlineCrm && !onlineCrm.value) onlineCrm.value = clinicCrm;

  const notLogged = document.getElementById('act-online-not-logged');
  const loggedForm = document.getElementById('act-online-logged-form');
  if (window.AuthState.isAuthenticated) {
    if (notLogged) notLogged.style.display = 'none';
    if (loggedForm) loggedForm.style.display = 'flex';
  } else {
    if (notLogged) notLogged.style.display = 'block';
    if (loggedForm) loggedForm.style.display = 'none';
  }
}

function hideActivationModal() {
  const modal = document.getElementById('activationModal');
  if (modal) modal.classList.add('hidden');
}

function setupActivationModalListeners() {
  const btnClose = document.getElementById('btn-activation-modal-close');
  if (btnClose) btnClose.addEventListener('click', hideActivationModal);

  // Controle de Tabs no Modal
  const btnTabWa = document.getElementById('btn-tab-activation-whatsapp');
  const btnTabOnline = document.getElementById('btn-tab-activation-online');
  const paneWa = document.getElementById('tab-act-whatsapp');
  const paneOnline = document.getElementById('tab-act-online');

  if (btnTabWa && btnTabOnline && paneWa && paneOnline) {
    btnTabWa.addEventListener('click', () => {
      btnTabWa.classList.add('active');
      btnTabOnline.classList.remove('active');
      paneWa.style.display = 'flex';
      paneOnline.style.display = 'none';
    });

    btnTabOnline.addEventListener('click', () => {
      btnTabOnline.classList.add('active');
      btnTabWa.classList.remove('active');
      paneOnline.style.display = 'flex';
      paneWa.style.display = 'none';
    });
  }

  // Ação WhatsApp
  const btnSendWa = document.getElementById('btn-activation-send-whatsapp');
  if (btnSendWa) {
    btnSendWa.addEventListener('click', () => {
      const name = document.getElementById('act-wa-name')?.value.trim() || '';
      const crm = document.getElementById('act-wa-crm')?.value.trim() || '';
      if (!name) {
        if (typeof showToast === 'function') showToast('⚠️ Por favor, preencha seu nome completo.');
        else alert('Por favor, preencha seu nome completo.');
        return;
      }
      
      const deviceId = window.AuthState.deviceId || 'desconhecido';
      const text = `Olá! Gostaria de solicitar a liberação do meu dispositivo no E-Transcriber.\n\nNome: ${name}\nCRM/Especialidade: ${crm}\nDevice Fingerprint: ${deviceId}`;
      const url = `https://wa.me/5566999736737?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  }

  // Ação Login no Modal
  const btnModalLogin = document.getElementById('btn-activation-login');
  if (btnModalLogin) {
    btnModalLogin.addEventListener('click', async () => {
      await loginComGoogle();
    });
  }

  // Ação Enviar Online
  const btnSubmitOnline = document.getElementById('btn-activation-submit-online');
  if (btnSubmitOnline) {
    btnSubmitOnline.addEventListener('click', async () => {
      const name = document.getElementById('act-online-name')?.value.trim() || '';
      const crm = document.getElementById('act-online-crm')?.value.trim() || '';
      if (!name) {
        if (typeof showToast === 'function') showToast('⚠️ Por favor, preencha seu nome completo.');
        else alert('Por favor, preencha seu nome completo.');
        return;
      }
      
      btnSubmitOnline.disabled = true;
      btnSubmitOnline.textContent = 'Enviando...';
      try {
        const status = await registrarOuVerificarDispositivo(crm, name);
        if (status === 'APPROVED') {
          if (typeof showToast === 'function') showToast('✅ Dispositivo liberado com sucesso!');
          hideActivationModal();
        } else {
          if (typeof showToast === 'function') showToast('✅ Solicitação enviada! Aguardando aprovação do administrador.');
          iniciarPollingAprovacao();
          hideActivationModal();
        }
        atualizarUIAprovacao();
      } catch (err) {
        console.error('Erro ao enviar solicitação online:', err);
        if (typeof showToast === 'function') showToast('❌ Erro ao conectar com servidor.');
      } finally {
        btnSubmitOnline.disabled = false;
        btnSubmitOnline.textContent = 'Enviar Solicitação Online';
      }
    });
  }

  // Botão na Configuração para abrir o modal manualmente se necessário
  const btnRequestUnlock = document.getElementById('btn-request-unlock');
  if (btnRequestUnlock) {
    btnRequestUnlock.addEventListener('click', showActivationModal);
  }
}

function atualizarUIAprovacao() {
  const deviceStatusBadge = document.getElementById('device-status-badge');
  const authEmailText = document.getElementById('auth-email-text');
  const deviceFingerprintText = document.getElementById('device-fingerprint-text');
  const btnAuthAction = document.getElementById('btn-auth-action');
  const btnRequestUnlock = document.getElementById('btn-request-unlock');
  const demoUsesInfo = document.getElementById('demo-uses-info');
  const demoUsesCountText = document.getElementById('demo-uses-count-text');

  if (deviceFingerprintText) {
    deviceFingerprintText.textContent = window.AuthState.deviceId || 'Gerando...';
  }

  if (authEmailText) {
    if (window.AuthState.isAuthenticated && window.AuthState.user) {
      authEmailText.textContent = window.AuthState.user.email;
    } else {
      authEmailText.textContent = 'Não conectado (Modo Offline)';
    }
  }

  if (btnAuthAction) {
    const btnToggleMaster = document.getElementById('btn-master-access-toggle');
    const masterForm = document.getElementById('master-auth-form');
    
    if (window.AuthState.isAuthenticated) {
      btnAuthAction.textContent = 'Sair da Conta';
      btnAuthAction.className = 'btn btn-secondary';
      btnAuthAction.onclick = logoutMedico;
      if (btnToggleMaster) btnToggleMaster.style.display = 'none';
      if (masterForm) masterForm.style.display = 'none';
    } else {
      btnAuthAction.textContent = 'Conectar com Google';
      btnAuthAction.className = 'btn btn-primary';
      btnAuthAction.onclick = loginComGoogle;
      if (btnToggleMaster) btnToggleMaster.style.display = 'inline-block';
    }
  }

  const uses = parseInt(localStorage.getItem('etranscriber_demo_uses') || '0', 10);
  
  if (window.AuthState.isDeviceApproved) {
    if (deviceStatusBadge) {
      deviceStatusBadge.textContent = 'ATIVADO / LIBERADO';
      deviceStatusBadge.style.color = '#22c55e';
    }
    if (demoUsesInfo) demoUsesInfo.style.display = 'none';
    if (btnRequestUnlock) btnRequestUnlock.style.display = 'none';
  } else {
    const client = window.AuthState.supabase;
    if (!client) {
      if (deviceStatusBadge) {
        deviceStatusBadge.textContent = 'MODO DESENVOLVIMENTO (OFFLINE)';
        deviceStatusBadge.style.color = '#3b82f6';
      }
      if (demoUsesInfo) demoUsesInfo.style.display = 'none';
      if (btnRequestUnlock) btnRequestUnlock.style.display = 'none';
    } else {
      if (uses < 3) {
        if (deviceStatusBadge) {
          deviceStatusBadge.textContent = 'DEMONSTRAÇÃO (ATIVO)';
          deviceStatusBadge.style.color = '#f59e0b';
        }
        if (demoUsesInfo) {
          demoUsesInfo.style.display = 'block';
          if (demoUsesCountText) demoUsesCountText.textContent = `${uses} de 3 usos realizados`;
        }
        if (btnRequestUnlock) btnRequestUnlock.style.display = 'inline-block';
      } else {
        if (deviceStatusBadge) {
          deviceStatusBadge.textContent = 'DEMONSTRAÇÃO (EXCEDIDO)';
          deviceStatusBadge.style.color = '#ef4444';
        }
        if (demoUsesInfo) {
          demoUsesInfo.style.display = 'block';
          if (demoUsesCountText) demoUsesCountText.textContent = `${uses} de 3 (Bloqueado)`;
        }
        if (btnRequestUnlock) btnRequestUnlock.style.display = 'inline-block';
      }
    }
  }

  atualizarVisibilidadePainelAdmin();
}

// ============================================================
// 9. Event Listeners do Formulário de Login
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  iniciarFluxoAuth();
  setupActivationModalListeners();
  setupMasterAuthListeners();
});

// ============================================================
// 10. Event Listeners do Master Auth
// ============================================================
function setupMasterAuthListeners() {
  const btnToggleMaster = document.getElementById('btn-master-access-toggle');
  const masterForm = document.getElementById('master-auth-form');
  const btnMasterLogin = document.getElementById('btn-master-login');
  const btnChangeMasterPwd = document.getElementById('btn-change-master-password');

  if (btnToggleMaster && masterForm) {
    btnToggleMaster.addEventListener('click', () => {
      masterForm.style.display = masterForm.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (btnMasterLogin) {
    btnMasterLogin.addEventListener('click', async () => {
      const email = document.getElementById('master-email').value;
      const pwd = document.getElementById('master-password').value;
      if (!email || !pwd) {
        if (typeof showToast === 'function') showToast('Preencha E-mail e Senha.');
        return;
      }
      const btnOrig = btnMasterLogin.textContent;
      btnMasterLogin.textContent = 'Autenticando...';
      btnMasterLogin.disabled = true;
      await loginComSenha(email, pwd);
      btnMasterLogin.textContent = btnOrig;
      btnMasterLogin.disabled = false;
      document.getElementById('master-password').value = '';
    });
  }

  if (btnChangeMasterPwd) {
    btnChangeMasterPwd.addEventListener('click', async () => {
      const newPwd = prompt('Digite a nova senha para o Acesso Master:');
      if (newPwd) {
        if (newPwd.length < 6) {
          alert('A senha deve ter no mínimo 6 caracteres.');
          return;
        }
        await alterarSenhaMaster(newPwd);
      }
    });
  }
}

// Exportar para uso em outros módulos
window.AuthService = {
  logoutMedico,
  iniciarFluxoAuth,
  loginComGoogle,
  esconderModalAuth,
  registrarOuVerificarDispositivo,
  isFeatureUnlocked,
  checkAndIncrementDemoUses,
  showActivationModal,
  hideActivationModal,
  mostrarModalAguardandoAprovacao,
  iniciarPollingAprovacao,
  mostrarModalBloqueado
};
