import { defineStore } from "pinia";
import { ref } from "vue";

export type ToastKind = "success" | "error" | "booster";

export interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}

const TOAST_LIFETIME_MS = 4000;

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<ToastEntry[]>([]);
  let uid = 0;

  function push(kind: ToastKind, message: string): number {
    const id = uid++;
    toasts.value.push({ id, kind, message });
    setTimeout(() => dismiss(id), TOAST_LIFETIME_MS);
    return id;
  }

  function dismiss(id: number) {
    const i = toasts.value.findIndex((toast) => toast.id === id);
    if (i !== -1) toasts.value.splice(i, 1);
  }

  return { toasts, push, dismiss };
});
