// Currency formatting utility for FCFA (Franc CFA)
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return amount;
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`;
};

export const formatCurrencyShort = (amount) => {
  if (typeof amount !== 'number') return amount;
  return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`;
};

export const formatCurrencyWithSign = (amount, isIncome = false) => {
  if (typeof amount !== 'number') return amount;
  const sign = isIncome ? '+' : '-';
  return `${sign}${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FCFA`;
};
