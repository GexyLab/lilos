# Testo formattato

`core.uiText` · Disegno · [Blocchi di base](logicstudio-core) · versione 1

Un testo in una finestra, con la dimensione, il colore e lo stile che vuoi: un titolo grande, un avviso rosso, una nota su più righe. A differenza dell'[Etichetta](ui.label), che ha tre dimensioni fisse, qui scegli tutto; uno schema può cambiare il testo e il colore mentre il programma gira.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Testo** | testo su più righe (traducibile) | «Testo» | Quello che si vede all'apertura. Gli a capo restano. |
| **Dimensione (px)** | da 8 a 96 | 14 | |
| **Colore** | un colore, o vuoto | vuoto | Vuoto: il colore del testo del tema. |
| **Sfondo** | un colore, o vuoto | vuoto | Un riquadro colorato dietro il testo. |
| **Grassetto**, **Corsivo**, **Sottolineato** | sì/no | no | |
| **Allineamento** | a sinistra, al centro, a destra | a sinistra | Nella larghezza della componente. |
| **Larghezza (px)** | da 0 a 4000 | 0 | 0: tutta quella che c'è (in una Colonna, la larghezza della colonna). |

I colori si scrivono `#rrggbb`, `#rrggbbaa`, `rgb()`, `hsl()` o con un nome (`red`); quello che non è un colore viene ignorato. Il testo si mostra sempre come testo, mai come HTML.

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | Sostituisce il testo mostrato. |
| **colore** (`color`) | testo | Un colore nuovo per il testo; un valore che non è un colore torna a quello del tema. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Exception** (`error`) | oggetto | Come ogni blocco; per questa componente non ci passa niente. |

## Esempi

### 1. Uno stato colorato

```
[Confronto (== ≠ < >): a > b] se vero  ──▶ invia [Costante · Variabile: "red"]   valore ──▶ colore [Testo formattato: stato]
[Confronto (== ≠ < >): a > b] se falso ──▶ invia [Costante · Variabile: "green"] valore ──▶ colore [Testo formattato: stato]
[Template (formatta): "Temperatura {t} °C"] testo ──▶ testo [Testo formattato: stato]
```

Sul [Confronto](core.compare) arriva la temperatura su **a** e la soglia su **b**; i due blocchi [Costante · Variabile](core.value) sono di tipo testo, con **invia** mostrato e collegato. Il testo mostra la temperatura e diventa rosso quando supera la soglia, verde quando torna sotto.

### 2. Un titolo

Proprietà: Testo «Impianto 3», Dimensione 24, Grassetto, Allineamento al centro. Non serve nessun oggetto nello schema: il testo resta quello.

## Vedi anche

- [Etichetta](ui.label) e [Valore](ui.value) delle [Componenti UI standard](logicstudio-ui)
- [Forma](core.uiShape)
- [Testo · Commento](core.drawText), per scrivere sugli schemi
- [L'oggetto di una componente](ide/components)
