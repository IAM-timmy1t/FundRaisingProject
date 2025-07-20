import React, { useState, useMemo } from 'react';
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
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { allCountries } from '@/lib/all_countries';
import { ChevronsUpDown } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

const TOP_COUNTRIES = ['United States', 'United Kingdom', 'South Africa'];

function CountryList({ onSelect }) {
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    const top = [];
    const rest = [];
    
    const lowercasedSearch = search.toLowerCase();

    allCountries.forEach(country => {
      if (country.name.toLowerCase().includes(lowercasedSearch)) {
        if (TOP_COUNTRIES.includes(country.name)) {
          top.push(country);
        } else {
          rest.push(country);
        }
      }
    });

    top.sort((a, b) => TOP_COUNTRIES.indexOf(a.name) - TOP_COUNTRIES.indexOf(b.name));
    rest.sort((a, b) => a.name.localeCompare(b.name));

    return [...top, ...rest];
  }, [search]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-2">
        <Command>
          <CommandInput 
            placeholder="Search country..." 
            value={search}
            onValueChange={setSearch}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-300"
          />
        </Command>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredCountries.length > 0 ? (
          <ul className="p-2">
            {filteredCountries.map((country) => (
              <li
                key={country.code}
                onClick={() => onSelect(country.name)}
                className="cursor-pointer p-2 rounded-md hover:bg-white/10 text-white"
              >
                {country.name}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center p-4 text-gray-400">No country found.</div>
        )}
      </div>
    </div>
  );
}

export function CountrySelector({ onValueChange }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleSelect = (countryName) => {
    const newValue = countryName === value ? '' : countryName;
    setValue(newValue);
    onValueChange(newValue);
    setOpen(false);
  };

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
          >
            {value
              ? allCountries.find((country) => country.name === value)?.name
              : 'Select your country...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-0 bg-gray-900 border-gray-700 text-white" align="start">
           <CountryList onSelect={handleSelect} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
        >
          {value ? value : "Select your country..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-gray-900 border-gray-700 text-white h-[80vh]">
        <div className="mt-4 border-t border-gray-700 h-full">
          <CountryList onSelect={handleSelect} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}