import { computeEntity, type HomeAssistant } from "custom-card-helpers";
import type { ButtonConfig } from "./types";

/**
 * `hass.formatEntityName` only resolves an entity's name from its registry
 * context from HA 2026.4. Earlier versions expose the same helper with an
 * incompatible signature, so a version check is needed - and a hass can report a
 * recent version without carrying the helper at all (a test harness, or one that
 * has not finished initialising), so both conditions are checked.
 */
const supportsEntityNames = (hass?: HomeAssistant) => {
  if (
    typeof (hass as { formatEntityName?: unknown } | undefined)
      ?.formatEntityName !== "function"
  ) {
    return false;
  }
  const [major, minor] = (hass?.config?.version ?? "").split(".", 2);
  return Number(major) > 2026 || (Number(major) === 2026 && Number(minor) >= 4);
};

export const computeStateName = (hass, stateObj) => {
  // Resolve from the entity's registry context so names match the built-in rows.
  if (stateObj && supportsEntityNames(hass)) {
    const name = hass.formatEntityName(stateObj);
    if (name) return name;
  }
  if (stateObj?.attributes?.friendly_name) {
    return stateObj.attributes.friendly_name;
  }
  return stateObj?.entity_id
    ? computeEntity(stateObj.entity_id).replace(/_/g, " ")
    : "Unknown";
};

/**
 * `formatEntityName` resolves against the entity/device/area/floor registries,
 * and HA swaps the real formatter in asynchronously once translations load.
 * Neither shows up as an entity state change, so without this a rename (or that
 * swap) leaves rendered names stale until an unrelated update forces a render.
 */
const NAME_SOURCES = [
  "formatEntityName",
  "entities",
  "devices",
  "areas",
  "floors",
] as const;

export const entityNamesChanged = (
  oldHass?: HomeAssistant,
  newHass?: HomeAssistant,
) => {
  if (!oldHass || !newHass) return false;
  const before = oldHass as unknown as Record<string, unknown>;
  const after = newHass as unknown as Record<string, unknown>;
  return NAME_SOURCES.some((key) => before[key] !== after[key]);
};

function computeActionTooltip(hass, state, config, isHold) {
  if (!config || !config.action || config.action === "none") {
    return "";
  }
  let tooltip = `${
    isHold
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.hold")
      : hass.localize("ui.panel.lovelace.cards.picture-elements.tap")
  } `;
  switch (config.action) {
    case "navigate":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.navigate_to",
        "location",
        config.navigation_path,
      )}`;
      break;
    case "url":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.url",
        "url_path",
        config.url_path,
      )}`;
      break;
    case "toggle":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.toggle",
        "name",
        state,
      )}`;
      break;
    case "call-service":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.call_service",
        "name",
        config.service,
      )}`;
      break;
    case "more-info":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.more_info",
        "name",
        state,
      )}`;
      break;
  }
  return tooltip;
}

export const computeTooltip = (config: ButtonConfig, hass?: HomeAssistant) => {
  if (!hass || config.tooltip === false) {
    return "";
  }
  if (config.tooltip) {
    return config.tooltip;
  }
  let stateName = "";
  let tooltip = "";
  if (config.entity) {
    stateName =
      config.entity in hass.states
        ? computeStateName(hass, hass.states[config.entity])
        : config.entity;
  }
  if (!config.tap_action && !config.hold_action) {
    return stateName;
  }
  const tapTooltip = config.tap_action
    ? computeActionTooltip(hass, stateName, config.tap_action, false)
    : "";
  const holdTooltip = config.hold_action
    ? computeActionTooltip(hass, stateName, config.hold_action, true)
    : "";
  const newline = tapTooltip && holdTooltip ? "\n" : "";
  tooltip = tapTooltip + newline + holdTooltip;
  return tooltip;
};
