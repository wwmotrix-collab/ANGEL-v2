/*
 * ANGEL · TSE Realtime Database adapter
 *
 * Objetivo:
 * - migrar a base hardcoded LOCAIS_TSE do index.html para o Firebase Realtime Database;
 * - carregar os locais eleitorais do Firebase sem quebrar a aba Eleitoral atual;
 * - manter fallback seguro enquanto o index.html ainda não for limpo.
 *
 * Caminho usado no RTDB:
 *   tse/viamao/2024/locais_votacao/{id}
 *   tse/viamao/2024/meta
 *
 * Observação: o projeto atual já usa Firebase Realtime Database em window._fb.
 * Por isso esta camada evita trocar para Firestore no meio da versão.
 */
(function angelTseRealtimeDb(global) {
  'use strict';

  var DEFAULT_CONFIG = {
    municipio: 'viamao',
    uf: 'RS',
    ano: 2024,
    cargoReferencia: 'prefeito',
    candidatoReferencia: 'Guto Lopes',
    basePath: 'tse/viamao/2024',
  };

  var PATHS = {
    locais: DEFAULT_CONFIG.basePath + '/locais_votacao',
    meta: DEFAULT_CONFIG.basePath + '/meta',
    logs: DEFAULT_CONFIG.basePath + '/logs',
  };

  function getFb() {
    if (!global._fb || !global._fb.db || !global._fb.ref) {
      throw new Error('Firebase ainda não está pronto em window._fb.');
    }
    return global._fb;
  }

  function onFirebaseReady(fn) {
    if (global._fb && global._fb.db) {
      fn();
      return;
    }
    global.addEventListener('firebase-ready', fn, { once: true });
  }

  function readHtmlLocais() {
    try {
      // Top-level const em script clássico fica disponível como binding global,
      // embora não vire window.LOCAIS_TSE. Por isso acessamos por identificador.
      if (Array.isArray(LOCAIS_TSE)) return LOCAIS_TSE;
    } catch (e) {
      return [];
    }
    return [];
  }

  function normalizeLocal(local) {
    var id = Number(local.id);
    return {
      id: id,
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
      .filter(function (item) { return item && item.id && item.nome; })
      .map(normalizeLocal)
      .sort(function (a, b) { return (b.el || 0) - (a.el || 0); });
  }

  function toRecord(list) {
    return normalizeList(list).reduce(function (acc, item) {
      acc[String(item.id)] = item;
      return acc;
    }, {});
  }

  function fromRecord(record) {
    if (!record) return [];
    return normalizeList(Object.keys(record).map(function (key) { return record[key]; }));
  }

  function buildMeta(list, extra) {
    var normalized = normalizeList(list);
    var eleitores = normalized.reduce(function (sum, item) { return sum + (item.el || 0); }, 0);
    var secoes = normalized.reduce(function (sum, item) { return sum + (item.ns || 0); }, 0);
    var oficiais = normalized.filter(function (item) { return !item.est; }).length;
    var estimados = normalized.filter(function (item) { return item.est; }).length;
    return Object.assign({
      municipio: DEFAULT_CONFIG.municipio,
      uf: DEFAULT_CONFIG.uf,
      ano: DEFAULT_CONFIG.ano,
      cargoReferencia: DEFAULT_CONFIG.cargoReferencia,
      candidatoReferencia: DEFAULT_CONFIG.candidatoReferencia,
      totalLocais: normalized.length,
      totalLocaisOficiais: oficiais,
      totalLocaisEstimados: estimados,
      totalEleitores: eleitores,
      totalSecoes: secoes,
      fonte: 'migrado_do_index_html',
      atualizadoEm: Date.now(),
    }, extra || {});
  }

  async function fetchLocaisFromDb() {
    var fb = getFb();
    var snap = await fb.get(fb.ref(fb.db, PATHS.locais));
    return fromRecord(snap.val());
  }

  async function saveLocaisToDb(list, options) {
    var fb = getFb();
    var normalized = normalizeList(list);
    if (!normalized.length) throw new Error('Nenhum local TSE válido para migrar.');
    var meta = buildMeta(normalized, options && options.meta);
    await fb.set(fb.ref(fb.db, PATHS.locais), toRecord(normalized));
    await fb.set(fb.ref(fb.db, PATHS.meta), meta);
    if (fb.push) {
      await fb.push(fb.ref(fb.db, PATHS.logs), {
        acao: 'migracao_html_para_rtdb',
        totalLocais: normalized.length,
        totalEleitores: meta.totalEleitores,
        totalSecoes: meta.totalSecoes,
        ts: Date.now(),
      });
    }
    return { locais: normalized, meta: meta };
  }

  function replaceHtmlArray(list) {
    var alvo = readHtmlLocais();
    if (!Array.isArray(alvo)) return false;
    alvo.splice.apply(alvo, [0, alvo.length].concat(normalizeList(list)));
    return true;
  }

  function refreshUi() {
    try { if (typeof renderColigacaoHeader === 'function') renderColigacaoHeader(); } catch (e) {}
    try { if (typeof renderEleitoral === 'function') renderEleitoral(); } catch (e) {}
    try {
      var active = document.querySelector('#eleitoralView.active');
      if (active && typeof renderEleitoral === 'function') renderEleitoral();
    } catch (e) {}
    global.dispatchEvent(new CustomEvent('angel-tse-ready', {
      detail: { locais: readHtmlLocais().length, source: 'firebase_or_fallback' }
    }));
  }

  async function loadFromFirebase(options) {
    var opts = options || {};
    var locais = await fetchLocaisFromDb();
    if (!locais.length) {
      if (opts.seedIfEmpty) {
        return migrateFromHtml({ replaceCurrent: true, meta: { seedIfEmpty: true } });
      }
      return {
        source: 'html_fallback',
        locais: readHtmlLocais(),
        meta: buildMeta(readHtmlLocais(), { fallback: true }),
      };
    }
    replaceHtmlArray(locais);
    refreshUi();
    return {
      source: 'firebase_rtdb',
      locais: locais,
      meta: buildMeta(locais, { loadedFromFirebase: true }),
    };
  }

  async function migrateFromHtml(options) {
    var opts = options || {};
    var htmlLocais = readHtmlLocais();
    var result = await saveLocaisToDb(htmlLocais, {
      meta: Object.assign({ migratedBy: 'AngelTSE.migrateFromHtml' }, opts.meta || {})
    });
    if (opts.replaceCurrent !== false) {
      replaceHtmlArray(result.locais);
      refreshUi();
    }
    return Object.assign({ source: 'html_migrated_to_firebase_rtdb' }, result);
  }

  async function status() {
    var htmlCount = readHtmlLocais().length;
    var firebaseCount = 0;
    var meta = null;
    try {
      var fb = getFb();
      var locaisSnap = await fb.get(fb.ref(fb.db, PATHS.locais));
      firebaseCount = fromRecord(locaisSnap.val()).length;
      var metaSnap = await fb.get(fb.ref(fb.db, PATHS.meta));
      meta = metaSnap.val();
    } catch (e) {
      return { ok: false, erro: e.message, htmlCount: htmlCount, firebaseCount: firebaseCount, paths: PATHS };
    }
    return { ok: true, htmlCount: htmlCount, firebaseCount: firebaseCount, meta: meta, paths: PATHS };
  }

  global.AngelTSE = {
    config: DEFAULT_CONFIG,
    paths: PATHS,
    readHtmlLocais: readHtmlLocais,
    loadFromFirebase: loadFromFirebase,
    migrateFromHtml: migrateFromHtml,
    saveLocaisToDb: saveLocaisToDb,
    fetchLocaisFromDb: fetchLocaisFromDb,
    status: status,
  };

  // Carrega do Firebase automaticamente quando a base já existir.
  // Não semeia automaticamente para evitar escrita surpresa em produção.
  onFirebaseReady(function () {
    loadFromFirebase({ seedIfEmpty: false }).catch(function (err) {
      console.warn('[AngelTSE] usando fallback HTML:', err && err.message ? err.message : err);
    });
  });
})(window);
