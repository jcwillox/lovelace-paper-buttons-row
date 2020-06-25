import { css, html, LitElement } from "card-tools/src/lit-element";
import { bindActionHandler, handleAction, hasAction } from "./action";
import { hass } from "card-tools/src/hass";
import { logVersion } from "./logging";
import { DOMAINS_TOGGLE, STATE_UNAVAILABLE, STATES_ON } from "./const";
import {
  computeDomain,
  computeDomainIcon,
  computeStateIcon,
  computeStateName
} from "./entity";
import { name, version } from "../package.json";
import { coerceObject, mapStyle } from "./styles";

logVersion(name, version, "#039be5");

const computeIcon = (state, config) => {
  return config.state_icons && config.state_icons[state];
};

const computeText = (state, config) => {
  return config.state_text && config.state_text[state];
};

const computeFlexDirection = alignment => {
  switch (alignment) {
    case "top":
      return "column";
    case "bottom":
      return "column-reverse";
    case "right":
      return "row-reverse";
    default:
      return "row";
  }
};

class PaperButtonsRow extends LitElement {
  static get properties() {
    return {
      _config: {},
      _hass: {}
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
    this._config.buttons = this._config.buttons.map(row => {
      return row.map(config => {
        // handle when config is not defined as a dictionary.
        if (typeof config === "string") {
          config = { entity: config };
        }

        // apply default services.
        config = this._defaultConfig(config || {});

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
      ${this._config.buttons.map(row => {
        return html`
          <div class="flex-box">
            ${row.map(config => {
              const stateObj = this._hass.states[config.entity] || {};
              const baseStateStyle =
                (this._config.base_state_styles &&
                  this._config.base_state_styles[stateObj.state]) ||
                {};
              const stateStyle =
                (config.state_styles && config.state_styles[stateObj.state]) ||
                {};
              const icon =
                config.icon !== false && (config.icon || config.entity)
                  ? computeIcon(stateObj.state, config) ||
                    config.icon ||
                    computeStateIcon(stateObj) ||
                    computeDomainIcon(config.entity)
                  : false;

              return html`
                <paper-button
                  @action=${ev => this._handleAction(ev, config)}
                  .config=${config}
                  style="${this._getStyle(
                    config,
                    baseStateStyle,
                    stateStyle,
                    "button"
                  )}${this._getFlexDirection(config)}"
                  class="${this._getClass(stateObj.state)}"
                >
                  ${icon
                    ? html`
                        <ha-icon
                          style="${this._getStyle(
                            config,
                            baseStateStyle,
                            stateStyle,
                            "icon"
                          )}"
                          .icon=${icon}
                        ></ha-icon>
                      `
                    : ""}
                  ${config.name !== false && (config.name || config.entity)
                    ? html`
                        <span
                          style="${this._getStyle(
                            config,
                            baseStateStyle,
                            stateStyle,
                            "text"
                          )}"
                        >
                          ${computeText(stateObj.state, config) ||
                            config.name ||
                            computeStateName(stateObj)}
                        </span>
                      `
                    : ""}

                  <paper-ripple
                    center
                    style="${this._getStyle(
                      config,
                      baseStateStyle,
                      stateStyle,
                      "ripple"
                    )}"
                    class=${config.name === false ||
                    (!config.name && !config.entity)
                      ? "circle"
                      : ""}
                  ></paper-ripple>
                </paper-button>
              `;
            })}
          </div>
        `;
      })}
    `;
  }

  firstUpdated() {
    this.shadowRoot.querySelectorAll("paper-button").forEach(button => {
      bindActionHandler(button, {
        hasHold: hasAction(button.config.hold_action),
        hasDoubleClick: hasAction(button.config.double_tap_action)
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

  _getFlexDirection(config) {
    if (config.align_icon || this._config.align_icons)
      return `flex-direction: ${computeFlexDirection(
        config.align_icon || this._config.align_icons
      )};`;
    return "";
  }

  _getStyle(config, baseStateStyle, stateStyle, attribute) {
    return mapStyle({
      ...coerceObject(
        (this._config.base_style && this._config.base_style[attribute]) || {}
      ),
      ...coerceObject((config.style && config.style[attribute]) || {}),
      ...coerceObject((baseStateStyle && baseStateStyle[attribute]) || {}),
      ...coerceObject(stateStyle[attribute] || {})
    });
  }

  _defaultConfig(config) {
    if (config.entity) {
      let domain = computeDomain(config.entity);

      if (DOMAINS_TOGGLE.has(domain)) {
        return {
          tap_action: {
            action: "toggle"
          },
          ...config
        };
      }
      if (domain === "scene") {
        return {
          tap_action: {
            action: "call-service",
            service: "scene.turn_on",
            service_data: {
              entity_id: config.entity
            }
          },
          ...config
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
      entity => oldHass.states[entity] !== this._hass.states[entity]
    );
  }
}

customElements.define("paper-buttons-row", PaperButtonsRow);
