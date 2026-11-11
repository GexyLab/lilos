# Risolvi triangolo (teoremi dei seni e del coseno)

`trig.triangle` · Trigonometria · [Trigonometria](logicstudio-trig) · versione 1

Dati 3 valori di un triangolo qualsiasi (almeno un lato) trova tutti gli altri: lati, angoli, area, perimetro, altezze e raggi. Nel caso ambiguo trova entrambe le soluzioni.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lato a** (`a`) | numero | Il lato a, opposto all'angolo α. |
| **lato b** (`b`) | numero | Il lato b, opposto all'angolo β. |
| **lato c** (`c`) | numero | Il lato c, opposto all'angolo γ. |
| **α (opposto ad a)** (`alpha`) | numero | L'angolo α, nell'**Unità** scelta: più di 0 e meno di mezzo giro. |
| **β (opposto a b)** (`beta`) | numero | L'angolo β, come α. |
| **γ (opposto a c)** (`gamma`) | numero | L'angolo γ, come α. |

Servono **esattamente tre** valori, con almeno un lato. Un ingresso senza valore (o vuoto) non conta. Con meno di tre il blocco aspetta; con più di tre dà un errore.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** (`a`) | numero | Il lato a. |
| **b** (`b`) | numero | Il lato b. |
| **c** (`c`) | numero | Il lato c. |
| **α** (`alpha`) | numero | L'angolo α, nell'**Unità** scelta. |
| **β** (`beta`) | numero | L'angolo β, nell'**Unità** scelta. |
| **γ** (`gamma`) | numero | L'angolo γ, nell'**Unità** scelta. |
| **area** (`area`) | numero | L'area. |
| **perimetro** (`perimeter`) | numero | Il perimetro. |
| **altezza su a** (`ha`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. L'altezza relativa al lato a. |
| **altezza su b** (`hb`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. L'altezza relativa al lato b. |
| **altezza su c** (`hc`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. L'altezza relativa al lato c. |
| **raggio inscritto** (`inradius`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Il raggio del cerchio dentro il triangolo. |
| **raggio circoscritto** (`circumradius`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Il raggio del cerchio attorno al triangolo. |
| **soluzioni** (`solutions`) | numero | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Quante soluzioni ha il triangolo: 1 o 2. |
| **seconda soluzione** (`second`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. Nel caso ambiguo, la seconda soluzione: un oggetto con gli stessi nomi delle uscite (`a`, `b`, `c`, `alpha`, `beta`, `gamma`, `area`, `perimeter`, `ha`, `hb`, `hc`, `inradius`, `circumradius`). Negli altri casi non c'è. |
| **Exception** (`error`) | oggetto | Nascosta di serie: si mostra con l'occhio nelle Proprietà. I valori non bastano o non formano un triangolo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Unità** (`unit`) | Gradi (°), Radianti (rad), Gradi centesimali (gon), Giri | Gradi (°) | L'unità degli angoli, in ingresso e in uscita. |

## Come funziona

Il lato a è opposto all'angolo α, il lato b a β, il lato c a γ, e α + β + γ = 180°. Il blocco riconosce il caso dai tre valori che arrivano:

| Dati | Caso | Come si risolve |
|---|---|---|
| 3 lati | LLL | Teorema del coseno: `cos α = (b² + c² − a²) ÷ (2·b·c)`, e così per β; γ = 180° − α − β. Ogni lato deve essere minore della somma degli altri due. |
| 2 angoli e 1 lato | ALA o AAL | Il terzo angolo è 180° meno i due; teorema dei seni: `a ÷ sin α = b ÷ sin β = c ÷ sin γ` dà gli altri lati. |
| 2 lati e l'angolo **tra** loro | LAL | Teorema del coseno: il terzo lato è `√(p² + q² − 2·p·q·cos(angolo))`; poi come nel caso dei 3 lati. |
| 2 lati e un angolo **non tra** loro | LLA (caso ambiguo) | Teorema dei seni: l'angolo opposto all'altro lato ha `sin = lato × sin(angolo) ÷ lato opposto`. Può dare 0, 1 o 2 triangoli. |

Il caso ambiguo (due lati e un angolo opposto a uno di essi):

- se quel seno è **maggiore di 1** il triangolo non esiste: il lato opposto all'angolo è troppo corto (errore);
- se è **uguale a 1** c'è una sola soluzione, un angolo retto;
- altrimenti ci sono due angoli possibili, uno acuto e uno ottuso (il suo supplementare, 180° meno l'acuto). Ogni angolo vale solo se la somma con l'angolo dato resta sotto 180°. Se valgono tutti e due, il blocco dà due triangoli: la **prima soluzione** esce sulle uscite normali, con l'angolo acuto; la **seconda soluzione** esce sulla porta nascosta **seconda soluzione**, e **soluzioni** vale 2. Se vale uno solo (di solito quando il lato opposto all'angolo dato è il più lungo), **soluzioni** vale 1.

Poi calcola l'area `½·b·c·sin α`, il perimetro, le altezze `2 × area ÷ lato`, il raggio inscritto `area ÷ semiperimetro` e il raggio circoscritto `a ÷ (2·sin α)`.

- I risultati sono arrotondati a **15 cifre significative**.
- Con **tre angoli** il triangolo non è determinato (sono possibili triangoli di ogni misura): serve almeno un lato.
- Per un triangolo con l'angolo retto, [Triangolo rettangolo](trig.rightTriangle) è più semplice.

## Esempi

### 1. Tre lati

```
[Costante · Variabile: 3] valore ──▶ lato a [Risolvi triangolo: °] gamma ──▶ valore [Print (console.log)]
[Costante · Variabile: 4] valore ──▶ lato b
[Costante · Variabile: 5] valore ──▶ lato c
```

Scrive `90`. Le altre uscite: α `36.869897645844`, β `53.130102354156`, area `6`, perimetro `12`, altezze `4`, `3` e `2.4`, raggio inscritto `1`, raggio circoscritto `2.5`, soluzioni `1`.

### 2. Due angoli e un lato

α = 40°, β = 60°, c = 10: γ `80`, a `6.52703644666139`, b `8.79385241571817`, area `28.2628968711784`, perimetro `25.3208888623796`.

### 3. Due lati e l'angolo tra loro

a = 5, b = 7, γ = 60°: c `6.2449979983984`, α `43.897886248014`, β `76.102113751986`, area `15.1554445662277`.

### 4. Il caso ambiguo: due soluzioni

a = 7, b = 10, α = 30°. Prima soluzione: β `45.584691402807`, γ `104.415308597193`, c `13.5592335234107`, area `33.8980838085268`, **soluzioni** `2`. Seconda soluzione (porta nascosta **seconda soluzione**): `beta` `134.415308597193`, `gamma` `15.584691402807`, `c` `3.76127455227803`, `area` `9.40318638069507`.

### 5. Il caso ambiguo: una soluzione, o nessuna

a = 12, b = 10, α = 30°: una sola soluzione, β `24.6243183521641`, γ `125.375681647836`, c `19.5689661524801`, **soluzioni** `1`. Con a = 4, b = 10, α = 30°: errore `Con questi valori il triangolo non esiste: il lato opposto all'angolo è troppo corto`.

### 6. In gradi centesimali

**Unità** gradi centesimali, a = 3, b = 4, γ = 100 (un angolo retto): c `5`, α `40.9665529398267`, β `59.0334470601733`.

## Errori

| Messaggio | Quando |
|---|---|
| a: serve un numero | Un valore non è un numero. Al posto di `a` c'è il nome della porta (`b`, `c`, `α`, `β`, `γ`). |
| Il lato a deve essere maggiore di 0 | Un lato è 0 o negativo (`a`, `b` o `c`). |
| L'angolo α deve essere tra 0 e 180° esclusi | Un angolo è 0, negativo o di mezzo giro o più (`α`, `β` o `γ`). Il limite è scritto nell'unità scelta: `3.14159265358979 rad`, `200 gon`, `0.5 giri`. |
| Servono esattamente 3 valori (almeno un lato): ne sono arrivati 4 | Sono arrivati più di tre valori (il numero cambia). |
| Con tre angoli il triangolo non è determinato: serve almeno un lato | Sono arrivati tre angoli e nessun lato. |
| Con questi lati il triangolo non esiste: ogni lato deve essere minore della somma degli altri due | Tre lati dove uno è lungo quanto gli altri due insieme, o di più. |
| La somma degli angoli supera 180° | Con due angoli: la somma è 180° o più. |
| Con questi valori il triangolo non esiste: il lato opposto all'angolo è troppo corto | Due lati e un angolo (caso ambiguo): il lato opposto all'angolo dato è troppo corto per arrivare all'altro. |
| Con questi valori il triangolo non esiste | Due lati e un angolo: nessuna delle due possibilità dà un triangolo. |

## Vedi anche

- [Triangolo rettangolo](trig.rightTriangle) per un triangolo con l'angolo retto
- [Funzioni trigonometriche (Math.sin, Math.cos…)](trig.fn)
- [Funzioni inverse (Math.asin, Math.acos…)](trig.inverse)
- [Trigonometria](logicstudio-trig), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
