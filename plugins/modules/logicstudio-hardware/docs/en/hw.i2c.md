# I²C (i2cget · i2cset)

`hw.i2c` · Hardware · [Hardware](logicstudio-hardware) · version 1

Reads and writes the registers of an I²C device connected to a Linux board, like a Raspberry Pi: temperature, pressure and light sensors, analog-to-digital converters, port expanders, displays. It also looks for the devices present on the bus. **Linux only.**

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Reads the register (or scans the bus, with **«read» scans the bus (i2cdetect)**). |
| **write** (`write`) | any | Writes into the register: a number (byte or word) or a list of bytes (block). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The byte or word read (with a block, the first byte). |
| **bytes** (`data`) | list | The bytes read (a word: low byte first). |
| **done** (`done`) | pulse | The operation succeeded. |
| **addresses found** (`addresses`) | list | (Bus scan) The addresses that answer, as numbers. Hidden. |
| **Exception** (`error`) | object | It is not Linux, the programs are missing, the device does not answer… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Bus (/dev/i2c-N)** (`bus`) | from 0 to 255 | 1 | The bus: on the Raspberry Pi pins 3 and 5 are bus 1. |
| **Device address (0x03-0x77)** (`address`) | `0x48` or `72` | `0x48` | The 7-bit address. |
| **Register** (`register`) | `0x00`…`0xff` | `0x00` | |
| **Size** (`size`) | Byte, Word (16 bit), Block (bytes) | Byte | |
| **Bytes to read** (`length`) | from 1 to 32 | 2 | With Block. |
| **«read» scans the bus (i2cdetect)** (`scan`) | yes/no | no | **read** looks for the devices instead of reading a register. |

## How it works

The kernel uses the programs of **i2c-tools** (`sudo apt install i2c-tools`): `i2cget` and `i2cset` for bytes and words, `i2ctransfer` for blocks (it first writes the register, then reads), `i2cdetect` to scan. Never a shell: only checked numbers.

- A **word** is read and written as the SMBus device gives it (low byte first): some sensors want it swapped.
- A **block** is written by sending on **write** a list of 1 to 32 bytes; it is read with **Bytes to read**.
- **Bus scan** tries all the addresses: some devices do not like to be "touched" like that. The addresses used by a driver of the system appear too.

**Careful:** writing into the wrong register can change the configuration of a device or damage an EEPROM memory. Try first with **Test**, reading.

On a Raspberry Pi I²C must be turned on (`sudo raspi-config` → Interface Options → I2C) and the user that runs lilOS must be in the `i2c` group.

## Examples

### 1. The temperature of a TMP102

The TMP102 at address `0x48` keeps the temperature in register `0x00`, in 2 bytes (12 bits, 0.0625 °C per step).

```
[Interval (setInterval): 5 s] pulse ──▶ read [I²C (i2cget · i2cset): bus 1, 0x48, register 0x00, Block, 2 bytes] bytes ──▶ value [Print (console.log)]
```

The console writes for example `[23, 64]`: (23 × 16 + 64 / 16) × 0.0625 = 23.25 °C (with the [Math functions](core.math) blocks for the calculation).

### 2. What is on the bus

```
[On start (main)] pulse ──▶ read [I²C (i2cget · i2cset): bus 1, «read» scans the bus] addresses found ──▶ value [Print (console.log)]
```

The console writes for example `[72, 118]` (that is `0x48` and `0x76`).

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare GPIO e I²C: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use GPIO and I²C: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for GPIO and I²C. |
| GPIO e I²C ci sono solo su Linux (per esempio un Raspberry Pi) ("GPIO and I²C exist only on Linux (for example a Raspberry Pi)") | The lilOS computer is not Linux. |
| Manca il comando i2cget: installa i2c-tools (sudo apt install i2c-tools) ("The i2cget command is missing: install i2c-tools (sudo apt install i2c-tools)") | i2c-tools is not there (the same for the other commands). |
| Indirizzo I²C non valido: … (da 3 a 119) ("I²C address not valid: … (from 3 to 119)") | The address is outside 0x03-0x77. |
| Registro non valido: … (da 0 a 255) ("Register not valid: … (from 0 to 255)") | The same for **Bus** and the values to write. |
| I²C 0x48 non risponde: … ("I²C 0x48 does not answer: …") | The device is not there or does not answer at that address. |
| I²C 0x48 non accetta la scrittura: … ("I²C 0x48 does not accept the writing: …") | The writing did not succeed. |
| Dati I²C non validi: da 1 a 32 byte (numeri da 0 a 255) ("I²C data not valid: from 1 to 32 bytes (numbers from 0 to 255)") | The list to write is not right. |
| Risposta di i2c non capita: … ("Answer of i2c not understood: …") | The program answered in an unexpected way. |

## See also

- [GPIO (gpioget · gpioset)](hw.gpio)
- [Hardware](logicstudio-hardware)
