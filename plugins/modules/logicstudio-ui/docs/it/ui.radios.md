# Pulsanti di opzione

`ui.radios` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un gruppo di opzioni una sotto l'altra, ognuna con il suo pallino: l'utente ne sceglie una. Va bene per poche scelte (da 2 a 5 circa), tutte da vedere insieme.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra il gruppo. |
| **Opzioni (separate da virgola)** | testo (traducibile) | «Uno, Due» | Le opzioni, nell'ordine: `Piccola, Media, Grande`. Gli spazi intorno alle virgole si tolgono; le voci vuote si saltano. |
| **Scelta all'inizio** | testo | vuoto | L'opzione scelta quando la finestra si apre. Deve essere scritta come nelle Opzioni. Vuoto: nessuna scelta. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | testo | Sceglie l'opzione con quel valore, senza che il gruppo mandi niente. |
| **opzioni** (`options`) | lista | Sostituisce le opzioni. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e non si può più scegliere. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | testo | Quando l'utente sceglie un'opzione: il suo valore. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**Le opzioni.** Ogni opzione ha un **valore** (quello che va allo schema) e un **testo** (quello che si vede). Con le opzioni scritte nelle Proprietà, valore e testo sono uguali. Sull'ingresso **opzioni** puoi mandare:

| Arriva | Opzioni |
|---|---|
| una lista di testi `["Rosso", "Verde"]` | valore e testo uguali |
| una lista di oggetti `[{ "value": "r", "label": "Rosso" }]` | valore `r`, si vede «Rosso» |
| un oggetto con solo `value` o solo `label` | quello che c'è vale per tutti e due |
| un testo `"Rosso, Verde"` | come nelle Proprietà: diviso alle virgole |
| numeri `[1, 2, 3]` | valori `"1"`, `"2"`, `"3"` (diventano testo) |

Nelle liste, a differenza del testo con le virgole, anche le voci vuote diventano opzioni. Un oggetto senza `value` né `label` diventa un'opzione «undefined».

**Il valore che esce è sempre un testo**, anche se le opzioni erano numeri: con le opzioni `[1, 2, 3]` la scelta della seconda manda `"2"`. Se ti serve un numero, usa [Cast (converti tipo)](core.convert) **In** numero.

**Scegliere.** L'utente sceglie con un clic sul pallino o sul testo; con la tastiera, le **frecce** passano all'opzione successiva o precedente **e la scelgono**: ogni pressione di una freccia manda un valore. Scegliere di nuovo l'opzione già scelta non manda niente.

**Dallo schema.** Un valore su **valore** sceglie l'opzione che ha quel valore (confrontato come testo: il numero `2` sceglie l'opzione `"2"`). Se nessuna opzione ha quel valore, nessuna risulta scelta. Quando arrivano nuove **opzioni**, resta scelta quella con lo stesso valore di prima, se c'è ancora.

**All'apertura** si vede la **Scelta all'inizio**, ma il programma non la riceve: il gruppo manda qualcosa solo quando l'utente sceglie.

Le opzioni scritte nelle Proprietà si traducono come un solo testo (tutta la riga con le virgole); le opzioni mandate dallo schema non si traducono.

## Esempi

### 1. La taglia di un ordine

```
Finestra «Ordine»
└ Colonna (radice)
  ├ Pulsanti di opzione  radios1  Etichetta «Taglia»  Opzioni «S, M, L, XL»  Scelta all'inizio «M»
  └ Valore               value1   Etichetta «Prezzo:»  Unità «€»  Decimali 2
```

Aggiungi al blocco [Switch · Case](core.switch) le uscite **S**, **M**, **L**, **XL**:

```
[Pulsanti di opzione: Taglia] valore ──▶ valore [Switch · Case] S  ──▶ invia [Costante · Variabile: 9]  valore ──▶ valore [Valore: Prezzo:]
                                                       M  ──▶ invia [Costante · Variabile: 10] valore ──▶ valore
                                                       L  ──▶ invia [Costante · Variabile: 11] valore ──▶ valore
                                                       XL ──▶ invia [Costante · Variabile: 12] valore ──▶ valore
```

Scegliendo **L**, il prezzo diventa «11,00 €». (Il prezzo di M non si vede finché l'utente non sceglie qualcosa: per mostrarlo subito, collega un blocco [All'avvio (main)](core.onStart) anche all'ingresso **invia** del blocco che manda 10.)

### 2. Opzioni con un codice

Lo schema dà le opzioni all'avvio, con un codice diverso dal testo:

```
[Costante · Variabile: JSON] valore ──▶ opzioni [Pulsanti di opzione: Spedizione]
[Pulsanti di opzione: Spedizione] valore ──▶ valore [Print (console.log)]
```

Il blocco [Costante · Variabile](core.value), di tipo JSON, contiene `[{"value":"std","label":"Standard (3-5 giorni)"},{"value":"exp","label":"Espresso (24 ore)"}]`. L'utente vede i due testi lunghi; scegliendo «Espresso (24 ore)» la console scrive `exp`.

## Accessibilità e tastiera

- Le opzioni sono pulsanti di opzione veri, con il loro testo collegato: **Tab** entra nel gruppo (sull'opzione scelta), le **frecce** si muovono tra le opzioni e le scelgono, **Tab** esce dal gruppo.
- L'**Etichetta** sopra il gruppo non è collegata al gruppo: il lettore di schermo legge le opzioni ma non il nome del gruppo.
- Quando lo schema manda un valore o nuove opzioni, il gruppo viene ridisegnato e, se aveva il fuoco della tastiera, lo perde.

## Vedi anche

- [Selezione](ui.select), per molte opzioni in poco spazio
- [Elenco](ui.list), per un elenco sempre aperto
- [Switch · Case](core.switch), per fare cose diverse secondo la scelta
- [Componenti UI standard](logicstudio-ui)
