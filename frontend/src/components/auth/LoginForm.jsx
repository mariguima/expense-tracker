import { useState } from "react";
import { login } from "../../api/authApi";
import Button from "../ui/Button";
import Input from "../ui/Input";

function LoginForm({ onLoginSuccess }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);

        try {
            const data = await login({ email, password });
            setEmail("");
            setPassword("");
            setError(null);
            onLoginSuccess?.(data);
        } catch (err) {
            const responseError = err.response?.data?.error || err.response?.data?.errors;
            setError(responseError ? JSON.stringify(responseError) : err.message || "Unable to log in.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form id="loginForm" onSubmit={onSubmit}>
            <h1>Login</h1>

            <label htmlFor="email">Email</label>
            <Input
                id="email"
                name="email"
                type="email"
                value={email}
                required
                disabled={processing}
                autoComplete="email"
                onChange={(e) => setEmail(e.currentTarget.value)}
            />

            <label htmlFor="password">Password</label>
            <Input
                id="password"
                name="password"
                type="password"
                value={password}
                required
                disabled={processing}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.currentTarget.value)}
            />

            {error && <p role="alert">{error}</p>}

            <Button type="submit" disabled={processing}>
                {processing ? "Checking credentials..." : "Login"}
            </Button>
        </form>
    );
}

export default LoginForm;
