import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerAuthCrossTabNavigate } from "../lib/authSync";

export function AuthCrossTabBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    registerAuthCrossTabNavigate((path, options) => navigate(path, options));
    return () => registerAuthCrossTabNavigate(null);
  }, [navigate]);
  return null;
}