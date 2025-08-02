import { fireEvent } from "custom-card-helpers";

declare global {
  interface HASSDomEvents {
    "hass-notification": ShowToastParams;
  }
}

export interface ShowToastParams {
  message: string;
  action?: ToastActionParams;
  duration?: number;
  dismissable?: boolean;
}

export interface ToastActionParams {
  action: () => void;
  text: string;
}

export const showToast = (el: HTMLElement, params: ShowToastParams) => {
  return fireEvent(el, "hass-notification", params);
};

export const arrayToObject = (data) =>
  Array.isArray(data)
    ? data.reduce((obj, item) => Object.assign(obj, item), {})
    : data;
