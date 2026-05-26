/**
 * Serviço de Integração com a BVS APS (Atenção Primária à Saúde)
 * Repositório de Segunda Opinião Formativa (SOF)
 */

class BVSService {
    constructor() {
        this.baseUrl = 'https://aps-repo.bvs.br/wp-json/wp/v2';
        this.isLoading = false;
    }

    /**
     * Busca SOFs na BVS APS usando um termo de pesquisa
     * @param {string} query Termo para busca (ex: "hipertensão", "infecção urinária")
     * @param {number} limit Número máximo de resultados
     * @returns {Promise<Array>} Array de resultados formatados
     */
    async search(query, limit = 5) {
        if (!query || query.trim() === '') return [];
        
        this.isLoading = true;
        try {
            const url = `${this.baseUrl}/aps?search=${encodeURIComponent(query)}&per_page=${limit}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Erro na API BVS: ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatResults(data);
        } catch (error) {
            console.error('Erro ao buscar na BVS APS:', error);
            return [];
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Formata os dados da API do WordPress para o formato da UI
     */
    formatResults(data) {
        if (!Array.isArray(data)) return [];

        return data.map(item => {
            // Título limpo de entidades HTML (se houver)
            const rawTitle = item.title?.rendered || 'Sem Título';
            const title = this.decodeHtmlEntities(rawTitle);

            // Conteúdo (a SOF em si)
            const rawContent = item.content?.rendered || '';
            
            // Simplificamos o HTML para exibição
            // Removemos atributos de estilo, classes e scripts, mas mantemos estrutura básica (p, ul, li, strong)
            let cleanContent = rawContent
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/ class="[^"]*"/g, '')
                .replace(/ style="[^"]*"/g, '');

            return {
                id: item.id,
                title: title,
                content: cleanContent,
                link: item.link
            };
        });
    }

    /**
     * Extrai possíveis termos-chave de um texto de prontuário
     * Exemplo: pega as queixas principais ou diagnósticos do SOAP
     */
    extractKeywordsFromRecord(recordText) {
        if (!recordText) return '';
        
        // Estratégia básica: procurar pela seção "Avaliação" ou "Diagnóstico" no SOAP
        const lowerText = recordText.toLowerCase();
        let match = null;

        // Tenta achar "Avaliação:" ou "Impressão Diagnóstica:"
        const regexAvaliacao = /(?:avalia[çc][ãa]o|diagn[óo]stico|impress[ãa]o diagn[óo]stica|hip[óo]tese diagn[óo]stica)[:\s]+([^#\n]+)/i;
        match = recordText.match(regexAvaliacao);
        
        if (match && match[1]) {
            // Limpa o termo encontrado
            let term = match[1].trim();
            // Pega apenas as primeiras palavras importantes (evitar frases muito longas)
            term = term.split(/[,.;]/)[0].trim(); 
            if (term.length > 3 && term.length < 50) {
                return term;
            }
        }
        
        // Fallback: tenta procurar por "Subjetivo:" ou "Queixa Principal:"
        const regexQueixa = /(?:subjetivo|queixa principal)[:\s]+([^#\n]+)/i;
        match = recordText.match(regexQueixa);
        
        if (match && match[1]) {
            let term = match[1].trim();
            term = term.split(/[,.;]/)[0].trim();
            if (term.length > 3 && term.length < 50) {
                return term;
            }
        }

        return '';
    }

    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
}

// Singleton para o serviço
const bvsService = new BVSService();
