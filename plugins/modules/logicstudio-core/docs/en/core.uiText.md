# Styled text

`core.uiText` · Drawing · [Core blocks](logicstudio-core) · version 1

A text in a window, with the size, colour and style you want: a big title, a red warning, a multi-line note. Unlike the [Label](ui.label), which has three fixed sizes, here you choose everything; a schema can change the text and the colour while the program runs.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Text** | multi-line text (translatable) | «Testo» | What is seen when it opens. Line breaks are kept. |
| **Size (px)** | 8 to 96 | 14 | |
| **Colour** | a colour, or empty | empty | Empty: the text colour of the theme. |
| **Background** | a colour, or empty | empty | A coloured box behind the text. |
| **Bold**, **Italic**, **Underlined** | yes/no | no | |
| **Alignment** | left, centre, right | left | Within the width of the component. |
| **Width (px)** | 0 to 4000 | 0 | 0: all there is (in a Column, the width of the column). |

Colours are written `#rrggbb`, `#rrggbbaa`, `rgb()`, `hsl()` or with a name (`red`); anything that is not a colour is ignored. The text is always shown as text, never as HTML.

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | Replaces the text shown. |
| **colour** (`color`) | text | A new colour for the text; a value that is not a colour goes back to the theme's. |
| **enabled** (`enabled`) | yes/no | `false` makes it fainter. |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; nothing passes through it for this component. |

## Examples

### 1. A coloured state

```
[Compare (== != < >): a > b] if true  ──▶ send [Constant · Variable: "red"]   value ──▶ colour [Styled text: state]
[Compare (== != < >): a > b] if false ──▶ send [Constant · Variable: "green"] value ──▶ colour [Styled text: state]
[Template string: "Temperature {t} °C"] text ──▶ text [Styled text: state]
```

The [Compare](core.compare) receives the temperature on **a** and the threshold on **b**; the two [Constant · Variable](core.value) blocks are of kind text, with **send** shown and linked. The text shows the temperature and turns red when it exceeds the threshold, green when it goes back under.

### 2. A title

Properties: Text «Impianto 3», Size 24, Bold, Alignment centre. No object is needed in the schema: the text stays as it is.

## See also

- [Label](ui.label) and [Value](ui.value) of the [Standard UI components](logicstudio-ui)
- [Shape](core.uiShape)
- [Text · Comment](core.drawText), for writing on schemas
- [The object of a component](ide/components)
