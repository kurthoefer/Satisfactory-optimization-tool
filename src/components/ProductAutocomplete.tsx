import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProductsByCategory, Product } from '@/types';
import { Input } from './ui/Input';
import { Dropdown } from './ui/Dropdown';
import { CategoryHeader } from './ui/CategoryHeader';
import { ProductGrid } from './ui/ProductGrid';
import { ProductTile } from './ui/ProductTile';
import { useDropdownNavigation } from '@/hooks/useDropdownNavigation';

interface ProductAutocompleteProps {
  productsByCategory: ProductsByCategory;
}

export default function ProductAutocomplete({
  productsByCategory,
}: ProductAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Filter products by search term
  const filteredProducts = Object.entries(productsByCategory).reduce(
    (acc, [category, products]) => {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as ProductsByCategory,
  );

  const handleProductSelect = (product: Product) => {
    navigate(`/calculate/${product.id}`);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClose = () => {
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const navigation = useDropdownNavigation({
    isOpen,
    filteredProducts,
    onSelect: handleProductSelect,
    onClose: handleClose,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className='relative'
    >
      <Input
        ref={inputRef}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={navigation.handleInputKeyDown}
        placeholder='Search for a product...'
        role='combobox'
        aria-expanded={isOpen}
        aria-controls='product-dropdown'
        aria-autocomplete='list'
      />

      <Dropdown isOpen={isOpen}>
        <div
          id='product-dropdown'
          role='listbox'
        >
          {navigation.gridSections.map((section) => (
            <div key={section.category}>
              <CategoryHeader>{section.category}</CategoryHeader>
              <ProductGrid
                ref={(el) => {
                  navigation.sectionRefs.current[section.category] = el;
                }}
              >
                {section.items.map((product, itemIdx) => {
                  const globalIndex = section.startIndex + itemIdx;
                  const isFocused = navigation.focusedIndex === globalIndex;

                  return (
                    <ProductTile
                      key={product.className}
                      ref={(el) => {
                        navigation.itemRefs.current[globalIndex] = el;
                      }}
                      product={product}
                      onClick={handleProductSelect}
                      onKeyDown={(e) =>
                        navigation.handleItemKeyDown(e, globalIndex)
                      }
                      tabIndex={-1}
                      isSelected={isFocused}
                    />
                  );
                })}
              </ProductGrid>
            </div>
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
