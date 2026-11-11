# networkInterfaces (network)

`hw.network` · Hardware · [Hardware](logicstudio-hardware) · version 1

The network interfaces of the computer where lilOS runs (cable, Wi-Fi, VPN): IP and MAC addresses, whether they are connected; it warns when they change, for example when the computer changes network.

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Reads now and sends the outputs. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **interfaces** (`interfaces`) | list | One interface per item (see below). |
| **IP (main interface)** (`ip`) | text | The IPv4 address of the main interface (the one of the default route), empty without a network. |
| **changed** (`changed`) | pulse | The interfaces have changed since the previous reading. |
| **Exception** (`error`) | object | Missing permission, library that does not load. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Read by itself every (seconds, 0 = never)** (`seconds`) | from 0 to 86400 | 0 | With a number, the block reads by itself and sends the outputs only when something changes. |
| **Internal ones too (loopback)** (`internal`) | yes/no | no | |

## How it works

Each interface: `{ name, label, ip4, ip6, mac, internal, up, type, speed, default }`. `up` tells whether it is connected, `type` is `wired` or `wireless` when the system knows, `speed` in Mbit/s, `default` is `true` for the main one.

The interfaces "change" when a name, an IPv4 or IPv6 address, or the connected/disconnected state changes.

## Examples

### 1. Showing the address

```
[On start (main)] pulse ──▶ read [networkInterfaces (network)] IP (main interface) ──▶ text [Label: label1]
```

### 2. Warning when the network changes

```
[networkInterfaces (network): every 30 s] changed ──▶ send [Notify: "The network has changed"]
                                          IP (main interface) ──▶ value [Print (console.log)]
```

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the system information and the printers: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the system information. |
| La libreria systeminformation non funziona su questo computer: … ("The systeminformation library does not work on this computer: …") | The library does not load. |

## See also

- [os (system info)](hw.systemInfo)
- [Network blocks](logicstudio-net)
- [Hardware](logicstudio-hardware)
