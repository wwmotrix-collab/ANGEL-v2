/*
 * ANGEL · TSE Firestore adapter
 *
 * Destino principal para a base eleitoral/TSE.
 *
 * O app atual já usa Realtime Database em window._fb para dados operacionais,
 * mas a base TSE é mais adequada ao Firestore por ser documental,
 * versionada por município/ano e consultável como coleção.
 *
 * Estrutura Firestore:
 *   tse_municipios/{municipioUfAno}
 *   tse_municipios/{municipioUfAno}/locais_votacao/{localId}
 *   tse_municipios/{municipioUfAno}/logs/{autoId}
 *
 * Exemplo:
 *   tse_municipios/viamao_rs_2024
 *   tse_municipios/viamao_rs_2024/locais_votacao/1155
 */

import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBbW0BNxzxXGMAJuS0st1iUomJX_2vfPZ0',
  authDomain: 'windmap-viamao.firebaseapp.com',
  databaseURL: 'https://windmap-viamao-default-rtdb.firebaseio.com',
  projectId: 'windmap-viamao',
  storageBucket: 'windmap-viamao.firebasestorage.app',
  messagingSenderId: '847928249870',
  appId: '1:847928249870:web:874f17a63236411110b65f',
};

const CONFIG = {
  municipio: 'viamao',
  municipioNome: 'Viamão',
  uf: 'RS',
  ano: 2024,
  cargoReferencia: 'prefeito',
  candidatoReferencia: 'Guto Lopes',
  documentId: 'viamao_rs_2024',
  collectionRoot: 'tse_municipios',
  locaisCollection: 'locais_votacao',
  logsCollection: 'logs',
};

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
}

function getDb() {
  return getFirestore(getFirebaseApp());
}

function rootDocRef() {
  return doc(getDb(), CONFIG.collectionRoot, CONFIG.documentId);
}

function locaisCollectionRef() {
  return collection(rootDocRef(), CONFIG.locaisCollection);
}

function logsCollectionRef() {
  return collection(rootDocRef(), CONFIG.logsCollection);
}

function readHtmlLocais() {
  try {
    if (Array.isArray(LOCAIS_TSE)) return LOCAIS_TSE;
  } catch (e) {
    return [];
  }
  return [];
}

function normalizeLocal(local) {
  const id = Number(local.id);
  return {
    id,
    nome: String(local.nome || '').trim(),
    zona: Number(local.zona || 0),
    ns: Number(local.ns || 0),
    el: Number(local.el || 0),
    pct: Number(local.pct || 0),
    lat: Number(local.lat || 0),
    lng: Number(local.lng || 0),
    est: Boolean(local.est),
    pct_guto: Number(local.pct_guto || 0),
    votos_guto: Number(local.votos_guto || 0),
    votos_total: Number(local.votos_total || 0),
    fonte: local.fonte || (local.est ? 'html_seed_estimado' : 'html_seed_tse'),
    atualizadoEm: local.atualizadoEm || Date.now(),
  };
}

function normalizeList(list) {
  return (list || [])
    .filter((item) => item && item.id && item.nome)
    .map(normalizeLocal)
    .sort((a, b) => (b.el || 0) - (a.el || 0));
}

function buildMeta(list, extra = {}) {
  const normalized = normalizeList(list);
  const totalEleitores = normalized.reduce((sum, item) => sum + (item.el || 0), 0);
  const totalSecoes = normalized.reduce((sum, item) => sum + (item.ns || 0), 0);
  const totalLocaisEstimados = normalized.filter((item) => item.est).length;
  const totalLocaisOficiais = normalized.length - totalLocaisEstimados;

  return {
    municipio: CONFIG.municipio,
    municipioNome: CONFIG.municipioNome,
    uf: CONFIG.uf,
    ano: CONFIG.ano,
    cargoReferencia: CONFIG.cargoReferencia,
    candidatoReferencia: CONFIG.candidatoReferencia,
    totalLocais: normalized.length,
    totalLocaisOficiais,
    totalLocaisEstimados,
    totalEleitores,
    totalSecoes,
    fonte: 'migrado_do_index_html',
    schemaVersion: 1,
    atualizadoEm: Date.now(),
    ...extra,
  };
}

function replaceHtmlArray(list) {
  const target = readHtmlLocais();
  if (!Array.isArray(target)) return false;
  target.splice(0, target.length, ...normalizeList(list));
  return true;
}

function refreshUi(source) {
  try { if (typeof renderColigacaoHeader === 'function') renderColigacaoHeader(); } catch (e) {}
  try { if (typeof renderEleitoral === 'function') renderEleitoral(); } catch (e) {}
  window.dispatchEvent(new CustomEvent('angel-tse-ready', {
    detail: { locais: readHtmlLocais().length, source: source || 'firestore_or_fallback' },
  }));
}

async function fetchLocaisFromFirestore() {
  const snap = await getDocs(locaisCollectionRef());
  const locais = [];
  snap.forEach((item) => locais.push(item.data()));
  return normalizeList(locais);
}

async function fetchMetaFromFirestore() {
  const snap = await getDoc(rootDocRef());
  return snap.exists() ? snap.data() : null;
}

async function saveLocaisToFirestore(list, options = {}) {
  const normalized = normalizeList(list);
  if (!normalized.length) throw new Error('Nenhum local TSE válido para migrar.');

  const meta = buildMeta(normalized, {
    migratedBy: options.migratedBy || 'AngelTSEFirestore.saveLocaisToFirestore',
    migratedAtIso: new Date().toISOString(),
    ...options.meta,
  });

  await setDoc(rootDocRef(), {
    ...meta,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // Firestore limita batch a 500 operações. Mantemos margem de segurança.
  const chunkSize = 450;
  for (let i = 0; i < normalized.length; i += chunkSize) {
    const batch = writeBatch(getDb());
    normalized.slice(i, i + chunkSize).forEach((local) => {
      batch.set(doc(locaisCollectionRef(), String(local.id)), {
        ...local,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
  }

  await setDoc(doc(logsCollectionRef()), {
    acao: 'migracao_html_para_firestore',
    totalLocais: normalized.length,
    totalEleitores: meta.totalEleitores,
    totalSecoes: meta.totalSecoes,
    createdAt: serverTimestamp(),
  });

  return { locais: normalized, meta };
}

async function migrateFromHtml(options = {}) {
  const htmlLocais = readHtmlLocais();
  const result = await saveLocaisToFirestore(htmlLocais, {
    migratedBy: 'AngelTSEFirestore.migrateFromHtml',
    meta: options.meta || {},
  });
  if (options.replaceCurrent !== false) {
    replaceHtmlArray(result.locais);
    refreshUi('html_migrated_to_firestore');
  }
  return { source: 'html_migrated_to_firestore', ...result };
}

async function loadFromFirestore(options = {}) {
  const locais = await fetchLocaisFromFirestore();
  if (!locais.length) {
    if (options.seedIfEmpty) return migrateFromHtml({ replaceCurrent: true, meta: { seedIfEmpty: true } });
    return {
      source: 'html_fallback',
      locais: readHtmlLocais(),
      meta: buildMeta(readHtmlLocais(), { fallback: true }),
    };
  }
  replaceHtmlArray(locais);
  refreshUi('firestore');
  return {
    source: 'firestore',
    locais,
    meta: await fetchMetaFromFirestore(),
  };
}

async function status() {
  const htmlCount = readHtmlLocais().length;
  let firestoreCount = 0;
  let meta = null;
  try {
    const locais = await fetchLocaisFromFirestore();
    firestoreCount = locais.length;
    meta = await fetchMetaFromFirestore();
    return {
      ok: true,
      backend: 'firestore',
      htmlCount,
      firestoreCount,
      meta,
      path: `${CONFIG.collectionRoot}/${CONFIG.documentId}/${CONFIG.locaisCollection}`,
    };
  } catch (err) {
    return {
      ok: false,
      backend: 'firestore',
      htmlCount,
      firestoreCount,
      erro: err && err.message ? err.message : String(err),
      path: `${CONFIG.collectionRoot}/${CONFIG.documentId}/${CONFIG.locaisCollection}`,
    };
  }
}

window.AngelTSEFirestore = {
  config: CONFIG,
  status,
  loadFromFirestore,
  migrateFromHtml,
  saveLocaisToFirestore,
  fetchLocaisFromFirestore,
  fetchMetaFromFirestore,
};

// Alias principal para a aplicação.
// Se o adapter RTDB também estiver carregado, Firestore passa a ser o backend principal.
window.AngelTSE = window.AngelTSEFirestore;

loadFromFirestore({ seedIfEmpty: false }).catch((err) => {
  console.warn('[AngelTSEFirestore] fallback para base HTML:', err && err.message ? err.message : err);
});
