# Coordinate cartesiane, cilindriche, sferiche

`solid.coords` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Cambia le coordinate di un punto: cartesiane, cilindriche o sferiche.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto** (`point`) | lista | Il punto, una lista di 3 valori nel sistema **Da**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto** (`point`) | lista | Il punto nel sistema **A**, una lista di 3 valori. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Da** (`from`) | Cartesiane [x, y, z] / Cilindriche [ρ, φ, z] / Sferiche [r, θ, φ] | Cartesiane [x, y, z] | Il sistema in cui arriva il punto. |
| **A** (`to`) | Cartesiane [x, y, z] / Cilindriche [ρ, φ, z] / Sferiche [r, θ, φ] | Sferiche [r, θ, φ] | Il sistema in cui esce il punto. |
| **Unità degli angoli** (`unit`) | Gradi / Radianti / Gradi centesimali / Giri | Gradi | In che unità sono gli angoli (φ e θ), in entrata e in uscita. |

## Come funziona

I tre sistemi, con gli angoli nell'unità scelta:

- **Cartesiane** `[x, y, z]`
- **Cilindriche** `[ρ, φ, z]`: ρ distanza dall'asse z, φ angolo nel piano xy a partire dall'asse x
- **Sferiche** `[r, θ, φ]`: r distanza dall'origine, θ angolo **dall'asse z** (da 0 a 180°), φ angolo nel piano xy a partire dall'asse x

Il blocco passa sempre per le coordinate cartesiane: da cilindriche x = ρ·cos φ, y = ρ·sin φ; da sferiche x = r·sin θ·cos φ, y = r·sin θ·sin φ, z = r·cos θ. All'uscita: cilindriche ρ = √(x² + y²), φ = atan2(y, x); sferiche r = √(x² + y² + z²), θ = arccos(z / r), φ = atan2(y, x). Nell'origine θ vale 0. I valori piccolissimi (sotto 10⁻¹⁴, errori di arrotondamento) escono 0.

Con **Da** e **A** uguali il punto passa senza cambiare. Gli angoli in uscita di φ vanno da −180° a 180°.

## Esempi

### 1. Da cartesiane a sferiche

```
[Costante · Variabile: [1,1,0]] valore ──▶ punto  [Coordinate cartesiane, cilindriche, sferiche: Cartesiane [x, y, z], Sferiche [r, θ, φ]] punto ──▶ valore [Print (console.log)]
```

Impostazioni: **Da** = Cartesiane [x, y, z]; **A** = Sferiche [r, θ, φ] (θ dall'asse z).

Scrive `[1.4142135623731,90,45]`.

r = √2, θ = 90° (sul piano xy), φ = 45°.

### 2. Da cilindriche a cartesiane

```
[Costante · Variabile: [2,90,5]] valore ──▶ punto  [Coordinate cartesiane, cilindriche, sferiche: Cilindriche [ρ, φ, z], Cartesiane [x, y, z]] punto ──▶ valore [Print (console.log)]
```

Impostazioni: **Da** = Cilindriche [ρ, φ, z]; **A** = Cartesiane [x, y, z].

Scrive `[0,2,5]`.

ρ = 2, φ = 90°, z = 5: il punto è sull'asse y.

## Errori

| Messaggio | Quando |
|---|---|
| punto: serve un punto o un vettore [x, y, z] | Il punto non è una lista di 3 (o 2) elementi né un oggetto. |
| punto: le coordinate devono essere numeri | Una coordinata non è un numero. |

## Vedi anche

- [Trasforma punti (sposta, scala, ruota)](solid.transform) per spostare e ruotare punti
- [Converti e normalizza angolo](trig.convert) per cambiare unità a un angolo
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
