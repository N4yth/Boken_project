"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User, LogIn, LogOut } from "lucide-react";
import Logout from "./logout";
import { useAuth, verifyToken } from "@/utils/userAuth";

type AuthState = {
  isLogged: boolean;
  username: string;
  token: string;
};



export default function Header() {
  const { isLogged, username, token, refresh, mounted } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      if (isLogged) {
        const valid = await verifyToken(token); // vérifie le token
        if (valid) {
          setShowLogoutConfirm(true); // change l'état si login correct
        } else {
          setShowLogoutConfirm(false); // facultatif, si token invalide
        }
      }
    };

    checkLogin();
  }, [isLogged, token]);

  const handleLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  const handleLogout = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  const closeLogoutModal = useCallback(() => {
    setShowLogoutModal(false);
  }, []);

  // Ne rien afficher avant le montage pour éviter l'hydratation mismatch
  if (!mounted) {
    return (
      <header className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-10" /> {/* Placeholder pour éviter le layout shift */}
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-end">
          {isLogged ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                <User className="w-5 h-5" />
                <span className="hidden sm:inline">{username}</span>
              </div>
              <button
                className="flex items-center gap-1 text-red-500 hover:text-red-600 font-semibold transition-colors"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors"
              onClick={handleLogin}
              aria-label="Login"
            >
              <LogIn className="w-5 h-5" />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}
        </div>
      </header>

      <Logout show={showLogoutModal} onClose={closeLogoutModal} />
    </>
  );
}