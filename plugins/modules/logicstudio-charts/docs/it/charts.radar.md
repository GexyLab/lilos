# Radar

`charts.radar` · Grafici · [Grafici](logicstudio-charts) · versione 1

Più qualità di una cosa su **assi a raggiera**, che partono dal centro: ogni serie è una figura che unisce i suoi valori. Serve a confrontare il «profilo» di una o più cose (due prodotti per velocità, costo, qualità…; un mese con la media). Mostra da **3 a 12 assi**.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | **240** | L'altezza del disegno; il radar sta nel cerchio più grande che ci entra, con i nomi degli assi attorno. |
| **Legenda** | sì/no | sì | Mostra la legenda (da due serie in su). |
| **Unità** | testo | vuoto | Dopo i valori nel riquadro. |
| **Decimali** | da 0 a 10 | vuoto | Cifre dopo la virgola nel riquadro e nella tabella. |
| **Minimo (vuoto: automatico)** | numero | vuoto | Il valore al centro. Vuoto: 0, o il valore più basso se è negativo. |
| **Massimo (vuoto: automatico)** | numero | vuoto | Il valore sul bordo. Vuoto: il valore più alto, arrotondato. |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati (nome → valore)** (`data`) | qualsiasi | Gli assi e i valori. Sostituisce tutto quello che c'era. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

Il Radar non ha **aggiungi punto** né **pulisci**: per cambiarlo manda dati nuovi; per svuotarlo manda `{}`.

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **asse scelto** (`picked`) | oggetto | L'asse su cui chi guarda fa clic o preme **Invio**, con i valori di ogni serie. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Come funziona

**Gli assi sono le categorie**, nell'ordine in cui arrivano, a partire da quello in alto e in senso orario.

| Dati | Risultato |
|---|---|
| `{"Velocità": 8, "Costo": 5, "Qualità": 7, "Sicurezza": 9, "Comfort": 6}` | una figura su 5 assi |
| `{"Velocità": {"A": 8, "B": 6}, "Costo": {"A": 5, "B": 8}, "Qualità": {"A": 7, "B": 6}}` | due figure, A e B, su 3 assi |
| `[{"name": "A", "data": {"Velocità": 8, "Costo": 5, "Qualità": 7}}, {"name": "B", "data": {"Velocità": 6, "Costo": 8, "Qualità": 6}}]` | uguale, come lista di serie |
| `[{"asse": "Velocità", "A": 8, "B": 6}, {"asse": "Costo", "A": 5, "B": 8}, {"asse": "Qualità", "A": 7, "B": 6}]` | uguale, come righe di tabella |

Regole:

- **Servono almeno 3 assi**: con 1 o 2 il grafico dice «Nessun dato». **Oltre 12** si vedono solo i primi 12 (la vista tabella e il CSV li hanno tutti).
- **La scala** è la stessa per tutti gli assi: dal **Minimo** (al centro) al **Massimo** (sul bordo), con cerchi di riferimento (poligoni) e i loro valori scritti lungo l'asse in alto. Valori sotto il minimo stanno al centro, sopra il massimo sul bordo.
- **Un valore che manca** a una serie: la figura passa dal centro su quell'asse e lì non c'è il pallino.
- I nomi lunghi degli assi sono accorciati con «…».

**Asse scelto** manda:

| Campo | Contenuto |
|---|---|
| `category` | il nome dell'asse, per esempio `"Costo"` |
| `values` | il valore di ogni serie visibile su quell'asse: `{"A": 5, "B": 8}` (una serie senza nome si chiama «Valore») |
| `index` | la posizione dell'asse, da 0 (0 = quello in alto) |

Il clic sceglie l'asse più vicino come direzione, fino a poco fuori dal bordo.

## Esempi

### 1. Due auto a confronto

```
Finestra «Confronto»
└ Colonna (radice)
  └ Radar  rad1  Titolo «Auto»  Minimo 0  Massimo 10
```

```
[Costante · Variabile (JSON): {"Velocità": {"Auto A": 8, "Auto B": 6}, "Costo": {"Auto A": 5, "Auto B": 8}, "Qualità": {"Auto A": 7, "Auto B": 6}, "Sicurezza": {"Auto A": 9, "Auto B": 7}, "Comfort": {"Auto A": 6, "Auto B": 8}}] valore ──▶ dati [Radar: Auto]
```

Cinque assi e due figure con la legenda «Auto A» e «Auto B». Con Minimo 0 e Massimo 10 un voto 10 tocca il bordo. Un clic sull'asse «Costo» manda `{"category": "Costo", "values": {"Auto A": 5, "Auto B": 8}, "index": 1}`.

### 2. Il profilo di un mese, da un file

```
[All'avvio (main)] impulso ──▶ leggi [readFile: ~/qualita.json, JSON] contenuto ──▶ dati [Radar: Ottobre]
```

Il file contiene `{"Puntualità": 92, "Resi": 4, "Soddisfazione": 87, "Consegne": 95}`. Lasciando **Minimo** e **Massimo** vuoti la scala va da 0 a 100 (arrotondata): «Resi», con 4, resta vicino al centro.

### 3. Mostrare il valore scelto

```
[Radar: Auto] asse scelto ──▶ oggetto [Get proprietà (obj.campo): values.Auto A] valore ──▶ valore [Valore: Voto di A]
```

[Get proprietà (obj.campo)](core.get) prende il voto di «Auto A» sull'asse scelto e il [Valore](ui.value) della finestra lo mostra.

## Accessibilità e tastiera

**Tab** per raggiungerlo; le frecce passano da un asse all'altro (compare la guida dell'asse e il riquadro con i valori di ogni serie), **Inizio** e **Fine** vanno al primo e all'ultimo, **Invio** manda l'asse su **asse scelto**, **Esc** toglie la scelta. **Mostra come tabella**: una riga per asse e una colonna per serie.

## Vedi anche

- [Colonne](charts.column) per gli stessi dati come colonne affiancate
- [Barre](charts.bar)
- [Get proprietà (obj.campo)](core.get)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
