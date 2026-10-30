import express from 'express';
import cors from 'cors';
import telemetryRoutes from './routes/telemetryRoutes';
import geofenceRoutes from './routes/geofenceRoutes';
import medicalRoutes from './routes/medicalRoutes';
import aiRoutes from './routes/aiRoutes';
import authRoutes from './routes/authRoutes';

const app = express();

app.use(cors());
app.use(express.json());

// Registro de Rutas de la API KIN-O by StrongNest
app.use('/api', telemetryRoutes);
app.use('/api', geofenceRoutes);
app.use('/api', medicalRoutes);
app.use('/api', aiRoutes);
app.use('/api', authRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Servidor KIN-O by StrongNest IoT 100% Activo 🚀' });
});

export default app;
