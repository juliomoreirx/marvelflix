// Usando fetch global
async function test() {
  const VPS_URL = 'https://marvel.viewflix.space';
  
  // 1. Get Token
  const tokenRes = await fetch(`${VPS_URL}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'guest' })
  });
  const { token } = await tokenRes.json();
  console.log('Token:', token);

  // 2. Fetch HEAD for a movie (e.g. Iron Man id: 1726)
  const id = '1726';
  const type = 'movie';
  const ext = 'mp4';
  
  const streamUrl = `${VPS_URL}/stream?id=${id}&type=${type}&ext=${ext}&token=${token}`;
  console.log('Stream URL:', streamUrl);
  
  const headRes = await fetch(streamUrl, { 
    method: 'GET', 
    headers: { 
      'Range': 'bytes=0-0',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://marvel.viewflix.space/',
      'Origin': 'https://marvel.viewflix.space'
    },
    redirect: 'follow' 
  });
  console.log('Status:', headRes.status);
  
  if (!headRes.ok) {
    const text = await headRes.text();
    console.log('Error Body:', text);
    return;
  }
  
  const size = headRes.headers.get('content-range'); // e.g. bytes 0-0/12345678
  console.log('Content-Range:', size);
  if (size) {
    const totalSize = size.split('/')[1];
    if (totalSize) {
      console.log('Size (GB):', (parseInt(totalSize) / (1024 ** 3)).toFixed(2));
    }
  } else {
    // try content-length just in case
    const cl = headRes.headers.get('content-length');
    console.log('Content-Length:', cl);
  }
}

test();
