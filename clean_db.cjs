const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'mcu_full.json');
let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const originalLength = data.length;

const toRemove = ['Echo Valley', 'Eternos companheiros', 'Echo 3'];

data = data.filter(m => {
  const name1 = m.name ? m.name.toLowerCase() : '';
  const name2 = (m.info && m.info.name) ? m.info.name.toLowerCase() : '';
  
  const shouldRemove = toRemove.some(title => {
    const t = title.toLowerCase();
    return name1.includes(t) || name2.includes(t);
  });
  
  return !shouldRemove;
});

// Also fix missing info.name
data.forEach(m => {
  if (m.info && !m.info.name) {
    m.info.name = m.name || m.title;
  }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Removidos ${originalLength - data.length} itens. Banco de dados atualizado.`);
