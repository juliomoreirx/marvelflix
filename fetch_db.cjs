const fs = require('fs');

const input = require('./src/data/mcu_found.json');
const output = [];

async function buildDb() {
  console.log('Iniciando pre-fetch do banco de dados (isso pode levar uns 20 segundos)...');
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    console.log(`[${i+1}/${input.length}] Buscando: ${item.name}`);
    try {
      const action = item.type === 'series' ? 'get_series_info' : 'get_vod_info';
      const url = `http://143.244.171.232.nip.io/api/info?action=${action}&id=${item.id}`;
      const res = await fetch(url);
      const data = await res.json();
      
      // Merge properties
      const fullItem = {
        ...item,
        info: data.info || data,
        movie_data: data.movie_data || null,
        episodes: data.episodes || null,
        seasons: data.seasons || null
      };
      output.push(fullItem);
    } catch (e) {
      console.error(`Erro ao buscar ${item.name}:`, e.message);
    }
  }

  fs.writeFileSync('./src/data/mcu_full.json', JSON.stringify(output, null, 2));
  console.log('✅ Banco de dados estático gerado com sucesso em src/data/mcu_full.json!');
}

buildDb();
