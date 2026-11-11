# Triangolo rettangolo

`trig.rightTriangle` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Dati due valori qualsiasi di un triangolo rettangolo (due lati, o un lato e un angolo), trova i lati, gli angoli, l'area e il perimetro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **cateto a** (`a`) | numero | Il cateto opposto all'angolo α. |
| **cateto b** (`b`) | numero | Il cateto opposto all'angolo β. |
| **ipotenusa c** (`c`) | numero | L'ipotenusa, il lato opposto all'angolo retto. |
| **α (opposto ad a)** (`alpha`) | numero | L'angolo α, nell'**Unità** scelta: più di 0 e meno di un angolo retto. |
| **β (opposto a b)** (`beta`) | numero | L'angolo β, come α. |

Servono **esattamente due** valori: un ingresso senza valore (o vuoto) non conta. Con meno di due il blocco aspetta; con più di due dà un errore.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** (`a`) | numero | Il cateto a. |
| **b** (`b`) | numero | Il cateto b. |
| **c** (`c`) | numero | L'ipotenusa. |
| **α** (`alpha`) | numero | L'angolo α, nell'**Unità** scelta. |
| **β** (`beta`) | numero | L'angolo β, nell'**Unità** scelta. |
| **area** (`area`) | numero | L'area. |
| **perimetro** (`perimeter`) | numero | Il perimetro. |
| **altezza su c** (`height`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. L'altezza relativa all'ipotenusa. |
| **raggio inscritto** (`inradius`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Il raggio del cerchio dentro il triangolo. |
| **raggio circoscritto** (`circumradius`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Il raggio del cerchio attorno al triangolo. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. I valori non bastano o non formano un triangolo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Unità** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità degli angoli, in ingresso e in uscita. |

## Come funziona

Il triangolo ha l'angolo retto tra i cateti **a** e **b**; **c** è l'ipotenusa, α è opposto ad a e β è opposto a b, e α + β = un angolo retto (90°). Quando arrivano due valori il blocco trova gli altri:

| Dati | Come si trova il resto |
|---|---|
| a e b | c = √(a² + b²) |
| un cateto e c | l'altro cateto = √(c² − cateto²); la c deve essere più lunga del cateto |
| un lato e α (o β) | con le funzioni trigonometriche: per esempio, con c e α, a = c·sin α e b = c·cos α; con a e α, c = a ÷ sin α e b = a ÷ tan α; con b e α, a = b·tan α e c = b ÷ cos α |
| un angolo e l'altro | non basta: serve almeno un lato |

Poi calcola gli angoli (β = angolo retto − α), l'area `a·b ÷ 2`, il perimetro `a + b + c`, l'altezza sull'ipotenusa `a·b ÷ c`, il raggio inscritto `(a + b − c) ÷ 2` e il raggio circoscritto `c ÷ 2`.

- Gli angoli sono nell'**Unità** scelta, sia quando li dai sia quando escono; l'angolo retto vale 90°, π ÷ 2 rad, 100 gon o 0,25 giri.
- I risultati sono arrotondati a **15 cifre significative**.
- Per un triangolo che non ha l'angolo retto usa [Risolvi triangolo (teoremi dei seni e del coseno)](trig.triangle).

## Esempi

### 1. Il triangolo 3-4-5

```
[Costante · Variabile: 3] valore ──▶ cateto a [Triangolo rettangolo: °] c ──▶ valore [Print (console.log)]
[Costante · Variabile: 4] valore ──▶ cateto b
```

Con a = 3 e b = 4 le uscite sono c `5`, α `36.869897645844`, β `53.130102354156`, area `6`, perimetro `12`, altezza su c `2.4`, raggio inscritto `1`, raggio circoscritto `2.5`. Con a = 3 e c = 5 escono gli stessi valori (b = `4`).

### 2. Un'ipotenusa e un angolo

c = 10 e α = 30°: a `5`, b `8.66025403784439`, β `60`, area `21.650635094611`, perimetro `23.6602540378444`.

### 3. Un cateto e l'altro angolo

b = 5 e β = 40°: α `50`, a `5.95876796297105`, c `7.77861913430206`.

### 4. Angoli in gradi centesimali

**Unità** gradi centesimali, a = 6 e α = 50 (cioè 45°): b `6`, c `8.48528137423857`, β `50`, area `18`.

### 5. Troppi valori

a = 1, b = 2 e c = 3: errore `Servono esattamente 2 valori: ne sono arrivati 3`. Con a = 5 e c = 5: errore `L'ipotenusa deve essere più lunga del cateto`.

## Errori

| Messaggio | Quando |
|---|---|
| a: serve un numero | Un valore non è un numero. Al posto di `a` c'è il nome della porta (`b`, `c`, `α`, `β`). |
| Servono esattamente 2 valori: ne sono arrivati 3 | Sono arrivati più di due valori (qui 3: il numero cambia). |
| Il lato a deve essere maggiore di 0 | Un lato è 0 o negativo (`a`, `b` o `c`). |
| L'angolo α deve essere tra 0 e 90° esclusi | Un angolo è 0, negativo o non minore di un angolo retto (`α` o `β`). In altre unità il limite cambia: `1.5707963267949 rad`, `100 gon`, `0.25 giri`. |
| Con due angoli il triangolo non è determinato: serve almeno un lato | Sono arrivati solo α e β. |
| L'ipotenusa deve essere più lunga del cateto | Con un cateto e c, il cateto è lungo quanto c o di più. |

## Vedi anche

- [Risolvi triangolo (teoremi dei seni e del coseno)](trig.triangle) per un triangolo qualsiasi
- [Funzioni trigonometriche (Math.sin, Math.cos…)](trig.fn)
- [Cartesiane → polari](trig.toPolar)
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
