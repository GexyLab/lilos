# fs-postgres

Modulo del kernel che tiene il **file system di lilOS in PostgreSQL**, con il controllo degli accessi.

- Ogni utente vede solo la propria Home; le app installate e le librerie condivise si leggono e non si modificano.
- Chi non può leggere un elemento non ne scopre nemmeno l'esistenza.
- I file grandi (dalla 1.1.0) si salvano e si leggono a pezzi da 1 MB, senza tenerli interi in memoria: servono ai trasferimenti della cartella Rete.
- Dalla 1.2.0 segue le impostazioni del kernel (lilOS 1.33.0, Pannello di controllo → Archiviazione → Limiti): un file fino a `files.inlineMax` (1 MB) sta nella sua riga, uno più grande in pezzi da `files.dbChunk` (1 MB; i file già scritti tengono la dimensione dei loro pezzi), e uno oltre `files.maxReadWhole` (256 MB) si legge solo a flusso. Dice al kernel lo spazio usato da ogni utente, per le quote. Con un kernel più vecchio valgono i predefiniti.

## Configurazione

| Chiave | Cosa | Predefinito |
|---|---|---|
| `url` | Indirizzo del database (`LILOS_PG_URL` ha la precedenza) | `postgres://lilos:lilos@127.0.0.1:5433/lilos` |
| `poolSize` | Connessioni aperte insieme | |

Per un database di prova: `npm run db:up` nella cartella di lilOS (serve Docker).

Fornisce il servizio `fs`.
