const app = require('../server.js');

module.exports = async function handler(req, res) {
  console.log(`[vercel-handler] ${req.method} ${req.url}`);
  return app(req, res);
};