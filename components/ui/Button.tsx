"use client";

import React from "react";
import Spinner from "@/components/ui/Spinner";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}) {
  const sizeClasses = size === "sm" ? "px-3 py-1.5 text-sm" : size === "lg" ? "px-5 py-3 text-base" : "px-4 py-2 text-sm";

  const variantClasses =
    variant === "primary"
      ? "bg-primary-blue text-white hover:brightness-110"
      : variant === "secondary"
        ? "border border-primary-blue/40 text-primary-blue hover:bg-primary-blue/10"
        : variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : "text-primary-blue hover:bg-primary-blue/10";

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={[
        "rounded-md font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2",
        sizeClasses,
        variantClasses,
        className
      ].join(" ")}
    >
      {isLoading ? <Spinner size={size === "sm" ? "sm" : size === "lg" ? "lg" : "md"} /> : null}
      {children}
    </button>
  );
}

