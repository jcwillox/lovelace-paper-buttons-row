import { fireEvent } from "card-tools/src/event";

export function forwardHaptic(hapticType) {
  fireEvent("haptic", hapticType, window);
}
