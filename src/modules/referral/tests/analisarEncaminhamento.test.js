// jest tests for analisarEncaminhamento
const { analisarEncaminhamento } = require('../rules/referral_rules.js');

test('analisarEncaminhamento returns Cardiologia for hypertension terms', () => {
  const texto = 'Paciente com hipertensão descompensada e PA > 140/90';
  const resultado = analisarEncaminhamento(texto);
  expect(resultado.especialidade).toBe('Cardiologia');
  expect(resultado.confiança).toBeGreaterThan(80);
});
