import { fireEvent } from "card-tools/src/event";
import { createEntityRow } from "card-tools/src/lovelace-element";
import { provideHass } from "card-tools/src/hass";

const ELEMENT = "hui-generic-entity-row";

customElements.whenDefined(ELEMENT).then(() => {
  const Element = customElements.get(ELEMENT);
  const oFirstUpdated = Element.prototype.firstUpdated;

  Element.prototype.firstUpdated = function(changedProperties) {
    oFirstUpdated.call(this, changedProperties);

    if (this.config.extend_paper_buttons_row) {
      let paperButtons = createEntityRow({
        type: "custom:paper-buttons-row",
        ...this.config.extend_paper_buttons_row
      });

      provideHass(paperButtons);

      if (this.config.extend_paper_buttons_row.position === "right") {
        this.appendChild(paperButtons);
      } else {
        this.insertBefore(paperButtons, this.firstElementChild);
      }
    }
  };

  fireEvent("ll-rebuild", {});
});
