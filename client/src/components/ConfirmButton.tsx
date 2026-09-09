import { useEffect, useRef, useState } from "react";

export default function ConfirmButton({
  onConfirm,
  className = "",
  children,
  confirmText = "Əminsən?",
}: {
  onConfirm: () => void;
  className?: string;
  children: React.ReactNode;
  confirmText?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  if (!armed) {
    return (
      <button
        className={className}
        onClick={() => {
          setArmed(true);
          timer.current = window.setTimeout(() => setArmed(false), 4000);
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={className}
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
