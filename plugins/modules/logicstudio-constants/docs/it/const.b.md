# Costante di spostamento di Wien · b

`const.b` · Costanti fisiche · [Costanti](logicstudio-constants) · versione 1

Manda il valore di **Costante di spostamento di Wien** (b): `0.002897771955` m·K, esatta. Il valore è quello raccomandato **CODATA 2022** (pubblicato dal NIST nel 2024).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore: `0.002897771955`. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo: `b`. |
| **unità** (`unit`) | testo | Nascosta di serie. L'unità SI del valore: `m·K`. |
| **incertezza** (`uncertainty`) | numero | Nascosta di serie. L'incertezza standard, nella stessa unità del valore: `0` (esatta). |
| **Exception** (`error`) | oggetto | Non ne manda: il valore è fisso e il blocco non ha impostazioni. |

## Come funziona

| invia | Cosa fa |
|---|---|
| non collegato | Manda il valore una volta, all'avvio dello schema, su tutte le uscite. |
| collegato | Manda il valore a ogni impulso su **invia**, mai all'avvio. |

Il blocco manda prima di tutto **valore**, poi le altre uscite. Le uscite nascoste mandano lo stesso il loro valore: mostrale con l'**occhio** nelle **Proprietà** per collegarle.

Il valore è un numero a doppia precisione, come tutti i numeri di Logic Studio e di JavaScript: ha 15-17 cifre significative, e un calcolo può dare un risultato leggermente diverso da quello esatto. Per mostrarlo arrotondato usa [Template (formatta)](core.format) o [Funzioni Math](core.math) (`round`).

**Nota.** È esatta perché si calcola solo dalle 7 costanti che definiscono il SI, con numeri e π: il blocco usa la stessa formula, quindi le ultime cifre possono venire dall'arrotondamento dei numeri a doppia precisione.

Per le regole generali (ingressi nascosti, Exception) vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Il valore all'avvio

```
[Costante di spostamento di Wien · b] valore ──▶ valore [Print (console.log)]
```

All'avvio dello schema l'ultima riga della console è `0.002897771955`.

### 2. A ogni clic, con il simbolo e l'unità

```
[Pulsante] premuto ──▶ invia [Costante di spostamento di Wien · b] valore  ──▶ v [Template (formatta): {s} = {v} {un}] testo ──▶ valore [Print (console.log)]
                                                                   simbolo ──▶ s
                                                                   unità   ──▶ un
```

Mostra con l'**occhio** l'ingresso **invia** e le uscite **simbolo** e **unità**, e aggiungi al [Template (formatta)](core.format) gli ingressi `s`, `v` e `un`. All'avvio non esce niente; a ogni clic sul pulsante l'ultima riga della console è `b = 0.002897771955 m·K`.

## Vedi anche

- Le altre costanti del gruppo «Fisico-chimiche»: [Costante dei gas · R](const.R), [Costante di Faraday · F](const.F), [Costante di Stefan-Boltzmann · σ](const.sigma), [Volume molare del gas ideale (0 °C, 1 atm) · Vm](const.Vm), [Costante di Loschmidt (0 °C, 1 atm) · n₀](const.n0), [Atmosfera standard · atm](const.atm), [Zero Celsius in kelvin · T₀](const.T0)
- [Costanti](logicstudio-constants): l'elenco di tutte le costanti, [Costante · Variabile](core.value) per un numero qualsiasi
- [Come funziona un blocco](ide/blocks)
