# Guia de Troubleshooting - Áudio e Gravação

## Problemas Comuns e Soluções

### 1. "Permissão negada. Verifique as permissões de microfone."

**Causa**: O navegador não tem permissão para acessar o microfone.

**Soluções**:
1. **Chrome/Edge**:
   - Clique no ícone de cadeado na barra de endereço
   - Procure por "Microfone"
   - Mude para "Permitir"
   - Recarregue a página

2. **Firefox**:
   - Clique no ícone de informações na barra de endereço
   - Procure por "Permissões"
   - Mude "Microfone" para "Permitir"
   - Recarregue a página

3. **Safari**:
   - Vá para Preferências > Segurança > Privacidade
   - Procure por "Microfone"
   - Adicione o site à lista de permissão

4. **Sistema Operacional**:
   - **Windows**: Configurações > Privacidade > Microfone > Permitir acesso ao microfone
   - **macOS**: Preferências do Sistema > Segurança e Privacidade > Microfone
   - **Linux**: Verifique as permissões do PulseAudio/ALSA

### 2. "Nenhum dispositivo de áudio encontrado."

**Causa**: Nenhum microfone está conectado ou detectado.

**Soluções**:
1. Verifique se o microfone está conectado
2. Teste o microfone em outro aplicativo (Skype, Discord, etc.)
3. Reinicie o navegador
4. Reinicie o computador
5. Atualize os drivers de áudio:
   - **Windows**: Gerenciador de Dispositivos > Controladores de Som
   - **macOS**: Atualizações de Software
   - **Linux**: `sudo apt update && sudo apt upgrade`

### 3. "Não foi possível acessar o dispositivo de áudio."

**Causa**: Outro aplicativo está usando o microfone ou há um problema de driver.

**Soluções**:
1. Feche outros aplicativos que usam microfone (Skype, Discord, OBS, etc.)
2. Verifique se o microfone não está desabilitado no sistema
3. Teste em outro navegador
4. Reinicie o navegador
5. Limpe o cache do navegador

### 4. "Erro de segurança. Use HTTPS ou localhost para acessar o microfone."

**Causa**: O site não está usando HTTPS (conexão segura).

**Soluções**:
1. Acesse o site via HTTPS (não HTTP)
2. Se estiver em desenvolvimento local, use `localhost` ou `127.0.0.1`
3. Configure um certificado SSL válido para seu domínio

### 5. Áudio muito baixo ou inaudível

**Causa**: Ganho de entrada baixo ou microfone com volume baixo.

**Soluções**:
1. Aumente o volume do microfone no sistema:
   - **Windows**: Painel de Controle > Som > Gravação
   - **macOS**: Preferências do Sistema > Som > Entrada
   - **Linux**: `alsamixer` ou `pavucontrol`

2. Aproxime-se mais do microfone
3. Verifique se o microfone não está em modo silencioso
4. Teste o microfone em outro aplicativo

### 6. Áudio com muito ruído ou distorção

**Causa**: Ganho de entrada muito alto ou microfone de baixa qualidade.

**Soluções**:
1. Diminua o volume do microfone no sistema
2. Afaste-se de fontes de ruído (ventiladores, ar condicionado, etc.)
3. Use um microfone de melhor qualidade
4. Ative o "Noise Suppression" (já ativado por padrão)
5. Verifique se há interferência de outros dispositivos

### 7. Gravação para abruptamente

**Causa**: Limite de tamanho de arquivo (25MB) atingido ou erro de memória.

**Soluções**:
1. Grave em sessões mais curtas
2. Comprima o áudio antes de enviar
3. Feche outros abas/aplicativos para liberar memória
4. Limpe o cache do navegador
5. Reinicie o navegador

### 8. "Arquivo muito grande! Máximo: 25MB"

**Causa**: O arquivo de áudio excede o limite de 25MB da API Groq.

**Soluções**:
1. Grave em sessões mais curtas
2. Use a compressão automática (ativada por padrão)
3. Reduza a qualidade de captura
4. Divida o arquivo em múltiplas partes
5. Comprima o arquivo manualmente antes de enviar

### 9. Transcrição incorreta ou incompleta

**Causa**: Áudio de baixa qualidade, idioma incorreto ou problema de API.

**Soluções**:
1. Verifique se o idioma está correto (Português, Inglês, Espanhol)
2. Melhore a qualidade do áudio:
   - Use um microfone melhor
   - Grave em ambiente silencioso
   - Fale claramente e próximo ao microfone
3. Verifique a chave da API Groq
4. Tente novamente em alguns minutos (pode ser limite de taxa)

### 10. Visualizador não aparece ou congela

**Causa**: Problema de renderização ou falta de recursos.

**Soluções**:
1. Feche outras abas/aplicativos
2. Limpe o cache do navegador
3. Desabilite extensões do navegador
4. Teste em outro navegador
5. Reinicie o computador

### 11. Painel de qualidade não atualiza

**Causa**: Problema de JavaScript ou elemento não encontrado.

**Soluções**:
1. Abra o console do navegador (F12)
2. Procure por erros em vermelho
3. Recarregue a página
4. Limpe o cache do navegador
5. Teste em outro navegador

### 12. Áudio não é gravado

**Causa**: Problema de permissão, driver ou navegador.

**Soluções**:
1. Verifique as permissões de microfone
2. Teste em outro navegador
3. Atualize o navegador para a versão mais recente
4. Atualize os drivers de áudio
5. Reinicie o computador

---

## Verificação de Compatibilidade

### Navegadores Suportados

| Navegador | Versão Mínima | Status |
|-----------|---------------|--------|
| Chrome    | 47+           | ✅ Suportado |
| Firefox   | 25+           | ✅ Suportado |
| Safari    | 14.1+         | ✅ Suportado |
| Edge      | 79+           | ✅ Suportado |
| Opera     | 34+           | ✅ Suportado |
| IE        | -             | ❌ Não suportado |

### Sistemas Operacionais

| SO        | Status |
|-----------|--------|
| Windows   | ✅ Suportado |
| macOS     | ✅ Suportado |
| Linux     | ✅ Suportado |
| iOS       | ⚠️ Limitado |
| Android   | ⚠️ Limitado |

---

## Ferramentas de Diagnóstico

### Teste de Microfone

1. Abra o console do navegador (F12)
2. Cole o seguinte código:

```javascript
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Microfone acessível');
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(err => {
    console.error('❌ Erro:', err.name, err.message);
  });
```

### Teste de Áudio Context

```javascript
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
console.log('Sample Rate:', audioContext.sampleRate);
console.log('Estado:', audioContext.state);
```

### Teste de Formatos Suportados

```javascript
const formats = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg',
  'audio/mp4'
];

formats.forEach(format => {
  const supported = MediaRecorder.isTypeSupported(format);
  console.log(`${format}: ${supported ? '✅' : '❌'}`);
});
```

---

## Logs e Debugging

### Ativar Logs Detalhados

1. Abra o console do navegador (F12)
2. Procure por mensagens com prefixo `[AudioProcessor]`
3. Verifique se há erros em vermelho

### Exportar Logs

```javascript
// Copiar logs do console
copy(console.log.toString());
```

---

## Contato e Suporte

Se o problema persistir:

1. Verifique a [documentação oficial](./GUIA-AUDIO-PROCESSOR.md)
2. Abra uma issue no GitHub
3. Envie um email para suporte@etranscriber.com

---

## Dicas de Performance

### Otimizar Qualidade de Áudio

1. **Ambiente**: Grave em local silencioso
2. **Microfone**: Use microfone de qualidade (USB ou headset)
3. **Distância**: Mantenha 15-30cm de distância do microfone
4. **Velocidade**: Fale em velocidade normal e clara
5. **Pausa**: Faça pausas naturais entre frases

### Otimizar Performance

1. Feche abas/aplicativos desnecessários
2. Desabilite extensões do navegador
3. Limpe o cache regularmente
4. Atualize o navegador
5. Use conexão de internet estável

---

## FAQ

**P: Posso gravar áudio offline?**
R: Não, a transcrição requer conexão com a API Groq.

**P: Qual é o tamanho máximo de arquivo?**
R: 25MB (limite da API Groq).

**P: Posso usar múltiplos microfones?**
R: Sim, selecione o microfone nas configurações do sistema.

**P: O áudio é armazenado?**
R: Não, o áudio é processado e descartado após transcrição.

**P: Posso editar a transcrição?**
R: Sim, a transcrição aparece em um campo editável.

**P: Qual é a precisão da transcrição?**
R: Depende da qualidade do áudio (geralmente 85-95%).

---

Última atualização: 2024-12-20
