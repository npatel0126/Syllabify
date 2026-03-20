"use client";

import React from "react";

type InputVariant = "default" | "error" | "success";

export default function Input({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  error,
  variant = "default",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  variant?: InputVariant;
}) {
  const border =
    variant === "error"
      ? "border-red-500 focus:ring-red-500/20"
      : variant === "success"
        ? "border-green-500 focus:ring-green-500/20"
        : "border-neutral-400/60 focus:ring-primary-blue/25";

  return (
    <label className="block">
      {label ? <div className="text-sm font-semibold mb-1 text-neutral-200">{label}</div> : null}
      <input
        {...props}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={[
          "w-full rounded-md bg-neutral-800/40 px-3 py-2 outline-none border focus:ring-2",
          border
        ].join(" ")}
      />
      {error ? <div className="mt-1 text-sm text-red-400">{error}</div> : helperText ? <div className="mt-1 text-sm text-neutral-400">{helperText}</div> : null}
    </label>
  );
}

