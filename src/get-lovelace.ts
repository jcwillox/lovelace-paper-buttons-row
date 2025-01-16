import type { LovelaceConfig } from "custom-card-helpers";

type HuiRootElement = HTMLElement & {
  lovelace: {
    config: LovelaceConfig;
    current_view: number;
    [key: string]: unknown;
  };
  ___curView: number;
};

declare global {
  interface HTMLElementTagNameMap {
    "hui-root": HuiRootElement;
  }
}

export const getLovelace = (): HuiRootElement["lovelace"] | null => {
  const root = document
    .querySelector("home-assistant")
    ?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot;

  const resolver =
    root?.querySelector("ha-drawer partial-panel-resolver") ||
    root?.querySelector("app-drawer-layout partial-panel-resolver");

  const huiRoot = (resolver?.shadowRoot || resolver)
    ?.querySelector("ha-panel-lovelace")
    ?.shadowRoot?.querySelector("hui-root");

  if (huiRoot) {
    const ll = huiRoot.lovelace;
    ll.current_view = huiRoot.___curView;
    return ll;
  }
  return null;
};
