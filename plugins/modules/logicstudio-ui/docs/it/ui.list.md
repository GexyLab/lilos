# Elenco

`ui.list` · Comandi · [Componenti UI standard](logicstudio-ui) · versione 1

Un elenco di voci sempre aperto, in un riquadro che scorre: l'utente fa clic su una voce per sceglierla. A differenza della [Selezione](ui.select), all'inizio non c'è nessuna voce scelta, e ogni clic manda la voce, anche se è la stessa di prima.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra l'elenco. |
| **Voci (separate da virgola)** | testo (traducibile) | vuoto | Le voci, nell'ordine: `Pane, Latte, Uova`. Gli spazi intorno alle virgole si tolgono; le voci vuote si saltano. |
| **Altezza (px)** | da 40 a 1200 | 140 | L'altezza del riquadro. Le voci in più scorrono. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **voci** (`items`) | lista | Sostituisce le voci. |
| **scelto** (`value`) | qualsiasi | Evidenzia la voce con quel valore, senza che l'elenco mandi niente. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e non si può più scegliere. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **scelto** (`value`) | qualsiasi | Il valore della voce, ogni volta che l'utente ne sceglie una. È sempre un testo. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

**Le voci** si scrivono e si mandano come le opzioni dei [Pulsanti di opzione](ui.radios): una lista di testi, una lista di oggetti `{ "value": …, "label": … }` (si vede `label`, esce `value`), o un testo con le virgole. **Il valore che esce è sempre un testo**, anche se le voci erano numeri: la voce `3` manda `"3"`. Un oggetto senza `value` né `label` diventa una voce «undefined».

**Scegliere.**

- **Clic** su una voce: la evidenzia e la manda su **scelto**. Un altro clic sulla stessa voce la manda di nuovo.
- **Tastiera**, con l'elenco in primo piano: **freccia giù** sceglie la voce successiva, **freccia su** la precedente, e ogni pressione la manda. Se non c'è ancora una scelta, tutte e due scelgono la prima voce. Sull'ultima voce, **freccia giù** la manda di nuovo.
- All'apertura nessuna voce è scelta e l'elenco non manda niente.

**Dallo schema.**

- **scelto**: evidenzia la voce con quel valore (confrontato come testo). Se nessuna voce lo ha, nessuna resta evidenziata.
- **voci**: sostituisce l'elenco. Se la voce scelta c'è ancora (stesso valore), resta evidenziata.

Con molte voci il riquadro scorre con la rotella; scegliendo con le frecce, però, l'elenco **non scorre da solo** fino alla voce scelta: oltre il bordo del riquadro la voce scelta non si vede.

## Esempi

### 1. Un elenco della spesa

```
Finestra «Spesa»
└ Colonna (radice)
  ├ Elenco     list1   Etichetta «Prodotti»  Voci «Pane, Latte, Uova, Frutta»  Altezza 120
  └ Etichetta  label1  Testo «Scegli un prodotto»
```

```
[Elenco: Prodotti] scelto ──▶ prodotto [Formatta testo: «Hai scelto: {prodotto}»] testo ──▶ testo [Etichetta: label1]
```

Un clic su «Latte» fa dire all'etichetta «Hai scelto: Latte».

### 2. Le note di una cartella

```
Finestra «Note»
└ Colonna (radice)
  ├ Elenco     list1   Etichetta «Le tue note»  Altezza 200
  └ Etichetta  label1  Testo «»
```

```
[All'avvio] impulso ──▶ leggi [Elenca cartella: ~/Note  mostra file] nomi ──▶ voci [Elenco: Le tue note]
[Elenco: Le tue note] scelto ──▶ nome [Formatta testo: «~/Note/{nome}»] testo ──▶ percorso [Leggi file] contenuto ──▶ testo [Etichetta: label1]
```

All'avvio l'elenco si riempie con i nomi dei file della cartella. Un clic su una nota la legge e l'etichetta ne mostra il contenuto. Nel [Leggi file](lilos.fileRead) accendi «lo avvia» sull'ingresso **percorso** (di serie è spento), così il blocco legge il file appena arriva il percorso. Con le frecce l'utente scorre le note una dopo l'altra, e ognuna viene letta.

### 3. Voci con un codice

```
[Valore: JSON] valore ──▶ voci [Elenco: Reparti]
[Elenco: Reparti] scelto ──▶ valore [Scrivi in console]
```

Il [Valore](core.value), di tipo JSON, contiene `[{"value":"A1","label":"Amministrazione"},{"value":"M2","label":"Magazzino"}]`. L'elenco mostra «Amministrazione» e «Magazzino»; un clic su «Magazzino» scrive `M2` nella console. Per evidenziare una voce dallo schema, manda `"M2"` (il valore, non il testo) su **scelto**.

## Accessibilità e tastiera

- L'elenco si raggiunge con **Tab** (un bordo colorato mostra che è in primo piano); **freccia su/giù** cambiano la scelta. **Home**, **Fine** e le lettere non fanno niente. Le singole voci non si raggiungono con Tab.
- Per i lettori di schermo l'elenco è una «casella di riepilogo» con le sue opzioni, e la voce scelta è segnata come selezionata; ma il fuoco resta sull'elenco intero, quindi spostandosi con le frecce il lettore di schermo può non annunciare la nuova voce.
- L'**Etichetta** sopra non è collegata all'elenco.

## Vedi anche

- [Selezione](ui.select), [Pulsanti di opzione](ui.radios)
- [Tabella](ui.table), per righe con più colonne
- [Componenti UI standard](logicstudio-ui)
