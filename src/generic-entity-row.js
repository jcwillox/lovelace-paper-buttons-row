import { fireEvent } from "card-tools/src/event";
import { createEntityRow } from "card-tools/src/lovelace-element";
import { provideHass } from "card-tools/src/hass";

const ELEMENT = "hui-generic-entity-row";

customElements.whenDefined(ELEMENT).then(() => {
  const Element = customElements.get(ELEMENT);
  if (!Element) return;
  const oFirstUpdated = Element.prototype.firstUpdated;

  Element.prototype.firstUpdated = function (changedProperties) {
    oFirstUpdated.call(this, changedProperties);

    if (this.config.extend_paper_buttons_row) {
      const paperButtons = createEntityRow({
        type: "custom:paper-buttons-row",
        ...this.config.extend_paper_buttons_row
      });

      provideHass(paperButtons);

      let el = this.shadowRoot.querySelector("slot");
      if (el.parentElement) {
        if (el.parentElement.classList.contains("text-content")) {
          el = el.parentElement;
        } else {
          console.error("unexpected parent node found");
        }
      }

      if (this.config.extend_paper_buttons_row.position === "right") {
        insertAfter(paperButtons, el);
      } else {
        insertBefore(paperButtons, el);
      }
    }
  };

  fireEvent("ll-rebuild", {});
});

function insertBefore(node, element) {
  element.parentNode.insertBefore(node, element);
}

function insertAfter(node, element) {
  if (element.nextElementSibling) {
    insertBefore(node, element.nextElementSibling);
  } else {
    element.parentNode.appendChild(node);
  }
}
