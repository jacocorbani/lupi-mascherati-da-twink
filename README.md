# Il Diario della Combriccola · 2.0

Web app privata in italiano: dashboard, diario fotografico, sondaggi, calendario con partecipazioni, ruota con estrazione server, classifiche, profilo e amministrazione.

**Branch di revisione, non ancora pubblicato.** Nessun deploy automatico e nessuna modifica a `main` o al database originale. Consultare `docs/VERIFICHE.md` e `docs/PUBBLICAZIONE.md` prima del rilascio.

## Sviluppo locale

Requisiti: Node.js 22, pnpm 11, Java 21 per gli emulatori.

```sh
pnpm install
cp .env.example .env.local
echo AUTH_WEB_API_KEY=demo-key > functions/.env.local
pnpm exec firebase emulators:start --project demo-combriccola
# In un altro terminale:
pnpm dev
```

Le variabili `VITE_*` sono configurazione pubblica, non credenziali. Non mettere mai password o chiavi di servizio nel frontend. `.env.local`, backup e report privati sono esclusi dal controllo versione. L'app senza configurazione mostra la schermata di accesso e non si collega alla produzione. L'anteprima grafica con dati inventati è disponibile solo sul server Vite di sviluppo tramite `/?preview=1`; viene esclusa dalla build di produzione.

Per creare un primo amministratore negli emulatori, usare `functions/bootstrap-admin.js` impostando nell'ambiente `GCLOUD_PROJECT=demo-combriccola`, `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `ADMIN_USERNAME`, `ADMIN_NICKNAME`, `ADMIN_REAL_NAME`, `ADMIN_INITIAL_PASSWORD`. La password deve avere almeno 12 caratteri. Non passarla in un comando salvato nella cronologia. Al primo accesso sarà obbligatorio cambiarla.

## Verifiche

```sh
pnpm test
pnpm test:rules
pnpm test:integration
pnpm build
```

Le suite usano solo `demo-combriccola`. I dati dei test sono fittizi. I messaggi `PERMISSION_DENIED` nei casi negativi sono attesi. I test di integrazione verificano le callable reali servite dagli emulatori, non semplici mock.

## Architettura

- Frontend HTML/CSS/JavaScript modulare con Vite; Firebase SDK modulare, grafici dei voti CSS senza Chart.js.
- Firebase Auth con email tecnica deterministica `username@members.combriccola.invalid`; l'utente inserisce username e password. Nessun elenco di credenziali nel browser.
- Account del gruppo creati solo tramite Admin SDK. Eventuali account Auth non autorizzati sono esclusi da ogni dato e funzione tramite enrollment in `access/{uid}`. Prima del rilascio va inoltre disabilitata la registrazione client nella configurazione Identity Platform, se disponibile nel progetto: nascondere il pulsante di registrazione da solo non disabilita l'API Auth.
- `access/{uid}` contiene stato, obbligo di cambio password e versione della sessione; il ruolo amministratore viene esclusivamente dalle Custom Claims. Reset e disattivazione invalidano le versioni precedenti subito, oltre a revocare i refresh token.
- Nessuna password su Firestore. Il cambio verifica la password attuale tramite Firebase Auth e imposta quella nuova tramite Admin SDK. Le password non vengono registrate nei log applicativi.
- Firestore è leggibile dai membri autorizzati, con dati privati separati. **Tutte le scritture client sono negate**: le callable selezionano i campi ammessi e validano tipi, limiti e proprietà. Non servono validator di scrittura nelle regole perché nessuna scrittura è ammessa.
- App Check obbligatorio sulle callable in produzione; escluso solo negli emulatori. Protezioni Auth, errori di login generici e limiti per utente/funzione riducono l'abuso; non costituiscono una garanzia contro ogni attacco.
- Fotografie private in Storage, lette come Blob autenticati, senza pubblicare download URL permanenti. Sono ammessi JPG/PNG/WebP fino a 5 MB; la UI tratta i testi come nodi di testo, senza HTML interpolato.

## Organizzazione

`src/` contiene interfaccia e moduli; `functions/` backend e strumenti amministrativi; `firestore.rules` e `storage.rules` le regole; `tests/` i test; `scripts/` pianificazione della migrazione; `docs/` inventario e rilascio.

La build `dist/` è statica e usa percorsi relativi: è compatibile con GitHub Pages sotto `/lupi-mascherati-da-twink/`. Le callable sono ospitate separatamente in Firebase. Non esiste un backend Node su GitHub Pages.

## Migrazione

Leggere `docs/MIGRAZIONE.md`. Il codice originale è identificato dal commit `79159f2b00b31ef8992f8c3a9a096d874c649343`; è stato creato e verificato un bundle Git locale. Il bundle contiene la cronologia originale e non va pubblicato come nuovo artefatto.

Gli strumenti conservano una copia completa dei documenti legacy in un archivio riservato agli amministratori e preparano il diario v2 senza attribuire automaticamente i nomi a nuovi UID. Questionari, voti legacy, streak, coda e vecchie estrazioni restano nell'archivio: le loro vecchie interfacce operative non sono state riprodotte nella v2. La loro conversione in funzioni v2 richiede una revisione esplicita dei dati.

## Riferimenti

- [Firebase Admin: gestione account](https://firebase.google.com/docs/auth/admin/manage-users)
- [Callable Functions](https://firebase.google.com/docs/functions/callable)
- [App Check per Functions](https://firebase.google.com/docs/app-check/cloud-functions)
- [Security Rules](https://firebase.google.com/docs/rules)
