// src/pages/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getLowStockProducts, getSalesByDateRange } from '../data/db';
import { BarChart3, Users, Package, DollarSign, AlertCircle, Calendar, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('today');
  const [loading, setLoading] = useState(true);

  // Wrap loadDashboardData in useCallback with proper dependencies
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const dashboardStats = await getDashboardStats();
      setStats(dashboardStats);

      const lowStock = await getLowStockProducts();
      setLowStockProducts(lowStock.slice(0, 5));

      let startDate, endDate;
      const today = new Date();
      
      switch(selectedDateRange) {
        case 'today':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          endDate = new Date(today.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = new Date(today.setDate(today.getDate() - 7));
          endDate = new Date();
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        default:
          startDate = new Date(today.setHours(0, 0, 0, 0));
          endDate = new Date(today.setHours(23, 59, 59, 999));
      }

      const sales = await getSalesByDateRange(startDate, endDate);
      setRecentSales(sales.slice(-10).reverse());

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDateRange]); // selectedDateRange is the only dependency

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]); // Now loadDashboardData is stable

  // Navigation handlers
  const handleNavigateToPOS = () => navigate('/pos');
  const handleNavigateToInventory = () => navigate('/inventory');
  const handleNavigateToCustomers = () => navigate('/customers');
  const handleNavigateToSales = () => navigate('/sales');

  const StatCard = ({ title, value, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
       
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                Welcome, {currentUser?.fullName || currentUser?.username}! 
                <span className="font-semibold ml-2 capitalize">{currentUser?.role}</span>
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser?.role === 'owner' && (
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={DollarSign}
            title="Total Sales"
            value={`$${stats.totalSales?.toFixed(2) || '0.00'}`}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            title="Today's Sales"
            value={`$${stats.todaySales?.toFixed(2) || '0.00'}`}
            color="blue"
          />
          
          {currentUser?.role === 'owner' && (
            <>
              <StatCard
                icon={Package}
                title="Total Products"
                value={stats.totalProducts || 0}
                color="purple"
              />
              <StatCard
                icon={Users}
                title="Total Customers"
                value={stats.totalCustomers || 0}
                color="orange"
              />
            </>
          )}
          
          {currentUser?.role !== 'owner' && (
            <>
              <StatCard
                icon={Package}
                title="Low Stock Items"
                value={lowStockProducts.length}
                color="red"
              />
              <StatCard
                icon={BarChart3}
                title="Recent Transactions"
                value={recentSales.length}
                color="gray"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {(currentUser?.role === 'owner' || currentUser?.role === 'assistant') && lowStockProducts.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Low Stock Alert</h3>
              </div>
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-red-600 font-bold">Only {product.stock} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Calendar className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
            </div>
            <div className="space-y-3">
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <div key={sale.id} className="flex justify-between items-center p-3 border-b">
                    <div>
                      <p className="font-medium">TXN: {sale.id.slice(-6)}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(sale.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${sale.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-600 capitalize">{sale.paymentMethod}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent sales</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleNavigateToPOS}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors"
              >
                New Sale
              </button>
              
              {currentUser?.role === 'owner' && (
                <>
                  <button
                    onClick={handleNavigateToInventory}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                  >
                    Manage Inventory
                  </button>
                  <button
                    onClick={handleNavigateToCustomers}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                  >
                    View Customers
                  </button>
                  <button
                    onClick={handleNavigateToSales}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                  >
                    Sales Reports
                  </button>
                </>
              )}
              
              {currentUser?.role === 'assistant' && (
                <>
                  <button
                    onClick={handleNavigateToInventory}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                  >
                    Check Stock
                  </button>
                  <button
                    onClick={handleNavigateToSales}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg font-medium text-sm transition-colors"
                  >
                    My Sales
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {currentUser?.role === 'owner' && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded">
                <p className="text-sm text-gray-600">Average Sale Value</p>
                <p className="text-xl font-bold text-blue-600">
                  ${recentSales.length ? (stats.totalSales / recentSales.length).toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded">
                <p className="text-sm text-gray-600">Items Sold Today</p>
                <p className="text-xl font-bold text-green-600">
                  {recentSales.reduce((total, sale) => total + sale.items.length, 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded">
                <p className="text-sm text-gray-600">Credit Sales</p>
                <p className="text-xl font-bold text-purple-600">
                  {recentSales.filter(sale => sale.paymentMethod === 'credit').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;