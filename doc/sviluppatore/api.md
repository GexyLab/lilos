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
- [sdk/core/kernel.js](#sdkcorekerneljs)
- [sdk/core/apps.js](#sdkcoreappsjs)
- [sdk/core/notifications.js](#sdkcorenotificationsjs)
- [sdk/core/settings.js](#sdkcoresettingsjs)
- [sdk/core/shortcuts.js](#sdkcoreshortcutsjs)
- [sdk/core/fs.js](#sdkcorefsjs)
- [sdk/core/net.js](#sdkcorenetjs)
- [sdk/core/serial.js](#sdkcoreserialjs)
- [sdk/core/pipes.js e sdk/core/pipeCatalog.js](#sdkcorepipesjs-e-sdkcorepipecatalogjs)
- [sdk/core/automation.js](#sdkcoreautomationjs)
- [sdk/core/schedule.js e sdk/core/scheduleRules.js](#sdkcoreschedulejs-e-sdkcoreschedulerulesjs)
- [sdk/core/tags.js](#sdkcoretagsjs)
- [sdk/core/history.js](#sdkcorehistoryjs)
- [sdk/core/fileTypes.js](#sdkcorefiletypesjs)
- [canvas/Canvas.js](#canvascanvasjs)
- [canvas/Minimap.js e canvas/Hud.js](#canvasminimapjs-e-canvashudjs)
- [desktop/Desktop.js](#desktopdesktopjs)
- [desktop/DesktopItem.js](#desktopdesktopitemjs)
- [desktop/itemIcons.js](#desktopitemiconsjs)
- [desktop/fixedItems.js](#desktopfixeditemsjs)
- [items/](#items)
- [workareas/](#workareas)
- [workspaces/](#workspaces)
- [systemFs.js](#systemfsjs)
- [App di sistema](#app-di-sistema)
- [systemApi.js (`@lilos/system`)](#systemapijs-lilossystem)
- [apps/open.js e apps/openWith.js](#appsopenjs-e-appsopenwithjs)
- [apps/commands.js](#appscommandsjs)
- [apps/pipes.js, apps/appActions.js e apps/systemEvents.js](#appspipesjs-appsappactionsjs-e-appssystemeventsjs)
- [apps/registry.js e apps/launcher.js](#appsregistryjs-e-appslauncherjs)
- [apps/startup.js](#appsstartupjs)
- [apps/packages/](#appspackages)
- [input/sendKey.js](#inputsendkeyjs)
- [windows/WindowManager.js](#windowswindowmanagerjs)
- [systemSettings.js](#systemsettingsjs)
- [systemTrash.js](#systemtrashjs)
- [systemHistory.js](#systemhistoryjs)
- [tags/tagUi.js e scheda Tag](#tagstaguijs-e-scheda-tag)
- [taskbar/](#taskbar)
- [notifications/](#notifications-le-notifiche-nellinterfaccia)
- [user/ (la pagina utente)](#user-la-pagina-utente)
- [net/ (la rete nell'interfaccia)](#net-la-rete-nellinterfaccia)
- [automation/ (le automazioni nel sistema)](#automation-le-automazioni-nel-sistema)
- [schedule/ (la pianificazione nell'interfaccia)](#schedule-la-pianificazione-nellinterfaccia)
- [sdk/ui/](#sdkui)
- [sdk/ui/controls.js](#sdkuicontrolsjs)
- [sdk/ui/shortcutField.js](#sdkuishortcutfieldjs)
- [sdk/ui/selectionGesture.js](#sdkuiselectiongesturejs)
- [sdk/ui/Window.js](#sdkuiwindowjs)
- [sdk/ui/SettingsView.js e sdk/ui/SettingsWindow.js](#sdkuisettingsviewjs-e-sdkuisettingswindowjs)
- [Il kernel](#il-kernel)
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

Dove vivono i valori dipende da [`kernel`](#sdkcorekerneljs). **Collegato** (sempre, nel sistema): una `Map` in memoria, caricata all'avvio dalla cartella `.config` dell'utente e mandata al kernel 300 ms dopo ogni cambiamento, solo per le chiavi cambiate, in richieste da al massimo 200 chiavi e 4 MB; le chiavi accettate sono `[\w:.-]{1,120}` e un valore può pesare al massimo 512 KB (JSON). **Non collegato** (l'SDK da solo): `localStorage` con il prefisso `lilos:`.

| Metodo | Descrizione |
| --- | --- |
| `get(key, fallback?)` | Legge e decodifica la chiave (una copia). Restituisce `fallback` se manca o non è JSON valido. |
| `set(key, value)` | Codifica e salva. Collegato passa dal JSON come `localStorage`: `undefined`, funzioni e date perdono la forma. Senza kernel, in caso di errore (storage pieno o bloccato) non fa nulla. |
| `remove(key)` | Elimina la chiave. |
| `keys()` | Le chiavi salvate, senza prefisso. |
| `bytes()` | Dimensione approssimata dei dati salvati, in byte di testo JSON (chiavi e valori). |

Nessun metodo lancia eccezioni. **Il valore letto non è validato**: chi legge deve controllarne la forma (vedi come `Canvas` valida la camera).

### `uid()` → `string`

Identificatore breve e unico nella sessione, basato su ora, contatore e una parte casuale. Non è adatto a usi crittografici.

---

## sdk/core/session.js

- `session`: `{ user: { name, username? }, locale }`. `user` è l'utente collegato al kernel (`kernel.user`); senza kernel è `{ name: 'Utente' }`. `locale` è la lingua del sistema (`'it-IT'`, `'en-US'`…): segue l'impostazione `language`, vedi [Traduzioni delle app](#traduzioni-delle-app-sdkcorelocalejs-e-sdkcorei18njs).
- `initials(name)`: fino a due iniziali maiuscole (`'Mario Rossi'` → `'MR'`).

---

## Traduzioni delle app (sdk/core/locale.js e sdk/core/i18n.js)

Ogni app ha **un file di traduzioni** (`locales.json`, indicato da `locales` nel [manifesto](#manifesto-lilosjson)). La lingua è una sola per tutto il sistema, scelta nel Pannello di controllo → Lingua. lilOS legge il file prima di avviare l'app e le dà le stringhe già risolte in `lilos.locale`: l'app non carica nulla e `t()` è sincrono. I testi dell'interfaccia di lilOS stesso non sono ancora tradotti (restano in italiano): si traducono solo le app.

### Il file `locales.json`

```json
{
  "en":    { "strings": {
    "@name": "Notes", "@description": "Take notes.", "@commands.notes.new.label": "New note",
    "save": "Save", "files.count": { "zero": "No files", "one": "{n} file", "other": "{n} files" }
  } },
  "it":    { "strings": {
    "@name": "Note", "@description": "Prendi appunti.", "@commands.notes.new.label": "Nuova nota",
    "save": "Salva", "files.count": { "one": "{n} file", "other": "{n} file" }
  } },
  "it-CH": { "extends": "it", "strings": { "save": "Memorizza" } }
}
```

| Parte | Regola |
| --- | --- |
| Lingue | Una chiave per lingua (`en`, `it`, `it-CH`…), scritta come tag BCP 47; si salva in forma canonica (`it-it` → `it-IT`). Al massimo 50. **`en` è obbligatoria**: è la lingua predefinita. |
| `extends?` | Un'altra lingua del file, in cui cercare ciò che manca (`it-CH` estende `it`). Deve esistere e non può essere la lingua stessa. |
| `strings?` | `{ chiave: valore }`. Chiave: `/^@?[\w.:-]{1,200}$/`. In tutto il file al massimo 5000 stringhe. |
| Valore | Un testo (fino a 4000 caratteri) con segnaposto `{nome}`, oppure le **forme plurali** `{ zero?, one?, two?, few?, many?, other }`: `other` è obbligatoria, le altre facoltative; ogni forma è un testo. |
| File | JSON, fino a 1 MiB di testo. |

Un file che non rispetta queste regole è rifiutato per intero con `Error('File delle traduzioni non valido: …')`. Il kernel lo controlla all'installazione e all'aggiornamento (l'app non si installa). lilOS e i servizi lo ricontrollano quando lo leggono: un file illeggibile, o diverso dal suo hash nel manifesto, lascia l'app in inglese (i testi del manifesto) e scrive un messaggio in console.

**Dove si cerca una stringa**, per la lingua del sistema `it-CH`: `it-CH` → le lingue che estende → la lingua senza regione (`it`) → le lingue che estende → `en` → la chiave stessa (con un `console.warn`, una volta per chiave). Una stringa mancante in una lingua si prende dalla successiva.

**Plurali.** `t(chiave, { n })` sceglie la forma con `Intl.PluralRules` della lingua del file in uso (`i18n.lang`) applicato a `params.n`. Se `n` vale `0` e la stringa ha `zero`, si usa `zero`. Se manca la forma scelta si usa `other`. Senza `n` vale `0`.

**Segnaposto.** `{nome}` si sostituisce con `String(params.nome)`; un segnaposto senza parametro resta com'è.

### Chiavi `@`: i testi del manifesto

I testi che lilOS mostra senza eseguire l'app (nome, comandi, finestre) stanno **nel manifesto, in inglese**. Le loro traduzioni stanno nello stesso file, con una chiave che comincia per `@`: è il percorso del testo nel manifesto, e gli elementi di un elenco si indicano con il loro `id` (`value` per le opzioni).

| Chiave | Testo tradotto |
| --- | --- |
| `@name` | `name` |
| `@description` | `description` |
| `@commands.<id>.label` | `contributes.commands[].label` |
| `@widgets.<id>.name` | `contributes.widgets[].name` |
| `@actions.<id>.label` | `contributes.actions[].label` |
| `@menus.<id>.label` | `contributes.menus[].label` |
| `@badge.label` | `contributes.badge.label` |
| `@events.<nome>.label`, `@events.<nome>.description` | `contributes.events[].label` e `.description` |
| `@automation.<id>.label`, `@automation.<id>.description` | `contributes.automation[].label` e `.description` |
| `@automation.<id>.params.<param>.label`, `.description` | `label` e `description` di un parametro di un'azione |
| `@automation.<id>.params.<param>.options.<valore>.label` | `label` di un'opzione di un parametro `choice` di un'azione |
| `@entrypoints.<nome>.label` | `entrypoints.<nome>.label` |
| `@entrypoints.<nome>.params.<param>.label` | `label` di un parametro |
| `@entrypoints.<nome>.params.<param>.description` | `description` di un parametro |
| `@entrypoints.<nome>.params.<param>.options.<valore>.label` | `label` di un'opzione di un parametro `choice` |

Ciò che non ha la chiave resta come dice il manifesto. Le chiavi `@` sono stringhe come le altre (stanno anche in `lilos.locale`), ma servono a lilOS.

### `locale` (SDK)

Esportato da `@lilos/sdk` insieme a `LANGUAGES`. È un `Emitter`.

| Membro | Descrizione |
| --- | --- |
| `LANGUAGES` | `['en-US', 'en-GB', 'it-IT', 'de-DE', 'es-ES', 'fr-FR', 'pt-BR']`: le lingue che il Pannello di controllo → Lingua propone oltre ad «Automatica». Un'app che non ha la lingua scelta ricade su `en`. |
| `locale.code` | La lingua del sistema (`'it-IT'`): l'impostazione `language` (predefinita `'auto'`, che usa `navigator.language`), oppure `'en'` se non si riesce a risolverla. Segue l'impostazione mentre lilOS è aperto. |
| `locale.forApp(id)` | `{ code, i18n }` di un'app: ha la stessa forma di `lilos.locale` delle app installate. Le app di sistema lo usano così: `const { t } = locale.forApp('files').i18n`. L'oggetto è sempre lo stesso per quell'id e cambia le sue stringhe quando cambia la lingua. Un id senza traduzioni dà un oggetto che restituisce le chiavi. |
| `locale.manifest(manifesto, tabella?)` | Una copia del manifesto con i testi nella lingua del sistema (chiavi `@`). Senza `tabella` usa quella dell'app installata con l'id del manifesto; con `tabella` (per esempio quella di un catalogo) usa la data. |
| `locale.parse(testo)` → tabella | Controlla il file (testo o oggetto) e lo restituisce `{ [lingua]: { extends, strings } }`. Lancia se non è valido. |
| `locale.resolve(tabella, codice?)` → `{ code, lang, strings }` | Le stringhe per quel codice (predefinito `locale.code`) con ogni ripiego già applicato; `lang` è la lingua del file scelta. Senza tabella: `lang: 'en'`, nessuna stringa. |
| `locale.load(id, tabella)`, `locale.unload(id)` | Il sistema registra o toglie la tabella di un'app; l'oggetto di `forApp(id)` si aggiorna. |
| `locale.strings(id)` | Le stringhe già risolte dell'app (`resolve` sulla sua tabella). |
| `locale.table(id)` | La tabella dell'app, o `null`. |
| `locale.engine` | Il motore (`i18nApi` di `i18n.js`). Il sistema lo mette (come testo, con `toString()`) nelle sandbox e nei worker delle app. |

Evento `change` `{ code }`: la lingua del sistema è cambiata. Gli oggetti di `forApp()` hanno già le nuove stringhe; alle app installate arriva l'evento `locale`. La lingua risolta è salvata anche nella chiave [`locale`](#locale), perché il kernel la conosca per i servizi dell'utente.

`session.locale` è la lingua del sistema (`locale.code`), in sola lettura. Lo usano l'orologio e le date delle proprietà.

`i18n.js` non ha import, perché lo stesso codice gira nella pagina di lilOS, nelle sandbox e nei worker (`bridge.js` lo inserisce come testo) e nel kernel (che lo importa da `sdk/core/i18n.js`). Esporta anche `parseLocales`, `localeChain`, `resolveLocale`, `localizeManifest`, `canonicalLocale`, `i18nApi`, `DEFAULT_LANG` (`'en'`) e `LOCALE_LIMITS`; fuori dal sistema si usano da `locale`.

### `lilos.locale`

Ciò che un'app (di sistema o installata) ha della lingua. Sincrono, uguale in ogni modo di girare.

| Membro | Descrizione |
| --- | --- |
| `lilos.locale.code` | La lingua del sistema (`'it-IT'`). Cambia con la lingua. |
| `lilos.locale.i18n.t(chiave, params?)` | Il testo della chiave (vedi sopra); `params` riempie i `{segnaposto}` e sceglie il plurale con `n`. |
| `lilos.locale.i18n.lang` | La lingua del file dell'app in uso (`'it'`; `'en'` se l'app non ha la lingua del sistema né una che la completi, o non ha traduzioni). Può essere diversa da `code`. |
| `lilos.locale.i18n.date(valore, opzioni?)` | `Intl.DateTimeFormat(code, opzioni)`; `valore` è una `Date` o un tempo in millisecondi. |
| `lilos.locale.i18n.number(valore, opzioni?)` | `Intl.NumberFormat(code, opzioni)`. |

Date e numeri seguono `code` (la lingua del sistema); il plurale segue `lang` (la lingua dei testi). Gli oggetti sono congelati.

Chiama `t()` quando disegni, non quando il modulo si carica: la lingua può cambiare mentre l'app è aperta. L'evento `lilos.on('locale', ({ code, lang }) => …)` arriva quando `lilos.locale` ha già le nuove stringhe: ridisegna ciò che hai già mostrato.

```js
export function main({ lilos, root }) {
  const { t, date } = lilos.locale.i18n;   // le funzioni leggono sempre le stringhe di adesso
  const draw = () => {
    const p = document.createElement('p');
    p.textContent = `${t('files.count', { n: 3 })} · ${date(Date.now(), { dateStyle: 'medium' })}`;
    root.replaceChildren(p);
  };
  draw();
  lilos.on('locale', draw);
}
```

Dove c'è `lilos.locale`:

- **Finestre e background**, isolati o no, e **app di sistema** (nella pagina): le stringhe arrivano con le informazioni con cui parte l'app (`info.locale`) e il motore è lo stesso codice (`lilosApi(call, info, i18nApi)` in `bridge.js`).
- **Servizi nel kernel**: `lilos.locale` c'è, ma le stringhe sono quelle **del momento in cui il servizio parte** e non c'è l'evento `locale`. La lingua è quella dell'utente a cui il servizio appartiene (la chiave `locale`, `'en'` se non c'è); un servizio di sistema (senza utente) è sempre in inglese. Se l'utente cambia lingua, il servizio la segue al riavvio.
- `<html lang>` di una finestra isolata è la `lang` del file dell'app.

### Dove lilOS mostra le traduzioni

`registerPackages()` legge i file prima di mettere le app nel registro ([packages.js](#packagesjs)). La voce di ogni app nel registro ha `name` e `text` (il manifesto tradotto) come getter che seguono la lingua, e `commands` con le etichette tradotte. Li usano il titolo delle finestre, i comandi nel Pannello di controllo → Scorciatoie (che si ripubblicano al cambio di lingua), le etichette dei punti d'ingresso e dei loro parametri (`entrypointsOf`, Pannello di controllo → Avvio), le proprietà dell'app e il nome del collegamento che l'operazione `desktopItem` mette sulla scrivania. I nomi di cartelle e file già creati non cambiano. Il catalogo di un repository porta, per ogni app, `locales`: la sua tabella con le sole chiavi `@`, così l'AppStore può mostrare nome e descrizione con `locale.manifest(manifesto, locales)`.

---

## sdk/core/kernel.js

Il client del kernel (il backend, vedi [Il kernel](#il-kernel)). Si importa da `@lilos/sdk` o, senza caricare il resto dell'SDK (lo fa l'avvio, `src/boot/`), da `@lilos/sdk/kernel`.

```js
import { kernel, KernelError } from '@lilos/sdk';
```

### `class KernelError extends Error`

`{ status, code, message, details? }`. `status` è lo stato HTTP (`0` se il kernel non risponde); `code` è il codice del kernel (`invalid`, `unauthorized`, `invalid_credentials`, `forbidden`, `not_found`, `conflict`, `untrusted`, `secret_required`, `too_large`, `rate_limited`, `unavailable`, `internal`) oppure `'offline'` quando manca la risposta. `message` è in italiano e si può mostrare all'utente. `details` (se c'è) è ciò che il kernel aggiunge ad alcuni errori: l'impronta di un server da confermare (`untrusted`) o il motivo per cui serve la password (`secret_required`).

### `kernel`

`Emitter`. Il sistema lo collega prima di avviarsi (`src/boot/boot.js`): dopo `connect()` `storage`, `fs` e `contents` lavorano con il kernel.

| Membro | Descrizione |
| --- | --- |
| `connected` | `true` quando `connect()` ha caricato i dati dell'utente. |
| `mode` | `'multi'` (gli utenti accedono) o `'single'` (un utente, senza accesso); `null` prima di `session()`. |
| `user` | `{ id, username, name, role }` dell'utente collegato, o `null`. |
| `data` | Ciò che `GET /api/boot` ha restituito: `{ user, home, fresh, nodes, storage, apps, appSecurity }`. Lo leggono `storage`, `fs` e `apps` appena vengono caricati. |
| `request(method, path, body?, { text = false, blob = false, keepalive = false })` | Una richiesta a `/api<path>`, con il cookie e l'intestazione `X-Lilos: 1`. `body` oggetto = JSON, stringa = testo, `Blob` / `ArrayBuffer` / array tipizzato = byte (`application/octet-stream`). Restituisce il JSON della risposta (il testo con `text: true`, un `Blob` con `blob: true`, `undefined` per 204). Lancia `KernelError`. Una risposta 401 con l'utente connesso, in modalità `multi`, emette anche `signedout`. |
| `channel(path, { maxText = 1048576, maxBytes = 1048576 } = {})` → `MessagePort` | Un canale vivo con il kernel: un WebSocket verso `/api<path>` (`ws:` o `wss:` come la pagina) dietro una `MessagePort`. Le stringhe (fino a `maxText` caratteri) e i byte (`ArrayBuffer` o array tipizzato, fino a `maxBytes`) passano nei due sensi così come sono; i messaggi più grandi o di altri tipi si scartano senza errore. Quelli mandati prima che il socket si apra aspettano. Quando il socket si chiude la porta riceve la stringa `{"t":"gone","code":…}` e si chiude. `port.detach()` chiude il socket (per lilOS: la finestra che teneva il canale è stata chiusa). |
| `module(name)` → `{ request(method, path, body?), channel(path) }` | L'API di un modulo del kernel (i suoi `ctx.route` e `ctx.socket`, vedi [Moduli](#moduli)): `request` è `kernel.request` su `/modules/<name><path>` (metodo in maiuscolo); `channel` è `kernel.channel` sullo stesso indirizzo, con messaggi fino a 16 MiB (il modulo mette il suo limite quando accetta il socket). `name` deve essere `[a-z][a-z0-9-]{0,40}` e `path` della forma `/parola/parola` (caratteri `[\w:-]`, come i percorsi che un modulo dichiara), e non `/update` né `/settings`, che sono del kernel (la gestione del modulo da parte di un amministratore): altrimenti lancia un errore. L'oggetto è congelato. |
| `session()` | `GET /api/session` → `{ mode, user }`; aggiorna `mode` e `user`. |
| `login(username, password)` | Accede; restituisce l'utente. Lancia `KernelError` (`invalid_credentials`, `rate_limited`). |
| `logout()` | Manda ciò che è in attesa (gli errori si ignorano), chiude la sessione, esegue le funzioni di `onLogout` (gli errori si ignorano) e azzera `user`. |
| `onLogout(fn)` | `fn()` (anche asincrona) parte all'uscita: serve a cancellare le copie locali. Lo usa `contents` per IndexedDB. |
| `connect()` | Carica i dati dell'utente (`GET /api/boot`), imposta `connected` e fa partire l'invio quando la pagina si nasconde o si chiude (`keepalive`). Una volta sola, dopo l'accesso. |
| `track(name, { read, send, base? })` | Tiene qualcosa in sincronia con il kernel mandando solo le differenze. `read()` dà una `Map` chiave → valore di com'è ora; `send(set, remove, options)` manda ciò che è cambiato (`set`: `[[chiave, valore]]`, `remove`: `[chiave]`); `base` è ciò che il kernel ha già. Restituisce `{ schedule(delay = 300), flush(options), reset(), dirty }`. Se `send` lancia, riprova aspettando sempre di più (da 1 a 30 secondi), tranne con 401: allora aspetta `resume()`. |
| `flush(options?)` | Aspetta che le modifiche arrivino al kernel. Con una stringa, solo quel tracker (`'fs'`, `'storage'`); altrimenti tutti, con `{ keepalive }`. |
| `pending` | `true` se ci sono modifiche non ancora inviate (il sistema lo usa per l'avviso alla chiusura). |
| `resume()` | Dopo un nuovo accesso: rimanda ciò che aspettava. |

Eventi: `status` `{ saving, error }` (`error`: testo mentre le modifiche non si salvano e vengono ritentate) e `signedout` (la sessione è finita). Esempio:

```js
kernel.on('status', ({ error }) => { if (error) console.warn('non salvato:', error); });
```

---

## sdk/core/apps.js

### `apps`

Le app installate in lilOS (pacchetti in `/system/app`, per tutti gli utenti e i workspace; File Manager, Editor, Pannello di controllo, AppStore e Pianificazione comprese). Non va confuso con `apps` di `src/apps/registry.js` (le app che lilOS sa avviare, che sono le stesse con il loro stato di avvio). L'elenco arriva con `kernel.connect()`.

| Metodo | Descrizione |
| --- | --- |
| `list()` | Copie dello stato di ogni app: `{ id, version, previous, kind, system, required, source, signed, publisher, granted, installed, updated, isolated, manifest }`. `source` è `{ type: 'git', url, ref, commit, path? }` (o `{ type: 'local', dir }`). `isolated`: `true` o `false` se un amministratore ha scelto come gira questa app, `null` per la regola generale. |
| `security()` | `{ isolated }`: la regola generale su come girano le app (`true` se un amministratore non ha scelto altro). Una copia; si legge dai dati di avvio (`appSecurity`). |
| `setSecurity({ isolated })` | Cambia la regola generale (solo amministratori; `isolated` deve essere `true` o `false`). Emette `security`. Lancia `KernelError` (`forbidden`, `invalid`). |
| `setAppSecurity(id, isolated)` | Sceglie come gira una sola app (solo amministratori): `true`, `false`, oppure `null` per tornare alla regola generale. Lancia `invalid` per le app di sistema e le remote, che hanno una sola modalità. Poi fa `refresh()`. |
| `get(id)` | Una app o `null`. |
| `refresh()` | Rilegge l'elenco dal kernel ed emette `change` per ciò che è diverso. |
| `install(source, { grant = [], allowUnsigned = false })` | Installa (solo amministratori). `source`: `{ type: 'git', url, ref?, path? }` (un repository git; vedi [Origini dei pacchetti](#origini-dei-pacchetti-sourcesjs)), `{ type: 'github', repo: 'proprietario/nome', ref?, path? }` (lo stesso, scritto in breve) o `{ type: 'local', dir }` (cartella assoluta sul computer del kernel, solo con `apps.allowLocalSources`). `grant`: i permessi del manifesto che non sono impliciti. `allowUnsigned`: l'utente ha accettato l'avviso per un'app non verificabile. Restituisce l'app. Lancia `KernelError` (`forbidden` per permessi mancanti o app non verificata, `conflict` se è già installata…). |
| `update(id, { ref, reinstall = false, grant = [], allowUnsigned = false })` | Aggiorna dall'origine dell'app (all'ultima versione, o a `ref`). Con `reinstall` riscrive la stessa versione senza cancellare nulla. Restituisce l'app con `unchanged: true` se non c'era nulla di nuovo. |
| `uninstall(id)` | Rimuove l'app (non quelle necessarie, `required`). |
| `file(id, path)` | Il testo di un file della versione in uso (il codice). |
| `library(name, version)` | Il testo di una libreria con `cache: true`. |

Evento `change` `{ id, app }`: un'app è stata installata o aggiornata (`app` è lo stato nuovo) o rimossa (`app` è `null`). Solo `refresh()` — chiamato da `install`, `update`, `uninstall` e `setAppSecurity` — lo emette: se un altro amministratore o un'altra scheda installa un'app, questa scheda se ne accorge solo dopo una `refresh()` o una ricarica (non c'è sincronizzazione in diretta).

Evento `security` `{ isolated }`: la regola generale è cambiata (lo emettono `setSecurity` e `refresh()` quando la trova diversa). Il cambio di modalità vale dalla prossima apertura dell'app (o dal prossimo avvio del suo punto d'ingresso in background), non per ciò che è già aperto.

### `repositories`

I repository da cui arrivano app e moduli: quello ufficiale (sempre presente) e quelli aggiunti da un amministratore. Vedi [Repository](#repository-reposjs).

| Metodo | Descrizione |
| --- | --- |
| `list()` | `[{ id, name, url, official }]` (utenti). |
| `add(url, name?)` | Aggiunge un repository dopo aver letto il suo `catalog.json` (amministratori). `name` assente: quello del catalogo, o l'indirizzo. Lancia `conflict` se c'è già, `invalid` se il catalogo manca o l'indirizzo non va. |
| `remove(id)` | Toglie un repository (amministratori; non l'ufficiale). Le app già installate restano. |
| `catalog(id)` | Cosa offre il repository alla sua ultima versione: `{ repo, name, ref, commit, apps: [{ path, manifest, locales, readme } \| { path, error }], modules: [{ path, module, readme } \| { path, error }], system: { path, system, readme, changelog } \| { path, error } \| null }` (utenti). `system` è lilOS stesso (vedi [`systemReleases`](#systemreleases)): c'è solo nel repository ufficiale, altrimenti è `null`; `system.files` è il numero dei file della release, non l'elenco. `readme` è il testo di `README.md` nella cartella del pacchetto (Markdown) oppure `null`; oltre 64 KB è tagliato alla fine di una riga e la voce ha `readmeTruncated: true`. `locales` (solo nelle app) è la tabella delle traduzioni dell'app con le sole chiavi `@` (i testi del manifesto), oppure `null` se l'app non ne ha o il file non è valido: `locale.manifest(manifest, locales)` mostra il manifesto nella lingua dell'utente. Per installare: `apps.install({ type: 'git', url: repo.url, path, ref })`. |
| `readme(id, path, file?)` | Il `README.md` completo di un pacchetto del catalogo (`path` come lo elenca il catalogo), come testo (utenti). Per lilOS (`path` = `system.path`, solo nel repository ufficiale) `file` può essere `'CHANGELOG.md'`; qualunque altro `file` lancia `invalid`. |

### `kernelModules`

I moduli del kernel come pacchetti (solo amministratori). Girano nel kernel con accesso completo: ogni modifica vale dal **riavvio** (salvo le impostazioni di un modulo che le applica subito: `settings` e `saveSettings`). Vedi [Moduli come pacchetti](#moduli-come-pacchetti-modulepackagejs).

| Metodo | Descrizione |
| --- | --- |
| `list()` | `[{ name, version, description, icon, provides, requires, required, enabled, running, versions, source }]`. `required`: `true` per un modulo obbligatorio (non si rimuove). `icon`: `{ glyph, color }` del `module.json`, o `null`. `enabled`: la versione attiva nella configurazione (`null` se spento); `running`: quella in uso adesso; se differiscono serve un riavvio. |
| `install(source, { allowUnsigned = false })` | Installa e accende il modulo → `{ name, version, restartRequired: true }`. Un modulo non ufficiale richiede `allowUnsigned: true`. |
| `update(name, { ref, allowUnsigned = false })` | Aggiorna dall'origine registrata → `{ name, version, previous, restartRequired }`, oppure `{ name, version, unchanged: true }`. |
| `remove(name)` | Spegne il modulo e cancella le sue cartelle, tranne quelle che contengono i suoi dati → `{ name, kept, restartRequired }` (`kept`: cartelle conservate). Un modulo obbligatorio (`scheduler`) lancia `forbidden`. |
| `settings(name)` | `{ fields, values, secrets, live }`: le impostazioni di un modulo **in esecuzione** (`settings` del suo `module.json`). `fields`: i campi come quelli di un protocollo di rete (`key`, `type`, `label`, `hint`, `default`, `options`, `when`…); `values`: quelli presenti nella sua configurazione (solo le chiavi dei campi, mai quelli segreti); `secrets`: le chiavi dei campi `password` che hanno un valore; `live`: `true` se il modulo le applica subito (ascolta `ctx.onConfig`), altrimenti valgono dal prossimo avvio. `not_found` se il modulo non è attivo. |
| `saveSettings(name, values)` | Cambia le impostazioni (`values`: `{ chiave: valore }`) e restituisce lo stesso di `settings`. I valori si controllano con i campi (`invalid`); una chiave assente o vuota prende il `default` del campo, se ce l'ha, altrimenti si toglie. Le altre chiavi della configurazione restano. Un campo `password` assente o vuoto tiene il suo valore, `null` lo toglie. Se il modulo fornisce protocolli di rete, le connessioni aperte si chiudono (si riaprono al primo uso con le nuove impostazioni). Un modulo senza impostazioni lancia `invalid`. |
| `restart()` | Chiede al kernel di riavviarsi (`POST /api/kernel/restart`). Funziona solo se il kernel è stato avviato con `npm run kernel`; altrimenti lancia `unavailable`. Durante il riavvio (qualche secondo) le richieste falliscono: i salvataggi in attesa si ripetono da soli. |

### `systemReleases`

Le versioni di lilOS stesso (la pagina, il kernel e ciò che usano dell'SDK), dal repository ufficiale. Vedi [lilOS come pacchetto](#lilos-come-pacchetto-systempackagejs). Cambiare versione vale dal **riavvio** del kernel (`kernelModules.restart()`), e solo per gli amministratori. Se la nuova versione non parte, il kernel torna da solo a quella di prima.

| Metodo | Descrizione |
| --- | --- |
| `info()` | `{ version, mode }` per ogni utente: `version` è quella in uso, `mode` è `'installed'` (lilOS installato da una release) o `'development'` (una copia del repository). Gli amministratori hanno anche `kernel` (versione dell'API dei moduli), `sdk` (versioni dell'SDK delle app che il kernel esegue), `releases` (versioni conservate, la più recente per prima), `next` (la versione che parte al prossimo riavvio, `null` se è quella in uso), `previous` (la versione a cui si torna), `updated` (`{ from, at }`: l'ultimo aggiornamento è andato a buon fine e la versione `from` è ancora conservata) e `failed` (`{ version, at, reason, log }`: l'ultima versione provata non è partita; `log` sono le ultime righe del kernel). In sviluppo `releases` è `[]` e gli altri sono `null`. |
| `update({ ref? })` | Prende la versione più recente del repository ufficiale (o quella di `ref`), controlla l'hash di ogni file e la affianca a quella in uso → `{ version, previous, restartRequired: true }`, oppure `{ version, unchanged: true }` se è già quella in uso. Lancia `conflict` se la versione disponibile è più vecchia (senza `ref`), se lilOS è in sviluppo, se serve un Node.js più recente, se un modulo del kernel o un'app non è compatibile (il messaggio li elenca: vanno aggiornati prima). |
| `use(version)` | Sceglie un'altra versione tra quelle conservate (anche più vecchia), con gli stessi controlli di compatibilità → `{ version, restartRequired: true }`. Con la versione in uso annulla il cambio in attesa del riavvio → `{ version, restartRequired: false }`. `not_found` se la versione non c'è. |
| `remove(version)` | Cancella una versione conservata → `{ removed }`. `conflict` per quella in uso o quella che parte al prossimo riavvio. |
| `acknowledge('updated' \| 'failed')` | Segna come visto l'avviso e lo toglie da `info()` (`updated`: la versione di prima resta conservata). |

Tutti, tranne `info()`, lanciano `forbidden` se chi chiama non è un amministratore. Esempio:

```js
const { version, mode } = await systemReleases.info();
if (mode === 'installed') {
  const done = await systemReleases.update();
  if (done.restartRequired) await kernelModules.restart();
}
```

Dopo il riavvio la pagina aperta è ancora quella vecchia: lilOS (`src/apps/updates.js`) se ne accorge quando il kernel torna (`kernelEvents` emette `back`, in `src/apps/packages/packages.js`), confronta `info().version` con la versione di `package.json` con cui la pagina è stata costruita e, se diverse, chiede di riavviare lilOS (cioè ricaricare la pagina). Agli amministratori chiede anche se eliminare la versione di prima (`updated`) o li avvisa del ritorno automatico (`failed`).

Esempio, in sviluppo, per installare l'app di esempio:

```js
await apps.install({ type: 'local', dir: 'C:/percorso/di/lilos/examples/apps/note' }, {
  grant: ['fs.write:~/Documenti/Note', 'ui.shortcuts', 'desktop.items'], allowUnsigned: true,
});
```

---

## sdk/core/notifications.js

### `notifications`

Le notifiche per l'utente: ciò che lilOS e le app gli dicono, mostrato nell'area di notifica della barra delle applicazioni e nella finestra Notifiche (vedi [notifications/](#notifications-le-notifiche-nellinterfaccia)). Un `Emitter`. Le tiene il kernel, con il servizio `notifications` di un modulo (di serie [`notifications-basic`](#notifications-basic_100)): sopravvivono alla ricarica e arrivano a tutte le pagine dell'utente. Senza kernel, o senza il modulo, vivono solo in questa pagina.

| Membro | Descrizione |
| --- | --- |
| `available` | `true` se le tiene il kernel. Prima di `load()` è `false`. |
| `keep` | Quante se ne conservano (predefinito 20, da 1 a 200). |
| `list()` → `[notifica]` | Una copia dell'elenco, la più nuova per prima. |
| `get(id)` → `notifica \| null`, `unread` | Una notifica; quante non sono lette. |
| `load()` → `Promise` | Le legge dal kernel (`GET /api/notifications`); lo fa il sistema all'avvio. Quelle che ci sono già non sono novità: non emettono `new`. Senza kernel o senza servizio passa alla modalità locale (`available` `false`, `keep` dalla chiave `notifications-keep`). Se la richiesta fallisce scrive un avviso in console e non cambia nulla. Emette `change`. |
| `send({ text, level = 'info', action = null, app = null })` → `Promise<notifica>` | Manda una notifica all'utente. `level`: `'info'`, `'success'`, `'warning'` o `'error'`. `action`: `{ entry?, args? }`, cosa apre il clic (vedi sotto). `app`: l'id dell'app che la manda (lilOS lo passa per le sue app); senza, la manda lilOS stesso. Il testo diventa una riga sola, di al massimo 300 caratteri. **Se il kernel non la prende** (oltre `perMinute`, kernel che non risponde; non gli errori `invalid`) e la manda lilOS stesso (senza `app`), la notifica resta nella pagina, mescolata a quelle del kernel (ordinate per data, nel limite di `keep`), fino al ricaricamento: non si perde il messaggio. Una notifica **con `app`** riceve invece l'errore del kernel (`rate_limited` compreso). Con il kernel lancia `KernelError` (`invalid`, `rate_limited`: al massimo 10 al minuto per app e utente). In modalità locale lancia `Error` per un testo vuoto o un livello sconosciuto e non controlla `action` né il limite al minuto. Emette `new` una volta sola per notifica. |
| `markRead(ids = null)` | Segna come lette quelle degli `ids`, o tutte. Cambia subito l'elenco locale ed emette `change` solo se qualcosa è cambiato; poi avvisa il kernel. |
| `remove(ids = null)`, `clear()` | Cancella quelle degli `ids`, o tutte (`clear()` è `remove(null)`). Emette `change`. |
| `setKeep(n)` | Quante conservarne: un intero da 1 a 200, altrimenti `Error`. Taglia l'elenco subito. Con il kernel: `PUT /api/notifications-options` (vale per l'utente); senza, la chiave `notifications-keep`. |
| `received(id)`, `changed()` | Per il sistema (`connectServices`): il kernel ha detto `notification.new` / `notification.change` sul suo flusso di eventi; rileggono l'elenco e, per `received`, emettono `new`. |

Una notifica: `{ id, at, from, level, text, action, read }`. `at` è `Date.now()`; `from` è `{ app, name }` o `{ system: true }`; `action` è `{ entry, args } \| null` (`entry` `'main'` se manca, `args` `null` se manca).

Eventi: `new` `(notifica)`, anche se l'ha mandata un'altra pagina dell'utente; `change` `()` quando elenco, stato di lettura o `keep` cambiano.

```js
import { notifications } from '@lilos/sdk';

notifications.on('new', n => console.log(n.from.name ?? 'lilOS', n.text));
await notifications.send({
  app: 'esempio.note', text: 'Sincronizzazione finita', level: 'success',
  action: { entry: 'main', args: { vista: 'oggi' } },
});
```

**Cosa fa un clic.** Il sistema (`runAction`) apre l'app che l'ha mandata al punto d'ingresso `action.entry`, con `action.args`. I campi `file` e `files` degli `args` vengono **tolti**: consegnare file a un'app lo fa solo l'utente. Una notifica senza `action`, o di lilOS, non ha nulla da aprire. Se l'app non è più installata, una notifica lo dice.

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

Registro delle scorciatoie da tastiera. Ogni componente registra i propri comandi con le combinazioni predefinite; l'utente le cambia dal Pannello di controllo → Usabilità → Scorciatoie. Un solo listener `keydown` su `window` (in fase di bolla) esegue il comando corrispondente.

**Combinazioni**: stringhe canoniche con i modificatori nell'ordine Ctrl, Alt, Shift e poi il tasto, separati da `+`: `'Ctrl+K'`, `'Shift+1'`, `'Ctrl+Alt+N'`, `'F2'`, `'Delete'`.

- Cmd su Mac vale come Ctrl.
- Lettere maiuscole (`A`–`Z`, secondo il layout; con Alt o layout non latini conta la posizione del tasto). Cifre della riga superiore per posizione (`Shift+1` funziona con ogni layout), cifre del tastierino per valore.
- Tasti con nome: `Enter`, `Escape`, `Delete`, `Backspace`, `Tab`, `Space`, `Insert`, `Home`, `End`, `PageUp`, `PageDown`, `ArrowUp`/`Down`/`Left`/`Right`, `F1`–`F24`.
- Simboli con nome: `Plus`, `Minus`, `Equal`, `Comma`, `Period`, `Slash`, `Backslash`, `Semicolon`, `Quote`, `Backquote`, `BracketLeft`, `BracketRight`. Per i simboli Shift non conta, perché su molte tastiere serve a produrre il carattere (`+` è Shift + `=`): Ctrl e `+` è sempre `'Ctrl+Plus'`.

| Metodo | Descrizione |
| --- | --- |
| `register({ id, label, group, keys, run, when?, whenEditing?, repeat? })` | Registra un comando; restituisce la funzione per toglierlo. `id` stabile (`'desk.fit'`), `label` e `group` per il Pannello di controllo, `keys` predefinite, `run(event)` l'azione. `when()`: il comando è attivo solo se restituisce `true`. `whenEditing`: funziona anche mentre si scrive in un campo (richiede Ctrl o Alt). `repeat`: si ripete tenendo premuto. Lancia un errore se l'`id` esiste già. |
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

File system virtuale: un albero di cartelle, file, collegamenti alle app e collegamenti (`link`) a file, cartelle e pagine web, tenuto per intero in memoria. **Collegato al kernel** (sempre, nel sistema) è la cartella dell'utente: l'albero si carica all'avvio e ogni modifica è mandata al kernel 300 ms dopo l'ultima, solo per i nodi cambiati (`POST /api/fs/sync`, vedi [Il kernel](#il-kernel)); il contenuto dei file (testo) si legge e scrive dal kernel in modo asincrono, e prima di farlo `read` e `write` mandano ciò che è in attesa (un file appena creato deve esistere là). **Non collegato** (l'SDK da solo) l'albero è salvato in `lilos:fs` e il contenuto in IndexedDB.

```js
{ id, type: 'folder' | 'file' | 'app' | 'link', name, parent, created, modified,   // date in ms
  size?,      // solo file: byte del contenuto (UTF-8)
  color?,     // solo cartelle
  app?,       // solo collegamenti: id dell'app
  link?,      // solo type 'link': dove punta (vedi «Collegamenti» sotto)
  system?,    // non si può rinominare né eliminare
  workspace?, // id del workspace che l'ha creato (non cambia se lo si sposta o rinomina)
  private?,   // solo cartelle: visibile solo nel workspace proprietario (la Scrivania di un workspace)
  tags?,      // id dei tag (SDK `tags`), al massimo 30, senza doppioni; mai sui nodi di sistema
  apps? }     // dati delle app su questo nodo: { [id app]: oggetto }, vedi sotto
```

- I nomi sono unici dentro una cartella senza distinguere maiuscole e minuscole: `create` e `rename` aggiungono un numero se serve (`nota.txt` → `nota 2.txt`). Non possono essere vuoti né contenere `/` (diventa `-`); al massimo 255 caratteri.
- Tutti i metodi di lettura restituiscono **copie** che non condividono nemmeno l'array `tags`: l'albero si cambia solo con i metodi.
- **Collegamenti.** Un nodo `type: 'link'` punta a qualcosa che sta altrove; `link` ha una di queste forme (`cleanLink` in `core/fs.js` scarta il resto, e all'avvio i nodi `link` non validi si perdono):

  | `link` | Dove punta |
  | --- | --- |
  | `{ home: id, kind: 'file' \| 'folder', broken? }` | Un nodo della home, per id: segue spostamenti e rinomine (`id` come `[\w-]{1,64}`, non la radice né il cestino) |
  | `{ mount, path, kind: 'file' \| 'folder', broken? }` | Un file o una cartella di una connessione di rete (`mount`: id della connessione; `path`: comincia con `/`, al massimo 4096 caratteri) |
  | `{ url, kind: 'web' }` | Una pagina web: solo `http://` o `https://`, senza spazi, al massimo 4096 caratteri |

  `broken: true` dice che l'ultima volta l'originale non è stato trovato (lo mette e lo toglie lilOS, vedi [`deskLinks.js`](#desklinksjs)). Il tipo non ha contenuto: non è un file per `read`, `readBlob`, `write` e `copy`. `external()` (le modifiche che arrivano dal kernel) li ignora. Si crea in qualunque cartella della home, non in una di rete. I getter restituiscono una copia anche di `link`. Per il kernel è una scorciatoia (vedi `/api/fs/sync` più avanti).
- **Cestino.** `trash` sposta i nodi sotto- **Cestino.** `trash` sposta i nodi sotto una seconda radice nascosta (`fs.trashRoot`, `'trash'`). Per tutti gli altri metodi (`get`, `exists`, `children`, `resolve`, `read`, `snapshot`…) i nodi cestinati **non esistono**: si vedono solo con `trashed()`. Vedi [D28](../interna/decisioni.md#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system).
- **Workspace.** Con un workspace impostato (`setWorkspace`), le cartelle `private` degli altri workspace e tutto ciò che contengono **non esistono**: `get`, `exists`, `children`, `ancestors`, `resolve`, `path`, `read`, `write`, `rename`, `move`, `remove`, `snapshot` e `restore` le ignorano (come un id sconosciuto). Senza workspace impostato (all'avvio, prima di `setupWorkspaces`) tutto è visibile. Due cartelle private di workspace diversi possono avere lo stesso nome nella stessa cartella (non si vedono mai insieme). Ogni nodo creato con un workspace impostato porta il suo id in `workspace`.
- **Dati delle app.** `apps` tiene, per ogni id di app (`/^[a-z0-9][a-z0-9.-]{1,63}$/`), un oggetto che solo quell'app scrive (il ponte `lilos.files.setMeta` e `lilos.files.write(…, { mark })` scrivono sempre sotto l'id dell'app che chiama): al massimo **1 KB di JSON** per app, **8 app** per nodo e **2 KB in tutto** per i dati di tutte le app (il kernel accetta 4 KB di metadati per nodo). Con `content: true` l'app dice che il contenuto del file è suo (per esempio cifrato): senza l'app installata lilOS non lo apre, non lo legge e non lo scrive (guardia di `apps/pipes.js`, che scatta anche se l'app c'è ma le sue pipe `file.read` / `after` e `file.write` / `before` non sono attive). Per `file.open`, `file.read` e `file.write` di un tale file girano solo i gestori di lilOS e quelli di quell'app (vedi [pipes](#sdkcorepipesjs-e-sdkcorepipecatalogjs)). Le copie (`copy`, `copyContent`) portano `apps` con sé; rinominare e spostare non lo toccano. Alla lettura da `lilos:fs` si tengono solo le voci valide. Con `content: true`, `setAppMeta` e `write(…, { mark })` chiamano `scrub` sul nodo.
- **Pipe.** `read`, `readBlob` e `write` passano dagli eventi `file.read` e `file.write` ([pipes](#sdkcorepipesjs-e-sdkcorepipecatalogjs)) solo se qualche gestore li vuole per quel file; `caller` dice chi chiede (`{ app, opened }` per un'app installata, `{ system: true }` per lilOS, `null` se non si sa) e le operazioni chieste da un'app saltano i gestori di quella stessa app. Le operazioni immediate (`create`, `rename`, `move`, `remove`, `trash`, `purge`, `setTags`) chiamano prima `pipes.runSync` (solo i gestori sincroni di lilOS, che possono fermarle) e dopo `pipes.notify` (le app guardano); `untrash`, `copy` e `copyContent` solo `notify`.
- **Tag.** Un nodo con un tag nascosto (`setHiddenTags`) è escluso da `children()`, quindi da scrivania, File Manager, selettore, pannello dell'Editor e conteggi, ma **esiste ancora**: `get`, `exists`, `resolve`, `ancestors`, `path`, `read` e `tagged` lo trovano. Così le finestre aperte, l'Editor e le scorciatoie continuano a funzionare. Un elemento dentro una cartella nascosta non è nascosto a sua volta (se non ha il tag), ma non si raggiunge finché la cartella è nascosta. Il campo `tags` si conserva in cestino, `snapshot`/`restore` e `move`. Vedi [D29](../interna/decisioni.md#d29-i-tag-stanno-sui-nodi-e-un-tag-invisibile-nasconde-gli-elementi).

| Membro | Descrizione |
| --- | --- |
| `root` | Id della radice (`'root'`), la home dell'utente. |
| `home` | Il percorso della radice: `'/home/<utente>'` collegati al kernel (com'è nel suo file system), `'~'` senza. |
| `loaded` | `false` al primo avvio (niente di salvato): il sistema riempie l'albero. |
| `get(id)`, `exists(id)` | Il nodo (o `null`), se esiste. |
| `children(id)` | Figli diretti, in ordine di creazione. |
| `ancestors(id)` | Dalla radice al nodo compreso. |
| `path(id)` | Il percorso vero, dalla home: `'/home/eugenio/Documenti/Note'` (`fs.home` per la radice; senza kernel `'~/Documenti/Note'`). |
| `resolve(path)` | Il nodo a quel percorso, o `null`. Accetta il percorso di `path` (`'/home/eugenio/Documenti'`), quello con `~` (`'~/Documenti'`) e, senza nessuno dei due, un percorso dentro la home (`'/Documenti'`). Le app passano sempre `~/…`: così una cartella chiamata `home` nella home non si confonde con il prefisso. |
| `isInside(id, ancestorId)` | `true` se `id` è `ancestorId` o sta dentro. |
| `count(id)` | Quanti nodi contiene una cartella, a ogni livello. |
| `uniqueName(parentId, name, exceptId?)` | Il nome libero più vicino. |
| `create(parentId, { type, name, color?, app?, link?, size?, system?, id?, workspace?, private? })` | Crea e restituisce il nodo (`id` facoltativo, per le migrazioni). Per `type: 'link'` serve `link` (vedi «Collegamenti» sotto): se non è valido lancia «Collegamento non valido»; in una cartella di rete un collegamento non si crea (come un'`app`). `workspace` è il proprietario: predefinito il workspace attuale (`fs.workspace`); le cartelle di sistema condivise (`system` senza `private`) non hanno proprietario. `private: true` solo per una cartella con un proprietario. Lancia un errore se la cartella non esiste, il tipo non è valido o `workspace` non è un id valido. |
| `rename(id, name)` | Rinomina e restituisce il nome finale. |
| `update(id, { color, broken })` | Cambia i metadati che non sono il nome: `color` (cartelle) e `broken` (booleano, solo collegamenti: mette o toglie il segno «rotto»; se non cambia, non emette niente). |
| `read(id, { caller? })` | `Promise<string>`: il contenuto del file come testo (`''` se non ne ha), passando da `file.read` se qualcuno lo vuole. |
| `readBlob(id, { type?, caller? })` | `Promise<Blob>`: il contenuto del file come byte (vuoto se non ne ha), per le immagini e gli altri file binari. Il tipo del `Blob` viene dall'estensione (`'image/png'` per un `.png`, `'image/svg+xml'` per un `.svg`…), oppure è `type`. |
| `write(id, data, { caller?, mark? })` | `Promise`: salva il contenuto, testo (una stringa) o byte (`Blob`, `ArrayBuffer` o array tipizzato), aggiorna `size` (in byte) e `modified` ed emette `change` di tipo `update`. I byte arrivano al kernel così come sono (`PUT /api/fs/content/:id`) e tornano uguali con `readBlob` (`GET /api/fs/content/:id?raw=1`). Passa da `file.write` (un gestore può cambiare `content` o fermare il salvataggio). `mark: { app, value }` imposta anche i dati di quell'app sul nodo (`setAppMeta`) dopo il salvataggio, nello stesso cambiamento: un contenuto e il segno che dice come leggerlo non si separano mai. I dati di `mark` si controllano prima di salvare. |
| `copy(id, parentId, { name? })` | `Promise<node>`: una copia del file in una cartella, con `name` (o il suo nome) reso unico. Copia il contenuto **così com'è nel kernel** (non passa dalle pipe: un file cifrato resta cifrato) e i dati delle app (`apps`). Emette `change` di tipo `create` e poi `update`; `file.copy` dopo. |
| `copyContent(fromId, toId)` | `Promise`: mette il contenuto memorizzato di un file, e i suoi `apps`, dentro un altro file che esiste già. Emette `change` di tipo `update` e `file.copy`. |
| `appMeta(id, appId)` | Una copia dei dati di quell'app sul nodo, o `null`. |
| `setAppMeta(id, appId, value)` | Imposta i dati di un'app su un nodo (anche una cartella), o li toglie con `null`. `value` è un oggetto semplice di al massimo 1 KB di JSON. Lancia un errore per un id di app non valido, per un `value` che non è un oggetto o è troppo grande (1 KB per app), per più di 8 app sul nodo o più di 2 KB di dati di tutte le app insieme («Troppi dati delle app su questo elemento») e per l'elemento inesistente o la radice. Con `content: true` ripulisce la cronologia di annulla di quel contenuto (`scrub`). Emette `change` di tipo `update`. Solo il sistema e le app di sistema lo chiamano direttamente: un'app installata passa da `lilos.files.setMeta`. |
| `scrub(...ids)` | Toglie il contenuto di questi nodi da ogni `snapshot` ancora tenuto (la cronologia di annulla): rimetterli darebbe un file vuoto. Serve a un contenuto che non deve restare da nessuna parte in chiaro. |
| `move(id, parentId)` | Sposta il nodo (con il contenuto) in un'altra cartella e restituisce il nome finale, reso unico lì. Lancia un errore se la destinazione non è una cartella o sta dentro il nodo stesso. |
| `remove(id)` | Elimina il nodo e, per le cartelle, tutto il contenuto (anche quello dei file). Il contenuto si perde: per poterlo riavere prendi prima uno `snapshot`, oppure usa `trash`. Non vale per i nodi nel cestino (`purge`). |
| `trashRoot` | Id della radice nascosta del cestino (`'trash'`); non è un nodo: `get` non la vede. |
| `trash(ids)` | Sposta nel cestino i nodi con tutto ciò che contengono. Salta i nodi di sistema, le cartelle che ne contengono, gli id sconosciuti, ripetuti o già nel cestino. Restituisce gli id cestinati. Il nodo prende `trashed: { at, from, scope? }`: `at` è l'ora (ms), `from` la cartella d'origine, `scope` il workspace proprietario se veniva da una cartella privata. Per ogni nodo emette `change` di tipo `remove` con `trashed: true` (`node.parent` è la cartella d'origine); poi `trash`. |
| `trashed()` | Gli elementi nel cestino che il workspace attuale vede, dal più recente. Ognuno è il nodo con `trashed`, più `inside` (quanti nodi contiene) e `bytes` (dimensione dei file, contenuto compreso). Sono copie. |
| `isTrashed(id)` | `true` se `id` è un elemento del cestino che il workspace attuale vede (come in `trashed()`, ma per un solo id e senza contare il contenuto). |
| `untrash(ids, parentId?)` | Rimette gli elementi nella cartella d'origine; se non c'è più, non è una cartella o non è visibile, nella radice. Con `parentId` li mette invece in quella cartella (se non esiste, non è una cartella o non è visibile, non rimette niente). Il nome diventa unico lì. Restituisce `[{ id, parent }]` per ogni elemento rimesso (`[]` se nessuno). Emette `change` di tipo `create` per ogni nodo (contenuto compreso), poi `trash`. Si saltano gli id che non sono nel cestino o non sono visibili. |
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
| `hiddenNodes` | Id dei nodi che il sistema nasconde (copia). |
| `setHiddenNodes(ids)` | Imposta i nodi che il sistema tiene per sé (oggi la cartella Sistema, da `setupFileSystem`): esclusi da `children()` come quelli con un tag nascosto, trovati da `get`, `exists` e `resolve`. Non si salva: il sistema lo imposta a ogni avvio. Emette `scope` se l'insieme cambia. |
| `isHidden(id)` | `true` se il nodo esiste ed è nascosto: da un suo tag o dal sistema (`setHiddenNodes`). |
| `snapshot(ids)` | `Promise<{ nodes, contents }>`: copia i nodi (e, per le cartelle, tutto quello che contengono) con il contenuto dei file, come byte (testo e immagini tornano identici). Gli id che non esistono o sono ripetuti si saltano. Va preso **prima** di `remove`. |
| `restore(snapshot)` | `Promise<string[]>`: rimette quello che `snapshot` ha copiato, con gli stessi id, gli stessi metadati e lo stesso contenuto. Il nome diventa unico se nel frattempo è stato preso. Si saltano i nodi la cui cartella non c'è più (o non è visibile) e gli id che esistono di nuovo. Emette un `change` di tipo `create` per ogni nodo rimesso; restituisce gli id rimessi (`[]` se non ha potuto rimettere nulla). |
| `isRemote(id)` | `true` se il nodo è di una connessione di rete (compreso il nodo della connessione). |
| `netPath(id)` | Il percorso del nodo dentro la sua connessione (`'/'` per il nodo della connessione), `null` per gli altri nodi. |
| `netRef(id)` | Dov'è un nodo, come lo chiamano i trasferimenti del kernel: `{ home: id }` o `{ mount, path }`. Lancia un errore se il nodo non esiste. |
| `setMounts(parentId, mounts)` | Mette in una cartella (la Rete del sistema) un nodo per ogni connessione, `[{ id, name, protocol, state }]`: nodo `net-<id>`, cartella di sistema con `net: <id connessione>`, `mount: true`, `mountState` e `protocol`. Quelle sparite si tolgono con quello che era stato letto; una connessione che non è più `on` dimentica il contenuto letto. Emette `change`. Lo chiama il sistema (`src/net/connect.js`). |
| `refresh(id)` | `Promise`: rilegge dal server il contenuto di una cartella di rete (si chiama aprendola) e porta l'albero a quello. Rifiuta con l'errore del kernel (`secret_required`, `untrusted`…). Per gli altri nodi non fa niente. I nodi prendono anche ciò che il protocollo dice dell'elemento: `web` (etichetta: un documento senza byte propri, da aprire sul sito del fornitore) con `exportAs` (l'estensione con cui si copia), `badge`, `noRename`, `noRemove`, `removeLabel`. |
| `netChanged(mountId, path)` | Il kernel dice che una cartella è cambiata sul server: la rilegge se era stata letta. |
| `external({ put, remove, trash })` | Mette nell'albero nodi della home che ha fatto o cambiato il kernel (`put`: nodi come li manda il kernel; `remove`: id; `trash`: `[{ id, at, from }]`, nodi che il kernel ha messo nel Cestino), per esempio ciò che un trasferimento ha portato o ciò che una copia, un comando o un'operazione della Pianificazione ha fatto. Un nodo di `put` già presente può anche essere stato **spostato** dal kernel (cambia `parent`, se la nuova cartella c'è e non è dentro di lui: emette `change` di tipo `move`) e riceve i `tags` nuovi se `tags` è un elenco. Nodi di rete e di sistema non si toccano. Sono già nel kernel: non si rimandano. Emette `change` (e `trash` se ne ha messi nel Cestino). |

**Rete.** Le cartelle di una connessione ([`net`](#net)) stanno nell'albero sotto un nodo di connessione (`setMounts`). I loro nodi hanno `net` (l'id della connessione) e **non si salvano**: il contenuto di una cartella si legge dal server con `refresh` quando si apre, e `children` restituisce quello letto per ultimo. Creare, rinominare, spostare dentro la stessa connessione ed eliminare vanno al server subito; se il server rifiuta, la cartella si rilegge e `fs` emette `netError` `{ message, code }`. Eliminare è **definitivo** (niente cestino, niente annulla). `read`, `readBlob` e `write` leggono e scrivono sul server (`write` con `mark` no). `move` tra la home e una connessione, o tra due connessioni, lancia un errore: i file vanno e vengono con `net.transfer()`. Sui nodi di rete lanciano un errore anche `copy`, `copyContent`, `setTags`, `update` (colore), `setAppMeta` e la creazione di collegamenti alle app; `trash` salta i nodi di rete (non vanno nel cestino) e `remove` li elimina dal server per sempre; `untrash` verso una cartella di rete non rimette niente (restituisce `[]`). I nodi di rete non si salvano in `lilos:fs` né vanno al kernel come nodi. Le miniature dei file di rete non si chiedono.

`rename`, `move` e `remove` lanciano un errore sui nodi di sistema e sulla radice.

`reset()` → `Promise`: elimina **ogni** nodo (di sistema, nel cestino, con il loro contenuto), senza eventi, e aspetta che il kernel l'abbia saputo (senza kernel toglie `lilos:fs`). Lo usa il ripristino «Scrivania e file iniziali» del Pannello di controllo, che poi cancella le altre chiavi e ricarica lilOS: dopo `reset()` il sistema non è in uno stato utilizzabile senza ricaricare.

Evento `trash` (senza dati): è cambiato ciò che il cestino contiene (`trash`, `untrash`, `purge`, `purgeTrash`, `unscopeTrash`). Chi mostra il cestino rilegge `trashed()`.

Evento `scope`: `id` del workspace attuale (o `null`). Significa "cambia ciò che è visibile": un altro workspace (`setWorkspace`), i tag nascosti (`setHiddenTags`) o i nodi nascosti dal sistema (`setHiddenNodes`), questi ultimi con lo stesso id di prima. Le viste leggono di nuovo l'albero.

Evento `change`: `{ type: 'create' | 'rename' | 'update' | 'move' | 'remove', node, parent, from?, ids? }`. Per `remove`, `ids` sono tutti i nodi eliminati, contenuto compreso (con `trashed: true` sono finiti nel cestino, non eliminati); per `move`, `from` è la cartella di prima e `ids` il sottoalbero spostato (chi tiene aperto un file controlla `e.ids.includes(id)`: il suo percorso è cambiato).

Collegati al kernel, i contenuti stanno nel database del kernel (con il nodo, e spariscono con lui); IndexedDB `lilos:<id utente>` (archivio `contents`, chiave l'`id` del file) ne tiene una copia: ciò che si è letto o scritto, usato solo per leggere quando il kernel non risponde (`offline`), e cancellato quando l'utente esce. Non collegati, stanno nel database IndexedDB `lilos`, archivio `contents`; se IndexedDB non è disponibile (alcune modalità private) restano in memoria fino alla ricarica, e qualche secondo dopo l'avvio si eliminano i contenuti dei nodi che non esistono più.

Alla lettura da `lilos:fs` vengono tenuti solo i nodi ben formati raggiungibili dalla radice: tipi sconosciuti, nomi non validi, nodi orfani, cicli e nomi duplicati nella stessa cartella vengono scartati (tranne tra cartelle private di workspace diversi). `workspace` è tenuto solo se è un id valido e `private` solo per cartelle con un proprietario. `tags` è tenuto solo sui nodi che non sono di sistema, ripulito come in `setTags` (id validi, senza doppioni, al massimo 30); `setTags` non controlla che i tag esistano, ma i tag che non esistono più non si vedono da nessuna parte. Si parte da due radici (`root` e `trash`): i figli diretti del cestino senza un `trashed` valido (`at` numero, `from` testo) si scartano, e lì i nomi possono ripetersi. `ownedCount` non conta i nodi nel cestino.

---

## sdk/core/net.js

### `net`

Connessioni di rete (la cartella **Rete**: FTP, SFTP, WebDAV, SMB; ogni protocollo è un modulo del kernel) e trasferimenti da e verso di esse, che fa il kernel. Funziona solo **collegato al kernel**. Il contratto dei protocolli, gli endpoint e i trasferimenti sono in [Rete](#rete-connessioni-e-trasferimenti-net-apinetjs); le cartelle remote dentro `fs` in [`fs`](#fs).

| Membro | Descrizione |
| --- | --- |
| `available` | `true` se c'è il kernel e ha almeno un protocollo |
| `protocols` | `[{ id, label, order, fields, canListShares, links, office, recycles, notReady }]`: i protocolli, già in ordine; `fields` come nel contratto del driver. `links`: `link()` funziona sulle sue connessioni; `office`: il link di un documento Office lo apre in Office per il web; `recycles`: ciò che si elimina va nel cestino del fornitore; `notReady`: perché non si può ancora usare (etichetta), o `null` |
| `mounts()` / `mount(id)` | Le connessioni (copie) / una connessione o `null`: `{ id, name, protocol, address, values, auto, remembered, trusted, state, error }` |
| `load()` | `Promise`: le rilegge dal kernel (le prime arrivano già con `GET /api/boot`) |
| `create({ name, protocol, values, auto, remember, trust?, signin? }, secret)` | `Promise<mount>`. `secret`: `{ chiave: valore }` dei campi segreti. `signin`: l'id di un accesso fatto con `signIn` (protocolli con un campo `signin`) |
| `update(id, { name?, values?, auto?, remember?, forget? }, secret?)` | `Promise<mount>`. I segreti vuoti restano come sono |
| `remove(id)` | `Promise`. Toglie la connessione |
| `connect(id, { secret?, remember?, trust?, signin? })` | `Promise<mount>`. Poi rilegge comunque lo stato, anche se è fallita. `signin`: l'id di un accesso appena fatto (`signIn`), per rifare l'accesso di una connessione |
| `disconnect(id)` | `Promise<mount>`. Dimentica la password non ricordata |
| `test({ protocol, values, trust?, signin? }, secret)` | `Promise`. Prova senza salvare |
| `shares({ protocol, values, trust? }, secret)` | `Promise<string[]>`. Cosa offre il server (protocolli con `canListShares`) |
| `signInByHand(protocol)` | `true` se l'accesso a quel protocollo qui va fatto incollando l'indirizzo: il protocollo lo permette (`signIn.manual`) e o ha solo quel modo, o la pagina è su `http://` fuori da questo computer |
| `space(id)` | `Promise<{ used, total } \| null>`: lo spazio dell'account (protocolli con `space`) |
| `imports.start(id)`, `imports.status(id, importId, { wait })`, `imports.copy(id, path, folderId)` | Importare da un protocollo con `importer`: `start` → `{ id, url }` (apri `url` in una nuova scheda con `openWeb`), `status` → `{ status, count, size, path, error }`, `copy` copia la cartella `path` della connessione in una cartella di `fs` → `{ queue }` |
| `signIn(protocol, values = {}, { signal, manual?, askAddress? }?)` | `Promise<{ signin, account }>`. Con `manual: true` (vedi `signInByHand`) apre la pagina del fornitore in una nuova scheda e chiama `askAddress(errore)` (dell'app: chiede all'utente l'indirizzo della pagina che non si è aperta; `null` rinuncia) finché l'indirizzo non è quello giusto. Per i protocolli con un campo `signin`: apre subito una finestra (**va chiamata direttamente da un clic**, altrimenti il browser la blocca), chiede al kernel la pagina del fornitore, la mostra, aspetta la fine dell'accesso e chiude la finestra. `values`: gli altri campi della connessione. `signin` (l'id) va in `create`, `update`, `test` o `connect`; `account` è quello da mostrare. Rifiuta con `KernelError` di codice `blocked` (il browser non ha aperto la finestra), `canceled` (`signal` interrotto) o `invalid` (accesso non riuscito) o con un errore del kernel (`unavailable`, `rate_limited`…). Il ritorno è `<origine>/api/net/signin/callback`: vedi [Accesso con un fornitore](#accesso-con-un-fornitore-netsigninjs) |
| `link(id, path)` | `Promise<string>`. Un `https://…`: la pagina del file o della cartella sul sito del fornitore (protocolli con `links`); per un documento Office di un protocollo con `office`, Office per il web |
| `openWeb(getUrl)` | `Promise`. Apre **subito** una scheda vuota (da chiamare da un clic), aspetta `await getUrl()` (deve essere `https://`) e porta la scheda lì, senza `opener`. Se `getUrl` fallisce chiude la scheda e rifiuta; se il browser non ha dato la scheda, apre l'indirizzo con `window.open` quando arriva. Esempio: `net.openWeb(() => net.link(id, path))` |
| `putHome(id, fileId, folder = '/', ifExists = 'ask')` | `Promise<{ path, name }>`. Copia un file della home (`fileId` di `fs`) in una cartella di una connessione, creandola se manca. `ifExists`: `'replace'`, `'keep'` (la copia prende un altro nome, con un numero) o `'ask'` (`KernelError` `conflict` con `details: { name, exists: true }`). Prima fa partire il salvataggio dei file in attesa verso il kernel (`kernel.flush('fs')`) |
| `text(label)` | Un'etichetta di protocollo o di campo (`{ en, it }` o testo) nella lingua del sistema: prima il codice completo, poi la lingua, poi `en`, poi la prima |
| `mountNode(id)` | `'net-<id>'`: l'id del nodo di `fs` che è la cartella della connessione |
| `transfers` | L'ultima istantanea dei trasferimenti (vedi [Trasferimenti](#trasferimenti-transfers)) |
| `transfer(ids, folderId)` | `Promise<{ queue }>`. Copia nodi di `fs` in una cartella; almeno uno dei due lati è una connessione. Prima fa partire il salvataggio dei file in attesa verso il kernel (`kernel.flush('fs')`). Le sorgenti restano dove sono |
| `loadTransfers()` | `Promise`: legge l'istantanea |
| `children(itemId)` | `Promise<{ items, more }>`: dentro una cartella di una coda |
| `cancel({ ids?, queue?, all? })`, `resolve(id, action, all = false)`, `retry({ ids?, queue? })`, `dismiss({ ids?, queue?, all? })`, `pause(queue, paused)` | `Promise`. I comandi dei trasferimenti (come gli endpoint) |

Eventi: `mounts` (una connessione è comparsa, cambiata o sparita), `transfers` (istantanea), `notify` `{ text, level }` (una coda è finita e il kernel non tiene le notifiche). Il sistema passa a `net` ciò che il kernel trasmette con `mountChanged()`, `transfersChanged(istantanea)` e `notified(dati)`; le app non li chiamano.

Gli errori sono `KernelError` con `details` (vedi [`KernelError`](#class-kernelerror-extends-error)): `secret_required` (`details.reason`: `'missing'`, `'auth'` o `'signin'`: serve un nuovo accesso, `signIn` e poi `connect` con `signin`), `untrusted` (`details.trust`: `{ kind, fingerprint, text, changed?, previous? }`, con `changed: true` e l'impronta di prima in `previous` se il server ha cambiato chiave o certificato: avvisa più forte; per proseguire si richiama `connect` con `{ trust: fingerprint }`) e `unavailable`.

```js
import { net } from '@lilos/sdk';

if (net.available) {
  const m = await net.create({
    name: 'NAS', protocol: 'smb', auto: false, remember: true,
    values: { host: 'nas.local', share: 'Foto', auth: 'password', user: 'ann' },
  }, { password: 'segreto' });
  try {
    await net.connect(m.id);
  } catch (err) {
    if (err.code === 'untrusted') await net.connect(m.id, { trust: err.details.trust.fingerprint }); // dopo aver chiesto all'utente
    else throw err;
  }
  await net.transfer([someFileId], net.mountNode(m.id));   // copia un file di lilOS nella radice della condivisione
}
```

---

## sdk/core/serial.js

### `serial`

Le porte seriali del computer **dell'utente** (schede come Arduino, adattatori USB), con Web Serial del browser. Funziona in Chrome, Edge e Firefox 151 o più recente, solo su `https` o `localhost`; non in Safari. È la **pagina** di lilOS ad aprire le porte e a dare il canale: un'app isolata (la sandbox non ha Web Serial) le usa lo stesso, tramite `lilos.serial` (vedi [`window.lilos`](#windowlilos-bridgejs)). Non serve il kernel. `Emitter`.

| Membro | Descrizione |
| --- | --- |
| `supported` | `true` se il browser ha Web Serial e la pagina è in un contesto sicuro. |
| `ports()` → `Promise<[port]>` | Le porte che l'utente ha già autorizzato e che sono collegate adesso (`[]` se `supported` è `false`). `port`: `{ id, usbVendorId, usbProductId }` (numeri, o `null` se la porta non è USB). Gli `id` (`p1`, `p2`…) durano quanto la pagina. |
| `request({ filters? } = {})` → `Promise<port \| null>` | Fa scegliere una porta all'utente (il browser mostra il suo elenco). `filters`: `[{ usbVendorId, usbProductId? }]` (numeri interi, al massimo 50; senza filtri valgono tutte le porte). `null` se l'utente chiude l'elenco. **Solo subito dopo un clic o un tasto**: senza, lancia «Il browser vuole un clic prima di scegliere una porta». Il browser chiede una volta per porta e per sito. |
| `forget(id)` | Il browser dimentica l'autorizzazione di quella porta. |
| `open(id, options)` → `Promise<MessagePort>` | Apre la porta e dà il canale. `options`: `baudRate` (obbligatorio, intero da 50 a 4000000), `dataBits` 7 o 8 (predefinito 8), `stopBits` 1 o 2 (1), `parity` `'none'` \| `'even'` \| `'odd'` (`'none'`), `flowControl` `'none'` \| `'hardware'` (`'none'`), `bufferSize` da 64 a 1048576 (4096). Un valore fuori dall'elenco diventa quello predefinito. Lancia un errore se la porta non c'è più, se è già aperta (da un'altra finestra o un altro programma) o se non si apre. |

Evento `change` (senza dati): una porta autorizzata si è collegata o scollegata. Il browser si ascolta dal primo `on('change')` o dalla prima chiamata a `ports()`, `request()`, `forget()` o `open()`.

**Il canale** (la `MessagePort` di `open`):

| Direzione | Messaggio | Significato |
| --- | --- | --- |
| dalla porta | `ArrayBuffer` | Byte letti (passati senza copiarli) |
| dalla porta | stringa `{"t":"done","id":N,"error"?}` | Fine del messaggio di controllo con quell'`id`: tutto ciò che era stato mandato prima è stato scritto (`error` se è fallito) |
| dalla porta | stringa `{"t":"error","message"}` | Il dispositivo è sparito o la lettura è fallita; segue `gone` |
| dalla porta | stringa `{"t":"gone"}` | La porta è chiusa; la `MessagePort` si chiude |
| verso la porta | `ArrayBuffer` o array tipizzato, fino a 64 KiB | Byte da scrivere, in ordine (uno più grande si scarta, e anche ciò che supera 1 MiB in attesa di essere scritto). Alla chiusura, una scrittura che non finisce entro 2 secondi viene interrotta |
| verso la porta | stringa `{"t":"signals","id"?,"dtr"?,"rts"?,"brk"?}` | Cambia i segnali DTR (Data Terminal Ready), RTS (Request To Send) e break (booleani; quelli assenti restano come sono). Con `id` risponde `done` |
| verso la porta | stringa `{"t":"sync","id":N}` | Risponde `done` quando le scritture precedenti sono finite |
| verso la porta | stringa `{"t":"close"}` | Chiude la porta |

Le stringhe sono lunghe al massimo 1024 caratteri (le più lunghe si scartano); scritture e segnali vanno in coda e si eseguono uno alla volta, nell'ordine. `port.detach()` chiude la porta (per lilOS: la finestra che la teneva è stata chiusa). Un errore di parità o di formato dei dati non chiude la porta.

```js
import { serial } from '@lilos/sdk';

// da un gestore di clic
const info = await serial.request({ filters: [{ usbVendorId: 0x2341 }] });   // schede Arduino
if (info) {
  const port = await serial.open(info.id, { baudRate: 115200 });
  port.onmessage = e => {
    if (typeof e.data !== 'string') console.log(new TextDecoder().decode(e.data));
  };
  // DTR e RTS bassi (su molte schede è un reset); 'done' arriva quando è fatto
  port.postMessage(JSON.stringify({ t: 'signals', id: 1, dtr: false, rts: false }));
  port.postMessage(new TextEncoder().encode('ciao\n'));
}
```

---

## sdk/core/term.js

### `term`

Terminali remoti (usati dall'app di sistema **Terminale**: SSH, Telnet, rlogin, SUPDUP; ogni protocollo è un modulo del kernel): gli host che l'utente ha salvato e le sessioni aperte nel kernel. Funziona solo **collegato al kernel**. Le sessioni vivono nel kernel: una sessione continua senza finestra e si chiude dopo 10 minuti senza; una pagina che si ricollega riceve lo schermo com'era. Il contratto dei moduli, gli endpoint e le scelte sono in [Terminali remoti](#terminali-remoti-term-apitermjs) e in [D61](../interna/decisioni.md#d61-i-terminali-remoti-le-sessioni-vivono-nel-kernel-un-websocket-nostro). Un'app installata non usa questo oggetto: passa da [`lilos.term`](#windowlilos-bridgejs).

| Membro | Descrizione |
| --- | --- |
| `available` | `true` se c'è il kernel e ha almeno un protocollo (vale dopo `load()`) |
| `protocols` | `[{ id, label, order, port, secure, fields }]` dall'ultimo `load()`. `secure`: `true`, `false` o `null` (dipende dai valori: Telnet con o senza TLS); `fields` come per i protocolli di [`net`](#sdkcorenetjs) |
| `load()` | `Promise<{ protocols, encodings, hosts, sessions }>`. `encodings`: `['utf-8', 'iso-8859-1', 'iso-8859-15', 'cp437']`. Fuori dal kernel restituisce quattro liste vuote |
| `saveHost(id \| null, config, secret = {})` | `Promise<host>`. `config`: `{ name, folder, protocol, values, settings, remember?, forget? }`. `id` `null` crea (`POST /api/term/hosts`), altrimenti cambia (`PUT`). Su un host esistente i segreti lasciati vuoti restano com'erano; `forget: true` (o `remember: false`) li toglie. Cambiando `host`, `port`, `user`, `auth` o `tls` la password salvata si scorda |
| `removeHost(id)` | `Promise` |
| `open(spec)` | `Promise<sessione>`. `spec`: `{ host: id, cwd? }` (un host salvato), `{ protocol, values, secret?, sealed?, settings?, name?, cwd? }` (connessione rapida, senza salvare; `name` è il nome della sessione, `cwd` una cartella assoluta del server in cui partire, `sealed` una password data da `seal`; senza `secret` né `sealed` si usa la password di un host salvato con gli stessi valori BOUND, il più usato di recente) o `{ mount: id, path? }` (SSH sul server di una connessione SFTP di Rete, nella cartella `path` della connessione, con le sue credenziali e la sua chiave del server). La sessione nasce `new` e si collega quando una pagina fa `attach`. Al massimo 10 aperte per utente (`rate_limited`) |
| `seal(spec)` | `Promise<string>`. `spec`: `{ host: id }` o `{ protocol, values, secret }` (`POST /api/term/seal`). La password (i campi segreti) cifrata con la chiave del kernel, da tenere in un file `.term`. Si riapre solo per lo stesso utente, sullo stesso lilOS, per lo stesso protocollo e gli stessi valori BOUND (`host` in minuscolo, `port` o la porta predefinita del protocollo, `user`, `auth`, `tls`). Senza password → `invalid`. Passata a `open` come `sealed`, se non vale → `forbidden` (403) |
| `close(id)` | `Promise`. Chiude la connessione e dimentica la sessione |
| `attach(id, { cols, rows })` | `MessagePort` (sincrono). Apre il WebSocket `/api/term/sessions/:id/socket` e lo mette dietro la porta; `cols` e `rows` sono la dimensione dello schermo. Un `id` che non è `[a-f0-9]{16}` lancia un errore. Protocollo della porta, sotto |
| `text(label)` | Un'etichetta di protocollo o di campo (`{ en, it }` o testo) nella lingua del sistema, come `net.text()` |
| `changed(what)` | Per il sistema: il kernel ha detto che `'hosts'` o `'sessions'` sono cambiati (`src/net/connect.js`) |

**Forme.**

| Oggetto | Campi |
| --- | --- |
| host | `{ id, name, folder, protocol, address, values, settings, remembered, secure, available, used }`. `remembered`: c'è una password salvata; `available`: il modulo del protocollo è attivo; `used`: l'ultima apertura (ms) o `null`. I segreti non tornano mai |
| `settings` | `{ term: 'xterm-256color', encoding: 'utf-8' \| 'iso-8859-1' \| 'iso-8859-15' \| 'cp437', backspace: 'del' \| 'bs' }` (i valori predefiniti sono i primi) |
| sessione | `{ id, host, name, protocol, address, secure, state, reason, title, created, attached, closesAt, info, signals }`. `state`: `'new'` (nessuna pagina l'ha ancora collegata) \| `'connecting'` \| `'on'` \| `'closed'`; `reason`: perché è chiusa; `title`: il titolo che il programma ha impostato; `attached`: una pagina la sta mostrando; `closesAt`: quando si chiude da sola (ms) se nessuna pagina la mostra, altrimenti `null`; `info`: dati del driver (impronta, cifratura); `signals`: i segnali che il protocollo sa mandare (`'break'`, `'interrupt'`, `'ayt'`) |

**La porta di `attach`.** I byte dello schermo e dei tasti sono binari; le cose di controllo sono stringhe JSON.

| Direzione | Messaggio |
| --- | --- |
| dalla porta, `ArrayBuffer` | I byte per lo schermo (UTF-8, per un xterm), già convertiti dalla codifica scelta. All'inizio arriva lo schermo com'era (gli ultimi 1 MB, con i modi del terminale ripristinati: schermo alternativo, mouse, cursore) |
| dalla porta, stringa | `{ t: 'state', session }` lo stato è cambiato · `{ t: 'trust', trust: { kind: 'ssh' \| 'tls', fingerprint, text, host, changed?, previous? } }` una chiave del server da confermare (`changed` e `previous` se prima ce n'era un'altra) · `{ t: 'taken' }` un'altra pagina ha preso la sessione (poi arriva `gone` e la porta si chiude) · `{ t: 'gone', code }` il canale si è chiuso (lo aggiunge lilOS) |
| alla porta, `ArrayBuffer` o array tipizzato | Ciò che l'utente ha scritto (fino a 64 KB per messaggio, il resto si scarta). Mentre il terminale chiede una riga (la password), i byte vanno alla domanda e non al server |
| alla porta, stringa | `{ t: 'resize', cols, rows }` · `{ t: 'trust', ok: true \| false }` la risposta alla chiave · `{ t: 'signal', name }` uno dei `signals` della sessione · `{ t: 'detach' }` chiude il canale (la sessione resta). Fino a 4096 caratteri |

Un solo canale per sessione: un secondo `attach` chiude il primo con `taken`. Chiudendo il canale (o la pagina) la sessione resta aperta e riparte il conto dei 10 minuti. Se la sessione è già chiusa e nessuna pagina la mostra, sparisce subito.

Eventi: `hosts` (gli host salvati sono cambiati) e `sessions` (una sessione è comparsa, è cambiata o è sparita), anche per colpa di un'altra pagina dello stesso utente. Il sistema li gira da `term.hosts` e `term.sessions` del kernel (`src/net/connect.js`); alla riconnessione al kernel emette `sessions`.

```js
import { term } from '@lilos/sdk';

await term.load();
const s = await term.open({ protocol: 'ssh', values: { host: 'example.com', user: 'ann' } });
const port = term.attach(s.id, { cols: 80, rows: 24 });
port.onmessage = e => {
  if (typeof e.data === 'string') console.log(JSON.parse(e.data));   // state, trust, taken, gone
  else screen.write(new Uint8Array(e.data));                        // per esempio un xterm.js
};
port.postMessage(new TextEncoder().encode('ls\r'));                 // i tasti
port.postMessage(JSON.stringify({ t: 'resize', cols: 120, rows: 40 }));
```

---

## sdk/core/schedule.js e sdk/core/scheduleRules.js

### `schedule`

La pianificazione: operazioni a una data e ora o ripetute, che il **kernel** esegue anche a lilOS chiuso (modulo obbligatorio `scheduler`, vedi [Pianificazione](#pianificazione-schedule-apischedulejs)). Un `Emitter`. Funziona solo **collegato al kernel**: `available` è `kernel.connected`. Le rotte sono quelle di `/api/schedule…`.

| Membro | Descrizione |
| --- | --- |
| `available` | `true` se c'è il kernel. |
| `list({ owner?, app? })` → `[task]` | Le operazioni dell'utente. Un amministratore vede quelle di tutti e quelle del sistema (`owner: '*'`); `owner` e `app` filtrano. |
| `overview()` → `{ admin, tasks }` | Come `list`, in una richiesta sola, con `admin` (l'utente è amministratore). |
| `tasks(options?)` → `[task + recurrence]` | Come `list`, ognuna con `recurrence` (sotto): la regola come la vuole un calendario. |
| `get(id)` → task | `not_found` se non c'è o non è di chi chiede. |
| `create(task)` → task | `task`: `{ name, when, what, enabled?, options?, owner? }`. `owner`: solo gli amministratori, un id utente o `'*'` (il sistema); senza, l'utente che chiede. Emette `change`. |
| `update(id, task)` → task | Sostituisce nome, regola, azione, opzioni e `enabled`; il proprietario non cambia. Se cambia `when` il conto delle volte riparte. Per una richiesta web, un'intestazione segreta senza `value` mantiene quella salvata. Emette `change`. |
| `remove(id)` | Toglie l'operazione e il suo storico. Emette `change`. |
| `enable(id, on)` → task | Accende o mette in pausa. Riaccesa, riparte da adesso: le volte perse in pausa non si recuperano. Emette `change`. |
| `run(id)` → run | La fa partire subito (`reason: 'manual'`), senza toccare le volte pianificate. Non aspetta la fine. |
| `cancel(runId)` → run | Ferma una corsa in corso, in coda o in attesa (`cancelled`). |
| `move(id, { at, to, scope = 'this' })` → task | Sposta **quando**, mai cosa. `at`: una volta della regola (ms); `to`: il nuovo momento (ms, tra il 1970 e l'anno 9999, altrimenti «Orari non validi»). `scope`: `'this'` toglie quella volta e ne mette una a `to` (il conto delle volte resta), `'all'` sposta tutta la regola della differenza. Una regola `cron` si sposta solo con `'this'`. Al massimo 50 orari spostati per regola. Emette `change`. |
| `history({ task?, owner?, state?, limit = 100, before? })` → `[run]` | Le corse, la più nuova per prima. `state`: uno degli stati di una corsa. `before`: ms, solo le precedenti. `limit` da 1 a 500. |
| `occurrences({ from, to, owner?, task? })` → `{ items, series }` | Le volte tra `from` e `to` (ms, al massimo 62 giorni, altrimenti `invalid`): le corse già fatte e quelle ancora da fare (al massimo 5000 voci). Vedi sotto. |
| `catalog()` → `{ services, hosts, users, runtime }` | Ciò che offre l'editor: `services` i servizi delle app installate (`{ app, entry, label, name, glyph, color, params }`), `hosts` gli host SSH salvati nel Terminale (`{ id, name, address }`), `users` gli utenti (`{ id, name, username, role }`, solo per un amministratore), `runtime` se c'è il modulo che fa girare i servizi. |
| `pending()` → `[run]`, `claim(runId)` → `{ task, run }`, `report(runId, outcome)` | Le corse **nel browser**, che il sistema fa per l'utente (vedi sotto). Non servono alle app. |
| `describe(when, lang?)` → testo | La regola in parole («Ogni giorno alle 02:00»), nella lingua del sistema o in `lang`. |
| `recurrence(task, lang?)` → `{ text, rrule, exdate, rdate, tz, start, end, count }` | Per i calendari: `rrule` è una riga RFC 5545 (`FREQ=DAILY;BYHOUR=2;BYMINUTE=0`) o `null` se la regola non ha un RRULE esatto; `exdate` e `rdate` sono le volte (ms) tolte e aggiunte; `tz` il fuso (IANA); `start` la prima volta (`'YYYY-MM-DDTHH:mm'` sull'orologio di `tz`); `end` l'ultimo giorno o `null`; `count` il numero di volte o `null`. |
| `rules` | Il modulo delle regole, sotto. |
| `received(event, data)` | Per il sistema: il flusso del kernel ha detto `schedule.change`, `schedule.run` o `schedule.due`. |
| `forApp(id)` | La copia per un'app: vede e cambia solo le operazioni che ha fatto. Vedi sotto. |

Eventi: `change` `{ ids }` (operazioni create, cambiate, tolte, spostate, accese o spente, anche da un'altra pagina o da un amministratore), `run` `{ task, run, state }` (una corsa è partita, aspetta o è finita), `due` `{ task, run }` (una corsa nel browser da fare adesso: la prende il sistema).

**Forme.**

| Oggetto | Campi |
| --- | --- |
| task | `{ id, owner, app, name, enabled, when, what, options, created, modified, by, fired, next, last, retry, running }`. `owner`: id utente o `'*'`. `app`: l'app che l'ha fatta o `null`. `by`: `{ id, name }` di chi l'ha salvata per ultimo. `fired`: quante volte è partita a orario. `next`: la prossima volta (ms) o `null`. `last`: `{ run, at, state }`. `retry`: `{ at, attempt, due }` se un nuovo tentativo è in attesa. `running`: quante corse sono in corso. In `what` di una richiesta web le intestazioni segrete sono `{ name, secret: true, set }`, mai il valore. |
| `options` | `{ missed: 'once' \| 'skip', overlap: 'skip' \| 'queue' \| 'parallel', timeoutMin, retries, retryMin, notify: 'error' \| 'always' \| 'never', ask }`. Predefiniti: `once`, `skip`, `60` (1-1440), `0` (0-5), `5` (1-1440), `error`, `true`. `ask` vale per le corse nel browser: chiedere prima di farle quando lilOS si apre. |
| run | `{ id, task, owner, app, name, type, due, at, end, reason, attempt, by, state, text, log, expires }`. `reason`: `'time'`, `'catchup'` (una volta persa, recuperata), `'manual'`, `'retry'`. `state`: `'queued'`, `'running'`, `'waiting'` (nel browser, aspetta lilOS aperto), `'ok'`, `'error'`, `'skipped'`, `'cancelled'`. `text`: una riga (500 caratteri); `log`: il resoconto (fino a `outputKb`). |
| item (di `occurrences`) | `{ task, name, at, end, state, run, type, owner, app }`. `state` `'planned'` per una volta ancora da fare (`run` `null`), altrimenti quello della corsa. Le corse a mano non ci sono. |
| series (di `occurrences`) | `{ task, name, from, to, count, every, estimated, type, owner, app }`: una regola più fitta di una volta ogni 30 minuti non dà una voce per volta, ma una serie con la prima e l'ultima volta, il numero e l'intervallo (`every`, ms). Il kernel ne calcola al massimo 2000 per regola e per al massimo circa 250 ms: se non basta, `estimated` è `true`, `to` è la fine dell'intervallo e `count` una stima. |

**Le azioni (`what`)** sono controllate dal kernel prima di salvare: forme e regole in [Pianificazione](#pianificazione-schedule-apischedulejs). Un'app può fare solo `notify`, `service` (dei propri servizi) e `open` (di sé stessa), al massimo 20 e non più spesso di una volta ogni 15 minuti.

**`forApp(id)`.** lilOS la dà alle app con il permesso `schedule`: ogni richiesta porta `app: id`, il kernel mostra e cambia solo le operazioni con quell'`app`, e quelle nuove ne sono marcate. Una per app (`lilos.schedule`, vedi [`window.lilos`](#windowlilos-bridgejs)); riceve `change` e `run` come la copia principale.

```js
import { schedule } from '@lilos/sdk';

const task = await schedule.create({
  name: 'Backup dei documenti',
  when: { every: { n: 1, unit: 'day' }, times: ['02:00'], start: '2026-11-03T02:00', tz: 'Europe/Rome' },
  what: { type: 'command', lines: 'cp -r Documenti Backup', cwd: null, host: null, saveTo: null },
  options: { retries: 2, retryMin: 10 },
});
console.log(schedule.describe(task.when));           // «Ogni giorno alle 02:00»
const { items } = await schedule.occurrences({ from: Date.now(), to: Date.now() + 7 * 86_400_000 });
```

### `schedule.rules` (`scheduleRules.js`)

Le regole che dicono **quando**: controllate, calcolate in un fuso orario, dette in parole e come RRULE di iCalendar. Non importa niente: lo stesso codice gira nella pagina, nel kernel (il modulo `scheduler` lo riceve da `host.rules`) e nelle sandbox delle app. Gli orari sono scritti come su un orologio del fuso della regola (`'YYYY-MM-DDTHH:mm'`); i momenti assoluti sono millisecondi.

Una regola (`when`), sempre con `tz` (nome IANA, `'UTC'` se manca):

| Forma | Significato |
| --- | --- |
| `{ once: '2026-12-15T10:00', tz }` | Una volta. |
| `{ every: { n, unit }, start, tz, … }` | Ripetuta. `unit`: `'minute'` (`n` 1-1440), `'hour'` (1-168), `'day'`, `'week'` (1-366), `'month'` (1-366), `'year'` (1-10). `start`: la prima volta. |
| `{ cron: '55 8 * * 1-5', start, tz }` | Cinque campi: minuto, ora, giorno del mese, mese, giorno della settimana. Nomi (`jan`, `mon`), liste, intervalli, passi, `L` (ultimo giorno), `1#2` (il secondo lunedì), `5L` (l'ultimo venerdì); 0 e 7 sono la domenica. |

Per `every`:

| Campo | Vale per | Significato |
| --- | --- | --- |
| `days` | minuti, ore, settimane | Giorni ISO (1 lunedì … 7 domenica). Per le settimane, di serie il giorno di `start`. |
| `between` | minuti, ore | `['09:00', '18:00']`: conta le volte in ogni giorno dalla prima all'ultima ora, invece che di continuo. |
| `times` | giorni, settimane, mesi, anni | Gli orari (`['08:00', '18:30']`, fino a 48); di serie l'ora di `start`. |
| `monthly` | mesi, anni | `{ day: 1…31 \| -1 }` (-1: l'ultimo giorno) oppure `{ nth: 1…5 \| -1, weekday: 1…7 }`; di serie il giorno di `start`. |
| `month` | anni | 1-12; di serie il mese di `start`. |

Per tutte, in più: `end` (`'YYYY-MM-DD'`, l'ultimo giorno, incluso), `count` (quante volte in tutto, 1-100000), `skip` (momenti tolti, ms) ed `extra` (momenti aggiunti, ms): spostare una volta toglie quella e ne aggiunge un'altra.

**Ora legale.** Un orario che non esiste (le 02:30 quando gli orologi vanno avanti) scatta quando sono andati avanti (le 03:00); uno che c'è due volte (quando tornano indietro) scatta la prima. Gli intervalli di minuti e ore senza `between` contano il tempo vero.

| Funzione | Descrizione |
| --- | --- |
| `checkWhen(raw)` → `when` | La regola come si salva (solo i campi ammessi, controllati). Lancia `RuleError`, con un messaggio per le persone. |
| `nextAfter(when, ms)` → ms \| `null` | La prima volta dopo `ms`. Non considera `count`: lo conta chi chiama. |
| `between(when, from, to, limit = 1000)` → `[ms]` | Le volte in `[from, to)`. |
| `gap(when)` → ms | Il tempo minimo tra due volte (`Infinity` per `once`). Il kernel rifiuta le regole più fitte di `minIntervalMinutes`. |
| `firstTime(when)` → ms \| `null` | La prima volta. |
| `moveWhen(when, { at, to, scope })` → `when` | La regola con una volta spostata (`'this'`) o tutta spostata (`'all'`). Lancia `RuleError` se non si può (una `cron` con `'all'`, un orario che uscirebbe dal giorno o dalla fascia). |
| `toRrule(when)` → `{ rrule, exdate, rdate }` | La regola come parti di iCalendar, da usare con `DTSTART` (la prima volta, `TZID: tz`). `rrule` è `null` per una volta sola e per le regole che un RRULE non dice esattamente: allora le volte vengono una per una. |
| `toCron(when)` → testo \| `null`, `fromCron(testo, base)` → `when` \| `null` | Da e verso la riga cron, per l'editor. |
| `describe(when, lang = 'en')` → testo | La regola in parole, in `'it'` o `'en'`. |
| `validZone(tz)`, `clockAt(ms, tz)`, `instantOf(y, m, d, hh, mm, tz)`, `localText(ms, tz)`, `parseCron(testo)` | Aiuti: fuso valido, l'orologio di un fuso a un istante (`{ y, m, d, hh, mm, ss, wd }`), l'istante di un orario, il testo `'YYYY-MM-DDTHH:mm'` di un istante (`RuleError` se l'anno è fuori da 1970-9999), la riga cron controllata. |
| `RuleError` | L'errore delle regole. |

---

## sdk/core/pipes.js e sdk/core/pipeCatalog.js

Pipe sugli eventi: le operazioni del sistema che altri possono guardare, cambiare o fermare. Decisione: [D47](../interna/decisioni.md#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt). `pipes.js` è il motore; `pipeCatalog.js` dichiara gli eventi del sistema e riesporta `pipes` e `PipeStopped`, che l'SDK esporta da lì (`import { pipes, PipeStopped } from '@lilos/sdk'`), così ogni evento ha il suo catalogo comunque si arrivi.

Un **evento** ha due fasi:

- **`before`**: prima dell'operazione. Un gestore può cambiare la richiesta (solo i campi che l'evento lascia cambiare) o fermarla.
- **`after`**: sul risultato. Può cambiarlo (se l'evento lo permette) o solo guardarlo. Gira **in ordine inverso** rispetto a `before`: chi cambia per primo all'andata cambia per ultimo al ritorno, così due gestori che si sovrappongono (uno comprime, uno cifra) si annidano.

Un gestore si iscrive a un evento e a una fase, chiedendo di essere tra i primi (`'first'`), a metà (`'middle'`, predefinito) o tra gli ultimi (`'last'`). Dentro una fascia conta l'ordine scelto dall'utente (`setOrder`), poi chi è arrivato prima. La catena si fissa quando l'evento parte.

**Il gestore** riceve `(data, ctx)` e restituisce:

| Risposta | Effetto |
| --- | --- |
| niente | i dati proseguono come sono |
| `{ data }` | i dati cambiati: si prendono **solo i campi che l'evento lascia cambiare** in quella fase; se l'evento ha un `check`, lo controlla (se lancia, l'operazione fallisce) |
| `{ stop: { error?, silent? } }` | l'operazione non avviene e fallisce con `error` (fino a 300 caratteri; predefinito «Operazione fermata»). `silent: true`: nessuno va avvisato, il gestore se n'è occupato. Solo per gli eventi con `stop: true`, altrimenti è un errore |

`ctx` è `{ event, stage, position, total, prev, next, caller }`: `position` il posto nella catena (0 il primo) e `total` quanti sono; `prev` e `next` chi sta prima e dopo (`{ app, entry, name }` per un'app, `{ system: true, name }` per lilOS, `null` ai bordi); `caller` chi ha chiesto l'operazione (`{ app, opened }` per un'app installata, con `opened: true` se il file le è stato consegnato; `{ system: true }` per lilOS e le app di sistema; `null` se non si sa).

**Regole che non cambiano.**

- Un gestore che **lancia un errore o non risponde entro 15 secondi** (`timeout` dell'evento) fa fallire l'operazione: non viene mai saltato. Il messaggio è `<nome del gestore>: <errore>`.
- Quello che un gestore fa mentre gestisce un evento non passa di nuovo dai suoi stessi gestori: **le operazioni chieste da un'app saltano i gestori di quella stessa app** (`caller.app`).
- **Limiti**: 50 iscrizioni per app («Al massimo 50 iscrizioni per app»; non valgono per lilOS e le app di sistema); al massimo 256 operazioni che passano dalle pipe in contemporanea («Troppe operazioni in corso») e 32 chieste da una stessa app («Troppe operazioni in corso per questa app»). Sostituiscono il vecchio limite di 16 pipe una dentro l'altra.
- **I contenuti di un'app non li vedono le altre.** Per `file.open`, `file.read` e `file.write` di un file con `node.apps[x].content === true` girano solo i gestori di lilOS e di `x`: gli altri non sono chiamati. In più ogni gestore (non di lilOS) vede su `node` e `source` solo i dati della **propria** app in `apps`, non quelli delle altre.
- Il filtro `where` si controlla in lilOS, senza svegliare il gestore.

### `pipes`

| Membro | Descrizione |
| --- | --- |
| `define(name, def)` | Dichiara un evento. `name`: `/^[a-z0-9][a-z0-9.-]{0,63}\.[a-z][a-zA-Z0-9]{0,40}$/` (`file.open`, `acme.notes.saved`). `def`: `{ label, description?, edit?: { before?: [campo], after?: [campo] }, stop?, protected?, sync?, owner?, check?(data, stage) → data, timeout? }`. `edit` elenca i campi che un gestore può cambiare in ciascuna fase. `stop`: l'evento si può fermare. `protected`: solo lilOS e le app di sistema si iscrivono. `sync`: operazione immediata: `before` è solo per i gestori sincroni di lilOS (`runSync`), gli altri guardano dopo (`notify`). `owner`: l'evento è di un'app e il nome è `<id app>.<una parola>` (la parola: `/^[a-z][a-zA-Z0-9]{0,40}$/`). `timeout`: millisecondi (15000). Ridefinire un evento di un altro proprietario lancia un errore. Emette `change`. |
| `forgetApp(appId)` | Toglie gli eventi di un'app, tutte le sue iscrizioni e quelle delle altre app ai suoi eventi (l'app è stata rimossa). |
| `undefine(name)` | Toglie un evento e chi vi era iscritto (una nuova versione dell'app non lo dichiara più). Emette `change`. |
| `has(name)` | `true` se l'evento esiste. |
| `describe(name)` | La definizione senza le funzioni (`{ name, label, description, edit, stop, protected, sync, owner, timeout }`), o `null`. |
| `catalog()` | Tutti gli eventi, in ordine di nome. |
| `subscribe(name, { stage = 'after', position = 'middle', where = null }, handler, owner = {})` → `off` | Iscrive un gestore. `owner`: `{ key, app?, entry?, name, trusted?, sync? }`; `key` è il nome stabile del gestore (serve all'ordine dell'utente: `'filecrypt#vault'`, `'lilos:content'`), `name` quello che si mostra, `trusted` lilOS o un'app di sistema (può iscriversi agli eventi protetti e dare una funzione come `where`), `sync` il gestore risponde subito (serve per `before` di un evento `sync`, solo `trusted`). Lancia un errore per un evento sconosciuto, una fase o fascia non valida, un evento protetto senza `trusted`, un `before` di un evento `sync` senza `trusted` e `sync`, e più di 50 iscrizioni di una stessa app non `trusted`. |
| `chain(name, stage)` | La catena nell'ordine in cui gira `before` (per `after` si legge al contrario): `[{ key, app, entry, name, position, where }]`; `where` è `'lilOS'` se è una funzione. |
| `setOrder(name, stage, keys)` | Imposta l'ordine dell'utente dentro le fasce: elenco di `key` di `chain()` (al massimo 100); `null` torna all'ordine di arrivo. Salva in `pipes-order` ([Dati salvati](#pipes-order)) e emette `change`. |
| `isCustomOrder(name, stage)` | `true` se l'utente ha scelto un ordine. |
| `wants(name, data, caller?)` | `true` se qualche gestore di una delle due fasi sarebbe chiamato per questi dati. Lo usa `fs` per non perdere tempo quando nessuno ascolta. |
| `around(name, data, op, { caller? })` | `Promise`: catena `before` su `data`, poi `op(data)` → risultato, poi catena `after` (inversa) sul risultato. Lancia `PipeStopped` se un gestore ferma, `Error` se ne fallisce uno. |
| `run(name, data, options?)` | Un evento senza operazione propria (di un'app): i dati dopo le due catene. |
| `runSync(name, data, { caller? })` | La fase `before` di un evento immediato: solo gestori sincroni di lilOS. Restituisce i dati; lancia `PipeStopped` se uno ferma, un errore se uno risponde con una Promise. |
| `notify(name, data, { caller? })` | La fase `after` per guardare: nessuno aspetta i gestori, ognuno riceve una **copia** dei dati (`structuredClone`) e ciò che restituisce o lancia non cambia nulla (un errore finisce in console). |

Evento `change` (senza dati): è cambiato il catalogo, un'iscrizione o l'ordine.

**`where`** filtra i dati per cui il gestore è chiamato (un oggetto; solo lilOS può dare anche una funzione `(data) → boolean`):

| Chiave | Significato |
| --- | --- |
| `meta: 'own'` | solo i file che l'app del gestore ha segnato (`node.apps[app]`) |
| `ext: ['txt']` | solo file con queste estensioni (minuscole; `''` = senza estensione) |
| `type: 'file' \| 'folder' \| 'app'` | solo nodi di questo tipo |
| `app: ['editor']` | solo `app.launch` di queste app (confronta `data.id`) |

### `class PipeStopped extends Error`

`new PipeStopped(message?, { silent = false })`: l'errore di un'operazione fermata da un gestore. `name` `'PipeStopped'`, `silent` come nella risposta del gestore. Chi avvia un'operazione che passa dalle pipe lo distingue dagli altri errori (`openFile` e il launcher non mostrano l'avviso se è `silent`).

### Gli eventi del sistema (`pipeCatalog.js`)

**Aperti alle app in modifica** (prima e dopo; tutti fermabili):

| Evento | Dati | Cosa cambia un gestore |
| --- | --- | --- |
| `file.open` | `{ node, app }` | `before`: `app`, l'id dell'app che lo apre (`null`: la finestra «Apri con») |
| `file.read` | `before` `{ node }`; `after` `{ node, content }` | `after`: `content`, un `Blob` (o un testo, che diventa `Blob`) |
| `file.write` | `before` `{ node, content }`; `after` `{ node }` | `before`: `content` |
| `app.launch` | `{ id, entry, args }` | `before`: `args` |

**Aperti alle app solo per guardare** (`after`; la fase `before` è dei gestori sincroni di lilOS, che possono fermarli):

`file.create` `{ node }` · `file.rename` `{ node, from }` · `file.move` `{ node, from }` · `file.copy` `{ node, source }` · `file.remove` `{ node, ids }` · `trash.put` `{ ids }` · `trash.restore` `{ ids }` · `trash.purge` `{ count, ids }` · `tags.assign` `{ node, tags }` · `window.open` / `window.close` `{ app, entry, title }` · `workspace.switch` `{ from, to }` · `settings.change` `{ key, value }` · `desk.place` `{ workspace, reason, items }`.

`desk.place` dice che delle icone della scrivania hanno cambiato posto: `reason` è `'drag'` (l'utente le ha trascinate), `'arrange'` (Riordina icone) o `'place'` (le ha messe `Desktop.place`, per esempio un'automazione); `items` è `[{ node, x, y, from: { x, y } }]`, solo per i nodi del file system che si sono mossi davvero (non gli elementi fissi né le icone delle workarea); `workspace` è il workspace della scrivania. Lo manda `Desktop` con `pipes.notify`. `trash.purge` ha `ids` (gli id eliminati dal Cestino) oltre a `count`.

**Protetti** (solo lilOS e le app di sistema; solo per guardare): `system.ready` `{ at }` · `session.login` `{ user, workspace }` · `session.logout` `{}` · `apps.install` `{ id, version }` · `apps.update` `{ id, version, from }` · `apps.remove` `{ id }` · `permissions.change` `{ id, granted }` · `settings.system` `{ isolated }` (solo il modo in cui girano le app) · `pipes.change` `{}`.

I contenuti viaggiano come `Blob`. Gli eventi sugli utenti (`users.*`) non ci sono: il frontend non ha operazioni sugli utenti.

**Esempio** (nel sistema o in un'app di sistema; un'app installata usa `lilos.pipes.subscribe`):

```js
import { pipes } from '@lilos/sdk';

// Non lascia aprire i file che iniziano con un punto
const off = pipes.subscribe('file.open', { stage: 'before', position: 'first' },
  ({ node }) => (node.name.startsWith('.') ? { stop: { error: 'Questo file non si apre' } } : undefined),
  { key: 'acme:nodot', name: 'Acme' });

// Ogni salvataggio dei .txt passa da una funzione che cambia il contenuto
pipes.subscribe('file.write', { stage: 'before', where: { ext: ['txt'] } },
  async ({ content }) => ({ data: { content: new Blob([(await content.text()).trim()]) } }),
  { key: 'acme:trim', name: 'Acme' });
```

---

## sdk/core/automation.js

Le automazioni: ciò che l'utente fa, registrato come passi che si possono rifare (app **Automata**, [D64](../interna/decisioni.md#d64-le-automazioni-operazioni-con-un-senso-dichiarate-dalle-app)). Non sono clic e tasti ma operazioni con un senso: ogni passo è un'*azione* con i suoi parametri. Per un'app vedi la ricetta [Rendere registrabile un'azione della tua app](ricette.md#rendere-registrabile-unazione-della-tua-app); la parte di sistema (registratore, esecuzione, file `.automata`) è in [automation/](#automation-le-automazioni-nel-sistema).

### `automation`

Istanza di una classe che estende `Emitter`. Non fa niente finché nessuno registra.

**Il catalogo delle azioni**

| Membro | Descrizione |
| --- | --- |
| `define(id, def)` | Dichiara un'azione. `id`: `<prefisso>.<parola>` (`/^[a-z0-9][a-z0-9.-]{0,63}\.[a-zA-Z][a-zA-Z0-9]{0,40}$/`, per esempio `photo.resize`); altrimenti lancia `Azione non valida`. Emette `actions`. Vedi sotto per `def`. |
| `undefine(id)` | Toglie un'azione. |
| `forgetApp(appId)` | Toglie tutte le azioni di quell'app (rimossa, o aggiornata e dichiarata di nuovo). |
| `describe(id)` | Copia della definizione (senza `run`), o `null`. |
| `actions()` | `describe` di ogni azione. |
| `runner(id)` | La funzione `run` di un'azione di lilOS, o `null`. La usa l'esecuzione. |
| `askable` | I tipi di parametro che si possono chiedere quando il passo gira: `text`, `number`, `boolean`, `choice`, `file`, `files`, `folder`, `secret`. |
| `cleanValue(param, valore)` | Il valore se è adatto al tipo del parametro, altrimenti `undefined`. |

`def`:

| Campo | Significato |
| --- | --- |
| `label` | Fino a 80 caratteri. Predefinito `id`. |
| `description?` | Fino a 300 caratteri. |
| `app?` | L'id dell'app che ha l'azione; `null` per quelle di lilOS. |
| `entry?` | Il punto d'ingresso dell'app che rifà l'azione. |
| `target?` | `'window'`: la rifà una finestra dell'app (`handle`). Altrimenti `'none'`. |
| `result?` | `'file'`: l'azione crea un file (il suo id va in `result` di `record`). |
| `confirm?` | `true`: di serie il passo chiede conferma prima di girare. |
| `params?` | `{ nome: parametro }`, al massimo 20. Un nome non valido (`/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/`, ma non `__proto__`, `constructor`, `prototype`) o un parametro non valido si scarta senza avviso. |
| `run?(params, ctx)` | Solo per le azioni di lilOS: rifà l'azione e restituisce l'id (o gli id) di ciò che ha fatto. |

Un parametro: `{ type, label, description?, subject?, min?, max?, maxLength?, options? }`. `label` fino a 60 caratteri, `description` fino a 200. `subject: true` segna il parametro con ciò su cui lavora il passo. `min` e `max` solo per `number`, `maxLength` solo per `text`, `options` (`[{ value, label }]`, fino a 50, `value` testo o numero) per `choice`.

| Tipo | Valore | Note |
| --- | --- | --- |
| `text` | stringa, fino a `maxLength` (4000) | |
| `number` | numero finito | |
| `boolean` | `true` o `false` | |
| `choice` | uno dei `value` di `options` | |
| `file`, `folder` | id di un nodo | |
| `files` | lista di id (fino a 200); una stringa diventa una lista | |
| `secret` | mai conservato | `record` lo scarta: si chiede sempre quando il passo gira |
| `value`, `tags`, `places` | JSON qualsiasi (fino a 64 KB) | Solo per le azioni di lilOS: un manifesto non li accetta |

**Registrare**

| Membro | Descrizione |
| --- | --- |
| `recording`, `paused` | Se si registra; se è in pausa. |
| `quietNow` | `true` mentre non si deve registrare (si rifanno passi, si annulla). |
| `start()` | Comincia (cancella i passi di prima). Emette `change`. |
| `pause(on = true)` | Mette in pausa o riprende (`false`). Non fa niente se non si registra. |
| `stop()` | Finisce e restituisce i passi (senza quelli ritirati o mancati). Emette `change`. |
| `steps()` | Copia di tutti i passi finora, anche quelli ritirati. |
| `record(id, { params = {}, defaults = null, file = null, result = null })` | Dice che l'utente ha fatto l'azione. Restituisce il `token` del passo, o `null` se non si registra (nessuno registra, pausa, `quiet`), l'azione non è nota (c'è un avviso in console) o i passi sono già 500. |
| `missed(app, label)` | Dice che l'utente ha fatto qualcosa che l'app non sa registrare: il registratore lo mostra barrato e non entra nell'automazione. La stessa cosa di seguito si dice una volta sola. `label` fino a 80 caratteri. |
| `retract(tokens, reason = 'undo')` | Ritira dei passi (restano in `steps()` con `retracted`). Restituisce i token ritirati. Emette `retract`. |
| `restore(tokens)` | Rimette i passi ritirati per `'undo'` (non quelli ritirati perché fusi). Emette `restore`. |
| `stepsBetween(da, a)` | I token dei passi non ritirati registrati tra due istanti (`Date.now()`). Lo usa `UndoStack`. |
| `quiet(fn)` | `Promise`: esegue `fn()` senza registrare quello che succede. Il silenzio dura fino a un attimo dopo la fine di `fn` (un timer da 0 ms), perché gli eventi di ciò che `fn` ha avviato arrivano subito dopo, nello stesso giro. |

Un passo registrato:

```js
{ token, at, action, app, params, defaults?, changed, file, result }
// token: numero progressivo · at: Date.now() · params: solo i valori validi per i tipi
// defaults: i valori proposti (presente solo se `record` li ha ricevuti)
// changed: i nomi dei parametri che l'utente ha cambiato
// file: il file su cui lavora la finestra (azioni con target 'window'), o null
// result: l'id (o la lista) di ciò che l'azione ha fatto, o null
// ritirato: aggiunge retracted: 'undo' | 'merged'
// mancato (missed): { token, at, action: null, app, missed: 'etichetta', params: {}, changed: [] }
```

- **Cosa è «cambiato»** (`changed`): con `defaults`, i parametri il cui valore è diverso da quello proposto (e per cui c'era un valore proposto). Senza `defaults`, tutti i parametri tranne quelli `subject` e i `secret`. Un `secret` non è mai cambiato. Automata mostra per primi i campi cambiati e li chiede per primi.
- **Fusione.** Se `result` ha degli id e nei 5 secondi prima c'è un passo `lilos.create` o `lilos.copy` che ha fatto lo stesso nodo (il file che l'app ha appena salvato), quel passo viene ritirato (`retracted: 'merged'`): resta quello dell'app.
- **Annulla.** Mentre si registra, `UndoStack.undo()` ritira i passi registrati nel momento della sua voce (tra l'inizio dell'azione e 250 ms dopo la sua registrazione) e fa girare l'annullamento in `quiet`; `redo()` li rimette. Vedi [history.js](#sdkcorehistoryjs).

**Rifare**

| Membro | Descrizione |
| --- | --- |
| `handle(id, fn, { window = null, file = null, app = null })` | Una finestra dice che sa fare l'azione. `fn(params, { file })` (anche asincrona) restituisce l'id (o gli id) di ciò che ha fatto, o niente. `file`: l'id del file che la finestra mostra, o una funzione che lo restituisce (cambia). `window`: quando si chiude (`destroy`), il gestore si toglie un attimo dopo. `app` predefinito: quello dell'azione, o la parte dell'id prima dell'ultimo punto. Restituisce `off()`. Emette `handlers`. |
| `handlerFor(id, file = null)` | Con `file`, il gestore della finestra che lo mostra; senza, l'ultimo registrato; `null` se non c'è. |
| `windowFor(app, file)` | La finestra dell'app che mostra quel file (dai gestori registrati), o `null`. |
| `fileOfWindow(finestra)` | Il file che una finestra ha detto di mostrare, o `null`. |
| `waitForHandler(id, file = null, timeout = 90000)` | `Promise` del gestore, appena una finestra può fare l'azione (controlla ogni 200 ms e a ogni `handlers`). Rifiuta con `L’app non ha aperto il file in tempo`. |

Come si rifà un passo ([automation/ → Esecuzione](#esecuzione-runnerjs)): le azioni di lilOS con la loro `run`; le azioni con `target: 'window'` con il gestore della finestra che mostra il file del passo (se non c'è, l'app viene aperta con quel file e si aspetta il gestore); le azioni con `entry` chiamando il punto d'ingresso dell'app.

**Eventi**

| Evento | Dati | Quando |
| --- | --- | --- |
| `change` | `{ recording, paused }` | Comincia, pausa o fine della registrazione |
| `step` | il passo | Un passo registrato (anche uno mancato) |
| `retract` | `{ tokens, reason }` | Passi ritirati |
| `restore` | `{ tokens }` | Passi rimessi |
| `actions` | — | Il catalogo è cambiato |
| `handlers` | `{ id, app }` | Una finestra può fare un'azione |

```js
import { automation } from '@lilos/sdk';

automation.define('acme.resize', {
  label: 'Resize', app: 'acme', target: 'window',
  params: { width: { type: 'number', label: 'Width', min: 1 } },
});

// Dopo che l'utente ha ridimensionato: dire cosa ha fatto
automation.record('acme.resize', { params: { width: 800 }, defaults: { width: 1600 }, file: imageId });

// La finestra che mostra l'immagine sa rifarlo
const off = automation.handle('acme.resize', ({ width }) => resizeTo(width), { window: win, file: () => imageId });
```

---

## sdk/core/tags.js

### `tags`

Tag che si mettono su file e cartelle (`fs.setTags`) per ritrovarli ovunque siano (`fs.tagged`). Le definizioni stanno qui, sono uguali in tutti i workspace (i file condivisi sono visti da tutti) e sono salvate in `lilos:tags`.

```js
{ id, name, color, visible }   // color: '#rrggbb'
```

- I nomi sono unici senza distinguere maiuscole e minuscole, spazi ripuliti, al massimo 30 caratteri. Al massimo 100 tag.
- Un tag **invisibile** (`visible: false`) nasconde gli elementi che lo hanno, ovunque: `tags` lo comunica a `fs.setHiddenTags` all'avvio e a ogni cambio. Gli elementi si ritrovano con `fs.tagged` (nel File Manager, la vista del tag).
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
| `push({ label = '', undo, redo }, since = null)` | Registra un'azione già fatta. `since`: l'istante in cui è cominciata (`Date.now()`); senza, la voce vale dal momento appena prima di `push` (50 ms) e `run` lo dà da sé. Serve alle [automazioni](#sdkcoreautomationjs): vedi sotto. `undo` e `redo` sono funzioni, anche asincrone; se manca una delle due lancia un errore. Svuota ciò che si poteva ripetere. Emette `change`. |
| `run({ label, do, undo })` | `Promise`: esegue `do()`, poi registra la voce (`redo` è `do`) e restituisce ciò che `do()` ha restituito. Se `do()` lancia, non registra nulla. |
| `undo()`, `redo()` | `Promise<string \| null>`: disfa / rifà l'ultima voce e restituisce la sua etichetta; `null` se non c'era nulla, se un altro passo è in corso o se la voce ha lanciato un errore. |
| `canUndo`, `canRedo` | `true` se c'è qualcosa da fare e nessun passo è in corso. |
| `undoLabel`, `redoLabel` | Etichetta della prossima voce da annullare / ripetere (`''` se non c'è). |
| `limit` | Numero massimo di voci. |
| `clear()` | Svuota tutto. Emette `change`. |

Se `undo` o `redo` lancia un errore (per esempio l'elemento non esiste più), la voce viene **tolta** dalla cronologia (non resta bloccata) ed emette `error`. Un solo passo alla volta: finché uno è in corso, `undo()` e `redo()` rispondono `null`.

Eventi: `change` (dopo ogni `push`, `undo`, `redo`, `clear`) · `error` `{ entry, error }`.

**Con una registrazione in corso** ([automation](#sdkcoreautomationjs)) `undo()` ritira i passi registrati mentre quella voce veniva fatta (da `since` fino a 250 ms dopo il `push`) e fa girare l'annullamento senza registrarlo; `redo()` li rimette. Senza registrazione non cambia niente.

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
- `fileTypeList()` → `[{ label, color, exts }]`: tutti i gruppi di tipi conosciuti (copie). Tra questi `term` (`Collegamento terminale`, `#2b3038`), i collegamenti di Terminale.

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

`new Desktop(canvas, folderId, layoutKey = 'desktop-layout')`: la scrivania come vista della cartella `folderId` del file system (la Scrivania del workspace attuale). Un `DesktopItem` per ogni nodo; posizioni da `lilos:<layoutKey>` (il sistema passa `ws:<id>:desktop-layout`), oppure il primo posto libero in colonna. Segue gli eventi `change` di `fs`, quindi mostra anche le modifiche fatte altrove (File Manager). In più monta gli **elementi fissi** accesi ([desktop/fixedItems.js](#desktopfixeditemsjs)): prima gli elementi con una posizione salvata, poi i fissi, poi gli altri, così chi non ha posizione prende i posti liberi. Ogni elemento fisso ha `item.fixed` (la voce di `FIXED_ITEMS`), non è un nodo del file system e si salva sotto `fixed:<key>`; la posizione resta salvata anche mentre è spento. `syncFixed()` toglie i fissi spenti nel workspace attuale e monta quelli riaccesi: lo chiamano `Workspaces` (all'avvio, perché la scrivania è stata riempita prima che i workspace ci fossero, e a ogni `setHiddenFixed` che tocca l'attuale) e il cambio dell'impostazione `deskHidden`.

**Proprietà**

| Nome | Descrizione |
| --- | --- |
| `items` | `Map<id, DesktopItem>` |
| `selection` | `Set<DesktopItem>` |
| `folder` | Id della cartella mostrata. |
| `keyboard` | `true` se le scorciatoie del desktop sono attive. `system.js` lo mette a `false` quando una finestra ha il focus. |
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
| `open(item)` | Un'icona di workarea (`item.workarea`) riapre la workarea (`workareas.expand`). Un elemento fisso (`item.fixed`) chiama `openFixed`. Un'app chiama `launch(data.app)`; cartelle e file emettono `item:open` con il nodo del file system. |
| `create(type, at)` | Crea (tramite `fs`) una cartella (`'folder'`) o un file di testo (`'file'`) centrato sul punto del mondo `at`, lo seleziona e avvia la rinomina. |
| `rename(item)` | Rinomina dentro l'etichetta, poi `fs.rename` (che rende il nome unico); per un'icona di workarea, `workareas.rename`; un elemento fisso non si rinomina (ritorna subito). Restituisce una Promise. |
| `remove(items)` | Elimina con `confirmRemove` (nel cestino, annullabile con `history`): chiede conferma se `deleteConfirm` è attivo. Le icone di workarea passano da `workareas.confirmRemove` (chiede sempre; il contenuto resta sulla scrivania). Con file e workarea insieme un solo menu chiede per tutto. Gli elementi fissi vengono scartati: se resta solo quelli, manda una notifica («… è un elemento fisso della scrivania: non si può eliminare») e non fa altro. |
| `arrange()` | Ordina (elementi fissi nell'ordine di `FIXED_ITEMS`, poi cartelle, file, app, poi per nome) e dispone in colonne. Con una workarea attuale, solo i suoi elementi e dentro la sua area (sotto la barra del titolo). Altrimenti gli elementi fuori da ogni workarea, nella parte visibile, saltando i posti coperti dalle aree. Manda `desk.place` con `reason: 'arrange'`. |
| `place(lista)` | Mette delle icone dove si dice: `[{ id, x, y }]`; gli id che non sono sulla scrivania e le coordinate non numeriche si saltano. Salva, aggiorna le workarea se serve, registra un passo della cronologia («Sposta «nome»» o «Sposta N elementi») e manda `desk.place` con `reason: 'place'`. Restituisce quante ne ha messe. Lo usa l'azione `lilos.place`. |
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

Il canvas è una `dropZone` (`folder: () => this.folder`, nessun evidenziamento): nodi rilasciati da un'altra vista vanno nella cartella della scrivania e si dispongono in colonne (`ROWS`) dal punto di rilascio, allineato alla griglia. Il menu di un elemento ha **Aggiungi ai collegamenti** (`linkEntry`). Gli elementi fissi non entrano mai tra gli `ids` trascinati nei nodi, e il loro menu (da soli) ha solo **Apri**, **Togli dalla scrivania** (`setFixedShown(key, false)`, solo nel workspace attuale, con una notifica che dice dove rimetterlo) ed **Elementi fissi della scrivania…** (apre `launch('settings', { tab: 'workspaces', subtab: 'current' })`); in una selezione mista il menu omette tag e collegamenti per loro e **Elimina** agisce sugli altri (disabilitato se sono tutti fissi).

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
  type: 'folder' | 'file' | 'app' | 'trash',   // 'trash' solo per l'elemento fisso Cestino
  name: string,
  x: number, y: number,   // coordinate mondo
  color?: string,         // solo cartelle: colore dell'icona
  app?: string,           // solo app: id nel registro
  tags?: string[],        // id dei tag: i pallini in basso a destra dell'icona
  fixed?: string,         // solo elementi fissi: la chiave (es. 'home')
  glyph?: string,         // solo cartelle fisse: simbolo SDK sull'icona (vedi placeIcon)
  full?: boolean,         // solo Cestino: true se contiene elementi
}
```

DOM: `div.ditem[data-kind="item"][data-id]` con `.ditem-glyph` e `.ditem-label`. Gli elementi che sono nodi del file system sono marcati con `markItem` (`data-node`), quindi una cartella sulla scrivania accetta rilasci; le icone delle workarea (`type: 'workarea'`) e gli elementi fissi (`data.fixed`) non sono marcate da `DesktopItem`: i fissi si marcano da soli con `acceptDrops`.

| Membro | Descrizione |
| --- | --- |
| `data` | Il nodo del file system con la posizione; viene modificato da `moveTo` e `setData`. |
| `el`, `glyph`, `label` | Elementi DOM. |
| `id` | `data.id` |
| `editing` | `true` durante la rinomina. |
| `moveTo(x, y)` | Sposta e aggiorna `data`. |
| `setSelected(bool)` | Aspetto selezionato. |
| `setData({ name, color, tags, apps, modified, size })` | Aggiorna nome, colore, tag, segni delle app, data e dimensione (la miniatura dipende dal contenuto), etichetta e icona (l'estensione può cambiare l'icona; i pallini dei tag si ridisegnano con `tagDots`, classe `ditem-tags`). |
| `editName()` | Rinomina dentro l'etichetta. La Promise restituisce il nuovo nome (senza spazi in eccesso) o `null` se annullata o invariata. **Non** cambia il nome: lo fa chi chiama (il `Desktop`, con `fs.rename`). |

`DesktopItem` non salva e non conosce il canvas: è il `Desktop` che lo aggiunge, lo collega agli eventi e lo salva.

---

## desktop/itemIcons.js

- `FOLDER_COLOR`: colore predefinito delle cartelle, `#6f9bff`.
- `folderIcon(color?, glyph?)`, `fileIcon(name)`: icone SVG, nello stesso stile di `appIcon` (forme piatte a spigoli vivi, dettagli ritagliati): la cartella ha linguetta e corpo di un solo colore separati da un taglio, con `glyph` ritagliato nel corpo; il file è un foglio chiaro con l'angolo piegato staccato e una fascia del colore del tipo con l'estensione ritagliata. Le parti ritagliate usano `<mask>` con id unici nella pagina.
- `workareaIcon()`: icona di una workarea ridotta (cornice tratteggiata con due piccole finestre).
- `placeIcon(glyph, color?)`: un luogo della scrivania (Home, Documenti…): la cartella con il simbolo SDK `glyph` ritagliato (`folderIcon(color, glyph)`).
- `trashIcon(full = false)`: il cestino; con `full` ha della carta che esce.
- `itemBadges(data)` → `[{ glyph, label, color }]`: i segni che le app installate mettono sull'icona di un nodo, uno per ogni app che ha dati sul nodo (`data.apps`) e dichiara `contributes.badge` (il simbolo, il testo, il colore dell'app). Se l'app non c'è più e i suoi dati hanno `content: true`, un lucchetto grigio con «Serve l'app `<id>`».
- `itemIcon(data, { preview = 0 } = {})`: l'icona giusta per qualsiasi nodo del file system, con i segni di `itemBadges` in un angolo (`.icon-badged`; il testo nel `title` e `aria-label`) (usata anche dal File Manager) e, con `data.type === 'workarea'`, per le icone delle workarea. Con `type: 'trash'` dà `trashIcon(data.full)`; una cartella con `data.glyph` dà `placeIcon(data.glyph, data.color)`. Con `preview > 0` e un file (`type` non `folder`, non `fixed`) l'icona di base è `thumbnailIcon(data, { size: preview, fallback: fileIcon(data.name) })` ([apps/thumbnails.js](#miniature-dei-file-thumbnailsjs)): la miniatura dell'app, quando c'è, al posto dell'icona; `preview` è il lato lungo in pixel CSS. I segni delle app restano sopra. Cartelle, app, workarea e cestino ignorano `preview`.

---

## desktop/wallpaper.js

L'immagine di sfondo della scrivania, impostazione `wallpaper` (id della copia dell'immagine nella cartella Sistema, `''` per nessuna). Ha uno strato suo, `.canvas-wallpaper`, il primo figlio del canvas (dietro il mondo): è alta esattamente quanto la scrivania, con le sue proporzioni (`background: center / auto 100%`: mai stirata, mai tagliata sopra o sotto; più larga dello schermo, si taglia ugualmente ai due lati) e non segue pan e zoom. Il colore `deskColor` si vede ai lati di un'immagine più stretta dello schermo e sotto le immagini trasparenti. Con un'immagine il canvas ha la classe `has-wallpaper` (`canvas.css`), che mette etichette chiare con ombra forte (`--on-canvas`, `--on-canvas-hover`, `--on-canvas-shadow`).

- `WALLPAPER_EXTS`: `['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg']`.
- `wallpaper`: `Emitter`; evento `'change'` con `{ id, name }` o `null`, quando la nuova immagine è sullo schermo.
- `isWallpaperImage(node)`: `true` per un file (`type: 'file'`) con una di quelle estensioni (senza distinguere maiuscole).
- `wallpaperInfo()`: `{ id, name }` dell'immagine sullo schermo, o `null`.
- `setWallpaper(id)` → `Promise<boolean>`: copia il file nella cartella Sistema (`fs.copy`; se è già lì non copia), legge la copia (`fs.readBlob`, con `caller: { system: true }`), controlla che si decodifichi come immagine, la mostra, salva `wallpaper` con l'id della copia ed elimina per sempre (`fs.remove`) la copia di prima. Se `fs` ha numerato il nome perché in Sistema ce n'era uno uguale, la copia riprende il nome dell'originale dopo l'eliminazione della precedente. `true` se è sullo schermo. `false`, con una notifica di errore, se il nodo non c'è o non è un'immagine per estensione, se non si copia, o se non si decodifica (in questo ultimo caso la copia appena fatta viene eliminata e l'impostazione resta com'era).
- `clearWallpaper()`: mette `wallpaper` a `''` ed elimina per sempre la copia in Sistema (mai un file fuori da Sistema, mai uno `system`). La copia si elimina anche quando `wallpaper` torna `''` per altre vie («Ripristina» in Archiviazione, un'altra scheda).
- `preloadWallpaper()` e `connectWallpaper(canvas)` sono interni (non esportati da `@lilos/system`). `system.js` chiama la prima **prima** di `setupWorkspaces`, quando `fs` mostra ancora tutte le scrivanie: così un'immagine nella Scrivania privata di un workspace è lo sfondo anche negli altri (dopo, `fs` mostra solo quella del workspace attuale). Se `wallpaper` è l'id di un file che non sta in Sistema (salvato da lilOS 1.9.0–1.9.3), `preloadWallpaper` lo copia in Sistema (l'originale resta dov'è) e, a immagine mostrata, `wallpaper` e `wallpaperInfo()` passano alla copia (esce `change`). La seconda crea lo strato e lo tiene allineato.

Lo sfondo è una copia nel file system, non un riferimento all'originale ([D58](../interna/decisioni.md#d58-lo-sfondo-è-una-copia-nella-cartella-sistema)). L'immagine mostrata è un object URL (`blob:`): in CSS non arriva niente che venga dallo storage. La copia si segue così:

| Cosa succede al file | Effetto |
| --- | --- |
| Eliminata (anche nel cestino: evento `remove`) | `clearWallpaper()`; ripristinarla non lo rimette. Eliminare o modificare l'originale non cambia niente |
| Rinominato con un'estensione non immagine | `clearWallpaper()` |
| Rinominato con un'estensione immagine | Cambia il nome in `wallpaperInfo()` ed esce `change` |
| Contenuto cambiato (`modified` o `size` diversi in un `update`) | Riletto |
| Mancante o non immagine all'avvio | Dimenticato (`wallpaper` torna `''`) |
| Non si apre come immagine all'avvio | Nessuno sfondo, avviso in console; l'impostazione resta |

Se `wallpaper` cambia da fuori (un'altra scheda del browser), l'immagine viene mostrata se è un'immagine leggibile da qui. Il menu del tasto destro di `Desktop` ha **Usa come sfondo desktop** per un solo file immagine (non per più elementi).

Pannello di controllo 1.13.1 ha Scrivania → Sfondo (Colore e Immagine; «Scegli…» apre il selettore di file con le sole immagini e passa da `setWallpaper`, quindi copia); la scheda compare solo se `system.setWallpaper` esiste. «Ripristina» in Archiviazione riporta `deskColor` e `wallpaper` ai predefiniti.

## desktop/fixedItems.js

Gli elementi fissi: su ogni scrivania (di ogni workspace) ci sono quelli accesi (tutti, all'inizio), non sono file, non si rinominano né si eliminano. Si aprono e si spostano come gli altri e la posizione si salva nelle posizioni della scrivania sotto `fixed:<key>`. Li monta `Desktop`.

- `FIXED_ITEMS`: elenco congelato, in quest'ordine. Ogni voce ha `key`, `name`, `kind`, `glyph`, `description` e, per le app, `app`.

  | `key` | `name` | `kind` | Cosa apre |
  | --- | --- | --- | --- |
  | `home` | Home | `home` | La cartella principale (`fs.root`) |
  | `documents` | Documenti | `folder` | La cartella di sistema omonima |
  | `images` | Immagini | `folder` | La cartella di sistema omonima |
  | `files` | File Manager | `app` (`app: 'files'`) | L'app File Manager |
  | `downloads` | Download | `folder` | La cartella di sistema omonima |
  | `trash` | Cestino | `trash` | Il cestino nel File Manager |

- `fixedId(key)`: l'id sulla scrivania, `'fixed:' + key`. `fixedOf(id)`: la voce di `FIXED_ITEMS`, o `null` per qualsiasi altro id. `fixedRank(id)`: la posizione nell'elenco (`-1` se non è un elemento fisso); la usa `arrange()`.
- Accesi e spenti sono **per workspace**: ogni workspace tiene le chiavi spente sulla sua scrivania nel campo `hidden` (vedi [`lilos:workspaces`](#lilosworkspaces)); l'impostazione `deskHidden` tiene quelle di «tutti», che valgono per i workspace con `hidden: null` (i nuovi e quelli salvati prima). Chiavi sconosciute ignorate; un valore salvato che non è un array vale come nessuna chiave.
  - `isFixedShown(key, workspace?)`: `true` se l'elemento è acceso sulla scrivania del workspace (l'attuale se manca).
  - `setFixedShown(key, shown, workspace?)`: lo accende o lo spegne in quel workspace (l'attuale se manca), con `Workspaces.setHiddenFixed`.
  - `setFixedShownEverywhere(key, shown)`: lo accende o lo spegne in tutti i workspace vivi e in `deskHidden`, quindi anche nei workspace creati dopo.
  - Prima che i workspace esistano (all'avvio, mentre la scrivania si riempie) vale `deskHidden`, e `setFixedShown` cambia quello.
- `fixedFolder(item)`: l'id della cartella che la voce apre (`fs.root` per `home`; per `folder` la cartella di sistema non privata con quel nome nella radice, esclusa la Scrivania), o `null` per app, cestino e cartella non trovata.
- `openFixed(item)`: un'app si avvia; il cestino fa `launch('files', { trash: true })`; una cartella fa `launch('files', { folder })`. Se la cartella non c'è, notifica «La cartella … non c’è più».
- `fixedData(item)`: i dati per `DesktopItem` (`{ id, name, fixed, type, … }`): `type: 'app'` con `app`, `type: 'trash'` con `full: fs.trashed().length > 0`, altrimenti `type: 'folder'` con `glyph`. `x` e `y` li dà il `Desktop`.
- `acceptDrops(el, item)`: rende l'elemento un bersaglio di rilascio. Home e cartelle si marcano con `markItem` (file e cartelle si spostano lì, annullabile). Il cestino è una `dropZone` che accetta i nodi esistenti non di sistema, li manda a `removeNodes(stack, ids)` (annullabile con Ctrl Z) e manda una notifica. L'app File Manager non accetta nulla.

`Desktop` ridisegna il Cestino (`full`) a ogni evento `trash` di `fs`. Il sistema espone `FIXED_ITEMS` come `DESK_FIXED_ITEMS` (vedi [systemApi.js](#systemapijs-lilossystem)), con `isFixedShown`, `setFixedShown` e `setFixedShownEverywhere`. Pannello di controllo (1.5.0) li usa in Workspace: la sezione «Elementi fissi» delle schede di ogni workspace (un interruttore per elemento in quel workspace) e di Tutti (`setFixedShownEverywhere`, con «Acceso in X workspace su N» quando non è uguale ovunque). Con un lilOS senza `setFixedShownEverywhere` la sezione è solo in Tutti, come scelta unica per tutte le scrivanie (o «Fisso», senza `setFixedShown`). Scrivania → Elementi (1.12.0) ha il pulsante che porta a Workspace e la sezione «Icone» con l'interruttore «Mostra l'anteprima dei file» (impostazione `deskPreviews`); la sezione c'è solo se `system.fileThumbnail` esiste, e «Ripristina» la riporta al predefinito.

---

## items/

### `targets.js`

Comandi sugli elementi comuni a tutte le viste (desktop, File Manager), registrati una volta da `registerItemCommands()` nel gruppo **Elementi**: `items.open` (Invio), `items.rename` (F2, con un solo elemento selezionato), `items.delete` (Canc), `items.selectAll` (Ctrl A), `items.deselect` (Esc).

- `addTarget({ isActive, selectionSize, open, rename, remove, selectAll, deselect })`: una vista si iscrive; restituisce la funzione per togliersi. I comandi agiscono sul primo target con `isActive()` vero.
- `activeTarget()`: il target attivo, o `null`.

### `confirmRemove.js`

Eliminare file e cartelle come dicono le impostazioni `deleteConfirm` e `deletePermanent` (vedi [systemSettings.js](#systemsettingsjs)).

- `confirmRemove(ids, x, y, stack = null)`: toglie i nodi di sistema. Con `deleteConfirm` apre nel punto `(x, y)` un menu "Sposta nel cestino … / Annulla" (o "Elimina definitivamente …" con `deletePermanent`), per **ogni** eliminazione; senza, elimina subito. Con `stack` (una `UndoStack`) l'eliminazione viene registrata e Ctrl Z rimette tutto; senza, non si può annullare.
- `deleteNodes(stack, ids)`: `removeNodes` con `permanent` preso da `deletePermanent`, senza chiedere.
- `deleteLabel(nodes)`: il testo della voce di conferma, per esempio `Sposta nel cestino «Appunti» e i 12 elementi dentro`.

### `fsHistory.js`

Azioni sul file system che finiscono in una `UndoStack`. Scrivania, File Manager e pannello dell'Editor usano le stesse, ciascuna con la propria cronologia. Ogni funzione fa l'azione e la registra (`stack` può essere `null`: allora la fa e basta). Undo e redo controllano che l'elemento esista ancora: se no lanciano un errore e la cronologia toglie la voce.

| Funzione | Descrizione |
| --- | --- |
| `removeNodes(stack, ids, { permanent = false })` | `Promise`. Toglie i nodi con quello che contengono (quelli di sistema si saltano). Di default li **sposta nel cestino** (`fs.trash`): annullare li rimette con `fs.untrash`, ripetere li cestina di nuovo; etichetta `Sposta nel cestino «nome»` o `… N elementi`. Con `permanent: true` prende `fs.snapshot` ed elimina con `fs.remove`; annullando li rimette con `fs.restore` (lancia se la cartella non c'è più); etichetta `Elimina «nome»` o `Elimina N elementi`. |
| `restoreNodes(stack, ids, parentId?)` | Toglie dal cestino con `fs.untrash` (nella cartella d'origine, o in `parentId` se c'è) e restituisce `[{ id, parent }]` (non è una Promise). Annullare li rimette nel cestino, ripetere li rimette nella stessa cartella. Etichetta `Ripristina «nome»` o `Ripristina N elementi`. |
| `recordCreated(stack, id)` | Registra un nodo appena creato (e magari già rinominato): annullare lo toglie, ripetere lo rimette com'era (con il contenuto scritto nel frattempo). Etichetta `Crea «nome»`. Va chiamata **dopo** la rinomina iniziale, per fare un solo passo. |
| `renameNode(stack, id, name)` | Rinomina e restituisce il nome finale. Se il nome non cambia non registra nulla. Etichetta `Rinomina «a» in «b»`. |
| `moveNode(stack, id, parentId)` | Sposta in un'altra cartella e restituisce il nome finale. Se la cartella è la stessa non registra nulla. Annullando, il nome non torna quello di prima se era stato cambiato per renderlo unico. Etichetta `Sposta «nome» in «cartella»`. |
| `moveNodes(stack, ids, parentId)` | Sposta più nodi in una cartella come **un solo** passo (è ciò che usa il trascinamento). Salta i nodi che non esistono, quelli già nella cartella e quelli che `fs.move` rifiuta (di sistema, la cartella stessa o una che la contiene). Restituisce gli id spostati (array vuoto se non c'era nulla da spostare); se qualche nodo ha dato errore e nessuno si è spostato, lancia il primo errore. Annullare rimette ogni nodo nella cartella d'origine **con il nome di prima**; ripetere li rimette nella cartella. Se nessuno si può più spostare, undo e redo lanciano «Gli elementi o le cartelle non esistono più». Etichetta `Sposta «nome» in «cartella»` o `Sposta N elementi in «cartella»` (la radice è «Home»). |

### `itemDrag.js`

Trascinamento di file e cartelle, uguale in ogni vista che li mostra (scrivania, File Manager, pannello dell'Editor, app tue). Motivazioni in [D30](../interna/decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle); come si usa in [Ricette](ricette.md#rendere-trascinabili-file-e-cartelle-in-unapp). Lo stile (`.drop-target`, `.item-ghost`, `body.items-dragging`) è in `src/styles/items.css`.

| Funzione | Descrizione |
| --- | --- |
| `markItem(el, node)` → `el` | Dice che `el` mostra `node`: imposta `el.dataset.node = node.id`. Un elemento che mostra una **cartella** accetta rilasci (i nodi vi si spostano dentro); uno che mostra un **file** lascia passare il rilascio a ciò che lo contiene. |
| `dropZone(el, zone)` → `() => void` | Rende `el` un'area che accetta rilasci. Restituisce la funzione che la toglie. Vedi `zone` sotto. |
| `dragItems(e, options)` | Avvia il trascinamento da un `pointerdown` (`e`). Vedi le opzioni sotto. Non restituisce nulla: i listener si tolgono da soli al rilascio. |
| `movableInto(ids, folderId)` → `string[] \| null` | Gli id tra `ids` che possono andare in `folderId`; `null` se il rilascio non è possibile: `folderId` non è una cartella, un nodo trascinato è la cartella stessa o ne contiene una, oppure non cambierebbe nulla. I nodi di sistema sono sempre esclusi. Se tra gli `ids` ci sono elementi del cestino (`fs.isTrashed`), restituisce quelli: possono andare in qualsiasi cartella. |
| `moveInto(stack, ids, folderId)` → `string[]` | Sposta con `moveNodes` e manda una notifica (`Spostato «nome» in Documenti`, `Spostati 3 elementi in Home`; il percorso è `fs.path`). Un errore diventa una notifica `Non si può spostare: …` e restituisce `[]`. Restituisce gli id spostati. Con elementi del cestino li **ripristina** in `folderId` con `restoreNodes(stack, ids, folderId)` (notifica `Ripristinato «nome» in …`) e restituisce gli id ripristinati: così una vista del cestino che li trascina con `dragItems` li rimette dove vengono lasciati, scrivania compresa (nel punto del rilascio). |

**`zone`** (tutte le proprietà sono facoltative):

| Proprietà | Descrizione |
| --- | --- |
| `folder(hit)` | Restituisce l'id della cartella in cui vanno i nodi, o `null` (nessun rilascio). `hit` è l'elemento sotto il puntatore. Se c'è, i nodi si controllano con `movableInto` e, di norma, si spostano con `moveInto`. |
| `drop(ids, ev, stack)` | Fa lei il rilascio. Con `folder` sostituisce il `moveInto` (i `ids` sono già filtrati); senza `folder` è l'unica azione. |
| `accepts(ids)` | Per le zone senza `folder`: `false` per rifiutare. Senza `drop` una zona senza `folder` non accetta nulla. |
| `target(hit, x, y, ids)` | Per le zone che decidono tutto da sole: restituisce `{ el, run(ev, stack) }` (`el` prende `drop-target`) o `null`. `x` e `y` sono le coordinate del puntatore. Ha la precedenza su `folder`, `drop` e `accepts`. Serve quando bisogna distinguere punti diversi della stessa area, come il centro e i bordi di una voce della barra laterale del File Manager. |
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

### `deskLinks.js`

`src/items/deskLinks.js`: i collegamenti (nodi `link` di `fs`) sulla scrivania. Tutto è esportato da `@lilos/system`.

| Funzione | Descrizione |
| --- | --- |
| `linkTo(id)` | Dove punterebbe un collegamento a quel nodo: `{ home: id, kind }` o `{ mount, path, kind }` (come `fs.netRef` più il tipo, `'file'` o `'folder'`). Per un nodo `link` è il suo, senza `broken`: il collegamento di un collegamento punta all'originale. `null` per la radice, le app e gli id che non esistono. |
| `canLinkOnDesk(ids)` | `true` se la scrivania del workspace attuale c'è e almeno uno di questi nodi può avere un collegamento. Serve a mostrare la voce di menu. |
| `addDeskLinks(ids)` | Crea un collegamento sulla scrivania del workspace attuale per ciascuno che può averlo, con il suo nome (reso unico da `fs.create`). Restituisce gli id nuovi. Lancia «La scrivania non c’è» se non c'è. |
| `openLink(node, options?)` | Apre ciò a cui punta il collegamento: una cartella nel File Manager (`launch('files', { folder })`), un file con la sua app (`openFile`), una pagina web con `openWebLink`. `Promise` del nodo trovato, `null` se non c'è e per le pagine web. È ciò che fa l'evento `item:open` per i nodi `link`. Le `options` sono quelle di `findLinkTarget`. |
| `openWebLink(url)` | Apre `url` (solo `http` e `https`) in una scheda nuova con `noopener,noreferrer`. |
| `findLinkTarget(node, { win = null, read = null } = {})` | `Promise<nodo \| null>`: il nodo a cui punta un collegamento a un file o una cartella (sempre `null` per un collegamento web). Se non lo trova mostra un `messageBox` di errore su `win` («Il collegamento «nome» non trova l’originale», con il motivo) e segna il collegamento `broken`; se lo trova e `broken` era `true`, lo toglie. Anche un originale di un altro tipo di quello atteso («ora non è più una cartella») è un originale non trovato. `read(id)` legge una cartella di rete e dà `true` se l'ha letta, `false` se ha rinunciato (dopo averlo detto). Senza `read`, una connessione che chiede la password o la conferma del server passa il collegamento al File Manager (`launch('files', { folder, link })`) e il risultato è `null`; un server che non risponde mostra un `messageBox` con **Riprova** e **Annulla** e, annullando, il collegamento **non** è segnato rotto. |
| `locateLink(link, { win = null, read = null, linkNode = null } = {})` | Cerca senza dire niente: `{ node }`, `{ missing: motivo }` o `{ stop: true }` (server non raggiunto, l'utente ha rinunciato o è stato avvisato). Serve a controllare un collegamento prima di farlo: «Nuovo collegamento» del File Manager non ne conosce ancora il `kind`. Senza `read` né `linkNode`, una connessione che chiede la password dà `stop`. |

Come si trova l'originale. Nella home, per id (`link.home`); se manca, il motivo è «nel cestino» (`fs.isTrashed`) oppure «eliminato, o in un workspace che da qui non si vede». In rete la connessione (`net.mount`) e il suo nodo (`net.mountNode`) devono esserci; poi, per ogni parte di `link.path`, si legge la cartella dal server (`fs.refresh`) e si cerca il figlio con quel nome esatto e, se non c'è, senza distinguere maiuscole e minuscole (SMB non le distingue). Se `fs.refresh` rifiuta con `secret_required` o `untrusted`, il File Manager chiede e poi riapre il collegamento; con altri errori compare «Impossibile raggiungere «connessione»».

```js
import { fs } from '@lilos/sdk';
import { linkTo, addDeskLinks, openLink } from '@lilos/system';

if (linkTo(id)) {
  const [made] = addDeskLinks([id]);   // un collegamento sulla scrivania
  await openLink(fs.get(made));        // apre l'originale, o dice perché non c'è
}
```

Il segno dell'icona sta in `src/desktop/itemIcons.js` (`linkIcon`): l'icona dell'originale (per un nodo della home che esiste, la sua; altrimenti quella del tipo, o un globo per `kind: 'web'`) con una catena in basso a sinistra; se è `broken`, sbiadita e con una croce rossa. L'icona si aggiorna quando il nodo `link` cambia, non quando cambia l'originale: se un originale della home sparisce, il collegamento sembra a posto finché non lo si apre. «Proprietà…» (`items/properties.js`) mostra Tipo, Originale e Stato. L'azione `desktop.newLink` («Collegamento…», nel sottomenu Nuovo del menu della scrivania) fa `launch('files', { folder: desktop.folder }, 'newLink')`.

### `links.js`
### `links.js`

L'ordine della sezione «Collegamenti» nella barra laterale del File Manager: le voci fisse (Home, Scrivania, Documenti, Immagini, Download) e i collegamenti a file e cartelle trascinati lì. Il blocco dei tag e il Cestino stanno fuori dall'ordine.

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
- `linkEntry(ids)` → voce di menu o `null`: `{ label: 'Aggiungi alla barra laterale del File Manager', icon: 'link', action }` (aggiunge in fondo con `links.add`) per i nodi non ancora collegati, esclusi radice e nodi di sistema; `null` se non ce n'è nessuno (usalo in un array di `openMenu` con `.filter(Boolean)`). La usano i menu della scrivania, del File Manager e del pannello dell'Editor.

---

## workareas/

Aree della scrivania che tengono insieme elementi e finestre. Panoramica e motivazioni: [README per sviluppatori](README.md#workarea) e decisione D25. Il modulo dipende dall'SDK, da `desktop/`, `apps/launcher.js` e `windows/`; chi lo usa è `main.js`.

### `class Workareas extends Emitter`

`new Workareas({ canvas, desktop, wm, launcher, key = 'workareas' })` (`launcher` è il valore restituito da `connectLauncher`; `key` è dove si salvano, `ws:<id>:workareas`). Nel costruttore:

- imposta `desktop.workareas` e `canvas.fitScope`;
- chiama `setLaunchScope(…)` con la workarea attuale come ambito;
- carica le workarea salvate sotto `key` ([`lilos:ws:<id>:workareas`](#lilosworkareas)): le workarea ridotte nascondono i loro elementi e mettono l'icona, quelle aperte mostrano l'area e riaprono le finestre salvate;
- salva le finestre 400 ms dopo ogni `change` del canvas e ogni `open`/`close` del gestore delle finestre, e alla chiusura della pagina (`pagehide`).

La proprietà `ready` è una Promise (`Promise.allSettled`) che si risolve quando le finestre salvate nelle workarea aperte sono tornate. `system.js` la aspetta, con `workspaces.ready`, prima di emettere `system:ready`.

**Cronologia**: creare (con la rinomina iniziale: un passo), rinominare (dalla barra del titolo o dall'icona con F2; non dalla finestra delle proprietà), spostare, ridimensionare ed eliminare vanno in `desktop.history`. Ridurre a icona e riaprire non vengono registrati. `rename(id, title, { record = false })` e `remove(id, { record = true })` hanno l'opzione `record`. Annullando un'eliminazione la workarea torna aperta, nello stesso punto; se lì ora c'è un'altra workarea, l'annullamento fallisce. I messaggi brevi ("Le aree non possono sovrapporsi") usano `notify()`.

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
| `show(id)` | Porta la workarea in vista (la usa il menu di avvio): se è ridotta a icona la riapre (`expand`, che la inquadra); altrimenti la rende attuale e la inquadra (`canvas.frame` con 40 px di margine, zoom al massimo 100%). Non fa nulla per un id sconosciuto. |
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

Scrivanie separate. Panoramica e motivazioni: [README per sviluppatori](README.md#workspace) e decisione D27. Il modulo dipende dall'SDK, da `desktop/`, `canvas/`, `workareas/`, `windows/` e `apps/`; lo crea `system.js`.

### `class Workspaces extends Emitter` (`Workspaces.js`)

`new Workspaces({ state, canvas, desktop, wm, launcher, workareas, taskbar })`; `state` è il valore restituito da `setupWorkspaces`. Nel costruttore:

- imposta il filtro delle app visibili del registro (`setInstalledFilter`), segue il `registry` (un'app installata si aggiunge a `apps` e `known` di ogni workspace vivo; una rimossa si toglie e ne chiude le finestre) e collega `info.js`;
- chiama `desktop.syncFixed()`, perché la scrivania mostri gli elementi fissi del workspace attuale;
- dice al gestore delle finestre qual è il workspace attuale e riapre le finestre salvate fuori dalle workarea (`lilos:ws:<id>:windows`); la proprietà `ready` è la Promise che si risolve quando sono tornate (vale per il primo workspace);
- registra le scorciatoie del gruppo Workspace, attive anche mentre si scrive e solo se i workspace sono almeno due: `workspaces.next` (Ctrl Alt →) e `workspaces.previous` (Ctrl Alt ←);
- crea il `WorkspaceSwitcher`, il pulsante nella barra;
- salva le finestre 400 ms dopo ogni `open`/`close` del gestore delle finestre e `change` del canvas, e alla chiusura della pagina.

Un workspace vivo è `{ id, name, description, color, created, desk, apps, known, hidden }` (vedi [`lilos:workspaces`](#lilosworkspaces)). In sviluppo il gestore è `lilos.workspaces`.

| Membro | Descrizione |
| --- | --- |
| `list()` | Copie dei workspace vivi, in ordine. |
| `get(id)` | Il workspace vivo (oggetto interno, da non modificare), o `null`. |
| `currentId`, `current` | Id del workspace attuale; copia del workspace attuale. |
| `describe(id)` | `{ id, name, description, color, removed, current }` (`description` è `''` se non c'è) per qualunque workspace mai creato, anche eliminato; `null` se sconosciuto. |
| `ownedCount(id)` | Quanti file, cartelle e collegamenti ha creato (`fs.ownedCount`). |
| `switchTo(id)` | Mostra un altro workspace. Messo in coda con le eliminazioni; `Promise` che risolve quando le sue finestre sono tornate. Non fa nulla per un id sconosciuto o già attuale. Salva il workspace lasciato (chiude i menu, conferma le rinomine in corso, salva finestre, workarea e posizioni), poi cambia `fs`, finestre, camera, scrivania e workarea, emette `switch` e mostra il messaggio «Workspace «nome»». Le finestre del workspace lasciato restano aperte, nascoste. La cronologia della scrivania riparte. |
| `step(dir)` | Il successivo (`1`) o il precedente (`-1`), tornando al giro. Non fa nulla con un solo workspace. |
| `create({ name?, color? })` | Nuovo workspace con la Scrivania vuota e tutte le app visibili. Restituisce l'id; `null` (con un messaggio) se ce ne sono già 20. Nome predefinito «Workspace N», colore il primo accento non usato. **Non lo mostra**: chiama `switchTo(id)`. |
| `setDescription(id, text)` | Cambia la descrizione, una riga su cosa serve il workspace (spazi ripuliti, al massimo 200 caratteri; `''` la toglie; uguale o id sconosciuto si ignora). Salva ed emette `change`. Si vede sotto il nome nel menu di avvio. |
| `rename(id, name)`, `setColor(id, color)` | Cambiano nome (ripulito, al massimo 40 caratteri; vuoto o uguale si ignora) e colore (esadecimale `#rrggbb`). |
| `isInstalled(appId, id?)` | `true` se l'app è visibile nel workspace (l'attuale se manca `id`); le app `system` sempre. |
| `setInstalled(appId, on, id?)` | Mostra o nasconde l'app nel workspace (non le app `system`); l'app resta installata in lilOS. Nascondendola nell'attuale chiude le finestre di quell'app con `requestClose`: ognuna può chiedere conferma se ha modifiche non salvate. |
| `setHiddenFixed(byId)` | `{ [id]: chiavi }`: gli elementi fissi spenti in quei workspace (id sconosciuti ignorati; le chiavi le controlla `fixedItems.js`). Salva ed emette `change`; se tocca l'attuale chiama `desktop.syncFixed()`. |
| `remove(id)` | Elimina un workspace (mai l'ultimo), in coda. Se è l'attuale mostra prima il successivo. La Scrivania diventa `/Documenti/Scrivania di <nome>` (con `fs.share`; rimossa se vuota); ciò che aveva cestinato dalla sua Scrivania diventa visibile a tutti (`fs.unscopeTrash`); le finestre delle app passano nel workspace attuale (`wm.adopt`), quelle secondarie si chiudono; chiavi `lilos:ws:<id>:…` cancellate; nell'elenco resta la voce "rimossa". Promise: il percorso della vecchia Scrivania, `''` se era vuota, `null` se non ha eliminato nulla. File e cartelle creati altrove restano dove sono. |

**Eventi**

| Evento | Payload | Quando |
| --- | --- | --- |
| `change` | — | Cambiati elenco, nomi, descrizioni, colori, app visibili o elementi fissi. |
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
| `newWorkspace({ name, description?, color, desk, apps, id? })` | Un workspace nuovo (id con `uid()`, data di creazione adesso). |
| `workspaceKey(id, part)` | `'ws:<id>:<part>'`: la chiave di una parte del workspace. |
| `PARTS` | `['camera', 'desktop-layout', 'workareas', 'windows', 'launcher']`. |
| `forgetWorkspace(id)` | Cancella le chiavi di un workspace. |
| `cleanName(v)`, `cleanDescription(v)`, `cleanColor(v)` | Ripuliscono nome (spazi, 40 caratteri), descrizione (spazi, 200 caratteri) e colore (esadecimale, altrimenti il primo accento). |
| `LIMITS` | `{ MAX_WORKSPACES: 20, MAX_NAME: 40, MAX_DESCRIPTION: 200 }` (esportato come `WORKSPACE_LIMITS` da `@lilos/system`) |

### `info.js`

Ciò che le app possono sapere dei workspace senza dipendere dal gestore (il File Manager lo usa per la colonna Workspace). Il gestore si collega da solo.

| Export | Descrizione |
| --- | --- |
| `describeWorkspace(id)` | `{ id, name, description, color, removed, current }` del proprietario di un nodo (`node.workspace`); `null` se `id` manca (cartelle di sistema condivise) o non è noto. |
| `onWorkspacesChange(fn)` | Chiama `fn` quando i workspace cambiano (`change` o `switch`). Restituisce la funzione che smette di ascoltare. |
| `workspaceManager()` | Il gestore `Workspaces` (lo usa il Pannello di controllo), o `null`. |

### `WorkspaceSwitcher.js`

Il pulsante nella barra a destra del logo (`button.tb-ws`: pallino con il colore e nome) e il suo menu: elenco dei workspace (spunta sull'attuale), Successivo, Precedente (con le scorciatoie), Nuovo workspace, Gestisci i workspace… (apre `launch('settings', { tab: 'workspaces' })`). Il tooltip riporta le scorciatoie. Ha `aria-haspopup="menu"` ma non `aria-expanded`.

---

## systemFs.js

- `DESK_NAME`: `'Scrivania'`, il nome della cartella di ogni workspace.
- `SYSTEM_NAME`: `'Sistema'`, il nome della cartella condivisa dove lilOS tiene ciò che gli serve (oggi la copia dello sfondo, [D58](../interna/decisioni.md#d58-lo-sfondo-è-una-copia-nella-cartella-sistema)). È nascosta (`fs.setHiddenNodes`): non è negli elenchi della radice né nella barra laterale; si raggiunge solo con il percorso (`fs.resolve('/Sistema')`).
- `SYSTEM_FOLDERS`: le cartelle sotto la radice, con il simbolo per la barra laterale del File Manager: Scrivania, Documenti, Immagini, Download. Sistema non c'è: è nascosta (fino alla 1.13.0 era l'ultima, simbolo `gear`).
- `sharedFolder(name)` → `string | null`: l'id della cartella condivisa (non privata) con quel nome nella radice, anche se nascosta (la cerca con `fs.resolve`), o `null` se non c'è. Usata da `setupFileSystem` e dallo sfondo; non è esportata da `@lilos/system`.
- `setupFileSystem()` → `{ firstStart }` (`true` se non c'era nulla di salvato). Crea le cartelle di sistema **condivise** che mancano (Documenti, Immagini, Download, Sistema) e nasconde Sistema (`fs.setHiddenNodes`). La Scrivania non la crea: ogni workspace ha la sua (`setupWorkspaces`). Va chiamata prima che un workspace sia impostato.
- `fillDesk(deskId, layoutKey)`: al primo avvio riempie una Scrivania con gli elementi della vecchia scrivania piatta (`lilos:desktop`, che poi viene eliminata) o con `seed.js`, e scrive le posizioni sotto `layoutKey`.

---

## apps/open.js e apps/openWith.js

Quale app apre quale file, per estensione. Le scelte predefinite vengono da `opens` del registro; l'utente le cambia nel Pannello di controllo → Usabilità → Tipi di file (`lilos:file-apps`).

| Funzione | Descrizione |
| --- | --- |
| `openFile(node, { choose? })` | `Promise`: apre il file con la sua app (`launch(app, { file: id })`); senza app associata, con un'app **nascosta nel workspace attuale**, o con `choose: true`, mostra la finestra "Apri con". Prima passa dall'evento `file.open` ([pipes](#sdkcorepipesjs-e-sdkcorepipecatalogjs)): un gestore può dare il file a un'altra app (`app`, solo se è un'app che apre file) o fermarlo; l'errore si mostra in un avviso (non se `silent`). Si risolve quando è deciso. |
| `appFor(ext)` | L'app per quell'estensione, o `null` (chiedi). La scelta è la stessa in ogni workspace. |
| `defaultAppFor(ext)` | L'app predefinita secondo il registro, o `null`. |
| `setAppFor(ext, appId \| 'ask' \| null)` | Salva la scelta; uguale alla predefinita (o `null`) la toglie. |
| `resetAppsFor()` | Torna a tutte le predefinite. |
| `fileApps()` | App che aprono file (hanno `opens` e `load`). |
| `installedFileApps()` | Quelle visibili nel workspace attuale: le propone "Apri con". |
| `knownExtensions()` | Estensioni da elencare: tipi conosciuti, quelle aperte dalle app, quelle scelte, quelle dei file esistenti. |
| `extensionOf(node)` | Estensione in minuscolo. |
| `setChooser(fn)` | Il sistema registra la funzione che mostra "Apri con" (`system.js`). |

Il launcher passa alle app anche `openWindow(win, key?, { main?, at? })` per le finestre secondarie (con una chiave, se è già aperta mostra quella). `main: true` apre invece un'altra finestra **principale** dell'app (`wm.open(win, { app })`): si salva e si ripristina come quella aperta dal launcher, e alla riapertura l'export predefinito riceve il suo `getState()` come `args`. `at: { x, y }` (un punto dello schermo, `clientX`/`clientY`) mette lì l'angolo in alto a sinistra, convertito con `canvas.toWorld`; senza `at` la finestra è centrata nell'ambito. Lo usano le schede staccate di Terminale.

`createOpenWith(wm)` (`openWith.js`) crea la finestra **Apri con**: una `Window` senza Riduci e Ingrandisci, a dimensione fissa, con l'elenco delle app (frecce, Invio, doppio clic), la casella "Usa sempre quest'app per i file .xxx" e i pulsanti Annulla / Apri. Ce n'è al massimo una.

---

## apps/commands.js

Scorciatoie delle app, dichiarate nel registro (`commands`) e registrate all'avvio da `registerAppCommands(apps)` nel gruppo con il nome dell'app: così si possono cambiare nel Pannello di controllo anche prima di aprire l'app. Sono attive anche mentre si scrive (predefinito `whenEditing: true`).

- `handleCommand(id, { isActive, run })`: una finestra dell'app gestisce il comando finché `isActive()` è vero (di solito `win.active`); restituisce la funzione per staccarsi (da chiamare su `destroy`).

---

## App di sistema

File Manager, Editor, Pannello di controllo, AppStore e Pianificazione **non stanno in questo repository**: sono pacchetti di [GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official) (sorgenti in `src/<app>/`, pacchetto pronto in `apps/<id>/`) che il kernel installa all'avvio se mancano ([D41](../interna/decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel)). Come si lavora su di loro: [README per sviluppatori](README.md#le-app-di-sistema-e-il-repository-ufficiale). Qui c'è quello che lilOS si aspetta da loro e che gli dà.

Un'app di sistema è un modulo ES come le altre: l'export predefinito riceve `{ args, openWindow }` e restituisce una `Window` (vedi [apps/registry.js e apps/launcher.js](#appsregistryjs-e-appslauncherjs)). Importa `@lilos/sdk` e [`@lilos/system`](#systemapijs-lilossystem); non ha sandbox. Se dichiara `entrypoints` (manifesto con `sdk` `"2"`), ogni punto d'ingresso è un export **con quel nome** dello stesso modulo (o del suo `file`): una finestra è una funzione `({ args, openWindow, entry }) → Window`, un background è una funzione `({ lilos, args })` che chiama `lilos.handle` (stesso oggetto `lilos` delle app installate, sempre nella pagina di lilOS; vedi [Background](#background-backgroundjs)).

Argomenti (`args`) che il sistema usa per avviarle, e stato per le workarea (`win.getState`):

| App (`id`) | `args` | `getState()` |
| --- | --- | --- |
| File Manager (`files`) | `folder`: id della cartella da aprire (altrimenti Home); `trash: true` (o `folder === fs.trashRoot`) apre il Cestino; `tag`: id di un tag che esiste, apre la vista di quel tag; `link`: id di un collegamento che il File Manager deve seguire (lo manda lilOS quando una connessione chiede la password o la conferma del server: il File Manager la chiede e poi apre l'originale). Sulla finestra già aperta arriva l'evento `launch` e mostra la nuova cartella. Ha anche il punto d'ingresso `newLink`, la finestra «Nuovo collegamento» (`folder`: dove si fa il collegamento; la radice se manca, non esiste o è di rete). | `{ folder }` (`fs.trashRoot` per il Cestino, `'tag:<id>'` per un tag) |
| Editor (`editor`) | `file`: id del file da aprire (in una scheda nuova o in quella che lo mostra già); `folder`: cartella del pannello a destra (assente: l'ultima aperta; `null`: nessuna); `sidebar: false`: pannello chiuso; `session`: id della sessione di schede da riprendere (lo mette `getState`). Senza `session`, la finestra riprende le schede messe da parte da finestre chiuse dall'utente. Apre i tipi di file dichiarati in `contributes.fileTypes` del suo manifesto. | `{ session, file, files, folder, sidebar? }` (`files`: i file delle schede, per `files:locked`) |
| Pannello di controllo (`settings`) | `tab`: id di una scheda (`'workspaces'`, `'tags'`…), anche a finestra già aperta; `tagFor`: id dei nodi su cui metterà il prossimo tag creato (lo manda «Nuovo tag…» del sottomenu Tag). | nessuno (si riapre sulla prima scheda) |
| AppStore (`appstore`) | `tab`: `installed`, `updates`, l'id di una categoria (`system`, `productivity`, `media`, `development`, `other`), `kernel` o `options` (anche `apps`, `modules`, `repos`, dei vecchi collegamenti); anche a finestra già aperta (evento `launch`). | nessuno |

Il sistema dipende da questi argomenti (`launch('files', { folder })` in `system.js`, `launch('settings', { tab: 'workspaces' })` nel pulsante del workspace): cambiarli nell'app rompe il sistema. Il sistema non dipende invece dall'esistenza delle app: se una manca, `launch` scrive solo un'informazione in console (`app non ancora disponibile`).

Cosa salvano (chiavi di `storage`, vedi [Dati salvati](#dati-salvati)): File Manager `files-view` (`'list'`, `'grid'` o `'thumbs'`), `files-panels`; Editor `editor-lang`, `editor-tree`, `editor-tabs`, `editor-draft:<scheda>`; Pannello di controllo nulla di proprio (usa `settings`, `shortcuts`, `tags`, `menus`…). Le associazioni dei tipi di file e l'ordine della barra laterale del File Manager sono del sistema (`file-apps`, `files-sidebar`).

Permessi dichiarati nei manifesti ufficiali: File Manager `fs.write:~`, `fs.workspaces`, `tags.write`, `desktop.items`, `ui.shortcuts`; Editor `fs.write:~`, `ui.shortcuts`, `net:https://json.schemastore.org`; Photo `fs.write:~`, `ui.shortcuts`; Pannello di controllo `settings.system`, `workspaces.manage`, `tags.write`, `ui.shortcuts`; AppStore `apps.manage`. Per le app di sistema non c'è un controllo a ogni uso (non passano dal ponte): i permessi servono al kernel per accettare il manifesto e a mostrare cosa fa l'app.

---

## systemApi.js (`@lilos/system`)

`src/systemApi.js`: ciò che il sistema dà alle app di sistema oltre all'SDK. Un'app lo importa come `@lilos/system`; il build non lo include. A runtime il browser carica `/host/system.js`, generato da `scripts/host-shims.mjs` (lo eseguono `predev` e `prebuild`), che ri-esporta per nome ciò che `system.js` ha messo in `globalThis.__lilosHost.system`. Lo stesso vale per `@lilos/sdk` → `/host/sdk.js` → `globalThis.__lilosHost.sdk`. Se il modulo viene importato prima che lilOS sia pronto, lancia «lilOS non è pronto».

**È un contratto con le app installate**: togliere o rinominare un export rompe le app di sistema già installate. Aggiungere è sicuro. Ogni export deve avere la forma `export { a, b } from '…'` su una sola riga (lo script legge solo quelle). Dopo aver aggiunto un export, rigenera gli shim (`npm run dev` e `npm run build` lo fanno da soli).

| Export | Da | A cosa serve |
| --- | --- | --- |
| `version` | `package.json` | Versione di lilOS |
| `ACCENTS`, `DESK_COLORS`, `LASSO_OPTIONS`, `RETENTION_OPTIONS` | `systemSettings.js` | Scelte di colore principale, colore della scrivania, selezione a mano libera e conservazione del cestino |
| `SYSTEM_FOLDERS`, `DESK_NAME`, `SYSTEM_NAME` | `systemFs.js` | Cartelle di sistema, nome della Scrivania e di Sistema |
| `FOLDER_COLOR`, `itemIcon`, `itemBadges` | `desktop/itemIcons.js` | Icone di cartelle e file; i segni delle app sulle icone |
| `wallpaper`, `wallpaperInfo`, `setWallpaper`, `clearWallpaper`, `isWallpaperImage`, `WALLPAPER_EXTS` | `desktop/wallpaper.js` | L'immagine di sfondo della scrivania (vedi [desktop/wallpaper.js](#desktopwallpaperjs)) |
| `DESK_FIXED_ITEMS`, `isFixedShown`, `setFixedShown`, `setFixedShownEverywhere` | `desktop/fixedItems.js` | L'elenco degli elementi fissi della scrivania (alias di `FIXED_ITEMS`) e quali sono accesi, per workspace o in tutti |
| `USER_PAGE_GROUPS`, `USER_PAGE_ITEMS`, `isUserPageShown`, `setUserPageShown` | `user/items.js` | Cosa può mostrare la pagina utente e quali voci sono accese (vedi [user/](#user-la-pagina-utente)) |
| `WORKSPACE_LIMITS` | `workspaces/store.js` | Limiti dei workspace (alias di `LIMITS`) |
| `describeWorkspace`, `onWorkspacesChange`, `workspaceManager` | `workspaces/info.js` | Nome e colore di un workspace; il gestore dei workspace |
| `apps`, `registry`, `getApp`, `isInstalled`, `installedApps`, `launch` | `apps/registry.js` | Il registro delle app (non l'`apps` dell'SDK) |
| `fileApps`, `appFor`, `defaultAppFor`, `setAppFor`, `resetAppsFor`, `knownExtensions`, `openFile` | `apps/open.js` | Quale app apre quale file |
| `handleCommand` | `apps/commands.js` | Un'app gestisce un suo comando |
| `sendKey` | `input/sendKey.js` | Manda un tasto all'elemento con il focus, come un tasto vero ([input/sendKey.js](#inputsendkeyjs)) |
| `callEntrypoint`, `connectEntrypoint`, `entrypointsOf` | `apps/entrypoints.js` | Avviare un punto d'ingresso di un'app, collegarsi a uno in background, elencare quelli di un'app (vedi [Punti d'ingresso](#punti-dingresso-entrypointsjs)) |
| `fileThumbnail`, `canThumbnail` | `apps/thumbnails.js` | La miniatura di un file fatta dalla sua app (object URL o `null`) e se può averne una (vedi [Miniature dei file](#miniature-dei-file-thumbnailsjs)) |
| `filePreview`, `previewAppFor`, `PREVIEW_ENTRY` | `apps/filePreview.js` | L'anteprima di un file fatta dall'app che lo apre, l'app che la fa e il nome del punto d'ingresso (`'filePreview'`; vedi [Anteprima dei file fatta dalle app](#anteprima-dei-file-fatta-dalle-app-filepreviewjs)) |
| `appActionEntries` | `apps/appActions.js` | Le voci che le app installate aggiungono al menu di file e cartelle (vedi [apps/pipes.js, apps/appActions.js e apps/systemEvents.js](#appspipesjs-appsappactionsjs-e-appssystemeventsjs)) |
| `automations` | `automation/index.js` | Le automazioni: registrazione, file `.automata`, esecuzione e elenco (vedi [automation/](#automation-le-automazioni-nel-sistema)) |
| `appPipes` | `apps/pipes.js` | Le pipe di un'app: dal manifesto e dal codice |
| `startup` | `apps/startup.js` | Le app che si aprono da sole (vedi [apps/startup.js](#appsstartupjs)) |
| `updateApps`, `requestRestart`, `restartSystem`, `updates` | `apps/updates.js` | Aggiornare app senza lasciare codice vecchio, chiedere il riavvio di lilOS (vedi [apps/updates.js](#appsupdatesjs)) |
| `services` | `apps/services.js` | I servizi delle app nel kernel: elenco, scelte, avvio e arresto, chiamate, registro (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)) |
| `executionMode`, `canChangeExecution` | `apps/packages/isolation.js` | Come gira un'app installata; se l'utente può cambiarlo (è amministratore) |
| `describePermission` | `apps/packages/permissions.js` | Un permesso in italiano (`'fs.read:~/Documenti'` → «Leggere i file in Home/Documenti») |
| `showAppProperties`, `showAppSecurity` | `apps/appProperties.js` | Aprono "Proprietà…" di un'app (la seconda sulla scheda Sicurezza) |
| `showProperties` | `items/properties.js` | Apre "Proprietà…" di un file o una cartella (di un collegamento a un'app apre quelle dell'app); se un'app ha dati sul nodo, una riga «App» con i suoi segni (`itemBadges`); per i dati di un'app non installata, una riga «Dati di `<id>`» con **Rimuovi** (`fs.setAppMeta(id, app, null)`) |
| `pickFile` | `apps/filePicker.js` | Selettore di file e cartelle |
| `addTarget` | `items/targets.js` | Comandi sugli elementi |
| `links`, `linkEntry` | `items/links.js` | Collegamenti della barra laterale del File Manager |
| `linkTo`, `canLinkOnDesk`, `addDeskLinks`, `openLink`, `openWebLink`, `findLinkTarget`, `locateLink` | `items/deskLinks.js` | I collegamenti sulla scrivania: crearli, aprirli, controllarli (vedi [`deskLinks.js`](#desklinksjs)) |
| `markItem`, `dropZone`, `dragItems`, `movableInto`, `moveInto` | `items/itemDrag.js` | Trascinamento di file e cartelle |
| `recordCreated`, `renameNode`, `moveNode`, `restoreNodes`, `removeNodes` | `items/fsHistory.js` | Azioni sul file system che entrano nella cronologia |
| `confirmRemove` | `items/confirmRemove.js` | Eliminare come dicono le impostazioni |
| `tagDots`, `tagSubmenu`, `setTag` | `tags/tagUi.js` | Interfaccia dei tag |

Per le firme vedi le sezioni dei moduli di origine in questa pagina.

---

## apps/pipes.js, apps/appActions.js e apps/systemEvents.js

Come le app installate entrano nelle pipe ([pipes](#sdkcorepipesjs-e-sdkcorepipecatalogjs)), come aggiungono voci di menu e quali eventi non passano da `fs`. Il sistema li collega in `system.js`: `connectPipes()` prima di aprire qualunque cosa, `connectSystemEvents({ wm, workspaces })` poi.

### `apps/pipes.js`

Le app installate hanno due modi di iscriversi.

- **Dal manifesto** (`contributes.pipes`): appena l'app è installata lilOS iscrive il gestore al suo posto. Quando l'evento arriva, lilOS avvia il punto d'ingresso `background` indicato (`background.start`, fino a 15 secondi) e gli consegna l'evento: il gestore è la funzione che il punto d'ingresso ha dato a `lilos.pipes.subscribe` quando è partito (la stessa iscrizione, non una seconda: un solo posto nella catena). Se non si iscrive in tempo, l'operazione fallisce con «`<app>` non gestisce `<evento>` (manca `lilos.pipes.subscribe`)». Vale solo per le app `local`.
- **Dal codice** (`lilos.pipes.subscribe`): dura finché vive quella finestra o quel punto d'ingresso in background. La `key` del gestore resta la stessa a ogni avvio (`<app>#<entry>:<evento>/<fase>`), così l'ordine scelto dall'utente resta.

**Permessi.** `pipe:<evento>`, oppure `pipe.own:<evento>` se `where` è `{ meta: 'own' }`. Gli eventi protetti solo alle app di sistema; la fase `before` di un evento immediato a nessuna app. Gli eventi che l'app ha definito lei (in `contributes.events` o con `lilos.pipes.define`) non chiedono permessi. Senza permesso: «Permesso negato: pipe:`<evento>`».

**Accesso ai file.** Se i dati di un evento hanno un file che l'app ha segnato, quella parte dell'app può leggerlo e scriverlo (`handles`); altri file arrivano solo come dati. L'accesso si dà solo se l'albero di lilOS (`fs.appMeta(id, app)`) conferma che il file è segnato da quell'app: non basta quello che dicono i dati dell'evento.

**Guardia di lilOS** (`lilos:content`, tra i primi di `before` di `file.open`, `file.read` e `file.write`): un file con `apps[id].content === true` non si apre, non si legge e non si scrive se `id` non è installato **oppure** se l'app c'è ma non ha attive le sue pipe `file.read` (`after`) e `file.write` (`before`): la guardia nega nel dubbio. Si toglie dalle Proprietà dell'elemento (riga «Dati di `<id>`» → **Rimuovi**, solo per un'app non installata): il contenuto resta com'è, ma lilOS non lo rifiuta più. L'errore è «Per aprire «`<nome>`» serve l'app `<app>`: installala dall'AppStore».

| Export | Descrizione |
| --- | --- |
| `connectPipes()` | All'avvio, dopo il registro: la guardia, gli eventi di `contributes.events` di **tutte** le app (prima delle iscrizioni, così un'app si iscrive anche agli eventi di una registrata dopo), le iscrizioni del manifesto di ogni app e un ascolto di `registry` (`change`) che per una nuova versione ridefinisce i suoi eventi (togliendo con `pipes.undefine` quelli che non ha più), rifà le sue iscrizioni e quelle delle app che nel manifesto si iscrivono ai suoi eventi, oppure toglie tutto (con gli eventi propri, `pipes.forgetApp`) se l'app sparisce. Quando cambia la lingua ridefinisce gli eventi delle app, per le etichette tradotte (le iscrizioni restano). |
| `checkPipe(pkg, event, { stage, where })` | Lancia un errore se l'app non può iscriversi in quel modo (evento sconosciuto, permesso, evento protetto, `before` di un evento immediato). |
| `pipeTarget({ key, pkg, entry, handles, deliver })` | La parte di un'app che prende chiamate di pipe (una finestra o un background). Restituisce `{ target, subscribe(event, opts), unsubscribe(sub), close() }`; lo usano `host.js` e `background.js`. |
| `appPipes(id)` | `[{ event, stage, entry, where, from: 'manifest' \| 'code' }]`: le pipe di un'app (Pannello di controllo → App → Pipe, Proprietà). |

L'evento `pipes.change` parte 50 ms dopo l'ultima iscrizione che cambia.

### `apps/appActions.js`

`appActionEntries(ids, { separator = false })` → voci per `openMenu`: quelle che le app installate (con il permesso `ui.menus`) dichiarano in `contributes.actions` per questi nodi. Una voce compare se vale per **tutti** i nodi (`on`: `'file'`, `'folder'` o `'item'`, ciascuno non di tipo `app`; `when.meta`: `'own'` = segnato dall'app, `'none'` = non segnato; `when.ext`: solo file con una di queste estensioni; `when.notExt`: tutto tranne i file con una di queste estensioni, cartelle comprese), e per più di un nodo solo se ha `many: true`. `icon` è `glyph` o quello dell'app. Le voci con `menu` finiscono nel sottomenu dell'app con quell'id (`{ label, icon, items }`, al posto della prima di esse), che compare solo se almeno una delle sue voci vale per i nodi. `separator: true` mette un `'-'` davanti se ci sono voci (altrimenti `[]`). Scegliendola, se il punto d'ingresso è una finestra, lilOS la apre con `{ files, action }` come `args` e i file consegnati; se è un background lo chiama con `{ files, action }` (`from` è `'lilos'`, non `null` come per le altre chiamate del sistema). Un errore è un avviso con il nome dell'app. Il menu della scrivania le aggiunge ai nodi selezionati; il File Manager le prende da `@lilos/system`.

### `apps/systemEvents.js`

`connectSystemEvents({ wm, workspaces })` manda con `pipes.notify` gli eventi del catalogo che non passano da `fs`: `window.open` e `window.close` (dal gestore delle finestre), `workspace.switch`, `settings.change`, `settings.system` (quando cambia il modo in cui girano le app), `apps.install` / `apps.update` / `apps.remove` / `permissions.change` (da `apps`: confronta versione e permessi concessi con quelli di prima), `system.ready` e `session.login` (dal bus `system:ready` e `user:login`) e `session.logout`.

Ascolta anche l'evento del bus `files:locked` (id di file): agisce sulle finestre il cui `getState().file`, o uno di `getState().files` (la lista, per le finestre con schede), è uno di quelli, perché ciò che mostrano è in chiaro e il file è tornato bloccato. Se la finestra ha `win.closeFiles(ids)`, la chiama con gli id che mostra tra quelli bloccati e la finestra resta aperta (l'Editor chiude solo le schede); altrimenti chiede di chiuderla (`wm.requestClose`) e una finestra con modifiche non salvate chiede prima di chiudersi. Lo emette `lilos.files.locked` e anche `background.js` quando si ferma un punto d'ingresso in background: chiude così le finestre dei file il cui contenuto è di quell'app (`fs.appMeta(id, app).content === true`). Risponde anche a `files:shown` (`{ ids, answer(id) }`): dice quali di quei file una finestra mostra (`file` e `files` di `getState()`), per `lilos.files.shown`.

---

## apps/registry.js e apps/launcher.js

- `apps`: array **vivo** di `{ id, name, glyph, color, category, system?, trusted?, load, opens?, commands?, package }`. **Nessuna app è integrata**: il registro contiene solo le app installate dal kernel (`packages.js` le aggiunge e le toglie). `package` è lo stato e il manifesto; `load` ne importa il modulo (vedi [apps/packages](#appspackages)). `system: true` significa che l'app è **necessaria** (`required` nel manifesto): sempre visibile in ogni workspace e non rimovibile. `trusted: true` significa app di sistema (`system` nel manifesto): gira dentro lilOS, senza sandbox. `opens`: estensioni che l'app apre per impostazione predefinita (`''` = senza estensione; da `contributes.fileTypes`); un'app con `opens` riceve `args.file`. `commands`: scorciatoie dell'app `{ id, label, keys, whenEditing? }`, registrate all'avvio (vedi [apps/commands.js](#appscommandsjs)).
- `glyph` è un nome accettato da `icon()` (predefinito `help`).
- `category`: una di `CATEGORIES`, la `category` del manifesto (`'other'` se manca o non è valida). È la scheda del menu di avvio che elenca l'app.
- `CATEGORIES`: `['system', 'productivity', 'media', 'development', 'other']`, le stesse del manifesto e dell'AppStore. Non è nell'API `@lilos/system`.
- `registry`: `Emitter`. Evento `change` `{ id, app }` quando un'app viene aggiunta o sostituita (`app` è la nuova voce) o rimossa (`app` è `null`).
- `registerApp(app)`: aggiunge l'app o sostituisce quella con lo stesso id (una nuova versione). `unregisterApp(id)`: la toglie. Le chiama `packages.js`.
- `getApp(id)` → l'app o `undefined`.
- `isInstalled(id)` → `true` se l'app esiste ed è visibile nel workspace attuale (le `system` sempre; il nome viene da quando le app si installavano per workspace). `installedApps()` → quelle visibili, nell'ordine del registro. `setInstalledFilter(fn)`: il sistema (`Workspaces`) imposta `fn(appId) → boolean`; predefinito: tutte visibili. Il menu di avvio mostra solo le visibili.
- `launch(id, args?, entry = 'main', { files = [], auto = false } = {})`: emette `app:launch` con `{ id, args, entry, files }` e, solo se `auto` è `true`, anche `auto: true`. `auto` dice che l'avvio lo fa lilOS da sola (lo usa `startup.js` per le app dell'avvio) e non l'utente: non conta come uso per le preferite e i recenti del menu di avvio (`taskbar/usage.js`). `entry` è uno dei punti d'ingresso di tipo finestra dell'app; l'utente apre sempre `main`. `files`: id di file consegnati all'app. Il launcher li passa al modulo (`({ args, openWindow, entry, files })`); in un'app installata diventano handle leggibili e scrivibili (`packageModule` in `host.js`), anche se isolata. Se la finestra è già aperta, il launcher emette `grant` (con gli id) su di essa prima di `launch`, e gli handle crescono.
- `connectLauncher(wm)`: trasforma `app:launch` in finestre. Al primo avvio carica il modulo dell'app e chiama il suo export predefinito `({ args, openWindow, entry }) → Window` (per un'app di sistema e un `entry` diverso da `main`, l'export con quel nome), poi apre la finestra con `wm.open(win, { app: id, center, bounds })`. Se l'app ha già una finestra di **quel punto d'ingresso** **nell'ambito attuale** (e nel workspace attuale) la riporta in primo piano (ed emette `launch`). Una finestra che non è `main` salva `{ __entry, args }` come stato, così le workarea la riaprono dallo stesso punto d'ingresso. Se l'app non parte, una notifica lo dice. Le app senza `load` (o inesistenti) scrivono un avviso in console. Un'app **nascosta** nel workspace attuale non parte: una notifica dice di mostrarla dal Pannello di controllo → Workspace. La finestra appartiene al workspace attuale al momento della richiesta, anche se l'utente cambia workspace mentre l'app si carica (in quel caso si apre nascosta nel suo workspace).
- Il launcher passa a ogni app un `openWindow(win, key?, { main = false, at = null })` che apre le finestre secondarie con `owner` = l'id dell'app (con `main: true` anche `app` = l'id, quindi la finestra è una principale che si salva e si ripristina; con `at` = `{ x, y }` finiti, in coordinate dello schermo, la mette lì invece di centrarla), e prima di avviare un'app chiede a `blockedLaunch(id)` (`apps/updates.js`): se l'app si sta aggiornando o aspetta il riavvio di lilOS, non parte e l'utente ne vede il motivo.
- Prima di aprire una finestra il launcher fa passare l'avvio dall'evento `app.launch` `{ id, entry, args }` ([pipes](#sdkcorepipesjs-e-sdkcorepipecatalogjs)), se qualcuno lo vuole: un gestore può cambiare `args` o fermare l'avvio (l'errore è un avviso, non se `silent`), ma non `file` e `files`: quelli restano come li ha dati chi avvia. Un `args` che resta `null` torna `undefined`.
- `connectLauncher(wm)` restituisce `{ restore }`. `restore({ app, state, rect }, { workspace = wm.workspace })` ricrea la finestra di un'app com'era: chiama il suo export con `state` come `args` e la apre con `wm.open(win, { app, at: rect, workspace })`, senza spostare la camera. Restituisce una Promise con la finestra, o `null` se l'app non esiste, è nascosta nel workspace attuale o non parte.
- `setLaunchScope({ includes, center, bounds })`: stringe l'ambito in cui il launcher lavora (lo imposta `Workareas`). `includes(win)` → `boolean` dice quali finestre aperte contano come "la finestra dell'app" (una per app per ambito); `center(win)` → punto del mondo o `null` dove va una finestra nuova (`null`: il centro della vista); `bounds()` → rettangolo del mondo o `null` in cui deve restare. Predefinito: tutta la scrivania, nessun centro né limite. `openWindow` delle app (finestre secondarie) usa lo stesso centro e gli stessi limiti.

### Modulo di un'app

```js
// src/notes/NotesApp.js (nel repository ufficiale, per un'app di sistema)
import { Window, h } from '@lilos/sdk';

export default function createNotes({ args }) {
  const win = new Window({ title: 'Note', icon: 'pencil', width: 520, height: 380 });
  win.body.append(h('textarea', { class: 'notes' }));
  return win;
}
```

---

## apps/startup.js

Cosa parte da solo quando l'utente entra (Pannello di controllo → Avvio). Due eventi del bus (vedi [Eventi del bus](#eventi-del-bus)) segnano i momenti: `system:ready` (lilOS è su) e `user:login` (subito dopo). `connectStartup()`, chiamata da `system.js`, ascolta `user:login` e toglie dalla lista un'app quando viene rimossa dal registro.

All'ingresso, se `startupApps` è acceso, apre le app della lista **nell'ordine**, nel **workspace attuale**, ciascuna con i punti d'ingresso scelti. Salta le app nascoste in quel workspace o non più presenti, e i punti d'ingresso che non esistono più. Se un file o una cartella dei parametri non c'è più, quell'apertura è saltata con una notifica che lo dice.

- **Solo la prima scheda.** L'apertura avviene solo nella prima scheda dell'utente in questo browser: `navigator.locks.request('lilos:avvio:<id utente>', { ifAvailable: true })`, con il lucchetto tenuto finché la scheda è aperta. Le altre schede si aprono pulite. Senza Web Locks si apre sempre. Senza kernel l'id è `local`.
- **`?avvio=no`** nell'indirizzo salta l'avvio per quel caricamento (con un messaggio). È la via d'uscita se qualcosa all'avvio si blocca.

### `startup` (`@lilos/system`)

`Emitter` con l'evento `change` (la lista è cambiata).

| Membro | Cosa fa |
| --- | --- |
| `skipped` | `true` se l'indirizzo ha `?avvio=no` |
| `apps()` | La lista salvata, controllata: `[{ app, entries: [{ entry, params }] }]` |
| `windowEntries(appId)` | I punti d'ingresso di tipo finestra: `[{ entry, label, params }]`, `main` per primo; `label` è «Finestra principale» per `main`; `params` è lo schema del manifesto o `null`. `[]` se l'app non c'è |
| `checkParams(schema, values)` | Controlla i parametri e restituisce quelli da salvare. Lancia un errore leggibile se non sono validi. Vedi sotto |
| `addApp(appId)` | Aggiunge l'app in fondo, con `main` e senza parametri. Lancia «App non installata» se non ha finestre; non fa nulla se c'è già; massimo 50 app |
| `removeApp(appId)` | Toglie l'app dalla lista |
| `setEntry(appId, entry, on)` | Accende o spegne un punto d'ingresso (con `on` l'app entra in lista se manca). Spegnendo l'ultimo l'app esce dalla lista. I punti d'ingresso restano nell'ordine del manifesto |
| `setParams(appId, entry, params)` | Salva i parametri di un punto d'ingresso già acceso; se non sono validi lancia e non salva |

### Parametri

I parametri diventano gli `args` della finestra.

- **Il punto d'ingresso dichiara `params`** (nel manifesto, vedi [Manifesto](#manifesto-lilosjson)): ogni valore è controllato contro il suo tipo; valori non validi lanciano `<etichetta>: valore non valido`; valori vuoti o di un nome non dichiarato si scartano. All'apertura i mancanti prendono il `default`.
- **Non li dichiara**: un oggetto JSON qualsiasi, fino a 4 KB (`JSON.stringify`), passato così com'è.
- `file`: nell'`args` c'è l'id del file, e l'id è anche consegnato all'app (`files`), che lo può leggere e scrivere, anche se isolata. `folder`: l'id per le app di sistema; il percorso `~/…` per le app installate (il ponte lavora per percorsi, e serve un permesso `fs` che lo copra).

### Dati salvati

Chiave `startup-apps` (vedi [Dati salvati](#startup-apps)).

---

## apps/updates.js

Aggiornare le app mentre lilOS gira, senza lasciare in pagina codice vecchio. Il sistema lo collega all'avvio con `connectUpdates(wm, launcher)` (`system.js`); l'AppStore 1.4.0 e oltre lo usa per `Aggiorna`, `Aggiorna tutto` e `Reinstalla`. Decisione: [D46](../interna/decisioni.md#d46-aggiornare-le-app-ricaricamento-a-caldo-riavvio-solo-quando-serve). Testi in italiano (l'interfaccia di lilOS non è ancora tradotta).

### `updateApps(items, { from = null, reinstall = false } = {})` (`@lilos/system`)

`items`: `[{ id, run, restartOnUpdate? }]`. `run()` è l'aggiornamento vero (di solito `apps.update(id, …)`) e deve restituire lo stato dell'app; `restartOnUpdate` è quello della versione in arrivo, se si conosce già (il catalogo), per dirlo prima di cominciare. `from`: l'id dell'app che chiama; se è tra quelle da aggiornare si chiude e si riapre. `reinstall`: cambiano solo le parole dell'avviso.

Passi:

1. Per ogni app calcola cosa si chiuderà: le sue finestre in ogni workspace (`wm.windowsOfApp`, anche le secondarie con `owner`), se ha punti d'ingresso `service` o `background`, e se serve il riavvio (`restartOnUpdate` soddisfatto **e** `wasLoaded(id)`).
2. Se c'è qualcosa da chiudere o il riavvio è previsto, mostra l'avviso («Annulla» / «Chiudi e aggiorna»). Se l'utente annulla: restituisce `null`, nulla è cambiato.
3. Chiede, una alla volta, alle finestre con `canClose` (portando l'utente nel loro workspace). Se una dice no: avviso «Aggiornamento annullato», restituisce `null`.
4. Segna le app come in aggiornamento (`blockedLaunch` le blocca), chiude le finestre, ferma i background (`stopApp`).
5. Per ogni app: `await run()`, `await settled(id)`, poi controlla che il codice nuovo si carichi (`app.load()` per le app di sistema, `appCode` per le altre). Se non si carica, o `restartOnUpdate` si applica (con la versione di partenza), l'app resta in attesa del riavvio.
6. Se `from` era tra le app, riapre le sue finestre principali (`launcher.restore`) con il codice nuovo, a meno che aspetti il riavvio. Se qualche app aspetta il riavvio, mostra «Riavviare lilOS?».

Restituisce `[{ id, result } | { id, error }]` (un errore di un'app non ferma le altre) oppure `null`. Lancia se lilOS non è ancora pronto.

```js
import { updateApps } from '@lilos/system';
import { apps } from '@lilos/sdk';

const out = await updateApps(
  [{ id: 'acme.note', run: () => apps.update('acme.note') }],
  { from: 'appstore' },
);
if (out === null) console.log('annullato');
else for (const r of out) console.log(r.id, r.error ?? r.result.version);
```

### Riavvio

| Export | Descrizione |
| --- | --- |
| `requestRestart(reason, key = reason)` | Il sistema (o un'app di sistema) chiede il riavvio: per esempio l'AppStore dopo il riavvio del kernel per i moduli. Salva il motivo (stessa `key`: lo sostituisce), emette `updates` `change` e mostra subito «Riavviare lilOS?» (`Promise`, si risolve alla risposta). |
| `restartSystem()` | Chiede alle finestre con `canClose` (tutte, `wm.all()`) e ricarica la pagina (`location.reload()`); i workspace riaprono le finestre. `Promise<boolean>`: `false` se una ha rifiutato. |
| `updates` | `Emitter`. Evento `change`: cosa è in attesa è cambiato. `updates.pending()` → `[{ id, name, version, kind: 'reopen' \| 'restart', reason }]` (copie); `updates.restartReasons()` → `string[]` (i motivi di `requestRestart` e quelli delle app in attesa di riavvio). |
| `windowsMayClose()` | Chiede alle finestre con `canClose` (tutte, `wm.all()`) se possono chiudersi, come `restartSystem()` ma senza ricaricare. `Promise<boolean>`; `true` se il gestore delle finestre non c'è ancora. Non è in `@lilos/system`. |
| `restartKernel()` | Riavvia il kernel (solo amministratori). Chiede alle finestre come `restartSystem()` (`false` se una rifiuta), poi `kernel.flush()` e `kernelModules.restart()` (`POST /api/kernel/restart`), mostra la schermata opaca «Riavvio del sistema…», aspetta che il kernel smetta di rispondere e torni a rispondere (al massimo un minuto per fase) e ricarica la pagina. Lancia se il kernel rifiuta (per esempio non è stato avviato con `npm run kernel`). Non è in `@lilos/system`. |

Le funzioni `reopenApp(id)`, `askRestart()`, `blockedLaunch(id)` e `restartWanted(range, from)` sono esportate dal modulo ma **non** da `@lilos/system`.

### Aggiornamenti fatti altrove

Il modulo ascolta `registry` `change` e ricorda `{ version, build }` di ogni app. Se cambiano senza che `updateApps` sia in corso (un'altra scheda, un altro utente):

- se `restartOnUpdate` si applica e la pagina aveva eseguito il codice vecchio: l'app passa a `kind: 'restart'`, un avviso, e `blockedLaunch` la blocca fino al riavvio;
- altrimenti, se l'app ha finestre aperte qui (`windowsOfApp`): `kind: 'reopen'` e un avviso; `reopenApp(id)` le chiude (chiedendo prima), le riapre con il codice nuovo e toglie la voce;
- altrimenti non succede nulla: al prossimo avvio l'app è quella nuova.

Il pulsante nell'area di notifica è `createPendingUpdates()` (`taskbar/PendingUpdates.js`, classe `tb-bg tb-updates`, icona `download`, nascosto se non c'è nulla; rosso con `restart` quando ci sono motivi di riavvio). Il menu elenca «Riavvia *nome* (*versione*)» per le app `reopen` e, per i motivi di riavvio, i testi e «Riavvia lilOS».

---

## apps/packages/

Le app installate (pacchetti) nel sistema, di sistema e non. Panoramica: [README per sviluppatori](README.md#app-installate-pacchetti); ricetta: [Creare un'app installabile](ricette.md#creare-unapp-installabile-pacchetto); decisioni D35-D38 e D42.

### Manifesto `lilos.json`

Validato dal kernel (`system/kernel/src/apps/manifest.js`), che scarta i campi che non conosce.

| Campo | Significato |
| --- | --- |
| `id` | Minuscolo, cifre, punti e trattini, 2-64 caratteri (`acme.note`). È anche l'id nel registro. |
| `version` | `x.y.z`. |
| `kind` | `'local'` (codice del pacchetto: isolato in una sandbox o no a seconda di [come gira](#modalità-di-esecuzione-isolationjs); dentro lilOS se è un'app di sistema) o `'remote'` (un sito in un iframe, sempre isolato). |
| `name` | Nome mostrato, fino a 40 caratteri. In inglese: le altre lingue stanno nel file `locales` (chiave `@name`). |
| `icon?` | `{ glyph, color }`: nome di un simbolo (`icon()`) e colore `#rrggbb`. Predefiniti `help` e `#5f6673`. |
| `publisher` | `{ id, name, key? }`; `key` è la chiave pubblica Ed25519 (`ed25519:<base64>`). |
| `sdk` | `"1"` o `"2"` (accetta anche i numeri 1 e 2). Con `"1"` il codice dell'app gira in cima al suo modulo, con `lilos` globale, **solo isolato**, e può dichiarare `entrypoints` solo per `main` (per i suoi `params`) e i punti d'ingresso `service` (che non usano il suo modulo come app: il loro codice sta in un `file` a parte). Con `"2"` ogni punto d'ingresso è una funzione esportata dal modulo (vedi `entrypoints` e [Punti d'ingresso](#punti-dingresso-entrypointsjs)). |
| `description?` | Una frase che dice cosa fa (fino a 300 caratteri); la mostra l'AppStore. |
| `category?` | Dove l'AppStore la elenca: uno tra `system`, `productivity`, `media`, `development`, `other` (esportati come `CATEGORIES` da `manifest.js`). Se manca vale `other`; un altro valore rende il manifesto non valido. |
| `system?` | Solo `true`, e solo per app dal repository ufficiale ([D38](../interna/decisioni.md#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)): l'app gira **dentro lilOS, senza sandbox**, e può chiedere i permessi riservati. |
| `required?` | Solo `true`, e solo con `system`: l'app è necessaria a lilOS, non si rimuove né si nasconde. |
| `entry` | Solo `local`: uno dei file del pacchetto, un modulo ES. In un'app non di sistema ha tutto già dentro; un'app di sistema può avere più file (blocchi, worker, file `.wasm`) accanto all'entry. |
| `entrypoints?` | Solo app `local` (con `sdk` `"1"` solo `main`, per i suoi `params`, e i `service`; altrimenti il manifesto è rifiutato): le parti dell'app che altri possono avviare. Oggetto `{ nome: { kind, file?, label?, window?, params? } }`, al massimo 20. `nome`: `/^[a-z][a-zA-Z0-9]{0,30}$/`, ed è anche il nome dell'export da chiamare. `kind`: `'window'`, `'background'` (nel browser, a richiesta) o `'service'` (nel kernel, anche a lilOS chiuso; richiede il permesso `background`, altrimenti il manifesto è rifiutato; vedi [Servizi](#servizi-delle-app-appsappservicesjs)). `file?`: un `.js` o `.mjs` tra i `files` (predefinito `entry`). `label?`: fino a 60 caratteri (titolo della finestra, nome nella barra per un background). `window?`: `{ width, height }` (200-4000 × 150-4000), **solo per `window`**. `main` esiste sempre come finestra, anche se non è dichiarato; se è dichiarato deve essere `kind: 'window'`. `params?`: cosa accetta come `args`, perché lilOS possa chiederlo (Pannello di controllo → Avvio); vedi [Parametri dei punti d'ingresso](#parametri-dei-punti-dingresso). |
| `locales?` | Solo app `local`: un file `.json` tra i `files`, le traduzioni dell'app (formato e regole in [Traduzioni delle app](#traduzioni-delle-app-sdkcorelocalejs-e-sdkcorei18njs)). I testi del manifesto (`name`, `description`, `label` di comandi e punti d'ingresso, `name` dei widget, `label` e `description` dei parametri) sono **in inglese**; le chiavi `@` del file li traducono. Il kernel controlla il file all'installazione e all'aggiornamento e lo rifiuta se non è valido; un `locales` in un'app `remote` fa rifiutare il manifesto. Senza `locales` l'app resta in inglese. |
| `styles?` | Solo app di sistema: fogli di stile `.css` del pacchetto (fino a 10, tra i `files`) che lilOS carica insieme all'app. |
| `files` | `{ percorso: 'sha256-<base64>' }`: ogni file del pacchetto (fino a 1000, percorsi di fino a 16 livelli con `[\w.-]`). Lo riempie `pack.js` (o, nel repository ufficiale, `scripts/build.mjs`). |
| `url` | Solo `remote`: `https://…` (o `http://localhost`). Non può avere l'origine di lilOS. |
| `libraries?` | `[{ name, version, url, integrity: 'sha384-…', cache? }]`, fino a 30, solo `https`. Con `cache: true` il kernel la scarica una volta in `/system/commons` e la dà inline; senza, il browser la carica dall'`url` (che entra nella CSP). |
| `permissions?` | Elenco di permessi (fino a 50), vedi sotto. |
| `contributes?` | `window: { width, height }` (200-4000 × 150-4000); `fileTypes: [estensione]` (fino a 50); `commands: [{ id, label, keys? }]` (fino a 30, l'`id` inizia con l'id dell'app + `.`, `keys` fino a 3 e richiede `ui.shortcuts`); `widgets: [{ id, name, width, height }]` (fino a 10, richiede `desktop.widget`; **validati ma non mostrati**); `pipes`, `events`, `actions`, `menus`, `badge`, `automation` (vedi sotto). |
| `install?`, `update?`, `uninstall?` | Operazioni, vedi sotto. `update`: `[{ from: '<1.2.0', ops: [...] }]` (`from`: `<x.y.z`, `<=x.y.z` o `x.y.z`). |
| `lilos?` | Le versioni di lilOS con cui l'app funziona: un limite (`'>=1.8.0'`) o due separati da uno spazio (`'>=1.8.0 <2.0.0'`); operatori `>=`, `>`, `<=`, `<`, `=` (senza operatore vale `=`), versione `x.y.z`. Il kernel non installa né aggiorna l'app su una versione di lilOS fuori intervallo (`conflict`), e non aggiorna lilOS a una versione che lascerebbe fuori un'app installata. Senza il campo conta solo `sdk`. |
| `restartOnUpdate?` | `true` o un intervallo come `update.from` (`'<2.0.0'`, `'<=1.2.0'`, `'1.2.0'`): aggiornando a questa versione lilOS propone di riavviarsi. Con un intervallo vale solo se si arriva da una versione che lo soddisfa. Conta solo se la pagina ha già eseguito il codice vecchio dell'app. Altro: manifesto non valido. Da usare solo quando il ricaricamento a caldo non basta (stato condiviso nella pagina, moduli tenuti da altri): vedi [apps/updates.js](#appsupdatesjs). |
| `signature?` | `ed25519:<base64>` sul manifesto senza `signature`, con le chiavi in ordine. |

**`contributes.pipes`** (solo app `local`, `sdk` `"2"`; fino a 30): le pipe a cui l'app è iscritta anche quando non gira. `[{ event, stage, entry, position?, where? }]`: `event` un evento del catalogo ([pipes](#sdkcorepipesjs-e-sdkcorepipecatalogjs)), `stage` `'before'` o `'after'`, `entry` un punto d'ingresso `background` (lilOS lo avvia quando l'evento arriva), `position` `'first'`, `'middle'` (predefinito) o `'last'`, `where` come in `pipes.subscribe`. Serve il permesso `pipe:<evento>` (o `pipe.own:<evento>` se `where` è `{ meta: 'own' }`); gli eventi protetti solo alle app di sistema. Il punto d'ingresso dà la funzione con `lilos.pipes.subscribe(evento, { stage }, fn)` quando parte. Per gli eventi che l'app dichiara in `contributes.events` non serve nessun permesso.

**`contributes.events`** (fino a 20): gli eventi dell'app, nel catalogo delle pipe da quando l'app è installata, così le altre app possono iscriversi (anche dal manifesto) prima che giri. `[{ name, label, description?, edit?, stop? }]`: `name` è `<id app>.<una parola>` (`acme.notes.saved`; la parola `/^[a-z][a-zA-Z0-9]{0,40}$/`), senza doppioni; `label` fino a 80 caratteri e `description` fino a 300, tradotte con `@events.<nome>.label` e `@events.<nome>.description` di `locales`; `edit` `{ before?: [campo], after?: [campo] }`, fino a 20 nomi `\w{1,40}` per fase (non `__proto__`, `constructor`, `prototype`); `stop: true` se i gestori lo possono fermare. L'app li fa partire con `lilos.pipes.run`; chi si iscrive da un'altra app chiede `pipe:<nome>`. Una nuova versione che toglie un evento lo toglie dal catalogo con le iscrizioni a esso; rimuovere l'app toglie tutti i suoi eventi. `lilos.pipes.define` resta per gli eventi che nascono mentre l'app gira e conta nello stesso limite di 20.

**`contributes.actions`** (richiede `ui.menus`; fino a 20): voci nel menu di file e cartelle. `[{ id, label, entry, on, glyph?, when?, many?, menu? }]`: `id` inizia con l'id dell'app e un punto; `label` fino a 60 caratteri; `entry` `'main'` o un punto d'ingresso dell'app che non sia un `service`; `on` `'file'`, `'folder'` o `'item'` (entrambi); `glyph` un simbolo; `when` `{ meta?: 'own' \| 'none', ext?: [estensione], notExt?: [estensione], net?: [protocollo] }` (`'own'` solo per i nodi con dati dell'app, `'none'` solo per gli altri; `ext` solo i file con quelle estensioni, `notExt` tutto tranne loro; `net` solo i nodi dentro una connessione di Rete di quei protocolli, fino a 20 nomi `[a-z][a-z0-9-]{0,30}`, per esempio `['sftp']`: fuori dalla Rete la voce non compare); `many: true` la voce compare anche con più elementi selezionati; `menu` l'id di uno dei suoi `contributes.menus`: la voce sta in quel sottomenu. Il punto d'ingresso riceve `{ files: [id], action: id }` e può leggere e scrivere quei file.

**`contributes.menus`** (fino a 10): sottomenu che raccolgono le azioni dell'app. `[{ id, label, glyph? }]`: `id` inizia con l'id dell'app e un punto, uno per menu; `label` fino a 60 caratteri; `glyph` un simbolo (quello dell'app se manca). Un sottomenu compare solo se almeno una delle sue azioni vale per gli elementi scelti. Un lilOS precedente ignora `menu` e mostra le azioni una per una, ma rifiuta un manifesto con `when.notExt`. Esempio (l'app Zip): `"menus": [{ "id": "zip.compress", "label": "Compress", "glyph": "archive" }]` con le azioni `zip.zip` (`on: 'item'`, `when: { notExt: ['zip'] }`) e `zip.unzip` (`on: 'file'`, `when: { ext: ['zip'] }`), entrambe con `menu: 'zip.compress'`.

**`contributes.badge`**: `{ glyph, label }` (`label` fino a 40 caratteri), il segno che lilOS mette sull'icona dei nodi su cui l'app ha dati (`node.apps[id]`).

**`contributes.automation`** (solo `local`; fino a 30): le azioni dell'app che l'utente può registrare e rifare con Automata ([automation](#sdkcoreautomationjs)). Non serve un permesso. `[{ id, label, target?, entry?, result?, confirm?, description?, params? }]`:

- `id`: `<id app>.<una parola>` (`photo.resize`); `label` fino a 60 caratteri; `description` fino a 300.
- Come si rifà: **`target: 'window'`** (solo questo valore; la rifà una finestra dell'app con `automation.handle`, quindi solo un'app di sistema, che usa l'SDK) oppure **`entry`** (`'main'` o un punto d'ingresso `window` o `background` dell'app, mai un `service`), chiamato con `{ automation: { action, params }, files }`. Ci vuole l'uno o l'altro, non tutti e due.
- `result: 'file'`: l'azione crea un file. `confirm: true`: di serie il passo chiede conferma.
- `params`: come i parametri dei punti d'ingresso (fino a 10; vedi [Parametri dei punti d'ingresso](#parametri-dei-punti-dingresso)), ma con in più i tipi `files` e `secret` (mai salvato: si chiede ogni volta; non ha valore predefinito) e il campo `subject: true`, che segna ciò su cui lavora il passo. Un parametro `file`, `files` o `folder` riceve l'id di un nodo.
- Traduzioni: `@automation.<id>.label`, `.description`, `@automation.<id>.params.<param>.label`, `.description` e `.options.<valore>.label`.

Per registrare e rifare vedi la ricetta [Rendere registrabile un'azione della tua app](ricette.md#rendere-registrabile-unazione-della-tua-app).

Un manifesto non può superare 256 KB.

### Permessi

Un permesso è `nome` oppure `nome:parametro`. Un permesso non nell'elenco, o con il parametro sbagliato, fa rifiutare il manifesto. Livelli: **implicit** (dato senza chiedere), **install** (lo concede chi installa, con `grant`), **use** (concesso all'installazione e da richiedere all'utente a ogni uso; **oggi non si chiede**), **reserved** (solo `system: true`).

| Permesso | Livello | Significato | Effetto oggi |
| --- | --- | --- | --- |
| `fs.app`, `fs.tmp` | implicit | I propri dati / file temporanei | `lilos.storage` funziona sempre; `tmp` non ha ancora funzioni |
| `fs.open` | implicit | I file che l'app apre | L'app può leggere e scrivere il file con cui è stata aperta |
| `fs.read:<~/percorso>` | install | Leggere i file in quel percorso | `lilos.files.read` e `list` |
| `fs.write:<~/percorso>` | install | Leggere e modificare i file in quel percorso | `lilos.files.*` |
| `fs.preview` | install | Chiedere l'anteprima dei file all'app che li apre | `lilos.files.preview`, solo per i file che l'app può già leggere (vedi [Anteprima dei file fatta dalle app](#anteprima-dei-file-fatta-dalle-app-filepreviewjs)) |
| `tags.read`, `tags.write` | install | Vedere / creare e assegnare tag | `tags.write` serve all'operazione `tag` |
| `desktop.items` | install | Mettere elementi sulla scrivania | Serve all'operazione `desktopItem` |
| `desktop.widget` | install | Mostrare widget | Nessuno (i widget non si mostrano) |
| `ui.notify` | implicit | Mostrare avvisi e notifiche | `lilos.ui.notify` (e il vecchio nome `lilos.ui.toast`) |
| `ui.menus` | install | Aggiungere voci ai menu | Le voci di `contributes.actions` nel menu di file e cartelle (senza il permesso il manifesto è rifiutato) |
| `ui.commands` | install | Aggiungere comandi | Nessuno (i comandi si registrano comunque da `contributes.commands`) |
| `pipe:<evento>` | install | Vedere e cambiare ciò che passa da quell'evento | `lilos.pipes.subscribe` e `contributes.pipes` su quell'evento, per ogni elemento. Gli eventi protetti solo per le app di sistema; la fase `before` di un evento immediato per nessuna app |
| `pipe.own:<evento>` | install | Lo stesso, solo per i file che l'app ha segnato | Come `pipe:` ma con `where: { meta: 'own' }` |
| `ui.shortcuts` | install | Scorciatoie da tastiera | Richiesto da `commands[].keys` |
| `clipboard.write` | implicit | Copiare negli appunti | `lilos.clipboard.write` |
| `clipboard.read` | use | Leggere gli appunti | Nessuno |
| `net:<origine>` | install | Collegarsi a un sito (`https://api.esempio.it`, senza percorso) | Apre `connect-src` della CSP |
| `term` | install | Aprire terminali remoti (SSH, Telnet…) e usare gli host salvati | `lilos.term.*` e l'evento `term`. Le sessioni collegano il computer del kernel a server scelti dall'app, e con un host salvato usano la sua password: da concedere con cautela. Valgono le regole di rete della cartella Rete (`net/guard.js`) |
| `serial` | install | Usare le porte seriali e USB del computer dell'utente | `lilos.serial.*` e l'evento `serial`. Un'app con il permesso parla con qualunque dispositivo l'utente le fa scegliere (può anche riprogrammare una scheda): da concedere con cautela. Il browser chiede comunque all'utente quale porta, una volta per porta e per sito |
| `kernel:<modulo>` | install | Usare un modulo del kernel (per esempio `kernel:arduino`) | `lilos.kernel.request` e `lilos.kernel.channel` verso gli endpoint e i WebSocket di quel modulo (`ctx.route`, `ctx.socket`). Il parametro è il nome del modulo, `[a-z][a-z0-9-]{0,40}`. Cosa può fare chi lo chiama lo decide il modulo: da concedere solo per moduli di cui ci si fida |
| `media.camera`, `media.microphone`, `geo` | use | Fotocamera, microfono, posizione | Nessuno (l'iframe non ha `allow`) |
| `apps.call:<id app>` | install | Usare le azioni di un'altra app | `lilos.apps.call(<id app>, entry, data)`. Per i propri punti d'ingresso (`lilos.app.call`) non serve. Dentro: **un'app passa a un'altra un `file` solo se l'ha ricevuto lei** (aperto con l'app o passatole); gli altri dati arrivano così come sono e chi li riceve deve controllarli |
| `ai.use`, `ai.expose` | install | Usare l'intelligenza artificiale / esporre le proprie azioni | Nessuno |
| `background` | install | Lavorare anche a lilOS chiuso | Serve ai punti d'ingresso `service`, che girano nel kernel (senza il permesso il manifesto è rifiutato). Non c'entra con i punti d'ingresso `background`, che non richiedono permessi e girano solo finché lilOS è aperto |
| `auth.remote` | implicit | Accedere al proprio servizio (app remote) | Nessuno: il token non c'è |
| `fs.workspaces`, `apps.manage`, `workspaces.manage`, `settings.system` | reserved | Funzioni di sistema | Nessuno: le app di sistema non passano dal ponte, usano `@lilos/system` e l'SDK; i permessi servono a farne accettare il manifesto e a descriverle |

I percorsi sono nella forma `~/Documenti/Note`: `~` è la radice del file system dell'utente. `fs.read:~` o `fs.write:~` coprono tutto. Il confronto non distingue le maiuscole e non esce dalla cartella indicata.

### Operazioni

Le operazioni di `install`, `update` e `uninstall` (fino a 100 ciascuna) lilOS le esegue per l'utente la prima volta che incontra l'app, senza sovrascrivere. I percorsi cominciano con `~` e non contengono `..`.

| `op` | Campi | Che cosa fa | Permesso richiesto |
| --- | --- | --- | --- |
| `mkdir` | `path` | Crea la cartella e quelle mancanti del percorso | `fs.write` su `path` |
| `write` | `path`, `text` (fino a 64 KB) | Crea il file con quel testo, se non esiste | `fs.write` su `path` |
| `copy` | `from` (un file del pacchetto), `to` | Crea il file copiando dal pacchetto, se non esiste | `fs.write` su `to` |
| `desktopItem` | `target`: `'app'` (per ora l'unico valore accettato) | Mette sulla scrivania del workspace attuale il collegamento all'app, se non c'è già | `desktop.items` |
| `tag` | `name`, `color?` | Crea il tag, se non esiste | `tags.write` |
| `setting` | `key`, `value` | Imposta `app:<id>:<key>` nei dati dell'utente, se non c'è | — |
| `remove` | `path`, `ask?` | Solo in `uninstall`: porta nel Cestino quel percorso, se esiste | `fs.write` su `path` |

Ciò che l'app ha creato per un utente è scritto nella chiave `app-setup` di quell'utente: `{ [id]: { version, name, made, uninstall } }`. Quando l'app non c'è più `undo` toglie ciò che aveva creato: i nodi non toccati (file con la data di modifica uguale, cartelle vuote) si eliminano, gli altri vanno nel Cestino, i tag non usati si tolgono, le impostazioni e le chiavi `app:<id>:*` si cancellano.

### `window.lilos` (`bridge.js`)

L'unico modo che un'app `local` ha di raggiungere lilOS (un'app non isolata potrebbe aggirarlo: vedi [Modalità di esecuzione](#modalità-di-esecuzione-isolationjs)). L'oggetto è lo stesso in ogni modo di girare: `lilosApi()` lo costruisce attorno a una funzione `call(metodo, ...parametri)`. Nella sandbox `call` manda un messaggio alla pagina di lilOS (`BRIDGE_SOURCE`, finestre) o passa da una `MessagePort` (`SANDBOX_RUNTIME_SOURCE`, background isolato); in un Web Worker (background non isolato) passa da una `MessagePort`; in una finestra non isolata è una chiamata diretta. Ogni richiesta la controlla `methods.js` contro i permessi e restituisce una `Promise`; un errore (permesso negato, file inesistente, valore troppo grande) la rifiuta con `Error(message)`.

Un'app con `sdk` `"2"` esporta una funzione per punto d'ingresso, e la riceve con questo oggetto:

```js
// finestra: root è dove disegnare (uno Shadow DOM se non isolata, il body della sandbox se isolata)
export async function main({ lilos, root, args }) {
  root.append(/* … */);
  return () => { /* chiamata alla chiusura della finestra (facoltativo) */ };
}

// punto d'ingresso in background (kind: 'background'), senza `root`
export function stats({ lilos, args }) {
  lilos.handle(async (data, { from }) => ({ ok: true }));
}
```

Con `sdk` `"1"` il modulo è l'app: gira per intero all'avvio con `window.lilos` e solo in una sandbox.

| Funzione | Descrizione |
| --- | --- |
| `lilos.app` | `{ id, version, entry, args, call, connect, keepAlive }`: `entry` è il punto d'ingresso in esecuzione; `args` è ciò con cui è stato avviato (per un file, `{ file: id }`), o `null`. |
| `lilos.app.call(entry, data)` → risultato | Avvia un punto d'ingresso **della stessa app**. Una finestra si apre (o torna in primo piano) con `data` come `args` e il risultato è `null`; un background risponde con ciò che restituisce la sua funzione di `lilos.handle`. `data` è copiato (clone strutturato); se contiene `file`, quel file (e ogni id di `files`, al massimo 100) deve essere uno che l'app ha ricevuto. |
| `lilos.app.connect(entry)` → `MessagePort` | Un canale con un punto d'ingresso **in background** della stessa app; l'altro lato lo riceve come evento `connect`. Per trasmettere dati continui o grandi senza passare da una chiamata per volta. |
| `lilos.app.keepAlive(attivo)` | Solo in un background. Con `true` (predefinito) non si ferma dopo i 5 minuti senza chiamate e compare nell'area di notifica della barra delle applicazioni (icona delle app in background), da dove l'utente lo può fermare; con `false` torna normale. Fermarlo cancella ciò che teneva in memoria. |
| `lilos.apps.call(app, entry, data)` → risultato | Come `lilos.app.call`, per un punto d'ingresso **di un'altra app**. Serve il permesso `apps.call:<id app>`. L'app deve essere installata e visibile nel workspace attuale. Un `file` (o i `files`, al massimo 100) si può passare solo se l'app lo ha ricevuto; ogni altro dato arriva così com'è e **chi lo riceve deve controllarlo** (la forma, i tipi, le dimensioni). |
| `lilos.handle(fn)` | Solo in un background: `fn(data, { from })` risponde alle chiamate; `from` è l'id dell'app che chiama (`null` se è il sistema). Il valore restituito, o `null`, torna a chi ha chiamato. Senza `handle` le chiamate falliscono. Un `file` ricevuto nei dati si può leggere e scrivere con `lilos.files` come se l'app fosse stata aperta con lui. |
| `lilos.locale` | `{ code, i18n: { t(chiave, params?), lang, date(valore, opzioni?), number(valore, opzioni?) } }`: la lingua del sistema e le stringhe dell'app per quella lingua, già risolte (a differenza del resto di `lilos`, **sincrono**). Non richiede permessi. Vedi [`lilos.locale`](#liloslocale). |
| `lilos.on(evento, fn)` → `off` | Eventi: `launch` (nuovi argomenti, a finestra già aperta), `command` (`id` di un comando di `contributes.commands`, quando l'utente preme la sua scorciatoia; solo nelle finestre), `theme` (i token di colore sono cambiati; nella sandbox il bridge li applica da solo a `:root`), `connect` (`MessagePort`, in un background: qualcuno ha chiamato `lilos.app.connect`), `locale` (`{ code, lang }`: la lingua del sistema è cambiata e `lilos.locale` ha già le nuove stringhe; non nei servizi), `term` (`'hosts'` o `'sessions'`: sono cambiati gli host salvati o le sessioni, anche per colpa di un'altra pagina dello stesso utente; solo per le app con il permesso `term`), `serial` (`'ports'`: una porta autorizzata si è collegata o scollegata; solo per le app con il permesso `serial`). |
| `lilos.window.setTitle(testo)` | Titolo della finestra (fino a 100 caratteri). Solo in una finestra: in un background fallisce. |
| `lilos.window.close()` | La finestra si chiude, come con il suo pulsante. Solo in una finestra. |
| `lilos.ui.toast(testo)` | Vecchio nome di `lilos.ui.notify(testo)`: una notifica firmata con l'app, con livello `info` e gli stessi limiti (compreso quello al minuto). Non c'è più un avviso breve in basso. |
| `lilos.ui.notify(testo \| { text, level, action })` | Una **notifica** nell'area di notifica, conservata nella finestra Notifiche ([`notifications`](#notifications), [`notifications-basic`](#notifications-basic_100)). `text`: fino a 300 caratteri, non vuoto. `level`: `'info'` (predefinito), `'success'`, `'warning'` o `'error'`. `action`: `{ entry?, args? }` (`entry` `'main'` se manca, nella forma dei nomi del manifesto): un clic apre l'app a quel punto d'ingresso con `args` (JSON, al massimo 4096 caratteri con il kernel); `file` e `files` degli `args` il sistema li **toglie**. Il mittente (id e nome dell'app) lo mette lilOS: l'app non può indicarlo né fingersi un'altra. Vale nelle finestre e nei background; al massimo 10 notifiche al minuto per app, poi la promessa rifiuta con `rate_limited`. Un testo vuoto o un livello sbagliato la fanno rifiutare. Serve il permesso `ui.notify`, che tutte le app hanno. Per i servizi nel kernel c'è la stessa funzione ([Servizi delle app](#servizi-delle-app-appsappservicesjs)). |
| `lilos.files.read(rif, { bytes? })` → testo \| `Blob` | `rif`: `~/percorso` (coperto da `fs.read` o `fs.write`) oppure l'id di un file con cui l'app è stata aperta. Con `bytes: true` un `Blob`. Passa da `file.read` (i gestori delle altre app possono cambiare il contenuto; i propri no). |
| `lilos.files.write(rif, dati, { mark? })` | Scrive testo (fino a 10 milioni di caratteri) o byte (`Blob`, `ArrayBuffer`, array tipizzato, fino a 10 MiB); crea il file se la cartella esiste. Serve `fs.write`. Passa da `file.write`. Se `options` ha `mark` (anche `null`) i dati propri dell'app sul file (`setMeta`) si salvano insieme al contenuto: `null` li toglie. Un `mark` con `content: true` è permesso solo a un'app con `pipe:` o `pipe.own:` sia su `file.read` sia su `file.write` («Permesso negato…»). |
| `lilos.files.info(rif)` → `{ id, name, type, size, modified, path, meta }` | Il nome e i dati propri dell'app su quel file (`meta`, o `null`). Serve poter leggere `rif`. |
| `lilos.files.setMeta(rif, valore)` | I dati propri dell'app sul file (un oggetto di al massimo 1 KB di JSON; `null` li toglie). Serve poter scrivere `rif`. Con `content: true` (stesso permesso di `mark`, vedi sopra) la cronologia di annulla perde il contenuto del file. |
| `lilos.files.open(id)` | Apre con la sua app un file che l'app ha ricevuto (passando da `file.open`). Un altro id: errore. |
| `lilos.files.locked(ids)` → quanti | Dice che l'app ha richiuso questi file (solo quelli ricevuti e con dati dell'app): lilOS chiede di chiudere le finestre che li mostrano (come con il pulsante di chiusura: chi ha modifiche non salvate chiede prima). |
| `lilos.files.shown(ids)` → `[id]` | Quali di questi file (solo quelli ricevuti) sono mostrati in una finestra ora. Serve a non bloccarli per inattività mentre sono in uso. |
| `lilos.files.preview(rif, { size? })` → `{ app, text, html o image, note }` o `null` | L'anteprima del file fatta dall'app che lo apre (il suo `filePreview`). Serve `fs.preview` e poter leggere `rif`. Vedi [Anteprima dei file fatta dalle app](#anteprima-dei-file-fatta-dalle-app-filepreviewjs). |
| `lilos.files.list(percorso)` → `[{ name, type, size, modified }]` | Contenuto di una cartella (`fs.read` o `fs.write`). |
| `lilos.files.mkdir(percorso)` | Crea una cartella (la cartella che la contiene deve esistere; se c'è già non fa nulla). Serve `fs.write`. |
| `lilos.pipes.subscribe(evento, { stage = 'after', position = 'middle', where }, fn)` → `Promise<off>` | Iscrive la parte dell'app (finestra o background) a un evento ([pipes](#sdkcorepipesjs-e-sdkcorepipecatalogjs)). `fn(data, ctx)` (anche asincrona) restituisce niente, `{ data }` o `{ stop: { error, silent } }`. Serve `pipe:<evento>` o `pipe.own:<evento>` con `where: { meta: 'own' }`. Dura finché la parte gira. Un file segnato dall'app che arriva nei dati si può leggere e scrivere. |
| `lilos.pipes.define(nome, { label, description, edit, stop })` | Dichiara un evento dell'app, `<id app>.<una parola>` (al massimo 20 per app, contando quelli di `contributes.events`). `edit` `{ before: [campo], after: [campo] }`: i nomi `__proto__`, `constructor` e `prototype` si scartano. Esiste solo da quando l'app lo chiama: per un evento a cui altre app si iscrivono dal manifesto, meglio `contributes.events`. |
| `lilos.pipes.run(nome, dati)` → dati | Fa passare un evento dell'app dalle pipe e restituisce i dati dopo i gestori. Solo i propri eventi; un valore che non è un oggetto diventa `{ value }`. |
| `lilos.automation.record(id, { params, defaults?, file?, result? })` → `Promise<boolean>` | Dice che l'utente ha fatto un'azione di `contributes.automation`, perché Automata la registri (`true` se è stata registrata; non succede niente se nessuno registra). Non serve un permesso. `id` deve essere un'azione dell'app (`<id app>.…`), altrimenti errore. `params` ha i valori scelti (quelli non validi per il tipo si scartano; un `secret` non si tiene mai); `defaults` i valori che la finestra proponeva (quelli diversi sono i «cambiati»); `file` il file su cui ha lavorato; `result` l'id (o gli id) di ciò che ha fatto. **I file nominati** (`file` e i parametri `file`, `files`, `folder`) devono essere file che l'app ha ricevuto: altrimenti errore `Si possono nominare solo file aperti con l’app`. Di `result` si tengono solo gli id ricevuti o dentro un percorso che l'app può scrivere. |
| `lilos.automation.recording()` → `Promise<boolean>` | `true` mentre l'utente registra (e non è in pausa). Per evitare lavoro inutile. |
| `lilos.storage.get(chiave)` → valore o `null` | Dati propri dell'app per l'utente. Chiavi `[\w.-]{1,64}`; salvati come `app:<id>:<chiave>`. |
| `lilos.storage.set(chiave, valore)` | Fino a 256 KB di JSON per valore. |
| `lilos.clipboard.write(testo)` | Copia negli appunti. |
| `lilos.term.load()` → `{ protocols, encodings, hosts, sessions }` | I terminali remoti dell'utente: i protocolli dei moduli del kernel, le codifiche, gli host salvati e le sessioni aperte. Serve il permesso `term` (vale per tutti i metodi `lilos.term.*`). Le forme sono quelle di [`term`](#sdkcoretermjs). |
| `lilos.term.saveHost(id \| null, config, secret?)` → host | Crea (`id` `null`) o cambia un host salvato. `config`: `{ name, folder, protocol, values, settings, remember?, forget? }`; `secret`: `{ chiave: valore }` dei campi segreti (la password). |
| `lilos.term.removeHost(id)` | Toglie un host salvato. |
| `lilos.term.open({ host, cwd? } \| { protocol, values, secret?, sealed?, settings?, name?, cwd? })` → sessione | Apre una sessione (non ancora collegata: si collega quando una finestra la mostra con `attach`). `{ host }` è l'id di un host salvato; con `{ protocol, values }` è una connessione rapida. `secret` (oggetto), `sealed` (stringa), `name` (stringa) e `cwd` (cartella assoluta del server) passano al kernel. Senza `secret` né `sealed` si usa la password di un host salvato per lo stesso server e utente; se non c'è, la chiede il terminale. |
| `lilos.term.seal({ host } \| { protocol, values, secret })` → `sealed` | La password cifrata dal kernel per un file `.term` (vedi `seal` di `term`). Vale solo per questo utente e questo lilOS. |
| `lilos.term.openHere(id)` → sessione | SSH sul server della connessione SFTP in cui sta il file o la cartella `id`, nella sua cartella (per la voce con `when.net: ['sftp']`). `id` deve essere un nodo ricevuto dall'app (aperto con l'app o passato da una sua azione); altrimenti errore. Con una connessione di altro tipo: errore. |
| `lilos.term.close(id)` | Chiude la sessione (la connessione finisce) e la dimentica. |
| `lilos.term.attach(id, { cols, rows })` → `MessagePort` | Il canale dello schermo e dei tasti di una sessione. **Solo nelle finestre.** È la **pagina** di lilOS ad aprire il WebSocket verso il kernel, l'app isolata non lo vede: riceve una porta già collegata. Il formato dei messaggi è in [`term`](#sdkcoretermjs). I canali si chiudono con la finestra (le sessioni restano). |
| `lilos.serial.supported()` → `boolean` | Se il browser può usare le porte seriali (vedi [`serial`](#sdkcoreserialjs)). Serve il permesso `serial`. |
| `lilos.serial.ports()` → `[port]` | Le porte già autorizzate e collegate: `{ id, usbVendorId, usbProductId }`. |
| `lilos.serial.request({ filters? })` → `port \| null` | Fa scegliere una porta all'utente. **Solo nelle finestre**, e subito dopo un clic o un tasto. Al massimo 50 filtri. |
| `lilos.serial.forget(id)` | Il browser dimentica la porta. Solo nelle finestre. |
| `lilos.serial.open(id, options)` → `MessagePort` | Apre la porta (opzioni e formato dei messaggi in [`serial`](#sdkcoreserialjs)). **Solo nelle finestre.** La porta la apre la **pagina** di lilOS e l'app riceve un canale già pronto, come con `lilos.term.attach`. I canali si chiudono con la finestra. |
| `lilos.kernel.request(modulo, metodo, percorso, corpo?)` → JSON | Una richiesta a `/api/modules/<modulo><percorso>`. `metodo`: `GET`, `POST`, `PUT` o `DELETE` (altrimenti «Metodo non valido»). Serve il permesso `kernel:<modulo>` (altrimenti «Permesso negato: kernel:…»). Lancia gli errori di `kernel.request`. |
| `lilos.kernel.channel(modulo, percorso)` → `MessagePort` | Un WebSocket di un modulo (`kernel.module(modulo).channel`, messaggi fino a 16 MiB). **Solo nelle finestre.** I canali si chiudono con la finestra. |

I percorsi sono quelli che l'utente vede dal workspace attuale: `~/Scrivania` è la scrivania del workspace in cui l'app gira. Le variabili di tema (`--accent`, `--text`, `--surface`…) sono disponibili nei CSS dell'app. Le scorciatoie arrivano come `command` con i tasti scelti dall'utente nel Pannello di controllo.

### `packages.js`

- `registerPackages()` → `Promise`: prima dei workspace, legge il file di traduzioni di ogni app (`manifest.locales`, controllato con il suo hash; se manca o non è valido l'app resta in inglese e c'è un messaggio in console) e mette ogni app installata nel registro. Si aspetta con `await`. Per ogni app crea la voce con `name` e `text` (il manifesto tradotto) che seguono la lingua del sistema, `system` = `required`, `trusted` = `system`, e `load`: per un'app di sistema `local` è `loadSystemApp`, per le altre `packageModule`.
- `loadSystemApp(pkg)` (interna): per ogni foglio di `styles` aggiunge un `<link rel="stylesheet" data-app="<id>">` (e toglie quelli di una versione precedente), poi fa `import()` di `/api/apps/<id>/v/<versione>+<build>/<entry>`. `build` è `buildOf(pkg)`: l'impronta FNV-1a (in base 36) degli hash dei file del manifesto. Il percorso contiene versione e build, quindi i blocchi, i worker e i file che il modulo carica con percorsi relativi si risolvono accanto a lui, e il browser li tiene in cache per sempre (`immutable`): il browser non riusa mai un modulo vecchio, nemmeno reinstallando la stessa versione con file diversi (cambia il build, quindi l'indirizzo). Il kernel accetta `+<build>` e lo ignora. Alla rimozione di un'app i suoi fogli di stile si tolgono.
- `buildOf(pkg)` → `string`: il build di un pacchetto (vedi sopra). `matchesFrom(range, version)` → `boolean`: `version` rispetta `'<1.2.0'`, `'<=1.2.0'` o `'1.2.0'`? (la usano `update.from` e `restartOnUpdate`).
- `wasLoaded(id)` → `boolean`: questa pagina ha eseguito il codice dell'app (una versione qualsiasi). `settled(id)` → `Promise`: si risolve quando l'ultimo cambiamento dell'app (installata, aggiornata, tolta) è nel registro.
- `connectPackages({ desk })` → `Promise`: dopo l'avvio, segue `apps` (`change`: legge le traduzioni, poi aggiunge, sostituisce o toglie nel registro, un cambiamento dopo l'altro per ogni app; togliendo scarica anche le traduzioni) e fa le operazioni per l'utente. Apre anche `EventSource('/api/apps-events')`: a ogni evento `change` (con 150 ms di attesa per raggruppare) chiama `apps.refresh()`, così le app cambiate da altri utenti, da altre schede o da altri programmi arrivano nel registro; se il flusso si riconnette (il kernel è ripartito) rilegge l'elenco; si chiude all'uscita dell'utente. Senza kernel non fa nulla. `desk()` dà l'id della Scrivania del workspace attuale.

### Modalità di esecuzione (`isolation.js`)

Un'app installata gira in due modi. **Isolata** (il predefinito): le finestre sono in un `<iframe sandbox="allow-scripts">` e i background in un iframe `sandbox` nascosto; l'app raggiunge lilOS solo con `lilos`, e solo nei limiti dei permessi. **Non isolata**: la finestra gira nella pagina di lilOS, disegnata in uno Shadow DOM, e il background in un Web Worker con l'origine di lilOS. Più veloce, ma l'app **può fare tutto ciò che può fare l'utente** (leggere ogni file e ogni dato di lilOS, chiamare il kernel con la sua sessione), permessi o no: i permessi non la limitano più.

La modalità la sceglie un amministratore: una regola generale (la cartella `/system/app/.security`, `meta.security.isolated`, vedi [rotte del kernel](#il-kernel); nel Pannello di controllo → App → Sicurezza) e, per una sola app, una scelta propria (`isolated` nello stato dell'app; "Proprietà…" → Sicurezza). La scelta dell'app, se c'è, vince.

`executionMode(pkg)` → `{ mode, fixed, reason?, own? }`:

| `mode` | Quando | `fixed` |
| --- | --- | --- |
| `'system'` | App di sistema: gira sempre dentro lilOS, senza sandbox | `true` |
| `'remote'` | App `remote`: un sito in un iframe, sempre isolato | `true` |
| `'isolated'` | App con `sdk` `"1"` (solo isolata, `fixed: true`), oppure `sdk` `"2"` con la regola (o la scelta) isolata | `false` per `sdk` 2 |
| `'open'` | App `sdk` `"2"` non isolata | `false` |

`own` è la scelta dell'app (`true`, `false`, `null`); `reason` spiega perché la modalità non si può cambiare. `isIsolated(pkg)` (interna) è vero per `isolated` e `remote`. `canChangeExecution()` → `true` se il kernel è collegato e l'utente è amministratore (il kernel controlla comunque). Il cambio **vale dalla prossima apertura**: le finestre già aperte e i background già avviati restano come sono, e quando lo stato di un'app cambia i suoi background si fermano.

Perché non un Worker anche per l'isolato: un Worker dentro una sandbox senza origine non è un contesto sicuro (non ha `crypto.subtle`) e i worker a modulo non partono; l'iframe `sandbox` invece Chrome lo esegue in un processo separato, quindi non rallenta la pagina di lilOS ([D42](../interna/decisioni.md#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app)).

### Punti d'ingresso (`entrypoints.js`)

I punti d'ingresso sono le parti di un'app che si avviano da sole: `main` (la finestra che apre l'utente) e quelle dichiarate in `entrypoints` del manifesto.

| Export | Descrizione |
| --- | --- |
| `entrypointsOf(app)` | `{ nome: { kind, file?, label?, window?, params? } }` di un'app del registro. `main` c'è sempre. Per le app senza pacchetto: solo `main`. |
| `callEntrypoint(appId, entry = 'main', data = null, { from = null })` → `Promise` | Avvia il punto d'ingresso. `window`: apre la finestra con `data` come `args` (`launch(appId, data, entry)`) e dà `null`. `background`: lo avvia se serve e dà ciò che restituisce il suo `lilos.handle`; `from` è l'id dell'app che chiama. `service`: passa dal kernel (`services.call`, vedi [Servizi](#servizi-delle-app-appsappservicesjs)); lo avvia se serve e dà ciò che restituisce il suo `lilos.handle`. Lancia se l'app non esiste, è nascosta nel workspace attuale o non ha quel punto d'ingresso. |
| `connectEntrypoint(appId, entry)` → `Promise<MessagePort>` | Un canale con un punto d'ingresso `background`; per una finestra lancia. Un `service` non ha canali (il codice del servizio non ha `connect`). |

**`background` o `service`?** Un `background` gira **nel browser**, a richiesta, e solo finché lilOS è aperto: serve a ciò che tiene segreti dell'utente, che il kernel non deve vedere. Un `service` gira **nel kernel**, può partire con il sistema o all'ingresso dell'utente e continua anche a lilOS chiuso; ha però un `lilos` più povero (vedi [Servizi](#servizi-delle-app-appsappservicesjs)) e richiede il permesso `background`. Nel manifesto: `"sync": { "kind": "service", "label": "Sincronizza" }`.

**Nomi che lilOS conosce.** `filePreview` (solo `background`) è il punto d'ingresso con cui l'app prepara l'anteprima dei suoi file nel File Manager: lo chiama lilOS, non l'app ([Anteprima dei file fatta dalle app](#anteprima-dei-file-fatta-dalle-app-filepreviewjs)).

Chi chiama dal sistema (`@lilos/system`, app di sistema) non ha permessi da verificare; un'app installata passa da `lilos.app.call` (i propri) o `lilos.apps.call` (di altre, con `apps.call:<id>`), che chiamano queste funzioni con `from` = id dell'app.

#### Parametri dei punti d'ingresso

`params` (in `entrypoints.<nome>`) descrive gli `args` che una finestra accetta, così lilOS può chiederli all'utente (oggi nel Pannello di controllo → Avvio, vedi [apps/startup.js](#appsstartupjs)). Lo stesso schema vale per un punto d'ingresso `service`: i parametri scelti arrivano nel suo `args`, insieme a `reason` (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)); per `file` e `folder` sono percorsi `~/…`. Oggetto `{ nome: parametro }`, al massimo 10; `nome`: `/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/`.

| Campo | Significato |
| --- | --- |
| `type` | `text`, `number`, `boolean`, `choice`, `file` o `folder` |
| `label` | Obbligatoria, fino a 60 caratteri |
| `description?` | Fino a 200 caratteri |
| `default?` | Valore predefinito, del tipo giusto (non per `file` e `folder`) |
| `maxLength?` | Solo `text`: da 1 a 2000 (predefinito 2000) |
| `min?`, `max?` | Solo `number`: `min` non oltre `max` |
| `options` | Solo `choice`, obbligatoria: da 1 a 50 `{ value, label }`; `value` è una stringa (fino a 100 caratteri) o un numero, `label` fino a 60 |

```json
"entrypoints": {
  "main": { "kind": "window", "params": {
    "file": { "type": "file", "label": "File da aprire" },
    "view": { "type": "choice", "label": "Vista", "default": "list",
              "options": [{ "value": "list", "label": "Elenco" }, { "value": "grid", "label": "Griglia" }] }
  } }
}
```

All'apertura la finestra riceve `args = { file, view }`. Un `file` è l'id del file e viene anche consegnato all'app, che lo può leggere e scrivere. Una `folder` arriva come id alle app di sistema e come percorso `~/…` a quelle installate; per leggerla serve un permesso `fs.read` o `fs.write` che la copra.

### Anteprima dei file fatta dalle app (`filePreview.js`)

`src/apps/filePreview.js`: il File Manager mostra l'anteprima di un file; se l'app che apre quel tipo di file sa farla meglio, lo dichiara con un punto d'ingresso `filePreview` e la fa lei. Serve `"sdk": "2"`; il punto d'ingresso è di tipo `background`.

| Export | Descrizione |
| --- | --- |
| `PREVIEW_ENTRY` | `'filePreview'`, il nome del punto d'ingresso |
| `previewAppFor(node)` → `app` o `null` | L'app che fa l'anteprima di quel nodo: `appFor(estensione)` (la scelta dell'utente o l'app predefinita, vedi [apps/open.js e apps/openWith.js](#appsopenjs-e-appsopenwithjs)), se è un pacchetto installato nel workspace e ha un punto d'ingresso `filePreview` di tipo `background`. `null` per cartelle, collegamenti, elementi nel cestino e in ogni altro caso. |
| `filePreview(node, { size, from }?)` → `Promise<{ app, text, html o image, note } o null>` | Chiama l'app e controlla la risposta. `from`: l'id dell'app che chiede l'anteprima (`lilos.files.preview`, sotto), passato all'app che la fa; `null` (predefinito) per lilOS e le app di sistema. `size` (opzionale): il lato lungo voluto in pixel, arrotondato; senza, o con un valore non positivo, l'app sceglie. Lo usano le miniature ([Miniature dei file](#miniature-dei-file-thumbnailsjs)). `app` è l'id dell'app. `null` se nessuna app fa l'anteprima o se l'app risponde `null`. Rifiuta se l'app dà un errore, una risposta non valida o non risponde in 10 secondi. |

Nella risposta di `filePreview` c'è uno solo tra `text` (stringa), `image` (`Blob`) e `html` (un documento intero già ripulito); `note` è `null` se manca.

**Cosa riceve l'app.** Il suo `lilos.handle` viene chiamato con `data = { file, size? }` (l'id del file e, solo se richiesto, `size`: il lato lungo voluto in pixel, un intero positivo; per una miniatura è piccolo) e `from` = `null` (la chiede lilOS o un'app di sistema) oppure l'id dell'app installata che l'ha chiesta con `lilos.files.preview`. `size` è un suggerimento: un'app che fa l'anteprima di un'immagine lo rispetta (non ingrandisce mai) e, senza, sceglie lei. Il file le è passato **solo in lettura**: `lilos.files.read(file)` (anche con `{ bytes: true }`) e `lilos.files.info(file)` funzionano; `write` e `setMeta` falliscono con «Il file è stato passato solo da leggere». Non lo può passare ad altre app né aprire con `files.open`, e lo può leggere solo mentre risponde a quella chiamata. Per le pipe (`caller.opened` è vero) il file conta come consegnato all'app: per esempio FileCrypt lo decifra per lei come farebbe all'apertura.

**Cosa risponde.** Un oggetto con **uno** di questi campi (se ce n'è più di uno vale il primo in quest'ordine: `text`, `html`, `image`) e una `note` facoltativa, oppure `null` («niente da mostrare»):

| Campo | Contenuto | Limite |
| --- | --- | --- |
| `text` | Testo semplice | Tagliato a 1 MB (il File Manager ne mostra i primi 100.000 caratteri) |
| `html` | Una pagina HTML | Al massimo 1 MB, altrimenti errore |
| `image` | Un `Blob` con tipo `image/*` | Al massimo 20 MB, altrimenti errore; un tipo che non è `image/*` è un errore |
| `note` | Una riga sotto l'anteprima | Tagliata a 200 caratteri; ignorata se vuota o non è una stringa |

Il tempo è di **10 secondi** dalla chiamata. Una risposta che non è un oggetto, o senza nessuno dei tre campi, è un errore.

**Sicurezza dell'`html`.** L'app può essere installata da chiunque, quindi la sua pagina non è di fiducia:

- `DOMParser` la analizza e lilOS toglie `script`, `noscript`, `base`, `meta`, `link`, `iframe`, `frame`, `frameset`, `object`, `embed`, `portal`, `form` e le animazioni SVG `set`, `animate`, `animateMotion`, `animateTransform` (con cui un SVG può cambiare un `href`); da `a` e `area` toglie `href`, `xlink:href`, `target` e `ping`. Restano testo, stile e immagini.
- Aggiunge una CSP in `<meta>`: `default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:`. Immagini e font solo `data:`; niente rete.
- Aggiunge uno stile con `color-scheme` e i token del tema come variabili CSS (`--accent`, `--text`, `--dim`, `--surface`, `--border`, `--font`…, gli stessi delle finestre isolate, da `theme()` di [host.js](#hostjs)), e un corpo con margine di 12 px, testo `var(--text)` e sfondo trasparente.
- `filePreview` restituisce un documento intero, da mettere in `<iframe sandbox="" srcdoc>`: **senza** `allow-scripts`, `allow-forms`, `allow-popups` e `allow-same-origin`.

**Errori.** Se `filePreview` rifiuta (errore dell'app, risposta non valida, limiti superati, tempo scaduto), il File Manager mostra la sua anteprima di sempre e scrive un avviso in console: l'utente non vede un errore. Con `null` mostra la sua anteprima senza avviso.

Nel File Manager (1.6.0) il pannello Anteprima usa `system.filePreview` solo se esiste (un lilOS più vecchio mostra l'anteprima interna). Il testo va in un `<pre>` (tagliato a 100.000 caratteri), l'immagine in un `<img>` (da un object URL), l'`html` nell'iframe; sotto c'è «Anteprima creata da *app*», con la `note` dopo un punto mediano. Cartelle, collegamenti e cestino non passano da qui.

```js
// Nell'app (manifesto: "sdk": "2", "entrypoints": { "filePreview": { "kind": "background" } })
export function filePreview({ lilos }) {
  lilos.handle(async ({ file }) => {
    const text = await lilos.files.read(file);          // solo lettura
    const rows = text.split('\n').filter(Boolean);
    if (!rows.length) return null;                      // il File Manager usa la sua anteprima
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    return {
      html: `<ul>${rows.slice(0, 50).map(r => `<li>${esc(r)}</li>`).join('')}</ul>`,
      note: `${rows.length} righe`,
    };
  });
}
```

Dal sistema: `const p = await system.filePreview(node); if (p?.html) frame.srcdoc = p.html;`.

**Dalle app installate.** Anche un'app installata può chiedere l'anteprima di un file (per esempio un altro file manager): `lilos.files.preview(rif, { size? })`, con il permesso `fs.preview`. `rif` è un file che l'app può già leggere: un `~/percorso` coperto da `fs.read` o `fs.write`, o l'id di un file che ha ricevuto. Risponde come `filePreview` (`{ app, text, html o image, note }` o `null`; l'`image` arriva come `Blob`) e fallisce allo stesso modo; `size` si limita a 4096. L'app che fa l'anteprima riceve come `from` l'id di chi chiede. L'`html` va mostrato anche qui in un `<iframe sandbox="" srcdoc>`. Un'app che fa anteprime non ha bisogno di `fs.preview`, se non chiede a sua volta quelle di altri.

```js
// Manifesto: "permissions": ["fs.preview", "fs.read:~/Documenti"]
const p = await lilos.files.preview('~/Documenti/foto.png', { size: 256 });
if (p?.image) img.src = URL.createObjectURL(p.image);
```

**Nei pacchetti ufficiali.** Photo (1.2.0) risponde con `image`: l'immagine rimpicciolita al lato lungo `size` (predefinito 1024, limitato tra 16 e 2048, mai ingrandita), in WebP (PNG se il browser non scrive WebP); `null` per file vuoti o immagini che il browser non decodifica. Editor (1.3.0) risponde con `image`: un foglio bianco 4:5 alto `size` (predefinito 1024, tra 16 e 2048) con le prime righe dei primi 64 KB del file, colorate con l'evidenziatore semplice e i colori del tema chiaro; le colonne sono altezza/4 tra 24 e 56 (un foglio piccolo mostra righe più grandi e leggibili) e le righe lunghe sono tagliate; `null` per file vuoti o binari (con il byte `\0`); WebP o PNG. Entrambi hanno `"sdk": "2"` e il punto d'ingresso `filePreview` (`background`).

### Miniature dei file (`thumbnails.js`)

`src/apps/thumbnails.js`: la miniatura di un file è l'immagine che la sua app ne fa con `filePreview` (sopra), piccola, per le icone della scrivania e del File Manager. Conta **solo** la risposta `image`: `text`, `html`, `null` ed errori non danno miniatura e l'icona resta (l'errore va in `console.warn`, senza notifiche).

| Export | Descrizione |
| --- | --- |
| `canThumbnail(node)` → `boolean` | Vero se un'app può farla: `previewAppFor(node)` esiste e il file non ha contenuto di un'app (nessun `node.apps[x].content === true`, per esempio un file di FileCrypt). Non dice se l'app risponderà con un'immagine. |
| `fileThumbnail(node, size = 128)` → `Promise<string o null>` | Un object URL con la miniatura (lato lungo `size` o poco più) o `null`. L'URL lo revoca lilOS quando la miniatura esce dalla cache: va messo subito in un `<img>`, non conservato. |
| `thumbnailIcon(node, { size, fallback })` → `Element` | Un'icona che diventa la miniatura. `size` in pixel CSS (si chiede `size × devicePixelRatio`). Restituisce `fallback` (l'icona solita) se `canThumbnail` è falso; altrimenti un `span.icon-thumb-box` con `fallback` dentro, che chiede la miniatura solo quando è sullo schermo (`IntersectionObserver`, margine 200 px) e poi mette un `img.icon-thumb` e la classe `shown` (dopo `decode()`). Senza miniatura resta il `fallback`. |

Dettagli di `fileThumbnail`:

- **Cache in memoria**, di object URL. Chiave: `id`, `modified` e `size` del file, `id@versione` dell'app e la misura. La misura è arrotondata per eccesso a 64, 128, 256 o 512 (oltre, 512), così icone di taglia simile condividono la miniatura. Cambiare il file, aggiornare l'app o sceglierne un'altra per quel tipo ne fa una nuova.
- Ne tiene **400**: le più vecchie *pronte* sono revocate per prime; usarne una la rende la più recente. Quando il contenuto di un file cambia, la miniatura precedente (stessa misura) viene revocata.
- Le app sono chiamate **due alla volta**; le altre richieste aspettano in coda. Vale il limite di 10 secondi di `filePreview`.
- Non è salvata da nessuna parte: al ricaricamento si rifanno.

L'app non deve fare altro: basta che risponda con `image` e rispetti `size` ([ricette](ricette.md#mostrare-lanteprima-dei-file-della-tua-app)). `fileThumbnail` e `canThumbnail` sono esportate da `@lilos/system`.

### Background (`background.js`)

Gestisce i punti d'ingresso `background`: si avviano alla prima chiamata, uno per app e per nome, per tutta la sessione (non per workspace), e si fermano dopo **5 minuti senza chiamate** (il controllo gira ogni 30 secondi), alla disconnessione dell'utente e quando l'app cambia (nuova versione, rimossa, modalità cambiata). Con `lilos.app.keepAlive()` restano accesi.

- Isolato: un iframe `sandbox="allow-scripts"` nascosto (`.pkg-background`, con una CSP simile a quella delle finestre) che esegue `SANDBOX_RUNTIME_SOURCE`.
- Non isolato: un `Worker` da un `Blob` (`WORKER_SOURCE`) con l'origine di lilOS.
- App di sistema: l'export con quel nome, chiamato nella pagina di lilOS.

Il codice (verificato con l'hash) e le librerie del manifesto si mandano all'avvio con un `init`; le richieste dell'app tornano per una `MessagePort` e si controllano con i permessi come per le finestre. Se il codice non parte, un avviso lo dice e l'istanza si ferma. Ogni istanza ha il suo posto nelle pipe (`pipeTarget`): quando arriva un evento, lilOS chiama la funzione data a `lilos.pipes.subscribe` come una chiamata con `pipe`, `data` e `ctx`; alla chiusura dell'istanza le iscrizioni cadono. Export: `call(app, entry, data, from, { readOnly })` (con `readOnly: true` i file di `data` si danno all'app solo da leggere e solo finché la chiamata non finisce: vanno nella mappa `readOnly` dell'istanza (id → chiamate in corso) invece che in `handles`, e ne escono quando l'app risponde o fallisce, vedi [Anteprima dei file fatta dalle app](#anteprima-dei-file-fatta-dalle-app-filepreviewjs); `request(data, from, { readOnly })` dell'istanza fa lo stesso), `start(app, entry)` (avvia il punto d'ingresso se serve e si risolve quando il suo codice è partito: lo usa `apps/pipes.js` per le pipe del manifesto), `connect(app, entry)`, `running()` → `[{ key, appId, name, label, glyph, keepAlive }]`, `stop(key)`, `stopApp(id)`, e `backgroundApps` (`Emitter`, evento `change` quando se ne avvia o ferma uno o cambia `keepAlive`). L'area di notifica della barra delle applicazioni ha un'icona (`src/taskbar/BackgroundApps.js`) con l'elenco di quelli con `keepAlive`: per ognuno aprono le proprietà dell'app e "Ferma".

### `methods.js`

`hostMethods({ pkg, win?, handles, readOnly?, instance?, pipe? })` costruisce le funzioni che l'app può chiamare (i nomi di `lilos.*`, più `app.failed` che usa il ponte per segnalare un errore) e le controlla contro i permessi; è lo stesso per finestre e background, isolati o no. `invoke(methods, nome, parametri)` esegue una richiesta (rifiuta i nomi sconosciuti). `handles`: gli id dei file con cui l'app è stata aperta o che le sono stati passati. `readOnly` (un `Set` o una `Map`: basta `has(id)`; vuoto se manca): gli id dei file passati solo da leggere, per la durata di una chiamata; leggerli e chiederne le informazioni funziona senza permessi `fs`, scriverli fallisce con «Il file è stato passato solo da leggere». `pipe`: il posto dell'app nelle pipe (`pipeTarget` di `apps/pipes.js`), per `lilos.pipes`; senza, `pipes.subscribe` fallisce. Ogni lettura e scrittura di file dice a `fs` chi chiede (`caller`: `{ app, opened }`, con `system: true` per le app di sistema): così le pipe saltano i gestori della stessa app e sanno se il file le è stato consegnato (`opened` è vero anche per i file in `readOnly`).

### `host.js`

(per le app **non** di sistema: quelle di sistema non hanno finestra isolata)

- `theme()` → `{ '--accent': …, '--font': …, … }`: i token del tema (colori, `--radius-sm`, e in `--font` il carattere del `body`) che lilOS manda alle finestre isolate. È esportata anche per `filePreview.js`, che li mette nell'anteprima `html`.

- `packageModule(pkg)` → `{ default: ({ args, entry = 'main' }) => Window }`: il modulo che il launcher carica per un'app installata. Una finestra per app e punto d'ingresso, come le altre; titolo e dimensioni vengono dal punto d'ingresso (`label`, `window`), poi da `contributes.window`. `getState()` restituisce `{ file }` se l'app è stata aperta con un file (così le workarea la riaprono con lo stesso file).
- App `local` non isolata (solo `sdk` `"2"`): il modulo si importa da un `Blob` e la funzione `entry` riceve `{ lilos, root, args }`, con `root` uno Shadow DOM (`.pkg-host`) dentro la finestra. Gli stili di lilOS non vi entrano (le variabili di tema `--accent`, `--text`… sì, perché ereditano); le scorciatoie di `contributes.commands` valgono per la finestra attiva dell'app. Se la funzione restituisce una funzione, la chiama alla chiusura della finestra.
- App `local` isolata: `<iframe sandbox="allow-scripts">` con `srcdoc`. Il documento contiene: la CSP in `<meta>` (`default-src 'none'`; `script-src 'unsafe-inline'` più gli indirizzi delle librerie non in cache; `style-src 'unsafe-inline'`; immagini, font e media solo `data:`/`blob:`; `connect-src` con le origini dei permessi `net:`, altrimenti `'none'`; `form-action 'none'`; `base-uri 'none'`), il ponte, le librerie e il codice. Il codice e le librerie in cache si controllano con gli hash prima di essere inseriti; se non corrispondono la finestra non si apre.
- App `remote`: `<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src=url>`. lilOS risponde ai messaggi del ponte che il sito gli manda (stesse funzioni, stessi permessi), ma non gli dà `window.lilos`; quel protocollo non è documentato né stabile.

Ogni finestra di un'app `local` ha il suo posto nelle pipe (`windowPipe`, che usa `pipeTarget`): lilOS chiama le funzioni di `lilos.pipes.subscribe` della finestra con un messaggio `{ request, pipe, data, ctx }` (nella sandbox) o direttamente (non isolata), e la risposta torna come `{ reply }`. Alla chiusura della finestra le sue iscrizioni cadono e le chiamate in sospeso falliscono.

---

## input/sendKey.js

`sendKey(key)` (esportata da `@lilos/system`, per le tastiere a schermo) manda un tasto all'elemento che ha il focus, come farebbe un tasto vero. Non restituisce niente.

```js
import { sendKey } from '@lilos/system';

sendKey({ key: 'a', code: 'KeyA', text: 'a' });
sendKey({ key: 'Backspace', code: 'Backspace', ctrl: true });   // cancella una parola
sendKey({ key: 'z', code: 'KeyZ', ctrl: true });                // annulla
```

| Campo di `key` | Descrizione |
| --- | --- |
| `key`, `code` | Come in un `KeyboardEvent` (`code` predefinito `''`) |
| `text` | Cosa scrive il tasto (niente per le scorciatoie con Ctrl o Alt); senza `text` un tasto non scrive |
| `ctrl`, `alt`, `shift`, `meta`, `altGraph` | I modificatori premuti (predefiniti `false`) |

- **Dove va.** L'elemento col focus è cercato nella pagina di lilOS, scendendo negli Shadow DOM (le app non isolate). Se il focus è nella sandbox di un'app isolata (`iframe.pkg-frame` con `srcdoc`), il tasto va al bridge con un messaggio `{ lilos: 1, key }` e lì lo digita lo stesso codice (`typeKey`, inserito come testo in `BRIDGE_SOURCE`). Le app remote non ricevono niente.
- **Eventi.** L'elemento riceve `keydown` e, per un tasto che scrive (senza Ctrl, Alt o Meta) o per Invio, `keypress`; se nessuno li annulla (`preventDefault`) lilOS fa l'azione del browser, poi arriva `keyup`. L'azione è fatta da lilOS perché un tasto creato da uno script non fa niente da solo.
- **Azioni.** Scrivere (`execCommand('insertText')`, quindi Ctrl+Z annulla); Backspace e Canc (con Ctrl cancellano la parola); frecce, Home, Fine, PagSu e PagGiù nei campi di testo e nei `contenteditable` (con Maiusc selezionano, con Ctrl vanno per parola o alle estremità); Invio (a capo in una `textarea` o in un `contenteditable`, invio del modulo in un `input`, clic su un pulsante); Tab e Maiusc+Tab (all'elemento successivo o precedente **della stessa finestra**); Spazio e Invio su pulsanti e simili (clic); Ctrl+A, C, X, V, Z, Y (Ctrl+Maiusc+Z ripete). Con Alt (non AltGr) non succede niente.
- **Limiti.** Su e Giù nelle `textarea` si muovono per righe del testo, non per righe visive. Ctrl+C, X e V nelle app isolate possono non funzionare: l'iframe non ha un'attivazione dell'utente (Ctrl+V legge gli appunti con `navigator.clipboard.readText`).

---

## windows/WindowManager.js

### `class WindowManager extends Emitter`

`new WindowManager(canvas, taskbar)`. Ospita le `Window` dell'SDK sulla scrivania.

**Workspace.** Ogni finestra appartiene al workspace che era attuale quando è stata aperta. Si vedono (con il pulsante nella barra) solo quelle del workspace attuale; le altre restano vive e nascoste (classe `ws-away` sulla finestra e sul pulsante), con tutto il loro stato. `windows`, `get(key)`, il focus e `cycle()` considerano solo il workspace attuale. Senza `setWorkspace` (`workspace` è `null`) tutte le finestre sono dello stesso gruppo.

| Membro | Descrizione |
| --- | --- |
| `open(win, { key?, app?, owner?, center?, bounds?, at?, workspace? })` | Mette la finestra, aggiunge il pulsante nella barra, le dà il focus ed emette `open`. Per impostazione predefinita al centro della vista (le successive scalate di 24 px). `key` permette di ritrovarla con `get`; `app` è l'id dell'app a cui appartiene (vedi `appOf`); `owner` l'app che ha aperto una finestra secondaria (il launcher lo mette in `openWindow` di ogni app; se manca vale `app`): `windowsOfApp` la conta tra le finestre di quell'app; `center` è un punto del mondo su cui centrarla; `bounds` un rettangolo del mondo in cui tenerla (se è troppo grande vince l'angolo in alto a sinistra); `at` (`{ x, y, w?, h?, minimized? }`) la rimette esattamente lì, senza muovere la camera e senza cascata (`minimized` la apre ridotta a icona, senza focus). `workspace` (predefinito l'attuale): una finestra per un altro workspace si apre nascosta, senza focus, e compare quando l'utente ci va. |
| `appOf(win)` | L'app data a `open` come `app`, o `null` (finestre secondarie: impostazioni, selettori, proprietà). |
| `geometry(win)` | `{ x, y, w, h, minimized, maximized }` in coordinate mondo. Una finestra ingrandita riporta le misure che riavrà ripristinata. |
| `get(key)` | La finestra aperta con quella chiave **nel workspace attuale**, o `null`. |
| `windows` | Finestre aperte del workspace attuale, dalla più in basso alla più in alto. |
| `windowsOf(workspace)` | Finestre di un workspace, dalla più in basso alla più in alto. |
| `all()` | Le finestre di tutti i workspace, dalla più in basso alla più in alto (una copia). |
| `workspaceOf(win)` | Il workspace di una finestra, o `null`. |
| `windowsOfApp(id)` | Le finestre di un'app in tutti i workspace: quelle con `app` = `id` e le secondarie con `owner` = `id`. |
| `workspace` | Il workspace attuale (`null` se non in uso). |
| `setWorkspace(id)` | Mostra le finestre di `id` (dà il focus a quella che l'aveva quando l'utente se n'è andato) e nasconde tutte le altre. |
| `adopt(workspace)` | Sposta nel workspace attuale tutte le finestre di un altro (un workspace eliminato), scalate al centro della vista attuale — anche dentro una workarea attuale. Il testo non salvato resta. |
| `active` | Finestra con il focus, o `null` se il focus è sulla scrivania. |
| `show(win)` | Riapre se ridotta a icona, dà il focus e la porta nella vista. |
| `focus(win \| null)` | Porta in primo piano e attiva la finestra; `null` dà il focus alla scrivania. |
| `minimize(win)` | Nasconde la finestra; il focus passa alla finestra visibile più in alto. |
| `toggleMaximize(win)` | Finestra grande come lo schermo, con la vista al 100% su di essa; di nuovo per ripristinare dimensioni, posizione e vista. Non ingrandisce se il controllo `maximize` è spento; se viene spento mentre la finestra è ingrandita, la ripristina. |
| `requestClose(win)` | Chiusura chiesta dall'utente (pulsante, Alt W): chiede prima `win.canClose()`, se c'è; se dice sì, emette `dismiss` sulla finestra e la chiude. `Promise<boolean>`: chiusa o no (`false` anche se nel frattempo è stata chiusa da altri). `close(win)` invece non emette `dismiss`. |
| `close(win)` | Chiude subito, senza chiedere: toglie il pulsante e chiama `win.destroy()`. |
| `cycle()` | Porta in primo piano la finestra più in basso (riaprendola se ridotta a icona): ripetuto, le visita tutte. |

Gestisce anche: trascinamento dalla barra del titolo e ridimensionamento da ogni bordo attivo della finestra (il lato opposto resta fermo, lo spostamento è diviso per lo zoom, le dimensioni rispettano i limiti della finestra), focus con un clic o con il focus da tastiera dentro la finestra, focus alla scrivania con un clic fuori da ogni finestra. Il pulsante nella barra riduce a icona la finestra attiva (se ha il controllo `minimize`) e riapre le altre.

Eventi: `focus` con la finestra o `null`; `open` e `close` con la finestra (le ascolta `Workareas` per salvare le finestre).

Scorciatoie registrate (gruppo Finestre, attive anche mentre si scrive): `windows.close` (Alt W, solo se la finestra attiva ha il controllo `close`) e `windows.next` (Alt N).

Gli `z-index` delle finestre partono da 100 e seguono l'ordine di sovrapposizione; quelle con `onTop` partono da 900 (sopra le altre, sotto gli elementi della scrivania trascinati). Una finestra con `focusable: false`, quando viene portata avanti, non prende il focus: `setActive(false)`, e il focus e la finestra attiva restano dov'erano. Non diventa mai la finestra attiva e non viene scelta per il focus quando un'altra si chiude.

---

## systemSettings.js

Dichiara le impostazioni del sistema e le applica. Va importato per primo da `system.js`.

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
| `deskHidden` | `[]` | Chiavi degli elementi fissi spenti in tutti i workspace: valgono per quelli che non hanno scelto (`hidden: null`) e per i nuovi (vedi [desktop/fixedItems.js](#desktopfixeditemsjs)) |
| `deskPreviews` | `false` | Con `true` i file sulla scrivania mostrano la miniatura fatta dalla loro app (56 px, `DesktopItem`) al posto dell'icona, se l'app ne fa una ([apps/thumbnails.js](#miniature-dei-file-thumbnailsjs)). `Desktop` ridisegna i file quando l'impostazione o il registro delle app cambia. |
| `deskColor` | `''` | Colore della scrivania: `''` per quello del tema, altrimenti `#rrggbb` (un altro valore si ignora e toglie le variabili). Imposta `--canvas` su `<html>` e, in base alla luminosità (luminanza relativa > 0,3: colore chiaro), `--canvas-dot`, `--on-canvas`, `--on-canvas-hover` e `--on-canvas-shadow` scuri o chiari. `DESK_COLORS` ne propone 10 |
| `wallpaper` | `''` | Id della copia (in Sistema) dell'immagine dietro la scrivania, `''` per nessuna (vedi [desktop/wallpaper.js](#desktopwallpaperjs)) |
| `startupApps` | `true` | Con `false` le app scelte nel Pannello di controllo → Avvio non si aprono all'ingresso (vedi [apps/startup.js](#appsstartupjs)) |
| `userPhoto` | `''` | La foto profilo: un JPEG quadrato di 192 px come URL `data:image/jpeg;base64,…`, `''` per nessuna. Alla lettura (`userPhoto()` in `user/photo.js`) un valore più lungo di 200 000 caratteri o che non è un JPEG in base64 conta come nessuna foto. Se c'è, il sistema mette `--user-photo: url(…)` e `data-user-photo` su `<html>` (vedi [user/](#user-la-pagina-utente)) |
| `notifyShown` | `5` | Quante notifiche la barra delle notifiche mostra insieme (`NotificationBell`; almeno 1 nel codice). Il Pannello di controllo propone 1-8 e 10 |
| `notifySeconds` | `10` | Secondi per cui la barra resta dopo l'ultima notifica arrivata (almeno 1 nel codice). Il Pannello di controllo propone 3, 5, 8, 10, 15, 30 e 60 |
| `userPageHidden` | `[]` | Chiavi delle voci che la pagina utente non mostra (`USER_PAGE_ITEMS[].key`). Le chiavi sconosciute si ignorano e i doppioni si tolgono alla lettura |

Esporta anche `ACCENTS`, i colori proposti dall'app Pannello di controllo, `DESK_COLORS` (`[{ value, label }]`: 10 colori per `deskColor`, sei scuri e quattro chiari: Grafite, Notte, Blu profondo, Bosco, Prugna, Terra, Nebbia, Cielo, Salvia, Sabbia), `RETENTION_OPTIONS` (`[{ value, label }]`: 1, 7, 14, 30, 60, 90, 365 giorni e `0` «Per sempre», per `trashRetention`), `LASSO_OPTIONS` e `selectionMode(event)` → `{ mode: 'lasso' | 'rect', additive }`: percorso libero se sono premuti tutti i modificatori di `lasso`; `additive` (si aggiunge alla selezione) con Ctrl/Cmd o Shift, se non fanno parte della combinazione del percorso.

---

## systemTrash.js

`setupTrash()`: chiamata da `system.js`. Elimina per sempre ciò che è nel cestino da più di `trashRetention` giorni (`fs.purgeTrash(Date.now() - giorni * 86 400 000)`, di tutti i workspace, non solo dell'attuale): all'avvio, ogni ora e quando l'impostazione cambia. Con `trashRetention` a `0` non fa nulla.

---

## systemHistory.js

`setupHistory({ root, activeWindow })`: collega l'annulla e ripeti centrale al sistema. La chiama `system.js` con `{ root: desktop.history, activeWindow: () => wm.active }`.

- `history.setRoot(root)` e `history.setContext(() => activeWindow()?.el ?? null)`.
- Scorciatoie nel gruppo **Modifica** (si cambiano nel Pannello di controllo → Usabilità → Scorciatoie): `edit.undo` (Ctrl Z) e `edit.redo` (Ctrl Y, Ctrl Shift Z). Funzionano anche mentre si scrive (`whenEditing`) e si ripetono tenendo premuto (`repeat`); `when` è `history.handles(…)`, quindi nei campi di testo senza `text: true` il tasto resta al browser.
- Messaggi con `notify()`: `Annullato: …`, `Ripetuto: …` (solo se la voce ha un'etichetta) e `Non si può più fare: …` quando una voce lancia un errore.
- Azioni di menu (`menus.defineAction`): `edit.undo` e `edit.redo`, con le icone `undo` e `redo`, attive solo se la cronologia della **scrivania** ha qualcosa da fare, e agiscono su quella (`history.undoOn(root)`). Si aggiungono con l'editor del menu; non sono nel menu predefinito.
- In sviluppo `window.lilos.history` è l'oggetto `history`.

---

## tags/tagUi.js e scheda Tag

`src/tags/tagUi.js`, usato da scrivania, File Manager e Pannello di controllo:

| Export | Descrizione |
| --- | --- |
| `tagDots(node, cls = 'tag-dots')` | `HTMLElement` con i pallini dei tag del nodo (al massimo 4, poi «+n»; `title` e `aria-label` «Tag: nomi»), o `null` senza tag. Ignora i tag che non esistono. |
| `setTag(ids, tagId, on)` | Mette (`on`) o toglie il tag a ogni nodo; salta i nodi di sistema e gli id sconosciuti. Usa `fs.setTags`. |
| `tagSubmenu(ids)` | Voce di menu **Tag** con sottomenu: un pallino colorato per tag, con il segno di spunta se tutti i nodi lo hanno (sceglierlo lo toglie a tutti, altrimenti lo mette a tutti); i tag invisibili hanno «(nasconde)» dopo il nome; poi **Nuovo tag…** (`launch('settings', { tab: 'tags', tagFor: ids })`) e **Gestisci i tag…**. Disattivata se non ci sono nodi etichettabili. |

Stili in `src/styles/tags.css` (`.tag-dots`, `.tag-dot`, `.ditem-tags`, `.fm-tag`…).

**Scheda Tag del Pannello di controllo** (`tagSections` in `SettingsApp.js`, nel repository ufficiale, dopo la scheda Workspace). Una sezione «Nuovo tag» (nome e **Crea**, anche con Invio; un errore, come un nome già preso, esce in una notifica) e una sezione per tag con Nome, Colore (`swatches` con `TAG_COLORS`), Visibile (interruttore, con la spiegazione di cosa succede) ed Elementi (quanti ne vede il workspace attuale, **Mostra nel File Manager** e **Elimina…** in due clic, che chiama `tags.remove`). Si ridisegna sull'evento `change` di `tags`. Argomenti di `launch('settings', …)`: `tab: 'tags'` apre la scheda e dà il focus al campo del nuovo tag; `tagFor: string[]` sono gli id degli elementi che prenderanno il prossimo tag creato lì (i nodi che non esistono si ignorano; l'elenco si svuota dopo la creazione).

---

## taskbar/

### `class Taskbar`

`new Taskbar(parent)`.

| Proprietà | Descrizione |
| --- | --- |
| `el` | `nav.taskbar`, con `aria-label` «Barra delle applicazioni». |
| `startButton` | Pulsante con il logo. |
| `startMenu` | L'istanza di `StartMenu`. |
| `notificationBell` | La `NotificationBell` ([notifications/](#notifications-le-notifiche-nellinterfaccia)): il suo `button` sta nell'area di notifica, in `.tb-notify-area` (`role="group"`, `aria-label` «Area di notifica»), con gli aggiornamenti da riavviare (`createPendingUpdates()`) e le app in background (`createBackgroundApps()`), in quest'ordine. L'area sta nel `div.tb-tray` prima dell'orologio. |
| `tasks` | Contenitore `.tb-tasks` dei pulsanti delle finestre (`.tb-task`), gestito dal `WindowManager`. |

### `class StartMenu`

`new StartMenu(anchor)`; `anchor` è il pulsante che lo apre, usato per `aria-expanded` e per non chiudere il menu quando lo si clicca.

Non è un menu a tendina: è una pagina (`section.start-menu`, `role="dialog"`, `aria-modal="true"`, `aria-label` «Menu applicazioni») appesa a `document.body`, che copre scrivania e finestre ma lascia libera la barra delle applicazioni. Si chiude anche con un clic su un'altra parte della barra.

| Membro | Descrizione |
| --- | --- |
| `open()`, `close({ focus = false })`, `toggle()` | Apre, chiude, alterna. All'apertura chiude un eventuale menu contestuale, svuota la ricerca, ridisegna tutto e dà il focus al campo; mentre è aperto si ridisegna quando cambiano `usage`, il `registry`, i workspace (`change`, `switch`) o le workarea (`change`). `close({ focus: true })` (Esc) rida il focus al pulsante del logo. |
| `isOpen` | Stato. |
| `connect({ workspaces, workareas })` | Lo chiama `system.js` dopo aver creato `Workspaces` e `Workareas` (che nascono dopo la barra). Senza, il menu non mostra workspace né la scheda Work Area. |
| `onUser`, `onOpen` | Funzioni che collega `UserPage` (predefinite `null`). `onUser()` parte quando si preme il nome in alto (che prima si chiude); `onOpen()` a ogni apertura del menu. |

Registra la scorciatoia `system.startMenu` (Ctrl K, gruppo Generale, attiva anche mentre si scrive); la stessa combinazione lo chiude quando il focus è dentro il menu. Il tooltip del pulsante del logo e il suggerimento nel campo di ricerca seguono la scorciatoia.

**Contenuto.** In alto: il workspace attuale, la ricerca, il nome dell'utente (`.sm-user`, titolo «Pagina utente»), il Pannello di controllo (`launch('settings')`), **Esci** quando `kernel.mode` è `'multi'` e altrimenti **Riavvia sessione** (chiudono il menu e chiamano `signOut()`, vedi [user/](#user-la-pagina-utente)) e **Chiudi**. Poi tre colonne:

- **Preferite** (`usage.pinned()`, solo le app visibili nel workspace): si fissano con la stella o trascinandole nella colonna (tipo di trascinamento `application/x-lilos-app`); si riordinano trascinando o con **Sposta su** e **Sposta giù** del menu contestuale.
- **App**, in schede: **Recenti e frequenti** (`usage.recentApps`, 6 voci, poi `usage.frequentApps`, 12 voci, senza ripetere le prime), **Work Area** (`workareas.list()`, la più recente per ultima modifica; `contentOf(id)` per finestre ed elementi; il clic chiama `workareas.show(id)`; tasto destro: **Vai alla workarea**, **Proprietà…**) e una scheda per ogni categoria di `CATEGORIES` che ha almeno un'app visibile (`app.category`; etichette Sistema, Produttività, Media, Sviluppo, Altro). Le schede senza elementi non ci sono (niente Recenti e frequenti senza storia, niente Work Area senza workarea); `open()` torna sempre alla prima che c'è. Con un testo nella ricerca le schede lasciano il posto a **Risultati**: app il cui `name` o `text.description` contiene il testo e workarea il cui titolo o descrizione lo contiene (senza maiuscole né accenti).
- **File**: `usage.recentFiles` (8 voci) e `usage.frequentFiles` (8 voci, solo con almeno 2 aperture), solo file che esistono e non sono nascosti, filtrati dalla ricerca per nome. Il clic apre il file con `openFile`; tasto destro: **Apri**, **Apri con…** (`openFile(node, { choose: true })`), **Mostra nella cartella** (`launch('files', { folder })`), **Togli dall'elenco** (`usage.forgetFile`). **Cancella elenco** chiama `usage.clearFiles()`.

In basso, una barra con un pulsante per workspace (`workspaces.list()`, nome, descrizione, `aria-pressed` per quello attuale). Il clic chiama `workspaces.switchTo(id)` **senza chiudere il menu**, che si ridisegna (con il focus sullo stesso pulsante).

**Tastiera.** Il menu ferma la propagazione dei tasti. Frecce tra gli elementi `[data-nav]` (prima quelli sulla stessa riga o colonna), ↓ dal campo entra nella griglia, Invio nel campo apre il primo risultato, ← → Home Fine sulle schede, Tab e Maiusc+Tab girano dentro il menu, un carattere digitato ovunque porta il focus nel campo. Esc svuota il campo se ha testo, altrimenti chiude. Sotto 860 px di larghezza le colonne si impilano (app per prime).

### `createClock()` → `HTMLElement`

Data breve e ora secondo `session.locale` (la lingua del sistema), aggiornate allo scoccare di ogni minuto. Il tooltip contiene la data completa.

---

### `usage` (`taskbar/usage.js`)

La storia d'uso del menu di avvio, per workspace. Istanza unica di una classe che estende `Emitter`; lavora sempre sul workspace attuale (`fs.workspace`) e senza workspace non fa nulla. Si ascolta da sola `app:launch` e conta ogni avvio della finestra `main` (`entry` mancante o `'main'`) **che non ha `auto: true`**, cioè quello che fa l'utente (menu, scrivania, File Manager, «Apri con», notifiche); se `args.file` è un id lo conta anche come file aperto. Le finestre riaperte da sole (ricaricamento, workarea) non passano da `app:launch`; l'avvio automatico sì, ma con `auto: true`.

| Membro | Descrizione |
| --- | --- |
| `pinned()` | Id delle app preferite, nell'ordine dell'utente. |
| `isPinned(id)` | `true` se l'app è tra le preferite. |
| `setPinned(id, on, index = null)` | Aggiunge (in fondo, o a `index`) o toglie una preferita; se c'era già la sposta. Al massimo 60. Id non validi ignorati. |
| `recentApps(keep?)`, `recentFiles(keep?)` | `[{ id, last }]`, la più recente per prima. `keep(id)` filtra (app installate, file che esistono). |
| `frequentApps(keep?)`, `frequentFiles(keep?)` | `[{ id, count }]`: quanto usati negli ultimi 30 giorni, i più usati per primi (a parità, il più recente). Solo con `count > 0`. |
| `forgetFile(id)` | Toglie un file dagli elenchi (non lo cancella). |
| `clearFiles()` | Svuota gli elenchi dei file del workspace attuale. |
| `on('change', fn)` | `fn(workspaceId)` a ogni modifica salvata. |

Formato (`lilos:ws:<id>:launcher`, vedi [Dati salvati](#liloswsid)): `{ pinned: [id], apps: [Entry], files: [Entry] }` con `Entry = { id, last, days: [[giorno, conteggio]] }` (`giorno` = giorni dal 1970; si tengono gli ultimi 30). Ogni elenco ha al massimo 100 voci (le più recenti). I dati salvati non sono affidabili: alla lettura si scartano id non validi (`/^[\w.-]{1,80}$/`), duplicati e conteggi non interi.

## notifications/ (le notifiche nell'interfaccia)

La parte di lilOS che mostra le notifiche (il dato è in [`notifications`](#notifications), nell'SDK). Gli stili sono in `styles/notifications.css`; il verde di «Fatto» è il token `--success`.

### `connectNotifications({ bell, wm })` → `Promise` (`connect.js`)

Chiamata da `system.js` con `taskbar.notificationBell` e il gestore delle finestre. Collega la campanella alla finestra Notifiche (`bell.onOpen`, `bell.onShown`), registra la scorciatoia `system.notifications` (etichetta «Apri o chiudi le notifiche», gruppo Generale, **nessun tasto di serie**) e chiama `notifications.load()`. Il comando e la campanella alternano: se la finestra è aperta, visibile e attiva la chiudono; altrimenti tolgono la barra e la aprono. Quello che arriva dopo viene dal flusso di eventi del kernel (`connectServices`, vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)).

### `class NotificationBell` (`NotificationBell.js`)

La campanella nell'area di notifica e la **barra delle notifiche** (`section.nt-stack`, `z-index` 9001, sopra la barra delle applicazioni). `new NotificationBell()` crea tutto e aggiunge la barra e due regioni per gli screen reader (`role="status"`, e `role="alert"` per gli errori) al `body`.

| Membro | Descrizione |
| --- | --- |
| `button` | `button.tb-bg.tb-bell` con il simbolo `bell` e il numero (`.tb-badge`, «9+» oltre 9) delle notifiche da leggere; titolo e `aria-label` «Notifiche: N da leggere». |
| `onOpen` | `() => void`: un clic sul pulsante. |
| `onShown` | `(notifica) => boolean`: `true` se la finestra Notifiche le mostra già; allora la barra non compare. |
| `hide()` | Toglie subito la barra. |

Comportamento: a ogni `new` la notifica va in cima alla barra, che mostra al massimo `notifyShown` notifiche (almeno 1) e sparisce `notifySeconds` secondi dopo l'ultima arrivata (almeno 1); una linea sotto di lei mostra il tempo che resta. Il puntatore o il focus dentro la barra la tengono aperta. Esc la chiude. Un clic su una notifica con azione la esegue, la segna letta e la toglie dalla barra; la × la toglie solo dalla barra. Quando `change` dice che una notifica non c'è più, la barra la toglie.

### `showNotifications(wm)` e `notificationsShown(wm)` (`NotificationsWindow.js`)

`showNotifications` apre la finestra **Notifiche** (una per workspace, chiave `notifications` del gestore) o la porta in primo piano, e la restituisce. Dalla più nuova, divise per giorno («Oggi», «Ieri», poi la data). In alto «N di M conservate» e, se ce ne sono, «· K nuove»; i pulsanti **Segna tutte come lette** e **Cancella tutte** (senza conferma). Aprirla segna come lette tutte; quelle che erano nuove, e quelle che arrivano a finestra aperta, tengono un puntino fino alla chiusura. Un clic esegue l'azione; la × cancella. `notificationsShown(wm)` è `true` se la finestra esiste e non è ridotta a icona.

### `notificationCard`, `runAction`, `senderOf`, `formatTime` (`card.js`)

- `notificationCard(n, { className, onOpen, onClose, closeLabel })`: una notifica (mittente, data e ora, etichetta **Errore** / **Avviso** / **Fatto** per `error`, `warning` e `success`, testo, ×). È un pulsante solo se ha un'azione e viene da un'app; il titolo è «Apri *nome*».
- `runAction(n)`: l'azione descritta sopra (`file` e `files` degli `args` tolti).
- `senderOf(n)` → `{ name, tile() }`: nome e icona del mittente come li mostra lilOS. Per un'app installata usa il nome e l'icona del registro (nome tradotto); se non c'è più, il nome salvato nella notifica. Per lilOS, «lilOS» e il logo.
- `formatTime(at)`: data e ora brevi nella lingua del sistema.

### `notify(testo, { level = 'info' })` (`notify.js`)

Ogni messaggio di lilOS stesso è una notifica: sia ciò che risponde a un gesto dell'utente («Annullato: …», «Spostato … in Documenti») sia ciò che arriva senza (`launcher.js`, `app.failed` e `background.js` per un'app che non parte; `updates.js` con livello `warning`; `startup.js`; i messaggi dei servizi in `services.js`). Il livello (`info` predefinito, `success`, `warning`, `error`) lo sceglie chi chiama, per messaggio. Chiama `notifications.send({ text, level })`; se non riesce non rilancia l'errore e lo scrive in console (`[lilos] notifica non mostrata`). Una notifica che il kernel non accetta (oltre `perMinute`, kernel che non risponde) resta comunque nella pagina: vedi `notifications.send`.

---

## user/ (la pagina utente)

La pagina a tutto schermo che si apre dal nome dell'utente nel menu di avvio. Decisione: [D48](../interna/decisioni.md#d48-la-pagina-utente-e-il-blocco-come-fine-della-sessione). Per l'utente: [La pagina utente](../utente/guida.md#la-pagina-utente).

### `class UserPage` (`user/UserPage.js`)

`new UserPage({ taskbar, wm })` (lo crea `system.js`). Crea `section.user-page[role="dialog"][aria-modal="true"]` in `document.body`: sopra scrivania e finestre, sotto la barra (`src/styles/user-page.css`).

| Membro | Descrizione |
| --- | --- |
| `open()`, `close()`, `toggle()` | Apre, chiude, alterna. `open()` ridisegna tutto (i dati sono sempre aggiornati), azzera la conferma del riavvio e dà il focus a `.up-close`. `close()` rida il focus a `taskbar.startButton` se era dentro la pagina. |
| `isOpen` | Stato. |

- **Chi apre.** `taskbar.startMenu.onUser` (il nome in alto nel menu di avvio). `taskbar.startMenu.onOpen` la chiude.
- **Chi chiude.** Esc (se sta chiedendo di riavviare, Esc torna solo alle azioni), `wm` `open` (si apre una finestra), un `pointerdown` sulla barra.
- **Tastiera.** La pagina ferma la propagazione di `keydown`: le scorciatoie della scrivania non scattano sotto. Tab resta dentro la pagina.
- **Si ridisegna** quando cambiano `theme`, `language`, `userPhoto`, `userPageHidden` o `startupApps` (`settings` `change:<chiave>`), rimettendo il focus sul controllo che l'aveva (`data-key`).
- **Contenuto.** Intestazione (avatar, nome sempre; `details`: nome utente e ruolo, «Amministratore» o «Utente»), azioni, due schede («Account» e «Questa sessione») e il piè di pagina (`about`: `lilOS <version> · <host>`). Una voce spenta (`isUserPageShown`) non si disegna; una scheda senza voci sparisce. Le righe che portano al Pannello di controllo usano `launch('settings', args)` con `{ tab: 'startup', subtab: 'apps' }`, `{ tab: 'storage' }` o `{ tab: 'workspaces' }`.
- **Azioni.** «Blocca» solo con `kernel.mode === 'multi'`. «Chiudi sessione» (`multi`) o «Riavvia sessione» (`single`) chiamano `signOut()`. «Riavvia il sistema» solo con `kernel.data.user.role === 'admin'`: chiede conferma nella pagina («Riavvia ora» / «Annulla») e poi chiama `restartKernel()` ([apps/updates.js](#riavvio)); un errore diventa una notifica.
- **Cosa legge.** Il numero di finestre da `wm.all()`, le app in sottofondo da `running()` (`apps/packages/background.js`), le app all'avvio da `startup.apps()`, lo spazio da `fs` (somma di `size` sotto `fs.root`), il workspace da `workspaceManager()`.

### `signOut()` (`user/UserPage.js`)

`Promise<void>`. Con `kernel.mode !== 'multi'` chiama `restartSystem()`. Altrimenti chiede alle finestre (`windowsMayClose()`; se una rifiuta non fa nulla), poi `kernel.logout()` e `location.reload()`; un errore mostra «Uscita non riuscita: …» e non esce. Lo usano anche i pulsanti del menu di avvio.

### `lockSession()` (`boot/boot.js`)

`Promise<void>`: si risolve quando l'utente è tornato. Non fa nulla con `kernel.mode !== 'multi'` o se è già in corso un accesso. Passi:

1. `kernel.flush()` e `DELETE /api/session`: **la sessione finisce sul kernel** (D48). Se uno dei due fallisce lancia, e lo stato non cambia. Non esegue `onLogout`: le copie locali dei contenuti restano.
2. Mette `inert` su ogni figlio di `document.body` che non lo era.
3. `signInAgain(…)` mostra `loginScreen` con `username` dell'utente, `opaque: true` e il pulsante «Accedi con un altro utente» (`location.reload()`, che porta alla schermata di accesso, perché la sessione è già chiusa).
4. A password corretta toglie `inert` e `kernel.resume()` rimanda ciò che aspettava.

I servizi dell'utente si fermano alla fine della sessione e ripartono al nuovo accesso (evento `user:login`, vedi [startup-services](#startup-services)).

`loginScreen(root, login, { title, text, onto, username, other, opaque })` (`boot/screens.js`) ha tre opzioni nuove, usate con `onto`: `username` (chiede solo la password di quell'utente), `other` (`{ label, onClick }`, un secondo pulsante) e `opaque` (aggiunge la classe `opaque` alla schermata: niente trasparenza sopra lilOS).

### `items.js`

`USER_PAGE_GROUPS`: `[{ key, name }]` in ordine: `header` (Intestazione), `actions` (Azioni), `account` (Account), `session` (Questa sessione), `footer` (Piè di pagina). `USER_PAGE_ITEMS`: `[{ key, group, glyph, name, description }]`, congelati; l'app Pannello di controllo li legge per disegnare la scheda «Pagina utente».

| `key` | `group` | `glyph` | Cosa è |
| --- | --- | --- | --- |
| `details` | `header` | `user` | Nome utente e ruolo sotto il nome |
| `lock` | `actions` | `lock` | Blocca (solo `multi`) |
| `logout` | `actions` | `logout` | Chiudi sessione / Riavvia sessione |
| `restart` | `actions` | `restart` | Riavvia il sistema (solo amministratori) |
| `photo` | `account` | `camera` | Foto profilo: la riga e il pulsante sulla foto |
| `theme` | `account` | `palette` | Tema |
| `language` | `account` | `globe` | Lingua |
| `settings` | `account` | `gear` | Tutte le impostazioni |
| `workspace` | `session` | `workspace` | Workspace attuale |
| `windows` | `session` | `window` | Finestre aperte e app in sottofondo |
| `startup` | `session` | `power` | App all'avvio |
| `storage` | `session` | `disk` | Spazio usato |
| `about` | `footer` | `info` | Versione e indirizzo |

- `isUserPageShown(key)` → `boolean`: `true` se `key` non è in `userPageHidden` (anche per chiavi sconosciute).
- `setUserPageShown(key, shown)`: aggiunge o toglie `key` da `userPageHidden`; ignora le chiavi sconosciute. Una voce nuova nell'elenco è accesa per chi ha già salvato `userPageHidden`.

Il nome e la foto non sono voci: ci sono sempre. Una voce nuova va aggiunta qui (il Pannello di controllo la mostra da solo, ma ha i testi tradotti in `locales.json`: aggiungili) e disegnata in `UserPage.js`.

### `photo.js`

| Export | Descrizione |
| --- | --- |
| `userPhoto()` | La foto salvata (URL `data:`) o `''` se manca o non è valida: solo `data:image/jpeg;base64,` con caratteri base64 e al massimo 200 000 caratteri. I valori salvati non sono affidabili e arrivano in uno stile CSS. |
| `choosePhoto()` | Apre il selettore di file (`image/*`). Rifiuta file sopra 25 MB e quelli che non si aprono come immagine (notifica). Ritaglia il centro a quadrato, 192×192 px, sfondo bianco sotto le trasparenze, JPEG qualità 0,86, e salva in `userPhoto`. |
| `removePhoto()` | `userPhoto` torna `''`. |

Il modulo osserva `userPhoto`: con una foto valida mette `--user-photo: url("…")` e `data-user-photo` su `<html>`, altrimenti li toglie. Ogni avatar con la classe `user-avatar` mostra la foto (CSS in `user-page.css`); la barra, il menu e la pagina usano `avatar(user, 'avatar user-avatar')`. Per far comparire la foto su un altro avatar dell'utente basta aggiungere la classe.

---

## net/ (la rete nell'interfaccia)

La parte di lilOS che mostra la rete: le connessioni come cartelle in **Rete** e la finestra **Trasferimento dati**. Il dato è in [`net`](#net) e nelle cartelle remote di [`fs`](#fs); quello che fa il kernel è in [Rete](#rete-connessioni-e-trasferimenti-net-apinetjs). Il File Manager mostra la sezione Rete, la barra della connessione e la finestra «Connetti a un server» (nell'app, `src/files/network.js` del repository ufficiale).

### `connectNet({ wm, button })` (`net/connect.js`)

Chiamata da `system.js` con il gestore delle finestre e `taskbar.transfersButton`. Senza kernel non fa niente. Poi:

- apre la finestra con il pulsante (`button.onOpen`; ancora un clic la chiude se è quella attiva), con la notifica di fine trasferimento (`systemActions.set('transfers', …)`) e con la scorciatoia `system.transfers` («Apri il trasferimento dati», gruppo `Generale`, nessuna combinazione di serie);
- tiene le connessioni come nodi sotto la cartella Rete (`fs.setMounts`) a ogni evento `mounts` di `net`;
- gira al sistema gli eventi del kernel con `onKernelEvent`: `net.mount` → `net.mountChanged()`, `net.change` → `fs.netChanged(mount, path)`, `net.transfers` → `net.transfersChanged(istantanea)`, `fs.external` → `fs.external(dati)`, `net.notify` → `notify(testo, { level })`; e `fs` `netError` → `notify('Rete: …')`. Quando il flusso si riapre (il kernel si è riavviato o la rete è caduta) rilegge connessioni e trasferimenti;
- apre la finestra da sola in due casi: quando un conflitto aspetta una scelta (una volta per file), e quando una serie di trasferimenti (`transfers.run`) dura più di **5 secondi** (`OPEN_AFTER`); una volta sola per serie: chiusa, resta chiusa fino alla serie seguente.

### `showTransfers(wm)`, `transfersShown(wm)` e `bytes(n)` (`TransfersWindow.js`)

`showTransfers` apre (o porta avanti) la finestra «Trasferimento dati», una per workspace; `transfersShown` dice se è aperta. Chiudere la finestra la nasconde soltanto: i trasferimenti vanno avanti e si fermano solo con `net.cancel`. Mostra, in alto, quanto è stato inviato e ricevuto, poi una sezione per coda con il file in corso, il conflitto da risolvere (Sostituisci, Mantieni entrambi, Salta, con «Per tutti i conflitti di questa coda») e gli elementi (le cartelle si aprono con `net.children`). `bytes(n)` scrive una dimensione («1,5 MB»).

### `class TransfersButton` (`TransfersButton.js`)

Il pulsante dei trasferimenti nell'area di notifica della barra delle applicazioni (`taskbar.transfersButton`): c'è finché il kernel ha trasferimenti (in corso, o falliti da guardare), con un anello che si riempie e il riassunto nel `title`. Un clic chiama `onOpen`.

### Altri punti che toccano la rete

- `systemFs.js`: `NETWORK_NAME` (`'Rete'`, esportato anche da `@lilos/system`); `setupFileSystem` crea la cartella di sistema Rete se `net.available` (`'Rete 2'` se l'utente ne aveva una sua), e `sharedFolder('Rete')` la trova. Non è in `SYSTEM_FOLDERS`.
- `items/itemDrag.js`: tra la home e una connessione, o tra due connessioni, il rilascio **copia** con `net.transfer` (errore: notifica «Trasferimento non avviato: …»); dentro la stessa connessione sposta come altrove. Dal cestino non si ripristina in una cartella remota.
- `items/confirmRemove.js` e `items/fsHistory.js`: i nodi di una connessione si eliminano dal server per sempre, con la conferma **sempre** (anche con `deleteConfirm` spento): «Elimina dal server «nome» (definitivo)»; se il protocollo ha `recycles` (OneDrive), «Elimina da OneDrive «nome» (va nel suo cestino)». Non entrano nella cronologia per annullare.
- `desktop/itemIcons.js`: la cartella di una connessione (`mount`) ha l'icona `globe`; i file remoti (`net`) non hanno miniature.
- `notifications/card.js`: `systemActions` (`Map`, entry → `fn(args)`) dà un'azione al clic sulle notifiche che manda lilOS (`from.system`): quelle dei trasferimenti hanno `{ entry: 'transfers' }`.
- `apps/services.js`: `onKernelEvent(evento, fn)` ascolta un evento del flusso `/api/services-events` (`fn(dati)`); con l'evento `''` la funzione riceve la riapertura del flusso. Da chiamare prima di `connectServices()`.

---
## automation/ (le automazioni nel sistema)

Quello che serve al sistema per le automazioni ([D64](../interna/decisioni.md#d64-le-automazioni-operazioni-con-un-senso-dichiarate-dalle-app)): le azioni di lilOS, il registratore dei suoi eventi, i file `.automata`, l'esecuzione e l'elenco delle automazioni dell'utente. Il catalogo e i passi stanno nell'SDK ([automation](#sdkcoreautomationjs)); l'interfaccia è dell'app Automata, che usa `automations` di `@lilos/system`.

### `index.js`

`connectAutomation({ wm, desktop, workspaces, taskbar })`: chiamata da `system.js` dopo `connectSystemEvents`. Definisce le azioni di lilOS, collega quelle delle app, il registratore, l'elenco (la cui selezione per le scorciatoie è quella della finestra attiva, se ha `win.selection`, altrimenti nessuna; senza finestra attiva, quella della scrivania) e l'avvio da solo ([triggers.js](#avvio-da-solo-triggersjs)), mette il pulsante **REC** nell'area di notifica della barra (`.tb-notify-area`; nascosto se nessuno registra, grigio in pausa, mostra i passi; un clic apre la finestra `recorder` di Automata) e, con passi registrati, chiede conferma se la pagina si ricarica (`beforeunload`).

**`automations`** (`@lilos/system`, oggetto congelato):

| Membro | Descrizione |
| --- | --- |
| `FORMAT`, `INPUTS`, `ON_ERROR`, `MODES`, `TRIGGERS`, `EXT`, `FOLDER` | `'lilos.automation'`; `['none', 'files', 'folder']`; `['stop', 'skip', 'ask']`; `['use', 'ask', 'template']`; `['time', 'every', 'login', 'folder']` (i tipi di avvio da solo, dalla 1.17.0); `'automata'` (estensione dei file); `'~/Automazioni'` |
| `startRecording({ items = [] })` | Comincia a registrare. `items`: i nodi da cui parte la registrazione (diventano ciò su cui lavora l'automazione); quelli che non esistono si scartano. |
| `pauseRecording(on = true)` | Pausa o ripresa. |
| `stopRecording()` | Finisce: `{ steps, inputs }` (i passi senza quelli ritirati, e gli `items` dati all'inizio). |
| `discardRecording()` | Finisce e dimentica. |
| `recordingInputs()` | Gli `items` della registrazione in corso. |
| `fromRecording(steps, { name, inputs })` | Un'automazione (documento) dai passi registrati. |
| `check(testo \| oggetto)` | Controlla un'automazione letta da un file e la restituisce pulita; lancia se non lo è. |
| `nodesOf(passo)` | Gli id dei nodi che un passo registrato nomina. |
| `fillTemplate(modello, { node, n, now })` | Riempie un modello (`{nome}`…). |
| `run(documento, opzioni)` | Esegue (vedi sotto). |
| `RunStopped` | L'errore con cui un'esecuzione si ferma per volere dell'utente (`control.stopped`). |
| `folder()` | La cartella `~/Automazioni` come nodo; la crea se manca. |
| `library` | L'elenco delle automazioni dell'utente (vedi sotto). |

### Le azioni di lilOS (`actions.js`)

Id `lilos.<parola>`, definite da `defineSystemActions({ wm, desktop, workspaces })`. `item` e `items` sono `subject`.

| Azione | Parametri | Note |
| --- | --- | --- |
| `lilos.create` | `folder`, `name`, `kind` (`file` o `folder`) | `result: 'file'`. Il nome è reso unico. |
| `lilos.rename` | `item`, `name` | |
| `lilos.move` | `items`, `to` | |
| `lilos.copy` | `items`, `to` | `result: 'file'`. Le cartelle si copiano con tutto il contenuto (le app dentro no). |
| `lilos.trash` | `items` | Quelli che non esistono più si saltano. |
| `lilos.restore` | `items` | |
| `lilos.delete` | `items` | `confirm`. Dal Cestino svuota quegli elementi, altrimenti li elimina per sempre. |
| `lilos.emptyTrash` | — | `confirm`. |
| `lilos.tags` | `item`, `tags` | |
| `lilos.open` | `item`, `app` | Una cartella si apre nel File Manager; un file con `app` se è installata e apre quel tipo, altrimenti con l'app solita. |
| `lilos.launch` | `app`, `entry` | |
| `lilos.close` | `app`, `file` | Chiude la finestra dell'app che mostra `file` (altrimenti l'ultima dell'app). |
| `lilos.workspace` | `to` | Lancia se il workspace non c'è più. |
| `lilos.setting` | `key`, `value` | `settings.set`. |
| `lilos.place` | `places`: `[{ id, x, y }]` | `Desktop.place`. |
| `lilos.arrange` | — | `Desktop.arrange`. |

Le azioni che nominano un nodo che non esiste più lanciano `L’elemento non esiste più` (tranne `lilos.trash` e `lilos.restore`, che lo saltano).

### Il registratore (`recorder.js`)

Mentre si registra, `connectRecorder({ wm })` si iscrive (fase `after`, a fine catena, con il proprietario `Automata`) agli eventi delle pipe e trasforma ciascuno in un passo; quando la registrazione finisce si disiscrive. Non guarda niente se nessuno registra, e niente in pausa o mentre l'esecuzione è in `quiet`.

| Evento | Passo |
| --- | --- |
| `file.create` | `lilos.create` (con `result`) |
| `file.rename` | `lilos.rename`, con `defaults.name` il nome di prima |
| `file.move` | `lilos.move`, un passo solo per le cose spostate insieme nella stessa cartella |
| `file.copy` | `lilos.copy`, raggruppato per cartella di destinazione, con `result` le copie |
| `trash.put`, `trash.restore` | `lilos.trash`, `lilos.restore` |
| `file.remove` | `lilos.delete` |
| `trash.purge` | `lilos.emptyTrash` se dopo non resta niente nel Cestino, altrimenti `lilos.delete` con gli `ids` |
| `tags.assign` | `lilos.tags` |
| `file.open` | `lilos.open` |
| `app.launch` | `lilos.launch` (non se ha `args.file` o `args.files`: ci pensa `file.open`); `lilos.open` della cartella per il File Manager aperto su una cartella |
| `workspace.switch` | `lilos.workspace`, con `defaults.to` il workspace di prima |
| `settings.change` | `lilos.setting`, un passo solo per le modifiche della stessa chiave entro 500 ms |
| `desk.place` | `reason: 'drag'`: `lilos.place`; `'arrange'`: `lilos.arrange`; `'place'`: niente (lo fa l'esecuzione) |
| chiusura di una finestra (`wm`, `close`) | `lilos.close` con il file che la finestra aveva detto di mostrare (`fileOfWindow`) |

Cose che lascia fuori: tutto ciò che sta nella cartella `~/Automazioni` e le finestre e gli avvii di Automata. Le cose dello stesso istante (40 ms) con la stessa chiave sono un passo solo. Registra anche, per ogni passo, dove stavano i nodi (`recordedPath(id)`), da usare come riferimento di riserva. `nodesOf(passo)` e `flushRecorder()` (finisce di raccogliere quello che aspetta) sono usati da `index.js`.

### Le azioni delle app (`apps.js`)

`connectAppActions()`: per ogni app installata con `contributes.automation` mette le azioni nel catalogo (`automation.define`, con `app` e le etichette già tradotte da `localizeManifest`), le toglie e le rimette quando l'app cambia o viene tolta (`registry` `change`) e quando cambia la lingua (`locale` `change`). Scarta le azioni il cui id non inizia con `<id app>.` e non considera più di 30 azioni per app. Solo per i pacchetti installati (`app.package`).

### Il documento (`document.js`)

Il file `.automata` è JSON:

```json
{
  "format": "lilos.automation", "version": 1,
  "name": "Prepara foto per il web", "description": "",
  "input": "files",
  "launch": { "menu": true, "ext": ["jpg", "png"], "shortcut": "Ctrl+Alt+W", "command": "web",
    "triggers": [{ "type": "time", "at": "08:30", "days": [1, 2, 3, 4, 5], "catchUp": true }] },
  "steps": [
    { "action": "photo.resize", "enabled": true, "confirm": false, "onError": "stop",
      "params": { "width": 1600, "unit": "pixels", "keepRatio": true },
      "file": { "input": true },
      "defaults": { "width": 4000 }, "changed": ["width"],
      "fields": { "width": { "mode": "ask", "question": "Larghezza?" } } },
    { "action": "photo.saveAs", "enabled": true, "confirm": false, "onError": "stop",
      "params": { "format": "jpeg", "name": "x", "folder": { "path": "~/Immagini/web" } },
      "file": { "input": true }, "changed": ["format"],
      "fields": { "name": { "mode": "template", "template": "{nome}-web.{est}" } } }
  ]
}
```

| Campo | Significato |
| --- | --- |
| `input` | `none` (niente), `files` (i passi girano una volta per ogni file scelto all'avvio), `folder` (una cartella). |
| `launch` | `menu` (voce nel menu «Automazioni» di file e cartelle), `ext` (estensioni, minuscole, al massimo 30; vuoto: ogni file), `shortcut` (combinazione, per esempio `Ctrl+Alt+W`), `command` (nome per il Terminale, `/^[a-z][\w.-]{0,39}$/`), `triggers` (quando parte da sola, vedi sotto; al massimo 10, `[]` se mancano). |
| `steps[].action` | L'id dell'azione. |
| `steps[].enabled` | `false`: l'esecuzione lo salta. |
| `steps[].confirm` | Chiede conferma prima. |
| `steps[].onError` | `stop` (predefinito), `skip` o `ask`. |
| `steps[].params` | I valori; i parametri di tipo `file`, `files`, `folder` e `places` contengono riferimenti. |
| `steps[].file` | Il file su cui lavora la finestra (azioni con `target: 'window'`): un riferimento. |
| `steps[].defaults`, `changed` | Cosa proponeva la finestra e i parametri cambiati (i `defaults` dei tipi di nodo si scartano). |
| `steps[].fields` | Per ogni parametro: `mode` (`use`, `ask`, `template`; `template` solo per i `text`, `ask` solo per i tipi che si possono chiedere, un `secret` è sempre `ask`), `question?`, `template?`. |
| `steps[].note` | Una nota, fino a 500 caratteri. |

**Riferimenti** a un nodo: `{ input: true }` (l'elemento su cui lavora l'automazione adesso; con `parent: true`, la sua cartella), `{ step: n, index? }` (ciò che ha fatto il passo `n`, contando da 0; `index` sceglie fra più elementi), `{ path: '~/Documenti/a.txt', id? }` (un nodo fisso: per `id`, altrimenti per percorso). I posti sulla scrivania sono `[{ ref, x, y }]`.

**Avvio da solo** (`launch.triggers`, al massimo 10; `checkDocument` scarta quelli non validi). `TRIGGERS` (`document.js`, anche in `automations.TRIGGERS`) elenca i tipi:

| Tipo | Campi | Significato |
| --- | --- | --- |
| `time` | `at` (`'HH:MM'`, 24 ore), `days` (numeri da 1, lunedì, a 7, domenica, senza doppi e in ordine; `[]`: ogni giorno), `catchUp` (booleano, `false` se manca) | A quell'ora nei giorni indicati. `catchUp`: se era chiuso, parte all'accesso. |
| `every` | `minutes` (intero da 5 a 1440) | Ogni tanti minuti. |
| `login` | nessuno | Quando l'utente entra. |
| `folder` | `folder` (riferimento fisso `{ path, id? }`; non `input` né `step`) | Quando un file viene creato, spostato o copiato in quella cartella. Con `launch.ext` solo le estensioni indicate. I file sono gli elementi dell'esecuzione. |

```json
{ "type": "time", "at": "08:30", "days": [1, 2, 3, 4, 5], "catchUp": true }
{ "type": "every", "minutes": 30 }
{ "type": "login" }
{ "type": "folder", "folder": { "path": "~/Download" } }
```

`checkDocument` non controlla che `input` sia `none` con `time`, `every` e `login`: lo chiede l'interfaccia di Automata. Con un altro `input` quelle automazioni, partendo da sole, non hanno elementi e non fanno niente (a meno che chiedano qualcosa: allora si apre la finestra di Automata).

| Export | Descrizione |
| --- | --- |
| `checkDocument(testo \| oggetto)` | Controlla (il file può venire da chiunque) e restituisce un documento pulito: nome fino a 80 caratteri («Automazione» se manca), descrizione fino a 500, fino a 500 passi. Lancia `Non è un’automazione di lilOS` se non lo è. Un passo di un'azione sconosciuta (app non installata) resta com'è, con `missing: true`, e non si può eseguire. |
| `fromRecording(passi, { name = '', inputs = [] })` | Un documento dai passi registrati: i nodi che erano `inputs` (o, se mancano, i primi su cui lavora un passo) diventano `{ input: true }`, quelli fatti da un passo precedente `{ step }`, gli altri `{ path, id }`. `input` è `folder` con una sola cartella, `files` con altro, `none` senza. |

### Esecuzione (`runner.js`)

`runAutomation(documento, { items = [], values = {}, ui = {}, control = { stopped: false, paused: null }, from = 0, only = false })` → `Promise<{ items, done, skipped, failed, stopped }>`.

- **Una passata per elemento.** Con `input: 'files'` i passi girano una volta per ogni id di `items`; con `folder`, una volta sul primo; con `none`, una volta. Con `input` diverso da `none` e senza `items` lancia `Scegli su cosa lavorare`.
- **`from` e `only`** partono dal passo `from` (quelli prima non girano: quello che avrebbero fatto manca) o eseguono solo quello.
- **Tutto in `automation.quiet`**: durante l'esecuzione niente viene registrato.
- **Per ogni passo**, nell'ordine: i riferimenti diventano id; i campi `template` si riempiono; i `values` dati per nome (`{ width: 1200 }`, anche come testo: `'1200'`) prendono il posto del valore registrato e non vengono chiesti (il nome vale per ogni passo che ha un parametro con quel nome); i campi `ask` si chiedono con `ui.ask`; se `confirm`, `ui.confirm`; poi l'azione.
- **Fare l'azione** (`perform`): la `run` di lilOS; per `target: 'window'`, il gestore della finestra che mostra il file del passo (se non c'è, `launch(app, { file })` e `waitForHandler`); per `entry`, il punto d'ingresso con `{ automation: { action, params }, files }`, dove `files` sono i file che il passo nomina (se l'entry è una finestra, `launch(app, dati, entry, { files })`, senza risultato). Un'app non installata: `L’app di questo passo non è installata`.
- **Il risultato** del passo (`id` o lista) serve ai passi seguenti (`{ step }`); se l'azione non lo dà vale il suo parametro `subject`.
- **Errori**: con `onError: 'skip'` il passo si conta fra i `failed` e si va avanti; con `'ask'` e `ui.failed` si chiede (`retry`, `skip`, `stop`); altrimenti l'errore, `Passo n (etichetta): messaggio`, ferma l'esecuzione e la `Promise` rifiuta.
- **`control`**: `stopped: true` ferma al prossimo punto di controllo (prima di ogni passo e dopo le domande); `paused` è una `Promise` che si attende lì.

`ui` (tutte le funzioni sono facoltative):

| Funzione | Quando | Risposta |
| --- | --- | --- |
| `ask({ step, index, item, label, fields: [{ name, param, value, question }] })` | Passo con campi `ask` | `{ values, remember? }`, `'skip'` o `'stop'`. `remember`: la stessa risposta per i prossimi elementi. Senza `ask` valgono i valori registrati (un `secret` senza valore fa fallire il passo con `Questo passo chiede una password`). |
| `confirm({ step, index, item, label, params, file })` | Passo con `confirm` | `'run'`, `'skip'` o `'stop'`. Senza `confirm` il passo si fa. |
| `failed({ step, index, item, error })` | Passo con `onError: 'ask'` che non riesce | `'retry'`, `'skip'` o `'stop'` |
| `progress(evento)` | Sempre | Vedi sotto |

Eventi di `progress`: `{ type: 'item', item, index, total }` (comincia un elemento), `'step'` (`index`, `item`, `label`), `'done'` (`index`, `item`), `'skipped'` (`index`, `item`, `reason`: `'off'` o `'user'`), `'failed'` (`index`, `item`, `error`) e `'end'` (i conteggi, come il valore restituito).

`fillTemplate(modello, { node = null, n = 1, now = new Date() })`: sostituisce `{nome}` (`{name}`), `{est}` (`{ext}`), `{data}` (`{date}`, `2026-11-02`), `{ora}` (`{time}`, `15.30`), `{n}`, `{cartella}` (`{folder}`, il nome della cartella del nodo). Quello che non conosce lo lascia com'è; un punto finale si toglie.

### L'elenco (`library.js`)

`library` tiene l'indice dei file `.automata` della home (tutta la home, tranne le cartelle di rete; al massimo 500). Lo rilegge un attimo (300 ms) dopo ogni cambiamento di file o del Cestino.

| Membro | Descrizione |
| --- | --- |
| `list()` | `[{ id, path, name, description, input, launch, steps }]` per nome. `id` è l'id del file; `steps` è il numero dei passi. |
| `get(chiave)` | Per id del file, poi per `launch.command`, poi per nome (senza distinguere maiuscole); `null` se non c'è. |
| `refresh()`, `ready()` | Rilegge tutto; `Promise` della lettura in corso o, se la prima non è ancora finita, della prima. |
| `start(id, items = [])` | Apre la finestra `run` di Automata con `{ automation: id, items }`. Senza Automata: una notifica di avviso. |
| `record(items = [])` | Apre la finestra `recorder` di Automata. Senza Automata: una notifica di avviso. |
| `menuEntries(ids)` | La voce **Automazioni** per i menu di file e cartelle (la aggiunge `appActionEntries`): le automazioni con `launch.menu` che stanno bene a quei nodi (`input: 'files'`: tutti file, con le estensioni di `launch.ext` se ce ne sono; `input: 'folder'`: una sola cartella; `input: 'none'` mai), poi **Registra partendo da qui**. `[]` senza Automata o se un nodo è nel Cestino. |
| evento `change` | L'elenco è cambiato |

Le scorciatoie (`launch.shortcut`) si registrano con `shortcuts.register` (id `automation.<id del file>`, gruppo `Automazioni`). Un file può venire da chiunque: si accettano solo combinazioni che iniziano con Ctrl o Alt, valide e libere (`shortcuts.validate`, `shortcuts.owner`). Premuta, parte con la selezione della finestra attiva (`win.selection`, vedi [Window](#class-window-extends-emitter); nessuna se non la dà) o, senza finestra attiva, con quella della scrivania; per `input: 'none'` parte subito.

### Avvio da solo (`triggers.js`)

`connectTriggers()`, chiamata da `connectAutomation`, fa partire le automazioni con `launch.triggers`. Vive nella pagina: parte solo mentre lilOS è aperto.

- **Una scheda per utente.** Il lavoro lo fa la scheda che ha il Web Lock `lilos:automazioni:<id utente>` (`navigator.locks`; senza, ogni scheda lavora). Chiusa quella, ne prende il posto un'altra. La scheda che subentra dopo i primi 15 secondi dall'apertura della pagina non rifà gli avvii «all'accesso»: controlla solo gli orari.
- **Controllo ogni 20 secondi** per `time` e `every`; `login` all'evento `user:login` (e `time` con `catchUp`, subito dopo); `folder` ai cambiamenti di `fs` (`create` e `move` di un file nella cartella; si aspettano 1,5 secondi perché i file arrivati insieme facciano una sola esecuzione). Si aspetta che `library.ready()` abbia finito la prima lettura.
- **Ultima esecuzione.** `storage` `automation-runs`, per utente: `{ '<id del file>#<posizione del motivo>': millisecondi }`. Un motivo mai visto comincia solo a contare (si scrive l'istante, senza eseguire). Un `time` è dovuto se l'ultima occorrenza dell'ora (fino a 7 giorni indietro) è dopo l'ultima esecuzione e, senza `catchUp`, è passata da non più di 2 minuti. Un `every` è dovuto se è passato l'intervallo.
- **Cartelle.** Gli eventi sono ignorati mentre un'automazione gira (`automation.quietNow`: niente cicli) e per i file dentro `~/Automazioni`. `input: 'files'` riceve i file arrivati; `'folder'`, la cartella osservata; `'none'`, niente.
- **Chi risponde.** Se un passo abilitato ha `confirm`, `onError: 'ask'`, un campo `ask` o è `missing`, si chiama `library.start(id, elementi)`: si apre la finestra `run` di Automata. Altrimenti `runAutomation` gira in silenzio e una notifica dice com'è andata: errore sempre (`level: 'error'`), riuscita (`level: 'success'`) tranne per `every`. Un'esecuzione per volta per automazione; senza Automata installata non parte niente. Con `input` diverso da `none` e senza elementi non si fa niente.

Esportati: `connectTriggers()`, `lastOccurrence(trigger, adesso?)` (l'ultimo istante di un `time` fino a adesso, o `null`) e `isDue(trigger, ultima, adesso?)`.

---

## schedule/ (la pianificazione nell'interfaccia)

Il dato è in [`schedule`](#schedule) (SDK) e nel kernel ([Pianificazione](#pianificazione-schedule-apischedulejs)); l'app **Pianificazione** (repository ufficiale) è la sua finestra. Nella pagina c'è solo ciò che il kernel non può fare: le operazioni nel browser.

### `connectSchedule({ wm })` (`schedule/runner.js`)

Chiamata da `system.js` prima di `connectServices()` (che aggiunge i suoi ascoltatori al flusso del kernel). Senza kernel non fa niente.

- Gira a `schedule` gli eventi `schedule.change`, `schedule.run` e `schedule.due` del flusso (`onKernelEvent` → `schedule.received`). Alla riconnessione del flusso emette `change`, perché gli elenchi si rileggano.
- A una corsa `due` fa `schedule.claim(run)`: se un'altra pagina l'ha già presa (`conflict`) non fa niente; altrimenti fa quello che dice `what` e risponde con `schedule.report(run, { state, text })`. `open` con `file` apre il file con `openFile`; con `app` fa `launch(app, args, entry)`; `automation` fa `launch('automata', { automation, items: [], values }, 'run')`. Se l'app, il file o Automata non ci sono, l'esito è `error`.
- Dopo 3 secondi dall'avvio, e a ogni riconnessione, legge `schedule.pending()` (le corse che aspettavano lilOS aperto): quelle di operazioni con `options.ask: false` le fa subito; per le altre apre la finestra **Operazioni in attesa**, con **Esegui ora** e **Salta** per ognuna e «D'ora in poi esegui senza chiedere» (mette `ask: false` nell'operazione). La apre una sola pagina (Web Lock `lilos:schedule-pending:<id utente>`). **Salta** manda `report(run, { state: 'skipped' })`.

## sdk/ui/

### `icons.js`

- `icon(name, className = 'ico')`: simbolo SVG 24×24 disegnato con `currentColor`. Con un nome sconosciuto mostra `help`.
- `logo(className = 'logo')`: il logo di lilOS.

Simboli disponibili: `search`, `plus`, `minus`, `x`, `fit`, `zoom`, `grid`, `folder`, `folderPlus`, `file`, `filePlus`, `open`, `pencil`, `trash`, `globe`, `code`, `terminal`, `gear`, `calendar`, `image`, `music`, `mail`, `power`, `help`, `info`, `max`, `palette`, `disk`, `user`, `window`, `keyboard`, `accessibility`, `arrowLeft`, `arrowRight`, `arrowDown`, `arrowUp`, `list`, `home`, `download`, `monitor`, `check`, `save`, `star`, `grip`, `lasso`, `folderOpen`, `sidebar`, `workarea`, `workspace`, `undo`, `redo`, `bell`, `tag`, `eyeOff`, `link`, `logout`, `restart`, `camera`, `calculator`, `chip`, `archive`, `cloud`, `warning`, `error`.

### `toast.js`

`toast(text, { level = 'info' })`: **vecchio nome**, tenuto per le app che lo chiamano ancora. Non mostra niente in basso: manda una notifica da lilOS (`notifications.send({ text, level })`), che compare nella barra delle notifiche e resta nella finestra Notifiche. `timeout` non esiste più (viene ignorato); la durata della barra la sceglie l'utente. Un errore di invio finisce in console. Il CSS `.toast` non c'è più in `sdk/styles/components.css`. Nel codice nuovo usa `notifications.send`.

```js
toast('Elemento eliminato', { level: 'success' });   // = notifications.send({ text: 'Elemento eliminato', level: 'success' })
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

`appIcon(app, className?)`: l'icona di un'app (`{ glyph, color }`, come le voci del registro), nello stile «ritaglio»: un quadrato pieno del colore dell'app con il simbolo ritagliato, che lascia vedere ciò che c'è dietro. Con un'app sconosciuta mostra un quadrato grigio con il punto interrogativo. `className` si aggiunge a `app-icon` (non la sostituisce). Il contesto decide solo la dimensione (`width` e `height` su `.app-icon`): forma, angoli e proporzioni del simbolo sono gli stessi a ogni misura, e il quadrato lo disegna `::before`, quindi `border-radius`, `background` o regole su `.app-icon .ico` del contesto non hanno effetto.

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
| `actionButton({ label, primary, danger, spinner, onClick })` | `button` | Pulsante. Con `spinner: true`, se `onClick` restituisce una Promise il pulsante aspetta come con `busyButton`. Non va messo quando la Promise aspetta l'utente (una finestra di scelta). |
| `busyButton(button, work)` | Promise | Mette un pulsante in attesa finché `work` (una Promise o una funzione che la restituisce) non finisce: rotella accanto all'etichetta, `disabled` e `aria-busy="true"`. Risolve o fallisce come `work`. La rotella viene da `button[aria-busy="true"]` in `controls.css`: vale per ogni `button`, anche impostando l'attributo a mano. |

---

## sdk/ui/shortcutField.js

### `shortcutField(id)` → `HTMLElement`

Editor delle combinazioni di un comando, usato nell'app Pannello di controllo:

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
  focusable = true,                                             // false: non prende mai il focus
  onTop = false,                                                // true: resta sopra le finestre senza
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

**Finestre che non prendono il focus** (`focusable: false`, per le tastiere a schermo). Cliccarla la porta avanti, ma il focus e la finestra attiva restano dove erano: il `mousedown` fuori da `input`, `textarea`, `select` e `[contenteditable]` ha `preventDefault`, così il focus del browser non si sposta. Ha la classe `no-focus`, appare sempre inattiva, non diventa mai la finestra attiva e non viene scelta per il focus quando un'altra si chiude. `onTop: true` la tiene sopra le finestre senza (`z-index` da 900 invece che da 100, ma sotto gli elementi della scrivania trascinati). Le due opzioni sono indipendenti. Le gestisce il `WindowManager`.

DOM: `section.window[data-kind="window"][role="dialog"]` con `.win-titlebar` (e i pulsanti in `.win-controls`), `.win-body` (`data-wheel="native"`) e `.win-edges` con una `.win-edge[data-edge]` per ogni bordo attivo. Le maniglie stanno a cavallo del bordo (4 px dentro e 4 fuori). La classe `resizable` indica che c'è almeno un bordo attivo.

| Membro | Descrizione |
| --- | --- |
| `el`, `titlebar`, `body` | Elementi DOM. Il contenuto va in `body`. |
| `title`, `subtitle`, `glyph` | Titolo, sottotitolo, simbolo. |
| `controls` | Copia di `{ minimize, maximize, close }`. |
| `resizable` | Bordi attivi, nell'ordine di `WINDOW_EDGES` (`[]` se non si ridimensiona). |
| `minWidth`, `minHeight`, `maxWidth`, `maxHeight` | Limiti delle dimensioni. |
| `focusable`, `onTop` | Le opzioni del costruttore, lette dal `WindowManager`. |
| `setControl(name, enabled)`, `setControls({ … })` | Accende o spegne uno o più controlli; emette `controls`. |
| `setResizable(value)` | `true`, `false` o elenco di bordi; emette `controls`. |
| `constrain(w, h)` | `{ w, h }` riportati entro i limiti. |
| `canClose` | Facoltativo: funzione `() => boolean \| Promise<boolean>` chiesta dal gestore prima di chiudere su richiesta dell'utente (pulsante, Alt W). Per esempio un'app che non tiene da parte il testo la usa per proporre di salvare. |
| `getState` | Facoltativo: funzione `() => dati JSON` (oggetto semplice) con cui ricreare la finestra. Le workarea la chiamano prima di chiudere le finestre delle app e danno il risultato all'app come `args` quando la riaprono. Vedi la [ricetta](ricette.md#far-riaprire-la-finestra-di-unapp-da-una-workarea). Predefinito `null`: la finestra si riapre senza argomenti. Per dire quali file mostra, restituisce `file` (id) o, con più schede, `files` (lista di id): il sistema li legge per `files:locked` e `files:shown`. |
| `selection` | Facoltativo: funzione `() => string[]` con gli id dei file e delle cartelle che l'utente ha selezionato nella finestra. La usa ciò che agisce su «la selezione» da fuori (la scorciatoia di un'automazione, `connectAutomation`): con una finestra attiva si chiede a lei; senza `selection` vale come nessuna selezione. Gli id che non esistono più si scartano. Il File Manager risponde con la selezione della vista (vuota nel cestino). |
| `closeFiles` | Facoltativo: funzione `(ids) => void` che chiude solo ciò che mostra quei file (le sue schede), senza chiudere la finestra. La chiama `files:locked` al posto di `wm.requestClose`. |
| `active` | `true` se la finestra è nella pagina, visibile e attiva. |
| `signal` | `AbortSignal` annullato da `destroy()`: passalo ad `addEventListener(…, { signal })` per i listener del contenuto, così spariscono con la finestra. |
| `setTitle(title, subtitle?)` | Aggiorna la barra del titolo (`Titolo — Sottotitolo`) ed emette `title`. |
| `moveTo(x, y)`, `resizeTo(w, h)` | Posizione in coordinate mondo; dimensioni limitate da minimi e massimi. |
| `setActive(bool)`, `setMaximized(bool)` | Aspetto attivo/inattivo e ingrandito. |
| `destroy()` | Annulla `signal`, toglie l'elemento ed emette `destroy`. |

Eventi: `minimize`, `maximize` (anche doppio clic sulla barra del titolo, se il controllo è attivo), `close` sono richieste dei pulsanti; `title`, `controls` (`{ controls, resizable }`) e `destroy` sono cambiamenti di stato. `dismiss` precede `destroy` quando la finestra si chiude perché le è stato chiesto (`wm.requestClose`: pulsante, scorciatoia, file bloccato di nuovo, app nascosta) e quindi non tornerà: chi tiene da parte il suo stato per riaprirlo qui lo lascia andare (o, come l’Editor, lo passa alla prossima finestra nuova). Non viene emesso quando lilOS chiude la finestra per ricrearla dallo stato (`wm.close`: workarea ridotta a icona, aggiornamento dell'app). Per convenzione il launcher emette `launch` (con gli argomenti) quando l'app viene avviata di nuovo mentre la finestra è aperta.

---

## sdk/ui/messageBox.js

### `messageBox(win, options?)` → `Promise<string | null>`

Un messaggio per l'utente, o una scelta da fare, sopra il contenuto di una finestra. Finché non risponde, il contenuto della finestra non si usa (il corpo è `inert`); la barra del titolo sì: la finestra si sposta e si chiude. Con `win` a `null` copre tutta la pagina.

```js
import { messageBox } from '@lilos/sdk';

const answer = await messageBox(win, {
  icon: 'error',
  title: 'Percorso non trovato',
  text: '«/home/eugenio/Fotoo» non esiste.',
  buttons: ['retry', 'cancel'],
});
if (answer === 'retry') riprova();
```

| Opzione | Predefinito | Significato |
| --- | --- | --- |
| `icon` | `null` | `'info'` (colore `--accent`), `'warning'` (`--warning`), `'error'` (`--danger`) o niente. Con `warning` ed `error` il ruolo è `alertdialog`. |
| `title` | `''` | Facoltativo: in grassetto sopra il testo. |
| `text` | `''` | Testo semplice (mai HTML); gli a capo restano. Un testo più alto della finestra scorre dentro il riquadro. |
| `buttons` | `['ok']` | Quali tasti: `'ok'`, `'cancel'`, `'continue'`, `'retry'`, in qualsiasi combinazione; `[]` nessuno. L'ordine sullo schermo è sempre Annulla, Riprova, Continua, OK. Le etichette seguono la lingua del sistema (italiano o inglese). |
| `default` | il tasto più a destra che non sia Annulla | Il tasto di **Invio**, evidenziato e con il focus all'apertura. Un valore che non è tra i tasti si ignora. |

Restituisce il tasto premuto (`'ok'`, `'cancel'`, `'continue'`, `'retry'`) oppure `null`. **Esc** preme Annulla se c'è, altrimenti chiude con `null`; anche la finestra chiusa dà `null`. La promessa ha `close(value = null)`, per togliere il riquadro dal codice (un messagebox senza tasti si toglie così o con Esc).

- **Tastiera**: Tab e le frecce girano tra i tasti senza uscire dal riquadro. I tasti senza Ctrl, Alt o Meta non arrivano alle scorciatoie di lilOS (Canc, lettere…); le combinazioni sì.
- **Larghezza**: i tasti stanno sempre su una riga. Il riquadro è largo 400 px, o di più se i tasti lo chiedono; se la finestra è più stretta si allarga (verso destra) e torna com'era alla chiusura, a meno che nel frattempo l'utente l'abbia ridimensionata. Una finestra ingrandita non cambia.
- **Focus**: alla chiusura torna dove era prima, se quell'elemento c'è ancora.
- **Più messagebox** sulla stessa finestra si sovrappongono; il contenuto torna usabile quando sono chiusi tutti.
- **Tema scuro**: velo più scuro e riquadro su `--chrome`, per staccarlo dalla finestra.
- **DOM**: `.msgbox-layer` (dentro `win.el`, sotto la barra del titolo, `z-index` 2; con `null`: `.msgbox-layer.page` in `body`, `position: fixed`) contiene `.msgbox.info|warning|error` con `.msgbox-head` (`.msgbox-icon`, `.msgbox-main` con `.msgbox-title` e `.msgbox-text`) e `.msgbox-buttons` (pulsanti `.ctl-btn`, `data-value` il tasto, `.primary` quello predefinito). Un clic accanto al riquadro lo fa pulsare (`.nudge`).

Le app isolate non lo hanno ancora (non c'è in `lilos.ui`). Un'app di sistema che deve girare anche su un lilOS più vecchio lo legge dal modulo (`import * as sdk from '@lilos/sdk'`, poi `sdk.messageBox?.(…)`), come fa il File Manager.

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

Una `Window` con una `SettingsView` nel corpo (`win.view`). Il sottotitolo segue il tab principale: "Pannello di controllo — Aspetto". È la base di **ogni** finestra che modifica impostazioni.

---

## sdk/core/menus.js

### `menus`

Menu configurabili dall'utente. Le parti del sistema dichiarano le **azioni** e la **disposizione predefinita** di un menu; l'utente cambia la disposizione (Pannello di controllo → Usabilità → Menu contestuale), salvata in `lilos:menus` e validata contro le azioni conosciute.

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

## apps/filePicker.js

`pickFile(openWindow, { title, exts?, text?, kind?, within?, exclude? })` → `Promise<node | null>`: finestra per scegliere un file di lilOS (ricerca per nome o percorso, frecce, Invio, doppio clic, Esc).

- `kind: 'folder'` sceglie una cartella invece di un file (la radice compare come "Home").
- `within`: solo quella cartella e ciò che contiene (con `kind: 'folder'` è scelta anche lei).
- `exclude`: un nodo da nascondere con tutto il suo contenuto (per esempio la cartella da spostare).

---

## Il kernel

Il backend (`system/kernel/`). Panoramica: [README per sviluppatori](README.md#kernel); decisioni D31-D33 e D37-D41. Il frontend lo usa con [`kernel`](#sdkcorekerneljs).

### API HTTP

Tutto sta sotto `/api`. Le risposte sono JSON, con `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` e una CSP che vieta tutto. Gli errori sono `{ error: codice, message, details? }` (`details` c'è solo per `untrusted` e `secret_required`, vedi [Rete](#rete-connessioni-e-trasferimenti-net-apinetjs)) con questi stati: `invalid` 400, `unauthorized` 401, `invalid_credentials` 401, `forbidden` 403, `not_found` 404, `conflict` 409, `untrusted` 409, `too_large` 413, `secret_required` 428, `rate_limited` 429 (con `Retry-After`), `unavailable` 503; un errore non previsto è `internal` 500 e il messaggio non dice altro. Un metodo non ammesso dà 405 con `Allow`.

Le richieste che modificano (tutte tranne `GET` e `HEAD`) devono avere l'intestazione `X-Lilos: 1` e, se il browser manda `Origin`, questa deve essere in `origins` della configurazione o, con `loopbackOrigins: true`, un `http://localhost`, `127.0.0.1` o `[::1]`; altrimenti `forbidden`. Senza un modulo di accesso chiunque raggiunga il kernel è l'unico utente: per questo ascolta solo su questo computer.

**WebSocket.** Il kernel gestisce anche richieste `upgrade` (`kernel.sockets`, un `Router` come `kernel.router`: i gestori ricevono `{ req, socket, head, params, query, principal }`; `ws.js` fa il handshake di RFC 6455 senza librerie). Il browser non può aggiungere `X-Lilos` a un WebSocket e lo apre verso qualunque sito con i cookie dell'utente (CSWSH): per questo `checkSocketOrigin` (`http.js`) vuole sempre un `Origin`, e deve essere uno di quelli permessi (come sopra) oppure lo stesso indirizzo (`host`) a cui risponde il kernel, cioè la pagina servita da un lilOS installato. Senza `Origin` o con un'altra: `403`. Vale anche `checkHost`. Una rotta senza accesso risponde `401`, una sconosciuta `404`, un handshake sbagliato `400`, sempre prima di cambiare protocollo. Con Vite i WebSocket di `/api` passano dal proxy (`ws: true` in `vite.config.js`).

| Metodo e percorso | Chi | Corpo → risposta |
| --- | --- | --- |
| `GET /api/session` | tutti | → `{ mode: 'multi' \| 'single', user \| null }` |
| `POST /api/session` | tutti | `{ username, password }` → `{ user }` e il cookie `lilos_session` (`HttpOnly; SameSite=Strict; Path=/api`, `Secure` con `secureCookies`). Con un solo utente: `invalid`. |
| `DELETE /api/session` | tutti | Chiude la sessione e cancella il cookie |
| `GET /api/boot` | utenti | → `{ user, home, fresh, nodes, storage, apps, appSecurity, net }`: tutto ciò che serve per partire. `home`: il percorso della home nel file system (`/home/<utente>`), da cui `fs.path` parte. `fresh`: la cartella dell'utente è vuota. `apps` è l'elenco di `GET /api/apps`, ma senza nascondere l'origine `local` ai non amministratori. `appSecurity`: `{ isolated }`, la regola generale su come girano le app. `net`: `{ protocols, mounts }`, come `GET /api/net` |
| `POST /api/fs/sync` | utenti | `{ put: [nodo], remove: [id] }`, in una transazione; al massimo 5000 voci e 8 MB. L'SDK ne manda al massimo 2000 per richiesta (prima i nodi, con i genitori prima dei figli, poi le eliminazioni), quindi non c'è un limite al numero di modifiche di una volta sola |
| `GET /api/fs/content/:id` | utenti | → testo del file. Con `?raw=1`: i byte (`application/octet-stream`); se il modulo `fs` ha `readStream` li manda in streaming, con `Content-Length`, senza tenerli tutti in memoria |
| `PUT /api/fs/content/:id` | utenti | testo del file (fino a 10 MB) |
| `POST /api/storage` | utenti | `{ set: { chiave: valore }, remove: [chiave] }`; al massimo 500 chiavi per volta, 512 KB per valore (JSON). L'SDK ne manda al massimo 200 e circa 4 MB per richiesta |
| `GET /api/apps` | utenti | → app installate `[{ ...stato, manifest }]`. Agli utenti non amministratori l'origine `local` mostra solo `{ type: 'local' }` |
| `GET /api/apps/:id/file?path=…` | utenti | → un file della versione in uso (il codice) |
| `GET /api/apps/:id/v/:version/<percorso>` | utenti | → un file di quella versione (la in uso o la precedente), con il percorso nell'URL. `:version` è `x.y.z` oppure `x.y.z+<build>` (`build`: 1-16 caratteri `[a-z0-9]`): il kernel ignora il build, serve solo perché il browser, che tiene per sempre i moduli importati, veda un indirizzo nuovo quando il pacchetto cambia a parità di versione: da qui lilOS importa le app di sistema, e i loro blocchi, worker e file `.wasm` si risolvono accanto al modulo. Risposta con `Cache-Control: private, max-age=31536000, immutable` e una CSP che permette a quel codice di caricare le proprie risorse dalla stessa origine (`default-src 'self' blob: data:; script-src 'self' blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'`). |
| `GET /api/apps-events` | utenti | Flusso `text/event-stream` (`Cache-Control: no-store`). Evento `change` con dati `{ id }` ogni volta che un'app viene installata, aggiornata o tolta, da chiunque (`id` è `null` per la regola generale su come girano le app). Un commento `: ok` ogni 25 secondi tiene aperta la connessione. Lo ascolta `connectPackages`. |
| `GET /api/commons/:name/:version` | utenti | → una libreria in cache |
| `POST /api/apps` | amministratori | `{ source, grant, allowUnsigned }` → stato dell'app |
| `POST /api/apps/:id/update` | amministratori | `{ ref?, reinstall?, grant, allowUnsigned }` → stato (con `unchanged: true` se non c'è nulla di nuovo) |
| `DELETE /api/apps/:id` | amministratori | Rimuove (non le app di sistema) |
| `GET /api/apps-security` | utenti | → `{ isolated }`: la regola generale su come girano le app (`true` se non è stata cambiata) |
| `PUT /api/apps-security` | amministratori | `{ isolated: true \| false }` → `{ isolated }`. Altro che un booleano: `invalid` |
| `PUT /api/apps/:id/security` | amministratori | `{ isolated: true \| false \| null }` (`null`, o assente: la regola generale) → stato dell'app. `invalid` per le app di sistema e le remote (una sola modalità), `not_found` se non è installata |
| `GET /api/repos` | utenti | → `[{ id, name, url, official }]`: l'ufficiale e quelli aggiunti |
| `POST /api/repos` | amministratori | `{ url, name? }` → il repository. Legge `catalog.json` prima di salvare |
| `DELETE /api/repos/:id` | amministratori | Toglie un repository (non l'ufficiale) |
| `GET /api/repos/:id/catalog` | utenti | → cosa offre il repository: app e moduli (vedi [Repository](#repository-reposjs)) |
| `GET /api/repos/:id/readme?path=&file=` | utenti | → il `README.md` completo di un pacchetto del catalogo, come testo. `file` è `README.md` (predefinito) o, per lilOS nel repository ufficiale, `CHANGELOG.md` |
| `GET /api/modules` | amministratori | → moduli del kernel installati (vedi [Moduli come pacchetti](#moduli-come-pacchetti-modulepackagejs)) |
| `POST /api/modules` | amministratori | `{ source, allowUnsigned }` → `{ name, version, restartRequired }` |
| `POST /api/modules/:name/update` | amministratori | `{ ref?, allowUnsigned }` → `{ name, version, previous, restartRequired }` o `{ …, unchanged: true }` |
| `DELETE /api/modules/:name` | amministratori | → `{ name, kept, restartRequired }` |
| `GET /api/modules/:name/settings` | amministratori | → `{ fields, values, secrets, live }`: le impostazioni di un modulo in esecuzione (`not_found` se non è attivo) |
| `PUT /api/modules/:name/settings` | amministratori | `{ values }` (fino a 64 KB) → lo stesso, cambiato (`invalid` se i valori non sono quelli dei campi o il modulo non ha impostazioni) |
| `GET /api/services` | utenti | → `{ available, enabled, admin, services }`: i servizi delle app (`kind: 'service'`) con quando partono e come sono ora, per questo utente (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)) |
| `PUT /api/services-options` | utenti | `{ enabled: true \| false }` → `{ enabled }`: se i servizi dell'utente partono quando entra. Altro che un booleano: `invalid` |
| `PUT /api/services/:app/:entry/startup` | utenti (`system`: amministratori) | `{ when: 'none' \| 'login' \| 'system', params? }` → come `GET /api/services`. `forbidden` per `system` (o per cambiare un servizio già di sistema) se non si è amministratori |
| `POST /api/services/:app/:entry/start`, `…/stop`, `…/restart` | utenti (servizi di tutti: amministratori) | → `{ status, error }` |
| `POST /api/services/:app/:entry/call` | utenti | `{ data?, from? }` (fino a 1 MB; `from` un id di app) → `{ result }`: ciò che restituisce `lilos.handle` del servizio. Lo avvia se è spento |
| `GET /api/services/:app/:entry/log` | utenti (servizi di tutti: amministratori) | → `{ lines: [{ at, level, text }] }` |
| `GET /api/services-events` | utenti | Flusso `text/event-stream` (un commento ogni 25 s per tenerlo aperto): `change` `{ owner, app, entry }` quando cambia un servizio dell'utente o del sistema, `notify` `{ app, text }` per ciò che un suo servizio manda con `lilos.ui.notify` (e, per gli amministratori, quelli di sistema) **solo se nessun modulo fornisce `notifications`**, e gli eventi che i moduli mandano a quell'utente con `ctx.emit`, con il nome dell'evento e i dati così come sono (`notification.new` `{ id }`, `notification.change` `{}`) e quelli della Pianificazione (`schedule.change`, `schedule.run`, `schedule.due`: vedi [Pianificazione](#pianificazione-schedule-apischedulejs)) e della rete (`net.mount`, `net.change`, `net.transfers`, `fs.external`, `net.notify`: vedi [Rete](#rete-connessioni-e-trasferimenti-net-apinetjs)). Negli altri endpoint `/api/services/:app/:entry/…`: `invalid` se `app` o `entry` hanno una forma non valida, `not_found` se il servizio non esiste |
| `GET /api/schedule` e le altre `/api/schedule…` | utenti | Le operazioni pianificate, le corse, le volte e le corse nel browser: tutte le rotte sono in [Pianificazione](#pianificazione-schedule-apischedulejs) |
| `GET /api/notifications` | utenti | → `{ available, keep, items }`: le notifiche dell'utente, dalla più nuova. Senza il servizio `notifications`: `{ available: false, keep: null, items: [] }` |
| `POST /api/notifications` | utenti | `{ text, level?, action?, app? }` (fino a 16 KB) → la notifica, **per l'utente che chiede**. `text` non vuoto; `level` `info` (predefinito), `success`, `warning`, `error`; `action` `{ entry?, args? }`; `app`: l'id di un'app installata che la manda (`invalid` se non lo è); senza `app`, la manda lilOS. Il nome dell'app lo legge il kernel dal suo `lilos.json`. `rate_limited` (429) oltre 10 al minuto per app. Senza il servizio: `unavailable` |
| `POST /api/notifications/read` | utenti | `{ ids? }` (fino a 64 KB) → 204. Senza `ids`, tutte |
| `POST /api/notifications/remove` | utenti | `{ ids? }` → 204. Senza `ids`, tutte |
| `PUT /api/notifications-options` | utenti | `{ keep }` → `{ keep }`: quante ne conserva l'utente, un intero da 1 a 200 (`invalid` altrimenti) |
| `GET /api/term` e le altre `/api/term/…` | utenti | Gli host salvati e le sessioni dei terminali remoti dell'utente, e il WebSocket di una sessione: vedi [Terminali remoti](#terminali-remoti-term-apitermjs) |
| `GET /api/net` e le altre `/api/net/…` | utenti | Le connessioni di rete dell'utente, i loro file e i trasferimenti: tutti gli endpoint sono in [Rete](#rete-connessioni-e-trasferimenti-net-apinetjs). Errori propri: `secret_required` 428 e `untrusted` 409 (con `details`) |
| `POST /api/kernel/restart` | amministratori | Il kernel si ferma ed esce con il codice 75: `npm run kernel` lo riavvia. Senza `run.js` (variabile `LILOS_SUPERVISED` assente): `unavailable` |
| `GET /api/system` | utenti | → `{ version, mode }`; agli amministratori anche `kernel`, `sdk`, `releases`, `next`, `previous`, `updated`, `failed` (vedi [`systemReleases`](#systemreleases)) |
| `POST /api/system/update` | amministratori | `{ ref? }` → `{ version, previous, restartRequired }` o `{ version, unchanged: true }` |
| `POST /api/system/use` | amministratori | `{ version }` → `{ version, restartRequired }` |
| `DELETE /api/system/releases/:version` | amministratori | Cancella una versione conservata → `{ removed }` |
| `POST /api/system/acknowledge` | amministratori | `{ notice: 'updated' \| 'failed' }` → 204 |
| `/api/modules/<nome>/…` | utenti | Gli endpoint dei moduli (`ctx.route`) e i loro WebSocket (`ctx.socket`) |

In un lilOS installato il kernel serve anche la pagina: ogni `GET` e `HEAD` fuori da `/api` che non corrisponde a un endpoint risponde con il file di `web/` della release (`web.js`); un indirizzo senza estensione che non è un file dà `index.html`. I file in `assets/` hanno l'hash nel nome e si tengono per un anno, gli altri si richiedono ogni volta (`no-cache`). In sviluppo la serve Vite.

I percorsi possono finire con `*` (`/api/apps/:id/v/:version/*`): il resto del percorso arriva in `params.rest`.

**Nodi di `/api/fs/sync`.** `{ id, parent, name, type: 'folder' \| 'file' \| 'app' \| 'link', created, modified, color?, app?, link?, system?, workspace?, private?, tags?, trashed?, apps? }`: gli id di lilOS (`[\w-]{1,64}`; `root` e `trash` solo come `parent`) diventano `<home>/<id>`, in una cartella per utente. Il contenuto dei file non passa di qui. Un `link` (obbligatorio per il tipo `link`, vietato per gli altri, deve essere un oggetto) il servizio `fs` lo salva come una scorciatoia: tipo `app` con `link` nei metadati; lilOS lo rimette `link` quando lo legge (`api/home.js`, `toBackNode` e `toFrontNode`). Il database e i moduli `fs-*` non conoscono il tipo ([D62](../interna/decisioni.md#d62-i-collegamenti-un-tipo-di-nodo-di-lilos-una-scorciatoia-per-il-kernel)). I metadati extra (i campi dopo `modified`, `apps` compreso) non possono superare 4 KB per nodo in tutto (`too_large`: «Troppi dati in un elemento»): `apps` non supera 2 KB in tutto (lo garantisce `fs`), così sta nel limite.

**Dentro la home** di ogni utente: `~trash` (la radice del Cestino, nominata `.trash`) e `~config` (nominata `.config`, un file JSON per ogni chiave di `storage`). Una chiave è `[\w:.-]{1,120}`.

**Chi è l'utente.** `principal` è `{ kind: 'user', id, username, name, role: 'admin' \| 'user' }`. Senza modulo `auth` è sempre `{ id: 'local', username: 'utente', name: 'Utente', role: 'admin' }`.

### Configurazione (`config.json`)

```json
{
  "host": "127.0.0.1", "port": 8790,
  "origins": [], "loopbackOrigins": true, "secureCookies": false,
  "modules": [
    { "name": "users-basic", "version": "1.0.0", "config": { "sessionDays": 30, "idleDays": 7 } },
    { "name": "fs-postgres", "version": "1.1.0", "config": { "url": "postgres://lilos:lilos@127.0.0.1:5433/lilos" } },
    { "name": "services-isolate", "version": "1.1.0", "config": {} },
    { "name": "scheduler", "version": "1.0.0", "config": { "maxTasksPerUser": 100, "minIntervalMinutes": 1, "maxParallel": 4, "historyPerTask": 50, "catchUpHours": 12, "outputKb": 16, "maxParallelPerUser": 2, "historyMb": 64 } }
  ],
  "apps": { "allowLocalSources": true, "trustedPublishers": {}, "officialKey": null, "bootstrap": ["files", "editor", "settings", "appstore", "scheduler"] }
}
```

| Campo | Significato |
| --- | --- |
| `host`, `port` | Dove ascolta. Senza modulo `auth` solo `127.0.0.1`, `::1` o `localhost`. `LILOS_KERNEL_HOST` e `LILOS_KERNEL_PORT` hanno la precedenza. |
| `origins`, `loopbackOrigins` | Origini ammesse per le richieste che modificano. |
| `secureCookies` | Aggiunge `Secure` al cookie (con HTTPS). |
| `modules` | Moduli da avviare, `{ name, version?, config? }`. Senza `version`: la più alta installata. Un modulo indicato due volte, non installato, o che richiede un servizio che nessun modulo attivo fornisce, ferma il kernel. |
| `net` | Facoltativo, con più utenti: dove il kernel può collegarsi per le connessioni di rete. `{ allowPrivate?: boolean, allow?: string[] }`: la rete locale è chiusa di serie, `allowPrivate: true` la apre; `allow`: intervalli CIDR (`'192.168.1.50/32'`) ammessi comunque. Vedi [Rete](#rete-connessioni-e-trasferimenti-net-apinetjs). |
| `apps.allowLocalSources` | Permette di installare app da una cartella del computer del kernel (solo sviluppo). |
| `apps.trustedPublishers` | `{ idEditore: 'ed25519:<chiave>' }`: gli editori di cui ci si fida. |
| `apps.officialKey` | Se c'è, le app di sistema devono essere firmate con questa chiave, e le altre app del repository ufficiale sono verificate solo con questa firma. |
| `apps.bootstrap` | Gli `id` delle app che il kernel installa dal repository ufficiale, all'avvio, se mancano (predefinito: `files`, `editor`, `settings`, `appstore`, `scheduler`). Vedi [D41](../interna/decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel). |

Il file si può cambiare con la variabile `LILOS_KERNEL_CONFIG`. Il kernel richiede un modulo che fornisce `fs` e i [moduli obbligatori](#moduli-obbligatori) (oggi `scheduler`), che rimette da solo se mancano. Installare, aggiornare o togliere un modulo con l'AppStore riscrive la lista `modules` di questo file (passando da `config.json.tmp`, ignorato da git).

`repos.json`, nella cartella del kernel (`system/kernel/`, ignorato da git), contiene i repository aggiunti da un amministratore: `[{ id, name, url }]`, al massimo 30. L'ufficiale non è nel file: c'è sempre.

### Avvio e riavvio (`run.js`)

`npm run kernel` esegue `system/kernel/run.js`, che avvia `src/main.js` come processo figlio con `LILOS_SUPERVISED=1` e lo riavvia quando esce con il codice **75** (lo fa `POST /api/kernel/restart`, dopo aver installato, aggiornato o tolto un modulo). Con qualunque altro codice, `run.js` termina con quello. Avviare `src/main.js` direttamente funziona, ma senza riavvio automatico.

In un lilOS installato (c'è `current.json` accanto a `run.js`) `run.js` avvia `releases/<versione di current.json>/system/kernel/src/main.js`. Una versione appena installata (`trial: true`) è **in prova**: `run.js` ne legge l'output (lo mostra come sempre e tiene le ultime 40 righe) e aspetta che il kernel mandi il messaggio `{ lilos: 'ready' }` (`process.send` in `main.js`, quando ascolta) entro **5 minuti**.

- Se arriva: toglie `trial` e, se c'è una `previous`, scrive `updated: { from, at }`.
- Se il processo esce prima, o non risponde in tempo (allora `run.js` lo ferma), riparte la `previous`: `current.json` diventa `{ version: previous, previous: null, failed: { version, at, reason, log } }`. Senza `previous` (o se la sua cartella non c'è) `run.js` esce con 1.
- Ctrl+C o `SIGTERM` fermano e basta, senza tornare indietro.

`run.js` sta fuori dalle release e non si aggiorna con lilOS: va tenuto semplice. `tools/install.js` ne copia la versione della release al momento dell'installazione.

All'avvio il kernel carica i moduli, registra le rotte e prima di ascoltare **installa le app di sistema che mancano** (`apps.bootstrap`, vedi [D41](../interna/decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel)): legge il catalogo del repository ufficiale e installa ciascuna app mancante, dall'ultimo tag, concedendo i permessi del suo manifesto. Se il repository non risponde (rete, `git` mancante, credenziali), il kernel parte lo stesso, scrive nel log «App di sistema non installate (…)» e lilOS gira senza quelle app.

### Moduli

Cartella `modules/<nome>_<x.y.z>/` con:

- `module.json`: `{ name, version, description, kernel: "1", provides: [servizio], requires: [servizio], settings?: [campo] }`. `name` e `version` devono corrispondere alla cartella e `kernel` a quello del kernel (`1`). `settings`: ciò che un amministratore può cambiare della configurazione del modulo (Pannello di controllo), descritto come i campi di un protocollo di rete: `{ key, type, label, hint?, placeholder?, default?, options?, when?, min?, max? }`, con `key` `[a-z][a-zA-Z0-9]{0,30}` e `type` `text`, `textarea`, `number`, `select`, `checkbox` o `password`. Un `module.json` con una voce diversa fa fallire il caricamento del modulo («impostazioni non valide»). Un campo `password` è **segreto** (`isSecretSetting`, per esempio il segreto client di Google): `config.json` lo tiene cifrato (`v1:…`, con la chiave `net/secret.key`, come le password delle connessioni), il kernel lo apre prima di avviare il modulo (`openSecretSettings`; uno che non si apre si toglie, con un avviso) e il modulo lo riceve in chiaro in `ctx.config`; la pagina non lo riceve mai.
- `index.js`: `export default { init(ctx), stop?(), commands? }`.

`ctx` (il contesto di `init`):

| Membro | Descrizione |
| --- | --- |
| `name`, `version`, `dir`, `config` | Il modulo, la sua cartella (può tenerci file propri) e la sua parte di configurazione. `config` è sempre lo stesso oggetto: quando un amministratore cambia le impostazioni (`settings`) i valori cambiano lì dentro. |
| `onConfig(fn)` | `fn(config)` dopo ogni cambio delle impostazioni fatto da un amministratore (`PUT /api/modules/:nome/settings`). Con almeno un `onConfig` il modulo risulta `live` (le impostazioni valgono subito); senza, dal prossimo avvio. Se `fn` lancia, l'errore finisce nel log e la modifica resta. |
| `log` | Logger. |
| `fail(codice, messaggio)` | Lancia un errore voluto (i codici sono quelli della tabella degli errori). |
| `provide(servizio, impl)` | Fornisce un servizio dichiarato in `provides`; per `auth`, `users`, `fs`, `runtime`, `notifications` e `scheduler` il kernel controlla che `impl` abbia tutti i metodi. |
| `service(nome)` | Un servizio dichiarato in `requires`. |
| `emit(userId, evento, dati = {})` | Dice qualcosa alle pagine lilOS aperte da quell'utente, sul flusso `/api/services-events` (evento `<parola>.<parola>`, per esempio `notification.new`: `[a-z][a-z0-9-]{0,30}\.[a-z][a-zA-Z0-9.-]{0,40}`; `dati` JSON, copiati). Un nome non valido lancia un errore. Arriva solo a chi è collegato in quel momento: chi si collega dopo non lo riceve. |
| `route(metodo, percorso, handler)` | Endpoint `/api/modules/<nome><percorso>`, solo per utenti con l'accesso fatto. `handler({ principal, params, query, json(limite?), req, res })` restituisce JSON (nulla = 204). Il percorso è `/parola/:param`, con `[\w:-]`; `/update` e `/settings` sono del kernel e `ctx.route` lancia un errore se un modulo li usa. |
| `socket(percorso, handler)` | Un WebSocket a `/api/modules/<nome><percorso>` (richiesta `GET` con `Upgrade`), solo per utenti con l'accesso fatto (senza, il kernel risponde «Accesso richiesto»). `handler({ principal, params, query, accept })` parte prima della risposta: `accept({ maxMessage = 1048576 })` accetta la connessione e restituisce il WebSocket (`ws.js` del kernel; una seconda chiamata restituisce lo stesso). Un handler che lancia, o che non chiama `accept`, rifiuta la connessione («Connessione rifiutata»). Il percorso ha la stessa forma di quello di `route` (`/parola/:param`, con `[\w:-]`). Dalla pagina si raggiunge con `kernel.module(nome).channel(percorso)`. |
| `dataDir` | Una cartella per i dati del modulo, `<dati>/modules-data/<nome>` (ignorata da git, `/modules-data/`), che sopravvive alle versioni del modulo (diversamente da `dir`, che cambia a ogni versione). Il kernel **non la crea**: la crea il modulo quando serve. Per strumenti scaricati, cache, pacchetti. |

`commands` sono i comandi della riga di comando: `npm run kernel:cli -- <modulo> <comando> [argomenti] [--opzione valore] [--interruttore]`; ricevono `{ services, args: { positional, flags }, prompt, ctx }`. `prompt.password(domanda, { confirm })` chiede una password senza mostrarla (o la prende da `LILOS_PASSWORD` se non c'è un terminale).

### Servizi (`services.js`)

Il kernel controlla che questi metodi esistano; ogni modulo può fornire anche servizi con altri nomi.

| Servizio | Metodi |
| --- | --- |
| `auth` | `login(username, password, { ip })` → `{ token, user, expires }` (lancia `invalid_credentials` o `rate_limited`); `session(token)` → `user \| null`; `logout(token)`; `logoutAll(userId)` |
| `users` | `get(id)`, `list()`, `create({ username, name, password, role })`, `setPassword(id, password)`, `remove(id)` |
| `fs` | `home(principal)` → `{ id, path, created }`; `stat(principal, id)`; `list(principal, id)`; `tree(principal, id, { content })`; `lookup(principal, path)`; `apply(principal, { put, remove })` (una transazione); `read(principal, id)` → `Buffer`; `write(principal, id, Buffer)`; `remove(principal, ids)`. Facoltativi, per i contenuti grandi: `readStream(principal, id, { start })` → `Readable`, `writeFrom(principal, id, source, { signal })` → dimensione (vedi [Rete](#contenuti-grandi-nel-servizio-fs)) |
| `notifications` | Facoltativo: senza, lilOS tiene le notifiche solo nella pagina. `send(userId, { from, level, text, action })` → notifica (`from`: `{ app, name }` o `{ system: true }`, già controllato dal kernel; `level`: `'info'` \| `'success'` \| `'warning'` \| `'error'`; `action`: `{ entry, args }` o `null`; lancia `invalid` o `rate_limited`); `list(principal)` → `{ keep, items }` (dalla più nuova); `read(principal, ids \| null)`; `remove(principal, ids \| null)` (`null`: tutte; gli `ids` al massimo 500); `setOptions(principal, { keep })` → `{ keep }` (1-200). Manda `notification.new` `{ id }` e `notification.change` `{}` con `ctx.emit`. Vedi [`notifications-basic`](#notifications-basic_100) |
| `runtime` | Facoltativo: senza, lilOS non ha servizi. `start({ key, code, info, limits }, host)` → `Promise<handle>`, che si risolve quando il punto d'ingresso è partito (o rifiuta con il motivo). `code`: il modulo ES del servizio, che esporta una funzione col nome `info.entry` e la riceve con `{ lilos, args }`. `info`: `{ id, version, entry, args, user: { id, username, name } \| null, locale, i18n }`, dove `locale` è `{ code, lang, strings }` (le stringhe già risolte, vedi [`lilos.locale`](#liloslocale)) e `i18n` è il testo del motore (`i18nApi` di `sdk/core/i18n.js`, `toString()`): il runner lo valuta e dà al servizio `lilos.locale`. `limits`: `{ memoryMb, cpuMs }` (memoria del servizio; tempo di una sola esecuzione del suo codice). `host`: `{ call(metodo, parametri)` → `Promise` (l'API `lilos`, controllata dal kernel), `log(livello, testo)` (ciò che scrive con `console.*`), `exit(motivo)` (si è fermato da solo: errore, memoria, crash) `}`. `handle`: `{ request(data, from)` → `Promise<risultato>` (ciò che restituisce il suo `lilos.handle`), `stop()` → `Promise }`. Vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs) |
| `scheduler` | **Obbligatorio** (`REQUIRED_MODULES`): il kernel non parte senza. Le operazioni a una data e ora o ripetute, il loro orologio e lo storico. `start(host)`: il kernel è pronto, l'orologio parte; `host` ha `rules` (le regole dell'SDK), `run(task, run, signal)` → `{ state?, text, log }` (fa l'azione; `state` `'waiting'` per una corsa nel browser senza lilOS aperto; un errore lanciato è un esito `error`), `notify(task, run)`, `changed(owner, ids)`, `ran(run)`. Poi `list(principal, { owner, app })`, `get(principal, id)`, `save(principal, task)` (senza `id`: nuova), `remove(principal, ids)`, `setEnabled(principal, id, on)`, `runNow(principal, id)`, `cancel(principal, runId)`, `history(principal, { task, owner, limit, before, state })`, `pending(principal)`, `resolve(principal, runId, { state, text, log })`, `occurrences(principal, { from, to, owner, task })`, `move(principal, id, { at, to, scope })`, `dropApp(appId)`, `dropOwner(userId)`. Cosa fa un'operazione (`what`) lo controlla e lo esegue il kernel; il modulo la tiene com'è. Vedi [`scheduler`](#scheduler_100) e [Pianificazione](#pianificazione-schedule-apischedulejs) |

Un nodo del servizio `fs` è `{ id, parent, name, type: 'folder' \| 'file' \| 'app', meta, size, created, modified, content? }`. Chi chiede è un `principal`: `{ kind: 'user', … }` o `KERNEL` (`{ kind: 'kernel' }`, usato per installare le app). Il modulo `fs` rifiuta ciò che il principal non può fare: `not_found` per ciò che non deve sapere che esiste, `forbidden` per ciò che vede ma non cambia.

### Rete: connessioni e trasferimenti (`net/`, `api/net.js`)

La cartella **Rete** porta in lilOS i file di server remoti. Motivi e alternative scartate: [D59](../interna/decisioni.md#d59-la-rete-i-protocolli-sono-moduli-del-kernel-e-i-trasferimenti-li-fa-il-kernel). Tre parti, tutte nel kernel:

| File | Che cosa fa |
| --- | --- |
| `net/drivers.js` | Il contratto dei protocolli (`netfs.<protocollo>`), la validazione dei campi, `cleanPath`, `netFail` |
| `net/network.js` (`Network`, `kernel.network`) | Le connessioni di ogni utente, le loro sessioni, l'osservazione delle cartelle |
| `net/transfers.js` (`Transfers`, `kernel.transfers`) | Le copie da e verso le connessioni, in code per destinazione |
| `net/secrets.js` (`Secrets`) | Cifratura di password e chiavi (AES-256-GCM) |
| `net/signin.js` (`SignIns`, `kernel.network.signins`) | L'accesso al proprio account sul sito del fornitore (OAuth 2.0 con PKCE), sotto |
| `api/net.js` | Gli endpoint `/api/net/…` (sotto) |

#### Protocolli: il servizio `netfs.<protocollo>`

Un modulo fornisce un protocollo con un servizio che si chiama `netfs.<protocollo>` (`provides: ["netfs.sftp"]`); un modulo può fornirne più d'uno (`netfs-ftp` dà `netfs.ftp` e `netfs.ftps`). All'avvio il kernel cerca tra i servizi quelli con questo prefisso (`findDrivers`) e ignora, con un avviso nel log, quelli malformati. Senza nessun protocollo `net.available` è `false` e Rete non esiste. L'`id` del protocollo è `[a-z][a-z0-9-]{0,30}`.

```js
// il servizio che un modulo passa a ctx.provide('netfs.esempio', …)
{
  label: { en: 'Example', it: 'Esempio' },     // stringa o { lingua: testo }
  order: 60,                                   // posizione nell'elenco (più basso prima); predefinito 100
  fields: [ /* campi, sotto */ ],
  group: 'server',                             // 'server' | 'cloud' | 'local': la parte dell'elenco
  address(values) { return `esempio://${values.host}`; },        // come si mostra la connessione
  async connect(values, { secret, trust, signal, saveSecret, user }) { return session; },
  async shares?(values, { secret, trust }) { return ['nome']; }, // cosa offre il server (SMB)
}
```

| Membro | Descrizione |
| --- | --- |
| `label`, `order` | Il nome che l'utente sceglie e la sua posizione |
| `fields` | I campi che la connessione chiede, nell'ordine in cui si mostrano |
| `group?` | `'server'` (predefinito), `'cloud'` o `'local'`: la parte dell'elenco di Connetti a un server (`protocols[].group`) |
| `address(values)` | `string`: l'indirizzo con cui si mostra la connessione (`sftp://ann@host/www`) |
| `connect(values, { secret, trust, signal, saveSecret })` | `Promise<session>`. `values`: i valori dei campi (tranne i segreti). `secret`: `{ chiave: valore }` dei campi segreti (`{}` se non ce ne sono). `trust`: l'impronta che l'utente ha confermato per quel server, o `null`. `saveSecret(secret)`: tiene un segreto nuovo al posto di quello ricevuto (un token che il fornitore ha rinnovato); `secret` è `{ chiave: valore }` delle sole chiavi cambiate. `user`: chi si collega, `{ id, username, role, multiUser }` (NFS sceglie con questo l'identità assegnata dall'amministratore). Prima di mandare le credenziali il driver deve verificare il server: se non è fidato lancia `untrusted` |
| `check?(values)` | Facoltativo. Lancia un errore con `net` se i valori non si possono usare così come sono (WebDAV: utente e password nell'indirizzo). Il kernel lo chiama prima di salvare, provare e aprire una connessione |
| `shares?(values, { secret, trust, user, saveSecret })` | `Promise<string[]>`: cosa offre il server a cui connettersi (condivisioni SMB, bucket S3, Drive di un account). Se c'è, il protocollo ha `canListShares`. Con un campo `signin` riceve il segreto dell'accesso fatto nella finestra (`signin` in `POST /api/net/shares`, che resta usabile per la connessione) |
| `ready?()` | `null` o un'etichetta (`string` o `{ en, it }`): perché il protocollo non si può ancora usare (per esempio manca un'impostazione del modulo). La pagina la mostra al posto dei campi (`notReady`); un errore lanciato vale «Protocollo non pronto». Con un'etichetta `POST /api/net/signin` dà `unavailable` |
| `signIn?` | `{ start, finish }`, obbligatorio se c'è un campo `signin` (senza, il protocollo è ignorato). `start({ values, redirectUri, state, challenge })` → l'indirizzo della pagina del fornitore (con `code_challenge_method=S256`); `finish({ values, code, redirectUri, verifier })` → `{ account, secret }`: `account` è il testo da mostrare (fino a 200 caratteri, per esempio l'indirizzo email), `secret` ciò che `connect` riceverà in `secret[<chiave del campo>]`. Vedi [Accesso con un fornitore](#accesso-con-un-fornitore-netsigninjs) |
| `links?` | `{ office? }`: le sessioni hanno `link(path)`. `office: true`: il link di un documento Word, Excel o PowerPoint lo apre in Office per il web (`protocols[].office`) |
| `recycles?` | `true`: ciò che si elimina va nel cestino del fornitore, non per sempre. Il File Manager lo dice nella conferma (`protocols[].recycles`) |
| `removeText?` | Un'etichetta: cosa fa eliminare lì, per la conferma («escono dall'album e restano nella tua libreria di Google Foto») |
| `space?` | `true`: le sessioni hanno `space()` (`protocols[].space`) |
| `importer?` | `{ label }`: le sessioni hanno `importer` (scegliere sulla pagina del fornitore cosa copiare, vedi `importStart`) |
| `signIn.manual?`, `signIn.onlyManual?()` | `manual: true`: l'accesso può finire anche incollando l'indirizzo (vedi [Accesso con un fornitore](#accesso-con-un-fornitore-netsigninjs)); `onlyManual()` → `true`: solo così (per esempio un client Google di tipo «App desktop»). In `protocols[].signIn`: `{ manual, onlyManual }` |

**Campo.** `{ key, type, label, required?, secret?, default?, placeholder?, hint?, when?, options?, min?, max?, button? }`:

| Proprietà | Descrizione |
| --- | --- |
| `key` | `[a-z][a-zA-Z0-9]{0,30}` |
| `type` | `text` (fino a 1024 caratteri, ripulito dagli spazi ai bordi), `textarea` (64 KB), `number` (intero, con `min` e `max`), `password` (4096), `select` (con `options: [{ value, label }]`), `checkbox`, `file` (il testo di un file che l'utente sceglie in lilOS, per esempio una chiave privata; 64 KB), `signin` (un account a cui l'utente accede sulla pagina del fornitore: `button` è il testo del pulsante; il valore è l'account e il segreto ciò che ha dato l'accesso, impostati solo da un accesso; è sempre `secret`; se un protocollo ne ha più d'uno vale il primo) |
| `label`, `hint` | Stringa o `{ en, it, … }`; `hint` è una riga sotto il campo |
| `required` | Obbligatorio, ma solo quando il campo è mostrato |
| `secret` | Si tiene cifrato e non torna mai alla pagina (password, chiavi) |
| `default` | Valore se l'utente lascia vuoto (non per i segreti) |
| `options` | Per `select`: `[{ value, label, disabled? }]`; `disabled: true` si mostra e non si sceglie (cosa arriverà, come Kerberos per NFS): `checkFields` rifiuta quel valore |
| `when` | `{ chiave: valore \| [valori] }`: il campo vale solo se gli altri hanno quei valori |

**Sessione** (i percorsi sono assoluti dentro la connessione, `/` è la sua radice come l'ha scelta l'utente):

| Metodo | Descrizione |
| --- | --- |
| `list(path)` | `[{ name, type: 'file' \| 'folder', size, modified, link?, web?, export?, badge?, can?, removeLabel? }]`. `link: true`: un collegamento simbolico (il kernel non entra mai nelle cartelle a cui punta e, eliminandolo, toglie il collegamento). `web` (etichetta): un file senza byte propri (un documento Google), che si apre sul sito del fornitore; `export`: l'estensione con cui si copia (`[a-z0-9]{1,10}`; senza, non si copia né si legge). `badge`: un'etichetta breve accanto al nome. `can: { rename?: false, remove?: false }`: cosa non si può fare. `removeLabel`: le parole del menu per eliminarlo. Il kernel passa avanti solo queste chiavi, controllate (`cleanEntry`: etichette di al massimo 120, 60 o 40 caratteri, senza caratteri di controllo) |
| `stat(path)` | La stessa voce, o `null` |
| `read(path, { start, signal, format? })` | `Readable` dei byte, da `start`. `format`: l'`export` di un elemento `web` (il documento esportato) |
| `write(path, source, { start, signal, size? })` | Scrive un file da uno stream. `start > 0` aggiunge a ciò che c'è (ripresa), solo se `resume.write`. `size`: i byte che lo stream porta, se noti |
| `mkdir(path)`, `rename(da, a)`, `remove(path, { folder })` | `folder`: una cartella vuota (la ricorsione la fa il kernel) |
| `removeTree?(path)` | Elimina una cartella con tutto quello che contiene, in una sola richiesta (OneDrive la manda intera nel cestino). Se c'è, `ops remove` la usa al posto della ricorsione del kernel |
| `link?(path)` | `Promise<string>`: la pagina del file o della cartella sul sito del fornitore. Il kernel accetta solo `https://` senza spazi, al massimo 8192 caratteri (`invalid`) |
| `space?()` | `Promise<{ used, total }>`: lo spazio dell'account in byte (`total` 0: nessun limite noto) |
| `importer?` | `{ start() → { id, url }, poll(id) → { status: 'pending' \| 'done' \| 'error', count?, size?, path?, error? } }`: `url` è la pagina del fornitore (`https://`, aperta in una nuova scheda), `path` la cartella della sessione con ciò che l'utente ha scelto, da copiare con i trasferimenti |
| `watch?(path, onChange)` | `stop()`. Avvisa quando cambia il contenuto della cartella; `stop()` può restituire una Promise, risolta quando la cartella non è più tenuta aperta (il kernel la aspetta prima di eliminare o rinominare). Solo SMB |
| `resume` | `{ read, write }`: se lettura e scrittura possono ripartire da metà |
| `onLost?(fn)` | `fn()` quando la connessione cade da sola |
| `close()` | |

**Errori di un driver.** Portano `net`, che dice cosa è andato storto (qualunque altro errore è riportato com'è): `auth` (credenziali sbagliate → `secret_required` con `details.reason: 'auth'`; per un protocollo con un campo `signin` → `details.reason: 'signin'`, serve un nuovo accesso), `untrusted` (con `trust: { kind: 'ssh' \| 'tls', fingerprint, text }` → `untrusted` con `details.trust`), `not_found` (404), `exists` (`conflict`), `denied` (`forbidden`), `unreachable` e `lost` (`unavailable`), `unsupported` e `invalid` (`invalid`). `netFail(err, cosa)` fa questa traduzione. Dopo `lost` e `unreachable` il kernel apre una connessione nuova e ripete una volta le operazioni sicure da ripetere (non quelle che scrivono).

Un protocollo con un account del fornitore (OneDrive) ha un campo `signin` e questi membri in più:

```js
{
  fields: [{ key: 'account', type: 'signin', required: true, label: 'Account', button: 'Accedi' }],
  ready() { return clientId ? null : 'Manca l\'ID dell\'app'; },       // perché non si può usare ancora (o null)
  signIn: {
    start({ values, redirectUri, state, challenge }) { return 'https://fornitore.example/authorize?…'; },
    async finish({ values, code, redirectUri, verifier }) { return { account: 'ann@example.com', secret: refreshToken }; },
  },
  async connect(values, { secret, saveSecret }) {               // secret.account è quello di finish()
    const tokens = await renew(secret.account);
    if (tokens.refresh !== secret.account) saveSecret({ account: tokens.refresh });   // il fornitore l'ha cambiato
    return session;
  },
  links: { office: true },    // le sessioni hanno link(path)
  recycles: true,             // eliminare manda nel cestino del fornitore
}
```

#### Connessioni (`Network`)

Ogni utente ha le sue, salvate in `DATA_DIR/net/<hash dell'utente>.json` (`DATA_DIR`: la cartella del kernel, o quella indicata da `LILOS_DATA_DIR`; la cartella `net/` è ignorata da git). Al massimo 50 per utente; il nome ha fino a 60 caratteri, senza `/`, `\` né caratteri di controllo, ed è unico per utente (senza distinguere maiuscole).

```js
// salvata
{ id, name, protocol, values, secret: 'v1:…' | null, trust: impronta | null, auto, created }
// come la vede la pagina
{ id, name, protocol, address, values, auto, remembered, trusted, state, error }
```

- `state`: `'off'`, `'connecting'`, `'on'` o `'error'` (l'ultimo tentativo è fallito: `error` dice perché). Una password da chiedere o un server da confermare **non** sono `error`: lo stato resta `off`.
- **Segreti.** Con `remember: true` password e chiavi si salvano cifrate (AES-256-GCM) con una chiave di questo lilOS, `secret.key`, creata al primo uso nella stessa cartella `net/` (solo chi esegue il kernel la legge). Protegge dai file delle connessioni e dalle loro copie di sicurezza, non da chi può leggere la cartella del kernel: il kernel deve poterli usare da solo. Senza `remember` restano in memoria, per quell'utente, fino a `disconnect` o all'arresto del kernel. Se `secret.key` si perde, il segreto si chiede di nuovo.
- **Quando si apre.** Una connessione si apre al primo uso, e di nuovo da sola se cade. Quelle con `auto` si aprono alla prima richiesta dell'utente dopo l'avvio del kernel (`userSeen`).
- **Impronta.** `trust` si salva alla prima conferma. Cambiare `host`, `port` o `url` con `update` la azzera. Se il server mostra una chiave o un certificato diversi da quello confermato, `untrusted` ha `details.trust` con `changed: true` e `previous` (l'impronta di prima): la pagina deve avvisare più forte.
- **Password legata al server.** Una password ricordata (o tenuta in memoria) si scorda se con `update` cambia uno tra `host`, `port`, `url`, `user`, `tls`, `domain`, `share`, `auth` e non se ne dà una nuova: va riscritta.
- **Dove ci si può collegare** (`net/guard.js`, `NetGuard`). Solo con più utenti (accesso richiesto): il kernel non si collega a loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`, `fe80::/10`), multicast, `0.0.0.0`/`::`, riservati (`192.0.0.0/24`, `198.18.0.0/15`, `240.0.0.0/4`) né gli intervalli IPv6 che portano dentro un indirizzo IPv4 (NAT64 `64:ff9b::/96` e `64:ff9b:1::/48`, 6to4 `2002::/16`, Teredo `2001::/32`; un IPv4 scritto in IPv6, `::ffff:127.0.0.1`, vale come l'IPv4); la rete locale (`10/8`, `172.16/12`, `192.168/16`, `100.64/10`, `fc00::/7`) solo con `net: { allowPrivate: true }` in `config.json`; `net: { allow: ['192.168.1.50/32', …] }` lascia passare certi indirizzi o intervalli anche se è chiusa. Se il nome si risolve in più indirizzi, vale il controllo su tutti. Si fa a ogni creazione, modifica, prova, elenco delle condivisioni e apertura (`forbidden`: «Indirizzo non permesso per le connessioni di rete»). Lo stesso controllo (`checkIp(ip)`) vale per le richieste web della Pianificazione. Con un solo utente non c'è nessun limite.
- **Nomi e dimensioni.** Un elenco ha al massimo 50 000 voci (`too_large`); i nomi non sicuri (`isSafeName` in `drivers.js`: una sola parte, non `.` né `..`, senza `/`, caratteri di controllo né inversioni di direzione del testo `U+202A-202E`, `U+2066-2069`, al massimo 255 caratteri) sono tolti dagli elenchi, e `cleanName` li rifiuta (`invalid`). `isUsableName` è più larga (ammette le inversioni di testo): serve a decidere se eliminare è sicuro. Eliminare una cartella si ferma, senza togliere niente, se contiene un nome non utilizzabile; una cartella o un collegamento (`link`) si eliminano come se stessi, e la ricorsione arriva al massimo a 64 livelli.
- **Pulizia.** All'avvio (`prune()`, solo con più utenti) si cancellano i file di connessioni e trasferimenti di utenti che non esistono più.
- **Osservazione.** Se la sessione ha `watch`, ogni cartella letta con `list` è osservata e i cambiamenti diventano l'evento `net.change`. Al massimo 8 cartelle per connessione alla volta: oltre, si smette di osservare la meno recente. Prima di eliminare o rinominare una cartella la si smette di osservare (alcuni server, SMB, la tolgono solo se non è aperta).
- **Impostazioni di un modulo.** Quando un amministratore cambia le impostazioni di un modulo che fornisce protocolli (`kernelModules.saveSettings`), `Network.reset(protocolli)` chiude le sessioni aperte di quei protocolli, per tutti gli utenti: lo stato torna `off` (evento `net.mount`) e il primo uso riapre con le nuove impostazioni.
- **Copiare dalla home** (`putHome`). Se il nome c'è già e `ifExists` è `'ask'`, `conflict`; con `'keep'` il nome prende un numero.
- `update` con un segreto vuoto lo lascia com'è; `forget: true` cancella quelli ricordati. Cambiare i valori chiude la sessione (si riapre con i nuovi).

#### Endpoint `/api/net`

Tutti per utenti con l'accesso fatto: ognuno vede e cambia solo le sue connessioni. `:id` è `[a-f0-9]{16}`. Le richieste che modificano seguono le regole di `X-Lilos` e `Origin` dell'[API HTTP](#api-http).

| Endpoint | Corpo → risposta |
| --- | --- |
| `GET /api/net` | → `{ protocols, mounts }`. `protocols`: `[{ id, label, order, group, canListShares, links, office, recycles, removeText, space, importer, signIn, notReady, fields }]` (i campi come li descrive il driver, con `button` per `signin`); `mounts`: le connessioni come le vede la pagina. Lo stesso arriva in `GET /api/boot` come `net` |
| `POST /api/net/mounts` | `{ name, protocol, values, auto?, remember?, trust?, secret, signin? }` (fino a 256 KB) → la connessione. `secret`: `{ chiave: valore }` dei campi segreti |
| `PUT /api/net/mounts/:id` | `{ name?, values?, auto?, remember?, forget?, secret?, signin? }` → la connessione |
| `DELETE /api/net/mounts/:id` | 204. Chiude la sessione e toglie la connessione |
| `POST /api/net/mounts/:id/connect` | `{ secret?, remember?, trust?, signin? }` → la connessione, connessa. Può dare `secret_required`, `untrusted`, `unavailable`, `conflict` (accesso fatto con un altro account) |
| `POST /api/net/mounts/:id/disconnect` | → la connessione. Chiude la sessione e dimentica la password non ricordata |
| `POST /api/net/test` | `{ protocol, values, trust?, secret, signin? }` → `{ ok: true }`. Prova senza salvare. Al massimo 3 prove (questa e `shares`) in corso per utente: oltre, `rate_limited` |
| `POST /api/net/shares` | `{ protocol, values, trust?, secret, signin? }` → `{ shares }` (protocolli con `canListShares`; `signin`: un accesso fatto, che resta usabile) |
| `GET /api/net/mounts/:id/list?path=` | → `{ entries: [{ name, type, size, modified, link?, web?, export?, badge?, can?, removeLabel? }] }`; `path` predefinito `/` |
| `GET /api/net/mounts/:id/content?path=` | → i byte del file, in streaming (`application/octet-stream`, con `Content-Length` se la dimensione è nota e maggiore di 0). Un elemento `web` dà la sua esportazione, o `invalid` («Si apre solo sul web») se non ne ha. Se la richiesta si chiude il trasferimento si interrompe |
| `PUT /api/net/mounts/:id/content?path=` | Corpo: i byte del file (al massimo 1 GB, altrimenti `too_large`); scritto in streaming. Connessione, percorso e dimensione dichiarata si controllano prima di leggere il corpo. Un file vuoto lo crea |
| `POST /api/net/mounts/:id/ops` | `{ op: 'mkdir' \| 'rename' \| 'remove', path, to? }` (`remove` elimina anche le cartelle con quello che contengono: per sempre, o nel cestino del fornitore se il protocollo ha `recycles`) |
| `GET /api/net/mounts/:id/link?path=` | → `{ url }`: la pagina di quel percorso sul sito del fornitore (`path` predefinito `/`; protocolli con `links`, altrimenti `invalid`) |
| `GET /api/net/mounts/:id/space` | → `{ used, total }`, o `{ used: null }` se il protocollo non lo dice |
| `POST /api/net/mounts/:id/import` | → `{ id, url }`: comincia un'importazione (protocolli con `importer`). Al massimo 5 aperte per utente (`rate_limited`); `url` deve essere `https://` |
| `GET /api/net/mounts/:id/import/:imp?wait=1` | → `{ status, count, size, path, error? }`. Con `wait=1` chiede di nuovo al fornitore ogni 3 secondi, fino a 25. Con `done` o `error` l'importazione si chiude (`not_found` dopo); `path` si copia con `POST /api/net/transfers` (`sources: [{ mount, path }]`) |
| `POST /api/net/mounts/:id/put-home` | `{ home, folder?, ifExists? }` (fino a 16 KB) → `{ path, name }`. Copia nella connessione il file della home `home` (id come lo vede la pagina), in `folder` (predefinita `/`; si crea anche a più livelli, `conflict` se una parte è un file). `ifExists`: `'replace'`, `'keep'` (altro nome con un numero; lo stesso se il nome è quello di una cartella) o qualsiasi altro valore = `'ask'`: `conflict` con `details: { name, exists: true }`. `invalid` se non è un file o il nome non è sicuro (`isSafeName`); `not_found` se manca |
| `POST /api/net/signin` | `{ protocol, values, redirectUri, manual? }` (fino a 64 KB) → `{ id, url, manual }`. Comincia un accesso (sotto) |
| `POST /api/net/signin/:id/paste` | `{ url }` → lo stato. Un accesso incollando l'indirizzo: quello della pagina che non si è aperta |
| `GET /api/net/signin/:id?wait=1` | → `{ status: 'pending' \| 'done' \| 'error', account?, error? }`. Con `wait=1` risponde quando cambia, al massimo dopo 25 secondi. `not_found`: scaduto o già usato |
| `DELETE /api/net/signin/:id` | 204. Annulla l'accesso |
| `GET /api/net/signin/callback` | Dove il fornitore rimanda la finestra (`?code&state` o `?error&state`). **Senza sessione**; risponde con una pagina HTML |
| `GET /api/net/transfers` | → l'istantanea che mostra la finestra Trasferimento dati (sotto) |
| `GET /api/net/transfers/items/:id` | → `{ items, more }`: dentro una cartella di una coda. `:id` è `[a-f0-9]{20}` |
| `POST /api/net/transfers` | `{ sources: [luogo], target: luogo, workspace? }` (fino a 1 MB, al massimo 1000 sorgenti) → `{ queue }` |
| `POST /api/net/transfers/cancel` | `{ ids?, queue?, all? }` → 204 |
| `POST /api/net/transfers/resolve` | `{ id, action: 'replace' \| 'keep' \| 'skip', all? }` → 204 |
| `POST /api/net/transfers/retry` | `{ ids?, queue? }` → 204 |
| `POST /api/net/transfers/dismiss` | `{ ids?, queue?, all? }` → 204 |
| `POST /api/net/transfers/pause` | `{ queue, paused }` → 204 |

Un **luogo** è `{ home: '<id di un nodo di lilOS>' }` (`'root'` è la home) oppure `{ mount: '<id connessione>', path }`. I percorsi passano da `cleanPath`: assoluti, senza `.`, `..` né parti vuote o più lunghe di 255 caratteri, né caratteri di controllo; altrimenti `invalid`.

**Errori delle connessioni.** `secret_required` (428): serve la password; `details.reason` è `'missing'` (non c'è; `details.fields` elenca i campi che mancano), `'auth'` (il server l'ha rifiutata) o `'signin'` (protocollo con un campo `signin`: serve un nuovo accesso, vedi [Accesso con un fornitore](#accesso-con-un-fornitore-netsigninjs)). `untrusted` (409): `details.trust` è `{ kind: 'ssh' \| 'tls', fingerprint, text }`; la pagina mostra `text`, chiede conferma e ripete `connect` con `trust: fingerprint`. `unavailable` (503): il server non si raggiunge o la connessione è caduta.

#### Accesso con un fornitore (`net/signin.js`)

Per i protocolli con un campo `signin` (OneDrive): l'utente fa l'accesso al suo account sulla pagina del fornitore, in una finestra. È OAuth 2.0 con codice di autorizzazione e PKCE (`S256`). **I token restano nel kernel**: la pagina non li vede mai. Motivi: [D60](../interna/decisioni.md#d60-onedrive-nella-rete-laccesso-con-la-finestra-del-fornitore-e-le-impostazioni-dei-moduli).

1. **Inizio.** La pagina apre subito una finestra vuota (`window.open` funziona solo da un clic) e chiede `POST /api/net/signin` con `{ protocol, values, redirectUri }`; `values` sono gli altri campi della connessione, che possono cambiare la richiesta al fornitore. Il kernel controlla che il protocollo abbia un campo `signin` (`unavailable` se no), che `ready()` risponda `null` (altrimenti `unavailable` con l'etichetta), che l'utente abbia meno di 5 accessi in corso (`rate_limited`) e `redirectUri` (`cleanRedirect`, sotto). Poi chiama `signIn.start({ values, redirectUri, state, challenge })` e risponde `{ id, url }`. `state` e il `verifier` sono 32 byte casuali (base64url), `challenge` è lo SHA-256 del `verifier`; `url` deve essere `https://` (o `http://` su loopback), altrimenti `invalid`. `id` è di 24 caratteri `[\w-]`.
2. **Attesa.** La pagina porta la finestra a `url` e ripete `GET /api/net/signin/:id?wait=1`: la richiesta risponde appena lo stato cambia, o dopo 25 secondi con `pending`. Risposta: `{ status: 'pending' \| 'done' \| 'error', account?, error? }`.
3. **Ritorno.** Il fornitore rimanda la finestra a `GET /api/net/signin/callback?code&state` (o `?error&error_description&state`). La rotta è registrata **prima** delle altre `/api/net/signin/…` e **senza sessione**: quando un altro sito rimanda il browser il cookie `SameSite=Strict` non arriva, quindi l'accesso si riconosce dallo `state`, casuale e usabile una volta sola. La risposta è una pagina HTML minima senza script («Fatto» o «Accesso non riuscito» e il motivo), con CSP `default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'`: la finestra la chiude la pagina di lilOS. Con il `code` il kernel chiama `signIn.finish({ values, code, redirectUri, verifier })` → `{ account, secret }`.
4. **Uso.** Con `status: 'done'` la pagina passa `signin: id` a `POST /api/net/mounts`, `PUT /api/net/mounts/:id`, `POST /api/net/mounts/:id/connect` e `POST /api/net/test`. Il kernel mette `account` nel campo `signin` (in `values`) e `secret` nei segreti, con la chiave del campo. Un accesso si usa **una volta** (con `/test` resta valido per la connessione che segue; se durante la prova il driver rinnova il segreto, resta quello nuovo); dura 10 minuti; è di chi l'ha cominciato e di un solo protocollo (`not_found` o `invalid` altrimenti). `DELETE /api/net/signin/:id` lo annulla (204); un utente eliminato li perde tutti.

**Incollando l'indirizzo** (`manual`, protocolli con `signIn.manual`). Google rimanda solo a `https://` con un nome di dominio o a `localhost`: un lilOS aperto da `http://192.168.…` non riceverebbe la finestra. Con `manual: true` (o se `signIn.onlyManual()` è vero) il ritorno è `MANUAL_REDIRECT` = `http://127.0.0.1:53682/`, sul computer dell'utente, dove non c'è niente: la scheda del fornitore finisce su una pagina che non si apre, e l'utente ne incolla l'indirizzo. `POST /api/net/signin/:id/paste { url }` controlla che cominci con `MANUAL_REDIRECT`, che lo `state` sia quello di quell'accesso (`invalid` altrimenti: «di un altro accesso») e poi fa come il ritorno. Il codice da solo non serve a nessuno: il `verifier` PKCE resta nel kernel. L'SDK lo fa con `net.signIn(…, { manual: true, askAddress })`; `net.signInByHand(protocollo)` dice quando serve.

`redirectUri` deve essere l'indirizzo di ritorno di questo lilOS: percorso esatto `/api/net/signin/callback` (`CALLBACK_PATH`), senza query, frammento né credenziali; `https://` oppure `http://` solo su `localhost`, `127.0.0.1` o `[::1]` (i fornitori non accettano altro e l'indirizzo va registrato presso di loro); la sua origine deve essere quella dell'intestazione `Origin` della richiesta, se c'è (`invalid` negli altri casi). L'SDK lo costruisce con `location.origin`.

Come cambia una connessione con un campo `signin`:

- **Il campo non si scrive dalla pagina.** `checkFields` lo salta; nella pagina è sempre `secret: true` (non torna mai). Solo un accesso lo riempie. Se è `required` servono sia l'account sia il segreto (`missingFields`).
- **`PUT /mounts/:id`** tiene l'account già salvato, salvo un nuovo accesso.
- **`connect` con `signin`** rifà l'accesso di una connessione: se l'account è diverso da quello della connessione (senza distinguere maiuscole) risponde `conflict` («Hai fatto l’accesso come …, ma «nome» è di …»). Gli altri segreti restano; `remember` resta quello di prima se non lo si indica.
- **Segreto rinnovato.** Se il fornitore cambia il segreto mentre la sessione è aperta (OneDrive cambia il token di aggiornamento a ogni rinnovo), il driver chiama `saveSecret({ [chiave del campo]: nuovo })`: il kernel lo tiene come il vecchio, cifrato se la connessione è ricordata, in memoria altrimenti.
- **Credenziali non più valide.** Se `connect` non ha il segreto, o il driver lancia `net: 'auth'` (anche durante l'uso: la sessione si chiude e lo stato torna `off`), l'errore è `secret_required` con `details.reason: 'signin'` (e `details.fields` se mancava). La pagina rifà l'accesso e richiama `connect` con `signin`.

#### Trasferimenti (`Transfers`)

Copie di file e cartelle tra la home e le connessioni (o tra due connessioni), fatte dal kernel: vanno avanti con lilOS chiuso e dopo un riavvio. Non si sposta mai niente: le sorgenti restano dove sono. Le copie tra due cartelle della home non sono trasferimenti (`invalid`), come copiare una cartella dentro se stessa.

- **Una coda per destinazione** per utente (una connessione, o la home). Una coda copia un file alla volta; le code vanno insieme. Ciò che si aggiunge a una destinazione che ha già una coda va in fondo. Le cartelle si leggono ricorsivamente (`scanning`).
- **Elemento.** `{ id, parent, kind: 'file' \| 'folder', name, src, dst?, size, done, state, error, from, to, … }`. `state`: `scanning`, `queued`, `running`, `conflict`, `done`, `error`, `canceled`, `skipped`. Al massimo 100 000 elementi per utente.
- **Conflitti.** Se il file esiste già nella destinazione la coda si ferma finché `resolve` non risponde: `replace`, `keep` (il nuovo prende un numero) o `skip`; `all: true` tiene la scelta per il resto della coda. La scelta fatta per un elemento si ricorda finché l'elemento non finisce, anche con pausa o riavvio del kernel. Le cartelle che esistono si fondono.
- **Sostituire su un server.** Con `replace` su una connessione il file si scrive prima accanto, come `.<nome>.lilos-part`, poi il vecchio si elimina e il nuovo prende il suo nome: se il trasferimento si ferma a metà, il vecchio resta intero.
- **Documenti senza byte propri.** Un elemento `web` con `export` si copia come la sua esportazione: il nome prende l'estensione (`Verbale` → `Verbale.docx`) e il luogo ha `format` (`{ mount, path, format }`). Senza `export` come sorgente dà `invalid` («si apre solo sul web») e dentro una cartella si salta. Se la dimensione non è nota (0), alla fine vale quella copiata.
- **Cosa non si trasferisce.** Le sorgenti con un nome non sicuro (`isSafeName`) sono rifiutate (`invalid`); leggendo una cartella di una connessione non si entra nei collegamenti a cartelle (`link`) e si fermano le scansioni che superano il massimo di elementi (`Troppi file da trasferire`).
- **Errori.** Se la connessione cade il file si riprova tre volte (dopo 2, 5 e 10 secondi), ripartendo da metà se `resume` lo permette. Quello che non riesce resta in coda in stato `error` finché non si usa `retry` o `dismiss`.
- **Fermare.** Solo con `cancel` (per elementi, per coda o tutto). `pause` ferma una coda, non annulla.
- **Istantanea** (`GET /api/net/transfers`, evento `net.transfers`): `{ active, run, since, sent: { done, total, rate }, received: { … }, queues }`. Ogni coda: `{ id, label, key, dir: 'up' \| 'down', paused, policy, state: 'running' \| 'paused' \| 'conflict' \| 'done', total, done, files, filesDone, rate, current, conflict, items, more }`; `items` ha al massimo 200 righe, il resto si legge con `/items/:id`. `run` e `since` identificano la serie di trasferimenti in corso (la finestra si apre da sola una volta per serie).
- **Nodi della home.** I file e le cartelle che un trasferimento crea nella home sono nodi del file system fatti dal kernel: la pagina li riceve con l'evento `fs.external` (`fs.external()` nell'SDK) e non li rimanda indietro.
- **Riavvio.** Le code si salvano in `DATA_DIR/net/transfers-<hash dell'utente>.json` (ogni 2 secondi) e ripartono all'avvio del kernel; un file della home rimasto a metà si cancella e riparte da zero.
- **Fine di una coda.** Se qualcosa è stato trasferito o è fallito, arriva una notifica `Trasferimento completato: …` / `finito con errori: …` / `non riuscito: …` con azione `{ entry: 'transfers', args: null }` (il mittente è lilOS: la pagina apre la finestra). Senza il servizio `notifications` l'evento `net.notify` porta il testo e la pagina lo notifica da sé.

#### Eventi per le pagine

Arrivano sul flusso `/api/services-events` dell'utente (come quelli dei moduli):

| Evento | Dati | Quando |
| --- | --- | --- |
| `net.mount` | `{ id }` | Una connessione è stata aggiunta, cambiata, rimossa o ha cambiato stato: la pagina rilegge l'elenco |
| `net.change` | `{ mount, path }` | Il contenuto di una cartella è cambiato sul server (protocolli con `watch`) |
| `net.transfers` | l'istantanea | Cambia qualcosa nei trasferimenti: al massimo ogni 400 ms |
| `fs.external` | `{ put?: [nodo], remove?: [id] }` | Il kernel ha creato, cambiato o tolto nodi nella home (nodi come li vede la pagina) |
| `net.notify` | `{ text, level }` | Fine di una coda, solo se nessun modulo fornisce `notifications` |

#### Contenuti grandi nel servizio `fs`

Il servizio `fs` può avere, oltre a `read` e `write`, due metodi facoltativi per i contenuti grandi (senza, il kernel ripiega su `read`/`write`, con il file intero in memoria): `readStream(principal, id, { start })` → `Readable` dal byte `start`, e `writeFrom(principal, id, source, { signal })` → dimensione, che scrive da uno stream e rende il contenuto quello del file solo quando è arrivato tutto. `GET /api/fs/content/:id?raw=1` li usa per mandare i byte in streaming, con `Content-Length` (senza `raw` resta il testo, letto per intero). `fs-postgres_1.1.0` li ha: se un file viene riscritto mentre si legge (i suoi pezzi spariscono), `readStream` lancia «Il file è cambiato mentre veniva letto» invece di restituire un file più corto. `PUT /api/fs/content/:id` non è cambiato.
### Terminali remoti (`term/`, `api/term.js`)

I terminali SSH, Telnet, rlogin e SUPDUP stanno nel kernel e li usa l'app di sistema **Terminale** (dalla 1.2.0; prima era l'app a parte «Terminale remoto», tolta dal catalogo). Un'app di terze parti li usa con il permesso `term` e [`lilos.term`](#windowlilos-bridgejs). Motivi e alternative scartate: [D61](../interna/decisioni.md#d61-i-terminali-remoti-le-sessioni-vivono-nel-kernel-un-websocket-nostro). Come per la Rete, i protocolli sono moduli e il kernel ne trova i servizi all'avvio (senza nessuno, `GET /api/term` risponde con elenchi vuoti).

| File | Che cosa fa |
| --- | --- |
| `ws.js` (`acceptSocket`, `refuseUpgrade`) | Un WebSocket (RFC 6455) senza librerie, sopra una richiesta `upgrade` |
| `term/drivers.js` | Il contratto dei protocolli (`term.<protocollo>`), `findDrivers`, `isSecure` |
| `term/terminals.js` (`Terminals`, `kernel.terminals`) | Gli host salvati di ogni utente e le sessioni aperte |
| `term/screen.js` (`History`, `Charset`, `ENCODINGS`) | Lo schermo tenuto per chi si ricollega e le codifiche |
| `api/term.js` | Gli endpoint e la rotta del WebSocket (sotto) |

#### Protocolli: il servizio `term.<protocollo>`

Un modulo fornisce un protocollo con un servizio che si chiama `term.<protocollo>` (`provides: ["term.ssh"]`); il nome è `[a-z][a-z0-9-]{0,30}`. Un servizio senza `open()` e `address()`, con `fields` non validi o con una porta fuori da 1-65535 è scartato con un avviso nel log del kernel.

```js
// il servizio che un modulo passa a ctx.provide('term.esempio', …)
{
  label: { en: 'Example', it: 'Esempio' },   // stringa o { lingua: testo }
  order: 50,                                 // posizione nell'elenco (più basso prima)
  port: 4000,                                // la porta solita
  secure: false,                             // o (values) => boolean
  fields: [ /* come per la Rete: host, port, user… */ ],
  address(values) { return `esempio://${values.host}`; },
  async open(values, ctx) { return session; },
}
```

| Membro | Descrizione |
| --- | --- |
| `label`, `order` | Il nome che l'utente sceglie e la sua posizione |
| `port` | Intero 1-65535: la porta solita (la pagina la mostra, il driver la usa se il campo è vuoto) |
| `fields` | Come per i protocolli di Rete ([Campo](#protocolli-il-servizio-netfsprotocollo)): `host` è il server, `port` la sua porta. I campi `secret` arrivano in `ctx.secret` |
| `secure` | `true`, `false` o `(values) => boolean`: se ciò che passa è cifrato. Il kernel lo copia in host e sessione; la pagina avverte per i non cifrati. Con una funzione, `termProtocolInfo` dà `null` alla pagina |
| `address(values)` | `string`: come si mostra la connessione (`ssh://ann@host:2222`) |
| `check?(values)` | Lancia un errore con `net` se i valori non si possono usare così come sono |
| `open(values, ctx)` | `Promise<session>`: collega e, se il protocollo lo fa, entra |

`ctx`:

| Campo | Descrizione |
| --- | --- |
| `secret` | `{ chiave: valore }` dei campi segreti, `{}` se non ce ne sono. Il kernel la scorda appena la sessione è collegata |
| `cols`, `rows` | La dimensione dello schermo |
| `term` | Il tipo di terminale da annunciare (`'xterm-256color'`) |
| `cwd` | Una cartella in cui partire, o `null` (lo usa solo SSH, dalla voce «Apri terminale SSH qui» del Terminale) |
| `ask(prompt, { echo = false })` | `Promise<string>`. Chiede una riga all'utente **nel terminale stesso** (una password che il server vuole): scrive `prompt` sullo schermo e legge quello che l'utente digita fino a Invio. Si rifiuta se l'utente rinuncia con Ctrl+C o Ctrl+D (errore con `net: 'cancelled'`). Una domanda alla volta |
| `confirm(trust)` | `Promise<boolean>`. La chiave o il certificato che il server ha mostrato, `{ kind: 'ssh' \| 'tls', fingerprint, text }`. Vale `true` se è quella già confermata per questo protocollo, host e porta, o se l'utente la conferma ora (la pagina riceve `{ t: 'trust' }`, la risposta arriva col socket); `false` se rifiuta o chiude. Il kernel la ricorda |
| `print(text)` | Una riga per l'utente nel terminale (che cosa sta succedendo) |
| `signal` | `AbortSignal`: l'utente ha chiuso la sessione mentre si collegava |

**Sessione** (i byte sono quelli che uno xterm mostra e manda: un protocollo il cui server parla un'altra lingua, come SUPDUP, traduce nei due sensi):

| Membro | Descrizione |
| --- | --- |
| `onData(fn(Buffer))` | Ciò che manda il server |
| `onClose(fn({ reason }))` | La connessione è finita (`reason`: un messaggio per l'utente, o vuoto) |
| `write(Buffer)` | Ciò che scrive l'utente |
| `resize(cols, rows)` | |
| `signal?(name)`, `signals?` | `signals`: i nomi che conosce (`'break'`, `'interrupt'`, `'ayt'`), per il menu Tasti; il kernel inoltra `{ t: 'signal', name }` solo per questi |
| `pause?()`, `resume?()` | Smettere e riprendere di leggere dal server quando la pagina è indietro (oltre 1 MB in coda) |
| `info?` | Dati per la barra di stato (`{ key, cipher }` per SSH); torna in `session.info` |
| `close()` | |

**Errori.** Come per i driver di Rete portano `net` (`auth`, `untrusted`, `unreachable`, `lost`, `invalid`…): il kernel scrive il messaggio in rosso nel terminale e la sessione passa a `closed`. Prima di ogni apertura il kernel controlla dove può collegarsi (`net/guard.js`, come per la Rete).

#### Host e sessioni (`Terminals`)

- **Host salvati.** Ogni utente ha `DATA_DIR/term/<hash dell'utente>.json` (ignorata da git, `/term/`; permessi `0600`): `{ hosts: [{ id, name, folder, protocol, values, secret, settings, created, used }], known }`. Al massimo 200 host; nome fino a 60 caratteri e unico (maiuscole a parte); cartella fino a 60. I segreti sono cifrati con `net/secrets.js` (la stessa chiave `secret.key` della Rete) e non lasciano mai il kernel. `known` ricorda le chiavi dei server confermate, per `<protocollo>:<host>:<porta>`. Un host il cui modulo non è attivo resta nell'elenco con `available: false`. Con più utenti, `prune()` toglie i file degli utenti spariti all'avvio.
- **Sessioni.** Stanno solo in memoria, per utente: non sopravvivono a un riavvio del kernel, che le chiude (`stop()`). Al massimo **10** aperte (le chiuse non contano). Una sessione nasce `new`, si collega quando una pagina fa `attach` (`connecting`, poi `on` o `closed`). **Senza pagina si chiude dopo 10 minuti**; una già finita sparisce appena nessuna pagina la mostra. Un nuovo `attach` stacca il precedente (`{ t: 'taken' }`, chiusura 4000).
- **Lo schermo.** `History` tiene gli ultimi 1 MB mandati alla pagina, con i modi del terminale prima del primo pezzo (schermo alternativo, mouse, tasti del cursore, incolla protetto); chi si ricollega riceve i modi e poi i byte, e `vim` o `htop` tornano com'erano.
- **Codifica.** `settings.encoding` (`utf-8`, `iso-8859-1`, `iso-8859-15`, `cp437`): `Charset` converte in UTF-8 ciò che arriva e, nell'altro senso, ciò che l'utente scrive. `settings.backspace: 'bs'` manda `^H` al posto di `DEL`.
- **Chiavi dei server.** `ctx.confirm` chiede alla pagina solo se la chiave non è già in `known`; se è diversa da quella ricordata, la richiesta ha `changed: true` e `previous`. Una conferma si salva (`known`).
- **Password.** Quelle non salvate non passano mai dalla pagina come dati: le scrive l'utente nel terminale e vanno alla domanda `ctx.ask`.
- **Comando senza nessuno alla tastiera.** `Terminals.exec(principal, hostId, command, { signal, maxOutput = 64 KB })` → `{ output, code, reason }` esegue un comando su un host SSH **salvato**, senza sessione né domande (lo usa l'azione `command` della [Pianificazione](#pianificazione-schedule-apischedulejs)): serve la password o la chiave salvata nell'host e la chiave del server già confermata, altrimenti `untrusted` o `forbidden`. L'output è stdout e stderr insieme (gli ultimi `maxOutput` caratteri); `code` viene dal motivo di chiusura («codice N»), 255 se la chiusura ha un altro motivo, 0 senza motivo. Solo SSH.
- **Pressione.** Se la pagina ha più di 1 MB in coda il kernel chiama `pause()` e riprende col `drain`. Un messaggio dalla pagina è al massimo 256 KB.

#### Endpoint `/api/term`

Tutti per gli utenti (un utente vede solo i suoi). Gli `id` sono `[a-f0-9]{16}`.

| Metodo e percorso | Corpo → risposta |
| --- | --- |
| `GET /api/term` | → `{ protocols, encodings, hosts, sessions }` |
| `POST /api/term/hosts` | `{ name, folder?, protocol, values, settings?, remember?, secret? }` (fino a 256 KB) → host. `remember: false` non salva i segreti |
| `PUT /api/term/hosts/:id` | `{ name?, folder?, values?, settings?, remember?, forget?, secret? }` → host |
| `DELETE /api/term/hosts/:id` | → 204 |
| `GET /api/term/sessions` | → `[sessione]` |
| `POST /api/term/sessions` | `{ host, cwd? }` \| `{ protocol, values, secret?, sealed?, settings?, name?, cwd? }` \| `{ mount, path? }` → sessione. `mount` solo per una connessione SFTP (`Network.credentials`, mai verso la pagina). `cwd`: cartella assoluta del server (i protocolli che non possono la ignorano); `name`: nome della sessione (fino a 60 caratteri, senza caratteri di controllo; altrimenti l'indirizzo). `sealed`: una password di `seal`, rifiutata con `forbidden` (403) se è di un altro utente, di un altro lilOS, di un altro server o account o se è rovinata. Una connessione rapida senza `secret` né `sealed` usa la password dell'host salvato con gli stessi valori BOUND (il più usato di recente) |
| `POST /api/term/seal` | `{ host }` \| `{ protocol, values, secret }` → `{ sealed }`. I campi segreti cifrati con la chiave del kernel (`net/secrets.js`), legati all'utente, al protocollo e ai valori BOUND (`host` in minuscolo, `port` o la porta predefinita del protocollo, `user`, `auth`, `tls`). Senza password → `invalid` |
| `DELETE /api/term/sessions/:id` | Chiude e dimentica la sessione → 204 |
| `GET /api/term/sessions/:id/socket?cols=&rows=` | **WebSocket** (richiesta `upgrade`, non `fetch`). Vale il controllo dell'`Origin` ([API HTTP](#api-http)). Senza sessione `404` |

Sul socket (messaggi fino a 256 KB): **binari** sono i byte dello schermo (dal kernel) e dei tasti (dalla pagina); **testo** sono JSON. Dal kernel: `{ t: 'state', session }`, `{ t: 'trust', trust }`, `{ t: 'taken' }`. Dalla pagina: `{ t: 'resize', cols, rows }` (2-1000 colonne, 1-500 righe), `{ t: 'trust', ok }`, `{ t: 'signal', name }`. Gli stessi messaggi che [`term.attach`](#sdkcoretermjs) porta alle app.

Il socket è pingato ogni 30 secondi; senza risposta per 75 la connessione cade (codice 1006) e la sessione resta, senza pagina.

Errori: `invalid` (400), `unauthorized`, `not_found` (404: host o sessione), `conflict` (409: un host con quel nome), `unavailable` (503: manca il modulo del protocollo), `rate_limited` (429: già 10 sessioni).

#### Eventi dei terminali

| Evento | Dati | Quando |
| --- | --- | --- |
| `term.hosts` | `{}` | Gli host salvati sono cambiati |
| `term.sessions` | `{}` | Una sessione è nata, ha cambiato stato, si è collegata o scollegata, o è sparita |

Arrivano sullo stesso flusso `/api/services-events` degli eventi di Rete; la pagina rilegge con `GET /api/term`.

### Pianificazione (`schedule/`, `api/schedule.js`)

Le operazioni a una data e ora o ripetute (la **Pianificazione**) le tiene il modulo **obbligatorio** [`scheduler`](#scheduler_100) (servizio `scheduler`: le operazioni, il loro orologio, lo storico) e le **fa il kernel**. Motivi e alternative scartate: [D67](../interna/decisioni.md#d67-la-pianificazione-un-modulo-obbligatorio-del-kernel-con-le-azioni-nel-kernel). Il client è [`schedule`](#schedule) nell'SDK.

| File | Che cosa fa |
| --- | --- |
| `schedule/index.js` (`Schedules`, `kernel.schedules`) | Controlla le operazioni prima di salvarle (`prepare`), le fa quando l'orologio del modulo lo dice (`host.run`), tiene le corse nel browser (`claim`, `report`), avvisa il proprietario (`tellOwner`, notifica del risultato) e le pagine (`schedule.*`). Toglie le operazioni di un'app disinstallata e quelle degli utenti che non ci sono più (all'avvio, e subito quando una corsa scopre che il proprietario non esiste più) |
| `schedule/what.js` (`checkWhat`, `publicWhat`) | Controlla l'azione (`what`) e ne toglie i segreti per le pagine |
| `schedule/notify.js`, `copy.js`, `web.js`, `command.js` | Le azioni `notify`, `copy`, `web`, `command` |
| `api/schedule.js` (`scheduleRoutes`) | Le rotte `/api/schedule…` |
| `Kernel.userPrincipal(id)` | Il `principal` di un utente per id (o `null`): serve a far girare un'operazione come il suo proprietario |

**Dove gira ogni azione.**

| Azione | Dove | Note |
| --- | --- | --- |
| `notify`, `service`, `copy`, `web`, `command` | Nel kernel, anche a lilOS chiuso | Come il proprietario (`principal`); per il sistema (`owner: '*'`) senza home |
| `open`, `automation` | Nel browser | Il kernel manda `schedule.due` `{ task, run }` alle pagine del proprietario; la **prima** che la prende con `claim` la fa e dice com'è andata con `report`. Senza nessuna pagina aperta (le tiene il conto `pageOpened`/`pageClosed` del flusso `/api/services-events`) la corsa resta `waiting` fino a `due + catchUpHours` ore, poi è `skipped` («lilOS non era aperto»). Se nessuna pagina risponde entro 90 secondi, torna `waiting` («Nessuna pagina di lilOS ha risposto») |

Quando una pagina si apre, `connectSchedule` (`src/schedule/runner.js`) legge `pending()`: le corse che aspettavano le fa subito (`options.ask: false`) o chiede nella finestra **Operazioni in attesa**, in una sola pagina (un Web Lock `lilos:schedule-pending:<utente>`).

**`what`**, controllato prima di salvare (`checkWhat`: niente di ciò che arriva è fidato). I posti di lilOS sono id di nodi (`root` è la home), così una cartella rinominata si ritrova; `label` serve solo a mostrarli.

| `type` | Campi | Note |
| --- | --- | --- |
| `notify` | `{ text, level, open }` | `text` fino a 300 caratteri. `level` `info` (predefinito), `success`, `warning`, `error`. `open`: `null`, `{ file }` (id di un nodo) o `{ app, entry?, args? }` (`entry` di tipo finestra, `main` se manca). Il clic apre l'app dell'operazione al suo punto d'ingresso; altrimenti passa dal punto d'ingresso `open` della Pianificazione. Mittente: l'app dell'operazione, la Pianificazione o lilOS. Per il sistema: a ogni amministratore |
| `service` | `{ app, entry, params }` | Un punto d'ingresso `service` di un'app installata; `params` controllati contro quelli dichiarati. Serve il modulo `runtime` (`unavailable` senza). Vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs) |
| `copy` | `{ from, to, mode, keep, exclude }` | `from` e `to`: `{ home: id, label }` o `{ mount: id connessione, path: '/Backup', label }`. `mode`: `'versions'` (una cartella nuova «Nome AAAA-MM-GG HH.mm» a ogni corsa, si tengono le ultime `keep`, 1-100, di serie 7), `'update'` (predefinito: solo i file nuovi o cambiati, per dimensione o data), `'mirror'` (come `update`, e ciò che non c'è più nella sorgente va via dalla copia: nel Cestino della home, per sempre su una connessione). `exclude`: fino a 50 nomi con `*` e `?`, senza `/` (confronto senza maiuscole, in tempo lineare: niente espressioni regolari). La copia va in una cartella col nome della sorgente dentro la destinazione. Collegamenti, scorciatoie alle app e voci di una connessione senza byte propri (un documento di Google) restano fuori; i dati delle app sui file (un file cifrato resta tale) si conservano. Un file che fallisce finisce nel resoconto (300 righe) e la copia va avanti; la corsa, alla fine, è `error`. Un file protetto da un'app nella destinazione non si sovrascrive (è un file che fallisce). Salvando e a ogni corsa si controlla che la destinazione non sia la sorgente né dentro la sorgente (`Una cartella non si copia dentro se stessa`), anche se una cartella è stata spostata dopo. Le pagine vedono i nodi nuovi con `fs.external`. Non per il sistema |
| `web` | `{ method, url, headers, body, expect, timeoutS, saveTo }` | `method` GET (predefinito), HEAD, POST, PUT, PATCH, DELETE. `url` `http` o `https`, senza credenziali. `headers`: fino a 30, `{ name, value }` o `{ name, secret: true, value }` (cifrata con `kernel.settingSecrets`, mai rimandata: le pagine ricevono `{ name, secret: true, set }`; per tenerla si manda `{ name, secret: true }`). `body`: `{ kind: 'none' }`, `text`, `json` (controllato), `form` (con `text`, fino a 1 MB) o `file` (id di un file della home); non con GET e HEAD. `expect`: `{ status: '2xx' \| 'any' \| 100…599, contains }`. `timeoutS` 1-300 (30). `saveTo`: `{ folder, name, mode: 'replace' \| 'dated' }` (la risposta, fino a 10 MB; un file protetto da un'app con quel nome non si sovrascrive: `conflict`). Rete: la guardia di `net/guard.js` (con più utenti mai questo computer; la rete locale solo se aperta), a ogni reindirizzamento, e un reindirizzamento ad altra origine toglie le intestazioni segrete e `Authorization`, `Cookie`, `Proxy-Authorization`, e non è seguito se c'è un corpo da mandare. Una intestazione segreta si può tenere (senza `value`) solo se l'origine dell'indirizzo non cambia: cambiandola va inserita di nuovo. Il resoconto ha stato, durata, intestazioni e i primi 4 KB |
| `command` | `{ lines, cwd, host, saveTo }` | `lines` fino a 8 KB. Senza `host`: la shell del Terminale **nel kernel**, come il servizio `shell` dell'app `terminal` (1.5.0 o successivo, con `services-isolate` 1.1.0: `runScheduled` con `{ lines, cwd }`); `cwd` è l'id di una cartella della home (la home se manca). Con `host`: l'id di un host SSH salvato, via `Terminals.exec` (la password o la chiave devono essere salvate e la chiave del server già confermata). Riesce se esce con 0; in lilOS dura al massimo 60 s (il limite di `AppServices.call`/richiesta al servizio); il resoconto è l'output (stdout e stderr insieme, gli ultimi 64 KB, senza sequenze di controllo). `saveTo`: `{ folder, name, mode: 'replace' \| 'append' }`. Non per il sistema |
| `open` | `{ file }` oppure `{ app, entry?, args? }` | Nel browser. Non per il sistema |
| `automation` | `{ file, values }` | Nel browser: un file `.automata` della home, avviato con `launch('automata', …, 'run')`. Non per il sistema |

Una operazione fatta da un'**app** (`app`) può avere solo `notify`, `service` (dei servizi di quell'app) e `open` (di quell'app); le sue notifiche non aprono file né altre app.

**Chi può fare cosa.** Un utente vede e cambia le sue operazioni. Un **amministratore** quelle di tutti e quelle del sistema (`owner: '*'`); quando agisce su un'operazione altrui (creare per un altro, salvare, eliminare, accendere o spegnere, eseguire, spostare) il **proprietario riceve una notifica** (`tellOwner`, nella sua lingua: la chiave `locale`, italiano se manca) che porta alla Pianificazione. Il proprietario di un'operazione non cambia. Il sistema non ha una home: niente file, connessioni, comandi, aperture di app e automazioni.

**Il risultato.** Ogni corsa ha un esito (`ok`, `error`, `skipped`, `waiting`, `cancelled`). Con `options.notify` `'error'` (predefinito) o `'always'` il proprietario riceve una notifica («“Nome” è riuscita» / «“Nome” non è riuscita: motivo»), nella sua lingua, con un'azione che apre la Pianificazione alla corsa (`args: { task, run }`). Un promemoria riuscito non ne manda un'altra: è lui la notifica. Un errore che ha ancora un nuovo tentativo non avvisa: lo fa l'ultimo.

**Eventi per le pagine** (sul flusso `/api/services-events`, al proprietario e a ogni amministratore; `schedule.due` solo al proprietario):

| Evento | Dati | Quando |
| --- | --- | --- |
| `schedule.change` | `{ ids }` | Operazioni salvate, tolte, accese, spente, spostate |
| `schedule.run` | `{ task, run, state }` | Una corsa è partita, aspetta o è finita |
| `schedule.due` | `{ task, run }` | Una corsa nel browser da fare adesso |

**Rotte** (`api/schedule.js`, solo utenti con l'accesso fatto). `app` (nella query o nel corpo) dice che la richiesta è di un'app (lilOS lo manda per le sue app, `forApp`): le operazioni sono solo quelle con quell'`app`, e una nuova la porta. Un'app non può indicare un altro `owner`.

| Rotta | Corpo e risposta |
| --- | --- |
| `GET /api/schedule` | `?owner&app` → `{ admin, tasks }` |
| `POST /api/schedule` | `{ name, when, what, enabled?, options?, owner?, app? }` (fino a 256 KB) → task. Solo un amministratore può dare un `owner` diverso da sé (id utente o `'*'`), altrimenti `forbidden` |
| `GET /api/schedule/:id` | → task (`not_found` se non è dell'utente) |
| `PUT /api/schedule/:id` | Come `POST`; il proprietario e l'`app` restano quelli dell'operazione → task |
| `DELETE /api/schedule/:id` | 204 |
| `POST /api/schedule/:id/enable` | `{ on }` → task |
| `POST /api/schedule/:id/run` | → run (parte subito, non aspetta la fine) |
| `POST /api/schedule/:id/move` | `{ at, to, scope }` → task. Solo il quando |
| `GET /api/schedule-history` | `?task&owner&state&limit&before&app` → `[run]` |
| `GET /api/schedule-occurrences` | `?from&to&owner&task&app` (ms) → `{ items, series }` |
| `GET /api/schedule-pending` | → `[run]`: le corse nel browser dell'utente che aspettano lilOS |
| `POST /api/schedule-runs/:id/claim` | → `{ task, run }`; `conflict` se un'altra pagina l'ha già presa o la corsa è già fatta o scaduta |
| `POST /api/schedule-runs/:id/result` | `{ state: 'ok' \| 'error' \| 'skipped', text, log }` (fino a 320 KB) |
| `POST /api/schedule-runs/:id/cancel` | → run |
| `GET /api/schedule-catalog` | → `{ services, hosts, users, runtime }` |

Errori: `invalid` (regola o azione non valida; «Troppo spesso» sotto `minIntervalMinutes`; oltre `maxTasksPerUser`), `forbidden` (un utente che pianifica per altri), `not_found`, `conflict`, `unavailable` (senza il modulo `runtime` per un `service`, senza `notifications` per un `notify`; senza il Terminale 1.5.0 per un `command` in lilOS), `too_large`.

**Servizi delle app chiamati dalla Pianificazione.** Un `service` parte con `AppServices.runScheduled(principal, app, entry, params, { task, run })`: il servizio del proprietario (o del sistema) riceve `lilos.handle` con `{ schedule: { task, name, run, params } }`, da `from: 'scheduler'`. Se era spento parte per l'occasione (`args.reason: 'schedule'`, con i `params` dell'operazione) e si ferma dopo l'ultima corsa che lo usa; se era già acceso, resta acceso. Ciò che risponde è l'esito: una stringa (`ok`, è il testo), oppure `{ ok?, text?, error?, log? }` (con `ok: false` o `error`, `error` è l'esito; `log` è il resoconto). Un errore del servizio è un esito `error`.

---

### `users-basic_1.0.0`

Configurazione: `sessionDays` (30) e `idleDays` (7). Tutto sta in `users.json` nella cartella del modulo:

```json
{ "version": 1, "users": [
  { "id": "…", "username": "eugenio", "name": "Eugenio", "role": "admin", "password": "scrypt$32768$8$1$<sale>$<hash>", "created": 1793180000000,
    "sessions": [{ "hash": "<sha256 del token>", "created": 0, "expires": 0, "seen": 0 }] }
] }
```

- Nome utente: `[a-z0-9][a-z0-9._-]` da 2 a 32 caratteri; password da 8 a 256 caratteri; ruoli `admin` e `user`.
- Il cookie contiene un token casuale; qui si salva solo il suo SHA-256. Al massimo 20 sessioni per utente. Una sessione finisce dopo `sessionDays` dall'accesso o `idleDays` senza uso; l'ultimo uso si salva al massimo una volta all'ora.
- Tentativi: dopo 5 password sbagliate per lo stesso nome utente, o 20 dallo stesso indirizzo, l'attesa raddoppia a ogni errore (2 s, 4 s…, al massimo 15 minuti) e il kernel risponde `rate_limited` con `Retry-After`. Il conteggio è in memoria. Con un nome utente che non esiste il tempo di risposta è lo stesso.
- Il file si rilegge quando cambia e si valida a ogni lettura; si riscrive intero, una modifica alla volta. Cambiare la password chiude tutte le sessioni dell'utente.
- Comandi: `add <nome> [--name "Nome visibile"] [--admin]`, `passwd <nome>`, `remove <nome>` (la home resta nel file system), `list`.

### `fs-postgres_1.1.0`

Configurazione: `url` (la variabile `LILOS_PG_URL` vince) e `poolSize` (10). All'avvio applica `schema.sql` (tabella `lilos_nodes`: `id`, `parent`, `name`, `type`, `area`, `owner`, `meta`, `size`, `created`, `modified`, `content`, `rev`, `chunks`; tabella `lilos_chunks`: `node`, `gen`, `seq`, `data`) e crea le cartelle di base.

| Area | Percorso | Chi legge | Chi scrive |
| --- | --- | --- | --- |
| `root`, `system`, `homes` | `/`, `/system`, `/home` | solo il kernel | il kernel |
| `app` | `/system/app` | tutti gli utenti | il kernel |
| `commons` | `/system/commons` | tutti gli utenti | il kernel |
| `tmp` | `/system/tmp` | il kernel | il kernel |
| `home` | `/home/<utente>` | quell'utente | quell'utente |

Un nodo prende area e proprietario dal genitore alla creazione e non li cambia: niente si sposta da una home all'altra né fuori dalle home. Le cartelle di base e le home non si rinominano né si rimuovono. Eliminare una cartella elimina ciò che contiene. I nomi in una cartella non sono unici: `lookup` prende il più vecchio e ignora maiuscole e minuscole.

**Contenuti grandi (dalla 1.1.0).** `read` e `write` prendono un file intero in memoria; `read` rifiuta un contenuto di più di 256 MB. `readStream(principal, id, { start })` e `writeFrom(principal, id, source, { signal })` lavorano a pezzi: `writeFrom` salva il contenuto in `lilos_chunks`, in righe da 1 MB, e lo rende quello del file (`chunks` indica la generazione di pezzi in uso) solo quando è arrivato tutto; fino ad allora chi legge vede il vecchio. Se la scrittura si interrompe, i pezzi a metà si cancellano. Un file scritto da `write` resta in `content`. `schema.sql` aggiunge la colonna e la tabella da sé, a ogni avvio. Il database della 1.0.0 si aggiorna senza altro.

### Origini dei pacchetti (`sources.js`)

Un pacchetto (app o modulo) è una cartella di un repository **git**, letta con il comando `git` del computer del kernel. Quindi un repository privato si legge con le credenziali che git ha già (credential helper, token, chiavi SSH); non serve nessuna variabile del kernel (`LILOS_GITHUB_TOKEN` non esiste più). Il kernel imposta `GIT_TERMINAL_PROMPT=0`: se git chiede una password, fallisce.

| Origine | Campi | Note |
| --- | --- | --- |
| `{ type: 'git' }` | `url`, `ref?`, `path?` | `url` `https://…`; con `apps.allowLocalSources` anche il percorso assoluto di un repository su questo computer. `ref`: tag, ramo o commit (`[\w./-]`, fino a 200). `path`: cartella nel repository (`apps/notes`, fino a 11 livelli). |
| `{ type: 'github' }` | `repo: 'proprietario/nome'`, `ref?`, `path?` | Come `git` con `url: https://github.com/<repo>`. |
| `{ type: 'local' }` | `dir` | Cartella semplice, percorso assoluto; solo con `apps.allowLocalSources`. Per sviluppare. |

- **Senza `ref`** si usa il tag di versione più alto (`v1.2.3` o `1.2.3`); se non ce ne sono, il ramo predefinito (`HEAD`).
- Il repository si scarica in una copia temporanea (`fetch --depth 1`), condivisa per due minuti tra richieste vicine. I file sono quelli del commit, **senza conversione delle fine riga** (`core.autocrlf=false`): altrimenti gli hash del manifesto non corrisponderebbero.
- Lo stato dell'app o del modulo registra la fonte risolta: `{ type: 'git', url, ref, commit, path? }`. Gli aggiornamenti ripartono dall'`url` e dal `path`.
- Limiti: 20 MB per file, 80 MB e 2000 file per pacchetto; 180 s per ogni comando git. Copiando un modulo si ignorano i file che iniziano con un punto e `node_modules`.
- Un messaggio di errore di git viene riportato (ridotto alla prima riga, senza le credenziali nell'indirizzo) come `unavailable`.
- È "ufficiale" l'origine `git` con l'`url` del repository ufficiale (confronto senza maiuscole, senza `.git` né `/` finali).

`fetchPackage(source)` legge `lilos.json`, lo valida e scarica i file elencati.

### Repository (`repos.js`)

Un repository ha un `catalog.json` alla radice:

```json
{ "name": "Il mio repository", "apps": ["apps/note"], "modules": ["modules/mio"] }
```

Il repository ufficiale ha anche `"system": "system/lilos"`: la cartella con la release di lilOS ([lilOS come pacchetto](#lilos-come-pacchetto-systempackagejs)). Negli altri repository `system` è ignorato.

`apps` e `modules` sono elenchi di cartelle (fino a 200 l'uno, percorsi come `apps/note`). Ogni cartella di app contiene `lilos.json`, ogni cartella di modulo `module.json`; può contenere anche un `README.md` (Markdown), che `catalog(id)` restituisce come `readme` (`null` se manca; oltre 64 KB tagliato, con `readmeTruncated: true`). Il testo completo si legge con `readme(id, path)` (`GET /api/repos/:id/readme?path=`). Le voci non valide non fermano il catalogo: compaiono con `error`.

`Repos`: `list()` (l'ufficiale per primo: `{ id: 'official', name: 'lilOS ufficiale', url: 'https://github.com/GexyLab/lilos-plugins-official', official: true }`), `get(id)`, `add(principal, { url, name? })`, `remove(principal, id)`, `catalog(id)`. `add` e `remove` sono per amministratori; `add` legge il catalogo prima di salvare (un indirizzo sbagliato si scopre subito), rifiuta quelli già presenti e oltre 30. `catalog(id)` risponde alla versione più alta, e il suo `ref` è quello da passare per installare esattamente quella versione.

### Installazione delle app (`installer.js`, `manifest.js`)

- `installer.js`: `install` (rifiuta un'app già installata), `update` (nuova versione, `ref` anche più vecchio, o `reinstall`; si tengono la versione in uso e la precedente), `uninstall`. L'hash di ogni file e quello delle librerie (`integrity`) si controllano prima di scrivere. La libreria in `/system/commons` è condivisa tra le app che la usano (`meta.usedBy`) e si elimina quando nessuno la usa più. Lo stato (`id`, `version`, `previous`, `kind`, `system`, `required`, `source`, `signed`, `publisher`, `granted`, `installed`, `updated`, `isolated`) sta nel `meta.state` della cartella `/system/app/<id>`. `isolated` è `true`, `false` (scelta di un amministratore per quell'app) o `null` (la regola generale, il valore con cui nasce); la regola generale è `meta.security.isolated` della cartella `/system/app/.security` (`true` se manca). `security()`, `setSecurity()` e `setAppSecurity()` leggono e scrivono questi valori; le ultime due solo per un amministratore (o il kernel).
- `manifest.js` controlla anche il campo `lilos` (`LILOS_RANGE`; `inRange(intervallo, versione)`) ed esporta `SDK_VERSIONS` (`['1', '2']`, i valori ammessi di `sdk`; `system.json` li ripete). `installer.js` rifiuta con `conflict`, in `install` e `update`, un'app il cui `lilos` non comprende la versione in uso (`SYSTEM_VERSION` di `config.js`).
- `manifest.js` controlla anche `locales` (un file `.json` tra i `files`, solo per app `local`) e, con `checkFiles` all'installazione e all'aggiornamento, che il file passi `parseLocales` di `sdk/core/i18n.js`: il kernel importa il motore dell'SDK ([D45](../interna/decisioni.md#d45-un-file-di-traduzioni-per-app-inglese-predefinito-un-solo-motore)), così le regole sono le stesse di lilOS. Un file non valido fa fallire l'installazione con `invalid`.
- `update` con `reinstall` riscrive **lo stesso commit** registrato in `source.commit`: non porta codice nuovo. Per averlo serve una versione più alta (o `ref` di un'altra versione, anche precedente).
- Fiducia: una firma presente ma sbagliata è sempre rifiutata; un'app è *verificata* se firmata da un editore di `trustedPublishers` con la chiave giusta, o se viene dal repository ufficiale (di sistema o no; con `officialKey` serve anche la firma ufficiale); altrimenti serve `allowUnsigned`. Un'app con `system: true` da un altro repository è rifiutata, e un'app di sistema resta di sistema negli aggiornamenti. `uninstall` rifiuta le app `required`.
- `tools/pack.js`: `node system/kernel/tools/pack.js <cartella> [--sign chiave.pem]` riempie `files` (esclusi `lilos.json`, i file che iniziano con un punto e `node_modules`) e controlla il manifesto; con `--sign` aggiunge `publisher.key` e `signature`. `--keygen chiave.pem` crea una chiave Ed25519 e stampa la pubblica.

### Moduli come pacchetti (`modulePackage.js`)

`ModuleAdmin` installa, aggiorna e toglie moduli del kernel da un repository. Un modulo è codice che gira **nel kernel, con accesso completo**: solo gli amministratori, e uno non ufficiale solo con `allowUnsigned` (l'AppStore mostra l'avviso). Il kernel carica i moduli all'avvio, quindi ogni modifica richiede il riavvio ([`run.js`](#avvio-e-riavvio-runjs)).

`module.json`, oltre ai campi di [Moduli](#moduli) (qui `name` minuscolo, `version`, `kernel: "1"`, `provides`, `requires`):

| Campo | Significato |
| --- | --- |
| `description?` | Fino a 300 caratteri. |
| `icon?` | `{ glyph, color }` come per le app: `glyph` un nome di simbolo (lettere e cifre, inizia con una lettera minuscola, 2-31 caratteri), `color` `#rrggbb`. Un valore diverso rende il `module.json` non valido. `list()` lo restituisce (o `null`). |
| `data?` | File in cui il modulo tiene i suoi dati (`["users.json"]`). Si portano alla nuova versione negli aggiornamenti e si conservano, con la loro cartella, alla rimozione. |
| `defaultConfig?` | Oggetto: la configurazione con cui il modulo viene acceso in `config.json`. |
| `required?` | `true` per un modulo senza cui lilOS non parte (deve essere anche in `REQUIRED_MODULES`): l'AppStore non offre **Rimuovi** e il kernel lo rifiuta. Vedi [Moduli obbligatori](#moduli-obbligatori). `list()` lo restituisce come `required`. |
| `settings?` | Elenco di campi (vedi [Moduli](#moduli)): le impostazioni che un amministratore può cambiare, con `GET` e `PUT /api/modules/:nome/settings` (`kernelModules.settings` e `saveSettings`). Vale per i moduli in esecuzione: si controllano all'avvio del kernel, non all'installazione. |

- **Installazione.** Copia il pacchetto in `modules/<nome>_<versione>/` (con `source.json`: da dove viene, `{ type, url, ref, commit, path, installed }`), esegue `npm ci` (o `npm install` senza lockfile; `--omit=dev --ignore-scripts`) se c'è un `package.json`, e lo aggiunge a `modules` in `config.json` con `defaultConfig`. Prima **verifica che il kernel si avvierebbe** con quella lista (dipendenze soddisfatte, un modulo che fornisce `fs`, e senza `auth` solo `host` locale): se no, lascia tutto com'era e lancia `conflict`.
- **Aggiornamento.** Parte dal `source.json` registrato (con `ref` opzionale), copia la nuova versione accanto alla vecchia, ci porta i file di `data`, aggiorna la versione in `config.json` e tiene le due versioni più recenti. Senza versione più alta risponde `unchanged: true`. Un modulo senza `source.json` (messo a mano) non si aggiorna da qui.
- **Rimozione.** Toglie il modulo da `config.json` (dopo aver verificato che il kernel si avvierebbe senza) e cancella le cartelle delle sue versioni, **tranne quelle che contengono file di `data`**: gli utenti di `users-basic` restano. Un modulo obbligatorio (`REQUIRED_MODULES`) non si rimuove (`forbidden`). Reinstallando la stessa versione quella cartella si riusa.
- **Impostazioni.** `ModuleAdmin.settings(principal, nome)` e `saveSettings(principal, nome, valori)` (solo amministratori; `not_found` se il modulo non è attivo). `saveSettings` controlla i valori con `checkFields`, li scrive nella voce del modulo in `config.json` (le chiavi non dichiarate restano), li mette in `ctx.config`, chiama i suoi `onConfig` e, per i moduli che forniscono `netfs.*`, chiude le connessioni aperte. Un modulo senza `onConfig` non è `live`: le impostazioni valgono dal prossimo avvio (il log lo dice). `required` e `when` dei campi non si applicano al salvataggio (servono alla pagina per disegnarli).
- `list()`: i moduli trovati in `modules/`, con `enabled` (versione in `config.json`), `running` (in uso adesso) e `source`; anche quelli già tolti ma ancora in esecuzione fino al riavvio.

### lilOS come pacchetto (`systemPackage.js`)

Anche lilOS è un pacchetto del repository ufficiale ([D57](../interna/decisioni.md#d57-lilos-si-aggiorna-dal-repository-ufficiale-come-un-pacchetto)): la **build** di una versione (la pagina costruita e il kernel impacchettato e minificato, con quello che usa dell'SDK), mai i sorgenti. `SystemReleases` (`kernel.system`) la installa accanto a quella in uso. Solo amministratori, solo dal repository ufficiale; endpoint in [API HTTP](#api-http), client in [`systemReleases`](#systemreleases).

**Modalità** (`config.js`). Il kernel capisce da dove gira guardando se la sua radice (due cartelle sopra `system/kernel`) è `releases/<versione>/` e ha un `system.json`:

| Esportazione | Sviluppo (copia del repository) | Installato |
| --- | --- | --- |
| `KERNEL_DIR` | `system/kernel` | `system/kernel` dentro la release |
| `RELEASE_DIR` | `null` | `<cartella>/releases/<versione>` |
| `INSTALL_DIR` | `null` | `<cartella>`, quella con `run.js` e `current.json` |
| `DATA_DIR` | `KERNEL_DIR`, dove stanno `config.json`, `repos.json`, `modules/` | `INSTALL_DIR` (con la variabile `LILOS_DATA_DIR` si sceglie un'altra cartella) |
| `SYSTEM_VERSION` | `version` di `package.json` | `version` di `system.json` della release |
| La pagina | la serve Vite | la serve il kernel (`web.js`) da `web/` della release |

`MODULES_DIR` è `DATA_DIR/modules` e `repos.json` sta in `DATA_DIR`: i dati restano fuori dalle release, quindi cambiare versione non li sposta. In sviluppo `info()` funziona, mentre `update`, `use`, `remove` e `acknowledge` lanciano `conflict` («si aggiorna con git»).

**Cartella di un lilOS installato.**

```
<cartella>/
  run.js                 avvia la versione di current.json (fisso, non si aggiorna con lilOS)
  package.json           { "type": "module" }
  current.json           quale versione parte, e gli esiti
  config.json, repos.json, modules/     i dati
  releases/
    1.8.0/               una cartella per versione
      system.json, README.md, CHANGELOG.md
      web/               la pagina costruita
      system/kernel/     il kernel impacchettato e minificato: src/main.js, src/cli.js, src/setup.js,
                         src/install.js, src/pack.js e i pezzi che condividono, tutti in src/
                         (config.js e install.js trovano le cartelle da lì; run.js parte da
                         src/main.js); cli.js, setup.js, tools/install.js e tools/pack.js li importano
                         soltanto; run.js, package.json, config.json
      modules/           i moduli obbligatori (solo la versione più alta di ciascuno, come nel commit)
```

**Moduli obbligatori.** La release porta con sé `system/kernel/modules/<nome>_<versione>/` dei moduli di `REQUIRED_MODULES` (oggi `scheduler`): il kernel li mette in `DATA_DIR/modules/` se mancano o sono più vecchi ([Moduli obbligatori](#moduli-obbligatori)). `scripts/release.mjs` li prende da git (`HEAD`), non dalla cartella di lavoro.

**`system.json`** (nella radice di una release, scritto da `scripts/release.mjs`):

| Campo | Significato |
| --- | --- |
| `name` | Sempre `'lilos'`. |
| `version` | `x.y.z`: quella di `package.json` quando si fa la release. |
| `kernel` | Intero: la versione dell'API dei moduli (`KERNEL_API`; i moduli la dichiarano in `module.json`, `kernel`). |
| `sdk` | `['1', '2']`: i valori di `sdk` dei manifesti che il kernel esegue (`SDK_VERSIONS`). |
| `node` | Intero: la versione minima di Node.js (dall'`engines` di `system/kernel/package.json`, 22 se manca). |
| `commit?`, `date?` | Il commit e la data (`AAAA-MM-GG`) della release. |
| `files` | `{ percorso: 'sha256-<base64>' }`: tutti i file (fino a 5000, 200 MB in tutto), compresi `web/index.html` e `system/kernel/src/main.js`, che devono esserci. |

`checkSystem(raw)` lo valida e lancia `invalid`.

**`current.json`** (lo scrivono il kernel e `run.js`, con un file temporaneo e un rinomina):

| Campo | Significato |
| --- | --- |
| `version` | La versione che parte all'avvio. |
| `previous` | La versione a cui tornare se `version` non parte, o `null`. |
| `trial?` | `true`: `version` non è ancora stata provata (`run.js` la mette in prova). |
| `updated?` | `{ from, at }`: la prova è riuscita e `from` è ancora conservata. Lo toglie `acknowledge('updated')`, o `remove(from)`. |
| `failed?` | `{ version, at, reason, log }`: la prova è fallita e `run.js` è tornato a `previous`. Lo toglie `acknowledge('failed')`, o il prossimo aggiornamento. |

**`update`.** Legge `catalog.system` del repository ufficiale, controlla `system.json`, confronta con `SYSTEM_VERSION` (uguale: `unchanged`), controlla la compatibilità, scarica ogni file verificandone l'hash in una cartella temporanea e la rinomina in `releases/<versione>` (una cartella lasciata da un tentativo fallito si riscrive). Poi scrive `current.json` con la versione nuova, `previous` = quella in uso e `trial: true`. Non riavvia: lo fa l'amministratore (`kernelModules.restart()`).

**Compatibilità** (in `update` e `use`; il messaggio dice cosa aggiornare prima):

- Node.js in uso almeno `node`.
- Ogni modulo acceso in `config.json` deve dichiarare un `kernel` uguale a quello della nuova versione.
- Ogni app installata deve avere `sdk` tra quelli della nuova versione e, se ha `lilos`, un intervallo che comprende la nuova versione.

**Prova e ritorno.** Vedi [Avvio e riavvio](#avvio-e-riavvio-runjs).

**Costruire una release** (`npm run release -- <cartella del repository ufficiale> [--allow-dirty]`, `scripts/release.mjs`). Costruisce la pagina con Vite in una cartella temporanea (`dist/` non cambia) e scrive in `<repository>/system/lilos`:

- `web/` (la pagina), `system/kernel/` (`cli.js`, `setup.js`, `run.js`, `package.json` e i file tracciati da git di `src/` e `tools/`) e `system/kernel/config.json` (quello di git, con `allowLocalSources: false`);
- i file dell'SDK fuori dal kernel che il kernel importa (li trova seguendo gli `import` relativi), `package.json` (`type: module`) e `system.json`;
- `README.md` solo se manca, e `CHANGELOG.md` con una sezione nuova per la versione (i messaggi dei commit dal tag `v<versione prima>` di questo repository);
- in `catalog.json` del repository ufficiale, `"system": "system/lilos"` se manca.

Rifiuta di partire se ci sono modifiche non salvate (`--allow-dirty` solo per provare: i file si prendono dalla cartella di lavoro). Nel repository ufficiale vanno solo la build, `README.md` e `CHANGELOG.md`. Dopo: controllare il changelog, commit e tag nel repository ufficiale. Passi in [Pubblicare una versione di lilOS](ricette.md#pubblicare-una-versione-di-lilos).

**Prima installazione** (`system/kernel/tools/install.js`, lanciato dalla release scaricata): `node system/kernel/tools/install.js <cartella> [--from <cartella del kernel>]`. Verifica Node.js e gli hash, scrive `releases/<versione>`, `run.js`, `package.json` e `current.json` (`{ version, previous: null }`). Senza `--from` copia la configurazione della release e installa i suoi moduli dal repository ufficiale; con `--from` copia `config.json`, `repos.json` e `modules/` (senza `node_modules`, reinstallati dai lockfile) di una copia del repository o di un altro lilOS installato, così utenti e file sono gli stessi. Un modulo copiato senza `source.json` che il catalogo ufficiale offre con lo stesso nome, la stessa versione e lo stesso codice (`adoptModule` di `modulePackage.js`) viene riscritto da lì con `source.json`, tenendo i file di `data`. Rifiuta una cartella dove lilOS è già installato.

### Servizi delle app (`apps/appServices.js`)

I punti d'ingresso `kind: 'service'` (vedi [Manifesto](#manifesto-lilosjson)) girano **nel kernel**, anche a lilOS chiuso. Li esegue il servizio `runtime` di un modulo ([`services-isolate`](#services-isolate_110)); `AppServices` (`kernel.appServices`) decide chi li avvia e quando. Senza un modulo `runtime` lilOS funziona, ma senza servizi (`GET /api/services` dà `available: false`).

**Proprietario.** Ogni istanza ha un proprietario: un **utente** (il servizio gira per lui, con la sua home) oppure il **sistema** (`'*'` negli eventi e nelle chiavi interne: nessun utente, una sola istanza per tutti). Un servizio di sistema non ha home: ha solo i propri dati e la rete.

**Quando partono.**

| Momento | Chi parte | Come |
| --- | --- | --- |
| `system:ready` | I servizi scelti per tutti, come sistema | Il kernel li avvia dopo aver iniziato ad ascoltare |
| `user:login` | I servizi che l'utente ha scelto, come lui, se non ha spento l'interruttore (`enabled`) | La **prima richiesta** di quell'utente in questa esecuzione del kernel (`principalOf`), o il suo accesso (`POST /api/session`): anche una sessione ancora valida conta. Quando esce (`DELETE /api/session`) i suoi servizi si fermano e al prossimo ingresso ripartono |
| a mano o a chiamata | Quello indicato | `start` / `restart`, o una chiamata (`lilos.apps.call`, `services.call`) a un servizio spento: poi resta acceso, finché non lo si ferma o finché il proprietario non esce |

Un servizio **scelto per tutti** gira solo come sistema: chiamate e comandi vanno a quell'istanza, e solo gli amministratori lo avviano, fermano o ne leggono il registro. Sceglierlo (o toglierlo dalla scelta di tutti) lo fanno solo gli amministratori.

**Cosa riceve.** La funzione esportata col nome del punto d'ingresso, come per un background: `export function sync({ lilos, args })`. `args` è `{ reason, ...params }`: `reason` è `'system:ready'`, `'user:login'`, `'manual'`, `'call'` o `'schedule'` (lo ha avviato la [Pianificazione](#pianificazione-schedule-apischedulejs), con i `params` dell'operazione); `params` sono i parametri scelti (controllati contro quelli dichiarati nel manifesto, con i predefiniti riempiti; stessi tipi di [Parametri dei punti d'ingresso](#parametri-dei-punti-dingresso); `file` e `folder` sono percorsi `~/…`). Senza `params` dichiarati: un oggetto JSON fino a 4 KB.

**Ripartenze e registro.**

- Se si ferma da solo (errore, memoria, processo terminato) riparte dopo 1 s, poi 5 s, poi 30 s. Alla quarta volta entro 5 minuti resta spento, con stato `error` e l'ultimo errore. Se non riesce nemmeno a partire (codice che non corrisponde al manifesto, errore nell'avvio, `import`), lo stato è subito `error` e **non** riparte da solo: serve `start` o `restart`.
- Ogni istanza tiene le ultime **200 righe** di registro (`console.*`, accensioni, spegnimenti, errori; ogni riga fino a 2000 caratteri).
- Se l'app si aggiorna, i servizi accesi ripartono con il codice nuovo (non quelli in `error`); se l'app viene rimossa si fermano, e l'app esce dall'elenco dei servizi di sistema. Il codice si controlla con l'hash del manifesto prima di partire.

**Stati.** `'off'`, `'starting'`, `'on'`, `'error'`.

**Dati salvati.**

| Cosa | Dove |
| --- | --- |
| Scelte dell'utente | Chiave `startup-services` della `.config` dell'utente: `{ enabled, services: [{ app, entry, params }] }` (`enabled` è `true` se manca; al massimo 100 servizi, senza duplicati). Vedi [Dati salvati](#startup-services) |
| Scelte per tutti | Nodo `/system/app/.startup` (id `app-startup`, cartella): `meta.startup.services` con la stessa forma. Lo scrive il kernel |
| Dati di un servizio **di sistema** | File `app:<id>/~data` (nome `.data`) nella cartella dell'app, JSON, fino a 1 MB; si cancella con l'app |
| Dati di un servizio **di un utente** | Le stesse chiavi di `lilos.storage` nelle finestre: `app:<id>:<chiave>` nella `.config` dell'utente |

**Interfaccia (`AppServices`).** Eventi `change` `{ owner, app, entry }` e `notify` `{ owner, app, text }` (quest'ultimo solo se nessun modulo fornisce `notifications`: altrimenti `ui.notify` diventa una notifica).

| Metodo | Cosa fa |
| --- | --- |
| `available` | `true` se c'è il servizio `runtime` |
| `catalog()` | I servizi delle app installate |
| `list(principal)` | Ciò che mostra il Pannello di controllo: `{ available, enabled, admin, services }`, ciascuno `{ app, entry, label, name, glyph, color, params, startup: 'none' \| 'login' \| 'system', values, system, canControl, status, since, error }` |
| `setStartup(principal, app, entry, { when, params? })` | `when`: `'none'`, `'login'` (per l'utente) o `'system'` (per tutti: amministratori). Senza `params` tiene quelli già scelti. Passando da utente a sistema (o viceversa) ferma l'istanza che non vale più e, se era accesa (non `off` né `error`), la fa ripartire subito nell'altra forma (motivo `manual`) |
| `setOptions(principal, { enabled })` | Interruttore dei servizi dell'utente |
| `control(principal, app, entry, action)` | `'start'`, `'stop'` o `'restart'` → `{ status, error }`. `start` su un servizio in `error` lo riavvia da capo |
| `call(principal, app, entry, data, from)` | Avvia se serve e dà ciò che restituisce il suo `lilos.handle` (un errore del servizio è `invalid`, un servizio che non parte `unavailable`; massimo 60 s). Il campo `schedule` dei dati e `from: 'scheduler'` sono **riservati** alla Pianificazione (`runScheduled`): una chiamata di una pagina o di un'app che li usa è `forbidden`, così un servizio che risponde a `{ schedule }` sa che la richiesta viene dal kernel |
| `log(principal, app, entry)` | `{ lines: [{ at, level, text }] }` |
| `runScheduled(principal, app, entry, params, { task, run })` | Una corsa della Pianificazione: il servizio del proprietario (`principal`, `null` per il sistema) riceve in `lilos.handle` `{ schedule: { task, name, run, params } }` con `from` `'scheduler'`, e ciò che risponde è l'esito. Se era spento parte per la corsa (`reason: 'schedule'`); più corse possono usare la stessa istanza, che si ferma dopo l'ultima, e solo se l'ha fatta partire la Pianificazione. Un errore del servizio è `invalid`, uno che non parte `unavailable` |
| `userSeen(principal)`, `userLeft(userId)`, `systemReady()`, `stopAll()` | I momenti descritti sopra, e l'arresto del kernel |

`kernel.stop()` ferma tutti i servizi e chiude anche le connessioni aperte (i flussi di `/api/services-events` altrimenti terrebbero il server acceso).

**`lilos` dentro un servizio** (`apps/serviceApi.js`). Il codice gira in un isolato V8 senza DOM, senza `import`, senza `fetch` né `require`: ha solo `lilos` (congelato), `console`, `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`. Ogni richiesta passa dal kernel, che la controlla con i permessi dell'app e la esegue per il proprietario.

| Funzione | Descrizione |
| --- | --- |
| `lilos.app` | `{ id, version, entry, args, user }`: `user` è `{ id, username, name }`, o `null` per un servizio di sistema |
| `lilos.locale` | `{ code, i18n }` come nelle finestre ([`lilos.locale`](#liloslocale)), con le stringhe dell'app nella lingua dell'utente a cui appartiene il servizio (la chiave `locale`; `'en'` se non c'è) o in inglese per un servizio di sistema. **Fissate all'avvio**: non cambiano finché il servizio non riparte, e non c'è l'evento `locale`. Il file di traduzioni si rilegge dal pacchetto a ogni avvio, con l'hash del manifesto; se non si legge o non è valido, il servizio è in inglese e il kernel scrive un avviso nel proprio log |
| `lilos.handle(fn)` | `fn(data, from)` risponde alle chiamate: `from` è l'id dell'app che chiama o `null` (a differenza dei background, **`from` è direttamente l'id**, non un oggetto `{ from }`). Il valore restituito (JSON) torna a chi chiama. Senza `handle` le chiamate falliscono |
| `lilos.storage.get(chiave)` → valore o `null`; `lilos.storage.set(chiave, valore)` | Dati propri. Chiavi `[\w.-]{1,64}`, fino a 256 KB per valore. Per un utente: gli stessi dati delle finestre (lilOS li rilegge **solo al ricaricamento**). Per il sistema: un solo file di 1 MB |
| `lilos.files.read(percorso)` → testo; `write(percorso, testo)`; `list(percorso)` → `[{ name, type, size, modified }]`; `mkdir(percorso)` | Percorsi `~/…`, con `fs.read` o `fs.write` come per le finestre (testo fino a 10 milioni di caratteri; `list` nasconde i nomi che iniziano con un punto). **Solo per un servizio di un utente**: nel sistema falliscono con `forbidden`. Un file che un'app protegge (`content: true` nei suoi dati: un file cifrato) non si legge né si sovrascrive (`forbidden`). I file creati si vedono in lilOS dopo un ricaricamento |
| `lilos.home.load()` → `{ home, nodes, tags }` | (`services-isolate` 1.1.0) La home intera **come la vede la pagina di lilOS**: `nodes` con gli id di lilOS (non quelli del file system), senza la cartella `.config`; `tags` le definizioni dei tag; `home` il percorso. Per un servizio che lavora sull'albero come la pagina (la shell del Terminale quando la Pianificazione esegue un comando). Serve `fs.read:~` o `fs.write:~`. Solo per un servizio di un utente. |
| `lilos.home.sync({ put, remove })` | Cambiamenti dell'albero come li manda la pagina (`POST /api/fs/sync`: `put` nodi, `remove` id), in una transazione. Serve `fs.write:~`. Le pagine aperte dell'utente li vedono con `fs.external` (anche i nodi messi nel Cestino). |
| `lilos.home.read(id)` → `{ base64 }`, `lilos.home.write(id, { base64 } \| { text })` | Il contenuto di un file della home per id di lilOS (fino a 10 milioni di byte). `fs.read:~` / `fs.write:~`. Un file che un'app protegge (`content: true` nei suoi dati: un file cifrato) non si legge né si scrive: `forbidden`, perché le chiavi non sono mai nel kernel. |
| `lilos.net.fetch(url, { method, headers, body })` → `{ status, headers, body }` | Solo le origini dei permessi `net:`; metodi GET, HEAD, POST, PUT, PATCH, DELETE; non segue i reindirizzamenti; `cookie` e `host` si scartano; corpo e risposta di testo fino a 5 MB; 30 s |
| `lilos.apps.updates()` → `[{ id, name, version, latest, repo }]` | Le app installate che hanno una versione più nuova nel repository da cui vengono (`name` e `latest` dal catalogo, `version` è l'installata, `repo` il nome del repository o `''`). Serve il permesso `apps.manage`, altrimenti `forbidden`. Confronta gli indirizzi dei repository normalizzati; un catalogo che non si legge si riprova una volta, poi si salta (con un avviso nel registro del kernel). Può durare a lungo: non aspettarlo all'avvio |
| `lilos.ui.notify(testo \| { text, level, action })` | Una **notifica** per il proprietario: l'utente stesso, o tutti gli amministratori (`kernel.adminIds()`) per un servizio di sistema. Gli stessi campi e limiti di `lilos.ui.notify` delle finestre ([`window.lilos`](#windowlilos-bridgejs)), con il servizio come mittente. La notifica si **conserva** anche se lilOS è chiuso: si vede alla prossima apertura. Senza il servizio `notifications` resta il vecchio avviso (evento `notify`, solo il testo, fino a 200 caratteri), che arriva solo se lilOS è aperto. Una notifica non valida o oltre il limite fa rifiutare la chiamata |
| `console.log/info/debug/warn/error` | Vanno nel registro del servizio |
| `setTimeout`, `setInterval` | I timer li dà il processo ospite (fino a 1000; un intervallo non scende sotto 10 ms). Un errore in un timer finisce nel registro |

Un `lilos.app.call`, `keepAlive`, `connect`, `window`, `clipboard` o `apps.call` **non esistono** nei servizi. Le librerie del manifesto (`libraries`) non vengono caricate nei servizi, per ora: il codice deve avere tutto dentro.

```js
// kind: 'service', permessi: ["background", "net:https://api.esempio.it"]
export async function sync({ lilos, args }) {
  lilos.handle(async (data, from) => ({ ok: true, from }));
  const run = async () => {
    const res = await lilos.net.fetch('https://api.esempio.it/novita');
    await lilos.storage.set('ultima', res.body);
    if (res.status === 200) await lilos.ui.notify('Ci sono novità');
  };
  await run();
  setInterval(run, 60 * 60_000);
}
```

**Un servizio in un'app di sistema.** Nel repository dei plugin ufficiali un servizio sta in `src/<app>/services/<nome>.js`, un modulo **senza `import`** (gira nell'isolato del kernel, che non ne ha). `scripts/build.mjs` copia ogni `.js` di quella cartella in `apps/<id>/dist/`, così com'è e senza passare da Vite, e lo mette tra i `files` del manifesto. In `app.json` si dichiara con `"file": "dist/<nome>.js"`: l'app può avere `sdk` `"1"`.

**Un servizio con `import`.** Se il servizio ha bisogno di codice condiviso con le finestre dell'app, sta in `src/<app>/kernel/<nome>.js` (non in `services/`): `scripts/build.mjs` lo impacchetta con Vite, con ciò che importa, in un solo modulo senza `import` in `apps/<id>/dist/<nome>.js`. In quel modulo `@lilos/sdk` e `@lilos/system` sono sostituiti da `src/<app>/kernel/sdk.js` e `system.js` (ciò che l'app dà al codice condiviso quando gira nel kernel; `kfs.js` e questi due non diventano servizi). Esempio: il servizio `shell` del Terminale 1.5.0 (`src/terminal/kernel/shell.js`), che porta la shell e i suoi comandi nel kernel e lavora sulla home con `lilos.home` (`kfs.js`: un `fs` come quello dell'SDK, su `home.load/sync/read/write`; niente `Blob`, pipe, app o file protetti). Esempio reale, il servizio `updates` dell'AppStore (`src/appstore/services/updates.js`, permessi `apps.manage` e `background`):

```json
"entrypoints": { "updates": { "kind": "service", "file": "dist/updates.js", "label": "Aggiornamenti",
  "params": { "ore": { "type": "number", "label": "Controlla ogni (ore)", "min": 1, "max": 168, "default": 24 } } } }
```

Controlla all'avvio e poi ogni `ore` ore (predefinito 24) con `lilos.apps.updates()`, avvisa con `lilos.ui.notify` una volta per versione (ricorda le versioni già dette in `updates.told` nello storage) e risponde a `{ op: 'check' }` con un controllo subito; a ogni altra chiamata dà l'ultimo risultato `{ at, updates }`.

**Endpoint** (`api/services.js`, solo utenti con l'accesso fatto). Vedi anche [API HTTP](#api-http).

**Client in lilOS** (`services`, esportato da `@lilos/system`, file `src/apps/services.js`): un `Emitter` con l'evento `change` `{ app, entry }`.

| Membro | Cosa fa |
| --- | --- |
| `list()` | `GET /api/services` |
| `start(app, entry)`, `stop(...)`, `restart(...)` | Come `control`; poi emette `change` |
| `setStartup(app, entry, when, params?)` | Come `setStartup`; poi emette `change` |
| `setEnabled(on)` | Interruttore dei servizi dell'utente |
| `log(app, entry)` | Le righe del registro |
| `call(app, entry, data = null, from = null)` | Ciò che restituisce `lilos.handle` del servizio |

`connectServices()` (chiamata da `system.js`, solo con il kernel e se c'è `EventSource`) apre `/api/services-events`: gli eventi `change` diventano eventi di `services`, ogni `notify` (solo senza il servizio `notifications`) diventa una notifica di quell'app (`notifications.send({ app, text })`), e `notification.new` e `notification.change` portano `notifications.received(id)` e `notifications.changed()`. Alla riconnessione del flusso (il kernel riavviato, la rete caduta) rilegge le notifiche, perché possono essere arrivate nel frattempo. Lo chiude all'uscita dell'utente.

### `services-isolate_1.1.0`

Modulo del kernel che fornisce `runtime` (`modules/services-isolate_1.1.0/`; attivo in `config.json`). Dalla 1.1.0 ha `lilos.home` (vedi [`lilos` dentro un servizio](#servizi-delle-app-appsappservicesjs)); la 1.0.0 è la precedente. Configurazione: nessuna. Richiede Node da 22 a 25 (`isolated-vm` 6.2.0, con i binari già compilati); le sue dipendenze si installano con `npm run kernel:setup`.

- **Un processo Node per servizio** (`runner.js`), avviato con `--permission`: legge solo la cartella del modulo (`--allow-fs-read`), non può avviare programmi né worker; `--allow-addons` serve a `isolated-vm`. L'ambiente del processo è vuoto (solo `SystemRoot`).
- **Il codice dell'app** gira in un isolato V8 dentro quel processo, con **128 MB** di memoria e **10 secondi** per ogni esecuzione (avvio, ogni chiamata, ogni timer). Non ha `import` (un `import` fa fallire l'avvio), `require`, `process`, rete né file.
- Un'esecuzione oltre i 10 s, un errore all'avvio, la memoria esaurita o un crash fermano solo quel servizio: `host.exit(motivo)` e il gestore lo fa ripartire. Una chiamata senza risposta in 60 s fallisce.
- Fermare un servizio manda `stop` al processo e, dopo 2 s, lo termina. `stop()` del modulo termina tutti i processi.

Interfaccia `runtime`: vedi [Servizi (`services.js`)](#servizi-servicesjs).

### `notifications-basic_1.0.0`

Modulo del kernel che fornisce `notifications` (`modules/notifications-basic_1.0.0/`; attivo in `config.json`). Opzionale: senza, lilOS tiene le notifiche solo nella pagina ([D49](../interna/decisioni.md#d49-le-notifiche-un-modulo-opzionale-con-il-mittente-messo-da-lilos)). Interfaccia: vedi [Servizi (`services.js`)](#servizi-servicesjs).

| Configurazione | Predefinito | Significato |
| --- | --- | --- |
| `defaultKeep` | `20` | Quante notifiche conserva un utente che non ha scelto (1-200; fuori da questo intervallo vale 20) |
| `perMinute` | `10` | Quante notifiche può mandare a un utente la stessa app (o lilOS) in un minuto (almeno 1) |

- **Dati.** `notifications.json` nella cartella del modulo (`data` del `module.json`, quindi conservato alla rimozione): `{ version: 1, users: { <id utente>: { keep, items: [notifica] } } }`, `keep` `null` finché l'utente non sceglie, `items` dalla più nuova. Il file si scrive intero, con un file temporaneo e un rinomina, una modifica alla volta; alla lettura ogni notifica e ogni id si ricontrollano (il file si può modificare a mano) e quelle non valide si scartano.
- **Notifica.** `{ id, at, from, level, text, action, read }`. `id`: 12 caratteri casuali. `from`: `{ app, name }` (`app` `[a-z0-9][a-z0-9.-]{1,63}`, `name` fino a 80 caratteri) o `{ system: true }`. `level`: `info` (predefinito), `success`, `warning`, `error`. `text`: spazi ridotti a uno, al massimo **300** caratteri, non vuoto. `action`: `null` o `{ entry, args }` con `entry` `[a-z][a-zA-Z0-9]{0,30}` (`main` se manca) e `args` un valore JSON di al massimo 4096 caratteri.
- **Conservazione.** Una nuova va in cima; l'utente ne tiene al più `keep` (la sua scelta, o `defaultKeep`): le più vecchie si cancellano.
- **Limite.** `perMinute` notifiche al minuto per coppia utente-mittente (in memoria; si azzera al riavvio). Oltre: errore `rate_limited` con `retryAfter` (secondi) e messaggio «Troppe notifiche: al massimo N al minuto».
- **Eventi** per le pagine dell'utente, con `ctx.emit`: `notification.new` `{ id }` a ogni notifica nuova e `notification.change` `{}` quando se ne leggono o cancellano, o cambia `keep`. Arrivano sul flusso `GET /api/services-events`.
- **Chi.** Ogni metodo (tranne `send`) vale per un `principal` utente: le notifiche sono di chi le legge, e `KERNEL` riceve `forbidden`.

### `scheduler_1.0.0`

Modulo del kernel **obbligatorio** che fornisce `scheduler` (`modules/scheduler_1.0.0/`; `required: true` nel `module.json`, vedi [Moduli obbligatori](#moduli-obbligatori)). Tiene le operazioni, il loro orologio e lo storico; **non sa cosa fanno**: lo controlla il kernel prima di salvarle e lo fa quando il modulo chiama `host.run`. Interfaccia: vedi [Servizi (`services.js`)](#servizi-servicesjs). Funzioni del kernel e rotte: [Pianificazione](#pianificazione-schedule-apischedulejs).

| Configurazione | Predefinito | Intervallo | Significato |
| --- | --- | --- | --- |
| `maxTasksPerUser` | `100` | 1-1000 | Operazioni per utente |
| `minIntervalMinutes` | `1` | 1-1440 | Tempo minimo tra due volte; una regola più fitta è `invalid` |
| `maxParallel` | `4` | 1-32 | Corse insieme; le altre aspettano in coda |
| `historyPerTask` | `50` | 5-500 | Corse conservate per operazione (le in corso e in attesa non si tagliano) |
| `catchUpHours` | `12` | 1-168 | Entro quante ore una volta persa si recupera e una corsa nel browser aspetta |
| `outputKb` | `16` | 1-256 | Resoconto conservato per corsa |
| `maxParallelPerUser` | `2` | 1-32 | Corse insieme dello stesso proprietario (il sistema conta come uno); le altre aspettano. |
| `historyMb` | `64` | 1-1024 | Resoconti di tutto lo storico insieme: oltre, i più vecchi perdono il resoconto (la riga resta). |

Il `module.json` dichiara `settings` e `defaultConfig` per tutti gli otto campi, così `kernelModules.settings` / `saveSettings` li leggono e li cambiano; il Pannello di controllo non ha ancora una scheda per loro. Un valore fuori intervallo vale il predefinito. Altri limiti sono costanti del modulo: al massimo **200** corse in coda (oltre, la nuova è `skipped`, «Troppe operazioni in attesa di partire»); per le operazioni **fatte da un'app**, al massimo **20** per app e utente e una volta ogni **15 minuti** al più (o `minIntervalMinutes`, se è più alto); al massimo **50** orari spostati a mano (`extra`) per regola, a distanza di almeno `minIntervalMinutes` l'uno dall'altro.

- **Dati.** `scheduler.json` (`{ version: 1, tasks }`) e `history.json` (`{ version: 1, runs }`, la più nuova per prima) nella cartella del modulo (`data` del `module.json`: restano agli aggiornamenti e alla rimozione). Si scrivono interi, con un file temporaneo e un rinomina, una modifica alla volta; alla lettura tutto si ricontrolla. Lo storico si salva 2 secondi dopo l'ultima modifica.
- **L'orologio.** Un solo timer per la prossima volta (al massimo 30 secondi) e un controllo ogni 30 secondi sull'ora vera (il computer in sospensione, l'ora cambiata). Una volta che arriva con più di **2 minuti** di ritardo è *persa*: si recupera una sola volta (`reason: 'catchup'`) se `options.missed` è `'once'` e sono passate meno di `catchUpHours` ore, altrimenti si salta e basta. Più volte perse valgono una.
- **Cambiare le regole.** Se `when` cambia, il conto delle volte (`fired`) riparte; `move` con `'this'` lo mantiene. Una operazione riaccesa riparte da adesso.
- **Posti.** Una corsa parte se ci sono meno di `maxParallel` corse in tutto e meno di `maxParallelPerUser` dello stesso proprietario; altrimenti aspetta in coda. Una corsa che non risponde mai finisce comunque al limite di tempo o se annullata, e libera il posto.
- **Sovrapposizioni.** Se la corsa di prima è ancora in corso: `skip` registra una corsa `skipped` («La volta prima era ancora in corso»), `queue` la mette in coda finché l'altra finisce, `parallel` la fa partire. Le corse a mano non seguono questa scelta. Oltre `maxParallel` aspettano.
- **Tempo e tentativi.** Una corsa si ferma dopo `timeoutMin` minuti (`error`, «Tempo scaduto»). Se finisce in `error` e `attempt <= retries`, un nuovo tentativo (`reason: 'retry'`) parte dopo `retryMin` minuti, con lo stesso `due`.
- **Corse a mano.** `runNow` risponde `conflict` («È già in attesa di partire») se ne ha già una in coda.
- **Corse nel browser.** `resolve` vale solo per le corse di tipo `open` e `automation` (`conflict` per le altre).
- **All'avvio.** Le corse `running` o `queued` rimaste da un arresto diventano `error` («Il kernel si è fermato durante la corsa»). Quelle `waiting` scadono dopo `catchUpHours` ore dalla volta prevista (`skipped`, «lilOS non era aperto»).
- **Chi.** Un utente vede e cambia le sue operazioni; un amministratore quelle di tutti e del sistema; `KERNEL` tutto. `dropApp(id)` e `dropOwner(id)` tolgono le operazioni di un'app disinstallata e di un utente tolto.

### Moduli obbligatori

Alcuni moduli non si possono togliere: lilOS non parte senza. L'elenco è `REQUIRED_MODULES` in `modules.js` (nome → servizio che fornisce; oggi `{ scheduler: 'scheduler' }`).

- **Vengono con lilOS.** Sono in `system/kernel/modules/` del repository e di ogni release: `scripts/release.mjs` mette nella release la cartella con la versione più alta di ogni modulo obbligatorio, così com'è nel commit (solo ciò che git tiene, mai i dati); se manca, la release non si fa.
- **Il kernel li rimette.** Prima di avviare i moduli `ensureRequiredModules()` (`modulePackage.js`) confronta la copia di lilOS (`KERNEL_DIR/modules`: il repository, o la release in esecuzione) con `modules/`: se `modules/` non ha il modulo, o ne ha uno più vecchio, copia la versione di lilOS (senza `node_modules`, portando i file di `data` della versione precedente, che resta), esegue `npm ci` se c'è un `package.json` e ricarica la configurazione. Se la configurazione non lo elenca lo aggiunge acceso, con `defaultConfig`; se elenca una versione non installata, la porta all'ultima. Senza il modulo in nessuna delle due cartelle il kernel non parte.
- **Non si rimuovono.** `ModuleAdmin.remove` risponde `forbidden`; `list()` ha `required: true` e l'AppStore non offre **Rimuovi**. Un elenco di moduli che lascerebbe lilOS senza il servizio obbligatorio non supera il controllo di avvio (`conflict`), e all'avvio il kernel lancia un errore se nessun modulo lo fornisce. Si aggiornano come gli altri.
- **`module.json`.** `required?: boolean`. Un nuovo modulo obbligatorio si dichiara in `REQUIRED_MODULES`, si mette in `system/kernel/modules/` e ha `"required": true`.

---

### Protocolli di rete: `netfs-sftp_1.0.0`, `netfs-ftp_1.0.0`, `netfs-webdav_1.0.0`, `netfs-smb_1.0.1`

Quattro moduli, ciascuno con il suo `module.json` (`provides: ["netfs.<protocollo>"]`, `requires: []`, `defaultConfig: {}`, nessuna configurazione). Seguono il contratto di [Rete](#rete-connessioni-e-trasferimenti-net-apinetjs). Sono attivi nel `config.json` di sviluppo del repository; altrove un amministratore li aggiunge a `modules` (o li installa dall'AppStore, con il riavvio del kernel). Le dipendenze di `netfs-sftp` e `netfs-ftp` si installano con `npm run kernel:setup`.

| Modulo | Servizi | Campi | Note |
| --- | --- | --- | --- |
| `netfs-sftp` (ssh2 1.17.0) | `netfs.sftp` (ordine 30) | `host`, `port` (22), `user`, `auth` (`password` o `key`), `password`, `key` (file), `passphrase`, `path` (`/`) | Accesso con password (anche `keyboard-interactive`) o chiave privata. La chiave del server si confronta con l'impronta confermata (`SHA256:…`): la prima volta, o se cambia, `untrusted` con `kind: 'ssh'`. `path` è la radice della connessione. Riprende letture e scritture |
| `netfs-ftp` (basic-ftp 6.2.3) | `netfs.ftp` (ordine 10), `netfs.ftps` (ordine 20) | `host`, `port` (21), `tls` (solo FTPS: `explicit` o `implicit`), `user` (vuoto: anonimo), `password`, `path` (`/`) | FTPS esplicito (AUTH TLS) o implicito. Il certificato si controlla **prima** del login: valido per il server, oppure quello confermato (`kind: 'tls'`, impronta SHA-256); anche le connessioni dei dati devono mostrare lo stesso certificato. Dopo il login chiede `PBSZ 0` e `PROT P`: se il server rifiuta, la connessione è rifiutata (`unsupported`). I collegamenti simbolici hanno `link: true`. Un client per l'elenco e uno per ogni file, così si può elencare mentre un file passa. Senza utente entra come `anonymous`. La scrittura riprende; la lettura solo se il server lo permette |
| `netfs-webdav` (solo Node) | `netfs.webdav` (ordine 40) | `url`, `user`, `password` | Nextcloud, ownCloud, mod_dav e NAS, su HTTP o HTTPS. Il percorso dell'indirizzo è la radice. Accesso Basic o Digest (RFC 7616, MD5 o SHA-256). Con HTTPS non si manda nessuna richiesta (e nessuna password) su un certificato né valido né confermato. Niente aggiunta a un file: la scrittura non riprende (`resume.write: false`); la lettura sì (`Range`). Fino a 3 rimandi e 60 s senza dati; l'XML di `PROPFIND` ha al massimo 8 MB, 64 livelli e 500 000 elementi. `check(values)` rifiuta utente e password scritti nell'indirizzo |
| `netfs-smb` (smb3-client incluso) | `netfs.smb` (ordine 50) | `host`, `port` (445), `share`, `auth` (`password` o `guest`), `domain` (`WORKGROUP`), `user`, `password`, `unsigned` (casella), `path` (`/`) | SMB da 2.0.2 a 3.1.1, cifrato se il server lo offre. La firma è **richiesta** (le risposte non firmate si rifiutano), salvo per l'ospite o con il campo `unsigned` (casella «Consenti connessioni non firmate (solo vecchi NAS: meno sicuro)», solo con `auth: password`). Accesso NTLMv2 o ospite. Nei nomi e nei percorsi si rifiutano `\ : * ? " < > |` e i caratteri di controllo (`invalid`). **SMB1 (CIFS) non c'è**: è insicuro e Windows lo tiene spento. Ha `shares` (elenca le condivisioni con `srvsvc`) e `watch` (`CHANGE_NOTIFY`) |

La libreria di `netfs-smb` sta in `lib/smb3-client/`: è una copia compilata di [smb3-client](https://github.com/euricojardim/smb3-client) 0.2.0 (Eurico Jardim, licenza MIT) con sette correzioni di lilOS (invio del pattern a ogni `QUERY_DIRECTORY`, conteggio del credito iniziale di `NEGOTIATE`, `createReadStream`/`createWriteStream` con `start` e `size`/`mtime` nell'elenco, letture da 64 KiB con più richieste in volo, e il quinto: barre rovesciate rifiutate nei percorsi, una risposta malformata fa fallire la connessione invece di uscire dal gestore del socket, TCP keep-alive). L'elenco è in `lib/smb3-client/VENDORED.md`; le correzioni si propongono all'autore con pull request e la cartella sparisce quando saranno in una versione pubblicata. Vedi [D59](../interna/decisioni.md#d59-la-rete-i-protocolli-sono-moduli-del-kernel-e-i-trasferimenti-li-fa-il-kernel).

### Protocollo OneDrive: `netfs-onedrive_1.0.0`

Il OneDrive dell'utente (personale, o di lavoro o dell'istituto) in Rete, tramite Microsoft Graph. Sta nel repository ufficiale (`modules/netfs-onedrive/`, con il suo README), non nella cartella `modules/` di questo repository: un amministratore lo installa dall'AppStore → Kernel. Fornisce `netfs.onedrive` (ordine 60), non ha dipendenze e richiede lilOS 1.11.0 (accesso con un fornitore, `settings`, `link`, `putHome`). Motivi: [D60](../interna/decisioni.md#d60-onedrive-nella-rete-laccesso-con-la-finestra-del-fornitore-e-le-impostazioni-dei-moduli).

| Cosa | Come |
| --- | --- |
| Campi | `account` (`signin`, obbligatorio, pulsante «Accedi con Microsoft») e `root` (cartella di OneDrive da mostrare, facoltativa, `/` di serie) |
| Impostazioni (`settings`) | `clientId` (ID dell'app su Azure; senza, `ready()` dice di chiederlo a un amministratore), `accounts` (`common` predefinito, `organizations`, `consumers`, `tenant`), `tenant` (ID o dominio, con `accounts: 'tenant'`), `shared` (`false`: le cartelle condivise aperte tramite i loro collegamenti). Il modulo ascolta `ctx.onConfig`: valgono subito, e le connessioni aperte si chiudono |
| Accesso | Ogni installazione di lilOS ha la **sua app** registrata su Azure: client pubblico, piattaforma «Client pubblico/nativo (dispositivi mobili e desktop)», indirizzo di ritorno `<indirizzo di lilOS>/api/net/signin/callback`, nessun segreto. Autorizzazioni delegate `Files.ReadWrite`, `User.Read`, `offline_access`; con `shared` acceso `Files.ReadWrite.All` al posto di `Files.ReadWrite` (le connessioni già fatte chiedono un nuovo accesso). La richiesta usa `prompt=select_account` |
| Segreto | Il token di aggiornamento (`secret.account`). Microsoft lo cambia a ogni rinnovo e il driver lo passa al kernel con `saveSecret`. I token di accesso restano in memoria. Se Microsoft lo rifiuta (`invalid_grant`, `consent_required`…) l'errore è `auth` → `secret_required` con `reason: 'signin'` |
| File | Lettura con ripresa (`Range`, `resume.read`); scrittura sempre da capo (`resume.write: false`): fino a 4 MiB una richiesta sola, oltre una sessione di caricamento a pezzi da 10 MiB. Nomi: non ammette `" * : < > ? \ \|`, i nomi riservati (`con`, `nul`, `desktop.ini`, `_vti_*`…) né quelli che iniziano con `~$`. I blocchi appunti di OneNote non si leggono (`unsupported`) |
| Eliminare | `recycles: true`: va nel cestino di OneDrive. `removeTree` manda una cartella intera con una richiesta sola |
| Collegamenti | `links: { office: true }`, `link(path)`: la pagina su onedrive.com; per i documenti Office, Office per il web |
| Cartelle condivise | L'elenco «Condivisi con me» (`sharedWithMe`) è deprecato e Microsoft lo spegne a novembre 2026, senza sostituto ufficiale: il modulo non lo usa. Con `shared` acceso, i collegamenti che l'utente ha aggiunto a «I miei file» (onedrive.com → Aggiungi collegamento) compaiono come cartelle e se ne legge il contenuto sul drive a cui puntano; con `shared` spento i collegamenti non compaiono |
| Provarlo | `loginUrl` e `graphUrl` nella configurazione sostituiscono gli indirizzi di Microsoft (solo per i test) |

### Protocolli cloud e NFS: `netfs-gdrive`, `netfs-gphotos`, `netfs-s3`, `netfs-azblob`, `netfs-nfs` (1.0.0)

Cinque moduli del repository ufficiale (`modules/netfs-*/`, ognuno con il suo README), **solo nel catalogo**: non stanno nella cartella `modules/` di questo repository né nel `config.json` di un'installazione nuova; un amministratore li installa dall'AppStore → Kernel. Nessuna dipendenza (HTTP con `fetch` o `http`/`https` di Node; NFS su TCP con una libreria propria in `lib/`). Richiedono lilOS 1.14.0 (`group`, `space`, `importer`, elementi `web`/`badge`/`can`, accesso incollando l'indirizzo, impostazioni segrete, `user` in `connect`). Motivi: [D63](../interna/decisioni.md#d63-google-drive-google-foto-s3-azure-e-nfs-moduli-da-installare-accesso-incollando-lindirizzo-e-un-client-nfs-nostro).

| Modulo | Servizio, gruppo | Campi | Note |
| --- | --- | --- | --- |
| `netfs-gdrive` | `netfs.gdrive` (ordine 62, `cloud`) | `account` (`signin`), `share` (il Drive: vuoto o «Il mio Drive», oppure il nome di un Drive condiviso; `shares()` li elenca con l'accesso appena fatto), `root` | Drive API v3. Impostazioni: `clientId`, `clientSecret` (`password`, segreta), `clientType` (`web` \| `desktop`: con `desktop` `signIn.onlyManual()`), `shared` (cartella virtuale «Condivisi con me», `sharedWithMe = true`), `exportFormat` (`office` \| `odf` \| `pdf`). Ambito `…/auth/drive`, `access_type=offline`, `prompt=consent`. I nomi doppi di una cartella diventano unici per lilOS (`Nome (2).ext`, `badge`), `/` si mostra `／`; i percorsi tornano agli id rileggendo le cartelle (tenute 10 s). Documenti Google: `web` + `export` (`read` con `format` → `files.export`, 10 MB al massimo: oltre `unsupported`); Moduli, Siti, Mappe solo `web`. Scorciatoie seguite (`link: true` per quelle a cartelle). `recycles` (cestino di Drive), `removeTree` = una richiesta, `space` da `about.storageQuota`, `link` = `webViewLink`. Scrittura: caricamento a riprese a pezzi da 8 MB (`resume.write: false`); lettura con `Range`. Per i test `authUrl`, `tokenUrl`, `apiUrl` |
| `netfs-gphotos` | `netfs.gphotos` (ordine 64, `cloud`) | `account` (`signin`) | Picker API + Library API con i soli ambiti `appendonly` e `*.appcreateddata`. Impostazioni: `clientId`, `clientSecret`, `clientType`. `importer`: `start()` crea una sessione del Picker (`maxItemCount` 2000) e dà `pickerUri/autoclose`; `poll(id)` dice `pending` finché `mediaItemsSet` non è vero, poi legge gli elementi scelti e li espone come la cartella `/<data ora>` (non elencata in `/`), viva 55 minuti (gli indirizzi `baseUrl` durano 60). Cartelle = album creati dall'app (`mkdir` = nuovo album, `rename` di un album); file di un album: `can.rename: false`, `removeLabel` «Togli dall'album» (`batchRemoveMediaItems`); `removeText` del protocollo. Lettura con `baseUrl=d` (foto con EXIF) o `=dv` (video), con il token; il token va solo alle API di Google e a `*.googleusercontent.com` in https. Dimensioni sconosciute: `size: 0`. Per i test `pickerUrl`, `libraryUrl`, `authUrl`, `tokenUrl` |
| `netfs-s3` | `netfs.s3` (ordine 70, `cloud`) | `provider` (`aws`, `r2`, `b2`, `wasabi`, `minio`, `other`), `url` (minio, other), `account` (r2), `region`, `accessKey`, `secretKey` (segreto), `sessionToken` (segreto, aws e other), `share` (bucket, `shares()` = ListBuckets), `root`, `pathStyle` (other) | Firma SigV4 propria; corpi in streaming come `UNSIGNED-PAYLOAD`, XML firmati con il loro hash. Su AWS la regione si trova con una `HEAD` senza firma (`x-amz-bucket-region`). `ListObjectsV2` con delimitatore; cartella vuota = oggetto `nome/`. Fino a 16 MB un `PUT`, oltre multipart (parti da 16 MB, di più oltre 10 000 parti), `AbortMultipartUpload` se fallisce. `rename` = `CopyObject` (oltre 5 GB `UploadPartCopy`) + elimina, una cartella oggetto per oggetto; `removeTree` = `DeleteObjects` a gruppi di 1000. Classi `GLACIER` e `DEEP_ARCHIVE`: `badge` «archiviato», `InvalidObjectState` → `unsupported`. https con certificato proprio: conferma come WebDAV (`untrusted`) |
| `netfs-azblob` | `netfs.azblob` (ordine 75, `cloud`) | `account`, `auth` (`key`, `sas`, `entra`), `key` (segreto), `sas` (segreto), `entra` (`signin`), `share` (contenitore, `shares()`), `root`, `url` (indirizzo personalizzato: Azurite `http://host:porta/<account>`, cloud nazionali) | Shared Key firmata dal modulo; SAS aggiunto a ogni indirizzo; Entra: client pubblico (impostazioni `clientId`, `tenant`, predefinito `organizations`; per i test `loginUrl`), ambito `https://storage.azure.com/user_impersonation`, `signIn.manual`. `AuthorizationPermissionMismatch` con Entra → `denied` che nomina il ruolo «Collaboratore ai dati dei BLOB di archiviazione». Con `x-ms-is-hns-enabled` (Data Lake Gen2) `mkdir`, `rename`, `remove` e `removeTree` vanno all'endpoint `dfs`; senza, cartella vuota = blob vuoto con `hdi_isfolder=true`, `rename` = Copy Blob (atteso finché è `pending`) + elimina. Scrittura fino a 32 MB un `Put Blob`, oltre blocchi da 8 MB e `Put Block List`. Livello `Archive`: `badge` «archiviato» |
| `netfs-nfs` | `netfs.nfs` (ordine 80, `local`, `space`) | `host`, `version` (`3`; `4.1` con `disabled`), `share` (cartella esportata, `shares()` = MOUNT EXPORT), `auth` (`sys`; `krb5` con `disabled`), `port` | NFSv3 su TCP scritto nel modulo (`lib/xdr.js`, `lib/rpc.js` con record marking e AUTH_SYS, `lib/nfs3.js`: portmapper, MOUNT v3, NFS v3). Ogni lunghezza che arriva dal server è limitata (handle 64 byte, nomi 1024, record 8 MB, 100 000 voci, cookie che si ripetono fermano la lettura). Impostazione `identities` (`textarea`, una riga `utente = UID:GID[,gruppi]`): `connect` usa `user.username` per sceglierla; senza riga `denied`. `ready()` non è pronto finché non c'è nessuna riga. Prima una porta locale sotto 1024 (fino a 12 tentativi), poi una qualsiasi. `READDIRPLUS`, `READ`/`WRITE` per offset (`resume: { read: true, write: true }`: con `start > 0` il file si tronca a `start` e si continua), `WRITE UNSTABLE` + `COMMIT` con controllo del verificatore (riavvio del server → `lost`), `RENAME` rifiutato se la destinazione c'è, `space` da `FSSTAT`, collegamenti simbolici letti se puntano dentro l'esportazione. Per i test `portmapPort` |

### Protocolli di terminale: `term-ssh_1.0.1`, `term-telnet_1.0.0`, `term-rlogin_1.0.0`, `term-supdup_1.0.0`

Quattro moduli (`provides: ["term.<protocollo>"]`, `requires: []`, nessuna configurazione), ciascuno col suo `README.md`. Seguono il contratto di [Terminali remoti](#protocolli-il-servizio-termprotocollo). Sono attivi nel `config.json` di sviluppo; altrove un amministratore li installa dall'AppStore (scheda Kernel) o li aggiunge a `modules`. Solo `term-ssh` ha una dipendenza (`ssh2` 1.17.0): `npm run kernel:setup`. `term-ssh` 1.0.1 corregge un errore: se l'utente impiegava più di 20 secondi a confermare la chiave del server, il timer della connessione la chiudeva e la risposta in ritardo faceva lanciare un errore a ssh2 fuori dal processo del kernel, che si fermava. Ora il timer si ferma quando il server risponde e una risposta in ritardo è ignorata.

| Modulo | Servizio | Campi | Note |
| --- | --- | --- | --- |
| `term-ssh` (ssh2 1.17.0) | `term.ssh` (ordine 10, porta 22, `secure: true`) | `host`, `port`, `user`, `auth` (`password` o `key`), `password`, `key` (file), `passphrase`, `command` | Password (anche `keyboard-interactive`, per esempio un codice monouso) o chiave privata. Password e passphrase non salvate le chiede `ctx.ask` (tre tentativi). La chiave del server passa da `ctx.confirm`. `command` parte al posto della shell; `ctx.cwd` fa partire la shell in una cartella |
| `term-telnet` | `term.telnet` (ordine 20, porta 23, `secure` se `tls`) | `host`, `port`, `user`, `tls` | Opzioni RFC 854, 856, 858, 1073 (dimensione), 1091 (tipo di terminale) e 1572 (nome dell'utente). Segnali `break`, `interrupt`, `ayt`. Con `tls` (porta 992 di solito) il certificato non valido passa da `ctx.confirm` (`kind: 'tls'`) |
| `term-rlogin` | `term.rlogin` (ordine 30, porta 513, `secure: false`) | `host`, `port`, `user`, `localUser` | RFC 1282. La dimensione va al server dopo l'accesso e a ogni cambio (Node non vede i dati urgenti con cui il server la chiede). Cerca una porta locale privilegiata (512-1023): ci riesce su Windows o con il kernel eseguito come root |
| `term-supdup` | `term.supdup` (ordine 40, porta 95, `secure: false`) | `host`, `port` | Traduce i codici dello schermo di ITS (%TD) in sequenze xterm e i tasti in caratteri SUPDUP (RFC 734). La dimensione dello schermo si comunica solo all'inizio (il protocollo non ha un messaggio per cambiarla; al massimo 128 × 127). Niente grafica SUPDUP |

---

## Eventi del bus

| Evento | Payload | Emesso da | Gestito da |
| --- | --- | --- | --- |
| `app:launch` | `{ id, args, entry?, files?, auto? }` | `launch()`: menu di avvio, collegamenti sul desktop, `callEntrypoint`, avvio automatico. `auto`: `true` solo se l'avvio lo fa lilOS da sola (avvio automatico) e non l'utente; manca altrimenti. `taskbar/usage.js` conta come uso solo gli avvii senza `auto`. `entry`: un punto d'ingresso di tipo finestra (`'main'` se manca). `files`: id di file che l'utente consegna all'app (`[]` se manca); un'app installata può leggerli e scriverli | `connectLauncher` (`apps/launcher.js`) |
| `item:open` | nodo del file system | `Desktop.open()` per cartelle e file | `system.js`: le cartelle si aprono nel File Manager (`launch('files', { folder })`), i file con `openFile` |
| `system:ready` | `{ at }` (`Date.now()`) | `system.js`, una volta per pagina, quando le finestre salvate del primo workspace (`workspaces.ready`) e delle workarea aperte (`workareas.ready`) sono tornate | Chi vuole partire con il sistema. I servizi del kernel **non** passano da qui: il kernel ha i suoi momenti `system:ready` e `user:login` (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)), che non dipendono da una pagina aperta |
| `user:login` | `{ user, workspace }` (`kernel.data.user` o `null`; id del workspace attuale o `null`) | `system.js`, subito dopo `system:ready` | `connectStartup` (`apps/startup.js`): apre le app dell'avvio |
| `files:locked` | `[id]` (id di file) | `lilos.files.locked` (il ponte `methods.js`); `background.js` quando si ferma un punto d'ingresso in background con file suoi | `connectSystemEvents` (`apps/systemEvents.js`): per le finestre che mostrano quei file (`getState().file` o `.files`) chiama `win.closeFiles(ids)` se c'è, altrimenti chiede di chiuderle |
| `files:shown` | `{ ids, answer(id) }` | `lilos.files.shown` (il ponte `methods.js`) | `connectSystemEvents`: chiama `answer(id)` per ogni file di `ids` mostrato in una finestra (`getState().file` o `.files`) |

Quando aggiungi un evento, documentalo qui e nel commento in testa a `sdk/core/events.js`.

Gli eventi di `kernel` (`status`, `signedout`), `apps` (`change`), `registry` (`change`), `updates` (`change`) e `notifications` (`new`, `change`) non passano dal bus: sono degli `Emitter` di quei moduli.

---

## Dati salvati

Tutte le chiavi hanno il prefisso `lilos:`, che è quello di `localStorage`. Collegato al kernel (come fa il sistema) le chiavi non stanno nel browser: ogni chiave è un file JSON, senza prefisso, nella cartella `.config` dell'utente, nel database del kernel (`lilos:camera` è la chiave `camera`). Per questo `localStorage.clear()` non azzera nulla; per ripartire vedi [l'avvio](README.md#avvio). Lo stesso vale per `lilos:fs` e per il contenuto dei file, che con il kernel sono nodi della cartella dell'utente. Le sole cose che il sistema tiene nel browser sono la copia dei contenuti (IndexedDB `lilos:<id utente>`, cancellata all'uscita) e, finché non vengono portati nell'account, i dati di prima del kernel.

### `lilos:workspaces`

I workspace, con quello attuale:

```json
{
  "current": "m1x2a0k3f",
  "list": [
    { "id": "m1x2a0k3f", "name": "Principale", "description": "Il lavoro di ogni giorno", "color": "#3b6ef5", "created": 1793180000000,
      "desk": "m1x2a0k3g", "apps": ["editor", "esempio.note"], "known": ["files", "editor", "settings", "esempio.note"], "hidden": ["images"] },
    { "id": "m1x2d9e8c", "name": "Cliente Rossi", "color": "#30a46c", "created": 1793190000000, "removed": 1793200000000 }
  ]
}
```

| Campo | Significato |
| --- | --- |
| `id` | Identificativo; è anche il `workspace` dei nodi che ha creato. |
| `description` | Una riga su cosa serve il workspace (può essere vuota), sotto il nome nel menu di avvio. Al massimo 200 caratteri. Solo nei workspace vivi; manca nei dati salvati prima. |
| `desk` | Id della sua cartella Scrivania (privata). Solo nei workspace vivi. |
| `apps` | Id delle app **visibili** nel workspace (le installate in lilOS e non nascoste). Le app `system` (File Manager, Pannello di controllo) sono sempre visibili e non serve elencarle. Una nuova voce senza `apps` le ha tutte. |
| `known` | Id delle app che lilOS aveva all'ultimo salvataggio. Alla lettura, le app del registro che non ci sono vengono aggiunte ad `apps`: un'app nuova arriva visibile, una nascosta dall'utente resta nascosta. Senza `known` (dati di prima) si considerano note tutte le app del registro. |
| `hidden` | Chiavi degli [elementi fissi](#desktopfixeditemsjs) spenti sulla sua scrivania, o `null`: valgono quelli dell'impostazione `deskHidden` (i workspace nuovi, e quelli salvati prima di questo campo). Si riempie alla prima scelta per quel workspace o in Tutti. |
| `removed` | Data di eliminazione. Una voce "rimossa" non ha `desk` né `apps`: resta solo perché i file creati da quel workspace dicano ancora di chi erano (File Manager mostra «Nome (eliminato)»). |

Controllo alla lettura, perché il dato non è affidabile: `list` deve essere un elenco (si leggono al massimo 120 voci); `id` di 1-40 caratteri tra lettere, cifre, `_` e `-`, senza duplicati; `name` ripulito (spazi, al massimo 40 caratteri), «Workspace» se vuoto; `description` ripulita come il nome ma fino a 200 caratteri, `''` se manca; `color` esadecimale `#rrggbb`, altrimenti il primo accento; `created` numero finito, altrimenti l'ora della lettura; una voce viva senza `desk` è scartata; `apps` tiene solo id del registro, più quelli che `known` non conteneva; `known` è riscritto con gli id del registro attuale; `hidden` tiene solo testi come gli `id` (al massimo 50), `null` se non è un elenco; al massimo 20 workspace vivi e 100 rimossi (gli ultimi). Se `current` non è un workspace vivo, `setupWorkspaces` sceglie il primo.

### `lilos:ws:<id>:…`

Ogni workspace tiene a parte, sotto `lilos:ws:<id>:` seguito da:

| Parte | Contenuto | Formato |
| --- | --- | --- |
| `camera` | la sua vista | come [`lilos:camera`](#liloscamera) |
| `desktop-layout` | posizioni sulla sua scrivania | come [`lilos:desktop-layout`](#lilosdesktop-layout) |
| `workareas` | le sue workarea | come [`lilos:workareas`](#lilosworkareas) |
| `windows` | le finestre delle app aperte fuori da ogni workarea, da riaprire | elenco di finestre salvate, come `windows` di una workarea; al massimo 30 |
| `launcher` | preferite e storia d'uso del menu di avvio | `{ pinned, apps, files }`: vedi [`usage`](#usage-taskbarusagejs) |

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
  { "id": "m1x2a0l9q", "type": "app", "name": "Editor", "parent": "m1x2a0k3f", "created": 1793180000000, "modified": 1793180000000, "app": "editor" }
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

Impostazioni dell'Editor (motori di evidenziazione, grammatiche aggiunte, language server esterni, schemi JSON): le scrive e le valida l'app Editor (`lang/config.js`, nel repository ufficiale). Contengono anche la sezione `tabs: { reopen }` (`true` di partenza: l'Editor tiene da parte schede e bozze alla chiusura). Il sistema non le legge.

### `lilos:editor-tabs`

Schede dell'Editor (scritte da `sessions.js` nell'app Editor): `{ "sessions": { "<id>": { "used": ms, "active": chiave, "tabs": [ … ] } } }`. Una sessione per finestra; quella delle finestre chiuse dall'utente ha id `closed`. Ogni scheda ha una chiave; le sessioni non riaperte da 90 giorni sono cancellate con le loro bozze.

### `lilos:editor-draft:<chiave scheda>`

Testo non salvato di una scheda: `{ "text", "base", "time" }` (`base` è il contenuto del file da cui si è partiti, per accorgersi che è cambiato). Scritta circa 1 s dopo l'ultima modifica. Non c'è per i file il cui contenuto è di un'app (FileCrypt) né oltre circa 2 milioni di caratteri.

### `lilos:editor-tree`

Pannello della cartella dell'Editor (scritto dall'app Editor, `FileTree.js`): `{ "root": id | null, "expanded": [id…], "width": px }`. Alla lettura la radice vale solo se è ancora una cartella, gli id non stringa sono scartati, la larghezza è riportata tra i limiti.

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

Vista del File Manager: `"list"`, `"grid"` (icone) o `"thumbs"` (anteprime; File Manager 1.7.0). Un altro valore vale `"list"`.

### `lilos:files-panels`

Pannelli a destra del File Manager (`src/files/SidePanel.js` nel repository ufficiale): `{ info: { open, width }, preview: { open, width } }`. `width` è in pixel, tra 180 e 720; i valori predefiniti sono Informazioni aperto a 260 px e Anteprima chiusa a 300 px. Scritta a ogni apertura, chiusura o cambio di larghezza.

### `lilos:files-sidebar`

L'ordine della sezione «Collegamenti» della barra laterale del File Manager: array di chiavi, uguale in tutti i workspace (`src/items/links.js`):

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

Un nodo può avere anche `"apps": { "<id app>": { … } }`: i dati delle app su quel nodo (al massimo 8 app, 1 KB di JSON ciascuna e 2 KB in tutto; le voci non valide si scartano alla lettura). Il campo viaggia con il nodo verso il kernel (`/api/fs/sync`).

### `lilos:onedrive`

Le scelte dell'utente per OneDrive (Pannello di controllo 1.14.0 le scrive, File Manager 1.11.0 le legge; vedi [`netfs-onedrive`](#protocollo-onedrive-netfs-onedrive_100)):

```json
{ "mount": "3f9a1c0b7d2e4a68", "folder": "/lilOS", "ifExists": "ask", "doubleClick": true }
```

| Campo | Significato |
| --- | --- |
| `mount` | Id della connessione OneDrive dove va «Carica su OneDrive e apri», o `null`: la sola connessione OneDrive se ce n'è una, altrimenti si sceglie da un menu. Se non corrisponde a una connessione OneDrive è come `null` |
| `folder` | Cartella su OneDrive (creata se manca). Predefinito `"/lilOS"`; vuota, torna al predefinito |
| `ifExists` | Con un file dello stesso nome: `"ask"` (predefinito), `"keep"` o `"replace"` |
| `doubleClick` | `true` (predefinito): il doppio clic su un documento Office di OneDrive lo apre in Office per il web, a meno che un'app di lilOS sia scelta per quel tipo |

### `lilos:settings`

Oggetto con le impostazioni (vedi `settings` e `systemSettings.js`):

```json
{ "accent": "#30a46c", "motion": true, "snap": true, "minimap": true, "deleteConfirm": true, "deletePermanent": false, "trashRetention": 30 }
```

Le chiavi non dichiarate e i valori di tipo diverso dal predefinito vengono ignorati.

### `locale`

La lingua del sistema scelta dall'utente, già risolta (`'it-IT'`; mai `'auto'`). La scrive l'SDK (`locale`, a ogni avvio e a ogni cambio) e la legge il **kernel**, che con essa decide la lingua dei servizi dell'utente (`apps/appServices.js`, `readUserKey(…, 'locale', 'en')`); un valore che non è un testo vale `'en'`. Come le altre chiavi è `lilos:locale` nel browser, o il file `locale` nella `.config` dell'utente. La scelta dell'utente è l'impostazione `language` (`'auto'` o un tag), dentro [`lilos:settings`](#lilossettings).

### `notifications-keep`

Quante notifiche conservare (un intero da 1 a 200; predefinito 20). La scrive e la legge l'SDK (`notifications.setKeep`, `notifications.load`) **solo quando le notifiche non le tiene il kernel**: con il modulo `notifications-basic` il numero sta nel suo `notifications.json` (vedi [`notifications-basic`](#notifications-basic_100)), per utente, e questa chiave non si usa. Un valore che non è un intero da 1 a 200 conta come 20. Le notifiche stesse, in quel caso, non si salvano: vivono nella pagina.

### `startup-apps`

Le app che si aprono da sole, per utente, nell'ordine in cui si aprono (vedi [apps/startup.js](#appsstartupjs)). Come le altre chiavi è `lilos:startup-apps` nel browser, o il file `startup-apps` nella `.config` dell'utente:

```json
[
  { "app": "files", "entries": [ { "entry": "main", "params": { "folder": "m1x2a0k3h" } } ] },
  { "app": "esempio.note", "entries": [ { "entry": "main", "params": {} }, { "entry": "today", "params": { "view": "week" } } ] }
]
```

Validato alla lettura: al massimo 50 app, senza duplicati, ciascuna con al massimo 20 punti d'ingresso (nome come nel manifesto, senza duplicati) e `params` un oggetto (altrimenti `{}`); un'app senza punti d'ingresso validi si scarta. Un `file` o `folder` è l'id di un nodo.

Se cambi la forma di questi dati, prevedi una migrazione dei dati già salvati oppure cambia nome alla chiave.

### `startup-services`

I servizi delle app che partono da soli all'ingresso dell'utente, e se partono (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)). A differenza delle altre chiavi la scrive e la legge **il kernel**: è il file `startup-services` nella `.config` dell'utente (`readUserKey` e `writeUserKey` di `api/home.js`, JSON fino a 512 KB). lilOS la usa solo tramite `/api/services`.

```json
{ "enabled": true, "services": [ { "app": "appstore", "entry": "updates", "params": { "ogniOre": 6 } } ] }
```

`enabled` vale `true` se manca. Si controlla a ogni lettura: al massimo 100 servizi, `app` e `entry` nella forma del manifesto, senza duplicati, `params` un oggetto (altrimenti `{}`). I servizi **scelti per tutti** non sono qui: stanno nel nodo `/system/app/.startup` (`meta.startup.services`, stessa forma di `services`). I dati dei servizi di sistema stanno in `app:<id>/~data` (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)).

### `pipes-order`

L'ordine che l'utente ha scelto per i gestori delle pipe (Pannello di controllo → App → Pipe), dentro ogni fascia. Oggetto `{ "<evento>/<fase>": [chiave, …] }`, con al massimo 100 chiavi per elenco. Come le altre chiavi è `lilos:pipes-order` nel browser, o il file `pipes-order` nella `.config` dell'utente. La chiave di un gestore è quella di `pipes.chain()`: `<app>#<punto d'ingresso>` per le iscrizioni del manifesto (`filecrypt#vault`), `<app>#<punto d'ingresso>:<evento>/<fase>` per quelle fatte dal codice. Un gestore che non è nell'elenco va dopo quelli elencati, in ordine di arrivo.

```json
{ "file.write/before": ["filecrypt#vault"] }
```
