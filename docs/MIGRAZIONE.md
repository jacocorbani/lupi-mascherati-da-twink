# Migrazione Spark e ripristino
La sorgente è `groups/combriccola-principale`. I nomi legacy non sono identità Firebase: nessuna attribuzione automatica. I documenti originali restano nella sorgente e in un archivio `historical/legacy_HASH` leggibile solo dagli amministratori.

## Backup
`node scripts/backup-production.cjs` usa la sessione Firebase CLI dell'operatore, legge ricorsivamente gruppo e sottocollezioni e scrive un JSON con hash SHA-256 verificato tramite rilettura. È un backup logico, non uno snapshot transazionale: quello finale va eseguito dopo il blocco delle scritture legacy nella finestra di passaggio.

## Piano gratuito
`scripts/spark-plan.js` prepara archivio e diario v2. Le foto fino a 300.000 caratteri restano inline; quelle più grandi vengono ridimensionate e convertite localmente in JPEG tramite Sharp. L'originale integrale rimane nell'archivio e nel backup. Le date non vengono inventate; gli autori non associati restano storici. Voti legacy non autenticati non entrano nei nuovi sondaggi.

```sh
node functions/import-spark.js BACKUP SHA256
```
Senza `--apply` non esegue richieste remote. Il dry-run aggiornato del 13 novembre conta 99 documenti, 113 scritture, 7 immagini e 6 segnalazioni; va rinnovato prima del passaggio.

## Importazione
Impostare `MIGRATION_CUTOVER_READY=SHA256` solo dopo test, preparazione del frontend e chiusura dei percorsi legacy. Il backup di produzione deve avere meno di un'ora. Eseguire:
```sh
node functions/import-spark.js BACKUP SHA256 --apply
```
Non serve un bucket. Il progetto di produzione è vincolato a `lupimacheratidatwink`; eventuali emulatori devono usare un progetto `demo-` con Auth e Firestore attivi.

Lo strumento genera un journal JSONL privato, sincronizzato prima di ogni scrittura. Usa creazione senza sovrascrittura e confronta contenuti e hash durante la ripresa. Un conflitto interrompe l'esecuzione. Nessuna cancellazione automatica.

## Verifica e ripristino
Conservare i journal di tutte le esecuzioni, anche interrotte. Verificare che il numero di documenti importati corrisponda al piano e che il diario contenga le immagini attese. In caso di rollback non eliminare le sorgenti legacy. Prima di rimuovere eventuali documenti v2, verificare che coincidano ancora con i contenuti del journal e salvare un nuovo backup di ogni modifica successiva. Tenere il frontend in manutenzione durante un ripristino. La vecchia app e le sue regole aperte non costituiscono una soluzione sicura di rollback.

Questionari, coda, streak e vecchie estrazioni sono conservati nell'archivio; la loro conversione in funzioni interattive non è inclusa.

