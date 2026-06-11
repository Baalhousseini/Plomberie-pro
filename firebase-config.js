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
  'pl_notes','pl_alertes','pl_conges','pl_session','pl_contrats_cadres'
];

// BroadcastChannel pour sync même appareil / même navigateur
var _bc = null;
try { _bc = new BroadcastChannel('gf_sync'); } catch(e){}

// Firebase DB handle (null si non connecté)
var _db = null;
var _ns = 'greenflow/';

// Initialise Firebase
if(typeof firebase !== 'undefined'){
  try {
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    _db = firebase.database();
  } catch(e){ _db = null; }
}

// Appel explicite : écrit une clé dans Firebase + BroadcastChannel
window.gfSync = function(key, value){
  if(!SYNC_KEYS.includes(key)) return;
  // BroadcastChannel (même appareil, autres onglets)
  if(_bc){
    try { _bc.postMessage({key:key, value:value}); } catch(e){}
  }
  // Firebase (cross-device)
  if(_db){
    try {
      _db.ref(_ns + key).set(JSON.parse(value)).catch(function(err){
        console.warn('[GreenFlow] Firebase write error:', err.message);
      });
    } catch(e){}
  }
};

// Écoute les changements entrants (Firebase + BroadcastChannel)
window.gfListen = function(callback){
  // BroadcastChannel
  if(_bc){
    _bc.onmessage = function(e){
      if(e.data && e.data.key && e.data.value !== undefined){
        var cur = localStorage.getItem(e.data.key);
        if(cur === e.data.value) return;
        localStorage.setItem(e.data.key, e.data.value);
        callback(e.data.key, e.data.value);
      }
    };
  }
  // Firebase
  if(_db){
    SYNC_KEYS.forEach(function(key){
      _db.ref(_ns + key).on('value', function(snap){
        var val = snap.val();
        if(val === null) return;
        var json = JSON.stringify(val);
        var cur = localStorage.getItem(key);
        if(cur === json) return;
        localStorage.setItem(key, json);
        callback(key, json);
      });
    });
  }
};

// Badge statut
document.addEventListener('DOMContentLoaded', function(){
  var ok = _db !== null;
  var b = document.createElement('div');
  b.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;background:'+(ok?'#15803d':'#b91c1c')+';color:#fff;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;font-family:sans-serif;opacity:0.9;cursor:pointer;';
  b.textContent = ok ? '🔥 Firebase OK' : '⚠️ Mode local';
  b.onclick = function(){ b.style.display='none'; };
  document.body.appendChild(b);
});
