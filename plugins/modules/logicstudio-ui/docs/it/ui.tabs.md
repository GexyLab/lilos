# Schede

`ui.tabs` · Contenitori · [Componenti UI standard](logicstudio-ui) · versione 1

Più pagine nello stesso spazio, una visibile alla volta: in alto una fila di linguette con i nomi, e un clic su una linguetta mostra la sua pagina.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Nomi delle schede (separati da virgola)** | testo (traducibile) | «Uno, Due» | I nomi delle linguette, nell'ordine: `Generale, Avanzate, Informazioni`. |

## Le pagine

**Ogni componente messa direttamente dentro le Schede è una pagina.** La prima componente è la pagina della prima linguetta, la seconda della seconda, e così via. Per avere più componenti in una pagina, metti nelle Schede una [Colonna](ui.column) (o un altro contenitore) e i pezzi dentro di lei.

- Le linguette sono tante quante le pagine, non quanti i nomi: un nome senza pagina non compare; una pagina senza nome ha come nome il suo numero («3»).
- Senza pagine non c'è nessuna linguetta.
- In **Progetta** si vedono **tutte** le pagine, una sotto l'altra, per poterci mettere i pezzi; le linguette ci sono, ma un clic non cambia pagina. In **Anteprima** e in lilOS si vede una pagina alla volta.

## Porte del suo oggetto nello schema

| Porta | Verso | Tipo | Descrizione |
|---|---|---|---|
| **scheda aperta** (`value`) | ingresso | numero | Apre la pagina con quel numero (1 è la prima), senza che le Schede mandino niente. |
| **scheda aperta** (`value`) | uscita | numero | Quando l'utente fa clic su una linguetta: il suo numero (1 è la prima). |
| **abilitato** (`enabled`) | ingresso | sì/no | `false` disabilita le Schede con tutte le pagine. |
| **visibile** (`visible`) | ingresso | sì/no | `false` le nasconde. |

> **Oggi queste porte non si possono usare dall'IDE.** Le Schede sono un contenitore, e per i contenitori le Proprietà non mostrano la sezione **Oggetto nello schema**: non c'è modo di creare il loro oggetto. Le schede funzionano lo stesso (l'utente cambia pagina con un clic), ma uno schema non può sapere quale pagina è aperta né aprirne una. Vedi [Componenti UI standard](logicstudio-ui).

## Come funziona

- All'apertura si vede la **prima** pagina.
- Un clic su una linguetta mostra la sua pagina. Un clic sulla linguetta già aperta non cambia niente (ma, con l'oggetto, manderebbe di nuovo il numero).
- Un numero sull'ingresso fuori dall'intervallo apre la prima o l'ultima pagina; `"2"` vale 2. Un valore che non è un numero (per esempio `"ciao"`) nasconde tutte le pagine finché non arriva un numero o l'utente fa clic su una linguetta.
- **Le pagine nascoste continuano a funzionare**: i loro campi tengono quello che l'utente ha scritto, e le loro componenti ricevono i valori dagli schemi anche mentre non si vedono.

## Esempi

### 1. Impostazioni in tre pagine

```
Finestra «Impostazioni»
└ Colonna (radice)
  └ Schede  Nomi delle schede «Generale, Avvisi, Informazioni»
    ├ Colonna                                      ← Generale
    │ ├ Campo di testo  text1     Etichetta «Nome del dispositivo»
    │ └ Selezione       select1   Etichetta «Unità»  Opzioni «°C, °F»
    ├ Colonna                                      ← Avvisi
    │ ├ Casella di spunta checkbox1 Etichetta «Avvisami per email»
    │ └ Cursore         slider1   Etichetta «Soglia»
    └ Etichetta  label1  Testo «Versione 1.0»      ← Informazioni
```

Le prime due pagine sono Colonne con più pezzi; la terza è una sola etichetta, che fa da pagina da sola.

### 2. Un monitor con dettagli

```
Finestra «Monitor»
└ Colonna (radice)
  ├ Spia  lamp1  Etichetta «Allarme»  Colore rosso
  └ Schede  Nomi delle schede «Carico, Registro»
    ├ Indicatore  gauge1    Etichetta «Carico»  Unità «%»
    └ Console     console1  Altezza 200
```

La spia resta sempre visibile sopra le schede; sotto, l'utente passa dall'indicatore alla console. Lo schema manda i valori all'indicatore anche mentre l'utente guarda la console: tornando alla prima pagina vede l'ultimo valore.

## Accessibilità e tastiera

- Le linguette sono pulsanti con il ruolo di scheda, e quella aperta è segnata come selezionata: un lettore di schermo le annuncia come «scheda».
- Si passa da una linguetta all'altra con **Tab** (non con le frecce, come in altre schede di lilOS) e si apre con **Invio** o **Spazio**.
- Le pagine non sono collegate alle loro linguette per i lettori di schermo.

## Vedi anche

- [Riquadro](ui.group), [Colonna](ui.column)
- [Componenti UI standard](logicstudio-ui)
