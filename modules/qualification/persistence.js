/**
 * Camada de Persistência
 * Qualificador de Encaminhamentos Médicos
 * 
 * Gerencia armazenamento e recuperação de dados em localStorage.
 * Implementa validação, compressão e recuperação de falhas.
 */

// ============================================================================
// CLASSE: PersistenceManager
// ============================================================================

/**
 * Gerencia persistência de dados em localStorage
 */
class PersistenceManager {
  constructor(prefix = 'qualification_') {
    this.prefix = prefix;
    this.maxStorageSize = 5 * 1024 * 1024; // 5MB
    this.compressionEnabled = false;
    this.encryptionEnabled = false;
  }

  /**
   * Salva dados no localStorage
   * @param {string} key - Chave de armazenamento
   * @param {*} value - Valor a armazenar
   * @returns {Object} Resultado da operação
   */
  save(key, value) {
    try {
      const fullKey = `${this.prefix}${key}`;
      const serialized = JSON.stringify(value);
      
      // Verificar tamanho
      if (serialized.length > this.maxStorageSize) {
        return {
          success: false,
          error: 'Dados muito grandes para armazenar',
          size: serialized.length,
          maxSize: this.maxStorageSize
        };
      }

      // Verificar espaço disponível
      if (!this.hasEnoughSpace(serialized.length)) {
        return {
          success: false,
          error: 'Espaço insuficiente em localStorage',
          size: serialized.length,
          availableSpace: this.getAvailableSpace()
        };
      }

      localStorage.setItem(fullKey, serialized);
      
      return {
        success: true,
        key: fullKey,
        size: serialized.length,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errorType: error.name
      };
    }
  }

  /**
   * Carrega dados do localStorage
   * @param {string} key - Chave de armazenamento
   * @param {*} defaultValue - Valor padrão se não encontrado
   * @returns {*} Valor armazenado ou padrão
   */
  load(key, defaultValue = null) {
    try {
      const fullKey = `${this.prefix}${key}`;
      const stored = localStorage.getItem(fullKey);
      
      if (stored === null) {
        return defaultValue;
      }

      return JSON.parse(stored);
    } catch (error) {
      console.error(`Erro ao carregar dados da chave '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * Carrega dados com validação
   * @param {string} key - Chave de armazenamento
   * @param {Function} validator - Função de validação
   * @param {*} defaultValue - Valor padrão se inválido
   * @returns {*} Valor validado ou padrão
   */
  loadWithValidation(key, validator, defaultValue = null) {
    const value = this.load(key, null);
    
    if (value === null) {
      return defaultValue;
    }

    try {
      if (validator(value)) {
        return value;
      } else {
        console.warn(`Dados inválidos para chave '${key}'`);
        return defaultValue;
      }
    } catch (error) {
      console.error(`Erro ao validar dados da chave '${key}':`, error);
      return defaultValue;
    }
  }

  /**
   * Remove dados do localStorage
   * @param {string} key - Chave de armazenamento
   * @returns {boolean} True se removido com sucesso
   */
  remove(key) {
    try {
      const fullKey = `${this.prefix}${key}`;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Erro ao remover dados:', error);
      return false;
    }
  }

  /**
   * Verifica se uma chave existe
   * @param {string} key - Chave de armazenamento
   * @returns {boolean} True se existe
   */
  exists(key) {
    const fullKey = `${this.prefix}${key}`;
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * Obtém todas as chaves do módulo
   * @returns {Array<string>} Lista de chaves
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * Limpa todos os dados do módulo
   * @returns {Object} Resultado da operação
   */
  clear() {
    try {
      const keys = this.getAllKeys();
      keys.forEach(key => this.remove(key));
      
      return {
        success: true,
        keysCleared: keys.length,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém tamanho total dos dados armazenados
   * @returns {number} Tamanho em bytes
   */
  getStorageSize() {
    let size = 0;
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      const fullKey = `${this.prefix}${key}`;
      const value = localStorage.getItem(fullKey);
      if (value) {
        size += value.length;
      }
    });

    return size;
  }

  /**
   * Verifica se há espaço suficiente
   * @param {number} requiredSize - Tamanho necessário em bytes
   * @returns {boolean} True se há espaço
   */
  hasEnoughSpace(requiredSize) {
    const currentSize = this.getStorageSize();
    return (currentSize + requiredSize) <= this.maxStorageSize;
  }

  /**
   * Obtém espaço disponível
   * @returns {number} Espaço disponível em bytes
   */
  getAvailableSpace() {
    return this.maxStorageSize - this.getStorageSize();
  }

  /**
   * Obtém informações de armazenamento
   * @returns {Object} Informações de armazenamento
   */
  getStorageInfo() {
    const currentSize = this.getStorageSize();
    const availableSpace = this.getAvailableSpace();
    const usagePercent = (currentSize / this.maxStorageSize) * 100;

    return {
      currentSize,
      maxSize: this.maxStorageSize,
      availableSpace,
      usagePercent: usagePercent.toFixed(2),
      keysCount: this.getAllKeys().length,
      timestamp: Date.now()
    };
  }

  /**
   * Exporta todos os dados do módulo
   * @returns {Object} Dados exportados
   */
  exportAll() {
    const data = {};
    const keys = this.getAllKeys();
    
    keys.forEach(key => {
      data[key] = this.load(key);
    });

    return {
      prefix: this.prefix,
      exportedAt: Date.now(),
      keysCount: keys.length,
      data
    };
  }

  /**
   * Importa dados para o módulo
   * @param {Object} exportedData - Dados exportados
   * @returns {Object} Resultado da operação
   */
  importAll(exportedData) {
    try {
      if (!exportedData.data || typeof exportedData.data !== 'object') {
        return {
          success: false,
          error: 'Formato de dados inválido'
        };
      }

      let imported = 0;
      const errors = [];

      for (const [key, value] of Object.entries(exportedData.data)) {
        const result = this.save(key, value);
        if (result.success) {
          imported++;
        } else {
          errors.push({ key, error: result.error });
        }
      }

      return {
        success: errors.length === 0,
        imported,
        errors,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Valida integridade dos dados armazenados
   * @returns {Object} Resultado da validação
   */
  validateIntegrity() {
    const errors = [];
    const keys = this.getAllKeys();

    keys.forEach(key => {
      try {
        const value = this.load(key);
        if (value === null) {
          errors.push(`Chave '${key}' retornou null`);
        }
      } catch (error) {
        errors.push(`Erro ao validar chave '${key}': ${error.message}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      keysChecked: keys.length,
      timestamp: Date.now()
    };
  }

  /**
   * Recupera dados corrompidos
   * @returns {Object} Resultado da recuperação
   */
  recoverCorruptedData() {
    const recovered = [];
    const errors = [];
    const keys = this.getAllKeys();

    keys.forEach(key => {
      try {
        const fullKey = `${this.prefix}${key}`;
        const raw = localStorage.getItem(fullKey);
        
        if (raw) {
          JSON.parse(raw); // Tentar parsear
          recovered.push(key);
        }
      } catch (error) {
        errors.push({ key, error: error.message });
        this.remove(key); // Remover dados corrompidos
      }
    });

    return {
      recovered: recovered.length,
      errors: errors.length,
      details: errors,
      timestamp: Date.now()
    };
  }

  /**
   * Limpa dados antigos (mais de X dias)
   * @param {number} daysOld - Número de dias
   * @returns {Object} Resultado da limpeza
   */
  clearOldData(daysOld = 30) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let cleared = 0;
    const keys = this.getAllKeys();

    keys.forEach(key => {
      try {
        const value = this.load(key);
        
        // Se o valor tem timestamp e é mais antigo que o cutoff
        if (value && value.timestamp && value.timestamp < cutoffTime) {
          this.remove(key);
          cleared++;
        }
      } catch (error) {
        // Ignorar erros ao processar valores
      }
    });

    return {
      cleared,
      cutoffTime,
      daysOld,
      timestamp: Date.now()
    };
  }

  /**
   * Cria backup dos dados
   * @returns {string} String JSON do backup
   */
  createBackup() {
    const backup = this.exportAll();
    return JSON.stringify(backup);
  }

  /**
   * Restaura dados de um backup
   * @param {string} backupString - String JSON do backup
   * @returns {Object} Resultado da restauração
   */
  restoreFromBackup(backupString) {
    try {
      const backup = JSON.parse(backupString);
      return this.importAll(backup);
    } catch (error) {
      return {
        success: false,
        error: `Erro ao restaurar backup: ${error.message}`
      };
    }
  }
}

// ============================================================================
// CLASSE: SessionStorage
// ============================================================================

/**
 * Gerencia armazenamento de sessão (dados temporários)
 */
class SessionStorage {
  constructor(prefix = 'qualification_session_') {
    this.prefix = prefix;
  }

  /**
   * Salva dados na sessão
   * @param {string} key - Chave
   * @param {*} value - Valor
   * @returns {boolean} True se salvo
   */
  save(key, value) {
    try {
      const fullKey = `${this.prefix}${key}`;
      sessionStorage.setItem(fullKey, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Erro ao salvar na sessão:', error);
      return false;
    }
  }

  /**
   * Carrega dados da sessão
   * @param {string} key - Chave
   * @param {*} defaultValue - Valor padrão
   * @returns {*} Valor armazenado ou padrão
   */
  load(key, defaultValue = null) {
    try {
      const fullKey = `${this.prefix}${key}`;
      const stored = sessionStorage.getItem(fullKey);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
      console.error('Erro ao carregar da sessão:', error);
      return defaultValue;
    }
  }

  /**
   * Remove dados da sessão
   * @param {string} key - Chave
   * @returns {boolean} True se removido
   */
  remove(key) {
    try {
      const fullKey = `${this.prefix}${key}`;
      sessionStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Erro ao remover da sessão:', error);
      return false;
    }
  }

  /**
   * Limpa toda a sessão
   */
  clear() {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key.startsWith(this.prefix)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Erro ao limpar sessão:', error);
    }
  }
}

// ============================================================================
// EXPORTAR CLASSES
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PersistenceManager,
    SessionStorage
  };
}
