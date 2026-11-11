# Testo · Commento (// nota)

`core.drawText` · Disegno · [Blocchi di base](logicstudio-core) · versione 1

Un testo scritto sul foglio dello schema: un titolo per una zona, una spiegazione accanto a un gruppo di blocchi, un promemoria. È come un commento `// nota` nel codice: **il programma non lo esegue**, serve solo a chi legge lo schema.

## Ingressi e uscite

Nessuno. Un testo non ha porte, nemmeno l'**Exception**, e non si collega a niente.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Testo** (`text`) | testo su più righe, fino a 2000 caratteri | «Testo» | Quello che si legge. Gli a capo restano. |
| **Dimensione (px)** (`size`) | da 8 a 96 | 14 | La grandezza delle lettere. |
| **Colore** (`color`) | un colore, o vuoto | vuoto | Vuoto: il colore del testo del tema (chiaro o scuro). |
| **Sfondo** (`background`) | un colore, o vuoto | vuoto | Un riquadro colorato dietro il testo; vuoto: nessuno. |
| **Grassetto**, **Corsivo**, **Sottolineato** | sì/no | no | Lo stile delle lettere. |
| **Allineamento** (`align`) | a sinistra, al centro, a destra | a sinistra | Dove vanno le righe più corte, dentro la larghezza del testo. |
| **Larghezza (px)** (`w`) | da 0 a 4000 | 0 | 0: il testo è largo quanto la sua riga più lunga. Un numero: le righe più lunghe vanno a capo a quella larghezza. |

Un **colore** si sceglie con il quadratino accanto al campo o si scrive: `#e8743b`, `#e8743b80` (con trasparenza), `rgb(232 116 59)`, `hsl(20 80% 57%)` o un nome come `orange`. Quello che non è un colore viene ignorato e resta il colore del tema.

## Come funziona

- Si prende dalla scheda **Blocchi**, categoria **Disegno**, come gli altri blocchi.
- **Doppio clic** sul testo per scriverlo lì sul foglio: **Ctrl Invio** o un clic altrove lo tiene, **Esc** lo lascia com'era. Anche dal tasto destro, **Scrivi il testo**.
- Selezionato, ha un quadratino nell'angolo in basso a destra: trascinandolo cambia la **Larghezza** (a passi di 10 px; con **Alt** premuto, libera). **Ctrl Z** la riporta com'era.
- Si sposta, si seleziona con il rettangolo, si duplica (**Ctrl D**), si allinea e si cancella (**Canc**) come un blocco. Può stare in un [gruppo](ide/groups): si muove con il gruppo e non cambia niente di come il gruppo gira.
- Sta **sotto** i collegamenti e i blocchi, così non copre mai una porta.
- Non ha l'**Etichetta**: il suo testo è già quello che si legge.
- Conta come un blocco per il limite **Blocchi per schema** del motore (200 di serie); il programma lo salta e non spende tempo per lui.

## Esempi

### 1. Il titolo di una zona

```
Testo: "Lettura dei sensori"  (Dimensione 18, Grassetto, Colore #58a6ff)

[Intervallo (setInterval): 5 s] impulso ──▶ invia [Richiesta web] …
```

Metti il testo sopra i blocchi che leggono i sensori e una [Forma](core.drawShape) **Rettangolo arrotondato** con un riempimento leggero intorno a tutti: chi apre lo schema vede subito cosa fa quella parte.

### 2. Una nota su più righe

```
Testo: "Attenzione:
il valore arriva in °C,
la finestra lo mostra in °F"  (Corsivo, Sfondo #f0b42933, Larghezza 220)
```

Accanto a un blocco di [Grandezze e unità](logicstudio-units), lo sfondo giallo chiaro lo fa sembrare un foglietto adesivo.

## Errori

Nessuno: il testo non fa niente mentre il programma gira.

## Vedi anche

- [Forma](core.drawShape), per rettangoli, cerchi, linee e frecce sullo schema
- [Testo formattato](core.uiText), lo stesso testo dentro una finestra
- [Gli schemi](ide/schemas) e [I gruppi](ide/groups)
