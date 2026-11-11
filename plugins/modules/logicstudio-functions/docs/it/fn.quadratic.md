# Equazione di 2° grado ax² + bx + c = 0

`fn.quadratic` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

Risolve l'equazione `ax² + bx + c = 0`: le due soluzioni (anche complesse), il discriminante e il vertice della parabola.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** (`a`) | numero | Il coefficiente di x². Non può essere 0. |
| **b** (`b`) | numero | Il coefficiente di x. |
| **c** (`c`) | numero | Il termine noto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **x₁** (`x1`) | numero | La soluzione più piccola. Esce solo se Δ ≥ 0 (soluzioni reali). |
| **x₂** (`x2`) | numero | La soluzione più grande (uguale a **x₁** se Δ = 0). Esce solo se Δ ≥ 0. |
| **Δ (discriminante)** (`delta`) | numero | Il discriminante b² − 4ac. |
| **radici complesse** (`complex`) | sì/no | `true` se Δ < 0 (le soluzioni sono complesse). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **radici {re, im}** (`roots`) | lista | Le due soluzioni come lista di oggetti `{re, im}` (parte reale e parte immaginaria). Per Δ < 0 sono due numeri complessi coniugati. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **vertice x** (`vertexX`) | numero | La x del vertice, −b / 2a. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **vertice y** (`vertexY`) | numero | La y del vertice. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

Questo blocco non ha impostazioni.

## Come funziona

Il blocco gira quando arriva un valore su **a**, **b** o **c**, e aspetta finché tutti e tre ne hanno uno. Poi calcola Δ = b² − 4ac e le soluzioni con la formula chiusa, in una forma che non perde cifre quando b è grande rispetto ad a e c.

- **Δ > 0**: due soluzioni reali diverse, su **x₁** (la più piccola) e **x₂** (la più grande).
- **Δ = 0**: una soluzione doppia; **x₁** e **x₂** sono uguali.
- **Δ < 0**: soluzioni complesse. **x₁** e **x₂** **non escono**; leggi **radici {re, im}** (nascosta di serie) e **radici complesse** (`true`).

Il vertice è il punto (−b / 2a ; a·x² + b·x + c) calcolato in quella x. I risultati sono arrotondati a 15 cifre significative. Per un polinomio di grado più alto usa [Polinomio: valore e radici](fn.poly).

## Esempi

### 1. Due soluzioni

`x² − 3x + 2 = 0`, cioè **a** = 1, **b** = −3, **c** = 2: **x₁** = 1, **x₂** = 2, **Δ** = 1; il vertice è (1,5 ; −0,25).

### 2. Soluzione doppia

`x² + 2x + 1 = 0`: **Δ** = 0, **x₁** = **x₂** = −1.

### 3. Soluzioni complesse

`x² + 2x + 5 = 0`: **Δ** = −16, **radici complesse** = `true`, **radici {re, im}** = `[{"re":-1,"im":-2},{"re":-1,"im":2}]`, vertice (−1 ; 4). **x₁** e **x₂** non escono.

### 4. Su una console

```
[Costante · Variabile: 2] valore ──▶ a [Equazione di 2° grado] x₁ ──▶ valore [Print (console.log)]
[Costante · Variabile: -4] valore ──▶ b
[Costante · Variabile: -6] valore ──▶ c
```

Scrive `-1` (le soluzioni di `2x² − 4x − 6 = 0` sono −1 e 3; **Δ** = 64).

## Errori

| Messaggio | Quando |
|---|---|
| a = 0: non è un'equazione di secondo grado | **a** vale 0. |
| a: serve un numero | **a** (o **b**, o **c**: il messaggio comincia con il suo nome) non è un numero. |

## Vedi anche

- [Polinomio: valore e radici](fn.poly) per gradi più alti
- [Risolvi f(x) = 0](fn.solve) per qualsiasi funzione
- [Funzioni Math](core.math) per i calcoli semplici
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
