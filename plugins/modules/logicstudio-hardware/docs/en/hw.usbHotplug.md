# usb.on attach · detach (USB plugged · unplugged)

`hw.usbHotplug` · Hardware · [Hardware](logicstudio-hardware) · version 1

Warns when a USB device is plugged into or unplugged from the computer where lilOS runs: all of them, or only those of one VID and PID.

## Inputs

| Port | Type | Description |
|---|---|---|
| **on** (`on`) | yes/no | `true` starts watching, `false` stops. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **plugged** (`attached`) | object | The device just plugged in, as in [usb.getDevices (USB devices)](hw.usbList). |
| **unplugged** (`detached`) | object | The device just unplugged. |
| **event** (`event`) | object | Both: `{ event: "attached" \| "detached", device }`. |
| **Exception** (`error`) | object | Missing permission, library that does not load, VID or PID not valid. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Only VID (hex, e.g. 2341)** (`vendorId`) | 4 hex digits | empty | Warns only for the devices of that manufacturer. |
| **Only PID (hex, e.g. 2341)** (`productId`) | 4 hex digits | empty | Warns only for that product. |
| **Starts on its own** (`atStart`) | yes/no | yes | Starts watching when the program (or its group) starts. |

## How it works

The kernel listens to the USB bus once for all the programs that watch it, and gives each block the events it is interested in. The unplugged device is described as it was when it was plugged in; if the kernel had not seen it (it was plugged in before anybody was watching and the system does not say), some fields may be empty.

A device that restarts (for example an Arduino when you upload a new program) sends **unplugged** and then **plugged**.

## Examples

### 1. Reopening the serial port when the Arduino comes back

```
[usb.on attach · detach (USB plugged · unplugged): only VID 2341] plugged ──▶ value [Delay (setTimeout): 2 s] value ──▶ open [SerialPort (COM port): COM3]
```

When the Arduino is plugged in again, after two seconds (the time the system needs to create the port) the serial port reopens.

### 2. A log of the devices

```
[usb.on attach · detach (USB plugged · unplugged)] event ──▶ content [appendFile: ~/usb.log, JSON one per line]
```

Every plugging and unplugging ends as a JSON line in the file `~/usb.log` ([appendFile](lilos.fileAppend) block of the lilOS blocks).

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare i dispositivi USB: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the USB devices: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the USB devices. |
| VID non valido: … (scrivi 4 cifre esadecimali, come 2341) ("VID not valid: … (write 4 hex digits, like 2341)") | **Only VID** is not a 4-digit hex number (the same for the PID). |
| La libreria usb non funziona su questo computer: … ("The usb library does not work on this computer: …") | The library does not load. |
| Hai già 16 dispositivi aperti: al massimo 16 (chiudine qualcuno) ("You already have 16 open devices: at most 16 (close some)") | Every block that watches counts as an open device. |

## See also

- [usb.getDevices (USB devices)](hw.usbList)
- [SerialPort.list (serial ports)](hw.serialList), which with **Watch** warns when the serial ports change
- [Hardware](logicstudio-hardware)
