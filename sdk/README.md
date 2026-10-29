# @lilos/sdk

I mattoni di base di lilOS: utilità, eventi, salvataggio, preferenze, componenti dell'interfaccia e finestre. Li usano sia il sistema (scrivania, desktop, barra) sia le app.

L'SDK cresce man mano: ogni struttura di base nuova nasce qui, non in `src/`.

## Uso

```js
import '@lilos/sdk/styles.css';            // una volta, prima degli altri fogli di stile
import { h, icon, openMenu, bus } from '@lilos/sdk';
```

Importa **solo** da `@lilos/sdk`, mai dai file interni (`sdk/core/dom.js`…): l'organizzazione interna può cambiare, il punto d'ingresso no. L'unica eccezione è `@lilos/sdk/kernel`, un punto d'ingresso pubblico a parte.

Nel repository il nome `@lilos/sdk` è collegato alla cartella `sdk/` da `vite.config.js` (per la build) e da `jsconfig.json` (per l'editor). Il client del kernel si importa anche da solo, senza caricare il resto: `import { kernel } from '@lilos/sdk/kernel'` (lo fa la schermata di accesso, prima che il resto dell'SDK possa partire).

### Le app di sistema

File, Editor, Impostazioni e AppStore sono costruiti a parte (repository [lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official)) e importano `@lilos/sdk` senza includerlo nel pacchetto. A runtime il browser carica `/host/sdk.js`, un modulo generato da `scripts/host-shims.mjs` che ri-esporta, per nome, tutto ciò che `sdk/index.js` esporta: le app di sistema usano così l'SDK di lilOS, una sola copia (un solo `fs`, una sola connessione al kernel). Conseguenze per chi scrive l'SDK: togliere o rinominare un export rompe le app di sistema già installate, e ogni export di `index.js` deve avere la forma `export { a, b } from '…'` (le altre non vengono ri-esportate). Le app di sistema usano anche `@lilos/system`, che non fa parte dell'SDK: è `src/systemApi.js` ([riferimento](../doc/sviluppatore/api.md#systemapijs-lilossystem)).

### Il kernel

Quando il sistema parte, `src/boot/` collega il kernel (il backend, `system/kernel/`) **prima** di importare il resto: `storage`, `fs` e `apps` leggono i dati dell'utente appena vengono caricati. Collegati, `storage` e `fs` restano sincroni e in memoria e mandano al kernel solo le differenze; non collegati (l'SDK da solo) salvano nel browser come prima. Se usi l'SDK fuori dal sistema, `kernel.connect()` va chiamato prima di importare `storage`, `fs` o `apps`.

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
| `storage`, `uid` | core/storage.js | Salvataggio JSON (nel kernel, o nel browser senza kernel): `get`, `set`, `remove`, `keys`, `bytes`; identificatori |
| `session`, `initials` | core/session.js | Utente (quello collegato al kernel) e lingua correnti |
| `kernel`, `KernelError` | core/kernel.js | Client del kernel: richieste, accesso e uscita, sincronizzazione delle modifiche. Anche da `@lilos/sdk/kernel` |
| `apps` | core/apps.js | App installate: elenco, `install`, `update`, `uninstall`, file e librerie, evento `change` |
| `repositories` | core/apps.js | Repository da cui vengono app e moduli: `list`, `add`, `remove`, `catalog` |
| `kernelModules` | core/apps.js | Moduli del kernel (amministratori): `list`, `install`, `update`, `remove`, `restart` |
| `settings` | core/settings.js | Preferenze dell'utente, con valori predefiniti e tipi controllati |
| `fs` | core/fs.js | File system virtuale: cartelle, file e collegamenti alle app, salvati nel kernel (o nel browser senza kernel) e validati; contenuto dei file con `read` / `write`; `reset` per cancellare tutto; `snapshot` / `restore` per rimettere ciò che è stato eliminato; cestino (`trash`, `trashed`, `untrash`, `purge`, `purgeTrash`, `unscopeTrash`, `trashRoot`); proprietario (`workspace`) e cartelle private dei workspace; tag sui nodi (`setTags`, `tagged`, `dropTag`, `hiddenTags`, `setHiddenTags`, `isHidden`) |
| `splitName`, `fileType`, `fileTypeList` | core/fileTypes.js | Nome ed estensione; tipo, colore ed etichetta di un file; elenco dei tipi conosciuti |
| `tags`, `TAG_COLORS` | core/tags.js | Tag colorati da mettere su file e cartelle: elenco, creazione, nome, colore, visibile o invisibile (un tag invisibile nasconde i suoi elementi); i colori proposti |
| `UndoStack`, `history` | core/history.js | Annulla e ripeti: la cronologia di un posto; l'annulla centrale, che agisce su chi ha il focus |
| `shortcuts`, `comboFromEvent` | core/shortcuts.js | Scorciatoie da tastiera: comandi, combinazioni modificabili dall'utente, esecuzione |
| `icon`, `logo` | ui/icons.js | Simboli dell'interfaccia e logo |
| `openMenu`, `closeMenu` | ui/ContextMenu.js | Menu a comparsa, con sottomenu |
| `menus` | core/menus.js | Menu configurabili: azioni, disposizione predefinita, disposizione scelta dall'utente |
| `toast` | ui/toast.js | Breve messaggio in basso, uno alla volta |
| `avatar` | ui/avatar.js | Iniziali dell'utente |
| `appIcon` | ui/appIcon.js | Riquadro colorato con il simbolo di un'app |
| `toggle`, `selectField`, `segmented`, `swatches`, `slider`, `textField`, `actionButton` | ui/controls.js | Controlli dei moduli |
| `shortcutField` | ui/shortcutField.js | Editor delle combinazioni di un comando (per le impostazioni) |
| `selectionGesture` | ui/selectionGesture.js | Selezione trascinando: rettangolo o percorso libero |
| `Window`, `WINDOW_EDGES` | ui/Window.js | Cornice di una finestra: barra del titolo, controlli e bordi di ridimensionamento attivabili uno per uno, contenuto; `canClose` e `getState` facoltativi |
| `SettingsView` | ui/SettingsView.js | Impaginazione a tab delle impostazioni |
| `SettingsWindow` | ui/SettingsWindow.js | Base di ogni finestra di impostazioni: `Window` + `SettingsView` |
| `SDK_VERSION` | package.json | Versione dell'SDK |

Stili (`@lilos/sdk/styles.css`):

| File | Contenuto |
| --- | --- |
| `tokens.css` | Colori, raggi, ombre, font |
| `base.css` | Reset, `.ico`, `.logo`, movimento ridotto |
| `components.css` | `.app-icon`, `.avatar`, `.menu`, `.sel-overlay`, `.toast` |
| `controls.css` | Controlli dei moduli e editor delle scorciatoie (`.ctl-*`) |
| `window.css` | Cornice delle finestre (`.window`, `.win-*`) |
| `settings.css` | Impaginazione delle impostazioni (`.settings`, `.st-*`) |

I temi: `<html data-theme="dark">` scurisce anche le superfici delle finestre, `data-theme="light"` schiarisce anche scrivania, barra e menu (vedi `tokens.css`). I componenti usano solo i token, mai colori fissi, così seguono il tema.

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

`0.3.0`. Finché la versione è `0.x` l'API può cambiare: ogni modifica incompatibile alza la versione minore e va annotata qui sotto.

### Modifiche

- **0.3.0** (compatibile per chi usa l'SDK come prima): collegamento al kernel, repository e moduli del kernel. Nuovi `kernel` (`connected`, `mode`, `user`, `data`, `request`, `session`, `login`, `logout`, `onLogout`, `connect`, `track`, `flush`, `pending`, `resume`; eventi `status` e `signedout`), `KernelError` (`status`, `code`, `message`) e `apps` (`list`, `get`, `refresh`, `install`, `update`, `uninstall`, `file`, `library`; evento `change`); export `@lilos/sdk/kernel`. Nuovi `repositories` (`list`, `add`, `remove`, `catalog`) e `kernelModules` (`list`, `install`, `update`, `remove`, `restart`). `apps.install` accetta le origini `{ type: 'git', url, ref?, path? }` (anche repository privati, con le credenziali git del computer del kernel), `{ type: 'github', repo, ref?, path? }` e `{ type: 'local', dir }`. `storage` ha `keys()` e `bytes()`, e collegato al kernel tiene i valori in memoria e li manda a 300 ms dall'ultimo cambiamento, a blocchi di 200 chiavi e 4 MB al massimo. `fs` collegato carica l'albero dal kernel, lo sincronizza per differenze, in richieste da 2000 modifiche al massimo (prima i genitori, poi i figli, poi le eliminazioni), legge e scrive i contenuti dal kernel (`read`/`write` possono lanciare `KernelError`) e ha il nuovo `fs.reset()`. I contenuti in IndexedDB passano a `lilos:<id utente>`, come copia, e si cancellano all'uscita. `session.user` è l'utente collegato (`name`, `username`). Senza kernel nulla cambia.
- **0.2.3** (compatibile): workspace nel file system. I nodi hanno `workspace?` (il proprietario) e `private?` (cartella visibile solo al suo workspace); nuovi `fs.workspace`, `fs.setWorkspace(id)` (evento `scope`), `fs.claim(workspaceId)`, `fs.makePrivate(id, workspaceId)`, `fs.share(id, parentId, name)`, `fs.ownedCount(workspaceId)`; `fs.create` accetta `workspace` e `private`. Con un workspace impostato, le cartelle private degli altri e tutto ciò che contengono non esistono per `get`, `exists`, `children`, `ancestors`, `resolve`, `path`, `read`, `write`, `rename`, `move`, `remove`, `snapshot`, `restore`. Simbolo `workspace`. Cestino: seconda radice nascosta `fs.trashRoot` (`'trash'`); `fs.trash(ids)` (restituisce gli id cestinati, salta i nodi di sistema), `fs.trashed()` (elementi visibili dal workspace attuale, più recenti prima, con `trashed: { at, from, scope? }`, `inside` e `bytes`), `fs.untrash(ids)` (restituisce `[{ id, parent }]`; torna nella cartella d'origine o, se non c'è più o non è visibile, nella radice, con nome unico), `fs.purge(ids)`, `fs.purgeTrash(time?)` (senza tempo svuota ciò che il workspace vede; con il tempo elimina tutto ciò che è stato cestinato prima, di qualsiasi workspace), `fs.unscopeTrash(workspaceId)`; evento `trash`. `trash` emette `change` di tipo `remove` con `trashed: true`, `untrash` emette `create` per ogni nodo. I nodi nel cestino non esistono per `get`, `exists`, `children`, `resolve`… e `ownedCount` non li conta. Gli elementi cestinati da una cartella privata si vedono solo da quel workspace. Tag: nuovi `tags` e `TAG_COLORS` (`core/tags.js`: `list`, `get`, `byName`, `create`, `rename`, `setColor`, `setVisible`, `remove`, evento `change`; salvati in `lilos:tags`); i nodi hanno `tags?` (id dei tag, al massimo 30) e `fs` ha `setTags(id, tagIds)`, `tagged(tagId)`, `dropTag(tagId)`, `hiddenTags`, `setHiddenTags(ids)`, `isHidden(id)`. I nodi con un tag nascosto sono esclusi da `children` (quindi da ogni elenco) ma `get`, `exists`, `resolve` e `tagged` li trovano ancora. I getter di `fs` ora restituiscono copie che non condividono l'array `tags`. L'evento `scope` significa ora "cambia ciò che è visibile": un altro workspace o i tag nascosti. `openMenu`: voce con `swatch: '#rrggbb'` (pallino colorato prima dell'etichetta). Simboli `tag`, `eyeOff`, `link`.
- **0.2.2**: menu configurabili (`menus`), sottomenu in `openMenu` (voce con `items`), token per i temi chiaro e scuro (`--side`, `--stripe`, `--field-bg`, `--toggle-off`, `--notice-*`, `--syn-*`, `--code`, `--bar-strong`, `--mm-*`, `--on-canvas-*`, `--warning`) con `data-theme="dark" | "light"` su `<html>`; `fs.move(id, parentId)` con l'evento `change` di tipo `move` (`from`, `ids`); simboli `check`, `arrowDown`, `folderOpen`, `sidebar`, `workarea`; `Window.getState`, funzione facoltativa che restituisce i dati con cui ricreare la finestra (la usano le workarea per riaprirla com'era); annulla e ripeti: `UndoStack` e `history` (cronologie collegate agli elementi, Ctrl Z agisce su chi ha il focus), `toast(text, { timeout })` (breve messaggio in basso), `fs.snapshot(ids)` e `fs.restore(snapshot)` (per rimettere ciò che è stato eliminato), simboli `undo`, `redo`.
- **0.2.1**: contenuto dei file. `fs.read(id)` e `fs.write(id, text)` (IndexedDB, con ripiego in memoria), dimensione reale dei file; `Window.canClose` per chiedere conferma prima della chiusura; `fileTypeList()`; simbolo `save`.
- **0.2.0** (incompatibile): finestre ridimensionabili da tutti i bordi e gli angoli; controlli e bordi attivabili singolarmente. `Window` accetta `controls`, `resizable` come elenco di bordi, `maxWidth`/`maxHeight`, `closable`; nuovi `setControl`, `setControls`, `setResizable`, `constrain`, getter `controls` e `resizable` (ora un elenco), evento `controls`, export `WINDOW_EDGES`. **Tolti**: `grip` (al suo posto `.win-edge[data-edge]`) e le proprietà `maximizable`/`resizable` booleane (usa `controls.maximize` e `resizable.length`). La finestra non ritaglia più il contenuto: lo fanno barra del titolo e corpo.
- **0.1.3**: file system e selezione. Nuovi export `fs`, `splitName`, `fileType` (spostati da `src/desktop/fileTypes.js`), `selectionGesture`. `Window` ha `active` e la convenzione dell'evento `launch`. Nuovi simboli `arrowLeft`, `arrowRight`, `arrowUp`, `list`, `home`, `download`, `monitor`, `lasso`.
- **0.1.2**: scorciatoie da tastiera. Nuovi export `shortcuts`, `comboFromEvent`, `shortcutField`. Nuovi simboli `keyboard`, `accessibility`.
- **0.1.1**: finestre e impostazioni. Nuovi export `Window`, `SettingsView`, `SettingsWindow`, controlli dei moduli, `settings`, `SDK_VERSION`. Nuovi simboli `info`, `max`, `palette`, `disk`, `user`, `window`. Colore principale derivato da `--accent`, regole per il movimento ridotto.
- **0.1.0**: prima versione, estratta da `src/core`, `src/ui` e `src/apps/appIcon.js`.

## Cosa arriverà

- Finestre di dialogo (conferme, avvisi) costruite su `Window`.
- Un contesto per le app (finestra, argomenti, accesso ai file) passato alla funzione che crea l'app.
