const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const VPS_URL = 'https://marvel.viewflix.space';
const MCU_FILE = path.join(__dirname, '..', 'src', 'data', 'mcu_full.json');
const OUTROS_FILE = path.join(__dirname, '..', 'src', 'data', 'outros_filmes.json');
const STATE_FILE = path.join(__dirname, 'migration_state.json');
const TEMP_FILE = path.join(__dirname, 'temp_video.mp4');

// Configs do R2 (Reutilizando as do upload_to_r2.cjs)
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

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return {};
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function getToken() {
  const res = await fetch(`${VPS_URL}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'ffmpeg_migration' })
  });
  if (!res.ok) throw new Error('Falha ao gerar token');
  const data = await res.json();
  return data.token;
}

function downloadVideo(streamUrl, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`\nBaixando via FFMPEG para: ${outputPath}...`);
    // O -c copy remultiplexa a stream sem reencodar (muito rapido e nao perde qualidade)
    const ffmpeg = spawn('ffmpeg', [
      '-y', 
      '-headers', 'Referer: https://marvel.viewflix.space/\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n',
      '-i', streamUrl,
      '-c', 'copy',
      '-bsf:a', 'aac_adtstoasc', // Necessario as vezes para HLS para MP4
      outputPath
    ]);

    ffmpeg.stderr.on('data', (data) => {
      // ffmpeg emite o progresso no stderr
      const output = data.toString();
      if (output.includes('time=')) {
        process.stdout.write(`\rFFMPEG Progresso: ${output.match(/time=\S+/)?.[0] || ''}`);
      }
    });

    ffmpeg.on('close', (code) => {
      console.log(); // quebra de linha
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFMPEG encerrou com código ${code}`));
      }
    });
  });
}

async function uploadToR2(filePath, r2Key) {
  console.log(`\nFazendo upload Multipart de ${filePath} para o R2 (videos/${r2Key})...`);
  const fileStream = fs.createReadStream(filePath);
  
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: BUCKET_NAME,
      Key: `videos/${r2Key}`,
      Body: fileStream,
      ContentType: 'video/mp4'
    },
    partSize: 10 * 1024 * 1024, // 10 MB parts
    queueSize: 4 // envia 4 pedacos simultaneos
  });

  upload.on('httpUploadProgress', (progress) => {
    if (progress.total) {
      const percent = ((progress.loaded / progress.total) * 100).toFixed(2);
      process.stdout.write(`\rUpload Progresso: ${percent}% (${(progress.loaded / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      process.stdout.write(`\rUpload Progresso: ${(progress.loaded / 1024 / 1024).toFixed(2)} MB`);
    }
  });

  await upload.done();
  console.log('\nUpload concluído com sucesso!');
}

async function run() {
  console.log('--- Iniciando Migração para o R2 ---');
  const mcuData = JSON.parse(fs.readFileSync(MCU_FILE, 'utf8'));
  const outrosData = JSON.parse(fs.readFileSync(OUTROS_FILE, 'utf8'));
  const allData = [...mcuData, ...outrosData];

  const streams = [];

  for (const item of allData) {
    if (item.type === 'movie' || (!item.episodes && item.type !== 'series')) {
      const id = item.stream_id || item.id || item.info?.id;
      if (id) {
        streams.push({
          id,
          type: 'movie',
          ext: item.container_extension || 'mp4',
          title: item.info?.name || item.name || 'Filme',
          r2Key: `${id}.mp4`
        });
      }
    } else if (item.type === 'series' && item.episodes) {
      for (const seasonNum of Object.keys(item.episodes)) {
        for (const ep of item.episodes[seasonNum]) {
          if (ep.id) {
            streams.push({
              id: ep.id,
              type: 'series',
              ext: ep.container_extension || 'mp4',
              title: `${item.info?.name || item.name} - S${seasonNum}E${ep.episode_num || '?'}`,
              r2Key: `${ep.id}.mp4`
            });
          }
        }
      }
    }
  }

  console.log(`Total de vídeos no catálogo: ${streams.length}`);
  const state = loadState();

  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i];
    
    if (state[stream.id]) {
      console.log(`[${i + 1}/${streams.length}] PING: ${stream.title} (Já migrado. Pulando...)`);
      continue;
    }

    console.log(`\n======================================================`);
    console.log(`[${i + 1}/${streams.length}] INICIANDO: ${stream.title} (ID: ${stream.id})`);
    
    try {
      const token = await getToken();
      const streamUrl = `${VPS_URL}/stream?id=${stream.id}&type=${stream.type}&ext=${stream.ext}&token=${token}`;
      
      // 1. Download
      await downloadVideo(streamUrl, TEMP_FILE);
      
      // 2. Upload
      await uploadToR2(TEMP_FILE, stream.r2Key);
      
      // 3. Limpar local
      fs.unlinkSync(TEMP_FILE);
      console.log(`Arquivo temporário local deletado.`);
      
      // 4. Salvar progresso
      state[stream.id] = true;
      saveState(state);
      
    } catch (err) {
      console.error(`\n[!] Erro fatal ao processar ${stream.title}:`, err.message);
      if (fs.existsSync(TEMP_FILE)) {
        console.log(`Deletando temp file corrompido...`);
        fs.unlinkSync(TEMP_FILE);
      }
      console.log(`\nScript abortado para evitar corrupção. Você pode rodar de novo para retomar!`);
      break; 
    }
  }

  console.log('\n=======================================');
  console.log('Migração concluída ou pausada com segurança.');
}

run();
