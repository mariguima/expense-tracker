import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerNotFoundHandler } from "../../api/notFound.js";

export default function ApiErrorRedirect() {
  const navigate = useNavigate();

  useEffect(() => registerNotFoundHandler(() => {
    navigate("/404", { replace: true });
  }, () => navigate("/login", { replace: true })), [navigate]);

  return null;
}
