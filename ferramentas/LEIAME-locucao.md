# Locução dos Reels (voz do Gemini)

O `locucao.mjs` lê o roteiro da semana (`AAAA-MM-DD/locucoes.json`, escrito pelo agente), gera um áudio `.wav` por Reel com a voz do Google AI Studio e deixa tudo pronto para montar o vídeo.

## Configurar (uma vez)

1. Crie uma chave em https://aistudio.google.com/apikey (Create API key).
2. No PowerShell, guarde a chave só no seu usuário (troque pelo valor real, sem aspas extras):

   `setx GEMINI_API_KEY "COLE_A_CHAVE_AQUI"`

   Feche e abra o PowerShell de novo.
3. Baixe o script desta pasta (`locucao.mjs`) e salve num lugar fixo, por exemplo `C:\SupportStore\locucao.mjs`.

**A chave é só sua.** Não cole em conversa, não coloque em arquivo do repositório, não envie em print. Se ela vazar, apague no AI Studio e crie outra.

## Rodar toda semana (depois que o agente avisar)

No PowerShell, na pasta do script:

`node locucao.mjs 2026-10-19`

(troque pela data da segunda-feira da semana). Os áudios saem em `saida\2026-10-19\`.

Depois envie os `.wav` para a pasta `2026-10-19/audio/` do repositório (GitHub > Add file > Upload files) e avise o Claude. Ele monta os vídeos em cima do áudio e te mostra antes de publicar.

### Opcional: enviar sozinho ao GitHub

Se você tiver o repositório clonado no computador, defina `REPO_DIR` com a pasta dele (`setx REPO_DIR "C:\caminho\supportstore-midia"`). Aí o script copia os áudios e faz o `git push` sozinho.

## Ajustes

- Voz: `setx GEMINI_VOICE "Kore"` (outras: Charon, Puck, Fenrir, Orus, Zephyr). Padrão: Charon.
- Estilo da fala: o campo `estilo` do `locucoes.json` (o agente preenche; você pode editar).
- Se der erro de modelo, o nome pode ter mudado no Google: `setx GEMINI_TTS_MODEL "nome-novo"`.

## Se algo falhar

- `Falta a variável GEMINI_API_KEY`: reabra o PowerShell depois do `setx`.
- `HTTP 429`: limite do plano gratuito; o script tenta de novo e, se persistir, espere alguns minutos.
- `Não achei o roteiro`: o agente ainda não rodou na semana, ou a data não é a da segunda-feira.
