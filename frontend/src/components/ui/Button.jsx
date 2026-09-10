import "./Button.css";

export default function Button({
    children,
    type = "button",
    variant = "primary",
    size = "md",
    disabled = false,
    onClick
}) {
    return(
        <button
            type={type}
            className={`btn btn-${variant} btn-${size}`}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    )
}


