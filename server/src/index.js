import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { mongoStore } from './models/StudyPlan.js';
import { createPlanService } from './services/planService.js';
import { proposePlan } from './services/aiPlanner.js';

const { MONGODB_URI, PORT = 4000, CLIENT_ORIGIN = 'http://localhost:3000' } = process.env;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
} catch (err) {
  console.error(`Could not connect to MongoDB Atlas: ${err.message}`);
  process.exit(1);
}

const service = createPlanService({ store: mongoStore, propose: proposePlan });
createApp({ service, clientOrigin: CLIENT_ORIGIN }).listen(PORT, () => {
  console.log(`StudyFlow API listening on http://localhost:${PORT}`);
});
