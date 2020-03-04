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