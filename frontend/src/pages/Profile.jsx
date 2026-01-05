import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ChangeUsernameModal from "@/components/ChangeUsernameModal";

const Profile = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const { user } = useAuth();
  const capitalizeName = (name = "") =>
    name
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Profile</h1>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-6">User Information</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Username</label>
              <p className="text-white text-lg">{user?.username}</p>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Full Name</label>
              <p className="text-white text-lg">{capitalizeName(user?.fullname)}</p>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Email</label>
              <p className="text-white text-lg">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-white mb-6">Actions</h2>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => {setShowUsernameModal(true)}}
              className="flex-1 bg-yellow-400 text-black font-semibold py-3 px-6 rounded-lg hover:bg-yellow-300 transition duration-200">
              Change Username
            </button>

            <button
              onClick={() => {
                setShowPasswordModal(true);
              }}
              className="flex-1 bg-yellow-400 text-black font-semibold py-3 px-6 rounded-lg hover:bg-yellow-300 transition duration-200">
              Reset Password
            </button>
          </div>
        </div>
        <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
        <ChangeUsernameModal isOpen={showUsernameModal} onClose={() => setShowUsernameModal(false)} />
      </div>
    </div>
  );
};

export default Profile;
