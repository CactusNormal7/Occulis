import { useEffect, useState } from "react";
import { parseRoute, type Route } from "./model.js";

/** La route lue dans le fragment de l'URL, tenue à jour à chaque navigation. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const update = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}
