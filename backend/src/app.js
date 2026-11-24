import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import workerRoutes from './routes/workerRoutes.js';
import trainingRoutes from './routes/trainingRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { PRIVATE_NETWORK_ONLY } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const isPrivateAddress = (address) => {
  if (!address) return false;
  const ip = address.replace(/^.*:/, '');
  return (
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
};

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(morgan('dev'));

if (process.env.NODE_ENV === 'production' && PRIVATE_NETWORK_ONLY) {
  app.use((req, res, next) => {
    if (!isPrivateAddress(req.ip)) {
      return res.status(403).json({
        message: 'Este servicio administra datos personales y solo acepta conexiones de red interna.',
      });
    }
    next();
  });
}

app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/workers', workerRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'mongodb' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta inexistente' });
});

app.use((err, req, res, next) => {
  console.error('Error global:', err.message);
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'El certificado supera el tamaño permitido.' });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
  });
});

export default app;


