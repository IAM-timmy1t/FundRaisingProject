import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('Stripe publishable key is not configured. Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env.local file');
}

// Initialize Stripe instance (singleton)
let stripePromise;
export const getStripe = () => {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

// Stripe configuration
export const stripeConfig = {
  currency: 'usd', // Default currency
  supportedCurrencies: ['usd', 'eur', 'gbp', 'cad', 'aud'],
  
  // Payment method types to enable
  paymentMethodTypes: ['card'],
  
  // Appearance customization for Stripe Elements
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0ea5e9', // Sky-500 to match your theme
      colorBackground: '#ffffff',
      colorText: '#1e293b',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        border: '1px solid #e2e8f0',
        boxShadow: 'none',
      },
      '.Input:focus': {
        border: '1px solid #0ea5e9',
        boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.1)',
      },
      '.Label': {
        fontWeight: '500',
        marginBottom: '8px',
      },
    },
  },
  
  // Stripe Elements options
  elementsOptions: {
    fonts: [
      {
        cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
      },
    ],
  },
};

// Format amount for Stripe (convert to cents)
export const formatAmountForStripe = (amount, currency = 'usd') => {
  const numberAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Currencies that don't use decimal places
  const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp', 'pyg', 'xaf', 'xof', 'xpf'];
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return Math.round(numberAmount);
  }
  
  // For most currencies, multiply by 100 to convert to cents
  return Math.round(numberAmount * 100);
};

// Format amount from Stripe (convert from cents)
export const formatAmountFromStripe = (amount, currency = 'usd') => {
  const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp', 'pyg', 'xaf', 'xof', 'xpf'];
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return amount;
  }
  
  return amount / 100;
};

// Get currency symbol
export const getCurrencySymbol = (currency) => {
  const symbols = {
    usd: '$',
    eur: '€',
    gbp: '£',
    cad: 'CA$',
    aud: 'AU$',
    jpy: '¥',
    cny: '¥',
    inr: '₹',
    krw: '₩',
    brl: 'R$',
    mxn: 'MX$',
    chf: 'CHF',
    sek: 'SEK',
    nok: 'NOK',
    dkk: 'DKK',
  };
  
  return symbols[currency.toLowerCase()] || currency.toUpperCase();
};

// Get card brand icon
export const getCardBrandIcon = (brand) => {
  const brandIcons = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    discover: '💳',
    diners: '💳',
    jcb: '💳',
    unionpay: '💳',
    unknown: '💳',
  };
  
  return brandIcons[brand] || brandIcons.unknown;
};

// Validate donation amount
export const validateDonationAmount = (amount, currency = 'usd', minAmount = 1) => {
  const numberAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numberAmount) || numberAmount <= 0) {
    return {
      valid: false,
      error: 'Please enter a valid amount',
    };
  }
  
  if (numberAmount < minAmount) {
    return {
      valid: false,
      error: `Minimum donation amount is ${getCurrencySymbol(currency)}${minAmount}`,
    };
  }
  
  // Check for reasonable maximum (prevent mistakes)
  const maxAmount = 999999;
  if (numberAmount > maxAmount) {
    return {
      valid: false,
      error: `Maximum donation amount is ${getCurrencySymbol(currency)}${maxAmount}`,
    };
  }
  
  return {
    valid: true,
    error: null,
  };
};
