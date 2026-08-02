import fs from 'fs';

let content = fs.readFileSync('./src/data/outros_filmes.json', 'utf8');

const replacements = {
  "A\\?\\?o": "Ação",
  "Fic\\?\\?o": "Ficção",
  "cient\\?fica": "científica",
  "Com\\?dia": "Comédia",
  "maldi\\?\\?o": "maldição",
  "super-her\\?i": "super-herói",
  "aracn\\?deo": "aracnídeo",
  "demonstra\\?\\?o": "demonstração",
  "ent\\?o": "então",
  "miss\\?o": "missão",
  "miss\\?es": "missões",
  "her\\?i": "herói",
  "salv\\?-lo": "salvá-lo",
  "for\\?a": "força",
  "alien\\?gena": "alienígena",
  "espa\\?o": "espaço",
  "explos\\?o": "explosão",
  "mal\\?vola": "malévola",
  "F\\?NIX": "FÊNIX",
  "\\?pica": "épica",
  "esp\\?cie": "espécie",
  "per\\?odos": "períodos",
  "nonagen\\?rio": "nonagenário",
  "mercen\\?rio": "mercenário",
  "cat\\?stofre": "catástrofe",
  "Caber\\?": "Caberá",
  "vil\\?o": "vilão",
  "vil\\?es": "vilões",
  "come\\?am": "começam",
  "\\? um": "é um",
  "\\? procurado": "é procurado",
  "\\? quimicamente": "é quimicamente",
  "\\? perseguido": "é perseguido",
  "\\? ser her": "é ser her",
  "\\? lidando": "é lidando",
  "est\\? fascinado": "está fascinado",
  "est\\? lidando": "está lidando",
  "ap\\?s": "após",
  " \\? ": " é ",
  "t\\?mido": "tímido",
  "At\\? que": "Até que",
  "\\?mido": "ímido",
  "\\?s": "ós",
  "Her\\?is": "Heróis"
};

for (const [bad, good] of Object.entries(replacements)) {
  const regex = new RegExp(bad, 'g');
  content = content.replace(regex, good);
}

// Clean up any stray '? ' that should be 'é '
content = content.replace(/ \? /g, ' é ');

try {
  JSON.parse(content);
  fs.writeFileSync('./src/data/outros_filmes.json', content, 'utf8');
  console.log("Fixed encodings successfully!");
} catch (e) {
  console.error("Error parsing JSON after replacements!", e);
}
