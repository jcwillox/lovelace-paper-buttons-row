import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap, StyleInfo } from "lit/directives/style-map.js";
import { handleAction, hasAction } from "./action";
import { hass } from "card-tools/src/hass";
import {
  DOMAINS_TOGGLE,
  STATE_UNAVAILABLE,
  STATES_ON,
  TEMPLATE_OPTIONS
} from "./const";
import { computeStateName, computeTooltip } from "./entity";
import { name, version } from "../package.json";
import deepmerge from "deepmerge";
import { actionHandler } from "./action-handler";
import "./entity-row";
import { renderTemplateObjects, subscribeTemplate } from "./template";
import {
  ActionHandlerEvent,
  computeDomain,
  HomeAssistant,
  stateIcon
} from "custom-card-helpers";
import {
  ButtonConfig,
  ExternalButtonConfig,
  ExternalButtonType,
  ExternalPaperButtonRowConfig,
  PaperButtonRowConfig,
  StyleConfig
} from "./types";
import { HassEntity } from "home-assistant-js-websocket";
import styles from "./styles.css";
import { arrayToObject } from "./utils";

console.info(
  `%c ${name.toUpperCase()} %c ${version} `,
  `color: white; background: #039be5; font-weight: 700;`,
  `color: #039be5; background: white; font-weight: 700;`
);

const computeIcon = (state, config) => {
  return config.state_icons && config.state_icons[state];
};

const computeStateText = config => {
  return (
    (config.state_text && config.state_text[config.state.toLowerCase()]) ||
    config.state
  );
};

const migrateIconAlignment = alignment => {
  switch (alignment) {
    case "top":
      return [["icon", "name"]];
    case "bottom":
      return [["name", "icon"]];
    case "right":
      return ["name", "icon"];
    default:
      return ["icon", "name"];
  }
};

@customElement("paper-buttons-row")
export class PaperButtonsRow extends LitElement {
  static readonly styles = [styles];

  @property() private hass?: HomeAssistant;
  @property() private _config?: PaperButtonRowConfig;

  _templates?: unknown[];
  _entities?: string[];

  // convert an externally set config to the correct internal structure
  private _transformConfig(
    config: ExternalPaperButtonRowConfig
  ): PaperButtonRowConfig {
    // check valid config
    if (!config) throw new Error("Invalid configuration");
    if (!config.buttons) throw new Error("Missing buttons.");
    if (!Array.isArray(config.buttons))
      throw new Error("Buttons must be an array.");
    if (config.buttons.length <= 0)
      throw new Error("At least one button required.");

    // deep copy config
    config = JSON.parse(JSON.stringify(config));

    // ensure we always have 1 row
    if (config.buttons.every(item => !Array.isArray(item))) {
      config.buttons = [config.buttons as Array<ExternalButtonType>];
    } else if (!config.buttons.every(item => Array.isArray(item))) {
      throw new Error("Cannot mix rows and buttons");
    }

    config.buttons = (config.buttons as Array<Array<ExternalButtonType>>).map(
      row => {
        return row.map(bConfig => {
          // handle when config is not defined as a dictionary.
          if (typeof bConfig === "string") {
            bConfig = { entity: bConfig };
          }

          bConfig = deepmerge(config.base_config || {}, bConfig);

          // transform layout config
          if (typeof bConfig.layout === "string") {
            bConfig.layout = bConfig.layout
              .split("|")
              .map(column =>
                column.includes("_") ? column.split("_") : column
              );
          }

          if (bConfig.style === undefined) {
            // ensure style is not undefined
            bConfig.style = {} as StyleConfig;
          } else {
            // ensure styles are an object
            for (const key in bConfig.style) {
              bConfig.style[key] = arrayToObject(bConfig.style[key]);
            }
          }
          if (bConfig.state_styles) {
            // ensure styles are an object
            for (const stateKey in bConfig.state_styles) {
              for (const key in bConfig.state_styles[stateKey]) {
                bConfig.state_styles[stateKey][key] = arrayToObject(
                  bConfig.state_styles[stateKey][key]
                );
              }
            }
          }

          // apply default services.
          bConfig = this._defaultConfig(bConfig);

          return bConfig;
        });
      }
    );

    return config as PaperButtonRowConfig;
  }

  setConfig(config: ExternalPaperButtonRowConfig) {
    this._config = this._transformConfig(config);
    if (!this.hass) {
      this.hass = hass() as HomeAssistant;
    }
    this._entities = [];
    this._templates = [];

    // fix config.
    this._config.buttons.map(row => {
      return row.map(config => {
        // create list of entities to monitor for changes.
        if (config.entity) {
          this._entities?.push(config.entity);
        }

        // subscribe template options
        TEMPLATE_OPTIONS.forEach(key =>
          subscribeTemplate.call(this, config, config, key)
        );

        // subscribe template styles
        Object.values(config.style).forEach(styles => {
          if (typeof styles === "object")
            Object.keys(styles).forEach(key =>
              subscribeTemplate.call(this, config, styles, key)
            );
        });

        return config;
      });
    });
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    renderTemplateObjects(this._templates, this.hass);

    return html`
      ${this._config.buttons.map(row => {
        return html`
          <div class="flex-box">
            ${row.map(config => {
              const stateObj =
                (config.entity != undefined &&
                  this.hass!.states[config.entity]) ||
                undefined;
              const styles = this._getStyles(config);

              return html`
                <paper-button
                  @action="${ev => this._handleAction(ev, config)}"
                  .actionHandler="${actionHandler({
                    hasHold: hasAction(config.hold_action),
                    hasDoubleClick: hasAction(config.double_tap_action),
                    repeat: config.hold_action?.repeat
                  })}"
                  style="${styleMap((styles.button || {}) as StyleInfo)}"
                  class="${this._getClass(stateObj?.state)}"
                  title="${computeTooltip(this.hass!, config)}"
                >
                  ${config.layout!.map(column => {
                    if (Array.isArray(column))
                      return html`
                        <div class="flex-column">
                          ${column.map(row =>
                            this.renderElement(row, config, styles, stateObj)
                          )}
                        </div>
                      `;
                    return this.renderElement(column, config, styles, stateObj);
                  })}

                  <paper-ripple
                    center
                    style="${styleMap((styles.ripple || {}) as StyleInfo)}"
                    class="${this._getRippleClass(config)}"
                  ></paper-ripple>
                </paper-button>
              `;
            })}
          </div>
        `;
      })}
    `;
  }

  renderElement(
    item,
    config: ButtonConfig,
    styles?: StyleConfig,
    entity?: HassEntity
  ) {
    const style = (styles || {})[item] || {};
    switch (item) {
      case "icon":
        return this.renderIcon(config, style, entity);
      case "name":
        return this.renderName(config, style, entity);
      case "state":
        return this.renderState(config, style);
    }
  }

  renderIcon(config: ButtonConfig, style, entity?: HassEntity) {
    const icon =
      config.icon !== false && (config.icon || config.entity)
        ? computeIcon(entity?.state, config) ||
          config.icon ||
          (entity && stateIcon(entity))
        : false;

    return config.image
      ? html`<img
          src="${config.image}"
          class="image"
          style="${styleMap(style)}"
        />`
      : icon
      ? html` <ha-icon style="${styleMap(style)}" .icon="${icon}" />`
      : "";
  }

  renderName(config: ButtonConfig, style, stateObj?: HassEntity) {
    return config.name !== false && (config.name || config.entity)
      ? html`
          <span style="${styleMap(style)}">
            ${config.name || computeStateName(stateObj)}
          </span>
        `
      : "";
  }

  renderState(config: ButtonConfig, style) {
    return config.state !== false
      ? html`
          <span style="${styleMap(style)}"> ${computeStateText(config)} </span>
        `
      : "";
  }

  private _handleAction(ev: ActionHandlerEvent, config: ButtonConfig): void {
    if (this.hass && config && ev.detail.action) {
      handleAction(this, this.hass, config, ev.detail.action);
    }
  }

  _getClass(state?: string) {
    if (!state) return "";
    if (STATES_ON.has(state)) {
      return "button-active";
    } else if (STATE_UNAVAILABLE === state) {
      return "button-unavailable";
    }
    return "";
  }

  _getRippleClass(config) {
    if (config.layout.length === 1 && config.layout[0] === "icon") {
      return "circle";
    }
    if (
      config.name ||
      (config.name !== false && config.entity) ||
      config.layout.includes("state")
    ) {
      return "";
    }
    return "circle";
  }

  _getStyles(config: ButtonConfig): StyleConfig {
    if (!config.state || !config.state_styles) {
      return config.style;
    }
    const stateStyle =
      config.state_styles[(config.state as string).toLowerCase()];
    if (!stateStyle) {
      return config.style;
    }
    return deepmerge(config.style, stateStyle);
  }

  _defaultConfig(config: ExternalButtonConfig) {
    if (!config.layout) {
      // migrate align_icon to layout
      const alignment = config.align_icon || this._config?.align_icons;
      if (alignment) config.layout = migrateIconAlignment(alignment);
      else config.layout = ["icon", "name"];
    }

    if (!config.state && config.entity) {
      config.state = { case: "upper" };
    }

    if (config.entity) {
      const domain = computeDomain(config.entity);
      if (!config.hold_action) {
        config.hold_action = { action: "more-info" };
      }
      if (!config.tap_action) {
        if (DOMAINS_TOGGLE.has(domain)) {
          config.tap_action = { action: "toggle" };
        } else if (domain === "scene") {
          config.tap_action = {
            action: "call-service",
            service: "scene.turn_on",
            service_data: {
              entity_id: config.entity
            }
          };
        } else {
          config.tap_action = { action: "more-info" };
        }
      }
    }
    return config;
  }

  shouldUpdate(changedProps: PropertyValues) {
    if (changedProps.has("_config")) {
      return true;
    }
    if (this._entities) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass) {
        return true;
      }
      // only update if monitored entity changed state.
      return this._entities.some(
        entity => oldHass.states[entity] !== this.hass!.states[entity]
      );
    }
    return false;
  }
}
