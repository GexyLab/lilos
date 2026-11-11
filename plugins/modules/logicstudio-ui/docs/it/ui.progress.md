# Barra di avanzamento

`ui.progress` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Una barra orizzontale che si riempie da 0 a 100, con la percentuale accanto: per mostrare quanto manca alla fine di un lavoro.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra la barra. |
| **Mostra la percentuale** | sì/no | sì | Mostra il numero (per esempio «42%») a destra della barra. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore (0–100)** (`value`) | numero | Quanto è piena la barra, in percentuale. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

All'apertura la barra è vuota e la percentuale non si vede. Ogni valore su **valore (0–100)**:

- viene convertito in numero (`"42"` e `"42,5"` vanno bene); un valore che non è un numero (`"ciao"`, `null`, `true`) vale **0**;
- viene tenuto **tra 0 e 100**: −5 riempie 0, 150 riempie 100;
- riempie la barra con una breve animazione e scrive la percentuale **arrotondata all'intero** («42,5» diventa «43%»).

La barra non conosce altri intervalli: se il tuo lavoro va, per esempio, da 0 a 250 file, calcola la percentuale nello schema (fatti / totale × 100).

## Esempi

### 1. Dieci secondi di attesa

```
Finestra «Attesa»
└ Colonna (radice)
  └ Barra di avanzamento  progress1  Etichetta «Preparazione…»
```

```
[Ogni…: 1 s] impulso ──▶ più [Contatore] conteggio ──▶ a [Moltiplica] risultato ──▶ valore (0–100) [Barra: Preparazione…]
                                         [Valore: 10] valore ──▶ b
```

Ogni secondo il [Contatore](core.counter) sale di 1 e la [Moltiplica](core.multiply) lo porta in percentuale: la barra mostra 10%, 20%… e dopo 10 secondi 100%. Dopo, il conteggio continua (110, 120…) ma la barra resta piena.

### 2. Un conto alla rovescia

```
Finestra «Pausa»
└ Colonna (radice)
  └ Barra di avanzamento  progress1  Etichetta «Tempo rimasto»  Mostra la percentuale spento
```

```
[Ogni…: 1 s] impulso ──▶ più [Contatore] conteggio ──▶ b [Sottrai] risultato ──▶ valore (0–100) [Barra: Tempo rimasto]
                                        [Valore: 100] valore ──▶ a
```

Per una pausa di 100 secondi: la [Sottrai](core.subtract) calcola 100 − secondi passati, e la barra si svuota di un centesimo al secondo, senza numero accanto. Sotto lo zero la barra resta vuota.

### 3. Lo stesso valore di un cursore

```
[Cursore: Volume] valore ──▶ valore (0–100) [Barra: Volume]
```

Con un [Cursore](ui.slider) da 0 a 100, la barra mostra lo stesso valore quando l'utente lascia il cursore.

## Accessibilità

La barra ha il ruolo di barra di avanzamento, con il valore da 0 a 100: un lettore di schermo può leggerla («barra di avanzamento, 42»). L'**Etichetta** sopra non è collegata alla barra, quindi la barra non ha un nome suo. Prima del primo valore la barra non dice quanto vale.

## Vedi anche

- [Indicatore](ui.gauge), per valori con un intervallo tuo
- [Valore](ui.value)
- [Componenti UI standard](logicstudio-ui)
