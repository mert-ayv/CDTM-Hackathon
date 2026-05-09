import type { DermaTrackData, Lang } from "../data";
import type { Route } from "../shell";

export interface ScreenProps {
  data: DermaTrackData;
  lang: Lang;
  onRoute: (r: Route) => void;
}
