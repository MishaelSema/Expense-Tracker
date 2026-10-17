import mongoose, { Document, Schema } from 'mongoose';

export interface IWishlistItem extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  price: number;
  priority: 'low' | 'medium' | 'high';
  link?: string;
  notes?: string;
  purchased: boolean;
  targetDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WishlistItemSchema = new Schema<IWishlistItem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    link: String,
    notes: String,
    purchased: {
      type: Boolean,
      default: false,
    },
    targetDate: Date,
  },
  {
    timestamps: true,
  }
);

WishlistItemSchema.index({ userId: 1, purchased: 1 });

export default mongoose.models.WishlistItem || mongoose.model<IWishlistItem>('WishlistItem', WishlistItemSchema);
