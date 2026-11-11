# Logic Studio IDE

`logicstudio` · app di lilOS · richiede lilOS 1.40.0 o successivo

Logic Studio serve a costruire piccoli programmi **senza scrivere codice**. Metti dei **blocchi** su un foglio (lo **schema**) e li **colleghi** tra loro: i valori passano lungo i collegamenti e ogni blocco ci fa qualcosa. Un blocco somma due numeri, uno aspetta un secondo, uno scrive una riga in una console, uno ti manda una notifica. Con le **finestre** (pulsanti, campi, indicatori, grafici) il programma ha anche un'interfaccia, e può diventare un'app.

L'IDE è il posto dove disegni e provi. Chi fa girare i programmi è il **motore** ([Logic Studio Engine](logicstudio-engine)), un modulo del kernel: per questo un programma attivo va avanti anche quando chiudi l'IDE e anche quando chiudi lilOS nel browser.

## Le parole

| Parola | Cosa vuol dire |
|---|---|
| Blocco | Un pezzo che fa una cosa: un calcolo, un confronto, una pausa, una scrittura in console. |
| Porta | Un punto del blocco dove entra (a sinistra, **ingresso**) o esce (a destra, **uscita**) un valore. |
| Collegamento | Porta il valore dall'uscita di un blocco all'ingresso di un altro. |
| Schema | Un foglio di blocchi collegati. È un file `.lsch`. |
| Finestra | Un'interfaccia fatta di Componenti UI. È un file `.lsui`. |
| Oggetto di una componente | Il blocco che rappresenta una componente della finestra dentro uno schema. |
| Progetto | Schemi, finestre e risorse in una cartella, con un file `.lsproj`. |
| Console | Un posto dove il programma scrive righe e fa domande. |
| Prova | Il progetto che gira per qualche minuto, così com'è negli editor. |
| Programma attivo | Il progetto salvato che gira finché non lo fermi, anche a lilOS chiuso. |
| Pacchetto | Un modulo del kernel che porta blocchi o componenti. |

## Com'è fatta la finestra dell'IDE

```
┌ Home │ Mappa │ main │ Principale ───────────────────────────────────┐  schede degli editor
├ Salva │ ↶ ↷ │ ▶ Prova  ⏻ Attiva │ − 100% + Adatta    Mappa  Crea app…  ⚙ ┤  barra
├──────────────┬────────────────────────────────────┬──────────────────┤
│ Progetto     │                                    │ Proprietà        │
│ Blocchi      │        il foglio aperto            │                  │
│ (Componenti) │                                    │                  │
│              ├────────────────────────────────────┤                  │
│              │ ★ Principale │ + │ Problemi        │                  │  console e Problemi
├──────────────┴────────────────────────────────────┴──────────────────┤
│ Logic Studio Engine · 7 pacchetti   Blocchi 4 / 200 …   Progetto Serra │  barra di stato
└──────────────────────────────────────────────────────────────────────┘
```

- **In alto** le schede degli editor aperti: la **Home** (non si chiude), la **Mappa** del progetto, gli schemi e le finestre. Le schede si riordinano trascinandole; un pallino segna quelle con modifiche non salvate.
- **La barra** cambia con la scheda: vedi [Progetti](ide/projects) per i pulsanti comuni, [Schemi](ide/schemas) e [Finestre](ide/windows) per quelli di ogni editor.
- **A sinistra** due schede: **Progetto** (l'elenco di schemi, finestre e risorse) e **Blocchi**, che diventa **Componenti** quando la scheda aperta è una finestra.
- **A destra** le **Proprietà** di quello che hai selezionato.
- **In basso** una scheda per ogni console del progetto e la scheda **Problemi**.
- **In fondo** la barra di stato: se il motore risponde e quanti pacchetti ha, i numeri dell'editor aperto (blocchi e collegamenti, componenti, zoom), il tempo della prova in corso, il nome del progetto.

I due pannelli laterali si allargano e si stringono trascinando la barra tra loro e il foglio (da 170 a 480 pixel; un doppio clic sulla barra li rimette come all'inizio). La larghezza resta per le volte successive.

## La guida

| Pagina | Di cosa parla |
|---|---|
| [Progetti](ide/projects) | Creare, aprire, salvare, chiudere un progetto; l'elenco **Progetto**; le **Opzioni del progetto**. |
| [Schemi](ide/schemas) | L'editor degli schemi: mettere blocchi, selezionare, spostare, i menu, le Proprietà di un blocco, la **Mappa**. |
| [Collegamenti e tipi delle porte](ide/links) | Come si fanno e si tolgono i collegamenti, i tipi delle porte, quando un collegamento è segnato, i collegamenti tra schemi. |
| [Gruppi](ide/groups) | Raggruppare blocchi, la porta **Run**, le porte esposte, comprimere un gruppo in un blocco, il thread a parte. |
| [Come funziona un blocco](ide/blocks) | Ingressi, «lo avvia», valore iniziale, una cosa alla volta, l'uscita **Exception**, le porte aggiuntive, i cicli. |
| [Finestre](ide/windows) | L'editor delle finestre: Progetta e Anteprima, contenitori, proprietà, azioni dei pulsanti. |
| [L'oggetto di una componente](ide/components) | Come uno schema parla con una componente di una finestra. |
| [Console](ide/consoles) | Scrivere e chiedere; il pannello in basso; cosa fanno le console fuori dall'IDE. |
| [Prova e programmi attivi](ide/run) | Provare, vedere i valori dal vivo, i Problemi, attivare, fermare, i limiti. |
| [Fare un'app](ide/create-app) | **Crea app…**: un'app di lilOS fatta dal progetto. |
| [Formati dei file](ide/formats) | `.lsproj`, `.lsch`, `.lsui`, `.lsapp` in JSON, con esempi completi. |
| [Scorciatoie da tastiera](ide/shortcuts) | Tutti i tasti dell'IDE in una pagina. |
| [La documentazione](ide/docs) | Come si apre e si usa questa documentazione. |

## I pacchetti

I blocchi e le componenti arrivano dai **pacchetti**, moduli del kernel che si installano dall'**AppStore → Kernel**. Il motore e i blocchi di base si installano da soli con l'IDE, perché l'IDE ne ha bisogno; gli altri li aggiunge un amministratore quando servono. Ogni pacchetto ha la sua pagina con l'elenco dei suoi blocchi o delle sue componenti.

| Pacchetto | Cosa porta |
|---|---|
| [Blocchi di base](logicstudio-core) (`logicstudio-core`) | Valori, logica, matematica, testo, oggetti, tempo, le due console, le porte di schema, l'oggetto delle Componenti UI. Si installa con l'IDE. |
| [Liste e matrici](logicstudio-collections) (`logicstudio-collections`) | Blocchi per liste (ordina, filtra, per ogni elemento…) e matrici (prodotto, trasposta, determinante…). |
| [Costanti](logicstudio-constants) (`logicstudio-constants`) | Le costanti fondamentali: matematiche (π, e, sezione aurea…), fisiche CODATA 2022 (c, h, G, masse delle particelle…) con unità e incertezza, astronomiche e della Terra. |
| [Grandezze e unità](logicstudio-units) (`logicstudio-units`) | Conversioni tra unità di misura (lunghezza, massa, temperatura, pressione, energia, dati…), prefissi SI, leggere e scrivere misure come `12,5 km`. |
| [Geometria solida](logicstudio-solid) (`logicstudio-solid`) | Volumi, aree, diagonali e raggi di cubo, prisma, piramide, cilindro, cono, sfera e sue parti, poliedri regolari; massa da volume e materiale; punti, vettori, piani e coordinate nello spazio. |
| [Trigonometria](logicstudio-trig) (`logicstudio-trig`) | Seno, coseno, tangente e le loro inverse, funzioni iperboliche, angoli in gradi, radianti, gradi centesimali e giri, gradi primi secondi, triangoli rettangoli e qualsiasi, coordinate polari, onde. |
| [Funzioni e derivate](logicstudio-functions) (`logicstudio-functions`) | Funzioni scritte come testo (`3x^2 + 2sin(x)`): calcolarle, tabelle di valori, equazioni, polinomi e radici, esponenziali e logaritmi, derivate simboliche e numeriche, tangente, limiti, Taylor, studio di funzione. |
| [Integrali](logicstudio-integrals) (`logicstudio-integrals`) | Integrali definiti (anche impropri) e primitive, funzione integrale, valore medio, area tra curve, solidi di rotazione, lunghezza d'arco, integrali doppi e tripli, dati e segnali, equazioni differenziali. |
| [Segnali](logicstudio-signals) (`logicstudio-signals`) | Teoria dei segnali: generatori (seno, quadra, rumore, chirp…), FFT e IFFT, densità spettrale, spettrogramma, filtri IIR, FIR e biquad con la loro risposta in frequenza, convoluzione e correlazione, misure (RMS, THD, SNR), modulazione AM, FM e PM. |
| [Blocchi di lilOS](logicstudio-lilos) (`logicstudio-lilos`) | Notifiche, leggere e scrivere i file della tua home, elencare cartelle, eventi verso le pagine di lilOS. |
| [Rete](logicstudio-net) (`logicstudio-net`) | **HTTP** HTTP e HTTPS. |
| [Database (SQL)](logicstudio-db) (`logicstudio-db`) | PostgreSQL, MySQL e MariaDB, SQL Server, SQLite, Oracle, ClickHouse: query con parametri, tabelle senza SQL, transazioni, cursori. |
| [MongoDB](logicstudio-mongodb) (`logicstudio-mongodb`) | Trova, inserisci, aggiorna, elimina, aggrega e osserva i documenti di MongoDB. |
| [Redis](logicstudio-redis) (`logicstudio-redis`) | Chiavi, contatori, hash, liste e canali di Redis. |
| [InfluxDB](logicstudio-influxdb) (`logicstudio-influxdb`) | Scrivi punti e interroga le serie temporali (Flux, InfluxQL, SQL). |
| [Elasticsearch](logicstudio-elasticsearch) (`logicstudio-elasticsearch`) | Indicizza, leggi e cerca documenti in Elasticsearch e OpenSearch. |
| [Componenti UI](logicstudio-ui) (`logicstudio-ui`) | Le componenti delle finestre: etichette, valori, indicatori, pulsanti, campi, tabelle, contenitori. |
| [Grafici](logicstudio-charts) (`logicstudio-charts`) | 12 grafici per le finestre: linee, aree, colonne, barre, torta, tempo reale… |
| [Logic Studio Engine](logicstudio-engine) (`logicstudio-engine`) | Il motore: fa girare prove e programmi attivi, con [limiti](logicstudio-engine/limits) e [permessi](logicstudio-engine/permissions). Si installa con l'IDE. |

Se nella barra di stato leggi **Il motore non risponde**, il modulo `logicstudio-engine` non è installato o è fermo: la Home lo dice con **Il motore di Logic Studio (modulo logicstudio-engine) non è installato o non risponde.** e il pulsante **Apri l'AppStore**. Senza motore la scheda Blocchi è vuota e dice **Il motore di Logic Studio non risponde**; con il motore ma senza pacchetti dice **Nessun pacchetto installato**.

## Il primo programma in 5 minuti

Costruisci un contatore: ogni 2 secondi un numero cresce di 1 e viene scritto in console; quando arriva a 5, il programma scrive «Fatto!».

### 1. Crea il progetto

1. Apri **Logic Studio IDE** dal menu delle applicazioni.
2. Nella Home premi **Nuovo progetto**, scrivi `Contatore` nel campo **Nome** e premi **Crea**.
3. L'IDE crea la cartella `~/Logic Studio/Contatore/` con lo schema **main** e la finestra **Principale**, e apre la **Mappa**. Nella scheda **Progetto** a sinistra, sotto **Schemi**, fai clic su **main**: lo schema si apre in una scheda nuova.

### 2. Metti i blocchi

1. A sinistra passa alla scheda **Blocchi**. Nella ricerca scrivi `interv` e fai clic su **Intervallo**: il blocco compare in mezzo al foglio, già selezionato.
2. A destra, nelle **Proprietà**, sezione **Impostazioni**, metti **Ogni (secondi)** a `2`. Lascia spuntato **Parte da solo**.
3. Allo stesso modo aggiungi **Contatore**, **Confronto**, **NOT**, **Costante · Variabile** e due volte **Print**. Ogni clic mette il blocco un po' più in basso del precedente: trascinali dove vuoi, per esempio come nel disegno qui sotto.
4. Seleziona **Confronto**. Nelle Impostazioni scegli **Operazione** = **a ≥ b**. Nella sezione **Porte**, alla riga dell'ingresso **b**, scrivi `5` nel campo **iniziale** e togli la spunta da **lo avvia** (il 5 resta lì come soglia, senza far girare il blocco da solo).
5. Seleziona **Costante · Variabile**. Nelle Impostazioni scegli **Tipo** = **testo** e scrivi `Fatto!` in **Valore**. Poi, nelle **Proprietà**, accendi l'**occhio** accanto alla porta **invia**: di serie è nascosta, e serve per collegarla nel passo 6.

### 3. Collega

Per collegare, trascina dal pallino di un'uscita (a destra del blocco) al pallino di un ingresso (a sinistra). Fai questi sei collegamenti:

1. **Intervallo** · **impulso** → **Contatore** · **più**
2. **Contatore** · **conteggio** → primo **Print** · **valore**
3. **Contatore** · **conteggio** → **Confronto** · **a**
4. **Confronto** · **risultato** → **NOT** · **valore**
5. **NOT** · **risultato** → **Intervallo** · **acceso**
6. **Confronto** · **se vero** → **Costante · Variabile** · **invia**, e poi **Costante · Variabile** · **valore** → secondo **Print** · **valore**

Lo schema finito:

```
[Intervallo (setInterval): 2 s] impulso ──▶ più [Contatore (++ −−)] conteggio ──▶ valore [Print (console.log)]
                                         conteggio ──▶ a [Confronto (== ≠ < >): a ≥ b, b = 5]

[Confronto (== ≠ < >)] risultato ──▶ valore [NOT] risultato ──▶ acceso [Intervallo (setInterval)]
[Confronto (== ≠ < >)] se vero ──▶ invia [Costante · Variabile: Fatto!] valore ──▶ valore [Print (console.log)]
```

Cosa succede: ogni 2 secondi **Intervallo** manda un impulso, il **Contatore** sale di 1 e manda il nuovo numero sia alla console sia a **Confronto**. Finché il numero è sotto 5, **Confronto** manda `false` su **risultato**, **NOT** lo gira in `true` e **Intervallo** resta acceso. Quando arriva 5, **risultato** è `true`, **NOT** manda `false` e **Intervallo** si spegne; intanto **se vero** fa partire **Costante · Variabile** (che, con **invia** collegata, manda il valore solo a ogni impulso), che manda `Fatto!` alla seconda console.

### 4. Prova

1. Premi **Prova** nella barra (o **F5**). Il pulsante diventa **Prova in corso 00:00** e compare **Ferma**.
2. Sul foglio vedi i valori che passano: un'etichetta colorata a metà di ogni collegamento, l'ultimo valore accanto a ogni ingresso, il bordo azzurro sul blocco che lavora.
3. In basso, nella console **Principale**, compaiono `1`, `2`, `3`, `4`, `5` (uno ogni 2 secondi) e subito dopo il 5 la riga `Fatto!`. Poi non succede più niente: **Intervallo** è spento.
4. Premi **Ferma** (o di nuovo **F5**). Una prova si ferma comunque da sola dopo 5 minuti.

### 5. Salva e attiva

1. Premi **Salva** (o **Ctrl+S**).
2. Se vuoi che giri da solo, anche a lilOS chiuso, premi **Attiva**: diventa un **programma attivo** e lo trovi nella Home sotto **I miei programmi**, dove puoi fermarlo con **Ferma**.

Per capire perché il contatore parte da 1 e cosa succede quando due valori arrivano insieme, leggi [Come funziona un blocco](ide/blocks).

## Da sapere

- La prova usa quello che c'è **negli editor adesso**, anche non salvato; **Attiva** usa il progetto **salvato** (e ti chiede di salvare). Vedi [Prova e programmi attivi](ide/run).
- Un programma attivo fa davvero quello che dice anche quando non guardi: un **writeFile** sovrascrive, un blocco **HTTP** chiama davvero il sito. Provalo prima.
- I testi dell'IDE e dei blocchi sono in italiano e inglese.
- Le scelte di progetto di Logic Studio sono raccolte nella decisione D88 della documentazione interna di lilOS.

## Vedi anche

- [Come funziona un blocco](ide/blocks)
- [Blocchi di base](logicstudio-core)
- [Logic Studio Engine](logicstudio-engine)
