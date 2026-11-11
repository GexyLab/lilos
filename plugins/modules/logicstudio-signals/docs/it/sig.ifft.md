# IFFT (np.fft.ifft)

`sig.ifft` · Segnali · [Segnali](logicstudio-signals) · versione 1

Fa il percorso inverso della [FFT](sig.fft): da uno **spettro** rifà il **segnale nel tempo**. Serve a filtrare "a mano" (si azzerano alcune frequenze dello spettro e si torna indietro) o a controllare che una trasformata non abbia perso nulla.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **spettro** (`spectrum`) | oggetto | Uno spettro prodotto da [FFT](sig.fft): servono almeno `f`, `re`, `im`, `n` e `fs` (e `sided`, `t0` se ci sono). Il blocco usa **re** e **im**, i valori grezzi, non `mag`: la scala scelta nella FFT non cambia il risultato. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale ricostruito `{ fs, t0, samples }` con la stessa `fs` e `t0` dello spettro e `n` campioni. Con **Segnale reale** spento ha anche `im`. |
| **Exception** (`error`) | oggetto | L'ingresso non è uno spettro, `n` o `fs` non validi, segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Segnale reale (togli la parte immaginaria)** (`real`) | sì / no | sì | Sì: manda solo la parte reale. No: manda anche la parte immaginaria `im`, per i segnali complessi. |

## Come funziona

- Se lo spettro è **monolatero** (da 0 a fs/2), il blocco ricostruisce da solo la metà mancante: per ogni frequenza oltre fs/2 mette il **complesso coniugato** di quella simmetrica (la parte reale uguale, quella immaginaria cambiata di segno). Così il segnale che esce è reale.
- Se è **bilatero**, i punti sono rimessi al loro posto (le frequenze negative in fondo) e basta.
- Se nella FFT hai usato una **finestra**, lo spettro è quello del segnale già pesato: l'IFFT restituisce il segnale **con la finestra applicata**, non l'originale. Con la finestra Rettangolare ritrovi il segnale di partenza (fino a errori di calcolo piccolissimi).
- Con **Punti** più grandi di N (zero-padding) il segnale torna lungo quanto i punti, con degli zeri in fondo.
- Se nello spettro hai cambiato `re` e `im` (per esempio con un blocco che azzera alcune frequenze), il risultato segue le tue modifiche. Cambiare solo `mag` o `db` non ha effetto.

## Un po' di teoria

La trasformata inversa è `x[n] = (1/N) · Σ X[k]·e^(+i2πkn/N)`. Con N valori complessi di ingresso dà esattamente gli N campioni da cui si è partiti: la DFT non perde informazione, è solo un cambio di punto di vista.

Per un segnale **reale** vale la **simmetria hermitiana**: `X[N−k] = conj(X[k])`. Per questo basta conoscere metà dello spettro; se la simmetria non è rispettata (per esempio se si modifica una sola metà), il segnale che esce ha una parte immaginaria diversa da zero, e tenerla con **Segnale reale** acceso vuol dire scartarla.

Filtrare in frequenza (azzerare le frequenze che non servono) è una moltiplicazione per una "finestra" nello spettro, che nel tempo diventa una convoluzione con un sinc: dà ondulazioni ai bordi. Per questo i filtri veri sono progettati con attenzione (vedi i filtri del pacchetto).

## Esempi

### 1. Andata e ritorno

```
[Generatore (oscillatore)] segnale ──▶ segnale [FFT (np.fft.fft)] spettro ──▶ spettro [IFFT (np.fft.ifft)] segnale ──▶ dati [Per grafico] dati del grafico ──▶ dati [Linee]
```

Con un seno di 50 Hz e ampiezza 2, a 1000 Hz e 1000 campioni, il campione 5 torna `2` (quello originale è `2·sin(2π·50·5/1000)`, cioè 2).

### 2. Con la finestra

Se nella FFT scegli **Hann**, il segnale che torna sale e scende dolcemente agli estremi: è l'originale moltiplicato per la finestra. Per riavere l'originale usa **Rettangolare**.

## Errori

| Messaggio | Quando |
|---|---|
| Serve uno spettro di FFT (con re e im) | L'ingresso non è un oggetto con `f`, `re` e `im` (per esempio una lista o una PSD). |
| Lo spettro non ha n e fs validi | `n` non è almeno 1 oppure `fs` non è maggiore di 0. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | `n` supera il limite `signalSamples` (65536 di serie). Vedi [i limiti](logicstudio-engine/limits). |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft) per ottenere lo spettro
- [Densità spettrale (scipy.signal.welch)](sig.psd) (la PSD non si può invertire: non ha la fase)
- [Per grafico](sig.toChart) per disegnare il segnale
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
