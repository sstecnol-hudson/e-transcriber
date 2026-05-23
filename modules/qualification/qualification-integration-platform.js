/**
 * INTEGRAÇÃO DO QUALIFICADOR COM A PLATAFORMA DE GESTÃO CLÍNICA
 * 
 * Este arquivo integra o módulo Qualificador de Encaminhamentos Médicos
 * com a plataforma existente (E-Transcriber+)
 */

// ============================================================================
// 1. INICIALIZAÇÃO E INTEGRAÇÃO COM A PLATAFORMA
// ============================================================================

let currentQualificationSession = null;

/** Obtém instância do sistema (browser global ou mock em testes) */
function getQualificationSystem() {
  if (typeof window !== 'undefined' && window.qualificationSystem) {
    return window.qualificationSystem;
  }
  if (typeof globalThis !== 'undefined' && globalThis.qualificationSystem) {
    return globalThis.qualificationSystem;
  }
  try {
    if (typeof getQualificationSystemFromModule === 'function') {
      return getQualificationSystemFromModule();
    }
  } catch {
    /* sistema ainda não inicializado */
  }
  return null;
}

/**
 * Inicializar o sistema de qualificação na plataforma
 */
async function initializeQualificationInPlatform() {
  try {
    window.qualificationSystem = await initializeQualificationSystem();
    console.log('✅ Módulo de Qualificação inicializado com sucesso');
    
    // Adicionar botão de qualificação ao menu
    addQualificationMenuButton();
    
    // Adicionar listeners para integração
    setupQualificationIntegration();
    
    return window.qualificationSystem;
  } catch (error) {
    console.error('❌ Erro ao inicializar módulo de qualificação:', error);
    showToast('Erro ao inicializar módulo de qualificação', 'error');
  }
}

/**
 * Adicionar botão de qualificação ao menu lateral
 */
function addQualificationMenuButton() {
  const sidebar = document.querySelector('.sidebar-menu');
  if (!sidebar) return;
  
  // Criar botão de qualificação
  const qualifyButton = document.createElement('button');
  qualifyButton.id = 'btn-menu-qualificacao';
  qualifyButton.className = 'menu-item';
  qualifyButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    <span>Qualificador</span>
  `;
  
  qualifyButton.addEventListener('click', () => {
    showQualificationTab();
  });
  
  // Inserir antes do botão de configurações
  const configButton = sidebar.querySelector('[data-tab="tab-config"]');
  if (configButton) {
    configButton.parentNode.insertBefore(qualifyButton, configButton);
  } else {
    sidebar.appendChild(qualifyButton);
  }
}

/**
 * Configurar integração com eventos da plataforma
 */
function setupQualificationIntegration() {
  // Listener para quando um prontuário é gerado
  document.addEventListener('prontuarioGenerated', (event) => {
    const prontuario = event.detail;
    enableQualificationButton(prontuario);
  });
  
  // Listener para quando um paciente é selecionado
  document.addEventListener('patientSelected', (event) => {
    const patient = event.detail;
    loadPatientQualificationHistory(patient.id);
  });
}

// ============================================================================
// 2. ADICIONAR BOTÃO DE QUALIFICAÇÃO AOS RESULTADOS DO PRONTUÁRIO
// ============================================================================

/**
 * Habilitar botão de qualificação após gerar prontuário
 */
function enableQualificationButton(prontuario) {
  // Encontrar o painel de resultados
  const resultsPanel = document.querySelector('.prontuario-results');
  if (!resultsPanel) return;
  
  // Verificar se botão já existe
  let qualifyBtn = resultsPanel.querySelector('#btn-qualify-referral');
  if (qualifyBtn) return;
  
  // Criar botão de qualificação
  qualifyBtn = document.createElement('button');
  qualifyBtn.id = 'btn-qualify-referral';
  qualifyBtn.className = 'btn btn-primary';
  qualifyBtn.style.marginTop = '15px';
  qualifyBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 11l3 3L22 4"/>
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    Qualificar para Encaminhamento
  `;
  
  qualifyBtn.addEventListener('click', () => {
    openQualificationModal(prontuario);
  });
  
  // Adicionar ao painel de resultados
  resultsPanel.appendChild(qualifyBtn);
}

// ============================================================================
// 3. MODAL DE SELEÇÃO DE ESPECIALIDADE
// ============================================================================

/**
 * Abrir modal de seleção de especialidade
 * 
 * Requisitos: 2, 14
 * - Exibe três especialidades com nome, descrição e ícone
 * - Implementa validação de seleção
 * - Suporta navegação por teclado (Escape para fechar)
 * - Interface responsiva para dispositivos móveis
 */
async function openQualificationModal(prontuario) {
  const system = getQualificationSystem();
  if (!system) {
    const notify = (typeof window !== 'undefined' && window.showToast) || showToast;
    notify('Sistema de qualificação não inicializado', 'error');
    return;
  }
  
  console.log('🔵 Abrindo modal de especialidade');
  
  // Obter especialidades disponíveis
  const specialties = system.getAvailableSpecialties();
  console.log('📋 Especialidades:', specialties);
  
  // Validar que temos exatamente 3 especialidades
  if (!specialties || specialties.length !== 3) {
    console.error('❌ Erro: Esperado 3 especialidades, encontrado', specialties?.length || 0);
    showToast('Erro: Especialidades não configuradas corretamente', 'error');
    return;
  }
  
  // Criar modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'qualification-specialty-modal';
  modal.innerHTML = `
    <div class="modal-content qualification-modal" style="max-width: 600px;">
      <div class="modal-header">
        <h2>Selecione a Especialidade para Qualificação</h2>
        <button class="modal-close" aria-label="Fechar modal" onclick="document.getElementById('qualification-specialty-modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <p style="color: #666; margin-bottom: 20px; font-size: 14px;">
          ℹ️ O sistema analisará automaticamente os dados da consulta e gerará um resumo de qualificação.
        </p>
        <div class="specialties-grid" style="display: grid; grid-template-columns: 1fr; gap: 15px;">
          ${specialties.map(spec => `
            <div class="specialty-card" data-specialty="${spec.id}" role="button" tabindex="0" style="
              padding: 20px;
              border: 2px solid #ddd;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.3s ease;
              text-align: center;
            " onmouseover="this.style.borderColor='#667eea'; this.style.backgroundColor='#f5f5f5';" onmouseout="this.style.borderColor='#ddd'; this.style.backgroundColor='white';">
              <div class="specialty-icon" style="font-size: 40px; margin-bottom: 10px;" aria-hidden="true">${spec.icon}</div>
              <h3 style="margin: 10px 0; color: #333;">${spec.name}</h3>
              <p style="margin: 0; color: #666; font-size: 14px;">${spec.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('qualification-specialty-modal').remove()">Cancelar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  console.log('✅ Modal de especialidade criado');
  
  // Adicionar listeners para seleção de especialidade
  setTimeout(() => {
    const cards = modal.querySelectorAll('.specialty-card');
    console.log('🔍 Encontradas', cards.length, 'cards de especialidade');
    
    // Validar que temos 3 cards
    if (cards.length !== 3) {
      console.error('❌ Erro: Esperado 3 cards, encontrado', cards.length);
      return;
    }
    
    cards.forEach(card => {
      // Validar que card tem data-specialty
      const specialty = card.dataset.specialty;
      if (!specialty) {
        console.error('❌ Erro: Card sem data-specialty');
        return;
      }
      
      // Validar que specialty é uma das três suportadas
      const validSpecialties = ['endocrinologia', 'cardiologia', 'reumatologia'];
      if (!validSpecialties.includes(specialty)) {
        console.error('❌ Erro: Especialidade inválida:', specialty);
        return;
      }
      
      // Adicionar listener de clique
      card.addEventListener('click', function() {
        console.log('✅ Especialidade selecionada:', specialty);
        modal.remove();
        const startFn = (typeof window !== 'undefined' && window.startAutomaticQualification)
          || startAutomaticQualification;
        startFn(prontuario, specialty);
      });
      
      // Adicionar suporte a teclado (Enter para selecionar)
      card.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          console.log('✅ Especialidade selecionada via teclado:', specialty);
          modal.remove();
          const startFn = (typeof window !== 'undefined' && window.startAutomaticQualification)
            || startAutomaticQualification;
          startFn(prontuario, specialty);
        }
      });
    });
    
    // Adicionar suporte a Escape para fechar modal
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        console.log('🔵 Escape pressionado, fechando modal');
        const currentModal = document.getElementById('qualification-specialty-modal');
        if (currentModal) {
          currentModal.remove();
          document.removeEventListener('keydown', handleEscapeKey);
        }
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    
    // Focar no primeiro card para melhor acessibilidade
    cards[0].focus();
    
  }, 100);
}

/**
 * Iniciar qualificação automática (sem questionário)
 */
async function startAutomaticQualification(prontuario, specialty) {
  try {
    console.log('🔵 Iniciando qualificação automática');
    console.log('📋 Prontuário:', prontuario);
    console.log('🏥 Especialidade:', specialty);
    
    const system = getQualificationSystem();
    if (!system) {
      console.error('❌ qualificationSystem não está definido');
      showToast('Erro: Sistema de qualificação não inicializado', 'error');
      return;
    }
    
    // Verificar se protocolos foram carregados
    if (!system.protocols || !system.protocols[specialty]) {
      console.error('❌ Protocolo não carregado para:', specialty);
      showToast('Erro: Protocolo não disponível para ' + specialty, 'error');
      return;
    }
    
    // Mostrar loading
    showToast('Analisando dados da consulta...', 'info');
    
    // Iniciar sessão
    const session = system.startQualification(
      prontuario.patientId || 'patient_' + Date.now(),
      specialty,
      prontuario
    );
    
    console.log('✅ Sessão iniciada:', session);
    currentQualificationSession = session;
    
    // Analisar automaticamente com base nos dados do prontuário
    analyzeQualificationAutomatically(prontuario, specialty);
    
  } catch (error) {
    console.error('❌ Erro ao iniciar qualificação:', error);
    showToast('Erro ao iniciar qualificação: ' + error.message, 'error');
  }
}

/**
 * Analisar qualificação automaticamente com base nos dados do prontuário
 */
function analyzeQualificationAutomatically(prontuario, specialty) {
  try {
    console.log('🔵 Analisando qualificação automaticamente');
    
    // Extrair dados relevantes do prontuário
    const analysisData = extractRelevantData(prontuario, specialty);
    
    console.log('📋 Dados extraídos:', analysisData);
    
    // Gerar resultado de qualificação
    const result = generateQualificationResult(analysisData, specialty);
    
    console.log('✅ Resultado gerado:', result);
    
    // Exibir resultado
    displayQualificationResult(result, prontuario, specialty);
    
  } catch (error) {
    console.error('❌ Erro ao analisar qualificação:', error);
    showToast('Erro ao analisar qualificação: ' + error.message, 'error');
  }
}

/**
 * Extrair dados relevantes do prontuário para análise
 */
function extractRelevantData(prontuario, specialty) {
  const data = {
    patientName: prontuario.patientName || 'Paciente',
    age: prontuario.age || 'N/A',
    specialty: specialty,
    consultationData: prontuario.consultationData || {},
    rawText: prontuario.rawText || '',
    timestamp: new Date().toISOString()
  };
  
  return data;
}

/**
 * Gerar resultado de qualificação automaticamente
 */
function generateQualificationResult(analysisData, specialty) {
  // Lógica simplificada de qualificação baseada em palavras-chave
  const text = (analysisData.rawText || '').toLowerCase();
  
  let status = 'NÃO_QUALIFICADO';
  let statusLabel = 'Não Qualificado';
  let statusColor = '#ff9800';
  let relevantFindings = [];
  let recommendation = '';
  
  // Critérios por especialidade
  switch(specialty) {
    case 'endocrinologia':
      if (text.includes('diabetes') || text.includes('glicose') || text.includes('insulina')) {
        status = 'QUALIFICADO';
        statusLabel = 'Qualificado';
        statusColor = '#4caf50';
        relevantFindings.push('Menção a diabetes ou alterações glicêmicas');
        recommendation = 'Encaminhar para avaliação endocrinológica especializada';
      } else if (text.includes('peso') || text.includes('obesidade') || text.includes('metabolismo')) {
        status = 'URGENCIA';
        statusLabel = 'Urgência';
        statusColor = '#f44336';
        relevantFindings.push('Alterações metabólicas detectadas');
        recommendation = 'Encaminhar com prioridade para endocrinologia';
      }
      break;
      
    case 'cardiologia':
      if (text.includes('pressão') || text.includes('hipertensão') || text.includes('coração') || text.includes('arritmia')) {
        status = 'QUALIFICADO';
        statusLabel = 'Qualificado';
        statusColor = '#4caf50';
        relevantFindings.push('Alterações cardiovasculares detectadas');
        recommendation = 'Encaminhar para avaliação cardiológica';
      } else if (text.includes('infarto') || text.includes('angina') || text.includes('dispneia')) {
        status = 'URGENCIA';
        statusLabel = 'Urgência';
        statusColor = '#f44336';
        relevantFindings.push('Sintomas cardiovasculares graves');
        recommendation = 'Encaminhar com urgência para cardiologia';
      }
      break;
      
    case 'reumatologia':
      if (text.includes('artrite') || text.includes('artrose') || text.includes('articulação') || text.includes('lúpus') || text.includes('inflamação')) {
        status = 'QUALIFICADO';
        statusLabel = 'Qualificado';
        statusColor = '#4caf50';
        relevantFindings.push('Alterações reumatológicas detectadas');
        recommendation = 'Encaminhar para avaliação reumatológica';
      } else if (text.includes('dor intensa') && text.includes('articulação')) {
        status = 'URGENCIA';
        statusLabel = 'Urgência';
        statusColor = '#f44336';
        relevantFindings.push('Dor articular intensa');
        recommendation = 'Encaminhar com prioridade para reumatologia';
      }
      break;
  }
  
  // Se não encontrou critérios específicos, marcar como não qualificado
  if (relevantFindings.length === 0) {
    relevantFindings.push('Dados insuficientes para qualificação nesta especialidade');
    recommendation = 'Paciente não atende aos critérios de encaminhamento para ' + specialty;
  }
  
  return {
    status: status,
    statusLabel: statusLabel,
    statusColor: statusColor,
    specialty: specialty,
    relevantFindings: relevantFindings,
    recommendation: recommendation,
    analysisDate: new Date().toLocaleString('pt-BR'),
    analysisMethod: 'Análise Automática'
  };
}

/**
 * Exibir resultado de qualificação
 */
function displayQualificationResult(result, prontuario, specialty) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'qualification-result-modal';
  
  const statusEmoji = result.status === 'URGENCIA' ? '🚨' : result.status === 'QUALIFICADO' ? '✅' : '⚠️';
  
  modal.innerHTML = `
    <div class="modal-content qualification-result-modal" style="max-width: 700px;">
      <div class="modal-header">
        <h2>Resultado da Qualificação</h2>
        <button class="modal-close" onclick="document.getElementById('qualification-result-modal').remove()">×</button>
      </div>
      <div class="modal-body" style="padding: 30px;">
        
        <!-- Status Principal -->
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 10px;">${statusEmoji}</div>
          <h3 style="margin: 10px 0; color: ${result.statusColor}; font-size: 24px;">${result.statusLabel}</h3>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">Especialidade: <strong>${result.specialty}</strong></p>
        </div>
        
        <!-- Achados Relevantes -->
        <div style="margin-bottom: 20px;">
          <h4 style="color: #333; margin-bottom: 10px;">📋 Achados Relevantes:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #666;">
            ${result.relevantFindings.map(finding => `<li style="margin: 5px 0;">${finding}</li>`).join('')}
          </ul>
        </div>
        
        <!-- Recomendação -->
        <div style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
          <h4 style="color: #1976d2; margin-top: 0;">💡 Recomendação:</h4>
          <p style="margin: 0; color: #1565c0;">${result.recommendation}</p>
        </div>
        
        <!-- Informações da Análise -->
        <div style="padding: 15px; background: #f9f9f9; border-radius: 4px; font-size: 12px; color: #999;">
          <p style="margin: 5px 0;">Data da Análise: ${result.analysisDate}</p>
          <p style="margin: 5px 0;">Método: ${result.analysisMethod}</p>
          <p style="margin: 5px 0;">Paciente: ${prontuario.patientName || 'N/A'}</p>
        </div>
        
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('qualification-result-modal').remove()">Fechar</button>
        <button class="btn btn-primary" onclick="downloadQualificationSummary('${result.status}', '${result.specialty}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Baixar Resumo
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  showToast('Qualificação concluída!', 'success');
}

/**
 * Baixar resumo de qualificação
 */
function downloadQualificationSummary(status, specialty) {
  const summary = `
RESUMO DE QUALIFICAÇÃO PARA ENCAMINHAMENTO
==========================================

Especialidade: ${specialty}
Status: ${status}
Data: ${new Date().toLocaleString('pt-BR')}

Este é um resumo automático gerado pelo sistema.
Para encaminhamento, consulte o médico responsável.
  `.trim();
  
  const blob = new Blob([summary], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qualificacao_${specialty}_${Date.now()}.txt`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  showToast('Resumo baixado com sucesso!', 'success');
}

// ============================================================================
// 4. ANÁLISE AUTOMÁTICA (SEM QUESTIONÁRIO)
// ============================================================================

// Funções de análise automática estão acima (startAutomaticQualification, etc)

/**
 * Cancelar qualificação
 */
function cancelQualification() {
  const modal = document.getElementById('questionnaire-modal');
  if (modal) modal.remove();
  
  // Limpar sessão atual
  currentQualificationSession = null;
}

// ============================================================================
// 5. HISTÓRICO E UTILITÁRIOS
// ============================================================================

/**
 * Mostrar notificação (toast)
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// ============================================================================
// 6. INICIALIZAÇÃO
// ============================================================================

// Inicializar quando a página carregar (não em ambiente de teste Jest)
const _isNodeTestEnv = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
if (typeof document !== 'undefined' && !_isNodeTestEnv) {
  document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
      try {
        await initializeQualificationInPlatform();
        console.log('✅ Sistema de qualificação pronto para uso');
      } catch (error) {
        console.error('❌ Erro ao inicializar qualificação:', error);
      }
    }, 500);
  });
}

// Exportar funções globais (browser)
if (typeof window !== 'undefined') {
  window.initializeQualificationInPlatform = initializeQualificationInPlatform;
  window.openQualificationModal = openQualificationModal;
  window.startAutomaticQualification = startAutomaticQualification;
  window.analyzeQualificationAutomatically = analyzeQualificationAutomatically;
  window.cancelQualification = cancelQualification;
  window.downloadQualificationSummary = downloadQualificationSummary;
  window.showToast = showToast;
  window.enableQualificationButton = enableQualificationButton;
}

// Exportar para Node/Jest
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeQualificationInPlatform,
    openQualificationModal,
    startAutomaticQualification,
    analyzeQualificationAutomatically,
    cancelQualification,
    downloadQualificationSummary,
    enableQualificationButton,
    showToast,
    getQualificationSystem
  };
}
