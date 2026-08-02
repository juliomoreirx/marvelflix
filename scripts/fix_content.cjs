const fs = require('fs');
const path = require('path');

const VPS_URL = 'http://143.244.171.232.nip.io';

const MCU_FILE = path.join(__dirname, '..', 'src', 'data', 'mcu_full.json');
const OUTROS_FILE = path.join(__dirname, '..', 'src', 'data', 'outros_filmes.json');

const R2_BASE = 'https://assets.marvel.viewflix.space';

async function fetchItem(id) {
  const url = `${VPS_URL}/api/info?action=get_vod_info&id=${id}`;
  console.log(`Buscando ${id}...`);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Erro ao buscar ${id}:`, error);
    return null;
  }
}

async function run() {
  let mcuData = JSON.parse(fs.readFileSync(MCU_FILE, 'utf8'));
  let outrosData = JSON.parse(fs.readFileSync(OUTROS_FILE, 'utf8'));

  // 1. Remover Pantera Negra: O Reino Selvagem
  const removeFilter = (item) => {
    const name = item.name || (item.info && item.info.name) || '';
    return !name.includes("Pantera Negra: O Reino Selvagem");
  };
  mcuData = mcuData.filter(removeFilter);
  outrosData = outrosData.filter(removeFilter);
  console.log('Removido Pantera Negra: O Reino Selvagem');

  // 2. Fix Backdrops (Shang-Chi, Guardiões, Deadpool)
  const fixBackdrop = (dataArray) => {
    dataArray.forEach(item => {
      const title = (item.info?.name || item.name || '').toLowerCase();
      
      if (title.includes('shang-chi') || title.includes('shang chi')) {
        if (!item.info) item.info = {};
        item.info.backdrop_path = [`${R2_BASE}/shang-shi-e-a-lenda-dos-aneis.webp`];
        console.log(`Corrigido backdrop: ${item.name || item.info.name}`);
      }
      
      if (title.includes('guardiões da galáxia') && title.includes('festas')) {
        if (!item.info) item.info = {};
        item.info.backdrop_path = [`${R2_BASE}/guardiao-das-galaxias-especial-de-festas.webp`];
        console.log(`Corrigido backdrop: ${item.name || item.info.name}`);
      }
      
      if (title.includes('deadpool') && title.includes('wolverine')) {
        if (!item.info) item.info = {};
        item.info.backdrop_path = [`${R2_BASE}/deadpool-e-wolverine.webp`];
        console.log(`Corrigido backdrop: ${item.name || item.info.name}`);
      }
      
      if (title.includes('logan') && !title.includes('wolverine')) {
        if (!item.info) item.info = {};
        item.info.backdrop_path = [`${R2_BASE}/logan.webp`];
        console.log(`Corrigido backdrop: ${item.name || item.info.name}`);
      }
    });
  };
  
  fixBackdrop(mcuData);
  fixBackdrop(outrosData);

  // 3. Adicionar LOGAN
  const logans = [
    { id: '289843', expectedName: 'Logan' },
    { id: '61950', expectedName: 'Logan 4K' },
    { id: '289844', expectedName: 'Logan [L]' }
  ];

  for (const logan of logans) {
    // verifica se ja existe
    const exists = outrosData.find(m => String(m.id) === logan.id || String(m.stream_id) === logan.id) || 
                   mcuData.find(m => String(m.id) === logan.id || String(m.stream_id) === logan.id);
    if (!exists) {
      const rawData = await fetchItem(logan.id);
      if (rawData && rawData.info) {
        const formattedItem = {
          id: rawData.info.id || logan.id,
          stream_id: rawData.info.stream_id || logan.id,
          name: rawData.info.name || logan.expectedName,
          type: 'movie',
          info: rawData.info || {},
          category: "Outros Filmes (Expandido)"
        };
        
        // Forçar o backdrop no info.backdrop_path
        formattedItem.info.backdrop_path = [`${R2_BASE}/logan.webp`];
        
        // As vezes a API retorna "movie_data"
        if (rawData.movie_data) {
           Object.assign(formattedItem.info, rawData.movie_data);
        }

        outrosData.push(formattedItem);
        console.log(`Adicionado: ${formattedItem.name}`);
      }
    } else {
      console.log(`${logan.expectedName} já existe.`);
    }
  }

  fs.writeFileSync(MCU_FILE, JSON.stringify(mcuData, null, 2));
  fs.writeFileSync(OUTROS_FILE, JSON.stringify(outrosData, null, 2));
  console.log('Script finalizado com sucesso.');
}

run();
