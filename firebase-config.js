const FIREBASE_CONFIG = {
  apiKey:      "AIzaSyC_AuyKpLaoTAdi5R5VNh8Jn-k_jN_541A",
  authDomain:  "plomberie-pro-7a56a.firebaseapp.com",
  databaseURL: "https://plomberie-pro-7a56a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:   "plomberie-pro-7a56a",
};

const SYNC_KEYS = [
  // Core ops — partagé entre tous les modules
  'pl_rdvs','pl_rdv_com','pl_rapports','pl_devis','pl_dispos','pl_annulations',
  'pl_chat','pl_urgences','pl_primes','pl_savs',
  'pl_pipe','pl_stock','pl_zones','pl_conc',
  'pl_notes','pl_alertes','pl_conges','pl_session','pl_contrats_cadres',
  'pl_stock_pieces','pl_sous_traitants','pl_appels_offres',
  'pl_positions','pl_contrats','pl_passation','pl_clients','pl_appels',
  // Patron
  'pl_mandants',
  // Secrétaire — données isolées avant, maintenant synchonisées
  'pl_appels_sec','pl_devis_sec','pl_factures_sec',
  'pl_rh_sec','pl_notes_frais','pl_courrier',
  // Config partagée
  'pl_prix','pl_tel_pro','pl_objectif_annuel',
  // RH / techs
  'pl_techs_rh','pl_evaluations','pl_habilitations','pl_nps',
  'pl_fiches_logement','pl_fiches_emp'
];

// BroadcastChannel pour sync même appareil / même navigateur
var _bc = null;
try { _bc = new BroadcastChannel('gf_sync'); } catch(e){}

// Firebase DB handle (null si non connecté)
var _db = null;
var _ns = 'greenflow/';
var _REST_BASE = 'https://plomberie-pro-7a56a-default-rtdb.europe-west1.firebasedatabase.app/greenflow/';

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
  // Firebase SDK (cross-device push)
  if(_db){
    try {
      _db.ref(_ns + key).set(JSON.parse(value)).catch(function(err){
        console.warn('[GreenFlow] Firebase write error:', err.message);
      });
    } catch(e){}
  } else {
    // Fallback REST si SDK non dispo
    try {
      fetch(_REST_BASE + key + '.json', {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:value
      }).catch(function(){});
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
  // Firebase SDK push (temps réel)
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
      }, function(err){
        console.warn('[GreenFlow] Firebase listen error on', key, ':', err.message);
      });
    });
  }
};

// Polling REST Firebase — filet de sécurité cross-device (toutes les 8 secondes)
// Fonctionne même si le SDK Firebase rencontre des problèmes de règles
var _restSnaps = {};
var _REST_POLL_KEYS = ['pl_rdvs','pl_dispos','pl_urgences','pl_rapports','pl_alertes','pl_chat','pl_devis','pl_rdv_com','pl_annulations'];

function _gfRestPoll(){
  _REST_POLL_KEYS.forEach(function(key){
    fetch(_REST_BASE + key + '.json', {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(val){
        if(val === null || val === undefined) return;
        if(typeof val === 'object' && val.error) return; // règles bloquent
        var json = JSON.stringify(val);
        if(_restSnaps[key] === json) return; // pas de changement
        _restSnaps[key] = json;
        var cur = localStorage.getItem(key);
        if(cur === json) return; // déjà à jour localement
        localStorage.setItem(key, json);
        // Propager à tous les listeners du module courant
        if(_bc) try { _bc.postMessage({key:key, value:json}); } catch(e){}
        window.dispatchEvent(new StorageEvent('storage',{key:key,newValue:json,storageArea:localStorage}));
      })
      .catch(function(){});
  });
}

// Démarre le polling REST après 3s (laisse Firebase SDK s'initialiser d'abord)
setTimeout(function(){
  _gfRestPoll();
  setInterval(_gfRestPoll, 8000);
}, 3000);

// Badge statut — teste une vraie écriture pour confirmer la connectivité
document.addEventListener('DOMContentLoaded', function(){
  var b = document.createElement('div');
  b.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9999;color:#fff;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;font-family:sans-serif;opacity:0.9;cursor:pointer;background:#64748b;';
  b.textContent = '⏳ Connexion…';
  b.onclick = function(){ b.style.display='none'; };
  document.body.appendChild(b);

  if(!_db){
    // Pas de SDK Firebase, essaie REST
    fetch(_REST_BASE + '_ping.json', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({t:Date.now()})})
      .then(function(r){ return r.json(); })
      .then(function(v){
        if(v && v.error){
          b.textContent = '⚠️ Firebase: règles à ouvrir';
          b.style.background = '#b45309';
        } else {
          b.textContent = '🔥 Firebase REST ✓';
          b.style.background = '#15803d';
        }
      })
      .catch(function(){ b.textContent = '⚠️ Mode local'; b.style.background = '#b91c1c'; });
    return;
  }

  // Test écriture SDK Firebase
  _db.ref(_ns + '_ping').set({t: Date.now()})
    .then(function(){
      b.textContent = '🔥 Firebase ✓';
      b.style.background = '#15803d';
    })
    .catch(function(err){
      b.textContent = '⚠️ Firebase: ouvrir les règles DB';
      b.style.background = '#b45309';
      b.style.color = '#fff';
      console.error('[GreenFlow] Firebase write denied — fix rules in Firebase Console:', err.message);
    });
});
