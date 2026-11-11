# fsSize (dischi)

`hw.disks` · Hardware · [Hardware](logicstudio-hardware) · versione 1

I dischi del computer dove gira lilOS: per ognuno lo spazio totale, usato e libero. Utile per sapere quando un disco si riempie (non è lo spazio della tua home, che ha la sua quota).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Legge adesso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **dischi** (`disks`) | lista | Un disco per elemento: `{ mount, fs, type, size, used, free, percent }`. |
| **il più pieno (%)** (`fullest`) | numero | La percentuale usata del disco più pieno. |
| **Exception** (`error`) | oggetto | Permesso mancante, libreria che non si carica. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Leggi da solo ogni (secondi, 0 = mai)** (`seconds`) | da 0 a 86400 | 0 | |

## Come funziona

`mount` è dove si vede il disco (`C:`, `/`, `/mnt/dati`), `fs` il dispositivo, `type` il tipo (NTFS, ext4…); `size`, `used` e `free` sono in byte, `percent` da 0 a 100. Ci sono anche le chiavette USB e i dischi di rete montati nel sistema.

## Esempi

### 1. Una tabella

```
[Pulsante: Aggiorna] premuto ──▶ leggi [fsSize (dischi)] dischi ──▶ righe [Tabella: table1]
```

### 2. Un avviso

```
[fsSize (dischi): ogni 600 s] il più pieno (%) ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ valore [Al cambio (fronte ↑↓)] diventa vero ──▶ invia [Notify: "Disco quasi pieno"]
                              [Costante · Variabile: 90]  valore ──▶ b
```

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per le informazioni di sistema. |
| La libreria systeminformation non funziona su questo computer: … | La libreria non si carica. |

## Vedi anche

- [os (info di sistema)](hw.systemInfo)
- [Hardware](logicstudio-hardware)
