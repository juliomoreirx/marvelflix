const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');

const MCU_FILE = path.join(__dirname, '..', 'src', 'data', 'mcu_full.json');
const OUTROS_FILE = path.join(__dirname, '..', 'src', 'data', 'outros_filmes.json');
const STATE_FILE = path.join(__dirname, 'migration_hls_state.json');

const ACCOUNT_ID = '2520a8bd9b9292f637357a5c7e465f31';
const ACCESS_KEY_ID = '3e7eadeae8bf8c03252f54904ab3ae76';
const SECRET_ACCESS_KEY = 'c1b336f6621ffd45af2037cc74b7a37c0d6651f462cb57e0b0ba4eb1e1216f47';
const BUCKET_NAME = 'marvelflix-assets';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }
});

async function promiseAllLimit(limit, items, mapFn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => mapFn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

async function run() {
  console.log('--- AUDITORIA DE INTEGRIDADE NO CLOUDFLARE R2 ---');
  
  const mcuData = JSON.parse(fs.readFileSync(MCU_FILE, 'utf8'));
  const outrosData = JSON.parse(fs.readFileSync(OUTROS_FILE, 'utf8'));
  const allData = [...mcuData, ...outrosData];

  const streams = [];
  for (const item of allData) {
    if (item.type === 'movie' || (!item.episodes && item.type !== 'series')) {
      const id = item.stream_id || item.id || item.info?.id;
      if (id) streams.push({ id, title: item.info?.name || item.name || 'Filme' });
    } else if (item.type === 'series' && item.episodes) {
      for (const seasonNum of Object.keys(item.episodes)) {
        for (const ep of item.episodes[seasonNum]) {
          if (ep.id) streams.push({ id: ep.id, title: `${item.info?.name || item.name} - S${seasonNum}E${ep.episode_num}` });
        }
      }
    }
  }

  console.log(`Verificando existência de ${streams.length} pastas no R2...`);

  const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  bar.start(streams.length, 0);

  const missing = [];
  const foundIds = [];

  await promiseAllLimit(20, streams, async (stream) => {
    try {
      // Checa se o arquivo m3u8 raiz existe dentro da pasta do video no R2
      await s3.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `videos/${stream.id}/index.m3u8`
      }));
      foundIds.push(stream.id);
    } catch (e) {
      missing.push(stream);
    }
    bar.increment();
  });

  bar.stop();

  console.log(`\nResultado da Auditoria:`);
  console.log(`✅ Presentes no R2: ${foundIds.length}`);
  console.log(`❌ Faltando/Incompletos: ${missing.length}`);

  if (missing.length > 0) {
    console.log('\n--- LISTA DOS QUE FALTAM ---');
    missing.slice(0, 10).forEach(m => console.log(`- ${m.title} (ID: ${m.id})`));
    if (missing.length > 10) console.log(`...e mais ${missing.length - 10}`);

    // Corrige o arquivo de estado local para forçar o script de download a tentar de novo!
    let state = {};
    if (fs.existsSync(STATE_FILE)) {
       state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
    
    // Todos os que foram encontrados no R2 ganham 'true' absoluto
    foundIds.forEach(id => state[id] = true);
    
    // Todos os que faltam ganham 'false' para serem baixados de novo
    missing.forEach(m => state[m.id] = false);
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log('\n🔄 O arquivo "migration_hls_state.json" foi corrigido. Basta rodar o script de migração novamente e ele só baixará os que faltam!');
  } else {
    console.log('\n🎉 PARABÉNS! 100% do seu catálogo está sano e salvo no Cloudflare R2 em formato HLS!');
  }
}

run();
