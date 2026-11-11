# Emit (evento a lilOS)

`lilos.event` · lilOS · [Blocchi di lilOS](logicstudio-lilos) · versione 1

Manda un evento alle tue pagine di lilOS aperte, con un nome e dei dati. È pensato per far parlare un programma con lilOS e con le app: **per ora nessuna parte di lilOS lo usa**, quindi mandarlo non cambia niente sullo schermo. Serve a chi scrive app che ascoltano gli eventi di lilOS.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati** (`data`) | qualsiasi | I dati dell'evento. Ogni valore che arriva qui manda un evento. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **inviato** (`sent`) | impulso | Manda `true` quando l'evento è partito. |
| **Eccezione** (`error`) | oggetto | Quando l'evento non parte: nome non valido, dati troppo grandi, troppi eventi. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Nome dell'evento** (`name`) | testo | `evento` | Il nome che l'evento porta con sé, per distinguerlo da altri. Da 1 a 64 caratteri: lettere, cifre, `.`, `-` e `_`. |

## Come funziona

Quando arriva un valore su **dati**, il blocco chiede al kernel di mandare a **tutte le tue pagine di lilOS aperte** (in ogni browser e scheda in cui sei entrato) l'evento `logicstudio.event`, con questi dati:

```
{
  "program": { "id": "…", "name": "Serra" },
  "name": "serra.allarme",
  "data": { "temp": 31.5 }
}
```

- `program` dice quale programma l'ha mandato (il suo id e il suo nome).
- `name` è il **Nome dell'evento** delle impostazioni (gli spazi all'inizio e alla fine vengono tolti).
- `data` è il valore arrivato su **dati**, così com'è.

Cose da sapere:

- L'evento arriva solo a **te**, l'utente che possiede il programma, e solo alle pagine aperte in quel momento: se nessuna pagina è aperta, l'evento si perde. Non viene salvato.
- I dati, scritti come JSON, possono essere lunghi al massimo **64 KB** (circa 65 000 caratteri).
- Ogni programma può mandare al massimo **20 eventi al secondo**: oltre, il blocco dà errore.
- Il nome non si può cambiare con un ingresso: per eventi diversi usa più blocchi, ognuno con il suo nome.
- Per avvisare te, una persona, usa un blocco [Notify](lilos.notify): il blocco Emit è per il software.

Vedi anche [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un evento con una misura

```
[Intervallo (setInterval): 5 s] impulso ──▶ leggi [readFile: ~/sensori/ultimo.txt] contenuto ──▶ temp [Oggetto { }] oggetto ──▶ dati [Emit (evento a lilOS): serra.misura]
```

Ogni 5 secondi le tue pagine di lilOS ricevono `logicstudio.event` con `name` = `serra.misura` e `data` = `{ "temp": "22,5" }` ([Oggetto { }](core.compose) ha l'ingresso aggiunto **temp**). Un'app che ascolta quell'evento può mostrare la misura.

### 2. Un evento quando premi un pulsante

```
[Pulsante: Allarme] premuto ──▶ dati [Emit (evento a lilOS): serra.allarme] inviato ──▶ valore [Print (console.log)]
```

**dati** vale `true` (il valore di un impulso). La console scrive `true` quando l'evento è partito.

### 3. Attenzione al ritmo

```
[Intervallo (setInterval): 0,05 s] impulso ──▶ dati [Emit (evento a lilOS): misura.a]
               impulso ──▶ dati [Emit (evento a lilOS): misura.b]
```

Il limite di 20 eventi al secondo vale per **tutto il programma**, non per ogni blocco. Qui i due blocchi insieme ne mandano 40 al secondo: circa metà finisce su **Eccezione** con «Troppi eventi: al massimo 20 al secondo». Rallenta il ritmo, oppure raccogli più valori in una lista con [Accumula (push con limite)](coll.accumulate) e manda la lista ogni tanto.

## Errori

| Messaggio | Quando |
|---|---|
| Nome dell'evento non valido (lettere, numeri, «.», «-» e «_», al massimo 64) | Il nome è vuoto, troppo lungo o ha caratteri non ammessi (per esempio uno spazio). |
| Dati dell'evento troppo grandi (al massimo 64 KB) | I dati, scritti come JSON, superano 64 KB. |
| Troppi eventi: al massimo 20 al secondo | Il programma ha già mandato 20 eventi nell'ultimo secondo. |
| Emit (evento a lilOS) ha impiegato più di 30 s | Il kernel non ha risposto entro il tempo massimo di un blocco. |
| Il programma non è in esecuzione | Il programma si stava fermando. |

## Permessi

Il blocco lavora come l'utente che possiede il programma e manda eventi solo alle sue pagine. Un'app fatta con **Crea app** che contiene questo blocco, prima di partire, ti chiede il permesso di «mandare eventi al tuo lilOS». Vedi [Permessi](logicstudio-engine/permissions).

## Vedi anche

- [Notify](lilos.notify)
- [Oggetto { }](core.compose), per preparare i dati
- [Come funziona un blocco](ide/blocks)
