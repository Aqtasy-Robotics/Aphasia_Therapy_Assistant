import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// 1. Import your Firebase tools
import { auth, db, googleProvider } from "../firebase"; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import black_logo from "../assets/black_logo.svg";

const AuthPage = ({ type }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState("patient");
  const isLogin = type === "login";

  // 2. Add State for form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");

  const themeColor = role === "therapist" ? "bg-[#5cb338]" : "bg-[#4f6ef7]";
  const textColor = role === "therapist" ? "text-[#5cb338]" : "text-[#4f6ef7]";

  // 3. Email/Password Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        // Save user role to Firestore
        await setDoc(doc(db, "users", res.user.uid), {
          uid: res.user.uid,
          fullName,
          email,
          role,
          createdAt: new Date(),
        });
      }
      navigate("/dashboard"); // Send user to dashboard after success
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  // 4. Google Sign-In Logic
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if they already exist so we don't overwrite their role
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (!docSnap.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          fullName: user.displayName,
          email: user.email,
          role: role, 
          createdAt: new Date(),
        });
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f9ff] to-[#f0fff4] px-4 py-12">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <img src={black_logo} alt="Aqtasy Robotics Logo" className="h-20 w-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">{isLogin ? "Welcome Back" : "Create Account"}</h2>
          {error && <p className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded w-full">{error}</p>}
        </div>

        {/* Role Toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
          <button onClick={() => setRole("patient")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${role === "patient" ? "bg-[#4f6ef7] text-white" : "text-gray-500"}`}>Patient</button>
          <button onClick={() => setRole("therapist")} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${role === "therapist" ? "bg-[#5cb338] text-white" : "text-gray-500"}`}>Therapist</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input 
              type="text" 
              placeholder="Full Name" 
              required 
              className="w-full bg-gray-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <input 
            type="email" 
            placeholder="Email Address" 
            required 
            className="w-full bg-gray-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Password" 
            required 
            className="w-full bg-gray-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className={`w-full ${themeColor} text-white font-bold py-3.5 rounded-xl shadow-lg mt-2`}>
            {isLogin ? "Sign In" : "Create Account"}
          </button>

          {/* Google Button */}
          <button 
            type="button" 
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 mt-4"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
            Continue with Google
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link to={isLogin ? "/signup" : "/login"} className={`font-bold ${textColor}`}>
            {isLogin ? "Create Account" : "Log In"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;