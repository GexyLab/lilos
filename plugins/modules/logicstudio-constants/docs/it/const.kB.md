# Costante di Boltzmann · k

`const.kB` · Costanti fisiche · [Costanti](logicstudio-constants) · versione 1

Manda il valore di **Costante di Boltzmann** (k): `1.380649e-23` J/K, esatta. Il valore è quello raccomandato **CODATA 2022** (pubblicato dal NIST nel 2024).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore: `1.380649e-23`. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo: `k`. |
| **unità** (`unit`) | testo | Nascosta di serie. L'unità SI del valore: `J/K`. |
| **incertezza** (`uncertainty`) | numero | Nascosta di serie. L'incertezza standard, nella stessa unità del valore: `0` (esatta). |
| **Exception** (`error`) | oggetto | Non ne manda: il valore è fisso e il blocco non ha impostazioni. |

## Come funziona

| invia | Cosa fa |
|---|---|
| non collegato | Manda il valore una volta, all'avvio dello schema, su tutte le uscite. |
| collegato | Manda il valore a ogni impulso su **invia**, mai all'avvio. |

Il blocco manda prima di tutto **valore**, poi le altre uscite. Le uscite nascoste mandano lo stesso il loro valore: mostrale con l'**occhio** nelle **Proprietà** per collegarle.

Il valore è un numero a doppia precisione, come tutti i numeri di Logic Studio e di JavaScript: ha 15-17 cifre significative, e un calcolo può dare un risultato leggermente diverso da quello esatto. Per mostrarlo arrotondato usa [Template (formatta)](core.format) o [Funzioni Math](core.math) (`round`).

Per le regole generali (ingressi nascosti, Exception) vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Il valore all'avvio

```
[Costante di Boltzmann · k] valore ──▶ valore [Print (console.log)]
```

All'avvio dello schema l'ultima riga della console è `1.380649e-23`.

### 2. A ogni clic, con il simbolo e l'unità

```
[Pulsante] premuto ──▶ invia [Costante di Boltzmann · k] valore  ──▶ v [Template (formatta): {s} = {v} {un}] testo ──▶ valore [Print (console.log)]
                                                         simbolo ──▶ s
                                                         unità   ──▶ un
```

Mostra con l'**occhio** l'ingresso **invia** e le uscite **simbolo** e **unità**, e aggiungi al [Template (formatta)](core.format) gli ingressi `s`, `v` e `un`. All'avvio non esce niente; a ogni clic sul pulsante l'ultima riga della console è `k = 1.380649e-23 J/K`.

## Vedi anche

- Le altre costanti del gruppo «Le 7 costanti che definiscono il SI, e ħ»: [Velocità della luce nel vuoto · c](const.c), [Costante di Planck · h](const.h), [Costante di Planck ridotta (h/2π) · ħ](const.hbar), [Carica elementare · e](const.qe), [Costante di Avogadro · Nᴀ](const.NA), [Frequenza iperfine del cesio · ΔνCs](const.dnuCs), [Efficacia luminosa (540 THz) · Kcd](const.Kcd)
- [Costanti](logicstudio-constants): l'elenco di tutte le costanti, [Costante · Variabile](core.value) per un numero qualsiasi
- [Come funziona un blocco](ide/blocks)
