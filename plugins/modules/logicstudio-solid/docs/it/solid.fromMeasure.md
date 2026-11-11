# Dalla misura alla dimensione

`solid.fromMeasure` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Il contrario degli altri blocchi: da un volume o da un'area trova la dimensione (il lato di un cubo, il raggio di una sfera, il raggio o l'altezza di un cilindro o di un cono).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume o area** (`measure`) | numero | Il volume o l'area di partenza, secondo quello che trovi. |
| **altezza o raggio (cilindro, cono)** (`known`) | numero | L'altezza o il raggio che già conosci. Serve solo per cilindro e cono (vedi sotto); negli altri casi viene ignorato. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **dimensione** (`result`) | numero | La dimensione cercata (lato, raggio o altezza). |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Trova** (`what`) | vedi la tabella sotto | Sfera: raggio dal volume | Cosa trovare (vedi la tabella sotto). |

Le opzioni di **Trova**:

| Opzione | Nome interno |
|---|---|
| Cubo: lato dal volume | `cubeV` |
| Cubo: lato dall'area totale | `cubeA` |
| Sfera: raggio dal volume | `sphereV` |
| Sfera: raggio dalla superficie | `sphereA` |
| Cilindro: raggio dal volume e dall'altezza | `cylinderR` |
| Cilindro: altezza dal volume e dal raggio | `cylinderH` |
| Cono: raggio dal volume e dall'altezza | `coneR` |
| Cono: altezza dal volume e dal raggio | `coneH` |

## Come funziona

Il blocco aspetta **misura** (e **altezza o raggio** per cilindro e cono), poi calcola:

- **Cubo: lato dal volume**: s = ∛V
- **Cubo: lato dall'area totale**: s = √(A / 6)
- **Sfera: raggio dal volume**: r = ∛(3V / (4π))
- **Sfera: raggio dalla superficie**: r = √(A / (4π))
- **Cilindro: raggio dal volume e dall'altezza**: r = √(V / (π·h)), con l'altezza *h* su **altezza o raggio**
- **Cilindro: altezza dal volume e dal raggio**: h = V / (π·r²), con il raggio *r* su **altezza o raggio**
- **Cono: raggio dal volume e dall'altezza**: r = √(3V / (π·h))
- **Cono: altezza dal volume e dal raggio**: h = 3V / (π·r²)

Il volume e l'area devono essere maggiori di 0.

## Esempi

### 1. Il lato di un cubo da 1000 litri

```
[Costante · Variabile: 1] valore ──▶ volume o area  [Dalla misura alla dimensione: Cubo: lato dal volume] dimensione ──▶ valore [Print (console.log)]
```

Impostazioni: **Trova** = Cubo: lato dal volume.

Scrive `1`.

Un metro cubo (1000 litri) ha il lato di 1 m.

### 2. Il raggio di una sfera da 100 cm³

```
[Costante · Variabile: 100] valore ──▶ volume o area  [Dalla misura alla dimensione: Sfera: raggio dal volume] dimensione ──▶ valore [Print (console.log)]
```

Impostazioni: **Trova** = Sfera: raggio dal volume.

Scrive `2.87941191148486`.

### 3. Il raggio di un cilindro da 500 cm³ alto 10 cm

```
[Costante · Variabile: 500] valore ──▶ volume o area                     [Dalla misura alla dimensione: Cilindro: raggio dal volume e dall'altezza] dimensione ──▶ valore [Print (console.log)]
[Costante · Variabile: 10] valore ──▶ altezza o raggio (cilindro, cono)
```

Impostazioni: **Trova** = Cilindro: raggio dal volume e dall'altezza.

Scrive `3.98942280401433`.

## Errori

| Messaggio | Quando |
|---|---|
| misura: serve un numero maggiore di 0 (arrivato: …) | Il volume o l'area non è un numero maggiore di 0. |
| altezza o raggio: serve un numero maggiore di 0 (arrivato: …) | Con cilindro o cono, l'altezza o il raggio non è un numero maggiore di 0. |

## Vedi anche

- [Cubo](solid.cube) per tutte le misure del cubo
- [Sfera](solid.sphere) per tutte le misure della sfera
- [Cilindro](solid.cylinder) per tutte le misure del cilindro
- [Cono](solid.cone) per tutte le misure del cono
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
