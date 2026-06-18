/*
 * ANGEL Operational Protocols
 *
 * Camada declarativa: define o que cada tipo de ação exige antes,
 * durante e depois da execução. Não faz persuasão política segmentada;
 * foca em operação, conformidade, transparência e coleta agregada/anônima.
 */
(function (global) {
  'use strict';

  var AngelOps = global.AngelOps || {};

  var LEGAL_DISCLAIMER = 'Checklist orientativo. Validar regras eleitorais vigentes com assessoria jurídica/contábil da campanha antes da execução.';

  function field(key, label, required) {
    return { key: key, label: label, required: required !== false };
  }

  var COMMON_REPORT_FIELDS = [
    field('participantesPrevistos', 'Participantes previstos'),
    field('participantesConfirmados', 'Participantes confirmados'),
    field('participantesPresentes', 'Participantes presentes'),
    field('materiaisUtilizados', 'Materiais utilizados'),
    field('ocorrencias', 'Ocorrências logísticas ou jurídicas', false),
    field('demandasAgregadas', 'Demandas agregadas registradas', false)
  ];

  var EVENT_PROTOCOLS = {
    caminhada: {
      id: 'caminhada',
      icon: '🚶',
      title: 'Caminhada',
      aliases: ['caminhada', 'porta_a_porta', 'porta a porta', 'visita de rua'],
      objective: 'Organizar presença territorial com registro operacional agregado.',
      invite: { radiusKm: 3, minPeople: 8, desiredPeople: 20 },
      requiredFields: [
        field('nome', 'Nome/referência do ponto de encontro'),
        field('lat', 'Latitude do ponto'),
        field('lng', 'Longitude do ponto'),
        field('data', 'Data'),
        field('turno', 'Turno'),
        field('responsavel', 'Responsável de campo', false),
        field('metaParticipantes', 'Meta de participantes', false)
      ],
      operationalChecklist: [
        'Definir ponto de encontro e rota aproximada.',
        'Indicar responsável de campo.',
        'Convidar militantes por proximidade e disponibilidade.',
        'Separar material compatível com a estimativa de pessoas.',
        'Abrir lista de presença e relatório pós-ação.',
        'Registrar demandas somente de forma agregada/anônima.'
      ],
      legalChecklist: [
        'Confirmar que a ação está dentro do período permitido para propaganda eleitoral, quando aplicável.',
        'Evitar obstrução de vias, equipamentos públicos ou atividades essenciais.',
        'Não coletar dados sensíveis de eleitores ou militantes sem base legal adequada.',
        LEGAL_DISCLAIMER
      ],
      reportFields: COMMON_REPORT_FIELDS.concat([
        field('ruasPercorridas', 'Ruas percorridas', false),
        field('abordagensAgregadas', 'Abordagens agregadas', false)
      ])
    },

    carro_som: {
      id: 'carro_som',
      icon: '📢',
      title: 'Carro de som',
      aliases: ['carro_som', 'carrosom', 'carro de som', 'som', 'rota de som'],
      objective: 'Planejar rota sonora com checklist operacional e jurídico antes de ir para rua.',
      invite: { radiusKm: 5, minPeople: 1, desiredPeople: 2 },
      requiredFields: [
        field('nome', 'Nome da rota/ação'),
        field('lat', 'Latitude de referência', false),
        field('lng', 'Longitude de referência', false),
        field('rota', 'Rota ou pontos planejados'),
        field('motorista', 'Motorista/responsável'),
        field('audio', 'Áudio aprovado'),
        field('horario', 'Horário de execução')
      ],
      operationalChecklist: [
        'Definir motorista/responsável e veículo.',
        'Registrar rota ou pontos de passagem.',
        'Vincular áudio aprovado pela coordenação.',
        'Confirmar horário de início e fim.',
        'Registrar execução: bairros percorridos, tempo e ocorrências.'
      ],
      legalChecklist: [
        'Conferir regras atuais sobre horário, volume, distância de locais sensíveis e período permitido.',
        'Manter identificação da campanha e documentação operacional acessível.',
        'Não usar áudio sem aprovação interna e revisão jurídica quando necessário.',
        LEGAL_DISCLAIMER
      ],
      reportFields: COMMON_REPORT_FIELDS.concat([
        field('bairrosPercorridos', 'Bairros percorridos'),
        field('tempoExecucao', 'Tempo de execução'),
        field('audioUtilizado', 'Áudio utilizado')
      ])
    },

    reuniao_comunitaria: {
      id: 'reuniao_comunitaria',
      icon: '🏘️',
      title: 'Reunião comunitária',
      aliases: ['reuniao', 'reunião', 'reuniao comunitaria', 'reunião comunitária', 'lideranca'],
      objective: 'Organizar escuta e encaminhamentos por território sem individualizar dados sensíveis.',
      invite: { radiusKm: 4, minPeople: 3, desiredPeople: 8 },
      requiredFields: [
        field('nome', 'Local/referência'),
        field('data', 'Data'),
        field('turno', 'Turno'),
        field('responsavel', 'Liderança/responsável'),
        field('tema', 'Tema de escuta', false)
      ],
      operationalChecklist: [
        'Definir anfitrião/liderança responsável.',
        'Preparar pauta de escuta e registro agregado de demandas.',
        'Definir responsável por ata simplificada.',
        'Criar follow-up para encaminhamentos prometidos.'
      ],
      legalChecklist: [
        'Evitar promessas individualizadas ou troca de vantagem por apoio.',
        'Registrar compromissos de forma transparente e programática.',
        'Não coletar dado sensível de participantes sem base legal adequada.',
        LEGAL_DISCLAIMER
      ],
      reportFields: COMMON_REPORT_FIELDS.concat([
        field('demandasPrincipais', 'Demandas principais'),
        field('encaminhamentos', 'Encaminhamentos')
      ])
    },

    bandeiraco: {
      id: 'bandeiraco',
      icon: '🏳️',
      title: 'Bandeiraço',
      aliases: ['bandeiraco', 'bandeiraço', 'bandeiras', 'sinaleiraço', 'sinaleiraco'],
      objective: 'Coordenar presença visual em ponto público com controle de equipe e ocorrência.',
      invite: { radiusKm: 3, minPeople: 6, desiredPeople: 15 },
      requiredFields: [
        field('nome', 'Ponto de referência'),
        field('lat', 'Latitude'),
        field('lng', 'Longitude'),
        field('data', 'Data'),
        field('turno', 'Turno')
      ],
      operationalChecklist: [
        'Definir ponto exato e responsável.',
        'Separar bandeiras/material visual.',
        'Convidar equipe próxima com confirmação.',
        'Registrar presença e ocorrências.'
      ],
      legalChecklist: [
        'Confirmar se o ponto permite atividade sem obstrução ou risco.',
        'Respeitar regras de propaganda, mobilidade e segurança pública.',
        LEGAL_DISCLAIMER
      ],
      reportFields: COMMON_REPORT_FIELDS
    },

    panfletagem: {
      id: 'panfletagem',
      icon: '📄',
      title: 'Panfletagem / material de rua',
      aliases: ['panfletagem', 'santinho', 'material de rua', 'distribuicao', 'distribuição'],
      objective: 'Controlar material entregue por território e retorno agregado da ação.',
      invite: { radiusKm: 3, minPeople: 4, desiredPeople: 12 },
      requiredFields: [
        field('nome', 'Local/referência'),
        field('lat', 'Latitude'),
        field('lng', 'Longitude'),
        field('data', 'Data', false),
        field('material', 'Material previsto', false),
        field('quantidade', 'Quantidade prevista', false)
      ],
      operationalChecklist: [
        'Confirmar material disponível no estoque.',
        'Definir responsável por retirada e devolução/sobra.',
        'Convidar equipe por proximidade e disponibilidade.',
        'Registrar quantidade utilizada e sobras.'
      ],
      legalChecklist: [
        'Respeitar regras de material impresso e identificação obrigatória.',
        'Evitar descarte irregular ou sujeira urbana.',
        LEGAL_DISCLAIMER
      ],
      reportFields: COMMON_REPORT_FIELDS.concat([
        field('quantidadeEntregue', 'Quantidade entregue'),
        field('sobras', 'Sobras/devolução', false)
      ])
    },

    gravacao_conteudo: {
      id: 'gravacao_conteudo',
      icon: '🎥',
      title: 'Gravação de conteúdo',
      aliases: ['gravacao', 'gravação', 'conteudo', 'conteúdo', 'video', 'vídeo'],
      objective: 'Organizar captação, aprovação e publicação de conteúdo de campanha.',
      invite: { radiusKm: 8, minPeople: 1, desiredPeople: 3 },
      requiredFields: [
        field('nome', 'Local/referência'),
        field('tema', 'Tema programático/informativo'),
        field('responsavel', 'Responsável por captação'),
        field('prazoPublicacao', 'Prazo de publicação', false)
      ],
      operationalChecklist: [
        'Definir tema, formato e objetivo informativo.',
        'Indicar responsável por captação, edição e legenda.',
        'Criar fila de aprovação antes da publicação.',
        'Vincular conteúdo a evento/território quando aplicável.'
      ],
      legalChecklist: [
        'Revisar direitos de imagem, trilhas e material de terceiros.',
        'Evitar desinformação, promessa individualizada ou conteúdo não verificável.',
        LEGAL_DISCLAIMER
      ],
      reportFields: [
        field('conteudoProduzido', 'Conteúdo produzido'),
        field('statusAprovacao', 'Status de aprovação'),
        field('publicado', 'Publicado?', false),
        field('observacoes', 'Observações', false)
      ]
    },

    generico: {
      id: 'generico',
      icon: '📌',
      title: 'Ação genérica',
      aliases: ['evento', 'acao', 'ação', 'outro'],
      objective: 'Registrar ação com checklist mínimo até que um protocolo específico seja escolhido.',
      invite: { radiusKm: 3, minPeople: 2, desiredPeople: 5 },
      requiredFields: [field('nome', 'Nome/referência'), field('data', 'Data', false), field('turno', 'Turno', false)],
      operationalChecklist: [
        'Definir responsável.',
        'Definir local, horário e objetivo operacional.',
        'Registrar participantes previstos e relatório pós-ação.'
      ],
      legalChecklist: [LEGAL_DISCLAIMER],
      reportFields: COMMON_REPORT_FIELDS
    }
  };

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function normalizeEventType(type) {
    var t = normalizeText(type).replace(/[\s-]+/g, '_');
    var keys = Object.keys(EVENT_PROTOCOLS);
    for (var i = 0; i < keys.length; i += 1) {
      var protocol = EVENT_PROTOCOLS[keys[i]];
      if (protocol.id === t) return protocol.id;
      for (var j = 0; j < protocol.aliases.length; j += 1) {
        var alias = normalizeText(protocol.aliases[j]).replace(/[\s-]+/g, '_');
        if (alias === t || t.indexOf(alias) >= 0 || alias.indexOf(t) >= 0) return protocol.id;
      }
    }
    return 'generico';
  }

  function getProtocol(type) {
    return EVENT_PROTOCOLS[normalizeEventType(type)] || EVENT_PROTOCOLS.generico;
  }

  AngelOps.VERSION = '0.1.0-draft';
  AngelOps.LEGAL_DISCLAIMER = LEGAL_DISCLAIMER;
  AngelOps.EVENT_PROTOCOLS = EVENT_PROTOCOLS;
  AngelOps.getProtocol = getProtocol;
  AngelOps.normalizeEventType = normalizeEventType;

  global.AngelOps = AngelOps;
})(window);
