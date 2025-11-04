import { formatCurrency } from '../utils/currency';

export default function SummaryCard({ title, value, icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className={`text-2xl font-bold mt-2 ${color}`}>
            {typeof value === 'number' ? formatCurrency(value) : value}
          </p>
        </div>
        {icon && (
          <div className={`${color} opacity-20`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
