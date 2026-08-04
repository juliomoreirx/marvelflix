const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const cliProgress = require('cli-progress');

// Blindagem contra Crashes (Mantém o script rodando mesmo se houver vazamento ou erro grave)
process.on('uncaughtException', (err) => { fs.appendFileSync('fatal_error.log', `[${new Date().toISOString()}] Uncaught: ${err.message}\n`); });
process.on('unhandledRejection', (err) => { fs.appendFileSync('fatal_error.log', `[${new Date().toISOString()}] Unhandled: ${err.message}\n`); });

const MCU_FILE = path.join(__dirname, '..', 'src', 'data', 'mcu_full.json');
const OUTROS_FILE = path.join(__dirname, '..', 'src', 'data', 'outros_filmes.json');
const STATE_FILE = path.join(__dirname, 'migration_hls_state.json');
const TEMP_ROOT = 'E:\\acervo_temporario';

// Configurações do R2
const ACCOUNT_ID = '2520a8bd9b9292f637357a5c7e465f31';
const ACCESS_KEY_ID = '3e7eadeae8bf8c03252f54904ab3ae76';
const SECRET_ACCESS_KEY = 'c1b336f6621ffd45af2037cc74b7a37c0d6651f462cb57e0b0ba4eb1e1216f47';
const BUCKET_NAME = 'marvelflix-assets';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  }
});

// Acelerador: Baixa 1 filme por vez, com 10 conexões simultâneas (Max Bandwidth Trial)
const MAX_CONCURRENT_VIDEOS = 1;
const MAX_CONCURRENT_CHUNKS = 30;
const MAX_CONCURRENT_UPLOADS = 20;

if (!fs.existsSync(TEMP_ROOT)) {
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
}

let multiBar = null;

function initMultiBar() {
  if (multiBar) multiBar.stop();
  multiBar = new cliProgress.MultiBar({
    clearOnComplete: false,
    hideCursor: true,
    format: ' {bar} | {title} | {status} | {value}/{total} {unit} | {speed}'
  }, cliProgress.Presets.shades_classic);
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return {};
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function promiseAllLimit(limit, items, mapFn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => mapFn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

function convertToHls(inputMp4, outputDir) {
  return new Promise((resolve, reject) => {
    const outputM3u8 = path.join(outputDir, 'index.m3u8');
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', inputMp4,
      '-c', 'copy',
      '-sn', // IGNORA legendas embutidas (que causam o crash 'webvtt muxer supports only codec webvtt')
      '-hls_time', '10',
      '-hls_list_size', '0',
      '-hls_segment_filename', path.join(outputDir, 'chunk_%03d.ts'),
      '-f', 'hls',
      outputM3u8
    ], { stdio: 'ignore' });

    ffmpeg.on('close', (code) => {
      if (code === 0 || fs.existsSync(outputM3u8)) resolve();
      else reject(new Error(`FFMPEG encerrou com erro (código ${code})`));
    });
  });
}

const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.m3u8') return 'application/vnd.apple.mpegurl';
  if (ext === '.ts') return 'video/MP2T';
  return 'application/octet-stream';
};

async function uploadFolderToR2(dirPath, r2BaseFolder, bar) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.m3u8') || f.endsWith('.ts'));
  
  bar.update(0, { status: 'Upload R2', unit: 'chks', speed: '--' });
  bar.setTotal(files.length);
  
  let uploaded = 0;
  await promiseAllLimit(MAX_CONCURRENT_UPLOADS, files, async (file) => {
    const filePath = path.join(dirPath, file);
    const r2Key = `videos/${r2BaseFolder}/${file}`;
    
    let success = false;
    let lastErr = null;
    for (let retries = 0; retries < 10; retries++) { // 10 Retentativas pro AWS SDK
      try {
        const fileStream = fs.createReadStream(filePath);
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: r2Key,
          Body: fileStream,
          ContentType: getContentType(file)
        }));
        success = true;
        break;
      } catch (err) {
        lastErr = err;
        await new Promise(r => setTimeout(r, 3000 * (retries + 1))); // 3s, 6s, 9s...
      }
    }
    
    if (!success) throw lastErr;
    
    uploaded++;
    bar.update(uploaded);
  });
}

async function processVideo(stream, state) {
  const shortTitle = stream.title.length > 40 ? stream.title.substring(0, 37) + '...' : stream.title.padEnd(40);
  const bar = multiBar.create(100, 0, { title: shortTitle, status: 'Iniciando', unit: 'MB', speed: '0 MB/s' });
  
  const workDir = path.join(TEMP_ROOT, stream.id.toString());
  const rawMp4 = path.join(workDir, 'raw.mp4');
  const outputM3u8 = path.join(workDir, 'index.m3u8');
  
  try {
    if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });

    // GARBAGE COLLECTOR: Limpa lixos .part de sessões anteriores logo no início
    const oldFiles = fs.readdirSync(workDir);
    oldFiles.forEach(f => {
       if (f.includes('.part')) fs.unlinkSync(path.join(workDir, f));
    });

    // Se o index.m3u8 já existe, significa que o download e o FFMPEG já terminaram 
    // numa execução passada, e travou/caiu durante o Upload do R2. Pulamos direto pro Upload!
    if (fs.existsSync(outputM3u8)) {
        bar.setTotal(100);
        bar.update(100, { status: 'Pulando direto pro Upload...', speed: '--' });
    } else {
        const xtreamType = stream.type === 'series' ? 'series' : 'movie';
        let streamUrl = `http://windowscnx.com/${xtreamType}/85119rbz/cyd16156/${stream.id}.mp4`;
        
        // Override especial para os filmes problemáticos usando crm1.cc
        const crm1Ids = [61981, 249417, 106237, 107182];
        if (crm1Ids.includes(Number(stream.id))) {
            streamUrl = `http://crm1.cc/${xtreamType}/85119rbz/cyd16156/${stream.id}.mp4`;
        }
        
        // PING inicial robusto usando Range 0-0 para não travar a memória e pegar o tamanho exato
        const headRes = await fetch(streamUrl, { 
           method: 'GET', 
           headers: { 
               'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115',
               'Range': 'bytes=0-0'
           }
        });
        if (!headRes.ok) throw new Error(`HTTP ${headRes.status}`);
        
        let totalBytes = 0;
        const contentRange = headRes.headers.get('content-range');
        if (contentRange) {
            totalBytes = parseInt(contentRange.split('/')[1] || '0', 10);
        } else {
            totalBytes = parseInt(headRes.headers.get('content-length') || '0', 10);
        }
        if (headRes.body) await headRes.body.cancel(); // MATA o download residual!

        if (!totalBytes || isNaN(totalBytes)) throw new Error('Falha ao obter tamanho do arquivo');
        
        // Aproveitar o que já baixamos!
        let downloadedBytes = 0;
        if (fs.existsSync(rawMp4)) {
          downloadedBytes = fs.statSync(rawMp4).size;
        }
        
        if (totalBytes > 0 && downloadedBytes >= totalBytes) {
           bar.setTotal(Math.floor(totalBytes / 1024 / 1024));
           bar.update(Math.floor(totalBytes / 1024 / 1024), { status: 'Já Baixado', speed: '--' });
        } else {
           const remainingBytes = totalBytes - downloadedBytes;
           const chunkSize = Math.ceil(remainingBytes / MAX_CONCURRENT_CHUNKS);
           
           bar.setTotal(Math.floor(totalBytes / 1024 / 1024));
           bar.update(Math.floor(downloadedBytes / 1024 / 1024), { status: 'Multipart Acelerado' });
           
           const chunkTasks = [];
           for (let i = 0; i < MAX_CONCURRENT_CHUNKS; i++) {
              const start = downloadedBytes + (i * chunkSize);
              let end = start + chunkSize - 1;
              if (i === MAX_CONCURRENT_CHUNKS - 1) end = totalBytes - 1;
              if (start > end) continue;
              chunkTasks.push({ index: i, start, end, file: `${rawMp4}.part${i}` });
           }
           
           let currentBytes = downloadedBytes;
           let lastUpdate = Date.now();
           let lastBytes = currentBytes;

           // Baixar as partes 
           await promiseAllLimit(MAX_CONCURRENT_CHUNKS, chunkTasks, async (task) => {
              if (fs.existsSync(task.file)) fs.unlinkSync(task.file); // limpa resíduos de falhas
              
              let res;
              let retryCount = 0;
              while (retryCount < 5) {
                 res = await fetch(streamUrl, { 
                    headers: { 
                        'User-Agent': 'Mozilla/5.0',
                        'Range': `bytes=${task.start}-${task.end}`
                    }
                 });
                 if (res.ok) break;
                 
                 // Se for bloqueio de IP (503 ou 429), espera um pouco e tenta de novo
                 if (res.status === 503 || res.status === 429) {
                     retryCount++;
                     bar.update(Math.floor(currentBytes / 1024 / 1024), { status: `Retentando (${retryCount}/5)` });
                     await new Promise(r => setTimeout(r, 2000 * retryCount)); // Espera 2s, 4s, 6s...
                 } else {
                     break;
                 }
              }
              if (!res.ok) throw new Error(`Chunk Fail: ${res.status}`);
              
              const progressStream = new Transform({
                  transform(chunk, encoding, callback) {
                      currentBytes += chunk.length;
                      const now = Date.now();
                      if (now - lastUpdate > 1000) {
                          const speed = ((currentBytes - lastBytes) / (now - lastUpdate) * 1000 / 1024 / 1024).toFixed(2);
                          bar.update(Math.floor(currentBytes / 1024 / 1024), { speed: `${speed} MB/s` });
                          lastUpdate = now;
                          lastBytes = currentBytes;
                      }
                      callback(null, chunk);
                  }
              });

              const fileStream = fs.createWriteStream(task.file);
              await pipeline(Readable.fromWeb(res.body), progressStream, fileStream);
           });
           
           // Unir os pedaços no arquivo principal (super rápido usando memória)
           bar.update(bar.getTotal(), { status: 'Mesclando...', speed: '--' });
           for (const task of chunkTasks) {
              if (fs.existsSync(task.file)) {
                 fs.appendFileSync(rawMp4, fs.readFileSync(task.file));
                 fs.unlinkSync(task.file);
              }
           }
        }
        
        bar.update(bar.getTotal(), { status: 'Fatiando...', speed: '--' });
        
        // Fragmentação FFMPEG
        await convertToHls(rawMp4, workDir);
        
        // Apagar RAW MP4 para liberar espaço
        if (fs.existsSync(rawMp4)) fs.unlinkSync(rawMp4);
    }
    
    // Upload R2 (Acontece independente de ter fatiado agora ou numa execução anterior)
    await uploadFolderToR2(workDir, stream.id.toString(), bar);
    
    // Limpeza
    fs.rmSync(workDir, { recursive: true, force: true });
    
    state[stream.id] = true;
    saveState(state);
    
    bar.update(bar.getTotal(), { status: '✔ Finalizado', speed: '--' });
    
  } catch (err) {
    bar.update(0, { status: `❌ ${err.message.substring(0, 15)}`, speed: '--' });
    // Importante: NÃO apagamos o rawMp4 para permitir o Resume nas próximas vezes!
    // Limpamos apenas os pedaços .part
    const files = fs.readdirSync(workDir);
    files.forEach(f => {
       if (f.includes('.part')) fs.unlinkSync(path.join(workDir, f));
    });
  }
}

async function run() {
  console.log('--- MODO ACELERADOR MULTIPART (15x Conexões por Filme) ---');
  
  const mcuData = JSON.parse(fs.readFileSync(MCU_FILE, 'utf8'));
  const outrosData = JSON.parse(fs.readFileSync(OUTROS_FILE, 'utf8'));
  const allData = [...mcuData, ...outrosData];

  const streams = [];
  for (const item of allData) {
    if (item.type === 'movie' || (!item.episodes && item.type !== 'series')) {
      const id = item.stream_id || item.id || item.info?.id;
      if (id) streams.push({ id, type: 'movie', ext: item.container_extension || 'mp4', title: item.info?.name || item.name || 'Filme' });
    } else if (item.type === 'series' && item.episodes) {
      for (const seasonNum of Object.keys(item.episodes)) {
        for (const ep of item.episodes[seasonNum]) {
          if (ep.id) streams.push({ id: ep.id, type: 'series', ext: ep.container_extension || 'mp4', title: `${item.info?.name || item.name} - S${seasonNum}E${ep.episode_num || '?'}` });
        }
      }
    }
  }

  const state = loadState();
  let pendingStreams = streams.filter(s => !state[s.id]);
  
  while (pendingStreams.length > 0) {
      initMultiBar();
      
      const queueBar = multiBar.create(pendingStreams.length, 0, { 
          title: '▶ FILA GERAL'.padEnd(22), 
          status: `Restantes: ${pendingStreams.length}`, 
          unit: 'vídeos', 
          speed: '--' 
      });
      
      let processedInThisRun = 0;
      await promiseAllLimit(MAX_CONCURRENT_VIDEOS, pendingStreams, async (stream) => {
        await processVideo(stream, state);
        processedInThisRun++;
        const restantes = pendingStreams.length - processedInThisRun;
        queueBar.update(processedInThisRun, { status: `Restantes: ${restantes}` });
      });

      queueBar.update(pendingStreams.length, { status: 'Ciclo Encerrado' });
      multiBar.stop();

      const newState = loadState();
      pendingStreams = streams.filter(s => !newState[s.id]);
      
      if (pendingStreams.length > 0) {
          console.log(`\n⚠️ O ciclo encerrou, mas ${pendingStreams.length} vídeos falharam.`);
          console.log(`🔄 O Sistema Autônomo vai retentar todos eles em 15 segundos...`);
          await new Promise(r => setTimeout(r, 15000));
      }
  }

  console.log('\n✅ Fila de processamento finalizada com 100% de sucesso!');
}

run();
