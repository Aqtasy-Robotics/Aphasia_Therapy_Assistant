import React, { useState } from "react";
import { Link } from "react-router-dom";
import black_logo from "../assets/black_logo.svg";

const AuthPage = ({ type }) => {
  const [role, setRole] = useState("patient");
  const isLogin = type === "login";

  const themeColor = role === "therapist" ? "bg-[#5cb338]" : "bg-[#4f6ef7]";
  const textColor = role === "therapist" ? "text-[#5cb338]" : "text-[#4f6ef7]";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f9ff] to-[#f0fff4] px-4 py-12">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-10 border border-gray-100">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={black_logo}
            alt="Aqtasy Robotics Logo"
            className="h-24 w-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-gray-800">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isLogin
              ? "Sign in to your account"
              : "Sign up to get started with Aphasia Therapy"}
          </p>
        </div>

        {/* Role Toggle Switch */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
          <button
            onClick={() => setRole("patient")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              role === "patient"
                ? "bg-[#4f6ef7] text-white shadow-md"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {isLogin ? "I am a Patient" : "Patient"}
          </button>
          <button
            onClick={() => setRole("therapist")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              role === "therapist"
                ? "bg-[#5cb338] text-white shadow-md"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {isLogin ? "I am a Therapist" : "Therapist"}
          </button>
        </div>

        {/* Form */}
        <form className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-gray-100 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">
              {isLogin ? "Email" : "Email Address"}
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-gray-100 outline-none transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">
              Password
            </label>
            <input
              type="password"
              placeholder={isLogin ? "••••••••" : "At least 8 characters"}
              className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-gray-100 outline-none transition-all placeholder:text-gray-400"
            />
            {isLogin && (
              <div className="text-right mt-2">
                <Link
                  to="/forgot-password"
                  className={`text-xs font-semibold ${textColor} hover:opacity-80`}
                >
                  Forgot Password?
                </Link>
              </div>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 ml-1">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Re-enter your password"
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 focus:bg-white focus:border-gray-200 focus:ring-2 focus:ring-gray-100 outline-none transition-all placeholder:text-gray-400"
              />
              <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                By creating an account, you agree to our{" "}
                <span className={textColor}>Terms of Service</span> and{" "}
                <span className={textColor}>Privacy Policy</span>
              </p>
            </div>
          )}

          <button
            className={`w-full ${themeColor} text-white font-bold py-3.5 rounded-xl shadow-lg hover:brightness-105 active:scale-[0.98] transition-all mt-4`}
          >
            {isLogin
              ? `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`
              : `Create ${
                  role.charAt(0).toUpperCase() + role.slice(1)
                } Account`}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link
              to={isLogin ? "/signup" : "/login"}
              className={`font-bold ${textColor} hover:opacity-80`}
            >
              {isLogin ? "Create Account" : "Log In"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
