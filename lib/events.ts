// client/lib/events.ts
import { MediaAction, GestureName } from "./constants";

export const Events = {
  move: (dx: number, dy: number) => ({
    type: "move",
    dx,
    dy,
    ts: Date.now(),
  }),
  
  click: (button: "left" | "right" | "middle" = "left") => ({
    type: "click",
    button,
  }),
  
  mouseDown: (button: "left" | "right" | "middle" = "left") => ({
    type: "mouse_down",
    button,
  }),
  
  mouseUp: (button: "left" | "right" | "middle" = "left") => ({
    type: "mouse_up",
    button,
  }),
  
  dblclick: (button: "left" = "left") => ({
    type: "dblclick",
    button,
  }),
  
  scroll: (dx: number, dy: number) => ({
    type: "scroll",
    dx,
    dy,
  }),
  
  key: (key: string) => ({
    type: "key",
    key,
  }),
  
  text: (value: string) => ({
    type: "text",
    value,
  }),
  
  media: (action: MediaAction) => ({
    type: "media",
    action,
  }),
  
  gesture: (name: GestureName) => ({
    type: "gesture",
    name,
  }),
  
  ping: () => ({
    type: "ping",
    ts: Date.now(),
  }),
};
export type PhonePadEvent = ReturnType<typeof Events[keyof typeof Events]>;
