import * as React from 'react';
import { useState, useEffect, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  LogOut, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Store,
  QrCode,
  ChevronRight,
  User as UserIcon,
  MessageSquare,
  Star,
  PieChart,
  ShieldCheck,
  Wifi,
  WifiOff,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { User, Product, Sale, SalesSummary, InventorySummary } from './types';
import { cn, formatCurrency } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy, 
  limit,
  getDocFromServer,
  Timestamp,
  writeBatch,
  increment,
  getDocs
} from 'firebase/firestore';

// --- Firebase Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      let message = "Something went wrong.";
      try {
        const parsed = JSON.parse((this as any).state.error?.message || "{}");
        if (parsed.error) {
          message = `Database Error: ${parsed.error}. Please check your permissions or contact support.`;
        }
      } catch (e) {
        message = (this as any).state.error?.message || message;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
            <AlertTriangle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-2xl font-serif mb-4">Application Error</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#5A5A40] text-white px-8 py-3 rounded-full font-bold"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Components ---

const PlanSelection = ({ user, onPlanSelected }: { user: User, onPlanSelected: (plan: number) => void }) => {
  const plans = [
    { amount: 300, label: 'Basic', features: ['Inventory Tracking', 'Sales Recording', 'Basic Reports'] },
    { amount: 500, label: 'Standard', features: ['Everything in Basic', 'Profit Tracking', 'Low Stock Alerts'] },
    { amount: 1000, label: 'Premium', features: ['Everything in Standard', 'Advanced Analytics', 'Priority Support'] }
  ];

  const handleSelect = async (amount: number) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { plan: amount });
      onPlanSelected(amount);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full"
      >
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl mb-4">Choose Your Plan</h2>
          <p className="text-[#5A5A40] italic font-serif">Select a plan to start managing your Sari-Sari store</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <motion.div 
              key={plan.amount}
              whileHover={{ y: -10 }}
              className="bg-white rounded-[40px] p-8 shadow-lg border border-black/5 flex flex-col"
            >
              <div className="mb-6">
                <h3 className="font-serif text-2xl mb-1">{plan.label}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">₱{plan.amount}</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={12} />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSelect(plan.amount)}
                className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-bold hover:bg-[#4A4A30] transition-colors"
              >
                Select Plan
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const LandingPage = ({ onStart }: { onStart: () => void }) => {
  const isOnline = navigator.onLine;
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-xl border border-black/5"
      >
        <div className="w-20 h-20 bg-[#5A5A40] rounded-full flex items-center justify-center mx-auto mb-6">
          <Store className="text-white w-10 h-10" />
        </div>
        <h1 className="font-serif text-4xl font-light text-[#1A1A1A] mb-4">
          Sari-Sari Store <br />
          <span className="italic">Inventory System</span>
        </h1>
        <p className="text-[#5A5A40] mb-8 font-serif italic">
          Operational Feasibility Study Pilot <br />
          Daraga, Albay
        </p>
        
        <div className="bg-[#F5F5F0] p-6 rounded-2xl mb-8 flex flex-col items-center">
          <QRCodeSVG value={window.location.href} size={160} />
          <p className="text-xs mt-4 text-[#5A5A40] uppercase tracking-widest font-medium">Scan to Access System</p>
        </div>

        {!isOnline && (
          <div className="mb-6 p-4 bg-amber-50 rounded-2xl text-amber-700 text-sm flex items-center gap-2 justify-center">
            <WifiOff size={16} /> First-time setup requires internet.
          </div>
        )}

        <div className="space-y-3">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            disabled={!isOnline}
            className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-medium hover:bg-[#4A4A30] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Enter System <ChevronRight size={18} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

const AuthPage = ({ onAuth }: { onAuth: (user: User) => void }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        onAuth({ id: firebaseUser.uid, ...userSnap.data() } as User);
      } else {
        setIsRegistering(true);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const userData = {
        email: auth.currentUser.email || '',
        storeName: storeName,
        plan: 0
      };
      await setDoc(doc(db, 'users', auth.currentUser.uid), userData);
      onAuth({ id: auth.currentUser.uid, ...userData });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full bg-white rounded-[32px] p-8 shadow-lg border border-black/5"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store className="text-white" size={32} />
          </div>
          <h2 className="font-serif text-3xl font-light">Sari-Sari Pro</h2>
          <p className="text-[#5A5A40] italic font-serif text-sm mt-2">Professional Inventory for Daraga, Albay</p>
        </div>

        {isRegistering ? (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <h3 className="text-center font-serif text-xl mb-4">Complete Registration</h3>
            <div>
              <label className="text-xs uppercase tracking-widest text-[#5A5A40] font-bold mb-1 block">Store Name</label>
              <input 
                type="text" 
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                placeholder="e.g. Nena's Sari-Sari"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#5A5A40] text-white py-3 rounded-full font-medium hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Finish Setup'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <button 
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-full font-medium flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {loading ? 'Connecting...' : 'Continue with Google'}
            </button>
            
            <p className="text-[10px] text-gray-400 text-center px-4">
              By continuing, you agree to our terms and privacy policy. We use Google to ensure your store data is secure and accessible only to you.
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 bg-red-50 p-3 rounded-xl border border-red-100">
            <p className="text-red-500 text-xs italic text-center">{error}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const CATEGORY_COLORS: Record<string, string> = {
  'Chitchirya': '#FF6B6B',
  'Biscuits': '#4ECDC4',
  'Drinks': '#45B7D1',
  'Canned Goods': '#96CEB4',
  'Others': '#D4A373',
};

const Dashboard = ({ user }: { user: User }) => {
  const [summary, setSummary] = useState<SalesSummary>({ totalSales: 0, totalProfit: 0, totalTransactions: 0 });
  const [invSummary, setInvSummary] = useState<InventorySummary>({ totalCapital: 0, totalItems: 0, lowStockCount: 0 });
  const [history, setHistory] = useState<Sale[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'sales'), where('userId', '==', user.id), orderBy('saleDate', 'desc'), limit(50));
    const unsubscribeSales = onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          saleDate: data.saleDate instanceof Timestamp ? data.saleDate.toDate().toISOString() : data.saleDate
        } as Sale;
      });
      setHistory(sales);
      
      const totalSales = sales.reduce((acc, s) => acc + s.totalPrice, 0);
      const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);
      setSummary({ totalSales, totalProfit, totalTransactions: sales.length });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sales'));

    const qInv = query(collection(db, 'products'), where('userId', '==', user.id));
    const unsubscribeInv = onSnapshot(qInv, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const totalCapital = products.reduce((acc, p) => acc + (p.costPrice * p.stockQuantity), 0);
      const lowStockItems = products.filter(p => p.stockQuantity <= (p.minStockLevel || 5));
      setLowStockProducts(lowStockItems);
      setInvSummary({ totalCapital, totalItems: products.length, lowStockCount: lowStockItems.length });
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => {
      unsubscribeSales();
      unsubscribeInv();
    };
  }, [user.id]);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const categorySalesData = PREDEFINED_CATEGORIES.map(cat => {
    const total = history
      .filter(s => s.category === cat)
      .reduce((sum, s) => sum + s.totalPrice, 0);
    return { name: cat, value: total, color: CATEGORY_COLORS[cat] || '#999' };
  }).filter(item => item.value > 0);

  // Fallback for items without category (old records)
  const unknownSales = history
    .filter(s => !s.category || !PREDEFINED_CATEGORIES.includes(s.category))
    .reduce((sum, s) => sum + s.totalPrice, 0);
  
  if (unknownSales > 0) {
    categorySalesData.push({ name: 'Uncategorized', value: unknownSales, color: '#999' });
  }

  return (
    <div className="space-y-8">
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800">
          <WifiOff size={20} />
          <p className="text-sm font-medium">You are currently offline. Showing last synced data from Daraga.</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-light text-[#1A1A1A]">Welcome to the Inventory Management System</h1>
          <p className="text-[#5A5A40] italic font-serif">{user.storeName} • Daraga, Albay</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs uppercase tracking-widest font-bold text-gray-400">Total Sales</span>
          </div>
          <p className="text-2xl font-light">{formatCurrency(summary?.totalSales || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <span className="text-xs uppercase tracking-widest font-bold text-gray-400">Total Profit</span>
          </div>
          <p className="text-2xl font-light">{formatCurrency(summary?.totalProfit || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <PieChart size={20} />
            </div>
            <span className="text-xs uppercase tracking-widest font-bold text-gray-400">Total Capital</span>
          </div>
          <p className="text-2xl font-light">{formatCurrency(invSummary?.totalCapital || 0)}</p>
        </div>
        <div 
          onClick={() => setIsLowStockModalOpen(true)}
          className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 cursor-pointer hover:border-red-200 transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 text-red-600 rounded-xl">
              <AlertTriangle size={20} />
            </div>
            <span className="text-xs uppercase tracking-widest font-bold text-gray-400">Low Stock</span>
          </div>
          <p className="text-2xl font-light">{invSummary?.lowStockCount || 0} Items</p>
          <p className="text-[10px] text-red-400 mt-2 font-medium">Tap to view list</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5">
          <h3 className="font-serif text-xl mb-6">Sales by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySalesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {categorySalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 justify-center">
            {categorySalesData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-black/5">
          <h3 className="font-serif text-xl mb-6">Recent Transactions</h3>
          <div className="space-y-4">
            {history.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-3 border-bottom border-black/5">
                <div>
                  <p className="font-medium">{sale.product_name}</p>
                  <p className="text-xs text-gray-400">{new Date(sale.sale_date).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-600">+{formatCurrency(sale.total_price)}</p>
                  <p className="text-xs text-gray-400">Qty: {sale.quantity}</p>
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-gray-400 italic">No transactions yet.</p>}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isLowStockModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-2xl">Restock List</h2>
                  <p className="text-[#5A5A40] italic font-serif text-sm">Items that need immediate attention</p>
                </div>
                <button 
                  onClick={() => setIsLowStockModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-black/5">
                      <th className="py-3 text-xs uppercase tracking-widest font-bold text-gray-400">Product</th>
                      <th className="py-3 text-xs uppercase tracking-widest font-bold text-gray-400">Current</th>
                      <th className="py-3 text-xs uppercase tracking-widest font-bold text-gray-400">Min. Level</th>
                      <th className="py-3 text-xs uppercase tracking-widest font-bold text-gray-400">Suggested Restock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {lowStockProducts.map(p => (
                      <tr key={p.id}>
                        <td className="py-4">
                          <p className="font-medium text-sm">{p.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase">{p.category} • {p.unit}</p>
                        </td>
                        <td className="py-4 text-sm font-bold text-red-500">{p.stockQuantity}</td>
                        <td className="py-4 text-sm text-gray-500">{p.minStockLevel}</td>
                        <td className="py-4">
                          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                            +{Math.max(0, (p.targetStockLevel || p.minStockLevel * 2) - p.stockQuantity)} {p.unit}(s)
                          </span>
                        </td>
                      </tr>
                    ))}
                    {lowStockProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400 italic">
                          All products are healthy! No restocking needed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 pt-6 border-t border-black/5">
                <button 
                  onClick={() => setIsLowStockModalOpen(false)}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-bold hover:bg-[#4A4A30] transition-colors"
                >
                  Close List
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PREDEFINED_CATEGORIES = ['Chitchirya', 'Biscuits', 'Drinks', 'Canned Goods', 'Others'];

const Inventory = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('piece');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [targetStock, setTargetStock] = useState('20');
  const [activeCategory, setActiveCategory] = useState('All');

  // Edit state
  const [editStock, setEditStock] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editTargetStock, setEditTargetStock] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'products'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => unsubscribe();
  }, [user.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if product with same name and category already exists
      const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase() && p.category === category);
      if (existing) {
        const productRef = doc(db, 'products', existing.id);
        await updateDoc(productRef, {
          stockQuantity: existing.stockQuantity + parseInt(stockQuantity),
          costPrice: parseFloat(costPrice),
          sellingPrice: parseFloat(sellingPrice),
          targetStockLevel: parseInt(targetStock)
        });
        alert(`Product already exists. Updated stock for ${existing.name}.`);
      } else {
        await addDoc(collection(db, 'products'), {
          userId: user.id,
          name,
          category,
          unit,
          costPrice: parseFloat(costPrice),
          sellingPrice: parseFloat(sellingPrice),
          stockQuantity: parseInt(stockQuantity),
          minStockLevel: parseInt(minStock),
          targetStockLevel: parseInt(targetStock)
        });
      }
      setIsAdding(false);
      resetForm();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'products');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const productRef = doc(db, 'products', editingProduct.id);
      await updateDoc(productRef, {
        stockQuantity: parseInt(editStock),
        sellingPrice: parseFloat(editPrice),
        costPrice: parseFloat(editCost),
        targetStockLevel: parseInt(editTargetStock)
      });
      setEditingProduct(null);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `products/${editingProduct.id}`);
    }
  };

  const startEditing = (p: Product) => {
    setEditingProduct(p);
    setEditStock(p.stockQuantity.toString());
    setEditPrice(p.sellingPrice.toString());
    setEditCost(p.costPrice.toString());
    setEditTargetStock(p.targetStockLevel?.toString() || (p.minStockLevel * 2).toString());
  };

  const resetForm = () => {
    setName('');
    setCategory('');
    setUnit('piece');
    setCostPrice('');
    setSellingPrice('');
    setStockQuantity('');
    setMinStock('5');
    setTargetStock('20');
  };

  const categories = ['All', ...PREDEFINED_CATEGORIES];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-light">Product Inventory</h1>
          <p className="text-[#5A5A40] italic font-serif">Manage your stock and pricing</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="bg-white border border-black/10 text-[#5A5A40] px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            Print Report
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-[#5A5A40] text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 hover:bg-[#4A4A30] transition-colors"
          >
            <Plus size={18} /> Add New Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
        <div className="p-6 border-b border-black/5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#F5F5F0] border-none rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-[#5A5A40] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  activeCategory === cat 
                    ? "bg-[#5A5A40] text-white shadow-md" 
                    : "bg-[#F5F5F0] text-[#5A5A40] hover:bg-gray-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F5F5F0]/50">
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Product Name</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Category</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Unit</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Cost</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Price</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Stock</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Status</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Restock</th>
                <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F5F0]/30 transition-colors">
                  <td className="px-6 py-4 font-medium">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 italic">{p.unit}</td>
                  <td className="px-6 py-4 text-sm">{formatCurrency(p.costPrice)}</td>
                  <td className="px-6 py-4 text-sm font-medium">{formatCurrency(p.sellingPrice)}</td>
                  <td className="px-6 py-4 text-sm">{p.stockQuantity}</td>
                  <td className="px-6 py-4">
                    {p.stockQuantity <= p.minStockLevel ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                        <AlertTriangle size={12} /> LOW STOCK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                        HEALTHY
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {p.stockQuantity <= p.minStockLevel ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        +{Math.max(0, (p.targetStockLevel || p.minStockLevel * 2) - p.stockQuantity)}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => startEditing(p)}
                      className="text-[#5A5A40] hover:text-black transition-colors"
                    >
                      Edit/Restock
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                    {loading ? 'Loading products...' : 'No products found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl"
            >
              <h2 className="font-serif text-2xl mb-6">Add New Product</h2>
              <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Product Name</label>
                  <input 
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Category</label>
                  <select 
                    value={category} onChange={e => setCategory(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  >
                    <option value="">Select Category</option>
                    <option value="Chitchirya">Chitchirya</option>
                    <option value="Biscuits">Biscuits</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Canned Goods">Canned Goods</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Unit</label>
                  <select 
                    value={unit} onChange={e => setUnit(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  >
                    <option value="piece">Per Piece</option>
                    <option value="pack">Per Pack</option>
                    <option value="box">Per Box</option>
                    <option value="bottle">Per Bottle</option>
                    <option value="can">Per Can</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Min. Stock Level</label>
                  <input 
                    type="number" value={minStock} onChange={e => setMinStock(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Ideal Stock Level</label>
                  <input 
                    type="number" value={targetStock} onChange={e => setTargetStock(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Cost Price</label>
                  <input 
                    type="number" step="0.01" value={costPrice} onChange={e => setCostPrice(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Selling Price</label>
                  <input 
                    type="number" step="0.01" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Initial Stock Quantity</label>
                  <input 
                    type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
                <div className="col-span-2 flex gap-3 mt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 bg-gray-100 py-3 rounded-full font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#5A5A40] text-white py-3 rounded-full font-medium hover:bg-[#4A4A30]"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl"
            >
              <h2 className="font-serif text-2xl mb-2">Edit / Restock</h2>
              <p className="text-gray-500 mb-6 font-serif italic">{editingProduct.name} ({editingProduct.unit})</p>
              
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Current Stock Quantity</label>
                  <input 
                    type="number" value={editStock} onChange={e => setEditStock(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Cost Price</label>
                    <input 
                      type="number" step="0.01" value={editCost} onChange={e => setEditCost(e.target.value)} required
                      className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Selling Price</label>
                    <input 
                      type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} required
                      className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">Ideal Stock Level</label>
                  <input 
                    type="number" value={editTargetStock} onChange={e => setEditTargetStock(e.target.value)} required
                    className="w-full bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#5A5A40] text-white py-3 rounded-xl font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sales = ({ user }: { user: User }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState('1');

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('userId', '==', user.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => unsubscribe();
  }, [user.id]);

  const handleAddWithQuantity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const qty = parseInt(quantityInput);
    if (isNaN(qty) || qty <= 0) return;
    
    const existing = cart.find(item => item.product.id === selectedProduct.id);
    const currentInCart = existing ? existing.quantity : 0;
    const totalNeeded = currentInCart + qty;

    if (totalNeeded > selectedProduct.stockQuantity) {
      alert(`Not enough stock! Only ${selectedProduct.stockQuantity} available. You already have ${currentInCart} in cart.`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => item.product.id === selectedProduct.id ? { ...item, quantity: totalNeeded } : item));
    } else {
      setCart([...cart, { product: selectedProduct, quantity: qty }]);
    }
    setSelectedProduct(null);
    setQuantityInput('1');
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      
      for (const item of cart) {
        const saleRef = doc(collection(db, 'sales'));
        const productRef = doc(db, 'products', item.product.id);
        
        const totalPrice = item.product.sellingPrice * item.quantity;
        const totalCost = item.product.costPrice * item.quantity;
        const profit = totalPrice - totalCost;

        batch.set(saleRef, {
          userId: user.id,
          productId: item.product.id,
          productName: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          totalPrice,
          profit,
          saleDate: serverTimestamp()
        });

        batch.update(productRef, {
          stockQuantity: increment(-item.quantity)
        });
      }

      await batch.commit();
      setCart([]);
      alert('Sale recorded successfully!');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'sales/products');
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.product.sellingPrice * item.quantity), 0);

  const categories = ['All', ...PREDEFINED_CATEGORIES];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory && p.stockQuantity > 0;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-light">Record Sale</h1>
          <p className="text-[#5A5A40] italic font-serif">Quickly record customer purchases</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search products to sell..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-none rounded-2xl pl-12 pr-4 py-4 shadow-sm focus:ring-2 focus:ring-[#5A5A40] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                  activeCategory === cat 
                    ? "bg-[#5A5A40] text-white shadow-md" 
                    : "bg-white text-[#5A5A40] border border-black/5 hover:bg-gray-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => {
                setSelectedProduct(p);
                setQuantityInput('1');
              }}
              className="bg-white p-4 rounded-3xl border border-black/5 shadow-sm text-left hover:border-[#5A5A40] transition-all group"
            >
              <p className="font-medium mb-1 group-hover:text-[#5A5A40] transition-colors">{p.name}</p>
              <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-tighter">{p.category} • {p.unit}</p>
              <div className="flex items-center justify-between">
                <p className="font-bold">{formatCurrency(p.sellingPrice)}</p>
                <p className="text-[10px] bg-[#F5F5F0] px-2 py-1 rounded-full text-gray-500">Stock: {p.stockQuantity}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-xl border border-black/5 p-8 h-fit sticky top-8">
        <h3 className="font-serif text-2xl mb-6 flex items-center gap-2">
          <ShoppingCart size={24} className="text-[#5A5A40]" /> Current Sale
        </h3>
        
        <div className="space-y-4 mb-8 max-h-96 overflow-y-auto pr-2">
          {cart.map(item => (
            <div key={item.product.id} className="flex items-center justify-between group">
              <div className="flex-1">
                <p className="font-medium text-sm">{item.product.name}</p>
                <p className="text-xs text-gray-400">{item.quantity} {item.product.unit}(s) x {formatCurrency(item.product.sellingPrice)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-sm">{formatCurrency(item.product.sellingPrice * item.quantity)}</p>
                <button 
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Plus size={16} className="rotate-45" />
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="text-center py-12 text-gray-300">
              <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
              <p className="italic">Cart is empty</p>
            </div>
          )}
        </div>

        <div className="border-t border-black/5 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 uppercase tracking-widest text-xs font-bold">Total Amount</span>
            <span className="text-3xl font-light">{formatCurrency(total)}</span>
          </div>
          <button 
            disabled={cart.length === 0 || !isOnline}
            onClick={handleCheckout}
            className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-bold hover:bg-[#4A4A30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {!isOnline && <WifiOff size={18} />}
            {isOnline ? 'Complete Sale' : 'Offline - Reconnect to Save'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl"
            >
              <h2 className="font-serif text-2xl mb-2">Enter Quantity</h2>
              <p className="text-gray-500 mb-6 font-serif italic">
                {selectedProduct.name} - {formatCurrency(selectedProduct.sellingPrice)} per {selectedProduct.unit}
              </p>
              
              <form onSubmit={handleAddWithQuantity} className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-1 block">
                    How many {selectedProduct.unit}(s)?
                  </label>
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => setQuantityInput(prev => Math.max(1, parseInt(prev || '0') - 1).toString())}
                      className="w-12 h-12 rounded-xl bg-[#F5F5F0] flex items-center justify-center text-xl font-bold"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={quantityInput} 
                      onChange={e => setQuantityInput(e.target.value)} 
                      required
                      min="1"
                      max={selectedProduct.stockQuantity}
                      className="flex-1 bg-[#F5F5F0] border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#5A5A40] text-center text-xl font-bold"
                    />
                    <button 
                      type="button"
                      onClick={() => setQuantityInput(prev => Math.min(selectedProduct.stockQuantity, parseInt(prev || '0') + 1).toString())}
                      className="w-12 h-12 rounded-xl bg-[#F5F5F0] flex items-center justify-center text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Available: {selectedProduct.stockQuantity} {selectedProduct.unit}(s)</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#5A5A40] text-white py-3 rounded-xl font-medium hover:bg-[#4A4A30] transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Survey = ({ user }: { user: User }) => {
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.id,
        rating,
        comments,
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'feedback');
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <Star className="fill-current" size={40} />
        </div>
        <h2 className="font-serif text-3xl mb-2">Thank you for your feedback!</h2>
        <p className="text-[#5A5A40] italic font-serif">Your input helps us improve the system for Daraga.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-light">Pilot Feedback Survey</h1>
        <p className="text-[#5A5A40] italic font-serif">Help us refine the system for Daraga sari-sari stores</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[40px] shadow-sm border border-black/5 space-y-8">
        <div>
          <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-4 block">How easy is it to use the system?</label>
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setRating(num)}
                className={cn(
                  "flex-1 py-4 rounded-2xl font-bold transition-all",
                  rating === num 
                    ? "bg-[#5A5A40] text-white shadow-lg scale-105" 
                    : "bg-[#F5F5F0] text-gray-400 hover:bg-gray-200"
                )}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            <span>Very Difficult</span>
            <span>Very Easy</span>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest font-bold text-[#5A5A40] mb-2 block">What features would you like to see added?</label>
          <textarea 
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full bg-[#F5F5F0] border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#5A5A40] h-32 resize-none"
            placeholder="Share your thoughts..."
            required
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-[#5A5A40] text-white py-4 rounded-full font-bold hover:bg-[#4A4A30] transition-colors"
        >
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

const Management = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // For each user, fetch their product count and total sales
        const enrichedUsers = await Promise.all(usersData.map(async (u: any) => {
          const productsSnap = await getDocs(query(collection(db, 'products'), where('userId', '==', u.id)));
          const salesSnap = await getDocs(query(collection(db, 'sales'), where('userId', '==', u.id)));
          
          const totalSales = salesSnap.docs.reduce((acc, doc) => acc + (doc.data().totalPrice || 0), 0);
          
          return {
            ...u,
            productCount: productsSnap.size,
            totalSales
          };
        }));

        setStats(enrichedUsers);
      } catch (e) {
        handleFirestoreError(e, OperationType.LIST, 'users/stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8">Loading management dashboard...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-light">System Management</h1>
        <p className="text-[#5A5A40] italic font-serif">Overview of all registered stores in Daraga, Albay</p>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-black/5 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#F5F5F0]/50">
              <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Store Name</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Owner Email</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Plan</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Products</th>
              <th className="px-6 py-4 text-xs uppercase tracking-widest font-bold text-[#5A5A40]">Total Sales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {stats.map((s) => (
              <tr key={s.id} className="hover:bg-[#F5F5F0]/30 transition-colors">
                <td className="px-6 py-4 font-medium">{s.storeName}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.email}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    s.plan === 1000 ? "bg-purple-100 text-purple-600" :
                    s.plan === 500 ? "bg-blue-100 text-blue-600" :
                    s.plan === 300 ? "bg-emerald-100 text-emerald-600" :
                    "bg-gray-100 text-gray-600"
                  )}>
                    {s.plan ? `₱${s.plan}` : 'No Plan'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{s.productCount}</td>
                <td className="px-6 py-4 text-sm font-bold text-emerald-600">{formatCurrency(s.totalSales || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MobileLegendsIntro = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background Glow */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.5, 0], scale: [0.5, 1.5, 2] }}
        transition={{ duration: 3, times: [0, 0.5, 1], ease: "easeOut" }}
        className="absolute w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-[120px]"
      />

      <div className="relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 5, filter: "blur(20px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-2"
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] italic">
            KEAC <span className="text-amber-500">COMPANY</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="overflow-hidden"
        >
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent mb-4" />
          <p className="text-amber-200 uppercase tracking-[0.3em] text-sm md:text-base font-bold drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
            Inventory Management System
          </p>
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-4" />
        </motion.div>
      </div>

      {/* Particle-like lines */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 }}
          animate={{ opacity: [0, 1, 0], x: Math.random() * 1000 - 500, y: Math.random() * 1000 - 500 }}
          transition={{ duration: 2, delay: 0.5 + Math.random(), repeat: Infinity }}
          className="absolute w-1 h-1 bg-amber-400 rounded-full"
        />
      ))}
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [step, setStep] = useState<'landing' | 'auth' | 'app'>('landing');
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'sales' | 'survey' | 'management'>('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ id: firebaseUser.uid, ...userSnap.data() } as User);
          setStep('app');
        } else {
          setStep('auth');
        }
      } else {
        setUser(null);
        setStep('landing');
      }
      setIsAuthReady(true);
    });

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      unsubscribe();
    };
  }, []);

  const isAdmin = user?.email === 'carlderick89@gmail.com';

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setStep('auth');
  };

  if (!isAuthReady) return <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">Loading...</div>;

  if (showIntro) return <MobileLegendsIntro onComplete={() => setShowIntro(false)} />;

  if (step === 'landing') return <LandingPage onStart={() => setStep('auth')} />;
  if (step === 'auth' && !user) return <AuthPage onAuth={(u) => { setUser(u); setStep('app'); }} />;
  
  if (user && user.plan === 0) {
    return <PlanSelection user={user} onPlanSelected={(plan) => { setUser({ ...user, plan }); setShowIntro(true); }} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 bg-[#1A1A1A] text-white flex flex-col p-4 md:p-6 transition-all">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center shrink-0">
            <Store size={20} />
          </div>
          <div className="hidden md:block">
            <span className="font-serif text-xl block">Sari-Sari Pro</span>
            <div className="flex items-center gap-1 mt-1">
              {isOnline ? (
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                  <Wifi size={10} /> Online
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                  <WifiOff size={10} /> Offline
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'inventory', icon: Package, label: 'Inventory' },
            { id: 'sales', icon: ShoppingCart, label: 'Record Sale' },
            { id: 'survey', icon: MessageSquare, label: 'Feedback' },
            ...(isAdmin ? [{ id: 'management', icon: ShieldCheck, label: 'Management' }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
                activeTab === item.id 
                  ? "bg-[#5A5A40] text-white" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={20} />
              <span className="hidden md:block font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center shrink-0">
              <UserIcon size={14} />
            </div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.storeName}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={20} />
            <span className="hidden md:block font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && user && <Dashboard user={user} />}
            {activeTab === 'inventory' && user && <Inventory user={user} />}
            {activeTab === 'sales' && user && <Sales user={user} />}
            {activeTab === 'survey' && user && <Survey user={user} />}
            {activeTab === 'management' && isAdmin && <Management />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
