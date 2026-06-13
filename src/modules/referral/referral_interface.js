// INTERFACE DO MÓDULO DE ENCAMINHAMENTO
// Adiciona botão, resultados e formulário na tela
// Integra com o fluxo existente do E-Transcriber

import { analisarEncaminhamento } from './rules/referral_rules.js';
import { registrarDecisao, getEstatisticasDesempenho, exportarDadosAprendizado } from './learning/learning_engine.js';

// 🖱️ ADICIONAR BOTÃO NA TELA DE CONSULTA
export function adicionarBotaoEncaminhamento() {
  // Verificar se já existe
  if (document.getElementById('btn-encaminhamento')) return;

  const container = document.createElement('div');
  container.className = 'd-flex gap-2';

  const botao = document.createElement('button');
  botao.id = 'btn-encaminhamento';
  botao.className = 'btn btn-primary mt-2 mb-2 referral-btn';
  botao.style.cssText = 'background: #2563eb; color: white; padding: 8px 12px; border-radius: 6px; border: none; flex: 1; min-width: 120px;';
  botao.innerHTML = '🧭 SUGERIR ENCAMINHAMENTO SUS';
  botao.onclick = abrirAnaliseEncaminhamento;

  const btnStats = document.createElement('button');
  btnStats.className = 'btn btn-info mt-2 mb-2 referral-btn';
  btnStats.innerText = '📊';
  btnStats.style.cssText = 'padding: 8px 12px; border-radius: 6px; border: none; flex: 0 0 auto; min-width: 40px;';
  btnStats.onclick = abrirEstatisticas;

  container.appendChild(botao);
  container.appendChild(btnStats);

  // Inserir APÓS o botão de gerar documentos
  const gerarBtn = document.getElementById('btn-generate-documents');
  if (gerarBtn && gerarBtn.parentNode) {
    // Insert after the generate button
    gerarBtn.parentNode.insertBefore(container, gerarBtn.nextSibling);
  } else {
    const main = document.querySelector('main.main-content');
    if (main) main.appendChild(container);
  }

// Removed redundant dark mode toggle; global theme is handled elsewhere.
}

function toggleDarkMode() {
  document.body.classList.toggle('referral-dark');
  const isDark = document.body.classList.contains('referral-dark');
  localStorage.setItem('referral_dark_mode', isDark);
}

export function abrirAnaliseEncaminhamento() {
  const texto = document.getElementById('rawTranscript')?.value || '';
  const resultado = analisarEncaminhamento(texto);

  const modal = document.createElement('div');
  modal.id = 'referral-modal';
  modal.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:2000';
  modal.innerHTML = `
    <div class="referral-modal modal-fade" style="padding:20px;border-radius:8px;max-width:600px;width:90%;box-shadow:0 4px 12px rgba(0,0,0,0.2);"
    >
      <h3>Encaminhamento Sugerido</h3>
      <p><strong>Especialidade:</strong> ${resultado.especialidade}</p>
      <p><strong>Confiança:</strong> ${resultado.confiança.toFixed(1)}%</p>
      <p><strong>Justificativa:</strong> ${resultado.justificativa}</p>
      <button id="btn-aceitar-encaminhamento" class="btn btn-success referral-btn" style="margin-right:8px;">Aceitar</button>
      <button id="btn-rejeitar-encaminhamento" class="btn btn-secondary referral-btn">Rejeitar</button>
    </div>
  `;
  document.body.appendChild(modal);

  const decisaoAceita = { tipo: 'ACEITOU', especialidade: resultado.especialidade };
const decisaoRejeitada = { tipo: 'REJEITOU', especialidade: null };

document.getElementById('btn-aceitar-encaminhamento').onclick = () => {
  registrarDecisao([resultado], decisaoAceita, {});
  fecharModal();
};
document.getElementById('btn-rejeitar-encaminhamento').onclick = () => {
  registrarDecisao([resultado], decisaoRejeitada, {});
  fecharModal();
};

  function fecharModal() {
    const m = document.getElementById('referral-modal');
    if (m) m.remove();
  }
}

export function abrirEstatisticas() {
  const stats = getEstatisticasDesempenho();
  const modal = document.createElement('div');
  modal.id = 'referral-stats-modal';
  modal.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:2000';
  modal.innerHTML = `
    <div class="referral-modal modal-fade" style="padding:20px;border-radius:8px;max-width:500px;width:90%;box-shadow:0 4px 12px rgba(0,0,0,0.2);"
    >
      <h3>Estatísticas de Aprendizado</h3>
      <ul style="list-style:none;padding:0;">
        <li><strong>Total de decisões:</strong> ${stats.total_decisoes}</li>
        <li><strong>Taxa de acerto:</strong> ${stats.taxa_acerto}%</li>
        <li><strong>Ajustes realizados:</strong> ${stats.ajustes_realizados}</li>
        <li><strong>Padrões detectados:</strong> ${stats.padroes_detectados}</li>
        <li><strong>Última atualização:</strong> ${stats.ultima_atualizacao}</li>
      </ul>
      <button id="btn-export-data" class="btn btn-primary referral-btn" style="margin-right:8px;">Exportar Dados (JSON)</button>
      <button id="btn-close-stats" class="btn btn-secondary referral-btn">Fechar</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-close-stats').onclick = () => {
    const m = document.getElementById('referral-stats-modal');
    if (m) m.remove();
  };
  document.getElementById('btn-export-data').onclick = () => {
    const json = exportarDadosAprendizado();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aprendizado_etranscriber_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };
}

// Nota: O botão de encaminhamento SUS foi unificado com o painel RAG.
// O módulo permanece disponível para uso manual via exports caso necessário.
// Para reativar o botão separado, chame: adicionarBotaoEncaminhamento()
