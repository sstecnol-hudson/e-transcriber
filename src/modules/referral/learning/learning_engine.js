// MÓDULO DE APRENDIZADO CONTÍNUO
// Armazena decisões, atualiza regras e melhora assertividade
// LGPD: Dados anonimizados, sem dados pessoais

import { REGRAS_ENCAMINHAMENTO } from '../rules/referral_rules.js';

// CHAVE DE ARMAZENAMENTO LOCAL
const STORAGE_KEY = 'etranscriber_learning_data';

// DADOS INICIAIS
function getDadosAprendizado() {
  const dados = localStorage.getItem(STORAGE_KEY);
  return dados ? JSON.parse(dados) : {
    decisoes: [],
    ajustes_regras: [],
    padroes_detectados: [],
    estatisticas: { total: 0, acertos: 0, erros: 0 }
  };
}

// SALVAR DADOS
function salvarDadosAprendizado(dados) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

// 🧠 REGISTRAR DECISÃO DO MÉDICO
export function registrarDecisao(regras, decisao, contexto) {
  const dados = getDadosAprendizado();

  const registro = {
    timestamp: new Date().toISOString(),
    decisao_medico: decisao.tipo,
    especialidade_escolhida: decisao.especialidade,
    contexto: {
      termos: contexto.termos || [],
      cids: contexto.cids || []
    }
  };

  dados.decisoes.push(registro);
  dados.estatisticas.total += 1;

  if (decisao.tipo === 'ACEITOU') {
    dados.estatisticas.acertos += 1;
  } else if (decisao.tipo === 'REJEITOU') {
    dados.estatisticas.erros += 1;
  }

  // Atualizar pesos das regras afetadas
  if (Array.isArray(regras)) {
    regras.forEach(regra => atualizarPesosRegras(regra, decisao));
  }

  salvarDadosAprendizado(dados);
  detectarPadroes(dados.decisoes);
}

// ⚖️ ATUALIZAR PESOS DAS REGRAS COM BASE NAS DECISÕES
function atualizarPesosRegras(regra, decisao) {
  const dados = getDadosAprendizado();
  
  // Encontrar ou criar registro de ajuste
  let ajuste = dados.ajustes_regras.find(a => a.id_regra === regra.id);
  if (!ajuste) {
    ajuste = { id_regra: regra.id, acertos: 0, erros: 0, peso_ajuste: 0 };
    dados.ajustes_regras.push(ajuste);
  }

  // Ajustar contadores e pesos
  if (decisao.tipo === 'ACEITOU') {
    ajuste.acertos += 1;
    ajuste.peso_ajuste = Math.min(5, ajuste.peso_ajuste + 0.3); // Aumenta peso
  } else if (decisao.tipo === 'REJEITOU') {
    ajuste.erros += 1;
    ajuste.peso_ajuste = Math.max(-5, ajuste.peso_ajuste - 0.7); // Diminui peso
  } else if (decisao.tipo === 'ALTEROU') {
    ajuste.peso_ajuste = Math.max(-3, Math.min(3, ajuste.peso_ajuste - 0.2)); // Ajuste leve
  }

  salvarDadosAprendizado(dados);
}

// 🔍 DETECTAR NOVOS PADRÕES CLÍNICOS
function detectarPadroes(decisoes) {
  const combinacoes = {};

  // Agrupar por combinação de sintomas/CID e especialidade escolhida
  decisoes
    .filter(d => d.decisao_medico === 'ACEITOU' || d.decisao_medico === 'ALTEROU')
    .forEach(d => {
      const chave = `${d.contexto.termos.sort().join('+')}||${d.contexto.cids.sort().join('+')}=>${d.especialidade_escolhida}`;
      combinacoes[chave] = (combinacoes[chave] || 0) + 1;
    });

  // Identificar padrões frequentes (>3 ocorrências)
  const novosPadroes = Object.entries(combinacoes)
    .filter(([_, contagem]) => contagem >= 3)
    .map(([padrao, contagem]) => ({ 
      padrao, 
      contagem, 
      data_deteccao: new Date().toISOString(),
      status: 'novo'
    }));

  // Atualizar lista sem duplicar
  const dados = getDadosAprendizado();
  dados.padroes_detectados = novosPadroes;
  salvarDadosAprendizado(dados);
}

// 📊 OBTER DESEMPENHO DO SISTEMA
export function getEstatisticasDesempenho() {
  const dados = getDadosAprendizado();
  const total = dados.estatisticas.total;
  if (total === 0) return { taxa_acerto: 0, total_decisoes: 0 };

  return {
    total_decisoes: total,
    taxa_acerto: Math.round((dados.estatisticas.acertos / total) * 100),
    ajustes_realizados: dados.ajustes_regras.length,
    padroes_detectados: dados.padroes_detectados.length,
    ultima_atualizacao: new Date().toLocaleDateString('pt-BR')
  };
}

// 📤 EXPORTAR DADOS PARA APRIMORAMENTO (ANÔNIMO)
import { sendLearningData } from '../backend/analytics_client.js';

export async function enviarDadosAprendizado() {
  const json = exportarDadosAprendizado();
  const result = await sendLearningData(json);
  if (result.status !== 'ok') {
    console.warn('Analytics send failed or not configured:', result);
  }
  return result;
}

export function exportarDadosAprendizado() {
  const dados = getDadosAprendizado();
  // Remover qualquer dado que possa identificar paciente
  return JSON.stringify({
    versao_sistema: '2.1',
    dados: dados.decisoes.map(d => ({
      cids: d.contexto.cids,
      termos: d.contexto.termos,
      decisao: d.decisao_medico,
      especialidade: d.especialidade_escolhida
    }))
  }, null, 2);
}

// Expor funções-chave como globais para que scripts clássicos (rag-ui.js) possam acessá-las
if (typeof window !== 'undefined') {
  window.registrarDecisao       = registrarDecisao;
  window.getEstatisticasDesempenho = getEstatisticasDesempenho;
  window.exportarDadosAprendizado  = exportarDadosAprendizado;
}
