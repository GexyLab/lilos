# os (system info)

`hw.systemInfo` · Hardware · [Hardware](logicstudio-hardware) · version 1

The information about the computer where lilOS runs: the processor and how hard it works, the memory, how long it has been on, the temperatures when the system gives them.

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Reads now. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **info** (`info`) | object | Everything (see below). |
| **CPU load (%)** (`cpu`) | number | How hard the processor works, from 0 to 100. |
| **memory used (%)** (`memory`) | number | The memory used, from 0 to 100. |
| **temperature (°C)** (`temperature`) | number | The temperature of the processor, or `null` if the system does not give it. |
| **on for (seconds)** (`uptime`) | number | How long the computer has been on. Hidden. |
| **Exception** (`error`) | object | Missing permission, library that does not load. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Read by itself every (seconds, 0 = never)** (`seconds`) | from 0 to 86400 | 0 | With a number, the block reads by itself and sends the outputs now and then. |

## How it works

The **info** object:

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

The memory is in bytes. The temperatures: on Linux and on a Raspberry Pi almost always; on Windows only if the system gives them (often not: then `null`); on macOS with an Intel Mac. The reading uses the `systeminformation` library; two readings less than 3 seconds apart give the same result. On Windows a reading can take a couple of seconds.

## Examples

### 1. A panel of the computer

```
[os (system info): every 5 s] CPU load (%)      ──▶ value [Gauge: gauge1]
                              memory used (%)   ──▶ value [Progress bar: progress1]
                              temperature (°C)  ──▶ value [Value: value1]
```

### 2. Warning when the Raspberry Pi gets hot

```
[os (system info): every 60 s] temperature (°C) ──▶ a [Compare (== != < >): a > b] result ──▶ value [On change (edge)] becomes true ──▶ send [Notify: "Raspberry Pi hot"]
                               [Constant · Variable: 75]          value ──▶ b
```

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the system information and the printers: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the system information. |
| La libreria systeminformation non funziona su questo computer: … ("The systeminformation library does not work on this computer: …") | The library does not load. |

## See also

- [getBattery (battery)](hw.battery), [fsSize (disks)](hw.disks), [networkInterfaces (network)](hw.network)
- [Hardware](logicstudio-hardware)
