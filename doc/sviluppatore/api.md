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
- [desktop/fixedItems.js](#desktopfixeditemsjs)
- [items/](#items)
- [workareas/](#workareas)
- [workspaces/](#workspaces)
- [systemFs.js](#systemfsjs)
- [App di sistema](#app-di-sistema)
- [systemApi.js (`@lilos/system`)](#systemapijs-lilossystem)
- [apps/open.js e apps/openWith.js](#appsopenjs-e-appsopenwithjs)
- [apps/commands.js](#appscommandsjs)
- [apps/registry.js e apps/launcher.js](#appsregistryjs-e-appslauncherjs)
- [apps/startup.js](#appsstartupjs)
- [apps/packages/](#appspackages)
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

Ogni app ha **un file di traduzioni** (`locales.json`, indicato da `locales` nel [manifesto](#manifesto-lilosjson)). La lingua è una sola per tutto il sistema, scelta in Sistema → Lingua. lilOS legge il file prima di avviare l'app e le dà le stringhe già risolte in `lilos.locale`: l'app non carica nulla e `t()` è sincrono. I testi dell'interfaccia di lilOS stesso non sono ancora tradotti (restano in italiano): si traducono solo le app.

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
| `@entrypoints.<nome>.label` | `entrypoints.<nome>.label` |
| `@entrypoints.<nome>.params.<param>.label` | `label` di un parametro |
| `@entrypoints.<nome>.params.<param>.description` | `description` di un parametro |
| `@entrypoints.<nome>.params.<param>.options.<valore>.label` | `label` di un'opzione di un parametro `choice` |

Ciò che non ha la chiave resta come dice il manifesto. Le chiavi `@` sono stringhe come le altre (stanno anche in `lilos.locale`), ma servono a lilOS.

### `locale` (SDK)

Esportato da `@lilos/sdk` insieme a `LANGUAGES`. È un `Emitter`.

| Membro | Descrizione |
| --- | --- |
| `LANGUAGES` | `['en-US', 'en-GB', 'it-IT', 'de-DE', 'es-ES', 'fr-FR', 'pt-BR']`: le lingue che Sistema → Lingua propone oltre ad «Automatica». Un'app che non ha la lingua scelta ricade su `en`. |
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

`registerPackages()` legge i file prima di mettere le app nel registro ([packages.js](#packagesjs)). La voce di ogni app nel registro ha `name` e `text` (il manifesto tradotto) come getter che seguono la lingua, e `commands` con le etichette tradotte. Li usano il titolo delle finestre, i comandi in Sistema → Scorciatoie (che si ripubblicano al cambio di lingua), le etichette dei punti d'ingresso e dei loro parametri (`entrypointsOf`, Sistema → Avvio), le proprietà dell'app e il nome del collegamento che l'operazione `desktopItem` mette sulla scrivania. I nomi di cartelle e file già creati non cambiano. Il catalogo di un repository porta, per ogni app, `locales`: la sua tabella con le sole chiavi `@`, così l'AppStore può mostrare nome e descrizione con `locale.manifest(manifesto, locales)`.

---

## sdk/core/kernel.js

Il client del kernel (il backend, vedi [Il kernel](#il-kernel)). Si importa da `@lilos/sdk` o, senza caricare il resto dell'SDK (lo fa l'avvio, `src/boot/`), da `@lilos/sdk/kernel`.

```js
import { kernel, KernelError } from '@lilos/sdk';
```

### `class KernelError extends Error`

`{ status, code, message }`. `status` è lo stato HTTP (`0` se il kernel non risponde); `code` è il codice del kernel (`invalid`, `unauthorized`, `invalid_credentials`, `forbidden`, `not_found`, `conflict`, `too_large`, `rate_limited`, `unavailable`, `internal`) oppure `'offline'` quando manca la risposta. `message` è in italiano e si può mostrare all'utente.

### `kernel`

`Emitter`. Il sistema lo collega prima di avviarsi (`src/boot/boot.js`): dopo `connect()` `storage`, `fs` e `contents` lavorano con il kernel.

| Membro | Descrizione |
| --- | --- |
| `connected` | `true` quando `connect()` ha caricato i dati dell'utente. |
| `mode` | `'multi'` (gli utenti accedono) o `'single'` (un utente, senza accesso); `null` prima di `session()`. |
| `user` | `{ id, username, name, role }` dell'utente collegato, o `null`. |
| `data` | Ciò che `GET /api/boot` ha restituito: `{ user, home, fresh, nodes, storage, apps, appSecurity }`. Lo leggono `storage`, `fs` e `apps` appena vengono caricati. |
| `request(method, path, body?, { text = false, blob = false, keepalive = false })` | Una richiesta a `/api<path>`, con il cookie e l'intestazione `X-Lilos: 1`. `body` oggetto = JSON, stringa = testo, `Blob` / `ArrayBuffer` / array tipizzato = byte (`application/octet-stream`). Restituisce il JSON della risposta (il testo con `text: true`, un `Blob` con `blob: true`, `undefined` per 204). Lancia `KernelError`. Una risposta 401 con l'utente connesso, in modalità `multi`, emette anche `signedout`. |
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

Le app installate in lilOS (pacchetti in `/system/app`, per tutti gli utenti e i workspace; File Manager, Editor, Sistema e AppStore comprese). Non va confuso con `apps` di `src/apps/registry.js` (le app che lilOS sa avviare, che sono le stesse con il loro stato di avvio). L'elenco arriva con `kernel.connect()`.

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
| `catalog(id)` | Cosa offre il repository alla sua ultima versione: `{ repo, name, ref, commit, apps: [{ path, manifest, locales, readme } \| { path, error }], modules: [{ path, module, readme } \| { path, error }] }` (utenti). `readme` è il testo di `README.md` nella cartella del pacchetto (Markdown) oppure `null`; oltre 64 KB è tagliato alla fine di una riga e la voce ha `readmeTruncated: true`. `locales` (solo nelle app) è la tabella delle traduzioni dell'app con le sole chiavi `@` (i testi del manifesto), oppure `null` se l'app non ne ha o il file non è valido: `locale.manifest(manifest, locales)` mostra il manifesto nella lingua dell'utente. Per installare: `apps.install({ type: 'git', url: repo.url, path, ref })`. |
| `readme(id, path)` | Il `README.md` completo di un pacchetto del catalogo (`path` come lo elenca il catalogo), come testo (utenti). |

### `kernelModules`

I moduli del kernel come pacchetti (solo amministratori). Girano nel kernel con accesso completo: ogni modifica vale dal **riavvio**. Vedi [Moduli come pacchetti](#moduli-come-pacchetti-modulepackagejs).

| Metodo | Descrizione |
| --- | --- |
| `list()` | `[{ name, version, description, icon, provides, requires, enabled, running, versions, source }]`. `icon`: `{ glyph, color }` del `module.json`, o `null`. `enabled`: la versione attiva nella configurazione (`null` se spento); `running`: quella in uso adesso; se differiscono serve un riavvio. |
| `install(source, { allowUnsigned = false })` | Installa e accende il modulo → `{ name, version, restartRequired: true }`. Un modulo non ufficiale richiede `allowUnsigned: true`. |
| `update(name, { ref, allowUnsigned = false })` | Aggiorna dall'origine registrata → `{ name, version, previous, restartRequired }`, oppure `{ name, version, unchanged: true }`. |
| `remove(name)` | Spegne il modulo e cancella le sue cartelle, tranne quelle che contengono i suoi dati → `{ name, kept, restartRequired }` (`kept`: cartelle conservate). |
| `restart()` | Chiede al kernel di riavviarsi (`POST /api/kernel/restart`). Funziona solo se il kernel è stato avviato con `npm run kernel`; altrimenti lancia `unavailable`. Durante il riavvio (qualche secondo) le richieste falliscono: i salvataggi in attesa si ripetono da soli. |

Esempio, in sviluppo, per installare l'app di esempio:

```js
await apps.install({ type: 'local', dir: 'C:/percorso/di/lilos/examples/apps/note' }, {
  grant: ['fs.write:~/Documenti/Note', 'ui.shortcuts', 'desktop.items'], allowUnsigned: true,
});
```

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

Registro delle scorciatoie da tastiera. Ogni componente registra i propri comandi con le combinazioni predefinite; l'utente le cambia da Sistema → Usabilità → Scorciatoie. Un solo listener `keydown` su `window` (in fase di bolla) esegue il comando corrispondente.

**Combinazioni**: stringhe canoniche con i modificatori nell'ordine Ctrl, Alt, Shift e poi il tasto, separati da `+`: `'Ctrl+K'`, `'Shift+1'`, `'Ctrl+Alt+N'`, `'F2'`, `'Delete'`.

- Cmd su Mac vale come Ctrl.
- Lettere maiuscole (`A`–`Z`, secondo il layout; con Alt o layout non latini conta la posizione del tasto). Cifre della riga superiore per posizione (`Shift+1` funziona con ogni layout), cifre del tastierino per valore.
- Tasti con nome: `Enter`, `Escape`, `Delete`, `Backspace`, `Tab`, `Space`, `Insert`, `Home`, `End`, `PageUp`, `PageDown`, `ArrowUp`/`Down`/`Left`/`Right`, `F1`–`F24`.
- Simboli con nome: `Plus`, `Minus`, `Equal`, `Comma`, `Period`, `Slash`, `Backslash`, `Semicolon`, `Quote`, `Backquote`, `BracketLeft`, `BracketRight`. Per i simboli Shift non conta, perché su molte tastiere serve a produrre il carattere (`+` è Shift + `=`): Ctrl e `+` è sempre `'Ctrl+Plus'`.

| Metodo | Descrizione |
| --- | --- |
| `register({ id, label, group, keys, run, when?, whenEditing?, repeat? })` | Registra un comando; restituisce la funzione per toglierlo. `id` stabile (`'desk.fit'`), `label` e `group` per Sistema, `keys` predefinite, `run(event)` l'azione. `when()`: il comando è attivo solo se restituisce `true`. `whenEditing`: funziona anche mentre si scrive in un campo (richiede Ctrl o Alt). `repeat`: si ripete tenendo premuto. Lancia un errore se l'`id` esiste già. |
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

File system virtuale: un albero di cartelle, file e collegamenti alle app, tenuto per intero in memoria. **Collegato al kernel** (sempre, nel sistema) è la cartella dell'utente: l'albero si carica all'avvio e ogni modifica è mandata al kernel 300 ms dopo l'ultima, solo per i nodi cambiati (`POST /api/fs/sync`, vedi [Il kernel](#il-kernel)); il contenuto dei file (testo) si legge e scrive dal kernel in modo asincrono, e prima di farlo `read` e `write` mandano ciò che è in attesa (un file appena creato deve esistere là). **Non collegato** (l'SDK da solo) l'albero è salvato in `lilos:fs` e il contenuto in IndexedDB.

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
| `create(parentId, { type, name, color?, app?, size?, system?, id?, workspace?, private? })` | Crea e restituisce il nodo (`id` facoltativo, per le migrazioni). `workspace` è il proprietario: predefinito il workspace attuale (`fs.workspace`); le cartelle di sistema condivise (`system` senza `private`) non hanno proprietario. `private: true` solo per una cartella con un proprietario. Lancia un errore se la cartella non esiste, il tipo non è valido o `workspace` non è un id valido. |
| `rename(id, name)` | Rinomina e restituisce il nome finale. |
| `update(id, { color })` | Cambia i metadati che non sono il nome. |
| `read(id)` | `Promise<string>`: il contenuto del file come testo (`''` se non ne ha). |
| `readBlob(id, { type? })` | `Promise<Blob>`: il contenuto del file come byte (vuoto se non ne ha), per le immagini e gli altri file binari. Il tipo del `Blob` viene dall'estensione (`'image/png'` per un `.png`, `'image/svg+xml'` per un `.svg`…), oppure è `type`. |
| `write(id, data)` | `Promise`: salva il contenuto, testo (una stringa) o byte (`Blob`, `ArrayBuffer` o array tipizzato), aggiorna `size` (in byte) e `modified` ed emette `change` di tipo `update`. I byte arrivano al kernel così come sono (`PUT /api/fs/content/:id`) e tornano uguali con `readBlob` (`GET /api/fs/content/:id?raw=1`). |
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
| `snapshot(ids)` | `Promise<{ nodes, contents }>`: copia i nodi (e, per le cartelle, tutto quello che contengono) con il contenuto dei file, come byte (testo e immagini tornano identici). Gli id che non esistono o sono ripetuti si saltano. Va preso **prima** di `remove`. |
| `restore(snapshot)` | `Promise<string[]>`: rimette quello che `snapshot` ha copiato, con gli stessi id, gli stessi metadati e lo stesso contenuto. Il nome diventa unico se nel frattempo è stato preso. Si saltano i nodi la cui cartella non c'è più (o non è visibile) e gli id che esistono di nuovo. Emette un `change` di tipo `create` per ogni nodo rimesso; restituisce gli id rimessi (`[]` se non ha potuto rimettere nulla). |

`rename`, `move` e `remove` lanciano un errore sui nodi di sistema e sulla radice.

`reset()` → `Promise`: elimina **ogni** nodo (di sistema, nel cestino, con il loro contenuto), senza eventi, e aspetta che il kernel l'abbia saputo (senza kernel toglie `lilos:fs`). Lo usa il ripristino «Scrivania e file iniziali» di Sistema, che poi cancella le altre chiavi e ricarica lilOS: dopo `reset()` il sistema non è in uno stato utilizzabile senza ricaricare.

Evento `trash` (senza dati): è cambiato ciò che il cestino contiene (`trash`, `untrash`, `purge`, `purgeTrash`, `unscopeTrash`). Chi mostra il cestino rilegge `trashed()`.

Evento `scope`: `id` del workspace attuale (o `null`). Significa "cambia ciò che è visibile": un altro workspace (`setWorkspace`) o i tag nascosti (`setHiddenTags`, stesso id di prima). Le viste leggono di nuovo l'albero.

Evento `change`: `{ type: 'create' | 'rename' | 'update' | 'move' | 'remove', node, parent, from?, ids? }`. Per `remove`, `ids` sono tutti i nodi eliminati, contenuto compreso (con `trashed: true` sono finiti nel cestino, non eliminati); per `move`, `from` è la cartella di prima e `ids` il sottoalbero spostato (chi tiene aperto un file controlla `e.ids.includes(id)`: il suo percorso è cambiato).

Collegati al kernel, i contenuti stanno nel database del kernel (con il nodo, e spariscono con lui); IndexedDB `lilos:<id utente>` (archivio `contents`, chiave l'`id` del file) ne tiene una copia: ciò che si è letto o scritto, usato solo per leggere quando il kernel non risponde (`offline`), e cancellato quando l'utente esce. Non collegati, stanno nel database IndexedDB `lilos`, archivio `contents`; se IndexedDB non è disponibile (alcune modalità private) restano in memoria fino alla ricarica, e qualche secondo dopo l'avvio si eliminano i contenuti dei nodi che non esistono più.

Alla lettura da `lilos:fs` vengono tenuti solo i nodi ben formati raggiungibili dalla radice: tipi sconosciuti, nomi non validi, nodi orfani, cicli e nomi duplicati nella stessa cartella vengono scartati (tranne tra cartelle private di workspace diversi). `workspace` è tenuto solo se è un id valido e `private` solo per cartelle con un proprietario. `tags` è tenuto solo sui nodi che non sono di sistema, ripulito come in `setTags` (id validi, senza doppioni, al massimo 30); `setTags` non controlla che i tag esistano, ma i tag che non esistono più non si vedono da nessuna parte. Si parte da due radici (`root` e `trash`): i figli diretti del cestino senza un `trashed` valido (`at` numero, `from` testo) si scartano, e lì i nomi possono ripetersi. `ownedCount` non conta i nodi nel cestino.

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

`new Desktop(canvas, folderId, layoutKey = 'desktop-layout')`: la scrivania come vista della cartella `folderId` del file system (la Scrivania del workspace attuale). Un `DesktopItem` per ogni nodo; posizioni da `lilos:<layoutKey>` (il sistema passa `ws:<id>:desktop-layout`), oppure il primo posto libero in colonna. Segue gli eventi `change` di `fs`, quindi mostra anche le modifiche fatte altrove (File Manager). In più monta gli **elementi fissi** accesi ([desktop/fixedItems.js](#desktopfixeditemsjs)): prima gli elementi con una posizione salvata, poi i fissi, poi gli altri, così chi non ha posizione prende i posti liberi. Ogni elemento fisso ha `item.fixed` (la voce di `FIXED_ITEMS`), non è un nodo del file system e si salva sotto `fixed:<key>`; la posizione resta salvata anche mentre è spento. Al cambio dell'impostazione `deskHidden` toglie i fissi spenti e monta quelli riaccesi.

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
| `remove(items)` | Elimina con `confirmRemove` (nel cestino, annullabile con `history`): chiede conferma se `deleteConfirm` è attivo. Le icone di workarea passano da `workareas.confirmRemove` (chiede sempre; il contenuto resta sulla scrivania). Con file e workarea insieme un solo menu chiede per tutto. Gli elementi fissi vengono scartati: se resta solo quelli, mostra un `toast` («… è un elemento fisso della scrivania: non si può eliminare») e non fa altro. |
| `arrange()` | Ordina (elementi fissi nell'ordine di `FIXED_ITEMS`, poi cartelle, file, app, poi per nome) e dispone in colonne. Con una workarea attuale, solo i suoi elementi e dentro la sua area (sotto la barra del titolo). Altrimenti gli elementi fuori da ogni workarea, nella parte visibile, saltando i posti coperti dalle aree. |
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

Il canvas è una `dropZone` (`folder: () => this.folder`, nessun evidenziamento): nodi rilasciati da un'altra vista vanno nella cartella della scrivania e si dispongono in colonne (`ROWS`) dal punto di rilascio, allineato alla griglia. Il menu di un elemento ha **Aggiungi ai collegamenti** (`linkEntry`). Gli elementi fissi non entrano mai tra gli `ids` trascinati nei nodi, e il loro menu (da soli) ha solo **Apri**, **Togli dalla scrivania** (`setFixedShown(key, false)`, con un `toast` che dice dove rimetterlo) ed **Elementi fissi della scrivania…** (apre `launch('settings', { tab: 'desk' })`); in una selezione mista il menu omette tag e collegamenti per loro e **Elimina** agisce sugli altri (disabilitato se sono tutti fissi).

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
| `setData({ name, color, tags })` | Aggiorna nome, colore, tag, etichetta e icona (l'estensione può cambiare l'icona; i pallini dei tag si ridisegnano con `tagDots`, classe `ditem-tags`). |
| `editName()` | Rinomina dentro l'etichetta. La Promise restituisce il nuovo nome (senza spazi in eccesso) o `null` se annullata o invariata. **Non** cambia il nome: lo fa chi chiama (il `Desktop`, con `fs.rename`). |

`DesktopItem` non salva e non conosce il canvas: è il `Desktop` che lo aggiunge, lo collega agli eventi e lo salva.

---

## desktop/itemIcons.js

- `FOLDER_COLOR`: colore predefinito delle cartelle, `#6f9bff`.
- `folderIcon(color?)`, `fileIcon(name)`: icone SVG grandi.
- `workareaIcon()`: icona di una workarea ridotta (cornice tratteggiata con due piccole finestre).
- `placeIcon(glyph, color?)`: un luogo della scrivania (Home, Documenti…): la cartella con sopra il simbolo SDK `glyph`.
- `trashIcon(full = false)`: il cestino; con `full` ha della carta che esce.
- `itemIcon(data)`: l'icona giusta per qualsiasi nodo del file system (usata anche dal File Manager) e, con `data.type === 'workarea'`, per le icone delle workarea. Con `type: 'trash'` dà `trashIcon(data.full)`; una cartella con `data.glyph` dà `placeIcon(data.glyph, data.color)`.

---

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
- `isFixedShown(key)`: `true` se l'elemento è acceso. `setFixedShown(key, shown)`: lo accende o lo spegne su tutte le scrivanie (chiavi sconosciute ignorate). Gli spenti sono le chiavi nell'impostazione `deskHidden`; un valore salvato che non è un array di stringhe vale come nessuno.
- `fixedFolder(item)`: l'id della cartella che la voce apre (`fs.root` per `home`; per `folder` la cartella di sistema non privata con quel nome nella radice, esclusa la Scrivania), o `null` per app, cestino e cartella non trovata.
- `openFixed(item)`: un'app si avvia; il cestino fa `launch('files', { trash: true })`; una cartella fa `launch('files', { folder })`. Se la cartella non c'è, `toast` «La cartella … non c’è più».
- `fixedData(item)`: i dati per `DesktopItem` (`{ id, name, fixed, type, … }`): `type: 'app'` con `app`, `type: 'trash'` con `full: fs.trashed().length > 0`, altrimenti `type: 'folder'` con `glyph`. `x` e `y` li dà il `Desktop`.
- `acceptDrops(el, item)`: rende l'elemento un bersaglio di rilascio. Home e cartelle si marcano con `markItem` (file e cartelle si spostano lì, annullabile). Il cestino è una `dropZone` che accetta i nodi esistenti non di sistema, li manda a `removeNodes(stack, ids)` (annullabile con Ctrl Z) e mostra un `toast`. L'app File Manager non accetta nulla.

`Desktop` ridisegna il Cestino (`full`) a ogni evento `trash` di `fs`. Il sistema espone `FIXED_ITEMS` come `DESK_FIXED_ITEMS` (vedi [systemApi.js](#systemapijs-lilossystem)): con `isFixedShown` e `setFixedShown`: Sistema → Scrivania → Elementi li usa per l'elenco «Elementi fissi», con un interruttore per elemento (senza `setFixedShown`, cioè con un lilOS più vecchio, mostra «Fisso»).

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
| `restoreNodes(stack, ids)` | Toglie dal cestino con `fs.untrash` e restituisce `[{ id, parent }]` (non è una Promise). Annullare li rimette nel cestino. Etichetta `Ripristina «nome»` o `Ripristina N elementi`. |
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
| `movableInto(ids, folderId)` → `string[] \| null` | Gli id tra `ids` che possono andare in `folderId`; `null` se il rilascio non è possibile: `folderId` non è una cartella, un nodo trascinato è la cartella stessa o ne contiene una, oppure non cambierebbe nulla. I nodi di sistema sono sempre esclusi. |
| `moveInto(stack, ids, folderId)` → `string[]` | Sposta con `moveNodes` e mostra un `toast` (`Spostato «nome» in Documenti`, `Spostati 3 elementi in Home`; il percorso è `fs.path`). Un errore diventa un toast `Non si può spostare: …` e restituisce `[]`. Restituisce gli id spostati. |

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

Scrivanie separate. Panoramica e motivazioni: [README per sviluppatori](README.md#workspace) e decisione D27. Il modulo dipende dall'SDK, da `desktop/`, `canvas/`, `workareas/`, `windows/` e `apps/`; lo crea `system.js`.

### `class Workspaces extends Emitter` (`Workspaces.js`)

`new Workspaces({ state, canvas, desktop, wm, launcher, workareas, taskbar })`; `state` è il valore restituito da `setupWorkspaces`. Nel costruttore:

- imposta il filtro delle app visibili del registro (`setInstalledFilter`), segue il `registry` (un'app installata si aggiunge a `apps` e `known` di ogni workspace vivo; una rimossa si toglie e ne chiude le finestre) e collega `info.js`;
- dice al gestore delle finestre qual è il workspace attuale e riapre le finestre salvate fuori dalle workarea (`lilos:ws:<id>:windows`); la proprietà `ready` è la Promise che si risolve quando sono tornate (vale per il primo workspace);
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
| `create({ name?, color? })` | Nuovo workspace con la Scrivania vuota e tutte le app visibili. Restituisce l'id; `null` (con un messaggio) se ce ne sono già 20. Nome predefinito «Workspace N», colore il primo accento non usato. **Non lo mostra**: chiama `switchTo(id)`. |
| `rename(id, name)`, `setColor(id, color)` | Cambiano nome (ripulito, al massimo 40 caratteri; vuoto o uguale si ignora) e colore (esadecimale `#rrggbb`). |
| `isInstalled(appId, id?)` | `true` se l'app è visibile nel workspace (l'attuale se manca `id`); le app `system` sempre. |
| `setInstalled(appId, on, id?)` | Mostra o nasconde l'app nel workspace (non le app `system`); l'app resta installata in lilOS. Nascondendola nell'attuale chiude le finestre di quell'app con `requestClose`: ognuna può chiedere conferma se ha modifiche non salvate. |
| `remove(id)` | Elimina un workspace (mai l'ultimo), in coda. Se è l'attuale mostra prima il successivo. La Scrivania diventa `/Documenti/Scrivania di <nome>` (con `fs.share`; rimossa se vuota); ciò che aveva cestinato dalla sua Scrivania diventa visibile a tutti (`fs.unscopeTrash`); le finestre delle app passano nel workspace attuale (`wm.adopt`), quelle secondarie si chiudono; chiavi `lilos:ws:<id>:…` cancellate; nell'elenco resta la voce "rimossa". Promise: il percorso della vecchia Scrivania, `''` se era vuota, `null` se non ha eliminato nulla. File e cartelle creati altrove restano dove sono. |

**Eventi**

| Evento | Payload | Quando |
| --- | --- | --- |
| `change` | — | Cambiati elenco, nomi, colori o app visibili. |
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

Ciò che le app possono sapere dei workspace senza dipendere dal gestore (il File Manager lo usa per la colonna Workspace). Il gestore si collega da solo.

| Export | Descrizione |
| --- | --- |
| `describeWorkspace(id)` | `{ id, name, color, removed, current }` del proprietario di un nodo (`node.workspace`); `null` se `id` manca (cartelle di sistema condivise) o non è noto. |
| `onWorkspacesChange(fn)` | Chiama `fn` quando i workspace cambiano (`change` o `switch`). Restituisce la funzione che smette di ascoltare. |
| `workspaceManager()` | Il gestore `Workspaces` (lo usa Sistema), o `null`. |

### `WorkspaceSwitcher.js`

Il pulsante nella barra a destra del logo (`button.tb-ws`: pallino con il colore e nome) e il suo menu: elenco dei workspace (spunta sull'attuale), Successivo, Precedente (con le scorciatoie), Nuovo workspace, Gestisci i workspace… (apre `launch('settings', { tab: 'workspaces' })`). Il tooltip riporta le scorciatoie. Ha `aria-haspopup="menu"` ma non `aria-expanded`.

---

## systemFs.js

- `DESK_NAME`: `'Scrivania'`, il nome della cartella di ogni workspace.
- `SYSTEM_FOLDERS`: le cartelle sotto la radice, con il simbolo per la barra laterale del File Manager: Scrivania, Documenti, Immagini, Download.
- `setupFileSystem()` → `{ firstStart }` (`true` se non c'era nulla di salvato). Crea le cartelle di sistema **condivise** che mancano (Documenti, Immagini, Download). La Scrivania non la crea: ogni workspace ha la sua (`setupWorkspaces`). Va chiamata prima che un workspace sia impostato.
- `fillDesk(deskId, layoutKey)`: al primo avvio riempie una Scrivania con gli elementi della vecchia scrivania piatta (`lilos:desktop`, che poi viene eliminata) o con `seed.js`, e scrive le posizioni sotto `layoutKey`.

---

## apps/open.js e apps/openWith.js

Quale app apre quale file, per estensione. Le scelte predefinite vengono da `opens` del registro; l'utente le cambia in Sistema → Usabilità → Tipi di file (`lilos:file-apps`).

| Funzione | Descrizione |
| --- | --- |
| `openFile(node, { choose? })` | Apre il file con la sua app (`launch(app, { file: id })`); senza app associata, con un'app **nascosta nel workspace attuale**, o con `choose: true`, mostra la finestra "Apri con". |
| `appFor(ext)` | L'app per quell'estensione, o `null` (chiedi). La scelta è la stessa in ogni workspace. |
| `defaultAppFor(ext)` | L'app predefinita secondo il registro, o `null`. |
| `setAppFor(ext, appId \| 'ask' \| null)` | Salva la scelta; uguale alla predefinita (o `null`) la toglie. |
| `resetAppsFor()` | Torna a tutte le predefinite. |
| `fileApps()` | App che aprono file (hanno `opens` e `load`). |
| `installedFileApps()` | Quelle visibili nel workspace attuale: le propone "Apri con". |
| `knownExtensions()` | Estensioni da elencare: tipi conosciuti, quelle aperte dalle app, quelle scelte, quelle dei file esistenti. |
| `extensionOf(node)` | Estensione in minuscolo. |
| `setChooser(fn)` | Il sistema registra la funzione che mostra "Apri con" (`system.js`). |

Il launcher passa alle app anche `openWindow(win, key?)` per le finestre secondarie (con una chiave, se è già aperta mostra quella).

`createOpenWith(wm)` (`openWith.js`) crea la finestra **Apri con**: una `Window` senza Riduci e Ingrandisci, a dimensione fissa, con l'elenco delle app (frecce, Invio, doppio clic), la casella "Usa sempre quest'app per i file .xxx" e i pulsanti Annulla / Apri. Ce n'è al massimo una.

---

## apps/commands.js

Scorciatoie delle app, dichiarate nel registro (`commands`) e registrate all'avvio da `registerAppCommands(apps)` nel gruppo con il nome dell'app: così si possono cambiare in Sistema anche prima di aprire l'app. Sono attive anche mentre si scrive (predefinito `whenEditing: true`).

- `handleCommand(id, { isActive, run })`: una finestra dell'app gestisce il comando finché `isActive()` è vero (di solito `win.active`); restituisce la funzione per staccarsi (da chiamare su `destroy`).

---

## App di sistema

File Manager, Editor, Sistema e AppStore **non stanno in questo repository**: sono pacchetti di [GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official) (sorgenti in `src/<app>/`, pacchetto pronto in `apps/<id>/`) che il kernel installa all'avvio se mancano ([D41](../interna/decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel)). Come si lavora su di loro: [README per sviluppatori](README.md#le-app-di-sistema-e-il-repository-ufficiale). Qui c'è quello che lilOS si aspetta da loro e che gli dà.

Un'app di sistema è un modulo ES come le altre: l'export predefinito riceve `{ args, openWindow }` e restituisce una `Window` (vedi [apps/registry.js e apps/launcher.js](#appsregistryjs-e-appslauncherjs)). Importa `@lilos/sdk` e [`@lilos/system`](#systemapijs-lilossystem); non ha sandbox. Se dichiara `entrypoints` (manifesto con `sdk` `"2"`), ogni punto d'ingresso è un export **con quel nome** dello stesso modulo (o del suo `file`): una finestra è una funzione `({ args, openWindow, entry }) → Window`, un background è una funzione `({ lilos, args })` che chiama `lilos.handle` (stesso oggetto `lilos` delle app installate, sempre nella pagina di lilOS; vedi [Background](#background-backgroundjs)).

Argomenti (`args`) che il sistema usa per avviarle, e stato per le workarea (`win.getState`):

| App (`id`) | `args` | `getState()` |
| --- | --- | --- |
| File Manager (`files`) | `folder`: id della cartella da aprire (altrimenti Home); `trash: true` (o `folder === fs.trashRoot`) apre il Cestino; `tag`: id di un tag che esiste, apre la vista di quel tag. Sulla finestra già aperta arriva l'evento `launch` e mostra la nuova cartella. | `{ folder }` (`fs.trashRoot` per il Cestino, `'tag:<id>'` per un tag) |
| Editor (`editor`) | `file`: id del file da aprire; `folder`: cartella del pannello a destra (assente: l'ultima aperta; `null`: nessuna); `sidebar: false`: pannello chiuso. Apre i tipi di file dichiarati in `contributes.fileTypes` del suo manifesto. | `{ file, folder, sidebar? }` |
| Sistema (`settings`) | `tab`: id di una scheda (`'workspaces'`, `'tags'`…), anche a finestra già aperta; `tagFor`: id dei nodi su cui metterà il prossimo tag creato (lo manda «Nuovo tag…» del sottomenu Tag). | nessuno (si riapre sulla prima scheda) |
| AppStore (`appstore`) | `tab`: `installed`, `updates`, l'id di una categoria (`system`, `productivity`, `media`, `development`, `other`), `kernel` o `options` (anche `apps`, `modules`, `repos`, dei vecchi collegamenti); anche a finestra già aperta (evento `launch`). | nessuno |

Il sistema dipende da questi argomenti (`launch('files', { folder })` in `system.js`, `launch('settings', { tab: 'workspaces' })` nel pulsante del workspace): cambiarli nell'app rompe il sistema. Il sistema non dipende invece dall'esistenza delle app: se una manca, `launch` scrive solo un'informazione in console (`app non ancora disponibile`).

Cosa salvano (chiavi di `storage`, vedi [Dati salvati](#dati-salvati)): File Manager `files-view`, `files-panels`; Editor `editor-lang`, `editor-tree`; Sistema nulla di proprio (usa `settings`, `shortcuts`, `tags`, `menus`…). Le associazioni dei tipi di file e l'ordine della barra laterale del File Manager sono del sistema (`file-apps`, `files-sidebar`).

Permessi dichiarati nei manifesti ufficiali: File Manager `fs.write:~`, `fs.workspaces`, `tags.write`, `desktop.items`, `ui.shortcuts`; Editor `fs.write:~`, `ui.shortcuts`, `net:https://json.schemastore.org`; Photo `fs.write:~`, `ui.shortcuts`; Sistema `settings.system`, `workspaces.manage`, `tags.write`, `ui.shortcuts`; AppStore `apps.manage`. Per le app di sistema non c'è un controllo a ogni uso (non passano dal ponte): i permessi servono al kernel per accettare il manifesto e a mostrare cosa fa l'app.

---

## systemApi.js (`@lilos/system`)

`src/systemApi.js`: ciò che il sistema dà alle app di sistema oltre all'SDK. Un'app lo importa come `@lilos/system`; il build non lo include. A runtime il browser carica `/host/system.js`, generato da `scripts/host-shims.mjs` (lo eseguono `predev` e `prebuild`), che ri-esporta per nome ciò che `system.js` ha messo in `globalThis.__lilosHost.system`. Lo stesso vale per `@lilos/sdk` → `/host/sdk.js` → `globalThis.__lilosHost.sdk`. Se il modulo viene importato prima che lilOS sia pronto, lancia «lilOS non è pronto».

**È un contratto con le app installate**: togliere o rinominare un export rompe le app di sistema già installate. Aggiungere è sicuro. Ogni export deve avere la forma `export { a, b } from '…'` su una sola riga (lo script legge solo quelle). Dopo aver aggiunto un export, rigenera gli shim (`npm run dev` e `npm run build` lo fanno da soli).

| Export | Da | A cosa serve |
| --- | --- | --- |
| `version` | `package.json` | Versione di lilOS |
| `ACCENTS`, `LASSO_OPTIONS`, `RETENTION_OPTIONS` | `systemSettings.js` | Scelte di colore principale, selezione a mano libera e conservazione del cestino |
| `SYSTEM_FOLDERS`, `DESK_NAME` | `systemFs.js` | Cartelle di sistema e nome della Scrivania |
| `FOLDER_COLOR`, `itemIcon` | `desktop/itemIcons.js` | Icone di cartelle e file |
| `DESK_FIXED_ITEMS`, `isFixedShown`, `setFixedShown` | `desktop/fixedItems.js` | L'elenco degli elementi fissi della scrivania (alias di `FIXED_ITEMS`) e quali sono accesi |
| `WORKSPACE_LIMITS` | `workspaces/store.js` | Limiti dei workspace (alias di `LIMITS`) |
| `describeWorkspace`, `onWorkspacesChange`, `workspaceManager` | `workspaces/info.js` | Nome e colore di un workspace; il gestore dei workspace |
| `apps`, `registry`, `getApp`, `isInstalled`, `installedApps`, `launch` | `apps/registry.js` | Il registro delle app (non l'`apps` dell'SDK) |
| `fileApps`, `appFor`, `defaultAppFor`, `setAppFor`, `resetAppsFor`, `knownExtensions`, `openFile` | `apps/open.js` | Quale app apre quale file |
| `handleCommand` | `apps/commands.js` | Un'app gestisce un suo comando |
| `callEntrypoint`, `connectEntrypoint`, `entrypointsOf` | `apps/entrypoints.js` | Avviare un punto d'ingresso di un'app, collegarsi a uno in background, elencare quelli di un'app (vedi [Punti d'ingresso](#punti-dingresso-entrypointsjs)) |
| `startup` | `apps/startup.js` | Le app che si aprono da sole (vedi [apps/startup.js](#appsstartupjs)) |
| `services` | `apps/services.js` | I servizi delle app nel kernel: elenco, scelte, avvio e arresto, chiamate, registro (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)) |
| `executionMode`, `canChangeExecution` | `apps/packages/isolation.js` | Come gira un'app installata; se l'utente può cambiarlo (è amministratore) |
| `describePermission` | `apps/packages/permissions.js` | Un permesso in italiano (`'fs.read:~/Documenti'` → «Leggere i file in Home/Documenti») |
| `showAppProperties`, `showAppSecurity` | `apps/appProperties.js` | Aprono "Proprietà…" di un'app (la seconda sulla scheda Sicurezza) |
| `showProperties` | `items/properties.js` | Apre "Proprietà…" di un file o una cartella (di un collegamento a un'app apre quelle dell'app) |
| `pickFile` | `apps/filePicker.js` | Selettore di file e cartelle |
| `addTarget` | `items/targets.js` | Comandi sugli elementi |
| `links`, `linkEntry` | `items/links.js` | Collegamenti della barra laterale del File Manager |
| `markItem`, `dropZone`, `dragItems`, `movableInto`, `moveInto` | `items/itemDrag.js` | Trascinamento di file e cartelle |
| `recordCreated`, `renameNode`, `moveNode`, `restoreNodes`, `removeNodes` | `items/fsHistory.js` | Azioni sul file system che entrano nella cronologia |
| `confirmRemove` | `items/confirmRemove.js` | Eliminare come dicono le impostazioni |
| `tagDots`, `tagSubmenu`, `setTag` | `tags/tagUi.js` | Interfaccia dei tag |

Per le firme vedi le sezioni dei moduli di origine in questa pagina.

---

## apps/registry.js e apps/launcher.js

- `apps`: array **vivo** di `{ id, name, glyph, color, system?, trusted?, load, opens?, commands?, package }`. **Nessuna app è integrata**: il registro contiene solo le app installate dal kernel (`packages.js` le aggiunge e le toglie). `package` è lo stato e il manifesto; `load` ne importa il modulo (vedi [apps/packages](#appspackages)). `system: true` significa che l'app è **necessaria** (`required` nel manifesto): sempre visibile in ogni workspace e non rimovibile. `trusted: true` significa app di sistema (`system` nel manifesto): gira dentro lilOS, senza sandbox. `opens`: estensioni che l'app apre per impostazione predefinita (`''` = senza estensione; da `contributes.fileTypes`); un'app con `opens` riceve `args.file`. `commands`: scorciatoie dell'app `{ id, label, keys, whenEditing? }`, registrate all'avvio (vedi [apps/commands.js](#appscommandsjs)).
- `glyph` è un nome accettato da `icon()` (predefinito `help`).
- `registry`: `Emitter`. Evento `change` `{ id, app }` quando un'app viene aggiunta o sostituita (`app` è la nuova voce) o rimossa (`app` è `null`).
- `registerApp(app)`: aggiunge l'app o sostituisce quella con lo stesso id (una nuova versione). `unregisterApp(id)`: la toglie. Le chiama `packages.js`.
- `getApp(id)` → l'app o `undefined`.
- `isInstalled(id)` → `true` se l'app esiste ed è visibile nel workspace attuale (le `system` sempre; il nome viene da quando le app si installavano per workspace). `installedApps()` → quelle visibili, nell'ordine del registro. `setInstalledFilter(fn)`: il sistema (`Workspaces`) imposta `fn(appId) → boolean`; predefinito: tutte visibili. Il menu di avvio mostra solo le visibili.
- `launch(id, args?, entry = 'main', { files = [] } = {})`: emette `app:launch` con `{ id, args, entry, files }`. `entry` è uno dei punti d'ingresso di tipo finestra dell'app; l'utente apre sempre `main`. `files`: id di file consegnati all'app. Il launcher li passa al modulo (`({ args, openWindow, entry, files })`); in un'app installata diventano handle leggibili e scrivibili (`packageModule` in `host.js`), anche se isolata. Se la finestra è già aperta, il launcher emette `grant` (con gli id) su di essa prima di `launch`, e gli handle crescono.
- `connectLauncher(wm)`: trasforma `app:launch` in finestre. Al primo avvio carica il modulo dell'app e chiama il suo export predefinito `({ args, openWindow, entry }) → Window` (per un'app di sistema e un `entry` diverso da `main`, l'export con quel nome), poi apre la finestra con `wm.open(win, { app: id, center, bounds })`. Se l'app ha già una finestra di **quel punto d'ingresso** **nell'ambito attuale** (e nel workspace attuale) la riporta in primo piano (ed emette `launch`). Una finestra che non è `main` salva `{ __entry, args }` come stato, così le workarea la riaprono dallo stesso punto d'ingresso. Se l'app non parte, un messaggio (`toast`) lo dice. Le app senza `load` (o inesistenti) scrivono un avviso in console. Un'app **nascosta** nel workspace attuale non parte: un messaggio (`toast`) dice di mostrarla da Sistema → Workspace. La finestra appartiene al workspace attuale al momento della richiesta, anche se l'utente cambia workspace mentre l'app si carica (in quel caso si apre nascosta nel suo workspace).
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

Cosa parte da solo quando l'utente entra (Sistema → Avvio). Due eventi del bus (vedi [Eventi del bus](#eventi-del-bus)) segnano i momenti: `system:ready` (lilOS è su) e `user:login` (subito dopo). `connectStartup()`, chiamata da `system.js`, ascolta `user:login` e toglie dalla lista un'app quando viene rimossa dal registro.

All'ingresso, se `startupApps` è acceso, apre le app della lista **nell'ordine**, nel **workspace attuale**, ciascuna con i punti d'ingresso scelti. Salta le app nascoste in quel workspace o non più presenti, e i punti d'ingresso che non esistono più. Se un file o una cartella dei parametri non c'è più, quell'apertura è saltata con un messaggio (`toast`) che lo dice.

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
| `entrypoints?` | Solo app `local` (con `sdk` `"1"` solo `main`, per i suoi `params`, e i `service`; altrimenti il manifesto è rifiutato): le parti dell'app che altri possono avviare. Oggetto `{ nome: { kind, file?, label?, window?, params? } }`, al massimo 20. `nome`: `/^[a-z][a-zA-Z0-9]{0,30}$/`, ed è anche il nome dell'export da chiamare. `kind`: `'window'`, `'background'` (nel browser, a richiesta) o `'service'` (nel kernel, anche a lilOS chiuso; richiede il permesso `background`, altrimenti il manifesto è rifiutato; vedi [Servizi](#servizi-delle-app-appsappservicesjs)). `file?`: un `.js` o `.mjs` tra i `files` (predefinito `entry`). `label?`: fino a 60 caratteri (titolo della finestra, nome nella barra per un background). `window?`: `{ width, height }` (200-4000 × 150-4000), **solo per `window`**. `main` esiste sempre come finestra, anche se non è dichiarato; se è dichiarato deve essere `kind: 'window'`. `params?`: cosa accetta come `args`, perché lilOS possa chiederlo (Sistema → Avvio); vedi [Parametri dei punti d'ingresso](#parametri-dei-punti-dingresso). |
| `styles?` | Solo app di sistema: fogli di stile `.css` del pacchetto (fino a 10, tra i `files`) che lilOS carica insieme all'app. |
| `locales?` | Solo app `local`: un file `.json` tra i `files`, le traduzioni dell'app (formato e regole in [Traduzioni delle app](#traduzioni-delle-app-sdkcorelocalejs-e-sdkcorei18njs)). I testi del manifesto (`name`, `description`, `label` di comandi e punti d'ingresso, `name` dei widget, `label` e `description` dei parametri) sono **in inglese**; le chiavi `@` del file li traducono. Il kernel controlla il file all'installazione e all'aggiornamento e lo rifiuta se non è valido; un `locales` in un'app `remote` fa rifiutare il manifesto. Senza `locales` l'app resta in inglese. |
| `files` | `{ percorso: 'sha256-<base64>' }`: ogni file del pacchetto (fino a 1000, percorsi di fino a 16 livelli con `[\w.-]`). Lo riempie `pack.js` (o, nel repository ufficiale, `scripts/build.mjs`). |
| `url` | Solo `remote`: `https://…` (o `http://localhost`). Non può avere l'origine di lilOS. |
| `libraries?` | `[{ name, version, url, integrity: 'sha384-…', cache? }]`, fino a 30, solo `https`. Con `cache: true` il kernel la scarica una volta in `/system/commons` e la dà inline; senza, il browser la carica dall'`url` (che entra nella CSP). |
| `permissions?` | Elenco di permessi (fino a 50), vedi sotto. |
| `contributes?` | `window: { width, height }` (200-4000 × 150-4000); `fileTypes: [estensione]` (fino a 50); `commands: [{ id, label, keys? }]` (fino a 30, l'`id` inizia con l'id dell'app + `.`, `keys` fino a 3 e richiede `ui.shortcuts`); `widgets: [{ id, name, width, height }]` (fino a 10, richiede `desktop.widget`; **validati ma non mostrati**). |
| `install?`, `update?`, `uninstall?` | Operazioni, vedi sotto. `update`: `[{ from: '<1.2.0', ops: [...] }]` (`from`: `<x.y.z`, `<=x.y.z` o `x.y.z`). |
| `signature?` | `ed25519:<base64>` sul manifesto senza `signature`, con le chiavi in ordine. |

Un manifesto non può superare 256 KB.

### Permessi

Un permesso è `nome` oppure `nome:parametro`. Un permesso non nell'elenco, o con il parametro sbagliato, fa rifiutare il manifesto. Livelli: **implicit** (dato senza chiedere), **install** (lo concede chi installa, con `grant`), **use** (concesso all'installazione e da richiedere all'utente a ogni uso; **oggi non si chiede**), **reserved** (solo `system: true`).

| Permesso | Livello | Significato | Effetto oggi |
| --- | --- | --- | --- |
| `fs.app`, `fs.tmp` | implicit | I propri dati / file temporanei | `lilos.storage` funziona sempre; `tmp` non ha ancora funzioni |
| `fs.open` | implicit | I file che l'app apre | L'app può leggere e scrivere il file con cui è stata aperta |
| `fs.read:<~/percorso>` | install | Leggere i file in quel percorso | `lilos.files.read` e `list` |
| `fs.write:<~/percorso>` | install | Leggere e modificare i file in quel percorso | `lilos.files.*` |
| `tags.read`, `tags.write` | install | Vedere / creare e assegnare tag | `tags.write` serve all'operazione `tag` |
| `desktop.items` | install | Mettere elementi sulla scrivania | Serve all'operazione `desktopItem` |
| `desktop.widget` | install | Mostrare widget | Nessuno (i widget non si mostrano) |
| `ui.notify` | implicit | Mostrare avvisi | `lilos.ui.toast` |
| `ui.menus`, `ui.commands` | install | Aggiungere voci ai menu / comandi | Nessuno (i comandi si registrano comunque da `contributes.commands`) |
| `ui.shortcuts` | install | Scorciatoie da tastiera | Richiesto da `commands[].keys` |
| `clipboard.write` | implicit | Copiare negli appunti | `lilos.clipboard.write` |
| `clipboard.read` | use | Leggere gli appunti | Nessuno |
| `net:<origine>` | install | Collegarsi a un sito (`https://api.esempio.it`, senza percorso) | Apre `connect-src` della CSP |
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
| `lilos.app.call(entry, data)` → risultato | Avvia un punto d'ingresso **della stessa app**. Una finestra si apre (o torna in primo piano) con `data` come `args` e il risultato è `null`; un background risponde con ciò che restituisce la sua funzione di `lilos.handle`. `data` è copiato (clone strutturato); se contiene `file`, quel file deve essere uno che l'app ha ricevuto. |
| `lilos.app.connect(entry)` → `MessagePort` | Un canale con un punto d'ingresso **in background** della stessa app; l'altro lato lo riceve come evento `connect`. Per trasmettere dati continui o grandi senza passare da una chiamata per volta. |
| `lilos.app.keepAlive(attivo)` | Solo in un background. Con `true` (predefinito) non si ferma dopo i 5 minuti senza chiamate e compare nella barra in basso (icona delle app in background), da dove l'utente lo può fermare; con `false` torna normale. Fermarlo cancella ciò che teneva in memoria. |
| `lilos.apps.call(app, entry, data)` → risultato | Come `lilos.app.call`, per un punto d'ingresso **di un'altra app**. Serve il permesso `apps.call:<id app>`. L'app deve essere installata e visibile nel workspace attuale. Un `file` si può passare solo se l'app lo ha ricevuto; ogni altro dato arriva così com'è e **chi lo riceve deve controllarlo** (la forma, i tipi, le dimensioni). |
| `lilos.handle(fn)` | Solo in un background: `fn(data, { from })` risponde alle chiamate; `from` è l'id dell'app che chiama (`null` se è il sistema). Il valore restituito, o `null`, torna a chi ha chiamato. Senza `handle` le chiamate falliscono. Un `file` ricevuto nei dati si può leggere e scrivere con `lilos.files` come se l'app fosse stata aperta con lui. |
| `lilos.locale` | `{ code, i18n: { t(chiave, params?), lang, date(valore, opzioni?), number(valore, opzioni?) } }`: la lingua del sistema e le stringhe dell'app per quella lingua, già risolte (a differenza del resto di `lilos`, **sincrono**). Non richiede permessi. Vedi [`lilos.locale`](#liloslocale). |
| `lilos.on(evento, fn)` → `off` | Eventi: `launch` (nuovi argomenti, a finestra già aperta), `command` (`id` di un comando di `contributes.commands`, quando l'utente preme la sua scorciatoia; solo nelle finestre), `theme` (i token di colore sono cambiati; nella sandbox il bridge li applica da solo a `:root`), `connect` (`MessagePort`, in un background: qualcuno ha chiamato `lilos.app.connect`), `locale` (`{ code, lang }`: la lingua del sistema è cambiata e `lilos.locale` ha già le nuove stringhe; non nei servizi). |
| `lilos.window.setTitle(testo)` | Titolo della finestra (fino a 100 caratteri). Solo in una finestra: in un background fallisce. |
| `lilos.ui.toast(testo)` | Avviso in basso (fino a 200 caratteri). |
| `lilos.files.read(rif)` → testo | `rif`: `~/percorso` (coperto da `fs.read` o `fs.write`) oppure l'id di un file con cui l'app è stata aperta. |
| `lilos.files.write(rif, testo)` | Scrive (fino a 10 milioni di caratteri); crea il file se la cartella esiste. Serve `fs.write`. |
| `lilos.files.list(percorso)` → `[{ name, type, size, modified }]` | Contenuto di una cartella (`fs.read` o `fs.write`). |
| `lilos.files.mkdir(percorso)` | Crea una cartella (la cartella che la contiene deve esistere; se c'è già non fa nulla). Serve `fs.write`. |
| `lilos.storage.get(chiave)` → valore o `null` | Dati propri dell'app per l'utente. Chiavi `[\w.-]{1,64}`; salvati come `app:<id>:<chiave>`. |
| `lilos.storage.set(chiave, valore)` | Fino a 256 KB di JSON per valore. |
| `lilos.clipboard.write(testo)` | Copia negli appunti. |

I percorsi sono quelli che l'utente vede dal workspace attuale: `~/Scrivania` è la scrivania del workspace in cui l'app gira. Le variabili di tema (`--accent`, `--text`, `--surface`…) sono disponibili nei CSS dell'app. Le scorciatoie arrivano come `command` con i tasti scelti dall'utente in Sistema.

### `packages.js`

- `registerPackages()` → `Promise`: prima dei workspace, legge il file di traduzioni di ogni app (`manifest.locales`, controllato con il suo hash; se manca o non è valido l'app resta in inglese e c'è un messaggio in console) e mette ogni app installata nel registro. Si aspetta con `await`. Per ogni app crea la voce con `name` e `text` (il manifesto tradotto) che seguono la lingua del sistema, `system` = `required`, `trusted` = `system`, e `load`: per un'app di sistema `local` è `loadSystemApp`, per le altre `packageModule`.
- `loadSystemApp(pkg)` (interna): per ogni foglio di `styles` aggiunge un `<link rel="stylesheet" data-app="<id>">` (e toglie quelli di una versione precedente), poi fa `import()` di `/api/apps/<id>/v/<versione>/<entry>`. Il percorso contiene la versione, quindi i blocchi, i worker e i file che il modulo carica con percorsi relativi si risolvono accanto a lui, e il browser li tiene in cache per sempre (`immutable`): **una versione non si cambia, se ne pubblica una nuova**. Alla rimozione di un'app i suoi fogli di stile si tolgono.
- `connectPackages({ desk })` → `Promise`: dopo l'avvio, segue `apps` (`change`: legge le traduzioni, poi aggiunge, sostituisce o toglie nel registro; togliendo scarica anche le traduzioni) e fa le operazioni per l'utente. `desk()` dà l'id della Scrivania del workspace attuale.

### Modalità di esecuzione (`isolation.js`)

Un'app installata gira in due modi. **Isolata** (il predefinito): le finestre sono in un `<iframe sandbox="allow-scripts">` e i background in un iframe `sandbox` nascosto; l'app raggiunge lilOS solo con `lilos`, e solo nei limiti dei permessi. **Non isolata**: la finestra gira nella pagina di lilOS, disegnata in uno Shadow DOM, e il background in un Web Worker con l'origine di lilOS. Più veloce, ma l'app **può fare tutto ciò che può fare l'utente** (leggere ogni file e ogni dato di lilOS, chiamare il kernel con la sua sessione), permessi o no: i permessi non la limitano più.

La modalità la sceglie un amministratore: una regola generale (la cartella `/system/app/.security`, `meta.security.isolated`, vedi [rotte del kernel](#il-kernel); in Sistema → App → Sicurezza) e, per una sola app, una scelta propria (`isolated` nello stato dell'app; "Proprietà…" → Sicurezza). La scelta dell'app, se c'è, vince.

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

Chi chiama dal sistema (`@lilos/system`, app di sistema) non ha permessi da verificare; un'app installata passa da `lilos.app.call` (i propri) o `lilos.apps.call` (di altre, con `apps.call:<id>`), che chiamano queste funzioni con `from` = id dell'app.

#### Parametri dei punti d'ingresso

`params` (in `entrypoints.<nome>`) descrive gli `args` che una finestra accetta, così lilOS può chiederli all'utente (oggi in Sistema → Avvio, vedi [apps/startup.js](#appsstartupjs)). Lo stesso schema vale per un punto d'ingresso `service`: i parametri scelti arrivano nel suo `args`, insieme a `reason` (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)); per `file` e `folder` sono percorsi `~/…`. Oggetto `{ nome: parametro }`, al massimo 10; `nome`: `/^[a-zA-Z][a-zA-Z0-9_]{0,30}$/`.

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

### Background (`background.js`)

Gestisce i punti d'ingresso `background`: si avviano alla prima chiamata, uno per app e per nome, per tutta la sessione (non per workspace), e si fermano dopo **5 minuti senza chiamate** (il controllo gira ogni 30 secondi), alla disconnessione dell'utente e quando l'app cambia (nuova versione, rimossa, modalità cambiata). Con `lilos.app.keepAlive()` restano accesi.

- Isolato: un iframe `sandbox="allow-scripts"` nascosto (`.pkg-background`, con una CSP simile a quella delle finestre) che esegue `SANDBOX_RUNTIME_SOURCE`.
- Non isolato: un `Worker` da un `Blob` (`WORKER_SOURCE`) con l'origine di lilOS.
- App di sistema: l'export con quel nome, chiamato nella pagina di lilOS.

Il codice (verificato con l'hash) e le librerie del manifesto si mandano all'avvio con un `init`; le richieste dell'app tornano per una `MessagePort` e si controllano con i permessi come per le finestre. Se il codice non parte, un avviso lo dice e l'istanza si ferma. Export: `call(app, entry, data, from)`, `connect(app, entry)`, `running()` → `[{ key, appId, name, label, glyph, keepAlive }]`, `stop(key)`, `stopApp(id)`, e `backgroundApps` (`Emitter`, evento `change` quando se ne avvia o ferma uno o cambia `keepAlive`). La barra in basso ha un'icona (`src/taskbar/BackgroundApps.js`) con l'elenco di quelli con `keepAlive`: per ognuno aprono le proprietà dell'app e "Ferma".

### `methods.js`

`hostMethods({ pkg, win?, handles, instance? })` costruisce le funzioni che l'app può chiamare (i nomi di `lilos.*`, più `app.failed` che usa il ponte per segnalare un errore) e le controlla contro i permessi; è lo stesso per finestre e background, isolati o no. `invoke(methods, nome, parametri)` esegue una richiesta (rifiuta i nomi sconosciuti). `handles`: gli id dei file con cui l'app è stata aperta o che le sono stati passati.

### `host.js`

(per le app **non** di sistema: quelle di sistema non hanno finestra isolata)

- `packageModule(pkg)` → `{ default: ({ args, entry = 'main' }) => Window }`: il modulo che il launcher carica per un'app installata. Una finestra per app e punto d'ingresso, come le altre; titolo e dimensioni vengono dal punto d'ingresso (`label`, `window`), poi da `contributes.window`. `getState()` restituisce `{ file }` se l'app è stata aperta con un file (così le workarea la riaprono con lo stesso file).
- App `local` non isolata (solo `sdk` `"2"`): il modulo si importa da un `Blob` e la funzione `entry` riceve `{ lilos, root, args }`, con `root` uno Shadow DOM (`.pkg-host`) dentro la finestra. Gli stili di lilOS non vi entrano (le variabili di tema `--accent`, `--text`… sì, perché ereditano); le scorciatoie di `contributes.commands` valgono per la finestra attiva dell'app. Se la funzione restituisce una funzione, la chiama alla chiusura della finestra.
- App `local` isolata: `<iframe sandbox="allow-scripts">` con `srcdoc`. Il documento contiene: la CSP in `<meta>` (`default-src 'none'`; `script-src 'unsafe-inline'` più gli indirizzi delle librerie non in cache; `style-src 'unsafe-inline'`; immagini, font e media solo `data:`/`blob:`; `connect-src` con le origini dei permessi `net:`, altrimenti `'none'`; `form-action 'none'`; `base-uri 'none'`), il ponte, le librerie e il codice. Il codice e le librerie in cache si controllano con gli hash prima di essere inseriti; se non corrispondono la finestra non si apre.
- App `remote`: `<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src=url>`. lilOS risponde ai messaggi del ponte che il sito gli manda (stesse funzioni, stessi permessi), ma non gli dà `window.lilos`; quel protocollo non è documentato né stabile.

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
| `deskHidden` | `[]` | Chiavi degli elementi fissi spenti (vedi [desktop/fixedItems.js](#desktopfixeditemsjs)) |
| `startupApps` | `true` | Con `false` le app scelte in Sistema → Avvio non si aprono all'ingresso (vedi [apps/startup.js](#appsstartupjs)) |

Esporta anche `ACCENTS`, i colori proposti dall'app Sistema, `RETENTION_OPTIONS` (`[{ value, label }]`: 1, 7, 14, 30, 60, 90, 365 giorni e `0` «Per sempre», per `trashRetention`), `LASSO_OPTIONS` e `selectionMode(event)` → `{ mode: 'lasso' | 'rect', additive }`: percorso libero se sono premuti tutti i modificatori di `lasso`; `additive` (si aggiunge alla selezione) con Ctrl/Cmd o Shift, se non fanno parte della combinazione del percorso.

---

## systemTrash.js

`setupTrash()`: chiamata da `system.js`. Elimina per sempre ciò che è nel cestino da più di `trashRetention` giorni (`fs.purgeTrash(Date.now() - giorni * 86 400 000)`, di tutti i workspace, non solo dell'attuale): all'avvio, ogni ora e quando l'impostazione cambia. Con `trashRetention` a `0` non fa nulla.

---

## systemHistory.js

`setupHistory({ root, activeWindow })`: collega l'annulla e ripeti centrale al sistema. La chiama `system.js` con `{ root: desktop.history, activeWindow: () => wm.active }`.

- `history.setRoot(root)` e `history.setContext(() => activeWindow()?.el ?? null)`.
- Scorciatoie nel gruppo **Modifica** (si cambiano in Sistema → Usabilità → Scorciatoie): `edit.undo` (Ctrl Z) e `edit.redo` (Ctrl Y, Ctrl Shift Z). Funzionano anche mentre si scrive (`whenEditing`) e si ripetono tenendo premuto (`repeat`); `when` è `history.handles(…)`, quindi nei campi di testo senza `text: true` il tasto resta al browser.
- Messaggi con `toast()`: `Annullato: …`, `Ripetuto: …` (solo se la voce ha un'etichetta) e `Non si può più fare: …` quando una voce lancia un errore.
- Azioni di menu (`menus.defineAction`): `edit.undo` e `edit.redo`, con le icone `undo` e `redo`, attive solo se la cronologia della **scrivania** ha qualcosa da fare, e agiscono su quella (`history.undoOn(root)`). Si aggiungono con l'editor del menu; non sono nel menu predefinito.
- In sviluppo `window.lilos.history` è l'oggetto `history`.

---

## tags/tagUi.js e scheda Tag

`src/tags/tagUi.js`, usato da scrivania, File Manager e Sistema:

| Export | Descrizione |
| --- | --- |
| `tagDots(node, cls = 'tag-dots')` | `HTMLElement` con i pallini dei tag del nodo (al massimo 4, poi «+n»; `title` e `aria-label` «Tag: nomi»), o `null` senza tag. Ignora i tag che non esistono. |
| `setTag(ids, tagId, on)` | Mette (`on`) o toglie il tag a ogni nodo; salta i nodi di sistema e gli id sconosciuti. Usa `fs.setTags`. |
| `tagSubmenu(ids)` | Voce di menu **Tag** con sottomenu: un pallino colorato per tag, con il segno di spunta se tutti i nodi lo hanno (sceglierlo lo toglie a tutti, altrimenti lo mette a tutti); i tag invisibili hanno «(nasconde)» dopo il nome; poi **Nuovo tag…** (`launch('settings', { tab: 'tags', tagFor: ids })`) e **Gestisci i tag…**. Disattivata se non ci sono nodi etichettabili. |

Stili in `src/styles/tags.css` (`.tag-dots`, `.tag-dot`, `.ditem-tags`, `.fm-tag`…).

**Scheda Tag di Sistema** (`tagSections` in `SettingsApp.js`, nel repository ufficiale, dopo la scheda Workspace). Una sezione «Nuovo tag» (nome e **Crea**, anche con Invio; un errore, come un nome già preso, esce in un `toast`) e una sezione per tag con Nome, Colore (`swatches` con `TAG_COLORS`), Visibile (interruttore, con la spiegazione di cosa succede) ed Elementi (quanti ne vede il workspace attuale, **Mostra nel File Manager** e **Elimina…** in due clic, che chiama `tags.remove`). Si ridisegna sull'evento `change` di `tags`. Argomenti di `launch('settings', …)`: `tab: 'tags'` apre la scheda e dà il focus al campo del nuovo tag; `tagFor: string[]` sono gli id degli elementi che prenderanno il prossimo tag creato lì (i nodi che non esistono si ignorano; l'elenco si svuota dopo la creazione).

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

Registra la scorciatoia `system.startMenu` (Ctrl K, gruppo Generale, attiva anche mentre si scrive); la stessa combinazione lo chiude quando il focus è dentro il menu. Il tooltip del pulsante del logo segue la scorciatoia. La ricerca filtra per nome (contiene, senza distinguere maiuscole e minuscole) le app **visibili nel workspace attuale** (`installedApps()`). Il pulsante in fondo è **Esci** (`kernel.logout()`, poi ricarica la pagina; un errore mostra «Uscita non riuscita: …» e non esce) quando `kernel.mode` è `'multi'`, altrimenti **Riavvia sessione** (ricarica la pagina).

### `createClock()` → `HTMLElement`

Data breve e ora secondo `session.locale` (la lingua del sistema), aggiornate allo scoccare di ogni minuto. Il tooltip contiene la data completa.

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
| `actionButton({ label, primary, danger, spinner, onClick })` | `button` | Pulsante. Con `spinner: true`, se `onClick` restituisce una Promise il pulsante aspetta come con `busyButton`. Non va messo quando la Promise aspetta l'utente (una finestra di scelta). |
| `busyButton(button, work)` | Promise | Mette un pulsante in attesa finché `work` (una Promise o una funzione che la restituisce) non finisce: rotella accanto all'etichetta, `disabled` e `aria-busy="true"`. Risolve o fallisce come `work`. La rotella viene da `button[aria-busy="true"]` in `controls.css`: vale per ogni `button`, anche impostando l'attributo a mano. |

---

## sdk/ui/shortcutField.js

### `shortcutField(id)` → `HTMLElement`

Editor delle combinazioni di un comando, usato nell'app Sistema:

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

Una `Window` con una `SettingsView` nel corpo (`win.view`). Il sottotitolo segue il tab principale: "Sistema — Aspetto". È la base di **ogni** finestra che modifica impostazioni.

---

## sdk/core/menus.js

### `menus`

Menu configurabili dall'utente. Le parti del sistema dichiarano le **azioni** e la **disposizione predefinita** di un menu; l'utente cambia la disposizione (Sistema → Usabilità → Menu contestuale), salvata in `lilos:menus` e validata contro le azioni conosciute.

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

Tutto sta sotto `/api`. Le risposte sono JSON, con `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` e una CSP che vieta tutto. Gli errori sono `{ error: codice, message }` con questi stati: `invalid` 400, `unauthorized` 401, `invalid_credentials` 401, `forbidden` 403, `not_found` 404, `conflict` 409, `too_large` 413, `rate_limited` 429 (con `Retry-After`), `unavailable` 503; un errore non previsto è `internal` 500 e il messaggio non dice altro. Un metodo non ammesso dà 405 con `Allow`.

Le richieste che modificano (tutte tranne `GET` e `HEAD`) devono avere l'intestazione `X-Lilos: 1` e, se il browser manda `Origin`, questa deve essere in `origins` della configurazione o, con `loopbackOrigins: true`, un `http://localhost`, `127.0.0.1` o `[::1]`; altrimenti `forbidden`. Senza un modulo di accesso chiunque raggiunga il kernel è l'unico utente: per questo ascolta solo su questo computer.

| Metodo e percorso | Chi | Corpo → risposta |
| --- | --- | --- |
| `GET /api/session` | tutti | → `{ mode: 'multi' \| 'single', user \| null }` |
| `POST /api/session` | tutti | `{ username, password }` → `{ user }` e il cookie `lilos_session` (`HttpOnly; SameSite=Strict; Path=/api`, `Secure` con `secureCookies`). Con un solo utente: `invalid`. |
| `DELETE /api/session` | tutti | Chiude la sessione e cancella il cookie |
| `GET /api/boot` | utenti | → `{ user, home, fresh, nodes, storage, apps, appSecurity }`: tutto ciò che serve per partire. `home`: il percorso della home nel file system (`/home/<utente>`), da cui `fs.path` parte. `fresh`: la cartella dell'utente è vuota. `apps` è l'elenco di `GET /api/apps`, ma senza nascondere l'origine `local` ai non amministratori. `appSecurity`: `{ isolated }`, la regola generale su come girano le app |
| `POST /api/fs/sync` | utenti | `{ put: [nodo], remove: [id] }`, in una transazione; al massimo 5000 voci e 8 MB. L'SDK ne manda al massimo 2000 per richiesta (prima i nodi, con i genitori prima dei figli, poi le eliminazioni), quindi non c'è un limite al numero di modifiche di una volta sola |
| `GET /api/fs/content/:id` | utenti | → testo del file |
| `PUT /api/fs/content/:id` | utenti | testo del file (fino a 10 MB) |
| `POST /api/storage` | utenti | `{ set: { chiave: valore }, remove: [chiave] }`; al massimo 500 chiavi per volta, 512 KB per valore (JSON). L'SDK ne manda al massimo 200 e circa 4 MB per richiesta |
| `GET /api/apps` | utenti | → app installate `[{ ...stato, manifest }]`. Agli utenti non amministratori l'origine `local` mostra solo `{ type: 'local' }` |
| `GET /api/apps/:id/file?path=…` | utenti | → un file della versione in uso (il codice) |
| `GET /api/apps/:id/v/:version/<percorso>` | utenti | → un file di quella versione (la in uso o la precedente), con il percorso nell'URL: da qui lilOS importa le app di sistema, e i loro blocchi, worker e file `.wasm` si risolvono accanto al modulo. Risposta con `Cache-Control: private, max-age=31536000, immutable` e una CSP che permette a quel codice di caricare le proprie risorse dalla stessa origine (`default-src 'self' blob: data:; script-src 'self' blob: 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'`). |
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
| `GET /api/repos/:id/readme?path=` | utenti | → il `README.md` completo di un pacchetto del catalogo, come testo |
| `GET /api/modules` | amministratori | → moduli del kernel installati (vedi [Moduli come pacchetti](#moduli-come-pacchetti-modulepackagejs)) |
| `POST /api/modules` | amministratori | `{ source, allowUnsigned }` → `{ name, version, restartRequired }` |
| `POST /api/modules/:name/update` | amministratori | `{ ref?, allowUnsigned }` → `{ name, version, previous, restartRequired }` o `{ …, unchanged: true }` |
| `DELETE /api/modules/:name` | amministratori | → `{ name, kept, restartRequired }` |
| `GET /api/services` | utenti | → `{ available, enabled, admin, services }`: i servizi delle app (`kind: 'service'`) con quando partono e come sono ora, per questo utente (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)) |
| `PUT /api/services-options` | utenti | `{ enabled: true \| false }` → `{ enabled }`: se i servizi dell'utente partono quando entra. Altro che un booleano: `invalid` |
| `PUT /api/services/:app/:entry/startup` | utenti (`system`: amministratori) | `{ when: 'none' \| 'login' \| 'system', params? }` → come `GET /api/services`. `forbidden` per `system` (o per cambiare un servizio già di sistema) se non si è amministratori |
| `POST /api/services/:app/:entry/start`, `…/stop`, `…/restart` | utenti (servizi di tutti: amministratori) | → `{ status, error }` |
| `POST /api/services/:app/:entry/call` | utenti | `{ data?, from? }` (fino a 1 MB; `from` un id di app) → `{ result }`: ciò che restituisce `lilos.handle` del servizio. Lo avvia se è spento |
| `GET /api/services/:app/:entry/log` | utenti (servizi di tutti: amministratori) | → `{ lines: [{ at, level, text }] }` |
| `GET /api/services-events` | utenti | Flusso `text/event-stream` (un commento ogni 25 s per tenerlo aperto): `change` `{ owner, app, entry }` quando cambia un servizio dell'utente o del sistema, `notify` `{ app, text }` per ciò che un suo servizio manda con `lilos.ui.notify` (e, per gli amministratori, quelli di sistema). Negli altri endpoint `/api/services/:app/:entry/…`: `invalid` se `app` o `entry` hanno una forma non valida, `not_found` se il servizio non esiste |
| `POST /api/kernel/restart` | amministratori | Il kernel si ferma ed esce con il codice 75: `npm run kernel` lo riavvia. Senza `run.js` (variabile `LILOS_SUPERVISED` assente): `unavailable` |
| `/api/modules/<nome>/…` | utenti | Gli endpoint dei moduli (`ctx.route`) |

I percorsi possono finire con `*` (`/api/apps/:id/v/:version/*`): il resto del percorso arriva in `params.rest`.

**Nodi di `/api/fs/sync`.** `{ id, parent, name, type: 'folder' \| 'file' \| 'app', created, modified, color?, app?, system?, workspace?, private?, tags?, trashed? }`: gli id di lilOS (`[\w-]{1,64}`; `root` e `trash` solo come `parent`) diventano `<home>/<id>`, in una cartella per utente. Il contenuto dei file non passa di qui. I metadati extra (i campi dopo `modified`) non possono superare 4 KB per nodo.

**Dentro la home** di ogni utente: `~trash` (la radice del Cestino, nominata `.trash`) e `~config` (nominata `.config`, un file JSON per ogni chiave di `storage`). Una chiave è `[\w:.-]{1,120}`.

**Chi è l'utente.** `principal` è `{ kind: 'user', id, username, name, role: 'admin' \| 'user' }`. Senza modulo `auth` è sempre `{ id: 'local', username: 'utente', name: 'Utente', role: 'admin' }`.

### Configurazione (`config.json`)

```json
{
  "host": "127.0.0.1", "port": 8790,
  "origins": [], "loopbackOrigins": true, "secureCookies": false,
  "modules": [
    { "name": "users-basic", "version": "1.0.0", "config": { "sessionDays": 30, "idleDays": 7 } },
    { "name": "fs-postgres", "version": "1.0.0", "config": { "url": "postgres://lilos:lilos@127.0.0.1:5433/lilos" } },
    { "name": "services-isolate", "version": "1.0.0", "config": {} }
  ],
  "apps": { "allowLocalSources": true, "trustedPublishers": {}, "officialKey": null, "bootstrap": ["files", "editor", "settings", "appstore"] }
}
```

| Campo | Significato |
| --- | --- |
| `host`, `port` | Dove ascolta. Senza modulo `auth` solo `127.0.0.1`, `::1` o `localhost`. `LILOS_KERNEL_HOST` e `LILOS_KERNEL_PORT` hanno la precedenza. |
| `origins`, `loopbackOrigins` | Origini ammesse per le richieste che modificano. |
| `secureCookies` | Aggiunge `Secure` al cookie (con HTTPS). |
| `modules` | Moduli da avviare, `{ name, version?, config? }`. Senza `version`: la più alta installata. Un modulo indicato due volte, non installato, o che richiede un servizio che nessun modulo attivo fornisce, ferma il kernel. |
| `apps.allowLocalSources` | Permette di installare app da una cartella del computer del kernel (solo sviluppo). |
| `apps.trustedPublishers` | `{ idEditore: 'ed25519:<chiave>' }`: gli editori di cui ci si fida. |
| `apps.officialKey` | Se c'è, le app di sistema devono essere firmate con questa chiave. |
| `apps.bootstrap` | Gli `id` delle app che il kernel installa dal repository ufficiale, all'avvio, se mancano (predefinito: `files`, `editor`, `settings`, `appstore`). Vedi [D41](../interna/decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel). |

Il file si può cambiare con la variabile `LILOS_KERNEL_CONFIG`. Il kernel richiede un modulo che fornisce `fs`. Installare, aggiornare o togliere un modulo con l'AppStore riscrive la lista `modules` di questo file (passando da `config.json.tmp`, ignorato da git).

`repos.json`, nella cartella del kernel (`system/kernel/`, ignorato da git), contiene i repository aggiunti da un amministratore: `[{ id, name, url }]`, al massimo 30. L'ufficiale non è nel file: c'è sempre.

### Avvio e riavvio (`run.js`)

`npm run kernel` esegue `system/kernel/run.js`, che avvia `src/main.js` come processo figlio con `LILOS_SUPERVISED=1` e lo riavvia quando esce con il codice **75** (lo fa `POST /api/kernel/restart`, dopo aver installato, aggiornato o tolto un modulo). Con qualunque altro codice, `run.js` termina con quello. Avviare `src/main.js` direttamente funziona, ma senza riavvio automatico.

All'avvio il kernel carica i moduli, registra le rotte e prima di ascoltare **installa le app di sistema che mancano** (`apps.bootstrap`, vedi [D41](../interna/decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel)): legge il catalogo del repository ufficiale e installa ciascuna app mancante, dall'ultimo tag, concedendo i permessi del suo manifesto. Se il repository non risponde (rete, `git` mancante, credenziali), il kernel parte lo stesso, scrive nel log «App di sistema non installate (…)» e lilOS gira senza quelle app.

### Moduli

Cartella `modules/<nome>_<x.y.z>/` con:

- `module.json`: `{ name, version, description, kernel: "1", provides: [servizio], requires: [servizio] }`. `name` e `version` devono corrispondere alla cartella e `kernel` a quello del kernel (`1`).
- `index.js`: `export default { init(ctx), stop?(), commands? }`.

`ctx` (il contesto di `init`):

| Membro | Descrizione |
| --- | --- |
| `name`, `version`, `dir`, `config` | Il modulo, la sua cartella (può tenerci file propri) e la sua parte di configurazione. |
| `log` | Logger. |
| `fail(codice, messaggio)` | Lancia un errore voluto (i codici sono quelli della tabella degli errori). |
| `provide(servizio, impl)` | Fornisce un servizio dichiarato in `provides`; per `auth`, `users`, `fs` e `runtime` il kernel controlla che `impl` abbia tutti i metodi. |
| `service(nome)` | Un servizio dichiarato in `requires`. |
| `route(metodo, percorso, handler)` | Endpoint `/api/modules/<nome><percorso>`, solo per utenti con l'accesso fatto. `handler({ principal, params, query, json(limite?), req, res })` restituisce JSON (nulla = 204). Il percorso è `/parola/:param`, con `[\w:-]`. |

`commands` sono i comandi della riga di comando: `npm run kernel:cli -- <modulo> <comando> [argomenti] [--opzione valore] [--interruttore]`; ricevono `{ services, args: { positional, flags }, prompt, ctx }`. `prompt.password(domanda, { confirm })` chiede una password senza mostrarla (o la prende da `LILOS_PASSWORD` se non c'è un terminale).

### Servizi (`services.js`)

Il kernel controlla che questi metodi esistano; ogni modulo può fornire anche servizi con altri nomi.

| Servizio | Metodi |
| --- | --- |
| `auth` | `login(username, password, { ip })` → `{ token, user, expires }` (lancia `invalid_credentials` o `rate_limited`); `session(token)` → `user \| null`; `logout(token)`; `logoutAll(userId)` |
| `users` | `get(id)`, `list()`, `create({ username, name, password, role })`, `setPassword(id, password)`, `remove(id)` |
| `fs` | `home(principal)` → `{ id, path, created }`; `stat(principal, id)`; `list(principal, id)`; `tree(principal, id, { content })`; `lookup(principal, path)`; `apply(principal, { put, remove })` (una transazione); `read(principal, id)` → `Buffer`; `write(principal, id, Buffer)`; `remove(principal, ids)` |
| `runtime` | Facoltativo: senza, lilOS non ha servizi. `start({ key, code, info, limits }, host)` → `Promise<handle>`, che si risolve quando il punto d'ingresso è partito (o rifiuta con il motivo). `code`: il modulo ES del servizio, che esporta una funzione col nome `info.entry` e la riceve con `{ lilos, args }`. `info`: `{ id, version, entry, args, user: { id, username, name } \| null, locale, i18n }`, dove `locale` è `{ code, lang, strings }` (le stringhe già risolte, vedi [`lilos.locale`](#liloslocale)) e `i18n` è il testo del motore (`i18nApi` di `sdk/core/i18n.js`, `toString()`): il runner lo valuta e dà al servizio `lilos.locale`. `limits`: `{ memoryMb, cpuMs }` (memoria del servizio; tempo di una sola esecuzione del suo codice). `host`: `{ call(metodo, parametri)` → `Promise` (l'API `lilos`, controllata dal kernel), `log(livello, testo)` (ciò che scrive con `console.*`), `exit(motivo)` (si è fermato da solo: errore, memoria, crash) `}`. `handle`: `{ request(data, from)` → `Promise<risultato>` (ciò che restituisce il suo `lilos.handle`), `stop()` → `Promise }`. Vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs) |

Un nodo del servizio `fs` è `{ id, parent, name, type: 'folder' \| 'file' \| 'app', meta, size, created, modified, content? }`. Chi chiede è un `principal`: `{ kind: 'user', … }` o `KERNEL` (`{ kind: 'kernel' }`, usato per installare le app). Il modulo `fs` rifiuta ciò che il principal non può fare: `not_found` per ciò che non deve sapere che esiste, `forbidden` per ciò che vede ma non cambia.

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

### `fs-postgres_1.0.0`

Configurazione: `url` (la variabile `LILOS_PG_URL` vince) e `poolSize` (10). All'avvio applica `schema.sql` (tabella `lilos_nodes`: `id`, `parent`, `name`, `type`, `area`, `owner`, `meta`, `size`, `created`, `modified`, `content`, `rev`) e crea le cartelle di base.

| Area | Percorso | Chi legge | Chi scrive |
| --- | --- | --- | --- |
| `root`, `system`, `homes` | `/`, `/system`, `/home` | solo il kernel | il kernel |
| `app` | `/system/app` | tutti gli utenti | il kernel |
| `commons` | `/system/commons` | tutti gli utenti | il kernel |
| `tmp` | `/system/tmp` | il kernel | il kernel |
| `home` | `/home/<utente>` | quell'utente | quell'utente |

Un nodo prende area e proprietario dal genitore alla creazione e non li cambia: niente si sposta da una home all'altra né fuori dalle home. Le cartelle di base e le home non si rinominano né si rimuovono. Eliminare una cartella elimina ciò che contiene. I nomi in una cartella non sono unici: `lookup` prende il più vecchio e ignora maiuscole e minuscole.

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

`apps` e `modules` sono elenchi di cartelle (fino a 200 l'uno, percorsi come `apps/note`). Ogni cartella di app contiene `lilos.json`, ogni cartella di modulo `module.json`; può contenere anche un `README.md` (Markdown), che `catalog(id)` restituisce come `readme` (`null` se manca; oltre 64 KB tagliato, con `readmeTruncated: true`). Il testo completo si legge con `readme(id, path)` (`GET /api/repos/:id/readme?path=`). Le voci non valide non fermano il catalogo: compaiono con `error`.

`Repos`: `list()` (l'ufficiale per primo: `{ id: 'official', name: 'lilOS ufficiale', url: 'https://github.com/GexyLab/lilos-plugins-official', official: true }`), `get(id)`, `add(principal, { url, name? })`, `remove(principal, id)`, `catalog(id)`. `add` e `remove` sono per amministratori; `add` legge il catalogo prima di salvare (un indirizzo sbagliato si scopre subito), rifiuta quelli già presenti e oltre 30. `catalog(id)` risponde alla versione più alta, e il suo `ref` è quello da passare per installare esattamente quella versione.

### Installazione delle app (`installer.js`, `manifest.js`)

- `installer.js`: `install` (rifiuta un'app già installata), `update` (nuova versione, `ref` anche più vecchio, o `reinstall`; si tengono la versione in uso e la precedente), `uninstall`. L'hash di ogni file e quello delle librerie (`integrity`) si controllano prima di scrivere. La libreria in `/system/commons` è condivisa tra le app che la usano (`meta.usedBy`) e si elimina quando nessuno la usa più. Lo stato (`id`, `version`, `previous`, `kind`, `system`, `required`, `source`, `signed`, `publisher`, `granted`, `installed`, `updated`, `isolated`) sta nel `meta.state` della cartella `/system/app/<id>`. `isolated` è `true`, `false` (scelta di un amministratore per quell'app) o `null` (la regola generale, il valore con cui nasce); la regola generale è `meta.security.isolated` della cartella `/system/app/.security` (`true` se manca). `security()`, `setSecurity()` e `setAppSecurity()` leggono e scrivono questi valori; le ultime due solo per un amministratore (o il kernel).
- `update` con `reinstall` riscrive **lo stesso commit** registrato in `source.commit`: non porta codice nuovo. Per averlo serve una versione più alta (o `ref` di un'altra versione, anche precedente).
- Fiducia: una firma presente ma sbagliata è sempre rifiutata; un'app è *verificata* se firmata da un editore di `trustedPublishers` con la chiave giusta, o se è di sistema e viene dal repository ufficiale; altrimenti serve `allowUnsigned`. Un'app con `system: true` da un altro repository è rifiutata, e un'app di sistema resta di sistema negli aggiornamenti. `uninstall` rifiuta le app `required`.
- `manifest.js` controlla anche `locales` (un file `.json` tra i `files`, solo per app `local`) e, con `checkFiles` all'installazione e all'aggiornamento, che il file passi `parseLocales` di `sdk/core/i18n.js`: il kernel importa il motore dell'SDK ([D45](../interna/decisioni.md#d45-un-file-di-traduzioni-per-app-inglese-predefinito-un-solo-motore)), così le regole sono le stesse di lilOS. Un file non valido fa fallire l'installazione con `invalid`.
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

- **Installazione.** Copia il pacchetto in `modules/<nome>_<versione>/` (con `source.json`: da dove viene, `{ type, url, ref, commit, path, installed }`), esegue `npm ci` (o `npm install` senza lockfile; `--omit=dev --ignore-scripts`) se c'è un `package.json`, e lo aggiunge a `modules` in `config.json` con `defaultConfig`. Prima **verifica che il kernel si avvierebbe** con quella lista (dipendenze soddisfatte, un modulo che fornisce `fs`, e senza `auth` solo `host` locale): se no, lascia tutto com'era e lancia `conflict`.
- **Aggiornamento.** Parte dal `source.json` registrato (con `ref` opzionale), copia la nuova versione accanto alla vecchia, ci porta i file di `data`, aggiorna la versione in `config.json` e tiene le due versioni più recenti. Senza versione più alta risponde `unchanged: true`. Un modulo senza `source.json` (messo a mano) non si aggiorna da qui.
- **Rimozione.** Toglie il modulo da `config.json` (dopo aver verificato che il kernel si avvierebbe senza) e cancella le cartelle delle sue versioni, **tranne quelle che contengono file di `data`**: gli utenti di `users-basic` restano. Reinstallando la stessa versione quella cartella si riusa.
- `list()`: i moduli trovati in `modules/`, con `enabled` (versione in `config.json`), `running` (in uso adesso) e `source`; anche quelli già tolti ma ancora in esecuzione fino al riavvio.

### Servizi delle app (`apps/appServices.js`)

I punti d'ingresso `kind: 'service'` (vedi [Manifesto](#manifesto-lilosjson)) girano **nel kernel**, anche a lilOS chiuso. Li esegue il servizio `runtime` di un modulo ([`services-isolate`](#services-isolate_100)); `AppServices` (`kernel.appServices`) decide chi li avvia e quando. Senza un modulo `runtime` lilOS funziona, ma senza servizi (`GET /api/services` dà `available: false`).

**Proprietario.** Ogni istanza ha un proprietario: un **utente** (il servizio gira per lui, con la sua home) oppure il **sistema** (`'*'` negli eventi e nelle chiavi interne: nessun utente, una sola istanza per tutti). Un servizio di sistema non ha home: ha solo i propri dati e la rete.

**Quando partono.**

| Momento | Chi parte | Come |
| --- | --- | --- |
| `system:ready` | I servizi scelti per tutti, come sistema | Il kernel li avvia dopo aver iniziato ad ascoltare |
| `user:login` | I servizi che l'utente ha scelto, come lui, se non ha spento l'interruttore (`enabled`) | La **prima richiesta** di quell'utente in questa esecuzione del kernel (`principalOf`), o il suo accesso (`POST /api/session`): anche una sessione ancora valida conta. Quando esce (`DELETE /api/session`) i suoi servizi si fermano e al prossimo ingresso ripartono |
| a mano o a chiamata | Quello indicato | `start` / `restart`, o una chiamata (`lilos.apps.call`, `services.call`) a un servizio spento: poi resta acceso, finché non lo si ferma o finché il proprietario non esce |

Un servizio **scelto per tutti** gira solo come sistema: chiamate e comandi vanno a quell'istanza, e solo gli amministratori lo avviano, fermano o ne leggono il registro. Sceglierlo (o toglierlo dalla scelta di tutti) lo fanno solo gli amministratori.

**Cosa riceve.** La funzione esportata col nome del punto d'ingresso, come per un background: `export function sync({ lilos, args })`. `args` è `{ reason, ...params }`: `reason` è `'system:ready'`, `'user:login'`, `'manual'` o `'call'`; `params` sono i parametri scelti (controllati contro quelli dichiarati nel manifesto, con i predefiniti riempiti; stessi tipi di [Parametri dei punti d'ingresso](#parametri-dei-punti-dingresso); `file` e `folder` sono percorsi `~/…`). Senza `params` dichiarati: un oggetto JSON fino a 4 KB.

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

**Interfaccia (`AppServices`).** Eventi `change` `{ owner, app, entry }` e `notify` `{ owner, app, text }`.

| Metodo | Cosa fa |
| --- | --- |
| `available` | `true` se c'è il servizio `runtime` |
| `catalog()` | I servizi delle app installate |
| `list(principal)` | Ciò che mostra Sistema: `{ available, enabled, admin, services }`, ciascuno `{ app, entry, label, name, glyph, color, params, startup: 'none' \| 'login' \| 'system', values, system, canControl, status, since, error }` |
| `setStartup(principal, app, entry, { when, params? })` | `when`: `'none'`, `'login'` (per l'utente) o `'system'` (per tutti: amministratori). Senza `params` tiene quelli già scelti. Passando da utente a sistema (o viceversa) ferma l'istanza che non vale più e, se era accesa (non `off` né `error`), la fa ripartire subito nell'altra forma (motivo `manual`) |
| `setOptions(principal, { enabled })` | Interruttore dei servizi dell'utente |
| `control(principal, app, entry, action)` | `'start'`, `'stop'` o `'restart'` → `{ status, error }`. `start` su un servizio in `error` lo riavvia da capo |
| `call(principal, app, entry, data, from)` | Avvia se serve e dà ciò che restituisce il suo `lilos.handle` (un errore del servizio è `invalid`, un servizio che non parte `unavailable`; massimo 60 s) |
| `log(principal, app, entry)` | `{ lines: [{ at, level, text }] }` |
| `userSeen(principal)`, `userLeft(userId)`, `systemReady()`, `stopAll()` | I momenti descritti sopra, e l'arresto del kernel |

`kernel.stop()` ferma tutti i servizi e chiude anche le connessioni aperte (i flussi di `/api/services-events` altrimenti terrebbero il server acceso).

**`lilos` dentro un servizio** (`apps/serviceApi.js`). Il codice gira in un isolato V8 senza DOM, senza `import`, senza `fetch` né `require`: ha solo `lilos` (congelato), `console`, `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`. Ogni richiesta passa dal kernel, che la controlla con i permessi dell'app e la esegue per il proprietario.

| Funzione | Descrizione |
| --- | --- |
| `lilos.app` | `{ id, version, entry, args, user }`: `user` è `{ id, username, name }`, o `null` per un servizio di sistema |
| `lilos.handle(fn)` | `fn(data, from)` risponde alle chiamate: `from` è l'id dell'app che chiama o `null` (a differenza dei background, **`from` è direttamente l'id**, non un oggetto `{ from }`). Il valore restituito (JSON) torna a chi chiama. Senza `handle` le chiamate falliscono |
| `lilos.storage.get(chiave)` → valore o `null`; `lilos.storage.set(chiave, valore)` | Dati propri. Chiavi `[\w.-]{1,64}`, fino a 256 KB per valore. Per un utente: gli stessi dati delle finestre (lilOS li rilegge **solo al ricaricamento**). Per il sistema: un solo file di 1 MB |
| `lilos.locale` | `{ code, i18n }` come nelle finestre ([`lilos.locale`](#liloslocale)), con le stringhe dell'app nella lingua dell'utente a cui appartiene il servizio (la chiave `locale`; `'en'` se non c'è) o in inglese per un servizio di sistema. **Fissate all'avvio**: non cambiano finché il servizio non riparte, e non c'è l'evento `locale`. Il file di traduzioni si rilegge dal pacchetto a ogni avvio, con l'hash del manifesto; se non si legge o non è valido, il servizio è in inglese e il kernel scrive un avviso nel proprio log |
| `lilos.files.read(percorso)` → testo; `write(percorso, testo)`; `list(percorso)` → `[{ name, type, size, modified }]`; `mkdir(percorso)` | Percorsi `~/…`, con `fs.read` o `fs.write` come per le finestre (testo fino a 10 milioni di caratteri; `list` nasconde i nomi che iniziano con un punto). **Solo per un servizio di un utente**: nel sistema falliscono con `forbidden`. I file creati si vedono in lilOS dopo un ricaricamento |
| `lilos.net.fetch(url, { method, headers, body })` → `{ status, headers, body }` | Solo le origini dei permessi `net:`; metodi GET, HEAD, POST, PUT, PATCH, DELETE; non segue i reindirizzamenti; `cookie` e `host` si scartano; corpo e risposta di testo fino a 5 MB; 30 s |
| `lilos.apps.updates()` → `[{ id, name, version, latest, repo }]` | Le app installate che hanno una versione più nuova nel repository da cui vengono (`name` e `latest` dal catalogo, `version` è l'installata, `repo` il nome del repository o `''`). Serve il permesso `apps.manage`, altrimenti `forbidden`. Confronta gli indirizzi dei repository normalizzati; un catalogo che non si legge si riprova una volta, poi si salta (con un avviso nel registro del kernel). Può durare a lungo: non aspettarlo all'avvio |
| `lilos.ui.notify(testo)` | Un avviso (fino a 200 caratteri) nel lilOS del proprietario: l'utente stesso, o gli amministratori per un servizio di sistema. Arriva solo se lilOS è aperto |
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

**Un servizio in un'app di sistema.** Nel repository dei plugin ufficiali un servizio sta in `src/<app>/services/<nome>.js`, un modulo **senza `import`** (gira nell'isolato del kernel, che non ne ha). `scripts/build.mjs` copia ogni `.js` di quella cartella in `apps/<id>/dist/`, così com'è e senza passare da Vite, e lo mette tra i `files` del manifesto. In `app.json` si dichiara con `"file": "dist/<nome>.js"`: l'app può avere `sdk` `"1"`. Esempio reale, il servizio `updates` dell'AppStore (`src/appstore/services/updates.js`, permessi `apps.manage` e `background`):

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

`connectServices()` (chiamata da `system.js`, solo con il kernel e se c'è `EventSource`) apre `/api/services-events`: gli eventi `change` diventano eventi di `services`, e ogni `notify` diventa un avviso (`toast`, 6 secondi) del tipo `<nome dell'app>: <testo>` (l'id se l'app non è nel registro). Lo chiude all'uscita dell'utente.

### `services-isolate_1.0.0`

Modulo del kernel che fornisce `runtime` (`modules/services-isolate_1.0.0/`; attivo in `config.json`). Configurazione: nessuna. Richiede Node da 22 a 25 (`isolated-vm` 6.2.0, con i binari già compilati); le sue dipendenze si installano con `npm run kernel:setup`.

- **Un processo Node per servizio** (`runner.js`), avviato con `--permission`: legge solo la cartella del modulo (`--allow-fs-read`), non può avviare programmi né worker; `--allow-addons` serve a `isolated-vm`. L'ambiente del processo è vuoto (solo `SystemRoot`).
- **Il codice dell'app** gira in un isolato V8 dentro quel processo, con **128 MB** di memoria e **10 secondi** per ogni esecuzione (avvio, ogni chiamata, ogni timer). Non ha `import` (un `import` fa fallire l'avvio), `require`, `process`, rete né file.
- Un'esecuzione oltre i 10 s, un errore all'avvio, la memoria esaurita o un crash fermano solo quel servizio: `host.exit(motivo)` e il gestore lo fa ripartire. Una chiamata senza risposta in 60 s fallisce.
- Fermare un servizio manda `stop` al processo e, dopo 2 s, lo termina. `stop()` del modulo termina tutti i processi.

Interfaccia `runtime`: vedi [Servizi (`services.js`)](#servizi-servicesjs).

---

## Eventi del bus

| Evento | Payload | Emesso da | Gestito da |
| --- | --- | --- | --- |
| `app:launch` | `{ id, args, entry?, files? }` | `launch()`: menu di avvio, collegamenti sul desktop, `callEntrypoint`, avvio automatico. `entry`: un punto d'ingresso di tipo finestra (`'main'` se manca). `files`: id di file che l'utente consegna all'app (`[]` se manca); un'app installata può leggerli e scriverli | `connectLauncher` (`apps/launcher.js`) |
| `item:open` | nodo del file system | `Desktop.open()` per cartelle e file | `system.js`: le cartelle si aprono nel File Manager (`launch('files', { folder })`), i file con `openFile` |
| `system:ready` | `{ at }` (`Date.now()`) | `system.js`, una volta per pagina, quando le finestre salvate del primo workspace (`workspaces.ready`) e delle workarea aperte (`workareas.ready`) sono tornate | Chi vuole partire con il sistema. I servizi del kernel **non** passano da qui: il kernel ha i suoi momenti `system:ready` e `user:login` (vedi [Servizi delle app](#servizi-delle-app-appsappservicesjs)), che non dipendono da una pagina aperta |
| `user:login` | `{ user, workspace }` (`kernel.data.user` o `null`; id del workspace attuale o `null`) | `system.js`, subito dopo `system:ready` | `connectStartup` (`apps/startup.js`): apre le app dell'avvio |

Quando aggiungi un evento, documentalo qui e nel commento in testa a `sdk/core/events.js`.

Gli eventi di `kernel` (`status`, `signedout`), `apps` (`change`) e `registry` (`change`) non passano dal bus: sono degli `Emitter` di quei moduli.

---

## Dati salvati

Tutte le chiavi hanno il prefisso `lilos:`, che è quello di `localStorage`. Collegato al kernel (come fa il sistema) le chiavi non stanno nel browser: ogni chiave è un file JSON, senza prefisso, nella cartella `.config` dell'utente, nel database del kernel (`lilos:camera` è la chiave `camera`). Per questo `localStorage.clear()` non azzera nulla; per ripartire vedi [l'avvio](README.md#avvio). Lo stesso vale per `lilos:fs` e per il contenuto dei file, che con il kernel sono nodi della cartella dell'utente. Le sole cose che il sistema tiene nel browser sono la copia dei contenuti (IndexedDB `lilos:<id utente>`, cancellata all'uscita) e, finché non vengono portati nell'account, i dati di prima del kernel.

### `lilos:workspaces`

I workspace, con quello attuale:

```json
{
  "current": "m1x2a0k3f",
  "list": [
    { "id": "m1x2a0k3f", "name": "Principale", "color": "#3b6ef5", "created": 1793180000000,
      "desk": "m1x2a0k3g", "apps": ["editor", "esempio.note"], "known": ["files", "editor", "settings", "esempio.note"] },
    { "id": "m1x2d9e8c", "name": "Cliente Rossi", "color": "#30a46c", "created": 1793190000000, "removed": 1793200000000 }
  ]
}
```

| Campo | Significato |
| --- | --- |
| `id` | Identificativo; è anche il `workspace` dei nodi che ha creato. |
| `desk` | Id della sua cartella Scrivania (privata). Solo nei workspace vivi. |
| `apps` | Id delle app **visibili** nel workspace (le installate in lilOS e non nascoste). Le app `system` (File Manager, Sistema) sono sempre visibili e non serve elencarle. Una nuova voce senza `apps` le ha tutte. |
| `known` | Id delle app che lilOS aveva all'ultimo salvataggio. Alla lettura, le app del registro che non ci sono vengono aggiunte ad `apps`: un'app nuova arriva visibile, una nascosta dall'utente resta nascosta. Senza `known` (dati di prima) si considerano note tutte le app del registro. |
| `removed` | Data di eliminazione. Una voce "rimossa" non ha `desk` né `apps`: resta solo perché i file creati da quel workspace dicano ancora di chi erano (File Manager mostra «Nome (eliminato)»). |

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

Impostazioni dell'Editor (motori di evidenziazione, grammatiche aggiunte, language server esterni, schemi JSON): le scrive e le valida l'app Editor (`lang/config.js`, nel repository ufficiale). Il sistema non le legge.

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

Vista del File Manager: `"list"` o `"grid"`.

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

### `lilos:settings`

Oggetto con le impostazioni (vedi `settings` e `systemSettings.js`):

```json
{ "accent": "#30a46c", "motion": true, "snap": true, "minimap": true, "deleteConfirm": true, "deletePermanent": false, "trashRetention": 30 }
```

Le chiavi non dichiarate e i valori di tipo diverso dal predefinito vengono ignorati.

### `startup-apps`

### `locale`

La lingua del sistema scelta dall'utente, già risolta (`'it-IT'`; mai `'auto'`). La scrive l'SDK (`locale`, a ogni avvio e a ogni cambio) e la legge il **kernel**, che con essa decide la lingua dei servizi dell'utente (`apps/appServices.js`, `readUserKey(…, 'locale', 'en')`); un valore che non è un testo vale `'en'`. Come le altre chiavi è `lilos:locale` nel browser, o il file `locale` nella `.config` dell'utente. La scelta dell'utente è l'impostazione `language` (`'auto'` o un tag), dentro [`lilos:settings`](#lilossettings).

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
