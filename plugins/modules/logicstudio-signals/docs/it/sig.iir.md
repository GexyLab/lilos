# Filtro IIR (butter, cheby1, cheby2)

`sig.iir` · Segnali · [Segnali](logicstudio-signals) · versione 1

Filtra un segnale con un filtro **IIR** (a risposta infinita) classico: Butterworth, Chebyshev I o Chebyshev II; passa-basso, passa-alto, passa-banda o elimina-banda; ordine fino a 20. Il filtro si calcola da solo dalle frequenze e dall'ordine, è fatto di sezioni del secondo ordine e tiene lo stato tra una finestra e la successiva. Manda anche i suoi **coefficienti**, per disegnarne la risposta con [Risposta in frequenza (freqz, Bode)](sig.response).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale da filtrare: un oggetto `{ fs, t0, samples }` o una lista di numeri (presa come segnale alla **fs delle liste semplici**). La parte immaginaria `im`, se c'è, viene ignorata. |
| **azzera** (`reset`) | impulso | Riporta il filtro a zero (nessun ricordo delle finestre passate). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale filtrato, con la stessa `fs` e lo stesso `t0`. Se è arrivata una lista, esce una lista. |
| **coefficienti** (`coefficients`) | oggetto | `{ fs, sos, b, a }`: le sezioni del secondo ordine (`sos`, ognuna `[b0, b1, b2, 1, a1, a2]`), i coefficienti `b` e `a` dell'intero filtro e la `fs` per cui è progettato. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Frequenze o ordine non validi, segnale non valido o troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Famiglia** (`family`) | Butterworth (piatto), Chebyshev I (ondulazione in banda passante), Chebyshev II (ondulazione in banda attenuata) | Butterworth | La forma della risposta (vedi la teoria). |
| **Tipo** (`band`) | passa-basso, passa-alto, passa-banda, elimina-banda | passa-basso | Quali frequenze passano. |
| **Ordine** (`order`) | da 1 a 20 | 4 | Più è alto, più il taglio è ripido. Nei filtri passa-banda ed elimina-banda i poli sono il doppio (ordine 2: 4 poli, 2 sezioni). |
| **Frequenza di taglio (Hz)** (`f1`) | maggiore di 0 e minore di fs/2 | 100 | Il taglio; nei filtri a banda, la frequenza **bassa** della banda. |
| **Frequenza alta (Hz)** (`f2`) | maggiore di **f1** e minore di fs/2 | 200 | La frequenza **alta** della banda. Si vede solo con **passa-banda** o **elimina-banda**. |
| **Ondulazione in banda passante (dB)** (`ripple`) | maggiore di 0 | 1 | Di quanto può ondulare il guadagno in banda passante. Si vede solo con **Chebyshev I**. |
| **Attenuazione in banda attenuata (dB)** (`attenuation`) | maggiore di 0 | 40 | L'attenuazione minima in banda attenuata. Si vede solo con **Chebyshev II**. |
| **Fase zero (avanti e indietro, filtfilt)** (`zeroPhase`) | sì / no | no | Filtra avanti e indietro: nessun ritardo di fase, ma niente stato tra le finestre (vedi sotto). |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri che arriva su **segnale**. Serve anche per i coefficienti mandati all'avvio. |

## Come funziona

- Le frequenze sono in Hz e il filtro usa la `fs` del segnale che arriva. Se la `fs` cambia, il filtro viene calcolato da capo.
- **Lo stato resta tra le finestre**: finestre consecutive dello stesso segnale si uniscono senza salti, come se fosse un unico segnale lungo. **azzera** lo riporta a zero; anche un cambio delle impostazioni (un nuovo progetto del filtro) lo riporta a zero.
- Con **Fase zero** ogni finestra è filtrata **avanti e indietro**, con i bordi prolungati per ridurre i transitori. Non c'è ritardo di fase, ma il filtro agisce due volte (al taglio il guadagno di un Butterworth scende da −3 dB a −6 dB) e **non tiene stato**: ogni finestra è per conto suo. Va bene su un segnale intero, peggio su finestre corte consecutive.
- **All'avvio** il blocco manda i coefficienti calcolati alla **fs delle liste semplici**, così [Risposta in frequenza (freqz, Bode)](sig.response) può disegnarli prima ancora che arrivi un segnale. Poi manda i coefficienti **con il primo segnale** (alla sua `fs`) e di nuovo dopo ogni cambio del progetto o ogni **azzera**.
- Se arriva una lista di numeri, esce una lista; se arriva un segnale, esce un segnale.
- Se i parametri non vanno bene, l'errore arriva con il primo segnale (all'avvio non si dice niente).

## Un po' di teoria

Un filtro IIR calcola l'uscita dagli ingressi e **anche dalle uscite passate**, con l'equazione alle differenze

`y[n] = Σ b[k]·x[n−k] − Σ a[k]·y[n−k]`   (la prima somma da k = 0, la seconda da k = 1)

La sua funzione di trasferimento è `H(z) = (b0 + b1·z⁻¹ + …) / (1 + a1·z⁻¹ + …)`. Le radici del numeratore sono gli **zeri**, quelle del denominatore i **poli**. Il filtro è **stabile** se tutti i poli sono dentro il cerchio unitario (`|p| < 1`); quelli progettati da questo blocco lo sono. Il filtro è una catena di **sezioni del secondo ordine** (biquad): è molto più preciso, nei calcoli, di un unico polinomio di ordine alto.

Le tre famiglie:

- **Butterworth**: guadagno il più piatto possibile in banda passante, senza ondulazioni; al taglio vale −3,01 dB; poi scende di `20·N` dB per decade (N = ordine).
- **Chebyshev I**: più ripido del Butterworth, ma con una **ondulazione** costante in banda passante (`ripple` dB). La frequenza di taglio è dove il guadagno esce da quella banda: con ripple 1 dB, a **f1** il guadagno è −1 dB.
- **Chebyshev II**: banda passante piatta e ondulazione in **banda attenuata**. Qui **f1** è dove comincia la banda attenuata: da lì in poi il guadagno resta sotto `−attenuation` dB (con 40 dB, a **f1** vale −40 dB).

Il filtro digitale nasce da un **prototipo analogico**, trasformato con la **trasformazione bilineare** `s = 2·fs·(z−1)/(z+1)`. La trasformazione deforma l'asse delle frequenze (le comprime verso fs/2), quindi le frequenze di taglio sono **pre-deformate**: `ωa = 2·fs·tan(π·f/fs)`. Così il taglio cade esattamente dove lo hai scritto.

Un filtro IIR ha fase **non lineare**: frequenze diverse sono ritardate in modo diverso (vedi il ritardo di gruppo in [Risposta in frequenza](sig.response)). Se la fase conta, usa **Fase zero** (su un segnale intero) oppure un [Filtro FIR](sig.fir).

## Esempi

### 1. Togliere un disturbo veloce da un segnale lento

Una sinusoide a 5 Hz con un disturbo a 200 Hz, `fs` = 1000 Hz. Un passa-basso di ordine 4 a 20 Hz lascia solo i 5 Hz:

```
[Generatore (oscillatore): 5 Hz]   segnale ──▶ a [Somma · Prodotto di segnali] segnale ──▶ segnale [Filtro IIR (butter, cheby1, cheby2)] segnale ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
[Generatore (oscillatore): 200 Hz] segnale ──▶ b
```

Con una finestra di 1000 campioni (5 Hz + 200 Hz, ampiezza 1 ognuna), il valore efficace dopo il transitorio iniziale è 0,7071, quello della sola sinusoide a 5 Hz.

### 2. Disegnare la risposta del filtro

```
[Filtro IIR (butter, cheby1, cheby2)] coefficienti ──▶ coefficienti [Risposta in frequenza (freqz, Bode)] risposta ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
```

I coefficienti escono all'avvio, quindi il grafico c'è subito. Con le impostazioni di serie (Butterworth, passa-basso, ordine 4, taglio 100 Hz, fs 1000 Hz) la risposta è circa 0 dB a 0 Hz e a 50 Hz, −3,01 dB a 100 Hz, −15,8 dB a 150 Hz, −28 dB a 200 Hz. Con Chebyshev I (1 dB) è −1 dB a 100 Hz e −23,6 dB a 150 Hz; con Chebyshev II (40 dB) è −40 dB a 100 Hz.

### 3. Tenere una banda

**Tipo** passa-banda, **Frequenza di taglio** 80 e **Frequenza alta** 120, ordine 2 (4 poli, 2 sezioni): lascia passare la banda 80 – 120 Hz e toglie il resto.

## Errori

| Messaggio | Quando |
|---|---|
| L'ordine va da 1 a 20 | **Ordine** fuori dall'intervallo. |
| La frequenza di taglio (… Hz) deve stare tra 0 e fs/2 (… Hz) | **Frequenza di taglio** (o **Frequenza alta**) non è maggiore di 0 e minore di fs/2. |
| La seconda frequenza deve essere più alta della prima | Nei filtri a banda, **Frequenza alta** non è maggiore di **Frequenza di taglio**. |
| L'ondulazione deve essere più di 0 dB | Chebyshev I con **Ondulazione** 0 o meno. |
| L'attenuazione deve essere più di 0 dB | Chebyshev II con **Attenuazione** 0 o meno. |
| Il segnale manca | Su **segnale** è arrivato un valore vuoto (`null`). |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | È arrivato un altro tipo di valore. |
| Il segnale ha una frequenza di campionamento (fs) non valida | `fs` non è maggiore di 0. |
| Il segnale ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il segnale: il valore N non è un numero | Il campione numero N non è un numero. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Risposta in frequenza (freqz, Bode)](sig.response) per disegnare modulo, fase, poli e zeri dei coefficienti
- [Biquad (RBJ, equalizzatore)](sig.biquad) per un solo filtro del secondo ordine (anche notch, picco, shelf)
- [Filtro FIR (firwin)](sig.fir) per un filtro a fase lineare
- [Equazione alle differenze (lfilter)](sig.difference) per coefficienti scelti da te
- [Filtro su campioni (media mobile, EMA)](sig.smooth) per lisciare valori
- [FFT (np.fft.fft)](sig.fft) per vedere lo spettro prima e dopo il filtro
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
