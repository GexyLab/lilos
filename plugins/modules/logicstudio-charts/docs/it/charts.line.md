# Linee

`charts.line` · Grafici · [Grafici](logicstudio-charts) · versione 1

Una o più serie di valori, ognuna disegnata come una linea che unisce i suoi punti. Va bene per un andamento: le vendite mese per mese, una temperatura nel tempo, una misura ripetuta.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno, in pixel. La larghezza è quella del contenitore. |
| **Legenda** | sì/no | sì | Mostra la legenda (solo da due serie in su). |
| **Unità** | testo | vuoto | Scritta sopra l'asse e dopo ogni valore, per esempio `°C` o `k€`. |
| **Decimali** | da 0 a 10 | vuoto | Le cifre dopo la virgola nel riquadro dei valori e nella tabella. Vuoto: fino a 3, quante servono. |
| **Minimo (vuoto: automatico)** | numero | vuoto | Il valore in fondo all'asse. |
| **Massimo (vuoto: automatico)** | numero | vuoto | Il valore in cima all'asse. |
| **Punti tenuti per serie** | da 10 a 100000 | 1000 | Oltre, va via il punto più vecchio. Vale anche il limite dell'amministratore (vedi sotto). |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati (lista o oggetto)** (`data`) | qualsiasi | Sostituisce tutti i dati. Forme accettate: vedi sotto. |
| **aggiungi punto** (`add`) | qualsiasi | Aggiunge un punto in fondo a una serie (o un punto per serie). |
| **pulisci** (`clear`) | impulso | Toglie tutti i punti; le serie restano, vuote. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne (niente clic, riquadro, tastiera). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto scelto** (`picked`) | oggetto | Il punto su cui chi guarda fa clic o preme **Invio**. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

Il grafico parte vuoto («Nessun dato»). Ogni valore su **dati** lo ridisegna da capo con quei dati; ogni valore su **aggiungi punto** aggiunge un punto a quelli che ci sono.

**L'asse x** si sceglie dai dati (vedi [Grafici](logicstudio-charts) per tutte le forme):

- **numeri** (`[3, 5, 4]` usa le posizioni 0, 1, 2; `[[1, 2.5], [4, 3]]` usa 1 e 4): i punti sono messi in ordine di x, anche se arrivano in disordine;
- **date ISO** (`"2026-11-11"`, `"2026-11-11T08:30:00Z"`): l'asse è il tempo, con etichette come «08:30» o «11 nov»;
- **categorie** (testi come `"Gen"`): restano nell'ordine in cui arrivano, a distanza uguale.

**I valori** (la y) sono numeri; `"21,5"` vale 21,5. Un punto senza valore (o con un testo che non è un numero) **interrompe la linea**: la linea riprende al punto dopo.

**Più serie**: ogni serie ha la sua linea e il suo colore. Con un oggetto nome → lista (`{"Nord": [3, 4], "Sud": [5, 6]}`), una lista di serie (`[{"name": "Nord", "data": […]}]`), un oggetto categoria → serie (`{"Gen": {"Nord": 3, "Sud": 5}}`) o righe di tabella (`[{"mese": "Gen", "Nord": 3, "Sud": 5}]`).

**I pallini** sui punti si vedono solo quando c'è spazio: con molti punti resta solo la linea.

**Aggiungi punto**:

- un numero va in fondo alla prima serie. Se la serie ha x numeriche, la nuova x è quella dopo l'ultima (0, 1, 2…); se l'asse è il tempo, è l'ora in cui il punto arriva nella finestra; se ci sono categorie, il punto diventa una categoria nuova, chiamata con un numero;
- `{"x": "Apr", "y": 7}` o `[x, y]` mettono il punto alla x data (sull'asse dei numeri o del tempo, al posto giusto in ordine);
- `{"Nord": 3, "Sud": 5}` aggiunge un punto a ogni serie con quel nome, creando le serie che mancano; `{"x": "Apr", "Nord": 3, "Sud": 5}` le mette tutte alla x «Apr»;
- `{"y": 5, "series": "Sud"}` sceglie la serie per nome.

**Quanti punti**: ogni serie tiene al massimo il più piccolo tra **Punti tenuti per serie** e il limite **Punti tenuti per serie dei grafici** dell'amministratore (1000 di serie). Oltre, va via il punto più vecchio (con x numeriche o di tempo: quello con la x più piccola).

**Punto scelto**: un clic vicino a una x (o **Invio** dopo averla raggiunta con le frecce) manda un oggetto con:

| Campo | Contenuto |
|---|---|
| `x` | la x: il numero, la categoria (testo) o, sull'asse del tempo, i millisecondi |
| `time` | solo sull'asse del tempo: la data ISO, per esempio `"2026-11-11T08:30:00.000Z"` |
| `values` | i valori di ogni serie visibile a quella x: `{"Nord": 3, "Sud": 5}` (una serie senza nome si chiama «Valore») |
| `index` | la posizione di quella x tra quelle con un valore, da 0 |
| `series`, `y` | solo con un clic del mouse e più serie: la serie più vicina al punto del clic e il suo valore |

## Esempi

### 1. Pioggia per mese, due città

```
Finestra «Meteo»
└ Colonna (radice)
  └ Linee  line1  Titolo «Pioggia»  Unità «mm»
```

```
[Costante · Variabile (JSON): {"Gen": {"Roma": 80, "Milano": 58}, "Feb": {"Roma": 72, "Milano": 49}, "Mar": {"Roma": 61, "Milano": 70}}] valore ──▶ dati [Linee: Pioggia]
```

Un oggetto i cui valori sono tutti oggetti è letto come **categoria → serie**: l'asse ha Gen, Feb, Mar e ci sono due linee, Roma e Milano, con la legenda. Il riquadro su «Feb» dice «Roma 72 mm», «Milano 49 mm».

> Attenzione all'ordine delle chiavi: con `{"Roma": {"Gen": 80, …}, "Milano": {…}}` le categorie sarebbero Roma e Milano e le serie i mesi. Se i tuoi dati sono fatti così, usa la forma nome → lista: `{"Roma": [80, 72, 61], "Milano": [58, 49, 70]}` (x = 0, 1, 2) oppure `{"Roma": [["Gen", 80], ["Feb", 72], ["Mar", 61]], "Milano": [["Gen", 58], ["Feb", 49], ["Mar", 70]]}`.

### 2. Misure con la data, lette da un file

Il file `~/misure.json` contiene:

```
[{"t": "2026-11-11T08:00:00Z", "v": 18.5}, {"t": "2026-11-11T09:00:00Z", "v": 19.2}, {"t": "2026-11-11T10:00:00Z", "v": 21}]
```

```
[All'avvio (main)] impulso ──▶ leggi [readFile: ~/misure.json, JSON] contenuto ──▶ dati [Linee: Serra]
```

Le x sono date ISO: l'asse è il tempo, con le ore nell'ora locale di chi guarda. Un clic sul secondo punto manda `{"x": 1794387600000, "time": "2026-11-11T09:00:00.000Z", "values": {"Valore": 19.2}, "index": 1}`.

### 3. Un contatore che cresce, un punto alla volta

```
[Intervallo (setInterval): 2 s] impulso ──▶ più [Contatore (++ −−)] conteggio ──▶ aggiungi punto [Linee: Contatore]
[Pulsante: Ricomincia] premuto ──▶ pulisci [Linee: Contatore]
```

Ogni 2 secondi arriva un numero (1, 2, 3…): il primo punto ha x = 0, il secondo x = 1, e così via. Il [Pulsante](ui.button) svuota il grafico; il punto dopo riparte da x = 0 (il blocco [Contatore (++ −−)](core.counter) invece continua: collega **premuto** anche al suo **azzera** se vuoi ripartire da capo). Se chiudi e riapri la finestra vedi un solo punto, l'ultimo: per tenere la storia usa [Accumula (push con limite)](coll.accumulate) e **dati** (vedi [Grafici](logicstudio-charts)).

## Accessibilità e tastiera

Il grafico si raggiunge con **Tab**; le frecce passano da una x all'altra e mostrano il riquadro dei valori, **Inizio** e **Fine** vanno alla prima e all'ultima, **Invio** manda il punto su **punto scelto**, **Esc** toglie la scelta. Un lettore di schermo legge il riassunto («Pioggia, Grafico a linee, 2 serie (Roma, Milano), 6 punti, valori da 49 mm a 80 mm») e annuncia ogni x raggiunta. **Mostra come tabella** dà gli stessi dati in una tabella: una riga per x, una colonna per serie.

## Vedi anche

- [Aree](charts.area) per l'area sotto la linea, [Tempo reale](charts.live) per i valori che scorrono, [Mini linea](charts.spark)
- [Accumula (push con limite)](coll.accumulate), [Contatore (++ −−)](core.counter), [Now (data e ora)](core.now)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
