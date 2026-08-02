const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'mcu_full.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const badWords = new Set();

function traverse(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(traverse);
  } else if (obj !== null && typeof obj === 'object') {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        const matches = obj[key].match(/[a-zA-Z]*\?+[a-zA-Z]+/g);
        if (matches) {
          matches.forEach(m => badWords.add(m));
        }
      } else if (typeof obj[key] === 'object') {
        traverse(obj[key]);
      }
    }
  }
}

traverse(data);

console.log([...badWords].sort().join('\n'));
