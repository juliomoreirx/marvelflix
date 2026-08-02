const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'mcu_full.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Dicionário com escapes Unicode garantindo que não haja erro de codificação
const replacements = {
  "rob? ": "rob\u00f4 ",
  "rob?.": "rob\u00f4.",
  "rob?,": "rob\u00f4,",
  "Capit? ": "Capit\u00e3 ",
  "Capit? Marvel": "Capit\u00e3 Marvel",
  "Tit? ": "Tit\u00e3 ",
  "vil? ": "vil\u00e3 ",
  "vil?.": "vil\u00e3.",
  "vil?,": "vil\u00e3,",
  "Brichc?n": "Brichc\u00e1n",
  "A? ": "A\u00ed ",
  "us?-las": "us\u00e1-las",
  "captur?-lo": "captur\u00e1-lo",
  "herdar? ": "herdar\u00e1 ",
  "ser? ": "ser\u00e1 ",
  " ? ": " \u00e9 ",
  "v? ": "v\u00ea ",
  "v?.": "v\u00ea.",
  "v?,": "v\u00ea,",
  "destru?-la": "destru\u00ed-la",
  "afast?-lo": "afast\u00e1-lo",
  "det?-lo": "det\u00ea-lo",
  "acabar? ": "acabar\u00e1 ",
  "coloc?-los": "coloc\u00e1-los"
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
console.log('Finalizado correções residuais com sucesso!');
