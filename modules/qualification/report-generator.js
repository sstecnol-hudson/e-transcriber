/**
 * Gerador de Relatórios de Qualificação
 * Gera relatórios estruturados em HTML, PDF e texto
 */

class ReportGenerator {
  constructor(qualification, protocol) {
    if (!qualification || !protocol) {
      throw new Error('Qualificação e protocolo são obrigatórios');
    }
    this.qualification = qualification;
    this.protocol = protocol;
  }

  /**
   * Gera relatório em HTML
   * @returns {string} HTML do relatório
   */
  generateHTML() {
    const result = this.qualification.result;
    const metadata = this.qualification.metadata;
    const auditTrail = this.qualification.auditTrail;

    const statusColor = this.getStatusColor(result.status);
    const statusIcon = this.getStatusIcon(result.status);

    let html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Qualificação para Encaminhamento</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 40px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    
    .header {
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 24px;
      color: #2c3e50;
      margin-bottom: 10px;
    }
    
    .header p {
      color: #7f8c8d;
      font-size: 14px;
    }
    
    .result-section {
      background-color: ${statusColor}15;
      border-left: 5px solid ${statusColor};
      padding: 20px;
      margin-bottom: 30px;
      border-radius: 4px;
    }
    
    .result-status {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .status-icon {
      font-size: 32px;
    }
    
    .status-text h2 {
      font-size: 20px;
      color: ${statusColor};
      margin-bottom: 5px;
    }
    
    .status-text p {
      color: #555;
      font-size: 14px;
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .section h3 {
      font-size: 16px;
      color: #2c3e50;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    
    .section-content {
      padding-left: 20px;
    }
    
    .item {
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    
    .item-icon {
      font-size: 18px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    
    .item-text {
      flex: 1;
    }
    
    .item-text strong {
      display: block;
      color: #2c3e50;
      margin-bottom: 3px;
    }
    
    .item-text span {
      color: #7f8c8d;
      font-size: 13px;
    }
    
    .alert-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin-bottom: 15px;
      border-radius: 4px;
    }
    
    .alert-box strong {
      color: #856404;
    }
    
    .alert-box p {
      color: #856404;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .critical-alert {
      background-color: #f8d7da;
      border-left-color: #dc3545;
    }
    
    .critical-alert strong,
    .critical-alert p {
      color: #721c24;
    }
    
    .metadata {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 4px;
      font-size: 13px;
      color: #555;
    }
    
    .metadata-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #dee2e6;
    }
    
    .metadata-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    
    .metadata-label {
      font-weight: 600;
      color: #2c3e50;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
      text-align: center;
      color: #7f8c8d;
      font-size: 12px;
    }
    
    .print-only {
      display: none;
    }
    
    @media print {
      body {
        background-color: white;
      }
      
      .container {
        box-shadow: none;
        padding: 0;
      }
      
      .print-only {
        display: block;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Relatório de Qualificação para Encaminhamento</h1>
      <p>Gerado em ${this.formatDate(new Date(auditTrail.timestamp))}</p>
    </div>
    
    <div class="result-section">
      <div class="result-status">
        <div class="status-icon">${statusIcon}</div>
        <div class="status-text">
          <h2>${result.statusLabel}</h2>
          <p>${result.justification}</p>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h3>Dados do Paciente</h3>
      <div class="section-content">
        <div class="item">
          <div class="item-icon">👤</div>
          <div class="item-text">
            <strong>Especialidade</strong>
            <span>${this.getSpecialtyName(this.qualification.specialty)}</span>
          </div>
        </div>
        <div class="item">
          <div class="item-icon">📋</div>
          <div class="item-text">
            <strong>Protocolo</strong>
            <span>${this.protocol.name}</span>
          </div>
        </div>
      </div>
    </div>
    
    ${this.generateAlertsHTML(result.alerts)}
    
    ${this.generateMissingExamsHTML(result.missingExams)}
    
    <div class="section">
      <h3>Recomendações</h3>
      <div class="section-content">
        ${this.generateRecommendationsHTML(result)}
      </div>
    </div>
    
    <div class="section">
      <h3>Metadados</h3>
      <div class="metadata">
        <div class="metadata-row">
          <span class="metadata-label">Data da Qualificação:</span>
          <span>${this.formatDate(new Date(auditTrail.timestamp))}</span>
        </div>
        <div class="metadata-row">
          <span class="metadata-label">Médico Responsável:</span>
          <span>${metadata.doctorName || 'Não informado'}</span>
        </div>
        <div class="metadata-row">
          <span class="metadata-label">Clínica:</span>
          <span>${metadata.clinicName || 'Não informado'}</span>
        </div>
        <div class="metadata-row">
          <span class="metadata-label">ID da Qualificação:</span>
          <span>${this.qualification.id}</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>Este relatório foi gerado automaticamente pelo Sistema de Qualificação de Encaminhamentos Médicos.</p>
      <p>Documento confidencial - Protegido por LGPD/HIPAA</p>
    </div>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Gera HTML para alertas
   * @param {Array} alerts - Alertas detectados
   * @returns {string} HTML dos alertas
   */
  generateAlertsHTML(alerts) {
    if (!alerts || alerts.length === 0) {
      return '';
    }

    let html = '<div class="section"><h3>Sinais de Alerta Detectados</h3><div class="section-content">';

    alerts.forEach(alert => {
      const isCritical = alert.severity === 'CRITICAL';
      html += `
        <div class="alert-box ${isCritical ? 'critical-alert' : ''}">
          <strong>⚠️ ${alert.name}</strong>
          <p>${alert.recommendation}</p>
        </div>
      `;
    });

    html += '</div></div>';
    return html;
  }

  /**
   * Gera HTML para exames faltantes
   * @param {Array} missingExams - Exames faltantes
   * @returns {string} HTML dos exames faltantes
   */
  generateMissingExamsHTML(missingExams) {
    if (!missingExams || missingExams.length === 0) {
      return '';
    }

    let html = '<div class="section"><h3>Exames Obrigatórios Faltantes</h3><div class="section-content">';

    missingExams.forEach(exam => {
      html += `
        <div class="item">
          <div class="item-icon">❌</div>
          <div class="item-text">
            <strong>${exam.name}</strong>
            <span>Máximo de ${exam.maxAgeDays} dias</span>
          </div>
        </div>
      `;
    });

    html += '</div></div>';
    return html;
  }

  /**
   * Gera HTML para recomendações
   * @param {Object} result - Resultado da análise
   * @returns {string} HTML das recomendações
   */
  generateRecommendationsHTML(result) {
    const recommendations = this.getRecommendations(result);
    let html = '';

    recommendations.forEach(rec => {
      html += `
        <div class="item">
          <div class="item-icon">✓</div>
          <div class="item-text">
            <span>${rec}</span>
          </div>
        </div>
      `;
    });

    return html;
  }

  /**
   * Obtém recomendações baseadas no resultado
   * @param {Object} result - Resultado da análise
   * @returns {Array<string>} Recomendações
   */
  getRecommendations(result) {
    const recommendations = [];

    switch (result.status) {
      case 'QUALIFICADO':
        recommendations.push('Encaminhar para especialista conforme protocolo');
        recommendations.push('Agendar consulta na especialidade');
        break;

      case 'QUALIFICADO_COM_RESSALVAS':
        recommendations.push('Solicitar exames faltantes antes do encaminhamento');
        recommendations.push('Encaminhar após obtenção de todos os exames');
        break;

      case 'NAO_QUALIFICADO':
        recommendations.push('Manter acompanhamento na Atenção Primária');
        recommendations.push('Revisar diagnóstico e indicação de encaminhamento');
        break;

      case 'URGENCIA':
        recommendations.push('Encaminhamento URGENTE para especialista');
        recommendations.push('Considerar encaminhamento para Pronto Socorro se necessário');
        break;
    }

    return recommendations;
  }

  /**
   * Obtém cor do status
   * @param {string} status - Status da qualificação
   * @returns {string} Cor em hexadecimal
   */
  getStatusColor(status) {
    switch (status) {
      case 'QUALIFICADO':
        return '#27ae60';
      case 'QUALIFICADO_COM_RESSALVAS':
        return '#f39c12';
      case 'NAO_QUALIFICADO':
        return '#e74c3c';
      case 'URGENCIA':
        return '#c0392b';
      default:
        return '#95a5a6';
    }
  }

  /**
   * Obtém ícone do status
   * @param {string} status - Status da qualificação
   * @returns {string} Ícone emoji
   */
  getStatusIcon(status) {
    switch (status) {
      case 'QUALIFICADO':
        return '✅';
      case 'QUALIFICADO_COM_RESSALVAS':
        return '⚠️';
      case 'NAO_QUALIFICADO':
        return '❌';
      case 'URGENCIA':
        return '🚨';
      default:
        return '❓';
    }
  }

  /**
   * Obtém nome da especialidade
   * @param {string} specialtyId - ID da especialidade
   * @returns {string} Nome da especialidade
   */
  getSpecialtyName(specialtyId) {
    const specialties = {
      'endocrinologia': 'Endocrinologia',
      'cardiologia': 'Cardiologia',
      'reumatologia': 'Reumatologia'
    };
    return specialties[specialtyId] || specialtyId;
  }

  /**
   * Formata data
   * @param {Date} date - Data a formatar
   * @returns {string} Data formatada
   */
  formatDate(date) {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return date.toLocaleDateString('pt-BR', options);
  }

  /**
   * Gera relatório em texto simples
   * @returns {string} Texto do relatório
   */
  generateText() {
    const result = this.qualification.result;
    const metadata = this.qualification.metadata;
    const auditTrail = this.qualification.auditTrail;

    let text = `
================================================================================
RELATÓRIO DE QUALIFICAÇÃO PARA ENCAMINHAMENTO
================================================================================

Data: ${this.formatDate(new Date(auditTrail.timestamp))}

RESULTADO FINAL
================================================================================
Status: ${result.statusLabel}
Justificativa: ${result.justification}

DADOS DO PACIENTE
================================================================================
Especialidade: ${this.getSpecialtyName(this.qualification.specialty)}
Protocolo: ${this.protocol.name}

`;

    if (result.alerts && result.alerts.length > 0) {
      text += `SINAIS DE ALERTA DETECTADOS
================================================================================
`;
      result.alerts.forEach(alert => {
        text += `- ${alert.name}: ${alert.recommendation}\n`;
      });
      text += '\n';
    }

    if (result.missingExams && result.missingExams.length > 0) {
      text += `EXAMES OBRIGATÓRIOS FALTANTES
================================================================================
`;
      result.missingExams.forEach(exam => {
        text += `- ${exam.name} (máximo ${exam.maxAgeDays} dias)\n`;
      });
      text += '\n';
    }

    text += `RECOMENDAÇÕES
================================================================================
`;
    const recommendations = this.getRecommendations(result);
    recommendations.forEach(rec => {
      text += `- ${rec}\n`;
    });

    text += `
METADADOS
================================================================================
ID da Qualificação: ${this.qualification.id}
Médico Responsável: ${metadata.doctorName || 'Não informado'}
Clínica: ${metadata.clinicName || 'Não informado'}

================================================================================
Documento confidencial - Protegido por LGPD/HIPAA
================================================================================
    `;

    return text;
  }

  /**
   * Exporta relatório como PDF (requer biblioteca externa)
   * @returns {Blob} PDF do relatório
   */
  generatePDF() {
    // Implementação simplificada - em produção usar biblioteca como jsPDF
    const html = this.generateHTML();
    
    // Criar blob com conteúdo HTML
    const blob = new Blob([html], { type: 'text/html' });
    
    // Retornar URL para download
    return blob;
  }

  /**
   * Obtém URL para download do relatório
   * @param {string} format - Formato: 'html', 'txt', 'pdf'
   * @returns {string} URL para download
   */
  getDownloadUrl(format = 'html') {
    let content, filename, mimeType;

    switch (format) {
      case 'txt':
        content = this.generateText();
        filename = `qualificacao_${this.qualification.id}.txt`;
        mimeType = 'text/plain';
        break;

      case 'html':
        content = this.generateHTML();
        filename = `qualificacao_${this.qualification.id}.html`;
        mimeType = 'text/html';
        break;

      case 'pdf':
        content = this.generatePDF();
        filename = `qualificacao_${this.qualification.id}.pdf`;
        mimeType = 'application/pdf';
        break;

      default:
        throw new Error(`Formato desconhecido: ${format}`);
    }

    const blob = new Blob([content], { type: mimeType });
    return {
      url: URL.createObjectURL(blob),
      filename: filename,
      mimeType: mimeType
    };
  }
}

// ============================================================================
// EXPORTAR CLASSE
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportGenerator;
}
