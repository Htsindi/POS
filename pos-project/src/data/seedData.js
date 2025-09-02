// src/data/seedData.js
import { v4 as uuidv4 } from 'uuid';
import { getUsers, createUser, getProducts, saveProduct, getCustomers, createCustomer, setItems } from './db';

// Generate random price between min and max
//const randomPrice = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

// Generate random stock quantity
const randomStock = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const seedDatabase = async () => {
  console.log('Seeding database with dummy data...');

  // Check if data already exists to avoid duplicates
  const existingUsers = await getUsers();
  const existingProducts = await getProducts();
  const existingCustomers = await getCustomers();

  // Only seed if database is empty
  if (existingUsers.length <= 1 && existingProducts.length === 0 && existingCustomers.length === 0) {
    
    // Seed Users
    const users = [
      {
        id: uuidv4(),
        username: 'Memory_owner',
        password: 'owner123',
        role: 'owner',
        pin: '1982',
        fullName: 'Memory Tsindi'
      },
      {
        id: uuidv4(),
        username: 'Tshiamo_assistant',
        password: 'assist123',
        role: 'assistant',
        pin: '1234',
        fullName: 'John SmithTshiamo Sebueng'
      },
      {
        id: uuidv4(),
        username: 'Martin_cashier',
        password: 'cashier123',
        role: 'assistant',
        pin: '1975',
        fullName: 'Martin Tsindi'
      }
    ];

    for (const user of users) {
      await createUser(user);
    }

    // Seed Products - Grocery Items
    const groceryProducts = [
      // Fruits & Vegetables
      { id: uuidv4(), name: 'Bananas', description: 'Fresh yellow bananas', price: 0.59, cost: 0.35, stock: randomStock(50, 100), category: 'Produce', barcode: '400000001' },
      { id: uuidv4(), name: 'Apples', description: 'Red delicious apples', price: 1.29, cost: 0.80, stock: randomStock(40, 80), category: 'Produce', barcode: '400000002' },
      { id: uuidv4(), name: 'Carrots', description: 'Organic carrots 1lb', price: 0.99, cost: 0.60, stock: randomStock(30, 60), category: 'Produce', barcode: '400000003' },
      { id: uuidv4(), name: 'Potatoes', description: 'Russet potatoes 5lb bag', price: 3.99, cost: 2.50, stock: randomStock(20, 40), category: 'Produce', barcode: '400000004' },

      // Dairy & Eggs
      { id: uuidv4(), name: 'Milk', description: 'Whole milk 1 gallon', price: 3.49, cost: 2.20, stock: randomStock(25, 50), category: 'Dairy', barcode: '400000005' },
      { id: uuidv4(), name: 'Eggs', description: 'Large eggs dozen', price: 2.99, cost: 1.80, stock: randomStock(30, 60), category: 'Dairy', barcode: '400000006' },
      { id: uuidv4(), name: 'Butter', description: 'Salted butter 1lb', price: 4.49, cost: 2.80, stock: randomStock(20, 40), category: 'Dairy', barcode: '400000007' },
      { id: uuidv4(), name: 'Yogurt', description: 'Greek yogurt 32oz', price: 5.99, cost: 3.50, stock: randomStock(15, 30), category: 'Dairy', barcode: '400000008' },

      // Bakery
      { id: uuidv4(), name: 'White Bread', description: 'Fresh white bread loaf', price: 2.49, cost: 1.40, stock: randomStock(20, 40), category: 'Bakery', barcode: '400000009' },
      { id: uuidv4(), name: 'Croissants', description: 'Buttery croissants 4pk', price: 3.99, cost: 2.20, stock: randomStock(15, 30), category: 'Bakery', barcode: '400000010' },

      // Meat & Poultry
      { id: uuidv4(), name: 'Chicken Breast', description: 'Boneless skinless 1lb', price: 5.99, cost: 3.80, stock: randomStock(15, 30), category: 'Meat', barcode: '400000011' },
      { id: uuidv4(), name: 'Ground Beef', description: '80/20 ground beef 1lb', price: 6.49, cost: 4.00, stock: randomStock(12, 25), category: 'Meat', barcode: '400000012' },
      { id: uuidv4(), name: 'Bacon', description: 'Smoked bacon 12oz', price: 5.49, cost: 3.20, stock: randomStock(10, 20), category: 'Meat', barcode: '400000013' },

      // Beverages
      { id: uuidv4(), name: 'Orange Juice', description: '100% pure OJ 64oz', price: 4.99, cost: 3.00, stock: randomStock(18, 35), category: 'Beverages', barcode: '400000014' },
      { id: uuidv4(), name: 'Coffee', description: 'Ground coffee 12oz', price: 7.99, cost: 4.50, stock: randomStock(15, 25), category: 'Beverages', barcode: '400000015' },
      { id: uuidv4(), name: 'Soda', description: 'Cola 2L bottle', price: 2.49, cost: 1.20, stock: randomStock(30, 60), category: 'Beverages', barcode: '400000016' },
      { id: uuidv4(), name: 'Bottled Water', description: 'Purified water 24pk', price: 4.99, cost: 2.80, stock: randomStock(25, 50), category: 'Beverages', barcode: '400000017' },

      // Snacks & Pantry
      { id: uuidv4(), name: 'Chips', description: 'Potato chips 10oz', price: 3.99, cost: 2.00, stock: randomStock(25, 50), category: 'Snacks', barcode: '400000018' },
      { id: uuidv4(), name: 'Cookies', description: 'Chocolate chip cookies', price: 2.99, cost: 1.50, stock: randomStock(20, 40), category: 'Snacks', barcode: '400000019' },
      { id: uuidv4(), name: 'Pasta', description: 'Spaghetti 1lb', price: 1.49, cost: 0.80, stock: randomStock(40, 80), category: 'Pantry', barcode: '400000020' },
      { id: uuidv4(), name: 'Rice', description: 'Long grain rice 2lb', price: 2.99, cost: 1.60, stock: randomStock(30, 60), category: 'Pantry', barcode: '400000021' },
      { id: uuidv4(), name: 'Canned Soup', description: 'Chicken noodle soup', price: 1.79, cost: 0.90, stock: randomStock(35, 70), category: 'Pantry', barcode: '400000022' },
      { id: uuidv4(), name: 'Cereal', description: 'Corn flakes 18oz', price: 3.49, cost: 1.80, stock: randomStock(20, 40), category: 'Pantry', barcode: '400000023' }
    ];

    for (const product of groceryProducts) {
      await saveProduct(product);
    }

    // Seed Customers
    const customers = [
      {
        name: 'Robert Wilson',
        phone: '555-0101',
        email: 'robert.wilson@email.com',
        creditLimit: 500.00,
        currentBalance: 125.50,
        address: '123 Main St'
      },
      {
        name: 'Lisa Chen',
        phone: '555-0102',
        email: 'lisa.chen@email.com',
        creditLimit: 300.00,
        currentBalance: 45.75,
        address: '456 Oak Ave'
      },
      {
        name: 'Mike Johnson',
        phone: '555-0103',
        email: 'mike.johnson@email.com',
        creditLimit: 1000.00,
        currentBalance: 320.25,
        address: '789 Pine Rd'
      },
      {
        name: 'Sarah Davis',
        phone: '555-0104',
        email: 'sarah.davis@email.com',
        creditLimit: 200.00,
        currentBalance: 89.99,
        address: '321 Elm St'
      },
      {
        name: 'David Martinez',
        phone: '555-0105',
        email: 'david.martinez@email.com',
        creditLimit: 750.00,
        currentBalance: 210.00,
        address: '654 Maple Dr'
      }
    ];

    for (const customer of customers) {
      await createCustomer(customer);
    }

    console.log('Database seeded successfully!');
    console.log('Users created:', users.length);
    console.log('Products created:', groceryProducts.length);
    console.log('Customers created:', customers.length);
    
    return true;
  } else {
    console.log('Database already contains data. Skipping seeding.');
    return false;
  }
};

// Function to clear all data (use with caution!)
export const clearDatabase = async () => {
  await setItems('products', []);
  await setItems('customers', []);
  await setItems('sales', []);
  // Keep users so you can still log in
  console.log('Database cleared (except users)');
};