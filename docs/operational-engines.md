# ANGEL · Engines operacionais + skins PicoClaw

Esta PR adiciona uma primeira camada de **sistema operacional de campanha** sem treinar modelo e sem alterar o fluxo principal do app.

## Ideia central

Cada tipo de ação deve ter duas partes:

1. **Engine determinística**: executa lógica confiável, como checklist, pendências, convite por proximidade, relatório e requisitos mínimos.
2. **Skin PicoClaw**: interpreta o resultado da engine e gera orientação operacional em linguagem humana.

A separação evita deixar automação crítica nas mãos de texto gerado por IA.

```txt
Evento criado
↓
Protocolo operacional
↓
Engine de checklist / convite / relatório
↓
Skin PicoClaw correspondente
↓
Dashboard / orientação / convite
```

## O que entrou neste draft

Arquivos novos:

- `src/angel-ops/protocols.js`
- `src/angel-ops/engines.js`
- `src/angel-ops/picoclaw-skins.js`
- `src/angel-ops/bootstrap.js`

Integração:

- `index.html` passa a carregar esses scripts após o script principal.
- O dashboard ganha o painel **PicoClaw Ops** quando `dashExtra` ou `coordActions` estão disponíveis.

## Protocolos criados

- Caminhada
- Carro de som
- Reunião comunitária
- Bandeiraço
- Panfletagem / material de rua
- Gravação de conteúdo
- Ação genérica

Cada protocolo contém:

- campos necessários
- checklist operacional
- checklist legal orientativo
- regra de convite por raio/distância
- modelo de relatório pós-ação

## Limites de segurança e produto

Esta camada foi desenhada para:

- operar campanha;
- organizar equipe e materiais;
- gerar checklist;
- registrar dados agregados/anônimos;
- apoiar conformidade operacional.

Ela **não** foi desenhada para:

- recomendar discurso persuasivo por território;
- microdirecionar mensagem política;
- inferir perfil sensível de eleitor;
- substituir assessoria jurídica/contábil.

## Como testar na tela

No perfil coordenador, abra o dashboard e procure o card **PicoClaw Ops**.

Botões disponíveis:

- **Analisar modal**: tenta ler o evento aberto no modal atual.
- **Analisar rota**: analisa a rota mais recente cadastrada.
- **Piloto caminhada**: gera análise simulada de caminhada perto do centro atual do mapa.
- **Piloto carro de som**: gera análise simulada de carro de som.

O painel mostra:

- protocolo detectado;
- pendências obrigatórias;
- militantes disponíveis próximos, quando houver dados;
- checklist operacional;
- checklist legal orientativo;
- botão para copiar análise;
- botão para copiar convite.

## Próximos passos sugeridos

1. Ligar a engine diretamente ao salvamento de eventos.
2. Criar `event_invites` no Firebase para persistir convites.
3. Adicionar confirmação de presença por militante.
4. Criar relatório pós-evento estruturado.
5. Versionar regras legais em `legal_rules` no banco.
6. Fazer o PicoClaw ler eventos reais, pendências e relatórios acumulados.
