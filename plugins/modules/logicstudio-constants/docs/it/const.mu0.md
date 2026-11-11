# Permeabilità magnetica del vuoto · μ₀

`const.mu0` · Costanti fisiche · [Costanti](logicstudio-constants) · versione 1

Manda il valore di **Permeabilità magnetica del vuoto** (μ₀): `0.00000125663706127` N/A², con incertezza standard `2e-16`. Il valore è quello raccomandato **CODATA 2022** (pubblicato dal NIST nel 2024).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore: `0.00000125663706127`. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo: `μ₀`. |
| **unità** (`unit`) | testo | Nascosta di serie. L'unità SI del valore: `N/A²`. |
| **incertezza** (`uncertainty`) | numero | Nascosta di serie. L'incertezza standard, nella stessa unità del valore: `2e-16`. |
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
[Permeabilità magnetica del vuoto · μ₀] valore ──▶ valore [Print (console.log)]
```

All'avvio dello schema l'ultima riga della console è `0.00000125663706127`.

### 2. A ogni clic, con il simbolo e l'unità

```
[Pulsante] premuto ──▶ invia [Permeabilità magnetica del vuoto · μ₀] valore  ──▶ v [Template (formatta): {s} = {v} {un}] testo ──▶ valore [Print (console.log)]
                                                                     simbolo ──▶ s
                                                                     unità   ──▶ un
```

Mostra con l'**occhio** l'ingresso **invia** e le uscite **simbolo** e **unità**, e aggiungi al [Template (formatta)](core.format) gli ingressi `s`, `v` e `un`. All'avvio non esce niente; a ogni clic sul pulsante l'ultima riga della console è `μ₀ = 0.00000125663706127 N/A²`.

## Vedi anche

- Le altre costanti del gruppo «Elettromagnetiche»: [Permittività elettrica del vuoto · ε₀](const.eps0), [Costante di Coulomb (1/4πε₀) · kₑ](const.ke), [Impedenza caratteristica del vuoto · Z₀](const.Z0), [Quanto di flusso magnetico (h/2e) · Φ₀](const.Phi0), [Quanto di conduttanza (2e²/h) · G₀](const.G0), [Costante di Josephson (2e/h) · Kᴊ](const.KJ), [Costante di von Klitzing (h/e²) · Rᴋ](const.RK), [Magnetone di Bohr · μB](const.muB), [Magnetone nucleare · μN](const.muN)
- [Costanti](logicstudio-constants): l'elenco di tutte le costanti, [Costante · Variabile](core.value) per un numero qualsiasi
- [Come funziona un blocco](ide/blocks)
