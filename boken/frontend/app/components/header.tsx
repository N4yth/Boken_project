"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, LogIn, LogOut } from "lucide-react";
import Logout from "./logout";
import { useAuth, verifyToken } from "@/utils/userAuth";
import Image from 'next/image';


export default function Header() {
  const { isLogged, username, token, mounted } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      if (isLogged) {
        await verifyToken(token);
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

  if (!mounted) {
    return (
      <header className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-10" />
        </div>
      </header>
    );
  }
  if (pathname !== "/login") {
    return (
  <>
    <header className="bg-white px-0 py-0 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-3 flex items-center justify-between px-0 py-0">
        <div className="w-30 h-16 overflow-hidden rounded-t-lg">
          <Image
            src={"/images/Boken_title.png"}
            alt={"Boken"} 
            width={100}
            height={100}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        {isLogged ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-indigo-600 font-semibold">
              <User className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base">{username}</span>
            </div>

            <button
              className="flex items-center gap-1 text-red-500 hover:text-red-600 font-semibold transition-colors text-sm sm:text-base"
              onClick={handleLogout}
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold transition-colors text-sm sm:text-base"
            onClick={handleLogin}
            aria-label="Login"
          >
            <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>

    <Logout show={showLogoutModal} onClose={closeLogoutModal} />
  </>
);
  }
}