// Export transactions to CSV
export function exportToCSV(transactions, filename = 'transactions') {
  if (transactions.length === 0) {
    alert('No transactions to export');
    return;
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const headers = ['Date', 'Type', 'Description', 'Category', 'Amount (FCFA)', 'Payment Method', 'Notes'];
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.type,
    t.description,
    t.category,
    t.amount || 0,
    t.paymentMethod || '',
    t.notes || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export transactions to PDF
export function exportToPDF(transactions, filename = 'transactions') {
  if (transactions.length === 0) {
    alert('No transactions to export');
    return;
  }

  // For PDF, we'll use window.print() with a styled table
  // Or use a library like jsPDF - for now, we'll create a printable HTML page
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount || 0);
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Transactions Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #10b981; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #10b981; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .total { font-weight: bold; margin-top: 20px; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Transactions Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Payment Method</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map((t) => `
              <tr>
                <td>${formatDate(t.date)}</td>
                <td>${t.type}</td>
                <td>${t.description}</td>
                <td>${t.category}</td>
                <td>${formatCurrency(t.amount)}</td>
                <td>${t.paymentMethod || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          <p>Total Income: ${formatCurrency(transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.amount || 0), 0))}</p>
          <p>Total Expenses: ${formatCurrency(transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.amount || 0), 0))}</p>
          <p>Net Balance: ${formatCurrency(transactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + (t.amount || 0), 0) - transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (t.amount || 0), 0))}</p>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

// Import transactions from CSV
export function importFromCSV(file, onImport) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const transactions = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
      if (values.length < headers.length) continue;
      
      const transaction = {};
      headers.forEach((header, index) => {
        transaction[header.toLowerCase().replace(/\s+/g, '_')] = values[index];
      });
      
      // Map to our transaction format
      transactions.push({
        date: transaction.date || new Date().toISOString().split('T')[0],
        type: transaction.type || 'Expense',
        description: transaction.description || '',
        category: transaction.category || 'Other',
        amount: parseFloat(transaction['amount_(fcfa)'] || transaction.amount || 0),
        paymentMethod: transaction['payment_method'] || transaction.paymentmethod || 'Cash',
        notes: transaction.notes || '',
      });
    }
    
    onImport(transactions);
  };
  reader.readAsText(file);
}

