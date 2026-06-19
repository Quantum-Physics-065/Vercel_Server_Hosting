const app = require('../server.js');

// module.exports = async function handler(req, res) {
//   try {
//     return app(req, res);
//   } catch (error) {
//     console.error('Vercel handler error:', error);
//     if (!res.headersSent) {
//       res.status(500).json({
//         ok: false,
//         error: 'Internal server error',
//         message: process.env.NODE_ENV === 'development' ? error.message : undefined,
//       });
//     }
//   }
// };

module.exports = app;