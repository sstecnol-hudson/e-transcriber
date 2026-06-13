/**
 * RAG-UI.JS - Interface Visual do Módulo de Diagnóstico RAG-Assistido
 */

// Cache de sessão para evitar requisições redundantes se o prontuário não mudou
let lastRagAnalysisProntuario = '';
let lastRagAnalysisResult = null;

function resetRagSessionCache() {
  lastRagAnalysisProntuario = '';
  lastRagAnalysisResult = null;
  console.log('🗑️ Cache de sessão do RAG limpo.');
}
window.resetRagSessionCache = resetRagSessionCache;

// Initialize DiagnosticRAG orchestrator lazily
function getOrchestrator() {
  if (typeof window !== 'undefined' && typeof window.DiagnosticRAG !== 'undefined') {
    console.log('DiagnosticRAG class found, initializing orchestrator');
    return new window.DiagnosticRAG();
  } else {
    console.error('DiagnosticRAG class is not loaded. Ensure rag module script is included before rag-ui.js');
    return null;
  }
}

/**
 * Função executada ao clicar no botão "Analisar com RAG"
 */
async function handleRagAnalyze() {
  const prontuarioVal = DOM.outputRecord?.value.trim() || '';
  if (!prontuarioVal) {
    showToast('⚠️ Por favor, estruture a consulta com IA antes de analisar com RAG.');
    return;
  }

  // Elementos do Painel RAG
  const ragCard = document.getElementById('rag-analysis-card');
  const ragLoader = document.getElementById('rag-analysis-loader');
  const ragResults = document.getElementById('rag-analysis-results');
  const ragBadge = document.getElementById('rag-disclaimer-badge');

  if (!ragCard) return;

  // Exibir painel
  ragCard.classList.remove('hidden');
  ragCard.style.display = 'block';

  // Verificar cache de sessão
  if (lastRagAnalysisProntuario === prontuarioVal && lastRagAnalysisResult) {
    console.log('🔄 Reutilizando análise RAG em cache da sessão para este prontuário.');
    showToast('✓ Carregado do cache da sessão.');

    // Restaurar emergências/urgências no AppState
    if (typeof AppState !== 'undefined') {
      AppState.activeEmergencies = lastRagAnalysisResult.redFlags
        ? lastRagAnalysisResult.redFlags.filter(rf => rf.urgency === 'Emergência' || rf.urgency === 'Urgência')
        : [];
    }

    if (ragBadge && lastRagAnalysisResult.disclaimer) {
      let badgeText = lastRagAnalysisResult.disclaimer.includes('Tavily')
        ? 'Online (Tavily) (Cache)' : 'Offline (Cache/Local) (Cache)';
      if (window.lastBvsContextTitles && window.lastBvsContextTitles.length > 0) {
        badgeText += ' + Evidências BVS';
      }
      ragBadge.textContent = badgeText;
    }

    renderRagResults(lastRagAnalysisResult, ragResults);

    if (ragLoader) { ragLoader.classList.add('hidden'); ragLoader.style.display = 'none'; }
    if (ragResults) { ragResults.classList.remove('hidden'); ragResults.style.display = 'block'; }

    ragCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  // Exibir loader
  if (ragLoader) { ragLoader.classList.remove('hidden'); ragLoader.style.display = 'flex'; }
  if (ragResults) { ragResults.classList.add('hidden'); ragResults.style.display = 'none'; }

  // Scroll suave para o painel com animação
  ragCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  ragCard.style.opacity = '0';
  ragCard.style.transform = 'translateY(20px)';
  ragCard.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
  setTimeout(() => { ragCard.style.opacity = '1'; ragCard.style.transform = 'translateY(0)'; }, 50);

  // Preparar requisição
  // Prioridade: 1) transcrição bruta do áudio  2) rawTranscript digitado  3) prontuário gerado
  const rawTranscriptVal = DOM.rawTranscript?.value?.trim() || '';
  const transcript = AppState.currentTranscription || rawTranscriptVal || prontuarioVal;
  const specialty = DOM.doctorSpecialty?.value || 'Clínica Geral';

  let extractedData = {};
  if (typeof DataExtractor !== 'undefined') {
    extractedData = DataExtractor.extractConsultationData({
      transcript: transcript,
      patientName: DOM.patientName?.value || '',
      patientAge: DOM.patientAge?.value || '',
      patientGender: DOM.pmGender?.value || '',
      patientHeight: DOM.patientHeight?.value || '',
      patientWeight: DOM.patientWeight?.value || '',
      patientBP: DOM.patientBP?.value || '',
      patientIMC: DOM.patientIMC?.value || ''
    });
  }

  const request = { transcript, specialty, extractedData, dataExtractorConfidence: 85 };

  try {
    const ragOrchestrator = getOrchestrator();
    if (!ragOrchestrator) throw new Error('DiagnosticRAG orchestrator unavailable.');
    const result = await ragOrchestrator.analyze(request);

    if (!result.success) throw new Error(result.error || 'Erro desconhecido na análise RAG.');

    // 1. Atualizar prontuário no textarea principal
    if (DOM.outputRecord) {
      DOM.outputRecord.value = result.soap;
      AppState.currentRecordOutput = result.soap;
    }

    // 2. Atualizar badge
    if (ragBadge && result.disclaimer) {
      let badgeText = result.disclaimer.includes('Tavily') ? 'Online (Tavily)' : 'Offline (Cache/Local)';
      if (window.lastBvsContextTitles && window.lastBvsContextTitles.length > 0) {
        badgeText += ' + Evidências BVS';
        ragBadge.style.background = 'linear-gradient(90deg, var(--primary), #10b981)';
        ragBadge.style.color = '#fff';
      }
      ragBadge.textContent = badgeText;
    }

    // 3. Gravar no cache de sessão
    lastRagAnalysisProntuario = prontuarioVal;
    lastRagAnalysisResult = result;

    // 4. Gravar emergências no AppState global
    if (typeof AppState !== 'undefined') {
      AppState.activeEmergencies = result.redFlags
        ? result.redFlags.filter(rf => rf.urgency === 'Emergência' || rf.urgency === 'Urgência')
        : [];
    }

    renderRagResults(result, ragResults);
    showToast('✓ Análise RAG concluída com sucesso!');

  } catch (error) {
    console.error('Erro na análise RAG:', error);
    showToast(`❌ Erro na análise RAG: ${error.message}`);
    if (ragResults) {
      ragResults.innerHTML = `
        <div class="alert alert-danger" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); padding: 16px; border-radius: 8px; color: #f87171;">
          <h4 style="margin: 0 0 8px;">Erro na Análise</h4>
          <p style="margin: 0;">${error.message || 'Ocorreu um erro ao processar o diagnóstico RAG.'}</p>
        </div>
      `;
      ragResults.classList.remove('hidden');
      ragResults.style.display = 'block';
    }
  } finally {
    if (ragLoader) { ragLoader.classList.add('hidden'); ragLoader.style.display = 'none'; }
    if (ragResults) { ragResults.classList.remove('hidden'); ragResults.style.display = 'block'; }
  }
}

/**
 * Renderiza os dados do RAG em elementos HTML dentro do painel.
 * NOTA: scripts dentro de innerHTML não são executados pelo browser —
 * listeners são adicionados via JS diretamente após o render.
 */
function renderRagResults(result, container) {
  if (!container) return;

  const { quality, redFlags, susContext, cid, referralInfo } = result;

  // Cor do score de qualidade
  let qualityColor = '#10b981';
  if (quality.overall < 50) qualityColor = '#ef4444';
  else if (quality.overall < 70) qualityColor = '#f59e0b';

  // HTML de Red Flags
  let redFlagsHtml = '';
  if (redFlags && redFlags.length > 0) {
    redFlagsHtml = redFlags.map(rf => {
      const isEmergency = rf.urgency === 'Emergência';
      const bgColor = isEmergency ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
      const borderColor = isEmergency ? '#ef4444' : '#f59e0b';
      const color = isEmergency ? '#f87171' : '#fbbf24';
      const icon = isEmergency ? '🔴' : '⚠️';
      return `
        <div style="background: ${bgColor}; border: 1px solid ${borderColor}; padding: 14px; border-radius: 8px; margin-bottom: 12px; border-left: 5px solid ${borderColor};">
          <h4 style="margin: 0 0 6px; color: ${color}; font-weight: 700;">${icon} ${rf.urgency.toUpperCase()}: ${rf.name}</h4>
          <p style="margin: 0 0 8px; font-size: 0.9rem; color: var(--text-primary);">${rf.justification}</p>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);"><strong>Ação recomendada:</strong> ${rf.action}</p>
          <p style="margin: 4px 0 0; font-size: 0.75rem; color: var(--text-secondary); opacity: 0.8;">Protocolo: ${rf.protocol_origin}</p>
        </div>
      `;
    }).join('');
  } else {
    redFlagsHtml = `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); padding: 12px; border-radius: 8px; color: #34d399; font-size: 0.9rem;">
        ✓ Nenhum sinal de alarme crítico (Red Flag) ativo para esta consulta.
      </div>
    `;
  }

  // HTML de CID-10 e CID-11
  let cidHtml = '';
  if (cid && cid.primary) {
    const issuesHtml = cid.contextualIssues && cid.contextualIssues.length > 0
      ? cid.contextualIssues.map(issue => `
          <div style="font-size: 0.8rem; color: #f87171; margin-top: 4px;">
            ⚠️ <strong>${issue.issue}:</strong> ${issue.description}
          </div>
        `).join('')
      : '';
    const alternativesHtml = cid.alternatives && cid.alternatives.length > 0
      ? `<p style="margin: 8px 0 0; font-size: 0.85rem; color: var(--text-secondary);">
           <strong>Alternativas mais específicas:</strong> ${cid.alternatives.map(a => `${a.description} (CID: ${a.icd10})`).join(', ')}
         </p>`
      : '';
    cidHtml = `
      <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px;">
        <h4 style="margin: 0 0 8px; color: var(--primary);">Mapeamento CID Validado</h4>
        <p style="margin: 0; font-size: 0.95rem;"><strong>Diagnóstico Principal:</strong> ${cid.primary.diagnosis}</p>
        <p style="margin: 4px 0 0; font-size: 0.9rem;"><strong>CID-10:</strong> <span class="badge" style="background: rgba(99,102,241,0.2); border: 1px solid var(--primary); padding: 2px 6px; border-radius: 4px;">${cid.primary.icd10.code}</span> - ${cid.primary.icd10.description}</p>
        <p style="margin: 4px 0 0; font-size: 0.9rem;"><strong>CID-11:</strong> <span class="badge" style="background: rgba(16,185,129,0.2); border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px;">${cid.primary.icd11.code}</span> - ${cid.primary.icd11.description}</p>
        ${issuesHtml}
        ${alternativesHtml}
      </div>
    `;
  }

  // HTML de Medicamentos RENAME
  let medsHtml = '';
  if (susContext.medications && susContext.medications.length > 0) {
    medsHtml = susContext.medications.map(m => {
      const badgeColor = m.isRename ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      const badgeBorder = m.isRename ? '#10b981' : '#ef4444';
      const badgeTextColor = m.isRename ? '#34d399' : '#f87171';
      const label = m.isRename ? 'RENAME' : 'Fora da RENAME';
      const altNote = m.alternative
        ? `<div style="font-size: 0.8rem; color: #f59e0b; margin-top: 4px;">
             💡 <strong>Alternativa RENAME:</strong> ${m.alternative} (${m.notes || ''})
           </div>`
        : '';
      return `
        <div style="padding: 10px 0; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span style="font-weight: 600;">${m.name}</span>
            <span style="background: ${badgeColor}; border: 1px solid ${badgeBorder}; color: ${badgeTextColor}; padding: 2px 8px; border-radius: 20px; font-size: 0.75rem;">${label}</span>
          </div>
          <span style="font-size: 0.85rem; color: var(--text-secondary);">Dosagem/Freq: ${m.dose} — ${m.frequency}</span>
          ${altNote}
        </div>
      `;
    }).join('');
  } else {
    medsHtml = '<p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">Nenhuma medicação prescrita no prontuário.</p>';
  }

  // HTML de Exames por Nível de Atenção
  let examsHtml = '';
  const { basic, laboratory, specialized } = susContext.exams;
  if (basic.length > 0) {
    examsHtml += `
      <div style="margin-bottom: 8px;">
        <span style="display: inline-block; background: rgba(16,185,129,0.15); color: #34d399; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-bottom: 4px;">🏥 UBS (Disponível Localmente)</span>
        <p style="margin: 0; font-size: 0.85rem; padding-left: 8px;">${basic.join(', ')}</p>
      </div>
    `;
  }
  if (laboratory.length > 0) {
    examsHtml += `
      <div style="margin-bottom: 8px;">
        <span style="display: inline-block; background: rgba(99,102,241,0.15); color: #a5b4fc; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-bottom: 4px;">🔬 LABORATÓRIO CENTRAL</span>
        <p style="margin: 0; font-size: 0.85rem; padding-left: 8px;">${laboratory.join(', ')}</p>
      </div>
    `;
  }
  if (specialized.length > 0) {
    examsHtml += `
      <div>
        <span style="display: inline-block; background: rgba(245,158,11,0.15); color: #fbcfe8; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-bottom: 4px;">📋 ESPECIALIZADO (Requer Regulação)</span>
        <p style="margin: 0; font-size: 0.85rem; padding-left: 8px;">${specialized.join(', ')}</p>
      </div>
    `;
  }
  if (!examsHtml) {
    examsHtml = '<p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">Nenhum exame solicitado no prontuário.</p>';
  }

  // HTML de Programas SUS
  let programsHtml = '';
  if (susContext.susPrograms && susContext.susPrograms.length > 0) {
    programsHtml = susContext.susPrograms.map(p => `
      <div style="background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.15); padding: 12px; border-radius: 6px; margin-bottom: 8px;">
        <h5 style="margin: 0 0 6px; font-size: 0.9rem; color: var(--primary);">${p.name}</h5>
        <p style="margin: 0 0 4px; font-size: 0.8rem;"><strong>Acompanhamento:</strong> ${p.frequency}</p>
        <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);"><strong>Cadastro:</strong> Requer ${p.documents.join(', ')}</p>
      </div>
    `).join('');
  } else {
    programsHtml = '<p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">Nenhum programa de atenção primária SUS aplicável.</p>';
  }

  // ── Montar HTML do painel ──────────────────────────────────────────────────
  container.innerHTML = `
    <!-- Barra de Confiança Clínica -->
    <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600; font-size: 1rem; color: var(--text-primary);">Pontuação de Qualidade Clínica RAG:</span>
        <span style="font-weight: 700; color: ${qualityColor}; font-size: 1.1rem;">${quality.overall}/100</span>
      </div>
      <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color);">
        <div style="width: ${quality.overall}%; height: 100%; background: ${qualityColor}; border-radius: 4px; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
      </div>
      <span style="font-size: 0.85rem; color: var(--text-secondary);">Recomendação: <strong>${quality.overallRecommendation}</strong></span>
    </div>

    <!-- Layout de Duas Colunas -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Coluna Esquerda -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <h4 style="margin: 0 0 10px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">Sinais de Alarme &amp; Alertas</h4>
          ${redFlagsHtml}
        </div>
        <div>
          <h4 style="margin: 0 0 10px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">Mapeamento CID e Regulação</h4>
          ${cidHtml}
        </div>
      </div>

      <!-- Coluna Direita -->
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">Validação RENAME (Medicamentos SUS)</h4>
          ${medsHtml}
        </div>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">Disponibilidade de Exames no SUS</h4>
          ${examsHtml}
        </div>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px;">
          <h4 style="margin: 0 0 10px; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">Programas e Acompanhamento do Paciente</h4>
          ${programsHtml}
        </div>
      </div>
    </div>

    <!-- Gaps de Informações Faltantes -->
    ${quality.gaps && quality.gaps.length > 0 ? `
      <div style="margin-top: 20px; background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15); padding: 14px; border-radius: 8px;">
        <h4 style="margin: 0 0 10px; font-size: 0.9rem; color: #f59e0b; text-transform: uppercase;">Gaps e Dados Faltantes Recomendados</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--text-primary);">
          ${quality.gaps.map(gap => `
            <li style="margin-bottom: 6px;">
              <strong>${gap.field}:</strong> ${gap.impact} <br/>
              <span style="color: var(--text-secondary); font-size: 0.8rem;">👉 <em>${gap.recommendation}</em></span>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : ''}

    <!-- ─── Encaminhamento SUS Unificado ─────────────────────────────── -->
    ${referralInfo ? (() => {
      const prioColor = {
        'Alta':     { bg: 'rgba(239,68,68,0.12)',  border: '#ef4444', text: '#f87171' },
        'Média':    { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#fbbf24' },
        'Variável': { bg: 'rgba(99,102,241,0.12)', border: '#818cf8', text: '#a5b4fc' }
      }[referralInfo.prioridade] || { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)', text: 'var(--primary)' };
      const confColor = (referralInfo.confidence || referralInfo.confiança || 0) >= 85 ? '#10b981'
                      : (referralInfo.confidence || referralInfo.confiança || 0) >= 65 ? '#f59e0b' : '#ef4444';
      const confVal   = referralInfo.confidence || referralInfo.confiança || 0;
      const examesHtml = referralInfo.exames_obrigatorios && referralInfo.exames_obrigatorios.length > 0
        ? referralInfo.exames_obrigatorios.map(e => `<span style="display:inline-block;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:4px;padding:2px 8px;font-size:0.75rem;margin:2px;">${e}</span>`).join('')
        : '<span style="color:var(--text-secondary);font-size:0.85rem;">Nenhum exame obrigatório especificado.</span>';
      return `
      <div id="referral-block-unified" style="margin-top:20px;background:${prioColor.bg};border:1px solid ${prioColor.border};border-left:5px solid ${prioColor.border};padding:18px;border-radius:10px;">
        <!-- Cabeçalho -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.3rem;">🏥</span>
            <h4 style="margin:0;font-size:1rem;text-transform:uppercase;letter-spacing:0.5px;color:${prioColor.text};">Encaminhamento SUS Sugerido</h4>
          </div>
          ${referralInfo.prioridade ? `<span style="background:${prioColor.bg};border:1px solid ${prioColor.border};color:${prioColor.text};padding:2px 10px;border-radius:20px;font-size:0.75rem;font-weight:700;">⚡ Prioridade ${referralInfo.prioridade}</span>` : ''}
        </div>

        <!-- Especialidade + Confiança -->
        <div style="margin-bottom:12px;">
          <p style="margin:0 0 6px;font-size:1.15rem;font-weight:700;color:var(--text-primary);">${referralInfo.specialty}</p>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
              <div style="width:${confVal}%;height:100%;background:${confColor};border-radius:3px;transition:width 0.6s cubic-bezier(0.4,0,0.2,1);"></div>
            </div>
            <span style="font-size:0.8rem;color:${confColor};font-weight:700;white-space:nowrap;">${confVal}% confiança</span>
          </div>
        </div>

        <!-- Justificativa -->
        <p style="margin:0 0 12px;font-size:0.88rem;color:var(--text-primary);line-height:1.6;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;">${referralInfo.rationale || ''}</p>

        <!-- Exames Obrigatórios -->
        ${referralInfo.exames_obrigatorios && referralInfo.exames_obrigatorios.length > 0 ? `
        <div style="margin-bottom:12px;">
          <p style="margin:0 0 6px;font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">📋 Exames Obrigatórios para Regulação</p>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">${examesHtml}</div>
        </div>` : ''}

        <!-- Protocolo -->
        ${referralInfo.protocolo ? `
        <p style="margin:0 0 14px;font-size:0.75rem;color:var(--text-secondary);font-style:italic;">
          📜 Protocolo: ${referralInfo.protocolo}
        </p>` : ''}

        <!-- Decisão Médica -->
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-size:0.8rem;color:var(--text-secondary);font-weight:600;">Decisão do médico:</span>
          <button id="referral-btn-aceitar" style="background:rgba(16,185,129,0.15);border:1px solid #10b981;color:#34d399;padding:6px 16px;border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;transition:background 0.2s;"
            onmouseover="this.style.background='rgba(16,185,129,0.3)'" onmouseout="this.style.background='rgba(16,185,129,0.15)'">
            ✅ Aceitar Encaminhamento
          </button>
          <button id="referral-btn-rejeitar" style="background:rgba(239,68,68,0.1);border:1px solid #ef4444;color:#f87171;padding:6px 16px;border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;transition:background 0.2s;"
            onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.1)'">
            ❌ Rejeitar
          </button>
        </div>
      </div>`;
    })() : ''}

    <!-- Rodapé: Evidências BVS e Botão Re-analisar -->
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 16px;">
      ${window.lastBvsContextTitles && window.lastBvsContextTitles.length > 0 ? `
        <div style="background: rgba(16, 185, 129, 0.05); border-left: 4px solid #10b981; padding: 12px; border-radius: 4px;">
          <h4 style="margin: 0 0 8px; font-size: 0.85rem; color: #10b981; text-transform: uppercase;">📚 Diretrizes BVS Consultadas para esta análise:</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--text-secondary);">
            ${window.lastBvsContextTitles.map(t => `<li style="margin-bottom: 4px;">${t}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <div style="display: flex; justify-content: flex-end;">
        <button onclick="handleRagAnalyze()" class="btn-primary" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 0.9rem; border-radius: 8px; cursor: pointer; border: none; background: var(--primary); color: #fff;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
          Re-analisar com RAG
        </button>
      </div>
    </div>
  `;

  // ── Anexar listeners dos botões de decisão APÓS o innerHTML ─────────────
  // Browsers NÃO executam <script> injetado via innerHTML.
  if (referralInfo) {
    const btnAceitar  = container.querySelector('#referral-btn-aceitar');
    const btnRejeitar = container.querySelector('#referral-btn-rejeitar');

    const _registrar = (tipo) => {
      // Chamar motor de aprendizado se disponível
      if (typeof window.registrarDecisao === 'function') {
        window.registrarDecisao(
          [{ especialidade: referralInfo.specialty }],
          { tipo, especialidade: tipo === 'ACEITOU' ? referralInfo.specialty : null },
          { termos: referralInfo.termos_encontrados || [], cids: [] }
        );
      }
      // Feedback visual
      const bloco = container.querySelector('#referral-block-unified');
      if (bloco) {
        const msg = tipo === 'ACEITOU'
          ? '<span style="color:#34d399;font-weight:700;">✅ Encaminhamento aceito e registrado.</span>'
          : '<span style="color:#f87171;font-weight:700;">❌ Encaminhamento rejeitado e registrado.</span>';
        const decDiv = bloco.querySelector('div[style*="Decisão"]') || bloco.lastElementChild;
        if (decDiv) decDiv.innerHTML = msg;
      }
      if (typeof showToast === 'function') {
        showToast(tipo === 'ACEITOU' ? '✅ Encaminhamento aceito!' : '❌ Encaminhamento rejeitado.');
      }
    };

    if (btnAceitar)  btnAceitar.addEventListener('click',  () => _registrar('ACEITOU'));
    if (btnRejeitar) btnRejeitar.addEventListener('click', () => _registrar('REJEITOU'));
  }
}

/**
 * Exibe a modal de justificativa do encaminhamento.
 * Implementada fora do innerHTML para garantir execução pelo browser.
 */
function _showReferralModal(specialty, rationale) {
  // Remove modal anterior se existir
  var existing = document.getElementById('referral-modal-overlay');
  if (existing) existing.remove();

  // Injetar animação CSS se ainda não existir
  if (!document.getElementById('rag-modal-style')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'rag-modal-style';
    styleEl.textContent = [
      '@keyframes ragModalIn{',
      'from{opacity:0;transform:translateY(18px)}',
      'to{opacity:1;transform:translateY(0)}',
      '}'
    ].join('');
    document.head.appendChild(styleEl);
  }

  // Overlay
  var overlay = document.createElement('div');
  overlay.id = 'referral-modal-overlay';
  overlay.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
    'background:rgba(0,0,0,0.65)', 'z-index:9999',
    'display:flex', 'align-items:center', 'justify-content:center',
    'backdrop-filter:blur(5px)', '-webkit-backdrop-filter:blur(5px)'
  ].join(';') + ';';

  // Caixa da modal
  var modal = document.createElement('div');
  modal.style.cssText = [
    'background:var(--bg-primary,#1a1a2e)',
    'border:1px solid rgba(99,102,241,0.35)',
    'border-radius:16px',
    'padding:28px',
    'max-width:540px',
    'width:92%',
    'box-shadow:0 24px 64px rgba(0,0,0,0.55)',
    'position:relative',
    'animation:ragModalIn 0.22s ease'
  ].join(';') + ';';

  // Botão fechar
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.title = 'Fechar';
  closeBtn.style.cssText = 'position:absolute;top:14px;right:16px;background:none;border:none;color:var(--text-secondary,#aaa);font-size:1.4rem;cursor:pointer;line-height:1;padding:0;';
  closeBtn.addEventListener('click', function () { overlay.remove(); });

  // Cabeçalho
  var header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:18px;';
  var headerIcon = document.createElement('span');
  headerIcon.style.fontSize = '1.6rem';
  headerIcon.textContent = '🏥';
  var headerTitle = document.createElement('h3');
  headerTitle.style.cssText = 'margin:0;font-size:1.1rem;color:var(--primary,#6366f1);';
  headerTitle.textContent = 'Justificativa do Encaminhamento';
  header.appendChild(headerIcon);
  header.appendChild(headerTitle);

  // Label
  var label = document.createElement('p');
  label.style.cssText = 'margin:0 0 6px;font-size:0.85rem;color:var(--text-secondary,#aaa);';
  label.textContent = 'Especialidade sugerida:';

  // Nome da especialidade
  var specEl = document.createElement('p');
  specEl.style.cssText = 'margin:0 0 18px;font-size:1.15rem;font-weight:700;color:var(--text-primary,#fff);';
  specEl.textContent = specialty;

  // Divisor
  var divider = document.createElement('hr');
  divider.style.cssText = 'border:none;border-top:1px solid rgba(99,102,241,0.2);margin:0 0 16px;';

  // Texto da justificativa (com suporte a **negrito**)
  var rationaleEl = document.createElement('p');
  rationaleEl.style.cssText = 'margin:0;font-size:0.9rem;color:var(--text-primary,#ddd);line-height:1.75;';
  rationaleEl.innerHTML = rationale.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  modal.appendChild(closeBtn);
  modal.appendChild(header);
  modal.appendChild(label);
  modal.appendChild(specEl);
  modal.appendChild(divider);
  modal.appendChild(rationaleEl);
  overlay.appendChild(modal);

  // Fechar ao clicar fora
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}
