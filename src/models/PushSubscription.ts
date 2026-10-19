import mongoose, { Document, Schema } from "mongoose";

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  /** When the server last attempted delivery to this endpoint. */
  lastPushAt?: Date;
  /** HTTP status the push service answered with (201 = delivered). */
  lastPushStatus?: number;
  /** Failure text when delivery didn't go through. */
  lastPushError?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A browser push endpoint belonging to a user. */
const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: String,
    // Delivery bookkeeping: the only way to tell what happened to a
    // notification headed for a device nobody can inspect.
    lastPushAt: Date,
    lastPushStatus: Number,
    lastPushError: String,
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1 });

export default mongoose.models.PushSubscription ||
  mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
