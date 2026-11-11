# Finestre

Una **finestra** (file `.lsui`, nella cartella `ui/` del progetto) è l'interfaccia del programma: etichette, valori, pulsanti, campi, grafici, messi dentro dei contenitori. Le finestre dei progetti le apre **lilOS**, non l'IDE: quando un programma attivo ha finestre, compaiono nella scheda **Progetti** del menu delle applicazioni. Nell'IDE le disegni e le provi.

Ogni progetto ha una **finestra main**: è quella che si apre dal menu delle applicazioni. Uno schema da solo non ha finestre.

## L'editor

Un clic su una finestra nell'elenco **Progetto** la apre in una scheda. Al centro vedi la finestra disegnata **alla sua dimensione vera**, con la barra del titolo. A sinistra la scheda **Componenti** (al posto di **Blocchi**). La barra in alto ha due pulsanti in più:

| Pulsante | Cosa fa |
|---|---|
| **Progetta** | Il modo per costruire: le componenti non reagiscono, i contenitori mostrano dove vanno le cose, un clic seleziona. |
| **Anteprima** | La finestra funziona come quella vera: puoi premere, scrivere, scegliere. Con una prova in corso è **dal vivo** (vedi sotto). |

La barra di stato dice «8 componenti / 200 · 480 × 360» (le componenti che hanno porte, il limite, la dimensione).

### Ridimensionare con il mouse

La finestra si ridimensiona trascinando il **bordo destro**, il **bordo in basso** o l'**angolo in basso a destra** (quello con le righe oblique), sia in **Progetta** sia in **Anteprima**. Mentre trascini, un'etichetta mostra la dimensione (`420 × 300`); quando lasci il mouse la dimensione va in **Larghezza (px)** e **Altezza (px)** e si annulla con **Ctrl+Z** in un passo solo. La dimensione è quella del **contenuto**: la barra del titolo (30 pixel) è in più, come nella finestra vera. Non scende sotto 160 × 120 e non va oltre 4000 × 4000.

Si può ridimensionare anche se **L'utente può ridimensionarla** è tolta: quella casella vale per chi usa l'app, non per chi la disegna.

Nella barra del titolo disegnata, accanto al titolo, delle etichette ricordano come si apre la finestra: **Estesa**, **Dialogo**, **In primo piano** (vedi sotto).

## Le componenti

La scheda **Componenti** elenca le componenti dei pacchetti installati, divise in **Testo e valori**, **Comandi**, **Contenitori** e **Grafici** (comprimibili con un clic sul nome, come i [blocchi](ide/schemas)), con una ricerca (**Cerca…**). Le componenti di base sono in [Componenti UI](logicstudio-ui), i grafici in [Grafici](logicstudio-charts).

### Aggiungere

- **Un clic** su una componente la aggiunge:
  - dentro il **contenitore selezionato**, in fondo;
  - se è selezionata una componente che non è un contenitore, **subito dopo** di lei, nel suo contenitore;
  - se non c'è niente di selezionato, in fondo alla finestra.
- **Trascinandola** sulla finestra, una **linea blu** mostra dove andrà (in una **Riga** la linea è verticale, negli altri contenitori orizzontale); il contenitore che la riceve è evidenziato. In un'**Area libera** non c'è la linea: la componente va nel punto dove la lasci.
- Se eri in **Anteprima**, l'editor torna in **Progetta**.

La componente nuova ha le proprietà di serie e un id fatto dal suo tipo e da un numero (`button1`, `label2`). La componente aggiunta resta selezionata.

### Selezionare, spostare, eliminare

In **Progetta**:

- **clic** su una componente: la seleziona (contorno) e mostra le sue Proprietà; clic sul fondo della finestra: niente di selezionato;
- **trascina** una componente (almeno 5 pixel): la sposti dove mostra la linea blu, anche in un altro contenitore, ma mai dentro se stessa; in un'Area libera la metti nel punto dove la lasci;
- **Canc** o **Backspace**: elimina la componente selezionata (e quello che contiene); **Esc**: toglie la selezione;
- **doppio clic**: apre lo schema con l'**oggetto** della componente e lo seleziona, se l'oggetto c'è.

Eliminando una componente che ha un oggetto in uno schema, l'IDE chiede **Eliminare la componente?** — «Il suo oggetto nello schema «main» resta lì e segna un errore finché non togli anche quello.»

Ogni cambiamento si annulla con **Ctrl+Z**.

## I contenitori

La finestra è una **Colonna** (quella di fondo, che non si seleziona e non si toglie). Dentro metti componenti e altri contenitori, fino a 32 livelli.

| Contenitore | Come dispone quello che contiene |
|---|---|
| **Colonna** | Uno sotto l'altro. |
| **Riga** | Uno accanto all'altro; con **Va a capo se serve** passa alla riga sotto. |
| **Griglia** | In colonne (**Colonne**, 0 = automatiche). |
| **Riquadro** | Uno sotto l'altro, dentro una cornice con **Titolo**. |
| **Schede** | Ogni elemento contenuto è una **scheda**: il primo è la prima scheda, il secondo la seconda… I nomi sono in **Nomi delle schede (separati da virgola)**. In **Progetta** vedi tutte le schede una sotto l'altra. Metti una **Colonna** per ogni scheda. |
| **Area libera** | Ognuno nella posizione dove lo lasci (in pixel dall'angolo in alto a sinistra), con altezza **Altezza (px)**. |
| **Separatore** | Non contiene niente: è una linea o uno spazio tra due componenti (sta tra i contenitori nella palette). |

## Le Proprietà

### Niente selezionato: la finestra

| Campo | Regole |
|---|---|
| **Titolo** | Il titolo della finestra, al massimo 120 caratteri. Vuoto: il nome della finestra. |
| **Larghezza (px)** | Da 160 a 4000. |
| **Altezza (px)** | Da 120 a 4000. |
| **L'utente può ridimensionarla** | Se tolta, la finestra ha la dimensione fissa. |

Larghezza e altezza si cambiano anche trascinando i bordi della finestra (vedi [Ridimensionare con il mouse](ide/windows)).

Poi **All'apertura**, come lilOS apre la finestra:

| Campo | Cosa fa |
|---|---|
| **Stato** | **Normale** (di serie): la finestra si apre con la sua dimensione. **Estesa**: si apre ingrandita, grande quanto lo schermo, come con il pulsante per ingrandire; l'utente la può riportare alla dimensione normale con lo stesso pulsante o con un doppio clic sulla barra del titolo. |
| **Finestra di dialogo** | Finché è aperta, le **altre finestre dell'app aperte prima di lei** non si possono usare: un clic su una di loro (o sul suo pulsante nella barra delle applicazioni, o **Alt N**) porta avanti la finestra di dialogo, che lampeggia. Si coprono di un velo grigio. Quando la finestra di dialogo si chiude tornano normali. Le finestre aperte **dopo** (per esempio da un pulsante della finestra di dialogo) si usano; una finestra di dialogo aperta da un'altra finestra di dialogo blocca anche quella. Le console del programma e le altre app restano libere. |
| **Sempre in primo piano** | La finestra resta sopra tutte le finestre che non sono in primo piano, anche quando si usa un'altra. |

Poi **Si apre da**: **Menu applicazioni (finestra main)**, **Si apre solo da altre finestre dell'app** o il punto d'ingresso scelto nelle **Opzioni del progetto → Finestre** (vedi [Progetti](ide/projects)). E il suggerimento: «Aggiungi le componenti dalla tavolozza a sinistra: un clic la mette nel contenitore selezionato, trascinandola va dove mostra la linea blu.»

### Una componente

- In alto: il nome della componente e, a destra, il suo **id** (quello che usano gli schemi).
- **Impostazioni**: le proprietà della componente. I tipi di controllo:

| Controllo | Come si usa |
|---|---|
| Testo | Al massimo 2000 caratteri (nella finestra vera al massimo 4000). |
| Numero | Nei limiti della proprietà; vuoto vuol dire il valore di serie. Un numero fuori dai limiti viene portato al limite. |
| Casella | Sì o no. |
| Scelta | Un elenco (per esempio **Dimensione**: piccolo, normale, titolo; **Allineamento**: inizio, centro, fine, tutta la larghezza; **Aspetto**: principale, normale, pericolo). |
| Icona | Un'icona da un elenco (— vuol dire nessuna). |
| Console | Una console del progetto. |
| Risorsa | Un file della cartella `risorse/` (— vuol dire nessuno), per esempio per **Immagine**. |
| Azione al clic | Vedi sotto. |

- **Porte**: le porte della componente, che userai attraverso il suo oggetto: **←** è quello che imposta uno schema (per esempio **testo**, **abilitato**, **visibile**), **→** è quello che fa l'utente (per esempio **premuto**, **valore**). «← quello che imposta uno schema, → quello che fa l'utente. Gli schemi raggiungono la componente con il suo oggetto.»
- **Oggetto nello schema**: dove sta il suo oggetto, con **Aprilo nello schema**; oppure «Nessuno schema ha ancora il suo oggetto: senza, la componente si vede ma non fa niente.» con **Nello schema** e **Crea il suo oggetto**. Vedi [L'oggetto di una componente](ide/components).
- **Elimina la componente**.

I contenitori non hanno le sezioni Porte e Oggetto nello schema.

## L'azione al clic di un pulsante

Il **Pulsante** ha la proprietà **Azione al clic**:

| Scelta | Cosa fa |
|---|---|
| **Niente** | Solo **premuto** al suo oggetto. |
| **Apri una finestra** | Apre un'altra finestra del progetto (scegli quale nel secondo elenco). Se è già aperta, la porta davanti. |
| **Chiudi questa finestra** | Chiude la finestra del pulsante. |

«Manda anche «premuto» al suo oggetto nello schema.»: l'azione si aggiunge, non sostituisce.

## Anteprima e prova dal vivo

- In **Anteprima**, senza prova: la finestra reagisce (un interruttore si accende, un campo si scrive), ma non c'è un programma che risponde.
- In **Anteprima** con una **prova in corso**: la finestra è **legata alla prova**. I valori che gli schemi mandano alle componenti si vedono, e quello che fai (premere, scrivere, muovere un cursore) arriva agli oggetti negli schemi. È il modo per provare le finestre nell'IDE: la prova **non apre** le finestre del progetto da sola.
- Un pulsante con **Apri una finestra** apre l'altra finestra in una finestra di lilOS con sottotitolo **Anteprima**, anche lei legata alla prova, aperta come quella vera: **Estesa**, **Finestra di dialogo** e **Sempre in primo piano** valgono anche qui. Una finestra di dialogo in anteprima blocca le finestre dell'IDE finché non la chiudi. **Chiudi questa finestra** in anteprima non fa niente.
- Durante una prova puoi anche aprire le finestre vere dalla Home: **I miei programmi** → **Apri la finestra**.

## Traduzioni

I testi che scrivi nelle proprietà (etichette, testi dei pulsanti, nomi delle schede) si mostrano come li hai scritti. Il progetto può avere una tabella di traduzioni (`texts` nel `.lsproj`, vedi [Formati dei file](ide/formats)): se per la lingua di chi apre la finestra c'è la traduzione di un testo, si vede quella. Per ora l'IDE non ha un posto dove scriverle: si aggiungono a mano nel file.

## Limiti

| Cosa | Al massimo (di serie) |
|---|---|
| Componenti per finestra | 200 (contando anche i contenitori e la colonna di fondo) |
| Finestre per progetto | 10 |
| Contenitori uno dentro l'altro | 32 livelli |
| Larghezza e altezza | 4000 pixel |

Quando la finestra è piena compare **Al massimo 200 componenti per finestra**. Il numero nella barra di stato conta solo le componenti con porte, non i contenitori: la finestra può essere piena anche se la barra dice meno di 200.

Una componente di un pacchetto non installato si vede come un riquadro con il suo tipo e un segno di avviso; selezionandola le Proprietà dicono «Questa componente (charts.line) viene da un pacchetto che non è installato.»

## Esempi

### 1. Una finestra con un saluto

1. Apri la finestra **Principale**. Nelle Proprietà (niente selezionato) metti **Titolo** = `Saluti`, **Larghezza (px)** = `360`, **Altezza (px)** = `200`.
2. Dalla scheda **Componenti** fai clic su **Campo di testo** (proprietà **Etichetta** = `Il tuo nome`), poi su **Pulsante** (**Testo** = `Saluta`), poi su **Etichetta** (**Testo** vuoto).
3. Per ognuna delle tre, nelle Proprietà, lascia **Nello schema** = **main** e premi **Crea il suo oggetto**: l'IDE apre lo schema con l'oggetto nuovo.
4. Nello schema **main** aggiungi un **Template**. Nelle sue Proprietà premi due volte **Aggiungi ingresso** e rinomina le porte in `nome` e `via`; togli **lo avvia** da `nome`; scrivi il **Modello** `Ciao, {nome}!`.
5. Collega:

```
[Campo di testo] testo ──▶ nome [Template (formatta): «Ciao, {nome}!»] testo ──▶ testo [Etichetta]
[Pulsante: Saluta] premuto ──▶ via
```

6. Premi **Prova**, torna sulla scheda della finestra e scegli **Anteprima**. Scrivi `Ada` e premi **Saluta**: l'etichetta mostra «Ciao, Ada!».

Il campo di testo manda il nome a ogni cambiamento, ma **nome** non avvia il blocco: il saluto cambia solo quando arriva l'impulso del pulsante su **via**.

### 2. Due schede

1. Aggiungi un contenitore **Schede**, con **Nomi delle schede** = `Stato, Comandi`.
2. Con **Schede** selezionato fai clic su **Colonna**: è la prima scheda (e ora è selezionata lei). Seleziona di nuovo **Schede** e fai clic ancora su **Colonna**: è la seconda. Se non riselezioni **Schede**, la seconda Colonna finisce dentro la prima.
3. Seleziona la prima Colonna e aggiungi un **Indicatore** e una **Spia**; seleziona la seconda e aggiungi due **Pulsanti**.
4. In **Anteprima** prova a cambiare scheda.

### 3. Una seconda finestra

1. Crea la finestra **Dettagli** dall'elenco **Progetto** (**+** accanto a **Finestre**).
2. Nella finestra **Principale** aggiungi un **Pulsante** con **Testo** = `Dettagli…` e **Azione al clic** = **Apri una finestra** → **Dettagli**.
3. Nella finestra **Dettagli** aggiungi un **Pulsante** con **Testo** = `Chiudi` e **Azione al clic** = **Chiudi questa finestra**.

Senza nessuno schema, i due pulsanti già aprono e chiudono la finestra quando il progetto gira.

### 4. Una finestra di dialogo

1. Crea la finestra **Conferma** e, nelle sue Proprietà (niente selezionato), metti **Larghezza (px)** = `320`, **Altezza (px)** = `120` (o trascina l'angolo finché l'etichetta dice `320 × 120`), togli **L'utente può ridimensionarla** e spunta **Finestra di dialogo** e **Sempre in primo piano**. Nella barra del titolo disegnata compaiono **Dialogo** e **In primo piano**.
2. Aggiungi un'**Etichetta** con **Testo** = `Azzerare i contatori?` e un **Pulsante** `Sì` con **Azione al clic** = **Chiudi questa finestra** (e il suo oggetto nello schema, per fare l'azzeramento su **premuto**).
3. Nella finestra **Principale** aggiungi un **Pulsante** `Azzera…` con **Azione al clic** = **Apri una finestra** → **Conferma**.

Quando il progetto gira, finché **Conferma** è aperta la finestra **Principale** non risponde: un clic su di lei fa lampeggiare **Conferma**.

## Vedi anche

- [L'oggetto di una componente](ide/components)
- [Componenti UI](logicstudio-ui)
- [Grafici](logicstudio-charts)
- [Opzioni del progetto](ide/projects)
