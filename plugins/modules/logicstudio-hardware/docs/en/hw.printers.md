# Printers · Print (lp)

`hw.printers` · Hardware · [Hardware](logicstudio-hardware) · version 1

Lists the printers of the computer where lilOS runs and prints a file of your home: a text, a PDF, a photo.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | pulse | Sends the list of the printers. |
| **print** (`print`) | pulse | Prints the file. |
| **path** (`path`) | text | The file: it takes the place of **File**. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **printers** (`printers`) | list | One printer per item: `{ name, status, default, local, shared }`. |
| **sent to the printer** (`printed`) | pulse | The file has been sent to the printer. |
| **Exception** (`error`) | object | The printer is not there, the file is not there or cannot be printed… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Printer (name; empty: the default one)** (`printer`) | text | empty | The exact name, as in the list. |
| **File (.txt, .pdf, .png, .jpg…)** (`path`) | text | `~/stampa.txt` | The file, in your home. |

## How it works

The kernel reads the file **as you** from your home (at most 20 MB), copies it into a temporary file of its own and sends it to the printer:

| System | Files | How |
|---|---|---|
| Linux, macOS | `.txt`, `.csv`, `.log`, `.md`, `.json`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp` | CUPS (`lp` command) |
| Windows | texts (`.txt`, `.csv`, `.log`, `.md`, `.json`) and images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`); **not PDFs** | texts with Out-Printer, images fitted to the page |

Only these types of files are printed: never a file that an application would open or run. **sent to the printer** means that the printer (or its queue) has taken the file, not that the sheet has come out.

The "printers" that save to PDF (Microsoft Print to PDF, PDFCreator) appear too, but they can open a window on the computer asking where to save: for an active program choose a real printer.

## Examples

### 1. Printing a report

```
[Button: Print] pressed ──▶ print [Printers · Print (lp): ~/rapporti/oggi.txt] sent to the printer ──▶ send [Notify: "Report being printed"]
```

### 2. Choosing the printer

```
[On start (main)] pulse ──▶ list [Printers · Print (lp)] printers ──▶ rows [Table: table1]
```

The name is read in the `name` column; write it in **Printer**.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the system information and the printers: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the printers. |
| Si stampano solo file txt, csv, log, md, json, pdf, png, jpg, jpeg, gif, bmp: «~/x.docx» no ("Only txt, csv, log, md, json, pdf, png, jpg, jpeg, gif, bmp files are printed: «~/x.docx» is not") | The type of file is not printed. |
| Su Windows i PDF non si stampano da Logic Studio: stampa un'immagine o un testo ("On Windows PDFs are not printed from Logic Studio: print an image or a text") | A PDF on Windows. |
| La stampante «Ufficio» non c'è ("The printer «Ufficio» is not there") | The name is not in the list. |
| Non c'è una stampante predefinita: scegline una ("There is no default printer: choose one") | **Printer** is empty and the system has no default one. |
| Il file «~/stampa.txt» non esiste ("The file «~/stampa.txt» does not exist") | The file is not there. The other path errors are those of [readFile](lilos.fileRead). |
| Il file «~/x.pdf» è troppo grande: 25 MB (si leggono al massimo 20 MB) ("The file «~/x.pdf» is too big: 25 MB (at most 20 MB are read)") | Over 20 MB. |
| Manca il comando lp (CUPS): installa cups-client ("The lp command (CUPS) is missing: install cups-client") | Linux without CUPS. |
| La stampa non è partita: … ("The printing did not start: …") | The printer or the system refused the file. |

## See also

- [writeFile](lilos.fileWrite), to prepare the text to print
- [Hardware](logicstudio-hardware)
