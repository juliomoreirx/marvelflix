import fs from 'fs';

const ids = [
  60711, 60712, 60713,
  407257, 60726,
  60038,
  403588,
  60039,
  289843, 61950,
  60011, 2207,
  3078, 2263,
  60041, 61981
];

async function run() {
  const results = [];
  for (const id of ids) {
    try {
      const res = await fetch(`https://marvel.viewflix.space/api/info?action=get_vod_info&id=${id}`);
      const data = await res.json();
      if (data && data.info) {
        results.push({
          id: id,
          stream_id: id,
          type: "movie",
          name: data.info.name,
          info: data.info,
          container_extension: data.movie_data ? data.movie_data.container_extension : 'mp4'
        });
        console.log(`Fetched ${data.info.name}`);
      } else {
        console.log(`No info for ${id}`);
      }
    } catch (e) {
      console.error(`Error fetching ${id}`, e);
    }
  }
  fs.writeFileSync('./src/data/outros_filmes.json', JSON.stringify(results, null, 2));
  console.log('Saved to src/data/outros_filmes.json!');
}

run();
