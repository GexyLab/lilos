# Convenzioni

## Lingua

- **Interfaccia di lilOS** (testi visibili, tooltip, `aria-label`): italiano. Non è ancora tradotta.
- **Interfaccia delle app**: i testi visibili si scrivono con `t()` da `lilos.locale.i18n` (o `locale.forApp(id).i18n` per le app di sistema), in un `locales.json` con inglese obbligatorio; i testi del manifesto sono in inglese, con le traduzioni nelle chiavi `@`. Vedi [Traduzioni delle app](api.md#traduzioni-delle-app-sdkcorelocalejs-e-sdkcorei18njs).
- **Codice** (nomi di variabili, funzioni, classi) e **commenti**: inglese.
- **Documentazione e messaggi di commit**: italiano.

## JavaScript

- Moduli ES, un componente per file. Le classi hanno il nome in PascalCase e il file si chiama come la classe (`Canvas.js`); i moduli di funzioni sono in camelCase (`fileTypes.js`).
- Nessun framework. Il DOM si crea con `h()` e `svg()` dell'SDK.
- Le basi riutilizzabili stanno nell'SDK (`sdk/`) e si importano solo da `@lilos/sdk`. Il codice in `sdk/` non importa mai da `src/`. Regole complete in [sdk/README.md](../../sdk/README.md#regole).
- Un componente crea il proprio DOM, lo espone in `this.el` e, se ha senso, lo aggiunge da solo al genitore che riceve nel costruttore.
- Stato e metodi interni sono privati con `#`. Le proprietà pubbliche sono quelle che altri moduli usano davvero.
- Eventi: un componente che ha qualcosa da notificare estende `Emitter`. Le richieste che attraversano il sistema passano dal `bus`.
- Commenti brevi: una riga JSDoc sopra le funzioni pubbliche che non si spiegano da sole, e un commento solo dove il *perché* non è ovvio (per esempio "Capture phase: panning wins over whatever object is under the pointer").
- Costanti numeriche in testa al file, in MAIUSCOLO (`SNAP`, `CELL`, `MIN_ZOOM`).
- Funzioni freccia per callback brevi, `function` per le funzioni esportate.

## CSS

- Stili dell'SDK in `sdk/styles/`, importati da `sdk/styles/index.css`. Stili del sistema in `src/styles/`, uno per area, importati da `system.js`.
- Colori, raggi, ombre e font vengono da `sdk/styles/tokens.css`. Un valore nuovo che si ripete diventa un token.
- **Nessun colore scritto a mano**: altrimenti non segue il tema chiaro/scuro. Per le superfici delle finestre usa `--surface`, `--side`, `--field-bg`, `--text`, `--border`…; per scrivania e barra `--canvas`, `--bar*`, `--panel*`. Il bianco va bene solo per il testo su `--accent` o `--danger`.
- Classi brevi con un prefisso per area: `tb-` barra, `sm-` menu di avvio, `mm-` minimappa, `ditem` elementi del desktop.
- Interfaccia densa: testi a 11,5–12,5 px, spaziature piccole. La priorità è lo spazio di lavoro.
- `user-select: none` è impostato su `body`: riattivalo (`user-select: text`) dove serve selezionare testo.

## Dipendenze

- Solo quando servono davvero, con una decisione registrata in [Decisioni](../interna/decisioni.md).
- **Versioni esatte** in `package.json` (`--save-exact`), pubblicate da almeno due settimane, licenza compatibile, **senza script di installazione**. Pacchetti con script di compilazione nativa (come le grammatiche Tree-sitter dell'Editor) non diventano dipendenze: se ne copiano i file necessari con uno script (l'Editor lo fa nel repository ufficiale, con `npm run vendor:tree-sitter`). Lo stesso vale per i moduli del kernel: il kernel li installa con `--ignore-scripts`. lilOS stesso non ha dipendenze a runtime; quelle delle app di sistema stanno nel repository ufficiale.
- Caricate al bisogno con `import()` dall'app che le usa, mai dall'avvio del sistema.

## Sicurezza

- Il testo dell'utente (nomi di file, contenuti) va nel DOM **solo** come stringa figlia di `h()` o con `textContent`. Mai `innerHTML` con dati dell'utente.
- `svg()` riceve solo markup statico scritto nel codice. Se un valore dinamico deve finire in un SVG, va ripulito prima: `fileIcon` per esempio limita l'estensione a `[A-Z0-9]` e prende il colore da una tabella fissa.
- I dati letti da `storage` vanno validati prima dell'uso.
- **Kernel**: ogni modulo valida ciò che riceve (il kernel limita solo la forma); un errore voluto si lancia con `ctx.fail(codice, messaggio)` (messaggio in italiano, pensato per l'utente), mai con il testo di un errore interno. Un modulo `fs` controlla gli accessi dentro di sé. Nessun segreto nei file del repository: `users.json`, `repos.json`, chiavi `.pem` e token restano fuori da git. Le richieste che modificano passano da `kernel.request` (aggiunge `X-Lilos: 1`).
- **App installate**: il codice di un'app gira nella pagina di lilOS solo se è un'app di sistema (`system: true`), che il kernel accetta solo dal repository ufficiale e che gira dentro lilOS senza sandbox (tratta quel repository come parte di lilOS: stesse revisioni, nessun codice di terzi), **oppure** se un amministratore ha scelto la modalità non isolata per quell'app o per tutte (`sdk` `"2"`): in quel caso l'app può fare tutto ciò che fa l'utente, quindi non scrivere codice che dia per scontati i limiti della sandbox, e chi riceve dati da un'altra app (`lilos.handle`) li controlla sempre. Il predefinito resta isolato.
- Script e fogli di stile esterni: oggi solo Google Fonts in `index.html`. Prima di aggiungerne altri, valuta di includerli come dipendenza npm.

## Accessibilità

- I pulsanti con sola icona hanno `aria-label` e `title`.
- Un pulsante che avvia un'operazione da aspettare (rete, kernel, salvataggio) mostra la rotella accanto all'etichetta finché non finisce: `busyButton`, `actionButton({ spinner: true })` o `aria-busy="true"` a mano. Non quando si aspetta l'utente (una finestra di scelta).
- Le icone decorative hanno `aria-hidden="true"`, che `svg()` aggiunge da solo.
- I menu usano `role="menu"` e `role="menuitem"`; il menu di avvio usa `role="dialog"`, con una lista `role="listbox"` e opzioni con `aria-selected`.
- Ogni azione disponibile con il mouse deve avere un'alternativa da tastiera, oppure va segnalata come limite in [Stato e roadmap](../interna/stato-e-roadmap.md).
- Il focus deve restare visibile: `:focus-visible` mostra un bordo nel colore principale.

## Scorciatoie da tastiera

- Ogni scorciatoia è un comando registrato con `shortcuts.register` (vedi la [ricetta](ricette.md#aggiungere-una-scorciatoia-da-tastiera)): niente listener `keydown` per le scorciatoie.
- Nelle etichette usa `shortcuts.label(id)`, mai i tasti scritti a mano.
- I tasti di navigazione interni a un componente (frecce, Invio, Esc) restano nel componente; un componente che si apre sopra gli altri (menu, finestre di dialogo) ferma la propagazione dei tasti mentre è attivo.
- Se gestisci un tasto a mano, controlla `isEditing()` e usa `e.ctrlKey || e.metaKey` al posto del solo Ctrl.

## Git

- Ramo predefinito: `development` (c'è anche `production`).
- Messaggi di commit in italiano, con un titolo che descrive il risultato ("Aggiunge il gestore delle finestre"), seguito se serve da una riga vuota e dai dettagli.
- `node_modules` e `dist` non vanno nel repository.
