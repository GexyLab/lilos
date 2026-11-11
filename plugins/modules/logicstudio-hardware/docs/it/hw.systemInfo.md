# os (info di sistema)

`hw.systemInfo` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Le informazioni del computer dove gira lilOS: il processore e quanto lavora, la memoria, da quanto è acceso, le temperature quando il sistema le dà.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Legge adesso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **info** (`info`) | oggetto | Tutto (vedi sotto). |
| **carico CPU (%)** (`cpu`) | numero | Quanto lavora il processore, da 0 a 100. |
| **memoria usata (%)** (`memory`) | numero | La memoria usata, da 0 a 100. |
| **temperatura (°C)** (`temperature`) | numero | La temperatura del processore, o `null` se il sistema non la dà. |
| **acceso da (secondi)** (`uptime`) | numero | Da quanto è acceso il computer. Nascosto. |
| **Exception** (`error`) | oggetto | Permesso mancante, libreria che non si carica. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Leggi da solo ogni (secondi, 0 = mai)** (`seconds`) | da 0 a 86400 | 0 | Con un numero, il blocco legge da solo e manda le uscite ogni tanto. |

## Come funziona

L'oggetto **info**:

```
{
  "cpu": { "brand": "AMD Ryzen 5 7520U", "cores": 8, "physicalCores": 4, "speedGHz": 2.8 },
  "load": 12.5, "loadPerCore": [10, 15, 9, 16, 11, 12, 14, 13],
  "memory": { "total": 14845210624, "used": 9123456789, "free": 5721753835, "percent": 61.5 },
  "uptime": 607330,
  "temperature": { "main": 54, "max": 61, "cores": [52, 54, 55, 53] },
  "os": { "platform": "win32", "distro": "Microsoft Windows 11 Home", "release": "10.0.26200", "arch": "x64", "hostname": "pc-ufficio" }
}
```

La memoria è in byte. Le temperature: su Linux e su un Raspberry Pi quasi sempre; su Windows solo se il sistema le dà (spesso no: allora `null`); su macOS con un Mac Intel. La lettura usa la libreria `systeminformation`; due letture a meno di 3 secondi danno lo stesso risultato. Su Windows una lettura può durare un paio di secondi.

## Esempi

### 1. Un pannello del computer

```
[os (info di sistema): ogni 5 s] carico CPU (%)    ──▶ valore [Indicatore: gauge1]
                                 memoria usata (%) ──▶ valore [Barra di avanzamento: progress1]
                                 temperatura (°C)  ──▶ valore [Valore: value1]
```

### 2. Avvisare quando il Raspberry Pi scalda

```
[os (info di sistema): ogni 60 s] temperatura (°C) ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ valore [Al cambio (fronte ↑↓)] diventa vero ──▶ invia [Notify: "Raspberry Pi caldo"]
                                  [Costante · Variabile: 75]          valore ──▶ b
```

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per le informazioni di sistema. |
| La libreria systeminformation non funziona su questo computer: … | La libreria non si carica. |

## Vedi anche

- [getBattery (batteria)](hw.battery), [fsSize (dischi)](hw.disks), [networkInterfaces (interfacce di rete)](hw.network)
- [Hardware](logicstudio-hardware)
