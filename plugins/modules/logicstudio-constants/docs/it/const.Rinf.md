# Costante di Rydberg · R∞

`const.Rinf` · Costanti fisiche · [Costanti](logicstudio-constants) · versione 1

Manda il valore di **Costante di Rydberg** (R∞): `10973731.568157` m⁻¹, con incertezza standard `0.000012`. Il valore è quello raccomandato **CODATA 2022** (pubblicato dal NIST nel 2024).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore: `10973731.568157`. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo: `R∞`. |
| **unità** (`unit`) | testo | Nascosta di serie. L'unità SI del valore: `m⁻¹`. |
| **incertezza** (`uncertainty`) | numero | Nascosta di serie. L'incertezza standard, nella stessa unità del valore: `0.000012`. |
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
[Costante di Rydberg · R∞] valore ──▶ valore [Print (console.log)]
```

All'avvio dello schema l'ultima riga della console è `10973731.568157`.

### 2. A ogni clic, con il simbolo e l'unità

```
[Pulsante] premuto ──▶ invia [Costante di Rydberg · R∞] valore  ──▶ v [Template (formatta): {s} = {v} {un}] testo ──▶ valore [Print (console.log)]
                                                        simbolo ──▶ s
                                                        unità   ──▶ un
```

Mostra con l'**occhio** l'ingresso **invia** e le uscite **simbolo** e **unità**, e aggiungi al [Template (formatta)](core.format) gli ingressi `s`, `v` e `un`. All'avvio non esce niente; a ogni clic sul pulsante l'ultima riga della console è `R∞ = 10973731.568157 m⁻¹`.

## Vedi anche

- Le altre costanti del gruppo «Atomiche e nucleari»: [Costante di struttura fine · α](const.alpha), [Inverso della costante di struttura fine · 1/α](const.alphaInv), [Raggio di Bohr · a₀](const.a0), [Energia di Hartree · Eh](const.Eh), [Massa dell'elettrone · mₑ](const.me), [Massa del protone · mₚ](const.mp), [Massa del neutrone · mₙ](const.mn), [Massa del muone · mμ](const.mmu), [Rapporto tra massa del protone e dell'elettrone · mₚ/mₑ](const.mpme), [Unità di massa atomica (dalton) · u](const.u), [Raggio classico dell'elettrone · rₑ](const.re), [Lunghezza d'onda Compton · λC](const.lambdaC), [Elettronvolt · eV](const.eV)
- [Costanti](logicstudio-constants): l'elenco di tutte le costanti, [Costante · Variabile](core.value) per un numero qualsiasi
- [Come funziona un blocco](ide/blocks)
