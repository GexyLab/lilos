# Gradiente ∇f

`num.gradient` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Calcola il **gradiente** di una funzione di più variabili in un punto: la lista delle derivate parziali `[∂f/∂x, ∂f/∂y, …]`, il suo modulo e le formule delle derivate parziali.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **f (funzione)** (`f`) | testo | La funzione, come testo (per esempio `x^2 + sin(x)`). Se non è collegato vale l'impostazione **Funzione**. |
| **punto [x, y, …] o {x, y, …}** (`point`) | qualsiasi | Il punto: una lista `[x, y, …]` (nell'ordine delle variabili) oppure un oggetto `{x, y, …}`. Se non è collegato vale l'impostazione **Punto**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **gradiente [∂f/∂x, …]** (`list`) | lista | Le derivate parziali in una lista, nell'ordine delle variabili (come i punti dei blocchi dei solidi). |
| **gradiente {x, y, …}** (`gradient`) | oggetto | Le stesse in un oggetto, per esempio `{"x": 2, "y": 4}`. |
| **modulo** (`magnitude`) | numero | Il modulo del gradiente, cioè la pendenza della salita più ripida. |
| **derivate parziali (testo)** (`symbolic`) | oggetto | Le formule delle derivate parziali, come testo (`{"x": "2x", "y": "2y"}`), o `null` per quelle che non si sanno derivare (`min`, `max`…). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione (se f non è collegato)** (`expr`) | un testo | `x^2 + 3x*y + y^2` | La funzione, quando **f** non è collegato. |
| **Variabili (in ordine)** (`variables`) | un testo (da 1 a 8 nomi) | `x, y` | I nomi delle variabili, separati da virgole o spazi, da 1 a 8 (di serie `x, y`). |
| **Punto (se l'ingresso non è collegato)** (`point`) | un testo (numeri, lista o oggetto) | `1, 2` | Il punto quando **punto** non è collegato: `1, 2` oppure `[1, 2]` oppure `{"x": 1, "y": 2}`. |
| **Metodo** (`method`) | Esatto (simbolico), altrimenti numerico / Numerico (differenze centrali) | Esatto (simbolico), altrimenti numerico | **Esatto** deriva la formula e usa le derivate; se non si sa derivare passa al calcolo numerico. **Numerico** usa sempre le differenze centrali. |
| **Passo numerico h** (`step`) | numero (da 1e-9 a 1) | `0.00001` | Il passo h del calcolo numerico (da 1e-9 a 1; è moltiplicato per la dimensione del punto). |

## Come funziona

La funzione arriva dall'ingresso **f** (un testo come `x^2 + 1`) oppure, se **f** non è collegato, dall'impostazione **Funzione**. Se **f** è collegato ma non è ancora arrivato niente, il blocco aspetta. Come si scrive una funzione è spiegato nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni». Gli angoli sono in radianti. La variabile è **x**, oppure il nome scelto in **Variabile**; un altro nome nella funzione è un parametro e ha bisogno di un valore (si dà con il blocco [Funzione f(x)](fn.define)). Qui la funzione può avere più variabili: sono quelle in **Variabili**, e ogni altro nome è un parametro che ha bisogno di un valore.

Se **nessun** ingresso è collegato, il blocco calcola **una volta all'avvio dello schema** con le impostazioni. Se uno o più ingressi sono collegati, aspetta che abbiano tutti un valore e poi calcola a ogni nuovo valore.

- Con il metodo **Esatto** il gradiente è calcolato con le derivate simboliche: `x^2 + y^2` in (1, 2) dà esattamente `[2, 4]`. Se una derivata non esiste in forma di formula (`max(x, y)`) quella componente si calcola con le differenze centrali.
- Il punto è una lista nell'ordine delle variabili, oppure un oggetto con i nomi; come testo si possono scrivere i numeri separati da virgole o spazi.
- Il gradiente punta verso la salita più ripida della funzione; la sua lunghezza è la pendenza.

## Esempi

### 1. Un paraboloide

Funzione `x^2 + y^2`, variabili `x, y`, punto `1, 2`:

```
[Gradiente ∇f: x^2 + y^2, 1, 2] lista ──▶ valore [Print (console.log)]
```

Scrive `[2,4]`; il modulo è 4.47213595499958 e le formule sono `{"x":"2x","y":"2y"}`.

### 2. Un punto che arriva da un altro blocco

Funzione `x^2 + 3x*y + y^2` e il punto `[1, 2]`:

```
[Costante · Variabile (JSON): [1, 2]] valore ──▶ punto [Gradiente ∇f: x^2 + 3x*y + y^2] lista ──▶ valore [Print (console.log)]
```

Scrive `[8,7]`.

### 3. Tre variabili

Funzione `x*y*z`, variabili `x, y, z`, punto `1 2 3`:

```
[Gradiente ∇f: x*y*z, 1 2 3] lista ──▶ valore [Print (console.log)]
```

Scrive `[6,3,2]`.

## Errori

| Messaggio | Quando |
|---|---|
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il lettore si è fermato e «…» dice perché (vedi [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| f deve essere un'espressione di testo, come «x^2 + 1» | Su **f** arriva qualcosa che non è un testo né un numero (una lista, un oggetto). |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | La funzione contiene un nome che non è la variabile e non ha un valore. Con più nomi il messaggio dice «Parametri senza valore». |
| Variabili: da 1 a 8 nomi | L'impostazione **Variabili** è vuota o ha più di 8 nomi. |
| Variabili: due nomi sono uguali | Un nome compare due volte in **Variabili**. |
| Nome di variabile non valido: «…» | Il nome in **Variabile** non va bene (deve cominciare con una lettera o `_`; non può essere il nome di una funzione). |
| Il punto non è valido: scrivi «1, 2» oppure [1, 2] | Il punto, scritto come testo che comincia con `[` o `{`, non è un JSON valido. |
| Il punto ha … valori, servono … | Il punto è una lista con meno valori delle variabili. |
| Manca il valore di «…» nel punto | Il punto è un oggetto senza una delle variabili. |
| «x»: serve un numero | Il valore **«x»** è vuoto o non è un numero. |
| La funzione non è definita (o non è derivabile) in questo punto | Nel punto la funzione o la sua derivata non ha un valore finito. |

## Vedi anche

- [Derivata in un punto f'(x)](fn.derivativeAt) per la derivata di una funzione di una sola variabile
- [Derivata (simbolica)](fn.derivative) per la derivata simbolica di una variabile
- [Retta tangente](fn.tangent) per la retta tangente
- [Massimi · Minimi · Flessi](num.extrema) per massimi e minimi di una funzione di una variabile
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
