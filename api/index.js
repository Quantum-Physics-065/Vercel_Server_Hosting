const app = require('../server.js');

module.exports = async function handler(req, res) {
  console.log(`[vercel-handler] ${req.method} ${req.url} -> server.js`);
  return app(req, res);
};