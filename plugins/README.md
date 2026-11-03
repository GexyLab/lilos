# App e moduli ufficiali di lilOS: i sorgenti

Qui ci sono i sorgenti delle app di sistema e dei moduli del kernel che lilOS installa dal repository ufficiale [lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official). Quel repository contiene solo i pacchetti pronti da installare, costruiti da qui. La storia di questi sorgenti prima del 3 novembre 2026 sta lì, fino al tag `v1.51.0`.

## Struttura

- `src/<app>/`: i sorgenti di ogni app.
  - `app.json` è il modello del manifesto.
  - `locales.json` contiene le traduzioni.
  - `README.md` è il testo che l'AppStore mostra nei dettagli dell'app: Markdown, niente HTML, le immagini non si caricano.
- `src/shared/`: il codice che le app condividono.
- `modules/<nome>/`: i sorgenti di ogni modulo del kernel: `module.json`, `index.js`, eventuali `lib/`, `package.json` con `package-lock.json`, `README.md`.
- `catalog.json`: l'elenco dei pacchetti del repository ufficiale.
- `build/`: i pacchetti costruiti. Non si committa.

In `app.json` il campo `category` decide in quale scheda dell'AppStore compare l'app. I valori sono `system`, `productivity`, `media`, `development` oppure `other` (il predefinito). `module.json` può avere `icon: { glyph, color }`.

Le app importano `@lilos/sdk` e `@lilos/system` senza includerli nel build: a runtime usano quelli di lilOS, serviti come `/host/sdk.js` e `/host/system.js`. `@lilos/system` è l'API che lilOS dà alle app di sistema (`src/systemApi.js` alla radice del repository).

## Costruire

In questa cartella: `npm install`, poi `npm run build`, oppure `npm run build -- editor term-ssh` per costruire solo alcuni pacchetti.

Uno stesso nome può indicare sia un'app sia un modulo, come `scheduler`. In quel caso si scrive `app/scheduler` o `module/scheduler`.

- **App** → `build/apps/<id>/`, che contiene:
  - `lilos.json`: il manifesto, con l'hash di ogni file, che il kernel controlla all'installazione;
  - `dist/`: Vite mette tutta l'app in un solo `index.js` minificato. Solo ciò che l'app carica quando serve (worker, wasm, le grammatiche dell'Editor) resta in file a parte;
  - `locales.json` e `README.md`.
- **Moduli del kernel** → `build/modules/<nome>/`.
  - Il codice del modulo (`index.js` con ciò che importa, come `lib/`) diventa un solo `index.js` minificato.
  - Un file `.js` in cima che `index.js` non importa viene unito a parte. Per esempio `runner.js` di services-isolate, che parte come processo a sé.
  - Gli altri file si copiano così come sono.
  - I pacchetti npm restano import: il kernel li installa con `npm ci` quando installa il modulo.

`--no-minify` lascia il codice leggibile; `--no-merge` copia il codice dei moduli così com'è.

## Pubblicare

```
npm run publish:repo -- <copia del repository> [app | modulo | lilos…] [--sources] [--no-minify] [--no-merge]
```

Senza nomi pubblica:
- ogni app e modulo con una versione diversa da quella del repository, o che il repository non ha;
- lilOS stesso, quando la versione del `package.json` alla radice non è quella di `system/lilos`. In questo caso chiama `npm run release` della radice.

Il comando:
- costruisce i pacchetti e li scrive in `apps/` e `modules/` del repository;
- aggiorna il suo `catalog.json`;
- stampa ogni pacchetto con la versione vecchia e quella nuova, che servono per `changelog/<tag>.md`.

Dopo restano da fare, nel repository di destinazione:
1. controllare i manifesti con `checkManifest` del kernel e provare l'installazione da una copia locale del repository;
2. scrivere `changelog/<tag>.md`;
3. commit, push e tag `vX.Y.Z`. Il kernel installa dalla versione più alta tra i tag.

Cosa ricevono i diversi repository:

| Repository | Pacchetti | Sorgenti |
|---|---|---|
| Ufficiale | uniti e minificati | mai (`--sources` è rifiutato) |
| Community | uniti e minificati | sempre (`--sources`) |
| Altri | come deciso caso per caso | come deciso caso per caso |

Nel repository di lilOS ogni modifica ha il suo tag:
- `vX.Y.Z` per lilOS;
- `app/<id>/vX.Y.Z` per un'app;
- `module/<nome>/vX.Y.Z` per un modulo.

Le grammatiche di Tree-sitter dell'Editor si aggiornano con `npm run vendor:tree-sitter`.

## Riconoscimenti

Ogni libreria, font o strumento di altri autori compare nel Pannello di controllo, in Informazioni → Riconoscimenti. L'elenco si legge da `src/settings/credits.json`.

Quando aggiungi, aggiorni o togli una dipendenza di un'app o di un modulo:
1. installa con `npm ci`, qui e in ogni modulo con un `package-lock.json`;
2. rigenera l'elenco con `npm run credits`;
3. ricostruisci il Pannello di controllo: `npm run build -- settings`.

In `scripts/credits.mjs`, il codice copiato nel repository (una cartella con la sua `LICENSE`) va in `VENDORED`, i font web in `FONTS`. I font di lilOS si leggono da `index.html` alla radice del repository.

`npm run build` e `npm run check:credits` si fermano se l'elenco non corrisponde ai `package-lock.json`, al codice copiato o ai font.
