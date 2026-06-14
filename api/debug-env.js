module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✅ présente (longueur: ' + process.env.ANTHROPIC_API_KEY.length + ')' : '❌ ABSENTE',
    ANTHROPIC_API_KEY_starts: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 12) + '...' : null,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    allKeys: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('TOKEN') && !k.includes('PASSWORD')).sort()
  });
};
