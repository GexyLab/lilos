# Istogramma

`charts.histogram` · Grafici · [Grafici](logicstudio-charts) · versione 1

Divide i valori di una misura in **classi** (intervalli uguali, per esempio da 18 a 20, da 20 a 22…) e mostra con una colonna **quanti valori** cadono in ognuna. Serve a vedere come si distribuisce una misura: dove si concentra, quanto è sparsa, se ci sono valori strani.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno. |
| **Legenda** | sì/no | sì | Mostra la legenda (solo con più serie, vedi sotto). |
| **Unità** | testo | vuoto | L'unità dei valori: compare nel titolo del riquadro di una classe («20 – 22 °C»). L'asse verticale conta i valori e non ha unità. |
| **Decimali** | da 0 a 10 | vuoto | Le cifre dei limiti delle classi nel riquadro (almeno quelle che servono alla larghezza delle classi, al massimo 6). |
| **Punti tenuti per serie** | da 10 a 100000 | 1000 | Quanti valori si contano al massimo: oltre, vanno via i più vecchi (vale anche il limite dell'amministratore). |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |
| **Classi (0: automatiche)** | da 0 a 200 | 0 | Quante classi fare. 0 le sceglie da solo. |
| **Larghezza di una classe (vuoto: dalle classi)** | numero maggiore di 0 | vuoto | La larghezza fissa di ogni classe, per esempio 5. Se c'è, vale lei e **Classi** è ignorato. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valori** (`values`) | lista | Tutti i valori da contare. Sostituisce quelli che c'erano. |
| **aggiungi valore** (`add`) | numero | Un valore in più da contare. |
| **pulisci** (`clear`) | impulso | Toglie tutti i valori. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **classe scelta** (`picked`) | oggetto | La classe su cui chi guarda fa clic o preme **Invio**. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Come funziona

**I valori**:

- **valori** vuole una **lista**: `[18.2, 19.5, 21, 20.4]`. I numeri scritti come testo valgono (`"19,5"` è 19,5); i testi che non sono numeri, `null` e i valori vuoti non sono contati. Un valore che non è una lista (un numero, un oggetto, anche un testo JSON) **svuota** il grafico.
- **aggiungi valore** vuole un numero (anche come testo, `"21,3"`); se non è un numero, è ignorato.
- Si contano al massimo gli ultimi **Punti tenuti per serie** valori (1000 di serie, e non più del limite dell'amministratore): con una lista di 5000 valori, si contano gli ultimi 1000.
- **Più serie**: se su **valori** arriva una lista di serie, `[{"name": "Serra 1", "data": [21, 22.5]}, {"name": "Serra 2", "data": [19, 20]}]`, ogni serie ha le sue colonne affiancate in ogni classe, con la legenda. Le classi sono le stesse per tutte.

**Le classi** si calcolano da capo a ogni valore nuovo, dal più piccolo al più grande dei valori:

- **automatiche** (Classi 0, senza larghezza): il numero di classi viene dalla quantità di valori (circa log₂(n) + 1), con una larghezza «tonda» (1, 2, 2,5, 5, 10…) e il primo limite multiplo della larghezza. Con i valori da 1 a 10 le classi sono 0–2, 2–4, 4–6, 6–8, 8–10 e 10–12.
- **con una larghezza**: le classi partono dal multiplo della larghezza appena sotto il valore più piccolo. Con larghezza 5 e valori da 12 a 31: 10–15, 15–20, 20–25, 25–30, 30–35.
- **con un numero di classi**: le classi partono dal valore più piccolo, larghe (massimo − minimo) / Classi. **Il valore più grande finisce in una classe in più**: con Classi 4 e valori da 1 a 10 le classi sono 5 (1–3,25, 3,25–5,5, 5,5–7,75, 7,75–10 e 10–12,25), e l'ultima contiene solo i 10.
- un valore uguale al limite tra due classi va nella classe **dopo** (con classi 0–2 e 2–4, il 2 va in 2–4);
- se tutti i valori sono uguali, le classi coprono da 0,5 sotto a 0,5 sopra quel valore (con 5, 5, 5 in automatico: 4,5–5, 5–5,5 e 5,5–6, e i tre 5 stanno in 5–5,5);
- le classi sono al massimo 500.

**L'asse verticale** conta i valori: parte da 0 e ha solo numeri interi.

**Classe scelta** manda:

| Campo | Contenuto |
|---|---|
| `from`, `to` | i limiti della classe, per esempio `20` e `22` |
| `counts` | quanti valori di ogni serie ci cadono: `{"Conteggio": 7}` con una serie senza nome, `{"Serra 1": 3, "Serra 2": 5}` con più serie |
| `index` | la posizione della classe, da 0 |
| `series`, `y` | solo con un clic del mouse su una colonna: la serie e il suo conteggio |

## Esempi

### 1. I tempi di risposta di un sito

```
Finestra «Prestazioni»
└ Colonna (radice)
  └ Istogramma  h1  Titolo «Tempi di risposta»  Unità «ms»  Larghezza di una classe 50
```

```
[Valore (JSON): [120, 135, 180, 95, 240, 160, 150, 410, 130, 175]] valore ──▶ valori [Istogramma: Tempi di risposta]
```

Le classi sono 50–100 (1 valore), 100–150 (3), 150–200 (4), 200–250 (1), poi tre classi vuote e 400–450 (1): si vede subito che quasi tutte le risposte stanno tra 100 e 200 ms e che una è molto lenta. Il riquadro della terza classe dice «150 – 200 ms» e «Conteggio 4».

### 2. Contare mentre le misure arrivano

```
[Ogni…: 5 s] impulso ──▶ leggi [Leggi file: ~/peso.txt] contenuto ──▶ aggiungi valore [Istogramma: Pesate]
[Pulsante: Nuovo lotto] premuto ──▶ pulisci [Istogramma: Pesate]
```

Ogni 5 secondi il valore del file si aggiunge ai conteggi e le classi si ricalcolano. **Nuovo lotto** ricomincia da zero. Come per tutti i grafici, i valori aggiunti stanno nella finestra aperta: per non perderli chiudendola, tienili con [Accumula](coll.accumulate) e manda la lista su **valori**.

### 3. Due serre a confronto

```
[Leggi file: ~/temperature.json, JSON] contenuto ──▶ valori [Istogramma: Temperature]
```

Con il file `[{"name": "Serra 1", "data": [21, 22.5, 23, 22]}, {"name": "Serra 2", "data": [19, 20, 21.5, 19.5]}]` ogni classe ha due colonne affiancate, una per serra, e la legenda; un clic sulla legenda nasconde una serra.

## Accessibilità e tastiera

**Tab** per raggiungerlo; le frecce passano da una classe all'altra, **Invio** manda la classe su **classe scelta** (senza `series` e `y`), **Esc** toglie la scelta. **Mostra come tabella**: una riga per classe con Da, A e il conteggio di ogni serie.

## Vedi anche

- [Colonne](charts.column) per valori già contati per categoria
- [Somma · Minimo · Massimo · Media](coll.stat) per riassumere una lista con pochi numeri
- [Accumula](coll.accumulate)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
