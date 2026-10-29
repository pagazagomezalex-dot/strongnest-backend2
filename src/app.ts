import express, { Application, Request, Response } from 'express';
import cors from 'cors';

// Importación de rutas activas
import authRoutes from './routes/authRoutes';
import petRoutes from './routes/petRoutes';
import medicalRoutes from './routes/medicalRoutes';
import telemetryRoutes from './routes/telemetryRoutes';
import geofenceRoutes from './routes/geofenceRoutes';

const app: Application = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint de verificación de salud del servidor
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    message: 'Servidor StrongNest Backend activo y operando 🚀',
    timestamp: new Date().toISOString()
  });
});

// Registro de rutas principales de la API
app.use('/api', authRoutes);
app.use('/api', petRoutes);
app.use('/api', medicalRoutes);
app.use('/api', telemetryRoutes);
app.use('/api', geofenceRoutes);

// Manejo defensivo de rutas no encontradas (404)
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada en el servidor de StrongNest' });
});

export default app;
