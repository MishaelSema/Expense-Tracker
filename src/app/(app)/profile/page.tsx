import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ProfileView
      user={{
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified ? String(user.emailVerified) : null,
        currency: user.currency || "XAF",
        notifications: user.preferences?.notifications ?? true,
      }}
    />
  );
}
