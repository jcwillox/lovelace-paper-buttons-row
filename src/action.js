import { forwardHaptic } from "./haptic";
import { fireEvent } from "card-tools/src/event";
import { navigate } from "./navigate";

export function bindActionHandler(element, options = {}) {
  customElements.whenDefined("long-press").then(() => {
    const longpress = document.body.querySelector("long-press");
    longpress.bind(element);
  });
  customElements.whenDefined("action-handler").then(() => {
    const actionHandler = document.body.querySelector("action-handler");
    if (actionHandler) actionHandler.bind(element, options);
  });
  return element;
}

export function handleAction(node, hass, config, action) {
  let actionConfig = undefined;

  if (action === "double_tap" && config.double_tap_action) {
    actionConfig = config.double_tap_action;
  } else if (action === "hold" && config.hold_action) {
    actionConfig = config.hold_action;
  } else if (action === "tap" && config.tap_action) {
    actionConfig = config.tap_action;
  }

  if (!actionConfig) {
    actionConfig = {
      action: "more-info"
    };
  }

  if (
    actionConfig.confirmation &&
    (!actionConfig.confirmation.exemptions ||
      !actionConfig.confirmation.exemptions.some(e => e.user === hass.user.id))
  ) {
    forwardHaptic("warning");

    if (
      !confirm(
        actionConfig.confirmation.text ||
          `Are you sure you want to ${actionConfig.action}?`
      )
    ) {
      return;
    }
  }

  switch (actionConfig.action) {
    case "more-info":
      if (actionConfig.entity || config.entity) {
        fireEvent(
          "hass-more-info",
          {
            entityId: actionConfig.entity || config.entity
          },
          node
        );
      }
      break;
    case "navigate":
      if (actionConfig.navigation_path) {
        navigate(actionConfig.navigation_path);
      }
      break;
    case "url":
      if (actionConfig.url_path) {
        window.open(actionConfig.url_path);
      }
      break;
    case "toggle":
      if (config.entity) {
        // toggleEntity(hass, config.entity);
        hass.callService("homeassistant", "toggle", {
          entity_id: config.entity
        });
        forwardHaptic("light");
      }
      break;
    case "call-service":
      if (!actionConfig.service) {
        forwardHaptic("failure");
        return;
      }
      const [domain, service] = actionConfig.service.split(".", 2);
      hass.callService(domain, service, actionConfig.service_data);
      forwardHaptic("light");
      break;
    case "fire-event":
      if (!actionConfig.event_type) {
        forwardHaptic("failure");
        return;
      }
      hass.callApi(
        "POST",
        `events/${actionConfig.event_type}`,
        actionConfig.event_data
      );
      break;
    case "fire-dom-event":
      fireEvent("ll-custom", actionConfig, node);
  }
}

export function hasAction(config) {
  return config !== undefined && config.action !== "none";
}
