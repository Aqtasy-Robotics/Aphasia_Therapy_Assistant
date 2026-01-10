import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db, googleProvider, sendPasswordReset } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import black_logo from "../assets/black_logo.svg";

const AuthPage = ({ type }) => {
  const navigate = useNavigate();
  const isLogin = type === "login";

  //handles state management
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  //links state together
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [preferredPassword, setPreferredPassword] = useState("");
  const [title, setTitle] = useState("Mr.");
  const [clinicName, setClinicName] = useState("");

  const themeColor = role === "therapist" ? "bg-[#5cb338]" : "bg-[#4f6ef7]";
  const textColor = role === "therapist" ? "text-[#5cb338]" : "text-[#4f6ef7]";

  //Firestore Save 
  const saveUserData = async (uid, uEmail, name, method) => {
    const userData = {
      uid: uid,
      fullName: name,
      email: uEmail,
      role: role,
      authMethod: method,
      createdAt: new Date(),
    };

    if (role === "therapist") {
      userData.title = title;
      userData.clinicName = clinicName;
    }

    await setDoc(doc(db, "users", uid), userData);
  };

  //Email/Password Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResetMessage("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        const user = auth.currentUser;
        const docSnap = await getDoc(doc(db, "users", user.uid));

        if (docSnap.exists()) {
          const userRole = docSnap.data().role;
          navigate(
            userRole === "therapist" ? "/dashboard" : "/patient-dashboard"
          );
        }
      } else {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserData(res.user.uid, email, fullName, "email");
        navigate(role === "therapist" ? "/dashboard" : "/patient-dashboard");
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  //Google Sign-In Branching
  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const docSnap = await getDoc(doc(db, "users", user.uid));

      if (!docSnap.exists()) {
        setEmail(user.email);
        setFullName(user.displayName || "");
        setShowOnboarding(true);
      } else {
        const userRole = docSnap.data().role;
        navigate(
          userRole === "therapist" ? "/dashboard" : "/patient-dashboard"
        );
      }
    } catch (err) {
      setError(err.message);
    }
  };

  //Finalize Google (LINK PASSWORD)
  const finalizeRegistration = async () => {
    if (!fullName || preferredPassword.length < 8) {
      setError("Please provide a name and password (min 8 characters).");
      return;
    }
    try {
      const currentUser = auth.currentUser;
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        preferredPassword
      );
      await linkWithCredential(currentUser, credential);
      await saveUserData(
        currentUser.uid,
        currentUser.email,
        fullName,
        "google_linked"
      );
      navigate(role === "therapist" ? "/dashboard" : "/patient-dashboard");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  };

  // Forgot Password Logic
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address above to reset your password.");
      return;
    }
    try {
      await sendPasswordReset(email);
      setResetMessage("Password reset email sent! Check your Email(make sure to check your spam folder too)");
      setError("");
    } catch (err) {
      setError("Could not send reset email. Verify the address is correct.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f9ff] to-[#f0fff4] px-4 py-12">
      <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
        <div className="flex flex-col items-center mb-8 text-center">
          <img src={black_logo} alt="Logo" className="h-20 w-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
            {showOnboarding
              ? "Finish Profile"
              : isLogin
              ? "Welcome Back"
              : "Create Account"}
          </h2>
          {error && (
            <p className="text-red-500 text-xs mt-2 bg-red-50 p-2 rounded w-full font-medium">
              {error}
            </p>
          )}
          {resetMessage && (
            <p className="text-green-600 text-xs mt-2 bg-green-50 p-2 rounded w-full font-medium">
              {resetMessage}
            </p>
          )}
        </div>

        {showOnboarding ? (
          /* ONBOARDING VIEW */
          <div className="space-y-4 animate-in fade-in duration-500">
            {role === "therapist" && (
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    Title
                  </label>
                  <select
                    className="w-full bg-gray-50 border border-transparent rounded-xl px-3 py-3 mt-1 text-sm font-medium"
                    onChange={(e) => setTitle(e.target.value)}
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Ms.">Ms.</option>
                    <option value="Dr.">Dr.</option>
                    <option value="SLP">SLP</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                    Clinic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. City Rehab"
                    className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 mt-1 text-sm outline-none focus:ring-2 focus:ring-gray-100"
                    onChange={(e) => setClinicName(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 mt-1 outline-none focus:ring-2 focus:ring-gray-100"
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                Set Account Password
              </label>
              <input
                type="password"
                placeholder="Min 8 characters"
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 mt-1 outline-none focus:ring-2 focus:ring-gray-100"
                onChange={(e) => setPreferredPassword(e.target.value)}
              />
            </div>
            <button
              onClick={finalizeRegistration}
              className={`w-full ${themeColor} text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all mt-2`}
            >
              Complete Registration
            </button>
          </div>
        ) : (
          <>
            <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
              <button
                type="button"
                onClick={() => setRole("patient")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  role === "patient"
                    ? "bg-[#4f6ef7] text-white"
                    : "text-gray-500"
                }`}
              >
                Patient
              </button>
              <button
                type="button"
                onClick={() => setRole("therapist")}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  role === "therapist"
                    ? "bg-[#5cb338] text-white"
                    : "text-gray-500"
                }`}
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
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
                  onChange={(e) => setFullName(e.target.value)}
                />
              )}

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                required
                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="relative">
                <input
                  type="password"
                  placeholder="Password"
                  required
                  className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-gray-100"
                  onChange={(e) => setPassword(e.target.value)}
                />
                {isLogin && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className={`text-[11px] font-bold ${textColor} hover:underline`}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={`w-full ${themeColor} text-white font-bold py-3.5 rounded-xl shadow-lg mt-4 active:scale-95 transition-all`}
              >
                {isLogin ? "Sign In" : "Create Account"}
              </button>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <span className="relative bg-white px-3 text-[10px] uppercase font-bold text-gray-400">
                  Or continue with
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-3 rounded-xl hover:bg-gray-50 font-bold text-gray-700 active:scale-95 transition-all"
              >
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  className="w-5 h-5"
                  alt="G"
                />
                Sign in with Google
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-500">
              {isLogin ? "New to Aqtasy? " : "Joined us before? "}
              <Link
                to={isLogin ? "/signup" : "/login"}
                className={`font-bold ${textColor} hover:underline`}
              >
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
