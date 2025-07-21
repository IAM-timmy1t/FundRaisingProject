import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true }
  ];
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  
  const handleLanguageChange = (langCode) => {
    const selectedLang = languages.find(l => l.code === langCode);
    i18n.changeLanguage(langCode);
    
    // Update document direction for RTL languages
    document.dir = selectedLang?.rtl ? 'rtl' : 'ltr';
    
    // Save preference to localStorage
    localStorage.setItem('preferredLanguage', langCode);
    
    setIsOpen(false);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Apply saved language preference on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && languages.some(l => l.code === savedLang)) {
      handleLanguageChange(savedLang);
    }
  }, []);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="Select language"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:block">{currentLanguage.flag} {currentLanguage.name}</span>
        <span className="sm:hidden">{currentLanguage.flag}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-3 ${
                  currentLanguage.code === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
                dir={language.rtl ? 'rtl' : 'ltr'}
              >
                <span className="text-lg">{language.flag}</span>
                <span>{language.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
