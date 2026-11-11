# Correlazione (np.correlate)

`sig.correlate` · Segnali · [Segnali](logicstudio-signals) · versione 1

Misura quanto due segnali si somigliano quando uno viene spostato nel tempo: la **correlazione incrociata** di **a** e **b**. Il suo picco dice di quanto **a è in ritardo** su **b**. Senza **b** fa l'**autocorrelazione** di **a**, che mostra le ripetizioni di un segnale (il periodo di un suono, un'eco). Serve a stimare ritardi (tempo di volo, eco, sincronizzazione), a trovare un segnale noto dentro un altro e a vedere se un segnale è periodico o è rumore.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** (`a`) | qualsiasi | Il primo segnale: un oggetto `{ fs, t0, samples }` o una lista di numeri (presa come segnale alla **fs delle liste semplici**). |
| **b** (`b`) | qualsiasi | Il secondo segnale, nello stesso formato. **Senza b** (non collegato, o ancora senza valore) il blocco calcola l'autocorrelazione di **a**. Se sono tutti e due oggetti, devono avere la stessa `fs`. |

Il blocco calcola quando **a** ha un valore, e di nuovo a ogni nuovo valore su **a** o su **b**. Un valore solo su **b** non basta.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **correlazione (t = ritardo)** (`correlation`) | oggetto | La correlazione come segnale `{ fs, t0, samples }`: il campione in posizione `i` vale la correlazione al ritardo `t0 + i/fs`, cioè **il tempo `t` è il ritardo** (negativo a sinistra, 0 al centro, positivo a destra). Per [Per grafico](sig.toChart). |
| **ritardo di a su b (s)** (`delay`) | numero | Il ritardo, in secondi, in cui la correlazione è massima: **positivo** se **a** è in ritardo su **b**. |
| **ritardo (campioni)** (`lag`) | numero | Lo stesso ritardo, in campioni. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **valore al ritardo** (`max`) | numero | Il valore della correlazione nel suo massimo (con il coefficiente, 1 vuol dire identici). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Segnali non validi, vuoti o con `fs` diverse; troppo lunghi. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Normalizzazione** (`normalize`) | coefficiente (−1 … 1), nessuna (somme), polarizzata (÷ N), non polarizzata (÷ N − \|k\|) | coefficiente | Come si scala la correlazione (vedi sotto). |
| **Ritardo massimo (s, 0 = tutti)** (`maxLag`) | 0 o più | 0 | Cerca e mostra solo i ritardi tra −maxLag e +maxLag. 0 = tutti i ritardi possibili. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri. |

## Come funziona

- Il risultato ha un valore per ogni ritardo `k` da `−(M − 1)` a `N − 1` campioni (N campioni in **a**, M in **b**), o solo per i ritardi entro **Ritardo massimo**. Il tempo del primo punto (`t0`) è il ritardo più negativo.
- **Normalizzazione**:
  - **coefficiente**: tutto diviso per `√(Ea · Eb)`, con `Ea` e `Eb` le energie (somma dei quadrati) dei due segnali. Il risultato sta tra −1 e 1; per l'autocorrelazione vale 1 al ritardo 0;
  - **nessuna**: le somme così come sono;
  - **polarizzata**: tutto diviso per il più lungo tra N e M;
  - **non polarizzata**: ogni ritardo diviso per il numero di coppie che sono servite a calcolarlo (`N − |k|` se i segnali sono lunghi uguali): toglie l'effetto del bordo, ma i ritardi grandi sono più rumorosi.
- Il **ritardo** è quello del **massimo** (il valore più alto, non il più grande in valore assoluto); se ci sono più massimi uguali conta il primo, cioè il più negativo. Una versione invertita (−1) non si vede come massimo. La precisione è di un campione (`1/fs`); non c'è interpolazione.
- Con **b** non collegato, **ritardo** è 0 (l'autocorrelazione è massima senza spostamento, a meno che il segnale sia tutto zero): conta solo il segnale **correlazione**.
- Il risultato esce sempre come segnale, anche se sono arrivate liste. La parte immaginaria `im` è ignorata.
- La lunghezza `N + M − 1` non può superare il limite del motore.

## Un po' di teoria

La **correlazione incrociata** di `a` e `b` al ritardo `k` è

`r[k] = Σ a[n + k] · b[n]`

Si sposta `a` di `k` campioni contro `b` e si sommano i prodotti. Dove i due segnali si somigliano il prodotto è sempre grande e positivo: `r[k]` ha un **massimo**. Se `a` è una copia di `b` ritardata di `D` campioni, `a[n + D] = b[n]` e il massimo è a `k = D`: il ritardo è positivo quando **a è in ritardo** su **b**. Il tempo di ritardo è `D/fs`.

- **Coefficiente di correlazione**: `r[k] / √(Ea · Eb)`, tra −1 e 1. Vale 1 per due segnali uguali a meno di un'ampiezza.
- **Autocorrelazione** (`b = a`): è pari (`r[−k] = r[k]`) e ha il massimo a `k = 0`, dove vale l'energia del segnale. Un segnale **periodico** ha picchi a ogni multiplo del periodo (una sinusoide a 50 Hz con `fs` = 1000 Hz ha picchi ogni 20 campioni, 0,02 s); il **rumore bianco** ha un solo picco a 0.
- Il legame con la convoluzione: la correlazione di `a` e `b` è la convoluzione di `a` con `b` rovesciato nel tempo. È quello che fa il **filtro adattato** (matched filter) per ritrovare un segnale noto dentro il rumore.
- Nella frequenza, la correlazione è l'antitrasformata di `A(f) · conj(B(f))` (teorema di Wiener–Khinchin per l'autocorrelazione, che è la trasformata della densità spettrale di potenza).

## Esempi

### 1. Il ritardo tra due segnali

`b` = `[1, 2, 1, 0, 0]` e `a` = `[0, 0, 1, 2, 1]` (cioè `b` spostato di 2 campioni), `fs` = 1000 Hz:

```
[Segnale da lista: a] segnale ──▶ a [Correlazione (np.correlate)] ritardo di a su b (s) ──▶ valore [Print (console.log)]
[Segnale da lista: b] segnale ──▶ b
```

**ritardo di a su b (s)** manda `0.002`, **ritardo (campioni)** `2`, e con il coefficiente **valore al ritardo** è `1`. Scambiando **a** e **b** il ritardo diventa `−0.002`. Con **Normalizzazione** «nessuna» la correlazione ai ritardi da −4 a 4 è `[0, 0, 0, 0, 1, 4, 6, 4, 1]` (il massimo, 6, è al ritardo 2) e `t0` vale `-0.004`.

### 2. L'autocorrelazione

Solo **a** collegato: la correlazione ha il massimo a 0 (valore 1 con il coefficiente) e la forma dice le ripetizioni del segnale:

```
[Generatore (oscillatore)] segnale ──▶ a [Correlazione (np.correlate)] correlazione (t = ritardo) ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
```

### 3. Solo i ritardi piccoli

Con **Ritardo massimo** 0,005 s e `fs` = 1000 Hz la correlazione tiene solo i ritardi da −5 a +5 campioni (11 valori, `t0` = −0,005): utile per segnali lunghi quando si sa che il ritardo è piccolo.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale a manca / Il segnale b manca | Un valore vuoto (`null`) su **a** (su **b** un `null` conta come «senza b»: autocorrelazione). |
| Il segnale a deve essere una lista di numeri o un oggetto { fs, samples } | Su **a** è arrivato un altro tipo di valore. |
| Il segnale b deve essere una lista di numeri o un oggetto { fs, samples } | Su **b** è arrivato un altro tipo di valore. |
| Il segnale a ha una frequenza di campionamento (fs) non valida | In **a** (o **b**: «Il segnale b …»), `fs` non è maggiore di 0. |
| Il segnale a ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il segnale a: il valore N non è un numero | Il campione numero N di **a** (o di **b**: «Il segnale b: …») non è un numero. |
| I segnali hanno fs diverse (… e … Hz): usa prima Ricampiona | **a** e **b** sono oggetti con `fs` diverse. |
| I segnali non possono essere vuoti | Una delle due liste non ha campioni. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | **a** o **b**, o la lunghezza `N + M − 1`, supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Convoluzione (np.convolve)](sig.convolve) per il calcolo legato (la correlazione è la convoluzione con un segnale rovesciato)
- [Ricampiona (resample)](sig.resample) per portare due segnali alla stessa `fs`
- [Frequenza · Periodo](sig.frequency) per misurare la frequenza di un segnale
- [Densità spettrale (scipy.signal.welch)](sig.psd) per la distribuzione della potenza nelle frequenze
- [Per grafico](sig.toChart) per disegnare la correlazione
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
