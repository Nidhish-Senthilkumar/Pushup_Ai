import { useEffect, useState } from "react";

/**
 * Hash routing: #/practice?mode=manikin. Works on any static host, including
 * GitHub Pages under a sub-path and a file opened from a USB stick.
 */
export interface Route {
  path: string;
  query: URLSearchParams;
  /** Increments on every navigation, so a page can be remounted fresh on each visit. */
  visit: number;
}

let visits = 0;

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, "") || "/";
  const [path = "/", qs = ""] = raw.split("?");
  return { path: path.startsWith("/") ? path : `/${path}`, query: new URLSearchParams(qs), visit: ++visits };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function navigate(to: string) {
  window.location.hash = to.startsWith("#") ? to : `#${to}`;
}

export const href = (to: string) => `#${to}`;
