import { Button as UntitledButton } from "../base/buttons/button";

export default function Button({ children, type = "button", variant = "primary", size = "sm", disabled = false, className = "", onClick, ...props }) {
  return (
    <UntitledButton
      type={type}
      color={variant}
      size={size}
      isDisabled={disabled}
      className={`app-button ${className}`.trim()}
      onPress={onClick}
      {...props}
    >
      {children}
    </UntitledButton>
  );
}
