import { jwtVerify } from 'jose';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env, ctx) {
    // 1. Responde instantaneamente às requisições de segurança (CORS Preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const objectKey = url.pathname.slice(1); 
    const token = url.searchParams.get('token');

    // 2. Exceção de Segurança: Libera o acesso IMEDIATO sem token se for apenas uma IMAGEM
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(objectKey);

    if (!isImage) {
        // 3. Proteção Básica: Se não tem token e não é imagem, bloqueia a porta!
        if (!token) {
          return new Response('🚨 Acesso Negado: Você não forneceu a chave de acesso.', { status: 401, headers: corsHeaders });
        }

        // 4. Verifica a assinatura usando a chave secreta da VPS e cruza o IP
        try {
          const secretKey = new TextEncoder().encode(env.JWT_SECRET);
          const { payload } = await jwtVerify(token, secretKey);
          
          // Assinatura JWT verificada com sucesso!
          // A checagem de IP restrita foi removida para garantir suporte perfeito a Dual-Stack (IPv4/IPv6) e Redes Móveis 4G.
          // O tempo de expiração do Token (4 horas) e a criptografia JWT continuam blindando o acesso.
        } catch (e) {
          // DEBUGGING TOTAL: Vamos imprimir na tela exatamente o que deu errado!
          return new Response(`🚨 Acesso Negado (DEBUG): ${e.message || e}`, { status: 403, headers: corsHeaders });
        }
    }
    
    // 5. Puxa o arquivo do R2 que está blindado (privado)
    // Se for um PING (HEAD), a gente não baixa o arquivo inteiro, só checa se ele existe!
    if (request.method === "HEAD") {
       const headObj = await env.R2_BUCKET.head(objectKey);
       if (headObj === null) {
          return new Response('Arquivo Não Encontrado', { status: 404, headers: corsHeaders });
       }
       const hHeaders = new Headers(corsHeaders);
       headObj.writeHttpMetadata(hHeaders);
       return new Response(null, { headers: hHeaders });
    }

    // Se for GET, a gente baixa o conteúdo
    const object = await env.R2_BUCKET.get(objectKey);

    if (object === null) {
      return new Response('Arquivo Não Encontrado no Cofre', { status: 404, headers: corsHeaders });
    }

    const headers = new Headers(corsHeaders);
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    // 6. 🪄 MÁGICA HLS: Se o usuário pediu o .m3u8, nós reescrevemos o arquivo "on the fly"
    // para injetar o Token em CADA PEDAÇO .ts! Assim o player continua autenticado o filme todo!
    if (objectKey.endsWith('.m3u8')) {
        const text = await new Response(object.body).text();
        // Regex procura qualquer linha terminando em .ts e adiciona o ?token=...
        const rewritten = text.replace(/(\.ts)$/gm, `$1?token=${token}`);
        headers.set('Content-Type', 'application/vnd.apple.mpegurl');
        return new Response(rewritten, { headers });
    }

    // 7. Se for um pedaço .ts normal (já autenticado), apenas entrega o vídeo bruto
    return new Response(object.body, { headers });
  }
};
