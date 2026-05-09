import { useState, type ComponentType } from "react";
import { AgentPalette } from "./components/AgentPalette";
import { AgentProvider } from "./components/AgentContext";
import { AgentTrigger } from "./components/AgentTrigger";
import { DT_DATA, type Lang } from "./data";
import { Sidebar, Topbar, useHashRoute, type Route } from "./shell";
import { Today } from "./screens/Today";
import { Entry } from "./screens/Entry";
import { Skin } from "./screens/Skin";
import { Triggers } from "./screens/Triggers";
import { Forecast } from "./screens/Forecast";
import { Treatment } from "./screens/Treatment";
import { Letter } from "./screens/Letter";
import type { ScreenProps } from "./screens/types";

const SCREENS: Record<Route, ComponentType<ScreenProps>> = {
  today: Today,
  entry: Entry,
  skin: Skin,
  triggers: Triggers,
  forecast: Forecast,
  treatment: Treatment,
  letter: Letter,
};

export function DermaTrackApp() {
  const [route, setRoute] = useHashRoute("today");
  const [lang, setLang] = useState<Lang>("en");
  const Screen = SCREENS[route] || Today;

  return (
    <AgentProvider data={DT_DATA} lang={lang} onRoute={setRoute}>
      <div className="app-shell">
        <Sidebar route={route} onRoute={setRoute} lang={lang} />
        <div className="scroll" style={{ height: "100vh" }}>
          <Topbar route={route} lang={lang} onLang={setLang} />
          <div className="main">
            <Screen data={DT_DATA} lang={lang} onRoute={setRoute} />
          </div>
        </div>
      </div>
      <AgentTrigger />
      <AgentPalette />
    </AgentProvider>
  );
}
