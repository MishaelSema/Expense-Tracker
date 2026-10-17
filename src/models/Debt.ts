import mongoose, { Document, Schema } from 'mongoose';

export interface IDebt extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'owed_to_me' | 'i_owe';
  person: string;
  amount: number;
  description: string;
  notes?: string;
  dueDate?: Date;
  status: 'active' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

const DebtSchema = new Schema<IDebt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['owed_to_me', 'i_owe'],
      required: true,
    },
    person: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    notes: String,
    dueDate: Date,
    status: {
      type: String,
      enum: ['active', 'paid'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

DebtSchema.index({ userId: 1, status: 1 });

export default mongoose.models.Debt || mongoose.model<IDebt>('Debt', DebtSchema);
