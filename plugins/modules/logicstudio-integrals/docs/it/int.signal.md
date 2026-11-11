# Integratore di segnale (∫ dt)

`int.signal` · Integrali · [Integrali](logicstudio-integrals) · versione 1

Somma nel tempo un valore che arriva dal vivo, per esempio da un sensore: da una portata ricava il volume passato, da una potenza l'energia, da una velocità lo spazio. Può essere azzerato, e tenuto tra un minimo e un massimo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore del segnale. Ogni valore che arriva fa un passo di integrazione. |
| **azzera** (`reset`) | impulso | Riporta l'integrale al **Valore iniziale** e fa dimenticare l'ultimo valore. |
| **t (secondi; altrimenti l'orologio)** (`t`) | numero | Il tempo del valore, in secondi. Nascosta di serie: si mostra con l'occhio nelle Proprietà. Non fa partire il blocco: il valore di **t** deve arrivare prima di quello di **valore**. Se non è collegata, il blocco usa l'orologio del motore. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **integrale** (`total`) | numero | L'integrale fino a ora. |
| **Exception** (`error`) | oggetto | Un errore (vedi sotto). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Unità di tempo** (`per`) | secondo / minuto / ora | secondo | L'unità di tempo del segnale: un valore in L/min vuole **minuto**. |
| **Metodo** (`method`) | Trapezi (media degli ultimi due valori) / Rettangoli (l'ultimo valore vale fino al prossimo) | Trapezi | Come si somma tra un valore e il successivo. |
| **Valore iniziale** (`start`) | numero | 0 | Da dove parte l'integrale, e il valore a cui torna con **azzera**. |
| **Tieni tra un minimo e un massimo (anti-windup)** (`limit`) | sì / no | no | Tiene l'integrale dentro un intervallo. |
| **Minimo** (`min`) | numero | 0 | Il più basso valore dell'integrale. Si vede solo con **anti-windup**. |
| **Massimo** (`max`) | numero | 100 | Il più alto valore dell'integrale. Si vede solo con **anti-windup**. |

## Come funziona

A ogni **valore** che arriva, il blocco guarda quanto tempo è passato dal valore precedente (**dt**, nell'unità scelta) e aggiunge all'integrale:

- con **Trapezi**: dt × (valore precedente + valore nuovo) / 2;
- con **Rettangoli**: dt × valore precedente (il valore resta quello di prima fino a quello nuovo).

All'avvio il blocco manda subito il **Valore iniziale**. Il primo valore dopo l'avvio o dopo un **azzera** non aggiunge niente: manda solo l'integrale di partenza, e diventa il valore "precedente". Se il tempo non avanza (dt non è positivo) l'integrale non cambia.

Il tempo è l'orologio del motore, a meno che non sia collegata **t**: allora è il tempo che dici tu, in secondi (utile per i dati registrati, che non arrivano in tempo reale). Finché su **t** non è arrivato niente, i valori aspettano.

Con **anti-windup** l'integrale non esce mai da [Minimo, Massimo]: quando arriva al limite resta lì, invece di crescere senza fine. Il limite si applica a ogni passo, non solo all'uscita.

L'integrale non si salva quando il programma si ferma.

## Esempi

### 1. Un sensore nel tempo

Un valore arriva ogni secondo: 0, 10, 10, 0, 0.

```
Tempo (s)     0    1    2    3    4
Sensore       0   10   10    0    0

[Sensore] valore ──▶ valore [Integratore di segnale: trapezi] integrale ──▶ valore [Print (console.log)]
```

Con i **Trapezi** il blocco scrive `0`, `5`, `15`, `20`, `20`.

Con i **Rettangoli** scrive `0`, `0`, `10`, `20`, `20`: ogni valore conta per il secondo che segue.

### 2. Portata in litri al minuto

**Unità di tempo** = minuto. Una portata di 2 L/min arriva ai secondi 0, 30 e 60: l'integrale è `0`, `1`, `2` litri.

### 3. Azzeramento e limiti

Valore 5 ai secondi 0 e 2: l'integrale è `0`, poi `10`. Un impulso su **azzera** al secondo 3 manda `0`. Il valore 5 al secondo 4 manda `0` (riparte da qui) e quello al secondo 6 manda `10`.

Con **anti-windup**, minimo 0 e massimo 15, e un valore costante 10 ogni secondo, l'integrale è `0`, `10`, `15`, `15`.

## Errori

| Messaggio | Quando |
|---|---|
| valore: serve un numero | Il valore che arriva non è un numero. |
| t: serve un numero | Su **t** è arrivato qualcosa che non è un numero. |

## Vedi anche

- [Integrale di dati campionati](int.data) per integrare una lista già completa
- [Derivata di un segnale (d/dt)](fn.signalDerivative) per l'operazione inversa
- [Integrali](logicstudio-integrals), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
