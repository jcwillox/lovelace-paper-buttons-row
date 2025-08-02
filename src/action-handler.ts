import {
  type ActionHandlerDetail,
  type ActionHandlerOptions,
  fireEvent,
} from "custom-card-helpers";
import deepEqual from "fast-deep-equal";
import { noChange } from "lit";
import {
  type AttributePart,
  Directive,
  type DirectiveParameters,
  directive,
} from "lit/directive.js";

declare global {
  interface Navigator {
    msMaxTouchPoints: number;
  }
}

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  navigator.msMaxTouchPoints > 0;

export interface CustomActionHandlerOptions extends ActionHandlerOptions {
  disabled?: boolean;
  repeat?: number;
}

interface Ripple extends HTMLElement {
  primary: boolean;
  disabled: boolean;
  unbounded: boolean;
  startPress: () => void;
  endPress: () => void;
}

interface IActionHandler extends HTMLElement {
  holdTime: number;
  bind: (
    element: ActionHandlerElement,
    options?: CustomActionHandlerOptions,
  ) => void;
}

interface ActionHandlerElement extends HTMLElement {
  actionHandler?: {
    options: ActionHandlerOptions;
    start?: (ev: Event) => void;
    end?: (ev: Event) => void;
    handleKeyDown?: (ev: KeyboardEvent) => void;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "action-handler": ActionHandler;
  }

  interface HASSDomEvents {
    action: ActionHandlerDetail;
  }
}

class ActionHandler extends HTMLElement implements IActionHandler {
  public holdTime = 500;

  public ripple: Ripple;

  protected timer?: number;

  protected held = false;

  private cancelled = false;

  private dblClickTimeout?: number;

  private repeatTimeout: NodeJS.Timeout | undefined;

  private isRepeating = false;

  constructor() {
    super();
    this.ripple = document.createElement("mwc-ripple") as Ripple;
  }

  public connectedCallback(): void {
    Object.assign(this.style, {
      position: "fixed",
      width: isTouch ? "100px" : "50px",
      height: isTouch ? "100px" : "50px",
      transform: "translate(-50%, -50%) scale(0)",
      pointerEvents: "none",
      zIndex: "999",
      background: "var(--primary-color)",
      display: null,
      opacity: "0.2",
      borderRadius: "50%",
      transition: "transform 180ms ease-in-out",
    });

    this.appendChild(this.ripple);
    this.ripple.primary = true;

    for (const ev of [
      "touchcancel",
      "mouseout",
      "mouseup",
      "touchmove",
      "mousewheel",
      "wheel",
      "scroll",
    ]) {
      document.addEventListener(
        ev,
        () => {
          this.cancelled = true;
          if (this.timer) {
            this._stopAnimation();
            clearTimeout(this.timer);
            this.timer = undefined;
            if (this.isRepeating && this.repeatTimeout) {
              clearInterval(this.repeatTimeout);
              this.isRepeating = false;
            }
          }
        },
        { passive: true },
      );
    }
  }

  public bind(
    element: ActionHandlerElement,
    options: CustomActionHandlerOptions = {},
  ): void {
    if (
      element.actionHandler &&
      deepEqual(options, element.actionHandler.options)
    ) {
      return;
    }

    if (element.actionHandler) {
      if (element.actionHandler.start) {
        element.removeEventListener("touchstart", element.actionHandler.start);
        element.removeEventListener("mousedown", element.actionHandler.start);
      }
      if (element.actionHandler.end) {
        element.removeEventListener("touchend", element.actionHandler.end);
        element.removeEventListener("touchcancel", element.actionHandler.end);
        element.removeEventListener("click", element.actionHandler.end);
      }
      if (element.actionHandler.handleKeyDown) {
        element.removeEventListener(
          "keydown",
          element.actionHandler.handleKeyDown,
        );
      }
    } else {
      element.addEventListener("contextmenu", (ev: Event) => {
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
    }

    element.actionHandler = { options };

    if (options.disabled) {
      return;
    }

    element.actionHandler.start = (ev: Event) => {
      ev.stopPropagation();
      this.cancelled = false;
      let x: number;
      let y: number;
      if ((ev as TouchEvent).touches) {
        x = (ev as TouchEvent).touches[0].clientX;
        y = (ev as TouchEvent).touches[0].clientY;
      } else {
        x = (ev as MouseEvent).clientX;
        y = (ev as MouseEvent).clientY;
      }

      if (options.hasHold) {
        this.held = false;
        this.timer = window.setTimeout(() => {
          this._startAnimation(x, y);
          this.held = true;
          if (options.repeat && !this.isRepeating) {
            this.isRepeating = true;
            this.repeatTimeout = setInterval(() => {
              fireEvent(element, "action", { action: "hold" });
            }, options.repeat);
          }
        }, this.holdTime);
      }
    };

    element.actionHandler.end = (ev: Event) => {
      ev.stopPropagation();
      // Don't respond when moved or scrolled while touch
      if (
        ev.type === "touchcancel" ||
        (ev.type === "touchend" && this.cancelled)
      ) {
        if (this.isRepeating && this.repeatTimeout) {
          clearInterval(this.repeatTimeout);
          this.isRepeating = false;
        }
        return;
      }
      const target = ev.target as HTMLElement;
      // Prevent mouse event if touch event
      if (ev.cancelable) {
        ev.preventDefault();
      }
      if (options.hasHold) {
        clearTimeout(this.timer);
        if (this.isRepeating && this.repeatTimeout) {
          clearInterval(this.repeatTimeout);
        }
        this.isRepeating = false;
        this._stopAnimation();
        this.timer = undefined;
      }
      if (options.hasHold && this.held) {
        if (!options.repeat) {
          fireEvent(target, "action", { action: "hold" });
        }
      } else if (options.hasDoubleClick) {
        if (
          (ev.type === "click" && (ev as MouseEvent).detail < 2) ||
          !this.dblClickTimeout
        ) {
          this.dblClickTimeout = window.setTimeout(() => {
            this.dblClickTimeout = undefined;
            fireEvent(target, "action", { action: "tap" });
          }, 250);
        } else {
          clearTimeout(this.dblClickTimeout);
          this.dblClickTimeout = undefined;
          fireEvent(target, "action", { action: "double_tap" });
        }
      } else {
        fireEvent(target, "action", { action: "tap" });
      }
    };

    element.actionHandler.handleKeyDown = (ev: KeyboardEvent) => {
      if (!["Enter", " "].includes(ev.key)) {
        return;
      }
      (ev.currentTarget as ActionHandlerElement).actionHandler?.end?.(ev);
    };

    element.addEventListener("touchstart", element.actionHandler.start, {
      passive: true,
    });
    element.addEventListener("touchend", element.actionHandler.end);
    element.addEventListener("touchcancel", element.actionHandler.end);

    element.addEventListener("mousedown", element.actionHandler.start, {
      passive: true,
    });
    element.addEventListener("click", element.actionHandler.end);

    element.addEventListener("keydown", element.actionHandler.handleKeyDown);
  }

  private _startAnimation(x: number, y: number) {
    Object.assign(this.style, {
      left: `${x}px`,
      top: `${y}px`,
      transform: "translate(-50%, -50%) scale(1)",
    });
    this.ripple.disabled = false;
    this.ripple.startPress();
    this.ripple.unbounded = true;
  }

  private _stopAnimation() {
    this.ripple.endPress();
    this.ripple.disabled = true;
    Object.assign(this.style, {
      left: null,
      top: null,
      transform: "translate(-50%, -50%) scale(0)",
    });
  }
}

customElements.define("paper-buttons-row-action-handler", ActionHandler);

const getActionHandler = (): ActionHandler => {
  const body = document.body;
  if (body.querySelector("paper-buttons-row-action-handler")) {
    return body.querySelector(
      "paper-buttons-row-action-handler",
    ) as ActionHandler;
  }

  const actionHandler = document.createElement(
    "paper-buttons-row-action-handler",
  );
  body.appendChild(actionHandler);

  return actionHandler as ActionHandler;
};

export const actionHandlerBind = (
  element: ActionHandlerElement,
  options?: CustomActionHandlerOptions,
): void => {
  const actionHandler: ActionHandler = getActionHandler();
  if (!actionHandler) {
    return;
  }
  actionHandler.bind(element, options);
};

export const actionHandler = directive(
  class extends Directive {
    update(part: AttributePart, [options]: DirectiveParameters<this>) {
      actionHandlerBind(part.element as ActionHandlerElement, options);
      return noChange;
    }

    render(_options?: CustomActionHandlerOptions) {}
  },
);
