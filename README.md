# Monthly Finance Tracker

A modern React web application for tracking monthly income and expenses with Firebase authentication and Firestore database.

## Features

- 🔐 **Authentication**: Email and password sign-up/login using Firebase Auth
- 📊 **Dashboard**: Visual overview with summary cards and charts
- 💰 **Transactions**: Full transaction management with add/edit capabilities
- 📈 **Charts**: Income vs Expense visualization using Recharts
- 🎨 **Dark Mode**: Toggle between light and dark themes
- 📱 **Responsive**: Mobile and desktop friendly design

## Tech Stack

- **React 18** with Vite
- **Tailwind CSS** for styling
- **Firebase** (Authentication + Firestore)
- **React Router** for navigation
- **Recharts** for data visualization

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Firebase:**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Copy your Firebase configuration

3. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration values:
     ```
     VITE_FIREBASE_API_KEY=your_api_key_here
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
     VITE_FIREBASE_PROJECT_ID=your_project_id_here
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
     VITE_FIREBASE_APP_ID=your_app_id_here
     ```

4. **Set up Firestore Security Rules:**
   - Go to Firestore Database → Rules in Firebase Console
   - Replace the default rules with:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /transactions/{transactionId} {
         allow read: if request.auth != null && request.auth.uid == resource.data.userId;
         allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
         allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
       }
     }
   }
   ```
   - Note: Firestore may prompt you to create a composite index for the queries. Follow the link in the error message to create it automatically.

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/
│   ├── AddTransactionModal.jsx
│   ├── SummaryCard.jsx
│   └── TransactionTable.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── Login.jsx
│   ├── Signup.jsx
│   └── Transactions.jsx
├── context/
│   └── AuthContext.jsx
├── firebase.js
├── App.jsx
├── main.jsx
└── index.css
```

## Features Overview

### Authentication
- Secure email/password authentication
- Protected routes for authenticated users
- Automatic redirect to login if not authenticated

### Dashboard
- Current month overview
- Total income, expenses, and balance
- Average daily expense calculation
- Weekly income vs expense chart

### Transactions
- Full transaction table with all details
- Add new transactions via modal form
- Automatic calculations and summaries
- Real-time updates from Firestore

## License

MIT
