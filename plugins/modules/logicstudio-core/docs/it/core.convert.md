# Cast (converti tipo)

`core.convert` · Valori · [Blocchi di base](logicstudio-core) · versione 1

**Blocco obsoleto** dalla versione 1.6.0 di Blocchi di base. Negli schemi già salvati funziona ancora come prima, ma non compare più nell'elenco dei blocchi. È stato sostituito da un blocco per ogni conversione, uno per ogni valore dell'impostazione **In**:

| Valore di **In** | Blocco che lo sostituisce |
|---|---|
| numero | [Cast in numero (Number())](core.toNumber) |
| testo | [Cast in testo (String())](core.toText) |
| sì/no | [Cast in sì/no (Boolean())](core.toBool) |
| testo JSON | [Cast in testo JSON (JSON.stringify)](core.toJson) |
| da testo JSON | [Cast da testo JSON (JSON.parse)](core.parseJson) |

Per le regole di conversione, gli esempi e gli errori vedi le pagine dei nuovi blocchi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da convertire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | Il valore convertito. |
| **Exception** (`error`) | oggetto | Quando la conversione non è possibile (in **numero** o **da testo JSON**). |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **In** (`to`) | numero, testo, sì/no, testo JSON, da testo JSON | numero | In cosa convertire. |

## Vedi anche

- [Come funziona un blocco](ide/blocks)
