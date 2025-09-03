"use client";
import { useState, useEffect } from "react";

export function SignOutButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication state
    setIsAuthenticated(localStorage.getItem('auracast_authenticated') === 'true');
  }, []);

  const handleSignOut = () => {
    // Clear authentication state
    localStorage.removeItem('auracast_authenticated');
    localStorage.removeItem('auracast_user');
    // Reload to show sign-in form
    window.location.reload();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="px-4 py-2 rounded bg-white text-secondary border border-gray-200 font-semibold hover:bg-gray-50 hover:text-secondary-hover transition-colors shadow-sm hover:shadow"
      onClick={handleSignOut}
    >
      Sign out
    </button>
  );
}
