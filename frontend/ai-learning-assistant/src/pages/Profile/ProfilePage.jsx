import { Lock, Mail, User } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "../../utils/notify";
import { useAuth } from "../../context/useAuth";
import PasswordField from "../../components/common/PasswordField";

const ProfilePage = () => {
  const { user, updatePassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username || user.name || "");
      setEmail(user.email || "");
    }
    setLoading(false);
  }, [user]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      await updatePassword({ currentPassword, newPassword });
      toast.success("Password updated successfully");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return <div className="max-w-4xl mx-auto p-6">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Profile Settings</h1>
      </div>

      <div className="grid gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-5">User Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={username}
                  readOnly
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-5">Change Password</h2>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Current Password
              </label>
              <PasswordField
                icon={Lock}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="rounded-xl border-slate-200 bg-white dark:border-slate-200 dark:bg-white"
                inputClassName="h-12 text-slate-700 dark:text-slate-700"
                iconClassName="text-slate-400 dark:text-slate-400"
                toggleClassName="text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-100 dark:hover:text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                New Password
              </label>
              <PasswordField
                icon={Lock}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="rounded-xl border-slate-200 bg-white dark:border-slate-200 dark:bg-white"
                inputClassName="h-12 text-slate-700 dark:text-slate-700"
                iconClassName="text-slate-400 dark:text-slate-400"
                toggleClassName="text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-100 dark:hover:text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-2">
                Confirm New Password
              </label>
              <PasswordField
                icon={Lock}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="rounded-xl border-slate-200 bg-white dark:border-slate-200 dark:bg-white"
                inputClassName="h-12 text-slate-700 dark:text-slate-700"
                iconClassName="text-slate-400 dark:text-slate-400"
                toggleClassName="text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-100 dark:hover:text-slate-700"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
