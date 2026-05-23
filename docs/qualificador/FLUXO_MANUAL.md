# Fluxo manual — Qualificador de Encaminhamentos

Checklist para validar a integração na interface.

## Pré-requisitos

1. Servir o app localmente: `python -m http.server 8000`
2. Abrir `http://localhost:8000`
3. (Opcional) Chave Groq configurada para gerar prontuário com IA

## Passos

| # | Ação | Resultado esperado |
|---|------|-------------------|
| 1 | Nova Consulta → gravar/transcrever ou colar texto | Transcrição no painel |
| 2 | Gerar prontuário (SOAP ou outro modelo) | Texto no campo de prontuário |
| 3 | Clicar em **Qualificar para Encaminhamento** | Modal com 3 especialidades |
| 4 | Escolher uma especialidade (ex.: Endocrinologia) | Modal fecha; análise/resultado exibido |
| 5 | Verificar relatório ou resumo | Status de elegibilidade, alertas e exames |

## Testes automatizados

```bash
npm test
```

Deve exibir: `Tests: 309 passed`.

## Arquivos da integração

- `index.html` — scripts do módulo
- `app.js` — `handleQualifyClick()`
- `modules/qualification/qualification-integration-platform.js` — modal e fluxo
