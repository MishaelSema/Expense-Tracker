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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A recurring commitment (rent, electricity, a subscription). Ledger does not
 * pay anything — bills are a schedule the reminder engine reads from.
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
  },
  { timestamps: true }
);

BillSchema.index({ userId: 1, nextDueDate: 1 });

export default mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);
