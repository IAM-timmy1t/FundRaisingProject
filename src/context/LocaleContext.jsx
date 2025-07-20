import React, { createContext, useState, useContext, useMemo } from 'react';
import { countries } from '@/lib/countries';

const LocaleContext = createContext();

export const LocaleProvider = ({ children }) => {
  const [country, setCountry] = useState('GLOBAL');
  const [language, setLanguage] = useState('en');

  const currency = useMemo(() => {
    const selectedCountry = countries.find(c => c.code === country);
    return selectedCountry ? selectedCountry.currency : countries.find(c => c.code === 'GLOBAL').currency;
  }, [country]);

  const convertFromUSD = (amount) => {
    return amount * currency.rate;
  };

  const formatCurrency = (usdAmount, showSymbol = true) => {
    const localAmount = convertFromUSD(usdAmount);
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: currency.code,
      currencyDisplay: 'symbol'
    }).format(localAmount).replace(currency.code, showSymbol ? currency.symbol : '').trim();
  };

  const value = {
    country,
    setCountry,
    language,
    setLanguage,
    currency,
    formatCurrency,
    convertFromUSD
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  return useContext(LocaleContext);
};