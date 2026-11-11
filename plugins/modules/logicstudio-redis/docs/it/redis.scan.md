# Redis · Cerca chiavi (SCAN)

`redis.scan` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Elenca le **chiavi** che corrispondono a un modello (come `utente:*`), anche di un solo tipo, fino al limite del modulo. Usa `SCAN` a pezzi e **mai** `KEYS`, che bloccherebbe il server.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **modello** (`match`) | testo | Il modello. Se ha un valore non vuoto, prende il posto del **Modello** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **chiavi** (`keys`) | lista | Le chiavi trovate, come lista di testi, senza ripetizioni e in nessun ordine preciso. |
| **troncato** (`truncated`) | sì/no | Nascosta. `true` se ci sono altre chiavi oltre il massimo e non sono uscite. |
| **Exception** (`error`) | oggetto | Quando la ricerca non riesce: connessione mancante o chiusa, modello non valido, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Questo blocco non ha porte aggiuntive.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Modello (MATCH, * = qualsiasi testo)** (`match`) | testo | `*` | Il modello delle chiavi: `*` qualsiasi testo, `?` un carattere, `[ab]` uno dei due, `\*` un asterisco vero. Per esempio `utente:*`, `cache:2026-*`. |
| **Tipo** (`type`) | Qualsiasi, Testo (string), Hash, Lista, Insieme (set), Insieme ordinato (zset), Stream | Qualsiasi | Cerca solo le chiavi di quel tipo (serve Redis 6 o successivo). |
| **Al massimo (0 = il limite del modulo)** (`max`) | numero intero da 0 | 0 | Quante chiavi cercare al massimo. 0: il limite del modulo (10000 di serie). Non può superare quel limite. |

## Come funziona

Quando arriva un valore su **esegui**, il blocco passa in rassegna le chiavi con `SCAN cursore MATCH modello COUNT 1000 [TYPE tipo]`, un pezzo alla volta, finché ne ha trovate abbastanza o ha finito.

- **Senza blocchi del server**: `SCAN` non ferma Redis come `KEYS`, anche con milioni di chiavi. Per lo stesso motivo non c'è garanzia sull'ordine, e le chiavi create o eliminate mentre cerca possono esserci o no.
- **Il limite**: al massimo le chiavi di **Al massimo** (non più del limite del modulo, 10000 di serie). Se il database ha altre chiavi che corrispondono, **troncato** è `true`.
- Una ricerca su un database enorme può durare: ha il tempo massimo di un'operazione (30 secondi di serie), poi si ferma con **troncato** `true` o con un errore di tempo.
- Il modello `*` (di serie) trova tutto: usalo solo su database piccoli o con **Al massimo**.
- Il blocco dà solo i nomi delle chiavi: per i valori usa [Redis · Leggi (GET)](redis.get) per ogni chiave.

## Esempi

### 1. Le sessioni attive

**Modello** `sessione:*`.

```
[Redis · Cerca chiavi (SCAN)] chiavi ──▶ righe [Tabella]
[Pulsante: Cerca] premuto ──▶ esegui
```

La [Tabella](ui.table) mostra i nomi delle chiavi `sessione:…`.

### 2. Solo gli hash di un tipo

**Modello** `utente:*`, **Tipo** «Hash», **Al massimo** 100.

```
[Redis · Cerca chiavi (SCAN)] chiavi ──▶ valore [Print (console.log)]
                              troncato ──▶ valore [Valore: ce ne sono altre]
```

Le prime 100 chiavi `utente:…` che sono hash; **troncato** dice se ce ne sono altre.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Massimo non valido: … | **Al massimo** non è un numero intero tra 1 e 1000000 (o 0). |
| Modello troppo lungo | Il modello supera 10000 caratteri. |
| Risultato troppo grande (… KB, al massimo … KB): chiedi meno righe o colonne | Il risultato supera la dimensione massima. |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Leggi (GET)](redis.get), [Redis · Hash: leggi (HGET · HGETALL)](redis.hget), per i valori delle chiavi trovate
- [Redis · Elimina (DEL)](redis.del), per eliminare le chiavi trovate
- [Redis · Comando (call)](redis.command), per gli altri comandi (`KEYS` è rifiutato)
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
