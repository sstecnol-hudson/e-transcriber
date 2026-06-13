// test/referral_modal.test.js
/** @jest-environment jsdom */
import { abrirAnaliseEncaminhamento, abrirEstatisticas } from "../src/modules/referral/referral_interface.js";

// Mock dependencies
jest.mock("../src/modules/referral/rules/referral_rules.js", () => ({
  analisarEncaminhamento: jest.fn(() => ({
    especialidade: "Cardiologia",
    confiança: 92.5,
    justificativa: "Teste de justificativa"
  }))
}));

jest.mock("../src/modules/referral/learning/learning_engine.js", () => ({
  registrarDecisao: jest.fn(),
  getEstatisticasDesempenho: jest.fn(() => ({
    total_decisoes: 10,
    taxa_acerto: 80,
    ajustes_realizados: 2,
    padroes_detectados: 3,
    ultima_atualizacao: "2024-01-01"
  })),
  exportarDadosAprendizado: jest.fn(() => JSON.stringify({ foo: "bar" }))
}));

describe('Referral modal functionality', () => {
  beforeEach(() => {
    document.body.innerHTML = '<textarea id="rawTranscript"></textarea>';
    // Clear any existing modals
    const existing = document.getElementById("referral-modal");
    if (existing) existing.remove();
    const existingStats = document.getElementById("referral-stats-modal");
    if (existingStats) existingStats.remove();
  });

  test('abrirAnaliseEncaminhamento creates and closes modal', () => {
    abrirAnaliseEncaminhamento();
    const modal = document.getElementById('referral-modal');
    expect(modal).not.toBeNull();
    // Accept button should trigger registrarDecisao and close modal
    const acceptBtn = document.getElementById('btn-aceitar-encaminhamento');
    acceptBtn.click();
    const { registrarDecisao } = require('../src/modules/referral/learning/learning_engine.js');
    expect(registrarDecisao).toHaveBeenCalled();
    expect(document.getElementById('referral-modal')).toBeNull();
  });

  test('abrirEstatisticas creates stats modal and can export data', () => {
    abrirEstatisticas();
    const modal = document.getElementById('referral-stats-modal');
    expect(modal).not.toBeNull();
    const closeBtn = document.getElementById('btn-close-stats');
    closeBtn.click();
    expect(document.getElementById('referral-stats-modal')).toBeNull();
  });
});
