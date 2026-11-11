# Leggi misura (parse)

`unit.parse` · Conversioni unità di misura · [Grandezze e unità](logicstudio-units) · versione 1

Legge un testo come `"12,5 km"` o `"20°C"` e ne ricava il **numero**, l'**unità** e la **grandezza**. Se vuoi, converte subito il valore in un'altra unità.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | La misura da leggere: un numero seguito da un'unità. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il numero letto (o convertito, con **Converti in**). |
| **unità** (`unit`) | testo | L'unità: il simbolo del pacchetto se la conosce (`m2` diventa `m²`), altrimenti come è scritta. |
| **grandezza** (`quantity`) | testo | L'`id` della grandezza (`length`, `temperature`…), o un testo vuoto se l'unità non è del pacchetto. |
| **Exception** (`error`) | oggetto | Il testo non comincia con un numero, manca l'unità, o la conversione non si può fare. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Converti in** (`to`) | un'unità, o vuoto | vuoto | Se c'è, il valore è convertito in questa unità (come fa [Converti (da · a)](unit.convert)) e **unità** manda questa. |
| **L'unità è obbligatoria** (`need`) | sì / no | sì | Con **no**, un testo con il solo numero (`"42"`) va bene: **unità** e **grandezza** mandano un testo vuoto. |

## Come funziona

A ogni testo che arriva il blocco legge prima il **numero**, poi tutto quello che segue come **unità** (spazi prima e dopo tolti). Lo spazio tra numero e unità può esserci o no: `"12.5km"` e `"12,5 km"` vanno bene uguale.

Il numero:

- può avere il segno (`-3`, `+3`, anche il segno meno tipografico `−3`) e l'esponente (`1e3` = 1000);
- **con un solo separatore**, la virgola o il punto sono i decimali: `"12,5"` e `"12.5"` valgono 12,5. Attenzione: `"1,234"` vale 1,234 e non 1234;
- **con punto e virgola insieme**, l'ultimo dei due separa i decimali e l'altro le migliaia: `"1.234,5"` e `"1,234.5"` valgono 1234,5;
- **con lo stesso separatore ripetuto**, sono migliaia: `"1.000.000"` vale 1000000. Anche lo spazio e l'apostrofo possono separare le migliaia (`"1 000"`, `"1'000"`).

L'unità **non deve per forza essere del pacchetto**: `"230 V"` dà valore 230, unità `V` e grandezza vuota. Deve esserlo solo con **Converti in**.

## Esempi

### 1. Una distanza scritta da una persona

```
[Campo di testo] valore ──▶ testo [Leggi misura (parse)] valore ──▶ valore [Print (console.log)]
```

| Testo | valore | unità | grandezza |
|---|---|---|---|
| `12,5 km` | `12.5` | `km` | `length` |
| `-3 °C` | `-3` | `°C` | `temperature` |
| `20°C` | `20` | `°C` | `temperature` |
| `1.234,5 m2` | `1234.5` | `m²` | `area` |
| `.5 L` | `0.5` | `L` | `volume` |
| `230 V` | `230` | `V` | (vuoto) |

### 2. Leggere e convertire in un passo

Con **Converti in** `m/s`, il testo `"100 km/h"` dà valore `27.7777777778`, unità `m/s`, grandezza `speed`. Il testo `"3 kg"` dà un'eccezione, perché i chilogrammi non diventano metri al secondo.

## Errori

| Messaggio | Quando |
|---|---|
| Non è una misura: «…» | Il testo non comincia con un numero (per esempio `"km"` o `"circa 3 m"`), o è più lungo di 200 caratteri. |
| Manca l'unità di misura | C'è solo il numero e **L'unità è obbligatoria** è sì; o c'è **Converti in** e il testo non ha un'unità. |
| Unità sconosciuta: «…» | Con **Converti in**: l'unità del testo, o quella di **Converti in**, non è del pacchetto. |
| Unità incompatibili: «…» (…) e «…» (…) | Con **Converti in**: le due unità sono di grandezze diverse. |
| Temperatura sotto lo zero assoluto | Con **Converti in**: una temperatura sotto 0 K. |
| Il consumo deve essere maggiore di zero | Con **Converti in**: un consumo di carburante 0 o negativo. |

## Vedi anche

- [Scrivi misura (format)](unit.format), che fa il contrario
- [Converti (da · a)](unit.convert) quando numero e unità arrivano già separati
- [Funzioni stringa](core.text) per preparare il testo (togliere spazi, cambiare maiuscole…)
- [Come funziona un blocco](ide/blocks)
