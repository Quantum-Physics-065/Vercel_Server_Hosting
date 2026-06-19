const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const fileRoutes = require('./routes/fileRoutes');
const statusRoutes = require('./routes/statusRoutes');
const configRoutes = require('./routes/configRoutes');
const authRoutes = require('./routes/authRoutes');
const storageService = require('./services/storageService');
const configService = require('./services/configService');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.disable('x-powered-by');

function buildCorsOptions() {
  if (allowedOrigins.includes('*')) {
    return {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    };
  }

  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin denied: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  };
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(morgan('combined'));
app.use(cors(buildCorsOptions()));
app.options('*', cors(buildCorsOptions()));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api', apiLimiter);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptimeMs: process.uptime() * 1000,
  });
});

// app.get('/favicon.ico', (req, res) => {
//   res.status(204).end();
// });

// app.get('/sw.js', (req, res) => {
//   res.type('application/javascript').send(`/* service worker stub */`);
// });

app.use(fileRoutes);
app.use(configRoutes.router);
app.use(authRoutes);
app.use(statusRoutes);

// certificate endpoints (config + downloads)
const certificateRoutes = require('./routes/certificateRoutes');
app.use(certificateRoutes);

// token-based request endpoints
const tokenRoutes = require('./api/tokenRoutes');
app.use(tokenRoutes);


app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Not found',
    path: req.originalUrl,
  });
});

// app.use((err, req, res, next) => {
//   // eslint-disable-next-line no-console
//   console.error(err);
//   if (err instanceof Error && err.message.startsWith('CORS')) {
//     return res.status(403).json({ ok: false, error: err.message, path: req.originalUrl });
//   }

//   res.status(500).json({
//     ok: false,
//     error: 'Internal server error',
//     path: req.originalUrl,
//     message: process.env.NODE_ENV === 'development' ? err.message : undefined,
//   });
// });

storageService.ensureStorageDir();
let serverInstance = null;
let currentHost = HOST;
let currentPort = PORT;

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function createHttpsServer() {
  if (isVercelRuntime()) {
    // Serverless runtime should not attempt to read SSL files or create its own HTTPS server.
    return http.createServer(app);
  }


  const config = configService.getConfig();
  const sslKeyPath = config.sslKeyPath;
  const sslCertPath = config.sslCertPath;
  const sslCaPath = config.sslCaPath;
  const requestClientCert = config.requestClientCert;

  if (!sslKeyPath || !sslCertPath) {
    throw new Error('SSL key and certificate paths must be configured for HTTPS');
  }

  const httpsOptions = {
    key: fs.readFileSync(path.resolve(sslKeyPath)),
    cert: fs.readFileSync(path.resolve(sslCertPath)),
  };

  if (sslCaPath) {
    httpsOptions.ca = fs.readFileSync(path.resolve(sslCaPath));
    httpsOptions.requestCert = requestClientCert;
    httpsOptions.rejectUnauthorized = requestClientCert;
  }

  return https.createServer(httpsOptions, app);
}

function createServerInstance() {
  const config = configService.getConfig();
  return config.useHttps ? createHttpsServer() : http.createServer(app);
}

async function startServer() {
  const config = configService.getConfig();
  currentHost = config.host || HOST;
  currentPort = config.port || PORT;
  const server = createServerInstance();

  return new Promise((resolve, reject) => {
    const tryListen = (port, attemptsLeft) => {
      server.removeAllListeners('error');
      server.once('error', (err) => {
        if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          const nextPort = port + 1;
          // eslint-disable-next-line no-console
          console.warn(`Port ${port} is busy, retrying on ${nextPort}`);
          return tryListen(nextPort, attemptsLeft - 1);
        }

        reject(err);
      });

      server.listen(port, currentHost, () => {
        currentPort = port;
        serverInstance = server;
        const protocol = config.useHttps ? 'https' : 'http';
        // eslint-disable-next-line no-console
        console.log(`Storage app listening on ${protocol}://${currentHost}:${currentPort}`);
        if (config.useHttps) {
          // eslint-disable-next-line no-console
          console.log('SSL enabled. Certificates loaded from:', config.sslCertPath, config.sslKeyPath);
          if (config.sslCaPath) {
            // eslint-disable-next-line no-console
            console.log('CA certificate path:', config.sslCaPath);
          }
        }
        // eslint-disable-next-line no-console
        console.log(`Storage directory: ${storageService.UPLOAD_DIR}`);
        resolve(server);
      });
    };

    tryListen(currentPort, 5);
  });
}

async function restartServer() {
  if (serverInstance) {
    await new Promise((resolve, reject) => {
      serverInstance.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    serverInstance = null;
  }
  return startServer();
}

configRoutes.setRestartHandler(restartServer);

if (require.main === module) {
  startServer().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Unable to start server:', err);
    process.exit(1);
  });
}

module.exports = app;
