const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const ASSETS_DIR = path.join(__dirname, 'assets');
const MAP_FILE = path.join(__dirname, 'image_map.json');
const FAILED_FILE = path.join(__dirname, 'failed_downloads.json');

const CONCURRENCY = 5;

// Cria diretório se não existir
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Carrega JSONs
const mcuPath = path.join(__dirname, '../src/data/mcu_full.json');
const outrosPath = path.join(__dirname, '../src/data/outros_filmes.json');

const mcuData = JSON.parse(fs.readFileSync(mcuPath, 'utf8'));
const outrosData = JSON.parse(fs.readFileSync(outrosPath, 'utf8'));
const allData = [...mcuData, ...outrosData];

const imageUrls = new Set();

const extractUrls = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string' && obj[key].startsWith('http')) {
      if (['cover', 'movie_image', 'stream_icon', 'cover_big'].includes(key)) {
        imageUrls.add(obj[key]);
      }
    } else if (Array.isArray(obj[key])) {
      if (key === 'backdrop_path') {
        obj[key].forEach(u => {
          if (typeof u === 'string' && u.startsWith('http')) imageUrls.add(u);
        });
      } else {
        obj[key].forEach(item => { if (typeof item === 'object' && item !== null) extractUrls(item); });
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      extractUrls(obj[key]);
    }
  }
};

allData.forEach(extractUrls);
const urlList = Array.from(imageUrls);
console.log(`Encontradas ${urlList.length} URLs de imagens únicas.`);

let imageMap = {};
if (fs.existsSync(MAP_FILE)) {
  imageMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
}

const failedDownloads = [];

const downloadImage = (url) => {
  return new Promise((resolve) => {
    // Se já baixou, pula
    if (imageMap[url]) {
      return resolve({ success: true, url, cached: true });
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Redirect
        return resolve(downloadImage(res.headers.location));
      }
      
      if (res.statusCode !== 200) {
        failedDownloads.push({ url, reason: `Status ${res.statusCode}` });
        return resolve({ success: false, url });
      }

      const contentType = res.headers['content-type'] || '';
      let ext = '.jpg';
      if (contentType.includes('png')) ext = '.png';
      else if (contentType.includes('webp')) ext = '.webp';
      
      const hash = crypto.createHash('md5').update(url).digest('hex');
      const filename = `${hash}${ext}`;
      const destPath = path.join(ASSETS_DIR, filename);
      
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        imageMap[url] = filename;
        fs.writeFileSync(MAP_FILE, JSON.stringify(imageMap, null, 2));
        resolve({ success: true, url });
      });

      fileStream.on('error', (err) => {
        failedDownloads.push({ url, reason: err.message });
        fs.unlink(destPath, () => {});
        resolve({ success: false, url });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      failedDownloads.push({ url, reason: 'Timeout' });
      resolve({ success: false, url });
    });

    req.on('error', (err) => {
      failedDownloads.push({ url, reason: err.message });
      resolve({ success: false, url });
    });
  });
};

const run = async () => {
  let activePromises = [];
  let completed = 0;

  for (let i = 0; i < urlList.length; i++) {
    const p = downloadImage(urlList[i]).then((res) => {
      completed++;
      if (!res.cached) {
        console.log(`[${completed}/${urlList.length}] ${res.success ? 'OK' : 'ERRO'} ${urlList[i]}`);
      }
      activePromises.splice(activePromises.indexOf(p), 1);
    });
    
    activePromises.push(p);

    if (activePromises.length >= CONCURRENCY) {
      await Promise.race(activePromises);
    }
  }

  await Promise.all(activePromises);

  console.log('--- Download Concluido ---');
  console.log(`Total mapeadas: ${Object.keys(imageMap).length}`);
  console.log(`Falhas: ${failedDownloads.length}`);
  
  if (failedDownloads.length > 0) {
    fs.writeFileSync(FAILED_FILE, JSON.stringify(failedDownloads, null, 2));
    console.log(`Lista de falhas salva em ${FAILED_FILE}`);
  }
};

run();
