import { ArrowRight } from "lucide-react";

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  icon = true,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`app-button ${variant}`}
    >
      {children}

      {icon && <ArrowRight size={17} />}
    </button>
  );
}