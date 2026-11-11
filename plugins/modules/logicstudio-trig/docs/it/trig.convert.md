# Converti e normalizza angolo

`trig.convert` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Converte un angolo da un'unità a un'altra (gradi, radianti, gradi centesimali, giri) e, se vuoi, lo riporta dentro un solo giro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **angolo** (`angle`) | numero | L'angolo, nell'unità **Da**. Un testo con un numero (`"90,5"`) va bene. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **angolo** (`angle`) | numero | L'angolo nell'unità **A**, dentro l'**Intervallo** scelto. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. L'angolo non è un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Da** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità in cui arriva l'angolo. |
| **A** (`to`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità in cui esce l'angolo. |
| **Intervallo** (`range`) | Così com'è, Da −180° a 180°, Da 0° a 360° | Così com'è | Se e come togliere i giri interi. |

## Come funziona

A ogni angolo che arriva il blocco lo converte dall'unità **Da** all'unità **A** e manda il risultato su **angolo**.

- 1 giro = 360° = 2π rad = 400 gon.
- **Così com'è** non tocca i giri: 450° resta 450° (e vale 7,853981633974483 rad).
- **Da 0° a 360°** riporta l'angolo da 0 (compreso) a un giro (escluso): 450° diventa 90°, −90° diventa 270°, 720° diventa 0°.
- **Da −180° a 180°** lo riporta tra mezzo giro in giù e mezzo giro in su, con −180° escluso e 180° compreso: 270° diventa −90°, −180° diventa 180°.
- Il giro intero è tolto **nell'unità di partenza** (**Da**), con numeri esatti: 720° dà proprio `0`, non un numero minuscolo. Gli intervalli parlano di gradi per comodità, ma valgono in qualsiasi unità (da 0 a 2π rad, da 0 a 400 gon, da 0 a 1 giro).
- Il risultato è arrotondato a **15 cifre significative**.
- Per convertire anche i primi e i secondi d'arco usa [Angolo](unit.angle); per i gradi con primi e secondi [Gradi → gradi, primi, secondi](trig.toDms).

## Esempi

### 1. Da gradi a radianti

```
[Costante · Variabile: 180] valore ──▶ angolo [Converti e normalizza angolo: ° → rad] angolo ──▶ valore [Print (console.log)]
```

Scrive `3.14159265358979`.

### 2. Da gradi a gradi centesimali

**Da** gradi, **A** gradi centesimali, angolo 90: scrive `100`.

### 3. Togliere i giri interi

Angolo 450, **Intervallo** da 0° a 360°: scrive `90`. Con −90 scrive `270`. Con 270 e intervallo da −180° a 180° scrive `-90`.

### 4. Da radianti a gradi, dentro un giro

**Da** radianti, **A** gradi, **Intervallo** da 0° a 360°, angolo 7: scrive `41.0704565915763` (7 rad = 401,07°, meno un giro).

### 5. Da giri a gradi centesimali

**Da** giri, **A** gradi centesimali, **Intervallo** da −180° a 180°, angolo 1,25: scrive `100` (1,25 giri = 450° = 90° = 100 gon).

## Errori

| Messaggio | Quando |
|---|---|
| angolo: serve un numero | L'angolo non è un numero (per esempio un testo come `"abc"`). |

## Vedi anche

- [Angolo](unit.angle) per convertire anche i primi e i secondi d'arco (pacchetto [Grandezze e unità](logicstudio-units))
- [Gradi → gradi, primi, secondi](trig.toDms) e [Gradi, primi, secondi → gradi](trig.fromDms)
- [Funzioni trigonometriche (Math.sin, Math.cos…)](trig.fn)
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
