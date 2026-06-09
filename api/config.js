export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    mapboxToken: process.env.MAPBOX_TOKEN || ''
  });
}
