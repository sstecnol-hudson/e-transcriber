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
    // For Supabase JS SDK v2 use signInWithOAuth
    if (typeof client.auth.signInWithOAuth === 'function') {
      await client.auth.signInWithOAuth({ provider: 'google' });
    } else if (typeof client.auth.signIn === 'function') {
      // Fallback for older SDK versions
      await client.auth.signIn({ provider: 'google' });
    } else {
      console.error('[Auth] No supported sign-in method available.');
    }
    console.log('[Auth] Initiated Google OAuth flow');
  } catch (e) {
    console.error('[Auth] Google login error:', e);
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
  if (!window.AuthState.supabase) return true; // Desenvolvimento local offline

  // 1. Dados do consultório precisam estar preenchidos no localStorage
  const raw = localStorage.getItem('etranscriber_clinic_info');
  if (!raw) return false;
  try {
    const info = JSON.parse(raw);
    if (!info.name || !info.doctor || !info.crm) return false;
  } catch {
    return false;
  }

  // 2. Dispositivo deve estar aprovado pelo administrador
  return !!window.AuthState.isDeviceApproved;
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

  // Bloqueia evento de cópia (Ctrl+C / Cmd+C / Clique direito)
  document.addEventListener('copy', (e) => {
    if (!isFeatureUnlocked()) {
      e.preventDefault();
      if (typeof showToast === 'function') {
        showToast('⚠️ Cópia desativada. Preencha os Dados do Consultório e aguarde a aprovação do dispositivo.');
      } else {
        alert('⚠️ Cópia desativada. Preencha os Dados do Consultório e aguarde a aprovação do dispositivo.');
      }
    }
  });

  // Bloqueia evento de impressão (Ctrl+P / Cmd+P)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      if (!isFeatureUnlocked()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        alert('⚠️ Impressão bloqueada. Preencha os Dados do Consultório e aguarde a aprovação do dispositivo.');
      }
    }
  });

  // Bloqueia tecla PrintScreen (limpa clipboard e mostra aviso)
  window.addEventListener('keyup', (e) => {
    if (e.key === 'PrintScreen') {
      if (!isFeatureUnlocked()) {
        navigator.clipboard.writeText('').catch(() => {});
        alert('⚠️ Captura de tela bloqueada para dispositivos não autorizados.');
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
    atualizarVisibilidadePainelAdmin();
  } else {
    const status = await registrarOuVerificarDispositivo(clinicCrm, clinicDoctor);
    if (status === 'APPROVED') {
      atualizarVisibilidadePainelAdmin();
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
  if (!ok) {
    console.warn('[Auth] Modo offline: Supabase não configurado.');
    window.AuthState.isDeviceApproved = true;
    setupSecurityLocks();
    return;
  }

  // Ativa as travas e listeners de segurança
  setupSecurityLocks();

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
function mostrarModalLogin() { /* modal removida */ }
function mostrarModalAguardandoAprovacao() { /* modal removida */ }
function mostrarModalBloqueado() { /* modal removida */ }
function esconderModalAuth() { /* modal removida */ }

// ============================================================
// 9. Event Listeners do Formulário de Login
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Iniciar fluxo auth após DOM pronto
  iniciarFluxoAuth();
});

// Exportar para uso em outros módulos
window.AuthService = {
  logoutMedico,
  iniciarFluxoAuth,
  loginComGoogle,
  esconderModalAuth,
  registrarOuVerificarDispositivo,
  isFeatureUnlocked,
  mostrarModalAguardandoAprovacao,
  iniciarPollingAprovacao,
  mostrarModalBloqueado
};
