# Selezione

`ui.select` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un menu a tendina: si vede la scelta fatta, e un clic apre l'elenco delle opzioni. Va bene per molte scelte in poco spazio.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra il menu. |
| **Opzioni (separate da virgola)** | testo (traducibile) | «Uno, Due» | Le opzioni, nell'ordine: `Milano, Roma, Napoli`. Gli spazi intorno alle virgole si tolgono; le voci vuote si saltano. |
| **Scelta all'inizio** | testo | vuoto | L'opzione mostrata quando la finestra si apre, scritta come nelle Opzioni. Vuoto: la **prima** opzione. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | testo | Mostra l'opzione con quel valore, senza che la Selezione mandi niente. |
| **opzioni** (`options`) | lista | Sostituisce le opzioni. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara e non si può più aprire. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | testo | Quando l'utente sceglie un'opzione **diversa** da quella mostrata: il suo valore. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**Le opzioni** si scrivono e si mandano come nei [Pulsanti di opzione](ui.radios): una lista di testi, una lista di oggetti `{ "value": …, "label": … }` (si vede `label`, va allo schema `value`), o un testo con le virgole. I numeri diventano testo. **Il valore che esce è sempre un testo.**

**La Selezione mostra sempre un'opzione.** Senza **Scelta all'inizio** mostra la prima. Questo ha una conseguenza importante:

> **Scegliere l'opzione già mostrata non manda niente.** Se all'apertura si vede «Milano» e l'utente la vuole, non c'è modo di mandarla: la Selezione manda qualcosa solo quando la scelta **cambia**. Se lo schema deve sapere la scelta anche quando l'utente non la cambia, o dagli lo stesso valore iniziale con un blocco [Costante · Variabile](core.value), o metti come prima opzione un invito come `— scegli —` e controlla nello schema che non sia quello.

**Dallo schema.** Un valore su **valore** mostra l'opzione con quel valore (confrontato come testo). Se nessuna opzione ha quel valore, il menu mostra la prima opzione, anche se lo schema ne aveva chiesta un'altra. Quando arrivano nuove **opzioni**, resta mostrata quella con lo stesso valore di prima, se c'è ancora, altrimenti la prima.

**All'apertura** il programma non riceve niente.

## Esempi

### 1. Scegliere una città

```
Finestra «Meteo»
└ Colonna (radice)
  ├ Selezione  select1  Etichetta «Città»  Opzioni «— scegli —, Milano, Roma, Napoli»
  └ Etichetta  label1   Testo «»
```

```
[Selezione: Città] valore ──▶ a [Confronto (== ≠ < >): a ≠ b] risultato ──▶ condizione [If · Else] allora ──▶ nome [Template (formatta): «Hai scelto {nome}»] testo ──▶ testo [Etichetta: label1]
[Costante · Variabile: «— scegli —»] valore ──▶ b [Confronto (== ≠ < >)]
[Selezione: Città] valore ──▶ valore [If · Else]
```

Nel blocco [If · Else](core.if) togli «lo avvia» da **valore**: il blocco parte quando arriva la condizione, con l'ultima città scelta. All'apertura si vede «— scegli —». Scegliendo «Roma» l'etichetta dice «Hai scelto Roma»; se l'utente torna a «— scegli —», il blocco [Confronto (== ≠ < >)](core.compare) dà `false` e l'etichetta non cambia.

### 2. Le opzioni da una cartella

```
Finestra «Apri»
└ Colonna (radice)
  ├ Selezione  select1  Etichetta «Rapporto»  Opzioni «»
  └ Pulsante   button1  Testo «Apri»
```

```
[All'avvio (main)] impulso ──▶ leggi [readdir (elenca cartella): ~/Rapporti  mostra file] nomi ──▶ opzioni [Selezione: Rapporto]
[Selezione: Rapporto] valore ──▶ nome [Template (formatta): «~/Rapporti/{nome}»] testo ──▶ percorso [readFile]
[Pulsante: Apri] premuto ──▶ leggi [readFile]
```

All'avvio la Selezione si riempie con i nomi dei file della cartella. Nel [readFile](lilos.fileRead) l'ingresso **percorso** non avvia il blocco (è così di serie): il file si legge quando l'utente preme **Apri**.

> Attenzione: se l'utente preme **Apri** senza cambiare la Selezione, il percorso non è ancora arrivato (vedi sopra). Per evitarlo, metti in testa alle opzioni un invito, oppure usa un [Elenco](ui.list), che non mostra nessuna scelta finché l'utente non ne fa una.

## Accessibilità e tastiera

- È un menu a tendina vero: si raggiunge con **Tab**; le **frecce** cambiano la scelta (e ogni cambio manda il valore), **Alt+freccia giù** o **Spazio** apre l'elenco, le lettere saltano all'opzione che comincia così. Il comportamento preciso dipende dal browser.
- L'**Etichetta** sopra non è collegata al menu: il lettore di schermo legge la scelta ma non il nome del campo.
- Quando lo schema manda un valore o nuove opzioni, il menu viene ridisegnato e, se aveva il fuoco della tastiera, lo perde.

## Vedi anche

- [Pulsanti di opzione](ui.radios), [Elenco](ui.list)
- [Switch · Case](core.switch)
- [Componenti UI standard](logicstudio-ui)
