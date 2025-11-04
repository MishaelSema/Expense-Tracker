import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import SummaryCard from '../components/SummaryCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchTransactions();
  }, [currentUser, navigate]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const fetchTransactions = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', currentUser.uid),
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth)),
        orderBy('date', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const transactionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // If there's an index error, try without date filter
      if (error.code === 'failed-precondition') {
        try {
          const transactionsRef = collection(db, 'transactions');
          const q = query(
            transactionsRef,
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const transactionsData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          // Filter client-side for current month
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const filtered = transactionsData.filter((t) => {
            if (!t.date) return false;
            const date = t.date.toDate ? t.date.toDate() : new Date(t.date);
            return date >= startOfMonth && date <= endOfMonth;
          });
          setTransactions(filtered);
        } catch (fallbackError) {
          console.error('Fallback fetch error:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalIncome = transactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'Expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const balance = totalIncome - totalExpenses;

    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    const daysPassed = new Date().getDate();
    const averageDailyExpense = daysPassed > 0 ? totalExpenses / daysPassed : 0;

    return { totalIncome, totalExpenses, balance, averageDailyExpense };
  };

  const getWeekData = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const weeks = [];
    
    // Get all weeks in the current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    let weekStart = new Date(firstDay);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start from Sunday
    
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekIncome = transactions
        .filter((t) => {
          if (!t.date) return false;
          const date = t.date.toDate ? t.date.toDate() : new Date(t.date);
          return (
            t.type === 'Income' &&
            date >= weekStart &&
            date <= weekEnd &&
            date.getMonth() === currentMonth
          );
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const weekExpense = transactions
        .filter((t) => {
          if (!t.date) return false;
          const date = t.date.toDate ? t.date.toDate() : new Date(t.date);
          return (
            t.type === 'Expense' &&
            date >= weekStart &&
            date <= weekEnd &&
            date.getMonth() === currentMonth
          );
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      if (weekIncome > 0 || weekExpense > 0 || weekStart <= now) {
        weeks.push({
          week: `Week ${weeks.length + 1}`,
          Income: weekIncome,
          Expense: weekExpense,
        });
      }
      
      weekStart.setDate(weekStart.getDate() + 7);
    }
    
    return weeks.length > 0 ? weeks : [{ week: 'Week 1', Income: 0, Expense: 0 }];
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const { totalIncome, totalExpenses, balance, averageDailyExpense } = calculateStats();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const currentMonth = monthNames[new Date().getMonth()];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <div className="text-gray-600 dark:text-gray-400">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <img 
                src="/favicon-96x96.png" 
                alt="Monthly Finance Tracker" 
                className="h-8 w-8 sm:hidden"
              />
              <h1 className="hidden sm:block text-xl font-bold text-gray-900 dark:text-white">
                Monthly Finance Tracker
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => navigate('/transactions')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                Transactions
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentMonth} Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Financial overview for the current month
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Total Income"
            value={totalIncome}
            color="text-green-600 dark:text-green-400"
          />
          <SummaryCard
            title="Total Expenses"
            value={totalExpenses}
            color="text-red-600 dark:text-red-400"
          />
          <SummaryCard
            title="Current Balance"
            value={balance}
            color={balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
          />
          <SummaryCard
            title="Avg Daily Expense"
            value={averageDailyExpense}
            color="text-gray-600 dark:text-gray-400"
          />
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Income vs Expense by Week
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getWeekData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Income" fill="#10b981" />
              <Bar dataKey="Expense" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
