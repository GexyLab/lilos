# Collegamenti e tipi delle porte

Un **collegamento** porta i valori dall'**uscita** di un blocco all'**ingresso** di un altro. Va sempre da destra (uscita) a sinistra (ingresso). Ogni valore che esce dall'uscita arriva, nello stesso ordine, a tutti gli ingressi collegati.

## Fare un collegamento

1. Porta il mouse sul pallino di un'uscita, a destra del blocco: il puntatore diventa una croce.
2. Tieni premuto e trascina: segue una linea tratteggiata.
3. Passando su un ingresso di un altro blocco, il suo pallino si illumina.
4. Lascia il tasto sopra l'ingresso: il collegamento c'è.

Se lasci il tasto nel vuoto, si apre il menu dei **blocchi adatti**: scegline uno e viene messo lì, già collegato al suo primo ingresso adatto (vedi [Schemi](ide/schemas)). Se lasci il tasto su un'uscita o sullo stesso blocco, non succede niente.

Regole:

- un blocco non si collega con se stesso (per un ciclo servono almeno due blocchi);
- lo stesso collegamento (stessa uscita, stesso ingresso) non si fa due volte;
- **un'uscita** può andare a **quanti ingressi vuoi**;
- **un ingresso** può ricevere da **più uscite**: ogni valore che arriva prende il posto del precedente (vale l'ultimo arrivato);
- l'uscita **Eccezione** si collega come le altre.

## Togliere o spostare un collegamento

- Clic sul collegamento per selezionarlo, poi **Canc**; oppure tasto destro → **Elimina il collegamento**; oppure, nelle Proprietà, **Elimina il collegamento**.
- **Trascina dal pallino dell'ingresso**: stacchi l'ultimo collegamento arrivato a quell'ingresso. Lascialo su un altro ingresso per spostarlo lì (è un solo passo di Annulla), o nel vuoto per toglierlo.
- Eliminare un blocco toglie i suoi collegamenti; togliere una porta aggiunta toglie i collegamenti di quella porta (**Ctrl+Z** li rimette).

## I tipi delle porte

Ogni porta ha un **tipo**, che si vede dal colore del pallino e del collegamento e, nelle Proprietà, accanto al nome:

| Tipo | Colore | Che valori porta |
|---|---|---|
| numero | blu | `3`, `-2.5`, `1e6` |
| sì/no | giallo | `true` o `false` (in console e sui fogli: sì, no) |
| testo | verde | `"ciao"` |
| oggetto | viola | `{ "nome": "Ada", "anni": 36 }` |
| lista | turchese | `[1, 2, 3]` |
| matrice | verde acqua | una lista di righe: `[[1, 2], [3, 4]]` |
| qualsiasi | grigio | qualunque valore |
| impulso | rosa | un segnale «adesso»: il valore conta poco (di solito `true`) |
| (Eccezione) | rosso | l'oggetto dell'errore `{ message, block, schema, at }` |

Il tipo è un **accordo**, non un obbligo: il motore non blocca un valore perché è del tipo «sbagliato». È il blocco che lo riceve a decidere cosa farne. Quasi tutti i blocchi convertono: una **Somma** accetta `"2,5"` come 2,5 e `true` come 1; se proprio non ci riesce manda un errore sull'uscita **Eccezione** (per esempio «Serve un numero»).

## Quando un collegamento è segnato

Puoi collegare porte di tipo diverso. Se i due tipi non vanno d'accordo, il collegamento si disegna **a puntini fitti**: è un avviso, non un errore. La regola:

| Dall'uscita | All'ingresso | Va bene? |
|---|---|---|
| qualsiasi | qualunque | sì |
| qualunque | qualsiasi | sì |
| un tipo | lo stesso tipo | sì |
| qualunque | impulso | sì: qualunque valore che arriva fa partire un ingresso impulso |
| qualunque tranne impulso | testo | sì: il valore si mostra come testo |
| impulso | testo | segnato |
| tutti gli altri casi | | segnato |

Esempi:

| Collegamento | Disegno |
|---|---|
| numero → numero | normale |
| numero → testo | normale |
| numero → impulso | normale |
| testo → numero | **segnato** (va, se il testo è un numero: `"42"`) |
| numero → sì/no | **segnato** (0 diventa no, gli altri sì, per i blocchi che convertono) |
| sì/no → numero | **segnato** |
| lista → matrice | **segnato** |
| impulso → sì/no | **segnato** |
| impulso → testo | **segnato** |

Gli altri segni sui collegamenti:

| Disegno | Significa |
|---|---|
| linea piena del colore del tipo | normale |
| linea più spessa, illuminata | selezionato |
| tratteggio rosso | parte da un'uscita **Eccezione** |
| tratteggio che scorre, con un'etichetta a metà | durante la prova: ci è passato un valore; l'etichetta è l'ultimo valore |

## I valori dal vivo

Durante una **Prova** (vedi [Prova e programmi attivi](ide/run)) ogni collegamento su cui è passato qualcosa mostra a metà l'**ultimo valore**, accorciato:

| Valore | Etichetta |
|---|---|
| un numero | nel formato della tua lingua: `2,5`, `1.234` |
| sì/no | `sì`, `no` |
| un testo | il testo, tagliato a 18 caratteri |
| una lista | `[3]` (quanti elementi) |
| un oggetto | `{nome, anni…}` (i primi due campi) |
| un errore | `⚠ Serve un numero`, su fondo rosso |
| `null` | `∅` |

Accanto a ogni ingresso compare il suo ultimo valore (tagliato a 12 caratteri). I valori si aggiornano circa 10 volte al secondo.

## Collegamenti tra schemi

Dentro uno schema colleghi blocchi. **Tra schemi diversi** di un progetto si collegano solo le **porte di schema**, e solo nella **Mappa** (vedi [Schemi](ide/schemas)):

```
schema «sensori»                         schema «allarmi»
… ──▶ valore [Return (uscita di schema): temp]  ═══▶  [Parametro (ingresso di schema): temp] valore ──▶ …
```

- Si va da un blocco **Return** di uno schema a un blocco **Parametro** di un altro.
- Un'uscita può andare a più ingressi, e un ingresso può ricevere da più uscite.
- Questi collegamenti stanno nel file del progetto (`.lsproj`), scritti come `"sensori:temp"` → `"allarmi:temp"`.
- Rinominando lo schema o la porta, i collegamenti seguono.
- Al massimo **200** collegamenti tra schemi per progetto (di serie).

Il motore controlla che le due porte esistano: se no, la prova non parte e i Problemi dicono per esempio «Collegamento del progetto: lo schema sensori non ha l'uscita «temp»». I tipi delle porte di schema non vengono controllati.

## Componenti delle finestre

Una componente di una finestra **non si collega direttamente**: si collega il suo **oggetto** in uno schema, che ha le porte della componente. Vedi [L'oggetto di una componente](ide/components).

## Limiti

- Al massimo **600** collegamenti per schema (di serie). L'IDE li conta nella barra di stato («collegamenti 30 / 600») ma non ti ferma: oltre il limite la prova dice «Troppi collegamenti nello schema main: al massimo 600».
- Un collegamento verso una porta che il blocco non ha più (per esempio dopo aver aggiornato un pacchetto) ferma la prova con «Lo schema main: il blocco add1 non ha l'ingresso c».

## Esempi

### 1. Un valore a più blocchi

```
[Campo numerico: gradi] valore ──▶ valore [Print (console.log)]
                        valore ──▶ a [Confronto (== ≠ < >): a > b, b = 30] se vero ──▶ invia [Notify]
```

Ogni numero scritto nel campo va sia in console sia al **Confronto**. Quando è sopra 30, parte una notifica (blocco del pacchetto [Blocchi di lilOS](logicstudio-lilos)).

### 2. Più valori su un ingresso

```
[Pulsante: Acceso] premuto ──▶ invia [Costante · Variabile: sì] valore ──▶ acceso [Intervallo (setInterval)]
[Pulsante: Spento] premuto ──▶ invia [Costante · Variabile: no] valore ──▶ acceso
```

Due blocchi Costante · Variabile (**Tipo** = **sì/no**, con **invia** collegata: per vederla accendi l'**occhio** accanto alla porta nelle Proprietà) mandano il valore solo a ogni impulso. I valori arrivano allo stesso ingresso **acceso**: vale l'ultimo premuto.

### 3. Un collegamento segnato che funziona lo stesso

```
[Campo di testo] testo ──▶ a [Somma (+)] risultato ──▶ valore [Print (console.log)]
```

Il collegamento testo → numero è a puntini. Se l'utente scrive `12`, il blocco Somma lo converte e scrive 12; se scrive `ciao`, il blocco Somma manda «Serve un numero» sull'**Eccezione** e, se non è collegata, la riga va nella console principale. Per un controllo esplicito metti in mezzo un **Cast** (**In** = **numero**) e collega la sua **Eccezione** a un **Print** con livello **avviso**.

## Vedi anche

- [Come funziona un blocco](ide/blocks)
- [Schemi](ide/schemas)
- [L'oggetto di una componente](ide/components)
- [Cast (converti tipo)](core.convert)
