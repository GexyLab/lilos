# Integrale di dati campionati

`int.data` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Calcola l'integrale di una lista di misure: l'area sotto la curva che passa per i punti. Serve per esempio per sapere quanta energia è passata da una lista di potenze misurate.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati (numeri o punti {x, y})** (`data`) | lista | I dati: o una lista di **numeri** (misurati a intervalli uguali di **dx**), o una lista di **punti** `{x, y}` oppure `[x, y]`. Ogni lista che arriva fa calcolare il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **integrale** (`total`) | numero | L'integrale di tutti i dati. |
| **integrale progressivo** (`cumulative`) | lista | L'integrale fino a ogni punto: un numero per ogni dato, il primo è sempre 0. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Un errore (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Metodo** (`method`) | Trapezi / Simpson (punti equidistanti) | Trapezi | Come si calcola l'integrale. |
| **Passo dx (per una lista di numeri)** (`dx`) | numero maggiore di 0 | 1 | La distanza tra un dato e il successivo, quando i dati sono solo numeri. Il primo dato sta in x = 0. |

## Come funziona

Per una lista di numeri il dato *i* sta in x = *i* · dx. Per una lista di punti si usano le x date, che devono **crescere** da un punto al successivo.

- **Trapezi**: tra due punti vicini l'area è la larghezza per la media dei due valori. Va bene con qualsiasi distanza tra i punti.
- **Simpson**: infila una parabola ogni tre punti, ed è più preciso se la curva è liscia. Vuole **punti equidistanti**. Con un numero **dispari di intervalli** (un numero pari di punti) l'ultimo intervallo si calcola con un trapezio.
- L'**integrale progressivo** usa sempre i trapezi, anche con Simpson.
- Servono almeno **2 dati**, al massimo 10000.
- Per avere una **media nel tempo** dividi l'integrale per la durata (l'ultima x meno la prima).

## Esempi

### 1. Cinque misure

```
[Costante · Variabile: [0, 1, 4, 9, 16]] valore ──▶ dati [Integrale di dati campionati, dx = 1] integrale ──▶ valore [Print (console.log)]
```

Scrive `22`. Con **integrale progressivo** collegata scrive `[0,0.5,3,9.5,22]`.

Con il metodo **Simpson** scrive `21.3333333333333` (i dati sono x², l'integrale vero tra 0 e 4 è 64/3).

### 2. Punti con distanze diverse

Dati `[{"x":0,"y":0},{"x":1,"y":2},{"x":3,"y":2}]`: scrive `5` (1 dal primo trapezio, 4 dal secondo). L'integrale progressivo è `[0,1,5]`.

Con Simpson lo stesso elenco dà l'errore «Simpson vuole punti equidistanti: usa i trapezi».

### 3. Un numero pari di punti con Simpson

Dati `[0, 1, 4, 9, 16, 25]` (5 intervalli): Simpson dà `41.8333333333333`, perché gli ultimi quattro intervalli hanno Simpson e l'ultimo ha un trapezio. L'integrale progressivo arriva a `42.5` (trapezi).

## Errori

| Messaggio | Quando |
|---|---|
| La lista dei dati deve essere una lista | All'ingresso arriva qualcosa che non è una lista. |
| La lista dei dati ha più di 10000 elementi | I dati sono più di 10000. |
| Servono almeno 2 dati | La lista ha meno di 2 elementi. |
| Il passo dx deve essere maggiore di 0 | Con una lista di numeri, **dx** è 0 o negativo. |
| dato 2: serve un numero | Un dato della lista di numeri non è un numero (qui il secondo). |
| x del punto 2: serve un numero | Un punto non ha una x numerica. |
| y del punto 2: serve un numero | Un punto non ha una y numerica. |
| Le x devono crescere: il punto 2 non viene dopo il precedente | Le x di due punti vicini sono uguali o decrescono. |
| Simpson vuole punti equidistanti: usa i trapezi | Con Simpson le x non sono a distanze uguali. |

## Vedi anche

- [Integratore di segnale](int.signal) per sommare nel tempo un valore che arriva dal vivo
- [Integrale definito](int.definite) per l'integrale di una formula
- [Valore medio in [a, b]](int.mean) per la media di una formula
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
