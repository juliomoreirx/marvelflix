const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'mcu_full.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Dicionário com escapes Unicode
const replacements = {
  "espi? ": "espi\u00e3 ",
  "Chlo? ": "Chlo\u00e9 ",
  "replant?-la": "replant\u00e1-la",
  "manter? ": "manter\u00e1 "
};

function fixText(text) {
  if (!text || typeof text !== 'string') return text;
  let newText = text;
  for (const [bad, good] of Object.entries(replacements)) {
    const regex = new RegExp(bad.replace(/\?/g, '\\?'), 'g');
    newText = newText.replace(regex, good);
  }
  return newText;
}

function traverse(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(traverse);
  } else if (obj !== null && typeof obj === 'object') {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = fixText(obj[key]);
      } else if (typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }
}

traverse(data);

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Finalizado super final!');
