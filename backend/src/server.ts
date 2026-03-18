import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { connectDatabase } from './utils/database';
import routes from './routes';
import { initCronJobs } from './utils/cronJobs';
import { swaggerSpec } from './docs/swagger';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'FRONTEND_URL'];
const missingVars = requiredEnvVars.filter(varName =>!process.env[varName]);
if (missingVars.length >0) {
  console.error(`CRITICAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Server cannot start without these variables. Check your .env file.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [process.env.FRONTEND_URL!];
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) =>void) =>{

    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`WARNING - CORS REJECTED: ${origin} not in allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use((req: Request, _res: Response, next: NextFunction) =>{
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'FinFlow API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

app.use('/api', routes);
app.get('/', (_req: Request, res: Response) =>{
  res.json({
    success: true,
    message: 'Welcome to FinFlow API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      companies: '/api/companies',
      users: '/api/users',
      clients: '/api/clients',
      invoices: '/api/invoices',
      expenses: '/api/expenses',
      files: '/api/files',
      dashboard: '/api/dashboard',
      notifications: '/api/notifications',
    },
  });
});

app.use((_req: Request, res: Response) =>{
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) =>{
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const startServer = async () =>{
  try {
    await connectDatabase();

    initCronJobs();

    app.listen(PORT, () =>{
      console.log('='.repeat(60));
      console.log(`Server running on port ${PORT}`);
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) =>{
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: any) =>{
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();
