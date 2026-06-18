/*
 * ANGEL Ops Bootstrap
 *
 * Integração incremental com o HTML atual. Injeta um painel leve no dashboard
 * e expõe funções globais para testar os protocolos sem alterar dados existentes.
 */
(function (global, document) {
  'use strict';

  var AngelOps = global.AngelOps || {};
  var PANEL_ID = 'angelOpsPanel';
  var OUTPUT_ID = 'angelOpsOutput';

  function safeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getState() {
    var state = { militantes: [], rotas: [], eventos: [], materiais: [] };
    try {
      if (typeof G !== 'undefined') {
        state.militantes = Array.isArray(G.militantes) ? G.militantes : [];
        state.rotas = Array.isArray(G.rotas) ? G.rotas : [];
        state.eventos = Array.isArray(G.eventos) ? G.eventos : [];
        state.materiais = Array.isArray(G.materiais) ? G.materiais : [];
      }
    } catch (err) {
      // Mantém integração tolerante a versões antigas do HTML.
    }
    return state;
  }

  function toast(message) {
    if (typeof global.showToast === 'function') global.showToast(message);
    else console.log('[ANGEL Ops]', message);
  }

  function parseCoordsFromModal() {
    var text = document.getElementById('coordText');
    if (!text) return null;
    var match = String(text.textContent || '').match(/(-?\d+[\.,]?\d*)\s*,\s*(-?\d+[\.,]?\d*)/);
    if (!match) return null;
    return { lat: Number(match[1].replace(',', '.')), lng: Number(match[2].replace(',', '.')) };
  }

  function getCurrentModalEvent() {
    var coords = parseCoordsFromModal() || {};
    var tipoLabel = document.getElementById('eventoTipoLabel');
    var nome = document.getElementById('fNome');
    var pessoas = document.getElementById('fPessoas');
    var activeTurno = document.querySelector('#camposEvento .status-opt.active');
    var tipo = tipoLabel ? tipoLabel.textContent.replace(/^\W+/, '').trim() : 'generico';

    return {
      tipo: tipo || 'generico',
      nome: nome ? nome.value : '',
      lat: coords.lat,
      lng: coords.lng,
      turno: activeTurno ? activeTurno.textContent.trim() : '',
      metaParticipantes: pessoas ? pessoas.value : ''
    };
  }

  function getLatestRouteEvent() {
    var state = getState();
    var routes = state.rotas.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    var route = routes[0];
    if (!route) return null;
    var firstPoint = route.pontos && route.pontos[0] ? route.pontos[0] : {};
    return {
      tipo: route.tipo === 'carrosom' ? 'carro_som' : route.tipo,
      nome: route.nome,
      lat: firstPoint.lat,
      lng: firstPoint.lng,
      rota: route.pontos,
      motorista: route.motoristaUid,
      horario: route.turno || '',
      ts: route.ts
    };
  }

  function sampleEvent(type) {
    var coord = null;
    try {
      if (typeof G !== 'undefined' && G.map && G.map.getCenter) {
        var c = G.map.getCenter();
        coord = { lat: c.lat, lng: c.lng };
      }
    } catch (err) {}
    coord = coord || { lat: -30.0800, lng: -51.0200 };
    return {
      tipo: type,
      nome: type === 'carro_som' ? 'Rota de som piloto' : 'Ação operacional piloto',
      lat: coord.lat,
      lng: coord.lng,
      turno: 'tarde',
      metaParticipantes: type === 'caminhada' ? 20 : 2
    };
  }

  function renderBriefResult(result) {
    var output = document.getElementById(OUTPUT_ID);
    if (!output) return;
    var plan = result.plan;
    var text = result.text;
    var missing = (plan.checklist.missing || []).length;
    var summary = plan.inviteSummary || {};

    output.innerHTML = '' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center;">' +
          '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:var(--accent);">' + safeHtml(plan.protocol.icon) + '</div>' +
          '<div style="font-size:10px;color:var(--muted);">' + safeHtml(plan.protocol.title) + '</div>' +
        '</div>' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center;">' +
          '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:' + (missing ? 'var(--yellow)' : 'var(--green)') + ';">' + missing + '</div>' +
          '<div style="font-size:10px;color:var(--muted);">Pendências</div>' +
        '</div>' +
        '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center;">' +
          '<div style="font-family:Syne,sans-serif;font-size:18px;font-weight:800;color:var(--green);">' + safeHtml(summary.available || 0) + '</div>' +
          '<div style="font-size:10px;color:var(--muted);">Disponíveis</div>' +
        '</div>' +
      '</div>' +
      '<pre style="white-space:pre-wrap;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;max-height:260px;overflow:auto;font-size:12px;line-height:1.55;color:var(--text);font-family:DM Sans, sans-serif;">' + safeHtml(text) + '</pre>' +
      '<div style="display:flex;gap:8px;margin-top:8px;">' +
        '<button onclick="AngelOpsUI.copyLastBrief()" style="flex:1;padding:9px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">Copiar análise</button>' +
        '<button onclick="AngelOpsUI.copyInviteMessage()" style="flex:1;padding:9px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;">Copiar convite</button>' +
      '</div>';
  }

  function analyzeEvent(event) {
    if (!AngelOps.briefForEvent) {
      toast('PicoClaw Ops ainda não carregou');
      return null;
    }
    var result = AngelOps.briefForEvent(event, getState());
    AngelOps.lastBrief = result;
    renderBriefResult(result);
    toast('🤖 PicoClaw Ops analisou a ação');
    return result;
  }

  function buildInviteMessage(result) {
    result = result || AngelOps.lastBrief;
    if (!result) return '';
    var plan = result.plan;
    var event = plan.event || {};
    var protocol = plan.protocol || {};
    var people = (plan.inviteCandidates || []).filter(function (m) { return m.available; }).slice(0, (protocol.invite && protocol.invite.desiredPeople) || 10);
    var names = people.map(function (m) { return m.nome; }).join(', ');
    return [
      protocol.icon + ' Convite de participação — ' + protocol.title,
      '',
      'Ação: ' + (event.nome || protocol.title),
      'Turno/horário: ' + (event.horario || event.turno || 'a confirmar'),
      'Ponto: ' + (event.nome || 'a confirmar'),
      '',
      'Equipe sugerida: ' + (names || 'militantes próximos/disponíveis'),
      '',
      'Confirme presença com o coordenador. Registro de presença e relatório serão feitos no ANGEL.'
    ].join('\n');
  }

  function copyText(text, okMessage) {
    if (!text) {
      toast('Nada para copiar');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMessage); }).catch(function () { fallbackCopy(text, okMessage); });
    } else {
      fallbackCopy(text, okMessage);
    }
  }

  function fallbackCopy(text, okMessage) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try { document.execCommand('copy'); toast(okMessage); }
    catch (err) { toast('Não foi possível copiar automaticamente'); }
    textarea.remove();
  }

  function injectPanel() {
    if (document.getElementById(PANEL_ID)) return true;
    var target = document.getElementById('dashExtra') || document.getElementById('coordActions');
    if (!target) return false;

    var wrap = document.createElement('div');
    wrap.id = PANEL_ID;
    wrap.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-top:14px;';
    wrap.innerHTML = '' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
        '<div style="width:36px;height:36px;border-radius:10px;background:var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:20px;">🤖</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-family:Syne,sans-serif;font-size:15px;font-weight:800;">PicoClaw Ops</div>' +
          '<div style="font-size:11px;color:var(--muted);">Engines + skins operacionais · draft</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
        '<button onclick="AngelOpsUI.analyzeCurrentModal()" style="padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;">Analisar modal</button>' +
        '<button onclick="AngelOpsUI.analyzeLatestRoute()" style="padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;">Analisar rota</button>' +
        '<button onclick="AngelOpsUI.analyzeSample(\'caminhada\')" style="padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;">Piloto caminhada</button>' +
        '<button onclick="AngelOpsUI.analyzeSample(\'carro_som\')" style="padding:10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;font-weight:700;cursor:pointer;">Piloto carro de som</button>' +
      '</div>' +
      '<div id="' + OUTPUT_ID + '" style="font-size:12px;color:var(--muted);line-height:1.55;">Selecione uma ação para gerar checklist, convite e leitura operacional.</div>';

    target.appendChild(wrap);
    return true;
  }

  function install() {
    if (injectPanel()) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (injectPanel() || tries > 20) clearInterval(timer);
    }, 500);
  }

  global.AngelOpsUI = {
    install: install,
    analyzeEvent: analyzeEvent,
    analyzeCurrentModal: function () { return analyzeEvent(getCurrentModalEvent()); },
    analyzeLatestRoute: function () {
      var event = getLatestRouteEvent();
      if (!event) {
        toast('Nenhuma rota encontrada. Use um piloto ou crie uma rota primeiro.');
        return null;
      }
      return analyzeEvent(event);
    },
    analyzeSample: function (type) { return analyzeEvent(sampleEvent(type)); },
    copyLastBrief: function () { copyText(AngelOps.lastBrief && AngelOps.lastBrief.text, 'Análise copiada'); },
    copyInviteMessage: function () { copyText(buildInviteMessage(), 'Convite copiado'); },
    getCurrentModalEvent: getCurrentModalEvent,
    buildInviteMessage: buildInviteMessage
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})(window, document);
