# Lamp

`ui.lamp` · Text and values · [Standard UI components](logicstudio-ui) · version 1

A dot that turns on and off, like the lamp of an electrical panel, with a text next to it. When on, it takes a color and lights up; when off, it is gray.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text next to the lamp, in bold. |
| **Color** | green, red, yellow, blue | green | The color of the lamp when on. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **on** (`on`) | yes/no | Turns the lamp on or off. |
| **color** (`color`) | text | Changes the color: `green`, `red`, `yellow` or `blue` (the English names). |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

When opened the lamp is **off**, whatever the properties say: it turns on only when a value arrives on **on**.

**on** — the lamp turns on with every «full» value and turns off with the empty ones:

| Arrives | The lamp |
|---|---|
| `true`, `1`, `"sì"`, `"0"`, `"no"`, any non-empty text | on |
| `false`, `0`, `""`, `null` | off |
| the text `"false"` | off |

> Beware: the **text** `"0"` and the text `"no"` turn it **on**. If the value comes from a file or from a text, first pass it through [Type cast](core.convert) **To** yes/no.

**color** — the name of one of the four colors, **in English**: `green`, `red`, `yellow`, `blue`. Changing the color neither turns the lamp on nor off. With a different name (for example `rosso` or `#ff0000`) the lamp stays gray when on, without light: it looks off.

## Examples

### 1. Temperature alarm

```
Window «Fridge»
└ Column (root)
  ├ Value  value1  Label «Temperature:»  Unit «°C»
  └ Lamp   lamp1   Label «Too hot»  Color red
```

```
[readFile: ~/fridge.txt] content ──▶ value [Type cast: number] result ──▶ a [Compare (== != < >): a > b] result ──▶ on [Lamp: Too hot]
[Constant · Variable: 8] value ──▶ b [Compare (== != < >)]
```

At 9 degrees the red lamp turns on; at 6 it turns off.

### 2. A three-state lamp

A lamp that is always on and changes color: green if all is well, yellow if there is a warning, red if there is an error.

```
Window «Service»
└ Column (root)
  └ Lamp  lamp1  Label «Service status»
```

Add to the [Switch · Case](core.switch) block the outputs **ok**, **warning**, **error**:

```
[Constant · Variable: yes] value ──▶ on [Lamp: Service status]
[Interval (setInterval): 30 s] pulse ──▶ read [readFile: ~/status.txt] content ──▶ text [String functions: trim spaces] result ──▶ value [Switch · Case]
[Switch · Case] ok      ──▶ send [Constant · Variable: green]  value ──▶ color [Lamp: Service status]
        warning ──▶ send [Constant · Variable: yellow] value ──▶ color
        error   ──▶ send [Constant · Variable: red]    value ──▶ color
```

The file `status.txt` contains one word: `ok`, `warning` or `error`. The first [Constant · Variable](core.value) block (type yes/no, nothing on **send**) turns the lamp on at the start; the other three (type text) have the **send** input linked (show it with the eye next to the port, in the Properties), so they send the color only when needed. Until the file is read, the lamp is on in its color from the Properties.

## Accessibility

The state of the lamp is seen **only from the color**: a screen reader reads the label but does not know whether the lamp is on or off, and whoever cannot tell colors apart may not see it. If the state is important, put next to the lamp a [Value](ui.value) or a [Label](ui.label) that says it in words.

## See also

- [Value](ui.value), [Gauge](ui.gauge)
- [Compare (== != < >)](core.compare), [Switch · Case](core.switch)
- [Standard UI components](logicstudio-ui)
