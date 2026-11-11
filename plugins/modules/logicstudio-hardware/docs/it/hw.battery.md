# getBattery (batteria)

`hw.battery` · Hardware · [Hardware](logicstudio-hardware) · versione 1

La batteria del computer dove gira lilOS (un portatile, un Raspberry Pi con un UPS che il sistema vede): quanto è carica, se è in carica, se il computer è alimentato; avvisa quando si scarica.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Legge adesso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **batteria** (`battery`) | oggetto | Tutto (vedi sotto). |
| **carica (%)** (`percent`) | numero | Da 0 a 100, o `null` senza batteria. |
| **in carica** (`charging`) | sì/no | Se si sta caricando. |
| **alimentato** (`plugged`) | sì/no | Se il computer è attaccato alla corrente. |
| **scarica** (`low`) | impulso | La carica è appena scesa sotto **Scarica sotto (%)**, senza caricare. |
| **Exception** (`error`) | oggetto | Permesso mancante, libreria che non si carica. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Leggi da solo ogni (secondi, 0 = mai)** (`seconds`) | da 0 a 86400 | 60 | Ogni quanto il blocco legge da solo. |
| **Scarica sotto (%)** (`threshold`) | da 1 a 99 | 20 | |

## Come funziona

L'oggetto **batteria**: `{ present, percent, charging, plugged, minutesLeft, cycles, health, voltage, model }`. `present` è `false` su un computer senza batteria (le altre uscite allora sono `null` o `false`); `minutesLeft` sono i minuti che restano quando il sistema lo sa; `health` è la capacità di adesso rispetto a quella da nuova, in percentuale.

**scarica** manda un impulso una volta sola quando la carica scende sotto la soglia; di nuovo solo dopo che è tornata sopra (o che il computer è in carica).

## Esempi

### 1. Una notifica quando la batteria è scarica

```
[getBattery (batteria): ogni 60 s, scarica sotto 15] scarica ──▶ invia [Notify: "Batteria al 15%: attacca il caricatore"]
```

### 2. La carica in una finestra

```
[getBattery (batteria): ogni 30 s] carica (%) ──▶ valore [Barra di avanzamento: progress1]
                                   in carica  ──▶ accesa [Spia: lamp1]
```

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per le informazioni di sistema. |
| La libreria systeminformation non funziona su questo computer: … | La libreria non si carica. |

## Vedi anche

- [os (info di sistema)](hw.systemInfo)
- [Hardware](logicstudio-hardware)
