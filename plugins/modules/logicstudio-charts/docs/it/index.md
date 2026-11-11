# Grafici

`logicstudio-charts` · richiede il motore (`logicstudio-engine`) e le [Componenti UI standard](logicstudio-ui) (`logicstudio-ui`)

I **grafici** da mettere nelle finestre (`.lsui`) dei tuoi progetti: linee, aree, colonne, barre, torta e ciambella, dispersione, istogramma, tempo reale, gradini, mappa di calore, radar e mini linea. Sono **Componenti UI**, come pulsanti e campi: stanno in una finestra, e uno schema parla con loro attraverso il loro **oggetto** (vedi [Componente UI](core.component)).

Il disegno lo fa la libreria dei grafici di lilOS: i grafici seguono il tema chiaro o scuro, la lingua di chi guarda (virgola o punto nei numeri, nomi dei mesi) e si usano anche da tastiera.

## Come si installa

Il pacchetto **non** arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore → Kernel** («Grafici»). L'AppStore installa con lui anche quello che gli serve: il motore e le Componenti UI standard (i contenitori in cui metti i grafici). Dopo l'installazione i grafici compaiono nella scheda **Componenti** dell'editor delle finestre, nel gruppo **Grafici**.

## I grafici

| Grafico | Tipo | A cosa serve |
|---|---|---|
| [Linee](charts.line) | `charts.line` | Una o più serie di valori unite da linee: andamenti, mesi, misure nel tempo. |
| [Aree](charts.area) | `charts.area` | Come Linee, con l'area sotto colorata; anche impilate o al 100%. |
| [Colonne](charts.column) | `charts.column` | Confronti tra categorie con colonne verticali, affiancate o impilate. |
| [Barre](charts.bar) | `charts.bar` | Confronti con barre orizzontali, ordinabili; buone per nomi lunghi. |
| [Torta · Ciambella](charts.pie) | `charts.pie` | Le parti di un totale, al massimo 6 fette. |
| [Dispersione](charts.scatter) | `charts.scatter` | Punti (x, y): il legame tra due misure. |
| [Istogramma](charts.histogram) | `charts.histogram` | Quanti valori cadono in ogni classe: la distribuzione di una misura. |
| [Tempo reale](charts.live) | `charts.live` | Gli ultimi secondi o minuti di valori che arrivano, che scorrono. |
| [Gradini](charts.step) | `charts.step` | Stati nel tempo: acceso/spento, aperto/chiuso o stati a parole. |
| [Mappa di calore](charts.heatmap) | `charts.heatmap` | Una griglia di valori colorati, più scuri dove il valore è più alto. |
| [Radar](charts.radar) | `charts.radar` | Più qualità di una o più cose, su assi a raggiera (da 3 a 12). |
| [Mini linea](charts.spark) | `charts.spark` | Una piccola linea senza assi con l'ultimo valore, da mettere in una riga. |

## Come si usa un grafico

1. Apri una finestra del progetto in **Progetta**, scegli il grafico nella scheda **Componenti** (gruppo **Grafici**) e mettilo in un contenitore (per esempio una [Colonna](ui.column)).
2. Nelle **Proprietà** scegli titolo, altezza, unità, colori…
3. Sempre nelle Proprietà, sezione **Oggetto nello schema**, premi **Crea il suo oggetto**: nello schema compare il blocco che rappresenta il grafico.
4. Collega a quel blocco i valori da mostrare (sugli ingressi **dati**, **aggiungi punto**, **pulisci**…) e, se vuoi, usa la sua uscita **punto scelto**.

Nell'editor della finestra (**Progetta**) ogni grafico mostra **dati inventati**, per farti vedere come apparirà; i pulsanti degli strumenti non ci sono. In **Anteprima**, in una **Prova** e nella finestra vera il grafico parte vuoto («Nessun dato») e mostra solo quello che gli manda lo schema.

Negli esempi di queste pagine `[Linee: Vendite]` è l'oggetto nello schema della componente Linee che ha come titolo «Vendite».

## Ingressi e uscite comuni

| Porta | Tipo | Dove c'è | Cosa fa |
|---|---|---|---|
| **dati** (`data`) | qualsiasi | Linee, Aree, Colonne, Barre, Torta, Dispersione, Radar | Sostituisce **tutti** i dati del grafico con quelli ricevuti. |
| **aggiungi punto** (`add`) | qualsiasi | Linee, Aree, Colonne, Barre, Dispersione | Aggiunge un punto in fondo, senza togliere gli altri. |
| **pulisci** (`clear`) | impulso | tutti tranne Torta, Mappa di calore e Radar | Toglie tutti i punti (le serie restano, vuote). |
| **abilitato** (`enabled`) | sì/no | tutti | `false` rende il grafico più chiaro e lo spegne: niente riquadro dei valori, clic, tastiera, pulsanti. `true` lo riaccende. |
| **visibile** (`visible`) | sì/no | tutti | `false` lo nasconde, `true` lo mostra. |
| **punto scelto** (`picked`) | oggetto | tutti tranne Mini linea | Esce quando chi guarda fa clic su un punto, una colonna, una fetta, una cella… (o preme **Invio** sul grafico). Il nome cambia: **colonna scelta**, **barra scelta**, **fetta scelta**, **classe scelta**, **cella scelta**, **asse scelto**. |
| **Eccezione** (`error`) | oggetto | tutti | Come ogni blocco; per i grafici oggi non ci passa niente. |

## Che forma devono avere i dati

L'ingresso **dati** accetta molte forme. Il grafico le riconosce da solo:

| Forma | Esempio | Diventa |
|---|---|---|
| Lista di numeri | `[3, 5, 4]` | una serie; x = la posizione (0, 1, 2) |
| Lista di punti `{x, y}` | `[{"x": "Gen", "y": 3}, {"x": "Feb", "y": 5}]` | una serie con le sue x |
| Lista di coppie `[x, y]` | `[[1, 2.5], [2, 3.1]]` | una serie con le sue x |
| Oggetto nome → numero | `{"Nord": 3, "Sud": 5}` | una serie: le chiavi sono le categorie (per la Torta: le fette) |
| Oggetto nome → lista | `{"Nord": [3, 4], "Sud": [5, 6]}` | una serie per chiave |
| Oggetto categoria → (serie → numero) | `{"Gen": {"Nord": 3, "Sud": 5}, "Feb": {"Nord": 4}}` | categorie × serie (qui serie Nord e Sud; Sud di Feb manca) |
| Lista di serie | `[{"name": "Nord", "data": [3, 4]}, {"name": "Sud", "data": {"Gen": 5}}]` | una serie per elemento; `data` può essere una lista o un oggetto nome → numero |
| Oggetto con `series` | `{"series": [ … ]}` | come la lista di serie |
| Righe di una tabella | `[{"mese": "Gen", "Nord": 3, "Sud": 5}, {"mese": "Feb", "Nord": 4, "Sud": 6}]` | il primo campo di testo è la x, ogni campo con numeri è una serie |
| Un testo JSON di una di queste | `"[1, 2, 3]"` | come la forma che contiene |

Dettagli che contano:

- **Dentro un punto** la x si cerca, in quest'ordine, nei campi `x`, `t`, `time`, `date`, `name`, `label`, `category`, `key`; la y in `y`, `value`, `v`, `state`, `count`. Un punto senza y vale «vuoto» e interrompe la linea.
- **I numeri scritti come testo** valgono: `"21,5"` e `"21.5"` sono 21,5. Un testo che non è un numero, come y, vale vuoto (tranne nel grafico a [Gradini](charts.step), dove è uno stato).
- **Il tipo dell'asse x** lo decide il grafico: se una x è un testo che non è un numero e non è una data, le x sono **categorie** (nell'ordine in cui arrivano); se le x sono date in formato ISO (`"2026-11-11"`, `"2026-11-11T08:30:00Z"`), l'asse è il **tempo**; altrimenti sono **numeri** (in ordine crescente). Colonne, Barre, Radar e Torta hanno sempre categorie; Tempo reale e Gradini hanno sempre il tempo.
- **I millisecondi non sono date**: un numero come `1762848000000` resta un numero sull'asse. Per un asse del tempo manda le date come testo ISO (per esempio l'uscita **ISO** di [Now (data e ora)](core.now)).
- **Il colore di una serie** si può dare nei dati: `{"name": "Nord", "data": [3, 4], "color": "#e5484d"}`. Sono accettati solo `#rgb`…`#rrggbbaa`, `rgb(…)`, `rgba(…)`, `hsl(…)`, `hsla(…)` con numeri; ogni altro colore è ignorato.
- **Le serie senza nome** si chiamano «Serie 1», «Serie 2»… nella legenda; se c'è una sola serie senza nome, la legenda non c'è e nei valori di **punto scelto** si chiama «Valore».
- Un valore che non si può leggere (`null`, `""`, un testo JSON rovinato) **svuota** il grafico: è come ricevere dati vuoti.

L'ingresso **aggiungi punto** accetta:

| Valore | Cosa aggiunge |
|---|---|
| un numero (o un testo con un numero, o sì/no) | un punto in fondo alla prima serie |
| una coppia `[x, y]` | il punto (x, y) nella prima serie |
| `{"y": 5}`, `{"x": "Mar", "y": 5}`, `{"value": 5}` | un punto nella prima serie |
| `{"x": "Mar", "y": 5, "series": "Sud"}` | un punto nella serie «Sud» (creata se non c'è) |
| `{"Nord": 3, "Sud": 5}` | un punto per ogni serie, con la x che segue |
| `{"x": "Mar", "Nord": 3, "Sud": 5}` | un punto per ogni serie, alla x «Mar» |

Quando un punto arriva senza x, la x la mette il grafico: sull'asse dei numeri è quella dopo l'ultimo punto della serie (0, 1, 2…), sull'asse del tempo è **l'ora in cui il punto arriva nella finestra**, tra le categorie è una categoria nuova («1», «2»…).

## Quanti punti tiene un grafico

- Ogni serie tiene al massimo **Punti tenuti per serie** (proprietà, 1000 se non la cambi). Quando arriva un punto in più, va via **il più vecchio**; con **dati** si tengono gli ultimi della lista (sull'asse dei numeri e del tempo: quelli con la x più grande).
- C'è anche un limite per tutti, deciso da un amministratore: **Punti tenuti per serie dei grafici** (Pannello di controllo → Logic Studio → Limiti, 1000 di serie, da 10 a 100000). Vale il **più piccolo** dei due: alzare la proprietà sopra 1000 non serve finché l'amministratore non alza il limite. Vedi [Limiti](logicstudio-engine/limits).
- Tempo reale e Gradini tolgono anche i punti usciti dal **Tempo mostrato** (ne tengono uno appena prima, perché la linea o lo stato entrino dal bordo sinistro).

## I punti stanno nella finestra, non nel programma

Un grafico tiene i suoi punti **nella finestra aperta**. Il programma, invece, ricorda per ogni ingresso **solo l'ultimo valore** che ha mandato (se nelle Opzioni del progetto è acceso **Una finestra riaperta mostra subito gli ultimi valori**, di serie sì). Quindi:

- i valori mandati con **aggiungi punto** mentre la finestra è chiusa **non** si vedono quando la apri: vedi solo l'ultimo;
- se chiudi e riapri la finestra, la storia costruita con **aggiungi punto** si perde: restano l'ultimo **dati** e l'ultimo punto aggiunto.

Se il grafico deve mostrare la storia anche a chi apre la finestra più tardi, tieni la lista nello schema (per esempio con [Accumula (push con limite)](coll.accumulate)) e mandala intera su **dati**: vedi l'esempio 2 qui sotto.

## Le cose che hanno tutti

- **Legenda**: compare da due serie in su (proprietà **Legenda**). Un clic su una voce spegne o riaccende quella serie; una serie spenta tiene il suo colore e il suo posto.
- **Colori**: `standard` (8 colori, sempre nello stesso ordine; dalla nona serie le linee sono tratteggiate) o `blue` (6 toni di blu). Nell'IDE le due scelte si vedono con questi nomi.
- **Un solo asse dei valori**, a sinistra (per Barre: in basso). **Minimo** e **Massimo** lo fissano; vuoti, si adattano ai dati con numeri tondi.
- **Unità**: scritta sopra l'asse, dopo ogni valore nel riquadro e nell'intestazione della vista tabella. **Decimali**: le cifre dopo la virgola nel riquadro e nella tabella (da 0 a 10; vuoto: fino a 3, quante servono). Le etichette dell'asse usano i decimali del passo dell'asse.
- **Riquadro dei valori**: passando con il mouse compare un riquadro con i valori del punto più vicino; una linea guida segna la x.
- **Strumenti** (proprietà **Pulsanti vista tabella, PNG e CSV**): in alto a destra tre pulsanti: **Mostra come tabella** (gli stessi dati in una tabella, al massimo 500 righe a schermo: «Sono mostrate solo le prime 500 righe.»), **Salva come PNG** (l'immagine con titolo e legenda, a doppia risoluzione) e **Salva come CSV** (tutte le righe; virgola come separatore, punto nei decimali, date ISO, UTF-8). Il file si chiama come il titolo del grafico (o come il tipo, per esempio «Grafico a linee.csv»). La tabella e il CSV contengono anche le serie spente.
- **Nessun dato**: è la scritta al centro di un grafico vuoto.

## Tastiera e lettori di schermo

Il grafico si raggiunge con **Tab**. Poi:

| Tasto | Cosa fa |
|---|---|
| **→** **↓** / **←** **↑** | passa al valore dopo / prima (nella Mappa di calore **↑** **↓** cambiano riga) |
| **Inizio** / **Fine** | il primo / l'ultimo valore |
| **Invio** o **Spazio** | sceglie il valore: lo manda su **punto scelto** |
| **Esc** | toglie la scelta |

Un lettore di schermo legge un riassunto del grafico (titolo, tipo, quante serie e quanti punti, dal valore più basso al più alto) e annuncia ogni valore raggiunto con le frecce. La vista tabella è una tabella vera, leggibile riga per riga.

## Esempi

### 1. Vendite per mese, da un file JSON

Il file `~/vendite.json` contiene `{"Gen": {"Nord": 12, "Sud": 9}, "Feb": {"Nord": 15, "Sud": 11}, "Mar": {"Nord": 13, "Sud": 14}}`.

```
Finestra «Vendite»
└ Colonna (radice)
  ├ Colonne  col1  Titolo «Vendite per mese»  Unità «k€»
  └ Barre    bar1  Titolo «Totale per zona»   Ordine desc
```

```
[All'avvio (main)] impulso ──▶ leggi [readFile: ~/vendite.json, JSON] contenuto ──▶ dati [Colonne: Vendite per mese]
[Costante · Variabile: {"Nord": 40, "Sud": 34}] valore ──▶ dati [Barre: Totale per zona]
```

Le Colonne mostrano tre mesi con due colonne ciascuno (Nord e Sud) e la legenda; le Barre mostrano Nord sopra (40) e Sud sotto (34), con i valori in fondo alle barre. [readFile](lilos.fileRead) è del pacchetto [Blocchi di lilOS](logicstudio-lilos).

### 2. Una misura ogni 10 secondi, con la storia che resta

```
[Intervallo (setInterval): 10 s] impulso ──▶ leggi [readFile: ~/sensore.txt] contenuto ──▶ aggiungi [Accumula (push con limite): max 360] lista ──▶ dati [Linee: Temperatura]
                                                            contenuto ──▶ valore [Mini linea: Ora]
```

[Accumula (push con limite)](coll.accumulate) tiene le ultime 360 letture (un'ora). Ogni 10 secondi la lista intera va su **dati**: chi apre la finestra dopo vede subito l'ultima ora, non solo l'ultima lettura. La [Mini linea](charts.spark) accanto mostra l'andamento recente e il valore attuale.

### 3. Un clic sul grafico apre i dettagli

```
[Colonne: Vendite per mese] colonna scelta ──▶ oggetto [Get proprietà (obj.campo): category] valore ──▶ testo [Etichetta: Mese scelto]
```

Un clic sulla colonna di febbraio manda `{"category": "Feb", "values": {"Nord": 15, "Sud": 11}, "index": 1, "series": "Nord", "y": 15}`; [Get proprietà (obj.campo)](core.get) ne prende `category` e l'[Etichetta](ui.label) mostra «Feb».

## Limiti noti

- I grafici nel tempo mostrano gli ultimi secondi che scegli: **non si possono ingrandire** né spostare con il mouse.
- Un solo asse dei valori: due misure con scale molto diverse (gradi e percentuali) stanno meglio in due grafici.
- La storia costruita con **aggiungi punto** vive nella finestra aperta: vedi sopra «I punti stanno nella finestra, non nel programma».
- Torta: al massimo 6 fette (le più piccole diventano «Altro»). Radar: da 3 a 12 assi.

## Vedi anche

- [Componente UI](core.component): l'oggetto di una componente nello schema
- [Componenti UI standard](logicstudio-ui)
- [Accumula (push con limite)](coll.accumulate), [Intervallo (setInterval)](core.every), [Now (data e ora)](core.now)
- [Limiti](logicstudio-engine/limits)
- [Componenti delle finestre](ide/components), [Finestre](ide/windows)
