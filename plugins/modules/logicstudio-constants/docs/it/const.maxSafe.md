# Intero sicuro più grande (Number.MAX_SAFE_INTEGER) · 2⁵³ − 1

`const.maxSafe` · Costanti matematiche · [Costanti](logicstudio-constants) · versione 1

Manda il valore di **Intero sicuro più grande (Number.MAX_SAFE_INTEGER)** (2⁵³ − 1): `9007199254740991`. Il valore è il numero a doppia precisione più vicino al valore vero.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore: `9007199254740991`. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo: `2⁵³ − 1`. |
| **Exception** (`error`) | oggetto | Non ne manda: il valore è fisso e il blocco non ha impostazioni. |

## Come funziona

| invia | Cosa fa |
|---|---|
| non collegato | Manda il valore una volta, all'avvio dello schema, su tutte le uscite. |
| collegato | Manda il valore a ogni impulso su **invia**, mai all'avvio. |

Il blocco manda prima di tutto **valore**, poi le altre uscite. Le uscite nascoste mandano lo stesso il loro valore: mostrale con l'**occhio** nelle **Proprietà** per collegarle.

Il valore è un numero a doppia precisione, come tutti i numeri di Logic Studio e di JavaScript: ha 15-17 cifre significative, e un calcolo può dare un risultato leggermente diverso da quello esatto. Per mostrarlo arrotondato usa [Template (formatta)](core.format) o [Funzioni Math](core.math) (`round`).

**Nota.** Oltre 2⁵³ − 1 gli interi non sono più tutti rappresentabili (`9007199254740993` diventa `9007199254740992`).

Per le regole generali (ingressi nascosti, Exception) vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Il valore all'avvio

```
[Intero sicuro più grande (Number.MAX_SAFE_INTEGER) · 2⁵³ − 1] valore ──▶ valore [Print (console.log)]
```

All'avvio dello schema l'ultima riga della console è `9007199254740991`.

### 2. A ogni clic, con il simbolo

```
[Pulsante] premuto ──▶ invia [Intero sicuro più grande (Number.MAX_SAFE_INTEGER) · 2⁵³ − 1] valore  ──▶ v [Template (formatta): {s} = {v}] testo ──▶ valore [Print (console.log)]
                                                                                            simbolo ──▶ s
```

Mostra con l'**occhio** l'ingresso **invia** e l'uscita **simbolo**, e aggiungi al [Template (formatta)](core.format) gli ingressi `s` e `v`. All'avvio non esce niente; a ogni clic sul pulsante l'ultima riga della console è `2⁵³ − 1 = 9007199254740991`.

## Vedi anche

- Le altre costanti del gruppo «I limiti dei numeri»: [Epsilon di macchina (Number.EPSILON) · ε](const.epsilon), [Numero più grande (Number.MAX_VALUE) · max](const.maxValue), [Numero positivo più piccolo (Number.MIN_VALUE) · min](const.minValue)
- [Costanti](logicstudio-constants): l'elenco di tutte le costanti, [Costante · Variabile](core.value) per un numero qualsiasi
- [Come funziona un blocco](ide/blocks)
