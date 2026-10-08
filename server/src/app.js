import express from 'express';
import cors from 'cors';
import { createPlanRouter } from './routes/plan.js';
import { HttpError } from './services/planService.js';
import { PlanFailedError } from './services/planWorkflow.js';

export function createApp({ service, clientOrigin = 'http://localhost:3000' }) {
  const app = express();
  app.use(cors({ origin: clientOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', createPlanRouter(service));

  // Express 5 forwards errors from async handlers here.
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.code, message: err.message });
    }
    if (err instanceof PlanFailedError) {
      console.error('Plan failed:', err.message, err.brokenRules);
      return res.status(502).json({
        error: 'plan_failed',
        message: "We couldn't generate your plan. Please try again.",
      });
    }
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Something went wrong on the server.' });
  });

  return app;
}
