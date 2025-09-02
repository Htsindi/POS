// src/data/db.js
import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

// Initialize the database
localforage.config({
  name: 'GroceryPOSDB',
  storeName: 'pos_store'
});

const TABLES = ['products', 'users', 'sales', 'customers', 'settings'];

export const initDB = async () => {
  for (const table of TABLES) {
    const data = await localforage.getItem(table);
    if (data === null) {
      await localforage.setItem(table, []);
    }
  }
  // Create a default admin user if none exists
  const users = await getUsers();
  if (users.length === 0) {
    await createUser({
      id: uuidv4(),
      username: 'admin',
      password: 'admin123',
      role: 'owner',
      pin: '1234',
      fullName: 'Admin User'
    });
  }
};

// Generic CRUD functions for each table
export const getItems = (table) => localforage.getItem(table);
export const setItems = (table, items) => localforage.setItem(table, items);

// Product functions
export const getProducts = () => getItems('products');

export const saveProduct = async (newProduct) => {
  const products = await getProducts();
  const productWithId = { 
    ...newProduct, 
    id: newProduct.id || uuidv4() // Use provided ID or generate new
  };
  const updatedProducts = [...products, productWithId];
  await setItems('products', updatedProducts);
  return productWithId;
};

export const updateProduct = async (productId, updatedData) => {
  const products = await getProducts();
  const updatedProducts = products.map(product =>
    product.id === productId ? { ...product, ...updatedData } : product
  );
  await setItems('products', updatedProducts);
  return updatedData;
};

export const deleteProduct = async (productId) => {
  const products = await getProducts();
  const updatedProducts = products.filter(product => product.id !== productId);
  await setItems('products', updatedProducts);
};

export const updateProductStock = async (productId, newStock) => {
  await updateProduct(productId, { stock: newStock });
};

export const searchProducts = async (query) => {
  const products = await getProducts();
  const searchTerm = query.toLowerCase();
  return products.filter(product =>
    product.name.toLowerCase().includes(searchTerm) ||
    (product.description && product.description.toLowerCase().includes(searchTerm)) ||
    (product.barcode && product.barcode.includes(query))
  );
};

export const getLowStockProducts = async (threshold = 10) => {
  const products = await getProducts();
  return products.filter(product => product.stock <= threshold);
};

// User functions
export const getUsers = () => getItems('users');

export const createUser = async (newUser) => {
  const users = await getUsers();
  const userWithId = { 
    ...newUser, 
    id: newUser.id || uuidv4(),
    fullName: newUser.fullName || ''
  };
  const updatedUsers = [...users, userWithId];
  await setItems('users', updatedUsers);
  return userWithId;
};

// Sale functions
export const getSales = async () => {
  const sales = await getItems('sales');
  return sales || [];
};

export const createSale = async (newSale) => {
  const sales = await getSales();
  const saleWithId = {
    ...newSale,
    id: newSale.id || uuidv4()
  };
  const updatedSales = [...sales, saleWithId];
  await setItems('sales', updatedSales);
  return saleWithId;
};

export const getSalesByUserId = async (userId) => {
  const sales = await getSales();
  return sales.filter(sale => sale.userId === userId);
};

export const getSalesByDateRange = async (startDate, endDate) => {
  const sales = await getSales();
  return sales.filter(sale => {
    const saleDate = new Date(sale.timestamp);
    return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
  });
};

// Customer functions
export const getCustomers = async () => {
  const customers = await getItems('customers');
  return customers || [];
};

export const createCustomer = async (newCustomer) => {
  const customers = await getCustomers();
  const customerWithId = { 
    ...newCustomer, 
    id: newCustomer.id || uuidv4(),
    currentBalance: newCustomer.currentBalance || 0
  };
  const updatedCustomers = [...customers, customerWithId];
  await setItems('customers', updatedCustomers);
  return customerWithId;
};

export const updateCustomer = async (customerId, updatedData) => {
  const customers = await getCustomers();
  const updatedCustomers = customers.map(customer =>
    customer.id === customerId ? { ...customer, ...updatedData } : customer
  );
  await setItems('customers', updatedCustomers);
};

export const deleteCustomer = async (customerId) => {
  const customers = await getCustomers();
  const updatedCustomers = customers.filter(customer => customer.id !== customerId);
  await setItems('customers', updatedCustomers);
};

export const updateCustomerBalance = async (customerId, newBalance) => {
  await updateCustomer(customerId, { currentBalance: parseFloat(newBalance.toFixed(2)) });
};

export const getCustomerById = async (customerId) => {
  const customers = await getCustomers();
  return customers.find(customer => customer.id === customerId);
};

// Utility functions
export const getDashboardStats = async () => {
  const sales = await getSales();
  const products = await getProducts();
  const customers = await getCustomers();
  
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const todaySales = sales.filter(sale => {
    const saleDate = new Date(sale.timestamp).toDateString();
    const today = new Date().toDateString();
    return saleDate === today;
  }).reduce((sum, sale) => sum + sale.total, 0);
  
  return {
    totalSales: parseFloat(totalSales.toFixed(2)),
    todaySales: parseFloat(todaySales.toFixed(2)),
    totalProducts,
    totalCustomers
  };
};