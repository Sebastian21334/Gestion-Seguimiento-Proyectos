"use client";

import { useId, useRef, useState, type RefObject } from "react";

function PasswordInput({
  name,
  label,
  placeholder,
  inputRef,
  onChange,
}: {
  name: "password" | "confirmPassword";
  label: string;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const toggleLabel = `${visible ? "Ocultar" : "Mostrar"} ${name === "password" ? "contraseña" : "confirmación de contraseña"}`;

  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input
          id={id}
          ref={inputRef}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={10}
          maxLength={72}
          placeholder={placeholder}
          onChange={onChange}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={toggleLabel}
          aria-controls={id}
          aria-pressed={visible}
          title={toggleLabel}
          onClick={() => setVisible((value) => !value)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </div>
  );
}

export function RegistrationPasswordFields() {
  const password = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);
  function validateConfirmation() {
    const input = confirmation.current;
    if (input)
      input.setCustomValidity(
        input.value && input.value !== password.current?.value
          ? "Las contraseñas no coinciden."
          : "",
      );
  }
  return (
    <>
      <PasswordInput
        name="password"
        label="Contraseña"
        placeholder="Al menos 10 caracteres"
        inputRef={password}
        onChange={validateConfirmation}
      />
      <PasswordInput
        name="confirmPassword"
        label="Repetí la contraseña"
        placeholder="Ingresá la misma contraseña"
        inputRef={confirmation}
        onChange={validateConfirmation}
      />
    </>
  );
}
