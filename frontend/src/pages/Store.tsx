import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ShoppingBag, MapPin, Phone, CreditCard, CheckCircle, Search, Filter, ShoppingCart, X, Plus, Minus, Star, Truck } from 'lucide-react';

// Mock Data for fallback
const MOCK_PRODUCTS = [
  { id: 1, name: 'Wireless Earbuds Pro', description: 'High-quality noise-canceling wireless earbuds with 24h battery life.', price: 2500, category: 'Electronics', image_url: 'https://picsum.photos/seed/earbuds/400/300', rating: 4.8, reviews: 124 },
  { id: 2, name: 'Smart Fitness Watch', description: 'Track your health, sleep, and workouts with this sleek smartwatch.', price: 3200, category: 'Electronics', image_url: 'https://picsum.photos/seed/watch/400/300', rating: 4.5, reviews: 89 },
  { id: 3, name: 'Organic Coffee Beans', description: 'Premium roasted Ethiopian Yirgacheffe coffee beans, 500g.', price: 850, category: 'Groceries', image_url: 'https://picsum.photos/seed/coffee/400/300', rating: 4.9, reviews: 210 },
  { id: 4, name: 'Leather Messenger Bag', description: 'Handcrafted genuine leather bag perfect for laptops and daily use.', price: 4500, category: 'Fashion', image_url: 'https://picsum.photos/seed/bag/400/300', rating: 4.7, reviews: 56 },
  { id: 5, name: 'Skincare Essentials Kit', description: 'Complete daily skincare routine with natural ingredients.', price: 1800, category: 'Beauty', image_url: 'https://picsum.photos/seed/skincare/400/300', rating: 4.6, reviews: 142 },
  { id: 6, name: 'Ergonomic Desk Chair', description: 'Comfortable office chair with lumbar support and adjustable height.', price: 8500, category: 'Home', image_url: 'https://picsum.photos/seed/chair/400/300', rating: 4.4, reviews: 78 },
];

const CATEGORIES = ['All', 'Electronics', 'Groceries', 'Fashion', 'Beauty', 'Home'];

export default function Store() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Product Details
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Cart State
  const [cart, setCart] = useState<{product: any, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [dropLocation, setDropLocation] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('chapa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.length > 0 ? data : MOCK_PRODUCTS);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch products, using mock data', err);
        setProducts(MOCK_PRODUCTS);
        setLoading(false);
      });
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedProduct(null);
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setIsProcessing(true);
    try {
      // Mock API call for checkout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setOrderSuccess(true);
      setCart([]); // Clear cart on success
    } catch (error) {
      console.error('Checkout failed', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading store...</div>;

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-[#2A1B7A] flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-[#F28C3A]" /> ZED Store
          </h1>
          <p className="text-gray-500 mt-1">Shop local, delivered fast.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F28C3A]/50 focus:border-[#F28C3A] transition-all"
            />
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-3 bg-[#2A1B7A] text-white rounded-xl hover:bg-[#2A1B7A]/90 transition-colors flex-shrink-0"
          >
            <ShoppingCart className="h-6 w-6" />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#F28C3A] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
              selectedCategory === category 
                ? 'bg-[#F28C3A] text-white shadow-md shadow-[#F28C3A]/20' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#F28C3A] hover:text-[#F28C3A]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700">No products found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search or category filter.</p>
          <Button onClick={() => {setSearchQuery(''); setSelectedCategory('All');}} className="mt-6 bg-[#2A1B7A] hover:bg-[#2A1B7A]/90">
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group hover:shadow-md transition-all hover:border-[#F28C3A]/30 cursor-pointer" onClick={() => setSelectedProduct(product)}>
              <div className="relative h-56 overflow-hidden bg-gray-100">
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-[#2A1B7A] shadow-sm">
                  {product.category}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-[#2A1B7A] text-lg leading-tight line-clamp-2 flex-1 pr-2">{product.name}</h3>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-yellow-700">{product.rating}</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{product.description}</p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                  <span className="font-bold text-xl text-[#F28C3A]">{product.price.toLocaleString()} ETB</span>
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 rounded-xl px-4 py-2 h-auto"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-full text-gray-500 hover:text-gray-800 hover:bg-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="md:w-1/2 h-64 md:h-auto bg-gray-100 relative">
              <img 
                src={selectedProduct.image_url} 
                alt={selectedProduct.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold text-[#2A1B7A] shadow-sm">
                {selectedProduct.category}
              </div>
            </div>
            
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-bold text-yellow-700">{selectedProduct.rating}</span>
                </div>
                <span className="text-sm text-gray-500 underline decoration-gray-300 underline-offset-2">({selectedProduct.reviews} reviews)</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl font-bold text-[#2A1B7A] mb-2">{selectedProduct.name}</h2>
              <p className="text-2xl font-bold text-[#F28C3A] mb-6">{selectedProduct.price.toLocaleString()} ETB</p>
              
              <div className="space-y-4 mb-8 flex-1">
                <h3 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Description</h3>
                <p className="text-gray-600 leading-relaxed">{selectedProduct.description}</p>
                
                <ul className="space-y-2 pt-4">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500" /> In stock and ready to ship
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Truck className="h-4 w-4 text-[#F28C3A]" /> Same-day delivery available
                  </li>
                </ul>
              </div>
              
              <Button 
                onClick={() => addToCart(selectedProduct)}
                className="w-full h-14 text-lg rounded-xl bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 shadow-lg shadow-[#2A1B7A]/20"
              >
                <ShoppingCart className="h-5 w-5 mr-2" /> Add to Cart
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Sidebar/Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end transition-opacity">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-2xl font-bold text-[#2A1B7A] flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" /> Your Cart
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="bg-gray-50 p-6 rounded-full">
                    <ShoppingCart className="h-16 w-16 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700">Your cart is empty</h3>
                  <p className="text-gray-500">Looks like you haven't added anything to your cart yet.</p>
                  <Button onClick={() => setIsCartOpen(false)} className="mt-4 bg-[#F28C3A] hover:bg-[#F28C3A]/90 rounded-xl">
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <img src={item.product.image_url} alt={item.product.name} className="w-20 h-20 object-cover rounded-xl" referrerPolicy="no-referrer" />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-[#2A1B7A] line-clamp-1">{item.product.name}</h4>
                          <p className="text-[#F28C3A] font-bold text-sm mt-1">{item.product.price.toLocaleString()} ETB</p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-200">
                            <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-white rounded-md text-gray-600 transition-colors">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-white rounded-md text-gray-600 transition-colors">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button onClick={() => updateQuantity(item.product.id, -item.quantity)} className="text-xs text-red-500 hover:text-red-700 font-medium underline underline-offset-2">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-500 text-sm">
                    <span>Subtotal</span>
                    <span>{cartTotal.toLocaleString()} ETB</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-sm">
                    <span>Delivery Fee</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-[#2A1B7A] pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-[#F28C3A]">{cartTotal.toLocaleString()} ETB</span>
                  </div>
                </div>
                <Button 
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }} 
                  className="w-full h-14 text-lg rounded-xl bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 shadow-lg shadow-[#2A1B7A]/20"
                >
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-0 shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
            {!orderSuccess ? (
              <>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h2 className="text-2xl font-bold text-[#2A1B7A]">Checkout</h2>
                  <button onClick={() => setIsCheckoutOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Col: Form */}
                    <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-[#2A1B7A] flex items-center gap-2 border-b pb-2">
                          <MapPin className="h-5 w-5 text-[#F28C3A]" /> Delivery Details
                        </h3>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 ml-1">Delivery Address</label>
                          <Input required value={dropLocation} onChange={(e) => setDropLocation(e.target.value)} placeholder="Enter full address" className="h-12 rounded-xl bg-gray-50 border-gray-200" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 ml-1">Receiver Phone</label>
                          <Input required value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} placeholder="+251 911 000000" className="h-12 rounded-xl bg-gray-50 border-gray-200" />
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <h3 className="text-lg font-bold text-[#2A1B7A] flex items-center gap-2 border-b pb-2">
                          <CreditCard className="h-5 w-5 text-[#F28C3A]" /> Payment Method
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('chapa')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              paymentMethod === 'chapa'
                                ? 'border-[#F28C3A] bg-[#F28C3A]/5'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="font-bold text-[#2A1B7A]">Chapa</div>
                            <div className="text-xs text-gray-500 mt-1">Pay online securely</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cod')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              paymentMethod === 'cod'
                                ? 'border-[#2A1B7A] bg-[#2A1B7A]/5'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className="font-bold text-[#2A1B7A]">Cash on Delivery</div>
                            <div className="text-xs text-gray-500 mt-1">Pay when you receive</div>
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Right Col: Order Summary */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 h-fit">
                      <h3 className="text-lg font-bold text-[#2A1B7A] mb-4">Order Summary</h3>
                      <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2">
                        {cart.map(item => (
                          <div key={item.product.id} className="flex justify-between text-sm">
                            <span className="text-gray-600 line-clamp-1 pr-4">{item.quantity}x {item.product.name}</span>
                            <span className="font-medium text-gray-800 whitespace-nowrap">{(item.product.price * item.quantity).toLocaleString()} ETB</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-2 pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-gray-500 text-sm">
                          <span>Subtotal</span>
                          <span>{cartTotal.toLocaleString()} ETB</span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-sm">
                          <span>Delivery Fee (Estimated)</span>
                          <span>150 ETB</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-[#2A1B7A] pt-4 border-t border-gray-200 mt-2">
                          <span>Total</span>
                          <span className="text-[#F28C3A]">{(cartTotal + 150).toLocaleString()} ETB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-white">
                  <Button 
                    type="submit" 
                    form="checkout-form"
                    className="w-full h-14 text-lg rounded-xl bg-[#F28C3A] hover:bg-[#F28C3A]/90 shadow-lg shadow-[#F28C3A]/20" 
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing Order...' : `Place Order • ${(cartTotal + 150).toLocaleString()} ETB`}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-16 px-8 space-y-6">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-[#2A1B7A]">Order Confirmed!</h2>
                <p className="text-gray-500 text-lg max-w-md mx-auto">
                  Thank you for shopping with ZED Store. Your order has been placed successfully and a driver will be assigned shortly.
                </p>
                <div className="pt-8">
                  <Button 
                    onClick={() => {
                      setOrderSuccess(false);
                      setIsCheckoutOpen(false);
                      navigate('/customer-dashboard');
                    }} 
                    className="w-full sm:w-auto px-8 h-14 rounded-xl bg-[#2A1B7A] hover:bg-[#2A1B7A]/90 text-lg"
                  >
                    Track My Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
