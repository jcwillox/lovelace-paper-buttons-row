import { provideHass } from "card-tools/src/hass";
import {
  createThing,
  fireEvent,
  type HomeAssistant,
} from "custom-card-helpers";
import type { LitElement, PropertyValues } from "lit";
import type { ExternalPaperButtonRowConfig } from "./types";

interface LovelaceElement extends LitElement {
  hass?: HomeAssistant;
  config?: Record<string, unknown>;
  _config?: Record<string, unknown>;
}

type FirstUpdatedFn = (
  this: LovelaceElement,
  changedProperties: PropertyValues,
) => void;

export function createModule(element: string, firstUpdated: FirstUpdatedFn) {
  customElements.whenDefined(element).then(() => {
    const el = customElements.get(element) as CustomElementConstructor;
    const oFirstUpdated = el.prototype.firstUpdated;

    el.prototype.firstUpdated = function (changedProperties) {
      oFirstUpdated.call(this, changedProperties);
      firstUpdated.call(this, changedProperties);
    };

    fireEvent(window, "ll-rebuild", {});
  });
}

createModule("hui-generic-entity-row", function () {
  if (this.config?.extend_paper_buttons_row && this.shadowRoot) {
    const pbConfig = this.config
      .extend_paper_buttons_row as ExternalPaperButtonRowConfig;

    const paperButtons = createThing(
      {
        type: "custom:paper-buttons-row",
        ...pbConfig,
      },
      true,
    );

    provideHass(paperButtons);

    let el = this.shadowRoot.querySelector<HTMLElement>("slot");
    if (!el) return;

    if (el.parentElement) {
      if (el.parentElement.parentElement) {
        if (
          el.parentElement.classList.contains("state") &&
          el.parentElement.parentElement.classList.contains("text-content")
        ) {
          el = el.parentElement.parentElement;
        } else {
          console.error("unexpected parent node found");
        }
      } else if (el.parentElement.classList.contains("text-content")) {
        el = el.parentElement;
      } else {
        console.error("unexpected parent node found");
      }
    }

    if (pbConfig.hide_state) {
      el.style.display = "none";
    }

    if (pbConfig.hide_badge) {
      const el = this.shadowRoot.querySelector<HTMLElement>("state-badge");
      if (el) {
        el.style.visibility = "hidden";
        el.style.marginLeft = "-48px";
      }
    }

    if (pbConfig.position === "right") {
      insertAfter(paperButtons, el);
    } else {
      insertBefore(paperButtons, el);
    }
  }
});

function insertBefore(node: HTMLElement, element: Element) {
  element.parentNode?.insertBefore(node, element);
}

function insertAfter(node: HTMLElement, element: Element) {
  if (element.nextElementSibling) {
    insertBefore(node, element.nextElementSibling);
  } else {
    element.parentNode?.appendChild(node);
  }
}
