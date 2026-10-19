import mongoose, { Document, Schema } from "mongoose";

export interface IBill extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  category: string;
  frequency: "weekly" | "monthly" | "yearly" | "once";
  nextDueDate: Date;
  active: boolean;
  note?: string;
  /** How many days before the due date the reminder window opens (1–30). */
  leadDays: number;
  /** Absolute URL of the platform logo, used in the app, email and push. */
  logoUrl?: string;
  /** Raw data URL for user uploads; served at /api/bills/logo/[id]. Never sent to clients. */
  logoData?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A recurring commitment (rent, electricity, a subscription). Ledger does not
 * pay anything — bills are a schedule the reminder engine reads from. The
 * optional logo rides along into reminder emails and push notifications.
 */
const BillSchema = new Schema<IBill>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "yearly", "once"],
      default: "monthly",
    },
    nextDueDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
    note: String,
    leadDays: { type: Number, default: 3, min: 1, max: 30 },
    logoUrl: { type: String },
    logoData: { type: String },
  },
  { timestamps: true }
);

BillSchema.index({ userId: 1, nextDueDate: 1 });

export default mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);
