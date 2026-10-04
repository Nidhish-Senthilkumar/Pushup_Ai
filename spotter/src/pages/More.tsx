import { useInstall } from "../lib/install";
import { href } from "../lib/router";
import { Icon, type IconName } from "../ui/icons";
import { PageTitle } from "../ui/Layout";

const ITEMS: { to: string; title: string; detail: string; icon: IconName }[] = [
  { to: "/arcade", title: "Arcade mode", detail: "Booth challenges and a live leaderboard", icon: "joystick" },
  { to: "/assess", title: "Fitness test", detail: "About 5 minutes, then a 4-week plan", icon: "target" },
  { to: "/analyze", title: "Analyze a video", detail: "Upload a recorded set for a full breakdown", icon: "eye" },
  { to: "/pitch", title: "Presentation", detail: "Slides for the convention, with a live demo", icon: "star" },
  { to: "/about", title: "How it works", detail: "The AI, privacy and accuracy", icon: "brain" },
  { to: "/lab", title: "Data Lab", detail: "Record labelled reps to retrain the model", icon: "flask" },
  { to: "/settings", title: "Settings", detail: "Voice, camera, profile, your data", icon: "settings" },
];

export function More() {
  const install = useInstall();
  return (
    <div>
      <PageTitle title="More" />
      {!install.installed && (install.canInstall || install.ios) && (
        <div className="card mb-4 flex items-center gap-4 border-volt/40 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-volt text-black">
            <Icon.download />
          </span>
          <span className="flex-1">
            <span className="block font-bold">Install Cadence</span>
            <span className="text-sm text-muted">{install.canInstall ? "Add it to your home screen. It opens full screen and works offline." : "On iPhone: tap Share, then Add to Home Screen."}</span>
          </span>
          {install.canInstall && (
            <button className="btn btn-volt" onClick={() => void install.install()}>
              Install
            </button>
          )}
        </div>
      )}
      <ul className="space-y-3">
        {ITEMS.map((i) => {
          const I = Icon[i.icon];
          return (
            <li key={i.to}>
              <a href={href(i.to)} className="card flex items-center gap-4 p-4 hover:border-volt/50">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-raised text-volt">
                  <I />
                </span>
                <span className="flex-1">
                  <span className="block font-bold">{i.title}</span>
                  <span className="text-sm text-muted">{i.detail}</span>
                </span>
                <Icon.next className="text-muted" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
