const fs = require('fs');
const path = require('path');

const VPS_URL = 'http://143.244.171.232.nip.io';

const itemsToFetch = [
  { id: '5721', type: 'series', title: 'Agente Carter' },
  { id: '2777', type: 'series', title: 'Eu Sou Groot' },
  { id: '8739', type: 'series', title: 'Magnum' },
  { id: '415381', type: 'movie', title: 'Homem-Aranha: Um Novo Dia' }
];

async function fetchItem(item) {
  const action = item.type === 'series' ? 'get_series_info' : 'get_vod_info';
  console.log(`Fetching ${item.title} (${item.id}) using action: ${action}`);
  const url = `${VPS_URL}/api/info?action=${action}&id=${item.id}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch ${item.id}:`, error);
    return null;
  }
}

async function run() {
  const newItems = [];
  
  for (const item of itemsToFetch) {
    const rawData = await fetchItem(item);
    if (!rawData) continue;

    // Depending on the API format, it might return { info, episodes } etc.
    const formattedItem = {
      id: rawData.info?.id || item.id,
      name: rawData.info?.name || item.title,
      type: item.type,
      info: rawData.info || {},
    };

    if (item.type === 'series' && rawData.episodes) {
      formattedItem.episodes = rawData.episodes;
    }

    if (item.type === 'movie' && rawData.movie_data) {
       // Merge movie_data properties if needed, or maybe it returns movie details inside 'info'
       formattedItem.info = rawData.info || rawData.movie_data;
    }
    
    // Add custom tag for the movie
    if (item.id === '415381') {
      formattedItem.category = "Qualidade CINEMA";
    } else {
      formattedItem.category = "Séries Expandidas"; // Default or custom
    }

    newItems.push(formattedItem);
  }
  
  const mcuPath = path.join(__dirname, 'src', 'data', 'mcu_full.json');
  let mcuData = JSON.parse(fs.readFileSync(mcuPath, 'utf8'));
  
  // Combine logic (check if ID already exists)
  for (const newItem of newItems) {
    const exists = mcuData.find(m => String(m.id) === String(newItem.id));
    if (!exists) {
      mcuData.push(newItem);
      console.log(`Added: ${newItem.name}`);
    } else {
      console.log(`Already exists: ${newItem.name}`);
    }
  }

  fs.writeFileSync(mcuPath, JSON.stringify(mcuData, null, 2));
  console.log('Finished updating mcu_full.json');
}

run();
