# fs-postgres

Modulo del kernel che tiene il **file system di lilOS in PostgreSQL**, con il controllo degli accessi.

- Ogni utente vede solo la propria Home; le app installate e le librerie condivise si leggono e non si modificano.
- Chi non può leggere un elemento non ne scopre nemmeno l'esistenza.
- I file grandi (dalla 1.1.0) si salvano e si leggono a pezzi da 1 MB, senza tenerli interi in memoria: servono ai trasferimenti della cartella Rete.

## Configurazione

| Chiave | Cosa | Predefinito |
|---|---|---|
| `url` | Indirizzo del database (`LILOS_PG_URL` ha la precedenza) | `postgres://lilos:lilos@127.0.0.1:5433/lilos` |
| `poolSize` | Connessioni aperte insieme | |

Per un database di prova: `npm run db:up` nella cartella di lilOS (serve Docker).

Fornisce il servizio `fs`.
