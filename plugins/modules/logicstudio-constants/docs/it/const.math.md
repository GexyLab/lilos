# Costanti matematiche (Math.PI, Math.E…)

`const.math` · Valori · [Costanti](logicstudio-constants) · versione 1

Dà il valore di una costante matematica, scelta nelle impostazioni: π, τ, e, la sezione aurea, le radici e i logaritmi che JavaScript ha in `Math` (`Math.PI`, `Math.SQRT2`, `Math.LN2`…), un grado in radianti, le costanti di Eulero-Mascheroni, Catalan, Apéry, Feigenbaum… e i limiti dei numeri di JavaScript (`Number.EPSILON`, `Number.MAX_SAFE_INTEGER`…).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore della costante scelta. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo della costante, come nella tabella sotto (per esempio `π`). |
| **Exception** (`error`) | oggetto | Quando la costante scelta non esiste in questa versione del pacchetto (vedi **Errori**). |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Costante** (`constant`) | una delle costanti della tabella sotto | π · Pi greco (Math.PI) (`pi`) | Quale costante mandare. Nel menu ogni voce mostra il simbolo e il nome. |

## Come funziona

### Quando manda il valore

| invia | Cosa fa |
|---|---|
| non collegato | Manda il valore una volta, all'avvio dello schema, su tutte le uscite. |
| collegato | Manda il valore a ogni impulso su **invia**, mai all'avvio. |

All'avvio il blocco manda prima di tutto **valore**, poi le altre uscite. Le uscite nascoste mandano lo stesso il loro valore: mostrale con l'**occhio** nelle **Proprietà** per collegarle. Sotto il nome del blocco, nel disegno, compare la **chiave** della costante scelta (per esempio `pi`): la trovi nell'ultima colonna delle tabelle.

I valori sono numeri a doppia precisione, come tutti i numeri di Logic Studio e di JavaScript: hanno 15-17 cifre significative. Un calcolo può quindi dare un risultato leggermente diverso da quello esatto: per esempio il seno di 30° esce `0.49999999999999994` e non `0.5`. Per mostrarlo arrotondato usa [Funzioni Math](core.math) (`round`) dopo una moltiplicazione, o [Template (formatta)](core.format).

Per un numero qualsiasi che non è in elenco usa [Costante · Variabile](core.value).

### Note sulle costanti

- **τ** è 2π, il giro completo in radianti; **un grado in radianti** (`deg`) è π/180: moltiplica un angolo in gradi per questa costante per averlo in radianti, come vogliono `sin` e `cos` di [Funzioni Math](core.math).
- Le costanti di `Math` (π, e, `SQRT2`, `SQRT1_2`, `LN2`, `LN10`, `LOG2E`, `LOG10E`) sono proprio quelle di JavaScript.
- **Epsilon di macchina** è la distanza tra 1 e il numero successivo: due numeri che differiscono meno di così, dopo un calcolo, si possono considerare uguali.
- **Intero sicuro più grande** è 2⁵³ − 1: oltre, gli interi non sono più tutti rappresentabili (`9007199254740993` diventa `9007199254740992`).
- **Numero più grande** e **numero positivo più piccolo** sono i limiti dei numeri di JavaScript: oltre il primo un calcolo dà `Infinity`, sotto il secondo dà 0.

Per le regole generali (ingressi nascosti, Exception) vedi [Come funziona un blocco](ide/blocks).

## Le costanti

### Le costanti classiche

| Simbolo | Costante | Valore | Chiave |
|---|---|---|---|
| π | Pi greco (Math.PI) | `3.141592653589793` | `pi` |
| τ | Tau (2π) | `6.283185307179586` | `tau` |
| e | Numero di Nepero (Math.E) | `2.718281828459045` | `e` |
| φ | Sezione aurea | `1.618033988749895` | `phi` |
| δS | Rapporto argenteo (1 + √2) | `2.414213562373095` | `silver` |
| ρ | Numero plastico | `1.324717957244746` | `plastic` |
| √2 | Radice di 2 (Math.SQRT2) | `1.4142135623730951` | `sqrt2` |
| √½ | Radice di 1/2 (Math.SQRT1_2) | `0.7071067811865476` | `sqrt1_2` |
| √3 | Radice di 3 | `1.7320508075688772` | `sqrt3` |
| ln 2 | Logaritmo naturale di 2 (Math.LN2) | `0.6931471805599453` | `ln2` |
| ln 10 | Logaritmo naturale di 10 (Math.LN10) | `2.302585092994046` | `ln10` |
| log₂ e | Logaritmo in base 2 di e (Math.LOG2E) | `1.4426950408889634` | `log2e` |
| log₁₀ e | Logaritmo in base 10 di e (Math.LOG10E) | `0.4342944819032518` | `log10e` |
| ° | Un grado in radianti (π/180) | `0.017453292519943295` | `deg` |

### Costanti dell'analisi e dei sistemi dinamici

| Simbolo | Costante | Valore | Chiave |
|---|---|---|---|
| γ | Costante di Eulero-Mascheroni | `0.5772156649015329` | `gamma` |
| G | Costante di Catalan | `0.915965594177219` | `catalan` |
| ζ(3) | Costante di Apéry | `1.2020569031595942` | `apery` |
| Ω | Costante omega | `0.5671432904097838` | `omega` |
| K₀ | Costante di Khinchin | `2.6854520010653062` | `khinchin` |
| δ | Costante di Feigenbaum δ | `4.66920160910299` | `feigenbaumDelta` |
| α | Costante di Feigenbaum α | `2.5029078750958926` | `feigenbaumAlpha` |

### I limiti dei numeri

| Simbolo | Costante | Valore | Chiave |
|---|---|---|---|
| ε | Epsilon di macchina (Number.EPSILON) | `2.220446049250313e-16` | `epsilon` |
| 2⁵³ − 1 | Intero sicuro più grande (Number.MAX_SAFE_INTEGER) | `9007199254740991` | `maxSafe` |
| max | Numero più grande (Number.MAX_VALUE) | `1.7976931348623157e+308` | `maxValue` |
| min | Numero positivo più piccolo (Number.MIN_VALUE) | `5e-324` | `minValue` |

## Esempi

### 1. Seno di un angolo in gradi

```
[Costante · Variabile: 30] valore ──▶ a [Moltiplicazione (×)] risultato ──▶ valore [Funzioni Math: sin] risultato ──▶ valore [Print (console.log)]
[Costanti matematiche: deg] valore ──▶ b
```

L'ultima riga della console è `0.49999999999999994`, cioè 0,5 a meno dell'arrotondamento dei numeri (prima, se il 30 arriva per primo, la [Moltiplicazione (×)](core.multiply) manda il solo 30, che conta i valori arrivati fin lì).

### 2. Circonferenza di un cerchio

```
[Costanti matematiche: tau] valore ──▶ a [Moltiplicazione (×)] risultato ──▶ valore [Print (console.log)]
[Campo numerico: raggio]   valore ──▶ b
```

All'avvio la console mostra già `6.283185307179586`: il raggio non è ancora arrivato e la [Moltiplicazione (×)](core.multiply) moltiplica solo i valori che ha. Con raggio 3 mostra `18.84955592153876` (2π · 3), e ogni volta che cambi il raggio esce la nuova circonferenza, perché la Moltiplicazione tiene l'ultimo valore di ogni ingresso. Per non avere la riga dell'avvio togli «lo avvia» dall'ingresso **a**.

### 3. Il valore con il suo simbolo

```
[Costanti matematiche: phi] simbolo ──▶ s [Template (formatta): {s} = {v}] testo ──▶ valore [Print (console.log)]
                            valore  ──▶ v
```

Mostra prima **simbolo** con l'occhio nelle Proprietà, e aggiungi al [Template (formatta)](core.format) gli ingressi `s` e `v`. L'ultima riga della console è `φ = 1.618033988749895`.

## Errori

| Messaggio | Quando |
|---|---|
| Costante sconosciuta: `chiave` (Unknown constant) | La chiave salvata nello schema non è una di quelle di questa versione del pacchetto: lo schema è stato fatto con una versione più nuova, o il file `.lsch` è stato cambiato a mano. Scegli di nuovo la costante nelle **Proprietà**. |

## Vedi anche

- [Costanti fisiche (CODATA)](const.physics), [Costanti astronomiche e della Terra](const.astro)
- [Costante · Variabile](core.value), [Funzioni Math](core.math)
- [Come funziona un blocco](ide/blocks)
