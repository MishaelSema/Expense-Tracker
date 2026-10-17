// Never statically evaluate the auth handler at build time.
export const dynamic = "force-dynamic";

export { GET, POST } from "@/lib/auth";
