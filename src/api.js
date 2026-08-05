// URL da sua VPS (agora usando o mesmo domínio via Proxy Reverso)
const VPS_URL = import.meta.env.VITE_API_URL || 'https://marvel.viewflix.space';

// As funções de Auth agora pertencem ao Firebase (gerenciadas nos componentes)
// Então aqui teremos apenas funções de dados e comunicação

export const getVodInfo = async (vod_id) => {
  const response = await fetch(`${VPS_URL}/api/info?action=get_vod_info&id=${vod_id}`);
  return response.json();
};

export const getSeriesInfo = async (series_id) => {
  const response = await fetch(`${VPS_URL}/api/info?action=get_series_info&id=${series_id}`);
  return response.json();
};

export const getProxyImageUrl = (url) => {
  if (!url) return '';
  // Como as imagens agora estão no R2 ou em fontes com CORS liberado,
  // não precisamos mais passar pelo proxy da VPS.
  return url;
};
