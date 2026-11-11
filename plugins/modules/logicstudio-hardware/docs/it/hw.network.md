# networkInterfaces (interfacce di rete)

`hw.network` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Le interfacce di rete del computer dove gira lilOS (cavo, Wi-Fi, VPN): indirizzi IP e MAC, se sono collegate; avvisa quando cambiano, per esempio quando il computer cambia rete.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Legge adesso e manda le uscite. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **interfacce** (`interfaces`) | lista | Un'interfaccia per elemento (vedi sotto). |
| **IP (interfaccia principale)** (`ip`) | testo | L'indirizzo IPv4 dell'interfaccia principale (quella della strada predefinita), vuoto senza rete. |
| **cambiate** (`changed`) | impulso | Le interfacce sono cambiate dalla lettura precedente. |
| **Exception** (`error`) | oggetto | Permesso mancante, libreria che non si carica. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Leggi da solo ogni (secondi, 0 = mai)** (`seconds`) | da 0 a 86400 | 0 | Con un numero, il blocco legge da solo e manda le uscite solo quando qualcosa cambia. |
| **Anche quelle interne (loopback)** (`internal`) | sì/no | no | |

## Come funziona

Ogni interfaccia: `{ name, label, ip4, ip6, mac, internal, up, type, speed, default }`. `up` dice se è collegata, `type` è `wired` o `wireless` quando il sistema lo sa, `speed` in Mbit/s, `default` è `true` per quella principale.

Le interfacce «cambiano» quando cambia un nome, un indirizzo IPv4 o IPv6, o lo stato collegata/scollegata.

## Esempi

### 1. Mostrare l'indirizzo

```
[All'avvio (main)] impulso ──▶ leggi [networkInterfaces (interfacce di rete)] IP (interfaccia principale) ──▶ testo [Etichetta: label1]
```

### 2. Avvisare quando cambia la rete

```
[networkInterfaces (interfacce di rete): ogni 30 s] cambiate ──▶ invia [Notify: "La rete è cambiata"]
                                                    IP (interfaccia principale) ──▶ valore [Print (console.log)]
```

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per le informazioni di sistema. |
| La libreria systeminformation non funziona su questo computer: … | La libreria non si carica. |

## Vedi anche

- [os (info di sistema)](hw.systemInfo)
- [Blocchi di rete](logicstudio-net)
- [Hardware](logicstudio-hardware)
