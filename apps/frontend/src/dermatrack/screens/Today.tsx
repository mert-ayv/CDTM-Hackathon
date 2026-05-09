import { AgentChat } from "../components/AgentChat";
import { fmtDate, fmtDay, useT } from "../i18n";
import { Icon } from "../icons";
import { Btn, PageHead } from "../shell";
import type { ScreenProps } from "./types";

export function Today({ data, lang, onRoute }: ScreenProps) {
  const t = useT(lang);
  const today = data.today;

  return (
    <div className="main-inner" style={{ maxWidth: 920 }}>
      <PageHead
        kicker={fmtDate(today.date, lang) + " · " + fmtDay(today.date, lang)}
        title={lang === "de" ? "Hallo Lena." : "Hi Lena."}
        sub={
          lang === "de"
            ? "Frag deinen Derma Agent — er hat deine 30 Tage Logs, Foto-KI und die Pollenvorhersage zusammengezogen, und kann auf jeder Seite mit ⌘K aufgerufen werden."
            : "Ask your Derma Agent — it has joined your 30 days of logs, photo AI and the pollen forecast, and is summonable with ⌘K from any page."
        }
        action={
          <Btn
            kind="ghost"
            size="md"
            icon={<Icon.plus size={14} />}
            onClick={() => onRoute("entry")}
          >
            {t("jetzt_loggen")}
          </Btn>
        }
      />

      <AgentChat />
    </div>
  );
}
