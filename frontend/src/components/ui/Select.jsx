import { Select as UntitledSelect } from "../base/select/select";

export default function Select({ id, name, value, options = [], placeholder = "Select an option", disabled = false, required = false, invalid = false, describedBy, className = "", onChange }) {
  return (
    <UntitledSelect
      id={id}
      name={name}
      selectedKey={value || null}
      isDisabled={disabled}
      isRequired={required}
      isInvalid={invalid}
      aria-describedby={describedBy}
      aria-label={placeholder}
      placeholder={placeholder}
      size="sm"
      className={`app-select ${className}`.trim()}
      popoverClassName="app-select-popover"
      onSelectionChange={(key) => onChange?.({ target: { name, value: String(key) }, currentTarget: { name, value: String(key) } })}
    >
      {options.map((option) => <UntitledSelect.Item key={option.value} id={option.value} label={option.label}>{option.label}</UntitledSelect.Item>)}
    </UntitledSelect>
  );
}
