# Migração da base TSE para Firebase

## Estado atual

A versão atual do ANGEL ainda mantém a base eleitoral no `index.html`, dentro do array global `LOCAIS_TSE`.

Esse array contém os locais de votação usados pela aba **Eleitoral**, incluindo:

- `id`
- `nome`
- `zona`
- `ns` — número de seções
- `el` — eleitores
- `pct` — peso percentual no eleitorado
- `lat` e `lng`
- `est` — indica registro estimado/complementar
- `pct_guto`
- `votos_guto`
- `votos_total`

O projeto tem **Realtime Database** e **Firestore**.

A versão atual do `index.html` expõe apenas o Realtime Database em `window._fb`, mas a base eleitoral/TSE deve ser tratada como dado documental e versionado. Por isso, a estratégia principal agora é:

```txt
Firestore = base TSE/documental/versionada
Realtime Database = operação em tempo real/compatibilidade com app atual
```

## Arquivos adicionados

```txt
src/tse/tse-firestore.js
src/tse/tse-realtime-db.js
```

- `tse-firestore.js` é o destino principal recomendado.
- `tse-realtime-db.js` fica como fallback/compatibilidade, caso a equipe queira manter tudo no RTDB temporariamente.

## Estrutura criada no Firestore

```txt
tse_municipios/viamao_rs_2024
tse_municipios/viamao_rs_2024/locais_votacao/{localId}
tse_municipios/viamao_rs_2024/logs/{autoId}
```

Exemplo:

```txt
tse_municipios/viamao_rs_2024/locais_votacao/1155
```

O documento raiz `tse_municipios/viamao_rs_2024` guarda metadados agregados:

```txt
município
UF
ano
total de locais
total de locais oficiais
total de locais estimados
total de eleitores
total de seções
fonte
schemaVersion
```

## Estrutura alternativa no Realtime Database

```txt
tse/viamao/2024/locais_votacao/{id}
tse/viamao/2024/meta
tse/viamao/2024/logs
```

## Ativação no HTML

Adicionar este script depois do script principal do app:

```html
<script type="module" src="src/tse/tse-firestore.js"></script>
```

Ordem recomendada no fim do `index.html`, antes de `</body>`:

```html
<script type="module" src="src/tse/tse-firestore.js"></script>
<script src="src/angel-ops/protocols.js"></script>
<script src="src/angel-ops/engines.js"></script>
<script src="src/angel-ops/picoclaw-skins.js"></script>
<script src="src/angel-ops/bootstrap.js"></script>
```

Se quiser usar RTDB em vez de Firestore, substituir o primeiro script por:

```html
<script src="src/tse/tse-realtime-db.js"></script>
```

## Funções disponíveis no Firestore adapter

Após carregar `src/tse/tse-firestore.js`, ele expõe:

```js
AngelTSE.status();
AngelTSE.migrateFromHtml();
AngelTSE.loadFromFirestore();
AngelTSE.fetchLocaisFromFirestore();
AngelTSE.saveLocaisToFirestore(lista);
```

Também fica disponível explicitamente como:

```js
AngelTSEFirestore.status();
AngelTSEFirestore.migrateFromHtml();
```

## Como migrar a base atual para o Firestore

Depois de publicar a versão com `src/tse/tse-firestore.js` carregado no HTML, entrar como coordenador, abrir o console do navegador e executar:

```js
await AngelTSE.status();
```

Se `firestoreCount` estiver `0` e `htmlCount` estiver com os locais atuais, executar:

```js
await AngelTSE.migrateFromHtml();
```

Verificar novamente:

```js
await AngelTSE.status();
```

Resultado esperado:

```txt
htmlCount: quantidade atual no array LOCAIS_TSE
firestoreCount: mesma quantidade gravada em tse_municipios/viamao_rs_2024/locais_votacao
meta.totalEleitores: total agregado dos locais migrados
meta.totalSecoes: total agregado das seções migradas
```

## Como o carregamento passa a funcionar

Quando o Firestore já tiver dados em `tse_municipios/viamao_rs_2024/locais_votacao`, o loader:

1. lê a base do Firestore;
2. normaliza a lista;
3. substitui o conteúdo do array `LOCAIS_TSE` em memória;
4. re-renderiza a aba Eleitoral quando possível;
5. dispara o evento `angel-tse-ready`.

Se o Firestore ainda estiver vazio ou indisponível, a aplicação segue usando o fallback do `index.html`.

## Limpeza do HTML

Depois de confirmar que a base foi gravada no Firestore, o bloco hardcoded pode ser limpo com segurança.

Substituir:

```js
const LOCAIS_TSE = [
  // dezenas de objetos de locais de votação
];
```

por:

```js
const LOCAIS_TSE = [];
```

Isso mantém compatibilidade com as funções existentes, porque elas continuam usando o mesmo identificador `LOCAIS_TSE`, mas agora o conteúdo é carregado do Firestore pelo `AngelTSE`.

## Próxima evolução recomendada

Separar a base eleitoral em subcoleções próprias:

```txt
tse_municipios/viamao_rs_2024/locais_votacao
tse_municipios/viamao_rs_2024/resultados_por_local
tse_municipios/viamao_rs_2024/candidatos
tse_municipios/viamao_rs_2024/partidos
tse_municipios/viamao_rs_2024/metadados_importacao
```

E depois criar um importador real para dados abertos do TSE:

```txt
arquivo TSE bruto
↓
normalizador
↓
geocodificação
↓
validação
↓
sync Firestore
↓
aba Eleitoral
```

## Observação importante

Esta migração não baixa dados novos do TSE. Ela apenas tira do HTML a base que já existe no app e prepara a arquitetura para a próxima fase: importação oficial/automatizada.
