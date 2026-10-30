# Documentazione di lilOS

lilOS è un desktop che gira nel browser, costruito su una scrivania infinita: si può ingrandire, rimpicciolire e spostare liberamente, e ci si appoggiano sopra cartelle, file e app.

La documentazione è divisa per chi la legge.

| Sezione | Per chi | Contenuto |
| --- | --- | --- |
| [Guida utente](utente/guida.md) | Chi usa lilOS | Come accedere, muoversi sulla scrivania, gestire gli elementi, usare il menu di avvio |
| [Sviluppatore](sviluppatore/README.md) | Chi scrive codice per lilOS | Avvio del progetto (kernel compreso), architettura, riferimento delle API, ricette, convenzioni |
| [Interna](interna/README.md) | Chi mantiene il progetto | Decisioni prese e perché, stato attuale e limiti noti, roadmap, processo di lavoro |
| [SDK](../sdk/README.md) | Chi costruisce app o componenti di base | Cosa offre `@lilos/sdk`, regole e versioni |

## Stato

lilOS è in sviluppo. Oggi ci sono la scrivania, gli elementi del desktop, le finestre, i workspace, le workarea, i tag, il Cestino, l'accesso con più utenti e un backend (il kernel) che conserva i dati di ogni utente. File Manager, Editor, Impostazioni e AppStore sono pacchetti del repository ufficiale che il kernel installa da solo; con l'AppStore un amministratore installa altre app e moduli del kernel da altri repository. Il dettaglio è in [Stato e roadmap](interna/stato-e-roadmap.md).

## Aggiornare questa documentazione

- Quando cambia un comportamento visibile, aggiorna la [guida utente](utente/guida.md).
- Quando cambia un'API pubblica (export di un modulo, evento del bus, chiave salvata, endpoint o modulo del kernel, manifesto delle app), aggiorna il [riferimento API](sviluppatore/api.md). Se è un export dell'SDK, aggiorna anche [sdk/README.md](../sdk/README.md) e la versione in `sdk/package.json`.
- Quando prendi una decisione di architettura, aggiungila a [Decisioni](interna/decisioni.md).
- Quando chiudi o scopri un limite, aggiorna [Stato e roadmap](interna/stato-e-roadmap.md).

Chi usa Claude Code può affidare questo lavoro all'agente `doc-writer` (vedi [Processo](interna/processo.md#agenti-di-claude-code)).
