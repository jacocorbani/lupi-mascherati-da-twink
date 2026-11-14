# Il Diario della Combriccola · Spark
App privata in italiano: diario fotografico, sondaggi, eventi, ruota, classifiche e profili.
**Solo piano Firebase Spark, nessuna fatturazione.** Frontend su GitHub Pages; Firebase Authentication e Firestore. Non vengono usati Cloud Functions o Cloud Storage.

## Sviluppo e test
Requisiti: Node 22, pnpm 11, Java 21.
```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm exec firebase emulators:start --project demo-combriccola --only auth,firestore
# Altro terminale:
pnpm dev
```
`/?preview=1` mostra dati inventati solo in sviluppo. La build senza variabili Firebase non si collega automaticamente alla produzione.
```sh
pnpm test
pnpm test:rules
pnpm test:integration
pnpm build
```
La CI usa soltanto emulatori e dati sintetici.

## Account
Gli account del gruppo vengono creati e gestiti dall'operatore sul proprio computer, usando la sessione ufficiale Firebase CLI. Nessuna chiave di servizio viene inclusa nel sito.
```sh
node functions/accounts-local.js create nomeutente Soprannome --apply
node functions/accounts-local.js reset nomeutente Soprannome --apply
node functions/accounts-local.js disable nomeutente Soprannome --apply
node functions/accounts-local.js enable nomeutente Soprannome --apply
```
La creazione del primo amministratore richiede anche `--admin`. Reset e riattivazione generano una nuova password temporanea; le credenziali sono scritte esclusivamente in `reports/private/credenziali-*.local.json`, escluso da Git. Comunicarle privatamente, cambiarle al primo accesso e rimuovere la copia temporanea dopo la consegna. Non condividere l'intera cartella del progetto: contiene backup e file privati ignorati da Git.

Lo script impedisce la disattivazione dell'ultimo amministratore. In caso di errore di provisioning lascia l'accesso chiuso; il recupero richiede un operatore. Una creazione fallita con username già esistente non ne prende il controllo.

## Sicurezza e limiti del piano gratuito
- Auth email/password con email tecnica deterministica; password minima di 12 caratteri configurata nel provider.
- Iscrizioni e cancellazioni autonome disabilitate nel progetto. Un account Auth senza iscrizione in `access` non può accedere ai dati.
- Ruolo admin e versione sessione sono Custom Claims assegnate solo da strumenti locali. Le regole verificano stato, versione e data minima di autenticazione.
- I client possono scrivere solo i campi e i documenti consentiti dalle regole. Ogni voto è un documento immutabile per UID: i conteggi vengono calcolati dai voti letti.
- Profili pubblici separati da nomi reali e username, visibili solo al proprietario e agli amministratori.
- Le foto vengono compresse nel browser in JPEG (massimo 300.000 caratteri base64) e salvate dentro documenti Firestore; nessun bucket. Gli originali storici restano nell'archivio amministrativo.
- La ruota estrae nel browser ed è destinata al gioco: un client modificato può scegliere uno spicchio valido. Nessuna certificazione server della casualità.
- Il cambio password avviene con il SDK Auth, dopo verifica della password attuale. Il promemoria al primo accesso è un vincolo dell'interfaccia, non una prova verificabile dalle regole che la password sia stata cambiata. Il possessore della password temporanea ha già accesso all'account.
- Il cambio password aggiorna la data minima di autenticazione; reset/disattivazione locali cambiano anche la versione firmata per invalidare i vecchi token.
- Il piano Spark ha quote: al loro esaurimento alcune operazioni possono fermarsi. Non viene attivata fatturazione automaticamente. Non è una garanzia di disponibilità illimitata.
- Diario, sondaggi e storico estrazioni caricano inizialmente 20 elementi. Profili e foto piccole restano adatti a un gruppo ristretto.

## Pubblicazione
`firebase.web.json` contiene esclusivamente la configurazione **pubblica** del SDK, non credenziali amministrative.
`scripts/prepare-pages.cjs` prepara la build di produzione; il workflow Pages pubblica solo `dist/`.
Le regole Firestore sono distribuite separatamente dall'operatore; `firebase.json` non contiene Functions o Storage.
Consultare `docs/PUBBLICAZIONE.md`, `docs/MIGRAZIONE.md` e `docs/VERIFICHE.md`.

La cronologia Git conserva la precedente proposta basata su Functions. Quella versione non è il percorso di rilascio attuale. Questionari, coda, streak e voti legacy sono preservati nell'archivio amministrativo; le rispettive vecchie interfacce non sono state riprodotte.

