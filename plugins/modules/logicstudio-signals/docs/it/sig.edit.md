# Ritardo · Taglia · Zero-padding

`sig.edit` · Segnali · [Segnali](logicstudio-signals) · versione 1

Cambia un segnale nel tempo senza cambiarne i valori: lo ritarda, lo fa scorrere in cerchio, ne taglia un pezzo, lo allunga con zeri, lo inverte nel tempo o lo ripete.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale: un segnale vero `{ fs, t0, samples }` o una lista di numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale cambiato. Se in ingresso c'era una lista semplice, esce una lista semplice. |
| **Exception** (`error`) | oggetto | **A** prima di **Da** in **Taglia**, un segnale troppo lungo, o un ingresso che non è un segnale. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | ritarda, scorri in cerchio, taglia, zero-padding, inverti il tempo, ripeti | ritarda | Cosa fare al segnale (vedi la tabella sotto). |
| **Secondi (negativi = in anticipo)** (`seconds`) | numero | 0,1 | Di quanto ritardare o far scorrere. Si vede solo con **ritarda** e **scorri in cerchio**. |
| **Da (s dall'inizio)** (`from`) | da 0 in su | 0 | L'inizio del pezzo da tenere. Si vede solo con **taglia**. |
| **A (s, 0 = la fine)** (`to`) | da 0 in su | 0 | La fine del pezzo da tenere; 0 vuol dire fino all'ultimo campione. Si vede solo con **taglia**. |
| **Lunghezza (0 = potenza di 2 successiva)** (`length`) | da 0 in su | 0 | La lunghezza finale, in campioni. Si vede solo con **zero-padding**. |
| **Volte** (`times`) | da 1 in su | 2 | Quante volte ripetere il segnale. Si vede solo con **ripeti**. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso. Un segnale vero porta già la sua fs. |

| Operazione | Cosa fa |
|---|---|
| **Ritarda** (`delay`) | Mette degli zeri davanti e butta quello che esce in fondo: **stessa lunghezza**. Con secondi negativi anticipa (gli zeri vanno in fondo). |
| **Scorri in cerchio** (`shift`) | Come ritardare, ma i campioni che escono da una parte rientrano dall'altra. |
| **Taglia** (`trim`) | Tiene i campioni da **Da** fino a **A** (in secondi dall'inizio). Il tempo iniziale `t0` del risultato è spostato di conseguenza. |
| **Zero-padding** (`pad`) | Porta il segnale a **Lunghezza** campioni aggiungendo zeri in fondo (se è più corto) o tagliandolo (se è più lungo). Con 0 sceglie la prossima potenza di 2. |
| **Inverti il tempo** (`reverse`) | Il primo campione diventa l'ultimo: `x(−t)`. |
| **Ripeti** (`repeat`) | Mette il segnale uno dopo l'altro **Volte** volte. |

## Come funziona

I secondi diventano campioni moltiplicando per la fs del segnale e **arrotondando**: a fs 1000 Hz, 0,003 s sono 3 campioni.

- **Ritarda.** Con `[1…8]` a 1000 Hz e 0,003 s → `[0, 0, 0, 1, 2, 3, 4, 5]`. Con −0,002 s → `[3, 4, 5, 6, 7, 8, 0, 0]`. Il `t0` non cambia.
- **Scorri in cerchio.** Con 0,003 s → `[6, 7, 8, 1, 2, 3, 4, 5]`.
- **Taglia.** Con **Da** 0,002 s e **A** 0,005 s → `[3, 4, 5]` e `t0` = 0,002 s. Se **A** è oltre la fine, si arriva alla fine.
- **Zero-padding.** Con **Lunghezza** 10 → `[1…8, 0, 0]`; con 5 → `[1, 2, 3, 4, 5]`; con 0 e 100 campioni → 128.
- **Ripeti.** Con 2 volte → i campioni due volte di seguito; la durata raddoppia.
- Con le liste semplici le uscite sono liste semplici.
- Le parti immaginarie di un segnale complesso non vengono mantenute.

## Un po' di teoria

- **Il ritardo** di `τ` secondi cambia solo la fase: `x(t − τ) ⇄ X(f)·e^(−j2πfτ)`. Lo spettro in ampiezza resta uguale, la fase scende in modo lineare con la frequenza (ritardo di gruppo costante, pari a τ). Anche lo scorrimento in cerchio, che è il ritardo "della DFT", fa lo stesso.
- **Anticipare** (secondi negativi) è lo stesso ritardo con segno opposto: i primi campioni escono dal segnale e sono persi, in fondo entrano zeri.
- **Zero-padding.** Aggiungere zeri prima di una FFT non dà informazione nuova: *interpola* lo spettro, perché la distanza tra i bin diventa `df = fs / N` con `N` più grande, e rende il picco più facile da leggere. La risoluzione vera (quanto sono vicine due righe che si riescono ancora a separare) dipende solo dalla durata del segnale registrato, circa `1 / T`. Una potenza di 2 rende la FFT più veloce.
- **Taglia** serve a isolare un tratto stabile; meno campioni vuol dire una risoluzione in frequenza più grossolana.
- **Inverti il tempo** coniuga lo spettro: per un segnale reale la fase cambia segno e il modulo resta uguale.
- **Ripeti** costruisce un segnale periodico: se il pezzo ripetuto è un periodo intero, lo spettro non cambia di forma, ma ci sono più bin tra una riga e l'altra (la durata è maggiore).

## Esempi

### 1. Ritardare un segnale e confrontarlo con l'originale

```
[Generatore (oscillatore)] segnale ──▶ segnale [Ritardo · Taglia · Zero-padding: ritarda 0,01 s] segnale ──▶ segnale [Per grafico]
```

A fs 1000 Hz sono 10 campioni di zeri davanti; la lunghezza resta la stessa.

### 2. Preparare una FFT veloce

```
[Segnale da lista] segnale ──▶ segnale [Ritardo · Taglia · Zero-padding: zero-padding, lunghezza 0] segnale ──▶ segnale [FFT (np.fft.fft)]
```

Con 1000 campioni si arriva a 1024.

### 3. Isolare un tratto

Con un segnale lungo 1 s, **Taglia** da 0,2 a 0,7 tiene mezzo secondo e il `t0` diventa 0,2 s: un grafico dopo il blocco parte da 0,2 s.

## Errori

| Messaggio | Quando |
|---|---|
| «A» deve venire dopo «Da» | In **Taglia**, **A** (diverso da 0) è prima o uguale a **Da**, oppure **Da** è oltre la fine del segnale. |
| Operazione sconosciuta: … | L'operazione salvata nel progetto non esiste (non succede scegliendola dal menu). |
| Il segnale manca | Il blocco parte senza segnale in ingresso. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero, un testo o un oggetto che non è un segnale. |
| Il segnale: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il segnale ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale in ingresso, o il risultato di **Zero-padding** o **Ripeti**, supera il limite (vedi [Limiti del motore](logicstudio-engine/limits)). |

## Vedi anche

- [FFT (np.fft.fft)](sig.fft), che ha anche una sua lunghezza e una potenza di 2
- [Ricampiona (resample)](sig.resample) per cambiare la fs
- [Buffer (campioni → finestre)](sig.buffer) per tagliare un flusso in finestre
- [Somma · Prodotto di segnali](sig.combine) per mettere insieme i segnali
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
