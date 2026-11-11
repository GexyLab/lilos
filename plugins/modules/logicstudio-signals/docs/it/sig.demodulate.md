# Demodula (AM, FM, PM)

`sig.demodulate` · Segnali · [Segnali](logicstudio-signals) · versione 1

Recupera il **messaggio** da un segnale modulato in ampiezza (**AM**, **DSB-SC**), in frequenza (**FM**) o in fase (**PM**). È il contrario di [Modula (AM, FM, PM)](sig.modulate): con **le stesse impostazioni** (tipo, portante, ampiezza, indice o deviazione) i due blocchi fanno una coppia che funziona.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale modulato** (`signal`) | qualsiasi | Il segnale modulato: un oggetto `{ fs, t0, samples }` o una lista di numeri (presa come segnale alla **fs delle liste semplici**). Servono almeno 4 campioni. La parte immaginaria `im`, se c'è, viene ignorata. |
| **azzera** (`reset`) | impulso | Non ha effetto qui: Demodula non ricorda niente tra una finestra e la successiva. C'è per avere le stesse porte di Modula. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **messaggio** (`signal`) | oggetto | Il messaggio recuperato `{ fs, t0, samples }`, con la `fs` e il `t0` del segnale. Esce sempre come segnale, anche se è arrivata una lista. |
| **Exception** (`error`) | oggetto | Portante o ampiezza non valide, indice non valido, segnale troppo corto, non valido o troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Modulazione** (`kind`) | AM (con portante), DSB-SC (portante soppressa), FM, PM | AM | Il tipo di modulazione da disfare. |
| **Frequenza della portante (Hz)** (`carrier`) | 0 o più, sotto fs/2 | 100 | La frequenza della portante usata nella modulazione. |
| **Ampiezza della portante** (`amplitude`) | maggiore di 0 | 1 | L'ampiezza A della portante. |
| **Indice di modulazione m** (`index`) | maggiore di 0 | 0,5 | L'indice usato nella modulazione. Si vede solo con **AM**. |
| **Deviazione (Hz per unità del messaggio)** (`deviation`) | maggiore di 0 | 100 | La deviazione usata nella modulazione. Si vede solo con **FM**. |
| **Deviazione di fase (rad per unità)** (`phaseDev`) | maggiore di 0 | 1,5708 | La deviazione di fase usata nella modulazione. Si vede solo con **PM**. |
| **Passa-basso dopo DSB-SC (Hz, 0 = portante/2)** (`cutoff`) | 0 o più | 0 | La frequenza di taglio del passa-basso che toglie la componente a due volte la portante. 0 = portante/2. Si vede solo con **DSB-SC**. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri. |

## Come funziona

Il blocco lavora su **una finestra alla volta**, senza memoria. Il tempo usato per la portante è quello vero, `t = t0 + n/fs`, come in Modula.

| Modulazione | Come si recupera |
|---|---|
| **AM** | Si prende l'**inviluppo** `|z|` del segnale analitico `z` (con la trasformata di Hilbert, calcolata con la FFT) e si toglie la portante: `x = (|z| / A − 1) / m`. |
| **DSB-SC** | Demodulazione **coerente**: si moltiplica per `2·cos(2π·fc·t) / A` e si passa per un **passa-basso Butterworth di ordine 4 a fase zero** (di serie a metà portante, o a **Passa-basso dopo DSB-SC**). |
| **FM** | Si prende la fase del segnale analitico rispetto alla portante, la si «svolge» e si fa la **derivata**: `x = (dφ/dt) / (2π·kf)`. |
| **PM** | Si prende la fase rispetto alla portante, la si «svolge», si toglie il giro di 2π intero più vicino alla media e si divide per `kp`. |

- Servono **almeno 4 campioni**, ma per un buon risultato molti cicli della portante in ogni finestra.
- La portante deve stare **sotto fs/2** (errore altrimenti).
- Il calcolo con la FFT (Hilbert) è meno preciso **ai bordi** della finestra, specialmente se la finestra non contiene un numero intero di cicli. Usa finestre lunghe e butta via i primi e gli ultimi campioni se servono valori precisi.
- Vale il messaggio che aveva la **stessa portante, ampiezza, indice o deviazione**: con impostazioni diverse il messaggio esce scalato o sbagliato.
- In **AM** il messaggio deve essere stato modulato senza sovramodulazione (`m·|x| ≤ 1`); in **FM** la portante deve essere molto più alta delle frequenze del messaggio; in **PM** la fase totale `kp·x` dovrebbe stare entro ±π.
- La **DSB-SC** assume che la portante locale sia in fase con quella del modulatore (come fa Modula, `cos(2π·fc·t)` con t vero).

## Un po' di teoria

- **Segnale analitico**: `z(t) = s(t) + j·H{s}(t)`, dove `H` è la trasformata di Hilbert (sposta di 90° ogni frequenza). Il modulo `|z|` è l'inviluppo, l'argomento la fase istantanea. Per un segnale AM `A(1 + m·x)·cos(2π·fc·t)` con la portante molto sopra la banda del messaggio, `|z| = A·(1 + m·x)`: da qui il messaggio.
- **Rivelatore di inviluppo** (AM): ricava `A(1 + m·x)`, funziona senza conoscere la fase della portante, ma vuole la portante nel segnale (la AM con portante).
- **Demodulazione coerente** (DSB-SC): moltiplicando `A·x·cos(ωt)` per `2·cos(ωt)/A` si ha `x·(1 + cos 2ωt)`. Il passa-basso toglie il termine a `2·fc` e resta `x`. Se la portante locale ha una fase sbagliata `θ`, il segnale cala di `cos θ`.
- **FM**: la frequenza istantanea è la derivata della fase, `f(t) = fc + kf·x(t)`; si recupera con `(f − fc)/kf`. Il discriminatore a derivata è il modo digitale di fare quello che faceva un discriminatore analogico. Un rumore forte sul segnale dà «clic» (salti di fase di 2π).
- **PM**: la fase relativa alla portante è già `kp·x`. Ha un'ambiguità di 2π, risolta qui con la fase «svolta» e togliendo il giro intero più vicino alla media.

## Esempi

### 1. AM: modulare e demodulare

`fs` = 10000 Hz, messaggio sinusoidale 50 Hz, **Modulazione** AM, portante 1000 Hz, `m` = 0,5, in tutti e due i blocchi:

```
[Generatore (oscillatore): 50 Hz] segnale ──▶ messaggio [Modula (AM, FM, PM)] segnale modulato ──▶ segnale modulato [Demodula (AM, FM, PM)] messaggio ──▶ segnale o spettro [Per grafico] dati del grafico ──▶ dati (lista o oggetto) [Linee]
```

In una finestra di 1000 campioni il messaggio recuperato è uguale all'originale (errore sotto 0,0001 nei campioni lontani dai bordi). Lo stesso succede con DSB-SC e con PM; con FM (deviazione 200) l'errore massimo è circa 0,03.

### 2. Una trasmissione ricevuta da fuori

Un segnale AM arrivato da un altro programma (una radio, un file), con portante nota 1000 Hz e `fs` = 10000 Hz: **Frequenza della portante** 1000 e **Ampiezza** quella del trasmettitore. Si può ripulire il risultato con un [Filtro IIR](sig.iir) passa-basso.

### 3. Una FM

**Modulazione** FM, portante 1000 Hz, **Deviazione** 200: se l'ingresso ha una frequenza istantanea di 1100 Hz, l'uscita vale `(1100 − 1000)/200 = 0,5`.

## Errori

| Messaggio | Quando |
|---|---|
| La portante (… Hz) deve stare sotto fs/2 (… Hz), altrimenti c'è aliasing | **Frequenza della portante** non è minore di fs/2. |
| L'ampiezza della portante deve essere più di 0 | **Ampiezza della portante** è 0 o meno. |
| Servono almeno 4 campioni | Il segnale ha meno di 4 campioni. |
| L'indice di modulazione deve essere più di 0 | In **AM**, **Indice di modulazione** è 0 o meno. |
| Il segnale modulato manca | Su **segnale modulato** è arrivato un valore vuoto (`null`). |
| Il segnale modulato deve essere una lista di numeri o un oggetto { fs, samples } | È arrivato un altro tipo di valore. |
| Il segnale modulato ha una frequenza di campionamento (fs) non valida | `fs` non è maggiore di 0. |
| Il segnale modulato ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il segnale modulato: il valore N non è un numero | Il campione numero N non è un numero. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Modula (AM, FM, PM)](sig.modulate) per modulare, con le stesse impostazioni
- [Inviluppo (scipy.signal.hilbert)](sig.envelope) per l'inviluppo di un segnale
- [Filtro IIR (butter, cheby1, cheby2)](sig.iir) per ripulire il messaggio
- [FFT (np.fft.fft)](sig.fft) per vedere lo spettro
- [Frequenza · Periodo](sig.frequency) per misurare la frequenza
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
