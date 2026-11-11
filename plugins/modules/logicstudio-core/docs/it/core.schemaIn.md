# Ingresso di schema

`core.schemaIn` · Porte di schema · [Blocchi di base](logicstudio-core) · versione 1

Dà allo schema una **porta d'ingresso**: nella mappa del progetto, le Uscite di schema degli altri schemi si collegano a questa porta, e i valori che mandano escono da questo blocco.

## Ingressi

Nessuno: i valori arrivano dagli altri schemi, attraverso i collegamenti della mappa.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | quello scelto in **Tipo** | Ogni valore che arriva alla porta dello schema, così com'è. |

Questo blocco non ha l'uscita **Eccezione**.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Nome della porta** (`port`) | un testo | `ingresso` | Il nome della porta dello schema, come si vede nella mappa e nelle Proprietà dello schema. |
| **Tipo** (`type`) | qualsiasi, numero, sì/no, testo, oggetto, lista, impulso | qualsiasi | Il tipo della porta: il colore del pallino e il controllo dei tipi nei collegamenti. |
| **Descrizione** (`description`) | un testo | vuoto | Una nota per te, su cosa arriva da questa porta. |

## Come funziona

Gli schemi di un progetto si parlano **solo** attraverso le porte di schema. Uno schema manda con un'[Uscita di schema](core.schemaOut); nella **Mappa** colleghi quell'uscita alla porta di un altro schema; nell'altro schema l'**Ingresso di schema** con lo stesso nome manda il valore ai blocchi collegati. Vedi [Gli schemi](ide/schemas).

- Ogni valore che arriva esce subito su **valore**, **senza cambiarlo**: niente conversioni.
- Il **Tipo** serve solo all'IDE (il colore della porta e l'avviso sui collegamenti di tipo diverso, nello schema e nella mappa): il motore **non controlla e non converte** il valore. Se dichiari numero e arriva un testo, esce il testo.
- Una porta può ricevere da **più Uscite di schema** (più collegamenti nella mappa): ogni valore che arriva, da qualsiasi parte, esce.
- **Rinominare** la porta nelle Proprietà sposta anche i collegamenti del progetto che la usano: non si perdono.
- Nelle Proprietà del blocco, **Collegamenti nel progetto** elenca da dove arrivano i valori, con **Scollega** per togliere un collegamento; **Nella mappa** apre la mappa.
- In uno **schema aperto da solo** (senza progetto) la porta non riceve niente: l'IDE lo ricorda con «In un progetto, questa porta si collega agli altri schemi nella mappa.»
- Sul foglio il titolo del blocco è sempre il **nome della porta** (nelle Proprietà non c'è il campo **Etichetta**).

Cose da evitare:

- **Una porta senza nome**: il pannello **Problemi** segnala «Una porta di schema non ha nome».
- **Due Ingressi di schema con lo stesso nome nello stesso schema**: nella mappa sembrano una porta sola, ma i valori arrivano **solo a uno dei due** (l'ultimo aggiunto). Usa nomi diversi, oppure un Ingresso solo collegato a più blocchi.
- **Togliere** o rinominare un Ingresso di schema a mano nel file mentre un collegamento della mappa lo usa: il programma non parte, con l'errore «Collegamento del progetto: lo schema *nome* non ha l'ingresso «*porta*»».

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Due schemi: uno misura, l'altro mostra

Nello schema **misure**:

```
[Ogni… 2 s] impulso ──▶ più [Contatore] conteggio ──▶ valore [Uscita di schema: giri, numero]
```

Nello schema **vista**:

```
[Ingresso di schema: giri, numero] valore ──▶ valore [Scrivi in console]
```

Nella **Mappa** trascina dall'uscita **giri** di **misure** all'ingresso **giri** di **vista**. Ogni 2 secondi la console scrive 1, 2, 3…

### 2. Un ingresso, più fonti

Nella mappa collega a **vista › messaggi** sia **misure › allarmi** sia **rete › errori**: lo stesso Ingresso di schema **messaggi** manda a [Scrivi in console](core.consoleWrite) i valori di tutti e due gli schemi, nell'ordine in cui arrivano.

### 3. Un comando che arriva da un altro schema

```
[Ingresso di schema: avvia, impulso] valore ──▶ acceso [Ogni… 5 s]
```

Quando un altro schema manda qualcosa sulla sua Uscita collegata ad **avvia**, l'[Ogni…](core.every) di questo schema si accende (un impulso vale sì).

## Errori

| Messaggio | Quando |
|---|---|
| Una porta di schema non ha nome | Nel pannello **Problemi**, prima della Prova: il **Nome della porta** è vuoto. |
| Collegamento del progetto: lo schema *nome* non ha l'ingresso «*porta*» | Il programma non parte: un collegamento della mappa punta a una porta che non c'è più. |

## Vedi anche

- [Uscita di schema](core.schemaOut)
- [Gli schemi](ide/schemas) e [I collegamenti](ide/links)
- [Componente UI](core.component), l'altro modo in cui uno schema parla con l'esterno
- [Come funziona un blocco](ide/blocks)
