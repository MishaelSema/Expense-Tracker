import { useState, useEffect, useCallback } from 'react';

export default function Calculator({ onResult }) {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState('');

  const getOperationSymbol = (op) => {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return '';
    }
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return secondValue !== 0 ? firstValue / secondValue : 0;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const inputNumber = useCallback((num) => {
    setDisplay((prevDisplay) => {
      const newDisplay = waitingForOperand ? String(num) : (prevDisplay === '0' ? String(num) : prevDisplay + num);
      
      setWaitingForOperand((prevWaiting) => {
        if (prevWaiting) {
          setPreviousValue((prevVal) => {
            setExpression(prevVal !== null ? `${prevVal} ${getOperationSymbol(operation)} ${num}` : String(num));
            return prevVal;
          });
          return false;
        } else {
          setPreviousValue((prevVal) => {
            if (prevVal !== null && operation) {
              setExpression(`${prevVal} ${getOperationSymbol(operation)} ${newDisplay}`);
            } else {
              setExpression(newDisplay);
            }
            return prevVal;
          });
          return prevWaiting;
        }
      });
      
      return newDisplay;
    });
  }, [operation, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    setDisplay((prevDisplay) => {
      if (waitingForOperand) {
        setWaitingForOperand(false);
        setPreviousValue((prevVal) => {
          setExpression(prevVal !== null ? `${prevVal} ${getOperationSymbol(operation)} 0.` : '0.');
          return prevVal;
        });
        return '0.';
      } else if (prevDisplay.indexOf('.') === -1) {
        const newDisplay = prevDisplay + '.';
        setPreviousValue((prevVal) => {
          if (prevVal !== null && operation) {
            setExpression(`${prevVal} ${getOperationSymbol(operation)} ${newDisplay}`);
          } else {
            setExpression(newDisplay);
          }
          return prevVal;
        });
        return newDisplay;
      }
      return prevDisplay;
    });
  }, [operation, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setExpression('');
  }, []);

  const performOperation = useCallback((nextOperation) => {
    setDisplay((prevDisplay) => {
      const inputValue = parseFloat(prevDisplay);

      setPreviousValue((prevValue) => {
        if (prevValue === null) {
          setExpression(`${inputValue} ${getOperationSymbol(nextOperation)}`);
          setWaitingForOperand(true);
          setOperation(nextOperation);
          return inputValue;
        } else if (operation) {
          const currentValue = prevValue || 0;
          const newValue = calculate(currentValue, inputValue, operation);
          setDisplay(String(newValue));
          setExpression(`${newValue} ${getOperationSymbol(nextOperation)}`);
          setWaitingForOperand(true);
          setOperation(nextOperation);
          return newValue;
        } else {
          setExpression(`${inputValue} ${getOperationSymbol(nextOperation)}`);
          setWaitingForOperand(true);
          setOperation(nextOperation);
          return prevValue;
        }
      });

      return prevDisplay;
    });
  }, [operation]);

  const handleEquals = useCallback(() => {
    setDisplay((prevDisplay) => {
      const inputValue = parseFloat(prevDisplay);

      setPreviousValue((prevValue) => {
        if (prevValue !== null && operation) {
          const newValue = calculate(prevValue, inputValue, operation);
          setDisplay(String(newValue));
          setExpression(`${prevValue} ${getOperationSymbol(operation)} ${inputValue} = ${newValue}`);
          setOperation(null);
          setWaitingForOperand(true);
          
          if (onResult) {
            onResult(newValue);
          }
          return null;
        }
        return prevValue;
      });
      return prevDisplay;
    });
  }, [operation, onResult]);

  // Keyboard input handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Prevent default for calculator keys
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '=', '.', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
      }

      // Numbers
      if (e.key >= '0' && e.key <= '9') {
        inputNumber(parseInt(e.key));
      }
      // Decimal point
      else if (e.key === '.') {
        inputDecimal();
      }
      // Operations
      else if (e.key === '+') {
        performOperation('+');
      }
      else if (e.key === '-') {
        performOperation('-');
      }
      else if (e.key === '*') {
        performOperation('*');
      }
      else if (e.key === '/') {
        performOperation('/');
      }
      // Equals
      else if (e.key === '=' || e.key === 'Enter') {
        handleEquals();
      }
      // Clear
      else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
        clear();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [inputNumber, inputDecimal, performOperation, handleEquals, clear]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-full max-w-sm relative">
      <div className="mb-4">
        {/* Expression display */}
        {expression && (
          <div className="text-right text-sm text-gray-500 dark:text-gray-400 mb-2 min-h-[20px]">
            {expression}
          </div>
        )}
        {/* Main display */}
        <div className="text-right text-3xl font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto">
          {display}
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={clear}
          className="col-span-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          type="button"
        >
          Clear
        </button>
        <button
          onClick={() => performOperation('/')}
          className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          type="button"
        >
          ÷
        </button>
        <button
          onClick={() => performOperation('*')}
          className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          type="button"
        >
          ×
        </button>
        
        <button onClick={() => inputNumber(7)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">7</button>
        <button onClick={() => inputNumber(8)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">8</button>
        <button onClick={() => inputNumber(9)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">9</button>
        <button onClick={() => performOperation('-')} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">−</button>
        
        <button onClick={() => inputNumber(4)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">4</button>
        <button onClick={() => inputNumber(5)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">5</button>
        <button onClick={() => inputNumber(6)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">6</button>
        <button onClick={() => performOperation('+')} className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">+</button>
        
        <button onClick={() => inputNumber(1)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">1</button>
        <button onClick={() => inputNumber(2)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">2</button>
        <button onClick={() => inputNumber(3)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">3</button>
        <button onClick={handleEquals} className="row-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">=</button>
        
        <button onClick={() => inputNumber(0)} className="col-span-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">0</button>
        <button onClick={inputDecimal} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition-colors" type="button">.</button>
      </div>
      
      {onResult && (
        <button
          onClick={() => onResult(parseFloat(display))}
          className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          type="button"
        >
          Use Result
        </button>
      )}
    </div>
  );
}
