import type { DermaTrackData, Lang } from "../data";
import type { Route } from "../shell";
import type { ApiStatus } from "../api";

export interface ScreenProps {
  data: DermaTrackData;
  lang: Lang;
  onRoute: (r: Route) => void;
  apiStatus?: ApiStatus;
}
