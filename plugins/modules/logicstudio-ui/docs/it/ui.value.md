# Valore

`ui.value` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Mostra un valore che arriva da uno schema: un numero formattato per la lingua dell'utente, con la sua unità, oppure un testo.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta prima del valore, sulla stessa riga, più chiara. |
| **Unità** | testo | vuoto | Scritta dopo il valore, più piccola, con uno spazio prima (per esempio `kg`). |
| **Decimali** | da 0 a 10, o vuoto | vuoto | Quante cifre dopo la virgola mostrare per i numeri. Vuoto: fino a 3, senza zeri in fondo. |
| **Quando è vuoto** | testo | «—» | Quello che si vede quando non c'è ancora un valore, o quando arriva un valore vuoto. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da mostrare. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Exception** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

All'apertura il Valore mostra **Etichetta**, il testo di **Quando è vuoto** in grassetto e l'**Unità**. Ogni valore che arriva su **valore** prende il posto del testo in grassetto:

| Arriva | Si vede (lingua italiana) |
|---|---|
| `1234.5` (numero), Decimali vuoto | `1234,5` (in italiano il punto delle migliaia compare da 10.000) |
| `12345.6` (numero), Decimali vuoto | `12.345,6` |
| `2.345678` (numero), Decimali vuoto | `2,346` (al massimo 3 decimali, arrotondati) |
| `7` (numero), Decimali 2 | `7,00` |
| `"12.5"` (testo) | `12.5`: un testo non viene formattato, anche se contiene un numero |
| `true` | `true` |
| `{ "t": 21 }` (oggetto) | `{"t":21}` |
| `null`, niente o `""` | il testo di **Quando è vuoto** |

- I numeri seguono la lingua di chi guarda la finestra: separatore delle migliaia e virgola decimale cambiano con la lingua.
- I numeri non validi (`NaN`, infinito) si vedono come testo: `NaN`, `Infinity`.
- L'unità resta sempre, anche quando si vede «—».

Se vuoi i decimali anche per un numero arrivato come testo, passalo prima da un blocco [Cast in numero (Number())](core.toNumber).

## Esempi

### 1. Un peso con unità

```
Finestra «Bilancia»
└ Colonna (radice)
  └ Valore  value1  Etichetta «Peso:»  Unità «kg»  Decimali 1
```

```
[readFile: ~/bilancia.txt] contenuto ──▶ valore [Cast (converti tipo): numero] risultato ──▶ valore [Valore: Peso:]
```

Se il file contiene `72.456`, la finestra mostra «Peso: **72,5** kg».

### 2. Il risultato di un calcolo

```
Finestra «Totale»
└ Colonna (radice)
  ├ Campo numerico  number1  Etichetta «Prezzo»
  ├ Campo numerico  number2  Etichetta «Quantità»
  └ Valore          value1   Etichetta «Totale:»  Unità «€»  Decimali 2  Quando è vuoto «inserisci i dati»
```

```
[Campo numerico: Prezzo]   valore ──▶ a [Moltiplicazione (×)] risultato ──▶ valore [Valore: Totale:]
[Campo numerico: Quantità] valore ──▶ b
```

Finché l'utente non scrive niente, si vede «Totale: **inserisci i dati** €». Con prezzo 4,5 e quantità 3, si vede «Totale: **13,50** €».

## Accessibilità

Etichetta, valore e unità sono testo normale, letto in fila da un lettore di schermo. Quando il valore cambia, il lettore di schermo non lo annuncia da solo.

## Vedi anche

- [Etichetta](ui.label), [Indicatore](ui.gauge), [Barra di avanzamento](ui.progress)
- [Cast in numero (Number())](core.toNumber), [Funzioni Math](core.math) per arrotondare prima di mostrare
- [Componenti UI standard](logicstudio-ui)
