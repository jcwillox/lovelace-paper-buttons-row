import {
  fireEvent,
  forwardHaptic,
  HomeAssistant,
  navigate,
  toggleEntity
} from "custom-card-helpers";
import { ButtonActionConfig, ButtonConfig } from "./types";

export const handleAction = (
  node: HTMLElement,
  hass: HomeAssistant,
  config: ButtonConfig,
  action: string
): void => {
  let actionConfig: ButtonActionConfig | undefined;

  if (action === "double_tap" && config.double_tap_action) {
    actionConfig = config.double_tap_action;
  } else if (action === "hold" && config.hold_action) {
    actionConfig = config.hold_action;
  } else if (action === "tap" && config.tap_action) {
    actionConfig = config.tap_action;
  }

  handleActionConfig(node, hass, config, actionConfig);
};

export function handleActionConfig(
  node: HTMLElement,
  hass: HomeAssistant,
  config: ButtonConfig,
  actionConfig: ButtonActionConfig | undefined
) {
  if (!actionConfig) {
    actionConfig = {
      action: "more-info"
    };
  }

  if (
    actionConfig.confirmation &&
    (!actionConfig.confirmation.exemptions ||
      !actionConfig.confirmation.exemptions.some(
        e => e.user === hass!.user!.id
      ))
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
    case "more-info": {
      const entityId = actionConfig.entity || config.entity;
      if (entityId) {
        fireEvent(node, "hass-more-info", { entityId });
      }
      break;
    }
    case "navigate":
      if (!actionConfig.navigation_path) {
        forwardHaptic("failure");
        return;
      }
      navigate(node, actionConfig.navigation_path);
      forwardHaptic("light");
      break;
    case "url":
      if (!actionConfig.url_path) {
        forwardHaptic("failure");
        return;
      }
      window.open(actionConfig.url_path);
      forwardHaptic("light");
      break;
    case "toggle":
      if (!config.entity) {
        forwardHaptic("failure");
        return;
      }
      toggleEntity(hass, config.entity);
      forwardHaptic("light");
      break;
    case "call-service": {
      if (!actionConfig.service) {
        forwardHaptic("failure");
        return;
      }
      const [domain, service] = actionConfig.service.split(".", 2);
      hass.callService(domain, service, actionConfig.service_data);
      forwardHaptic("light");
      break;
    }
    case "fire-event": {
      if (!actionConfig.event_type) {
        forwardHaptic("failure");
        return;
      }
      hass.callApi(
        "POST",
        `events/${actionConfig.event_type}`,
        actionConfig.event_data || {}
      );
      forwardHaptic("light");
      break;
    }
    case "fire-dom-event": {
      fireEvent(node, "ll-custom", actionConfig);
      forwardHaptic("light");
    }
  }
}

export function hasAction(config?: ButtonActionConfig): boolean {
  return config !== undefined && config.action !== "none";
}
