# Luminosità del Sole · L☉

`const.Lsun` · Costanti astronomiche · [Costanti](logicstudio-constants) · versione 1

Manda il valore di **Luminosità del Sole** (L☉): `3.828e+26` W, esatta. Il valore viene dalle definizioni e dai valori nominali della **IAU** (2012 e 2015), dai modelli WGS 84 e GRS 80 per la Terra e dalla CGPM (1901) per la gravità standard.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore: `3.828e+26`. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo: `L☉`. |
| **unità** (`unit`) | testo | Nascosta di serie. L'unità SI del valore: `W`. |
| **incertezza** (`uncertainty`) | numero | Nascosta di serie. L'incertezza standard, nella stessa unità del valore: `0` (esatta). |
| **Exception** (`error`) | oggetto | Non ne manda: il valore è fisso e il blocco non ha impostazioni. |

## Come funziona

| invia | Cosa fa |
|---|---|
| non collegato | Manda il valore una volta, all'avvio dello schema, su tutte le uscite. |
| collegato | Manda il valore a ogni impulso su **invia**, mai all'avvio. |

Il blocco manda prima di tutto **valore**, poi le altre uscite. Le uscite nascoste mandano lo stesso il loro valore: mostrale con l'**occhio** nelle **Proprietà** per collegarle.

Il valore è un numero a doppia precisione, come tutti i numeri di Logic Studio e di JavaScript: ha 15-17 cifre significative, e un calcolo può dare un risultato leggermente diverso da quello esatto. Per mostrarlo arrotondato usa [Template (formatta)](core.format) o [Funzioni Math](core.math) (`round`).

**Nota.** È un **valore nominale** della IAU (Risoluzione B3 del 2015): un numero fissato per convenzione, da usare come unità, vicino al valore misurato ma non uguale.

Per le regole generali (ingressi nascosti, Exception) vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Il valore all'avvio

```
[Luminosità del Sole · L☉] valore ──▶ valore [Print (console.log)]
```

All'avvio dello schema l'ultima riga della console è `3.828e+26`.

### 2. A ogni clic, con il simbolo e l'unità

```
[Pulsante] premuto ──▶ invia [Luminosità del Sole · L☉] valore  ──▶ v [Template (formatta): {s} = {v} {un}] testo ──▶ valore [Print (console.log)]
                                                        simbolo ──▶ s
                                                        unità   ──▶ un
```

Mostra con l'**occhio** l'ingresso **invia** e le uscite **simbolo** e **unità**, e aggiungi al [Template (formatta)](core.format) gli ingressi `s`, `v` e `un`. All'avvio non esce niente; a ogni clic sul pulsante l'ultima riga della console è `L☉ = 3.828e+26 W`.

## Vedi anche

- Le altre costanti del gruppo «Il Sole»: [Parametro gravitazionale del Sole · GM☉](const.GMsun), [Massa del Sole · M☉](const.Msun), [Raggio del Sole · R☉](const.Rsun), [Temperatura efficace del Sole · T☉](const.Tsun), [Costante solare (irraggiamento a 1 au) · S☉](const.S)
- [Costanti](logicstudio-constants): l'elenco di tutte le costanti, [Costante · Variabile](core.value) per un numero qualsiasi
- [Come funziona un blocco](ide/blocks)
