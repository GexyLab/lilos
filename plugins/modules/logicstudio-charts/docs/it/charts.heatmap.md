# Mappa di calore

`charts.heatmap` · Grafici · [Grafici](logicstudio-charts) · versione 1

Una **griglia** di caselle colorate: più il valore è alto, più il colore è intenso. Serve a vedere a colpo d'occhio dove si concentrano i valori in una tabella a due entrate: le ore del giorno per i giorni della settimana, i reparti per i mesi, le righe e le colonne di un magazzino.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno: le righe se la dividono. |
| **Unità** | testo | vuoto | Dopo il valore più alto della scala e dopo i valori nel riquadro. |
| **Decimali** | da 0 a 10 | vuoto | Le cifre dopo la virgola nella scala e nelle caselle. Vuoto: quante ne servono alla scala. |
| **Minimo (vuoto: automatico)** | numero | vuoto | Il valore del colore più chiaro. Vuoto: il valore più basso della griglia. |
| **Massimo (vuoto: automatico)** | numero | vuoto | Il valore del colore più intenso. Vuoto: il valore più alto della griglia. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |
| **Nomi delle righe (separati da virgola)** | testo (traducibile) | vuoto | Per esempio `Lun, Mar, Mer`. Valgono solo se i dati non hanno già i loro nomi. |
| **Nomi delle colonne (separati da virgola)** | testo (traducibile) | vuoto | Per esempio `8, 10, 12, 14`. Come sopra. |

La Mappa di calore non ha **Legenda**, **Colori** né **Punti tenuti per serie**: al posto della legenda c'è una **scala** in alto a destra (il minimo, una striscia di colore, il massimo).

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **griglia** (`grid`) | matrice | Tutti i valori. Sostituisce la griglia che c'era. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

Non ci sono **aggiungi punto** né **pulisci**: per cambiare una casella manda la griglia intera (per esempio dopo [Scrivi m[r][c]](coll.matSet)); per svuotarla manda `[]`.

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **cella scelta** (`picked`) | oggetto | La casella su cui chi guarda fa clic o preme **Invio**. |
| **Exception** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Come funziona

**Le forme della griglia**:

| Dati | Righe e colonne |
|---|---|
| una matrice `[[12, 14, 13], [9, 11, 15]]` | 2 righe, 3 colonne; i nomi vengono dalle proprietà, altrimenti sono 1, 2, 3… |
| `{"rows": ["Lun", "Mar"], "cols": ["8", "10", "12"], "values": [[12, 14, 13], [9, 11, 15]]}` | con i nomi nei dati (`columns` vale come `cols`) |
| serie, per esempio `{"Lun": [12, 14], "Mar": [9, 11]}` | ogni **serie** è una riga, ogni x una colonna: righe Lun e Mar, colonne «0» e «1» |
| un testo JSON di una di queste | come la forma che contiene |

> Con un oggetto di oggetti vale la regola di tutti i grafici: le chiavi esterne sono le **categorie** (qui diventano le colonne) e quelle interne le **serie** (le righe). `{"Lun": {"8": 12, "10": 14}, "Mar": {"8": 9, "10": 11}}` dà quindi due righe, «8» e «10», e due colonne, «Lun» e «Mar»: la griglia esce girata. Per avere i giorni come righe usa la forma nome → lista (colonne «0», «1»…, le posizioni da 0) oppure, per scegliere tutti i nomi, `{"rows", "cols", "values"}`.

Altre regole:

- **Righe di lunghezza diversa** sono allungate con caselle vuote: `[[1, 2], [3]]` ha 2 colonne e la seconda riga ha una casella vuota.
- **Ogni valore che non è un numero** (testo che non è un numero, `null`, oggetti) è una casella **vuota**, disegnata grigia e tratteggiata, con «—» nel riquadro. I numeri scritti come testo valgono (`"12,5"`).
- **I nomi**: se i dati hanno i loro nomi delle righe o delle colonne, valgono quelli; altrimenti quelli delle proprietà; se mancano anche quelli, i numeri 1, 2, 3… Se i nomi sono meno delle righe (o delle colonne), quelle senza nome prendono il loro numero: con `Nomi delle colonne` «x» e due colonne, i nomi sono «x» e «2». Un nome in più è ignorato.
- **Il colore** di una casella va dal più chiaro (al **Minimo**) al più intenso (al **Massimo**); i valori fuori dall'intervallo prendono il colore dell'estremo. Se tutti i valori sono uguali, l'intervallo è largo 1.
- **Il numero dentro la casella** è scritto quando la casella è larga almeno 26 pixel e alta 16 e il numero ci sta.
- I nomi delle righe occupano al massimo il 30% della larghezza; quelli lunghi sono accorciati con «…».

**Cella scelta** manda:

| Campo | Contenuto |
|---|---|
| `row`, `col` | i nomi della riga e della colonna |
| `rowIndex`, `colIndex` | le loro posizioni, da 0 |
| `value` | il valore della casella (`null` se è vuota) |
| `series`, `y` | solo con un clic del mouse su una casella piena: il nome della riga e il valore |

## Esempi

### 1. Accessi per giorno e ora

```
Finestra «Accessi»
└ Colonna (radice)
  └ Mappa di calore  hm1  Titolo «Accessi»  Nomi delle righe «Lun, Mar, Mer»  Nomi delle colonne «8, 10, 12, 14»
```

```
[Costante · Variabile (JSON): [[3, 12, 8, 5], [4, 15, 9, 6], [2, 10, 11, 7]]] valore ──▶ griglia [Mappa di calore: Accessi]
```

Tre righe (Lun, Mar, Mer) e quattro colonne (8, 10, 12, 14). La casella più intensa è martedì alle 10 (15), la più chiara mercoledì alle 8 (2); la scala dice «2» e «15». Un clic su martedì alle 12 manda `{"row": "Mar", "col": "12", "rowIndex": 1, "colIndex": 2, "value": 9, "series": "Mar", "y": 9}`.

### 2. Una griglia con i suoi nomi, da un file

Il file `~/magazzino.json` contiene:

```
{"rows": ["Scaffale A", "Scaffale B"], "cols": ["Piano 1", "Piano 2", "Piano 3"], "values": [[80, 45, null], [20, 95, 60]]}
```

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [readFile: ~/magazzino.json, JSON] contenuto ──▶ griglia [Mappa di calore: Riempimento]
```

Con **Minimo** 0, **Massimo** 100 e **Unità** `%` il colore dice quanto è pieno ogni posto, sempre sulla stessa scala; il piano 3 dello scaffale A è vuoto (grigio tratteggiato, «—»).

### 3. Una matrice costruita nello schema

```
[Nuova matrice (fill): righe 3, colonne 3] matrice ──▶ matrice [Scrivi m[r][c]: riga 1, colonna 2, valore 7] matrice ──▶ griglia [Mappa di calore: Prova]
```

[Nuova matrice (fill)](coll.matNew) fa una griglia 3 × 3 di zeri; [Scrivi m[r][c]](coll.matSet) (che conta righe e colonne da 0) mette 7 nella seconda riga, terza colonna. Nella mappa quella casella è la più intensa e tutte le altre sono le più chiare; le righe e le colonne si chiamano 1, 2, 3.

## Accessibilità e tastiera

**Tab** per raggiungerla; **←** e **→** passano da una casella all'altra lungo la riga (e alla riga dopo), **↑** e **↓** passano alla riga sopra e sotto, **Inizio** e **Fine** vanno alla prima e all'ultima casella, **Invio** manda la casella su **cella scelta**, **Esc** toglie la scelta. Un lettore di schermo legge il titolo e la grandezza (per esempio «Accessi, Mappa di calore, 3 × 4») e annuncia ogni casella raggiunta. **Mostra come tabella** dà la griglia come una tabella vera, con i nomi delle righe e delle colonne.

## Vedi anche

- [Nuova matrice (fill)](coll.matNew), [Scrivi m[r][c]](coll.matSet), [Reshape](coll.matFromList)
- [Colonne](charts.column) per poche righe e colonne
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
