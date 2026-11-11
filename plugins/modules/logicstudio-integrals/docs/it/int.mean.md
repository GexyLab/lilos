# Valore medio in [a, b]

`int.mean` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Calcola il valore medio di una funzione su un intervallo: l'integrale diviso la lunghezza dell'intervallo. Trova anche un punto c in cui la funzione vale proprio la media.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come `x^2`. Se non è collegato vale l'impostazione **Funzione**. |
| **a (da)** (`a`) | qualsiasi | L'estremo di sinistra: un numero o un'espressione come `pi/2`. Se non è collegato vale l'impostazione **Da a**. |
| **b (a)** (`b`) | qualsiasi | L'estremo di destra: un numero o un'espressione. Se non è collegato vale l'impostazione **A b**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore medio** (`mean`) | numero | L'integrale diviso (b − a). |
| **integrale** (`integral`) | numero | L'integrale tra a e b. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **c con f(c) = media** (`c`) | numero | Un punto dell'intervallo in cui f vale il valore medio (il primo, da sinistra). Se non se ne trova nessuno, non esce niente. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Un errore del calcolo (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`expr`) | testo | `x^2` | La funzione, se **f** non è collegato. |
| **Variabile** (`variable`) | testo | `x` | Il nome della variabile nella funzione. |
| **Da a** (`a`) | numero o espressione | `0` | L'estremo a, se l'ingresso non è collegato. |
| **A b** (`b`) | numero o espressione | `3` | L'estremo b, se l'ingresso non è collegato. |
| **Metodo** (`method`) | Gauss-Kronrod adattivo / Simpson adattivo / Romberg / Trapezi / Rettangoli al punto medio | Gauss-Kronrod adattivo | Come si calcola l'integrale (vedi [Integrale definito](int.definite)). |
| **Tolleranza** (`tolerance`) | da 1e-15 a 0,1 | 1e-10 | L'errore che i metodi adattivi cercano di non superare. |
| **Intervalli** (`n`) | da 1 a 99999 | 1000 | Quanti intervalli, per Trapezi e Rettangoli. |

## Come funziona

Il blocco calcola l'integrale I di f tra a e b, poi il **valore medio** = I / (b − a).

Poi cerca il punto **c** in cui f(c) è uguale al valore medio (il teorema della media dice che esiste, se f è continua): cerca dove f − media cambia segno e raffina il punto. Esce il primo trovato.

- Gli estremi devono essere **finiti**: qui `inf` non è ammesso.
- Se a e b sono uguali l'intervallo ha lunghezza 0 e il blocco manda un errore.
- Se **a** è più grande di **b** il valore medio resta lo stesso, ma **integrale** cambia segno.
- Si ferma dopo **100000 valutazioni** della funzione per l'integrale.
- Senza ingressi collegati calcola una volta all'avvio dello schema.

## Esempi

### 1. La media di x² tra 0 e 3

```
[Valore medio: x^2, da 0 a 3] valore medio ──▶ valore [Print (console.log)]
```

Nessun ingresso collegato: calcola all'avvio. Scrive `3`. L'integrale è `9` e **c** è `1.73205080756888` (√3: f(√3) = 3).

### 2. La media di un'onda

```
[Costante · Variabile: pi] valore ──▶ b [Valore medio: sin(x), a = 0] valore medio ──▶ valore [Print (console.log)]
```

Scrive `0.636619772367581` (2/π). Con le altre uscite collegate: **integrale** `2`, **c** `0.69010709137454`.

### 3. Intervallo vuoto

Con **Da a** = 1 e **A b** = 1 il blocco manda l'errore «L'intervallo ha lunghezza 0».

## Errori

| Messaggio | Quando |
|---|---|
| L'intervallo ha lunghezza 0 | a e b sono uguali. |
| b: l'infinito non è ammesso qui | Un estremo è `inf` o `-inf` (per a il messaggio comincia con `a:`). |
| a: serve un numero (o un'espressione come pi/2), non «…» | Un estremo non è un numero né un'espressione senza variabili. |
| La funzione non ha un valore finito in x = … | La funzione dà un infinito o «non è un numero» in un punto. |
| Troppe valutazioni della funzione (più di 100000) | Servono più di 100000 valutazioni. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | Nella funzione c'è un nome che non è la variabile. |
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere …: … | La funzione è scritta male. |
| Nome di variabile non valido: «…» | La **Variabile** non è un nome valido. |

## Vedi anche

- [Integrale definito](int.definite) per il solo integrale
- [Integrale di dati campionati](int.data) per la media di una lista di misure (integrale diviso la durata)
- [Funzione f(x)](fn.define) per dare un nome alla funzione
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
