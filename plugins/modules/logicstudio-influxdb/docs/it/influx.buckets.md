# InfluxDB · Bucket (elenco)

`influx.buckets` · Database · [Blocchi InfluxDB](logicstudio-influxdb) · versione 1

Elenca i **bucket** che il token può vedere (con InfluxDB 1.x e 3.x sono i **database**). Serve per riempire una selezione, o per controllare che un bucket esista prima di scriverci.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire la richiesta. |
| **connessione** (`connection`) | oggetto | Il riferimento dell'uscita **connessione** di [InfluxDB · Connessione (connect)](influx.connect). Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **nomi** (`names`) | lista | I nomi dei bucket, per esempio `["casa", "sensori", "_monitoring"]`. |
| **bucket** (`buckets`) | lista | Nascosta. I bucket per esteso: una lista di oggetti `{ "name": "casa", "id": "0a1b…", "type": "user", "retentionSeconds": 0 }`. Con 1.x e 3.x `id`, `type` e `retentionSeconds` sono `null`. |
| **Exception** (`error`) | oggetto | Quando la richiesta non riesce: connessione mancante, token senza permesso, quota finita… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Impostazioni

Questo blocco non ha impostazioni.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

Quando arriva un valore su **esegui**, il blocco chiede l'elenco al server, nel modo adatto alla versione:

1. **InfluxDB 2.x**: legge i bucket dell'organizzazione della connessione, cento alla volta (`retentionSeconds` è la durata di conservazione in secondi, 0 se infinita).
2. Se il server non ha quell'API (3.x), chiede l'elenco dei **database** di InfluxDB 3.
3. Se non c'è nemmeno quello (1.x), esegue `SHOW DATABASES` con InfluxQL.

Escono al massimo tanti elementi quanti sono le righe massime del modulo (10000 di serie).

## Esempi

### 1. Riempire una selezione con i bucket

```
[InfluxDB · Connessione (connect)] connessione ──▶ connessione [InfluxDB · Bucket (elenco)] nomi ──▶ opzioni [Selezione: bucket]
[Intervallo (setInterval): 600 s] impulso ──▶ esegui
```

La [Selezione](ui.select) mostra i nomi dei bucket, aggiornati ogni 10 minuti.

### 2. Controllare che un bucket esista

```
[InfluxDB · Bucket (elenco)] nomi ──▶ oggetto [Get proprietà (obj.campo): 0] valore ──▶ a [Confronto (== ≠ < >): a = b] se falso ──▶ invia [Notify: "Il primo bucket non è casa"]
```

[Get proprietà (obj.campo)](core.get) prende il primo nome dell'elenco e [Confronto (== ≠ < >)](core.compare) lo confronta con `casa` (b); se è diverso, [Notify](lilos.notify) avvisa prima che una scrittura dia errore.

## Errori

| Messaggio | Quando |
|---|---|
| InfluxDB ha risposto 401 (token o password non validi): … | Il token è sbagliato (anche 403: il token non ha il permesso di leggere i bucket). |
| InfluxDB ha risposto 404 (non trovato): … | L'organizzazione non esiste. |
| Errore della query InfluxQL: … | Con 1.x, `SHOW DATABASES` non è permesso a quell'utente. |

Gli errori comuni (connessione, rete, quote) sono nella pagina [Blocchi InfluxDB](logicstudio-influxdb).

## Vedi anche

- [InfluxDB · Connessione (connect)](influx.connect), [InfluxDB · Scrivi punto (write)](influx.write), [InfluxDB · Query (Flux · InfluxQL · SQL)](influx.query)
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
