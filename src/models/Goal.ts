import mongoose, { Document, Schema } from "mongoose";

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0 },
    savedAmount: { type: Number, default: 0, min: 0 },
    targetDate: Date,
    note: String,
  },
  { timestamps: true }
);

GoalSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Goal || mongoose.model<IGoal>("Goal", GoalSchema);
