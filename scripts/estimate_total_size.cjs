const fs = require('fs');
const path = require('path');

const VPS_URL = 'https://marvel.viewflix.space';
const MCU_FILE = path.join(__dirname, '..', 'src', 'data', 'mcu_full.json');
const OUTROS_FILE = path.join(__dirname, '..', 'src', 'data', 'outros_filmes.json');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getToken() {
  const res = await fetch(`${VPS_URL}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'guest_estimator' })
  });
  if (!res.ok) throw new Error('Falha ao gerar token');
  const data = await res.json();
  return data.token;
}

async function getStreamSize(id, type, ext, token) {
  const streamUrl = `${VPS_URL}/stream?id=${id}&type=${type}&ext=${ext}&token=${token}`;
  try {
    const res = await fetch(streamUrl, {
      method: 'GET',
      headers: { 
        'Range': 'bytes=0-0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://marvel.viewflix.space/',
        'Origin': 'https://marvel.viewflix.space'
      },
      redirect: 'follow'
    });

    if (res.status === 206 || res.status === 200) {
      const contentRange = res.headers.get('content-range');
      if (contentRange) {
        const total = contentRange.split('/')[1];
        if (total) return parseInt(total, 10);
      }
      const contentLength = res.headers.get('content-length');
      if (contentLength) return parseInt(contentLength, 10);
    }
    
    return null;
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log('--- Iniciando Estimativa de Tamanho Total (GBs) ---');
  console.log('Lendo arquivos JSON...');
  
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
          title: item.info?.name || item.name || 'Filme Desconhecido'
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
              title: `${item.info?.name || item.name} - S${seasonNum}E${ep.episode_num || '?'} (${ep.title})`
            });
          }
        }
      }
    }
  }

  console.log(`Total de vídeos encontrados: ${streams.length}`);
  
  let token;
  try {
    token = await getToken();
    console.log('Token obtido com sucesso.');
  } catch (err) {
    console.error('Erro ao obter token:', err.message);
    return;
  }

  let totalBytes = 0;
  let successCount = 0;
  let failedCount = 0;
  const failedItems = [];

  for (let i = 0; i < streams.length; i++) {
    const stream = streams[i];
    process.stdout.write(`[${i + 1}/${streams.length}] Verificando: ${stream.title}... `);
    
    const size = await getStreamSize(stream.id, stream.type, stream.ext, token);
    
    if (size) {
      totalBytes += size;
      successCount++;
      const sizeGB = (size / (1024 ** 3)).toFixed(2);
      console.log(`${sizeGB} GB`);
    } else {
      failedCount++;
      failedItems.push(stream.title);
      console.log('FALHOU');
    }

    // Delay pequeno para evitar rate limits
    await delay(50);
  }

  const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);
  const totalTB = (totalBytes / (1024 ** 4)).toFixed(2);

  console.log('\n=======================================');
  console.log('           RESULTADO FINAL');
  console.log('=======================================');
  console.log(`Total de Vídeos Processados: ${streams.length}`);
  console.log(`Sucessos: ${successCount}`);
  console.log(`Falhas: ${failedCount}`);
  console.log(`TAMANHO TOTAL: ${totalGB} GB (~${totalTB} TB)`);
  console.log('=======================================');

  if (failedCount > 0) {
    console.log('\nAlguns vídeos falharam (talvez links mortos ou redirecionamentos bloqueados):');
    failedItems.slice(0, 10).forEach(f => console.log(`- ${f}`));
    if (failedItems.length > 10) console.log(`...e mais ${failedItems.length - 10}`);
  }
}

run();
