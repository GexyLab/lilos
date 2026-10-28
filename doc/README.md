# Documentazione di lilOS

lilOS è un desktop che gira nel browser, costruito su una scrivania infinita: si può ingrandire, rimpicciolire e spostare liberamente, e ci si appoggiano sopra cartelle, file e app.

La documentazione è divisa per chi la legge.

| Sezione | Per chi | Contenuto |
| --- | --- | --- |
| [Guida utente](utente/guida.md) | Chi usa lilOS | Come muoversi sulla scrivania, gestire gli elementi, usare il menu di avvio |
| [Sviluppatore](sviluppatore/README.md) | Chi scrive codice per lilOS | Avvio del progetto, architettura, riferimento delle API, ricette, convenzioni |
| [Interna](interna/README.md) | Chi mantiene il progetto | Decisioni prese e perché, stato attuale e limiti noti, roadmap, processo di lavoro |
| [SDK](../sdk/README.md) | Chi costruisce app o componenti di base | Cosa offre `@lilos/sdk`, regole e versioni |

## Stato

lilOS è nelle prime fasi. Oggi ci sono la scrivania, gli elementi del desktop, la barra in basso e il menu di avvio. Le finestre e le app vere e proprie non esistono ancora: aprire un'app o un file non mostra nulla. Il dettaglio è in [Stato e roadmap](interna/stato-e-roadmap.md).

## Aggiornare questa documentazione

- Quando cambia un comportamento visibile, aggiorna la [guida utente](utente/guida.md).
- Quando cambia un'API pubblica (export di un modulo, evento del bus, chiave salvata), aggiorna il [riferimento API](sviluppatore/api.md). Se è un export dell'SDK, aggiorna anche [sdk/README.md](../sdk/README.md) e la versione in `sdk/package.json`.

Chi usa Claude Code può affidare questo lavoro all'agente `doc-writer` (vedi [Processo](interna/processo.md#agenti-di-claude-code)).
- Quando prendi una decisione di architettura, aggiungila a [Decisioni](interna/decisioni.md).
- Quando chiudi o scopri un limite, aggiorna [Stato e roadmap](interna/stato-e-roadmap.md).
