import { useEffect, useRef, useState } from "react";

export default function ConfirmButton({
  onConfirm,
  className = "",
  armedClassName,
  children,
  confirmText = "Bəli, silinsin",
  pending = false,
  pendingText = "Silinir...",
}: {
  onConfirm: () => void;
  className?: string;
  armedClassName?: string;
  children: React.ReactNode;
  confirmText?: string;
  pending?: boolean;
  pendingText?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  if (pending) {
    return (
      <button className={className} disabled>
        {pendingText}
      </button>
    );
  }

  if (!armed) {
    return (
      <button
        className={className}
        onClick={() => {
          setArmed(true);
          timer.current = window.setTimeout(() => setArmed(false), 10000);
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={armedClassName ?? "rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white"}
      onClick={() => {
        if (timer.current) window.clearTimeout(timer.current);
        setArmed(false);
        onConfirm();
      }}
    >
      {confirmText}
    </button>
  );
}
