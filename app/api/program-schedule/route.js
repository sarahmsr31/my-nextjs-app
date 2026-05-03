import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  getManualMissionCatchUpRange,
  getProgramMissionContext,
  skipMaxMissionDayCap,
  getMaxMissionDayCap,
} from "../../../utils/programCalendar";

/** Server-side program schedule (reads full env). Used when client bundle lacks NEXT_PUBLIC_* at build time. */
export async function GET() {
  headers();
  const now = new Date();
  return NextResponse.json(
    {
      catchUpRange: getManualMissionCatchUpRange(now),
      programCtx: getProgramMissionContext(now),
      missionCap: skipMaxMissionDayCap(now) ? null : getMaxMissionDayCap(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
