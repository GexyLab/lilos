# Exit (chiudi il programma · return)

`core.exit` · Programma · [Blocchi di base](logicstudio-core) · versione 1

**Chiude tutto il programma** e restituisce un valore, come `process.exit(codice)` o il `return` di `main()`. Lanciato con `lilos logic run`, un numero intero da 0 a 255 diventa il **codice di uscita** del comando; ogni altro valore viene scritto sull'uscita.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da restituire. Se **chiudi** non è collegato, un valore che arriva qui chiude subito il programma. |
| **chiudi** (`close`) | impulso | Nascosto di serie (si mostra con l'occhio nelle Proprietà). Se è collegato, **valore** aspetta e il programma si chiude all'impulso, con l'ultimo valore arrivato su **valore** (o **Valore se non ne arriva nessuno**). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Exception** (`error`) | oggetto | Come ogni blocco; esce solo se il motore è più vecchio della 1.6.0 e non sa chiudere un programma. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Tipo** (`kind`) | numero, testo, sì/no, JSON | numero | Il tipo di **Valore se non ne arriva nessuno**. |
| **Valore se non ne arriva nessuno** (`value`) | testo | `0` | Il valore restituito quando il programma si chiude con **chiudi** e su **valore** non è arrivato niente (o **valore** non è collegato). |

## Come funziona

- Il programma si chiude **tutto**, con tutti i suoi schemi: i blocchi si fermano, le domande in attesa vengono annullate, le finestre aperte dal programma si chiudono come quando lo fermi. Il programma risulta **fermo** (non in errore).
- Conta solo **il primo** Exit: se due blocchi Exit ricevono qualcosa insieme, il secondo non cambia niente.
- Un Exit dentro un [gruppo](ide/groups), anche in un thread a parte, chiude tutto il programma.
- Un valore più lungo di 64 KB (in JSON) viene tagliato e restituito come testo.
- Senza nessun collegamento il blocco non fa niente.

### Il valore restituito

| Il programma è | Il valore va |
|---|---|
| lanciato con `lilos logic run` | Un intero da 0 a 255 diventa il codice di uscita e non viene scritto. `true` e `null` danno 0, `false` dà 1. Un testo viene scritto così com'è, ogni altro valore (numeri con la virgola, oggetti, liste) in JSON; il codice è 0. Con `-q` non scrive niente. |
| una prova dell'IDE | La barra di stato dice «Chiuso dal programma con il valore …» fino alla prova seguente. |
| un programma attivo o un'app | Si ferma; il valore si legge nel programma (campo `result`), per chi usa l'API del motore. Un programma attivo chiuso da Exit **non riparte** al riavvio di lilOS. |

## Esempi

### 1. Un codice di uscita per uno script

```
[Confronto (== ≠ < >): a > b] se vero  ──▶ invia [Costante · Variabile: 1] valore ──▶ valore [Exit]
[Confronto (== ≠ < >): a > b] se falso ──▶ invia [Costante · Variabile: 0] valore ──▶ valore [Exit]
```

Da un terminale del computer, `lilos logic run controllo.lsch && echo tutto bene` scrive «tutto bene» solo se il confronto è falso (codice 0).

### 2. Chiudere dopo l'ultima riga

```
[Print (console.log)] scritto ──▶ chiudi [Exit: 0]
```

Mostra **chiudi** con l'occhio e collegalo all'uscita **scritto** di [Print](core.consoleWrite): il programma si chiude solo dopo aver scritto la sua ultima riga, con 0.

### 3. Restituire un risultato

```
[Input (readline): "Quanti anni hai?", numero] valore ──▶ valore [Exit]
```

`lilos logic run domanda.lsch` chiede l'età nel terminale ed esce con quel numero come codice (42 → `echo $?` scrive 42). Con un oggetto, per esempio da [Oggetto { }](core.compose), il comando scrive il suo JSON.

## Errori

| Messaggio | Quando |
|---|---|
| Questo motore non sa chiudere un programma con un valore | Il motore [Logic Studio Engine](logicstudio-engine) è più vecchio della 1.6.0. |

## Vedi anche

- [Argomenti (argv)](core.args) e [Opzione (-x · --nome)](core.option)
- [I programmi](logicstudio-engine/programs): `lilos logic run`, i codici di uscita
- [Prova e programmi attivi](ide/run)
