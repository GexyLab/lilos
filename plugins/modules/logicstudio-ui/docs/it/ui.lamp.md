# Spia

`ui.lamp` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Un pallino che si accende e si spegne, come la spia di un quadro elettrico, con una scritta accanto. Accesa, si colora e si illumina; spenta, è grigia.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta accanto alla spia, in grassetto. |
| **Colore** | verde, rosso, giallo, blu | verde | Il colore della spia accesa. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **accesa** (`on`) | sì/no | Accende o spegne la spia. |
| **colore** (`color`) | testo | Cambia il colore: `green`, `red`, `yellow` o `blue` (i nomi inglesi). |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Exception** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

All'apertura la spia è **spenta**, qualunque cosa le proprietà dicano: si accende solo quando arriva un valore su **accesa**.

**accesa** — la spia si accende con ogni valore «pieno» e si spegne con quelli vuoti:

| Arriva | La spia |
|---|---|
| `true`, `1`, `"sì"`, `"0"`, `"no"`, qualsiasi testo non vuoto | accesa |
| `false`, `0`, `""`, `null` | spenta |
| il testo `"false"` | spenta |

> Attenzione: il **testo** `"0"` e il testo `"no"` la **accendono**. Se il valore viene da un file o da un testo, passalo prima da [Cast in sì/no (Boolean())](core.toBool).

**colore** — il nome di uno dei quattro colori, **in inglese**: `green` (verde), `red` (rosso), `yellow` (giallo), `blue` (blu). Il cambio di colore non accende né spegne la spia. Con un nome diverso (per esempio `rosso` o `#ff0000`) la spia accesa resta grigia, senza luce: sembra spenta.

## Esempi

### 1. Allarme di temperatura

```
Finestra «Frigo»
└ Colonna (radice)
  ├ Valore  value1  Etichetta «Temperatura:»  Unità «°C»
  └ Spia    lamp1   Etichetta «Troppo caldo»  Colore rosso
```

```
[readFile: ~/frigo.txt] contenuto ──▶ valore [Cast (converti tipo): numero] risultato ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ accesa [Spia: Troppo caldo]
[Costante · Variabile: 8] valore ──▶ b [Confronto (== ≠ < >)]
```

Con 9 gradi la spia rossa si accende; con 6 si spegne.

### 2. Una spia a tre stati

Una spia sempre accesa che cambia colore: verde se va tutto bene, giallo se c'è un avviso, rosso se c'è un errore.

```
Finestra «Servizio»
└ Colonna (radice)
  └ Spia  lamp1  Etichetta «Stato del servizio»
```

Aggiungi al blocco [Switch · Case](core.switch) le uscite **ok**, **avviso**, **errore**:

```
[Costante · Variabile: sì] valore ──▶ accesa [Spia: Stato del servizio]
[Intervallo (setInterval): 30 s] impulso ──▶ leggi [readFile: ~/stato.txt] contenuto ──▶ testo [Funzioni stringa: togli spazi] risultato ──▶ valore [Switch · Case]
[Switch · Case] ok     ──▶ invia [Costante · Variabile: green]  valore ──▶ colore [Spia: Stato del servizio]
       avviso ──▶ invia [Costante · Variabile: yellow] valore ──▶ colore
       errore ──▶ invia [Costante · Variabile: red]    valore ──▶ colore
```

Il file `stato.txt` contiene una parola: `ok`, `avviso` o `errore`. Il primo blocco [Costante · Variabile](core.value) (tipo sì/no, niente su **invia**) accende la spia all'avvio; gli altri tre (tipo testo) hanno l'ingresso **invia** collegato (mostralo con l'occhio accanto alla porta, nelle Proprietà), quindi mandano il colore solo quando serve. Finché il file non è letto, la spia è accesa nel suo colore delle Proprietà.

## Accessibilità

Lo stato della spia si vede **solo dal colore**: un lettore di schermo legge l'etichetta ma non sa se la spia è accesa o spenta, e chi non distingue i colori può non vederlo. Se lo stato è importante, affianca alla spia un [Valore](ui.value) o un'[Etichetta](ui.label) che lo dica a parole.

## Vedi anche

- [Valore](ui.value), [Indicatore](ui.gauge)
- [Confronto (== ≠ < >)](core.compare), [Switch · Case](core.switch)
- [Componenti UI standard](logicstudio-ui)
