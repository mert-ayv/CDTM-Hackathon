import { useEffect, useState } from "react";
import { AgentBootIntro } from "../components/AgentBootIntro";
import { AgentChat } from "../components/AgentChat";
import type { ScreenProps } from "./types";

export function Today({ lang }: ScreenProps) {
  const [introComplete, setIntroComplete] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    if (!introComplete) return;
    const frame = window.requestAnimationFrame(() => setContentVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [introComplete]);

  const finishIntro = () => setIntroComplete(true);

  if (!introComplete) {
    return <AgentBootIntro lang={lang} onComplete={finishIntro} onSkip={finishIntro} />;
  }

  return (
    <div className="main-inner" style={{ maxWidth: 920 }}>
      <div
        style={{
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 220ms ease, transform 220ms ease",
          pointerEvents: contentVisible ? "auto" : "none",
        }}
        aria-hidden={!contentVisible}
      >
        <div className="dt-boot-module dt-boot-module-1">
          <AgentChat showScope={false} />
        </div>
      </div>
    </div>
  );
}
