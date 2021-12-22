import { ActionConfig, LovelaceCard } from "custom-card-helpers";
import { HapticType } from "custom-card-helpers/src/haptic";
import { BaseActionConfig } from "custom-card-helpers/src/types";
import { HassServiceTarget } from "home-assistant-js-websocket";

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": LovelaceCard;
  }
}

export interface TemplateConfig {
  entity?: string;
  attribute?: string;
  prefix?: string;
  postfix?: string;
  case?: "upper" | "lower" | "first";
}

export type Template = string | TemplateConfig;

export type StyleConfig = Record<
  "button" | "icon" | "name" | "state" | "ripple",
  Record<string, string | Template>
>;

export interface ButtonConfig {
  entity?: string;
  name?: string | Template;
  state?: string | Template;
  icon?: string | Template;
  image?: string | Template;
  layout?: Array<string | Array<string>>;
  align_icon?: "top" | "left" | "right" | "bottom"; // deprecated
  tooltip?: string | false;
  tap_action?: ButtonActionConfig;
  hold_action?: ButtonActionConfig;
  double_tap_action?: ButtonActionConfig;
  style?: StyleConfig;
  state_styles?: Record<string, StyleConfig>;
  state_icons?: Record<string, string>;
  state_text?: Record<string, string>;
}

export interface PaperButtonRowConfig {
  type?: string;
  buttons: ButtonConfig[][];
  align_icons?: "top" | "left" | "right" | "bottom";
  base_config?: ButtonConfig;
  position?: "center" | "right";
  hide_badge?: boolean;
  hide_state?: boolean;
}

export type ExternalButtonConfig =
  | string
  | (ButtonConfig & {
      layout?: string | Array<string | Array<string>>;
    });

export interface ExternalPaperButtonRowConfig
  extends Omit<PaperButtonRowConfig, "buttons"> {
  buttons: Array<ExternalButtonConfig | Array<ExternalButtonConfig>>;
}

export interface FireEventActionConfig extends BaseActionConfig {
  action: "fire-event";
  event_type: string;
  event_data?: Record<string, unknown>;
  repeat?: number;
  haptic?: HapticType;
}

// TODO: Current types for custom-card-helpers are missing this, remove when not needed
declare module "custom-card-helpers" {
  interface CallServiceActionConfig {
    target?: HassServiceTarget;
  }
}

export type ButtonActionConfig = ActionConfig | FireEventActionConfig;
