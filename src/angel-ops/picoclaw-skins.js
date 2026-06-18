/*
 * PicoClaw Operational Skins
 *
 * Camada explicativa: transforma a leitura das engines em orientação operacional.
 * Não recomenda persuasão política segmentada por perfil ou território.
 */
(function (global) {
  'use strict';

  var AngelOps = global.AngelOps || {};

  function plural(n, singular, pluralText) {
    return Number(n) === 1 ? singular : (pluralText || singular + 's');
  }

  function pctReady(plan) {
    var required = (plan.checklist && plan.checklist.required) || [];
    if (!required.length) return 100;
    var ok = required.filter(function (item) { return !item.required || item.ok; }).length;
    return Math.round(ok / required.length * 100);
  }

  function listItems(items, max) {
    items = items || [];
    return items.slice(0, max || 5).map(function (item) { return '• ' + item; }).join('\n');
  }

  function renderCandidates(plan) {
    var summary = plan.inviteSummary || {};
    var top = (plan.inviteCandidates || []).slice(0, 5).map(function (m) {
      var dist = m.distanceKm === null ? 'distância não informada' : m.distanceKm.toFixed(1).replace('.', ',') + ' km';
      return '• ' + m.nome + ' · ' + dist + (m.available ? '' : ' · disponibilidade pendente');
    });

    if (!top.length) {
      return 'Nenhum militante elegível encontrado com os dados atuais. Verifique localização, disponibilidade e cadastro operacional.';
    }

    return summary.available + ' ' + plural(summary.available, 'militante disponível', 'militantes disponíveis') +
      ' de ' + summary.totalNearby + ' ' + plural(summary.totalNearby, 'encontrado', 'encontrados') + '.\n' + top.join('\n');
  }

  function buildBaseBrief(plan) {
    var protocol = plan.protocol;
    var missing = (plan.checklist && plan.checklist.missing) || [];
    var ready = pctReady(plan);
    var lines = [];

    lines.push(protocol.icon + ' PicoClaw ' + protocol.title);
    lines.push('Prontidão operacional: ' + ready + '%');
    lines.push('Objetivo: ' + protocol.objective);
    lines.push('');

    if (missing.length) {
      lines.push('Pendências obrigatórias:');
      lines.push(missing.map(function (item) { return '• ' + item.label; }).join('\n'));
      lines.push('');
    } else {
      lines.push('Campos obrigatórios preenchidos. Próximo passo: confirmar checklist, equipe e relatório pós-ação.');
      lines.push('');
    }

    lines.push('Convocação operacional:');
    lines.push(renderCandidates(plan));
    lines.push('');

    lines.push('Checklist operacional:');
    lines.push(listItems(plan.checklist.operational, 6));
    lines.push('');

    lines.push('Checklist legal orientativo:');
    lines.push(listItems(plan.checklist.legal, 5));

    return lines.join('\n');
  }

  var SKINS = {
    caminhada: {
      id: 'pico_caminhada',
      name: 'PicoClaw Caminhada',
      composeBrief: function (plan) {
        var summary = plan.inviteSummary || {};
        var brief = buildBaseBrief(plan);
        if (!summary.enoughForMinimum) {
          brief += '\n\nAlerta: equipe abaixo do mínimo sugerido. Recomendo ampliar raio de convite ou reduzir a rota prevista.';
        }
        brief += '\n\nRelatório pós-ação deve registrar números agregados: presentes, material usado, ruas percorridas e demandas citadas.';
        return brief;
      }
    },

    carro_som: {
      id: 'pico_carro_som',
      name: 'PicoClaw Carro de Som',
      composeBrief: function (plan) {
        var brief = buildBaseBrief(plan);
        brief += '\n\nAntes de liberar execução, confirme rota, motorista, áudio aprovado e horário. Não trate este checklist como parecer jurídico.';
        return brief;
      }
    },

    reuniao_comunitaria: {
      id: 'pico_reuniao',
      name: 'PicoClaw Reunião Comunitária',
      composeBrief: function (plan) {
        var brief = buildBaseBrief(plan);
        brief += '\n\nOriente a equipe a registrar demandas por tema e quantidade, sem individualizar perfil dos participantes.';
        return brief;
      }
    },

    bandeiraco: {
      id: 'pico_bandeiraco',
      name: 'PicoClaw Bandeiraço',
      composeBrief: function (plan) {
        var brief = buildBaseBrief(plan);
        brief += '\n\nPriorize segurança, visibilidade permitida e ausência de obstrução de circulação.';
        return brief;
      }
    },

    panfletagem: {
      id: 'pico_panfletagem',
      name: 'PicoClaw Materiais de Rua',
      composeBrief: function (plan) {
        var brief = buildBaseBrief(plan);
        brief += '\n\nControle retirada, quantidade entregue e sobras para alimentar estoque e prestação operacional.';
        return brief;
      }
    },

    gravacao_conteudo: {
      id: 'pico_conteudo',
      name: 'PicoClaw Conteúdo',
      composeBrief: function (plan) {
        var brief = buildBaseBrief(plan);
        brief += '\n\nFoco seguro: clareza, informação pública, direitos de imagem e aprovação antes de publicação.';
        return brief;
      }
    },

    generico: {
      id: 'pico_generico',
      name: 'PicoClaw Operacional',
      composeBrief: buildBaseBrief
    }
  };

  function getSkin(protocolId) {
    return SKINS[protocolId] || SKINS.generico;
  }

  function briefForEvent(event, context) {
    var plan = AngelOps.EventEngine.buildPlan(event, context || {});
    var skin = getSkin(plan.protocol.id);
    return { plan: plan, skin: skin, text: skin.composeBrief(plan) };
  }

  AngelOps.PicoClawSkins = SKINS;
  AngelOps.getPicoClawSkin = getSkin;
  AngelOps.briefForEvent = briefForEvent;

  global.AngelOps = AngelOps;
})(window);
