"use client";

import React, { createContext, useState, useEffect } from "react";
import axiosInstance from "./axiosInstance"; // Ensure axiosInstance is correctly configured
import toast from "react-hot-toast";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Holds authenticated user data
  const [loading, setLoading] = useState(true); // Indicates if the auth check is in progress

  // Function to fetch authenticated user info.
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token"); // Adjust based on where you store the token

      if (token) {
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        const response = await axiosInstance.get("/api/auth/me");

        if (response.data.success) {
          setUser(response.data.user);
        } else {
          setUser(null);
          delete axiosInstance.defaults.headers.common["Authorization"];
        }
      } else {
        delete axiosInstance.defaults.headers.common["Authorization"];
        setUser(null);
      }
    } catch (error) {
      console.error("AuthContext fetchUser error:", error);
      setUser(null);
      delete axiosInstance.defaults.headers.common["Authorization"];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, fetchUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
