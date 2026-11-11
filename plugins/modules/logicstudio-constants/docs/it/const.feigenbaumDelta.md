# Costante di Feigenbaum δ · δ

`const.feigenbaumDelta` · Costanti matematiche · [Costanti](logicstudio-constants) · versione 1

Manda il valore di **Costante di Feigenbaum δ** (δ): `4.66920160910299`. Il valore è il numero a doppia precisione più vicino al valore vero.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore: `4.66920160910299`. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo: `δ`. |
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
[Costante di Feigenbaum δ · δ] valore ──▶ valore [Print (console.log)]
```

All'avvio dello schema l'ultima riga della console è `4.66920160910299`.

### 2. A ogni clic, con il simbolo

```
[Pulsante] premuto ──▶ invia [Costante di Feigenbaum δ · δ] valore  ──▶ v [Template (formatta): {s} = {v}] testo ──▶ valore [Print (console.log)]
                                                            simbolo ──▶ s
```

Mostra con l'**occhio** l'ingresso **invia** e l'uscita **simbolo**, e aggiungi al [Template (formatta)](core.format) gli ingressi `s` e `v`. All'avvio non esce niente; a ogni clic sul pulsante l'ultima riga della console è `δ = 4.66920160910299`.

## Vedi anche

- Le altre costanti del gruppo «Costanti dell'analisi e dei sistemi dinamici»: [Costante di Eulero-Mascheroni · γ](const.gamma), [Costante di Catalan · G](const.catalan), [Costante di Apéry · ζ(3)](const.apery), [Costante omega · Ω](const.omega), [Costante di Khinchin · K₀](const.khinchin), [Costante di Feigenbaum α · α](const.feigenbaumAlpha)
- [Costanti](logicstudio-constants): l'elenco di tutte le costanti, [Costante · Variabile](core.value) per un numero qualsiasi
- [Come funziona un blocco](ide/blocks)
