import mongoose, { Document, Schema } from "mongoose";

export type ReminderType =
  | "debt_due"
  | "bill_due"
  | "budget_ending"
  | "budget_overspent"
  | "goal_deadline";

export interface IReminder extends Document {
  userId: mongoose.Types.ObjectId;
  /** Stable identity for one occurrence, so re-running never duplicates. */
  key: string;
  type: ReminderType;
  title: string;
  body: string;
  dueDate?: Date;
  severity: "info" | "warning" | "critical";
  /** Platform logo of the source bill/subscription, for emails and pushes. */
  logoUrl?: string | null;
  readAt?: Date | null;
  dismissedAt?: Date | null;
  emailedAt?: Date | null;
  pushedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ["debt_due", "bill_due", "budget_ending", "budget_overspent", "goal_deadline"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    dueDate: Date,
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    logoUrl: { type: String, default: null },
    readAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },
    emailedAt: { type: Date, default: null },
    pushedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One row per occurrence per user.
ReminderSchema.index({ userId: 1, key: 1 }, { unique: true });
ReminderSchema.index({ userId: 1, dismissedAt: 1, dueDate: 1 });

export default mongoose.models.Reminder ||
  mongoose.model<IReminder>("Reminder", ReminderSchema);
