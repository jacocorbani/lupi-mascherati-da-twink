# Inventario verificato — 16 ottobre 2026

## Codice originale

Repository `jacocorbani/lupi-mascherati-da-twink`, branch `main`, commit `79159f2b00b31ef8992f8c3a9a096d874c649343`. Un solo file `index.html` di 42.916 byte. Bundle Git locale creato e verificato con `git bundle verify`; non pubblicato perché contiene anche la vecchia credenziale incorporata nella cronologia.

Il browser usava `memberId`, `memberName` e `isAdmin` in localStorage. Il nome consentiva di riutilizzare un altro identificativo. Il controllo amministratore era nel client. Sono presenti interpolazioni HTML non sicure in più viste; la v2 usa nodi DOM di testo.

## Firebase reale, sola lettura

- Progetto `lupimacheratidatwink`, attivo.
- Database `(default)`, `STANDARD`, modalità `FIRESTORE_NATIVE`, regione `eur3`, free tier.
- PITR e protezione da eliminazione risultano disattivati. Nessuna impostazione è stata cambiata.
- Collezione radice rilevata: `groups`.
- Regole attive Firestore: accesso globale in lettura e scrittura con condizione `true`. Non sono regole temporanee con scadenza effettiva, nonostante il commento standard presente nel file.
- Nessuna regola Storage attiva rilevata dal server MCP; elenco bucket vuoto.
- Auth Admin config restituisce `404 CONFIGURATION_NOT_FOUND`; configurazione Authentication non presente all'ispezione.
- Cloud Billing: `billingEnabled: false`. Nessun costo o piano è stato attivato.
- `functions:list` non ha restituito un elenco valido: non si dichiara verificata l'assenza di funzioni.

## Backup dati

Backup logico ricorsivo del gruppo `combriccola-principale`: **96 documenti**, 1.333.055 byte. Hash SHA-256 verificato dopo rilettura:

`62b874a94384dfb542ec919a3d2b3fd92623961310afac15f361422d6bfc1256`

Il backup è privato nella cartella locale ignorata `backups/`. Non contiene credenziali Auth. Le copie delle regole lette sono in `reports/private/firebase-inspect/`.

| Collezione legacy                   | Documenti |
| ----------------------------------- | --------: |
| members                             |        13 |
| diary                               |        13 |
| polls                               |         4 |
| questionnaires                      |         2 |
| questionnaires / responses (totale) |         8 |
| queueWaits                          |         5 |
| streakEvents                        |         2 |
| wheel                               |         1 |
| wheelSpins                          |        48 |

## Impatto sulla migrazione

Il diario non registra UID né ID locale dell'autore: l'identità non può essere ricostruita automaticamente da un nome. Gli eventi streak non conservano l'elenco dei presenti, soltanto conteggi. I voti e le risposte precedenti non sono autenticati e devono rimanere distinti dalle nuove votazioni. Le immagini sono Data URL nei documenti. Il dry-run conserva gli originali e segnala le associazioni ancora da verificare.

## Nuovo modello

`members/{uid}`: nickname, avatar Storage, data creazione; `privateMembers/{uid}`: username, nome reale, data creazione; `access/{uid}`: active, mustChangePassword, sessionVersion. Le Custom Claims contengono admin e sessionVersion.

Collezioni funzionali: `diary`, `polls` con `votes/{uid}`, `events` con `attendance/{uid}`, `wheel/config`, `wheelSpins`, `rankings`. Operazioni privilegiate registrate in `audit`; rate limit server in `limits`; archivio della migrazione in `historical`, riservato agli amministratori. Tutti i percorsi legacy sono negati dalle nuove regole: serve un passaggio coordinato dal vecchio frontend.
