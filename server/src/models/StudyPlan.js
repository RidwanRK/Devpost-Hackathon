// The one saved study plan (a single document with a fixed key: there are no accounts).
import mongoose from 'mongoose';

const { Schema } = mongoose;

const topicSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    estimatedMinutes: { type: Number, required: true },
    difficulty: { type: Number, required: true, min: 1, max: 5 },
    confidence: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const subjectSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    examDate: { type: String, required: true },
    topics: [topicSchema],
  },
  { _id: false }
);

const sessionSchema = new Schema(
  {
    id: { type: String, required: true },
    topicId: { type: String, required: true },
    date: { type: String, required: true },
    plannedMinutes: { type: Number, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    status: { type: String, enum: ['planned', 'completed', 'skipped', 'partial'], default: 'planned' },
    actualMinutes: { type: Number, default: null },
    confidenceAfter: { type: Number, default: null },
  },
  { _id: false }
);

const notScheduledSchema = new Schema(
  { topicId: String, minutes: Number, reason: String },
  { _id: false }
);

const day = { type: Number, required: true, min: 0, max: 1440 };

const studyPlanSchema = new Schema(
  {
    key: { type: String, default: 'demo', unique: true },
    demoDayOffset: { type: Number, default: 0 },
    availability: { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day },
    subjects: [subjectSchema],
    sessions: [sessionSchema],
    notScheduled: [notScheduledSchema],
    explanation: { type: String, default: '' },
    editedSinceLastPlan: { type: Boolean, default: false },
    pendingReplan: { type: Schema.Types.Mixed, default: null },
  },
  { minimize: false }
);

export const StudyPlan = mongoose.models.StudyPlan ?? mongoose.model('StudyPlan', studyPlanSchema);

// The store used by the services. Tests swap in an in-memory version with the same three methods.
export const mongoStore = {
  async load() {
    return StudyPlan.findOne({ key: 'demo' }).lean();
  },
  async save(plan) {
    const { _id, __v, ...data } = plan;
    return StudyPlan.findOneAndReplace({ key: 'demo' }, { ...data, key: 'demo' }, {
      upsert: true,
      returnDocument: 'after',
      lean: true,
      runValidators: true,
    });
  },
  async clear() {
    await StudyPlan.deleteOne({ key: 'demo' });
  },
};
