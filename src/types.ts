import { ActionConfig, LovelaceCard } from "custom-card-helpers";
import { HapticType } from "custom-card-helpers/src/haptic";
import { BaseActionConfig } from "custom-card-helpers/src/types";

declare global {
  interface HTMLElementTagNameMap {
    "hui-error-card": LovelaceCard;
  }

  const __NAME__: string;
  const __BRANCH__: string;
  const __COMMIT__: string;
  const __VERSION__: string;
  const __REPO_URL__: string;
  const __BUILD_TIME__: string;
}

export interface TemplateConfig {
  entity?: string;
  attribute?: string;
  prefix?: string;
  postfix?: string;
  case?: "upper" | "lower" | "first";
}

export type Template = string | TemplateConfig;

export type StyleConfig = Partial<
  Record<
    "button" | "icon" | "name" | "state" | "ripple",
    Record<string, string | Template>
  >
>;

export interface ButtonConfig {
  entity?: string;
  name?: string | false | Template;
  state?: string | Template;
  icon?: string | Template;
  image?: string | Template;
  preset?: string;
  ripple?: "fill" | "none" | "circle";
  layout?: Array<string | Array<string>>;
  align_icon?: "top" | "left" | "right" | "bottom"; // deprecated
  tooltip?: string | false;
  tap_action?: ButtonActionConfig;
  hold_action?: ButtonActionConfig;
  double_tap_action?: ButtonActionConfig;
  styles: StyleConfig;
  state_styles?: Record<string, StyleConfig>;
  state_icons?: Record<string, string>;
  state_text?: Record<string, string>;
}

export interface PaperButtonRowConfig {
  type?: string;
  preset?: string;
  buttons: ButtonConfig[][];
  align_icons?: "top" | "left" | "right" | "bottom";
  base_config?: ButtonConfig;
  styles: Record<string, string | Template>;
  extra_styles?: string;
  position?: "center" | "right";
  hide_badge?: boolean;
  hide_state?: boolean;
}

export interface ExternalButtonConfig
  extends Omit<ButtonConfig, "layout" | "style" | "styles"> {
  layout?: string | Array<string | Array<string>>;
  style?: StyleConfig;
  styles?: StyleConfig;
}

export type ExternalButtonType = string | ExternalButtonConfig;

export interface ExternalPaperButtonRowConfig
  extends Omit<PaperButtonRowConfig, "buttons" | "styles"> {
  buttons: Array<ExternalButtonType | Array<ExternalButtonType>>;
  styles?: Record<string, string | Template>;
}

export interface FireEventActionConfig extends BaseActionConfig {
  action: "fire-event";
  event_type: string;
  event_data?: Record<string, unknown>;
  repeat?: number;
  haptic?: HapticType;
}

export type ButtonActionConfig = ActionConfig | FireEventActionConfig;
