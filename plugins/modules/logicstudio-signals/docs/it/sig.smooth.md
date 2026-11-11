# Filtro su campioni (media mobile, EMA)

`sig.smooth` · Segnali · [Segnali](logicstudio-signals) · versione 1

Liscia una misura: la media esponenziale (EMA), la media mobile o la mediana mobile. Funziona sia con **valori singoli** che arrivano uno alla volta (la lettura di un sensore) sia con **finestre di campioni** (un segnale). Ricorda i valori passati tra una chiamata e la successiva. È il filtro più semplice da usare quando non servono frequenze di taglio: per quelli c'è il [Filtro IIR](sig.iir).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore o segnale** (`value`) | qualsiasi | Un numero (anche un testo con un numero, `"2,5"`), una lista di numeri (presa come segnale alla **fs delle liste semplici**) o un oggetto `{ fs, t0, samples }`. |
| **azzera** (`reset`) | impulso | Dimentica i valori passati: il prossimo valore riparte da capo. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **filtrato** (`value`) | qualsiasi | Il valore lisciato: un numero se è arrivato un numero; se è arrivata una lista, una lista; se è arrivato un segnale, un segnale con la stessa `fs` e lo stesso `t0`. |
| **Exception** (`error`) | oggetto | Un valore che non è né un numero né un segnale valido, o un segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tipo** (`kind`) | esponenziale (costante di tempo τ), esponenziale (fattore α), media mobile di N, mediana mobile di N | esponenziale (costante di tempo τ) | Come si liscia. |
| **Costante di tempo τ (s)** (`tau`) | 0 o più | 1 | Quanto è lento il lisciamento: in τ secondi l'uscita fa il 63% della strada verso un valore nuovo. 0 = nessun lisciamento. Si vede solo con **esponenziale (τ)**. |
| **Fattore α (0…1, peso del valore nuovo)** (`alpha`) | da 0 a 1 | 0,2 | Quanto pesa il valore nuovo a ogni passo. 1 = nessun lisciamento, vicino a 0 = molto lento. Si vede solo con **esponenziale (α)**. |
| **N valori** (`length`) | da 1 a 10000 | 10 | Quanti valori entrano nella media o nella mediana. Si vede solo con **media mobile** e **mediana mobile**. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista di numeri che arriva su **valore o segnale**. |

## Come funziona

- Il primo valore passa così com'è (l'EMA parte da lì). Con la media e la mediana mobile, finché non ci sono N valori si usano quelli che ci sono.
- **Numeri singoli**: ogni nuovo numero è un passo. Nell'EMA con τ il tempo tra due numeri è quello **vero**, misurato dall'orologio tra un arrivo e l'altro: se i valori arrivano più lenti, ogni passo pesa di più. Nelle altre modalità il tempo non conta.
- **Segnali e liste**: ogni campione è un passo, e il tempo tra due campioni è `1/fs`. Il ricordo dei campioni passati resta **tra una finestra e la successiva**, quindi finestre consecutive si uniscono senza salti. Se arriva una lista, esce una lista.
- **azzera** fa dimenticare tutto. Anche cambiare **Tipo** riparte da zero; cambiare τ, α o N no.
- Non è un blocco con coefficienti: non manda i coefficienti alla Risposta in frequenza. Per quello, un'EMA corrisponde a un filtro IIR di primo ordine (vedi la teoria) e una media mobile a un [Filtro FIR](sig.fir) di tipo media mobile.
- La parte immaginaria `im` di un segnale complesso viene ignorata.

## Un po' di teoria

**Media esponenziale (EMA)**: a ogni passo l'uscita si sposta verso il valore nuovo di una frazione α:

`y[n] = y[n−1] + α · (x[n] − y[n−1])`

È un filtro IIR di primo ordine (`H(z) = α / (1 − (1−α)·z⁻¹)`), un passa-basso. Con la costante di tempo τ, il fattore dipende dal tempo tra i campioni Δt:

`α = 1 − e^(−Δt/τ)`

Per Δt molto più piccolo di τ vale circa `Δt/τ`. In un passo di gradino, l'uscita arriva al 63% dopo τ e al 95% dopo 3τ. L'EMA costa poca memoria (un solo valore) e dà più peso ai valori recenti.

**Media mobile di N**: la media degli ultimi N valori. Riduce il rumore bianco di `√N` ma ritarda di `(N − 1)/2` campioni e fa «a scatti» quando un valore esce dalla finestra.

**Mediana mobile di N**: il valore di mezzo tra gli ultimi N, ordinati. Non è un filtro lineare: elimina i **valori isolati sbagliati** (spike) senza smussare i salti veri, cosa che media ed EMA non sanno fare. Con N pari è la media dei due valori di mezzo.

## Esempi

### 1. Liscare la lettura di un sensore

I valori arrivano uno alla volta (per esempio da un sensore, o scritti a mano in un [Campo numerico](ui.number)); τ = 2 s:

```
[Campo numerico] valore ──▶ valore o segnale [Filtro su campioni (media mobile, EMA)] filtrato ──▶ valore [Etichetta]
```

L'etichetta mostra una lettura meno nervosa, che segue i cambiamenti veri con un ritardo di circa 2 s.

### 2. Gli stessi dati con i diversi tipi

Su una lista `[0, 10, 10, 10]` (`fs` = 1000 Hz):

- **esponenziale (α)** con α = 0,5 → `[0, 5, 7.5, 8.75]`;
- **esponenziale (τ)** con τ = 0,01 s → `[0, 0.9516, 1.8127, 2.5918]` (α = 1 − e^(−0,1) = 0,0952 per campione, quindi sale lentamente verso 10).

Su `[1, 2, 3, 4, 5]` la **media mobile** di 3 dà `[1, 1.5, 2, 3, 4]`. Su `[1, 100, 2, 3]` la **mediana mobile** di 3 dà `[1, 50.5, 2, 3]`: lo spike `100` sparisce non appena la finestra ha 3 valori.

### 3. Togliere un picco da un segnale

```
[Rumore (np.random)] segnale ──▶ valore o segnale [Filtro su campioni (media mobile, EMA)] filtrato ──▶ segnale o spettro [Per grafico]
```

con **mediana mobile** di 5: i valori isolati troppo alti o bassi spariscono.

## Errori

| Messaggio | Quando |
|---|---|
| Il valore manca | Su **valore o segnale** è arrivato un valore vuoto (`null`). |
| Il valore deve essere una lista di numeri o un oggetto { fs, samples } | È arrivato un testo che non è un numero né una lista, o un altro tipo di valore. |
| Il valore ha una frequenza di campionamento (fs) non valida | In un segnale, `fs` non è maggiore di 0. |
| Il valore ha samples e im di lunghezze diverse | `im` e `samples` non hanno la stessa lunghezza. |
| Il valore: il valore N non è un numero | Il campione numero N non è un numero. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Il segnale supera il limite del motore (vedi [Limiti](logicstudio-engine/limits)). |

## Vedi anche

- [Filtro IIR (butter, cheby1, cheby2)](sig.iir) per filtrare con una frequenza di taglio
- [Filtro FIR (firwin)](sig.fir) per la media mobile con i coefficienti e il ritardo
- [Equazione alle differenze (lfilter)](sig.difference) per un'EMA o altri filtri scritti a mano
- [Misure (RMS, picco, media)](sig.measure) per la media di un'intera finestra
- [Segnali](logicstudio-signals)
- [Limiti del motore](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
