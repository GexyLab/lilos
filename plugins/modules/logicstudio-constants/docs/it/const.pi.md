# Pi greco (Math.PI) · π

`const.pi` · Costanti matematiche · [Costanti](logicstudio-constants) · versione 1

Manda il valore di **Pi greco (Math.PI)** (π): `3.141592653589793`. Il valore è il numero a doppia precisione più vicino al valore vero.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore: `3.141592653589793`. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo: `π`. |
| **Exception** (`error`) | oggetto | Non ne manda: il valore è fisso e il blocco non ha impostazioni. |

## Come funziona

| invia | Cosa fa |
|---|---|
| non collegato | Manda il valore una volta, all'avvio dello schema, su tutte le uscite. |
| collegato | Manda il valore a ogni impulso su **invia**, mai all'avvio. |

Il blocco manda prima di tutto **valore**, poi le altre uscite. Le uscite nascoste mandano lo stesso il loro valore: mostrale con l'**occhio** nelle **Proprietà** per collegarle.

Il valore è un numero a doppia precisione, come tutti i numeri di Logic Studio e di JavaScript: ha 15-17 cifre significative, e un calcolo può dare un risultato leggermente diverso da quello esatto. Per mostrarlo arrotondato usa [Template (formatta)](core.format) o [Funzioni Math](core.math) (`round`).

**Nota.** È proprio la costante di JavaScript.

Per le regole generali (ingressi nascosti, Exception) vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Il valore all'avvio

```
[Pi greco (Math.PI) · π] valore ──▶ valore [Print (console.log)]
```

All'avvio dello schema l'ultima riga della console è `3.141592653589793`.

### 2. A ogni clic, con il simbolo

```
[Pulsante] premuto ──▶ invia [Pi greco (Math.PI) · π] valore  ──▶ v [Template (formatta): {s} = {v}] testo ──▶ valore [Print (console.log)]
                                                      simbolo ──▶ s
```

Mostra con l'**occhio** l'ingresso **invia** e l'uscita **simbolo**, e aggiungi al [Template (formatta)](core.format) gli ingressi `s` e `v`. All'avvio non esce niente; a ogni clic sul pulsante l'ultima riga della console è `π = 3.141592653589793`.

## Vedi anche

- Le altre costanti del gruppo «Le costanti classiche»: [Tau (2π) · τ](const.tau), [Numero di Nepero (Math.E) · e](const.e), [Sezione aurea · φ](const.phi), [Rapporto argenteo (1 + √2) · δS](const.silver), [Numero plastico · ρ](const.plastic), [Radice di 2 (Math.SQRT2) · √2](const.sqrt2), [Radice di 1/2 (Math.SQRT1_2) · √½](const.sqrtHalf), [Radice di 3 · √3](const.sqrt3), [Logaritmo naturale di 2 (Math.LN2) · ln 2](const.ln2), [Logaritmo naturale di 10 (Math.LN10) · ln 10](const.ln10), [Logaritmo in base 2 di e (Math.LOG2E) · log₂ e](const.log2e), [Logaritmo in base 10 di e (Math.LOG10E) · log₁₀ e](const.log10e), [Un grado in radianti (π/180) · °](const.deg)
- [Costanti](logicstudio-constants): l'elenco di tutte le costanti, [Costante · Variabile](core.value) per un numero qualsiasi
- [Come funziona un blocco](ide/blocks)
