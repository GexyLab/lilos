# SerialPort.list (serial ports)

`hw.serialList` · Hardware · [Hardware](logicstudio-hardware) · version 1

Lists the serial ports of the computer where lilOS runs: the real ones, those of USB adapters (Arduino, USB-serial converters, modems) and the Bluetooth ones already paired with the system. It can also watch them and warn when they change, for example when you plug in an Arduino.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | pulse | Reads the list now and sends it. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **ports** (`ports`) | list | One port per item: `{ path, manufacturer, vendorId, productId, serialNumber, name }` (see below). |
| **paths** (`paths`) | list | Only the paths, for example `["COM3", "COM9"]`: ready for a [Selection](ui.select). |
| **count** (`count`) | number | How many ports there are. |
| **changed** (`changed`) | pulse | (Only with **Watch**) The ports have changed since the last time. |
| **Exception** (`error`) | object | When the list cannot be read: missing permission, library that does not load. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Watch: send when they change** (`watch`) | yes/no | no | The block reads the list by itself, now and then, and sends the outputs when it changes (the first time right away). |
| **Check every (seconds)** (`seconds`) | from 1 to 3600 | 5 | How often it reads the list again. It is seen only with **Watch**. |

## How it works

The kernel asks the system for the list with the `serialport` library. Each port is an object:

| Field | Example | What it is |
|---|---|---|
| `path` | `COM3`, `/dev/ttyUSB0`, `/dev/cu.usbmodem1101` | The path, to write in the [SerialPort (COM port)](hw.serial) block. |
| `manufacturer` | `Arduino LLC` | The manufacturer, when the system knows it. |
| `vendorId`, `productId` | `2341`, `0043` | USB VID and PID in hexadecimal (4 lowercase digits); empty for a port that is not USB. |
| `serialNumber` | `95735353130351D0E1A1` | The serial number, when there is one: it tells two equal devices apart. |
| `name` | `Arduino Uno (COM3)` | The name given by the system (Windows), or an identifier. |

The list is in path order (`COM3` before `COM10`).

With **Watch** the **changed** output sends a pulse only when the list changes compared with the previous reading: one more port, one less, a different device. The first reading sends the outputs but not **changed**.

## Examples

### 1. Choosing the port from a window

```
[On start (main)] pulse ──▶ list [SerialPort.list (serial ports)] paths ──▶ options [Selection: select1] value ──▶ path [SerialPort (COM port)]
```

At start the [Selection](ui.select) of the window fills with the ports; the chosen one goes to the **path** input (hidden: show it in the Properties) of the serial port, which then opens with **open**.

### 2. Warning when an Arduino is plugged in

```
[SerialPort.list (serial ports): Watch, every 3 s] changed ──▶ send [Notify: "The serial ports have changed"]
                                                   count   ──▶ value [Print (console.log)]
```

Every time you plug or unplug a USB-serial adapter you receive a notification, and the console writes how many ports there are.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare le porte seriali: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the serial ports: ask an administrator (Control Panel → Logic Studio → Hardware)") | You are not an administrator and you do not have the permission for the serial ports. |
| La libreria serialport non funziona su questo computer: … ("The serialport library does not work on this computer: …") | The library does not load on this computer. |
| SerialPort.list (porte seriali) ha impiegato più di 30 s ("SerialPort.list (porte seriali) took more than 30 s") | The system did not answer in time. |

## See also

- [SerialPort (COM port)](hw.serial), to open a port
- [usb.on attach · detach (USB plugged · unplugged)](hw.usbHotplug), to know right away when a USB device is plugged in
- [Hardware](logicstudio-hardware)
