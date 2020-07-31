export const computeDomain = entityId => {
  return entityId.substr(0, entityId.indexOf("."));
};

export const computeObjectId = entityId => {
  return entityId.substr(entityId.indexOf(".") + 1);
};

export const computeStateName = stateObj => {
  if (stateObj.attributes && stateObj.attributes.friendly_name) {
    return stateObj.attributes.friendly_name;
  }
  return stateObj.entity_id
    ? computeObjectId(stateObj.entity_id).replace(/_/g, " ")
    : "Unknown";
};

export const computeStateIcon = stateObj => {
  return stateObj.attributes && stateObj.attributes.icon;
};

export const computeDomainIcon = entityId => {
  switch (computeDomain(entityId)) {
    case "light":
      return "mdi:lightbulb";
    case "lock":
      return "mdi:lock";
    case "switch":
      return "mdi:flash";
  }
};

function computeActionTooltip(hass, state, config, isHold) {
  if (!config || !config.action || config.action === "none") {
    return "";
  }
  let tooltip =
    (isHold
      ? hass.localize("ui.panel.lovelace.cards.picture-elements.hold")
      : hass.localize("ui.panel.lovelace.cards.picture-elements.tap")) + " ";
  switch (config.action) {
    case "navigate":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.navigate_to",
        "location",
        config.navigation_path
      )}`;
      break;
    case "url":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.url",
        "url_path",
        config.url_path
      )}`;
      break;
    case "toggle":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.toggle",
        "name",
        state
      )}`;
      break;
    case "call-service":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.call_service",
        "name",
        config.service
      )}`;
      break;
    case "more-info":
      tooltip += `${hass.localize(
        "ui.panel.lovelace.cards.picture-elements.more_info",
        "name",
        state
      )}`;
      break;
  }
  return tooltip;
}
export const computeTooltip = (hass, config) => {
  if (config.tooltip === false) {
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
