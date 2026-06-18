/*
 * ANGEL Operational Engines
 *
 * Motores determinísticos: calculam protocolo, checklist, convites e relatório
 * com base em dados operacionais. A IA/PicoClaw entra por cima para explicar.
 */
(function (global) {
  'use strict';

  var AngelOps = global.AngelOps || {};

  function asArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') return Object.keys(value).map(function (key) {
      var item = value[key];
      if (item && typeof item === 'object' && !item.id) item.id = key;
      return item;
    });
    return [];
  }

  function toNumber(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function pickLocation(source) {
    if (!source || typeof source !== 'object') return null;
    var lat = toNumber(source.lat || source.latitude || source.gpsLat || (source.coords && source.coords.lat));
    var lng = toNumber(source.lng || source.lon || source.longitude || source.gpsLng || (source.coords && source.coords.lng));
    if (lat === null || lng === null) return null;
    return { lat: lat, lng: lng };
  }

  function distanceKm(a, b) {
    if (!a || !b) return null;
    var R = 6371;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLng = (b.lng - a.lng) * Math.PI / 180;
    var lat1 = a.lat * Math.PI / 180;
    var lat2 = b.lat * Math.PI / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function hasValue(value) {
    if (value === 0 || value === false) return true;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  function resolveFieldValue(source, key) {
    if (!source) return undefined;
    if (key === 'lat' || key === 'lng') {
      var loc = pickLocation(source);
      return loc && loc[key];
    }
    if (key === 'rota') return source.rota || source.pontos || source.route || source.trajeto;
    if (key === 'motorista') return source.motorista || source.motoristaUid || source.responsavel || source.driver;
    if (key === 'audio') return source.audio || source.audioAprovado || source.audioUrl;
    if (key === 'horario') return source.horario || source.turno || source.inicio || source.start;
    return source[key];
  }

  var ChecklistEngine = {
    build: function build(protocol, event) {
      var required = (protocol.requiredFields || []).map(function (item) {
        var value = resolveFieldValue(event, item.key);
        return {
          key: item.key,
          label: item.label,
          required: item.required !== false,
          ok: hasValue(value),
          value: value
        };
      });
      var missing = required.filter(function (item) { return item.required && !item.ok; });
      return {
        required: required,
        missing: missing,
        operational: protocol.operationalChecklist || [],
        legal: protocol.legalChecklist || []
      };
    }
  };

  var InviteEngine = {
    selectNearby: function selectNearby(event, militants, options) {
      options = options || {};
      var eventLocation = pickLocation(event);
      var radiusKm = Number(options.radiusKm || 3);
      var list = asArray(militants)
        .filter(function (m) { return m && (m.ativo !== false) && (m.status !== 'inativo'); })
        .map(function (m) {
          var loc = pickLocation(m);
          var distance = eventLocation && loc ? distanceKm(eventLocation, loc) : null;
          var available = m.disponivel !== false && m.available !== false;
          return {
            id: m.uid || m.id || m.nome || m.name,
            uid: m.uid || m.id,
            nome: m.nome || m.name || 'Militante',
            nivel: m.nivel || m.role || 'campo',
            distanceKm: distance,
            available: available,
            lastSeenAt: m.lastSeenAt || m.ultimoLogin || m.ts || null,
            raw: m
          };
        })
        .filter(function (m) {
          if (m.nivel && String(m.nivel).toLowerCase() !== 'campo') return false;
          if (eventLocation && m.distanceKm !== null) return m.distanceKm <= radiusKm;
          return true;
        })
        .sort(function (a, b) {
          if (a.available !== b.available) return a.available ? -1 : 1;
          if (a.distanceKm === null && b.distanceKm === null) return 0;
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        });
      return list;
    },

    summarize: function summarize(candidates, protocol) {
      var desired = (protocol.invite && protocol.invite.desiredPeople) || 0;
      var min = (protocol.invite && protocol.invite.minPeople) || 0;
      var available = candidates.filter(function (m) { return m.available; }).length;
      return {
        totalNearby: candidates.length,
        available: available,
        desiredPeople: desired,
        minPeople: min,
        enoughForMinimum: available >= min,
        enoughForDesired: desired ? available >= desired : true
      };
    }
  };

  var ReportEngine = {
    buildTemplate: function buildTemplate(protocol) {
      return (protocol.reportFields || []).map(function (item) {
        return {
          key: item.key,
          label: item.label,
          required: item.required !== false,
          value: ''
        };
      });
    }
  };

  var EventEngine = {
    buildPlan: function buildPlan(event, context) {
      context = context || {};
      event = event || {};
      var type = event.tipo || event.type || event.eventType || event.categoria || 'generico';
      var protocol = AngelOps.getProtocol ? AngelOps.getProtocol(type) : null;
      if (!protocol) throw new Error('AngelOps protocols not loaded');

      var inviteOptions = protocol.invite || {};
      var candidates = InviteEngine.selectNearby(event, context.militantes || context.militants || [], inviteOptions);
      var inviteSummary = InviteEngine.summarize(candidates, protocol);
      var checklist = ChecklistEngine.build(protocol, event);

      return {
        protocol: protocol,
        event: event,
        location: pickLocation(event),
        inviteCandidates: candidates,
        inviteSummary: inviteSummary,
        checklist: checklist,
        reportTemplate: ReportEngine.buildTemplate(protocol),
        createdAt: Date.now(),
        boundaries: [
          'Usar somente dados operacionais necessários para execução da ação.',
          'Evitar coleta ou exposição de dados pessoais sensíveis.',
          'Apresentar checklist legal como orientação, não como parecer jurídico.',
          'Gerar recomendações de operação e escuta territorial, não de persuasão segmentada.'
        ]
      };
    }
  };

  AngelOps.utils = Object.assign(AngelOps.utils || {}, { asArray: asArray, pickLocation: pickLocation, distanceKm: distanceKm });
  AngelOps.ChecklistEngine = ChecklistEngine;
  AngelOps.InviteEngine = InviteEngine;
  AngelOps.ReportEngine = ReportEngine;
  AngelOps.EventEngine = EventEngine;

  global.AngelOps = AngelOps;
})(window);
