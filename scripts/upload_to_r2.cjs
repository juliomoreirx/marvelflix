const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = '2520a8bd9b9292f637357a5c7e465f31';
const ACCESS_KEY_ID = '3e7eadeae8bf8c03252f54904ab3ae76';
const SECRET_ACCESS_KEY = 'c1b336f6621ffd45af2037cc74b7a37c0d6651f462cb57e0b0ba4eb1e1216f47';
const BUCKET_NAME = 'marvelflix-assets';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  }
});

const ASSETS_DIR = path.join(__dirname, 'assets');

const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
};

const run = async () => {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log('Pasta assets nao existe!');
    return;
  }

  const files = fs.readdirSync(ASSETS_DIR);
  console.log(`Encontrados ${files.length} arquivos para upload.`);

  let success = 0;
  let error = 0;

  // Usa Promise.allLimit-like
  const CONCURRENCY = 10;
  let activePromises = [];

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

    const p = s3.send(new PutObjectCommand(uploadParams))
      .then(() => {
        success++;
        console.log(`[${success + error}/${files.length}] Upload OK: ${file}`);
      })
      .catch((err) => {
        error++;
        console.error(`[${success + error}/${files.length}] ERRO no upload: ${file} -`, err.message);
      })
      .finally(() => {
        activePromises.splice(activePromises.indexOf(p), 1);
      });

    activePromises.push(p);

    if (activePromises.length >= CONCURRENCY) {
      await Promise.race(activePromises);
    }
  }

  await Promise.all(activePromises);
  
  console.log('--- Upload para R2 Concluido ---');
  console.log(`Sucesso: ${success} | Falha: ${error}`);
};

run();
