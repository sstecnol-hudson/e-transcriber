// REGRAS DE ENCAMINHAMENTO - SUS - ATENÇÃO PRIMÁRIA
// Versão: 2.2 | Fonte: Protocolos SUS, Portarias 2436/2017, 189/2018
// INCLUÍDO: Reumatologia, Neuropediatria, Genética Médica, Urologia, Hematologia
// Objetivo: Indicar especialista correto com base em queixas, diagnósticos e CIDs

const REGRAS_ENCAMINHAMENTO = [
  // ==========================
  // CARDIOLOGIA
  // ==========================
  {
    id: 'CARD-001',
    especialidade: 'Cardiologia',
    prioridade: 'Média',
    confiança_base: 92,
    criterios: [
      { termo: 'hipertensão descompensada', peso: 10 },
      { termo: 'PA > 140/90', peso: 9 },
      { termo: 'dor no peito', peso: 15 },
      { termo: 'infarto', peso: 20 },
      { termo: 'arritmia', peso: 12 },
      { termo: 'insuficiência cardíaca', peso: 18 },
      { termo: 'edema de membros inferiores', peso: 8 },
      { termo: 'palpitações', peso: 7 }
    ],
    cids: ['I10', 'I11', 'I20', 'I21', 'I49', 'I50', 'I34', 'I35'],
    exames_obrigatorios: [
      'Eletrocardiograma',
      'Creatinina',
      'Ureia',
      'Hemograma Completo',
      'Perfil Lipídico',
      'Glicose em Jejum'
    ],
    protocolo: 'Linha de Cuidado em Hipertensão e Doenças Cardiovasculares - Portaria GM/MS 2436/2017',
    justificativa_padrao: 'Paciente apresenta quadro de [DIAGNÓSTICO], com fatores de risco/descompensação, necessitando avaliação e conduta especializada em Cardiologia conforme protocolo da Atenção Primária.'
  },

  // ==========================
  // ENDOCRINOLOGIA
  // ==========================
  {
    id: 'ENDO-001',
    especialidade: 'Endocrinologia',
    prioridade: 'Média',
    confiança_base: 90,
    criterios: [
      { termo: 'diabetes descompensada', peso: 15 },
      { termo: 'hemoglobina glicada > 7%', peso: 12 },
      { termo: 'nódulo tireoidiano', peso: 14 },
      { termo: 'hipotireoidismo refratário', peso: 10 },
      { termo: 'hipertireoidismo', peso: 13 },
      { termo: 'obesidade grau III', peso: 9 },
      { termo: 'distúrbio do metabolismo ósseo', peso: 8 }
    ],
    cids: ['E10', 'E11', 'E03', 'E05', 'E04', 'E66', 'E27', 'E28'],
    exames_obrigatorios: [
      'Glicose em Jejum',
      'Hemoglobina Glicada',
      'TSH',
      'T4 Livre',
      'Perfil Lipídico',
      'Urina Tipo I'
    ],
    protocolo: 'Linha de Cuidado em Doenças Endócrinas e Metabólicas - Telessaúde SUS',
    justificativa_padrao: 'Paciente com diagnóstico de [DIAGNÓSTICO], sem controle clínico ou com complicações, necessitando avaliação especializada em Endocrinologia para ajuste de conduta.'
  },

  // ==========================
  // NEUROLOGIA
  // ==========================
  {
    id: 'NEURO-001',
    especialidade: 'Neurologia',
    prioridade: 'Alta',
    confiança_base: 95,
    criterios: [
      { termo: 'cefaleia crônica', peso: 10 },
      { termo: 'convulsão', peso: 20 },
      { termo: 'acidente vascular cerebral', peso: 25 },
      { termo: 'tontura persistente', peso: 8 },
      { termo: 'perda de força ou sensibilidade', peso: 15 },
      { termo: 'distúrbio de movimento', peso: 12 },
      { termo: 'desmaio de causa indeterminada', peso: 9 }
    ],
    cids: ['G43', 'G44', 'G40', 'I63', 'I64', 'G51', 'G20', 'R42'],
    exames_obrigatorios: [
      'Hemograma',
      'Glicose',
      'Eletrólitos',
      'TC ou RM de Crânio (conforme indicação)'
    ],
    protocolo: 'Protocolo de Encaminhamento para Neurologia - CONASS 2018',
    justificativa_padrao: 'Paciente apresenta sintomas neurológicos de risco ou persistentes [SINTOMAS], que não se enquadram na atenção básica, necessitando avaliação especializada.'
  },

  // ==========================
  // ✅ NEUROPEDIATRIA (ADICIONADO)
  // ==========================
  {
    id: 'NEUROPED-001',
    especialidade: 'Neuropediatria',
    prioridade: 'Alta',
    confiança_base: 96,
    criterios: [
      { termo: 'criança com convulsão', peso: 25 },
      { termo: 'atraso no desenvolvimento neuropsicomotor', peso: 22 },
      { termo: 'paralisia cerebral', peso: 25 },
      { termo: 'hipotonia ou hipertonia', peso: 18 },
      { termo: 'distúrbio de aprendizagem grave', peso: 14 },
      { termo: 'cefaleia na criança > 3 meses', peso: 12 },
      { termo: 'movimentos anormais', peso: 16 },
      { termo: 'microcefalia ou macrocefalia', peso: 20 }
    ],
    cids: ['G40', 'G80', 'R62.0', 'G31.8', 'Q02', 'Q03', 'F80', 'F81'],
    exames_obrigatorios: [
      'Avaliação do Desenvolvimento',
      'Hemograma',
      'Dosagem de Eletrólitos',
      'TC ou RM de Crânio (se indicado)',
      'Eletrencefalograma'
    ],
    protocolo: 'Linha de Cuidado em Saúde da Criança - Distúrbios Neurológicos - MS 2020',
    justificativa_padrao: 'Paciente pediátrico com alteração neurológica ou desenvolvimento alterado [QUADRO], que requer avaliação especializada em Neuropediatria para diagnóstico e acompanhamento adequado.'
  },

  // ==========================
  // PEDIATRIA
  // ==========================
  {
    id: 'PED-001',
    especialidade: 'Pediatria',
    prioridade: 'Variável',
    confiança_base: 93,
    criterios: [
      { termo: 'criança < 1 ano com febre', peso: 18 },
      { termo: 'baixo peso ou crescimento inadequado', peso: 14 },
      { termo: 'desenvolvimento neuropsicomotor alterado', peso: 20 },
      { termo: 'doença crônica na infância', peso: 15 },
      { termo: 'vacinação atrasada com complicações', peso: 10 }
    ],
    cids: ['R62', 'Z00', 'P07', 'J20', 'B08'],
    exames_obrigatorios: [
      'Curva de Crescimento',
      'Hemograma',
      'Pesquisa de Parasitas'
    ],
    protocolo: 'Linha de Cuidado em Saúde da Criança - Portaria 1.016/2012',
    justificativa_padrao: 'Paciente pediátrico com quadro de [DIAGNÓSTICO], necessitando acompanhamento especializado conforme diretrizes de saúde da criança.'
  },

  // ==========================
  // GINECOLOGIA / OBSTETRÍCIA
  // ==========================
  {
    id: 'GINO-001',
    especialidade: 'Ginecologia e Obstetrícia',
    prioridade: 'Média',
    confiança_base: 91,
    criterios: [
      { termo: 'sangramento uterino anormal', peso: 15 },
      { termo: 'dor pélvica crônica', peso: 12 },
      { termo: 'nódulo de mama', peso: 20 },
      { termo: 'alteração de exame citopatológico', peso: 18 },
      { termo: 'gestação de alto risco', peso: 25 },
      { termo: 'infertilidade', peso: 10 }
    ],
    cids: ['N92', 'N94', 'C50', 'D05', 'O10', 'O14', 'N87'],
    exames_obrigatorios: [
      'Exame Citopatológico',
      'USG Pélvica/Mamária',
      'Dosagem Hormonal',
      'Hemograma'
    ],
    protocolo: 'Protocolo de Atenção à Saúde da Mulher - MS 2016',
    justificativa_padrao: 'Paciente apresenta alteração em saúde ginecológica/obstétrica [QUADRO], que requer avaliação especializada para definição de conduta.'
  },

  // ==========================
  // PNEUMOLOGIA
  // ==========================
  {
    id: 'PNEUMO-001',
    especialidade: 'Pneumologia',
    prioridade: 'Média',
    confiança_base: 89,
    criterios: [
      { termo: 'asma não controlada', peso: 14 },
      { termo: 'DPOC', peso: 16 },
      { termo: 'tosse crônica > 3 semanas', peso: 10 },
      { termo: 'suspeita de tuberculose', peso: 20 },
      { termo: 'dispneia de esforço', peso: 9 }
    ],
    cids: ['J45', 'J44', 'J98', 'A15', 'R06'],
    exames_obrigatorios: ['Raio X de Tórax', 'Espirometria'],
    protocolo: 'Protocolo de Doenças Respiratórias - Telessaúde'
  },

  // ==========================
  // ORTOPEDIA
  // ==========================
  {
    id: 'ORTOPED-001',
    especialidade: 'Ortopedia e Traumatologia',
    prioridade: 'Variável',
    confiança_base: 88,
    criterios: [
      { termo: 'fratura', peso: 25 },
      { termo: 'dor articular crônica', peso: 12 },
      { termo: 'hérnia de disco', peso: 15 },
      { termo: 'limitação de movimento', peso: 10 }
    ],
    cids: ['M54', 'M75', 'S00', 'T00'],
    exames_obrigatorios: ['Raio X da região', 'RM ou TC conforme indicação'],
    protocolo: 'Protocolo de Lesões Musculoesqueléticas - APS'
  },

  // ==========================
  // GASTROENTEROLOGIA
  // ==========================
  {
    id: 'GASTRO-001',
    especialidade: 'Gastroenterologia',
    prioridade: 'Média',
    confiança_base: 87,
    criterios: [
      { termo: 'dor abdominal recorrente', peso: 10 },
      { termo: 'sangramento digestivo', peso: 20 },
      { termo: 'alteração de hábito intestinal', peso: 12 },
      { termo: 'suspeita de úlcera', peso: 14 },
      { termo: 'icterícia', peso: 18 }
    ],
    cids: ['K25', 'K26', 'K59', 'K70', 'R17'],
    exames_obrigatorios: ['Endoscopia Digestiva Alta', 'Ultrassom Abdominal', 'Fezes - Parasitológico'],
    protocolo: 'Linha de Cuidado em Doenças Digestivas - MS'
  },

  // ==========================
  // ✅ REUMATOLOGIA (ADICIONADO)
  // ==========================
  {
    id: 'REUM-001',
    especialidade: 'Reumatologia',
    prioridade: 'Média',
    confiança_base: 93,
    criterios: [
      { termo: 'dor articular inflamatória', peso: 15 },
      { termo: 'rigidez matinal > 30 min', peso: 18 },
      { termo: 'artrite', peso: 20 },
      { termo: 'lúpus eritematoso sistêmico', peso: 22 },
      { termo: 'artrite reumatoide', peso: 22 },
      { termo: 'espondilite', peso: 19 },
      { termo: 'fibromialgia refratária', peso: 12 },
      { termo: 'doença do tecido conjuntivo', peso: 17 },
      { termo: 'síndrome antifosfolípide', peso: 21 }
    ],
    cids: ['M05', 'M06', 'M32', 'M35', 'M45', 'M79.7', 'L93.0', 'D68.8'],
    exames_obrigatorios: [
      'Fator Reumatoide',
      'Anticorpos Anti-CCP',
      'VHS e Proteína C Reativa',
      'Hemograma Completo',
      'Autoanticorpos (ANA)',
      'Raio X das articulações acometidas'
    ],
    protocolo: 'Linha de Cuidado em Doenças Reumáticas - Portaria GM/MS 822/2019',
    justificativa_padrao: 'Paciente apresenta quadro de doença reumática ou inflamatória sistêmica [QUADRO], com comprometimento articular ou tecidual, necessitando avaliação e acompanhamento especializado em Reumatologia.'
  },

  // ==========================
  // ✅ GENÉTICA MÉDICA (ADICIONADO)
  // ==========================
  {
    id: 'GENET-001',
    especialidade: 'Genética Médica',
    prioridade: 'Média',
    confiança_base: 95,
    criterios: [
      { termo: 'anomalia congênita múltipla', peso: 25 },
      { termo: 'deficiência intelectual sem causa definida', peso: 22 },
      { termo: 'suspeita de síndrome genética', peso: 24 },
      { termo: 'má formação congênita', peso: 20 },
      { termo: 'história familiar de doença hereditária', peso: 18 },
      { termo: 'casal com abortos recorrentes', peso: 19 },
      { termo: 'distúrbio do desenvolvimento com características dismórficas', peso: 23 },
      { termo: 'nanismo ou gigantismo', peso: 17 }
    ],
    cids: ['Q00-Q99', 'F70-F79', 'R62', 'Z82', 'O35', 'P02.7'],
    exames_obrigatorios: [
      'Avaliação Clínica Detalhada',
      'Árvore Genealógica',
      'Hemograma',
      'Dosagem de Eletrólitos e Função Renal/Hepática',
      'Cariótipo',
      'Raio X conforme indicação'
    ],
    protocolo: 'Diretrizes de Atenção à Pessoa com Doenças Genéticas - CONASS 2021',
    justificativa_padrao: 'Paciente apresenta características clínicas ou história familiar sugestiva de alteração genética ou síndrome hereditária, que requer avaliação especializada em Genética Médica para diagnóstico, aconselhamento e conduta.'
  },

  // ==========================
  // ✅ CIRURGIA VASCULAR / ANGIOLOGIA
  // ==========================
  {
    id: 'VASC-001',
    especialidade: 'Cirurgia Vascular / Angiologia',
    prioridade: 'Alta',
    confiança_base: 96,
    criterios: [
      { termo: 'isquemia digital',              peso: 30 },
      { termo: 'isquemia periférica',           peso: 28 },
      { termo: 'isquemia aguda',                peso: 25 },
      { termo: 'dedo azul',                     peso: 25 },
      { termo: 'dedo cianótico',                peso: 22 },
      { termo: 'dedo arroxeado',                peso: 22 },
      { termo: 'trombose arterial',             peso: 28 },
      { termo: 'trombose venosa',               peso: 24 },
      { termo: 'trombose',                      peso: 18 },
      { termo: 'tromboembolismo',               peso: 22 },
      { termo: 'oclusão arterial',              peso: 28 },
      { termo: 'oclusão vascular',              peso: 25 },
      { termo: 'doença arterial periférica',    peso: 22 },
      { termo: 'dap',                           peso: 15 },
      { termo: 'claudicação intermitente',      peso: 20 },
      { termo: 'pulso ausente',                 peso: 20 },
      { termo: 'pulso diminuído',               peso: 15 },
      { termo: 'gangrena',                      peso: 30 },
      { termo: 'necrose digital',               peso: 30 },
      { termo: 'síndrome do dedo azul',         peso: 30 },
      { termo: 'blue toe syndrome',             peso: 30 },
      { termo: 'fenômeno de raynaud',           peso: 18 },
      { termo: 'raynaud',                       peso: 16 },
      { termo: 'aterosclerose periférica',      peso: 18 },
      { termo: 'aneurisma',                     peso: 20 },
      { termo: 'varizes',                       peso: 10 },
      { termo: 'insuficiência venosa',          peso: 12 },
      { termo: 'tromboflebite',                 peso: 18 },
      { termo: 'êmbolo',                        peso: 22 },
      { termo: 'embolia',                       peso: 22 },
      { termo: 'microembolia',                  peso: 25 },
      { termo: 'cholesterol embolism',          peso: 25 },
      { termo: 'émbolo de colesterol',          peso: 25 },
      { termo: 'livedo reticular',              peso: 14 },
      { termo: 'cianose distal',                peso: 18 },
      { termo: 'extremidade fria',              peso: 12 },
      { termo: 'membro frio',                   peso: 12 },
      { termo: 'dor isquêmica',                 peso: 20 },
      { termo: 'dor em repouso',                peso: 14 }
    ],
    cids: ['I73', 'I74', 'I70', 'I71', 'I83', 'I82', 'I26', 'I63.0', 'R02', 'L98.4'],
    exames_obrigatorios: [
      'Doppler Arterial e Venoso dos Membros',
      'Índice Tornozelo-Braço (ITB)',
      'Hemograma Completo',
      'Coagulograma (TP, TTPA)',
      'Perfil Lipídico',
      'Glicose em Jejum',
      'Proteína C Reativa',
      'D-dímero (se suspeita de TVP/TEP)'
    ],
    protocolo: 'Protocolo de Doença Arterial Periférica e Isquemia Crítica de Membro - CFM/SBACV 2020',
    justificativa_padrao: 'Paciente apresenta sinais e sintomas de comprometimento vascular periférico ([QUADRO]), com risco de isquemia crítica, necessitando avaliação urgente em Cirurgia Vascular / Angiologia para diagnóstico e conduta especializada.'
  },

  // ==========================
  // ✅ HEMATOLOGIA (expansão — trombofilia, coagulopatias)
  // ==========================
  {
    id: 'HEMAT-001',
    especialidade: 'Hematologia',
    prioridade: 'Média',
    confiança_base: 91,
    criterios: [
      { termo: 'trombofilia',                   peso: 25 },
      { termo: 'síndrome antifosfolípide',       peso: 24 },
      { termo: 'anticoagulante lúpico',          peso: 22 },
      { termo: 'fator v leiden',                 peso: 22 },
      { termo: 'mutação protrombina',            peso: 20 },
      { termo: 'deficiência de proteína c',      peso: 20 },
      { termo: 'deficiência de proteína s',      peso: 20 },
      { termo: 'deficiência de antitrombina',    peso: 20 },
      { termo: 'trombose recorrente',            peso: 22 },
      { termo: 'anemia falciforme',              peso: 22 },
      { termo: 'talassemia',                     peso: 20 },
      { termo: 'policetemia',                    peso: 18 },
      { termo: 'policitemia vera',               peso: 20 },
      { termo: 'trombocitose',                   peso: 16 },
      { termo: 'plaquetas elevadas',             peso: 14 },
      { termo: 'coagulopatia',                   peso: 20 },
      { termo: 'hemofilia',                      peso: 22 },
      { termo: 'sangramento espontâneo',         peso: 15 },
      { termo: 'pancitopenia',                   peso: 18 },
      { termo: 'linfoma',                        peso: 20 },
      { termo: 'mieloma múltiplo',               peso: 20 }
    ],
    cids: ['D68', 'D69', 'D57', 'D56', 'D45', 'D47', 'C81', 'C82', 'C83', 'C90'],
    exames_obrigatorios: [
      'Hemograma Completo com Plaquetas',
      'Coagulograma Completo (TP, TTPA, Fibrinogênio)',
      'Pesquisa de Trombofilia (se indicado)',
      'Anticorpos Antifosfolípides (anticardiolipina, anticoagulante lúpico)',
      'D-dímero',
      'Esfregaço de Sangue Periférico'
    ],
    protocolo: 'Protocolo de Investigação de Trombofilia e Coagulopatias - ABHH 2021',
    justificativa_padrao: 'Paciente com [QUADRO], com suspeita de distúrbio hematológico subjacente (trombofilia, coagulopatia ou hemoglobinopatia), necessitando investigação e acompanhamento hematológico especializado.'
  },

  // ==========================
  // ✅ DERMATOLOGIA (condições vasculares cutâneas)
  // ==========================
  {
    id: 'DERM-001',
    especialidade: 'Dermatologia',
    prioridade: 'Média',
    confiança_base: 87,
    criterios: [
      { termo: 'lesão cutânea',                 peso: 10 },
      { termo: 'úlcera cutânea',                peso: 16 },
      { termo: 'úlcera de perna',               peso: 18 },
      { termo: 'livedo reticular',              peso: 14 },
      { termo: 'vasculite cutânea',             peso: 20 },
      { termo: 'púrpura',                       peso: 16 },
      { termo: 'erupção cutânea',               peso: 10 },
      { termo: 'eritema nodoso',                peso: 16 },
      { termo: 'esclerodermia',                 peso: 20 },
      { termo: 'psoríase',                      peso: 15 },
      { termo: 'melanoma',                      peso: 20 },
      { termo: 'carcinoma basocelular',         peso: 18 },
      { termo: 'nódulo cutâneo suspeito',       peso: 16 },
      { termo: 'acne grave',                    peso: 12 },
      { termo: 'dermatite grave',               peso: 12 }
    ],
    cids: ['L97', 'L95', 'L40', 'L93', 'M34', 'C43', 'C44', 'L08', 'L20'],
    exames_obrigatorios: [
      'Biópsia de Pele (se indicado)',
      'Cultura de Lesão (se infecciosa)',
      'Hemograma e Proteína C Reativa',
      'FAN / Autoanticorpos (se vasculite/colagenose)'
    ],
    protocolo: 'Protocolo de Encaminhamento para Dermatologia - SBD/CFM 2019',
    justificativa_padrao: 'Paciente apresenta alteração dermatológica significativa ([QUADRO]) que necessita avaliação especializada para diagnóstico diferencial e conduta terapêutica adequada.'
  }
];

function analisarEncaminhamento(texto) {
    if (!texto) {
        return {
            especialidade: 'Clínica Geral',
            confiança: 0,
            prioridade: null,
            justificativa: 'Nenhum texto de transcrição fornecido.',
            exames_obrigatorios: [],
            protocolo: null,
            termos_encontrados: []
        };
    }
    const textoMin = texto.toLowerCase();
    let melhorRegra = null;
    let melhorScore = 0;
    for (const regra of REGRAS_ENCAMINHAMENTO) {
        let score = 0;
        let matchedTerms = [];
        for (const criterio of regra.criterios) {
            if (textoMin.includes(criterio.termo.toLowerCase())) {
                score += criterio.peso;
                matchedTerms.push(criterio.termo);
            }
        }
        // Check CIDs
        for (const cid of regra.cids) {
            const regex = new RegExp('\\b' + cid + '\\b', 'i');
            if (regex.test(textoMin)) {
                score += 15; // weight for CID match
                matchedTerms.push(cid);
            }
        }
        if (score > melhorScore) {
            melhorScore = score;
            melhorRegra = { regra, matchedTerms, score };
        }
    }
    if (!melhorRegra || melhorScore < 5) {
        return {
            especialidade: 'Clínica Geral',
            confiança: 50,
            prioridade: null,
            justificativa: 'Nenhum critério forte de encaminhamento especializado foi identificado na transcrição da consulta. O manejo pode ser continuado na Atenção Primária.',
            exames_obrigatorios: [],
            protocolo: null,
            termos_encontrados: []
        };
    }
    const { regra, matchedTerms } = melhorRegra;
    let confianca = regra.confiança_base;
    if (matchedTerms.length > 1) {
        confianca = Math.min(99, confianca + (matchedTerms.length - 1) * 2);
    }
    let justificativa = regra.justificativa_padrao || '';
    justificativa = justificativa
        .replace('[DIAGNÓSTICO]', matchedTerms.join(', '))
        .replace('[SINTOMAS]', matchedTerms.join(', '))
        .replace('[QUADRO]', matchedTerms.join(', '));
    return {
        especialidade:      regra.especialidade,
        confiança:          confianca,
        prioridade:         regra.prioridade || null,
        justificativa:      justificativa,
        exames_obrigatorios: regra.exames_obrigatorios || [],
        protocolo:          regra.protocolo || null,
        termos_encontrados: matchedTerms
    };
}

// Compatibility export for Jest and ES module imports
export { analisarEncaminhamento, REGRAS_ENCAMINHAMENTO };

// Expose as global so classic scripts (e.g. modules/diagnostic-rag/index.js) can access it
if (typeof window !== 'undefined') {
  window.analisarEncaminhamento = analisarEncaminhamento;
  window.REGRAS_ENCAMINHAMENTO  = REGRAS_ENCAMINHAMENTO;
}
