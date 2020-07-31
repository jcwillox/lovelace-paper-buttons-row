import { fireEvent } from "card-tools/src/event";

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.msMaxTouchPoints > 0;

class ActionHandler extends HTMLElement {
  constructor() {
    super();
    this.holdTime = 500;
    this.held = false;
    this.isRepeating = false;
    this.ripple = document.createElement("mwc-ripple");
  }
  connectedCallback() {
    Object.assign(this.style, {
      position: "absolute",
      width: isTouch ? "100px" : "50px",
      height: isTouch ? "100px" : "50px",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: 999
    });
    this.appendChild(this.ripple);
    this.ripple.primary = true;
    [
      "touchcancel",
      "mouseout",
      "mouseup",
      "touchmove",
      "mousewheel",
      "wheel",
      "scroll"
    ].forEach(ev => {
      document.addEventListener(
        ev,
        () => {
          clearTimeout(this.timer);
          this.stopAnimation();
          this.timer = undefined;
        },
        { passive: true }
      );
    });
  }

  bind(element, options) {
    if (element.actionHandler) {
      return;
    }

    element.actionHandler = true;

    element.addEventListener("contextmenu", ev => {
      const e = ev || window.event;
      if (e.preventDefault) {
        e.preventDefault();
      }
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      e.cancelBubble = true;
      e.returnValue = false;
      return false;
    });

    const start = ev => {
      this.held = false;
      let x;
      let y;
      if (ev.touches) {
        x = ev.touches[0].pageX;
        y = ev.touches[0].pageY;
      } else {
        x = ev.pageX;
        y = ev.pageY;
      }
      this.timer = window.setTimeout(() => {
        this.startAnimation(x, y);
        this.held = true;
        if (options.repeat && !this.isRepeating) {
          this.isRepeating = true;
          this.repeatTimeout = setInterval(() => {
            fireEvent("action", { action: "hold" }, element);
          }, options.repeat);
        }
      }, this.holdTime);
    };

    const handleEnter = ev => {
      if (ev.keyCode !== 13) {
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      end(ev);
    };

    const end = ev => {
      // Prevent mouse event if touch event
      ev.preventDefault();
      if (
        ["touchend", "touchcancel"].includes(ev.type) &&
        this.timer === undefined
      ) {
        if (this.isRepeating && this.repeatTimeout) {
          clearInterval(this.repeatTimeout);
          this.isRepeating = false;
        }
        return;
      }
      clearTimeout(this.timer);
      if (this.isRepeating && this.repeatTimeout) {
        clearInterval(this.repeatTimeout);
      }
      this.isRepeating = false;
      this.stopAnimation();
      this.timer = undefined;
      if (this.held) {
        if (!options.repeat) {
          fireEvent("action", { action: "hold" }, element);
        }
      } else if (options.hasDoubleClick) {
        if ((ev.type === "click" && ev.detail < 2) || !this.dblClickTimeout) {
          this.dblClickTimeout = window.setTimeout(() => {
            this.dblClickTimeout = undefined;
            fireEvent("action", { action: "tap" }, element);
          }, 250);
        } else {
          clearTimeout(this.dblClickTimeout);
          this.dblClickTimeout = undefined;
          fireEvent("action", { action: "double_tap" }, element);
        }
      } else {
        fireEvent("action", { action: "tap" }, element);
      }
    };
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", end);
    element.addEventListener("mousedown", start, { passive: true });
    element.addEventListener("click", end);
    element.addEventListener("keyup", handleEnter);
  }

  startAnimation(x, y) {
    Object.assign(this.style, {
      left: `${x}px`,
      top: `${y}px`,
      display: null
    });
    this.ripple.disabled = false;
    this.ripple.startPress
      ? this.ripple.startPress()
      : (this.ripple.active = true); // = true;
    this.ripple.unbounded = true;
  }

  stopAnimation() {
    if (this.ripple.endPress) {
      this.ripple.endPress();
    } else {
      this.ripple.active = false;
    }
    this.ripple.disabled = true;
    this.style.display = "none";
  }
}

customElements.define("paper-buttons-row-action-handler", ActionHandler);

const getActionHandler = () => {
  const body = document.body;
  if (body.querySelector("paper-buttons-row-action-handler")) {
    return body.querySelector("paper-buttons-row-action-handler");
  }
  const actionhandler = document.createElement(
    "paper-buttons-row-action-handler"
  );
  body.appendChild(actionhandler);
  return actionhandler;
};

export const actionHandlerBind = (element, options) => {
  const actionhandler = getActionHandler();
  if (!actionhandler) {
    return;
  }
  actionhandler.bind(element, options);
};
