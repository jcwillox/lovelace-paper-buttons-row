import deepmerge from "deepmerge";
import { getLovelace } from "./get-lovelace";
import { ButtonConfig, PaperButtonRowConfig } from "./types";

declare module "custom-card-helpers" {
  interface LovelaceConfig {
    paper_buttons_row?: {
      presets?: {
        [key: string]: ButtonConfig;
      };
    };
  }
}

let lovelace = getLovelace();

export function handleButtonPreset(
  bConfig: ButtonConfig,
  config?: PaperButtonRowConfig
): ButtonConfig {
  if (!lovelace) lovelace = getLovelace();
  const userPresets = lovelace?.config?.paper_buttons_row?.presets || {};
  const preset = bConfig.preset || config?.preset;
  return preset
    ? deepmerge(
        {
          mushroom: presetMushroom,
        }[preset] ||
          userPresets[preset] ||
          {},
        bConfig
      )
    : bConfig;
}

const presetMushroom: ButtonConfig = {
  ripple: "none",
  styles: {
    button: {
      "min-width": "42px",
      "min-height": "42px",
      "border-radius": "12px",
      "box-sizing": "border-box",
      transition: "background-color 280ms ease-in-out 0s",
      "--pbs-button-rgb-color": "var(--rgb-primary-text-color)",
      "--pbs-button-rgb-default-color": "var(--rgb-primary-text-color)",
      "--pbs-button-rgb-active-color": "var(--pbs-button-rgb-state-color)",
      "--pbs-button-rgb-bg-color": "var(--pbs-button-rgb-color)",
      "--pbs-button-rgb-bg-active-color": "var(--pbs-button-rgb-active-color)",
      "--pbs-button-rgb-bg-opacity": "0.05",
      "--pbs-button-rgb-bg-active-opacity": "0.2",
    },
  },
};
