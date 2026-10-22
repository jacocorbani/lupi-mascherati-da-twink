# Conservazione e migrazione

Il vecchio client legge `groups/combriccola-principale`. Non dedurre che sia vuoto. I vecchi membri non sono identità Firebase verificate. Il diario e la coda conservano nomi testuali; i sondaggi associano voti a ID locali; gli streak conservano solo conteggi, non i partecipanti selezionati. I questionari hanno risposte in sottocollezioni e il blocco del voto nel vecchio client è locale al browser.

## Backup

`functions/backup.js PROJECT_ID` legge ricorsivamente il gruppo e tutte le sottocollezioni con credenziali operatore ADC. Scrive in `backups/` un JSON e il suo SHA-256. Non esporta password o account Auth. Il backup è una lettura paginata logica, non uno snapshot transazionale: eseguirlo in una finestra senza scritture o usare anche un export gestito Firestore approvato. Conservare separatamente le regole e gli eventuali file Storage.

Verificare hash, numero documenti, sottocollezioni e possibilità di rilettura prima di qualsiasi importazione. Non caricare backup o report con dati personali su GitHub.

## Dry-run

```sh
node scripts/migrate.js backups/backup.json mapping.local.json
```

La modalità è sempre dry-run: crea `reports/private/migration-plan.json` e un riepilogo. Un mapping accettato ha struttura:

```json
{
  "diary:legacy-post-id": {
    "uid": "uid-verificato",
    "verified": true,
    "verifiedBy": "operatore",
    "verifiedAt": "data-ISO"
  }
}
```

Per i membri la chiave è l'ID legacy; per i post è `diary:ID` perché il vecchio autore è solo un nome. Il codice non tenta match per nome, anche se apparentemente univoco. Il mapping deve essere approvato dalla persona competente; il flag non prova da solo la correttezza dell'identità.

Ogni documento originale viene copiato in `historical/legacy_HASH` leggibile solo dagli admin. Il diario viene preparato anche in `diary/legacy_HASH` con autore UID verificato o `null` (visualizzato come membro storico), fotografie convertibili in Storage e date conservate. Voti non autenticati non vengono sommati ai nuovi voti.

## Prova negli emulatori

Avviare emulatori con `--project demo-combriccola`, impostare `GCLOUD_PROJECT=demo-combriccola`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`, quindi:

```sh
node functions/import-staging.js reports/private/migration-plan.json
```

Gli ID derivano dai percorsi originali; la seconda esecuzione salta i documenti già presenti. Le scritture usano `create`, non sovrascrivono. Il journal indica elementi creati e già presenti. Un conflitto deve essere revisionato: non assumere che «già presente» significhi contenuto identico. Nessuna cancellazione degli originali.

## Ripristino

In staging eliminare esclusivamente gli elementi creati riportati nel journal, dopo aver verificato che nessuno li abbia modificati e aver salvato un export dell'ambiente. Per una produzione futura il rollback deve includere checkpoint dei documenti v2, oggetti Storage e regole precedenti, oltre alla versione del frontend. Conservare sempre la sorgente legacy; ripristinare la vecchia app non risolve le sue debolezze di autenticazione. Non eliminare automaticamente il database originale.

## Cosa resta subordinato ai dati reali

Associazioni personali, gestione di documenti oltre limite, conversione operativa di questionari/coda/streak e importazione in produzione richiedono la revisione del report reale. Le date mancanti non sono inventate. Le immagini non riconosciute rimangono nella copia originale riservata. In caso di interruzione, controllare documenti già scritti e Storage prima di ripetere l'importazione.
