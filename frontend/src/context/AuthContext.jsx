import { useEffect, useState, useContext, createContext } from "react";
import api from "../api/axiosConfig.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await api.get("/users/me");
      setUser(res?.data?.data?.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // runs ONCE on app load
  useEffect(() => {
    fetchMe();
  }, []);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Proceed with logout even if request fails
      console.error("Logout request failed:", error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        setUser,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
