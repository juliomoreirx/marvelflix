const fs = require('fs');
const path = require('path');

const FAILED_FILE = path.join(__dirname, 'failed_downloads.json');
const MCU_FILE = path.join(__dirname, '../src/data/mcu_full.json');
const OUTROS_FILE = path.join(__dirname, '../src/data/outros_filmes.json');
const REPORT_FILE = path.join(__dirname, '../failed_images_report.md');

if (!fs.existsSync(FAILED_FILE)) {
  console.log('Sem falhas!');
  process.exit(0);
}

const failedList = JSON.parse(fs.readFileSync(FAILED_FILE, 'utf8'));
const mcuData = JSON.parse(fs.readFileSync(MCU_FILE, 'utf8'));
const outrosData = JSON.parse(fs.readFileSync(OUTROS_FILE, 'utf8'));
const allData = [...mcuData, ...outrosData];

const getMovieNameByUrl = (url) => {
  let foundName = 'Desconhecido';
  
  const searchObj = (obj, currentTitle) => {
    if (obj.info && obj.info.name) {
      currentTitle = obj.info.name;
    } else if (obj.name) {
      currentTitle = obj.name;
    }

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        if (obj[key] === url) foundName = currentTitle;
      } else if (Array.isArray(obj[key])) {
        obj[key].forEach(i => {
          if (typeof i === 'string' && i === url) foundName = currentTitle;
          else if (typeof i === 'object' && i !== null) searchObj(i, currentTitle);
        });
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        searchObj(obj[key], currentTitle);
      }
    }
  };

  allData.forEach(item => searchObj(item, item.name || 'Desconhecido'));
  return foundName;
};

let report = `# Relatório de Imagens com Falha no Download\n\nEssas URLs retornaram erro (404 Not Found ou Domínio Inexistente) direto do provedor IPTV.\n\n| Filme/Série afetado | URL Antiga com erro | Motivo da Falha |\n| :--- | :--- | :--- |\n`;

// Elimina duplicatas se a mesma URL falhou repetidamente por causa de retentativas
const uniqueFails = [];
const seen = new Set();
failedList.forEach(f => {
  if (!seen.has(f.url)) {
    seen.add(f.url);
    uniqueFails.push(f);
  }
});

uniqueFails.forEach(f => {
  const name = getMovieNameByUrl(f.url);
  report += `| **${name}** | \`${f.url}\` | ${f.reason} |\n`;
});

// A pasta do brain pra criar artefato (o usuário vai ver direto)
const args = process.argv.slice(2);
const dest = args[0] || REPORT_FILE;

fs.writeFileSync(dest, report);
console.log('Relatorio gerado em', dest);
