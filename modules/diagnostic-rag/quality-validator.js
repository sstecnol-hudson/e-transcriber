class QualityValidator {
  constructor() {
    // Campos críticos por especialidade para avaliar completude
    this.criticalFields = {
      cardiologia: ['age', 'pa_systolic', 'pa_diastolic', 'heart_rate', 'chest_pain'],
      endocrinologia: ['age', 'glucose', 'hba1c', 'weight', 'insulin_use'],
      reumatologia: ['age', 'joint_pain_severe', 'joint_fever', 'joint_effusion_or_warmth'],
      default: ['age', 'gender', 'symptoms']
    };

    // Tradução dos nomes dos campos clínicos para pt-br
    this.fieldLabels = {
      age:                       'Idade',
      gender:                    'Sexo/Gênero',
      symptoms:                  'Sintomas',
      pa_systolic:               'Pressão Arterial Sistólica',
      pa_diastolic:              'Pressão Arterial Diastólica',
      heart_rate:                'Frequência Cardíaca',
      chest_pain:                'Dor no Peito',
      glucose:                   'Glicemia',
      hba1c:                     'Hemoglobina Glicada (HbA1c)',
      weight:                    'Peso',
      insulin_use:               'Uso de Insulina',
      joint_pain_severe:         'Dor Articular Intensa',
      joint_fever:               'Febre Articular',
      joint_effusion_or_warmth:  'Derrame ou Calor Articular'
    };
  }

  /**
   * Calcula completude dos dados clínicos
   * @param {Object} clinicalData 
   * @param {string} specialty 
   * @returns {Object} { score, missingFields }
   */
  calculateDataCompleteness(clinicalData, specialty) {
    const specLower = (specialty || '').toLowerCase();
    const fields = this.criticalFields[specLower] || this.criticalFields.default;
    
    let presentCount = 0;
    const missing = [];

    fields.forEach(field => {
      let isPresent = false;
      
      if (clinicalData) {
        if (clinicalData[field] !== undefined && clinicalData[field] !== null && clinicalData[field] !== '') {
          isPresent = true;
        } else if (clinicalData.vitalSigns && clinicalData.vitalSigns[field] !== undefined && clinicalData.vitalSigns[field] !== null && clinicalData.vitalSigns[field] !== '') {
          isPresent = true;
        } else if (clinicalData.demographics && clinicalData.demographics[field] !== undefined && clinicalData.demographics[field] !== null && clinicalData.demographics[field] !== '') {
          isPresent = true;
        }
        
        // Verifica se é um sintoma na lista
        if (!isPresent) {
          const symptoms = clinicalData.symptoms || [];
          const hasSymptom = symptoms.some(s => {
            const name = typeof s === 'string' ? s : (s.name || '');
            return name.toLowerCase().includes(field.replace('_', ' '));
          });
          if (hasSymptom) isPresent = true;
        }
      }

      if (isPresent) {
        presentCount++;
      } else {
        missing.push(field);
      }
    });

    const score = Math.round((presentCount / fields.length) * 100);
    return { score, missing };
  }

  /**
   * Avalia a concordância de protocolos com as hipóteses formuladas
   * @param {Object} cotResult 
   * @param {Object[]} protocols 
   * @returns {number} Score de concordância de 0 a 100
   */
  calculateProtocolConcordance(cotResult, protocols) {
    // Se não há protocolos ou não há hipóteses, score mediano
    if (!protocols || protocols.length === 0) return 50;
    
    // Se o resultado do CoT confirma que usou o protocolo principal, score alto
    if (cotResult && cotResult.conclusion && cotResult.conclusion.protocolSource) {
      const source = cotResult.conclusion.protocolSource.toLowerCase();
      const matched = protocols.some(p => (p.title || '').toLowerCase().includes(source) || source.includes((p.title || '').toLowerCase()));
      if (matched) return 100;
    }

    return 80; // Padrão se houver protocolos mas a IA não linkou explicitamente pelo nome
  }

  /**
   * Calcula o score geral e gera relatório detalhado de qualidade
   * @param {Object} cotResult - Resultado do ChainOfThoughtProcessor
   * @param {Object} request - Objeto original do request contendo transcrição e dados clínicos
   * @param {Object[]} protocols - Protocolos retornados pelo retriever
   * @param {Object[]} detectedRedFlags - Red flags detectadas
   * @returns {Object} Relatório de qualidade diagnóstica
   */
  validateQuality(cotResult, request, protocols, detectedRedFlags) {
    const clinicalData = request.extractedData || {};
    const specialty = request.specialty || '';
    
    // 1. Completude de Dados (30%)
    const completeness = this.calculateDataCompleteness(clinicalData, specialty);
    
    // 2. Concordância de Protocolos (40%)
    const concordanceScore = this.calculateProtocolConcordance(cotResult, protocols);
    
    // 3. Confiança do Extração de Dados (20%)
    const extractorConfidence = request.dataExtractorConfidence || 85;
    
    // 4. Cobertura de Red Flags (10%)
    // Se houver Red Flags críticas detectadas, mas nenhuma ação de emergência listada, reduz score
    let redFlagScore = 100;
    const hasEmergencyFlag = detectedRedFlags && detectedRedFlags.some(rf => rf.urgency === 'Emergência');
    if (hasEmergencyFlag) {
      redFlagScore = 80; // Redução leve para forçar cuidado clínico
    }

    // Algoritmo de ponderação
    const overallScore = Math.round(
      (completeness.score * 0.3) +
      (concordanceScore * 0.4) +
      (extractorConfidence * 0.2) +
      (redFlagScore * 0.1)
    );

    // Mapeamento de Gaps e Recomendações de Ação
    const gaps = [];
    const recommendations = [];

    completeness.missing.forEach(field => {
      const label = this.fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      gaps.push({
        field: label,
        impact: 'Impede a validação completa de alguns critérios do protocolo.',
        recommendation: `Perguntar ativamente sobre ${label.toLowerCase()} na próxima oportunidade.`
      });
      recommendations.push({
        type: 'investigate',
        text: `Investigar/confirmar o dado: ${label}`,
        priority: 3
      });
    });

    if (hasEmergencyFlag) {
      recommendations.push({
        type: 'refer',
        text: 'Atenção: Red flag crítica detectada. Encaminhar para Pronto-Socorro/Samu.',
        priority: 5
      });
    }

    let overallRecommendation = 'Requer revisão pelo médico responsável.';
    if (overallScore >= 70 && !hasEmergencyFlag) {
      overallRecommendation = 'Pronto para uso clínico com acompanhamento routine.';
    } else if (hasEmergencyFlag) {
      overallRecommendation = 'REQUER CONDUTA DE URGÊNCIA IMEDIATA (Red Flags ativas).';
    }

    return {
      overall: overallScore,
      components: {
        dataCompleteness: {
          score: completeness.score,
          critical_fields_present: this.criticalFields[specialty.toLowerCase()] 
            ? this.criticalFields[specialty.toLowerCase()].length - completeness.missing.length 
            : this.criticalFields.default.length - completeness.missing.length,
          critical_fields_total: this.criticalFields[specialty.toLowerCase()] 
            ? this.criticalFields[specialty.toLowerCase()].length 
            : this.criticalFields.default.length,
          missing: completeness.missing,
          weight: 0.3
        },
        protocolConcordance: {
          score: concordanceScore,
          protocols_consulted: protocols ? protocols.length : 0,
          agreement_level: concordanceScore >= 80 ? 'Alto' : (concordanceScore >= 50 ? 'Moderado' : 'Baixo'),
          conflicts: [],
          weight: 0.4
        },
        dataExtractorConfidence: {
          score: extractorConfidence,
          threshold: 60,
          warning: extractorConfidence < 60,
          weight: 0.2
        },
        redFlagCoverage: {
          score: redFlagScore,
          flags_detected: detectedRedFlags ? detectedRedFlags.length : 0,
          weight: 0.1
        }
      },
      gaps,
      conflicts: [],
      recommendations,
      overallRecommendation
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QualityValidator;
} else if (typeof window !== 'undefined') {
  window.QualityValidator = QualityValidator;
}
