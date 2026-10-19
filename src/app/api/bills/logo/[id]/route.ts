import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import { decodeLogoData } from "@/lib/bill-logo";

/**
 * Serves a bill's uploaded platform logo. Unauthenticated on purpose: email
 * clients and notification services fetch it without a session. ObjectIds are
 * unguessable and only the image bytes ever leave this endpoint.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return new Response("Not found", { status: 404 });
    }

    await connectDB();
    const bill = (await Bill.findById(id).select("logoData").lean()) as {
      logoData?: string;
    } | null;
    const decoded = bill?.logoData ? decodeLogoData(bill.logoData) : null;
    if (!decoded) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(new Uint8Array(decoded.bytes), {
      headers: {
        "Content-Type": decoded.type,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("GET /api/bills/logo/[id]", error);
    return new Response("Server error", { status: 500 });
  }
}
