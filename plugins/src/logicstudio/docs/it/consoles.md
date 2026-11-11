# Console

Una **console** è il posto dove il programma **scrive righe** e **fa domande** a chi lo usa. Ogni progetto ha la console **principale** (con la stella ★), che c'è sempre e riceve anche gli errori che nessun blocco gestisce, e può averne altre, ognuna con il suo nome e colore.

Le console stanno nel **motore**, non nell'IDE: un programma attivo continua a scrivere e a fare domande anche con l'IDE chiuso, e lilOS gli apre le console quando serve.

## I blocchi delle console

Sono nel pacchetto [Blocchi di base](logicstudio-core), categoria **Console**.

### Scrivi in console

[Scrivi in console](core.consoleWrite) scrive una riga quando gli arriva un valore su **valore**, e svuota la console quando arriva un impulso su **pulisci**. Dopo aver scritto manda un impulso su **scritto**.

| Impostazione | Scelte |
|---|---|
| **Console** | Una console del progetto (la principale ha ★). |
| **Livello** | **normale**, **informazione**, **avviso**, **errore**: il colore della riga. |
| **Formato** | **testo**: un oggetto o una lista si scrive in JSON su una riga; **JSON leggibile**: in JSON con i rientri, su più righe. |

Gli ingressi aggiunti si scrivono sulla stessa riga come `nome=valore` (ma non avviano la scrittura).

### Leggi da console

[Leggi da console](core.consoleRead) fa una domanda quando arriva un impulso su **chiedi**, aspetta la risposta e la manda su **valore**; se la domanda viene annullata, manda un impulso su **annullato**. L'ingresso **domanda** (un testo) prende il posto della domanda scritta nelle impostazioni.

| Impostazione | Cosa fa |
|---|---|
| **Console** | Dove si fa la domanda. |
| **Domanda** | Il testo della domanda. |
| **Tipo di dato** | **testo**, **numero**, **sì/no** o **un tasto**. |
| **Valore predefinito** | Si vede nel campo della risposta come suggerimento; è anche la risposta data quando le console sono nascoste. |
| **Tempo massimo (secondi, 0 = nessuno)** | Dopo questo tempo senza risposta, la domanda è annullata. |
| **Richiedi se il dato non va bene** | Se la risposta non è del tipo giusto, la domanda si ripete; se è tolta, la domanda è annullata. |
| **Nascondi quello che si scrive** | Per le password: nel campo si vedono puntini, e nella console la risposta diventa `••••`. |

Le risposte valide per tipo:

| Tipo | Valide | Diventano |
|---|---|---|
| testo | qualunque cosa, anche vuota | il testo com'è |
| numero | `12`, `-3`, `2.5`, `2,5`, `1e3` | un numero |
| sì/no | `sì`, `si`, `s`, `yes`, `y`, `true`, `1`, `vero`, `on` · `no`, `n`, `false`, `0`, `falso`, `off` (maiuscole o minuscole) | `true` · `false` |
| un tasto | il primo carattere premuto | quel carattere |

Una risposta non valida scrive un avviso come «Serve un numero. Riprova.» («Serve sì o no.», «Serve un tasto.») e ripropone la domanda.

Regole:

- in una console si fa **una domanda alla volta**: le altre aspettano in fila e compaiono quando la prima ha la sua risposta;
- un **chiedi** che arriva mentre lo stesso blocco sta già aspettando una risposta viene ignorato;
- mentre un blocco aspetta, **gli altri blocchi vanno avanti**;
- quando il programma si ferma, le domande in attesa sono annullate.

> In questa versione una domanda senza risposta per più di **30 secondi** (il «Tempo massimo di un blocco» del motore) fa uscire dal blocco l'errore «Leggi da console ha impiegato più di 30 s» sull'**Eccezione**, e la risposta data dopo va persa. Se ti serve più tempo, chiedi all'amministratore di alzare quel limite nel Pannello di controllo → Logic Studio → Limiti.

## Il pannello in basso

Sotto gli editor c'è una scheda per ogni console del progetto, la principale per prima:

```
● ★ Principale │ ● Allarmi ⌨ │ + │ Problemi 2            Stacca  ▾
```

| Elemento | Cosa fa |
|---|---|
| ● | Il colore della console. |
| ★ | La console principale: «La console principale: c'è sempre e riceve le eccezioni che nessun blocco gestisce». |
| ⌨ | La console **aspetta una risposta**. |
| **+** | **Nuova console**: chiede il nome e la aggiunge al progetto. Non c'è per uno schema da solo. |
| **Problemi** | I problemi trovati dalla prova (vedi [Prova e programmi attivi](ide/run)), con il loro numero. |
| **Stacca** | Durante una prova, apre la console mostrata in una finestra sua, **Console Nome**: utile con due schermi. |
| ▾ / ▴ | **Nascondi il pannello** / **Mostra il pannello**. Un clic su una scheda lo riapre. |

Senza prova il pannello dice «Prova il progetto per vedere qui le sue console.» Durante una prova:

- ogni riga ha l'ora (`14:05:32`) e il colore del suo livello; le domande e le risposte hanno un loro stile;
- il pannello mostra le ultime 1000 righe di ogni console e scorre da solo, se eri in fondo;
- quando un blocco fa una domanda, il pannello si apre su quella console e mette il cursore nel campo della risposta: a sinistra la domanda e `›`, a destra «Invio manda · Esc annulla · numero» (il tipo di dato);
- **Invio** manda la risposta, **Esc** annulla la domanda; con **un tasto** basta premere il tasto.

Finita la prova, le console restano leggibili fino alla prova successiva.

## Le console del progetto

Si gestiscono in **Opzioni del progetto → Console** (vedi [Progetti](ide/projects)):

| Colonna | Cosa fa |
|---|---|
| **Nome** | Il nome della console (al massimo 60 caratteri; un nome vuoto non viene preso). |
| **Colore** | Uno di 8 colori: grigio (di serie), verde acqua, arancione, blu, viola, rosso, verde, giallo. |
| **Righe tenute** | Quante righe ricorda il motore, da 100 a 2000 (di serie 1000). Le più vecchie se ne vanno. |
| **Togli** | Toglie la console (chiede conferma). |

- La principale è «fissa: si rinomina, non si toglie». In questa versione il suo nome nella tabella non è modificabile: si chiama **Principale**.
- **Nuova console** ne aggiunge una chiamata «Console 1», «Console 2»…; si spegne quando il progetto ne ha 10 (il limite di serie). Il **+** del pannello in basso invece non controlla il limite: oltre, la prova dice «Troppe console: al massimo 10».
- «Togliendo una console, i suoi blocchi passano alla principale.»: i blocchi che scrivono in una console che non c'è più scrivono nella principale.
- Oltre alle righe, ogni console tiene al massimo 400000 caratteri; una riga è lunga al massimo 1000 caratteri e una domanda 500.
- Una console scrive al massimo **50 righe al secondo** (di serie): le altre si contano e ogni tanto compare «… 12 righe non mostrate (troppe al secondo)».
- «Le righe tenute in memoria contano nella tua quota di memoria; quelle copiate nel registro nella quota del registro.»

Uno schema da solo ha solo la console principale (a meno che il suo file non ne elenchi altre: vedi [Formati dei file](ide/formats)).

## Fuori dall'IDE

Quando il progetto gira come **programma attivo** o come **app**, nessun IDE mostra le console: le apre lilOS, in finestre sue, secondo la scelta **Fuori dall'IDE**:

| Scelta | Cosa succede |
|---|---|
| **Mostrale tutte** | Ogni console si apre in una finestra quando si apre la prima finestra del progetto; una domanda apre (o porta davanti) la sua console. |
| **Solo quando chiedono un dato** (di serie) | Una console si apre quando un blocco **Leggi da console** aspetta; dopo la risposta si chiude, se è spuntato **Chiudi la console dopo la risposta**. |
| **Non mostrarle** | Niente sullo schermo. Le righe vanno nel registro come dice **Copia nel registro**; le domande prendono subito il **Valore predefinito** (convertito nel tipo di dato) o, se non ce l'hanno o non è valido, sono annullate. |
| **Tutte nella console principale** | Una sola finestra, **Console**, con le righe di tutte le console; ogni riga che non è della principale ha un'etichetta con il nome della sua console. Si apre secondo **Con «Tutte nella principale», la principale si apre**: **all'avvio** (con la prima finestra del progetto) o **quando chiede un dato**. |

In una **prova** queste scelte non contano: le console sono nel pannello dell'IDE e le domande si fanno sempre lì.

### Le notifiche

Con **Una notifica quando una console chiede un dato e il progetto non ha finestre aperte** spuntato (di serie), quando un programma attivo fa una domanda e nessuno lo sta guardando (né l'IDE né una sua finestra è aperta), ricevi una **notifica** di lilOS. Il suo pulsante apre la console (con **Tutte nella console principale**, la finestra di tutte). Per la stessa console arriva al massimo una notifica ogni 30 secondi. Con **Non mostrarle** non arrivano notifiche.

La domanda intanto **aspetta**: il blocco che l'ha fatta resta fermo, gli altri vanno avanti (ma vedi l'avviso sui 30 secondi sopra).

### Il registro

**Copia nel registro del progetto** sceglie quali righe dei programmi attivi e delle app copiare nel tuo **registro**:

| Scelta | Cosa copia |
|---|---|
| **niente** | Nessuna riga. |
| **avvisi ed errori** (di serie) | Solo le righe di livello avviso ed errore (comprese le eccezioni non gestite). |
| **tutte le righe** | Tutto. |

Le righe delle prove non vanno mai nel registro. Il registro è uno solo per utente, con tutti i tuoi programmi; quando supera la tua quota (20 MB di serie) se ne va la metà più vecchia. La Home, in **Quello che uso**, dice quanto è grande. Per ora nessuna pagina di lilOS mostra il contenuto del registro.

## Una console in una finestra

La componente **Console** (pacchetto [Componenti UI](logicstudio-ui)) mostra una console del progetto dentro una finestra, con la proprietà **Console** e **Altezza (px)**. Le domande di quella console si possono rispondere lì.

## Esempi

### 1. Chiedere un numero e raddoppiarlo

```
[All'avvio] impulso ──▶ chiedi [Leggi da console: «Quanti anni hai?», numero] valore ──▶ a [Moltiplica] risultato ──▶ valore [Scrivi in console]
                                                                                   annullato ──▶ invia [Valore: «Va bene, niente.»] valore ──▶ valore [Scrivi in console]
```

Su **Moltiplica**, **b** ha valore iniziale `2` e **lo avvia** tolto. **Prova**: il pannello si apre sulla principale con «Quanti anni hai? ›». Scrivi `ventidue`: «Serve un numero. Riprova.». Scrivi `22` e **Invio**: la console scrive `44`. Premendo **Esc** invece, scrive «Va bene, niente.».

### 2. Una console per gli allarmi

1. In **Opzioni del progetto → Console** premi **Nuova console**, rinominala `Allarmi` e scegli il rosso.
2. Metti uno **Scrivi in console** con **Console** = **Allarmi** e **Livello** = **errore**, e collegalo a quello che deve segnalare.
3. In **Fuori dall'IDE** scegli **Mostrale tutte**: quando apri la finestra del programma attivo, si apre anche la console **Allarmi**.

### 3. Una password che non si vede

```
[Pulsante: Entra] premuto ──▶ chiedi [Leggi da console: «Password», testo, nascosto] valore ──▶ a [Confronta: a = b, b = "segreta"] se vero ──▶ …
```

Con **Nascondi quello che si scrive**, nel campo si vedono puntini e la console mostra `•••••••` al posto della risposta. Su **Confronta**, **b** ha valore iniziale `"segreta"` e **lo avvia** tolto.

### 4. Un programma attivo silenzioso

Un programma attivo che scrive ogni minuto la temperatura e ogni tanto un avviso: in **Fuori dall'IDE** scegli **Non mostrarle** e in **Copia nel registro del progetto** **avvisi ed errori**. Le righe normali restano solo in memoria (le ultime 1000), gli avvisi vanno nel registro, e un **Leggi da console** con **Valore predefinito** `20` riceve subito `20` senza chiedere niente.

## Vedi anche

- [Scrivi in console](core.consoleWrite)
- [Leggi da console](core.consoleRead)
- [Prova e programmi attivi](ide/run)
- [Progetti](ide/projects)
