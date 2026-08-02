const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = '2520a8bd9b9292f637357a5c7e465f31';
const ACCESS_KEY_ID = '3e7eadeae8bf8c03252f54904ab3ae76';
const SECRET_ACCESS_KEY = 'c1b336f6621ffd45af2037cc74b7a37c0d6651f462cb57e0b0ba4eb1e1216f47';
const BUCKET_NAME = 'marvelflix-assets';
const R2_PUBLIC_URL = 'https://assets.marvel.viewflix.space';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  }
});

const ASSETS_DIR = path.join(__dirname, 'assets_manuais');
const MCU_FILE = path.join(__dirname, '../src/data/mcu_full.json');
const OUTROS_FILE = path.join(__dirname, '../src/data/outros_filmes.json');
const FAILED_FILE = path.join(__dirname, 'failed_downloads.json');

const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
};

// Funcao para normalizar nomes de filmes: "Gavião Arqueiro" -> "gaviao-arqueiro"
const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]/g, '-')      // troca nao alfanumericos por hifen
    .replace(/-+/g, '-')             // remove hifens duplos
    .replace(/^-|-$/g, '');          // remove hifens no inicio/fim
};

const run = async () => {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log('Pasta assets_manuais nao existe!');
    return;
  }

  const files = fs.readdirSync(ASSETS_DIR);
  console.log(`Encontrados ${files.length} arquivos para upload.`);

  // 1. UPLOAD
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(ASSETS_DIR, file);
    const fileStream = fs.createReadStream(filePath);
    
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: file,
      Body: fileStream,
      ContentType: getContentType(file)
    };

    try {
      await s3.send(new PutObjectCommand(uploadParams));
      console.log(`Upload OK: ${file}`);
    } catch (err) {
      console.error(`ERRO no upload: ${file} -`, err.message);
    }
  }

  console.log('--- Upload para R2 Concluido ---');

  // 2. ATUALIZAR JSONS
  const failedList = JSON.parse(fs.readFileSync(FAILED_FILE, 'utf8'));
  const failedUrls = new Set(failedList.map(f => f.url));

  const mcuData = JSON.parse(fs.readFileSync(MCU_FILE, 'utf8'));
  const outrosData = JSON.parse(fs.readFileSync(OUTROS_FILE, 'utf8'));

  let replacedCount = 0;

  const replaceFailedInObj = (obj, movieNameNormalized) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        if (failedUrls.has(obj[key])) {
          // Achar o arquivo correspondente na pasta
          const matchingFile = files.find(f => {
            const baseName = path.basename(f, path.extname(f));
            return movieNameNormalized.includes(baseName) || baseName.includes(movieNameNormalized);
          });
          
          if (matchingFile) {
            obj[key] = `${R2_PUBLIC_URL}/${matchingFile}`;
            replacedCount++;
          }
        }
      } else if (Array.isArray(obj[key])) {
        for (let i = 0; i < obj[key].length; i++) {
          const u = obj[key][i];
          if (typeof u === 'string' && failedUrls.has(u)) {
            const matchingFile = files.find(f => {
              const baseName = path.basename(f, path.extname(f));
              return movieNameNormalized.includes(baseName) || baseName.includes(movieNameNormalized);
            });
            
            if (matchingFile) {
              obj[key][i] = `${R2_PUBLIC_URL}/${matchingFile}`;
              replacedCount++;
            }
          } else if (typeof u === 'object' && u !== null) {
            replaceFailedInObj(u, movieNameNormalized);
          }
        }
        
        // Se for backdrop_path, vamos deduplicar pra não ficar com o mesmo link 5x
        if (key === 'backdrop_path') {
           obj[key] = [...new Set(obj[key])];
        }

      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        replaceFailedInObj(obj[key], movieNameNormalized);
      }
    }
  };

  const processData = (data) => {
    data.forEach(item => {
      let title = item.info && item.info.name ? item.info.name : item.name;
      
      // Limpar coisas como " 4K", " [L]", " [HDR]" etc pra sobrar só o nome do filme puro
      title = title.replace(/\s*\[.*?\]/g, '').replace(/\s*4K/gi, '').trim();
      
      // O caso "Temporada 1" no JSON que o usuário mapeou no arquivo mcu
      if (title === 'Temporada 1' && item.info && item.info.plot && item.info.plot.includes("Agatha")) {
          title = "Agatha Desde Sempre";
      }

      const normalized = normalizeName(title);
      replaceFailedInObj(item, normalized);
    });
  };

  processData(mcuData);
  processData(outrosData);

  fs.writeFileSync(MCU_FILE, JSON.stringify(mcuData, null, 2));
  fs.writeFileSync(OUTROS_FILE, JSON.stringify(outrosData, null, 2));

  console.log(`Substituicao Concluida! Foram alteradas ${replacedCount} URLs quebradas.`);
};

run();
