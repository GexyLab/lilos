# GPIO (gpioget · gpioset)

`hw.gpio` · Hardware · [Hardware](logicstudio-hardware) · version 1

A GPIO line of a Linux board, like a Raspberry Pi: reading a button or a sensor, turning on an LED or a relay, sensing the rising and falling edges, driving a PWM output. **Linux only.**

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | (Use Input: read) Reads the line. |
| **write** (`write`) | yes/no | (Use Output: write) `true` turns the line on, `false` turns it off. |
| **PWM duty (0-1)** (`duty`) | number | (Use PWM) The duty cycle, from 0 (off) to 1 (always on). Hidden. |
| **watch edges** (`on`) | yes/no | (Use Input: edges) `true` starts watching, `false` stops. Hidden. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | yes/no | The value read, written, or after an edge. |
| **rising edge** (`rising`) | pulse | (Edges) The line went from off to on. |
| **falling edge** (`falling`) | pulse | (Edges) The line went from on to off. |
| **Exception** (`error`) | object | It is not Linux, the programs are missing, the line is in use, the permissions are missing… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Use** (`mode`) | Input: read, Output: write, Input: edges, PWM (sysfs) | Input: read | What the block does with the line. |
| **Chip** (`chip`) | `gpiochip0`, `gpiochip4`… or the number | `gpiochip0` | The GPIO chip. On the Raspberry Pi 5 the pins of the header are on `gpiochip4` (or `gpiochip0` with recent systems). |
| **Line (offset; BCM number on a Raspberry Pi)** (`line`) | from 0 to 1023 | 17 | The number of the line in the chip: on a Raspberry Pi the "GPIO" number (BCM), not the one of the pin. |
| **Resistor** (`bias`) | As it is, Pull-up, Pull-down, None | As it is | The internal resistor for an input (a button to ground needs Pull-up). |
| **Edges** (`edge`) | Both, Rising, Falling | Both | The edges to sense. |
| **PWM chip** (`pwmChip`) | from 0 to 63 | 0 | The chip of `/sys/class/pwm/pwmchipN`. |
| **PWM channel** (`channel`) | from 0 to 63 | 0 | |
| **PWM frequency (Hz)** (`frequency`) | from 1 to 1000000 | 1000 | |
| **Starts on its own (edges)** (`atStart`) | yes/no | yes | With Input: edges, starts watching when the program starts. |

## How it works

The kernel uses the programs of **libgpiod** (`sudo apt install gpiod`, versions 1 and 2), never a shell: only checked numbers.

- **Input: read**: `gpioget` reads the line at every **read**.
- **Output: write**: at the first **write** the kernel takes the line with `gpioset` and **keeps** it at the written value until the program stops; every new value changes it. When the block stops the line is released (it usually stays at the last value, but it depends on the board).
- **Input: edges**: `gpiomon` stays listening and every edge arrives right away as a pulse (at most 1000 in the queue, if the program is not in time).
- **PWM**: writes in `/sys/class/pwm` (period, duty cycle, enable). On a Raspberry Pi it must be turned on in the configuration (`dtoverlay=pwm` or `pwm-2chan` in `config.txt`); with duty 0 the output turns off, and it also turns off when the block stops.

A line used by a block (output or edges) cannot be used by another block or program while it stays taken.

The user of the system that runs lilOS must be in the `gpio` group (for PWM the permissions on `/sys/class/pwm` are needed too, with a udev rule).

## Examples

### 1. A button that turns on an LED

The button goes from line 27 to ground, with the Pull-up resistor: it gives `false` when pressed.

```
[GPIO (gpioget · gpioset): Input: edges, line 27, Pull-up] value ──▶ value [NOT] result ──▶ write [GPIO (gpioget · gpioset): Output: write, line 17]
```

The LED on line 17 is on as long as you hold down the button on line 27.

### 2. A blinking LED

```
[Interval (setInterval): 0.5 s] pulse ──▶ read [Store (set · get)] value ──▶ value [NOT] result ──▶ write [GPIO (gpioget · gpioset): Output: write, line 17]
                                                                               result ──▶ set [Store (set · get)]
```

Every half second the value of the [Store (set · get)](core.store) is inverted with [NOT](core.not) and goes to the LED: on, off, on…

### 3. The brightness of an LED

```
[Slider: slider1 (from 0 to 1)] value ──▶ PWM duty (0-1) [GPIO (gpioget · gpioset): PWM, chip 0, channel 0, 1000 Hz]
```

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare GPIO e I²C: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use GPIO and I²C: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for GPIO and I²C. |
| GPIO e I²C ci sono solo su Linux (per esempio un Raspberry Pi) ("GPIO and I²C exist only on Linux (for example a Raspberry Pi)") | The lilOS computer is not Linux. |
| Manca il comando gpioget: installa gpiod (sudo apt install gpiod) ("The gpioget command is missing: install gpiod (sudo apt install gpiod)") | libgpiod is not there (the same for gpioset and gpiomon). |
| Chip GPIO non valido: … (scrivi gpiochip0 oppure 0) ("GPIO chip not valid: … (write gpiochip0 or 0)") | Wrong **Chip**. |
| Linea GPIO non valido: … (da 0 a 1023) ("GPIO line not valid: … (from 0 to 1023)") | Wrong **Line**. |
| GPIO 17 non si legge: … ("GPIO 17 cannot be read: …") | `gpioget` gave an error (line in use, permissions…). |
| gpioset non ha impostato la linea 17: … ("gpioset did not set line 17: …") | The line is used by another program of the system, or the permissions are missing. |
| «GPIO gpiochip0/17» è già in uso nel programma «Serra»: chiudilo prima di aprirlo di nuovo ("«GPIO gpiochip0/17» is already in use in the program «Serra»: close it before opening it again") | The line is taken by another block or program of yours. |
| gpiomon si è fermato: … ("gpiomon stopped: …") | The watching of the edges was interrupted. |
| Non c'è PWM: /sys/class/pwm/pwmchip0 manca (attivalo nella configurazione della scheda, per esempio dtoverlay=pwm) ("There is no PWM: /sys/class/pwm/pwmchip0 is missing (turn it on in the configuration of the board, for example dtoverlay=pwm)") | PWM is not on. |
| PWM 0/0: permesso negato (gruppo gpio o regole udev per /sys/class/pwm) ("PWM 0/0: permission denied (gpio group or udev rules for /sys/class/pwm)") | The permissions are missing. |
| L'ingresso «leggi» non serve nell'uso scelto (output): cambia l'uso nelle Proprietà ("The input «leggi» is not used in the chosen use (output): change the use in the Properties") | An input that does not fit the chosen **Use**. |

## See also

- [I²C (i2cget · i2cset)](hw.i2c)
- [Hardware](logicstudio-hardware)
