import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db, googleProvider, sendPasswordReset } from "../firebase"; 
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import black_logo from "../assets/black_logo.svg";

const AuthPage = ({ type }) => {
  const navigate = useNavigate();
  const isLogin = type === "login";

  // State Management
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // New states for Google Sign-In Name Collection
  const [showNameField, setShowNameField] = useState(false);
  const [tempUser, setTempUser] = useState(null);

  const themeColor = role === "therapist" ? "bg-[#5cb338]" : "bg-[#4f6ef7]";
  const textColor = role === "therapist" ? "text-[#5cb338]" : "text-[#4f6ef7]";

  // Helper function to save user to Firestore and Navigate
  const saveAndNavigate = async (user, nameToSave) => {
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: nameToSave,
        email: user.email,
        role: role,
        createdAt: new Date(),
      });
      navigate(role === 'therapist' ? "/dashboard" : "/patient-dashboard");
    } catch (err) {
      setError("Failed to save profile: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetMessage("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        const user = auth.currentUser;
        const docSnap = await getDoc(doc(db, "users", user.uid));
        
        if (docSnap.exists() && docSnap.data().role === 'therapist') {
          navigate("/dashboard");
        } else {
          navigate("/patient-dashboard");
        }
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await saveAndNavigate(res.user, fullName);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const docSnap = await getDoc(doc(db, "users", user.uid));
      
      if (!docSnap.exists()) {
        // If Google provides a name, we can use it, or force them to confirm
        if (!user.displayName) {
          setTempUser(user);
          setShowNameField(true); // Switch UI to name entry
        } else {
          await saveAndNavigate(user, user.displayName);
        }
      } else {
        const userRole = docSnap.data().role;
        navigate(userRole === 'therapist' ? "/dashboard" : "/patient-dashboard");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset your password.");
      return;
    }
    setError("");
    setResetMessage("");
    
    const result = await sendPasswordReset(email);
    if (result.success) {
      setResetMessage("Password reset link sent! Please check your inbox.");
    } else {
      setError(result.error.replace("Firebase: ", ""));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f9ff] to-[#f0fff4] px-4 py-12">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
        
        <div className="flex flex-col items-center mb-8 text-center">
          <img src={black_logo} alt="Aqtasy Robotics Logo" className="h-20 w-auto mb-4" />
          
          {/* Conditional Header based on flow */}
          <h2 className="text-2xl font-bold text-gray-800">
            {showNameField ? "Complete Your Profile" : (isLogin ? "Welcome Back" : "Create Account")}
          </h2>
          
          {error && <p className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded w-full">{error}</p>}
          {resetMessage && <p className="text-green-600 text-xs mt-2 bg-green-50 p-2 rounded w-full">{resetMessage}</p>}
        </div>

        {/* Conditionally Render the "Complete Profile" field or standard Auth form */}
        {showNameField ? (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 text-center">Please enter your full name to get started.</p>
            <input 
              type="text" 
              placeholder="Full Name" 
              required 
              className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
              onChange={(e) => setFullName(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => saveAndNavigate(tempUser, fullName)}
              className={`w-full ${themeColor} text-white font-bold py-3.5 rounded-xl shadow-lg hover:brightness-105 active:scale-[0.98] transition-all`}
            >
              Finish Setup
            </button>
          </div>
        ) : (
          <>
            <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
              <button 
                type="button"
                onClick={() => setRole("patient")} 
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${role === "patient" ? "bg-[#4f6ef7] text-white shadow-sm" : "text-gray-500"}`}
              >
                Patient
              </button>
              <button 
                type="button"
                onClick={() => setRole("therapist")} 
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${role === "therapist" ? "bg-[#5cb338] text-white shadow-sm" : "text-gray-500"}`}
              >
                Therapist
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  required 
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                required 
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="Password" 
                  required 
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all"
                  onChange={(e) => setPassword(e.target.value)}
                />
                {isLogin && (
                  <div className="text-right mt-2">
                    <button 
                      type="button" 
                      onClick={handleForgotPassword}
                      className={`text-xs font-semibold ${textColor} hover:underline transition-all`}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className={`w-full ${themeColor} text-white font-bold py-3.5 rounded-xl shadow-lg hover:brightness-105 active:scale-[0.98] transition-all mt-2`}
              >
                {isLogin ? "Sign In" : "Create Account"}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400"><span className="bg-white px-2">Or continue with</span></div>
              </div>

              <button 
                type="button" 
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-3 rounded-xl hover:bg-gray-50 font-semibold text-gray-700 transition-all active:scale-[0.98]"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                Continue with Google
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-500">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <Link to={isLogin ? "/signup" : "/login"} className={`font-bold ${textColor} hover:underline`}>
                {isLogin ? "Create Account" : "Log In"}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;