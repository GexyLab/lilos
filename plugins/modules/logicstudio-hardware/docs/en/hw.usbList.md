# usb.getDevices (USB devices)

`hw.usbList` · Hardware · [Hardware](logicstudio-hardware) · version 1

Lists the USB devices plugged into the computer where lilOS runs, with VID, PID, name, manufacturer and class. It is useful to know whether a device is there and to find the numbers to write in the other USB and HID blocks.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | pulse | Reads the list now and sends it. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **devices** (`devices`) | list | One device per item (see below). |
| **count** (`count`) | number | How many there are (after the filter). |
| **Exception** (`error`) | object | Missing permission, library that does not load. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Only VID (hex, e.g. 2341)** (`vendorId`) | 4 hex digits | empty | Keeps only the devices of that manufacturer. |
| **Only PID (hex, e.g. 2341)** (`productId`) | 4 hex digits | empty | Keeps only that product. |

## How it works

Each device is an object:

| Field | Example | What it is |
|---|---|---|
| `vendorId`, `productId` | `2341`, `0043` | VID and PID in hexadecimal, 4 lowercase digits. |
| `name`, `manufacturer` | `Arduino Uno`, `Arduino LLC` | Name and manufacturer, when the system gives them (empty otherwise). |
| `serialNumber` | `95735353` | The serial number, when there is one. |
| `class`, `className` | `2`, `comunicazione (CDC)` | The USB class (the one of the first interface, if the device leaves it to the interfaces). |
| `interfaces` | `[2, 10]` | The classes of its interfaces. |
| `bus`, `address`, `speed` | `1`, `5`, `full` | Where it is plugged and at what speed. |

Some fields may stay empty: on Windows the system does not always give names and serial numbers of the devices it uses (hubs, webcams, Bluetooth).

## Examples

### 1. Is the Arduino there?

```
[On start (main)] pulse ──▶ list [usb.getDevices (USB devices): only VID 2341] count ──▶ a [Compare (== != < >): a > b] result ──▶ on [Lamp: lamp1]
                                                                                [Constant · Variable: 0] value ──▶ b
```

The [Lamp](ui.lamp) turns on if at start there is at least one Arduino device (VID `2341`).

### 2. A table of the devices

```
[Button: Refresh] pressed ──▶ list [usb.getDevices (USB devices)] devices ──▶ rows [Table: table1]
```

With the **Columns** of the [Table](ui.table) `vendorId, productId, name, className` the window shows what is plugged in.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare i dispositivi USB: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the USB devices: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the USB devices. |
| La libreria usb non funziona su questo computer: … ("The usb library does not work on this computer: …") | The library does not load. |

## See also

- [usb.on attach · detach (USB plugged · unplugged)](hw.usbHotplug), [transferIn · transferOut (USB transfer)](hw.usbTransfer), [HID device (node-hid)](hw.hid)
- [SerialPort.list (serial ports)](hw.serialList), for the USB-serial adapters
- [Hardware](logicstudio-hardware)
