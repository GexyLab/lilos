# Gruppi

Un **gruppo** raccoglie alcuni blocchi di uno schema. Serve a tre cose:

- **decidere quando partono**: i blocchi di un gruppo partono solo quando la sua porta **Run** riceve un impulso;
- **fare ordine**: il gruppo si può **comprimere** in un solo blocco, che mostra solo le porte che servono fuori;
- **farli girare a parte**: il gruppo può girare in un **thread a parte**, così un blocco lento non rallenta il resto del programma.

## Fare un gruppo

1. Seleziona i blocchi (rettangolo di selezione, oppure **Maiusc+clic**).
2. Premi **Ctrl+G**, oppure tasto destro → **Raggruppa**, oppure **Raggruppa** nelle Proprietà.

Intorno ai blocchi compare una **cornice** con il nome del gruppo («Gruppo 1», «Gruppo 2»…). La cornice segue i blocchi: si allarga e si sposta con loro.

- Un blocco sta in **un solo gruppo**. I blocchi già in un gruppo vengono lasciati fuori dal nuovo.
- Non ci sono gruppi dentro altri gruppi.
- Un gruppo che resta senza blocchi sparisce.

Per mettere altri blocchi in un gruppo aperto:

- **trascina** un blocco libero e lascialo **dentro la cornice**;
- metti un blocco dalla palette (trascinandolo) o con **Aggiungi un blocco qui** **dentro la cornice**;
- oppure tasto destro sui blocchi → **Aggiungi al gruppo** › il gruppo.

Per toglierli: tasto destro → **Togli dal gruppo**. Trascinare un blocco fuori dalla cornice non lo toglie: la cornice si allarga.

## Com'è fatto

```
┌─────────────────────────────────────────────────┐
●Run ●  ▣ Gruppo 1                            −  │   ← testata
│                                                 │
│   ┌▌ Costante ──┐        ┌▌ Somma ───────┐      │
│   │      valore ●──────▶◎ a     risultato ◎─────┼──▶ …
●───┼─────────────┼───────▶◎ b              │      │
│   └─────────────┘        └────────────────┘      │
└─────────────────────────────────────────────────┘
```

- Nella **testata**: la porta **Run** con **due pallini**. Quello sul **bordo sinistro** si collega **da fuori** (cosa fa partire il gruppo); quello **dopo la scritta Run** si collega **ai blocchi dentro** (a chi mandare l'impulso di partenza). Poi il nome, l'icona del **thread** se il gruppo gira a parte, e **−** per comprimerlo.
- Le porte **esposte** (raggiungibili da fuori) hanno un **anello arancione** intorno al pallino.
- Se a Run non è collegato niente, la cornice è **tratteggiata**: il gruppo non partirà.
- Durante una prova, la cornice si illumina quando il gruppo è partito.

## La porta Run

Run è una porta di tipo **impulso**. Le regole:

| Situazione | Cosa succede |
|---|---|
| A Run **non è collegato niente** | I blocchi del gruppo **non partono mai**. |
| Run è collegata, ma non è ancora arrivato un impulso | I blocchi aspettano. I valori che arrivano ai loro ingressi restano lì, senza avviarli. |
| Arriva un **impulso** su Run | Il gruppo **parte**: partono i blocchi che partono da soli (vedi sotto), gli ingressi ricevono i loro valori iniziali, e Run manda un impulso ai blocchi dentro a cui è collegata. |
| Arriva **un altro impulso** | Il gruppo **riparte da capo**: i suoi blocchi vengono fermati (orologi e attese cancellati), la loro memoria azzerata, e ripartono come la prima volta. I valori già arrivati agli ingressi restano. |
| Arriva `false` su Run | Niente: un impulso conta solo quando è `true`. |

I **blocchi che partono da soli** sono quelli che all'avvio fanno qualcosa senza ricevere niente: **Costante · Variabile** senza niente collegato a **invia** manda il suo valore, **All'avvio** manda un impulso, **Intervallo** con **Parte da solo** accende il suo orologio, **Contatore** si mette al valore **Parte da**. Vedi [Come funziona un blocco](ide/blocks).

Dentro il gruppo, collega il pallino interno di Run agli ingressi che devono partire per primi: di solito ingressi impulso come **invia**, **più**, **leggi**, **chiedi**. Run interna va **solo** ai blocchi del gruppo; Run esterna si collega **solo** da blocchi fuori dal gruppo.

Per far partire un gruppo insieme al programma, collega **All'avvio** → Run.

## Gli impulsi

Una porta impulso (rosa) è un **sì/no che dura un istante**: manda `true` e torna subito a `false`.

- L'ingresso che riceve un impulso vale `true` per il lavoro che fa partire, poi torna `false` **senza** far ripartire il blocco.
- Un ingresso impulso **non parte** con `false` (né con un valore vuoto): collegando un'uscita sì/no a un ingresso impulso, il blocco parte solo quando arriva `true`.
- Un'uscita impulso si può collegare a un ingresso **sì/no** senza segni sul collegamento.
- Sul foglio, durante una prova, l'uscita impulso mostra di nuovo `false` subito dopo.

## Porte esposte

Un collegamento che **attraversa il bordo** del gruppo (da un blocco fuori a uno dentro, o al contrario) può toccare solo una porta **esposta** del gruppo.

- **Collegare** da fuori una porta di un blocco del gruppo la **espone** da sola.
- **Raggruppa** espone da solo le porte dei collegamenti che già attraversano il nuovo bordo.
- Nelle **Proprietà di un blocco** del gruppo, accanto all'occhio di ogni porta c'è il pulsante **Esponi fuori dal gruppo** / **Non esporre**.
- Nelle **Proprietà del gruppo**, sotto **Porte esposte**: il nome che la porta ha sul gruppo compresso (vuoto = il suo nome), l'ordine (↑ ↓) e **Togli**.
- Smettere di esporre una porta toglie i collegamenti che la raggiungono **da fuori** (l'IDE chiede prima; **Ctrl+Z** li rimette).

## Comprimere un gruppo

Clic su **−** nella testata, doppio clic sulla testata, tasto destro → **Comprimi**, oppure **Compresso in un blocco** nelle Proprietà. Il gruppo diventa **un blocco**:

```
┌▌ ▣ Gruppo 1 ──────┐
│ 3 blocchi         │
│● Run              │
│● a                │
│        risultato ●│
└───────────────────┘
```

- In alto **Run**, poi gli **ingressi esposti**, poi le **uscite esposte**, nell'ordine delle Proprietà. Due porte con lo stesso nome mostrano anche il blocco («Somma · a»).
- I collegamenti **dentro** il gruppo non si disegnano; quelli da fuori arrivano alle porte del blocco compresso, e si possono fare e togliere come su un blocco qualsiasi.
- Il blocco compresso sta dove c'era l'angolo in alto a sinistra dei blocchi; trascinandolo si spostano tutti i suoi blocchi.
- **Doppio clic** sul gruppo compresso lo riapre (oppure tasto destro → **Espandi**).

Comprimere o aprire un gruppo non cambia come gira il programma: è solo il disegno.

## Thread a parte

Tasto destro → **Esegui in un thread a parte**, oppure la casella nelle Proprietà. Il motore fa girare i blocchi del gruppo in un **thread suo**, separato dal resto del programma: un blocco lento o un calcolo lungo del gruppo non rallenta gli altri blocchi. I valori che attraversano il bordo del gruppo passano tra i due thread; console, finestre, azioni dei pacchetti e valori dal vivo funzionano come sempre.

Regole e limiti:

- Il thread parte solo se a **Run** è collegato qualcosa.
- Ogni utente ha al massimo **4** gruppi in un thread a parte (di serie; l'amministratore lo cambia in **Pannello di controllo → Logic Studio → Limiti**). Oltre, il gruppo gira nel thread del programma e la console principale scrive «Gruppo 1: nessun thread libero, il gruppo gira nel thread del programma».
- Ogni thread ha **metà** della memoria della tua quota (almeno 16 MB).
- Un'**Exception** non collegata di un blocco del gruppo va ai [Catch globali](core.onError) come quelle degli altri blocchi: a quelli dentro il gruppo, se ce ne sono, altrimenti a quelli del programma.
- Un gruppo in un thread a parte **non può contenere** Ingressi o Uscite di schema né oggetti delle componenti UI: la prova non parte e i Problemi lo dicono. Le Proprietà del gruppo lo avvisano prima.

## Il menu di un gruppo

Tasto destro sulla testata o sul gruppo compresso:

| Voce | Cosa fa |
|---|---|
| **Comprimi** / **Espandi** | Disegna il gruppo come un blocco, o di nuovo come cornice. |
| **Rinomina il gruppo** | Cambia il nome. |
| **Esegui in un thread a parte** | Accende o spegne il thread a parte (✓ quando è acceso). |
| **Duplica** (Ctrl+D) | Copia il gruppo con i suoi blocchi, i collegamenti tra di loro e quelli di Run interna. I collegamenti da fuori non si copiano. |
| **Sciogli il gruppo** (Ctrl+Maiusc+G) | Toglie il gruppo: i blocchi restano dove sono, i collegamenti di Run se ne vanno. |
| **Documentazione** (F1) | Questa pagina. |
| **Elimina il gruppo e i suoi blocchi** (Canc) | Toglie il gruppo, i suoi blocchi e i loro collegamenti. |

## Le Proprietà di un gruppo

Selezionando un gruppo (clic sulla testata o sul gruppo compresso):

- **Nome**, **Compresso in un blocco**, **Esegui in un thread a parte**;
- **Run**: se è collegata («Run è collegata: a ogni impulso il gruppo riparte…») o no («Run non è collegata: i blocchi del gruppo non partono»), e a quante porte va dentro;
- **Porte esposte**: vedi sopra;
- **Blocchi**: quanti, e i pulsanti **Sciogli il gruppo** ed **Elimina il gruppo e i suoi blocchi**.

Le Proprietà di un blocco che sta in un gruppo dicono **Nel gruppo «Gruppo 1»**, con **Mostra il gruppo**.

## Esempi

### 1. Un calcolo che parte a comando

```
[Pulsante: Calcola] premuto ──▶ ● Run   ┌ Gruppo «Calcolo» ─────────────────────────┐
                                        │ [Costante: 21] valore ──▶ a [Moltiplicazione (×)] risultato ◎──▶ valore [Print]
                                        │ [Costante: 2]  valore ──▶ b                      │
                                        └───────────────────────────────────────────┘
```

Le due Costanti non partono con il programma: partono a ogni pressione del pulsante, e ogni volta la console scrive `42`.

### 2. Un contatore che riparte da zero

```
[Intervallo: 5 s] impulso ──▶ ● Run   ┌ Gruppo ──────────────────────────────────────┐
                                      │ Run ● ──▶ più [Contatore] conteggio ◎──▶ valore [Print]
                                      └──────────────────────────────────────────────┘
```

Ogni 5 secondi il gruppo riparte: il Contatore torna a **Parte da**, Run interna gli manda un impulso su **più**, e la console scrive sempre `1`. Per un contatore che continua a salire, lascialo fuori dal gruppo.

### 3. Un lavoro lungo in un thread a parte

Metti in un gruppo i blocchi di un calcolo pesante (per esempio una lunga elaborazione di liste), accendi **Esegui in un thread a parte** e collega **All'avvio** a Run. Il resto del programma (finestre, console, altri blocchi) continua a rispondere mentre il gruppo lavora.

## Vedi anche

- [Schemi](ide/schemas)
- [Collegamenti e tipi delle porte](ide/links)
- [Come funziona un blocco](ide/blocks)
- [Prova e programmi attivi](ide/run)
- [Formati dei file](ide/formats)
- [Scorciatoie da tastiera](ide/shortcuts)
