# Indicatore

`ui.gauge` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Un numero mostrato su un arco a semicerchio, come una lancetta: l'arco si riempie da sinistra a destra tra un minimo e un massimo. Sotto l'arco c'è il numero, con la sua unità.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sotto l'indicatore. |
| **Minimo** | numero | 0 | Il valore che corrisponde all'arco vuoto. |
| **Massimo** | numero | 100 | Il valore che corrisponde all'arco pieno. |
| **Unità** | testo | vuoto | Scritta dopo il numero, più piccola. |
| **Decimali** | da 0 a 6 | 1 | Quante cifre dopo la virgola mostrare. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore da mostrare. |
| **min** (`min`) | numero | Cambia il minimo (prende il posto della proprietà **Minimo**). |
| **max** (`max`) | numero | Cambia il massimo (prende il posto della proprietà **Massimo**). |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

All'apertura l'arco è vuoto e il numero è «—». Ogni valore su **valore** ridisegna l'arco e il numero.

- **La parte piena** è (valore − minimo) / (massimo − minimo). Sotto il minimo l'arco resta vuoto, sopra il massimo resta pieno; **il numero mostrato è sempre quello vero**, anche fuori dall'intervallo (con massimo 100 e valore 130 vedi l'arco pieno e «130,0»).
- **I valori sono convertiti in numero**: `"21,5"` e `"21.5"` valgono 21,5 (solo la prima virgola diventa un punto: `"1.234,5"` non è un numero). `null`, niente e `""` valgono **0** (l'arco si svuota ma il numero è «0,0», non «—»). Un testo che non è un numero (per esempio `"ciao"`), e anche `true` o `false`, riportano «—» con l'arco vuoto.
- **Il numero** è formattato nella lingua di chi guarda, con i **Decimali** scelti: 21,456 con 1 decimale è «21,5».
- Se **min** e **max** sono uguali, l'indicatore non può dividere per zero: considera l'intervallo largo 1.
- Se il minimo è più grande del massimo, l'arco si comporta al contrario (si riempie quando il valore scende).
- **min** e **max** ridisegnano subito l'arco con l'ultimo valore ricevuto.

## Esempi

### 1. Una temperatura

```
Finestra «Caldaia»
└ Colonna (radice)
  └ Indicatore  gauge1  Etichetta «Acqua»  Minimo 20  Massimo 90  Unità «°C»  Decimali 0
```

```
[Ogni…: 5 s] impulso ──▶ leggi [Leggi file: ~/caldaia.txt] contenuto ──▶ valore [Indicatore: Acqua]
```

Se il file contiene `55`, l'arco è pieno a metà ((55 − 20) / (90 − 20) = 0,5) e sotto si legge «55 °C».

### 2. Uso del disco con il massimo che arriva dallo schema

```
Finestra «Spazio»
└ Colonna (radice)
  └ Indicatore  gauge1  Etichetta «Usati»  Unità «GB»
```

```
[Valore: 256] valore ──▶ max    [Indicatore: Usati]
[Valore: 180] valore ──▶ valore
```

All'avvio i due [Valori](core.value) mandano 256 e 180: l'arco è pieno al 70% e si legge «180,0 GB». Nel progetto vero, al posto del secondo Valore metti il blocco che calcola lo spazio usato.

## Accessibilità

L'arco è un disegno: un lettore di schermo non lo legge. Si leggono il numero con l'unità e l'etichetta, che sono testo. Il valore che cambia non viene annunciato.

## Vedi anche

- [Barra di avanzamento](ui.progress), [Valore](ui.value)
- [Limita](core.clamp) per tenere un valore tra due numeri
- [Componenti UI standard](logicstudio-ui)
