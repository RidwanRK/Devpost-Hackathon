// Thin Express handlers: read the request, call the service, return JSON. No business rules here.
import { Router } from 'express';

export function createPlanRouter(service, replanService) {
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

  router.patch('/sessions/:id', async (req, res) => {
    res.json({ plan: await service.updateSession(req.params.id, req.body) });
  });

  router.post('/demo/advance-day', async (_req, res) => {
    res.json({ plan: await service.advanceDay() });
  });

  router.post('/replan', async (req, res) => {
    res.json({ plan: await replanService.replan({ treatUnconfirmedAsMissed: req.body?.treatUnconfirmedAsMissed === true }) });
  });

  router.post('/replan/accept', async (_req, res) => {
    res.json({ plan: await replanService.accept() });
  });

  router.post('/replan/discard', async (_req, res) => {
    res.json({ plan: await replanService.discard() });
  });

  router.delete('/plan', async (_req, res) => {
    await service.clear();
    res.json({ ok: true });
  });

  return router;
}
