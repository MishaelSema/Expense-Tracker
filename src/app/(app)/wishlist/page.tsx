import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import WishlistItem from "@/models/WishlistItem";
import { serializeList } from "@/lib/serialize";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import type { WishlistItemDTO } from "@/components/wishlist/wishlist-form";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  await connectDB();

  const items = await WishlistItem.find({ userId: user._id })
    .sort({ purchased: 1, createdAt: -1 })
    .lean();

  return <WishlistView items={serializeList<WishlistItemDTO>(items)} />;
}
