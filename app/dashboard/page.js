import { headers } from "next/headers";
import DashboardClient from "./DashboardClient";
import {
  getManualMissionCatchUpRange,
  getProgramMissionContext,
  skipMaxMissionDayCap,
  getMaxMissionDayCap,
} from "../../utils/programCalendar";

/** Per-request schedule; `headers()` opts out of static caching (works on all Next 13+ App Router versions). */
export default function DashboardPage() {
  headers();
  const now = new Date();
  return (
    <DashboardClient
      initialCatchUpRange={getManualMissionCatchUpRange(now)}
      initialProgramCtx={getProgramMissionContext(now)}
      initialMissionCap={skipMaxMissionDayCap(now) ? null : getMaxMissionDayCap()}
    />
  );
}
