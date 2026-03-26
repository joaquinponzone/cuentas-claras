import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { authRoutes } from './routes/auth';
import { categoriesRoutes } from './routes/categories';
import { expensesRoutes } from './routes/expenses';
import { incomesRoutes } from './routes/incomes';
import { recurringRoutes } from './routes/recurring';
import { dashboardRoutes } from './routes/dashboard';
import { importRoutes } from './routes/import';
import { groupsRoutes } from './routes/groups';

const app = new Hono();

app.use('*', logger());
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use('*', cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

app.get('/health', (c) => c.text('OK'));

app.route('/auth', authRoutes);
app.route('/categories', categoriesRoutes);
app.route('/expenses', expensesRoutes);
app.route('/incomes', incomesRoutes);
app.route('/recurring-expenses', recurringRoutes);
app.route('/dashboard', dashboardRoutes);
app.route('/import', importRoutes);
app.route('/groups', groupsRoutes);

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
