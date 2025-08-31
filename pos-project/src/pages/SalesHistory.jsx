// src/pages/SalesHistory.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getSales, getSalesByUserId, getSalesByDateRange, getUsers } from '../data/db';
import { ArrowLeft, Filter, Download, Eye, User, Calendar, DollarSign, CreditCard } from 'lucide-react';

const SalesHistory = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: '',
    endDate: '',
    paymentMethod: 'all',
    userId: 'all'
  });
  const [users, setUsers] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadSalesData();
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sales, filters]);

  const loadSalesData = async () => {
    setLoading(true);
    try {
      let salesData;
      if (currentUser.role === 'owner') {
        salesData = await getSales();
      } else {
        salesData = await getSalesByUserId(currentUser.id);
      }
      setSales(salesData.reverse()); // Show most recent first
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (currentUser.role === 'owner') {
      const userList = await getUsers();
      setUsers(userList);
    }
  };

  const applyFilters = async () => {
    let filtered = [...sales];

    // Date range filter
    if (filters.dateRange !== 'all') {
      let startDate, endDate;
      const today = new Date();

      switch (filters.dateRange) {
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
        case 'custom':
          if (filters.startDate && filters.endDate) {
            startDate = new Date(filters.startDate);
            endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
          }
          break;
        default:
          break;
      }

      if (startDate && endDate) {
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.timestamp);
          return saleDate >= startDate && saleDate <= endDate;
        });
      }
    }

    // Payment method filter
    if (filters.paymentMethod !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === filters.paymentMethod);
    }

    // User filter (owner only)
    if (currentUser.role === 'owner' && filters.userId !== 'all') {
      filtered = filtered.filter(sale => sale.userId === filters.userId);
    }

    setFilteredSales(filtered);
  };

  const getSalespersonName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.fullName || user.username : 'Unknown';
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Transaction ID', 'Salesperson', 'Payment Method', 'Subtotal', 'Tax', 'Total'],
      ...filteredSales.map(sale => [
        new Date(sale.timestamp).toLocaleDateString(),
        sale.id.slice(-8),
        getSalespersonName(sale.userId),
        sale.paymentMethod.toUpperCase(),
        `$${sale.subtotal.toFixed(2)}`,
        `$${sale.tax.toFixed(2)}`,
        `$${sale.total.toFixed(2)}`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const viewSaleDetails = (sale) => {
    setSelectedSale(sale);
    setShowDetailModal(true);
  };

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalTransactions = filteredSales.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {currentUser.role === 'owner' ? 'Sales Reports' : 'My Sales'}
              </h1>
              <p className="text-gray-600">
                {totalTransactions} transactions, Total: ${totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </>
          )}

          {/* Payment Method Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          {/* User Filter (Owner only) */}
          {currentUser.role === 'owner' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson</label>
              <select
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="all">All Salespeople</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.fullName || user.username}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                {currentUser.role === 'owner' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Salesperson
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={currentUser.role === 'owner' ? 7 : 6} className="px-6 py-8 text-center">
                    <div className="text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No sales found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(sale.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(sale.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    {currentUser.role === 'owner' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {getSalespersonName(sale.userId)}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sale.paymentMethod === 'cash' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {sale.paymentMethod === 'cash' ? (
                          <DollarSign className="h-3 w-3 mr-1" />
                        ) : (
                          <CreditCard className="h-3 w-3 mr-1" />
                        )}
                        {sale.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.items.reduce((total, item) => total + item.quantity, 0)} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                      ${sale.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewSaleDetails(sale)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {showDetailModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Sale Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                <p className="text-sm">{selectedSale.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                <p className="text-sm">{new Date(selectedSale.timestamp).toLocaleString()}</p>
              </div>
              {currentUser.role === 'owner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Salesperson</label>
                  <p className="text-sm">{getSalespersonName(selectedSale.userId)}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                <p className="text-sm capitalize">{selectedSale.paymentMethod}</p>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Items Sold</h3>
            <div className="border rounded-lg overflow-hidden">
              {selectedSale.items.map((item, index) => (
                <div key={index} className="border-b last:border-b-0 p-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">${item.price} each</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Qty: {item.quantity}</p>
                      <p className="text-green-600 font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-1">
                <span>Subtotal:</span>
                <span>${selectedSale.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>Tax (8%):</span>
                <span>${selectedSale.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span className="text-green-600">${selectedSale.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;