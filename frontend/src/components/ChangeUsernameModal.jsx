import { useState } from "react";
import api from "../api/axiosConfig.js";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { handleApiError } from "@/utils/handleApiError";
import AnimatedModal from "@/components/ui/AnimatedModal";

const usernameRegex = /^[a-z0-9_]+$/;

const ChangeUsernameModal = ({ isOpen, onClose }) => {
  const { setUser } = useAuth();

  const [newUsername, setNewUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setNewUsername("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = newUsername.trim().toLowerCase();

    if (!username) return toast.error("Username is required");
    if (username.length < 3) return toast.error("Username must be at least 3 characters");
    if (!usernameRegex.test(username)) return toast.error("Username can only contain lowercase letters, numbers, and underscores");

    try {
      setLoading(true);

      const res = await api.post("/users/update-username", { newUsername: username });

      toast.success("Username updated successfully");
      setUser(res.data.data.user);

      resetState();
      onClose();
    } catch (err) {
      handleApiError(err);
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
      title="Change Username"
      loading={loading}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="New username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg
            focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-400 text-black font-semibold py-2 rounded-lg
            hover:bg-yellow-300 transition
            disabled:bg-gray-500 disabled:cursor-not-allowed">
          {loading ? "Updating..." : "Update Username"}
        </button>
      </form>
    </AnimatedModal>
  );
};

export default ChangeUsernameModal;
