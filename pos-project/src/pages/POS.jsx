
// src/pages/POS.jsx (or wherever your POS component is located)
import { v4 as uuidv4 } from 'uuid';
import { createSale, getSales, updateProductStock, getCustomers, updateCustomerBalance, getProducts } from '../data/db';
// Example state for POS
const [cart, setCart] = useState([]);
const [searchTerm, setSearchTerm] = useState('');
const [tenderedAmount, setTenderedAmount] = useState(0);
const [paymentMethod, setPaymentMethod] = useState('cash');
const [selectedCustomer, setSelectedCustomer] = useState(null);
const { currentUser} = useAuth();

const addToCart = (product) => {
    // Check if product is already in cart, then increase quantity, else add it.
    setCart([...cart, { ...product, quantity: 1 }]);
};

const calculateChange = () => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return tenderedAmount - total;
};

const completeSale = async () => {
  if (cart.length === 0) {
    alert('Cart is empty. Add products before completing sale.');
    return;
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // Example: 10% tax
  const total = subtotal + tax;

  // 1. Construct a Sale object
  const sale = {
    id: uuidv4(), // Generate unique ID
    timestamp: new Date().toISOString(),
    items: cart.map(item => ({
      productId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    })),
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    paymentMethod: paymentMethod,
    customerId: paymentMethod === 'credit' ? selectedCustomer?.id : null,
    userId: currentUser.id // Assuming currentUser is available from AuthContext
  };

  try {
    // 2. Save it to the 'sales' table
    await createSale(sale);
    
    // 3 & 4. Handle payment method specific logic
    if (paymentMethod === 'credit') {
      if (!selectedCustomer) {
        throw new Error('Customer must be selected for credit sales');
      }
      
      // Update customer balance
      const customers = await getCustomers();
      const customer = customers.find(c => c.id === selectedCustomer.id);
      
      if (customer) {
        const newBalance = (customer.currentBalance || 0) + total;
        
        // Check if exceeds credit limit
        if (newBalance > customer.creditLimit) {
          throw new Error(`Sale exceeds customer's credit limit. Current balance: $${customer.currentBalance}, Limit: $${customer.creditLimit}`);
        }
        
        await updateCustomerBalance(selectedCustomer.id, newBalance);
      }
    }
    
    // 5. Deduct sold quantities from product stock levels
    for (const item of cart) {
      const products = await getProducts();
      const product = products.find(p => p.id === item.id);
      
      if (product) {
        const newStock = product.stock - item.quantity;
        
        if (newStock < 0) {
          throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} available.`);
        }
        
        await updateProductStock(item.id, newStock);
      }
    }
    
    // 6. Clear the cart and reset the state
    setCart([]);
    setTenderedAmount(0);
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setSearchTerm('');
    
    // Show success message
    alert(`Sale completed successfully!\nTransaction ID: ${sale.id}\nTotal: $${total.toFixed(2)}`);
    
  } catch (error) {
    console.error('Error completing sale:', error);
    alert(`Error completing sale: ${error.message}`);
  }
};