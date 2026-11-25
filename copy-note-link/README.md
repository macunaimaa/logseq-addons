# Copy Note Link

Botão no canto superior direito do Logseq que copia a referência da página atual para colar num agente.

Saída padrão:

```
Nota do Logseq: Minha Nota
Arquivo: /Users/voce/logseq/pages/Minha Nota.md
Link: logseq://graph/meu-grafo?page=Minha%20Nota
```

Em **Settings → Plugins → Copy Note Link** dá para trocar para só o caminho, só a URL `logseq://` ou `[[wikilink]]`.
Também disponível na paleta de comandos: "Copiar link da nota para agente".

## Instalar
1. Logseq → Settings → Advanced → ative **Developer mode**.
2. Plugins (`t p`) → **Load unpacked plugin** → selecione esta pasta `copy-note-link`.
