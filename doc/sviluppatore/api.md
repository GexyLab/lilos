# Riferimento API

Cosa esporta ogni modulo. I membri che iniziano con `#` sono privati e non compaiono qui.

I moduli sotto `sdk/` fanno parte dell'SDK e si importano **solo** dal punto d'ingresso, mai dal file:

```js
import { h, bus, storage, openMenu } from '@lilos/sdk';
```

Gli altri moduli (`src/`) sono il sistema: scrivania, desktop, barra.

- [sdk/core/dom.js](#sdkcoredomjs)
- [sdk/core/events.js](#sdkcoreeventsjs)
- [sdk/core/storage.js](#sdkcorestoragejs)
- [sdk/core/session.js](#sdkcoresessionjs)
- [sdk/core/settings.js](#sdkcoresettingsjs)
- [sdk/core/shortcuts.js](#sdkcoreshortcutsjs)
- [sdk/core/fs.js](#sdkcorefsjs)
- [sdk/core/tags.js](#sdkcoretagsjs)
- [sdk/core/history.js](#sdkcorehistoryjs)
- [sdk/core/fileTypes.js](#sdkcorefiletypesjs)
- [canvas/Canvas.js](#canvascanvasjs)
- [canvas/Minimap.js e canvas/Hud.js](#canvasminimapjs-e-canvashudjs)
- [desktop/Desktop.js](#desktopdesktopjs)
- [desktop/DesktopItem.js](#desktopdesktopitemjs)
- [desktop/itemIcons.js](#desktopitemiconsjs)
- [items/](#items)
- [workareas/](#workareas)
- [workspaces/](#workspaces)
- [systemFs.js](#systemfsjs)
- [apps/files/FilesApp.js](#appsfilesfilesappjs)
- [apps/open.js e apps/openWith.js](#appsopenjs-e-appsopenwithjs)
- [apps/commands.js](#appscommandsjs)
- [apps/editor/](#appseditor)
- [apps/registry.js e apps/launcher.js](#appsregistryjs-e-appslauncherjs)
- [windows/WindowManager.js](#windowswindowmanagerjs)
- [systemSettings.js](#systemsettingsjs)
- [systemTrash.js](#systemtrashjs)
- [systemHistory.js](#systemhistoryjs)
- [tags/tagUi.js e scheda Tag](#tagstaguijs-e-scheda-tag)
- [taskbar/](#taskbar)
- [sdk/ui/](#sdkui)
- [sdk/ui/controls.js](#sdkuicontrolsjs)
- [sdk/ui/shortcutField.js](#sdkuishortcutfieldjs)
- [sdk/ui/selectionGesture.js](#sdkuiselectiongesturejs)
- [sdk/ui/Window.js](#sdkuiwindowjs)
- [sdk/ui/SettingsView.js e sdk/ui/SettingsWindow.js](#sdkuisettingsviewjs-e-sdkuisettingswindowjs)
- [Eventi del bus](#eventi-del-bus)
- [Dati salvati](#dati-salvati)

---

## sdk/core/dom.js

### `h(tag, props?, ...children)` → `HTMLElement`

Crea un elemento.

```js
h('button', { class: 'btn', title: 'Salva', onclick: save, dataset: { id: 3 } }, icon('pencil'), 'Salva')
```

`props`:

| Chiave | Effetto |
| --- | --- |
| `class` | `className` |
| `style` (oggetto) | `Object.assign(el.style, …)` |
| `dataset` | `Object.assign(el.dataset, …)` |
| `on<evento>` (funzione) | `addEventListener('<evento>', fn)` |
| altro | `setAttribute`; `true` diventa attributo vuoto |

Le prop con valore `null`, `undefined` o `false` vengono ignorate, quindi `disabled: cond` funziona.

`children`: nodi DOM o valori qualsiasi. Gli array vengono appiattiti, `null` e `false` saltati. **Le stringhe diventano sempre nodi di testo**, mai HTML: è il modo sicuro di mostrare testo inserito dall'utente.

### `svg(viewBox, className, markup)` → `SVGElement`

Crea un `<svg aria-hidden="true">` e ne imposta l'`innerHTML`. Da usare **solo con markup statico e fidato** (definizioni di icone). Mai con dati dell'utente.

### `isEditing()` → `boolean`

`true` se il focus è su un `input`, una `textarea`, una `select` o un elemento `contenteditable`. Le scorciatoie globali devono controllarlo prima di agire.

### `trackDrag(startEvent, { onMove, onEnd, threshold = 3 })`

Segue un trascinamento iniziato da un `pointerdown`.

- `onMove(dx, dy, ev)`: chiamata a ogni movimento, solo dopo che il puntatore si è spostato di almeno `threshold` pixel. `dx` e `dy` sono relativi al punto di partenza, in pixel di schermo.
- `onEnd(moved, ev)`: chiamata al rilascio o all'annullamento. `moved` è `false` se la soglia non è mai stata superata, cioè era un semplice clic.

---

## sdk/core/events.js

### `class Emitter`

| Metodo | Descrizione |
| --- | --- |
| `on(type, fn)` | Iscrive `fn`. Restituisce una funzione che annulla l'iscrizione. |
| `off(type, fn)` | Annulla l'iscrizione. |
| `emit(type, payload)` | Chiama in modo sincrono tutti gli iscritti con `payload`. |

### `bus`

Istanza condivisa di `Emitter` per gli eventi di sistema. Vedi [Eventi del bus](#eventi-del-bus).

---

## sdk/core/storage.js

### `storage`

| Metodo | Descrizione |
| --- | --- |
| `get(key, fallback?)` | Legge e decodifica `lilos:<key>`. Restituisce `fallback` se manca o non è JSON valido. |
| `set(key, value)` | Codifica e salva. In caso di errore (storage pieno o bloccato) non fa nulla. |
| `remove(key)` | Elimina la chiave. |

Nessun metodo lancia eccezioni. **Il valore letto non è validato**: chi legge deve controllarne la forma (vedi come `Canvas` valida la camera).

### `uid()` → `string`

Identificatore breve e unico nella sessione, basato su ora, contatore e una parte casuale. Non è adatto a usi crittografici.

---

## sdk/core/session.js

- `session`: `{ user: { name }, locale }`. Oggi è un valore fisso (`'Eugenio'`, `'it-IT'`), in attesa di un login.
- `initials(name)`: fino a due iniziali maiuscole (`'Mario Rossi'` → `'MR'`).

---

## sdk/core/settings.js

### `settings`

Preferenze dell'utente, salvate in `lilos:settings`. Ogni chiave va dichiarata con `define()` prima di usarla: il valore predefinito ne fissa il tipo.

| Metodo | Descrizione |
| --- | --- |
| `define(defaults)` | Dichiara chiavi e valori predefiniti (`{ snap: true, accent: '#3b6ef5' }`). Si può chiamare più volte. I valori salvati di tipo diverso dal predefinito vengono ignorati. |
| `get(key)` | Valore corrente. Lancia un errore se la chiave non è dichiarata. |
| `set(key, value)` | Cambia, salva ed emette gli eventi. Lancia un errore se la chiave non è dichiarata o il tipo è diverso. Non fa nulla se il valore non cambia. |
| `reset(key)` | Torna al valore predefinito. |
| `watch(key, fn)` | Chiama `fn` subito con il valore corrente e poi a ogni cambiamento. Restituisce la funzione per smettere. |

Eventi: `change` con `{ key, value }` e `change:<key>` con il valore.

Il controllo del tipo non basta per tutti i valori: chi applica un valore salvato a qualcosa di delicato lo valida (per esempio il colore principale accetta solo `#rrggbb`).

---

## sdk/core/shortcuts.js

### `shortcuts`

Registro delle scorciatoie da tastiera. Ogni componente registra i propri comandi con le combinazioni predefinite; l'utente le cambia da Impostazioni → Usabilità → Scorciatoie. Un solo listener `keydown` su `window` (in fase di bolla) esegue il comando corrispondente.

**Combinazioni**: stringhe canoniche con i modificatori nell'ordine Ctrl, Alt, Shift e poi il tasto, separati da `+`: `'Ctrl+K'`, `'Shift+1'`, `'Ctrl+Alt+N'`, `'F2'`, `'Delete'`.

- Cmd su Mac vale come Ctrl.
- Lettere maiuscole (`A`–`Z`, secondo il layout; con Alt o layout non latini conta la posizione del tasto). Cifre della riga superiore per posizione (`Shift+1` funziona con ogni layout), cifre del tastierino per valore.
- Tasti con nome: `Enter`, `Escape`, `Delete`, `Backspace`, `Tab`, `Space`, `Insert`, `Home`, `End`, `PageUp`, `PageDown`, `ArrowUp`/`Down`/`Left`/`Right`, `F1`–`F24`.
- Simboli con nome: `Plus`, `Minus`, `Equal`, `Comma`, `Period`, `Slash`, `Backslash`, `Semicolon`, `Quote`, `Backquote`, `BracketLeft`, `BracketRight`. Per i simboli Shift non conta, perché su molte tastiere serve a produrre il carattere (`+` è Shift + `=`): Ctrl e `+` è sempre `'Ctrl+Plus'`.

| Metodo | Descrizione |
| --- | --- |
| `register({ id, label, group, keys, run, when?, whenEditing?, repeat? })` | Registra un comando; restituisce la funzione per toglierlo. `id` stabile (`'desk.fit'`), `label` e `group` per le Impostazioni, `keys` predefinite, `run(event)` l'azione. `when()`: il comando è attivo solo se restituisce `true`. `whenEditing`: funziona anche mentre si scrive in un campo (richiede Ctrl o Alt). `repeat`: si ripete tenendo premuto. Lancia un errore se l'`id` esiste già. |
| `list()` | Comandi registrati, nell'ordine di registrazione: `{ id, label, group, whenEditing, keys, defaults, custom }`. |
| `get(id)` | Combinazioni attuali. |
| `set(id, keys)` | Sostituisce le combinazioni. Lancia un errore se una non è valida (vedi `validate`). Se coincidono con le predefinite, la personalizzazione viene tolta. |
| `reset(id)`, `resetAll()` | Torna alle predefinite. |
| `owner(combo, exceptId?)` | `{ id, label }` del comando che usa la combinazione, o `null`. |
| `validate(combo, id?)` | Messaggio (in italiano) se la combinazione non si può assegnare, altrimenti `null`. |
| `matches(event, id)` | `true` se l'evento corrisponde a una combinazione del comando. Per i componenti che gestiscono la tastiera da soli (es. il menu di avvio chiuso con la stessa scorciatoia). |
| `label(id)` | Prima combinazione formattata per le etichette (`'Ctrl K'`), o `''`. Da usare in tooltip e menu invece di scrivere i tasti a mano. |
| `format(combo)`, `parts(combo)` | `'Ctrl+Plus'` → `'Ctrl +'` / `['Ctrl', '+']`. Nomi in italiano: Invio, Esc, Canc, Spazio, Fine, frecce come simboli. |
| `record({ onCombo, onPreview, onCancel })` | Cattura la prossima combinazione invece di eseguire i comandi (per gli editor). `onPreview` riceve i modificatori premuti (`'Ctrl Shift'`), Esc chiama `onCancel`. Restituisce `stop()`. |

Evento: `change` con `{ id, keys }`, a ogni registrazione e modifica.

**Regole di esecuzione**

- Il primo comando registrato con quella combinazione, attivo (`when`), vince; l'evento riceve `preventDefault()`.
- Mentre si scrive in un campo girano solo i comandi `whenEditing`.
- Se il focus è su un controllo (pulsante, link, menu a tendina, campo, tab, interruttore), le combinazioni senza Ctrl o Alt appartengono al controllo: Invio su un pulsante non apre gli elementi del desktop.
- Il menu contestuale, il menu di avvio e la rinomina fermano la propagazione dei tasti: lì le scorciatoie globali non girano.

**Combinazioni non assegnabili** (`validate`): senza un tasto oltre ai modificatori; riservate dal browser (`Ctrl+W`, `Ctrl+T`, `Ctrl+N`, `Ctrl+Shift+N`, `Ctrl+Shift+T`, `Ctrl+Shift+W`, `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Alt+F4`); Tab o Spazio senza Ctrl/Alt; un tasto che scrive senza Ctrl, Alt o Shift; per i comandi `whenEditing`, qualsiasi combinazione senza Ctrl o Alt.

### `comboFromEvent(event)`

Combinazione canonica di un evento `keydown`, o `null` se è premuto solo un modificatore.

---

## sdk/core/fs.js

### `fs`

File system virtuale: un albero di cartelle, file e collegamenti alle app. L'albero (nomi e metadati) è salvato in `lilos:fs`; il contenuto dei file (testo) in IndexedDB, letto e scritto in modo asincrono.

```js
{ id, type: 'folder' | 'file' | 'app', name, parent, created, modified,   // date in ms
  size?,      // solo file: byte del contenuto (UTF-8)
  color?,     // solo cartelle
  app?,       // solo collegamenti: id dell'app
  system?,    // non si può rinominare né eliminare
  workspace?, // id del workspace che l'ha creato (non cambia se lo si sposta o rinomina)
  private?,   // solo cartelle: visibile solo nel workspace proprietario (la Scrivania di un workspace)
  tags? }     // id dei tag (SDK `tags`), al massimo 30, senza doppioni; mai sui nodi di sistema
```

- I nomi sono unici dentro una cartella senza distinguere maiuscole e minuscole: `create` e `rename` aggiungono un numero se serve (`nota.txt` → `nota 2.txt`). Non possono essere vuoti né contenere `/` (diventa `-`); al massimo 255 caratteri.
- Tutti i metodi di lettura restituiscono **copie** che non condividono nemmeno l'array `tags`: l'albero si cambia solo con i metodi.
- **Cestino.** `trash` sposta i nodi sotto una seconda radice nascosta (`fs.trashRoot`, `'trash'`). Per tutti gli altri metodi (`get`, `exists`, `children`, `resolve`, `read`, `snapshot`…) i nodi cestinati **non esistono**: si vedono solo con `trashed()`. Vedi [D28](../interna/decisioni.md#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system).
- **Workspace.** Con un workspace impostato (`setWorkspace`), le cartelle `private` degli altri workspace e tutto ciò che contengono **non esistono**: `get`, `exists`, `children`, `ancestors`, `resolve`, `path`, `read`, `write`, `rename`, `move`, `remove`, `snapshot` e `restore` le ignorano (come un id sconosciuto). Senza workspace impostato (all'avvio, prima di `setupWorkspaces`) tutto è visibile. Due cartelle private di workspace diversi possono avere lo stesso nome nella stessa cartella (non si vedono mai insieme). Ogni nodo creato con un workspace impostato porta il suo id in `workspace`.
- **Tag.** Un nodo con un tag nascosto (`setHiddenTags`) è escluso da `children()`, quindi da scrivania, File, selettore, pannello dell'Editor e conteggi, ma **esiste ancora**: `get`, `exists`, `resolve`, `ancestors`, `path`, `read` e `tagged` lo trovano. Così le finestre aperte, l'Editor e le scorciatoie continuano a funzionare. Un elemento dentro una cartella nascosta non è nascosto a sua volta (se non ha il tag), ma non si raggiunge finché la cartella è nascosta. Il campo `tags` si conserva in cestino, `snapshot`/`restore` e `move`. Vedi [D29](../interna/decisioni.md#d29-i-tag-stanno-sui-nodi-e-un-tag-invisibile-nasconde-gli-elementi).

| Membro | Descrizione |
| --- | --- |
| `root` | Id della radice (`'root'`). |
| `loaded` | `false` al primo avvio (niente di salvato): il sistema riempie l'albero. |
| `get(id)`, `exists(id)` | Il nodo (o `null`), se esiste. |
| `children(id)` | Figli diretti, in ordine di creazione. |
| `ancestors(id)` | Dalla radice al nodo compreso. |
| `path(id)` | `'/Scrivania/Progetti'` (`'/'` per la radice). |
| `resolve(path)` | Il nodo a quel percorso, o `null`. |
| `isInside(id, ancestorId)` | `true` se `id` è `ancestorId` o sta dentro. |
| `count(id)` | Quanti nodi contiene una cartella, a ogni livello. |
| `uniqueName(parentId, name, exceptId?)` | Il nome libero più vicino. |
| `create(parentId, { type, name, color?, app?, size?, system?, id?, workspace?, private? })` | Crea e restituisce il nodo (`id` facoltativo, per le migrazioni). `workspace` è il proprietario: predefinito il workspace attuale (`fs.workspace`); le cartelle di sistema condivise (`system` senza `private`) non hanno proprietario. `private: true` solo per una cartella con un proprietario. Lancia un errore se la cartella non esiste, il tipo non è valido o `workspace` non è un id valido. |
| `rename(id, name)` | Rinomina e restituisce il nome finale. |
| `update(id, { color })` | Cambia i metadati che non sono il nome. |
| `read(id)` | `Promise<string>`: il contenuto del file (`''` se non ne ha). |
| `write(id, text)` | `Promise`: salva il contenuto, aggiorna `size` e `modified` ed emette `change` di tipo `update`. |
| `move(id, parentId)` | Sposta il nodo (con il contenuto) in un'altra cartella e restituisce il nome finale, reso unico lì. Lancia un errore se la destinazione non è una cartella o sta dentro il nodo stesso. |
| `remove(id)` | Elimina il nodo e, per le cartelle, tutto il contenuto (anche quello dei file). Il contenuto si perde: per poterlo riavere prendi prima uno `snapshot`, oppure usa `trash`. Non vale per i nodi nel cestino (`purge`). |
| `trashRoot` | Id della radice nascosta del cestino (`'trash'`); non è un nodo: `get` non la vede. |
| `trash(ids)` | Sposta nel cestino i nodi con tutto ciò che contengono. Salta i nodi di sistema, le cartelle che ne contengono, gli id sconosciuti, ripetuti o già nel cestino. Restituisce gli id cestinati. Il nodo prende `trashed: { at, from, scope? }`: `at` è l'ora (ms), `from` la cartella d'origine, `scope` il workspace proprietario se veniva da una cartella privata. Per ogni nodo emette `change` di tipo `remove` con `trashed: true` (`node.parent` è la cartella d'origine); poi `trash`. |
| `trashed()` | Gli elementi nel cestino che il workspace attuale vede, dal più recente. Ognuno è il nodo con `trashed`, più `inside` (quanti nodi contiene) e `bytes` (dimensione dei file, contenuto compreso). Sono copie. |
| `untrash(ids)` | Rimette gli elementi nella cartella d'origine; se non c'è più, non è una cartella o non è visibile, nella radice. Il nome diventa unico lì. Restituisce `[{ id, parent }]` per ogni elemento rimesso (`[]` se nessuno). Emette `change` di tipo `create` per ogni nodo (contenuto compreso), poi `trash`. Si saltano gli id che non sono nel cestino o non sono visibili. |
| `purge(ids)` | Elimina per sempre elementi del cestino (visibili), con il loro contenuto (anche quello dei file). Restituisce quanti elementi ha eliminato. Non emette `change`, solo `trash`. **Non si annulla.** |
| `purgeTrash(time?)` | Senza `time`: svuota il cestino di ciò che il workspace attuale vede. Con `time` (ms): elimina tutto ciò che è stato cestinato **prima**, di qualsiasi workspace (lo usa la pulizia automatica). Restituisce quanti elementi ha eliminato. |
| `unscopeTrash(workspaceId)` | Gli elementi cestinati da cartelle private di quel workspace diventano visibili da tutti (toglie `scope`). Lo usa l'eliminazione di un workspace. |
| `workspace` | Id del workspace impostato (i cui nodi privati sono visibili), o `null`. |
| `setWorkspace(id \| null)` | Lo imposta il sistema quando si cambia workspace. Emette `scope` con l'id (non se non cambia). Lancia un errore se l'id non è valido (1-40 caratteri tra lettere, cifre, `_` e `-`). |
| `ownedCount(workspaceId)` | Quanti nodi ha creato un workspace, ovunque siano (la sua cartella Scrivania non conta). |
| `claim(workspaceId)` | Dà un proprietario a ogni nodo che non ne ha, tranne quelli di sistema (nodi nati prima dei workspace). Restituisce quanti ne ha cambiati. |
| `makePrivate(id, workspaceId)` | Rende privata una cartella del workspace (che ne diventa il proprietario); il nome è reso unico se serve. |
| `share(id, parentId, name)` | Una cartella privata torna normale (non più `private` né `system`, il proprietario resta) e si sposta in `parentId` con quel nome (reso unico); restituisce il nome finale. Funziona qualunque workspace sia impostato. Lo usa l'eliminazione di un workspace. |
| `setTags(id, tagIds)` | Imposta i tag di un nodo: id di tag, ordine mantenuto, doppioni e id non validi (1-40 caratteri tra lettere, cifre, `_` e `-`) scartati, al massimo 30. Lista vuota: toglie il campo. Non emette nulla se non cambia niente; altrimenti `change` di tipo `update`. Lancia un errore sui nodi di sistema, sulla radice e sugli id sconosciuti. |
| `tagged(tagId)` | I nodi con quel tag che il workspace attuale vede, **anche quelli nascosti** (è così che si ritrovano); esclusi i nodi nel cestino. Sono copie. |
| `dropTag(tagId)` | Toglie il tag da tutti i nodi, cestino compreso. Restituisce quanti nodi sono cambiati. Emette `change` di tipo `update` per quelli visibili. Lo usa `tags.remove`. |
| `hiddenTags` | Id dei tag i cui elementi sono nascosti (copia). |
| `setHiddenTags(tagIds)` | Imposta i tag nascosti (lo fa `tags` dai tag invisibili, all'avvio e a ogni cambio). Emette `scope` se l'insieme cambia. |
| `isHidden(id)` | `true` se il nodo esiste e ha un tag nascosto. |
| `snapshot(ids)` | `Promise<{ nodes, contents }>`: copia i nodi (e, per le cartelle, tutto quello che contengono) con il testo dei file. Gli id che non esistono o sono ripetuti si saltano. Va preso **prima** di `remove`. |
| `restore(snapshot)` | `Promise<string[]>`: rimette quello che `snapshot` ha copiato, con gli stessi id, gli stessi metadati e lo stesso contenuto. Il nome diventa unico se nel frattempo è stato preso. Si saltano i nodi la cui cartella non c'è più (o non è visibile) e gli id che esistono di nuovo. Emette un `change` di tipo `create` per ogni nodo rimesso; restituisce gli id rimessi (`[]` se non ha potuto rimettere nulla). |

`rename`, `move` e `remove` lanciano un errore sui nodi di sistema e sulla radice.

Evento `trash` (senza dati): è cambiato ciò che il cestino contiene (`trash`, `untrash`, `purge`, `purgeTrash`, `unscopeTrash`). Chi mostra il cestino rilegge `trashed()`.

Evento `scope`: `id` del workspace attuale (o `null`). Significa "cambia ciò che è visibile": un altro workspace (`setWorkspace`) o i tag nascosti (`setHiddenTags`, stesso id di prima). Le viste leggono di nuovo l'albero.

Evento `change`: `{ type: 'create' | 'rename' | 'update' | 'move' | 'remove', node, parent, from?, ids? }`. Per `remove`, `ids` sono tutti i nodi eliminati, contenuto compreso (con `trashed: true` sono finiti nel cestino, non eliminati); per `move`, `from` è la cartella di prima e `ids` il sottoalbero spostato (chi tiene aperto un file controlla `e.ids.includes(id)`: il suo percorso è cambiato).

I contenuti stanno nel database IndexedDB `lilos`, archivio `contents`, con chiave l'`id` del file. Se IndexedDB non è disponibile (alcune modalità private) restano in memoria fino alla ricarica. Qualche secondo dopo l'avvio vengono eliminati i contenuti dei nodi che non esistono più (per esempio dopo il ripristino dei file iniziali).

Alla lettura da `lilos:fs` vengono tenuti solo i nodi ben formati raggiungibili dalla radice: tipi sconosciuti, nomi non validi, nodi orfani, cicli e nomi duplicati nella stessa cartella vengono scartati (tranne tra cartelle private di workspace diversi). `workspace` è tenuto solo se è un id valido e `private` solo per cartelle con un proprietario. `tags` è tenuto solo sui nodi che non sono di sistema, ripulito come in `setTags` (id validi, senza doppioni, al massimo 30); `setTags` non controlla che i tag esistano, ma i tag che non esistono più non si vedono da nessuna parte. Si parte da due radici (`root` e `trash`): i figli diretti del cestino senza un `trashed` valido (`at` numero, `from` testo) si scartano, e lì i nomi possono ripetersi. `ownedCount` non conta i nodi nel cestino.

---

## sdk/core/tags.js

### `tags`

Tag che si mettono su file e cartelle (`fs.setTags`) per ritrovarli ovunque siano (`fs.tagged`). Le definizioni stanno qui, sono uguali in tutti i workspace (i file condivisi sono visti da tutti) e sono salvate in `lilos:tags`.

```js
{ id, name, color, visible }   // color: '#rrggbb'
```

- I nomi sono unici senza distinguere maiuscole e minuscole, spazi ripuliti, al massimo 30 caratteri. Al massimo 100 tag.
- Un tag **invisibile** (`visible: false`) nasconde gli elementi che lo hanno, ovunque: `tags` lo comunica a `fs.setHiddenTags` all'avvio e a ogni cambio. Gli elementi si ritrovano con `fs.tagged` (in File, la vista del tag).
- Alla lettura da `lilos:tags`: si tengono i tag con `id` di 1-40 caratteri tra lettere, cifre, `_` e `-`, senza doppioni; il nome è ripulito e unico; il colore non esadecimale diventa il primo di `TAG_COLORS`; `visible` è vero salvo `false`.

| Membro | Descrizione |
| --- | --- |
| `list()` | Tutti i tag, in ordine di creazione (copie). |
| `get(id)` | Il tag, o `null`. |
| `byName(name)` | Il tag con quel nome (senza distinguere maiuscole), o `null`. |
| `create({ name, color? })` | Crea un tag visibile e lo restituisce. Senza `color` (o se non è `#rrggbb`) prende il primo colore di `TAG_COLORS` non ancora usato. Lancia un errore se il nome è vuoto o già preso, o se ci sono già 100 tag. |
| `rename(id, name)` | Rinomina. Lancia un errore se il tag non esiste, il nome è vuoto o è di un altro tag. |
| `setColor(id, color)` | Cambia il colore (solo `#rrggbb`, altrimenti non fa nulla). |
| `setVisible(id, visible)` | Visibile o invisibile; aggiorna `fs.setHiddenTags` (evento `scope`). |
| `remove(id)` | Elimina il tag e lo toglie da tutti gli elementi (`fs.dropTag`): quelli nascosti ricompaiono. **Non si annulla.** |

Evento `change` (senza dati): dopo ogni modifica. Non scatta quando il tag viene messo o tolto a un elemento (quello è un `change` di `fs`).

### `TAG_COLORS`

`[{ value, label }]`, otto colori in ordine: Rosso `#e5484d`, Arancione `#d9822b`, Giallo `#d4a72c`, Verde `#30a46c`, Verde acqua `#0d9488`, Blu `#3b6ef5`, Viola `#7c5cdb`, Grigio `#8b8d98`.

```js
import { tags, fs } from '@lilos/sdk';
const urgente = tags.create({ name: 'Urgente', color: '#e5484d' });
fs.setTags(nodeId, [...(fs.get(nodeId).tags ?? []), urgente.id]);
fs.tagged(urgente.id);          // tutti gli elementi con il tag, ovunque
tags.setVisible(urgente.id, false);   // ora sono nascosti, ma fs.tagged li trova
```

---

## sdk/core/history.js

Annulla e ripeti. Per l'uso in un'app vedi la ricetta [Aggiungere annulla e ripeti a un'app](ricette.md#aggiungere-annulla-e-ripeti-a-unapp).

### `class UndoStack extends Emitter`

La cronologia di un posto (la scrivania, una finestra, un pannello). Una voce descrive un'azione **già fatta** e come disfarla e rifarla.

`new UndoStack({ limit = 100 } = {})`: oltre `limit` voci, la più vecchia viene dimenticata.

| Membro | Descrizione |
| --- | --- |
| `push({ label = '', undo, redo })` | Registra un'azione già fatta. `undo` e `redo` sono funzioni, anche asincrone; se manca una delle due lancia un errore. Svuota ciò che si poteva ripetere. Emette `change`. |
| `run({ label, do, undo })` | `Promise`: esegue `do()`, poi registra la voce (`redo` è `do`) e restituisce ciò che `do()` ha restituito. Se `do()` lancia, non registra nulla. |
| `undo()`, `redo()` | `Promise<string \| null>`: disfa / rifà l'ultima voce e restituisce la sua etichetta; `null` se non c'era nulla, se un altro passo è in corso o se la voce ha lanciato un errore. |
| `canUndo`, `canRedo` | `true` se c'è qualcosa da fare e nessun passo è in corso. |
| `undoLabel`, `redoLabel` | Etichetta della prossima voce da annullare / ripetere (`''` se non c'è). |
| `limit` | Numero massimo di voci. |
| `clear()` | Svuota tutto. Emette `change`. |

Se `undo` o `redo` lancia un errore (per esempio l'elemento non esiste più), la voce viene **tolta** dalla cronologia (non resta bloccata) ed emette `error`. Un solo passo alla volta: finché uno è in corso, `undo()` e `redo()` rispondono `null`.

Eventi: `change` (dopo ogni `push`, `undo`, `redo`, `clear`) · `error` `{ entry, error }`.

```js
const stack = new UndoStack();
fs.rename(id, 'b.txt');
stack.push({ label: 'Rinomina «a.txt» in «b.txt»', undo: () => fs.rename(id, 'a.txt'), redo: () => fs.rename(id, 'b.txt') });
await stack.undo();   // 'Rinomina «a.txt» in «b.txt»'
```

### `history`

L'annulla e ripeti centrale: Ctrl Z e Ctrl Y agiscono sulla cronologia di chi ha il **focus**. Un posto collega un *gestore* a un suo elemento; vince quello dell'elemento più vicino attorno al focus.

Gestore: `{ undo(), redo(), canUndo?, canRedo?, undoLabel?, redoLabel?, text? }`. Una `UndoStack` è già un gestore valido. `undo()` e `redo()` del gestore restituiscono l'etichetta (una stringa, anche vuota) se il passo è riuscito, `null` o `false` altrimenti.

| Membro | Descrizione |
| --- | --- |
| `attach(el, handler)` | Collega il gestore all'elemento (uno per elemento). Restituisce la funzione che lo scollega. Se il gestore ha `on`, i suoi `error` vengono inoltrati da `history`. |
| `setRoot(handler)` | Il gestore usato quando nessuna finestra è attiva (la scrivania). |
| `setContext(fn)` | `fn()` → elemento della finestra attiva, o `null`: dove cercare quando il focus non è su nulla. |
| `resolve()` | Il gestore su cui agirebbe Ctrl Z adesso, o `null`. |
| `handles(what = 'undo')` | `true` se Ctrl Z (`'redo'`: Ctrl Y) spetta a noi: c'è un gestore, `canUndo` / `canRedo` non è falso e non si è dentro un campo di testo (a meno che il gestore abbia `text: true`). |
| `undo()`, `redo()` | Agiscono sul gestore di `resolve()`; `Promise` con l'etichetta, o `null`. |
| `undoOn(handler)`, `redoOn(handler)` | Agiscono su un gestore preciso (una voce di menu, un pulsante). |

**Come sceglie il gestore** (`resolve`):

1. si parte da `document.activeElement`; se il focus non è su nulla (è il `body`), dall'elemento della finestra attiva (`setContext`);
2. si sale tra i genitori fino al primo elemento con un gestore;
3. se non c'è e c'è una finestra attiva (o il focus è dentro una `.window`), **nessun gestore**: la finestra non ha cronologia e la scrivania dietro non si tocca;
4. altrimenti vale il gestore radice (`setRoot`).

**Campi di testo**: se `isEditing()` è vero (input, textarea, campo modificabile) `handles` risponde `false` e Ctrl Z resta al browser, a meno che il gestore trovato abbia `text: true` (si occupa lui del testo, come l'Editor).

Eventi: `undo` | `redo` `{ label, handler }`, dopo un passo riuscito · `error` `{ entry, error }`, inoltrato dalle `UndoStack` collegate.

---

## sdk/core/fileTypes.js

- `splitName(name)` → `[base, ext]`. Un punto iniziale non è un'estensione: `.env` → `['.env', '']`.
- `fileType(name)` → `{ ext, badge, label, color }`. `badge` è l'estensione in maiuscolo, ripulita a `[A-Z0-9]` e lunga al massimo 4 caratteri.
- `fileTypeList()` → `[{ label, color, exts }]`: tutti i gruppi di tipi conosciuti (copie).

---

## canvas/Canvas.js

### `union(rects)` → `{ x, y, w, h }`

Il rettangolo che contiene tutti quelli dati. L'array non deve essere vuoto.

### `class Canvas extends Emitter`

`new Canvas(parent, { key = 'camera' })` crea `.canvas > .world`, lo aggiunge a `parent` e ripristina la camera salvata in `lilos:<key>` (il sistema passa `ws:<id>:camera`: ogni workspace ha la sua vista).

**Proprietà**

| Nome | Descrizione |
| --- | --- |
| `cam` | `{ x, y, s }`: traslazione in pixel di schermo e zoom. Da trattare come sola lettura: si cambia con `setCamera` o `animateTo`. |
| `el` | L'elemento `.canvas`. |
| `world` | L'elemento `.world`, che contiene gli oggetti. |
| `width`, `height` | Dimensioni del canvas in pixel. |

**Oggetti**

| Metodo | Descrizione |
| --- | --- |
| `add(el)` | Aggiunge la classe `obj`, inserisce `el` nel mondo, emette `change`. Restituisce `el`. |
| `remove(el)` | Rimuove `el` ed emette `change`. |
| `objects()` | Oggetti visibili (quelli con `display: none` sono esclusi). |
| `rectOf(el)` | Rettangolo dell'oggetto in coordinate mondo. |
| `changed()` | Emette `change`. Chiamalo dopo aver spostato o ridimensionato oggetti, così la minimappa si aggiorna. |

**Coordinate**

| Metodo | Descrizione |
| --- | --- |
| `toWorld(clientX, clientY)` | Punto dello schermo → punto del mondo. |
| `viewRect()` | Parte del mondo visibile, `{ x, y, w, h }`. |

**Camera**

| Metodo | Descrizione |
| --- | --- |
| `setCamera(x, y, s?)` | Imposta la camera subito, interrompendo eventuali animazioni. Lo zoom viene limitato tra 0,1 e 3. |
| `zoomAt(cx, cy, factor)` | Zoom tenendo fermo il punto `(cx, cy)`, relativo al canvas. |
| `zoomBy(factor)` | Zoom attorno al centro. |
| `resetZoom()` | Zoom al 100% attorno al centro. |
| `animateTo(x, y, s, duration = 280)` | Animazione della camera (ease-out cubica). Senza animazione se `<html data-motion="off">` o se il sistema operativo chiede movimento ridotto. |
| `frame(rect, margin = 40, maxZoom = 1)` | Centra un rettangolo del mondo, con lo zoom più grande che lo fa stare nello schermo, senza superare `maxZoom`. |
| `fit()` | Inquadra tutti gli oggetti, oppure il rettangolo restituito da `fitScope()` se c'è. Con la scrivania vuota torna a `(0, 0)` al 100%. |
| `fitScope` | Facoltativo: `() → rettangolo del mondo \| null`. Se restituisce un rettangolo, `fit()` inquadra quello invece di tutto (lo imposta `Workareas`: la workarea attuale). Predefinito `null`. |
| `useCamera(key)` | Salva subito la camera attuale, poi prende quella salvata in `key` (`{ x: 0, y: 0, s: 1 }` se manca o non è valida), senza animazione. Da lì in poi salva sotto `key`. È il cambio di workspace. |
| `flushCamera()` | Scrive subito la camera, invece di aspettare il salvataggio ritardato di 300 ms. |
| `bringIntoView(rect)` | Se il rettangolo non è tutto visibile, sposta la vista per mostrarlo. Riduce lo zoom solo se non ci sta. |

**Eventi**

| Evento | Payload | Quando |
| --- | --- | --- |
| `camera` | `cam` | La camera è cambiata. |
| `change` | — | Camera o oggetti cambiati. |
| `background:press` | `PointerEvent` | Tasto sinistro premuto su un punto vuoto (non sposta la vista: serve per selezionare). |
| `background:click` | `PointerEvent` | Clic sinistro su un punto vuoto, senza trascinare. |
| `background:contextmenu` | `MouseEvent` | Tasto destro su un punto vuoto, se nessun oggetto ha già gestito l'evento. |

**Spostamento della vista**: tasto centrale, Spazio + trascina, o un dito su un punto vuoto di uno schermo touch. Il tasto sinistro su un punto vuoto non sposta la vista.

**Scorciatoie registrate** (gruppo Scrivania): `desk.zoomIn` (Ctrl +, Ctrl =), `desk.zoomOut` (Ctrl −), `desk.zoomReset` (Ctrl 0), `desk.fit` (Shift 1). Spazio + trascina resta un tasto fisso.

**Costanti interne**: zoom tra `0.1` e `3`, griglia di sfondo di `24` px (moltiplicata per 4 finché sullo schermo è sotto i 12 px), velocità della rotella `0.0015`, o `0.01` con Ctrl.

---

## canvas/Minimap.js e canvas/Hud.js

### `class Minimap`

`new Minimap(canvas)`; l'elemento è in `.el`. Si ridisegna a ogni `change` del canvas, al massimo una volta per frame. Disegna un blocco per ogni oggetto con classe `mm-<data-kind>` (o `mm-obj` se l'oggetto non ha `data-kind`) e il rettangolo visibile con `mm-view`. Clic e trascinamento spostano la vista. Durante il trascinamento la scala della mappa resta ferma.

`draw()` ridisegna subito.

### `createHud(canvas)` → `HTMLElement`

Il pannello completo: minimappa, pulsanti −/+, percentuale (clic = 100%), "Mostra tutto" e aiuto. Con la classe `no-minimap` la minimappa è nascosta.

---

## desktop/Desktop.js

### `class Desktop`

`new Desktop(canvas, folderId, layoutKey = 'desktop-layout')`: la scrivania come vista della cartella `folderId` del file system (la Scrivania del workspace attuale). Un `DesktopItem` per ogni nodo; posizioni da `lilos:<layoutKey>` (il sistema passa `ws:<id>:desktop-layout`), oppure il primo posto libero in colonna. Segue gli eventi `change` di `fs`, quindi mostra anche le modifiche fatte altrove (app File).

**Proprietà**

| Nome | Descrizione |
| --- | --- |
| `items` | `Map<id, DesktopItem>` |
| `selection` | `Set<DesktopItem>` |
| `folder` | Id della cartella mostrata. |
| `keyboard` | `true` se le scorciatoie del desktop sono attive. `main.js` lo mette a `false` quando una finestra ha il focus. |
| `workareas` | Il gestore `Workareas`, o `null`. Lo imposta `Workareas` nel costruttore; senza, il desktop si comporta come prima. |
| `history` | `UndoStack` della scrivania: è il gestore radice di `history` (lo imposta `setupHistory`, vedi [systemHistory.js](#systemhistoryjs)). |
| `snapToGrid` | Se `true` (predefinito) gli elementi trascinati si allineano alla griglia. Collegato all'impostazione `snap`. |

**Metodi**

| Metodo | Descrizione |
| --- | --- |
| `save()` | Salva le posizioni sotto la chiave delle posizioni (`layoutKey`). Le posizioni degli elementi nascosti da un tag invisibile (già note e ancora nella scrivania) si conservano, per quando ricompaiono. |
| `load(folderId, layoutKey)` | Mostra un'altra cartella come scrivania (un altro workspace): toglie gli elementi, monta quelli della nuova cartella con le posizioni di `layoutKey`, svuota la selezione e **la cronologia**. Salva prima le posizioni attuali con `save()`. Le icone delle workarea tornano con `Workareas.load`. |
| `select(items)` | Sostituisce la selezione. `select([])` la svuota. |
| `toggle(item)` | Aggiunge o toglie un elemento dalla selezione. |
| `open(item)` | Un'icona di workarea (`item.workarea`) riapre la workarea (`workareas.expand`). Un'app chiama `launch(data.app)`; cartelle e file emettono `item:open` con il nodo del file system. |
| `create(type, at)` | Crea (tramite `fs`) una cartella (`'folder'`) o un file di testo (`'file'`) centrato sul punto del mondo `at`, lo seleziona e avvia la rinomina. |
| `rename(item)` | Rinomina dentro l'etichetta, poi `fs.rename` (che rende il nome unico); per un'icona di workarea, `workareas.rename`. Restituisce una Promise. |
| `remove(items)` | Elimina con `confirmRemove` (nel cestino, annullabile con `history`): chiede conferma se `deleteConfirm` è attivo. Le icone di workarea passano da `workareas.confirmRemove` (chiede sempre; il contenuto resta sulla scrivania). Con file e workarea insieme un solo menu chiede per tutto. |
| `arrange()` | Ordina (cartelle, file, app, poi per nome) e dispone in colonne. Con una workarea attuale, solo i suoi elementi e dentro la sua area (sotto la barra del titolo). Altrimenti gli elementi fuori da ogni workarea, nella parte visibile, saltando i posti coperti dalle aree. |
| `visibleItems()` | Elementi in vista: quelli non nascosti (cioè non chiusi dentro una workarea ridotta a icona). |
| `scopeItems()` | Su cosa agiscono le richieste della scrivania: gli elementi della workarea attuale (`workareas.itemsIn`), altrimenti `visibleItems()`. Lo usano Seleziona tutto e `selectAll`. |
| `addItem(item)` | Mette sulla scrivania un `DesktopItem` che non è un nodo del file system (le icone delle workarea): lo registra in `items`, lo lega a selezione e trascinamento e lo aggiunge al canvas. Non viene salvato nelle posizioni della scrivania. |
| `removeItem(id)` | Toglie dalla scrivania un elemento messo con `addItem`. |

**Cronologia** (`history`): registra creare (la creazione e la rinomina iniziale sono **un solo** passo), rinominare, eliminare (anche cartelle con il contenuto), spostare le icone con il trascinamento (uno o più elementi), spostare nodi in una cartella con il trascinamento (`moveNodes`, un solo passo, anche quando arrivano da un'altra vista: in quel caso si registra nella cronologia della vista di partenza) e `arrange()`. Le posizioni degli elementi tolti dalla scrivania si ricordano nella sessione: annullando un'eliminazione tornano dove erano. `create(type, at, { name, content, template })` accetta il nome iniziale, un testo iniziale o un file modello da copiare; `rename(item, record = true)` con `record = false` non registra (lo fa `create`). Le voci sulle workarea le aggiunge `Workareas` (vedi sotto). Se si eliminano insieme file e workarea, nella cronologia entrano solo i file.

**Tag**: gli elementi con un tag nascosto non stanno sulla scrivania (`fs.children` li esclude). `fs` emette `scope` quando un tag diventa invisibile o visibile: la scrivania si riallinea a `fs.children(folder)` (toglie e rimonta gli elementi, salva). Un `update` che mette o toglie un tag nascosto fa sparire o ricomparire l'elemento; quando ricompare riprende il suo posto, anche dopo un ricaricamento. I cambi di `tags` (colori, nomi) ridisegnano i pallini. Il menu di un elemento ha il sottomenu **Tag** (`tagSubmenu` di `src/tags/tagUi.js`) per gli elementi selezionati che non sono icone di workarea.

**Workarea nei menu**: il menu dello sfondo, se il clic è dentro un'area aperta, mostra prima `workareas.menuEntries(id)`, un separatore, poi il menu configurabile con contesto `{ at, workarea }`. Il menu di un elemento ha **Crea una workarea con la selezione** (`workareas.createAround`) se tutta la selezione sta fuori da ogni workarea; il menu di un'icona di workarea ha Apri la workarea, Rinomina, Proprietà…, Elimina la workarea….

**Trascinamento degli elementi** (`#drag`, con `dragItems` di [itemDrag.js](#itemdragjs)): trascina tutta la selezione, con soglia di 4 px e senza fantasma (le icone stesse si muovono, con `pointer-events: none` e la classe `dragging`). Al rilascio:

- sulla scrivania (fuori da ogni `.window`, senza un bersaglio) le icone restano dove sono, allineate alla griglia se `snapToGrid`, e si registra un passo `Sposta «nome»` / `Sposta N elementi` (`#recordMoves`);
- su una cartella (della scrivania o marcata in una finestra) i file e le cartelle si spostano lì con `moveInto(this.history, …)`: le icone tornano **prima** alle posizioni di partenza, così Ctrl Z le rimette lì; le icone di workarea non entrano nei nodi spostati;
- su una finestra senza bersaglio, fuori dalla scrivania o con Esc, tutto torna com'era e non si registra nulla;
- un clic semplice su un elemento già selezionato insieme ad altri restringe la selezione a lui, al rilascio.

Il canvas è una `dropZone` (`folder: () => this.folder`, nessun evidenziamento): nodi rilasciati da un'altra vista vanno nella cartella della scrivania e si dispongono in colonne (`ROWS`) dal punto di rilascio, allineato alla griglia. Il menu di un elemento ha **Aggiungi ai collegamenti** (`linkEntry`).

**Selezione trascinando** (`background:press`): rettangolo, oppure percorso libero se sono premuti i modificatori dell'impostazione `lasso`; Ctrl/Shift aggiungono alla selezione. Se parte dentro una workarea aperta, può prendere solo gli elementi di quella. Vedi `selectionMode` in [systemSettings.js](#systemsettingsjs).

**Scorciatoie**: il desktop è un *target* dei comandi comuni sugli elementi (vedi [items/](#items)), attivo quando `keyboard` è `true`. Le etichette nei menu contestuali vengono da `shortcuts.label()`.

**Costanti**: griglia di aggancio `8` px, cella di `92 × 84` px per riordinare, margine `16` px.

**Nomi unici**: il confronto ignora maiuscole e minuscole. In caso di conflitto viene aggiunto un numero prima dell'estensione: `nota.txt` → `nota 2.txt`.

---

## desktop/DesktopItem.js

### `class DesktopItem`

`new DesktopItem(data)`. Dati:

```js
{
  id: string,
  type: 'folder' | 'file' | 'app',
  name: string,
  x: number, y: number,   // coordinate mondo
  color?: string,         // solo cartelle: colore dell'icona
  app?: string,           // solo app: id nel registro
  tags?: string[],        // id dei tag: i pallini in basso a destra dell'icona
}
```

DOM: `div.ditem[data-kind="item"][data-id]` con `.ditem-glyph` e `.ditem-label`. Gli elementi che sono nodi del file system sono marcati con `markItem` (`data-node`), quindi una cartella sulla scrivania accetta rilasci; le icone delle workarea (`type: 'workarea'`) non sono marcate.

| Membro | Descrizione |
| --- | --- |
| `data` | Il nodo del file system con la posizione; viene modificato da `moveTo` e `setData`. |
| `el`, `glyph`, `label` | Elementi DOM. |
| `id` | `data.id` |
| `editing` | `true` durante la rinomina. |
| `moveTo(x, y)` | Sposta e aggiorna `data`. |
| `setSelected(bool)` | Aspetto selezionato. |
| `setData({ name, color, tags })` | Aggiorna nome, colore, tag, etichetta e icona (l'estensione può cambiare l'icona; i pallini dei tag si ridisegnano con `tagDots`, classe `ditem-tags`). |
| `editName()` | Rinomina dentro l'etichetta. La Promise restituisce il nuovo nome (senza spazi in eccesso) o `null` se annullata o invariata. **Non** cambia il nome: lo fa chi chiama (il `Desktop`, con `fs.rename`). |

`DesktopItem` non salva e non conosce il canvas: è il `Desktop` che lo aggiunge, lo collega agli eventi e lo salva.

---

## desktop/itemIcons.js

- `FOLDER_COLOR`: colore predefinito delle cartelle, `#6f9bff`.
- `folderIcon(color?)`, `fileIcon(name)`: icone SVG grandi.
- `workareaIcon()`: icona di una workarea ridotta (cornice tratteggiata con due piccole finestre).
- `itemIcon(data)`: l'icona giusta per qualsiasi nodo del file system (usata anche dall'app File) e, con `data.type === 'workarea'`, per le icone delle workarea.

---

## items/

### `targets.js`

Comandi sugli elementi comuni a tutte le viste (desktop, app File), registrati una volta da `registerItemCommands()` nel gruppo **Elementi**: `items.open` (Invio), `items.rename` (F2, con un solo elemento selezionato), `items.delete` (Canc), `items.selectAll` (Ctrl A), `items.deselect` (Esc).

- `addTarget({ isActive, selectionSize, open, rename, remove, selectAll, deselect })`: una vista si iscrive; restituisce la funzione per togliersi. I comandi agiscono sul primo target con `isActive()` vero.
- `activeTarget()`: il target attivo, o `null`.

### `confirmRemove.js`

Eliminare file e cartelle come dicono le impostazioni `deleteConfirm` e `deletePermanent` (vedi [systemSettings.js](#systemsettingsjs)).

- `confirmRemove(ids, x, y, stack = null)`: toglie i nodi di sistema. Con `deleteConfirm` apre nel punto `(x, y)` un menu "Sposta nel cestino … / Annulla" (o "Elimina definitivamente …" con `deletePermanent`), per **ogni** eliminazione; senza, elimina subito. Con `stack` (una `UndoStack`) l'eliminazione viene registrata e Ctrl Z rimette tutto; senza, non si può annullare.
- `deleteNodes(stack, ids)`: `removeNodes` con `permanent` preso da `deletePermanent`, senza chiedere.
- `deleteLabel(nodes)`: il testo della voce di conferma, per esempio `Sposta nel cestino «Appunti» e i 12 elementi dentro`.

### `fsHistory.js`

Azioni sul file system che finiscono in una `UndoStack`. Scrivania, app File e pannello dell'Editor usano le stesse, ciascuna con la propria cronologia. Ogni funzione fa l'azione e la registra (`stack` può essere `null`: allora la fa e basta). Undo e redo controllano che l'elemento esista ancora: se no lanciano un errore e la cronologia toglie la voce.

| Funzione | Descrizione |
| --- | --- |
| `removeNodes(stack, ids, { permanent = false })` | `Promise`. Toglie i nodi con quello che contengono (quelli di sistema si saltano). Di default li **sposta nel cestino** (`fs.trash`): annullare li rimette con `fs.untrash`, ripetere li cestina di nuovo; etichetta `Sposta nel cestino «nome»` o `… N elementi`. Con `permanent: true` prende `fs.snapshot` ed elimina con `fs.remove`; annullando li rimette con `fs.restore` (lancia se la cartella non c'è più); etichetta `Elimina «nome»` o `Elimina N elementi`. |
| `restoreNodes(stack, ids)` | Toglie dal cestino con `fs.untrash` e restituisce `[{ id, parent }]` (non è una Promise). Annullare li rimette nel cestino. Etichetta `Ripristina «nome»` o `Ripristina N elementi`. |
| `recordCreated(stack, id)` | Registra un nodo appena creato (e magari già rinominato): annullare lo toglie, ripetere lo rimette com'era (con il contenuto scritto nel frattempo). Etichetta `Crea «nome»`. Va chiamata **dopo** la rinomina iniziale, per fare un solo passo. |
| `renameNode(stack, id, name)` | Rinomina e restituisce il nome finale. Se il nome non cambia non registra nulla. Etichetta `Rinomina «a» in «b»`. |
| `moveNode(stack, id, parentId)` | Sposta in un'altra cartella e restituisce il nome finale. Se la cartella è la stessa non registra nulla. Annullando, il nome non torna quello di prima se era stato cambiato per renderlo unico. Etichetta `Sposta «nome» in «cartella»`. |
| `moveNodes(stack, ids, parentId)` | Sposta più nodi in una cartella come **un solo** passo (è ciò che usa il trascinamento). Salta i nodi che non esistono, quelli già nella cartella e quelli che `fs.move` rifiuta (di sistema, la cartella stessa o una che la contiene). Restituisce gli id spostati (array vuoto se non c'era nulla da spostare); se qualche nodo ha dato errore e nessuno si è spostato, lancia il primo errore. Annullare rimette ogni nodo nella cartella d'origine **con il nome di prima**; ripetere li rimette nella cartella. Se nessuno si può più spostare, undo e redo lanciano «Gli elementi o le cartelle non esistono più». Etichetta `Sposta «nome» in «cartella»` o `Sposta N elementi in «cartella»` (la radice è «Home»). |

### `itemDrag.js`

Trascinamento di file e cartelle, uguale in ogni vista che li mostra (scrivania, app File, pannello dell'Editor, app tue). Motivazioni in [D30](../interna/decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle); come si usa in [Ricette](ricette.md#rendere-trascinabili-file-e-cartelle-in-unapp). Lo stile (`.drop-target`, `.item-ghost`, `body.items-dragging`) è in `src/styles/items.css`.

| Funzione | Descrizione |
| --- | --- |
| `markItem(el, node)` → `el` | Dice che `el` mostra `node`: imposta `el.dataset.node = node.id`. Un elemento che mostra una **cartella** accetta rilasci (i nodi vi si spostano dentro); uno che mostra un **file** lascia passare il rilascio a ciò che lo contiene. |
| `dropZone(el, zone)` → `() => void` | Rende `el` un'area che accetta rilasci. Restituisce la funzione che la toglie. Vedi `zone` sotto. |
| `dragItems(e, options)` | Avvia il trascinamento da un `pointerdown` (`e`). Vedi le opzioni sotto. Non restituisce nulla: i listener si tolgono da soli al rilascio. |
| `movableInto(ids, folderId)` → `string[] \| null` | Gli id tra `ids` che possono andare in `folderId`; `null` se il rilascio non è possibile: `folderId` non è una cartella, un nodo trascinato è la cartella stessa o ne contiene una, oppure non cambierebbe nulla. I nodi di sistema sono sempre esclusi. |
| `moveInto(stack, ids, folderId)` → `string[]` | Sposta con `moveNodes` e mostra un `toast` (`Spostato «nome» in Documenti`, `Spostati 3 elementi in Home`; il percorso è `fs.path`). Un errore diventa un toast `Non si può spostare: …` e restituisce `[]`. Restituisce gli id spostati. |

**`zone`** (tutte le proprietà sono facoltative):

| Proprietà | Descrizione |
| --- | --- |
| `folder(hit)` | Restituisce l'id della cartella in cui vanno i nodi, o `null` (nessun rilascio). `hit` è l'elemento sotto il puntatore. Se c'è, i nodi si controllano con `movableInto` e, di norma, si spostano con `moveInto`. |
| `drop(ids, ev, stack)` | Fa lei il rilascio. Con `folder` sostituisce il `moveInto` (i `ids` sono già filtrati); senza `folder` è l'unica azione. |
| `accepts(ids)` | Per le zone senza `folder`: `false` per rifiutare. Senza `drop` una zona senza `folder` non accetta nulla. |
| `target(hit, x, y, ids)` | Per le zone che decidono tutto da sole: restituisce `{ el, run(ev, stack) }` (`el` prende `drop-target`) o `null`. `x` e `y` sono le coordinate del puntatore. Ha la precedenza su `folder`, `drop` e `accepts`. Serve quando bisogna distinguere punti diversi della stessa area, come il centro e i bordi di una voce della barra laterale di File. |
| `highlight(folder)` | L'elemento che riceve la classe `drop-target`, o `null` per non evidenziare nulla. Predefinito: la zona stessa. Con `folder` riceve l'id calcolato; senza, `null`. |

**Opzioni di `dragItems`**

| Opzione | Descrizione |
| --- | --- |
| `ids` | Gli id dei nodi trascinati. Con `[]` (per esempio solo icone di workarea) il trascinamento segue il puntatore ma non ha bersagli. |
| `stack` | Predefinito `null`. La `UndoStack` della vista di partenza: lo spostamento si registra **solo lì**, una volta. |
| `ghost` | Predefinito `true`. Mostra vicino al puntatore (`div.item-ghost`) il nome del nodo, o «N elementi». Con `false` la vista muove da sé ciò che vuole mostrare. |
| `threshold` | Predefinito `5` px prima che conti come trascinamento. |
| `onMove(dx, dy, ev, target)` | A ogni movimento dopo la soglia; `dx`, `dy` sono lo scostamento in pixel dello schermo (non del mondo) rispetto alla pressione, `target` il bersaglio attuale o `null`. |
| `onEnd({ moved, target, cancelled, hit, ev })` | Al rilascio (o all'annullamento). `moved`: è partito il trascinamento; `target`: il bersaglio valido, `null` se annullato o senza bersaglio; `cancelled`: Esc o `pointercancel`; `hit`: l'elemento sotto il puntatore (`null` se non è partito). Se restituisce `true` la vista ha gestito lei il rilascio e lo spostamento non si fa. Altrimenti, con un `target`, si esegue. |

Come si trova il bersaglio: si prende l'elemento sotto il puntatore (`document.elementFromPoint`) e si risale tra gli antenati. Il primo che ha una zona registrata o è un elemento marcato che mostra una cartella è il bersaglio. Un elemento `.window` ferma la ricerca: un rilascio sopra una finestra non arriva mai alla scrivania sotto. Durante il trascinamento il bersaglio ha la classe `drop-target`, `<body>` ha `items-dragging`, **Esc** annulla (il tasto è intercettato in cattura) e al rilascio tutto si ripulisce.

### `links.js`

L'ordine della sezione «Collegamenti» nella barra laterale dell'app File: le voci fisse (Home, Scrivania, Documenti, Immagini, Download) e i collegamenti a file e cartelle trascinati lì. Il blocco dei tag e il Cestino stanno fuori dall'ordine.

L'ordine è una lista di **chiavi**: un id di nodo (una voce fissa, con Home = `'root'`, oppure un collegamento) o `'desk'` (la Scrivania del workspace attuale, che ha un id diverso in ogni workspace). Le chiavi `'tags'` e `'trash'`, presenti nei salvataggi di una versione precedente, vengono tolte alla lettura (e il valore ripulito viene salvato).

- `links`: istanza di `Emitter`, con l'evento `change` quando l'ordine cambia.

  | Metodo | Descrizione |
  | --- | --- |
  | `arrange(defaults)` → `string[]` | Le chiavi visibili ora, nell'ordine salvato. `defaults` sono le voci fisse nell'ordine predefinito; una voce fissa non ancora sistemata va subito dopo quella che la precede in `defaults`. Una chiave che non si vede (un nodo nel cestino o nella Scrivania di un altro workspace, o che non esiste) non compare. |
  | `has(id, defaults = [])` | `true` se il nodo è nella barra come **collegamento** (non come una delle voci in `defaults`). |
  | `place(keys, index, defaults)` → `number` | Mette le chiavi alla posizione `index` di `arrange(defaults)`: quelle già presenti si spostano, i nodi nuovi diventano collegamenti. Restituisce quanti collegamenti ha creato. Ignora le chiavi di nodi che non esistono; se l'ordine non cambierebbe, non salva nulla. |
  | `changes(keys, index, defaults)` → `boolean` | `true` se `place` con gli stessi argomenti cambierebbe l'ordine. La barra laterale lo usa per non mostrare la linea quando gli elementi trascinati sono già in quel punto (anche più di uno). |
  | `add(ids)` → `number` | Aggiunge **in fondo** i nodi che esistono, non sono già nell'ordine e non sono la radice. Restituisce quanti ne ha aggiunti. |
  | `remove(id)` | Toglie davvero la chiave dall'ordine (non resta tra quelle nascoste). Non fa nulla se non c'è. |

  Al massimo **80** chiavi: oltre, restano le ultime. Le chiavi non visibili ora restano salvate, al loro posto relativo (dopo la chiave che le precedeva). Si salva in `lilos:files-sidebar` ([Dati salvati](#lilosfiles-sidebar)); i vecchi collegamenti di `lilos:files-links` si leggono una volta, si aggiungono in fondo e la vecchia chiave si toglie.
- `linkEntry(ids)` → voce di menu o `null`: `{ label: 'Aggiungi alla barra laterale di File', icon: 'link', action }` (aggiunge in fondo con `links.add`) per i nodi non ancora collegati, esclusi radice e nodi di sistema; `null` se non ce n'è nessuno (usalo in un array di `openMenu` con `.filter(Boolean)`). La usano i menu della scrivania, dell'app File e del pannello dell'Editor.

---

## workareas/

Aree della scrivania che tengono insieme elementi e finestre. Panoramica e motivazioni: [README per sviluppatori](README.md#workarea) e decisione D25. Il modulo dipende dall'SDK, da `desktop/`, `apps/launcher.js` e `windows/`; chi lo usa è `main.js`.

### `class Workareas extends Emitter`

`new Workareas({ canvas, desktop, wm, launcher, key = 'workareas' })` (`launcher` è il valore restituito da `connectLauncher`; `key` è dove si salvano, `ws:<id>:workareas`). Nel costruttore:

- imposta `desktop.workareas` e `canvas.fitScope`;
- chiama `setLaunchScope(…)` con la workarea attuale come ambito;
- carica le workarea salvate sotto `key` ([`lilos:ws:<id>:workareas`](#lilosworkareas)): le workarea ridotte nascondono i loro elementi e mettono l'icona, quelle aperte mostrano l'area e riaprono le finestre salvate;
- salva le finestre 400 ms dopo ogni `change` del canvas e ogni `open`/`close` del gestore delle finestre, e alla chiusura della pagina (`pagehide`).

**Cronologia**: creare (con la rinomina iniziale: un passo), rinominare (dalla barra del titolo o dall'icona con F2; non dalla finestra delle proprietà), spostare, ridimensionare ed eliminare vanno in `desktop.history`. Ridurre a icona e riaprire non vengono registrati. `rename(id, title, { record = false })` e `remove(id, { record = true })` hanno l'opzione `record`. Annullando un'eliminazione la workarea torna aperta, nello stesso punto; se lì ora c'è un'altra workarea, l'annullamento fallisce. I messaggi brevi ("Le aree non possono sovrapporsi") usano `toast()`.

Una workarea è `{ id, title, rect, collapsed, created, modified, description, meta, items, windows }` (vedi [`lilos:workareas`](#lilosworkareas)). In sviluppo il gestore è `lilos.workareas`.

**Interrogare**

| Membro | Descrizione |
| --- | --- |
| `load(key, { reopen = true })` | Prende le workarea di un altro workspace (salvate sotto `key`): le attuali e le loro icone spariscono, le nuove si mettono sulla scrivania. Chiamalo dopo `Desktop.load` e dopo `flush()`. Con `reopen` riapre le finestre salvate nelle aree aperte (la prima volta che il workspace è mostrato nella sessione); altrimenti sono ancora aperte, nascoste. Promise: risolve quando le finestre sono tornate. |
| `flush()` | Salva subito le finestre delle aree aperte (prima di lasciare il workspace). |
| `get(id)` | La workarea (oggetto interno, da non modificare), o `null`. |
| `list()` | Copia di tutte. |
| `current` | Id della workarea attuale, o `null`. |
| `at(point)` | Id della workarea **aperta** la cui area contiene il punto del mondo, o `null`. |
| `itemsIn(id)` | Elementi del desktop in vista il cui centro è nell'area (icone di workarea escluse). Vuoto se la workarea è ridotta. |
| `windowsIn(id)` | Finestre il cui centro è nell'area, anche ridotte a icona. Vuoto se la workarea è ridotta. |
| `windowWorkarea(win)`, `itemWorkarea(item)` | Id della workarea aperta in cui si trova una finestra o un elemento, o `null` (un'icona di workarea non sta mai in una workarea). |
| `contentOf(id)` | `{ items, windows }`: quanti elementi e quante finestre di app contiene. Se è ridotta: gli elementi nascosti che esistono ancora e le finestre salvate. |
| `freeCenter(win)` | Dove mettere una finestra aperta fuori da ogni workarea: `null` (centro della vista) se lì non c'è un'area; altrimenti il punto libero più vicino nella vista (passo di 40); altrimenti a destra di tutte le aree. |
| `boundsOf(id)` | Spazio per le finestre: l'area sotto la barra del titolo, rientrata di 8 px. `null` se ridotta. |
| `centerOf(id)` | Dove vanno le nuove finestre: il centro della parte visibile dell'area (sotto la barra del titolo), o il centro dell'area se se ne vede poco. |

**Creare e modificare**

| Metodo | Descrizione |
| --- | --- |
| `create(rect, { title?, rename = true })` | Crea una workarea con quell'area (minimo 280 × 180, coordinate arrotondate), la rende attuale, porta l'area nella vista e, con `rename`, avvia la rinomina nella barra del titolo. Restituisce l'id. Restituisce `null` e mostra un messaggio se ce ne sono già 200 o se l'area coprirebbe un'altra workarea aperta. Titolo predefinito: "Nuova workarea". |
| `createAt(point)` | Come `create` con l'area di 720 × 460 e la barra del titolo centrata sul punto (menu **Nuovo → Workarea**). |
| `createAround(items)` | Crea l'area attorno a elementi del desktop, con 24 px di margine e la barra del titolo sopra. `null` se l'elenco è vuoto. |
| `rename(id, title)` | Cambia il titolo (ripulito, al massimo 80 caratteri; un titolo vuoto o uguale si ignora). |
| `update(id, { description?, meta? })` | Cambia descrizione (al massimo 2000 caratteri) e metadati (ripuliti da `cleanMeta`). |
| `renameInPlace(id)` | Rinomina nella barra del titolo (Promise). Non fa nulla se la workarea è ridotta. |
| `properties(id)` | Apre la finestra delle proprietà. |
| `setCurrent(id \| null)` | Cambia la workarea attuale ed emette `current`. |

**Ridurre, riaprire, eliminare**

| Metodo | Descrizione |
| --- | --- |
| `collapse(id)` | Chiede `canClose()` a ogni finestra dell'area (anche secondarie); se una risponde `false` si ferma e restituisce `false`. Poi salva le finestre delle app (`getState`, posizione, dimensione, ridotta o no), chiude tutte le finestre dell'area, nasconde gli elementi (ricordandone gli id in `items`), toglie l'area e mette l'icona nell'angolo in alto a sinistra. Restituisce `true`. |
| `expand(id, { frame = true })` | Se riaprendola l'area coprirebbe un'altra workarea aperta, la sposta a destra con il contenuto (40 px di distanza). Toglie l'icona, mostra gli elementi, rimonta l'area, la rende attuale, con `frame` inquadra l'area (zoom al massimo 100%) e riapre le finestre una dopo l'altra con `launcher.restore`. |
| `remove(id)` | Elimina solo la workarea. Se è ridotta la riapre prima (senza inquadrarla). Elementi e finestre restano. Emette `change`. |
| `confirmRemove(ids, x, y)` | Apre un piccolo menu in `x`, `y` con **Elimina … (il contenuto resta sulla scrivania)** e **Annulla**. |
| `iconMoved(item)` | Da chiamare quando un'icona di workarea è stata spostata: muove area nascosta, elementi nascosti e finestre salvate dello stesso scarto. Lo fa il `Desktop`. |
| `menuEntries(id)` | Voci di menu per sfondo e barra del titolo: titolo (disattivata), Rinomina la workarea, Proprietà…, Riduci a icona, Elimina la workarea…. |

**Eventi**

| Evento | Payload | Quando |
| --- | --- | --- |
| `change` | `id` | Una workarea è cambiata (titolo, area, descrizione, metadati, stato) o è stata eliminata (allora `get(id)` è `null`). |
| `current` | `id \| null` | È cambiata la workarea attuale. |

**Regole**

- **Appartenenza**: il centro dell'elemento o della finestra dentro l'area (bordi compresi). Niente elenchi da tenere: dopo uno spostamento basta chiedere di nuovo.
- **Niente sovrapposizioni tra aree aperte.** Trascinando o ridimensionando, l'area si ferma all'ultimo punto valido. Le aree ridotte non contano.
- **Workarea attuale**: l'ultima in cui si è premuto il puntatore (tasto sinistro o destro) sullo sfondo, su un elemento o sulla barra del titolo; oppure quella della finestra che prende il focus (evento `focus` di `wm`). Un clic fuori da ogni area la toglie. Ridurre la workarea attuale la toglie.
- **Spostare**: trascinando la barra del titolo (soglia di 3 px) si muovono area, elementi e finestre che erano dentro all'inizio del trascinamento. Il `Desktop` salva le posizioni alla fine.
- **Ridimensionare**: dai bordi e dagli angoli; ciò che finisce fuori dall'area ne esce. Dimensione minima 280 × 180.
- **Finestre salvate**: solo quelle con `wm.appOf(win)` non nullo. Quelle secondarie (proprietà, selettori, impostazioni dell'Editor) si chiudono senza essere salvate.
- **Mentre le finestre si riaprono** il salvataggio delle liste di finestre è sospeso, così un ricaricamento a metà non le perde.

```js
// Console, in sviluppo
const id = lilos.workareas.createAt({ x: 0, y: 0 });
lilos.workareas.rename(id, 'Cliente Rossi');
await lilos.workareas.collapse(id);   // icona sulla scrivania
await lilos.workareas.expand(id);     // di nuovo aperta, con le finestre
```

### `class WorkareaFrame`

`new WorkareaFrame(ws, { onMove, onResize, onCollapse, onProperties, onMenu, onRename })`: il DOM di un'area aperta. Mostra e segnala, decide `Workareas`. Costanti esportate: `HEADER` = 34 (altezza della barra del titolo, in pixel del mondo) e `AREA_EDGES` (`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`).

DOM: `div.wa-area[data-kind="workarea"][data-id][role="region"]` con la barra `.wa-head` (simbolo, titolo `.wa-title`, pulsanti Proprietà e **Riduci a icona**) e un `.wa-edge[data-edge]` per bordo. L'area lascia passare il puntatore (`pointer-events: none`): lo prendono solo la barra e i bordi. Viene messa come primo figlio del mondo, sotto tutto, con la classe `obj`, quindi minimappa e "Mostra tutto" la vedono.

| Membro | Descrizione |
| --- | --- |
| `el`, `head`, `title`, `edges` | Elementi DOM. |
| `update(ws)` | Aggiorna titolo, `aria-label`, suggerimento (titolo e descrizione) e area. |
| `setRect({ x, y, w, h })` | Posizione e dimensioni in coordinate mondo. |
| `setCurrent(bool)` | Classe `current`: bordo continuo invece di tratteggiato. |
| `editTitle()` | Rinomina in linea; Promise con il nuovo titolo, o `null` se annullata o invariata. Invio conferma, Esc annulla, la perdita del focus conferma. |

Callback: `onMove(e)` barra trascinata, `onResize(e, edge)` bordo trascinato, `onCollapse()`, `onProperties()`, `onRename()` (doppio clic sulla barra), `onMenu(e)` (tasto destro sulla barra).

### `store.js`

Lettura, controllo e scrittura di `lilos:ws:<id>:workareas` (formato in [Dati salvati](#lilosworkareas)).

| Export | Descrizione |
| --- | --- |
| `loadWorkareas(key = 'workareas')` | Le workarea salvate sotto `key`, controllate una per una; `[]` se non c'è nulla o il dato non è un elenco. |
| `saveWorkareas(list, key = 'workareas')` | Scrive l'elenco sotto `key`. |
| `newWorkarea(rect, title?)` | Una workarea nuova (id con `uid()`, aperta, date uguali a ora). |
| `cleanTitle(v)`, `cleanMeta(list)`, `cleanSavedWindow(w)` | Ripuliscono titolo, metadati e una finestra salvata (`null` se non valida). |
| `MIN_SIZE` | `{ w: 280, h: 180 }` |
| `MAX_META` | 40 |
| `LIMITS` | `{ MAX_WORKAREAS: 200, MAX_WINDOWS: 30, MAX_DESCRIPTION: 2000, MAX_META_KEY: 60, MAX_META_VALUE: 500, MAX_TITLE: 80 }` |

### `properties.js`

`openProperties(wm, workareas, id)`: apre la finestra delle proprietà (460 × 520, senza pulsante di riduzione) con la chiave `workarea:<id>`; se esiste già la mostra. Si apre dentro l'area (`centerOf`, `boundsOf`).

- **Titolo** e **Descrizione**: modificabili. Un titolo vuoto non si salva e, alla fine, torna quello precedente.
- **Informazioni**: Creato, Modificato, Stato ("Aperto sulla scrivania" o "Ridotto a icona"), Contenuto ("N elementi, N finestre", contano solo finestre di app), Dimensioni (`larghezza × altezza`). Si aggiornano con `change`.
- **Metadati personalizzati**: righe Nome e Valore, **Aggiungi un metadato** e un pulsante per togliere ogni riga; al massimo 40 (poi il pulsante si spegne e compare una nota).
- Tutto è salvato mentre si scrive. La finestra si chiude se la workarea viene eliminata.

---

## workspaces/

Scrivanie separate. Panoramica e motivazioni: [README per sviluppatori](README.md#workspace) e decisione D27. Il modulo dipende dall'SDK, da `desktop/`, `canvas/`, `workareas/`, `windows/` e `apps/`; lo crea `main.js`.

### `class Workspaces extends Emitter` (`Workspaces.js`)

`new Workspaces({ state, canvas, desktop, wm, launcher, workareas, taskbar })`; `state` è il valore restituito da `setupWorkspaces`. Nel costruttore:

- imposta il filtro delle app installate del registro (`setInstalledFilter`) e collega `info.js`;
- dice al gestore delle finestre qual è il workspace attuale e riapre le finestre salvate fuori dalle workarea (`lilos:ws:<id>:windows`);
- registra le scorciatoie del gruppo Workspace, attive anche mentre si scrive e solo se i workspace sono almeno due: `workspaces.next` (Ctrl Alt →) e `workspaces.previous` (Ctrl Alt ←);
- crea il `WorkspaceSwitcher`, il pulsante nella barra;
- salva le finestre 400 ms dopo ogni `open`/`close` del gestore delle finestre e `change` del canvas, e alla chiusura della pagina.

Un workspace vivo è `{ id, name, color, created, desk, apps }` (vedi [`lilos:workspaces`](#lilosworkspaces)). In sviluppo il gestore è `lilos.workspaces`.

| Membro | Descrizione |
| --- | --- |
| `list()` | Copie dei workspace vivi, in ordine. |
| `get(id)` | Il workspace vivo (oggetto interno, da non modificare), o `null`. |
| `currentId`, `current` | Id del workspace attuale; copia del workspace attuale. |
| `describe(id)` | `{ id, name, color, removed, current }` per qualunque workspace mai creato, anche eliminato; `null` se sconosciuto. |
| `ownedCount(id)` | Quanti file, cartelle e collegamenti ha creato (`fs.ownedCount`). |
| `switchTo(id)` | Mostra un altro workspace. Messo in coda con le eliminazioni; `Promise` che risolve quando le sue finestre sono tornate. Non fa nulla per un id sconosciuto o già attuale. Salva il workspace lasciato (chiude i menu, conferma le rinomine in corso, salva finestre, workarea e posizioni), poi cambia `fs`, finestre, camera, scrivania e workarea, emette `switch` e mostra il messaggio «Workspace «nome»». Le finestre del workspace lasciato restano aperte, nascoste. La cronologia della scrivania riparte. |
| `step(dir)` | Il successivo (`1`) o il precedente (`-1`), tornando al giro. Non fa nulla con un solo workspace. |
| `create({ name?, color? })` | Nuovo workspace con la Scrivania vuota e tutte le app installate. Restituisce l'id; `null` (con un messaggio) se ce ne sono già 20. Nome predefinito «Workspace N», colore il primo accento non usato. **Non lo mostra**: chiama `switchTo(id)`. |
| `rename(id, name)`, `setColor(id, color)` | Cambiano nome (ripulito, al massimo 40 caratteri; vuoto o uguale si ignora) e colore (esadecimale `#rrggbb`). |
| `isInstalled(appId, id?)` | `true` se l'app è installata nel workspace (l'attuale se manca `id`); le app `system` sempre. |
| `setInstalled(appId, on, id?)` | Installa o disinstalla (non le app `system`). Disinstallando nell'attuale chiude le finestre di quell'app con `requestClose`: ognuna può chiedere conferma se ha modifiche non salvate. |
| `remove(id)` | Elimina un workspace (mai l'ultimo), in coda. Se è l'attuale mostra prima il successivo. La Scrivania diventa `/Documenti/Scrivania di <nome>` (con `fs.share`; rimossa se vuota); ciò che aveva cestinato dalla sua Scrivania diventa visibile a tutti (`fs.unscopeTrash`); le finestre delle app passano nel workspace attuale (`wm.adopt`), quelle secondarie si chiudono; chiavi `lilos:ws:<id>:…` cancellate; nell'elenco resta la voce "rimossa". Promise: il percorso della vecchia Scrivania, `''` se era vuota, `null` se non ha eliminato nulla. File e cartelle creati altrove restano dove sono. |

**Eventi**

| Evento | Payload | Quando |
| --- | --- | --- |
| `change` | — | Cambiati elenco, nomi, colori o app installate. |
| `switch` | `id` | Mostrato un altro workspace. |

### `setup.js`

- `setupWorkspaces({ firstStart })` → `{ current, list }`. Va chiamato dopo `setupFileSystem()`, prima di creare la scrivania e mentre `fs` non ha un workspace impostato. Al primo avvio o con dati di prima dei workspace crea **«Principale»**: prende la vecchia `/Scrivania` (resa privata), diventa proprietario di tutti i nodi esistenti (`fs.claim`) e le chiavi `camera`, `desktop-layout` e `workareas` passano a `ws:<id>:…`; al primo avvio la sua Scrivania riceve gli elementi di esempio. Ripara: una Scrivania privata il cui workspace non è nell'elenco fa tornare il workspace (con il nome rimasto, o «Workspace recuperato»); un workspace senza Scrivania ne riceve una nuova vuota; le chiavi `lilos:ws:<id>:…` di workspace inesistenti vengono cancellate. Imposta `fs.setWorkspace(current)`.
- `createDesk(workspaceId)` → id di una nuova cartella Scrivania privata.
- `appIds()` → `Set` degli id delle app del registro.

### `store.js`

Lettura, controllo e scrittura di `lilos:workspaces` (formato in [Dati salvati](#lilosworkspaces)).

| Export | Descrizione |
| --- | --- |
| `loadWorkspaces(appIds)` | `{ current, list }` controllato voce per voce. `current` può non essere valido (lo ripara il chiamante). |
| `saveWorkspaces(state)` | Scrive lo stato. |
| `newWorkspace({ name, color, desk, apps, id? })` | Un workspace nuovo (id con `uid()`, data di creazione adesso). |
| `workspaceKey(id, part)` | `'ws:<id>:<part>'`: la chiave di una parte del workspace. |
| `PARTS` | `['camera', 'desktop-layout', 'workareas', 'windows']`. |
| `forgetWorkspace(id)` | Cancella le chiavi di un workspace. |
| `cleanName(v)`, `cleanColor(v)` | Ripuliscono nome (spazi, 40 caratteri) e colore (esadecimale, altrimenti il primo accento). |
| `LIMITS` | `{ MAX_WORKSPACES: 20, MAX_NAME: 40 }` |

### `info.js`

Ciò che le app possono sapere dei workspace senza dipendere dal gestore (l'app File lo usa per la colonna Workspace). Il gestore si collega da solo.

| Export | Descrizione |
| --- | --- |
| `describeWorkspace(id)` | `{ id, name, color, removed, current }` del proprietario di un nodo (`node.workspace`); `null` se `id` manca (cartelle di sistema condivise) o non è noto. |
| `onWorkspacesChange(fn)` | Chiama `fn` quando i workspace cambiano (`change` o `switch`). Restituisce la funzione che smette di ascoltare. |
| `workspaceManager()` | Il gestore `Workspaces` (lo usa Impostazioni), o `null`. |

### `WorkspaceSwitcher.js`

Il pulsante nella barra a destra del logo (`button.tb-ws`: pallino con il colore e nome) e il suo menu: elenco dei workspace (spunta sull'attuale), Successivo, Precedente (con le scorciatoie), Nuovo workspace, Gestisci i workspace… (apre `launch('settings', { tab: 'workspaces' })`). Il tooltip riporta le scorciatoie. Ha `aria-haspopup="menu"` ma non `aria-expanded`.

---

## systemFs.js

- `DESK_NAME`: `'Scrivania'`, il nome della cartella di ogni workspace.
- `SYSTEM_FOLDERS`: le cartelle sotto la radice, con il simbolo per la barra laterale di File: Scrivania, Documenti, Immagini, Download.
- `setupFileSystem()` → `{ firstStart }` (`true` se non c'era nulla di salvato). Crea le cartelle di sistema **condivise** che mancano (Documenti, Immagini, Download). La Scrivania non la crea: ogni workspace ha la sua (`setupWorkspaces`). Va chiamata prima che un workspace sia impostato.
- `fillDesk(deskId, layoutKey)`: al primo avvio riempie una Scrivania con gli elementi della vecchia scrivania piatta (`lilos:desktop`, che poi viene eliminata) o con `seed.js`, e scrive le posizioni sotto `layoutKey`.

---

## apps/open.js e apps/openWith.js

Quale app apre quale file, per estensione. Le scelte predefinite vengono da `opens` del registro; l'utente le cambia in Impostazioni → Usabilità → Tipi di file (`lilos:file-apps`).

| Funzione | Descrizione |
| --- | --- |
| `openFile(node, { choose? })` | Apre il file con la sua app (`launch(app, { file: id })`); senza app associata, con un'app **non installata nel workspace attuale**, o con `choose: true`, mostra la finestra "Apri con". |
| `appFor(ext)` | L'app per quell'estensione, o `null` (chiedi). La scelta è la stessa in ogni workspace. |
| `defaultAppFor(ext)` | L'app predefinita secondo il registro, o `null`. |
| `setAppFor(ext, appId \| 'ask' \| null)` | Salva la scelta; uguale alla predefinita (o `null`) la toglie. |
| `resetAppsFor()` | Torna a tutte le predefinite. |
| `fileApps()` | App che aprono file (hanno `opens` e `load`). |
| `installedFileApps()` | Quelle installate nel workspace attuale: le propone "Apri con". |
| `knownExtensions()` | Estensioni da elencare: tipi conosciuti, quelle aperte dalle app, quelle scelte, quelle dei file esistenti. |
| `extensionOf(node)` | Estensione in minuscolo. |
| `setChooser(fn)` | Il sistema registra la funzione che mostra "Apri con" (`main.js`). |

Il launcher passa alle app anche `openWindow(win, key?)` per le finestre secondarie (con una chiave, se è già aperta mostra quella).

`createOpenWith(wm)` (`openWith.js`) crea la finestra **Apri con**: una `Window` senza Riduci e Ingrandisci, a dimensione fissa, con l'elenco delle app (frecce, Invio, doppio clic), la casella "Usa sempre quest'app per i file .xxx" e i pulsanti Annulla / Apri. Ce n'è al massimo una.

---

## apps/commands.js

Scorciatoie delle app, dichiarate nel registro (`commands`) e registrate all'avvio da `registerAppCommands(apps)` nel gruppo con il nome dell'app: così si possono cambiare nelle Impostazioni anche prima di aprire l'app. Sono attive anche mentre si scrive (predefinito `whenEditing: true`).

- `handleCommand(id, { isActive, run })`: una finestra dell'app gestisce il comando finché `isActive()` è vero (di solito `win.active`); restituisce la funzione per staccarsi (da chiamare su `destroy`).

---

## apps/editor/

### `EditorApp.js`

L'app Editor, su `Window`. Export predefinito `({ args, openWindow }) → Window`; `args.file` apre un file, `args.folder` apre una cartella nel pannello di destra (`FileTree.js`). Un documento per finestra; l'evento `launch` con un altro file o un'altra cartella li apre nella stessa finestra (chiedendo prima se ci sono modifiche). Senza la proprietà `args.folder` torna l'ultima cartella aperta; `args.folder: null` significa nessuna cartella (finestra riaperta com'era); `args.sidebar === false` apre il pannello chiuso. `win.getState()` restituisce `{ file, folder, sidebar? }` (`sidebar: false` solo se il pannello è chiuso), usato dalle workarea.

- Testo in una `textarea` trasparente sopra una copia evidenziata (`pre`) con le stesse misure; numeri di riga a sinistra, riga corrente evidenziata.
- Salva con `fs.write`; un documento nuovo viene creato nella cartella aperta a destra, se c'è, altrimenti in `/Documenti`, come "Senza titolo.txt".
- Barra in alto: Nuovo documento, Apri un file… e Apri una cartella… (con `pickFile`), Salva, Mostra nella cartella, schema JSON, linguaggio, impostazioni, pannello della cartella (`aria-pressed`).
- Con modifiche non salvate: barra di conferma (Salva / Non salvare / Annulla) prima di chiudere (`win.canClose`), aprire un altro file o crearne uno nuovo; avviso del browser su `beforeunload`.
- Comandi `editor.save` (Ctrl S), `editor.new` (Ctrl Alt N), `editor.openFile` (Ctrl O), `editor.openFolder` (Ctrl Alt O), `editor.sidebar` (Ctrl B) e `editor.complete` (Ctrl Spazio) tramite `handleCommand`.
- Segue `fs`: file eliminato (il testo resta), rinominato, spostato o con una cartella sopra rinominata (nuovo percorso e nuovo URI per il language server).
- Suggerimenti (`complete.js`): un elenco `role="listbox"` sotto la parola (sopra se sotto non c'è spazio), collegato alla `textarea` con `aria-autocomplete`, `aria-expanded`, `aria-activedescendant`. Si apre da solo quando si scrive un carattere di parola (o `.`, `<`, `&`, `@`, uno spazio dentro un tag HTML), si aggiorna con Backspace, si chiude con spazi, a capo, clic, scorrimento o perdita del focus. Mentre è aperto: frecce, Pag ↑/↓, Invio/Tab per accettare, Esc per chiudere. Accettare sostituisce la parola iniziata; un `|` nel testo da inserire indica dove va il cursore. In CSS, dopo una proprietà si aprono subito i suoi valori.
- Tab / Shift Tab rientro di due spazi, Invio mantiene il rientro, Esc esce dal testo. Gli inserimenti passano da `execCommand('insertText')` per conservare Annulla.
- Ctrl Z / Ctrl Y nel testo: `history.attach(input, { text: true, undo, redo })`. Il gestore chiude i suggerimenti, rimette il focus nella `textarea` e usa `document.execCommand('undo' | 'redo')`, cioè la cronologia della `textarea` (scrittura, suggerimenti, rientri). Restituisce `''` se è andato a buon fine, `null` altrimenti: l'etichetta è vuota, quindi in basso non compare nessun messaggio.
- Oltre 300 000 caratteri il testo non viene colorato, per restare veloce.

### `complete.js`

`complete(text, caret, lang, { manual })` → `{ from, items }` o `null`.

- `from`: inizio della parola da completare; `items`: `[{ label, insert, kind, detail }]`, al massimo 100, prima quelli che iniziano con quanto scritto (maiuscole uguali, poi diverse), poi quelli che lo contengono (da 2 lettere). Tipi (`kind`): `kw`, `fn`, `pr`, `val`, `tag`, `attr`, `abc` (parola del documento).
- Per linguaggio: JavaScript e Python (parole chiave, globali/predefinite, membri dopo il punto), CSS (proprietà, valori per proprietà, `var(--…)` del file, regole `@`, selettori), HTML (tag con chiusura, attributi globali e del tag, tag da chiudere, entità), JSON (chiavi del file, valori), Markdown (linguaggi dei blocchi, parole), testo (parole). Più le parole del documento.
- Automatico (`manual: false`): serve almeno 1 carattere (3 per testo e Markdown) salvo dove il contesto basta (dopo `.`, `<`, `</`, `: ` in CSS, l'apertura di un blocco Markdown); niente dentro stringhe e commenti. Manuale: risponde sempre.
- I vocabolari sono elenchi nel file; vedi la decisione D20 sul passaggio a formati standard.

### `highlight.js`

- `LANGUAGES`: `text`, `markdown`, `javascript`, `css`, `html`, `json`, `python`, ognuno `{ label, rules: [[RegExp, classe]] }`. Le espressioni non devono avere gruppi di cattura (usa `(?:…)`).
- `languageFor(name)`: il linguaggio dall'estensione.
- `tokenize(text, lang)` → `[[classe | null, testo], …]`. Classi: `kw` parola chiave, `st` testo, `nu` numero, `cm` commento, `fn` funzione/link, `pr` proprietà, `pu` punteggiatura, `hd` titolo, `bd` grassetto, `it` corsivo (stili `.tk-*` in `editor.css`).
- Il risultato diventa nodi di testo e `span`, mai HTML.

---

## apps/files/FilesApp.js

L'app File (File Manager), su `Window`. Export predefinito `({ args }) → Window`; `args.folder` è la cartella da aprire (altrimenti Home); `args.trash: true` (o `args.folder === fs.trashRoot`) apre il cestino; `args.tag` (id di un tag che esiste) apre la vista di quel tag. `win.getState()` restituisce `{ folder }` (`fs.trashRoot` se mostra il cestino, `'tag:<id>'` se mostra un tag; un tag che non esiste più si ignora e si apre Home). L'evento `launch` sulla finestra già aperta mostra la nuova cartella.

- Barra: Indietro, Avanti, Su, percorso cliccabile, Nuova cartella, vista elenco/icone (salvata in `lilos:files-view`), ricerca nella cartella.
- Barra laterale: Home e le cartelle di sistema (attiva quella che contiene la cartella aperta), il blocco dei tag, i collegamenti e la voce **Cestino**, nell'ordine scelto dall'utente (vedi sotto).
- **Cestino.** Mostra `fs.trashed()` come se fosse una cartella (id `fs.trashRoot`, che non è un nodo): colonne Nome, Eliminato, Dimensione, Tipo, Posizione originale; la barra di stato dice dopo quanto tempo si eliminano gli elementi (`trashRetention`). Si ridisegna sull'evento `trash`. Gli elementi non si aprono né si rinominano e "Nuova cartella" è disattivata. Menu dell'elemento: Ripristina (`restoreNodes`, annullabile, con un `toast` che dice dove sono andati) ed Elimina definitivamente… (`fs.purge`, chiede **sempre** conferma, non si annulla). Menu dello sfondo: Ripristina tutto e Svuota il cestino… (`fs.purgeTrash()`). Canc nel cestino è Elimina definitivamente.
- **Tag.** Nella barra laterale, dopo la sezione Collegamenti, l'intestazione «Tag» e una voce per tag (pallino con il colore e nome; i tag invisibili hanno il simbolo `eyeOff`), fuori dall'ordine dei collegamenti e senza `data-entry`. La vista di un tag mostra `fs.tagged(id)` come se fosse una cartella (id `'tag:<id>'`, che non è un nodo): tutti gli elementi con quel tag, anche quelli nascosti, che il workspace attuale vede. Colonne Nome, Posizione (`Home` o il percorso della cartella), Tipo, Workspace; ricerca, ordinamento, apri, rinomina ed elimina funzionano; "Nuova cartella" è disattivata. Menu dell'elemento: **Mostra nella cartella** (`reveal`: apre la cartella con l'elemento selezionato; se l'elemento è nascosto da un tag invisibile non lo seleziona e lo dice nella barra di stato) e **Togli il tag «X»**; menu dello sfondo: Gestisci i tag… e la vista. Barra di stato: «Tutti gli elementi con questo tag» o, con il tag invisibile, «Tag invisibile: questi elementi sono nascosti altrove». Se il tag viene eliminato, la finestra torna a Home. Si ridisegna sugli eventi `change` di `tags` e sulle modifiche di `fs`. In ogni vista, il menu di un elemento ha il sottomenu **Tag** e i pallini dei tag compaiono dopo il nome (elenco, `tagDots`) o sull'icona (vista a icone).
- Elenco: colonne Nome, Modificato, Dimensione, Tipo, Workspace, ordinabili (le cartelle restano in cima); vista a icone. La colonna Workspace mostra un pallino con il colore e il nome del workspace che ha creato il nodo (`describeWorkspace`): «Condiviso» per i nodi senza proprietario (le cartelle di sistema), «Nome (eliminato)» se il workspace non esiste più, «Sconosciuto» per un id non in elenco. Nella vista a icone il tooltip dice «Workspace: …». Si aggiorna quando i workspace cambiano.
- Vede solo ciò che il workspace attuale può vedere (`fs`): la Scrivania degli altri non compare. Se il workspace cambia e la cartella aperta non è visibile da lì, la finestra (nascosta) resta com'è e torna con il suo workspace.
- **Trascinamento** (vedi [itemDrag.js](#itemdragjs)): righe (elenco) e riquadri (icone) sono marcati con `markItem`, tranne nel cestino. Trascinare un elemento selezionato sposta **tutta la selezione** (`stack` = `history` della finestra). Un clic semplice su uno di più elementi selezionati restringe la selezione a lui **al rilascio** (non alla pressione, per poterli trascinare). Bersagli: le cartelle (righe e riquadri), l'elenco (`dropZone` per la cartella mostrata: non nel cestino e non nelle viste dei tag), le cartelle del percorso in alto e la barra laterale (vedi sotto). Nella barra, al centro del **Cestino** si elimina con `removeNodes(stack, ids)` (sempre nel cestino, anche con `deletePermanent`; annullabile nella finestra di partenza) con un toast, se almeno un nodo non è di sistema; al centro del blocco **Tag** non succede niente.
- **Barra laterale.** In cima la sezione «Collegamenti» (`section.fm-side-links`, intestazione «Collegamenti»): le voci fisse (Home, Scrivania, Documenti, Immagini, Download) e i collegamenti, nell'ordine scelto dall'utente (`links`, vedi [links.js](#linksjs)). Dopo di lei, **fuori dall'ordine e non spostabili**: il blocco dei Tag, il separatore e il Cestino (`[data-trash]`). Ogni voce della sezione ha `data-entry` (la chiave dell'ordine) e, se apre una cartella, `data-folder`; **non usa `markItem`**. Un collegamento è una riga `div.fm-link-row[data-entry]` con il pulsante `.fm-link` e il pulsante `.fm-link-x` (×). La barra è una `dropZone` con `target`, perché lo stesso elemento ha due significati: `#sideTarget(hit, x, y, ids)` decide dalla posizione del puntatore. Sul **Cestino** (centro o bordi) i nodi vanno sempre nel cestino (`removeNodes`; accetta solo se almeno un nodo non è di sistema) e non si crea mai un collegamento. Sui Tag e nello spazio sotto il Cestino non c'è bersaglio (nessuna linea, nessuna azione). Nella sezione, al **centro** di una voce con `data-folder` i nodi si spostano nella cartella (`movableInto` / `moveInto`, annullabile). Vicino al **bordo** (fascia di `min(8, altezza/4)` px), al centro del collegamento a un file, o nella parte vuota in fondo alla sezione (circa 10 px), si chiama `links.place(chiavi, indice, defaults)`: una linea (`.fm-gap`) mostra dove andrà; un elemento già nella sezione si sposta lì invece di duplicarsi; un solo elemento rilasciato dov'è già non è un bersaglio. Toast «Collegamento aggiunto» o «N collegamenti aggiunti». Le voci della sezione si trascinano con `dragItems({ ids: [nodo] })` (tranne dal pulsante ×) e si riordinano così; trascinate fuori dalla barra trascinano il nodo vero. Clic su un collegamento: una cartella si mostra, un file si apre (`openFile`), un'app si avvia. **Eliminare un collegamento** (`#unlink`): toglie solo la chiave (`links.remove`), con il pulsante ×, il tasto Canc sul pulsante con il focus (`stopPropagation`, quindi non agisce sugli elementi selezionati nell'elenco) o la voce «Elimina il collegamento» del menu (insieme a Apri e Mostra nella cartella, `reveal`). Registra un passo `Elimina il collegamento a «nome»` nella `history` della finestra (undo: `links.place` alla posizione di prima; redo: `links.remove`), mostra il toast «Collegamento a «nome» eliminato» e riporta il focus sull'elenco. Le voci fisse non si eliminano. Il menu degli elementi ha **Aggiungi alla barra laterale di File** (`linkEntry`). Si ridisegna sull'evento `change` di `links`. Riordinare e aggiungere non sono annullabili.
- Selezione: clic, Ctrl + clic, Shift + clic (intervallo), frecce (con Shift), Home/Fine. Backspace e Alt ↑ salgono, Alt ←/→ vanno indietro e avanti. Sono tasti di navigazione fissi.
- È un *target* dei comandi sugli elementi quando la sua finestra è attiva. Rinomina in linea; i nodi di sistema non si rinominano né eliminano.
- Apre le cartelle al suo interno, avvia le app, apre i file con `openFile` (app associata o "Apri con"); nel menu del tasto destro "Apri con…".
- Segue gli eventi `change` di `fs`; se la cartella aperta viene eliminata, passa alla cartella che la conteneva.
- `history`: una `UndoStack` per finestra, collegata a `win.el` con `history.attach` (e scollegata alla chiusura). Registra creare (con il nome: un passo), rinominare, eliminare e spostare con il trascinamento (anche verso la scrivania o l'Editor), tramite [`fsHistory.js`](#fshistoryjs) e `confirmRemove`. Chiusa la finestra, la cronologia si perde.

---

## apps/registry.js e apps/launcher.js

- `apps`: array di `{ id, name, glyph, color, system?, load?, opens?, commands? }`. `system: true` (File, Impostazioni): sempre installata in ogni workspace. `opens`: estensioni che l'app apre per impostazione predefinita (`''` = senza estensione); un'app con `opens` riceve `args.file`. `commands`: scorciatoie dell'app `{ id, label, keys, whenEditing? }`, registrate all'avvio (vedi [apps/commands.js](#appscommandsjs)).
- `glyph` è un nome accettato da `icon()`. `load` importa il modulo dell'app (`() => import('./settings/SettingsApp.js')`); le app senza `load` non sono ancora realizzate.
- `getApp(id)` → l'app o `undefined`.
- L'app Impostazioni accetta `args.tab` (id di una scheda, per esempio `'workspaces'`) e si apre su quella, anche se è già aperta.
- `isInstalled(id)` → `true` se l'app esiste ed è installata nel workspace attuale (le `system` sempre). `installedApps()` → quelle installate, nell'ordine del registro. `setInstalledFilter(fn)`: il sistema (`Workspaces`) imposta `fn(appId) → boolean`; predefinito: tutte installate. Il menu di avvio mostra solo le installate.
- `launch(id, args?)`: emette `app:launch` con `{ id, args }`.
- `connectLauncher(wm)`: trasforma `app:launch` in finestre. Al primo avvio carica il modulo dell'app e chiama il suo export predefinito `({ args }) → Window`, poi apre la finestra con `wm.open(win, { app: id, center, bounds })`. Se l'app ha già una finestra **nell'ambito attuale** (e nel workspace attuale) la riporta in primo piano (ed emette `launch`). Le app senza `load` scrivono un avviso in console. Un'app **non installata** nel workspace attuale non parte: un messaggio (`toast`) dice di aggiungerla da Impostazioni → Workspace. La finestra appartiene al workspace attuale al momento della richiesta, anche se l'utente cambia workspace mentre l'app si carica (in quel caso si apre nascosta nel suo workspace).
- `connectLauncher(wm)` restituisce `{ restore }`. `restore({ app, state, rect }, { workspace = wm.workspace })` ricrea la finestra di un'app com'era: chiama il suo export con `state` come `args` e la apre con `wm.open(win, { app, at: rect, workspace })`, senza spostare la camera. Restituisce una Promise con la finestra, o `null` se l'app non esiste, non è installata nel workspace attuale o non parte.
- `setLaunchScope({ includes, center, bounds })`: stringe l'ambito in cui il launcher lavora (lo imposta `Workareas`). `includes(win)` → `boolean` dice quali finestre aperte contano come "la finestra dell'app" (una per app per ambito); `center(win)` → punto del mondo o `null` dove va una finestra nuova (`null`: il centro della vista); `bounds()` → rettangolo del mondo o `null` in cui deve restare. Predefinito: tutta la scrivania, nessun centro né limite. `openWindow` delle app (finestre secondarie) usa lo stesso centro e gli stessi limiti.

### Modulo di un'app

```js
// src/apps/notes/NotesApp.js
import { Window, h } from '@lilos/sdk';

export default function createNotes({ args }) {
  const win = new Window({ title: 'Note', icon: 'pencil', width: 520, height: 380 });
  win.body.append(h('textarea', { class: 'notes' }));
  return win;
}
```

---

## windows/WindowManager.js

### `class WindowManager extends Emitter`

`new WindowManager(canvas, taskbar)`. Ospita le `Window` dell'SDK sulla scrivania.

**Workspace.** Ogni finestra appartiene al workspace che era attuale quando è stata aperta. Si vedono (con il pulsante nella barra) solo quelle del workspace attuale; le altre restano vive e nascoste (classe `ws-away` sulla finestra e sul pulsante), con tutto il loro stato. `windows`, `get(key)`, il focus e `cycle()` considerano solo il workspace attuale. Senza `setWorkspace` (`workspace` è `null`) tutte le finestre sono dello stesso gruppo.

| Membro | Descrizione |
| --- | --- |
| `open(win, { key?, app?, center?, bounds?, at?, workspace? })` | Mette la finestra, aggiunge il pulsante nella barra, le dà il focus ed emette `open`. Per impostazione predefinita al centro della vista (le successive scalate di 24 px). `key` permette di ritrovarla con `get`; `app` è l'id dell'app a cui appartiene (vedi `appOf`); `center` è un punto del mondo su cui centrarla; `bounds` un rettangolo del mondo in cui tenerla (se è troppo grande vince l'angolo in alto a sinistra); `at` (`{ x, y, w?, h?, minimized? }`) la rimette esattamente lì, senza muovere la camera e senza cascata (`minimized` la apre ridotta a icona, senza focus). `workspace` (predefinito l'attuale): una finestra per un altro workspace si apre nascosta, senza focus, e compare quando l'utente ci va. |
| `appOf(win)` | L'app data a `open` come `app`, o `null` (finestre secondarie: impostazioni, selettori, proprietà). |
| `geometry(win)` | `{ x, y, w, h, minimized, maximized }` in coordinate mondo. Una finestra ingrandita riporta le misure che riavrà ripristinata. |
| `get(key)` | La finestra aperta con quella chiave **nel workspace attuale**, o `null`. |
| `windows` | Finestre aperte del workspace attuale, dalla più in basso alla più in alto. |
| `windowsOf(workspace)` | Finestre di un workspace, dalla più in basso alla più in alto. |
| `workspace` | Il workspace attuale (`null` se non in uso). |
| `setWorkspace(id)` | Mostra le finestre di `id` (dà il focus a quella che l'aveva quando l'utente se n'è andato) e nasconde tutte le altre. |
| `adopt(workspace)` | Sposta nel workspace attuale tutte le finestre di un altro (un workspace eliminato), scalate al centro della vista attuale — anche dentro una workarea attuale. Il testo non salvato resta. |
| `active` | Finestra con il focus, o `null` se il focus è sulla scrivania. |
| `show(win)` | Riapre se ridotta a icona, dà il focus e la porta nella vista. |
| `focus(win \| null)` | Porta in primo piano e attiva la finestra; `null` dà il focus alla scrivania. |
| `minimize(win)` | Nasconde la finestra; il focus passa alla finestra visibile più in alto. |
| `toggleMaximize(win)` | Finestra grande come lo schermo, con la vista al 100% su di essa; di nuovo per ripristinare dimensioni, posizione e vista. Non ingrandisce se il controllo `maximize` è spento; se viene spento mentre la finestra è ingrandita, la ripristina. |
| `requestClose(win)` | Chiusura chiesta dall'utente (pulsante, Alt W): chiede prima `win.canClose()`, se c'è. `Promise<boolean>`: chiusa o no. |
| `close(win)` | Chiude subito, senza chiedere: toglie il pulsante e chiama `win.destroy()`. |
| `cycle()` | Porta in primo piano la finestra più in basso (riaprendola se ridotta a icona): ripetuto, le visita tutte. |

Gestisce anche: trascinamento dalla barra del titolo e ridimensionamento da ogni bordo attivo della finestra (il lato opposto resta fermo, lo spostamento è diviso per lo zoom, le dimensioni rispettano i limiti della finestra), focus con un clic o con il focus da tastiera dentro la finestra, focus alla scrivania con un clic fuori da ogni finestra. Il pulsante nella barra riduce a icona la finestra attiva (se ha il controllo `minimize`) e riapre le altre.

Eventi: `focus` con la finestra o `null`; `open` e `close` con la finestra (le ascolta `Workareas` per salvare le finestre).

Scorciatoie registrate (gruppo Finestre, attive anche mentre si scrive): `windows.close` (Alt W, solo se la finestra attiva ha il controllo `close`) e `windows.next` (Alt N).

Gli `z-index` delle finestre partono da 100 e seguono l'ordine di sovrapposizione.

---

## systemSettings.js

Dichiara le impostazioni del sistema e le applica. Va importato per primo da `main.js`.

| Chiave | Predefinito | Effetto |
| --- | --- | --- |
| `accent` | `'#3b6ef5'` | Colore principale (`--accent`). Accetta solo `#rrggbb`. |
| `motion` | `true` | Con `false` mette `data-motion="off"` su `<html>`: niente animazioni e transizioni. |
| `snap` | `true` | `desktop.snapToGrid` |
| `minimap` | `true` | Minimappa nell'HUD |
| `theme` | `'dark'` | `'dark'` o `'light'`: imposta `data-theme` su `<html>` |
| `deleteConfirm` | `true` | Chiede conferma prima di eliminare file e cartelle (`confirmRemove`) |
| `deletePermanent` | `false` | Elimina senza passare dal cestino (`removeNodes` con `permanent`) |
| `trashRetention` | `30` | Giorni in cui il cestino conserva gli elementi (`0`: per sempre); `systemTrash.js` elimina il resto |
| `lasso` | `'Alt'` | Modificatori che trasformano il trascinamento sullo sfondo in selezione a mano libera: `'Alt'`, `'Ctrl+Alt'` o `'Alt+Shift'` (`LASSO_OPTIONS`) |

Esporta anche `ACCENTS`, i colori proposti dall'app Impostazioni, `RETENTION_OPTIONS` (`[{ value, label }]`: 1, 7, 14, 30, 60, 90, 365 giorni e `0` «Per sempre», per `trashRetention`), `LASSO_OPTIONS` e `selectionMode(event)` → `{ mode: 'lasso' | 'rect', additive }`: percorso libero se sono premuti tutti i modificatori di `lasso`; `additive` (si aggiunge alla selezione) con Ctrl/Cmd o Shift, se non fanno parte della combinazione del percorso.

---

## systemTrash.js

`setupTrash()`: chiamata da `main.js`. Elimina per sempre ciò che è nel cestino da più di `trashRetention` giorni (`fs.purgeTrash(Date.now() - giorni * 86 400 000)`, di tutti i workspace, non solo dell'attuale): all'avvio, ogni ora e quando l'impostazione cambia. Con `trashRetention` a `0` non fa nulla.

---

## systemHistory.js

`setupHistory({ root, activeWindow })`: collega l'annulla e ripeti centrale al sistema. La chiama `main.js` con `{ root: desktop.history, activeWindow: () => wm.active }`.

- `history.setRoot(root)` e `history.setContext(() => activeWindow()?.el ?? null)`.
- Scorciatoie nel gruppo **Modifica** (si cambiano in Impostazioni → Usabilità → Scorciatoie): `edit.undo` (Ctrl Z) e `edit.redo` (Ctrl Y, Ctrl Shift Z). Funzionano anche mentre si scrive (`whenEditing`) e si ripetono tenendo premuto (`repeat`); `when` è `history.handles(…)`, quindi nei campi di testo senza `text: true` il tasto resta al browser.
- Messaggi con `toast()`: `Annullato: …`, `Ripetuto: …` (solo se la voce ha un'etichetta) e `Non si può più fare: …` quando una voce lancia un errore.
- Azioni di menu (`menus.defineAction`): `edit.undo` e `edit.redo`, con le icone `undo` e `redo`, attive solo se la cronologia della **scrivania** ha qualcosa da fare, e agiscono su quella (`history.undoOn(root)`). Si aggiungono con l'editor del menu; non sono nel menu predefinito.
- In sviluppo `window.lilos.history` è l'oggetto `history`.

---

## tags/tagUi.js e scheda Tag

`src/tags/tagUi.js`, usato da scrivania, File e Impostazioni:

| Export | Descrizione |
| --- | --- |
| `tagDots(node, cls = 'tag-dots')` | `HTMLElement` con i pallini dei tag del nodo (al massimo 4, poi «+n»; `title` e `aria-label` «Tag: nomi»), o `null` senza tag. Ignora i tag che non esistono. |
| `setTag(ids, tagId, on)` | Mette (`on`) o toglie il tag a ogni nodo; salta i nodi di sistema e gli id sconosciuti. Usa `fs.setTags`. |
| `tagSubmenu(ids)` | Voce di menu **Tag** con sottomenu: un pallino colorato per tag, con il segno di spunta se tutti i nodi lo hanno (sceglierlo lo toglie a tutti, altrimenti lo mette a tutti); i tag invisibili hanno «(nasconde)» dopo il nome; poi **Nuovo tag…** (`launch('settings', { tab: 'tags', tagFor: ids })`) e **Gestisci i tag…**. Disattivata se non ci sono nodi etichettabili. |

Stili in `src/styles/tags.css` (`.tag-dots`, `.tag-dot`, `.ditem-tags`, `.fm-tag`…).

**Scheda Tag di Impostazioni** (`tagSections` in `SettingsApp.js`, dopo la scheda Workspace). Una sezione «Nuovo tag» (nome e **Crea**, anche con Invio; un errore, come un nome già preso, esce in un `toast`) e una sezione per tag con Nome, Colore (`swatches` con `TAG_COLORS`), Visibile (interruttore, con la spiegazione di cosa succede) ed Elementi (quanti ne vede il workspace attuale, **Mostra in File** e **Elimina…** in due clic, che chiama `tags.remove`). Si ridisegna sull'evento `change` di `tags`. Argomenti di `launch('settings', …)`: `tab: 'tags'` apre la scheda e dà il focus al campo del nuovo tag; `tagFor: string[]` sono gli id degli elementi che prenderanno il prossimo tag creato lì (i nodi che non esistono si ignorano; l'elenco si svuota dopo la creazione).

---

## taskbar/

### `class Taskbar`

`new Taskbar(parent)`.

| Proprietà | Descrizione |
| --- | --- |
| `el` | `nav.taskbar` |
| `startButton` | Pulsante con il logo. |
| `startMenu` | L'istanza di `StartMenu`. |
| `tasks` | Contenitore `.tb-tasks` dei pulsanti delle finestre (`.tb-task`), gestito dal `WindowManager`. |

### `class StartMenu`

`new StartMenu(anchor)`; `anchor` è il pulsante che lo apre, usato per `aria-expanded` e per non chiudere il menu quando lo si clicca.

| Membro | Descrizione |
| --- | --- |
| `open()`, `close()`, `toggle()` | Apre, chiude, alterna. All'apertura chiude un eventuale menu contestuale, svuota la ricerca e dà il focus al campo. |
| `isOpen` | Stato. |

Registra la scorciatoia `system.startMenu` (Ctrl K, gruppo Generale, attiva anche mentre si scrive); la stessa combinazione lo chiude quando il focus è dentro il menu. Il tooltip del pulsante del logo segue la scorciatoia. La ricerca filtra per nome (contiene, senza distinguere maiuscole e minuscole) le app **installate nel workspace attuale** (`installedApps()`).

### `createClock()` → `HTMLElement`

Data breve e ora secondo `session.locale`, aggiornate allo scoccare di ogni minuto. Il tooltip contiene la data completa.

---

## sdk/ui/

### `icons.js`

- `icon(name, className = 'ico')`: simbolo SVG 24×24 disegnato con `currentColor`. Con un nome sconosciuto mostra `help`.
- `logo(className = 'logo')`: il logo di lilOS.

Simboli disponibili: `search`, `plus`, `minus`, `x`, `fit`, `zoom`, `grid`, `folder`, `folderPlus`, `file`, `filePlus`, `open`, `pencil`, `trash`, `globe`, `code`, `terminal`, `gear`, `calendar`, `image`, `music`, `mail`, `power`, `help`, `info`, `max`, `palette`, `disk`, `user`, `window`, `keyboard`, `accessibility`, `arrowLeft`, `arrowRight`, `arrowDown`, `arrowUp`, `list`, `home`, `download`, `monitor`, `check`, `save`, `lasso`, `folderOpen`, `sidebar`, `workarea`, `workspace`, `undo`, `redo`, `tag`, `eyeOff`, `link`.

### `toast.js`

`toast(text, { timeout = 3500 })`: breve messaggio in basso al centro (`div.toast[role="status"][aria-live="polite"]`, letto dagli screen reader). Uno alla volta: un messaggio nuovo sostituisce quello attuale. Lo stile (`.toast`, `.toast.on`) è in `sdk/styles/components.css`.

```js
toast('Elemento eliminato', { timeout: 4000 });
```

### `ContextMenu.js`

Una voce con `items` (al posto di `action`) è un **sottomenu**: si apre passando con il mouse, con un clic o con →; ← o Esc lo chiudono (Esc sul primo livello chiude tutto). Si apre a destra della voce, o a sinistra se non c'è spazio.

`openMenu(x, y, items, { placement = 'below' })` → `{ el, close }`

Apre un menu nel punto dello schermo `(x, y)`, tenendolo dentro la finestra. `placement: 'above'` mette il bordo inferiore del menu sul punto.

```js
openMenu(e.clientX, e.clientY, [
  { label: 'Apri', icon: 'open', shortcut: 'Invio', action: () => … },
  { label: 'Rinomina', icon: 'pencil', disabled: true, action: () => … },
  '-',                                   // separatore
  { label: 'Elimina', icon: 'trash', danger: true, action: () => … },
]);
```

- Si può aprire un solo menu alla volta: aprirne uno chiude il precedente.
- Si chiude con un clic fuori, Esc, rotella, ridimensionamento della finestra o perdita del focus. Cliccando una voce il menu si chiude prima di eseguire `action`.
- Mentre è aperto intercetta tutta la tastiera; le frecce su e giù scorrono le voci attive.

Una voce con `swatch: '#rrggbb'` mostra un pallino colorato (`.menu-swatch`) prima dell'etichetta; solo i colori esadecimali a sei cifre arrivano allo stile, gli altri valori si ignorano.

`closeMenu()` chiude il menu aperto, se c'è.

### `avatar.js`

`avatar(user, className = 'avatar')`: cerchio con le iniziali.

### `appIcon.js`

`appIcon(app, className = 'app-icon')`: riquadro colorato con il simbolo di un'app (`{ glyph, color }`, come le voci del registro). Con un'app sconosciuta mostra un riquadro grigio con il punto interrogativo. La dimensione è decisa dal CSS del contesto.

---

## sdk/ui/controls.js

Controlli per impostazioni e finestre di dialogo. Ognuno restituisce il suo elemento e segnala i cambiamenti con `onChange(valore)`. Le opzioni possono essere stringhe o `{ value, label }`. `label` diventa `aria-label`; dentro una `SettingsView` viene messo da solo con l'etichetta della riga.

| Funzione | Elemento | Note |
| --- | --- | --- |
| `toggle({ value, onChange, label })` | `button[role=switch]` | Interruttore. |
| `selectField({ value, options, onChange, label })` | `select` | Menu a tendina nativo. |
| `segmented({ value, options, onChange, label })` | `div[role=radiogroup]` | Scelta a segmenti; frecce per cambiare. |
| `swatches({ value, colors, onChange, label })` | `div[role=radiogroup]` | Colori; `colors` come le opzioni (`label` = nome del colore). |
| `slider({ value, min, max, step, unit, onChange, label })` | `div` con `input[type=range]` | `onChange` al rilascio; il valore mostrato si aggiorna mentre si trascina. |
| `textField({ value, placeholder, onChange, onInput, label })` | `input` | `onChange` alla conferma (Invio o uscita dal campo), `onInput` a ogni tasto. |
| `actionButton({ label, primary, danger, onClick })` | `button` | Pulsante. |

---

## sdk/ui/shortcutField.js

### `shortcutField(id)` → `HTMLElement`

Editor delle combinazioni di un comando, usato nell'app Impostazioni:

- un tasto per ogni combinazione, con il pulsante × per toglierla (un comando può restare senza combinazioni);
- **+** per registrarne una nuova: si preme la combinazione, Esc o un clic altrove annullano; mentre si tengono premuti i modificatori li mostra (`Ctrl Shift …`);
- combinazione non valida: messaggio con il motivo, la registrazione continua;
- combinazione usata da un altro comando: messaggio con **Sostituisci** (la toglie all'altro comando) e **Annulla**;
- **Ripristina** quando il comando è personalizzato.

Si aggiorna da solo a ogni cambiamento del comando finché è nella pagina; se esce dalla pagina mentre registra, la registrazione si ferma.

---

## sdk/ui/selectionGesture.js

### `selectionGesture(startEvent, { container, mode = 'rect', threshold = 3, onUpdate, onEnd })`

Selezione trascinando, a partire da un `pointerdown`. Disegna sopra `container` un rettangolo (`'rect'`) o un percorso chiuso che segue il puntatore (`'lasso'`), in un `svg.sel-overlay` tolto al rilascio. Tutto in coordinate dello schermo.

- `onUpdate(hit)` a ogni movimento, `onEnd(hit)` al rilascio (`hit` è `null` se il puntatore non ha superato la soglia, cioè era un clic).
- `hit(rect)` dice se un `DOMRect` è selezionato: il rettangolo seleziona quello che tocca, il percorso quello che ha il centro dentro.

```js
const rects = items.map(it => [it, it.el.getBoundingClientRect()]);
selectionGesture(e, { container: canvas.el, mode: 'lasso', onUpdate: hit => select(rects.filter(([, r]) => hit(r)).map(([it]) => it)) });
```

---

## sdk/ui/Window.js

### `class Window extends Emitter`

Cornice di una finestra. Mostra e segnala, ma non si sposta, non si ridimensiona e non si chiude da sola: lo fa chi la ospita (il `WindowManager`).

```js
new Window({
  title, subtitle?, icon = 'help',
  width = 640, height = 440,
  minWidth = 320, minHeight = 200, maxWidth = Infinity, maxHeight = Infinity,
  controls = { minimize: true, maximize: true, close: true },   // ognuno attivabile da solo
  resizable = true,                                             // true, false o un elenco di bordi
  minimizable?, maximizable?, closable?,                        // scorciatoie per controls.*
})
```

**Controlli e ridimensionamento**, attivabili e disattivabili singolarmente, alla creazione o in qualsiasi momento:

- `controls`: `minimize`, `maximize`, `close`. Un controllo spento non ha il pulsante e il sistema non lo offre per altre vie: il doppio clic sul titolo non ingrandisce, il pulsante nella barra non riduce a icona, Alt W non chiude.
- `resizable`: `true` (tutti i bordi), `false` (nessuno) o un elenco tra `WINDOW_EDGES` = `['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']` (lati e angoli). Per esempio `['e', 's', 'se']` ridimensiona solo verso destra e in basso.

```js
const win = new Window({ title: 'Calcolatrice', controls: { maximize: false }, resizable: false });
win.setControl('close', false);       // per esempio durante un salvataggio
win.setResizable(['e', 'w']);         // solo in larghezza
```

DOM: `section.window[data-kind="window"][role="dialog"]` con `.win-titlebar` (e i pulsanti in `.win-controls`), `.win-body` (`data-wheel="native"`) e `.win-edges` con una `.win-edge[data-edge]` per ogni bordo attivo. Le maniglie stanno a cavallo del bordo (4 px dentro e 4 fuori). La classe `resizable` indica che c'è almeno un bordo attivo.

| Membro | Descrizione |
| --- | --- |
| `el`, `titlebar`, `body` | Elementi DOM. Il contenuto va in `body`. |
| `title`, `subtitle`, `glyph` | Titolo, sottotitolo, simbolo. |
| `controls` | Copia di `{ minimize, maximize, close }`. |
| `resizable` | Bordi attivi, nell'ordine di `WINDOW_EDGES` (`[]` se non si ridimensiona). |
| `minWidth`, `minHeight`, `maxWidth`, `maxHeight` | Limiti delle dimensioni. |
| `setControl(name, enabled)`, `setControls({ … })` | Accende o spegne uno o più controlli; emette `controls`. |
| `setResizable(value)` | `true`, `false` o elenco di bordi; emette `controls`. |
| `constrain(w, h)` | `{ w, h }` riportati entro i limiti. |
| `canClose` | Facoltativo: funzione `() => boolean \| Promise<boolean>` chiesta dal gestore prima di chiudere su richiesta dell'utente (pulsante, Alt W). Per esempio l'Editor la usa per proporre di salvare. |
| `getState` | Facoltativo: funzione `() => dati JSON` (oggetto semplice) con cui ricreare la finestra. Le workarea la chiamano prima di chiudere le finestre delle app e danno il risultato all'app come `args` quando la riaprono. Vedi la [ricetta](ricette.md#far-riaprire-la-finestra-di-unapp-da-una-workarea). Predefinito `null`: la finestra si riapre senza argomenti. |
| `active` | `true` se la finestra è nella pagina, visibile e attiva. |
| `signal` | `AbortSignal` annullato da `destroy()`: passalo ad `addEventListener(…, { signal })` per i listener del contenuto, così spariscono con la finestra. |
| `setTitle(title, subtitle?)` | Aggiorna la barra del titolo (`Titolo — Sottotitolo`) ed emette `title`. |
| `moveTo(x, y)`, `resizeTo(w, h)` | Posizione in coordinate mondo; dimensioni limitate da minimi e massimi. |
| `setActive(bool)`, `setMaximized(bool)` | Aspetto attivo/inattivo e ingrandito. |
| `destroy()` | Annulla `signal`, toglie l'elemento ed emette `destroy`. |

Eventi: `minimize`, `maximize` (anche doppio clic sulla barra del titolo, se il controllo è attivo), `close` sono richieste dei pulsanti; `title`, `controls` (`{ controls, resizable }`) e `destroy` sono cambiamenti di stato. Per convenzione il launcher emette `launch` (con gli argomenti) quando l'app viene avviata di nuovo mentre la finestra è aperta.

---

## sdk/ui/SettingsView.js e sdk/ui/SettingsWindow.js

### `class SettingsView extends Emitter`

L'impaginazione comune a tutte le finestre di impostazioni (render approvato: `design/settings-window.html`).

```js
new SettingsView({ tabs, search = true, footer = null })
```

`tabs` è un array di:

- `{ group: 'Sistema' }`: intestazione di gruppo (`''` = spazio vuoto). Non viene mostrata se nel gruppo non ci sono tab visibili.
- `{ id, label, icon, badge?, description?, sections? }`: tab principale senza tab secondari.
- `{ id, label, icon, badge?, description?, subtabs: [{ id, label, sections }] }`: tab principale con tab secondari orizzontali.

`sections` è un array, oppure una funzione che lo restituisce: in quel caso viene ricostruito a ogni visualizzazione e mostra sempre i valori attuali.

```js
{ title?: 'Colore principale',
  rows?: [{ label, description?, keywords?, control }],   // righe etichetta + controllo
  content?: Node | () => Node }                            // oppure un contenuto libero
```

`control` può essere un elemento, una stringa o un numero (mostrati come valore in sola lettura), o una funzione che restituisce uno dei due. `keywords` aiuta la ricerca.

`footer`: `{ note?, buttons: [Element] }`. Senza piè di pagina le modifiche si applicano subito; con il piè di pagina (Annulla / Applica / OK) si applicano alla conferma, gestita da chi crea la finestra.

| Membro | Descrizione |
| --- | --- |
| `el` | `.settings` |
| `tab`, `subtab` | Tab principale e secondario mostrati. |
| `select(tabId, subtabId?)` | Mostra un tab; senza `subtabId` riprende l'ultimo tab secondario usato. |
| `setBadge(tabId, value)` | Contatore accanto al tab (`0` o `null` lo toglie). |
| `setNote(text)` | Testo a sinistra nel piè di pagina. |
| `render()` | Ricostruisce l'elenco dei tab e la pagina. |

Evento: `select` con `{ tab, subtab }`, anche quando la ricerca cambia il tab mostrato.

Ricerca: filtra i tab principali per etichetta, descrizione, tab secondari, titoli delle sezioni, etichette, descrizioni e `keywords` delle righe, senza distinguere maiuscole, minuscole e accenti. Mostra il tab secondario che contiene il risultato. Esc svuota la ricerca.

Tastiera: frecce su/giù (Home/Fine) sui tab principali, sinistra/destra sui tab secondari; la selezione segue il focus.

### `class SettingsWindow extends Window`

`new SettingsWindow({ title, icon, tabs, footer?, search?, width = 800, height = 560, minWidth = 560, minHeight = 360 })`

Una `Window` con una `SettingsView` nel corpo (`win.view`). Il sottotitolo segue il tab principale: "Impostazioni — Aspetto". È la base di **ogni** finestra che modifica impostazioni.

---

## sdk/core/menus.js

### `menus`

Menu configurabili dall'utente. Le parti del sistema dichiarano le **azioni** e la **disposizione predefinita** di un menu; l'utente cambia la disposizione (Impostazioni → Usabilità → Menu contestuale), salvata in `lilos:menus` e validata contro le azioni conosciute.

| Metodo | Descrizione |
| --- | --- |
| `defineAction(id, { label, icon?, shortcut?, run(ctx, params), enabled?(ctx, params), params?(raw), menus? })` | Dichiara un'azione. `shortcut`: id di un comando di `shortcuts` (i tasti compaiono accanto alla voce). `params(raw)` valida i parametri salvati (restituisce quelli puliti o `null` per scartare la voce). `menus`: i menu in cui è disponibile (tutti se manca). |
| `register(menuId, { label, defaults })` | Registra un menu con la disposizione predefinita. |
| `list()` | Menu registrati `[{ id, label }]`. |
| `actions(menuId)` | Azioni disponibili in un menu `[{ id, label, icon }]`. |
| `action(id)` | Un'azione, o `null`. |
| `layout(menuId)` | Disposizione attuale (copia): quella dell'utente se valida, altrimenti la predefinita. |
| `isCustom(menuId)` | `true` se l'utente l'ha cambiata. |
| `setLayout(menuId, layout)`, `reset(menuId)` | Salva / torna alla predefinita. Evento `change` (menuId). |
| `build(menuId, ctx)` | Le voci per `openMenu`: risolve le azioni, toglie separatori doppi o agli estremi. |

Voci della disposizione:

```js
{ type: 'action', action: 'desktop.arrange', label?, icon?, params? }
{ type: 'separator' }
{ type: 'submenu', label: 'Nuovo', icon?, items: [ … ] }   // un solo livello
```

Alla lettura si scartano azioni sconosciute o non ammesse in quel menu, parametri non validi, sottomenu annidati; le etichette sono testo (al massimo 60 caratteri).

Esempio:

```js
menus.defineAction('notes.new', { label: 'Nuova nota', icon: 'pencil', run: ctx => createNote(ctx.at) });
menus.register('notes.list', { label: 'Elenco delle note', defaults: [{ type: 'action', action: 'notes.new' }] });
openMenu(e.clientX, e.clientY, menus.build('notes.list', { at }));
```

---

## desktop/menu.js

Il menu dello sfondo della scrivania (`desktop.background`): `registerDesktopMenu(desktop)` dichiara le azioni e la disposizione predefinita. Contesto: `{ at, workarea }`: il punto del mondo cliccato e l'id della workarea aperta che lo contiene, o `null`.

| Azione | Cosa fa |
| --- | --- |
| `desktop.create` | Crea un elemento. `params: { kind: 'file' \| 'folder', name, content?, template? }`: `content` è il testo iniziale, `template` l'id di un file di lilOS da cui copiarlo. |
| `workarea.create` | Nuova workarea (`desktop.workareas.createAt(ctx.at)`). Attiva solo se `desktop.workareas` esiste e `ctx.workarea` è `null`: le aree non si sovrappongono. |
| `desktop.openInFiles`, `desktop.arrange`, `desktop.selectAll` | Apri la Scrivania in File, Riordina icone, Seleziona tutto (nella workarea attuale: solo i suoi elementi, via `desktop.scopeItems()`) |
| `desk.fit`, `desk.zoomReset` | Mostra tutto, Zoom al 100% |
| `app.launch` | Apre un'app (`params: { app }`, solo app realizzate). Dichiarata da `apps/launcher.js`, vale in tutti i menu. |

Predefinito: **Nuovo** (Cartella, Workarea, separatore, Documento di testo, Documento Markdown, Pagina HTML), separatore, Apri la Scrivania in File, Riordina icone, separatore, Mostra tutto, Zoom al 100%.

`Desktop.create(type, at, { name, content, template })` crea l'elemento, scrive il contenuto iniziale e avvia la rinomina.

---

## apps/editor/lang/ e apps/editor/lsp/

L'Editor sceglie per ogni linguaggio un **motore di evidenziazione** e, se c'è, un **language server**.

### `lang/languages.js`

- Linguaggi: `{ id, label, exts, textmate?, treesitter?, simple, server? }`. Integrati: testo, Markdown, JavaScript, TypeScript, CSS, HTML, XML, JSON, Python, Shell, YAML; più quelli delle grammatiche TextMate aggiunte (id `tm:<scopeName>`, estensioni da `fileTypes`).
- `languages()`, `getLanguage(id)`, `languageForName(name)` (le grammatiche aggiunte hanno la precedenza), `enginesFor(lang)`, `engineFor(lang)` (scelto nelle impostazioni o il migliore disponibile), `loadCustomGrammars()` → problemi `[{ fileId, name, error }]`, `languageEvents` (`change`).

### `lang/engines.js`

`highlighter(lang, engine)` → `Promise<{ engine, tokenize(text) }>`; `tokenize` restituisce `[[classe | null, testo, colore?, stileFont?], …]`.

- **Tree-sitter** (`web-tree-sitter`): grammatiche in `public/tree-sitter/<nome>/` (`.wasm` e `highlights.scm`, copiate da `scripts/vendor-tree-sitter.mjs`). Le catture diventano classi `tk-*`; per lo stesso nodo vale l'ultima regola del file.
- **TextMate** (Shiki con il motore di espressioni regolari JavaScript, senza WebAssembly): colori dal tema `github-light` o `github-dark`, secondo il tema di lilOS. Oltre 100 000 caratteri si usa il motore semplice.
- **Semplice**: `highlight.js`.

### `lang/config.js`

`editorConfig`: `get(sezione)`, `set(sezione, valore)`, `setEntry(sezione, chiave, valore)`, evento `change`. Sezioni: `engines`, `builtin` (`{ json, css, html }`), `external` (`[{ lang, url }]`, solo `ws://`/`wss://`), `schemas` (`{ fileId: { type: 'file', id } | { type: 'url', url } }`, solo `http(s)`), `grammars` (id di file). Salvato in `lilos:editor-lang`, validato alla lettura.

### `lsp/`

- `jsonrpc.js`: `Connection` JSON-RPC 2.0 (richieste, notifiche, risposte, errori), indipendente dal trasporto.
- `client.js`: `LanguageClient` (initialize, sincronizzazione completa del documento, completamento, diagnostica, configurazione, shutdown); trasporti `workerTransport(worker)` e `socketTransport(url)` (un messaggio JSON per frame; accetta anche l'intestazione `Content-Length`). Stato: `starting` → `ready` | `error` | `closed`.
- `manager.js`: `clientFor(lang)` (server esterno se configurato, altrimenti quello nel browser; condiviso tra le finestre, ricreato se è andato in errore), `fileUri(id)` (`file:///lilos/…`), `schemaUri(source)`, `servers` (evento `changed`). Fornisce gli schemi ai server (`workspace/didChangeConfiguration` con `json.schemas`) e risponde alla richiesta `lilos/schemaContent` leggendo i file di lilOS o scaricando gli indirizzi web (senza cookie).
- `workers/`: server LSP minimi in Web Worker attorno a `vscode-json-languageservice` (completamento, validazione, JSON Schema), `vscode-css-languageservice` (completamento, validazione), `vscode-html-languageservice` (completamento).
- `convert.js`: `positionAt`, `offsetAt`, `expandSnippet` (`$1`, `${1:testo}`, `${1|a,b|}`, `$0`), `fromServer(items, text, caret)` → suggerimenti dell'Editor.

### `EditorSettings.js`

### `FileTree.js`

`new FileTree({ win, openWindow })` (un `Emitter`): il pannello a destra con il contenuto della cartella aperta, che ne è la radice. `el` è l'`aside` da inserire; l'Editor lo mette dopo il testo in `.ed-main`.

| Membro | Descrizione |
| --- | --- |
| `root` | Id della cartella aperta, o `null` (pannello nascosto). |
| `setRoot(id)` | Apre una cartella come radice (`null` la chiude); evento `root`. |
| `FileTree.savedRoot()` | La radice salvata l'ultima volta, se esiste ancora. |
| `setCurrent(id)` | Evidenzia il file aperto nell'Editor e apre le cartelle sopra di lui. |
| `collapsed`, `setCollapsed(bool)` | Pannello nascosto dall'utente, con la radice ancora aperta; evento `layout`. |
| `width`, `resize(px, save?)` | Larghezza: almeno 160 px, al massimo il 60% della finestra. |
| `create(type, parentId?)` | Nuovo file (`nuovo.txt`) o cartella dentro la radice, poi subito la rinomina; un file nuovo si apre quando ha il nome. |
| `rename(id)`, `remove(id)` | Rinomina nella riga; elimina con `confirmRemove`. La radice non si rinomina né si elimina da qui. |
| `move(id, parentId)`, `moveTo(id)` | Sposta dentro la radice con `moveNode` (registra nella cronologia; gli errori compaiono in fondo al pannello); `moveTo` chiede la cartella con `pickFile({ kind: 'folder', within: root, exclude: id })`. |

| `history` | `UndoStack` del pannello, collegata a `el`: creare (con il nome: un passo), rinominare, spostare, eliminare. Ctrl Z agisce su di lei quando il focus è nel pannello. |

Evento `open` (id del file) quando si apre un file: doppio clic, Invio, menu Apri.

- Albero `role="tree"` con righe `treeitem` (`aria-level`, `aria-expanded`, `aria-selected`) e `aria-activedescendant`; cartelle prima, poi file, in ordine alfabetico.
- Trascinamento con [itemDrag.js](#itemdragjs): le righe sono marcate con `markItem` (cartelle e file) e il pannello è una `dropZone`: rilasciando su una riga di cartella i nodi vi entrano, su una riga di file vanno nella cartella di quel file, sulla parte vuota nella radice (la zona evidenzia la riga o il pannello). Si trascina una riga alla volta (non le cartelle di sistema), quindi anche **da e verso** la scrivania e l'app File, e fuori dalla radice. `stack` è la `history` del pannello; la riga trascinata ha la classe `dragging`. Le voci del menu hanno **Aggiungi ai collegamenti** (`linkEntry`). «Sposta in…» (`moveTo`) resta limitato alla radice, perché il selettore parte da lì.
- Invio, F2 e Canc sono le scorciatoie degli elementi (`addTarget`, attivo quando il focus è nell'albero); frecce, Home, Fine, ← → fissi. Il doppio clic si riconosce da `click` con `detail === 2`, perché la selezione non ricostruisce le righe ma l'apertura delle cartelle sì.
- Separatore `role="separator"` sul bordo sinistro: trascinamento, frecce (Shift: passi più lunghi), Home / Fine, doppio clic per la larghezza iniziale.
- Segue gli eventi di `fs`: si chiude se la radice viene eliminata, aggiorna il titolo se viene rinominata; mentre si rinomina una riga non si ridisegna.
- Salva in `lilos:editor-tree` `{ root, expanded, width }`.

`openEditorSettings(openWindow)`: la finestra Impostazioni dell'Editor (una sola), con le sezioni Evidenziazione, Language server, Schemi JSON.

---

## apps/filePicker.js

`pickFile(openWindow, { title, exts?, text?, kind?, within?, exclude? })` → `Promise<node | null>`: finestra per scegliere un file di lilOS (ricerca per nome o percorso, frecce, Invio, doppio clic, Esc).

- `kind: 'folder'` sceglie una cartella invece di un file (la radice compare come "Home").
- `within`: solo quella cartella e ciò che contiene (con `kind: 'folder'` è scelta anche lei).
- `exclude`: un nodo da nascondere con tutto il suo contenuto (per esempio la cartella da spostare).

---

## Eventi del bus

| Evento | Payload | Emesso da | Gestito da |
| --- | --- | --- | --- |
| `app:launch` | `{ id, args }` | `launch()`: menu di avvio, collegamenti sul desktop | `connectLauncher` (`apps/launcher.js`) |
| `item:open` | nodo del file system | `Desktop.open()` per cartelle e file | `main.js`: le cartelle si aprono nell'app File (`launch('files', { folder })`), i file con `openFile` |

Quando aggiungi un evento, documentalo qui e nel commento in testa a `sdk/core/events.js`.

---

## Dati salvati

Tutte le chiavi hanno il prefisso `lilos:`.

### `lilos:workspaces`

I workspace, con quello attuale:

```json
{
  "current": "m1x2a0k3f",
  "list": [
    { "id": "m1x2a0k3f", "name": "Principale", "color": "#3b6ef5", "created": 1793180000000,
      "desk": "m1x2a0k3g", "apps": ["editor", "terminal"], "known": ["files", "browser", "editor", "terminal", "calendar", "images", "music", "mail", "settings"] },
    { "id": "m1x2d9e8c", "name": "Cliente Rossi", "color": "#30a46c", "created": 1793190000000, "removed": 1793200000000 }
  ]
}
```

| Campo | Significato |
| --- | --- |
| `id` | Identificativo; è anche il `workspace` dei nodi che ha creato. |
| `desk` | Id della sua cartella Scrivania (privata). Solo nei workspace vivi. |
| `apps` | Id delle app installate. Le app `system` (File, Impostazioni) sono sempre installate e non serve elencarle. Una nuova voce senza `apps` le ha tutte. |
| `known` | Id delle app che lilOS aveva all'ultimo salvataggio. Alla lettura, le app del registro che non ci sono vengono aggiunte ad `apps`: un'app nuova arriva installata, una tolta dall'utente resta tolta. Senza `known` (dati di prima) si considerano note tutte le app del registro. |
| `removed` | Data di eliminazione. Una voce "rimossa" non ha `desk` né `apps`: resta solo perché i file creati da quel workspace dicano ancora di chi erano (File mostra «Nome (eliminato)»). |

Controllo alla lettura, perché il dato non è affidabile: `list` deve essere un elenco (si leggono al massimo 120 voci); `id` di 1-40 caratteri tra lettere, cifre, `_` e `-`, senza duplicati; `name` ripulito (spazi, al massimo 40 caratteri), «Workspace» se vuoto; `color` esadecimale `#rrggbb`, altrimenti il primo accento; `created` numero finito, altrimenti l'ora della lettura; una voce viva senza `desk` è scartata; `apps` tiene solo id del registro, più quelli che `known` non conteneva; `known` è riscritto con gli id del registro attuale; al massimo 20 workspace vivi e 100 rimossi (gli ultimi). Se `current` non è un workspace vivo, `setupWorkspaces` sceglie il primo.

### `lilos:ws:<id>:…`

Ogni workspace tiene a parte, sotto `lilos:ws:<id>:` seguito da:

| Parte | Contenuto | Formato |
| --- | --- | --- |
| `camera` | la sua vista | come [`lilos:camera`](#liloscamera) |
| `desktop-layout` | posizioni sulla sua scrivania | come [`lilos:desktop-layout`](#lilosdesktop-layout) |
| `workareas` | le sue workarea | come [`lilos:workareas`](#lilosworkareas) |
| `windows` | le finestre delle app aperte fuori da ogni workarea, da riaprire | elenco di finestre salvate, come `windows` di una workarea; al massimo 30 |

Le chiavi di un workspace eliminato si cancellano subito. All'avvio si cancellano anche quelle di workspace che non esistono (per esempio scritte dall'ultimo salvataggio di una pagina dopo un ripristino, o lasciate da un'altra scheda). Le finestre di `windows` si riaprono la prima volta che il workspace è mostrato nella sessione.

Le chiavi `lilos:camera`, `lilos:desktop-layout` e `lilos:workareas` descritte qui sotto sono il formato di prima dei workspace: oggi si leggono solo per la migrazione (diventano le chiavi di «Principale» e vengono eliminate). Il formato dei valori è lo stesso.

### `lilos:camera`

```json
{ "x": -120, "y": 40, "s": 1.25 }
```

Alla lettura viene accettata solo se `x`, `y` e `s` sono numeri finiti; `s` viene riportato tra 0,1 e 3.

### `lilos:fs`

Array di tutti i nodi del file system (vedi [sdk/core/fs.js](#sdkcorefsjs)), radice esclusa:

```json
[
  { "id": "m1x2a0k3f", "type": "folder", "name": "Scrivania", "parent": "root", "created": 1793180000000, "modified": 1793180000000, "system": true },
  { "id": "m1x2a0l9q", "type": "app", "name": "Terminale", "parent": "m1x2a0k3f", "created": 1793180000000, "modified": 1793180000000, "app": "terminal" }
]
```

Un nodo può avere `"tags": ["idTag", …]` (al massimo 30 id validi, senza doppioni, mai sui nodi di sistema; vedi [`lilos:tags`](#lilostags)). Validato alla lettura: si tengono solo i nodi ben formati raggiungibili dalla radice. Gli elementi nel cestino sono nodi con `"parent": "trash"` e `"trashed": { "at", "from", "scope"? }` (quelli senza `trashed` valido si scartano); il loro contenuto resta in IndexedDB finché non vengono eliminati per sempre.

### `lilos:desktop-layout`

Posizioni degli elementi sulla scrivania, in coordinate mondo: `{ "m1x2a0l9q": [16, 268] }`. Le posizioni non valide vengono ignorate (l'elemento va nel primo posto libero). Le posizioni degli elementi nascosti da un tag invisibile restano salvate (la scrivania le riscrive a ogni `save()`), così all'apparire dell'elemento torna dov'era; se l'elemento viene eliminato o spostato altrove, la posizione sparisce al salvataggio successivo.

### `lilos:desktop` (vecchio formato)

La scrivania piatta di prima del file system (array di elementi con `x` e `y`). Se presente al primo avvio viene migrata nella Scrivania e poi eliminata.

### `lilos:file-apps`

Scelte dell'utente sulle app dei tipi di file, solo quelle diverse dalla predefinita: `{ "txt": "ask", "log": "editor" }`. Alla lettura restano solo estensioni valide (`[a-z0-9]`, fino a 10 caratteri) con `"ask"` o l'id di un'app che apre file.

### IndexedDB `lilos` → `contents`

Il contenuto dei file: chiave = `id` del file, valore = testo.

### `lilos:tags`

Elenco dei tag, uguale per tutti i workspace:

```json
[{ "id": "m1x2a0k3f", "name": "Urgente", "color": "#e5484d", "visible": true }]
```

Validato alla lettura (`sdk/core/tags.js`): al massimo 100 tag; `id` di 1-40 caratteri tra lettere, cifre, `_` e `-`, senza duplicati; `name` ripulito (spazi, al massimo 30 caratteri), non vuoto e unico senza distinguere maiuscole e minuscole; `color` esadecimale `#rrggbb`, altrimenti il primo di `TAG_COLORS`; `visible` vero salvo `false`. I tag messi sui nodi sono nel campo `tags` di [`lilos:fs`](#lilosfs). Il ripristino "Scrivania e file iniziali" cancella anche questa chiave.

### `lilos:menus`

Disposizioni dei menu scelte dall'utente: `{ "desktop.background": [ …voci… ] }`. Validate alla lettura (vedi `menus`).

### `lilos:editor-lang`

Impostazioni dell'Editor (vedi `lang/config.js`). Validate alla lettura.

### `lilos:editor-tree`

Pannello della cartella dell'Editor: `{ "root": id | null, "expanded": [id…], "width": px }`. Alla lettura la radice vale solo se è ancora una cartella, gli id non stringa sono scartati, la larghezza è riportata tra i limiti.

### `lilos:workareas`

Array di workarea, in ordine di creazione:

```json
[
  {
    "id": "m1x2b3c4d",
    "title": "Cliente Rossi",
    "rect": { "x": 100, "y": -40, "w": 720, "h": 460 },
    "collapsed": false,
    "created": 1793180000000,
    "modified": 1793183000000,
    "description": "Preventivo e bozze",
    "meta": [{ "key": "Scadenza", "value": "30 novembre" }],
    "items": [],
    "windows": [
      { "app": "editor", "state": { "file": "m1x2a0l9q", "folder": null }, "rect": { "x": 140, "y": 20, "w": 780, "h": 520, "minimized": false } }
    ]
  }
]
```

| Campo | Significato |
| --- | --- |
| `rect` | L'area in coordinate mondo. Se la workarea è ridotta, è l'area che avrà quando si riapre (e dove sta l'icona). |
| `collapsed` | `true` se è ridotta a icona. |
| `items` | Id dei nodi del file system nascosti con la workarea ridotta. Da aperta è vuoto: il contenuto è ciò che sta dentro l'area. |
| `windows` | Finestre di app da riaprire: se aperta, aggiornato a ogni cambiamento (400 ms dopo, e alla chiusura della pagina); se ridotta, scritto alla riduzione. Svuotato dopo la riapertura. |
| `windows[].state` | Quello che ha restituito `win.getState()`, passato all'app come `args`; `null` se non c'è. |
| `windows[].rect` | `x`, `y`, `w`, `h` e `minimized`. Una finestra ingrandita torna non ingrandita. |

Controllo alla lettura, perché il dato non è affidabile:

- se non è un elenco, nessuna workarea; si leggono al massimo 200 voci; gli `id` duplicati o non validi (devono essere 1-40 caratteri tra lettere, cifre, `_` e `-`) scartano la voce;
- `rect` deve avere quattro numeri finiti, altrimenti la voce è scartata; `w` e `h` sono portati ad almeno 280 e 180;
- `title` ripulito (spazi, al massimo 80 caratteri), "Workarea" se vuoto; `description` al massimo 2000 caratteri;
- `created` e `modified` numeri finiti, altrimenti l'ora della lettura;
- `meta`: al massimo 40 voci, nome al massimo 60 caratteri e valore al massimo 500;
- `items`: solo stringhe, al massimo 5000;
- `windows`: al massimo 30; ognuna ha `app` valido (come gli `id`) e `rect.x`, `rect.y` numeri finiti, altrimenti è scartata; `w` e `h` si tengono solo se sono numeri positivi; `state` si tiene solo se è un oggetto e il suo JSON non supera 4000 caratteri, altrimenti diventa `null`.

### `lilos:files-view`

Vista dell'app File: `"list"` o `"grid"`.

### `lilos:files-sidebar`

L'ordine della sezione «Collegamenti» della barra laterale di File: array di chiavi, uguale in tutti i workspace (`src/items/links.js`):

```json
["root", "desk", "m1x2a0k3f", "m1x2a0l9q"]
```

Una chiave è un id di nodo (una voce fissa o un collegamento), `"root"` per Home o `"desk"` (la Scrivania del workspace attuale); `"tags"` e `"trash"` di versioni precedenti si tolgono alla lettura. Validato alla lettura: se non è un elenco, ordine vuoto (vale l'ordine predefinito); solo stringhe non vuote, senza duplicati; al massimo 80 (restano le ultime). Un id che non corrisponde a un nodo visibile (cestino, Scrivania di un altro workspace, nodo eliminato) non si mostra ma non viene tolto da solo. Migrazione: la vecchia chiave lilos:files-links (un elenco di id) si legge una volta, si aggiunge in fondo e si toglie. Il ripristino «Scrivania e file iniziali» cancella questa chiave.

### `lilos:shortcuts`

Solo i comandi personalizzati, con le loro combinazioni (un array vuoto = nessuna combinazione):

```json
{ "items.selectAll": ["Ctrl+Shift+A"], "items.rename": ["F4"], "system.startMenu": [] }
```

Alla lettura vengono scartate le voci che non sono array di combinazioni canoniche; alla registrazione del comando, quelle con una combinazione non valida per quel comando.

### `lilos:settings`

Oggetto con le impostazioni (vedi `settings` e `systemSettings.js`):

```json
{ "accent": "#30a46c", "motion": true, "snap": true, "minimap": true, "deleteConfirm": true, "deletePermanent": false, "trashRetention": 30 }
```

Le chiavi non dichiarate e i valori di tipo diverso dal predefinito vengono ignorati.

Se cambi la forma di questi dati, prevedi una migrazione dei dati già salvati oppure cambia nome alla chiave.
