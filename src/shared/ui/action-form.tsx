"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { FormAction } from "./action-state";

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Guardando…",
  className = "form-stack",
  onSuccess,
  resetOnSuccess = false,
  confirmMessage,
  variant = "primary",
}: {
  action: FormAction;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  className?: string;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
  confirmMessage?: string;
  variant?: "primary" | "secondary" | "danger" | "quiet";
}) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
    message: "",
  });
  const form = useRef<HTMLFormElement>(null);
  const handled = useRef(state);
  useEffect(() => {
    if (handled.current === state) return;
    handled.current = state;
    if (state.success) {
      if (resetOnSuccess) form.current?.reset();
      onSuccess?.();
    }
  }, [state, onSuccess, resetOnSuccess]);
  return (
    <form
      ref={form}
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage))
          event.preventDefault();
      }}
    >
      <fieldset disabled={pending} className="form-fields">
        {children}
      </fieldset>
      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={`notice ${state.success ? "notice-success" : "notice-error"}`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        className={`button button-${variant}`}
        disabled={pending}
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
