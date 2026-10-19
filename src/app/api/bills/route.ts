import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import { appUrl } from "@/lib/site";
import { serializeList } from "@/lib/serialize";
import { parseLeadDays, parseLogoUrl, parseLogoData } from "@/lib/bill-logo";

export const dynamic = "force-dynamic";

const FREQUENCIES = ["weekly", "monthly", "yearly", "once"];

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const items = await Bill.find({ userId: auth.userId })
      .select("-logoData")
      .sort({ active: -1, nextDueDate: 1 })
      .lean();
    return NextResponse.json({ bills: serializeList(items) });
  } catch (error) {
    console.error("GET /api/bills", error);
    return serverError();
  }
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    const name = String(body.name || "").trim();
    const amount = Number(body.amount);
    const category = String(body.category || "").trim();
    const frequency = FREQUENCIES.includes(String(body.frequency))
      ? String(body.frequency)
      : "monthly";
    const nextDueDate = new Date(body.nextDueDate);
    const note = body.note ? String(body.note).trim() : undefined;
    const active = body.active === undefined ? true : Boolean(body.active);
    const leadDays = parseLeadDays(body.leadDays);
    const logoUrl = parseLogoUrl(body.logoUrl);
    const logoData = parseLogoData(body.logoData);

    if (!name) return badRequest("Give the bill a name.");
    if (!amount || amount <= 0) return badRequest("Enter an amount greater than zero.");
    if (!category) return badRequest("Choose a category.");
    if (isNaN(nextDueDate.getTime())) return badRequest("Choose a valid next due date.");
    if (logoUrl === false) return badRequest("Use an image URL starting with http:// or https://.");
    if (logoData === false) return badRequest("That image couldn't be read. Try another one.");

    const created = await Bill.create({
      userId: auth.userId,
      name,
      amount,
      category,
      frequency,
      nextDueDate,
      note,
      active,
      leadDays,
      logoUrl: logoUrl || undefined,
    });

    // An upload needs the document's id before it has a servable URL.
    if (logoData) {
      created.logoData = logoData;
      created.logoUrl = appUrl(`/api/bills/logo/${created._id}`);
      await created.save();
    }

    const plain = created.toObject() as Record<string, unknown>;
    delete plain.logoData;
    return NextResponse.json({ bill: plain }, { status: 201 });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("POST /api/bills", error);
    return serverError();
  }
}
