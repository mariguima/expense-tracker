import "./Select.css";

export default function Select({
    name,
    value,
    options = [],
    placeholder = "Select an option",
    disabled = false,
    onChange,
}) {
    return (
        <select
            className="select"
            name={name}
            value={value}
            disabled={disabled}
            onChange={onChange}
        >
            <option value="" disabled>
                {placeholder}
            </option>

            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
