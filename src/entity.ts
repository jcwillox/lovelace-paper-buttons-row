import { type HomeAssistant, computeEntity } from "custom-card-helpers";
import type { ButtonConfig } from "./types";

export const computeStateName = (stateObj) => {
  if (stateObj.attributes?.friendly_name) {
    return stateObj.attributes.friendly_name;
  }
  return stateObj.entity_id
    ? computeEntity(stateObj.entity_id).replace(/_/g, " ")
    : "Unknown";
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
        ? computeStateName(hass.states[config.entity])
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
