import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { db } from './config/database';
import authRoutes from './routes/authRoutes';
import petRoutes from './routes/petRoutes';
import telemetryRoutes from './routes/telemetryRoutes';
import geofenceRoutes from './routes/geofenceRoutes';
import alertRoutes from './routes/alertRoutes';

const app: Application = express();

app.use(cors());
app.use(express.json());

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/alerts', alertRoutes);

// Health Check general
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    service: 'StrongNest Pets API',
    timestamp: new Date().toISOString()
  });
});

// Health Check de Base de Datos
app.get('/health/db', async (req: Request, res: Response) => {
  try {
    const result = await db.query('SELECT NOW() AS server_time;');
    res.status(200).json({
      status: 'database_connected',
      serverTime: result.rows.server_time
    });
  } catch (error: any) {
    console.error('❌ Error de conexión DB:', error.message);
    res.status(500).json({
      status: 'database_error',
      message: error.message || 'Error al conectar con la base de datos'
    });
  }
});

export { app };