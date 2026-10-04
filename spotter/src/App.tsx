import { useEffect } from "react";
import { useRoute } from "./lib/router";
import { useData } from "./lib/store";
import { Layout } from "./ui/Layout";
import { Home } from "./pages/Home";
import { Library } from "./pages/Library";
import { ExerciseDetail } from "./pages/ExerciseDetail";
import { Runner } from "./pages/Runner";
import { Summary } from "./pages/Summary";
import { Plans } from "./pages/Plans";
import { Assess } from "./pages/Assess";
import { Progress } from "./pages/Progress";
import { Arcade } from "./pages/Arcade";
import { About } from "./pages/About";
import { Lab } from "./pages/Lab";
import { Settings } from "./pages/Settings";
import { More } from "./pages/More";
import { Onboarding } from "./pages/Onboarding";
import { Analyze } from "./pages/Analyze";
import { Pitch } from "./pages/Pitch";

export function App() {
  const route = useRoute();
  const { profile } = useData();
  const path = route.path;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  // Full-screen experiences render without the app chrome.
  if (path === "/go") return <Runner key={route.visit} query={route.query} />;
  if (path === "/arcade") return <Arcade key={route.visit} />;
  if (path === "/pitch") return <Pitch />;

  const [, first, second] = path.split("/");
  let page: React.ReactNode;
  switch (first) {
    case "":
      page = profile.onboarded || route.query.has("skip") ? <Home /> : <Onboarding />;
      break;
    case "train":
      page = <Library />;
      break;
    case "exercise":
      page = <ExerciseDetail id={second ?? ""} />;
      break;
    case "summary":
      page = <Summary id={second ?? ""} />;
      break;
    case "plans":
      page = <Plans />;
      break;
    case "assess":
      page = <Assess key={route.visit} />;
      break;
    case "progress":
      page = <Progress />;
      break;
    case "about":
      page = <About />;
      break;
    case "lab":
      page = <Lab />;
      break;
    case "analyze":
      page = <Analyze />;
      break;
    case "settings":
      page = <Settings />;
      break;
    case "more":
      page = <More />;
      break;
    default:
      page = (
        <div className="py-20 text-center">
          <h1 className="display mb-4 text-5xl">Lost?</h1>
          <a className="btn btn-volt" href="#/">
            Back to today
          </a>
        </div>
      );
  }
  return <Layout path={path}>{page}</Layout>;
}
