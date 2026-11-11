# Return (uscita di schema)

`core.schemaOut` · Porte di schema · [Blocchi di base](logicstudio-core) · versione 1

Dà allo schema una **porta d'uscita**: i valori che arrivano a questo blocco vanno, attraverso i collegamenti della mappa del progetto, ai blocchi Parametro (ingresso di schema) degli altri schemi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | quello scelto in **Tipo** | Il valore da mandare fuori dallo schema. |

## Uscite

Nessuna sul blocco: i valori escono dalla porta dello schema, nella mappa. Questo blocco non ha l'uscita **Exception**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Nome della porta** (`port`) | un testo | `uscita` | Il nome della porta dello schema, come si vede nella mappa e nelle Proprietà dello schema. |
| **Tipo** (`type`) | qualsiasi, numero, sì/no, testo, oggetto, lista, impulso | qualsiasi | Il tipo della porta: il colore del pallino e il controllo dei tipi nei collegamenti. |
| **Descrizione** (`description`) | un testo | vuoto | Una nota per te, su cosa esce da questa porta. |

## Come funziona

Ogni volta che arriva un valore su **valore**, il blocco lo manda, **senza cambiarlo**, a tutti i blocchi [Parametro (ingresso di schema)](core.schemaIn) collegati a questa porta nella **Mappa** del progetto. Vedi [Gli schemi](ide/schemas).

- Una porta può andare a **più Ingressi**, anche di schemi diversi: ognuno riceve lo stesso valore.
- Se la porta **non è collegata** nella mappa, i valori non vanno da nessuna parte (e non è un errore). Nell'IDE, in Prova, vedi lo stesso il valore arrivare sul blocco.
- In uno **schema aperto da solo** (senza progetto) i valori non vanno da nessuna parte.
- Il **Tipo** serve solo all'IDE: il motore non controlla e non converte il valore.
- Valgono le solite regole degli ingressi: se togli **lo avvia** da **valore**, il blocco non manda mai niente; un **valore iniziale** viene mandato all'avvio del programma.
- Due blocchi Return con **lo stesso nome** nello stesso schema sono la stessa porta: i valori di tutte e due escono da lì.
- **Rinominare** la porta nelle Proprietà sposta anche i collegamenti del progetto che la usano.
- Nelle Proprietà, **Collegamenti nel progetto** elenca dove vanno i valori, con **Scollega**; **Nella mappa** apre la mappa.
- Sul foglio il titolo del blocco è sempre il **nome della porta** (nelle Proprietà non c'è il campo **Etichetta**).

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un totale per un altro schema

Nello schema **calcoli**:

```
[Somma (+)] risultato ──▶ valore [Return (uscita di schema): totale, numero]
```

Nella mappa collega **calcoli › totale** a **interfaccia › totale**. Nello schema **interfaccia** un blocco [Parametro (ingresso di schema)](core.schemaIn) **totale** lo manda a un [Valore](ui.value) della finestra.

### 2. Una sola uscita, due destinazioni

Collega **sensori › allarme** sia a **notifiche › allarme** sia a **registro › evento**. Ogni valore mandato all'Uscita **allarme** arriva a tutti e due gli schemi: uno manda una [Notify](lilos.notify), l'altro scrive una riga con [appendFile](lilos.fileAppend).

### 3. Le eccezioni di uno schema raccolte da un altro

```
[HTTP (fetch)] Exception ──▶ valore [Return (uscita di schema): errori, oggetto]
[readFile]    Exception ──▶ valore
```

Due collegamenti arrivano allo stesso ingresso **valore**. Nella mappa colleghi **errori** a uno schema che li scrive tutti in una console **Errori** con [Print (console.log)](core.consoleWrite).

## Errori

| Messaggio | Quando |
|---|---|
| Una porta di schema non ha nome | Nel pannello **Problemi**, prima della Prova: il **Nome della porta** è vuoto. |
| Collegamento del progetto: lo schema *nome* non ha l'uscita «*porta*» | Il programma non parte: un collegamento della mappa parte da una porta che non c'è più. |

## Vedi anche

- [Parametro (ingresso di schema)](core.schemaIn)
- [Gli schemi](ide/schemas) e [I collegamenti](ide/links)
- [Come funziona un blocco](ide/blocks)
