import { useAuth } from '../contexts/AuthContext'

const Dashboard = () => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p>Welcome, {currentUser?.username}!
        You are logged in as an <span className="font-semibold">{currentUser?.role}</span>.
      </p>
      <button
        onClick={logout}
        className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;