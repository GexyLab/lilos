# Print (console.log)

`core.consoleWrite` · Console · [Blocchi di base](logicstudio-core) · versione 1

Scrive una riga in una console del progetto ogni volta che arriva un valore. Può anche pulire la console.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da scrivere. Ogni valore che arriva qui scrive una riga. |
| **pulisci** (`clear`) | impulso | Qualsiasi valore che arriva qui svuota la console. Quello che arriva non conta. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **scritto** (`written`) | impulso | Un impulso dopo ogni riga scritta. |
| **Exception** (`error`) | oggetto | In pratica non succede. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Console** (`console`) | le console del progetto (la principale ha la stella ★) | la principale | Dove scrivere. |
| **Livello** (`level`) | normale, informazione, avviso, errore | normale | Il tipo di riga: cambia il colore e decide se la riga finisce nel registro (vedi sotto). |
| **Formato** (`format`) | testo, JSON leggibile | testo | Come scrivere oggetti e liste. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** aggiungi fino a 16 ingressi di tipo qualsiasi. Nascono con il nome **ingresso 1**, **ingresso 2**… e puoi rinominarli (fino a 60 caratteri): il nome compare nella riga. Le frecce ↑ ↓ cambiano l'ordine. Vedi [Come funziona un blocco](ide/blocks).

Gli ingressi aggiunti **non scrivono mai una riga da soli**, anche se hanno **lo avvia**: tengono il loro ultimo valore, che viene aggiunto in fondo alla riga quando arriva qualcosa su **valore**.

## Come funziona

### La riga

Quando arriva un valore su **valore**, il blocco scrive una riga fatta così:

- prima il valore di **valore**;
- poi, per ogni ingresso aggiunto che ha già ricevuto qualcosa, **due spazi** e `nome=valore`, nell'ordine delle porte. Gli ingressi aggiunti senza valore non compaiono.

Per esempio, con **valore** = `"Lettura"` e gli ingressi aggiunti **temp** = 21,5 e **ok** = sì, la riga è `Lettura  temp=21.5  ok=true`.

Come vengono scritti i valori:

| Valore | Formato **testo** | Formato **JSON leggibile** |
|---|---|---|
| testo `ciao` | `ciao` | `ciao` |
| numero 21,5 | `21.5` (con il punto) | `21.5` |
| sì / no | `true` / `false` | `true` / `false` |
| `null` | niente (la parte resta vuota) | niente |
| oggetto | su una riga: `{"a":1,"b":[1,2]}` | su più righe, rientrato di due spazi |
| lista | su una riga: `[1,2]` | su più righe, rientrato di due spazi |

I numeri sono scritti come li calcola il computer: `0.1 + 0.2` dà `0.30000000000000004`. Per un numero con pochi decimali usa prima [Funzioni Math](core.math) con **arrotonda**.

### Livello e registro

| Livello | Come si vede | Nel registro del progetto |
|---|---|---|
| **normale** | riga semplice | no (di serie) |
| **informazione** | riga nel colore di risalto | no (di serie) |
| **avviso** | riga nel colore degli avvisi (giallo) | **sì** (di serie) |
| **errore** | riga nel colore degli errori (rosso) | **sì** (di serie) |

Le righe vanno nel **registro** solo per i programmi attivi e le app, mai in una Prova; cosa copiare si sceglie in **Opzioni del progetto → Console** (niente, solo avvisi ed errori, tutte). Vedi [Le console](ide/consoles).

### La console

- La **Console** è una di quelle del progetto. Se la console scelta viene tolta dal progetto, il blocco scrive nella **principale**.
- In uno schema aperto da solo (senza progetto) c'è solo la principale.
- **pulisci** svuota tutta la console, per tutti quelli che la stanno guardando. Non scrive niente e non manda **scritto**.

### Limiti

- Una riga lunga viene **tagliata a 1000 caratteri**.
- Una console accetta al massimo **50 righe al secondo** (di serie: l'amministratore lo cambia con **Righe al secondo per console**). Le righe in più non vengono scritte; alla prima riga scritta in un secondo successivo compare l'avviso «… *N* righe non mostrate (troppe al secondo)». Il blocco manda **scritto** anche per le righe non mostrate.
- Una console tiene le ultime righe (1000 di serie, da 100 a 2000 in **Opzioni del progetto → Console**) e al massimo circa 400.000 caratteri: le più vecchie se ne vanno.

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Una riga con dei valori accanto

Aggiungi due ingressi e chiamali **temp** e **ok**. **Livello** avviso.

```
[…] ──▶ valore [Print (console.log): avviso]
[…] ──▶ temp
[…] ──▶ ok
```

Arrivano, in quest'ordine: **valore** = `"Lettura"`, **temp** = 21,5, **valore** = l'oggetto `{"a":1,"b":[1,2]}`, **ok** = sì, **valore** = `null`. La console scrive tre righe da avviso:

```
Lettura
{"a":1,"b":[1,2]}  temp=21.5
  temp=21.5  ok=true
```

(La terza comincia con due spazi perché `null` non scrive niente.) Gli arrivi su **temp** e **ok** non scrivono righe.

### 2. JSON leggibile

**Formato** JSON leggibile. Arriva l'oggetto `{"a":1,"b":[1,2]}`. La console scrive:

```
{
  "a": 1,
  "b": [
    1,
    2
  ]
}
```

### 3. Pulire e scrivere a ogni giro

```
[Intervallo (setInterval): 5 s] impulso ──▶ pulisci [Print (console.log)]
            impulso ──▶ leggi [Now (data e ora)] ISO ──▶ valore [Print (console.log)]
```

I due collegamenti vanno allo **stesso** blocco Print (console.log): ogni 5 secondi la console viene svuotata e poi mostra solo l'ora dell'ultima lettura.

### 4. Gli errori in una console a parte

Aggiungi nel progetto una console **Errori**. Collega le uscite **Exception** dei blocchi che ti interessano a un blocco Print (console.log) con **Console** = Errori e **Livello** errore: gli errori non finiscono più nella principale, e nei programmi attivi restano nel registro.

```
[HTTP (fetch)] Exception ──▶ valore [Print (console.log): Errori, errore]
```

La riga è l'oggetto dell'errore, per esempio `{"message":"…","block":"request1","schema":"main","at":1794405901003}`. Per scrivere solo il messaggio, mettici prima [Get proprietà (obj.campo)](core.get) con Campo `message`.

## Vedi anche

- [Input (readline)](core.consoleRead)
- [Le console](ide/consoles)
- [Template (formatta)](core.format) per costruire righe più complesse
- [Come funziona un blocco](ide/blocks)
