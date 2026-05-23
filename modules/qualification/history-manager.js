/**
 * Gerenciador de Histórico de Qualificações
 * Gerencia persistência e recuperação de qualificações anteriores
 */

class HistoryManager {
  constructor(storagePrefix = 'qualification_') {
    this.storagePrefix = storagePrefix;
    this.qualifications = [];
    this.load();
  }

  /**
   * Carrega qualificações do localStorage
   */
  load() {
    try {
      const stored = localStorage.getItem(`${this.storagePrefix}qualifications`);
      this.qualifications = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      this.qualifications = [];
    }
  }

  /**
   * Salva qualificação no histórico
   * @param {Object} qualification - Qualificação a salvar
   * @returns {boolean} True se salvo com sucesso
   */
  save(qualification) {
    if (!qualification || !qualification.id) {
      console.error('Qualificação inválida');
      return false;
    }

    try {
      // Verificar se já existe
      const index = this.qualifications.findIndex(q => q.id === qualification.id);
      
      if (index >= 0) {
        // Atualizar existente
        this.qualifications[index] = qualification;
      } else {
        // Adicionar novo
        this.qualifications.unshift(qualification);
      }

      this.persist();
      return true;
    } catch (error) {
      console.error('Erro ao salvar qualificação:', error);
      return false;
    }
  }

  /**
   * Persiste qualificações em localStorage
   */
  persist() {
    try {
      localStorage.setItem(
        `${this.storagePrefix}qualifications`,
        JSON.stringify(this.qualifications)
      );
    } catch (error) {
      console.error('Erro ao persistir qualificações:', error);
    }
  }

  /**
   * Obtém histórico de qualificações de um paciente
   * @param {string} patientId - ID do paciente
   * @returns {Array<Object>} Qualificações do paciente
   */
  getPatientHistory(patientId) {
    return this.qualifications
      .filter(q => q.patientId === patientId)
      .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
  }

  /**
   * Obtém qualificação específica
   * @param {string} qualificationId - ID da qualificação
   * @returns {Object|null} Qualificação ou null
   */
  getQualification(qualificationId) {
    return this.qualifications.find(q => q.id === qualificationId) || null;
  }

  /**
   * Obtém qualificações por especialidade
   * @param {string} specialty - Especialidade
   * @returns {Array<Object>} Qualificações da especialidade
   */
  getBySpecialty(specialty) {
    return this.qualifications
      .filter(q => q.specialty === specialty)
      .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
  }

  /**
   * Obtém qualificações por status
   * @param {string} status - Status (QUALIFICADO, NAO_QUALIFICADO, URGENCIA, etc)
   * @returns {Array<Object>} Qualificações com o status
   */
  getByStatus(status) {
    return this.qualifications
      .filter(q => q.result.status === status)
      .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
  }

  /**
   * Obtém qualificações de um paciente em uma especialidade
   * @param {string} patientId - ID do paciente
   * @param {string} specialty - Especialidade
   * @returns {Array<Object>} Qualificações
   */
  getPatientSpecialtyHistory(patientId, specialty) {
    return this.qualifications
      .filter(q => q.patientId === patientId && q.specialty === specialty)
      .sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
  }

  /**
   * Obtém qualificação mais recente de um paciente
   * @param {string} patientId - ID do paciente
   * @returns {Object|null} Qualificação mais recente ou null
   */
  getLatestQualification(patientId) {
    const history = this.getPatientHistory(patientId);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Obtém qualificação mais recente de um paciente em uma especialidade
   * @param {string} patientId - ID do paciente
   * @param {string} specialty - Especialidade
   * @returns {Object|null} Qualificação mais recente ou null
   */
  getLatestSpecialtyQualification(patientId, specialty) {
    const history = this.getPatientSpecialtyHistory(patientId, specialty);
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Remove qualificação do histórico
   * @param {string} qualificationId - ID da qualificação
   * @returns {boolean} True se removido
   */
  remove(qualificationId) {
    const index = this.qualifications.findIndex(q => q.id === qualificationId);
    
    if (index >= 0) {
      this.qualifications.splice(index, 1);
      this.persist();
      return true;
    }
    
    return false;
  }

  /**
   * Limpa histórico de um paciente
   * @param {string} patientId - ID do paciente
   * @returns {number} Número de qualificações removidas
   */
  clearPatientHistory(patientId) {
    const initialLength = this.qualifications.length;
    this.qualifications = this.qualifications.filter(q => q.patientId !== patientId);
    const removed = initialLength - this.qualifications.length;
    
    if (removed > 0) {
      this.persist();
    }
    
    return removed;
  }

  /**
   * Limpa todo o histórico
   * @returns {number} Número de qualificações removidas
   */
  clearAll() {
    const count = this.qualifications.length;
    this.qualifications = [];
    this.persist();
    return count;
  }

  /**
   * Obtém estatísticas do histórico
   * @returns {Object} Estatísticas
   */
  getStatistics() {
    const stats = {
      totalQualifications: this.qualifications.length,
      byStatus: {},
      bySpecialty: {},
      byPatient: {},
      dateRange: null
    };

    // Contar por status
    this.qualifications.forEach(q => {
      const status = q.result.status;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    // Contar por especialidade
    this.qualifications.forEach(q => {
      const specialty = q.specialty;
      stats.bySpecialty[specialty] = (stats.bySpecialty[specialty] || 0) + 1;
    });

    // Contar por paciente
    this.qualifications.forEach(q => {
      const patientId = q.patientId;
      stats.byPatient[patientId] = (stats.byPatient[patientId] || 0) + 1;
    });

    // Intervalo de datas
    if (this.qualifications.length > 0) {
      const dates = this.qualifications.map(q => q.metadata.createdAt).sort();
      stats.dateRange = {
        earliest: new Date(dates[0]),
        latest: new Date(dates[dates.length - 1])
      };
    }

    return stats;
  }

  /**
   * Exporta histórico como JSON
   * @returns {string} JSON do histórico
   */
  exportJSON() {
    return JSON.stringify(this.qualifications, null, 2);
  }

  /**
   * Importa histórico de JSON
   * @param {string} jsonData - Dados JSON
   * @returns {boolean} True se importado com sucesso
   */
  importJSON(jsonData) {
    try {
      const imported = JSON.parse(jsonData);
      
      if (!Array.isArray(imported)) {
        throw new Error('Dados importados não são um array');
      }

      // Validar estrutura básica
      imported.forEach(q => {
        if (!q.id || !q.patientId || !q.specialty) {
          throw new Error('Qualificação inválida na importação');
        }
      });

      this.qualifications = imported;
      this.persist();
      return true;
    } catch (error) {
      console.error('Erro ao importar histórico:', error);
      return false;
    }
  }

  /**
   * Valida integridade do histórico
   * @returns {Object} Resultado da validação
   */
  validate() {
    const errors = [];
    const warnings = [];

    this.qualifications.forEach((q, index) => {
      if (!q.id) errors.push(`Qualificação ${index} sem ID`);
      if (!q.patientId) errors.push(`Qualificação ${index} sem patientId`);
      if (!q.specialty) errors.push(`Qualificação ${index} sem specialty`);
      if (!q.result) errors.push(`Qualificação ${index} sem result`);
      if (!q.metadata) errors.push(`Qualificação ${index} sem metadata`);
      if (!q.auditTrail) warnings.push(`Qualificação ${index} sem auditTrail`);
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Limpa dados corrompidos
   */
  cleanCorruptedData() {
    const validation = this.validate();
    
    if (!validation.valid) {
      console.warn('Dados corrompidos detectados:', validation.errors);
      
      // Manter apenas dados válidos
      this.qualifications = this.qualifications.filter(q => 
        q.id && q.patientId && q.specialty && q.result && q.metadata
      );
      
      this.persist();
    }
  }

  /**
   * Obtém tamanho do histórico em bytes
   * @returns {number} Tamanho em bytes
   */
  getStorageSize() {
    const key = `${this.storagePrefix}qualifications`;
    const stored = localStorage.getItem(key);
    return stored ? stored.length : 0;
  }

  /**
   * Compara duas qualificações
   * @param {string} qualificationId1 - ID da primeira qualificação
   * @param {string} qualificationId2 - ID da segunda qualificação
   * @returns {Object} Comparação
   */
  compare(qualificationId1, qualificationId2) {
    const q1 = this.getQualification(qualificationId1);
    const q2 = this.getQualification(qualificationId2);

    if (!q1 || !q2) {
      return null;
    }

    return {
      q1: q1,
      q2: q2,
      statusChanged: q1.result.status !== q2.result.status,
      datesDiff: Math.abs(q1.metadata.createdAt - q2.metadata.createdAt),
      responsesChanged: JSON.stringify(q1.responses) !== JSON.stringify(q2.responses)
    };
  }

  /**
   * Obtém tendência de qualificações de um paciente
   * @param {string} patientId - ID do paciente
   * @param {number} limit - Número máximo de qualificações a considerar
   * @returns {Array<Object>} Tendência
   */
  getTrend(patientId, limit = 10) {
    const history = this.getPatientHistory(patientId).slice(0, limit);
    
    return history.map(q => ({
      id: q.id,
      date: new Date(q.metadata.createdAt),
      specialty: q.specialty,
      status: q.result.status,
      statusLabel: q.result.statusLabel
    }));
  }
}

// ============================================================================
// EXPORTAR CLASSE
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HistoryManager;
}
