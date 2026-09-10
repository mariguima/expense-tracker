import "./Input.css";

export default function Input({
    id,
    type = "text",
    name,
    value,
    placeholder = "",
    required = false,
    disabled = false,
    autoComplete,
    onChange,
}) {
    return (
        <input
            className="input"
            id={id}
            type={type}
            name={name}
            value={value}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            onChange={onChange}
        />
    );
}
