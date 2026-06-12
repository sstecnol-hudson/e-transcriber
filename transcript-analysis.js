/**
 * ANÁLISE INTELIGENTE DA TRANSCRIÇÃO PARA PESQUISA MÉDICA
 * Módulo que analisa a transcrição da consulta e sugere pesquisas relevantes
 */

// Injetar card de análise quando a aba de pesquisa for aberta
function injectTranscriptAnalysisCard() {
    const tabPesquisa = document.getElementById('tab-pesquisa');
    if (!tabPesquisa) return;

    // Verificar se o card já existe
    if (document.getElementById('transcript-analysis-card')) return;

    // Criar HTML do card
    const cardHTML = `
        <div id="transcript-analysis-card" class="card" style="display: none; border-left: 4px solid #22c55e; background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%); margin-bottom: 20px;">
            <div class="card-header" style="border-bottom: 1px solid rgba(34, 197, 94, 0.15); background: rgba(34, 197, 94, 0.02);">
                <div class="header-main-title" style="color: #22c55e;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    <h3>💡 Análise Inteligente da Consulta</h3>
                </div>
                <button id="btn-analyze-transcript" class="btn btn-sm" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3); padding: 6px 14px; font-size: 0.85rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                    <span>Analisar Novamente</span>
                </button>
            </div>
            <div class="card-content">
                <p id="transcript-snippet" style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; border-left: 3px solid rgba(34, 197, 94, 0.5); font-style: italic;">
                    <!-- Trecho da transcrição aqui -->
                </p>
                
                <div id="analysis-loader" style="display: none; text-align: center; padding: 20px;">
                    <div class="spinner" style="margin: 0 auto 12px;"></div>
                    <p style="font-size: 0.9rem; color: var(--text-secondary);">Analisando transcrição com IA...</p>
                </div>

                <div id="search-suggestions" style="display: none;">
                    <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        Sugestões de Pesquisa Baseadas no Caso:
                    </h4>
                    <div id="suggestions-list" style="display: flex; flex-direction: column; gap: 10px;">
                        <!-- Sugestões aqui -->
                    </div>
                </div>
            </div>
        </div>
    `;

    // Inserir antes do primeiro card
    tabPesquisa.insertAdjacentHTML('afterbegin', cardHTML);

    // Adicionar event listeners
    const btnAnalyze = document.getElementById('btn-analyze-transcript');
    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', analyzeTranscriptForSearch);
    }
}

// Detectar quando a aba de pesquisa é aberta
function onTabPesquisaOpen() {
    injectTranscriptAnalysisCard();
    
    // Verificar se existe transcrição disponível
    const transcript = AppState?.currentTranscription || document.getElementById('rawTranscript')?.value || '';
    
    if (transcript.trim().length > 50) {
        // Mostrar card e analisar automaticamente
        const card = document.getElementById('transcript-analysis-card');
        if (card) {
            card.style.display = 'block';
            analyzeTranscriptForSearch();
        }
    } else {
        // Esconder card se não houver transcrição
        const card = document.getElementById('transcript-analysis-card');
        if (card) {
            card.style.display = 'none';
        }
    }
}

// Analisar transcrição e gerar sugestões de pesquisa
async function analyzeTranscriptForSearch() {
    const transcript = AppState?.currentTranscription || document.getElementById('rawTranscript')?.value || '';
    
    if (!transcript.trim()) {
        showToast('Nenhuma transcrição disponível. Faça uma consulta primeiro.');
        return;
    }

    if (!AppState.apiKey) {
        showToast('Configure sua chave Groq em Configurações primeiro.');
        switchTab('tab-config');
        return;
    }

    // Mostrar snippet da transcrição
    const snippetEl = document.getElementById('transcript-snippet');
    if (snippetEl) {
        const snippet = transcript.substring(0, 200) + (transcript.length > 200 ? '...' : '');
        snippetEl.textContent = `"${snippet}"`;
    }

    // Mostrar loader
    const loader = document.getElementById('analysis-loader');
    const suggestionsDiv = document.getElementById('search-suggestions');
    if (loader) loader.style.display = 'block';
    if (suggestionsDiv) suggestionsDiv.style.display = 'none';

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${AppState.apiKey}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { 
                        role: 'system', 
                        content: `Você é um assistente médico especializado em análise de consultas. 
Analise a transcrição fornecida e extraia termos médicos relevantes para gerar 3-5 sugestões de pesquisa médica.

Retorne APENAS um JSON no seguinte formato (sem explicações adicionais):
{
  "suggestions": [
    "Sugestão de pesquisa 1",
    "Sugestão de pesquisa 2",
    "Sugestão de pesquisa 3"
  ]
}

Foque em:
- Diagnósticos mencionados
- Medicamentos e dosagens
- Exames solicitados
- Diretrizes de tratamento
- Interações medicamentosas
- Ajustes terapêuticos necessários

Sugestões devem ser específicas e clinicamente relevantes.` 
                    },
                    { 
                        role: 'user', 
                        content: `Transcrição da consulta:\n\n${transcript}\n\nGere sugestões de pesquisa médica baseadas nesta transcrição.` 
                    }
                ],
                temperature: 0.3
            })
        });

        if (!res.ok) {
            throw new Error(`Erro na análise: ${res.status}`);
        }

        const data = await res.json();
        const content = data.choices[0].message.content || '{}';
        
        // Tentar parsear JSON
        let suggestions = [];
        try {
            const parsed = JSON.parse(content);
            suggestions = parsed.suggestions || [];
        } catch (e) {
            // Se não for JSON válido, extrair sugestões manualmente
            const lines = content.split('\n').filter(line => line.trim().length > 10);
            suggestions = lines.slice(0, 5);
        }

        // Renderizar sugestões
        renderSearchSuggestions(suggestions);

    } catch (err) {
        console.error('Erro ao analisar transcrição:', err);
        showToast('Erro ao analisar transcrição. Tente novamente.');
        if (loader) loader.style.display = 'none';
    }
}

// Renderizar sugestões de pesquisa
function renderSearchSuggestions(suggestions) {
    const loader = document.getElementById('analysis-loader');
    const suggestionsDiv = document.getElementById('search-suggestions');
    const suggestionsList = document.getElementById('suggestions-list');

    if (loader) loader.style.display = 'none';
    
    if (!suggestions || suggestions.length === 0) {
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
        showToast('Não foi possível gerar sugestões. Tente pesquisa manual.');
        return;
    }

    if (suggestionsList) {
        suggestionsList.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const cleanSuggestion = suggestion.replace(/^[\d\.\-\*\s]+/, '').trim();
            if (cleanSuggestion.length < 5) return;

            const suggestionCard = document.createElement('div');
            suggestionCard.className = 'suggestion-card';
            suggestionCard.style.cssText = `
                padding: 14px 16px;
                background: rgba(34, 197, 94, 0.08);
                border: 1px solid rgba(34, 197, 94, 0.2);
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 12px;
            `;

            suggestionCard.innerHTML = `
                <div style="flex-shrink: 0; width: 28px; height: 28px; background: rgba(34, 197, 94, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #22c55e; font-size: 0.85rem;">
                    ${index + 1}
                </div>
                <div style="flex-grow: 1;">
                    <p style="margin: 0; font-size: 0.95rem; color: var(--text-primary); font-weight: 500;">${escapeHtml(cleanSuggestion)}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: rgba(34, 197, 94, 0.6);"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
            `;

            // Hover effect
            suggestionCard.addEventListener('mouseenter', () => {
                suggestionCard.style.background = 'rgba(34, 197, 94, 0.15)';
                suggestionCard.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                suggestionCard.style.transform = 'translateX(4px)';
            });

            suggestionCard.addEventListener('mouseleave', () => {
                suggestionCard.style.background = 'rgba(34, 197, 94, 0.08)';
                suggestionCard.style.borderColor = 'rgba(34, 197, 94, 0.2)';
                suggestionCard.style.transform = 'translateX(0)';
            });

            // Click para pesquisar
            suggestionCard.addEventListener('click', () => {
                const queryInput = document.getElementById('tavilyQuery');
                if (queryInput) {
                    queryInput.value = cleanSuggestion;
                    queryInput.focus();
                    // Scroll suave para o campo de pesquisa
                    queryInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    showToast(`Sugestão "${cleanSuggestion.substring(0, 30)}..." selecionada!`);
                }
            });

            suggestionsList.appendChild(suggestionCard);
        });
    }

    if (suggestionsDiv) suggestionsDiv.style.display = 'block';
    showToast(`${suggestions.length} sugestões geradas com sucesso!`);
}

// Interceptar mudança de aba para detectar quando abre Pesquisa Médica
(function() {
    // Aguardar DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupTabInterceptor);
    } else {
        setupTabInterceptor();
    }
})();

function setupTabInterceptor() {
    // Interceptar clique no menu
    const menuPesquisa = document.getElementById('btn-menu-pesquisa');
    if (menuPesquisa) {
        menuPesquisa.addEventListener('click', () => {
            setTimeout(onTabPesquisaOpen, 100);
        });
    }

    // Interceptar função switchTab do app.js
    const originalSwitchTab = window.switchTab;
    if (originalSwitchTab) {
        window.switchTab = function(tabId, menuItemElement) {
            originalSwitchTab(tabId, menuItemElement);
            if (tabId === 'tab-pesquisa') {
                setTimeout(onTabPesquisaOpen, 100);
            }
        };
    }
}

console.log('✅ Módulo de Análise Inteligente de Transcrição carregado');
