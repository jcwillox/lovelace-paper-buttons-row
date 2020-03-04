import { fireEvent } from "card-tools/src/event";

export function navigate(path, replace = false) {
  if (replace) {
    history.replaceState(null, "", path);
  } else {
    history.pushState(null, "", path);
  }
  fireEvent("location-changed", { replace }, window);
}
