import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import TransactionTable from '../components/TransactionTable';
import AddTransactionModal from '../components/AddTransactionModal';
import SummaryCard from '../components/SummaryCard';
import TransactionFilters from '../components/TransactionFilters';
import Calculator from '../components/Calculator';
import ConfirmModal from '../components/ConfirmModal';
import { getFirestoreErrorMessage } from '../utils/errorHandler';
import { exportToPDF } from '../utils/exportImport';

export default function Transactions() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ type: null, category: null, startDate: null, endDate: null });
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Small delay to ensure auth state is fully set
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuOpen && !event.target.closest('.mobile-menu-container')) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const fetchTransactions = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');
      
      // Fetch all transactions for the user (no complex queries)
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      let transactionsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort client-side by date (descending)
      transactionsData.sort((a, b) => {
        const aDate = a.date?.toDate ? a.date.toDate().getTime() : (a.date ? new Date(a.date).getTime() : 0);
        const bDate = b.date?.toDate ? b.date.toDate().getTime() : (b.date ? new Date(b.date).getTime() : 0);
        return bDate - aDate;
      });

      // Filter for current month client-side
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      
      const currentMonthTransactions = transactionsData.filter((t) => {
        if (!t.date) return false;
        const date = t.date.toDate ? t.date.toDate() : new Date(t.date);
        return date >= startOfMonth && date <= endOfMonth;
      });

      setTransactions(currentMonthTransactions);
      setFilteredTransactions(currentMonthTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // More detailed error handling
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please make sure you are signed in and your Firestore security rules allow read access to your transactions.');
      } else if (error.code === 'unauthenticated') {
        setError('You must be signed in to view transactions. Please sign in and try again.');
        navigate('/login');
      } else {
        const errorMessage = getFirestoreErrorMessage(error, 'fetch');
        if (errorMessage) {
          setError(errorMessage);
        }
      }
      
      // Set empty arrays to prevent blank page
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      filtered = filtered.filter(t => {
        if (!t.date) return false;
        const date = t.date.toDate ? t.date.toDate() : new Date(t.date);
        return date >= startDate;
      });
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => {
        if (!t.date) return false;
        const date = t.date.toDate ? t.date.toDate() : new Date(t.date);
        return date <= endDate;
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, filters]);

  const handleAddTransaction = async (transactionData) => {
    if (!currentUser) return;

    try {
      setActionLoading(true);
      const transactionRef = collection(db, 'transactions');
      const dateObj = new Date(transactionData.date);
      dateObj.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      const transactionPayload = {
        userId: currentUser.uid,
        date: Timestamp.fromDate(dateObj),
        type: transactionData.type,
        description: transactionData.description,
        category: transactionData.category,
        amount: transactionData.amount,
        paymentMethod: transactionData.paymentMethod,
        notes: transactionData.notes || '',
        isRecurring: transactionData.isRecurring || false,
        recurringFrequency: transactionData.recurringFrequency || 'monthly',
      };

      // Handle receipt upload (if using Firebase Storage, you'd upload here)
      // For now, we'll store the file reference
      if (transactionData.receiptFile) {
        transactionPayload.receiptFileName = transactionData.receiptFile.name;
        transactionPayload.receiptFileSize = transactionData.receiptFile.size;
        // In production, upload to Firebase Storage and store URL
      }

      await addDoc(transactionRef, transactionPayload);

      // Refresh transactions
      await fetchTransactions();
      setIsModalOpen(false);
      setEditingTransaction(null);
      setError('');
    } catch (error) {
      console.error('Error adding transaction:', error);
      setError(getFirestoreErrorMessage(error, 'add'));
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
      
      const updatePayload = {
        date: Timestamp.fromDate(dateObj),
        type: transactionData.type,
        description: transactionData.description,
        category: transactionData.category,
        amount: transactionData.amount,
        paymentMethod: transactionData.paymentMethod,
        notes: transactionData.notes || '',
        isRecurring: transactionData.isRecurring || false,
        recurringFrequency: transactionData.recurringFrequency || 'monthly',
      };

      if (transactionData.receiptFile) {
        updatePayload.receiptFileName = transactionData.receiptFile.name;
        updatePayload.receiptFileSize = transactionData.receiptFile.size;
      }

      await updateDoc(transactionRef, updatePayload);

      // Refresh transactions
      await fetchTransactions();
      setIsModalOpen(false);
      setEditingTransaction(null);
      setError('');
    } catch (error) {
      console.error('Error updating transaction:', error);
      setError(getFirestoreErrorMessage(error, 'update'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    setConfirmModal({ isOpen: true, id: transactionId });
  };

  const confirmDelete = async () => {
    if (!confirmModal.id || !currentUser) return;

    try {
      setActionLoading(true);
      const transactionRef = doc(db, 'transactions', confirmModal.id);
      await deleteDoc(transactionRef);

      // Refresh transactions
      await fetchTransactions();
      setConfirmModal({ isOpen: false, id: null });
      setError('');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError(getFirestoreErrorMessage(error, 'delete'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    setError('');
  };

  const calculateStats = () => {
    const totalIncome = filteredTransactions
      .filter((t) => t.type === 'Income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpenses = filteredTransactions
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

  const handleExportPDF = () => {
    try {
      exportToPDF(filteredTransactions);
    } catch (error) {
      setError(error.message || 'Failed to export PDF. Please try again.');
    }
  };

  const handleClearFilters = () => {
    setFilters({ type: null, category: null, startDate: null, endDate: null });
  };

  const handleLogout = async () => {
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
      setError('Failed to sign out. Please try again.');
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
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <h1 className="hidden md:block text-xl font-bold text-gray-900 dark:text-white">Finance Tracker</h1>
              <h1 className="md:hidden text-xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
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
              <button onClick={() => navigate('/dashboard')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">Dashboard</button>
              <button onClick={() => navigate('/transactions')} className="px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 font-semibold">Transactions</button>
              <button onClick={() => navigate('/notes-todo')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">Notes</button>
              <button onClick={() => navigate('/debts')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">Debts</button>
              <button onClick={() => navigate('/budgets')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">Budgets</button>
              <button onClick={() => navigate('/reports')} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400">Reports</button>
              <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md">Logout</button>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden flex items-center space-x-2">
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
              
              {/* Mobile Menu Dropdown */}
              <div className="relative mobile-menu-container">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                {mobileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        navigate('/dashboard');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Dashboard
                    </button>
                    <button
                      onClick={() => {
                        navigate('/transactions');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Transactions
                    </button>
                    <button
                      onClick={() => {
                        navigate('/notes-todo');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Notes & Todo
                    </button>
                    <button
                      onClick={() => {
                        navigate('/debts');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Debts
                    </button>
                    <button
                      onClick={() => {
                        navigate('/budgets');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Budgets
                    </button>
                    <button
                      onClick={() => {
                        navigate('/reports');
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Reports
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
          <div className="flex gap-2">
            <button onClick={() => setIsCalculatorOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 hidden md:block">
              Calculator
            </button>
            <button onClick={handleExportPDF} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 hidden md:block">
              Export PDF
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={actionLoading}
              className="fixed bottom-6 right-6 md:relative md:bottom-auto md:right-auto z-40 w-14 h-14 md:w-auto md:h-auto md:px-4 md:py-2 bg-emerald-600 text-white rounded-full md:rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg md:shadow-none flex items-center justify-center"
              title="Add new transaction"
            >
              <svg className="w-6 h-6 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden md:inline">+ Add New</span>
            </button>
          </div>
        </div>

        {/* Transaction Filters */}
        <TransactionFilters filters={filters} onFilterChange={setFilters} onClearFilters={handleClearFilters} />

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-4 flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
            transactions={filteredTransactions} 
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      {/* Calculator Modal */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <button onClick={() => setIsCalculatorOpen(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <Calculator />
          </div>
        </div>
      )}

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onAdd={handleAddTransaction}
        onUpdate={handleUpdateTransaction}
        editingTransaction={editingTransaction}
        loading={actionLoading}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText="Delete"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
      />

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmText="Logout"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}