# Ricette

Procedure passo per passo per le modifiche più comuni. Per i dettagli delle funzioni vedi il [riferimento API](api.md).

- [Aggiungere un'app al menu di avvio](#aggiungere-unapp-al-menu-di-avvio)
- [Creare l'app vera e propria (una finestra)](#creare-lapp-vera-e-propria-una-finestra)
- [Aggiungere o aggiornare un'app di sistema](#aggiungere-o-aggiornare-unapp-di-sistema)
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
- [Creare un'app installabile (pacchetto)](#creare-unapp-installabile-pacchetto)
- [Aggiungere un punto d'ingresso a un'app](#aggiungere-un-punto-dingresso-a-unapp)
- [Intervenire su un evento con una pipe](#intervenire-su-un-evento-con-una-pipe)
- [Aggiungere voci di menu e un segno sull'icona a un'app](#aggiungere-voci-di-menu-e-un-segno-sullicona-a-unapp)
- [Installare un'app dall'esempio](#installare-unapp-dallesempio)
- [Usare il kernel dal sistema o dall'SDK](#usare-il-kernel-dal-sistema-o-dallsdk)
- [Aggiungere un modulo al kernel](#aggiungere-un-modulo-al-kernel)
- [Aggiungere un protocollo di rete](#aggiungere-un-protocollo-di-rete)
- [Pubblicare un modulo del kernel come pacchetto](#pubblicare-un-modulo-del-kernel-come-pacchetto)
- [Pubblicare una versione di lilOS](#pubblicare-una-versione-di-lilos)
- [Installare lilOS da una release](#installare-lilos-da-una-release)
- [Fare un repository non ufficiale](#fare-un-repository-non-ufficiale)
- [Aggiungere qualcosa all'SDK](#aggiungere-qualcosa-allsdk)

---

## Aggiungere un'app al menu di avvio

Nel registro di lilOS non ci sono app scritte nel codice: ogni app è un **pacchetto installato** dal kernel, e compare nel menu di avvio (e nella ricerca) **dei workspace in cui è visibile** quando viene installata. Quindi:

- per un'app di lilOS (File Manager, Editor, Pannello di controllo, AppStore e simili): [Aggiungere o aggiornare un'app di sistema](#aggiungere-o-aggiornare-unapp-di-sistema), nel repository ufficiale;
- per un'app di altri: [Creare un'app installabile](#creare-unapp-installabile-pacchetto).

La `category` del manifesto (`system`, `productivity`, `media`, `development`, `other`; `other` se manca) decide in quale scheda del menu di avvio compare l'app. Il nome (`name`), il simbolo (`icon.glyph`, un nome accettato da `icon()`; se serve uno nuovo, vedi [Aggiungere un simbolo](#aggiungere-un-simbolo)) e il colore (`icon.color`, con un buon contrasto con il simbolo bianco) stanno nel manifesto. L'`id` è stabile: finisce nei collegamenti sul desktop, quindi non va cambiato dopo il rilascio.

Un'app con `required: true` (solo di sistema) è sempre visibile in ogni workspace; le altre ogni workspace può nasconderle nel Pannello di controllo → Workspace. Un'app nuova arriva visibile in tutti i workspace, anche in quelli già salvati (ognuno ricorda in `known` le app che lilOS aveva: quelle che non c'erano si aggiungono alla lettura); un'app che l'utente ha nascosto resta nascosta.

Per metterne un collegamento sul desktop, aggiungi un elemento `{ type: 'app', name: 'Note', app: 'notes' }` (vedi [Cambiare gli elementi del primo avvio](#cambiare-gli-elementi-del-primo-avvio)); un'app può anche farselo mettere con l'operazione `desktopItem` del manifesto.

## Creare l'app vera e propria (una finestra)

1. Crea il modulo, per esempio `src/notes/NotesApp.js` nel repository ufficiale (se è un'app di sistema, vedi la ricetta successiva). L'export predefinito riceve `{ args, openWindow }` e restituisce una `Window`:

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

2. Il modulo è l'`entry` del manifesto: non si collega a mano nel registro. lilOS lo scarica solo al primo avvio dell'app (`load` lo crea `packages.js`).
3. Non posizionare, trascinare o chiudere la finestra dall'app: lo fa il gestore delle finestre. L'app può solo chiederlo con `win.emit('close')`.
4. Il contenuto della finestra scorre con la rotella (`win.body` ha `data-wheel="native"`). La finestra è chiara: usa i token `--surface`, `--chrome`, `--text`, `--border`.
5. Scegli controlli e ridimensionamento in base all'app: `controls: { maximize: false }` per una finestra piccola che non ha senso a tutto schermo, `resizable: false` per una dimensione fissa, `minWidth`/`maxWidth`… per i limiti. Si possono cambiare anche a finestra aperta con `setControl` e `setResizable` (per esempio spegnere `close` durante un salvataggio).

## Aggiungere o aggiornare un'app di sistema

Le app di sistema stanno nel repository ufficiale ([GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official)), non in questo. Clonalo accanto a lilOS e lancia `npm install` una volta. Panoramica: [README per sviluppatori](README.md#le-app-di-sistema-e-il-repository-ufficiale).

**Aggiornare un'app esistente**

1. Modifica `src/<app>/` (sorgenti) e, per una versione nuova, alza `version` in `src/<app>/app.json`.
2. `npm run build` (o `npm run build -- editor`). Scrive `apps/<id>/dist/` e `apps/<id>/lilos.json` con gli hash.
3. Committa **sorgenti e `apps/`** (il kernel installa i file così come sono) e crea il tag: `git tag v1.1.0 && git push --follow-tags`. Il kernel prende il tag `vX.Y.Z` più alto del repository.
4. Un amministratore la aggiorna dall'AppStore (Installate → Aggiorna a…). Per provarla prima di pubblicare il tag, vedi [Provare una modifica](README.md#le-app-di-sistema-e-il-repository-ufficiale).

**Aggiungere un'app nuova**

1. Crea `src/<id>/` con `app.json` (il modello del manifesto: `id`, `version`, `kind: "local"`, `name`, `description`, `icon`, `publisher`, `sdk: "1"`, `system: true`, `required` se serve a lilOS, `permissions`, `contributes`) e il modulo, per esempio `NotesApp.js`, con un export predefinito `({ args, openWindow }) → Window`.
2. Importa da `@lilos/sdk` e `@lilos/system` come nel resto del sistema: nel build restano esterni. I fogli di stile si importano dal modulo (`import './notes.css'`): il build li mette in `dist/` e `build.mjs` li scrive in `styles` del manifesto. Colori e raggi solo con i token dell'SDK.
3. Aggiungi `{ id: 'notes', entry: 'NotesApp.js' }` a `APPS` in `scripts/build.mjs` e `"apps/notes"` a `catalog.json`.
4. Se serve una funzione del sistema che `@lilos/system` non offre, aggiungi l'export a `src/systemApi.js` in lilOS (una riga `export { … } from '…'`) e rilascia **prima** lilOS: le app che lo usano non partono su un lilOS più vecchio.
5. Build, commit, tag come sopra. Per farla installare da sola all'avvio del kernel aggiungi l'`id` a `apps.bootstrap` (predefinito: `files`, `editor`, `settings`, `appstore`); altrimenti si installa dall'AppStore.

**Aggiungere un servizio a un'app di sistema.** Scrivi `src/<app>/services/<nome>.js` con un export `async function <nome>({ lilos, args })` e **nessun `import`**; dichiaralo in `app.json` (`entrypoints.<nome>` con `kind: "service"` e `file: "dist/<nome>.js"`, più il permesso `background`). Il build lo copia in `dist/` così com'è. Dettagli e un esempio in [Servizi delle app](api.md#servizi-delle-app-appsappservicesjs).

## Far aprire dei file alla tua app

1. Nel manifesto dichiara le estensioni che l'app apre per impostazione predefinita: `"contributes": { "fileTypes": ["csv", "tsv"] }` (nel registro diventano `opens`). L'app compare anche tra le scelte del Pannello di controllo → Usabilità → Tipi di file e della finestra "Apri con".
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

1. Nel manifesto: `"contributes": { "commands": [{ "id": "notes.save", "label": "Salva", "keys": ["Ctrl+S"] }] }` (l'`id` inizia con l'id dell'app e un punto; `keys` richiede il permesso `ui.shortcuts`). Vengono registrate all'avvio nel gruppo con il nome dell'app e si possono cambiare nel Pannello di controllo anche prima che l'app sia aperta. Sono attive anche mentre si scrive (`whenEditing: false` per il contrario).
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
2. Applicala: se è globale (stile, `<html>`), con `settings.watch` nello stesso file; se riguarda un componente, in `system.js` (`settings.watch('snap', on => { desktop.snapToGrid = on; })`). Valida i valori che finiscono in CSS o nel DOM.
3. Aggiungi la riga nell'app Pannello di controllo (`src/settings/SettingsApp.js` nel repository ufficiale) e, se serve, al pulsante "Impostazioni predefinite".
4. Documentala nella tabella di [systemSettings.js](api.md#systemsettingsjs) e nella [guida utente](../utente/guida.md#pannello-di-controllo).

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

`app:launch` è già gestito da `connectLauncher` (`src/apps/launcher.js`), che apre le finestre delle app; `item:open` di una cartella la apre nel File Manager (`system.js`), di un file per ora viene solo scritto in console.

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
5. Il testo non salvato non va nello stato: se la finestra ha modifiche, imposta anche `win.canClose` e la workarea lo chiederà all'utente prima di ridurre. In alternativa tienilo da parte tu, nello `storage` dell'utente (come l'Editor, che salva le bozze), e riprendilo da un id messo nello stato.
   Per una finestra che mostra più file (schede) restituisci anche `files: [id…]` e, se vuoi, imposta `win.closeFiles = ids => …`: quando un file torna bloccato (`files:locked`) il sistema chiude solo quelle schede. Per sapere che la finestra è stata chiusa davvero, e non ricreata, ascolta `win.on('dismiss', …)` (non c'è quando lilOS la chiude per ricrearla).
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

Non aggiungere listener `keydown` per le scorciatoie: registra un comando nel registro `shortcuts` dell'SDK, così l'utente può cambiarlo dal Pannello di controllo → Usabilità → Scorciatoie.

```js
import { shortcuts } from '@lilos/sdk';

shortcuts.register({
  id: 'items.duplicate',                 // stabile: finisce nei dati salvati
  label: 'Duplica gli elementi selezionati',
  group: 'Elementi',                     // sezione nel Pannello di controllo
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

- Chiavi brevi e minuscole (lettere, cifre, `_`, `-`, `:` e `.`, al massimo 120 caratteri: altre il kernel le rifiuta). Collegato al kernel un valore può pesare al massimo 512 KB; senza kernel il prefisso `lilos:` viene aggiunto da solo.
- Valida sempre il valore letto: può essere vecchio, rovinato o modificato a mano.
- Se lo stato cambia molto spesso (durante un trascinamento, per esempio), salva al rilascio oppure con un ritardo, come fa `Canvas` con la camera (300 ms).
- Aggiungi la chiave alla tabella in [Riferimento API → Dati salvati](api.md#dati-salvati).
- Se lo stato è del singolo workspace (come la vista o le finestre aperte), non per tutto lilOS, usa la chiave `ws:<id>:<parte>` (`workspaceKey` in `src/workspaces/store.js`) e aggiungi la parte a `PARTS`, altrimenti non viene cancellata quando il workspace è eliminato. Le preferenze (tema, scorciatoie, menu, tipi di file) restano globali.

`storage` è adatto a impostazioni e stati piccoli: i valori stanno in memoria e il sistema li manda al kernel poco dopo ogni `set`. Il testo dei file non va qui: è `fs.write`.

## Aggiungere uno stile

1. Per una parte del sistema crea `src/styles/<area>.css` e importalo in `src/system.js` dopo `@lilos/sdk/styles.css`. Per un componente dell'SDK crea `sdk/styles/<componente>.css` e importalo da `sdk/styles/index.css`.
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

Gli elementi fissi (Home, Documenti, Immagini, File Manager, Download, Cestino) non sono nel seed: li aggiunge sempre `src/desktop/fixedItems.js` (vedi [desktop/fixedItems.js](api.md#desktopfixeditemsjs)).

Gli elementi di esempio vengono usati solo al primo avvio di un utente, cioè quando la sua cartella è vuota. Per vederli di nuovo accedi con un utente nuovo (`npm run kernel:cli -- users-basic add prova`) oppure usa il Pannello di controllo → Archiviazione → «Scrivania e file iniziali» (elimina anche cartelle e file creati; le chiavi `ws:<id>:…` dei workspace spariti si cancellano da sole all'avvio). Gli elementi di esempio vanno nella Scrivania del workspace «Principale».

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

- Mostra le modifiche reagendo agli eventi `change`, non dopo le tue chiamate: così vedi anche quelle fatte da altre parti (desktop, File Manager).
- In una finestra togli l'iscrizione alla chiusura: `win.on('destroy', off)`.
- I nodi di sistema (`system: true`) non si rinominano né eliminano: disattiva le relative azioni. Per eliminare dall'interfaccia usa `confirmRemove` (`src/items/confirmRemove.js`), che rispetta le impostazioni `deleteConfirm` e `deletePermanent` (di norma sposta nel cestino) e, con una `UndoStack`, rende l'eliminazione annullabile (vedi [Aggiungere annulla e ripeti a un'app](#aggiungere-annulla-e-ripeti-a-unapp)).
- Per selezionare, aprire, rinominare ed eliminare con le scorciatoie comuni, iscrivi la tua vista con `addTarget` (`src/items/targets.js`), come fa il File Manager.

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
3. Dopo ogni azione che si può annullare, `stack.push({ label, undo, redo })`. L'`label` finisce nella notifica ("Annullato: …"), quindi scrivila come un'azione: `Elimina «nota.txt»`. In alternativa `await stack.run({ label, do, undo })` fa l'azione e la registra.
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
- Aprire File Manager sulla vista di un tag: `launch('files', { tag: tag.id })`. Aprire il Pannello di controllo → Tag: `launch('settings', { tab: 'tags' })`.
- Mettere o togliere un tag non si annulla con Ctrl Z: non c'è una voce nella cronologia.

## Rendere trascinabili file e cartelle in un'app

Se la tua app mostra file e cartelle (un elenco, un albero, una griglia), usa `src/items/itemDrag.js`: così si trascinano da e verso scrivania, File Manager ed Editor, con lo stesso aspetto e lo stesso annulla. Non usare il drag and drop nativo di HTML5 (vedi [D30](../interna/decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle)). Contratti completi: [Riferimento API → itemDrag.js](api.md#itemdragjs).

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
2. **`dropZone(el, zone)`** per le aree che accettano rilasci senza essere una cartella marcata. `zone.folder(hit)` dice in quale cartella vanno i nodi (`null` = niente rilascio); `hit` è l'elemento sotto il puntatore, utile per decidere in base alla riga. Per una zona che non sposta ometti `folder` e dai `drop(ids, ev, stack)` e, se serve, `accepts(ids)`. Se la stessa area deve fare cose diverse a seconda del punto (la barra laterale del File Manager: centro di una voce = sposta, bordo = crea un collegamento), usa `target(hit, x, y, ids)` e restituisci `{ el, run }`: marcare ogni voce con `markItem` non basterebbe.
3. **`dragItems(e, options)`** dal `pointerdown` (sinistro) di un elemento selezionato. Passa sempre `stack`: se lo ometti lo spostamento funziona ma non si annulla. `onEnd({ moved })` distingue un clic da un trascinamento: usalo per restringere la selezione, come fa il File Manager.
4. **Non gestisci tu il resto**: il fantasma, l'evidenziamento (`.drop-target`), Esc e il blocco sopra le finestre sono già fatti. `ghost: false` se vuoi muovere tu gli elementi (come fa la scrivania).
5. **Evidenziare altro** della zona stessa: `highlight(folder)` restituisce l'elemento che prende `.drop-target` (nell'Editor, la riga della cartella o l'intero pannello).
6. **Elementi che non devono riceverne né darne**: non marcarli (il File Manager non marca le righe del cestino e non avvia il trascinamento lì). Per il menu «Aggiungi alla barra laterale del File Manager» metti `linkEntry(ids)` nel tuo menu: restituisce `null` se non serve, quindi filtra con `.filter(Boolean)`.
7. **Togli la zona alla chiusura**: `dropZone` restituisce la funzione che la toglie. Gli elementi marcati spariscono col loro DOM.

Prova: trascina un file dalla tua vista sulla scrivania e su una finestra del File Manager; con Ctrl Z nella tua vista deve tornare dov'era.

## Creare un'app installabile (pacchetto)

Un pacchetto è una cartella con `lilos.json` (il manifesto) e i suoi file. Il codice gira, per impostazione predefinita, in un iframe isolato e parla con lilOS solo con l'oggetto `lilos` (contratto in [API → apps/packages](api.md#appspackages)); un amministratore può far girare l'app anche **non isolata**, nella pagina di lilOS, dove potrebbe fare tutto ciò che fa l'utente: scrivi il codice in modo che funzioni uguale nei due modi, usando solo `lilos` e `root` (niente `document.body`, niente `fetch` verso lilOS, niente `window.parent`). Le app di sistema sono un'altra cosa: vedi [Aggiungere o aggiornare un'app di sistema](#aggiungere-o-aggiornare-unapp-di-sistema). Un esempio completo è in `examples/apps/note/`.

1. Crea la cartella con il manifesto minimo:

   ```json
   {
     "id": "acme.note",
     "version": "1.0.0",
     "kind": "local",
     "name": "Note",
     "icon": { "glyph": "file", "color": "#d9822b" },
     "publisher": { "id": "acme", "name": "Acme" },
     "sdk": "2",
     "entry": "index.js",
     "permissions": ["fs.write:~/Documenti/Note"],
     "contributes": { "window": { "width": 640, "height": 420 } }
   }
   ```

   L'`id` è minuscolo, con cifre, punti e trattini (2-64 caratteri). `entry` è **un solo modulo ES** con tutto ciò che importa già dentro (niente `import` verso altri file). Le librerie esterne si elencano in `libraries` con `integrity` (e `cache: true` per farle tenere al kernel). `"sdk": "2"` vuol dire che il modulo esporta una funzione per punto d'ingresso; con `"1"` il modulo è l'app stessa, gira per intero all'avvio con `lilos` globale e solo isolato (e non può avere `entrypoints`).
2. Scrivi `index.js`: esporta `main`, la finestra che apre l'utente. Riceve `lilos` (le funzioni sono asincrone), `root` (dove disegnare) e `args`:

   ```js
   export async function main({ lilos, root }) {
     const { files, ui, window: win } = lilos;
     win.setTitle('Note');
     const area = document.createElement('textarea');
     area.value = await files.read('~/Documenti/Note/uno.txt');
     root.append(area);
     ui.notify({ text: 'Aperta', level: 'success' });
     return () => { /* facoltativo: chiamata quando la finestra si chiude */ };
   }
   ```

   Per i dati dell'app bastano `lilos.storage.get(chiave)` e `lilos.storage.set(chiave, valore)`. I nomi che arrivano dall'utente si mettono con `textContent`, mai con `innerHTML`.
3. Calcola gli hash e controlla il manifesto, ogni volta che cambi un file:

   ```bash
   node system/kernel/tools/pack.js examples/apps/note
   ```

   Scrive in `files` ogni file della cartella con il suo hash (esclusi `lilos.json`, i file che iniziano con un punto e `node_modules`), controlla il manifesto e stampa l'id, la versione e il numero di file.
4. Facoltativo, per firmarlo (così il kernel può verificarlo):

   ```bash
   node system/kernel/tools/pack.js --keygen acme.pem          # chiave privata: tienila segreta; stampa la chiave pubblica
   node system/kernel/tools/pack.js examples/apps/note --sign acme.pem
   ```

   Chi installa deve fidarsi dell'editore: mette la chiave pubblica in `system/kernel/config.json`, in `"apps": { "trustedPublishers": { "acme": "ed25519:…" } }`. Una firma che non corrisponde al manifesto è sempre rifiutata; un'app senza firma, o di un editore sconosciuto, si installa solo con `allowUnsigned`.
5. Installala (ricetta successiva). Per cambiare il codice: ripeti `pack.js`, poi aggiorna con `reinstall` (stessa versione) oppure alza `version` e aggiorna.

`install`, `update` e `uninstall` nel manifesto sono elenchi di operazioni (`mkdir`, `write`, `copy`, `desktopItem`, `tag`, `setting`, e `remove` solo in `uninstall`) che lilOS esegue **per ogni utente** la prima volta che incontra l'app, senza sovrascrivere nulla. Ogni operazione che tocca file chiede il permesso `fs.write` sul percorso; `desktopItem` chiede `desktop.items`, `tag` chiede `tags.write`. I percorsi iniziano con `~` (la cartella dell'utente) e si scrivono con i nomi che si vedono nel File Manager (`~/Documenti/Note`). Dettagli in [API → apps/packages](api.md#appspackages).

Le scorciatoie si dichiarano in `contributes.commands` (`{ id, label, keys }`: l'`id` inizia con l'id dell'app e `keys` richiede il permesso `ui.shortcuts`); l'app le riceve come evento `lilos.on('command', id => …)` e l'utente le cambia nel Pannello di controllo → Usabilità → Scorciatoie. Le estensioni che l'app apre si dichiarano in `contributes.fileTypes`.

## Aggiungere un punto d'ingresso a un'app

Un punto d'ingresso è una parte dell'app che si avvia da sola, con o senza finestra: serve per fare lavoro senza interfaccia (contare, cifrare, sincronizzare) o per avere più finestre. Solo per le app con `"sdk": "2"`. L'esempio `examples/apps/note/` ha un background `stats` che conta le parole delle note.

1. Dichiara il punto d'ingresso nel manifesto (`main` è sempre una finestra e c'è anche se non lo scrivi):

   ```json
   "entrypoints": {
     "main": { "kind": "window" },
     "stats": { "kind": "background", "label": "Conta le parole delle note" }
   }
   ```

   Il nome è `/^[a-z][a-zA-Z0-9]{0,30}$/` ed è il nome dell'export. Con `file` un punto d'ingresso vive in un altro file del pacchetto (`.js` o `.mjs`); `label` è il titolo di una finestra o il nome nella barra per un background; `window: { width, height }` vale solo per le finestre.
2. Esporta la funzione con quel nome. Un background non ha `root`; risponde con `lilos.handle`:

   ```js
   export function stats({ lilos }) {
     lilos.handle(async (data, { from }) => {
       const list = (await lilos.files.list('~/Documenti/Note')).filter(f => f.type === 'file');
       return { notes: list.length };   // il valore torna a chi ha chiamato
     });
   }
   ```
3. Chiamalo dalla stessa app con `await lilos.app.call('stats', dati)`. Se è una finestra, si apre (o torna in primo piano) con `dati` come `args` e la risposta è `null`. Per un canale continuo usa `lilos.app.connect('stats')` (una `MessagePort`; il background riceve l'evento `connect`).
4. Per chiamare l'azione di **un'altra app** dichiara `apps.call:<id dell'altra app>` tra i `permissions` e usa `lilos.apps.call('altra.app', 'cifra', dati)`. Un `file` si può passare solo se l'app lo ha ricevuto (aperto con lei o passatole); il resto dei dati arriva così com'è: chi risponde deve controllarne la forma e le dimensioni, perché non sa chi lo ha costruito.
5. Un background si ferma da solo dopo 5 minuti senza chiamate. Se deve restare (per esempio tiene chiavi in memoria) chiama `lilos.app.keepAlive()`: compare l'icona nella barra e l'utente può fermarlo. Cambiare modalità di esecuzione, aggiornare o rimuovere l'app lo ferma.

Per chiamare un punto d'ingresso da un'app di sistema: `callEntrypoint(appId, entry, data)` di `@lilos/system` (non servono permessi). Per le app di sistema ogni punto d'ingresso è un export con quel nome del loro modulo.

## Mostrare l'anteprima dei file della tua app

Il File Manager sa mostrare testo e SVG; per gli altri tipi di file può farla la tua app. Solo per `"sdk": "2"`. Contratto completo: [riferimento API](api.md#anteprima-dei-file-fatta-dalle-app-filepreviewjs).

1. Fai aprire alla tua app il tipo di file (vedi [Far aprire dei file alla tua app](#far-aprire-dei-file-alla-tua-app)): l'anteprima la fa l'app che apre quel tipo, cioè la scelta dell'utente o l'app predefinita.
2. Dichiara un punto d'ingresso `background` di nome `filePreview`:

   ```json
   "entrypoints": {
     "main": { "kind": "window" },
     "filePreview": { "kind": "background" }
   }
   ```
3. Esporta la funzione `filePreview` e rispondi con `{ text }`, `{ image }` (un `Blob` `image/*`) o `{ html }`, più una `note` facoltativa:

   ```js
   export function filePreview({ lilos }) {
     lilos.handle(async ({ file }) => {
       const image = await lilos.files.read(file, { bytes: true });   // un Blob con il tipo dell'estensione; il file è solo da leggere
       return { image, note: 'Disegno' };
     });
   }
   ```
4. Rispondi `null` quando non c'è niente da mostrare: il File Manager userà la sua anteprima.
5. **Miniature (facoltativo).** La stessa risposta serve per le miniature (scrivania con «Mostra l'anteprima dei file», «Vista anteprime» del File Manager): lilOS le prende **solo** se rispondi con `image`; `text`, `html` e `null` lasciano l'icona. In `data.size` (se c'è) arriva il lato lungo voluto in pixel, piccolo per una miniatura: rimpicciolisci l'immagine a quella misura, senza ingrandirla, così la miniatura è leggera. Senza `size` scegli tu. Le miniature le chiede lilOS solo per le icone sullo schermo e le tiene in memoria; i file con contenuto di un'app (FileCrypt) non ne hanno. Dettagli: [Miniature dei file](api.md#miniature-dei-file-thumbnailsjs).

Da ricordare: hai 10 secondi; `text` e `html` al massimo 1 MB, `image` 20 MB; l'`html` viene ripulito (niente script, link, form, risorse esterne: immagini e font solo `data:`) e gira in un iframe senza permessi; non puoi scrivere il file né passarlo ad altre app. Se sbagli, l'utente vede l'anteprima di sempre e tu un avviso in console.

Vuoi invece **mostrare** le anteprime di altre app (per esempio in un tuo file manager)? Chiedi il permesso `fs.preview` e usa `lilos.files.preview(rif, { size })` sui file che puoi già leggere: ricevi la stessa risposta (`text`, `html` o `image`), con l'`html` da mettere in un `<iframe sandbox="" srcdoc>` ([dettagli](api.md#anteprima-dei-file-fatta-dalle-app-filepreviewjs)).

## Tradurre un'app

Un'app installata o di sistema ha un solo file di traduzioni, con l'inglese come lingua predefinita. Formato completo e regole: [API → Traduzioni delle app](api.md#traduzioni-delle-app-sdkcorelocalejs-e-sdkcorei18njs).

1. Scrivi nel manifesto i testi **in inglese** e indica il file (solo app `local`):

   ```json
   { "name": "Notes", "description": "Take notes.", "locales": "locales.json" }
   ```
2. Crea `locales.json` accanto al manifesto. `en` è obbligatoria; per ogni testo del manifesto aggiungi la chiave `@`:

   ```json
   {
     "en": { "strings": { "@name": "Notes", "@description": "Take notes.", "save": "Save", "notes.count": { "one": "{n} note", "other": "{n} notes" } } },
     "it": { "strings": { "@name": "Note", "@description": "Prendi appunti.", "save": "Salva", "notes.count": { "one": "{n} nota", "other": "{n} note" } } }
   }
   ```
3. Nel codice usa `lilos.locale.i18n.t()` quando disegni (non quando il modulo si carica) e ridisegna con `lilos.on('locale', …)`:

   ```js
   export function main({ lilos, root }) {
     const { t } = lilos.locale.i18n;
     const draw = () => { root.textContent = `${t('save')} · ${t('notes.count', { n: 3 })}`; };
     draw();
     lilos.on('locale', draw);
   }
   ```
4. Se `locales.json` è tra i file del pacchetto, `pack.js` lo mette in `files` con il suo hash. Il kernel lo controlla all'installazione: un file non valido (manca `en`, forma plurale senza `other`, tag di lingua sbagliato…) fa fallire l'installazione.
5. Per provare: Pannello di controllo → Lingua, scegli la lingua. Una lingua che l'app non ha ricade su `en`; una chiave mancante mostra la chiave e scrive un avviso in console.

Le app ufficiali usano `appI18n(id, tabella)` di `src/shared/i18n.js` nel repository [lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official), che dà `locale.forApp(id).i18n` e ha un ripiego per i lilOS più vecchi, e controllano i file con `scripts/check-locales.mjs`.

## Intervenire su un evento con una pipe

Una pipe fa stare la tua app in mezzo a un'operazione del sistema (aprire, leggere o salvare un file, avviare un'app) per cambiarla o fermarla. Per l'esempio, un'app `acme.trim` toglie gli spazi in fondo ai file di testo **che ha segnato lei**. Serve `"sdk": "2"`, un punto d'ingresso `background` e un permesso per l'evento. Riferimento: [pipes](api.md#sdkcorepipesjs-e-sdkcorepipecatalogjs) e [decisione D47](../interna/decisioni.md#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt).

1. Nel manifesto dichiara il punto d'ingresso, il permesso e la pipe. Con `where: { meta: 'own' }` basta `pipe.own:<evento>` (solo i tuoi file); senza serve `pipe:<evento>` (ogni file):

   ```json
   "entrypoints": {
     "main": { "kind": "window" },
     "trim": { "kind": "background", "label": "Pulisce i file segnati" }
   },
   "permissions": ["pipe.own:file.write"],
   "contributes": {
     "pipes": [
       { "event": "file.write", "stage": "before", "entry": "trim", "position": "last", "where": { "meta": "own" } }
     ]
   }
   ```

   `stage` è `before` (prima del salvataggio: puoi cambiare `content` o fermarlo) o `after` (sul risultato). `position` dice se vuoi essere tra i primi, a metà o tra gli ultimi della catena; l'utente poi può riordinare nel Pannello di controllo → App → Pipe. Gli eventi che si possono cambiare sono `file.open`, `file.read`, `file.write` e `app.launch`; gli altri si possono solo guardare, e quelli di sistema (`session.*`, `apps.*`…) sono delle app di sistema.
2. Nel punto d'ingresso dai la funzione che gestisce l'evento. Ripeti la fase e il `where` del manifesto: i permessi si controllano anche qui, e quelli del manifesto sono la tua iscrizione (non se ne crea una seconda):

   ```js
   export function trim({ lilos }) {
     lilos.pipes.subscribe('file.write', { stage: 'before', where: { meta: 'own' } },
       async ({ node, content }, ctx) => {
         // content è un Blob; ctx = { event, stage, position, total, prev, next, caller }
         const text = (await content.text()).replace(/\s+$/, '');
         return { data: { content: new Blob([text]) } };   // o niente, o { stop: { error: 'Non si salva' } }
       });
   }
   ```

   Si prendono solo i campi che l'evento lascia cambiare in quella fase (per `file.write`/`before` è `content`). Se la funzione lancia un errore o non risponde entro 15 secondi, **il salvataggio fallisce**: non viene mai saltata.
3. Segna i file su cui la pipe deve agire. `where: { meta: 'own' }` guarda `node.apps['acme.trim']`: lo imposti con `lilos.files.setMeta(id, { v: 1 })` o salvando con `lilos.files.write(rif, dati, { mark: { v: 1 } })` (contenuto e segno insieme). Il segno è un oggetto di al massimo 1 KB (2 KB in tutto per i dati di tutte le app su un file). Aggiungi `content: true` solo se il contenuto è tuo da leggere (per esempio cifrato): senza la tua app, o se le sue pipe `file.read` / `file.write` non sono attive, lilOS non apre né legge quel file, e la cronologia di annulla ne perde il contenuto. Serve il permesso `pipe:` o `pipe.own:` sia per `file.read` sia per `file.write` (negli esempi sopra aggiungi `pipe.own:file.read`). Per un file con `content: true` le pipe delle altre app non girano e ogni gestore vede solo i tuoi dati in `node.apps`. Se il punto d'ingresso in background si ferma, le finestre dei file tuoi si chiudono; `lilos.files.shown(ids)` dice quali sono mostrati (per non bloccarli per inattività) e `lilos.files.locked(ids)` chiede di chiudere le finestre di file che hai richiuso.
4. I file segnati da te che arrivano in una pipe si possono leggere e scrivere con `lilos.files` (`lilos.files.read(id, { bytes: true })`). Le operazioni che chiedi tu **non passano dai tuoi gestori**, quindi leggere o scrivere lì dentro non ti richiama.
5. Per gli eventi dell'app: dichiarali nel manifesto, così esistono da quando l'app è installata e le altre app si possono iscrivere anche dal loro manifesto (con il permesso `pipe:acme.trim.cleaned`):

   ```json
   "contributes": {
     "events": [{ "name": "acme.trim.cleaned", "label": "File cleaned", "edit": { "after": ["text"] } }]
   }
   ```

   Poi `await lilos.pipes.run('acme.trim.cleaned', { text })` fa passare i tuoi dati dalle pipe di chi si è iscritto e restituisce quelli che tornano. L'etichetta si traduce in `locales.json` con `@events.acme.trim.cleaned.label`. Un evento che nasce solo mentre l'app gira si può dichiarare anche dal codice, con `await lilos.pipes.define('acme.trim.cleaned', { label: 'File pulito', edit: { after: ['text'] } })`.

Per provarla: installa l'app, segna un file, salvalo e controlla il contenuto. Pannello di controllo → App → Pipe mostra la catena di `file.write` con la tua app.

## Aggiungere voci di menu e un segno sull'icona a un'app

Un'app installata aggiunge voci al menu del tasto destro di file e cartelle e un segno sull'icona di ciò su cui ha dati. Serve il permesso `ui.menus` (senza, il manifesto è rifiutato). Esempio, per segnare i file con `acme.trim`:

1. Nel manifesto:

   ```json
   "entrypoints": {
     "main": { "kind": "window" },
     "mark": { "kind": "background" }
   },
   "permissions": ["ui.menus"],
   "contributes": {
     "actions": [
       { "id": "acme.trim.mark", "label": "Segna per la pulizia", "entry": "mark", "on": "file", "glyph": "check", "when": { "meta": "none" }, "many": true }
     ],
     "badge": { "glyph": "check", "label": "Pulito da Acme" }
   }
   ```

   `id` inizia con l'id dell'app; `on` è `file`, `folder` o `item`; `when.meta` `none` vale per i nodi che l'app non ha segnato, `own` per quelli che ha segnato (`when.ext` limita alle estensioni); `many: true` fa comparire la voce anche con più elementi selezionati. `entry` è un punto d'ingresso dell'app (`main` o un altro, non un `service`).
2. Il punto d'ingresso riceve `{ files: [id], action: id }` e può leggere e scrivere quei file. Un background risponde con `lilos.handle`; una finestra li trova negli `args`:

   ```js
   export function mark({ lilos }) {
     lilos.handle(async ({ files }) => {
       for (const id of files) await lilos.files.setMeta(id, { v: 1 });
       lilos.ui.notify({ text: `${files.length} file segnati`, level: 'success' });
     });
   }
   ```
3. Il segno (`badge`) compare da solo sull'icona dei nodi con `apps['acme.trim']`, sulla scrivania e nel File Manager. Le voci compaiono nel menu della scrivania e in quello del File Manager (con `appActionEntries`, se fai una vista tua: vedi [apps/pipes.js, apps/appActions.js e apps/systemEvents.js](api.md#appspipesjs-appsappactionsjs-e-appssystemeventsjs)).
4. Traduzioni: `@actions.acme.trim.mark.label` e `@badge.label` nel `locales.json` (vedi [Tradurre un'app](#tradurre-unapp)).

## Mandare una notifica

Ogni messaggio all'utente è una notifica: non esiste più un messaggio breve in basso. Vale sia per ciò che l'utente deve sapere ma non ha chiesto (un lavoro finito, un errore in sottofondo) sia per la risposta a un suo gesto («Salvato»: usa `level: 'success'`). Non mandare una notifica per ogni passo: ce ne sono al massimo 10 al minuto per app.

**Da un'app** (finestra o background), con `lilos.ui.notify`. Non serve nessun permesso: `ui.notify` ce l'hanno tutte le app.

```js
export async function main({ lilos }) {
  await lilos.ui.notify('Sincronizzazione finita');                  // solo il testo

  await lilos.ui.notify({
    text: 'Non riesco a leggere il file di backup',
    level: 'error',                                                  // 'info' (predefinito), 'success', 'warning' o 'error'
    action: { entry: 'main', args: { vista: 'backup' } },            // un clic apre l'app qui, con questi args
  });
}
```

- Il mittente (nome e icona dell'app) lo mette lilOS. `action` è facoltativa; senza, la notifica si legge e basta.
- Gli `args` dell'azione arrivano all'app come quelli di una finestra aperta con `lilos.app.call`, ma **`file` e `files` vengono tolti**: un'app riceve file solo se l'utente glieli dà.
- Al massimo 10 notifiche al minuto per app: le altre rifiutano la promessa con `rate_limited`. Metti `await` dentro un `try` se mandi notifiche in un ciclo.
- Il testo arriva a 300 caratteri.

**Da un servizio nel kernel**: la stessa funzione, `await lilos.ui.notify({ text, level, action })`. Arriva all'utente proprietario (gli amministratori, per un servizio di sistema) e resta nell'elenco anche se lilOS è chiuso.

**Dal sistema** (`src/`): `notify(testo, { level })` da `notifications/notify.js` per qualsiasi messaggio di lilOS (se il kernel non la prende resta nella pagina fino al ricaricamento); `notifications.send({ text, level, action, app })` dall'SDK per il caso generale.

**Da un modulo del kernel** a un'app o a una pagina aperta, senza passare dalle notifiche: `ctx.emit(userId, 'miomodulo.novita', { … })`. Arriva sul flusso `/api/services-events` come evento con quel nome; per leggerlo in lilOS chiama `onKernelEvent('miomodulo.novita', dati => …)` (`src/apps/services.js`) prima di `connectServices()`. Per notificare un utente da un modulo usa invece `ctx.service('notifications').send(userId, { from: { system: true }, text })`, dichiarando `notifications` in `requires` (così però il kernel non parte senza un modulo che le fornisce).

## Installare un'app dall'esempio

Serve un utente amministratore (`--admin`) e il kernel con `apps.allowLocalSources` acceso (lo è nella `config.json` del repository). Con lilOS aperto in sviluppo, nella console del browser (`lilos.kernel` esiste solo in sviluppo):

```js
await lilos.kernel.request('POST', '/apps', {
  source: { type: 'local', dir: 'C:/percorso/di/lilos/examples/apps/note' },   // percorso assoluto sul computer del kernel
  grant: ['fs.write:~/Documenti/Note', 'ui.shortcuts', 'desktop.items'],      // i permessi del manifesto che non sono impliciti
  allowUnsigned: true,                                                         // l'esempio non è firmato
});
location.reload();
```

L'app compare nel menu di avvio e la prima volta crea `~/Documenti/Note/Benvenuto.txt` e il collegamento sulla scrivania. Dal codice dell'SDK si fa con `apps.install(source, { grant, allowUnsigned })`. Per aggiornare o reinstallare: `POST /apps/<id>/update` con `{ reinstall: true, grant, allowUnsigned }` (o `apps.update`); per rimuovere: `DELETE /apps/<id>` (o `apps.uninstall`). Da un repository: `source: { type: 'git', url: 'https://github.com/proprietario/nome', ref?, path? }` (o `{ type: 'github', repo: 'proprietario/nome' }`); un repository privato si legge con le credenziali git del computer del kernel. Un repository con un `catalog.json` si aggiunge all'AppStore: vedi [Fare un repository non ufficiale](#fare-un-repository-non-ufficiale).

## Usare il kernel dal sistema o dall'SDK

`kernel` (`@lilos/sdk`) è già connesso quando il sistema parte. Per chiavi e nodi non serve: `storage` e `fs` mandano da soli le differenze. Una richiesta propria:

```js
import { kernel, KernelError } from '@lilos/sdk';

try {
  const list = await kernel.request('GET', '/apps');
} catch (err) {
  if (err instanceof KernelError && err.code === 'offline') { /* il kernel non risponde */ }
}
```

`request` aggiunge `/api` al percorso, l'intestazione `X-Lilos: 1` e il cookie. Se il kernel risponde 401 mentre l'utente lavora, il sistema mostra l'accesso e le modifiche in attesa si salvano dopo. Se serve una cosa che il kernel non offre, la strada è un modulo (ricetta successiva), non un endpoint nel frontend.

## Aggiungere un modulo al kernel

1. Crea `system/kernel/modules/<nome>_<x.y.z>/` (il nome è minuscolo, con trattini) con un `module.json`:

   ```json
   { "name": "mio", "version": "1.0.0", "description": "Che cosa fa", "kernel": "1", "provides": [], "requires": ["fs"] }
   ```

   `name` e `version` devono corrispondere alla cartella. `provides` e `requires` sono nomi di servizi: `auth`, `users` e `fs` hanno un'interfaccia che il kernel controlla (vedi [API → Il kernel](api.md#il-kernel)); un modulo può definirne di propri.
2. Scrivi `index.js`:

   ```js
   export default {
     async init(ctx) {
       const fs = ctx.service('fs');                                                  // solo servizi in "requires"
       ctx.route('GET', '/ciao', ({ principal }) => ({ ciao: principal.username }));  // /api/modules/mio/ciao, solo con l'accesso fatto
     },
     async stop() {},
     commands: { async saluta({ args }) { console.log('ciao', args.positional[0]); } },   // npm run kernel:cli -- mio saluta <nome>
   };
   ```
3. Attivalo in `system/kernel/config.json`, dentro `modules`: `{ "name": "mio", "version": "1.0.0", "config": { … } }` (`ctx.config` riceve quell'oggetto). Senza `version` si usa la più alta installata. Se ha dipendenze npm, mettile in un `package.json` del modulo (con il suo `package-lock.json`) e lancia `npm run kernel:setup`.
4. Riavvia il kernel. Un modulo che dichiara un servizio e non lo fornisce, o che non ha i metodi che il kernel chiama, non parte.

Questa è la strada a mano. Per distribuirlo, vedi la ricetta successiva: un modulo in un repository si installa dall'AppStore.

## Aggiungere un protocollo di rete

Un protocollo è un modulo del kernel che fornisce il servizio `netfs.<protocollo>`: la cartella **Rete**, la finestra «Connetti a un server» e i trasferimenti lo usano senza altre modifiche. Il modello da copiare è `netfs-sftp_1.0.0`. Contratto completo: [API → Rete](api.md#rete-connessioni-e-trasferimenti-net-apinetjs).

1. Crea il modulo come in [Aggiungere un modulo al kernel](#aggiungere-un-modulo-al-kernel), con `"provides": ["netfs.mio"]` e `"requires": []`. Il nome del protocollo (`mio`) è `[a-z][a-z0-9-]{0,30}`.
2. Nell'`init` fornisci il servizio:

   ```js
   const label = (en, it) => ({ en, it });
   const netError = (net, message) => Object.assign(new Error(message), { net });   // net: 'auth', 'not_found', 'unreachable'…

   export default {
     async init(ctx) {
       ctx.provide('netfs.mio', {
         label: label('My protocol', 'Il mio protocollo'),
         order: 60,
         fields: [
           { key: 'host', type: 'text', label: label('Server', 'Server'), required: true },
           { key: 'user', type: 'text', label: label('User', 'Utente'), required: true },
           { key: 'password', type: 'password', label: label('Password', 'Password'), secret: true, required: true },
           { key: 'path', type: 'text', label: label('Remote folder', 'Cartella remota'), default: '/' },
         ],
         address: v => `mio://${v.user}@${v.host}${v.path === '/' ? '' : v.path}`,
         async connect(values, { secret, trust, signal }) {
           // 1. verifica il server PRIMA di mandare le credenziali; se non è fidato:
           //    throw Object.assign(netError('untrusted', 'Server da confermare'), { trust: { kind: 'ssh', fingerprint, text } });
           // 2. entra con values.user e secret.password (credenziali sbagliate: netError('auth', …))
           return {
             resume: { read: true, write: true },
             async list(path) { return [{ name: 'a.txt', type: 'file', size: 12, modified: Date.now() }]; },
             async stat(path) { return null; },
             async read(path, { start = 0, signal }) { /* Readable dei byte */ },
             async write(path, source, { start = 0, signal, size }) { /* scrive lo stream */ },
             async mkdir(path) {},
             async rename(from, to) {},
             async remove(path, { folder }) {},
             onLost(fn) { /* chiama fn() se la connessione cade da sola */ },
             async close() {},
           };
         },
       });
     },
   };
   ```
3. Usa `label` con `{ en, it }` per tutto ciò che l'utente legge (etichette, suggerimenti). I campi con `secret: true` arrivano in `secret`, mai in `values`; `when` mostra un campo solo se altri hanno certi valori.
4. Lancia solo errori con `net` (`auth`, `untrusted`, `not_found`, `exists`, `denied`, `unreachable`, `lost`, `unsupported`, `invalid`): il kernel li traduce in codici e messaggi. Un errore `lost` o `unreachable` fa riaprire la connessione da sola.
5. Se il protocollo sa dire quando una cartella cambia, aggiungi `watch(path, onChange)` che restituisce `stop()`: la pagina si aggiorna da sola. Se sa elencare ciò che un server offre, aggiungi `shares(values, { secret, trust })`.
6. Se l'utente ha un account sul sito di un fornitore (come OneDrive), niente password: metti un campo `{ key: 'account', type: 'signin', required: true, label, button }` e `signIn: { start, finish }` (OAuth 2.0 con PKCE). `start({ values, redirectUri, state, challenge })` dà l'indirizzo della pagina del fornitore (passa `state` e `challenge`, con `code_challenge_method=S256`); `finish({ values, code, redirectUri, verifier })` scambia il codice e restituisce `{ account, secret }`: `account` è il testo che la pagina mostra, `secret` (per esempio il token di aggiornamento) arriva a `connect` in `secret.account`. Se il fornitore cambia il token a ogni rinnovo, chiama `saveSecret({ account: nuovo })`. Se il fornitore lo rifiuta lancia `netError('auth', …)`: la pagina chiede un nuovo accesso. Dichiara `ready()` (che restituisce un'etichetta finché manca una configurazione, `null` quando è pronto), e se serve `links`, `recycles`, `removeTree` e `link(path)`. Il kernel e il File Manager fanno il resto: finestra, attesa, callback `/api/net/signin/callback` e nuovo accesso. Il contratto: [Accesso con un fornitore](api.md#accesso-con-un-fornitore-netsigninjs).
7. Attiva il modulo in `config.json`, `npm run kernel:setup` se ha dipendenze e riavvia il kernel. La sezione **Rete** del File Manager mostra il nuovo protocollo nell'elenco.

## Dare impostazioni a un modulo del kernel

Quello che un amministratore deve poter cambiare (un ID, una scelta, un interruttore) si dichiara in `module.json` e il Pannello di controllo lo disegna da sé. Esempio con OneDrive: `modules/netfs-onedrive/` nel repository ufficiale.

1. In `module.json` aggiungi `settings`, campi come quelli di un protocollo (`text`, `textarea`, `number`, `select`, `checkbox`; niente `secret`):

   ```json
   "settings": [
     { "key": "clientId", "type": "text", "label": { "en": "Client ID", "it": "ID del client" } },
     { "key": "mode", "type": "select", "default": "a", "label": "Modo", "options": [{ "value": "a", "label": "A" }, { "value": "b", "label": "B" }] }
   ],
   "defaultConfig": { "mode": "a" }
   ```
2. Nel modulo leggi `ctx.config` e, se vuoi che i cambi valgano subito, ascolta `ctx.onConfig` (senza, valgono dal prossimo avvio):

   ```js
   async init(ctx) {
     let conf = ctx.config;
     ctx.onConfig(config => { conf = config; });   // dopo ogni cambio fatto da un amministratore
   }
   ```
3. Dalla pagina: `await kernelModules.settings('mio')` → `{ fields, values, live }` e `await kernelModules.saveSettings('mio', { clientId: '…', mode: 'b' })` (solo amministratori, solo per moduli in esecuzione). I valori si controllano con i campi; le chiavi assenti prendono il `default` o si tolgono.
4. Se il modulo fornisce protocolli di rete, a ogni cambio le connessioni aperte si chiudono e si riaprono al primo uso con le nuove impostazioni.
6. Attiva il modulo in `config.json`, `npm run kernel:setup` se ha dipendenze e riavvia il kernel. La sezione **Rete** del File Manager mostra il nuovo protocollo nell'elenco.
## Aggiungere un protocollo di terminale

Un protocollo di terminale è un modulo del kernel che fornisce il servizio `term.<protocollo>`: l'app **Terminale** (schede remote, comandi `ssh`/`telnet`/`rlogin`/`supdup`, host salvati, sessioni che restano aperte) lo usa senza altre modifiche. Il modello da copiare è `term-telnet_1.0.0` (senza dipendenze); per l'accesso con password, `term-ssh_1.0.1`. Contratto completo: [API → Terminali remoti](api.md#terminali-remoti-term-apitermjs).

1. Crea il modulo come in [Aggiungere un modulo al kernel](#aggiungere-un-modulo-al-kernel), con `"provides": ["term.mio"]` e `"requires": []`.
2. Nell'`init` fornisci il servizio:

   ```js
   import net from 'node:net';

   const label = (en, it) => ({ en, it });

   export default {
     async init(ctx) {
       ctx.provide('term.mio', {
         label: label('My protocol', 'Il mio protocollo'),
         order: 50,
         port: 4000,
         secure: false,   // oppure values => values.tls === true
         fields: [
           { key: 'host', type: 'text', label: label('Server', 'Server'), required: true },
           { key: 'port', type: 'number', label: label('Port', 'Porta'), min: 1, max: 65535, placeholder: '4000' },
         ],
         address: v => `mio://${v.host}${v.port ? `:${v.port}` : ''}`,
         async open(values, ctx) {
           const socket = net.connect({ host: values.host, port: values.port || 4000 });
           await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject); });
           ctx.signal.addEventListener('abort', () => socket.destroy(), { once: true });
           // Se il server vuole una password: const password = await ctx.ask('Password: ');
           const dataFns = [], closeFns = [];
           socket.on('data', d => dataFns.forEach(fn => fn(d)));
           socket.on('close', () => closeFns.forEach(fn => fn({ reason: '' })));
           return {
             onData: fn => dataFns.push(fn),
             onClose: fn => closeFns.push(fn),
             write: data => socket.write(data),
             resize(cols, rows) { /* se il protocollo lo sa dire al server */ },
             pause: () => socket.pause(),
             resume: () => socket.resume(),
             close: () => socket.destroy(),
           };
         },
       });
     },
   };
   ```
3. I byte della sessione sono quelli di uno xterm (UTF-8 e sequenze ANSI) in entrambe le direzioni: se il server parla un'altra lingua (come SUPDUP), traducila dentro il modulo (`term-supdup` è l'esempio). Il kernel converte la codifica scelta dall'utente (`iso-8859-1`, `cp437`…) da solo.
4. Quello che serve all'utente e non è salvato si chiede con `ctx.ask(prompt, { echo })` (la password, senza eco, con Invio) e il server o il certificato si fanno confermare con `ctx.confirm({ kind, fingerprint, text })`: il kernel ricorda la risposta per protocollo, host e porta. Non chiedere mai le credenziali in altri modi: non passano dalla pagina.
5. Lancia solo errori con `net` (`auth`, `untrusted`, `unreachable`, `lost`, `invalid`…) e controlla `ctx.signal` nelle attese lunghe: se l'utente chiude la scheda mentre ci si collega, il collegamento deve finire.
6. Dichiara `signals: ['break', …]` nella sessione se il protocollo ha comandi speciali che il menu **Tasti** deve offrire, e `info: { … }` per ciò che la barra di stato mostra. `secure` dice se ciò che passa è cifrato: l'app avverte l'utente quando non lo è.
7. Attiva il modulo in `config.json`, `npm run kernel:setup` se ha dipendenze e riavvia il kernel. Il protocollo compare nell'elenco dei protocolli del **Terminale** (i comandi `ssh`, `telnet`, `rlogin` e `supdup` della sua shell sono dell'app, non del modulo: un protocollo nuovo si sceglie dall'elenco della finestra del nuovo host).

## Aprire terminali remoti da un'app installata

Serve il permesso `term` nel manifesto. Il terminale vero e proprio lo disegna l'app (nell'app ufficiale è xterm.js); lilOS e il kernel portano i byte.

```js
// nella finestra dell'app (sdk '2'): i byte del server arrivano alla porta, i tasti ci vanno dentro
const { sessions } = await lilos.term.load();                // gli host e le sessioni dell'utente
const session = await lilos.term.open({ protocol: 'ssh', values: { host: 'example.com', user: 'ann' } });
const port = await lilos.term.attach(session.id, { cols: 80, rows: 24 });
port.onmessage = e => {
  if (typeof e.data !== 'string') return terminal.write(new Uint8Array(e.data));
  const msg = JSON.parse(e.data);                            // state, trust, taken, gone
  if (msg.t === 'trust') port.postMessage(JSON.stringify({ t: 'trust', ok: askUser(msg.trust) }));
};
terminal.onData(text => port.postMessage(new TextEncoder().encode(text)));
```

- Una password non salvata non si passa dall'app: la chiede il terminale e la scrive l'utente (i suoi tasti vanno alla domanda).
- Per una voce come «Apri terminale SSH qui» (oggi del Terminale, azione `terminal.sshHere`) nel menu dei file delle connessioni SFTP: azione con `when: { net: ['sftp'] }` e `lilos.term.openHere(id)` (l'`id` è il nodo passato all'azione).
- Per aggiornare l'elenco ascolta `lilos.on('term', what => …)` (`'hosts'` o `'sessions'`).
- Con `lilos.term.close(id)` la sessione finisce; chiudere la finestra la lascia aperta per 10 minuti, finché l'utente non la riprende.

## Pubblicare un modulo del kernel come pacchetto

Un modulo in un repository si installa, si aggiorna e si toglie dall'AppStore (Moduli del kernel), con il riavvio del kernel. Decisione: [D40](../interna/decisioni.md#d40-i-moduli-del-kernel-si-installano-come-pacchetti-e-valgono-dopo-il-riavvio). Contratti: [API → Moduli come pacchetti](api.md#moduli-come-pacchetti-modulepackagejs).

1. Nel repository crea una cartella (per esempio `modules/mio/`; il nome della cartella non conta: il kernel la copia in `modules/<nome>_<versione>/`) con `module.json` e `index.js` come in [Aggiungere un modulo al kernel](#aggiungere-un-modulo-al-kernel), più:

   ```json
   {
     "name": "mio", "version": "1.0.0", "description": "Che cosa fa", "kernel": "1",
     "provides": [], "requires": ["fs"],
     "data": ["dati.json"],
     "defaultConfig": { "chiave": "valore" }
   }
   ```

   - `description` (fino a 300 caratteri) la mostra l'AppStore.
   - `icon` (facoltativo) è `{ "glyph": "user", "color": "#5f6673" }`, come per le app: l'AppStore lo usa per la card.
   - `defaultConfig` è la configurazione con cui il kernel accende il modulo in `config.json` quando lo si installa.
   - `data` elenca i file in cui il modulo tiene i suoi dati (nomi semplici, nella cartella del modulo; leggili da `ctx.dir`). Negli aggiornamenti passano alla nuova versione; alla rimozione la cartella che li contiene **resta**. Lascialo fuori se il modulo non ha dati propri.
   - Le dipendenze npm vanno in `package.json` con il suo `package-lock.json`: il kernel lancia `npm ci --omit=dev --ignore-scripts`, quindi niente pacchetti con script di installazione.
2. Aggiungi la cartella a `modules` in `catalog.json`. Se vuoi, metti nella cartella un `README.md`: l'AppStore lo mostra nei dettagli del modulo.
3. Committa e crea il tag `vX.Y.Z` (alza `version` a ogni rilascio; le due versioni più recenti restano sul disco).
4. Da amministratore: AppStore → Kernel → Installa. Un modulo non ufficiale chiede di confermare l'avviso (gira nel kernel con accesso completo). Prima di scrivere in `config.json`, il kernel controlla che si avvierebbe con quel modulo (dipendenze, un modulo `fs`, `auth` o `host` locale): se no, dice perché e non cambia nulla. Poi **Riavvia il kernel**.

## Pubblicare una versione di lilOS

Una versione di lilOS (la pagina, il kernel, ciò che il kernel usa dell'SDK) si pubblica nel repository ufficiale come build, mai come sorgenti, e un amministratore la installa dall'AppStore. Decisione: [D57](../interna/decisioni.md#d57-lilos-si-aggiorna-dal-repository-ufficiale-come-un-pacchetto). Contratti: [API → lilOS come pacchetto](api.md#lilos-come-pacchetto-systempackagejs).

1. Alza `version` in `package.json` (la versione di lilOS è quella: `system.json` la copia). Se la versione nuova cambia l'API dei moduli o le versioni di `sdk` delle app (`KERNEL_API` in `modules.js`, `SDK_VERSIONS` in `manifest.js`), ricordati che gli utenti con moduli o app vecchi non potranno aggiornare finché non li aggiornano.
2. Salva tutto in un commit: `npm run release` rifiuta di partire con modifiche non salvate (`--allow-dirty` solo per provare; i file si prendono dalla cartella di lavoro).
3. Metti il tag `v<versione>` su quel commit: il changelog nasce dai messaggi dei commit dal tag della versione prima.
4. Con una copia del repository ufficiale accanto:

   ```bash
   npm run release -- ../lilos-plugins-official
   ```

   Il comando costruisce la pagina, impacchetta e minifica il kernel con Vite (con quello che usa dell'SDK), calcola gli hash e scrive `system/lilos/` (`web/`, `system/kernel/`, `package.json`, `system.json`), aggiunge a `CHANGELOG.md` la sezione della versione e mette `"system": "system/lilos"` in `catalog.json`. `README.md` lo scrive solo se manca.
5. Apri `system/lilos/CHANGELOG.md` e riscrivi la sezione nuova: sono messaggi di commit, vanno resi comprensibili a chi amministra lilOS.
6. Nel repository ufficiale: commit e tag `vX.Y.Z` come per le app. L'AppStore legge sempre l'ultimo tag.
7. Provala prima su un lilOS installato (vedi [Installare lilOS da una release](#installare-lilos-da-una-release)): AppStore → lilOS → **Aggiorna**, poi **Riavvia il kernel**. Per vedere il ritorno automatico, rendi la versione volutamente non avviabile in una prova e controlla che `current.json` torni alla precedente con `failed`.

Un'app che funziona solo da una certa versione di lilOS lo dice nel manifesto con `lilos` (per esempio `"lilos": ">=1.8.0"`): il kernel non la installa su una versione fuori intervallo, e non aggiorna lilOS a una versione che la lascerebbe fuori.

## Installare lilOS da una release

La prima installazione di un lilOS che si aggiorna dall'AppStore. Serve Node.js 22 o più recente, `git` e, con la configurazione di serie, PostgreSQL. La release è la cartella `system/lilos` del repository ufficiale (o la sua copia).

```bash
cd lilos-plugins-official/system/lilos
node system/kernel/tools/install.js ../../../lilos-installato
cd ../../../lilos-installato
node releases/1.8.0/system/kernel/cli.js users-basic add eugenio --admin
node run.js
```

- Senza `--from` usa la configurazione della release e installa i suoi moduli dal repository ufficiale.
- Con `--from <cartella>` prende `config.json`, `repos.json` e `modules/` (con i dati, per esempio gli utenti) da `system/kernel` di una copia del repository o da un altro lilOS installato: stesso database, quindi stessi utenti e file. I moduli ripartono senza `node_modules`: l'installazione li rifà dai lockfile. Un modulo copiato senza `source.json` che è uguale a quello del repository ufficiale (stessa versione, stesso codice) viene riscritto da lì, tenendo i dati, così l'AppStore lo aggiorna; gli altri restano «installati a mano» e lo script lo dice.
- Rifiuta una cartella dove lilOS è già installato (`current.json`): da lì le versioni nuove arrivano dall'AppStore.
- Il kernel serve anche la pagina, su `http://127.0.0.1:8790` (porta di `config.json`): non servono Vite né `npm run dev`.
- Per passare a un'altra cartella dati, `LILOS_DATA_DIR` cambia dove stanno `config.json`, `repos.json` e `modules/`.

## Fare un repository non ufficiale

Qualunque repository git con un `catalog.json` alla radice si aggiunge all'AppStore (Opzioni → Aggiungi un repository) e offre app e moduli. Le app di un repository non ufficiale non possono essere di sistema (`system: true` è rifiutato) e sono "non verificate": si installano solo confermando l'avviso, a meno che l'editore le firmi e il kernel si fidi della sua chiave (vedi [Creare un'app installabile](#creare-unapp-installabile-pacchetto)).

1. Struttura:

   ```
   catalog.json
   apps/note/lilos.json        (+ i file elencati in "files")
   modules/mio/module.json     (+ index.js…)
   ```

   ```json
   { "name": "Il mio repository", "apps": ["apps/note"], "modules": ["modules/mio"] }
   ```

   `name` è il nome mostrato (fino a 60 caratteri); `apps` e `modules` sono cartelle del repository (fino a 200 l'uno, percorsi tipo `apps/note`: lettere, cifre, `.`, `_`, `-`). Ogni cartella d'app ha `lilos.json` con gli hash (`node system/kernel/tools/pack.js apps/note`); ogni cartella di modulo ha `module.json`. Ogni cartella può avere un `README.md` (Markdown, fino a 64 KB): l'AppStore lo mostra nei dettagli del pacchetto, senza HTML, con link solo `http(s)` e senza caricare le immagini. In `lilos.json` puoi dichiarare `category` (`system`, `productivity`, `media`, `development` o `other`, predefinita) per metterla nella scheda giusta. Una voce sbagliata non rompe il catalogo: compare nell'AppStore come «Pacchetto non valido» con il motivo.
2. **Gli hash devono corrispondere ai byte committati.** Il kernel non converte le fine riga: se Git le cambia al commit (`core.autocrlf`), il file non corrisponde più al suo hash e l'installazione fallisce. Se lavori su Windows, aggiungi un `.gitattributes` con `* -text` e rifai `pack.js`.
3. Committa, crea il tag `v1.0.0` e pubblicalo. Senza tag il kernel usa il ramo predefinito; con più tag, il più alto.
4. Da amministratore: AppStore → Opzioni → Aggiungi un repository, con l'indirizzo `https://…` e un nome facoltativo. Il kernel legge subito il catalogo: un indirizzo sbagliato o senza `catalog.json` dà un errore. Un repository privato si legge con le credenziali git del computer del kernel. Con `apps.allowLocalSources` si può dare anche il percorso assoluto di un clone locale (sviluppo).
5. Per una versione nuova: alza `version`, rifai `pack.js`, committa e crea un tag più alto. In AppStore → Aggiornamenti compare la nuova versione.

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
