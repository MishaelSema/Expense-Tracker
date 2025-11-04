import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import TransactionTable from '../components/TransactionTable';
import AddTransactionModal from '../components/AddTransactionModal';
import SummaryCard from '../components/SummaryCard';

export default function Transactions() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
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

  const handleAddTransaction = async (transactionData) => {
    if (!currentUser) return;

    try {
      setActionLoading(true);
      const transactionRef = collection(db, 'transactions');
      const dateObj = new Date(transactionData.date);
      dateObj.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      await addDoc(transactionRef, {
        userId: currentUser.uid,
        date: Timestamp.fromDate(dateObj),
        type: transactionData.type,
        description: transactionData.description,
        category: transactionData.category,
        amount: transactionData.amount,
        paymentMethod: transactionData.paymentMethod,
        notes: transactionData.notes || '',
      });

      // Refresh transactions
      await fetchTransactions();
      setIsModalOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    // Convert Firestore timestamp to date string for the form
    let dateString = new Date().toISOString().split('T')[0];
    if (transaction.date) {
      const date = transaction.date.toDate ? transaction.date.toDate() : new Date(transaction.date);
      dateString = date.toISOString().split('T')[0];
    }
    
    setEditingTransaction({
      ...transaction,
      date: dateString,
    });
    setIsModalOpen(true);
  };

  const handleUpdateTransaction = async (transactionData) => {
    if (!currentUser || !editingTransaction) return;

    try {
      setActionLoading(true);
      const transactionRef = doc(db, 'transactions', editingTransaction.id);
      const dateObj = new Date(transactionData.date);
      dateObj.setHours(12, 0, 0, 0);
      
      await updateDoc(transactionRef, {
        date: Timestamp.fromDate(dateObj),
        type: transactionData.type,
        description: transactionData.description,
        category: transactionData.category,
        amount: transactionData.amount,
        paymentMethod: transactionData.paymentMethod,
        notes: transactionData.notes || '',
      });

      // Refresh transactions
      await fetchTransactions();
      setIsModalOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    if (!currentUser) return;

    try {
      setActionLoading(true);
      const transactionRef = doc(db, 'transactions', transactionId);
      await deleteDoc(transactionRef);

      // Refresh transactions
      await fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
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
          <div className="text-gray-600 dark:text-gray-400">Loading transactions...</div>
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
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                Dashboard
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
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentMonth} Transactions
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your financial transactions
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={actionLoading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add New
          </button>
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
            title="Net Balance"
            value={balance}
            color={balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
          />
          <SummaryCard
            title="Avg Daily Expense"
            value={averageDailyExpense}
            color="text-gray-600 dark:text-gray-400"
          />
        </div>

        {/* Info Box about Initial Balance */}
        {transactions.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Getting Started
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    To add your initial balance (money you already have), click <strong>"+ Add New"</strong> and create an Income transaction with category <strong>"Initial Balance"</strong>. 
                    This will set your starting amount for the month.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <TransactionTable 
            transactions={transactions} 
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onAdd={handleAddTransaction}
        onUpdate={handleUpdateTransaction}
        editingTransaction={editingTransaction}
        loading={actionLoading}
      />
    </div>
  );
}