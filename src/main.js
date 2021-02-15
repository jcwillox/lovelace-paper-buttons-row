import { css, html, LitElement } from "card-tools/src/lit-element";
import { handleAction, hasAction, hasRepeat } from "./action";
import { hass } from "card-tools/src/hass";
import { logVersion } from "./logging";
import { DOMAINS_TOGGLE, STATE_UNAVAILABLE, STATES_ON } from "./const";
import {
  computeDomain,
  computeDomainIcon,
  computeStateIcon,
  computeStateName,
  computeTooltip,
} from "./entity";
import { name, version } from "../package.json";
import { coerceObject, mapStyle } from "./styles";
import deepmerge from "deepmerge";
import { actionHandlerBind } from "./action-handler";
import "./generic-entity-row";

logVersion(name, version, "#039be5");

const computeIcon = (state, config) => {
  return config.state_icons && config.state_icons[state];
};

const computeStateText = (config) => {
  return (
    (config.state_text && config.state_text[config.state.toLowerCase()]) ||
    config.state
  );
};

const migrateIconAlignment = (alignment) => {
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

class PaperButtonsRow extends LitElement {
  static get properties() {
    return {
      _config: {},
      _hass: {},
    };
  }

  static get styles() {
    // language=CSS
    return css`
      .flex-box {
        display: flex;
        justify-content: space-evenly;
        align-items: center;
      }

      .flex-column {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
      }

      paper-button {
        color: var(--paper-item-icon-color);
        padding: 6px;
        cursor: pointer;
        position: relative;
        display: inline-flex;
        align-items: center;
        user-select: none;
      }

      span {
        padding: 2px;
        text-align: center;
      }

      ha-icon {
        padding: 2px;
      }

      .button-active {
        color: var(--paper-item-icon-active-color);
      }

      .button-unavailable {
        color: var(--state-icon-unavailable-color);
      }

      .image {
        position: relative;
        display: inline-block;
        width: 28px;
        border-radius: 50%;
        height: 28px;
        text-align: center;
        background-size: cover;
        line-height: 28px;
        vertical-align: middle;
        box-sizing: border-box;
      }
    `;
  }

  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    if (!config.buttons) throw new Error("Missing buttons.");
    if (!Array.isArray(config.buttons))
      throw new Error("Buttons must be an array.");
    if (config.buttons.length <= 0)
      throw new Error("At least one button required.");

    this._config = JSON.parse(JSON.stringify(config)); // deep copy.

    // ensure buttons are a nested array.
    if (!Array.isArray(this._config.buttons[0])) {
      this._config.buttons = [this._config.buttons];
    }

    this._hass = hass();
    this._entities = [];

    // fix config.
    this._config.buttons = this._config.buttons.map((row) => {
      return row.map((config) => {
        // handle when config is not defined as a dictionary.
        if (typeof config === "string") {
          config = { entity: config };
        }

        config = config || {};

        config = deepmerge(this._config.base_config || {}, config);

        if (typeof config.layout === "string") {
          config.layout = config.layout
            .split("|")
            .map((column) =>
              column.includes("_") ? column.split("_") : column
            );
        }

        // apply default services.
        config = this._defaultConfig(config);

        // create list of entities to monitor for changes.
        if (config.entity) {
          this._entities.push(config.entity);
        }

        return config;
      });
    });
  }

  render() {
    return html`
      ${this._config.buttons.map((row) => {
        return html`
          <div class="flex-box">
            ${row.map((config) => {
              const stateObj = this._hass.states[config.entity] || {};
              const stateStyle =
                (config.state_styles && config.state_styles[stateObj.state]) ||
                {};
              let buttonStyle = this._getStyle(config, stateStyle, "button");

              return html`
                <paper-button
                  @action=${(ev) => this._handleAction(ev, config)}
                  .config=${config}
                  style="${buttonStyle}"
                  class="${this._getClass(stateObj.state)}"
                  title=${computeTooltip(this._hass, config)}
                >
                  ${config.layout.map((column) => {
                    if (Array.isArray(column))
                      return html`
                        <div class="flex-column">
                          ${column.map((row) =>
                            this.renderElement(
                              row,
                              config,
                              stateObj,
                              stateStyle
                            )
                          )}
                        </div>
                      `;
                    return this.renderElement(
                      column,
                      config,
                      stateObj,
                      stateStyle
                    );
                  })}

                  <paper-ripple
                    center
                    style="${this._getStyle(config, stateStyle, "ripple")}"
                    class=${this._getRippleClass(config)}
                  ></paper-ripple>
                </paper-button>
              `;
            })}
          </div>
        `;
      })}
    `;
  }

  renderElement(item, config, stateObj, stateStyle) {
    let style = this._getStyle(config, stateStyle, item);
    switch (item) {
      case "icon":
        return this.renderIcon(config, style, stateObj);
      case "name":
        return this.renderName(config, style, stateObj);
      case "state":
        return this.renderState(config, style, stateObj);
    }
  }

  renderIcon(config, style, stateObj) {
    const icon =
      config.icon !== false && (config.icon || config.entity)
        ? computeIcon(stateObj.state, config) ||
          config.icon ||
          computeStateIcon(stateObj) ||
          computeDomainIcon(config.entity)
        : false;

    return config.image
      ? html`<img src="${config.image}" class="image" style="${style}" />`
      : icon
      ? html`<ha-icon style="${style}" .icon=${icon} />`
      : "";
  }

  renderName(config, style, stateObj) {
    return config.name !== false && (config.name || config.entity)
      ? html`
          <span style="${style}">
            ${config.name || computeStateName(stateObj)}
          </span>
        `
      : "";
  }

  renderState(config, style, stateObj) {
    return config.state !== false
      ? html` <span style="${style}"> ${computeStateText(config)} </span> `
      : "";
  }

  firstUpdated() {
    this.shadowRoot.querySelectorAll("paper-button").forEach((button) => {
      actionHandlerBind(button, {
        hasHold: hasAction(button.config.hold_action),
        hasDoubleClick: hasAction(button.config.double_tap_action),
        repeat: hasRepeat(button.config.hold_action),
      });
    });
  }

  _handleAction(ev, config) {
    handleAction(this, this._hass, config, ev.detail.action);
  }

  _getClass(state) {
    if (STATES_ON.has(state)) return "button-active";
    else if (STATE_UNAVAILABLE === state) return "button-unavailable";
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

  _getStyle(config, stateStyle, attribute) {
    return mapStyle({
      ...coerceObject((config.style && config.style[attribute]) || {}),
      ...coerceObject(stateStyle[attribute] || {}),
    });
  }

  _defaultConfig(config) {
    if (!config.layout) {
      // migrate align_icon to layout
      let alignment = config.align_icon || this._config.align_icons;
      if (alignment) config.layout = migrateIconAlignment(alignment);
      else config.layout = ["icon", "name"];
    }

    if (!config.state && config.entity) {
      config.state = { case: "upper" };
    }

    if (config.entity) {
      let domain = computeDomain(config.entity);

      if (DOMAINS_TOGGLE.has(domain)) {
        return {
          tap_action: {
            action: "toggle",
          },
          ...config,
        };
      }
      if (domain === "scene") {
        return {
          tap_action: {
            action: "call-service",
            service: "scene.turn_on",
            service_data: {
              entity_id: config.entity,
            },
          },
          ...config,
        };
      }
    }
    return config;
  }

  shouldUpdate(changedProps) {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("_hass");

    if (!oldHass) {
      return true;
    }

    // only update if monitored entity changed state.
    return this._entities.some(
      (entity) => oldHass.states[entity] !== this._hass.states[entity]
    );
  }
}

customElements.define("paper-buttons-row", PaperButtonsRow);
