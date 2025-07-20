import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/context/LocaleContext';
import { countries, languages } from '@/lib/countries';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Globe, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';


export function LocaleSelector() {
  const { i18n } = useTranslation();
  const { country, setCountry, language, setLanguage } = useLocale();
  const [open, setOpen] = useState(false);

  const handleCountrySelect = (countryCode) => {
    setCountry(countryCode);
    const selectedCountry = countries.find(c => c.code === countryCode);
    if (selectedCountry && selectedCountry.language) {
      handleLanguageSelect(selectedCountry.language);
    }
  };

  const handleLanguageSelect = (langCode) => {
    setLanguage(langCode);
    i18n.changeLanguage(langCode);
  };

  const selectedCountryName = useMemo(() => {
    return countries.find(c => c.code === country)?.name || 'Global';
  }, [country]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-auto justify-between bg-black/20 border-white/20 text-white hover:bg-white/20 hover:text-white"
        >
          <div className="flex items-center">
            <Globe className="mr-2 h-4 w-4" />
            {selectedCountryName}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-gray-900/80 backdrop-blur-md border-white/20 text-white">
        <Command>
          <CommandInput placeholder="Search country or language..." className="text-white border-white/20 focus:ring-purple-500" />
          <CommandList>
            <CommandEmpty className="text-gray-400">No results found.</CommandEmpty>
            <CommandGroup heading={<div className="flex items-center text-gray-400"><Globe className="mr-2 h-4 w-4" />Countries</div>}>
              {countries.map((c) => (
                <CommandItem
                  key={c.code}
                  value={c.name}
                  onSelect={() => {
                    handleCountrySelect(c.code);
                    setOpen(false);
                  }}
                  className="text-white hover:!bg-white/10 aria-selected:!bg-purple-600/50"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      country === c.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading={<div className="flex items-center text-gray-400"><Languages className="mr-2 h-4 w-4" />Languages</div>}>
              {languages.map((l) => (
                <CommandItem
                  key={l.code}
                  value={l.name}
                  onSelect={() => {
                    handleLanguageSelect(l.code);
                    setOpen(false);
                  }}
                  className="text-white hover:!bg-white/10 aria-selected:!bg-purple-600/50"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      language === l.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {l.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}