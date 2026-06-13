// referral-suggester.js
// Sugere especialidade médica provável com base no diagnóstico principal.

class ReferralSuggester {
  constructor() {
    // Mapeamento diagnóstico → especialidade (expansível)
    this.map = {
      // Endocrinologia
      'síndrome de cushing':                    'Endocrinologia',
      'diabetes mellitus':                      'Endocrinologia',
      'diabetes mellitus tipo 2':               'Endocrinologia',
      'diabetes mellitus tipo 1':               'Endocrinologia',
      'hipotireoidismo':                        'Endocrinologia',
      'hipertireoidismo':                       'Endocrinologia',
      'obesidade':                              'Endocrinologia',
      // Reumatologia
      'síndrome de sjögren':                    'Reumatologia',
      'lúpus eritematoso sistêmico':            'Reumatologia',
      'artrite reumatoide':                     'Reumatologia',
      'artrite reumatóide':                     'Reumatologia',
      'fibromialgia':                           'Reumatologia',
      // Hematologia
      'anemia ferropriva':                      'Hematologia',
      'aplasia de medula':                      'Hematologia',
      'aplasia':                                'Hematologia',
      'anemia':                                 'Hematologia',
      'leucemia':                               'Hematologia / Oncologia',
      // Cardiologia
      'hipertensão arterial':                   'Cardiologia',
      'hipertensão':                            'Cardiologia',
      'insuficiência cardíaca':                 'Cardiologia',
      'fibrilação atrial':                      'Cardiologia',
      'doença coronariana':                     'Cardiologia',
      // Pneumologia
      'asma':                                   'Pneumologia',
      'dpoc':                                   'Pneumologia',
      'doença pulmonar obstrutiva crônica':     'Pneumologia',
      'pneumonia':                              'Pneumologia',
      // Gastroenterologia
      'doença de crohn':                        'Gastroenterologia',
      'retocolite ulcerativa':                  'Gastroenterologia',
      'cirrose hepática':                       'Gastroenterologia / Hepatologia',
      'hepatite':                               'Gastroenterologia / Hepatologia',
      // Neurologia
      'epilepsia':                              'Neurologia',
      'enxaqueca':                              'Neurologia',
      'acidente vascular cerebral':             'Neurologia',
      'avc':                                    'Neurologia',
      'esclerose múltipla':                     'Neurologia',
      'parkinson':                              'Neurologia',
      // Nefrologia
      'insuficiência renal crônica':            'Nefrologia',
      'doença renal crônica':                   'Nefrologia',
      // Dermatologia
      'psoríase':                               'Dermatologia',
      'dermatite atópica':                      'Dermatologia',
      // Infectologia
      'hiv':                                    'Infectologia',
      'tuberculose':                            'Pneumologia / Infectologia',
      // Psiquiatria
      'depressão':                              'Psiquiatria',
      'transtorno depressivo maior':            'Psiquiatria',
      'transtorno de ansiedade':                'Psiquiatria',
      'esquizofrenia':                          'Psiquiatria',
    };

    // Mapa de justificativas por especialidade
    this.rationaleMap = {
      'Endocrinologia':                   'envolve alterações hormonais e metabólicas que requerem acompanhamento especializado',
      'Reumatologia':                     'tem base autoimune ou inflamatória sistêmica que demanda avaliação reumatológica',
      'Hematologia':                      'afeta o sistema hematopoiético, requerendo investigação e acompanhamento hematológico',
      'Hematologia / Oncologia':          'pode ter origem maligna hematológica e requer avaliação especializada urgente',
      'Cardiologia':                      'apresenta risco cardiovascular que necessita de monitoramento cardiológico especializado',
      'Pneumologia':                      'envolve comprometimento do trato respiratório com necessidade de avaliação pneumológica',
      'Gastroenterologia':                'apresenta comprometimento gastrointestinal que requer seguimento especializado',
      'Gastroenterologia / Hepatologia':  'compromete o fígado e trato gastrointestinal, requerendo avaliação hepatogástrica',
      'Neurologia':                       'envolve o sistema nervoso central ou periférico com necessidade de seguimento neurológico',
      'Nefrologia':                       'compromete a função renal, requerendo acompanhamento nefrológico para manejo adequado',
      'Dermatologia':                     'apresenta manifestação cutânea crônica que se beneficia de acompanhamento dermatológico',
      'Infectologia':                     'é uma condição infecciosa complexa que requer manejo infectológico especializado',
      'Pneumologia / Infectologia':       'pode ter origem infecciosa respiratória grave, requerendo avaliação pneumo-infectológica',
      'Psiquiatria':                      'afeta a saúde mental com intensidade que indica necessidade de suporte psiquiátrico especializado',
      'Clínica Geral':                    'não indica encaminhamento especializado imediato; acompanhamento pela equipe de Saúde da Família é suficiente',
    };
  }

  /**
   * Sugere especialidade e justificativa com base no diagnóstico principal.
   * @param {Object} cotResult - Resultado do Chain of Thought
   * @param {Object} cidResult - Resultado do CID Mapper
   * @returns {{ specialty: string, rationale: string }}
   */
  suggest(cotResult, cidResult) {
    const cotDiag  = cotResult?.conclusion?.primaryDiagnosis || cotResult?.conclusion?.diagnosis || '';
    const cidDiag  = cidResult?.primary?.diagnosis || '';
    const diagName = (cotDiag || cidDiag).trim();
    const diagKey  = diagName.toLowerCase();

    // Busca correspondência exata
    let specialty = this.map[diagKey];

    // Busca correspondência parcial se não encontrou exata
    if (!specialty) {
      for (const [key, spec] of Object.entries(this.map)) {
        if (diagKey.includes(key) || key.includes(diagKey)) {
          specialty = spec;
          break;
        }
      }
    }

    specialty = specialty || 'Clínica Geral';

    const rationaleDetail = this.rationaleMap[specialty] || 'o quadro clínico apresentado requer avaliação especializada';
    const rationale = `O diagnóstico principal identificado foi **"${diagName || 'não determinado'}"**, que ${rationaleDetail}. A sugestão de encaminhamento para **${specialty}** foi gerada automaticamente pelo módulo RAG com base nos critérios clínicos extraídos da consulta.`;

    return { specialty, rationale };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReferralSuggester;
} else {
  window.ReferralSuggester = ReferralSuggester;
}
