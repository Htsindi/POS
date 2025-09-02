// src/pages/POS.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { searchProducts, createSale, updateProductStock, getCustomers, updateCustomerBalance, getCustomerById } from '../data/db';
import { v4 as uuidv4 } from 'uuid';
import { X, Plus, Minus, Search, User, CreditCard, DollarSign } from 'lucide-react';

const POS = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const customerList = await getCustomers();
    setCustomers(customerList);
  };

  const handleProductSearch = async (term) => {
    setSearchTerm(term);
    if (term.length > 1) {
      const results = await searchProducts(term);
      setSearchResults(results.slice(0, 5)); // Show only top 5 results
    } else {
      setSearchResults([]);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        quantity: 1,
        price: parseFloat(product.price) // Ensure it's a number
      }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.00; // 8% tax
    const total = subtotal + tax;
    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  };

  const calculateChange = () => {
    const { total } = calculateTotals();
    const tendered = parseFloat(tenderedAmount) || 0;
    return parseFloat((tendered - total).toFixed(2));
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty. Add products before completing sale.');
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomer) {
      alert('Please select a customer for credit sales.');
      return;
    }

    setIsProcessing(true);

    try {
      const { subtotal, tax, total } = calculateTotals();

      // 1. Construct Sale object
      const sale = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal,
        tax,
        total,
        paymentMethod,
        customerId: paymentMethod === 'credit' ? selectedCustomer.id : null,
        userId: currentUser.id
      };

      // 2. Save sale
      await createSale(sale);
      
      // 3. Handle credit payment
      if (paymentMethod === 'credit' && selectedCustomer) {
        const customer = await getCustomerById(selectedCustomer.id);
        if (customer) {
          const newBalance = (customer.currentBalance || 0) + total;
          if (newBalance > customer.creditLimit) {
            throw new Error(`Sale exceeds customer's credit limit. Current balance: $${customer.currentBalance}, Limit: $${customer.creditLimit}`);
          }
          await updateCustomerBalance(selectedCustomer.id, newBalance);
        }
      }
      
      // 4. Update stock levels
      for (const item of cart) {
        const products = await searchProducts(item.id);
        const product = products.find(p => p.id === item.id);
        if (product) {
          const newStock = product.stock - item.quantity;
          if (newStock < 0) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
          await updateProductStock(item.id, newStock);
        }
      }
      
      // 5. Reset and show success
      setCart([]);
      setTenderedAmount('');
      setSelectedCustomer(null);
      setPaymentMethod('cash');
      
      alert(`Sale completed successfully!\nTotal: $${total.toFixed(2)}\nTransaction ID: ${sale.id.slice(-8)}`);
      
    } catch (error) {
      console.error('Sale error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();
  const change = calculateChange();

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Point of Sale</h1>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
        <p className="text-gray-600">Welcome, {currentUser?.fullName || currentUser?.username}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Search and Cart */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product Search */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleProductSearch(e.target.value)}
                placeholder="Search products by name, description, or barcode..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map(product => (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-600">{product.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${product.price}</div>
                      <div className="text-sm text-gray-500">Stock: {product.stock}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shopping Cart */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4">Shopping Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty. Search for products to add.</p>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">${item.price} each</div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold">${(item.price * item.quantity).toFixed(2)}</div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Payment Section */}
        <div className="space-y-4">
          {/* Totals */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (0%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-bold mb-4">Payment Method</h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 ${
                  paymentMethod === 'cash' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                <DollarSign className="h-5 w-5" />
                <span>Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod('credit')}
                className={`p-3 rounded-lg border-2 flex items-center justify-center space-x-2 ${
                  paymentMethod === 'credit' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Credit</span>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount Tendered
                </label>
                <input
                  type="number"
                  value={tenderedAmount}
                  onChange={(e) => setTenderedAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                {tenderedAmount && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg">
                    <div className="flex justify-between">
                      <span>Change:</span>
                      <span className="font-bold text-green-700">
                        ${change >= 0 ? change.toFixed(2) : '0.00'}
                      </span>
                    </div>
                    {change < 0 && (
                      <p className="text-red-500 text-sm mt-1">
                        Insufficient amount tendered
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'credit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer
                </label>
                {selectedCustomer ? (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{selectedCustomer.name}</div>
                        <div className="text-sm text-gray-600">
                          Balance: ${selectedCustomer.currentBalance} / Limit: ${selectedCustomer.creditLimit}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 text-gray-600"
                  >
                    <User className="h-5 w-5 mx-auto mb-1" />
                    Select Customer
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Complete Sale Button */}
          <button
            onClick={completeSale}
            disabled={isProcessing || cart.length === 0 || (paymentMethod === 'cash' && change < 0) || (paymentMethod === 'credit' && !selectedCustomer)}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : `Complete Sale - $${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Select Customer</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="max-h-60 overflow-y-auto">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                    setCustomerSearch('');
                  }}
                  className="p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer"
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-gray-600">{customer.phone}</div>
                  <div className="text-sm">
                    Balance: ${customer.currentBalance} / Limit: ${customer.creditLimit}
                  </div>
                </div>
              ))}
              
              {filteredCustomers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No customers found</p>
              )}
            </div>

            <button
              onClick={() => {
                setShowCustomerModal(false);
                setCustomerSearch('');
              }}
              className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;