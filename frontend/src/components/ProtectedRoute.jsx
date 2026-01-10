import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const ProtectedRoute = ({ children, requiredRole }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        //fetches if the person signing up is a patient or therapist
        const docRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRole(docSnap.data().role);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-[#4f6ef7]">
        Loading Aqtasy...
      </div>
    );

  // If not logged in, send to login
  if (!user) return <Navigate to="/login" replace />;

  // automatically sends the user to the signed up dashboard, patient and therapist can't have the same emails
  if (requiredRole && role !== requiredRole) {
    return (
      <Navigate
        to={role === "therapist" ? "/dashboard" : "/patient-dashboard"}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
