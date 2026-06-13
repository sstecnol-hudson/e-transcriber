// src/modules/referral/backend/config.js
// Configuração do cliente de analytics.
// ⚠️ NUNCA comite tokens reais aqui. Configure via localStorage ou variável de ambiente.
// Para configurar o token, execute no console do browser:
//   localStorage.setItem('GITHUB_TOKEN', 'seu_token_aqui')

export const GITHUB_TOKEN = (typeof localStorage !== 'undefined' && localStorage.getItem('GITHUB_TOKEN'))
  || '';  // Token deve ser configurado via localStorage no browser
export const REPO_OWNER    = "sstecnol-hudson";
export const REPO_NAME     = "e-transcriber";
export const TARGET_PATH   = "data/learning/encaminhamentos.json";
export const DEFAULT_BRANCH = "main";
