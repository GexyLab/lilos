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
- [Aggiungere annulla e ripeti a un'app](#aggiungere-annulla-e-ripeti-a-unapp)
- [Far sapere a un'app di quale workspace è un file](#far-sapere-a-unapp-di-quale-workspace-è-un-file)
- [Usare i tag in un'app](#usare-i-tag-in-unapp)
- [Rendere trascinabili file e cartelle in un'app](#rendere-trascinabili-file-e-cartelle-in-unapp)
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

Con `system: true` l'app è installata in ogni workspace e non si può disinstallare (File e Impostazioni); senza, ogni workspace la installa o la toglie in Impostazioni → Workspace. L'app compare nel menu di avvio e nella ricerca **dei workspace in cui è installata**. Un'app nuova arriva installata in tutti i workspace, anche in quelli già salvati (ognuno ricorda in `known` le app che lilOS aveva: quelle che non c'erano si aggiungono alla lettura); un'app che l'utente ha tolto resta tolta. Finché non ha `load`, avviarla scrive solo "app non ancora disponibile" in console. Per darle una finestra vedi la ricetta successiva.

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

## Far riaprire la finestra di un'app da una workarea

Quando una workarea viene ridotta a icona chiude le sue finestre, e quando si riapre le ricrea. Per ritrovare la tua app come era (il documento aperto, la cartella mostrata…), dille cosa ricordare.

1. Nel modulo dell'app imposta `win.getState`: una funzione senza parametri che restituisce un **oggetto semplice** (solo dati JSON):

   ```js
   export default function createNotes({ args }) {
     const win = new Window({ title: 'Note', icon: 'pencil' });
     const notes = new NotesView(win);
     notes.open(args?.note ?? null);                    // 2. accetta gli stessi dati in args
     win.getState = () => ({ note: notes.currentId });  // 1. cosa ricordare
     return win;
   }
   ```

2. Accetta quei dati in `args`: la workarea li passa all'app, dentro `args`, quando ricrea la finestra (`launcher.restore`). Controlla sempre quello che arriva: il file o la cartella possono non esistere più.
3. Tieni lo stato **piccolo**: al massimo 4000 caratteri di JSON. Se lo supera viene scartato e la finestra si riapre senza argomenti. Ricorda id e opzioni, mai contenuti.
4. Se `getState` non c'è, restituisce `null` o lancia un errore, la finestra si riapre con gli argomenti vuoti (ma nella stessa posizione e con le stesse dimensioni). Un errore viene solo scritto in console.
5. Il testo non salvato non va nello stato: se la finestra ha modifiche, imposta anche `win.canClose` e la workarea lo chiederà all'utente prima di ridurre.
6. Per distinguere "nessun valore" da "valore assente", usa `'chiave' in args`, come fa l'Editor con `args.folder` (`null` vuol dire nessuna cartella, mancante vuol dire l'ultima aperta).

Vale solo per le finestre aperte con `app` (cioè avviate dal launcher). Le finestre secondarie, aperte con `openWindow`, si chiudono e non si riaprono. Controllo dello stato salvato: [Riferimento API → `lilos:workareas`](api.md#lilosworkareas).

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
- Se lo stato è del singolo workspace (come la vista o le finestre aperte), non per tutto lilOS, usa la chiave `ws:<id>:<parte>` (`workspaceKey` in `src/workspaces/store.js`) e aggiungi la parte a `PARTS`, altrimenti non viene cancellata quando il workspace è eliminato. Le preferenze (tema, scorciatoie, menu, tipi di file) restano globali.

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

Gli elementi di esempio vengono usati solo al primo avvio, cioè quando `lilos:fs` non esiste. Per vedere la modifica nel tuo browser esegui `['fs', 'workspaces'].forEach(k => localStorage.removeItem('lilos:' + k))` e ricarica (elimina anche cartelle e file creati; le chiavi `lilos:ws:<id>:…` dei workspace spariti si cancellano da sole all'avvio). Gli elementi di esempio vanno nella Scrivania del workspace «Principale».

## Leggere e modificare cartelle e file

Usa il file system `fs` dell'SDK; non salvare elenchi di file per conto tuo.

```js
import { fs } from '@lilos/sdk';

const docs = fs.resolve('/Documenti');
const notes = fs.create(docs.id, { type: 'folder', name: 'Note' });     // nome reso unico se serve
fs.create(notes.id, { type: 'file', name: 'idee.txt' });
fs.children(notes.id);           // copie dei nodi
fs.rename(notes.id, 'Appunti');  // restituisce il nome finale
fs.remove(notes.id);             // contenuto compreso: per riaverlo serve uno snapshot (vedi sotto)

const off = fs.on('change', e => {
  if (e.parent === notes.id) refresh();   // 'create' | 'rename' | 'update' | 'remove'
});
```

- Mostra le modifiche reagendo agli eventi `change`, non dopo le tue chiamate: così vedi anche quelle fatte da altre parti (desktop, app File).
- In una finestra togli l'iscrizione alla chiusura: `win.on('destroy', off)`.
- I nodi di sistema (`system: true`) non si rinominano né eliminano: disattiva le relative azioni. Per eliminare dall'interfaccia usa `confirmRemove` (`src/items/confirmRemove.js`), che rispetta le impostazioni `deleteConfirm` e `deletePermanent` (di norma sposta nel cestino) e, con una `UndoStack`, rende l'eliminazione annullabile (vedi [Aggiungere annulla e ripeti a un'app](#aggiungere-annulla-e-ripeti-a-unapp)).
- Per selezionare, aprire, rinominare ed eliminare con le scorciatoie comuni, iscrivi la tua vista con `addTarget` (`src/items/targets.js`), come fa l'app File.

## Aggiungere annulla e ripeti a un'app

Ctrl Z e Ctrl Y agiscono sulla cronologia di chi ha il focus: la tua finestra (o un suo pannello) deve avere la propria. Non serve registrare scorciatoie.

```js
import { Window, UndoStack, history } from '@lilos/sdk';

export default function MyApp() {
  const win = new Window({ title: 'Note' });
  const stack = new UndoStack();
  const detach = history.attach(win.el, stack);     // vale per tutta la finestra
  win.on('destroy', detach);

  function rename(id, name) {
    const before = fs.get(id).name;
    const after = fs.rename(id, name);               // prima fai l'azione…
    stack.push({                                      // …poi la registri
      label: `Rinomina «${before}» in «${after}»`,
      undo: () => { if (!fs.exists(id)) throw new Error('L’elemento non esiste più'); fs.rename(id, before); },
      redo: () => { if (!fs.exists(id)) throw new Error('L’elemento non esiste più'); fs.rename(id, after); },
    });
  }
  return win;
}
```

1. Crea una `UndoStack` per ogni posto che ha il suo "Annulla": una finestra, un pannello. Non condividerne una tra posti diversi.
2. Collegala con `history.attach(el, stack)` all'elemento che contiene quello che l'utente modifica (`win.el` per tutta la finestra, o il pannello). Vince l'elemento più vicino al focus. Conserva la funzione restituita e chiamala alla chiusura (`win.on('destroy', detach)`).
3. Dopo ogni azione che si può annullare, `stack.push({ label, undo, redo })`. L'`label` finisce nel messaggio in basso ("Annullato: …"), quindi scrivila come un'azione: `Elimina «nota.txt»`. In alternativa `await stack.run({ label, do, undo })` fa l'azione e la registra.
4. `undo` e `redo` possono essere asincrone. Se quello su cui agiscono non c'è più, **lanciano un errore**: la voce viene tolta e l'utente vede "Non si può più fare: …". Non restare in silenzio e non lasciare la voce bloccata.
5. Per azioni sul file system usa gli aiuti di `src/items/fsHistory.js` (`removeNodes`, `recordCreated`, `renameNode`, `moveNode`) e `confirmRemove(ids, x, y, stack)` (e `restoreNodes` per il cestino): spostano nel cestino, o prendono uno `snapshot` se l'eliminazione è definitiva, e controllano che gli elementi esistano. Chiama `recordCreated` dopo la rinomina iniziale, per fare di creare e dare il nome un solo passo.
6. Per un editor di testo tuo, collega un gestore con `text: true`: `history.attach(textarea, { text: true, undo, redo })`. Senza `text: true`, nei campi di testo Ctrl Z resta al browser. `undo` e `redo` restituiscono una stringa (anche vuota) se è andata bene, `null` se no.
7. Una finestra **senza** cronologia non fa nulla con Ctrl Z, e non tocca la scrivania dietro: non serve fare altro.

Le cronologie vivono solo in memoria: dopo la ricarica sono vuote. Ogni `UndoStack` ricorda fino a 100 voci (`new UndoStack({ limit })`).

Per provare in sviluppo: `lilos.history.resolve()` mostra il gestore su cui agirebbe Ctrl Z in quel momento.

## Far sapere a un'app di quale workspace è un file

Ogni nodo creato porta `workspace`, l'id del workspace che l'ha creato: non cambia spostandolo o rinominandolo. I nodi senza `workspace` sono le cartelle di sistema condivise (e i nodi di prima dei workspace non ancora assegnati).

```js
import { fs } from '@lilos/sdk';
import { describeWorkspace, onWorkspacesChange } from '../../workspaces/info.js';   // dal sistema, non dall'SDK

const node = fs.get(id);
const owner = describeWorkspace(node.workspace);   // { id, name, color, removed, current } o null
const label = !owner ? 'Condiviso' : owner.removed ? `${owner.name} (eliminato)` : owner.name;

const off = onWorkspacesChange(() => refresh());   // nome o colore cambiati, workspace eliminato…
win.on('destroy', off);
```

- `describeWorkspace` conosce anche i workspace eliminati (`removed: true`): così i loro file dicono ancora di chi erano. `null` vuol dire senza proprietario o id sconosciuto.
- Il colore è già validato (`#rrggbb`), ma resta un dato salvato: mettilo in `style.background`, mai dentro HTML scritto a mano.
- L'isolamento non va programmato: `fs` nasconde da solo le Scrivanie degli altri workspace. Non serve filtrare nulla nella tua app.
- Reagisci anche a `fs.on('scope', …)`: cambiando workspace cambia ciò che `fs` mostra, quindi rileggi l'albero (e se la tua finestra tiene aperto un nodo che ora non si vede, `fs.exists(id)` è falso: aspetta il ritorno del workspace invece di chiudere o perdere il testo).
- Una finestra appartiene al workspace in cui è stata aperta e resta nascosta quando l'utente se ne va: non farle assumere che sia sempre visibile, e non chiuderla quando cambia workspace.
- Un'app dell'SDK (sotto `sdk/`) non può importare `src/workspaces/info.js`: legge solo `node.workspace` e lascia al sistema il nome e il colore.

## Usare i tag in un'app

I tag sono definiti nell'SDK e uguali in tutti i workspace. Un tag si mette su un nodo con `fs.setTags`. Dettagli in [tags](api.md#sdkcoretagsjs) e nella decisione [D29](../interna/decisioni.md#d29-i-tag-stanno-sui-nodi-e-un-tag-invisibile-nasconde-gli-elementi).

```js
import { fs, tags } from '@lilos/sdk';

// Leggere
const lista = tags.list();                          // [{ id, name, color, visible }]
const urgente = tags.byName('Urgente') ?? tags.create({ name: 'Urgente' });   // create lancia un errore se il nome è vuoto o doppio
const nodi = fs.tagged(urgente.id);                 // tutti gli elementi con il tag, anche quelli nascosti

// Mettere e togliere (setTags sostituisce l'elenco intero del nodo)
const attuali = fs.get(id).tags ?? [];
fs.setTags(id, [...attuali, urgente.id]);
fs.setTags(id, attuali.filter(t => t !== urgente.id));

// Reagire
const off1 = tags.on('change', () => ridisegnaPallini());   // nome, colore, visibile, nuovo o eliminato
const off2 = fs.on('scope', () => rileggiElenco());         // un tag invisibile cambia ciò che si vede
win.on('destroy', () => { off1(); off2(); });
```

- Un tag **invisibile** nasconde gli elementi che lo hanno: `fs.children()` non li dà. Se la tua app mostra elenchi, usa `children()` e non dovrai fare nulla; gli elementi non compaiono finché il tag è invisibile.
- `get`, `exists`, `resolve` e `tagged` trovano ancora gli elementi nascosti: una finestra che tiene aperto un file con un tag invisibile continua a funzionare. Per sapere se un nodo è nascosto: `fs.isHidden(id)`.
- Per mettere o togliere un tag a più nodi con un menu usa `tagSubmenu(ids)` e `setTag(ids, tagId, on)` di `src/tags/tagUi.js` (solo dal sistema, non dall'SDK); `tagDots(node)` disegna i pallini.
- I nodi di sistema non hanno tag: `setTags` lancia un errore, `setTag` li salta.
- Il colore di un tag è un dato salvato (già validato come `#rrggbb`): mettilo in `style.background`, mai dentro HTML scritto a mano.
- Aprire File sulla vista di un tag: `launch('files', { tag: tag.id })`. Aprire Impostazioni → Tag: `launch('settings', { tab: 'tags' })`.
- Mettere o togliere un tag non si annulla con Ctrl Z: non c'è una voce nella cronologia.

## Rendere trascinabili file e cartelle in un'app

Se la tua app mostra file e cartelle (un elenco, un albero, una griglia), usa `src/items/itemDrag.js`: così si trascinano da e verso scrivania, File ed Editor, con lo stesso aspetto e lo stesso annulla. Non usare il drag and drop nativo di HTML5 (vedi [D30](../interna/decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle)). Contratti completi: [Riferimento API → itemDrag.js](api.md#itemdragjs).

```js
import { h, UndoStack, history } from '@lilos/sdk';
import { markItem, dropZone, dragItems } from '../../items/itemDrag.js';

const stack = new UndoStack();                       // la cronologia della tua vista
const detach = history.attach(win.el, stack);
win.on('destroy', detach);

// 1. Marca ogni elemento che mostra un nodo (cartelle: accettano rilasci; file: lasciano passare)
const row = node => markItem(h('div', { class: 'row', dataset: { id: node.id } }, node.name), node);

// 2. Rendi la lista una zona di rilascio: i nodi vanno nella cartella che mostra
const stopZone = dropZone(list, { folder: () => cartellaMostrata });
win.on('destroy', stopZone);

// 3. Avvia il trascinamento dal pointerdown di una riga
list.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !e.target.closest('.row')) return;
  dragItems(e, {
    ids: [...selezione],            // id dei nodi: con più elementi, tutta la selezione
    stack,                          // lo spostamento si registra qui, una sola volta
    onEnd: ({ moved }) => { if (!moved) { /* era un clic */ } },
  });
}, { signal: win.signal });
```

1. **`markItem(el, node)`** su ogni elemento che rappresenta un nodo. Non serve altro per far accettare rilasci a una cartella; i nodi di sistema non si spostano mai.
2. **`dropZone(el, zone)`** per le aree che accettano rilasci senza essere una cartella marcata. `zone.folder(hit)` dice in quale cartella vanno i nodi (`null` = niente rilascio); `hit` è l'elemento sotto il puntatore, utile per decidere in base alla riga. Per una zona che non sposta ometti `folder` e dai `drop(ids, ev, stack)` e, se serve, `accepts(ids)`. Se la stessa area deve fare cose diverse a seconda del punto (la barra laterale di File: centro di una voce = sposta, bordo = crea un collegamento), usa `target(hit, x, y, ids)` e restituisci `{ el, run }`: marcare ogni voce con `markItem` non basterebbe.
3. **`dragItems(e, options)`** dal `pointerdown` (sinistro) di un elemento selezionato. Passa sempre `stack`: se lo ometti lo spostamento funziona ma non si annulla. `onEnd({ moved })` distingue un clic da un trascinamento: usalo per restringere la selezione, come fa File.
4. **Non gestisci tu il resto**: il fantasma, l'evidenziamento (`.drop-target`), Esc e il blocco sopra le finestre sono già fatti. `ghost: false` se vuoi muovere tu gli elementi (come fa la scrivania).
5. **Evidenziare altro** della zona stessa: `highlight(folder)` restituisce l'elemento che prende `.drop-target` (nell'Editor, la riga della cartella o l'intero pannello).
6. **Elementi che non devono riceverne né darne**: non marcarli (File non marca le righe del cestino e non avvia il trascinamento lì). Per il menu «Aggiungi alla barra laterale di File» metti `linkEntry(ids)` nel tuo menu: restituisce `null` se non serve, quindi filtra con `.filter(Boolean)`.
7. **Togli la zona alla chiusura**: `dropZone` restituisce la funzione che la toglie. Gli elementi marcati spariscono col loro DOM.

Prova: trascina un file dalla tua vista sulla scrivania e su una finestra File; con Ctrl Z nella tua vista deve tornare dov'era.

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
