// ============================================================
//  GREENFLOW — Configuration Firebase
//  Remplis les 4 valeurs ci-dessous avec ton projet Firebase :
//  console.firebase.google.com → Paramètres ⚙️ → Vos applications → </>
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:      "AIzaSyC_AuyKpLaoTAdi5R5VNh8Jn-k_jN_541A",
  authDomain:  "plomberie-pro-7a56a.firebaseapp.com",
  databaseURL: "https://plomberie-pro-7a56a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:   "plomberie-pro-7a56a",
};

// Clés partagées entre tous les modules
const SYNC_KEYS = [
  'pl_rdvs','pl_rapports','pl_devis','pl_dispos',
  'pl_chat','pl_urgences','pl_primes','pl_savs',
  'pl_pipe','pl_stock','pl_zones','pl_conc',
  'pl_notes','pl_alertes','pl_conges','pl_session'
];

// Vérifie que la config est remplie
function _configOk(){
  return FIREBASE_CONFIG.databaseURL &&
         !FIREBASE_CONFIG.databaseURL.includes('COLLE');
}

if(typeof firebase !== 'undefined' && _configOk()){
  try {
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const _db = firebase.database();
    const _ns  = 'greenflow/'; // namespace pour éviter les conflits

    // --- Intercepte localStorage.setItem → miroir Firebase ---
    const _origSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value){
      _origSet(key, value);
      if(SYNC_KEYS.includes(key)){
        try { _db.ref(_ns + key).set(JSON.parse(value)); } catch(e){}
      }
    };

    // --- Écoute Firebase → met à jour localStorage + déclenche storage event ---
    SYNC_KEYS.forEach(function(key){
      _db.ref(_ns + key).on('value', function(snap){
        const val = snap.val();
        if(val === null) return;
        const json = JSON.stringify(val);
        const current = localStorage.getItem(key);
        if(current === json) return; // pas de changement, évite boucle infinie
        _origSet(key, json);
        try {
          window.dispatchEvent(new StorageEvent('storage', {
            key: key,
            newValue: json,
            storageArea: localStorage
          }));
        } catch(e){}
      });
    });

    console.log('[GreenFlow] Firebase connecte — sync temps reel active');
  } catch(e){
    console.warn('[GreenFlow] Erreur Firebase, mode local uniquement :', e.message);
  }
} else {
  console.info('[GreenFlow] Firebase non configure — mode local (1 seul appareil)');
}
