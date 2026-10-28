# Ricette

Procedure passo per passo per le modifiche più comuni. Per i dettagli delle funzioni vedi il [riferimento API](api.md).

- [Aggiungere un'app al menu di avvio](#aggiungere-unapp-al-menu-di-avvio)
- [Creare l'app vera e propria (una finestra)](#creare-lapp-vera-e-propria-una-finestra)
- [Far aprire dei file alla tua app](#far-aprire-dei-file-alla-tua-app)
- [Dare scorciatoie alla tua app](#dare-scorciatoie-alla-tua-app)
- [Creare una finestra di impostazioni](#creare-una-finestra-di-impostazioni)
- [Aggiungere un'impostazione di sistema](#aggiungere-unimpostazione-di-sistema)
- [Aggiungere un simbolo](#aggiungere-un-simbolo)
- [Reagire all'avvio di un'app o all'apertura di un file](#reagire-allavvio-di-unapp-o-allapertura-di-un-file)
- [Mettere un nuovo tipo di oggetto sulla scrivania](#mettere-un-nuovo-tipo-di-oggetto-sulla-scrivania)
- [Trascinare un oggetto sulla scrivania](#trascinare-un-oggetto-sulla-scrivania)
- [Aggiungere voci ai menu contestuali](#aggiungere-voci-ai-menu-contestuali)
- [Aggiungere una scorciatoia da tastiera](#aggiungere-una-scorciatoia-da-tastiera)
- [Aggiungere un tipo di file](#aggiungere-un-tipo-di-file)
- [Salvare uno stato](#salvare-uno-stato)
- [Aggiungere uno stile](#aggiungere-uno-stile)
- [Cambiare gli elementi del primo avvio](#cambiare-gli-elementi-del-primo-avvio)
- [Leggere e modificare cartelle e file](#leggere-e-modificare-cartelle-e-file)
- [Aggiungere qualcosa all'SDK](#aggiungere-qualcosa-allsdk)

---

## Aggiungere un'app al menu di avvio

1. Se serve un simbolo nuovo, aggiungilo (vedi la ricetta successiva).
2. Aggiungi una voce in `src/apps/registry.js`:

   ```js
   { id: 'notes', name: 'Note', glyph: 'pencil', color: '#d9922b' },
   ```

   - `id`: stabile, minuscolo, senza spazi. Finisce nei dati salvati dei collegamenti sul desktop, quindi non va cambiato dopo il rilascio.
   - `name`: nome mostrato, in italiano.
   - `color`: deve garantire un buon contrasto con il simbolo bianco.

L'app compare subito nel menu di avvio e nella ricerca. Finché non ha `load`, avviarla scrive solo "app non ancora disponibile" in console. Per darle una finestra vedi la ricetta successiva.

Per metterne un collegamento sul desktop, aggiungi un elemento `{ type: 'app', name: 'Note', app: 'notes' }` (vedi [Cambiare gli elementi del primo avvio](#cambiare-gli-elementi-del-primo-avvio)).

## Creare l'app vera e propria (una finestra)

1. Crea il modulo, per esempio `src/apps/notes/NotesApp.js`. L'export predefinito riceve `{ args }` e restituisce una `Window`:

   ```js
   import { Window, h } from '@lilos/sdk';

   export default function createNotes({ args }) {
     const win = new Window({ title: 'Note', icon: 'pencil', width: 520, height: 380 });
     const text = h('textarea', { class: 'notes-text' });
     win.body.append(text);
     // Listener esterni alla finestra: con signal spariscono quando la finestra si chiude
     addEventListener('resize', () => { /* … */ }, { signal: win.signal });
     return win;
   }
   ```

2. Collega il modulo nel registro: `{ id: 'notes', …, load: () => import('./notes/NotesApp.js') }`. Il codice dell'app viene scaricato solo al primo avvio.
3. Non posizionare, trascinare o chiudere la finestra dall'app: lo fa il gestore delle finestre. L'app può solo chiederlo con `win.emit('close')`.
4. Il contenuto della finestra scorre con la rotella (`win.body` ha `data-wheel="native"`). La finestra è chiara: usa i token `--surface`, `--chrome`, `--text`, `--border`.
5. Scegli controlli e ridimensionamento in base all'app: `controls: { maximize: false }` per una finestra piccola che non ha senso a tutto schermo, `resizable: false` per una dimensione fissa, `minWidth`/`maxWidth`… per i limiti. Si possono cambiare anche a finestra aperta con `setControl` e `setResizable` (per esempio spegnere `close` durante un salvataggio).

## Far aprire dei file alla tua app

1. Nel registro dichiara le estensioni che l'app apre per impostazione predefinita: `opens: ['csv', 'tsv']`. L'app compare anche tra le scelte di Impostazioni → Usabilità → Tipi di file e della finestra "Apri con".
2. L'export predefinito riceve `args.file` con l'id del file; leggi il contenuto con `await fs.read(id)` e salvalo con `await fs.write(id, text)`.
3. Gestisci l'evento `launch` sulla finestra: arriva quando l'utente apre un altro file mentre l'app è già aperta.
4. Segui `fs.on('change', …)` per accorgerti se il file aperto viene rinominato (`rename`) o eliminato (`remove`, controlla `e.ids`).
5. Se ci sono modifiche non salvate, imposta `win.canClose = () => …` (restituisce `true`/`false` o una Promise) per chiedere prima della chiusura.

```js
export default function createViewer({ args }) {
  const win = new Window({ title: 'Visualizzatore', icon: 'file' });
  const show = async id => { win.body.replaceChildren(h('pre', {}, await fs.read(id))); };
  if (args?.file) show(args.file);
  win.on('launch', a => a?.file && show(a.file));
  return win;
}
```

Per aprire un file dal codice del sistema usa `openFile(node)` (`src/apps/open.js`): sceglie l'app giusta o mostra "Apri con".

## Dare scorciatoie alla tua app

1. Nel registro: `commands: [{ id: 'notes.save', label: 'Salva', keys: ['Ctrl+S'] }]`. Vengono registrate all'avvio nel gruppo con il nome dell'app e si possono cambiare nelle Impostazioni anche prima che l'app sia aperta. Sono attive anche mentre si scrive (`whenEditing: false` per il contrario).
2. Nella finestra: `const off = handleCommand('notes.save', { isActive: () => win.active, run: () => save() })` e `win.on('destroy', off)`.
3. La stessa combinazione può stare in app diverse solo se non sono attive insieme: oggi il registro non lo permette, scegli combinazioni libere (`shortcuts.owner(combo)`).

## Creare una finestra di impostazioni

Ogni finestra che modifica impostazioni (dell'app, di un file, del sistema) si costruisce con `SettingsWindow`: non rifare l'impaginazione a mano.

```js
import { SettingsWindow, settings, toggle, selectField, actionButton } from '@lilos/sdk';

const win = new SettingsWindow({
  title: 'Note',
  icon: 'pencil',
  width: 640, height: 440,
  tabs: [
    { id: 'editor', label: 'Editor', icon: 'pencil', description: 'Scrittura e aspetto del testo.',
      subtabs: [                                   // facoltativi
        { id: 'text', label: 'Testo', sections: () => [{
          title: 'Carattere',
          rows: [{ label: 'Dimensione', control: selectField({ value: '13', options: ['12', '13', '14'], onChange: v => … }) }],
        }] },
        { id: 'save', label: 'Salvataggio', sections: () => [{
          rows: [{ label: 'Salvataggio automatico', description: 'Salva mentre scrivi', control: toggle({ value: true, onChange: v => … }) }],
        }] },
      ] },
    { id: 'about', label: 'Informazioni', icon: 'info', sections: [{ rows: [{ label: 'Versione', control: '1.0' }] }] },
  ],
});
```

- Usa `sections: () => [...]` (una funzione) quando i valori possono cambiare: la pagina viene ricostruita a ogni visualizzazione.
- **Applicazione immediata** (predefinita): ogni controllo salva in `onChange`. È il caso normale.
- **Applicazione alla conferma**: passa `footer: { buttons: [...] }` con Annulla, Applica, OK (`actionButton`), tieni le modifiche in sospeso e aggiorna il testo con `win.view.setNote('1 modifica non salvata')`.
- Aggiungi `keywords` alle righe con sinonimi utili alla ricerca.
- Mostra solo impostazioni che funzionano davvero.

## Aggiungere un'impostazione di sistema

1. Dichiarala in `src/systemSettings.js` dentro `settings.define({...})`, con il valore predefinito (che ne fissa il tipo).
2. Applicala: se è globale (stile, `<html>`), con `settings.watch` nello stesso file; se riguarda un componente, in `main.js` (`settings.watch('snap', on => { desktop.snapToGrid = on; })`). Valida i valori che finiscono in CSS o nel DOM.
3. Aggiungi la riga nell'app Impostazioni (`src/apps/settings/SettingsApp.js`) e, se serve, al pulsante "Impostazioni predefinite".
4. Documentala nella tabella di [systemSettings.js](api.md#systemsettingsjs) e nella [guida utente](../utente/guida.md#impostazioni).

## Aggiungere un simbolo

In `sdk/ui/icons.js` aggiungi una voce a `GLYPHS`. Il contenuto è il markup **interno** di un SVG 24×24 a tratto:

```js
star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
```

- Non specificare `stroke`, `fill` o `stroke-width`: li decide la classe `.ico` in `sdk/styles/base.css`, e il colore viene da `currentColor`.
- Usa solo markup scritto a mano e statico, mai dati che arrivano dall'esterno: viene inserito con `innerHTML`.

Poi usalo con `icon('star')`.

## Reagire all'avvio di un'app o all'apertura di un file

Iscriviti al bus:

```js
import { bus } from '@lilos/sdk';

const off = bus.on('app:launch', ({ id, args }) => {
  if (id !== 'notes') return;
  // apri la finestra dell'app…
});

bus.on('item:open', node => {
  // node: nodo del file system { id, type: 'folder' | 'file', name, parent, … }
});
```

`on` restituisce la funzione per annullare l'iscrizione: chiamala quando il componente viene distrutto.

`app:launch` è già gestito da `connectLauncher` (`src/apps/launcher.js`), che apre le finestre delle app; `item:open` di una cartella la apre nell'app File (`main.js`), di un file per ora viene solo scritto in console.

## Mettere un nuovo tipo di oggetto sulla scrivania

Esempio: una nota adesiva.

```js
import { h } from '@lilos/sdk';

const note = h('div', { class: 'sticky', dataset: { kind: 'note' } },
  h('div', { class: 'sticky-body', dataset: { wheel: 'native' } }, testo));
note.style.left = '200px';   // coordinate mondo
note.style.top = '120px';
canvas.add(note);
```

Controlla questi punti:

1. **`data-kind`**: dice alla minimappa come disegnare l'oggetto. Aggiungi lo stile del blocco in `canvas.css`:

   ```css
   .minimap .mm-note { background: #d9b44a; border-radius: 1px; }
   ```

   Senza `data-kind` l'oggetto viene disegnato come `mm-obj`.
2. **Posizione con `left`/`top`**, mai con `transform`: il canvas misura gli oggetti con `offsetLeft` e `offsetTop` (vedi [Coordinate](README.md#coordinate)).
3. **`canvas.changed()`** dopo ogni spostamento o ridimensionamento, per aggiornare la minimappa.
4. **`data-wheel="native"`** sulle parti che devono scorrere con la rotella invece di fare zoom (contenuti lunghi, liste, editor).
5. **Clic**: un `pointerdown` sinistro sull'oggetto arriva all'oggetto, perché il canvas sposta la vista solo dai punti vuoti. Il tasto centrale e Spazio + trascina spostano invece la vista anche sopra gli oggetti.
6. **Tasto destro**: il canvas annulla il menu del browser ovunque ed emette `background:contextmenu` solo sui punti vuoti. Per un menu sull'oggetto ascolta `contextmenu` sull'oggetto e usa `openMenu`.
7. **Sovrapposizione**: lo `z-index` dell'oggetto vale solo rispetto agli altri oggetti della scrivania. Gli elementi del desktop usano `1`, e `1000` mentre vengono trascinati.
8. **Rimozione**: `canvas.remove(el)`.

## Trascinare un oggetto sulla scrivania

Usa `trackDrag` e dividi lo spostamento per lo zoom:

```js
handle.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const x0 = el.offsetLeft, y0 = el.offsetTop;
  trackDrag(e, {
    onMove: (dx, dy) => {
      el.style.left = x0 + dx / canvas.cam.s + 'px';
      el.style.top = y0 + dy / canvas.cam.s + 'px';
      canvas.changed();
    },
    onEnd: moved => { if (moved) salva(); },
  });
});
```

Per allineare a una griglia, arrotonda al rilascio come fa `Desktop`: `Math.round(v / 8) * 8`.

## Aggiungere voci ai menu contestuali

I menu del desktop sono costruiti in `Desktop.#backgroundMenu` (sfondo) e `Desktop.#itemMenu` (elementi). Aggiungi un oggetto all'array:

```js
{ label: 'Duplica', icon: 'plus', shortcut: 'Ctrl D', disabled: many, action: () => this.duplicate(item) },
```

- `shortcut` è solo un'etichetta: la scorciatoia vera va implementata a parte (vedi la ricetta successiva).
- `danger: true` per le azioni distruttive, che vanno in fondo dopo un separatore `'-'`.
- Considera il caso con più elementi selezionati: disattiva la voce o adatta l'etichetta, come fanno "Rinomina" ed "Elimina".

## Aggiungere una scorciatoia da tastiera

Non aggiungere listener `keydown` per le scorciatoie: registra un comando nel registro `shortcuts` dell'SDK, così l'utente può cambiarlo da Impostazioni → Usabilità → Scorciatoie.

```js
import { shortcuts } from '@lilos/sdk';

shortcuts.register({
  id: 'items.duplicate',                 // stabile: finisce nei dati salvati
  label: 'Duplica gli elementi selezionati',
  group: 'Elementi',                     // sezione nelle Impostazioni
  keys: ['Ctrl+D'],                      // predefinite, in forma canonica
  when: () => this.keyboard && this.selection.size > 0,
  run: () => this.duplicate([...this.selection]),
});
```

- **Combinazioni canoniche**: modificatori nell'ordine Ctrl, Alt, Shift, poi il tasto (`'Ctrl+Shift+A'`, `'Shift+1'`, `'Ctrl+Plus'`, `'F2'`). Elenco dei nomi nel [riferimento API](api.md#sdkcoreshortcutsjs).
- **`when`** dice quando il comando è attivo (per esempio solo se il desktop ha la tastiera, o solo se c'è una finestra).
- **`whenEditing: true`** solo per comandi che devono funzionare anche mentre si scrive (zoom, menu di avvio); richiedono Ctrl o Alt.
- **Etichette**: nei menu e nei tooltip usa `shortcuts.label('items.duplicate')`, mai il testo scritto a mano, e aggiornali su `shortcuts.on('change', …)` se restano a schermo.
- **Conflitti**: controlla `shortcuts.owner('Ctrl+D')` prima di scegliere la predefinita; `shortcuts.validate(combo, id)` dice se è assegnabile.
- **Tasti di navigazione** dentro un tuo componente (frecce in una lista, Esc che chiude) restano gestiti dal componente, fuori dal registro: ferma la propagazione mentre il componente ha il focus.
- Aggiorna la tabella delle scorciatoie nella [guida utente](../utente/guida.md#scorciatoie-da-tastiera) e nel README principale.

## Aggiungere un tipo di file

In `sdk/core/fileTypes.js` aggiungi le estensioni a un gruppo esistente oppure crea un gruppo:

```js
{ exts: ['epub', 'mobi'], label: 'Libro', color: '#a0522d' },
```

L'estensione va scritta in minuscolo. Il colore è la fascia dell'icona, su cui il testo è bianco. Aggiorna la tabella dei tipi nella [guida utente](../utente/guida.md#tipi-di-file).

## Salvare uno stato

```js
import { storage } from '@lilos/sdk';

const saved = storage.get('notes');
const notes = Array.isArray(saved) ? saved : [];   // valida sempre quello che leggi
…
storage.set('notes', notes);
```

- Chiavi brevi e minuscole; il prefisso `lilos:` viene aggiunto da solo.
- Valida sempre il valore letto: può essere vecchio, rovinato o modificato a mano.
- Se lo stato cambia molto spesso (durante un trascinamento, per esempio), salva al rilascio oppure con un ritardo, come fa `Canvas` con la camera (300 ms).
- Aggiungi la chiave alla tabella in [Riferimento API → Dati salvati](api.md#dati-salvati).

`localStorage` è adatto a impostazioni e stati piccoli. Per contenuti di file servirà IndexedDB (vedi la [roadmap](../interna/stato-e-roadmap.md)).

## Aggiungere uno stile

1. Per una parte del sistema crea `src/styles/<area>.css` e importalo in `src/main.js` dopo `@lilos/sdk/styles.css`. Per un componente dell'SDK crea `sdk/styles/<componente>.css` e importalo da `sdk/styles/index.css`.
2. Usa i token di `sdk/styles/tokens.css` invece di valori fissi: `var(--accent)`, `var(--radius)`, `var(--bar-text)`…
3. Interfaccia scura per barra, menu e pannelli (`--bar-*`, `--panel*`); interfaccia chiara per le finestre (`--surface`, `--chrome`, `--text`, `--border`). Il riferimento visivo delle finestre è `design/mockup.html`.
4. Se serve un livello fuori dalla scrivania, rispetta la scala:

   | z-index | Livello |
   | --- | --- |
   | 8000 | HUD |
   | 9000 | Barra in basso |
   | 9500 | Menu di avvio |
   | 9600 | Menu contestuale |

## Cambiare gli elementi del primo avvio

Modifica `src/desktop/seed.js`: sono i nodi creati nella cartella Scrivania al primo avvio. Vengono disposti in colonna in automatico, quindi non servono `id`, `x` e `y`:

```js
export const seedItems = [
  { type: 'folder', name: 'Progetti', color: '#e8b44c' },
  { type: 'app', name: 'Note', app: 'notes' },
];
```

Con `export const seedItems = [];` la scrivania parte vuota.

Gli elementi di esempio vengono usati solo al primo avvio, cioè quando `lilos:fs` non esiste. Per vedere la modifica nel tuo browser esegui `['fs', 'desktop-layout'].forEach(k => localStorage.removeItem('lilos:' + k))` e ricarica (elimina anche cartelle e file creati).

## Leggere e modificare cartelle e file

Usa il file system `fs` dell'SDK; non salvare elenchi di file per conto tuo.

```js
import { fs } from '@lilos/sdk';

const docs = fs.resolve('/Documenti');
const notes = fs.create(docs.id, { type: 'folder', name: 'Note' });     // nome reso unico se serve
fs.create(notes.id, { type: 'file', name: 'idee.txt' });
fs.children(notes.id);           // copie dei nodi
fs.rename(notes.id, 'Appunti');  // restituisce il nome finale
fs.remove(notes.id);             // definitivo, contenuto compreso

const off = fs.on('change', e => {
  if (e.parent === notes.id) refresh();   // 'create' | 'rename' | 'update' | 'remove'
});
```

- Mostra le modifiche reagendo agli eventi `change`, non dopo le tue chiamate: così vedi anche quelle fatte da altre parti (desktop, app File).
- In una finestra togli l'iscrizione alla chiusura: `win.on('destroy', off)`.
- I nodi di sistema (`system: true`) non si rinominano né eliminano: disattiva le relative azioni. Per eliminare cartelle dall'interfaccia usa `confirmRemove` (`src/items/confirmRemove.js`), che chiede conferma per quelle non vuote.
- Per selezionare, aprire, rinominare ed eliminare con le scorciatoie comuni, iscrivi la tua vista con `addTarget` (`src/items/targets.js`), come fa l'app File.

## Aggiungere qualcosa all'SDK

Vale per ogni struttura di base che servirà a più parti del sistema o alle app (componenti, utilità, finestre).

1. Crea il modulo in `sdk/core/` (senza interfaccia) o `sdk/ui/` (componenti). Importa solo da altri file di `sdk/` con percorsi relativi, **mai** da `src/`.
2. Se ha uno stile, crea `sdk/styles/<componente>.css` e aggiungi `@import` in `sdk/styles/index.css`. Usa i token.
3. Esporta le funzioni o classi pubbliche da `sdk/index.js`. Quello che non esporti resta interno.
4. Nel sistema importa da `@lilos/sdk`.
5. Documenta: tabella in [sdk/README.md](../../sdk/README.md#contenuto), voce nel [riferimento API](api.md), riga nelle modifiche dell'SDK.
6. Versione in `sdk/package.json`: un export nuovo alza la patch (`0.1.0` → `0.1.1`); togliere o cambiare la firma di un export esistente alza la minore (`0.1.x` → `0.2.0`).

Per controllare che l'SDK non dipenda dal sistema:

```bash
grep -rn "src/" sdk --include=*.js   # non deve trovare nulla
```
