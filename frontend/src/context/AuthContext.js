import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    // Only check auth status, don't treat 401 as error
    axios.get("/api/auth/me")
      .then((res) => setUser(res.data))
      .catch((err) => {
        // Silently handle 401/403 - user is just not logged in
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          setUser(null);
        } else {
          // Only log actual errors, not auth failures
          console.error("Auth check failed:", err);
          setUser(null);
        }
      });
  }, []);

  const login = async (email, password) => {
    const res = await axios.post("/api/auth/login", { email, password });
    setUser(res.data);
    return res.data;
  };

  const sendOtp = async (email) => {
    await axios.post("/api/auth/send-otp", { email });
  };

  const register = async (email, password, otp) => {
    const res = await axios.post("/api/auth/register", { email, password, otp });
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await axios.post("/api/auth/logout");
    setUser(null);
  };

  const deleteAccount = async (password) => {
    await axios.post("/api/auth/delete-account", { password });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, deleteAccount, sendOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
