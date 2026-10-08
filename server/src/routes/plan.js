// Thin Express handlers: read the request, call the service, return JSON. No business rules here.
import { Router } from 'express';

export function createPlanRouter(service) {
  const router = Router();

  router.get('/plan', async (_req, res) => {
    res.json(await service.getPlan());
  });

  router.put('/setup', async (req, res) => {
    res.json({ plan: await service.saveSetup(req.body) });
  });

  router.post('/plan/generate', async (_req, res) => {
    res.json({ plan: await service.generate() });
  });

  router.delete('/plan', async (_req, res) => {
    await service.clear();
    res.json({ ok: true });
  });

  return router;
}
