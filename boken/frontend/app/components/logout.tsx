"use client";
import { useCallback } from "react";

interface LogoutProps {
  show: boolean;
  onClose: () => void;
}

export default function Logout({ show, onClose }: LogoutProps) {
  const handleLogout = useCallback(() => {
    // Supprime tous les cookies d'authentification
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    onClose(); // Ferme la modale
    
    // Recharge la page pour forcer la mise à jour de l'état
    window.location.href = "/";
  }, [onClose]);

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Confirm Logout
        </h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to logout?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}