import { useEffect, useState, type ComponentType } from "react";
import { getBackendStatus, type ApiStatus } from "./api";
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
import { Connections } from "./screens/Connections";
import type { ScreenProps } from "./screens/types";

const SCREENS: Record<Route, ComponentType<ScreenProps>> = {
  today: Today,
  entry: Entry,
  skin: Skin,
  triggers: Triggers,
  forecast: Forecast,
  treatment: Treatment,
  letter: Letter,
  connections: Connections,
};

export function DermaTrackApp() {
  const [route, setRoute] = useHashRoute("today");
  const [lang, setLang] = useState<Lang>("en");
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    mode: "checking",
    apiBaseUrl: "http://localhost:3000",
  });
  const Screen = SCREENS[route] || Today;

  useEffect(() => {
    let active = true;
    const check = () =>
      getBackendStatus().then((status) => {
        if (active) setApiStatus(status);
      });
    check();
    const timer = window.setInterval(check, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <AgentProvider data={DT_DATA} lang={lang} onRoute={setRoute} apiStatus={apiStatus}>
      <div className="app-shell">
        <Sidebar route={route} onRoute={setRoute} lang={lang} />
        <div className="scroll" style={{ height: "100vh" }}>
          <Topbar route={route} lang={lang} onLang={setLang} onRoute={setRoute} apiStatus={apiStatus} />
          <div className="main">
            <Screen data={DT_DATA} lang={lang} onRoute={setRoute} apiStatus={apiStatus} />
          </div>
        </div>
      </div>
      <AgentTrigger />
      <AgentPalette />
    </AgentProvider>
  );
}
