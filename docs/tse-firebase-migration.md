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

A aplicação atual usa **Firebase Realtime Database**, exposto em `window._fb`, não Firestore.

Por isso, esta migração usa Realtime Database para não trocar a tecnologia de persistência no meio da versão.

## Caminho criado no banco

```txt
tse/viamao/2024/locais_votacao/{id}
tse/viamao/2024/meta
tse/viamao/2024/logs
```

## Arquivo adicionado

```txt
src/tse/tse-realtime-db.js
```

Esse arquivo cria `window.AngelTSE` com funções para:

```js
AngelTSE.status();
AngelTSE.migrateFromHtml();
AngelTSE.loadFromFirebase();
AngelTSE.fetchLocaisFromDb();
AngelTSE.saveLocaisToDb(lista);
```

## Ativação no HTML

Adicionar este script depois do script principal do app, antes dos scripts das engines operacionais:

```html
<script src="src/tse/tse-realtime-db.js"></script>
```

Ordem recomendada no fim do `index.html`, antes de `</body>`:

```html
<script src="src/tse/tse-realtime-db.js"></script>
<script src="src/angel-ops/protocols.js"></script>
<script src="src/angel-ops/engines.js"></script>
<script src="src/angel-ops/picoclaw-skins.js"></script>
<script src="src/angel-ops/bootstrap.js"></script>
```

## Como migrar a base atual para o Firebase

Depois de publicar a versão com `src/tse/tse-realtime-db.js` carregado no HTML, entrar como coordenador, abrir o console do navegador e executar:

```js
await AngelTSE.status();
```

Se `firebaseCount` estiver `0` e `htmlCount` estiver com os locais atuais, executar:

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
firebaseCount: mesma quantidade gravada em tse/viamao/2024/locais_votacao
meta.totalEleitores: total agregado dos locais migrados
meta.totalSecoes: total agregado das seções migradas
```

## Como o carregamento passa a funcionar

Quando o Firebase já tiver dados em `tse/viamao/2024/locais_votacao`, o loader:

1. lê a base do Firebase;
2. normaliza a lista;
3. substitui o conteúdo do array `LOCAIS_TSE` em memória;
4. re-renderiza a aba Eleitoral quando possível;
5. dispara o evento `angel-tse-ready`.

Se o Firebase ainda estiver vazio ou indisponível, a aplicação segue usando o fallback do `index.html`.

## Limpeza do HTML

Depois de confirmar que a base foi gravada no Firebase, o bloco hardcoded pode ser limpo com segurança.

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

Isso mantém compatibilidade com as funções existentes, porque elas continuam usando o mesmo identificador `LOCAIS_TSE`, mas agora o conteúdo é carregado do Firebase pelo `AngelTSE`.

## Próxima evolução recomendada

Separar a base eleitoral em coleções/caminhos próprios:

```txt
tse/viamao/2024/locais_votacao
tse/viamao/2024/resultados_por_local
tse/viamao/2024/candidatos
tse/viamao/2024/partidos
tse/viamao/2024/metadados_importacao
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
sync Firebase
↓
aba Eleitoral
```

## Observação importante

Esta migração não baixa dados novos do TSE. Ela apenas tira do HTML a base que já existe no app e prepara a arquitetura para a próxima fase: importação oficial/automatizada.
