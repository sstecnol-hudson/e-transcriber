/**
 * ============================================================
 * E-TRANSCRIBER — CLOUD SYNC SERVICE (Supabase)
 * src/modules/sync/cloud_sync.js
 * ============================================================
 * Responsabilidades:
 *  - Download do cid-map.json da nuvem (tabela `cid_entries`)
 *  - Upload da fila de auditoria (unmapped_cids → tabela `unmapped_cids`)
 *  - Upload de protocolos locais para nuvem
 *  - Painel Admin: listar dispositivos PENDING e aprovar/bloquear
 * ============================================================
 */

const CloudSync = (() => {

  function getClient() {
    return window.AuthState?.supabase || null;
  }

  // ===========================================================
  // 1. SYNC CID MAP — baixa entradas da tabela `cid_entries`
  //    e mescla com o mapa local do cid-mapper.js
  // ===========================================================
  async function sincronizarCidMap() {
    const client = getClient();
    if (!client || !window.AuthState?.isDeviceApproved) return;

    try {
      const { data, error } = await client
        .from('cid_entries')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) { console.warn('[CloudSync] Erro ao baixar cid_entries:', error.message); return; }
      if (!data || data.length === 0) return;

      // Mescla no CIDMapper global se existir
      if (window.CIDMapper) {
        const mapper = new window.CIDMapper();
        await mapper.loadConfig();
        data.forEach(entry => {
          if (entry.key && entry.payload) {
            try {
              mapper.cidConfig[entry.key] = JSON.parse(entry.payload);
            } catch { /* ignore malformed */ }
          }
        });
        console.log(`[CloudSync] ✅ ${data.length} entradas de CID sincronizadas da nuvem.`);
      }
    } catch (e) {
      console.warn('[CloudSync] Falha no sync de CID:', e);
    }
  }

  // ===========================================================
  // 2. UPLOAD AUDITORIA — envia fila de unmapped_cids para nuvem
  // ===========================================================
  async function enviarFilaAuditoria() {
    const client = getClient();
    if (!client || !window.AuthState?.isDeviceApproved) return;

    try {
      const raw = localStorage.getItem('etranscriber_unmapped_cids');
      if (!raw) return;
      const queue = JSON.parse(raw);
      if (!queue || queue.length === 0) return;

      const userId   = window.AuthState.user?.id || 'anon';
      const deviceId = window.AuthState.deviceId  || 'unknown';

      const rows = queue.map(item => ({
        diagnosis:        item.diagnosis,
        ai_suggested_cid: item.aiSuggestedCid || null,
        user_id:          userId,
        device_id:        deviceId,
        occurred_at:      item.date || new Date().toISOString()
      }));

      // Upsert: evita duplicatas pela combinação diagnosis+user_id
      const { error } = await client
        .from('unmapped_cids')
        .upsert(rows, { onConflict: 'diagnosis,user_id', ignoreDuplicates: true });

      if (!error) {
        localStorage.removeItem('etranscriber_unmapped_cids');
        console.log(`[CloudSync] ✅ ${rows.length} CIDs não mapeados enviados para auditoria.`);
      }
    } catch (e) {
      console.warn('[CloudSync] Falha ao enviar fila de auditoria:', e);
    }
  }

  // ===========================================================
  // 3. SYNC PROTOCOLOS — baixa protocolos da tabela `protocols`
  // ===========================================================
  async function sincronizarProtocolos() {
    const client = getClient();
    if (!client || !window.AuthState?.isDeviceApproved) return;

    try {
      const { data, error } = await client
        .from('protocols')
        .select('id, title, source, specialty, content, updated_at')
        .eq('active', true);

      if (error) { console.warn('[CloudSync] Erro ao baixar protocolos:', error.message); return; }
      if (!data || data.length === 0) return;

      // Armazena no localStorage para uso offline pelo ProtocolRetriever
      localStorage.setItem('etranscriber_cloud_protocols', JSON.stringify(data));
      console.log(`[CloudSync] ✅ ${data.length} protocolos sincronizados.`);
    } catch (e) {
      console.warn('[CloudSync] Falha no sync de protocolos:', e);
    }
  }

  // ===========================================================
  // 4. SINCRONIZAÇÃO COMPLETA (chamado após login/aprovação)
  // ===========================================================
  async function sincronizarDados() {
    console.log('[CloudSync] 🔄 Iniciando sincronização completa...');
    await Promise.all([
      sincronizarCidMap(),
      sincronizarProtocolos(),
      enviarFilaAuditoria()
    ]);
    console.log('[CloudSync] ✅ Sincronização completa.');
    // Expõe data do último sync no footer (se existir)
    const el = document.getElementById('sync-status-text');
    if (el) el.textContent = `Sincronizado: ${new Date().toLocaleTimeString('pt-BR')}`;
  }

  // ===========================================================
  // 5. PAINEL ADMIN — Listar dispositivos PENDING
  // ===========================================================
  async function listarDispositivosPendentes() {
    const client = getClient();
    if (!client) return [];
    const { data } = await client
      .from('dispositivos')
      .select('*')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });
    return data || [];
  }

  // ===========================================================
  // 6. PAINEL ADMIN — Aprovar ou Bloquear dispositivo
  // ===========================================================
  async function atualizarStatusDispositivo(deviceId, novoStatus) {
    const client = getClient();
    if (!client) return false;
    const { error } = await client
      .from('dispositivos')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('device_id', deviceId);
    return !error;
  }

  // ===========================================================
  // 7. PAINEL ADMIN — Renderizar lista de dispositivos
  // ===========================================================
  async function renderizarPainelAdmin() {
    const container = document.getElementById('admin-devices-list');
    if (!container) return;

    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Carregando...</p>';
    const dispositivos = await listarDispositivosPendentes();

    if (dispositivos.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:12px 0;">✅ Nenhum dispositivo aguardando aprovação.</p>';
      return;
    }

    container.innerHTML = dispositivos.map(d => `
      <div class="admin-device-card" style="
        background: rgba(255,193,7,0.08); border: 1px solid rgba(255,193,7,0.3);
        border-radius:10px; padding:14px 16px; margin-bottom:10px;
        display:flex; align-items:center; justify-content:space-between; gap:12px;
      ">
        <div>
          <strong style="color:var(--text-primary);font-size:0.95rem;">${d.user_name || d.user_email}</strong>
          <p style="color:var(--text-muted);font-size:0.78rem;margin:2px 0;">${d.crm ? 'CRM: '+d.crm+' · ' : ''}${d.user_email}</p>
          <p style="color:var(--text-muted);font-size:0.75rem;">🖥️ ${(d.user_agent||'').substring(0,60)}...</p>
          <p style="color:var(--text-muted);font-size:0.75rem;">📅 ${new Date(d.created_at).toLocaleString('pt-BR')}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
          <button onclick="window.CloudSync.aprovarDispositivo('${d.device_id}')" style="
            background:#22c55e;color:#fff;border:none;padding:6px 14px;
            border-radius:6px;cursor:pointer;font-size:0.82rem;font-weight:600;">✅ Aprovar</button>
          <button onclick="window.CloudSync.bloquearDispositivo('${d.device_id}')" style="
            background:#ef4444;color:#fff;border:none;padding:6px 14px;
            border-radius:6px;cursor:pointer;font-size:0.82rem;font-weight:600;">🚫 Bloquear</button>
        </div>
      </div>
    `).join('');
  }

  async function aprovarDispositivo(deviceId) {
    const ok = await atualizarStatusDispositivo(deviceId, 'APPROVED');
    if (ok && typeof showToast === 'function') showToast('✅ Dispositivo aprovado!');
    renderizarPainelAdmin();
  }

  async function bloquearDispositivo(deviceId) {
    const ok = await atualizarStatusDispositivo(deviceId, 'BLOCKED');
    if (ok && typeof showToast === 'function') showToast('🚫 Dispositivo bloqueado.');
    renderizarPainelAdmin();
  }

  // Expõe na API global
  return {
    sincronizarDados,
    sincronizarCidMap,
    sincronizarProtocolos,
    enviarFilaAuditoria,
    listarDispositivosPendentes,
    aprovarDispositivo,
    bloquearDispositivo,
    renderizarPainelAdmin
  };
})();

window.CloudSync = CloudSync;
console.log('✅ CloudSync carregado.');
