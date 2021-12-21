import { fireEvent } from "custom-card-helpers";

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
  // @ts-ignore
  return fireEvent(el, "hass-notification", params);
};
