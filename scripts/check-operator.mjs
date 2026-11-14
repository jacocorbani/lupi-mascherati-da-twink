import {operatorServices} from '../functions/operator-app.js';
const {db,auth}=await operatorServices();
console.log(JSON.stringify({legacyRootExists:(await db.doc('groups/combriccola-principale').get()).exists,authUsers:(await auth.listUsers(1)).users.length}));
await db.terminate();
