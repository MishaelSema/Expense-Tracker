import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError, zodMessage } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import Bill from "@/models/Bill";
import { appUrl } from "@/lib/site";
import { parseLeadDays, parseLogoUrl, parseLogoData } from "@/lib/bill-logo";

const FREQUENCIES = ["weekly", "monthly", "yearly", "once"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const existing = await Bill.findOne({ _id: id, userId: auth.userId });
    if (!existing) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return badRequest("Give the bill a name.");
      update.name = name;
    }
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!amount || amount <= 0)
        return badRequest("Enter an amount greater than zero.");
      update.amount = amount;
    }
    if (body.category !== undefined) {
      const category = String(body.category).trim();
      if (!category) return badRequest("Choose a category.");
      update.category = category;
    }
    if (body.frequency !== undefined) {
      if (!FREQUENCIES.includes(String(body.frequency)))
        return badRequest("Choose a valid frequency.");
      update.frequency = String(body.frequency);
    }
    if (body.nextDueDate !== undefined) {
      const date = new Date(body.nextDueDate);
      if (isNaN(date.getTime())) return badRequest("Choose a valid next due date.");
      update.nextDueDate = date;
    }
    if (body.note !== undefined) {
      update.note = body.note ? String(body.note).trim() : undefined;
    }
    if (body.active !== undefined) {
      update.active = Boolean(body.active);
    }
    if (body.leadDays !== undefined) {
      update.leadDays = parseLeadDays(body.leadDays);
    }

    // Logo: a fresh upload wins; otherwise a provided URL replaces (or with an
    // empty string clears) whatever was there. Dropping a stored upload means
    // nulling logoData alongside logoUrl so the two never disagree.
    const newLogoData = parseLogoData(body.logoData);
    if (newLogoData === false) {
      return badRequest("That image couldn't be read. Try another one.");
    }
    if (newLogoData) {
      update.logoData = newLogoData;
      update.logoUrl = appUrl(`/api/bills/logo/${id}`);
    } else if (body.logoUrl !== undefined) {
      const logoUrl = parseLogoUrl(body.logoUrl);
      if (logoUrl === false) {
        return badRequest("Use an image URL starting with http:// or https://.");
      }
      if (logoUrl === null) {
        update.logoUrl = null;
        update.logoData = null;
      } else if (logoUrl !== existing.logoUrl) {
        update.logoUrl = logoUrl;
        if (existing.logoData) update.logoData = null;
      }
    }

    const updated = await Bill.findOneAndUpdate(
      { _id: id, userId: auth.userId },
      update,
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const plain = updated.toObject() as Record<string, unknown>;
    delete plain.logoData;
    return NextResponse.json({ bill: plain });
  } catch (error) {
    const zod = zodMessage(error);
    if (zod) return badRequest(zod);
    console.error("PATCH /api/bills/[id]", error);
    return serverError();
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    await connectDB();
    const { id } = await params;

    const deleted = await Bill.findOneAndDelete({ _id: id, userId: auth.userId });
    if (!deleted) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/bills/[id]", error);
    return serverError();
  }
}
