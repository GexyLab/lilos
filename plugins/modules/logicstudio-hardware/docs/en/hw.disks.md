# fsSize (disks)

`hw.disks` · Hardware · [Hardware](logicstudio-hardware) · version 1

The disks of the computer where lilOS runs: for each one the total, used and free space. Useful to know when a disk fills up (it is not the space of your home, which has its own quota).

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Reads now. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **disks** (`disks`) | list | One disk per item: `{ mount, fs, type, size, used, free, percent }`. |
| **fullest (%)** (`fullest`) | number | The percentage used of the fullest disk. |
| **Exception** (`error`) | object | Missing permission, library that does not load. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Read by itself every (seconds, 0 = never)** (`seconds`) | from 0 to 86400 | 0 | |

## How it works

`mount` is where the disk is seen (`C:`, `/`, `/mnt/dati`), `fs` the device, `type` the type (NTFS, ext4…); `size`, `used` and `free` are in bytes, `percent` from 0 to 100. USB sticks and network disks mounted in the system are there too.

## Examples

### 1. A table

```
[Button: Refresh] pressed ──▶ read [fsSize (disks)] disks ──▶ rows [Table: table1]
```

### 2. A warning

```
[fsSize (disks): every 600 s] fullest (%) ──▶ a [Compare (== != < >): a > b] result ──▶ value [On change (edge)] becomes true ──▶ send [Notify: "Disk almost full"]
                              [Constant · Variable: 90]  value ──▶ b
```

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the system information and the printers: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the system information. |
| La libreria systeminformation non funziona su questo computer: … ("The systeminformation library does not work on this computer: …") | The library does not load. |

## See also

- [os (system info)](hw.systemInfo)
- [Hardware](logicstudio-hardware)
