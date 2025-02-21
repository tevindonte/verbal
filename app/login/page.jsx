"use client";

import React, { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
// Import your AuthContext (adjust the path if needed)
import { AuthContext } from "../components/AuthContext";

export default function LoginPage() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { setUser } = useContext(AuthContext);
  
  const loginUser = async () => {
    const userObj = { email, password };
    try {
      toast.loading("Logging in...");
      const response = await axios.post("https://verbalitserver.onrender.com/api/auth/login", userObj, { withCredentials: true });
      toast.dismiss();
      if (response.data.success) {
        toast.success(response.data.message);
        setUser(response.data.data);
        router.push("/");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  const sendResetPasswordLink = async () => {
    try {
      toast.loading("Sending reset link...");
      await axios.post("https://verbalitserver.onrender.com/api/auth/send-password-reset-link", { email });
      toast.dismiss();
      toast.success("Reset password link sent successfully");
      setShowForgotPassword(false);
    } catch (error) {
      toast.dismiss();
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="bg-[#080606] font-SecularOne flex flex-col items-center min-h-screen pt-6 sm:justify-center sm:pt-0">
      <Toaster />
      {!showForgotPassword ? (
        <div className="w-full border-2 border-[#FEAB1D] bg-[#D02530] px-6 py-4 mt-6 overflow-hidden shadow-md sm:max-w-lg sm:rounded-lg">
          {/* Email Input */}
          <div className="mt-4">
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email
            </label>
            <div className="flex flex-col items-start">
              <input
                type="email"
                name="email"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mt-4">
            <label htmlFor="password" className="block text-sm font-medium text-white">
              Password
            </label>
            <div className="flex flex-col items-start">
              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                required
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
          </div>

          {/* Login Button */}
          <div className="flex items-center mt-4">
            <button
              className="w-full px-4 py-2 tracking-wide text-black transition-colors duration-200 transform bg-[#FEAB1D] rounded-md hover:bg-[#F5F5F7] focus:outline-none focus:bg-black"
              onClick={loginUser}
            >
              Log in
            </button>
          </div>

          {/* Forgot Password Link */}
          <div className="pt-3 py-5 hover:underline cursor-pointer text-white flex text-sm justify-center items-center">
            <span onClick={() => setShowForgotPassword(true)}>Forgot Password?</span>
          </div>

          {/* Register Link */}
          <div className="py-4 flex justify-center">
            <Link href="/register">
              <span className="w-full px-4 py-2 tracking-wide text-black transition-colors duration-200 transform bg-[#F5F5F7] rounded-md hover:bg-[#CDDBFE] focus:outline-none focus:bg-black text-center">
                Register
              </span>
            </Link>
          </div>
        </div>
      ) : (
        // Forgot Password Form
        <div className="w-full border-2 border-[#FEAB1D] bg-[#D02530] px-6 py-4 mt-6 overflow-hidden shadow-md sm:max-w-lg sm:rounded-lg">
          <div className="mt-4">
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email
            </label>
            <div className="flex flex-col items-start">
              <input
                type="email"
                name="email"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
                className="block w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            </div>
          </div>
          <div className="flex flex-col justify-between items-end space-y-5">
            <button
              className="w-full px-4 py-2 text-white rounded-md bg-black"
              onClick={sendResetPasswordLink}
            >
              SEND RESET PASSWORD LINK
            </button>
          </div>
          <div className="py-2 flex justify-center">
            <span
              onClick={() => setShowForgotPassword(false)}
              className="cursor-pointer underline text-md text-white"
            >
              Click Here To Login
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
