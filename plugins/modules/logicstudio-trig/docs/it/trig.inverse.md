# Funzioni inverse (Math.asin, Math.acos…)

`trig.inverse` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Da un valore trova l'angolo: arcoseno, arcocoseno, arcotangente, arcocotangente, arcosecante o arcocosecante.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore di cui cercare l'angolo. Un testo con un numero (`"0,5"`) va bene. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **angolo** (`angle`) | numero | L'angolo, nell'**Unità** scelta. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Il valore non è un numero o è fuori dal dominio della funzione. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Funzione** (`fn`) | asin, acos, atan, acot, asec, acsc | asin | Quale funzione calcolare. |
| **Unità** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità in cui esce l'angolo. |

## Come funziona

A ogni valore che arriva il blocco calcola l'angolo e lo manda su **angolo**.

| Funzione | Valori accettati | Angolo che esce (in gradi) |
|---|---|---|
| **asin** | da −1 a 1 | da −90° a 90° |
| **acos** | da −1 a 1 | da 0° a 180° |
| **atan** | qualsiasi | tra −90° e 90° esclusi |
| **acot** | qualsiasi | tra 0° e 180° esclusi |
| **asec** | minore di −1 o maggiore di 1 (anche −1 e 1) | da 0° a 180°, escluso 90° |
| **acsc** | minore di −1 o maggiore di 1 (anche −1 e 1) | da −90° a 90°, escluso 0° |

- **acot** esce sempre tra 0° e 180° (non tra −90° e 90°): acot(1) = 45°, acot(0) = 90°, acot(−1) = 135°. È l'angolo `90° − atan(valore)`.
- **asec**(x) è acos(1 ÷ x) e **acsc**(x) è asin(1 ÷ x).
- Il risultato è arrotondato a **15 cifre significative**. Gli angoli noti escono puliti (asin(0,5) dà `30`, non `30.000000000000004`).
- Per l'angolo di un punto (x, y) in tutti e quattro i quadranti usa [Angolo di un punto (Math.atan2)](trig.atan2): **atan** da solo non sa se x è negativo.

## Esempi

### 1. L'angolo che ha seno 0,5

```
[Costante · Variabile: 0.5] valore ──▶ valore [Funzioni inverse: asin] angolo ──▶ valore [Print (console.log)]
```

Scrive `30`.

### 2. L'arcotangente di 1 in radianti

Funzione **atan**, **Unità** radianti, valore 1: scrive `0.785398163397448` (π ÷ 4).

### 3. Le arcocotangenti

Funzione **acot**: valore 1 scrive `45`, valore −1 scrive `135`, valore 0 scrive `90`.

### 4. Arcocoseno in gradi centesimali

Funzione **acos**, **Unità** gradi centesimali, valore 0,5: scrive `66.6666666666667`.

### 5. Un valore fuori dominio

Funzione **asin**, valore 2: errore `asin vuole un valore tra −1 e 1`.

## Errori

| Messaggio | Quando |
|---|---|
| valore: serve un numero | Il valore non è un numero (per esempio un testo come `"abc"`). |
| asin vuole un valore tra −1 e 1 | **asin**, con un valore fuori da −1…1. |
| acos vuole un valore tra −1 e 1 | **acos**, con un valore fuori da −1…1. |
| asec vuole un valore minore di −1 o maggiore di 1 | **asec**, con un valore tra −1 e 1 (esclusi). |
| acsc vuole un valore minore di −1 o maggiore di 1 | **acsc**, con un valore tra −1 e 1 (esclusi). |

## Vedi anche

- [Funzioni trigonometriche (Math.sin, Math.cos…)](trig.fn) per fare il contrario
- [Angolo di un punto (Math.atan2)](trig.atan2) per l'angolo di un punto in tutti i quadranti
- [Funzioni iperboliche (Math.sinh, Math.cosh…)](trig.hyperbolic) per le inverse iperboliche
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
