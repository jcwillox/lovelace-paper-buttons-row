import { hass } from "card-tools/src/hass";
import {
  ActionHandlerEvent,
  HomeAssistant,
  computeDomain,
  stateIcon,
} from "custom-card-helpers";
import deepmerge from "deepmerge";
import { HassEntity } from "home-assistant-js-websocket";
import { LitElement, PropertyValues, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { StyleInfo, styleMap } from "lit/directives/style-map.js";
import { handleAction, hasAction } from "./action";
import { actionHandler } from "./action-handler";
import {
  DOMAINS_TOGGLE,
  STATES_ON,
  STATE_OFF,
  STATE_ON,
  STATE_UNAVAILABLE,
  TEMPLATE_OPTIONS,
} from "./const";
import { computeStateName, computeTooltip } from "./entity";
import { handleButtonPreset } from "./presets";
import styles from "./styles.css?inline";
import { renderTemplateObjects, subscribeTemplate } from "./template";
import {
  ButtonConfig,
  ExternalButtonConfig,
  ExternalButtonType,
  ExternalPaperButtonRowConfig,
  PaperButtonRowConfig,
  StyleConfig,
} from "./types";
import { arrayToObject } from "./utils";
import "./entity-row";

console.groupCollapsed(
  `%c ${__NAME__} %c ${__VERSION__} `,
  "color: white; background: #039be5; font-weight: 700;",
  "color: #039be5; background: white; font-weight: 700;",
);
console.info(`branch   : ${__BRANCH__}`);
console.info(`commit   : ${__COMMIT__}`);
console.info(`built at : ${__BUILD_TIME__}`);
console.info(__REPO_URL__);
console.groupEnd();

const computeStateIcon = (config: ButtonConfig) => {
  if (config.state_icons && typeof config.state == "string")
    return config.state_icons[config.state.toLowerCase()];
  return undefined;
};

const computeStateText = (config: ButtonConfig) => {
  if (config.state_text && typeof config.state == "string")
    return config.state_text[config.state.toLowerCase()] || config.state;
  return config.state;
};

const migrateIconAlignment = (alignment: string) => {
  console.warn(
    __NAME__,
    "'align_icon' and 'align_icons' is deprecated and will be removed in a future version",
  );
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
  static readonly styles = unsafeCSS(styles);

  @property() private hass?: HomeAssistant;
  @property() private _config?: PaperButtonRowConfig;

  _templates?: unknown[];
  _entities?: string[];

  // convert an externally set config to the correct internal structure
  private _transformConfig(
    config: ExternalPaperButtonRowConfig,
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

    if (config.styles === undefined) {
      // ensure styles is not undefined
      config.styles = {} as StyleConfig;
    } else {
      // ensure styles are an object
      for (const key in config.styles) {
        config.styles[key] = arrayToObject(config.styles[key]);
      }
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
                column.includes("_") ? column.split("_") : column,
              );
          }

          // ensure active is a list
          if (typeof bConfig.active === "string") {
            bConfig.active = [bConfig.active];
          }

          // migrate `style` to `styles`
          if (bConfig.styles == undefined) {
            bConfig.styles = bConfig.style;
          }
          if (bConfig.styles === undefined) {
            // ensure styles is not undefined
            bConfig.styles = {} as StyleConfig;
          } else {
            // ensure styles are an object
            for (const key in bConfig.styles) {
              bConfig.styles[key] = arrayToObject(bConfig.styles[key]);
            }
          }
          if (bConfig.state_styles) {
            // ensure styles are an object
            for (const stateKey in bConfig.state_styles) {
              for (const key in bConfig.state_styles[stateKey]) {
                bConfig.state_styles[stateKey][key] = arrayToObject(
                  bConfig.state_styles[stateKey][key],
                );
              }
            }
          }

          // apply default services.
          bConfig = this._defaultConfig(config, bConfig);

          return bConfig;
        });
      },
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
    this._config.buttons = this._config.buttons.map(row => {
      return row.map(config => {
        config = handleButtonPreset(config, this._config);

        // create list of entities to monitor for changes.
        if (config.entity) {
          this._entities?.push(config.entity);
        }

        // subscribe template options
        TEMPLATE_OPTIONS.forEach(key =>
          subscribeTemplate.call(this, config, config, key),
        );

        // subscribe template styles
        Object.values(config.styles).forEach(styles => {
          if (typeof styles === "object")
            Object.keys(styles).forEach(key =>
              subscribeTemplate.call(this, config, styles, key),
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
      ${this._config.extra_styles
        ? html`
            <style>
              ${this._config.extra_styles}
            </style>
          `
        : ""}
      ${this._config.buttons.map(row => {
        return html`
          <div
            class="flex-box"
            style="${styleMap(this._config?.styles as StyleInfo)}"
          >
            ${row.map(config => {
              const stateObj =
                (config.entity != undefined &&
                  this.hass?.states[config.entity]) ||
                undefined;
              const domain = config.entity && computeDomain(config.entity);
              const styles = this._getStyles(config);
              const buttonStyles = {
                ...this._getBaseStyles(),
                ...this._getStateStyles(domain, stateObj),
                ...(styles.button || {}),
              } as StyleInfo;

              const activeStates = config.active
                ? new Set(config.active)
                : STATES_ON;

              return html`
                <paper-button
                  @action="${(ev: ActionHandlerEvent) =>
                    this._handleAction(ev, config)}"
                  .actionHandler="${actionHandler({
                    hasHold: hasAction(config.hold_action),
                    hasDoubleClick: hasAction(config.double_tap_action),
                    repeat: config.hold_action?.repeat,
                  })}"
                  style="${styleMap(buttonStyles)}"
                  class="${this._getClass(
                    activeStates,
                    config.state,
                    stateObj?.state,
                  )}"
                  title="${computeTooltip(config, this.hass)}"
                  data-domain="${ifDefined(domain)}"
                  data-entity-state="${ifDefined(stateObj?.state)}"
                  data-state="${ifDefined(
                    typeof config.state === "string" &&
                      config.state.toLowerCase(),
                  )}"
                >
                  ${config.layout?.map(column => {
                    if (Array.isArray(column))
                      return html`
                        <div class="flex-column">
                          ${column.map(row =>
                            this.renderElement(row, config, styles, stateObj),
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
    item: string,
    config: ButtonConfig,
    styles: StyleConfig,
    entity?: HassEntity,
  ) {
    const style: StyleInfo = styles?.[item] || {};
    switch (item) {
      case "icon":
        return this.renderIcon(config, style, entity);
      case "name":
        return this.renderName(config, style, entity);
      case "state":
        return this.renderState(config, style);
    }
  }

  renderIcon(config: ButtonConfig, style: StyleInfo, entity?: HassEntity) {
    const icon =
      config.icon !== false && (config.icon || config.entity)
        ? computeStateIcon(config) ||
          config.icon ||
          (entity && stateIcon(entity))
        : false;

    return config.image
      ? html`<img
          src="${config.image}"
          class="image"
          style="${styleMap(style)}"
          alt="icon"
        />`
      : icon
        ? html` <ha-icon style="${styleMap(style)}" .icon="${icon}" />`
        : "";
  }

  renderName(config: ButtonConfig, style: StyleInfo, stateObj?: HassEntity) {
    return config.name !== false && (config.name || config.entity)
      ? html`
          <span style="${styleMap(style)}">
            ${config.name || computeStateName(stateObj)}
          </span>
        `
      : "";
  }

  renderState(config: ButtonConfig, style: StyleInfo) {
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

  _getClass(
    activeStates: Set<string>,
    state?: ButtonConfig["state"],
    entityState?: string,
  ) {
    if (typeof state == "string" && activeStates.has(state.toLowerCase())) {
      return "button-active";
    } else if (STATE_UNAVAILABLE === entityState) {
      return "button-unavailable";
    }
    return "";
  }

  _getBaseStyles(): StyleInfo {
    const hex = getComputedStyle(this).getPropertyValue("--state-icon-color");
    return {
      "--rgb-state-default-color": this._hexToRgb(hex)?.join(", "),
    };
  }

  _getStateStyles(domain?: string, stateObj?: HassEntity): StyleInfo {
    if (!domain || !stateObj) return {};

    if (stateObj.attributes.rgb_color) {
      return {
        "--pbs-button-rgb-state-color": stateObj.attributes.rgb_color,
      };
    } else {
      const rgb = this._getStateColor(stateObj, domain);
      if (rgb) {
        return {
          "--pbs-button-rgb-state-color": rgb.join(", "),
        };
      }
    }

    return {};
  }

  _getStateColor = (stateObj: HassEntity, domain?: string) => {
    const styles = getComputedStyle(this);

    // from `device_class`
    if (stateObj.attributes.device_class) {
      const hex = styles.getPropertyValue(
        `--state-${domain}-${stateObj.attributes.device_class}-${stateObj.state}-color`,
      );
      if (hex) {
        return this._hexToRgb(hex);
      }
    }

    // from `state`
    let hex = styles.getPropertyValue(
      `--state-${domain}-${stateObj.state}-color`,
    );
    if (hex) return this._hexToRgb(hex);

    // from `domain`
    if (stateObj.state === STATE_ON || stateObj.state === STATE_OFF) {
      const active = stateObj.state === STATE_ON ? "active" : "inactive";

      hex = styles.getPropertyValue(`--state-${domain}-${active}-color`);
      if (hex) return this._hexToRgb(hex);

      if (stateObj.state === STATE_ON) {
        hex = styles.getPropertyValue("--state-active-color");
        if (hex) return this._hexToRgb(hex);
      }
    }
  };

  _hexToRgb(hex: string) {
    return hex.match(/[A-Za-z0-9]{2}/g)?.map(v => parseInt(v, 16));
  }

  _getRippleClass(config: ButtonConfig) {
    switch (config.ripple) {
      case "none":
        return "hidden";
      case "circle":
        return "circle";
      case "fill":
        return "";
    }
    if (config.layout?.length === 1 && config.layout[0] === "icon") {
      return "circle";
    }
    if (
      config.name ||
      (config.name !== false && config.entity) ||
      config.layout?.includes("state")
    ) {
      return "";
    }
    return "circle";
  }

  _getStyles(config: ButtonConfig): StyleConfig {
    if (!config.state || !config.state_styles) {
      return config.styles;
    }
    const stateStyle =
      config.state_styles[(config.state as string).toLowerCase()];
    if (!stateStyle) {
      return config.styles;
    }
    return deepmerge(config.styles, stateStyle);
  }

  _defaultConfig(
    config: ExternalPaperButtonRowConfig,
    bConfig: ExternalButtonConfig,
  ) {
    if (!bConfig.layout) {
      // migrate align_icon to layout
      const alignment = bConfig.align_icon || config.align_icons;
      if (alignment) bConfig.layout = migrateIconAlignment(alignment);
      else bConfig.layout = ["icon", "name"];
    }

    // default state template
    if (!bConfig.state && bConfig.entity) {
      bConfig.state = { case: "upper" };
    }

    if (bConfig.entity) {
      const domain = computeDomain(bConfig.entity);
      // default hold action
      if (!bConfig.hold_action) {
        bConfig.hold_action = { action: "more-info" };
      }
      // default tap action
      if (!bConfig.tap_action) {
        if (DOMAINS_TOGGLE.has(domain)) {
          bConfig.tap_action = { action: "toggle" };
        } else if (domain === "scene") {
          bConfig.tap_action = {
            action: "call-service",
            service: "scene.turn_on",
            service_data: {
              entity_id: bConfig.entity,
            },
          };
        } else {
          bConfig.tap_action = { action: "more-info" };
        }
      }
    }
    return bConfig;
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
        entity => oldHass.states[entity] !== this.hass?.states[entity],
      );
    }
    return false;
  }
}
