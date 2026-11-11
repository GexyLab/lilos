# Equazione alle differenze (lfilter)

`sig.difference` · Segnali · [Segnali](logicstudio-signals) · versione 1

Il filtro lineare più generale: scrivi tu i coefficienti **b** (ingresso) e **a** (uscita) dell'equazione alle differenze, come in `scipy.signal.lfilter`. Con la sola lista **b** è un filtro FIR; con anche **a** è un filtro IIR (ricorsivo). Va bene per filtri trovati altrove (un libro, un programma di progetto), integratori, derivatori, filtri di primo ordine e per provare un'idea. Tiene lo stato tra una finestra e la successiva e manda i suoi coefficienti alla [Risposta in frequenza (freqz, Bode)](sig.response).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale da filtrare: un oggetto `{ fs, t0, samples }` o una lista di numeri (presa come segnale alla **fs delle liste semplici**). La parte immaginaria `im`, se c'è, viene ignorata. |
| **coefficienti** (`coefficients`) | qualsiasi | Coefficienti già pronti, al posto di **b** e **a** delle impostazioni: una lista (solo `b`, filtro FIR), un oggetto `{ b, a }` o un oggetto `{ sos }` (sezioni del secondo ordine, ognuna `[b0, b1, b2, a0, a1, a2]`), anche in un testo JSON. Va bene l'uscita **coefficienti** degli altri blocchi filtro. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **azzera** (`reset`) | impulso | Riporta il filtro a zero (nessun ricordo delle finestre passate). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale filtrato, con la stessa `fs` e lo stesso `t0`. Se è arrivata una lista, esce una lista. |
| **coefficienti** (`coefficients`) | oggetto | `{ fs, b, a }` (o `{ fs, sos, b, a }` se i coefficienti sono arrivati in sezioni), con `a[0]` = 1 e la `fs` del segnale. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Coefficienti non validi, segnale non valido o troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Coefficienti b (ingresso)** (`b`) | lista JSON, o numeri separati da spazi, virgole o punti e virgola | `[0.5, 0.5]` | I coefficienti che moltiplicano gli ingressi `x[n]`, `x[n−1]`, … |
| **Coefficienti a (uscita)** (`a`) | come sopra | `[1]` | I coefficienti che moltiplicano le uscite passate; il primo (`a0`) divide tutto e non può essere 0. `[1]` vuol dire nessuna ricorsione (FIR). |
| **Fase zero (avanti e indietro, filtfilt)** (`zeroPhase`) | sì / no | no | Filtra avanti e indietro: nessun ritardo di fase, ma niente stato tra le finestre. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri che arriva su **segnale**. Serve anche per i coefficienti mandati all'avvio. |

I coefficienti si scrivono per esempio `[1, -0.5]`, oppure `1 -0.5`, oppure `1, -0.5`. Un solo numero (`2`) non basta: va scritto come lista (`[2]`) o accompagnato da un altro valore.

## Come funziona

- Il blocco calcola, per ogni campione:

  `a0·y[n] = b0·x[n] + b1·x[n−1] + … − a1·y[n−1] − a2·y[n−2] − …`

  Prima divide tutti i coefficienti per `a0`, così `a0` vale 1.
- **Lo stato resta tra le finestre**: finestre consecutive dello stesso segnale si uniscono senza salti. **azzera** lo riporta a zero; cambiare **b**, **a** o il valore su **coefficienti** lo riporta a zero.
- Con **Fase zero** ogni finestra è filtrata **avanti e indietro**, con i bordi prolungati, e **non tiene stato**.
- **All'avvio** il blocco manda i coefficienti delle impostazioni alla **fs delle liste semplici**, così la [Risposta in frequenza (freqz, Bode)](sig.response) li può disegnare prima del segnale. Poi li manda con il primo segnale (alla sua `fs`) e dopo ogni cambio o **azzera**.
- I coefficienti sull'ingresso **coefficienti**, se ci sono, **vincono** su **b** e **a**.
- Se arriva una lista di numeri, esce una lista; se arriva un segnale, esce un segnale.
- **Attenzione alla stabilità**: se un polo sta fuori dal cerchio unitario l'uscita cresce senza fine. Controllalo con la [Risposta in frequenza (freqz, Bode)](sig.response): l'uscita **stabile** lo dice.

## Un po' di teoria

L'**equazione alle differenze** è la ricetta di un filtro lineare e invariante nel tempo (LTI):

`y[n] = Σ b[k]·x[n−k] − Σ a[k]·y[n−k]`   (la prima somma da k = 0, la seconda da k = 1, con `a0` = 1)

La **funzione di trasferimento** si ottiene con la trasformata Z:

`H(z) = (b0 + b1·z⁻¹ + … + bM·z⁻ᴹ) / (1 + a1·z⁻¹ + … + aN·z⁻ᴺ)`

Le radici del numeratore sono gli **zeri**, quelle del denominatore i **poli**. Il filtro è **stabile** se tutti i poli sono dentro il cerchio unitario (`|p| < 1`). Il guadagno a una frequenza `f` si legge su `H(e^(j·2π·f/fs))`.

Qualche filtro classico:

| Filtro | b | a | Cosa fa |
|---|---|---|---|
| media di due campioni | `[0.5, 0.5]` | `[1]` | passa-basso, zero a fs/2 |
| derivatore (differenza) | `[1, -1]` | `[1]` | `y[n] = x[n] − x[n−1]`, passa-alto |
| integratore con perdita | `[0.1]` | `[1, -0.9]` | `y[n] = 0.1·x[n] + 0.9·y[n−1]`, passa-basso, polo in 0,9 |
| accumulatore | `[1]` | `[1, -1]` | somma di tutti i campioni; polo in 1 (al limite della stabilità) |

Nel filtro con perdita, un gradino in ingresso (`1, 1, 1, …`) dà `0.1; 0.19; 0.271; 0.3439; …` e tende a 1: la costante di tempo è circa `−1/ln(0.9) ≈ 9.5` campioni.

## Esempi

### 1. Un filtro di primo ordine

**b** `[0.1]`, **a** `[1, -0.9]`, `fs` = 1000 Hz, su un gradino:

```
[Impulso · Gradino · Rampa] segnale ──▶ segnale [Equazione alle differenze (lfilter)] segnale ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
```

Dà `0.1, 0.19, 0.271, 0.3439, …`. Se le finestre arrivano una dopo l'altra, la seconda continua dove finisce la prima.

### 2. Coefficienti scritti come testo

**b** `1 2 1`, **a** `1 0.5`: su `[1, 0, 0]` esce `[1, 1.5, 0.25]`.

### 3. Un filtro instabile

**b** `[1]`, **a** `[1, -1.1]` (polo in 1,1): su `[1, 0, 0, 0, 0]` esce `[1, 1.1, 1.21, 1.331, 1.4641]`, che cresce senza fine. La [Risposta in frequenza (freqz, Bode)](sig.response) dà **stabile** = no.

### 4. Coefficienti da un altro blocco

```
[Filtro IIR (butter, cheby1, cheby2)] coefficienti ──▶ coefficienti [Equazione alle differenze (lfilter)]
```

(con l'uscita nascosta mostrata nelle Proprietà): il secondo blocco applica lo stesso filtro, utile per filtrare un altro segnale con la stessa ricetta.

## Errori

| Messaggio | Quando |
|---|---|
| I coefficienti b devono essere una lista | **b** non è una lista (né numeri separati). |
| I coefficienti a devono essere una lista | **a** non è una lista (né numeri separati). |
| Serve almeno un coefficiente b | La lista **b** è vuota. |
| Il primo coefficiente a (a0) non può essere 0 | **a** è vuota o comincia con 0. |
| I coefficienti b: il valore N non è un numero | Il coefficiente numero N di **b** non è un numero. |
| I coefficienti a: il valore N non è un numero | Il coefficiente numero N di **a** non è un numero. |
| I coefficienti non sono JSON valido | Su **coefficienti** è arrivato un testo che non è JSON. |
| I coefficienti devono essere una lista (FIR), { b, a } o { sos } | Su **coefficienti** non c'è né una lista né un oggetto con `b` o `sos`. |
| La sezione N deve avere 6 coefficienti [b0, b1, b2, a0, a1, a2] | In `sos`, la sezione N non ha 6 numeri. |
| La sezione N ha a0 = 0 | In `sos`, la sezione N ha `a0` = 0. |
| I coefficienti: il valore N non è un numero | Un coefficiente di una lista o di una sezione non è un numero. |
| Il segnale manca | Su **segnale** è arrivato un valore vuoto (`null`). |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | È arrivato un altro tipo di valore. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` non è maggiore di 0. |
| Il segnale ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il segnale: il valore N non è un numero | Il campione numero N non è un numero. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Risposta in frequenza (freqz, Bode)](sig.response) per modulo, fase, poli, zeri e stabilità
- [Filtro IIR (butter, cheby1, cheby2)](sig.iir) per progettare un filtro dalle frequenze
- [Filtro FIR (firwin)](sig.fir) per progettare un FIR a fase lineare
- [Biquad (RBJ, equalizzatore)](sig.biquad) per un filtro del secondo ordine
- [Filtro su campioni (media mobile, EMA)](sig.smooth) per lisciare valori
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
