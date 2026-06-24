import { getDashboardResponse } from "../_data/dashboardStore";

export async function GET() {
  return Response.json(getDashboardResponse());
}
