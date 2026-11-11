# Redis · Hash: scrivi campi (HSET)

`redis.hset` · Database · [Blocchi Redis](logicstudio-redis) · versione 1

Scrive i campi di un oggetto in un **hash**. Ogni ingresso aggiunto è un campo, con il suo nome: puoi comporre l'hash senza scrivere JSON.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **esegui** (`run`) | impulso | Qualsiasi valore che arriva qui fa partire l'operazione. |
| **connessione** (`connection`) | oggetto | Il riferimento di un blocco [Redis · Connessione (connect)](redis.connect). Non avvia il blocco. |
| **chiave** (`key`) | testo | La chiave. Se ha un valore non vuoto, prende il posto della **Chiave** delle impostazioni. Non avvia il blocco. |
| **campi** (`fields`) | oggetto | Un oggetto `{ "campo": valore }` con i campi da scrivere. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **campi nuovi** (`added`) | numero | Quanti campi sono stati creati (quelli che c'erano già e sono stati sovrascritti non contano). |
| **Exception** (`error`) | oggetto | Quando la scrittura non riesce: connessione mancante o chiusa, chiave mancante, nessun campo, la chiave non è un hash, tempo scaduto… |

Le porte nascoste si mostrano con l'**occhio** nelle **Proprietà**.

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 16 ingressi di tipo qualsiasi (anche meno, se il limite generale del motore sulle porte aggiunte è più basso: vedi [Limiti](logicstudio-engine/limits)). Ogni ingresso aggiunto è un **campo dell'hash**: si chiama **campo 1**… e va **rinominato** con il nome del campo, per esempio `nome` o `eta`.

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non fa partire la scrittura. Il blocco parte solo con **esegui**. Vedi [Come funziona un blocco](ide/blocks).

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Chiave** (`key`) | testo | vuoto | La chiave, quando l'ingresso **chiave** non ha un valore. Al massimo 10000 caratteri. |
| **JSON (scrivi con JSON.stringify, leggi con JSON.parse)** (`json`) | sì / no | no | Vedi «I valori» sotto e nella pagina [Blocchi Redis](logicstudio-redis). |

## Come funziona

Quando arriva un valore su **esegui**, il blocco scrive i campi con `HSET chiave campo valore [campo valore …]`.

- I campi sono quelli dell'oggetto sull'ingresso **campi**, più gli ingressi aggiunti che hanno un valore (se un campo c'è in tutti e due, vale l'ingresso aggiunto). Un ingresso aggiunto che non ha ancora ricevuto un valore non conta.
- Senza nessun campo c'è un errore.
- Gli altri campi dell'hash restano come sono: si scrivono solo quelli indicati.
- **I valori che scrivi**: senza l'opzione **JSON** un testo resta un testo, numeri e sì/no diventano testo (`5`, `true`), `null` il testo vuoto, un oggetto o una lista sono scritti come testo JSON. Con **JSON** spuntato, qualsiasi valore (anche un testo) è scritto con `JSON.stringify`.

## Esempi

### 1. Salvare un profilo

**Chiave** `utente:1`. Aggiungi due ingressi e chiamali `nome` e `eta`.

```
[Campo di testo: nome] testo ──▶ nome [Redis · Hash: scrivi campi (HSET)] campi nuovi ──▶ valore [Print (console.log)]
[Campo numerico: eta] valore ──▶ eta
[Pulsante: Salva] premuto ──▶ esegui
```

Premendo **Salva** l'hash `utente:1` riceve `nome` ed `eta` (come testo). La prima volta **campi nuovi** è 2; le volte dopo 0, perché i campi ci sono già.

### 2. Un oggetto intero

```
[Oggetto { }: stato, ora] oggetto ──▶ campi [Redis · Hash: scrivi campi (HSET): serra]
```

Con [Oggetto { }](core.compose) prepari `{"stato": "ok", "ora": "10:05"}` e il blocco lo scrive come hash. Con **JSON** spuntato ogni valore è scritto in JSON, così un campo che è un oggetto o un numero torna tale con [Redis · Hash: leggi (HGET · HGETALL)](redis.hget) e **JSON**.

## Errori

I messaggi sono in italiano, come li manda il blocco; i messaggi del server Redis sono nella lingua del server (inglese), su una riga. Gli errori di connessione, di rete e di quota più comuni (connessione mancante o chiusa, indirizzo non permesso, «Questo è il database di lilOS: i blocchi non possono usarlo», troppe operazioni…) sono elencati nella pagina [Blocchi Redis](logicstudio-redis). In più:

| Messaggio | Quando |
|---|---|
| Manca la chiave | **Chiave** è vuota e l'ingresso **chiave** non ha un valore. |
| Chiave troppo lunga | La chiave supera 10000 caratteri. |
| Mancano i campi da scrivere: un oggetto { "campo": valore } o gli ingressi aggiunti | Non c'è nessun campo da scrivere. |
| Troppi campi (al massimo 5000) | Più di 5000 campi in una volta. |
| La chiave contiene un altro tipo di valore (testo, hash, lista…): usa il blocco giusto per quel tipo | La chiave esiste ma è di un altro tipo (il server dice `WRONGTYPE`). |
| Redis non ha risposto in 30 s | Il comando ha superato il tempo massimo di un'operazione. |
| ERR … / altri messaggi del server | Il server rifiuta il comando (per esempio `ERR value is not an integer or out of range`): il messaggio è del server, in inglese. |

## Vedi anche

- [Redis · Hash: leggi (HGET · HGETALL)](redis.hget), per rileggere i campi
- [Oggetto { }](core.compose), per preparare i campi
- [Blocchi Redis](logicstudio-redis), per i valori, i limiti, le quote e le impostazioni del modulo
- [Limiti](logicstudio-engine/limits), [Come funziona un blocco](ide/blocks)
