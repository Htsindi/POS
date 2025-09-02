// src/pages/Customers.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  getCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer,
  updateCustomerBalance 
} from '../data/db';
import { ArrowLeft, Plus, Edit, Trash2, Search, User, CreditCard, DollarSign, X, Phone, Mail, MapPin, Minus } from 'lucide-react';

const Customers = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    creditLimit: '',
    currentBalance: '0'
  });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditAction, setCreditAction] = useState('add');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    // Filter logic directly in useEffect
    let filtered = [...customers];

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone && customer.phone.includes(searchTerm)) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const customersData = await getCustomers();
      setCustomers(customersData || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const customerData = {
        ...formData,
        creditLimit: parseFloat(formData.creditLimit) || 0,
        currentBalance: parseFloat(formData.currentBalance) || 0
      };

      if (editingId) {
        // Update existing customer
        await updateCustomer(editingId, customerData);
      } else {
        // Add new customer
        await createCustomer(customerData);
      }
      
      // Reload customers and reset form
      await loadCustomers();
      resetForm();
      setShowForm(false);
      
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer. Please try again.');
    }
  };

  const startEditing = (customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit?.toString() || '',
      currentBalance: customer.currentBalance?.toString() || '0'
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      creditLimit: '',
      currentBalance: '0'
    });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      try {
        await deleteCustomer(id);
        await loadCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer. Please try again.');
      }
    }
  };

  const openCreditModal = (customer, action) => {
    setSelectedCustomer(customer);
    setCreditAction(action);
    setCreditAmount('');
    setShowCreditModal(true);
  };

  const handleCreditUpdate = async () => {
    if (!creditAmount || isNaN(parseFloat(creditAmount))) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const amount = parseFloat(creditAmount);
      let newBalance;

      if (creditAction === 'add') {
        newBalance = (selectedCustomer.currentBalance || 0) + amount;
      } else {
        newBalance = (selectedCustomer.currentBalance || 0) - amount;
        if (newBalance < 0) {
          if (!window.confirm('This will result in a negative balance. Continue?')) {
            return;
          }
        }
      }

      // Check if new balance exceeds credit limit
      if (newBalance > selectedCustomer.creditLimit) {
        if (!window.confirm(`New balance ($${newBalance.toFixed(2)}) exceeds credit limit ($${selectedCustomer.creditLimit.toFixed(2)}). Continue?`)) {
          return;
        }
      }

      await updateCustomerBalance(selectedCustomer.id, newBalance);
      await loadCustomers();
      setShowCreditModal(false);
      setSelectedCustomer(null);
      setCreditAmount('');

    } catch (error) {
      console.error('Error updating credit:', error);
      alert('Error updating credit balance. Please try again.');
    }
  };

  const getCreditUtilization = (customer) => {
    if (!customer.creditLimit || customer.creditLimit === 0) return 0;
    return ((customer.currentBalance || 0) / customer.creditLimit) * 100;
  };

  const getCreditStatus = (utilization) => {
    if (utilization >= 90) return 'critical';
    if (utilization >= 70) return 'warning';
    return 'good';
  };

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
              <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
              <p className="text-gray-600">
                {currentUser.role === 'owner' ? 'Manage all customers' : 'View customer information'}
              </p>
            </div>
          </div>
          {currentUser.role === 'owner' && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Customer Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Active Credit Accounts</p>
              <p className="text-2xl font-bold">
                {customers.filter(c => c.creditLimit > 0).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Credit Balance</p>
              <p className="text-2xl font-bold">
                ${customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit ($)</label>
                  <input
                    type="number"
                    name="creditLimit"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({...formData, creditLimit: e.target.value})}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance ($)</label>
                  <input
                    type="number"
                    name="currentBalance"
                    value={formData.currentBalance}
                    onChange={(e) => setFormData({...formData, currentBalance: e.target.value})}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    disabled={!editingId}
                  />
                  {!editingId && (
                    <p className="text-xs text-gray-500 mt-1">Balance can be updated after creating customer</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  {editingId ? 'Update Customer' : 'Add Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Update Modal */}
      {showCreditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {creditAction === 'add' ? 'Add Credit' : 'Subtract Credit'}
              </h2>
              <button
                onClick={() => setShowCreditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedCustomer.name}</p>
              <p className="text-sm text-gray-600">
                Current Balance: ${(selectedCustomer.currentBalance || 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                Credit Limit: ${(selectedCustomer.creditLimit || 0).toFixed(2)}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="0.00"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCreditUpdate}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex-1"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowCreditModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Credit Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="text-gray-500">
                      <User className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No customers found</p>
                      <p className="text-sm">
                        {searchTerm ? 'Try changing your search' : 'Add some customers to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const utilization = getCreditUtilization(customer);
                  const status = getCreditStatus(utilization);
                  
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        {customer.address && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            {customer.address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {customer.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center mt-1">
                              <Mail className="h-3 w-3 mr-1 text-gray-400" />
                              <span className="text-xs">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ${(customer.creditLimit || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">
                        <span className={customer.currentBalance > 0 ? 'text-green-600' : 'text-gray-600'}>
                          ${(customer.currentBalance || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {customer.creditLimit > 0 ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  status === 'critical' ? 'bg-red-500' :
                                  status === 'warning' ? 'bg-orange-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(utilization, 100)}%` }}
                              ></div>
                            </div>
                            <span className={`text-xs ${
                              status === 'critical' ? 'text-red-600' :
                              status === 'warning' ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">No credit</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium space-x-2">
                        {currentUser.role === 'owner' && (
                          <>
                            <button
                              onClick={() => startEditing(customer)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openCreditModal(customer, 'add')}
                              className="text-green-600 hover:text-green-900"
                              title="Add Credit"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openCreditModal(customer, 'subtract')}
                              className="text-orange-600 hover:text-orange-900"
                              title="Subtract Credit"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(customer.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {currentUser.role === 'assistant' && (
                          <span className="text-gray-400">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Customers;