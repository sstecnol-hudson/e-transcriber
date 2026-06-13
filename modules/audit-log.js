/**
 * E-Transcriber - Módulo de Auditoria (Audit Log)
 * Responsável por rastrear alterações em dados clínicos (automático vs manual)
 */

class AuditLogger {
    constructor() {
        this.storageKey = 'etranscriber_audit_logs';
        this.maxLogs = 1000;
        this.logs = this._loadLogs();
        
        // Setup UI
        setTimeout(() => {
            this._updateUI();
            const btnClear = document.getElementById('btn-clear-audit');
            if (btnClear) {
                btnClear.addEventListener('click', () => {
                    if (confirm('Tem certeza que deseja apagar todo o histórico de auditoria?')) {
                        this.clear();
                    }
                });
            }
        }, 500);
    }

    _loadLogs() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Erro ao carregar logs de auditoria:', e);
            return [];
        }
    }

    _saveLogs() {
        try {
            // Mantém apenas os últimos 'maxLogs'
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(this.logs.length - this.maxLogs);
            }
            localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
        } catch (e) {
            console.error('Erro ao salvar logs de auditoria:', e);
        }
    }

    /**
     * Registra um novo evento de auditoria
     * @param {string} source 'IA' | 'MEDICO' | 'SISTEMA'
     * @param {string} action Descrição curta da ação
     * @param {string} details Detalhes da alteração
     */
    log(source, action, details) {
        const logEntry = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toISOString(),
            source: source,
            action: action,
            details: details
        };
        
        this.logs.push(logEntry);
        this._saveLogs();
        this._updateUI();
        
        console.log(`[Auditoria] ${source} - ${action}: ${details}`);
    }

    clear() {
        this.logs = [];
        this._saveLogs();
        this._updateUI();
    }

    getLogs() {
        // Retorna cópia invertida (mais recentes primeiro)
        return [...this.logs].reverse();
    }

    /**
     * Atualiza o painel de UI, se existir
     */
    _updateUI() {
        const container = document.getElementById('audit-log-container');
        if (!container) return;

        const logs = this.getLogs();
        
        if (logs.length === 0) {
            container.innerHTML = '<div class="audit-empty">Nenhum registro de auditoria encontrado.</div>';
            return;
        }

        let html = '<div class="audit-list">';
        logs.forEach(l => {
            const date = new Date(l.timestamp);
            const formattedDate = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
            
            let sourceClass = '';
            if (l.source === 'IA') sourceClass = 'source-ia';
            else if (l.source === 'MEDICO') sourceClass = 'source-medico';
            else sourceClass = 'source-system';

            html += `
                <div class="audit-item">
                    <div class="audit-header">
                        <span class="audit-time">${formattedDate}</span>
                        <span class="audit-badge ${sourceClass}">${l.source}</span>
                    </div>
                    <div class="audit-body">
                        <strong>${l.action}</strong>
                        <p>${l.details}</p>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }
}

// Instância Global
window.AuditLog = new AuditLogger();
