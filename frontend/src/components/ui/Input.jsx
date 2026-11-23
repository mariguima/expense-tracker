import { InputBase } from "../base/input/input";

export default function Input({ id, type = "text", name, value, placeholder = "", required = false, disabled = false, invalid = false, describedBy, icon, autoComplete, min, max, step, className = "", onChange }) {
  return (
    <InputBase
      id={id}
      type={type}
      icon={icon}
      name={name}
      value={value}
      placeholder={placeholder}
      isRequired={required}
      isDisabled={disabled}
      isInvalid={invalid}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      autoComplete={autoComplete}
      min={min}
      max={max}
      step={step}
      size="sm"
      wrapperClassName="app-input-shell"
      inputClassName={`app-input ${className}`.trim()}
      onChange={onChange}
    />
  );
}
