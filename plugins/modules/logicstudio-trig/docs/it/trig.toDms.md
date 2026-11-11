# Gradi → gradi, primi, secondi

`trig.toDms` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Divide un angolo in gradi in gradi, primi e secondi (come nelle coordinate geografiche), e ne fa anche un testo come `40° 42′ 46″`.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **angolo (°)** (`angle`) | numero | L'angolo **in gradi**, con i decimali (`40.7128`). Un testo con un numero va bene. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **gradi** (`degrees`) | numero | I gradi interi, con il segno dell'angolo. |
| **primi** (`minutes`) | numero | I primi interi, da 0 a 59. |
| **secondi** (`seconds`) | numero | I secondi, da 0 a meno di 60, con i decimali scelti. |
| **testo** (`text`) | testo | I tre valori scritti, per esempio `40° 42′ 46″`. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. L'angolo non è un numero. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Decimali dei secondi** (`decimals`) | da 0 a 6 | 0 | Quanti decimali tenere nei secondi. |

## Come funziona

A ogni angolo che arriva il blocco lo divide: 1° = 60′ e 1′ = 60″. I gradi e i primi sono sempre interi; i secondi hanno i **Decimali** scelti e sono arrotondati.

- Il segno va sui **gradi**: −12,5° dà gradi −12, primi 30, secondi 0. Primi e secondi sono sempre positivi.
- Un angolo sotto un grado e negativo (−0,5°) dà gradi `-0` (si legge 0), primi 30 e il testo `-0° 30′ 0″`: il segno si vede nel testo.
- L'arrotondamento dei secondi riporta il resto sui primi e sui gradi: 29,9999999° con 0 decimali dà `30° 0′ 0″`, non `29° 59′ 60″`.
- Il testo usa i simboli ° ′ ″ (primo e secondo veri, non apici). [Gradi, primi, secondi → gradi](trig.fromDms) legge anche questo testo.
- Un angolo in altre unità va prima convertito in gradi con [Converti e normalizza angolo](trig.convert).

## Esempi

### 1. Una latitudine

```
[Costante · Variabile: 40.7128] valore ──▶ angolo (°) [Gradi → gradi, primi, secondi] testo ──▶ valore [Print (console.log)]
```

Scrive `40° 42′ 46″`. Con 3 **Decimali dei secondi** scrive `40° 42′ 46.080″`.

### 2. Le tre parti

Con 45,5 le uscite sono **gradi** `45`, **primi** `30`, **secondi** `0`, **testo** `45° 30′ 0″`.

### 3. Un angolo negativo

Con −73,9855 scrive `-73° 59′ 8″` (gradi −73, primi 59, secondi 8).

### 4. Con due decimali

Con 12,3456 e 2 decimali: `12° 20′ 44.16″`.

## Errori

| Messaggio | Quando |
|---|---|
| angolo: serve un numero | L'angolo non è un numero (per esempio un testo come `"abc"`). |

## Vedi anche

- [Gradi, primi, secondi → gradi](trig.fromDms) per fare il contrario
- [Converti e normalizza angolo](trig.convert)
- [Angolo](unit.angle) per i primi e i secondi d'arco come unità (pacchetto [Grandezze e unità](logicstudio-units))
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
