const fs = require('fs');
const path = require('path');

// --- ATENCAO ---
// O usuario DEVE informar a URL publica e nos passaremos aqui como argumento ou variavel de ambiente.
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://assets.marvel.viewflix.space';

const MAP_FILE = path.join(__dirname, 'image_map.json');
const MCU_FILE = path.join(__dirname, '../src/data/mcu_full.json');
const OUTROS_FILE = path.join(__dirname, '../src/data/outros_filmes.json');

if (!fs.existsSync(MAP_FILE)) {
  console.log('image_map.json nao encontrado!');
  process.exit(1);
}

const imageMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
const mcuData = JSON.parse(fs.readFileSync(MCU_FILE, 'utf8'));
const outrosData = JSON.parse(fs.readFileSync(OUTROS_FILE, 'utf8'));

// Garante que a URL tem barra no final
const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL : R2_PUBLIC_URL + '/';

let replacedCount = 0;

const replaceUrls = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string' && obj[key].startsWith('http')) {
      if (imageMap[obj[key]]) {
        obj[key] = baseUrl + imageMap[obj[key]];
        replacedCount++;
      }
    } else if (Array.isArray(obj[key])) {
      if (key === 'backdrop_path') {
        for (let i = 0; i < obj[key].length; i++) {
          const u = obj[key][i];
          if (typeof u === 'string' && imageMap[u]) {
            obj[key][i] = baseUrl + imageMap[u];
            replacedCount++;
          }
        }
      } else {
        obj[key].forEach(item => { if (typeof item === 'object' && item !== null) replaceUrls(item); });
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      replaceUrls(obj[key]);
    }
  }
};

replaceUrls(mcuData);
replaceUrls(outrosData);

fs.writeFileSync(MCU_FILE, JSON.stringify(mcuData, null, 2));
fs.writeFileSync(OUTROS_FILE, JSON.stringify(outrosData, null, 2));

console.log(`Substituicao Concluida! Foram alteradas ${replacedCount} URLs.`);
