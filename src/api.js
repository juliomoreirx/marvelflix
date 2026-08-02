// O IP da sua VPS via nip.io
const VPS_URL = 'http://143.244.171.232.nip.io';

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
  // Se já for da tmdb, pode deixar passar direto se quiser, ou mandar tudo pro proxy
  return `${VPS_URL}/api/image?url=${encodeURIComponent(url)}`;
};

