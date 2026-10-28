# @lilos/sdk

I mattoni di base di lilOS: utilità, eventi, salvataggio, preferenze, componenti dell'interfaccia e finestre. Li usano sia il sistema (scrivania, desktop, barra) sia le app.

L'SDK cresce man mano: ogni struttura di base nuova nasce qui, non in `src/`.

## Uso

```js
import '@lilos/sdk/styles.css';            // una volta, prima degli altri fogli di stile
import { h, icon, openMenu, bus } from '@lilos/sdk';
```

Importa **solo** da `@lilos/sdk`, mai dai file interni (`sdk/core/dom.js`…): l'organizzazione interna può cambiare, il punto d'ingresso no.

Nel repository il nome `@lilos/sdk` è collegato alla cartella `sdk/` da `vite.config.js` (per la build) e da `jsconfig.json` (per l'editor).

### Esempio: una scorciatoia da tastiera

```js
import { shortcuts } from '@lilos/sdk';

shortcuts.register({
  id: 'notes.new', label: 'Nuova nota', group: 'Note',
  keys: ['Ctrl+Alt+N'],
  when: () => notesWindowIsActive,   // facoltativo
  run: () => createNote(),
});
// Compare da solo in Impostazioni → Usabilità → Scorciatoie, dove l'utente può cambiarla.
```

### Esempio: una finestra con controlli scelti

```js
import { Window } from '@lilos/sdk';

const win = new Window({
  title: 'Calcolatrice', icon: 'grid', width: 280, height: 360,
  controls: { maximize: false },   // riduci e chiudi sì, ingrandisci no
  resizable: false,                // dimensione fissa
});
win.setControl('close', false);     // si possono cambiare anche dopo
win.setResizable(['e', 'w']);       // solo in larghezza
```

### Esempio: una finestra di impostazioni

Ogni finestra che modifica impostazioni parte da `SettingsWindow`: tab principali in verticale a sinistra, contenuto al centro, tab secondari orizzontali facoltativi.

```js
import { SettingsWindow, settings, toggle } from '@lilos/sdk';

const win = new SettingsWindow({
  title: 'Impostazioni',
  icon: 'gear',
  tabs: [
    { group: 'Sistema' },
    {
      id: 'desk', label: 'Scrivania', icon: 'grid', description: 'Comportamento della scrivania.',
      sections: () => [{
        title: 'Elementi',
        rows: [{
          label: 'Allinea alla griglia',
          control: toggle({ value: settings.get('snap'), onChange: v => settings.set('snap', v) }),
        }],
      }],
    },
  ],
});
// Nel sistema la finestra si apre con il gestore delle finestre: wm.open(win)
```

## Contenuto

| Export | Modulo | A cosa serve |
| --- | --- | --- |
| `h`, `svg` | core/dom.js | Creare elementi DOM e icone SVG |
| `isEditing`, `trackDrag` | core/dom.js | Scorciatoie che non disturbano chi scrive; trascinamenti |
| `Emitter`, `bus` | core/events.js | Eventi di un componente; bus di sistema |
| `storage`, `uid` | core/storage.js | Salvataggio JSON nel browser; identificatori |
| `session`, `initials` | core/session.js | Utente e lingua correnti |
| `settings` | core/settings.js | Preferenze dell'utente, con valori predefiniti e tipi controllati |
| `fs` | core/fs.js | File system virtuale: cartelle, file e collegamenti alle app, salvati e validati; contenuto dei file con `read` / `write` (IndexedDB) |
| `splitName`, `fileType`, `fileTypeList` | core/fileTypes.js | Nome ed estensione; tipo, colore ed etichetta di un file; elenco dei tipi conosciuti |
| `shortcuts`, `comboFromEvent` | core/shortcuts.js | Scorciatoie da tastiera: comandi, combinazioni modificabili dall'utente, esecuzione |
| `icon`, `logo` | ui/icons.js | Simboli dell'interfaccia e logo |
| `openMenu`, `closeMenu` | ui/ContextMenu.js | Menu a comparsa |
| `avatar` | ui/avatar.js | Iniziali dell'utente |
| `appIcon` | ui/appIcon.js | Riquadro colorato con il simbolo di un'app |
| `toggle`, `selectField`, `segmented`, `swatches`, `slider`, `textField`, `actionButton` | ui/controls.js | Controlli dei moduli |
| `shortcutField` | ui/shortcutField.js | Editor delle combinazioni di un comando (per le impostazioni) |
| `selectionGesture` | ui/selectionGesture.js | Selezione trascinando: rettangolo o percorso libero |
| `Window`, `WINDOW_EDGES` | ui/Window.js | Cornice di una finestra: barra del titolo, controlli e bordi di ridimensionamento attivabili uno per uno, contenuto |
| `SettingsView` | ui/SettingsView.js | Impaginazione a tab delle impostazioni |
| `SettingsWindow` | ui/SettingsWindow.js | Base di ogni finestra di impostazioni: `Window` + `SettingsView` |
| `SDK_VERSION` | package.json | Versione dell'SDK |

Stili (`@lilos/sdk/styles.css`):

| File | Contenuto |
| --- | --- |
| `tokens.css` | Colori, raggi, ombre, font |
| `base.css` | Reset, `.ico`, `.logo`, movimento ridotto |
| `components.css` | `.app-icon`, `.avatar`, `.menu`, `.sel-overlay` |
| `controls.css` | Controlli dei moduli e editor delle scorciatoie (`.ctl-*`) |
| `window.css` | Cornice delle finestre (`.window`, `.win-*`) |
| `settings.css` | Impaginazione delle impostazioni (`.settings`, `.st-*`) |

Il colore principale è uno solo, `--accent`: le varianti (`--accent-soft`, `--accent-strong`, `--accent-tint`) ne derivano con `color-mix`. Cambiando `--accent` cambia tutta l'interfaccia.

Le animazioni si spengono con `data-motion="off"` sull'elemento `<html>`, oppure quando il sistema operativo chiede movimento ridotto.

Firme, parametri ed esempi: [riferimento API](../doc/sviluppatore/api.md).

## Regole

1. **L'SDK non importa mai da `src/`.** Dipende solo da sé stesso e dal browser. Il sistema dipende dall'SDK, mai il contrario.
2. **Ogni export pubblico passa da `index.js`.** Aggiungere un export è una modifica compatibile; toglierlo o cambiarne la firma no.
3. **Ogni componente con uno stile porta il suo CSS** in `sdk/styles/` e lo importa da `styles/index.css`. Usa i token, non valori fissi.
4. **Niente dipendenze esterne** senza una decisione registrata in [Decisioni](../doc/interna/decisioni.md).
5. **I componenti mostrano e segnalano, il sistema decide.** Per esempio `Window` emette `close`, ma è il gestore delle finestre a chiuderla.
6. **Documentazione insieme al codice**: un export nuovo o cambiato aggiorna questa tabella, il [riferimento API](../doc/sviluppatore/api.md) e la versione in `package.json`.

## Versione

`0.2.1`. Finché la versione è `0.x` l'API può cambiare: ogni modifica incompatibile alza la versione minore e va annotata qui sotto.

### Modifiche

- **0.2.1**: contenuto dei file. `fs.read(id)` e `fs.write(id, text)` (IndexedDB, con ripiego in memoria), dimensione reale dei file; `Window.canClose` per chiedere conferma prima della chiusura; `fileTypeList()`; simbolo `save`.
- **0.2.0** (incompatibile): finestre ridimensionabili da tutti i bordi e gli angoli; controlli e bordi attivabili singolarmente. `Window` accetta `controls`, `resizable` come elenco di bordi, `maxWidth`/`maxHeight`, `closable`; nuovi `setControl`, `setControls`, `setResizable`, `constrain`, getter `controls` e `resizable` (ora un elenco), evento `controls`, export `WINDOW_EDGES`. **Tolti**: `grip` (al suo posto `.win-edge[data-edge]`) e le proprietà `maximizable`/`resizable` booleane (usa `controls.maximize` e `resizable.length`). La finestra non ritaglia più il contenuto: lo fanno barra del titolo e corpo.
- **0.1.3**: file system e selezione. Nuovi export `fs`, `splitName`, `fileType` (spostati da `src/desktop/fileTypes.js`), `selectionGesture`. `Window` ha `active` e la convenzione dell'evento `launch`. Nuovi simboli `arrowLeft`, `arrowRight`, `arrowUp`, `list`, `home`, `download`, `monitor`, `lasso`.
- **0.1.2**: scorciatoie da tastiera. Nuovi export `shortcuts`, `comboFromEvent`, `shortcutField`. Nuovi simboli `keyboard`, `accessibility`.
- **0.1.1**: finestre e impostazioni. Nuovi export `Window`, `SettingsView`, `SettingsWindow`, controlli dei moduli, `settings`, `SDK_VERSION`. Nuovi simboli `info`, `max`, `palette`, `disk`, `user`, `window`. Colore principale derivato da `--accent`, regole per il movimento ridotto.
- **0.1.0**: prima versione, estratta da `src/core`, `src/ui` e `src/apps/appIcon.js`.

## Cosa arriverà

- Finestre di dialogo (conferme, avvisi) costruite su `Window`.
- Un contesto per le app (finestra, argomenti, accesso ai file) passato alla funzione che crea l'app.
