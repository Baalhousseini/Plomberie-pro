const FIREBASE_CONFIG = {
  apiKey:      "AIzaSyC_AuyKpLaoTAdi5R5VNh8Jn-k_jN_541A",
  authDomain:  "plomberie-pro-7a56a.firebaseapp.com",
  databaseURL: "https://plomberie-pro-7a56a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:   "plomberie-pro-7a56a",
};

const SYNC_KEYS = [
  'pl_rdvs','pl_rapports','pl_devis','pl_dispos',
  'pl_chat','pl_urgences','pl_primes','pl_savs',
  'pl_pipe','pl_stock','pl_zones','pl_conc',
  'pl_notes','pl_alertes','pl_conges','pl_session'
];

function _configOk(){
  return FIREBASE_CONFIG.databaseURL &&
         !FIREBASE_CONFIG.databaseURL.includes('COLLE');
}

function _showFbStatus(ok, msg){
  document.addEventListener('DOMContentLoaded', function(){
    var b = document.createElement('div');
    b.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:'+(ok?'#15803d':'#b91c1c')+';color:#fff;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;font-family:sans-serif;opacity:0.9;';
    b.textContent = ok ? '🔥 Firebase OK' : '⚠️ Mode local';
    b.title = msg;
    document.body.appendChild(b);
    // badge permanent
  });
}

if(typeof firebase !== 'undefined' && _configOk()){
  try {
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const _db = firebase.database();
    const _ns  = 'greenflow/';

    const _origSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value){
      _origSet(key, value);
      if(SYNC_KEYS.includes(key)){
        try { _db.ref(_ns + key).set(JSON.parse(value)); } catch(e){}
      }
    };

    SYNC_KEYS.forEach(function(key){
      _db.ref(_ns + key).on('value', function(snap){
        const val = snap.val();
        if(val === null) return;
        const json = JSON.stringify(val);
        const current = localStorage.getItem(key);
        if(current === json) return;
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

    _showFbStatus(true, 'Firebase connecte');
  } catch(e){
    _showFbStatus(false, e.message);
  }
} else {
  _showFbStatus(false, 'Firebase SDK non charge');
}
