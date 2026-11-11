# Simula nel tempo

`num.simulate` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Fa **scorrere nel tempo** un'equazione differenziale (o un sistema) mentre lo schema gira: a intervalli regolari manda il tempo simulato **t** e il valore **y**. Serve per simulare un sistema (un serbatoio che si svuota, un pendolo, una popolazione) e disegnarlo in diretta.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **avvia** (`start`) | impulso | Impulso: avvia la simulazione (o la riprende da dove era). |
| **ferma** (`stop`) | impulso | Impulso: ferma la simulazione, tenendo lo stato. |
| **azzera** (`reset`) | impulso | Impulso: riporta il tempo a 0 e lo stato ai valori iniziali, senza avviare. |
| **f (equazioni)** (`f`) | testo | Le equazioni, come testo, separate da `;`. Se non è collegato vale l'impostazione **Equazioni**. |
| **y(0)** (`y0`) | qualsiasi | I valori iniziali: una lista o un numero (uno per variabile). Se non è collegato vale l'impostazione **Valori iniziali**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **parametri** (`params`) | oggetto | Un oggetto con i valori dei parametri, per esempio `{"k": 2}`; un nome nelle equazioni che non è una variabile né il tempo è un parametro. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **t** (`t`) | numero | Il tempo simulato, che parte da 0. |
| **y (prima variabile)** (`y`) | numero | Il valore della prima variabile. |
| **stato** (`state`) | lista | Il valore di tutte le variabili, in una lista nell'ordine di **Variabili**. |
| **in corso** (`running`) | sì/no | `true` quando parte, `false` quando si ferma (con **stop**, a **t massimo** o per un errore). |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Porte aggiuntive

Con **Aggiungi ingresso** (nelle Proprietà) si aggiungono altre **equazioni**: ogni ingresso aggiunto è un testo con una o più equazioni, che si accodano a quelle di **f**. Si usa quando le equazioni vengono da blocchi diversi.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Equazioni y′ = … (separate da ;, se f non è collegato)** (`expr`) | un testo (equazioni separate da `;`) | `-0.5 y` | Le equazioni, una per variabile e separate da `;`, quando **f** non è collegato. Si scrive il solo lato destro (`-0.5 y`) oppure anche il sinistro (`y' = -0.5 y`). |
| **Variabili (y1, y2…)** (`variables`) | un testo (da 1 a 16 nomi) | `y` | I nomi delle variabili, separati da virgole o spazi (di serie `y`). L'ordine è quello delle equazioni. |
| **Variabile del tempo** (`timeVar`) | un testo | `t` | Il nome del tempo nelle equazioni (di serie `t`). |
| **Valori iniziali** (`initial`) | un testo (numeri separati da virgole) | `1` | I valori iniziali, separati da virgole (uno per variabile). |
| **Metodo** (`method`) | Runge-Kutta 4 / Eulero | Runge-Kutta 4 | **Runge-Kutta 4** è preciso; **Eulero** è più semplice e meno preciso. |
| **Passo della simulazione (unità di tempo)** (`dt`) | numero (da 0.000001 a 1000) | `0.01` | Il passo di calcolo in unità di tempo simulato (da 0.000001 a 1000): più piccolo è più preciso e più lento. |
| **Invia ogni (ms)** (`tick`) | numero (da 20 a 60000) | `100` | Ogni quanti millisecondi mandare il nuovo valore (da 20 a 60000). |
| **Velocità (tempo simulato per secondo reale)** (`speed`) | numero (da 0.001 a 100000) | `1` | Quanto tempo simulato passa per ogni secondo vero: 1 è il tempo reale, 10 va dieci volte più veloce. |
| **Fermati a t (0: mai)** (`tMax`) | numero (da 0) | `0` | Il tempo simulato a cui fermarsi (0: mai). |
| **Parti da solo all'avvio del programma** (`auto`) | sì / no | no | Se attivata, la simulazione parte da sola all'avvio dello schema (solo se **avvia** non è collegato). |

## Come funziona

Le equazioni sono nella forma `y' = f(t, y)`: si scrive il lato destro, con `t` per il tempo e il nome della variabile (`-0.5 y` per `y' = -0.5 y`). Un sistema ha un'equazione per variabile, nell'ordine di **Variabili**: per un oscillatore con `y` e `v` si scrive `v; -k*y`. La sintassi delle espressioni è spiegata nella pagina [Funzioni e derivate](logicstudio-functions), sezione «Le espressioni»; gli angoli sono in radianti.

- Con **avvia** il blocco manda subito lo stato e poi lo aggiorna ogni **Invia ogni** millisecondi, facendo avanzare la simulazione del tempo vero passato per la **Velocità**, in passi di **Passo**. Con **stop** si ferma e **avvia** riprende da dove era; **azzera** riparte da 0.
- Se cambiano le equazioni, i valori iniziali o i parametri mentre gira, il cambio vale dal passo dopo; lo stato attuale resta se il numero di variabili è lo stesso.
- A ogni momento si fanno al massimo 5000 passi: se il computer resta indietro, la simulazione resta indietro anche lei (non salta).
- Per una soluzione intera in un colpo solo, con tutti i punti, c'è [Equazione differenziale](int.ode).

## Esempi

### 1. Un serbatoio che si svuota

Equazione `-0.5 y`, valore iniziale 1, velocità 1:

```
[Pulsante: Avvia] ──▶ avvia [Simula nel tempo: -0.5 y] t, y ──▶ [Grafico dal vivo]
```

Dopo 1 secondo vero y vale circa 0.6065 (e^(−0.5)); il grafico mostra il decadimento.

### 2. Un oscillatore

Variabili `y, v`, equazioni `v; -k*y`, valori iniziali `1, 0`, **parametri** `{"k": 1}`:

```
[Costante · Variabile (JSON): {"k": 1}] valore ──▶ parametri [Simula nel tempo: v; -k*y] stato ──▶ valore [Etichetta]
```

Dopo 2π secondi **stato** è di nuovo `[1, 0]`.

### 3. Fermarsi da solo

**Fermati a t** 5 e **Parti da solo** attivata:

```
[Simula nel tempo: y, t massimo 5, parti da solo] running ──▶ valore [Print (console.log)]
```

All'avvio scrive `true`; quando il tempo simulato arriva a 5 scrive `false`.

## Errori

| Messaggio | Quando |
|---|---|
| Servono da 1 a 16 variabili | L'impostazione **Variabili** è vuota o ne ha più di 16. |
| Nome di variabile non valido: «…» | Un nome di variabile non va bene (deve cominciare con una lettera o `_`, al massimo 16 caratteri; non può essere una funzione né `pi` o `e`). |
| Due variabili hanno lo stesso nome | Due nomi tra le variabili e la variabile del tempo sono uguali. |
| Servono … equazioni (una per variabile: …) ma ce ne sono … | Le equazioni (separate da `;`, più quelle delle porte aggiunte) non sono tante quante le variabili. |
| Al massimo 16 equazioni | Ci sono più di 16 equazioni. |
| Nome di parametro non valido: «…» | Un nome nell'oggetto **parametri** non va bene. |
| Il parametro «…»: serve un numero | Il valore di un parametro non è un numero. |
| Servono … valori iniziali (uno per variabile) ma ce ne sono … | I valori iniziali non sono tanti quante le variabili. |
| Valore iniziale: serve un numero | Un valore iniziale non è un numero. |
| Espressione vuota | La funzione è vuota. |
| Espressione non valida al carattere N: … | La funzione è scritta male; N è il carattere dove il lettore si è fermato e «…» dice perché (vedi [Funzioni e derivate](logicstudio-functions)). |
| Espressione non valida: … vuole … argomenti, ne ha … | Una funzione ha un numero sbagliato di argomenti, per esempio `sin(1, 2)`. |
| Espressione troppo lunga (al massimo 2000 caratteri) | La funzione ha più di 2000 caratteri. |
| Parametro senza valore: … (dagli un valore con il blocco Funzione f(x); la variabile è x) | La funzione contiene un nome che non è la variabile e non ha un valore. Con più nomi il messaggio dice «Parametri senza valore». |
| Invia ogni (ms): da 20 a 60000 | L'impostazione **Invia ogni** è fuori dai limiti. |
| La soluzione non è finita: diverge intorno a t = … | La soluzione è diventata infinita (`y' = y^2` esplode in tempo finito): la simulazione si ferma. |

## Vedi anche

- [Equazione differenziale y' = f(x, y)](int.ode) per risolvere un'equazione differenziale in un colpo solo, con tutti i punti
- [Derivata di un segnale (d/dt)](fn.signalDerivative) per la derivata di un segnale
- [Tempo reale](charts.live) per disegnare la soluzione mentre arriva
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
