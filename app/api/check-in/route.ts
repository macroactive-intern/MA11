import { addCheckIn, isCheckedInToday } from "../_data/dashboardStore";
import type { CheckInRequest } from "../_data/dashboardStore";

export async function POST(request: Request) {
  let body: CheckInRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.notes !== undefined && typeof body.notes !== "string") {
    return Response.json({ error: "notes must be a string" }, { status: 400 });
  }

  const trimmed = body.notes?.trim() ?? "";

  if (trimmed.length > 500) {
    return Response.json(
      { error: "notes must be 500 characters or fewer" },
      { status: 400 }
    );
  }

  if (isCheckedInToday()) {
    return Response.json(
      { error: "Already checked in today" },
      { status: 409 }
    );
  }

  const notes = trimmed.length > 0 ? trimmed : null;
  const updated = addCheckIn(notes);

  return Response.json(updated);
}
