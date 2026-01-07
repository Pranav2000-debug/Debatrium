import { useState } from "react";
import api from "../api/axiosConfig.js";
import { toast } from "react-hot-toast";
import AnimatedModal from "@/components/ui/AnimatedModal";

const isValidPassword = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(password);

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) return toast.error("All fields are required");

    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");

    if (!isValidPassword(newPassword))
      return toast.error("Password must be at least 8 characters and include uppercase, lowercase, and a special character");

    try {
      setLoading(true);
      await api.post("/users/update-password", { currentPassword, newPassword });

      toast.success("Password updated successfully");
      resetState();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={() => {
        resetState();
        onClose();
      }}
      title="Change Password"
      loading={loading}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg
            focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg
            focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg
            focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-400 text-black font-semibold py-2 rounded-lg
            hover:bg-yellow-300 transition
            disabled:bg-gray-500 disabled:cursor-not-allowed">
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </AnimatedModal>
  );
};

export default ChangePasswordModal;
