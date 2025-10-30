"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import '../globals.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Login form
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Register form
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      
      // Store token and username in cookies
      document.cookie = `token=${data.access}; path=/; max-age=900`;
      document.cookie = `refresh=${data.refresh}; path=/; max-age=900`;
      document.cookie = `username=${data.username}; path=/; max-age=900`;

      // Redirect to home
      router.push("/");
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (registerData.password !== registerData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }

    if (registerData.password.length < 8) {
      alert("Password must be at least 8 characters long!");
      return;
    }

    if (!registerData.email.includes("@")) {
      alert("Please enter a valid email address!");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerData.username,
          email: registerData.email,
          password: registerData.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail);
      }

      alert("Account created successfully! You can now login.");
      setIsLogin(true);
      setRegisterData({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      alert(error.message || "Registration failed. Username or email may already exist.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      {/* Decorative circles */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-indigo-200 rounded-full opacity-20 blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-200 rounded-full opacity-20 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-200 rounded-full opacity-10 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              {isLogin ? (
                <LogIn className="w-8 h-8" />
              ) : (
                <UserPlus className="w-8 h-8" />
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {isLogin ? "Welcome Back!" : "Create Account"}
            </h1>
            <p className="text-indigo-100 text-sm">
              {isLogin 
                ? "Login to continue your reading journey" 
                : "Join us to start tracking your webtoons"}
            </p>
          </div>

          {/* Toggle Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-4 text-center font-semibold transition-all ${
                isLogin
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-4 text-center font-semibold transition-all ${
                !isLogin
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              Register
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            {isLogin ? (
              // Login Form
              <div className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                      placeholder="Enter your username"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      onKeyPress={(e) => handleKeyPress(e, handleLogin)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>
              </div>
            ) : (
              // Register Form
              <div className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                      placeholder="Choose a username"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">At least 3 characters</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                      placeholder="Create a password"
                      className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      onKeyPress={(e) => handleKeyPress(e, handleRegister)}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push("/")}
            className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}