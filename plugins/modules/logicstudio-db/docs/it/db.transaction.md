# SQL · Transazione (BEGIN · COMMIT · ROLLBACK)

`db.transaction` · Database · [Blocchi database (SQL)](logicstudio-db) · versione 1

Apre una **transazione** su una connessione: più scritture che valgono tutte insieme o nessuna. Il blocco manda un riferimento dall'uscita **transazione**; lo colleghi all'ingresso **connessione** dei blocchi che devono stare dentro (al posto del riferimento della connessione), e poi **confermi** o **annulli**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **inizia** (`begin`) | impulso | Apre la transazione sulla connessione e manda **transazione**. |
| **conferma** (`commit`) | impulso | Conferma: le modifiche fatte dentro diventano definitive. Manda **confermata**. |
| **annulla** (`rollback`) | impulso | Annulla: le modifiche fatte dentro spariscono. Manda **annullata**. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco di connessione. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **transazione** (`transaction`) | oggetto | Il riferimento della transazione aperta. Si collega all'ingresso **connessione** dei blocchi che devono stare dentro. |
| **confermata** (`committed`) | impulso | Un impulso quando la transazione è stata confermata. |
| **annullata** (`rolledBack`) | impulso | Un impulso quando la transazione è stata annullata da **annulla**. |
| **Exception** (`error`) | oggetto | Quando la transazione non si apre o non si chiude: una transazione già aperta, nessuna transazione aperta, connessione chiusa, database che non le ha (ClickHouse)… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Livello di isolamento** (`isolation`) | Quello del database, Read uncommitted, Read committed, Repeatable read, Serializable, Snapshot (SQL Server) | Quello del database | Quanto la transazione è separata da quello che fanno gli altri nello stesso momento. Ogni database conosce solo alcuni livelli (vedi sotto). |
| **Annullata da sola dopo (secondi)** (`timeoutSeconds`) | da 1 a 600 | 60 | Se non confermi né annulli in questo tempo, la transazione si annulla da sola. |

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Come funziona

1. **inizia** apre la transazione sulla connessione e manda **transazione**. Se il blocco ha già una transazione aperta, dà errore.
2. Colleghi **transazione** all'ingresso **connessione** di [SQL · Query (query)](db.query), [SQL · Inserisci (INSERT)](db.insert), [SQL · Aggiorna (UPDATE)](db.update), [SQL · Elimina (DELETE)](db.delete) o [SQL · Tabelle e colonne (schema)](db.tables): le loro istruzioni girano dentro la transazione. I blocchi collegati alla connessione normale restano fuori.
3. **conferma** rende definitive le modifiche e manda **confermata**; **annulla** le cancella e manda **annullata**. Poi il blocco può iniziarne un'altra.

### Quando la transazione si annulla da sola

- dopo **Annullata da sola dopo (secondi)** (60 di serie, al massimo 600), per non lasciare una transazione aperta che blocca altri;
- quando il programma si ferma, o quando il blocco ricomincia (per esempio se modifichi lo schema);
- quando la connessione si chiude.

Una **conferma** che arriva dopo l'annullamento automatico dà l'errore «Connessione chiusa (o di un altro programma)…» (la transazione non c'è più).

### Cosa tiene occupato

- Una transazione tiene per sé **una connessione del pool** (per SQLite, tutto il database: gli altri blocchi aspettano) finché non finisce. Non lasciarla aperta più del necessario.
- I blocchi collegati alla connessione normale continuano a usare le altre connessioni del pool e **non vedono** le modifiche non ancora confermate.
- Non si possono aprire transazioni dentro una transazione: **inizia** vuole la connessione, non il riferimento di un'altra transazione. Un [SQL · Scorri righe (cursor)](db.cursor) o un [SQL · Ascolta (LISTEN)](db.listen) usano la connessione, non la transazione.
- Le istruzioni di un blocco **[SQL · Inserisci (INSERT)](db.insert)** con molte righe, fuori da una transazione, si mettono da sole in una transazione (tutte o nessuna).

### I livelli di isolamento

| Livello | PostgreSQL | MySQL · MariaDB | SQL Server | Oracle | SQLite |
|---|---|---|---|---|---|
| Quello del database | sì | sì | sì | sì (Read committed) | sì |
| Read uncommitted | sì | sì | sì | come Read committed | come differita |
| Read committed | sì | sì | sì | sì | come differita |
| Repeatable read | sì | sì | sì | diventa Serializable | immediata |
| Serializable | sì | sì | sì | sì | immediata |
| Snapshot | ignorato | ignorato | sì | diventa Serializable | come differita |

«Differita» e «immediata» sono i `BEGIN DEFERRED` e `BEGIN IMMEDIATE` di SQLite. Una scelta che il database non conosce non dà errore: vale il suo livello di serie. **ClickHouse non ha transazioni**: **inizia** con una connessione ClickHouse dà l'errore «ClickHouse non annulla le modifiche: le transazioni non sono supportate».

## Esempi

### 1. Un bonifico: tutto o niente

Due blocchi [SQL · Aggiorna (UPDATE)](db.update), uno che toglie e uno che aggiunge, nella stessa transazione.

```
[Pulsante: Bonifico] premuto ──▶ inizia [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)] transazione ──▶ connessione [SQL · Aggiorna (UPDATE): conti (id = 1, saldo - 50)]
                                                                       transazione ──▶ connessione [SQL · Aggiorna (UPDATE): conti (id = 2, saldo + 50)]
[SQL · PostgreSQL (connect)] connessione ──▶ connessione (della Transazione)
[SQL · Aggiorna (UPDATE): conti (id = 2)] righe modificate ──▶ conferma
```

Quando il secondo aggiornamento ha finito, il suo impulso di **righe modificate** va a **conferma**. Se un aggiornamento dà errore e nessuno conferma, la transazione si annulla da sola allo scadere del tempo (o subito, se colleghi **Exception** ad **annulla**): o vanno a buon fine tutti e due, o nessuno.

### 2. Annullare se qualcosa va storto

```
[SQL · Aggiorna (UPDATE)] Exception ──▶ annulla [SQL · Transazione (BEGIN · COMMIT · ROLLBACK)] annullata ──▶ valore [Print (console.log): "annullato"]
                          righe modificate ──▶ conferma
```

Se l'aggiornamento dà errore, **Exception** manda l'impulso ad **annulla**; se riesce, **righe modificate** manda **conferma**.

### 3. Un riepilogo dentro la transazione

[SQL · Query (query)](db.query) con **transazione** vede anche le modifiche non confermate fatte dalla stessa transazione:

```
[SQL · Inserisci (INSERT): righe_ordine] righe inserite ──▶ esegui [SQL · Query (query): SELECT SUM(importo) FROM righe_ordine WHERE ordine = :ordine] valore ──▶ valore [Valore: totale provvisorio]
```

Se il totale non va bene, **annulla** cancella anche le righe inserite.

## Errori

| Messaggio | Quando |
|---|---|
| Una transazione è già aperta: confermala o annullala prima di iniziarne un'altra | **inizia** con una transazione già aperta in questo blocco. |
| Nessuna transazione aperta | **conferma** o **annulla** senza una transazione aperta (per esempio due **conferma** di fila). |
| Una transazione si apre su una connessione (non dentro un'altra transazione) | **connessione** ha il riferimento di una transazione, di un cursore o di un ascolto. |
| Serve una transazione (l'uscita «transazione» di Transazione) | Il riferimento non è di una transazione. |
| Connessione chiusa (o di un altro programma): riaprila con il blocco di connessione | La connessione (o la transazione) è stata chiusa. |
| Manca la connessione: collega l'uscita «connessione» del blocco di connessione all'ingresso «connessione» | L'ingresso **connessione** non ha un valore. |
| ClickHouse non annulla le modifiche: le transazioni non sono supportate | Connessione ClickHouse. |
| Troppe operazioni sul database: al massimo 600 al minuto | Hai superato le operazioni al minuto. |
| … (un messaggio del database) | Per esempio una scrittura che viola una regola: la transazione resta aperta finché non la annulli (o scade). |

## Vedi anche

- [SQL · Aggiorna (UPDATE)](db.update), [SQL · Inserisci (INSERT)](db.insert), [SQL · Elimina (DELETE)](db.delete), [SQL · Query (query)](db.query)
- [SQL · PostgreSQL (connect)](db.postgres), [SQL · SQLite (open)](db.sqlite)
- [Blocchi database (SQL)](logicstudio-db), [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
