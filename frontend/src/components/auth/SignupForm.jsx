import { useState } from "react";
import { signup } from "../../api/authApi";
import Button from "../ui/Button";
import Input from "../ui/Input";

function SignupForm({ onSignupSuccess }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        setError(null);

        try {
            const data = await signup({ name, email, password });
            setName("");
            setEmail("");
            setPassword("");
            setError(null);
            onSignupSuccess?.(data);
        } catch (err) {
            const responseError = err.response?.data?.error || err.response?.data?.errors;
            setError(responseError ? JSON.stringify(responseError) : err.message || "Unable to sign up.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <form id="signupForm" onSubmit={onSubmit}>
            <h1>Sign Up</h1>

            <label htmlFor="name">Name</label>
            <Input
                id="name"
                name="name"
                type="text"
                value={name}
                required
                disabled={processing}
                onChange={(e) => setName(e.currentTarget.value)}
            />

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
                autoComplete="new-password"
                onChange={(e) => setPassword(e.currentTarget.value)}
            />

            {error && <p role="alert">{error}</p>}

            <Button type="submit" disabled={processing}>
                {processing ? "Creating account..." : "Sign Up"}
            </Button>
        </form>
    );
}

export default SignupForm;
