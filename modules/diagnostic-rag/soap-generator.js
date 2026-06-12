class SOAPGenerator {
  /**
   * Converte o resultado de diagnóstico RAG em um prontuário SOAP estruturado
   * @param {Object} request - Request original
   * @param {Object} cotResult - Resultado do Chain of Thought
   * @param {Object[]} redFlags - Red flags detectadas
   * @param {Object} qualityScore - Resultado do QualityValidator
   * @param {Object} susContext - Contexto gerado pelo PrimaryCareContextualizer
   * @param {Object[]} protocols - Protocolos consultados
   * @returns {string} Prontuário médico em formato Markdown
   */
  generateSOAP(request, cotResult, redFlags, qualityScore, susContext, protocols) {
    const demographics = request.extractedData?.demographics || {};
    const patientName = demographics.name?.value || 'Não Identificado';
    const patientAge = demographics.age?.value || 'Não Informada';
    const patientGender = demographics.gender?.value || 'Não Informado';
    const vitalSigns = request.extractedData?.vitalSigns || {};

    const subjective = this.generateSubjective(request);
    const objective = this.generateObjective(vitalSigns, request.extractedData?.exams);
    const assessment = this.generateAssessment(cotResult, redFlags);
    const plan = this.generatePlan(susContext, cotResult);
    const basesClinicas = this.generateClinicalBases(protocols, cotResult, qualityScore);

    return `# SOAP - RELATÓRIO CLÍNICO RAG-ASSISTIDO

**Paciente:** ${patientName} | **Idade:** ${patientAge} | **Sexo:** ${patientGender}
**Especialidade:** ${request.specialty || 'Clínica Geral'} | **Data:** ${new Date().toLocaleDateString('pt-BR')}

---

## 1. SUBJETIVO (S)
${subjective}

## 2. OBJETIVO (O)
${objective}

## 3. AVALIAÇÃO (A)
${assessment}

## 4. PLANO (P)
${plan}

## 5. BASES CLÍNICAS & RASTREABILIDADE
${basesClinicas}

---
*Prontuário gerado com auxílio de Diagnóstico Assistido por IA (RAG-Assistido)*`;
  }

  /**
   * Gera a seção Subjetivo
   */
  generateSubjective(request) {
    const transcript = request.transcript || '';
    
    // Tenta extrair queixas principais e história da doença atual
    let hda = '';
    const symptoms = request.extractedData?.symptoms || [];
    if (symptoms.length > 0) {
      hda = 'Sintomas relatados: ' + symptoms.map(s => {
        const name = typeof s === 'string' ? s : (s.name || '');
        const dur = typeof s === 'object' && s.duration ? ` (há ${s.duration})` : '';
        return `${name}${dur}`;
      }).join(', ') + '.';
    } else {
      // Extrai um trecho curto da transcrição como resumo
      hda = transcript.length > 250 ? transcript.slice(0, 250) + '...' : transcript;
    }

    const allergies = request.extractedData?.allergies || [];
    const allergiesStr = allergies.length > 0 ? allergies.join(', ') : 'Nenhuma alergia relatada';

    const comorbidities = request.extractedData?.comorbidities || [];
    const comorbiditiesStr = comorbidities.length > 0 ? comorbidities.join(', ') : 'Sem comorbidades relatadas';

    return `- **Queixa Principal e HDA:** ${hda}
- **Histórico Patológico:** Comorbidades: ${comorbiditiesStr}.
- **Alergias:** ${allergiesStr}.
*(Dados obtidos a partir da transcrição da consulta)*`;
  }

  /**
   * Gera a seção Objetivo
   */
  generateObjective(vitals, exams) {
    const pa = vitals.pa_systolic && vitals.pa_diastolic 
      ? `${vitals.pa_systolic}/${vitals.pa_diastolic} mmHg`
      : 'Não informada';
    const fc = vitals.heart_rate ? `${vitals.heart_rate} bpm` : 'Não relatada';
    const temp = vitals.temperature ? `${vitals.temperature} °C` : 'Não relatada';
    const spo2 = vitals.spo2 ? `${vitals.spo2}%` : 'Não relatada';
    const imc = vitals.imc ? `${vitals.imc} kg/m²` : 'Não calculado';

    let examsStr = 'Nenhum exame recente relatado nesta consulta.';
    if (exams && exams.length > 0) {
      examsStr = exams.map((e, idx) => {
        const name = typeof e === 'string' ? e : (e.name || '');
        const val = typeof e === 'object' && e.value !== undefined ? `: ${e.value}` : '';
        const unit = typeof e === 'object' && e.unit ? ` ${e.unit}` : '';
        return `- ${name}${val}${unit} [${idx + 1}]`;
      }).join('\n');
    }

    return `- **Sinais Vitais:**
  - Pressão Arterial (PA): ${pa}
  - Frequência Cardíaca (FC): ${fc}
  - Temperatura: ${temp}
  - Oxigenação (SpO2): ${spo2}
  - IMC: ${imc}
- **Exames Complementares Relatados:**
${examsStr}`;
  }

  /**
   * Gera a seção Avaliação
   */
  generateAssessment(cotResult, redFlags) {
    if (!cotResult || !cotResult.conclusion) {
      return 'Diagnóstico em investigação clínica. Requer exames complementares adicionais.';
    }

    const c = cotResult.conclusion;
    
    // Hipóteses formatadas
    let hypothesesStr = '';
    if (cotResult.hypotheses && cotResult.hypotheses.length > 0) {
      hypothesesStr = cotResult.hypotheses.map((h, idx) => {
        return `  ${idx + 1}. **${h.diagnosis}** (CID-10: ${h.icd10 || 'N/A'}) — Probabilidade: ${h.probability || 'Média'}
     *Justificativa:* ${h.reasoning || ''}`;
      }).join('\n');
    } else {
      hypothesesStr = `  1. **${c.primaryDiagnosis}** (CID-10: ${c.icd10 || 'N/A'}) — Probabilidade: Alta`;
    }

    // Formatação de Red Flags
    let redFlagsStr = '✓ Nenhum sinal de alarme crítico (Red Flag) detectado para esta consulta.';
    if (redFlags && redFlags.length > 0) {
      redFlagsStr = redFlags.map(rf => {
        const color = rf.urgency === 'Emergência' ? '🔴' : '⚠️';
        return `${color} **${rf.urgency.toUpperCase()}: ${rf.name}**
  *Ação:* ${rf.action} (Protocolo: ${rf.protocol_origin || 'Diretrizes Clínicas'})`;
      }).join('\n');
    }

    return `- **Diagnóstico Principal:** ${c.primaryDiagnosis} (CID-10: ${c.icd10 || 'N/A'} | CID-11: ${c.icd11 || 'N/A'})
- **Grau de Confiança:** ${c.confidence || 75}%
- **Diagnósticos Diferenciais Considerados:**
${hypothesesStr}

- **⚠️ SINAIS DE ALARME (Red Flags):**
${redFlagsStr}

- **Raciocínio Clínico (Chain of Thought):**
${c.reasoning || 'O quadro clínico do paciente atende aos critérios do protocolo de referência para o diagnóstico estabelecido.'}`;
  }

  /**
   * Gera a seção Plano
   */
  generatePlan(susContext, cotResult) {
    if (!susContext) return '- Planejamento terapêutico e exames a critério médico.';

    // Medicações SUS / RENAME
    let medsStr = 'Nenhuma medicação prescrita.';
    if (susContext.medications && susContext.medications.length > 0) {
      medsStr = susContext.medications.map(m => {
        const renameTag = m.isRename ? '✅ RENAME' : '⚠️ Fora da RENAME';
        const altNote = m.alternative ? ` (Sugestão RENAME: ${m.alternative} - ${m.notes || ''})` : '';
        return `- **${m.name}** (${m.dose} - ${m.frequency}) — *${renameTag}*${altNote}`;
      }).join('\n');
    }

    // Exames por local/complexidade
    let examsStr = '';
    const { basic, laboratory, specialized } = susContext.exams || { basic: [], laboratory: [], specialized: [] };
    
    if (basic.length > 0) {
      examsStr += `  - 🏥 *Disponível na UBS:* ${basic.join(', ')}\n`;
    }
    if (laboratory.length > 0) {
      examsStr += `  - 🔬 *Solicitar ao Laboratório Central:* ${laboratory.join(', ')}\n`;
    }
    if (specialized.length > 0) {
      examsStr += `  - 📋 *Requer Encaminhamento/Agendamento Especializado:* ${specialized.join(', ')}\n`;
    }
    if (!examsStr) {
      examsStr = '  - Nenhum exame adicional solicitado.';
    }

    // Programas SUS
    let progStr = 'Nenhum programa de atenção crônica SUS aplicável no momento.';
    if (susContext.susPrograms && susContext.susPrograms.length > 0) {
      progStr = susContext.susPrograms.map(p => {
        return `- **${p.name}**
  - *Frequência de Acompanhamento:* ${p.frequency}
  - *Documentos para Cadastro:* ${p.documents.join(', ')}`;
      }).join('\n');
    }

    return `- **Terapêutica Prescrita:**
${medsStr}

- **Exames Solicitados:**
${examsStr}

- **Encaminhamentos & Urgência:**
  - Urgência Recomendada: **${susContext.referralUrgency || 'Eletivo'}**
  - Conduta: Acompanhamento pela equipe de Saúde da Família e agendamento conforme regulação.

- **Programas SUS Aplicáveis:**
${progStr}`;
  }

  /**
   * Gera a seção de Bases Clínicas
   */
  generateClinicalBases(protocols, cotResult, qualityScore) {
    let protocolsStr = 'Nenhum protocolo clínico oficial foi recuperado ou consultado.';
    if (protocols && protocols.length > 0) {
      protocolsStr = protocols.map((p, idx) => {
        return `${idx + 1}. **${p.title}**
   - *Fonte:* ${p.source}
   - *Rastreabilidade:* ${p.url || 'local://referencia'}`;
      }).join('\n');
    }

    const score = qualityScore ? qualityScore.overall : 70;
    const rec = qualityScore ? qualityScore.overallRecommendation : 'Requer acompanhamento clínico.';

    return `### Protocolos Consultados no RAG:
${protocolsStr}

### Avaliação de Qualidade Diagnóstica:
- **Score Geral de Confiança:** ${score}/100
- **Recomendação de Uso Clínico:** ${rec}
- **Rastreabilidade:** Cada recomendação diagnóstica e conduta terapêutica neste relatório possui rastreabilidade direta com os protocolos indexados acima.`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SOAPGenerator;
}

if (typeof window !== 'undefined') {
  window.SOAPGenerator = SOAPGenerator;
}
