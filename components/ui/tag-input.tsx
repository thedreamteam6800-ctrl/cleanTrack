'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Search, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface TagInputOption {
  id: string;
  title: string;
  description?: string;
  [key: string]: any;
}

export interface TagInputProps {
  value: TagInputOption[];
  onChange: (value: TagInputOption[]) => void;
  options: TagInputOption[];
  onSearch?: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  className?: string;
  renderOption?: (option: TagInputOption, isSelected: boolean) => React.ReactNode;
  renderTag?: (tag: TagInputOption, onRemove: () => void) => React.ReactNode;
  emptyMessage?: string;
  loading?: boolean;
  disableDropdown?: boolean; // When true, no dropdown under input
  showGhostSuggestion?: boolean; // Inline autofill ghost text
  enableSort?: boolean; // Allow drag-and-drop reordering of selected tags
}

export function TagInput({
  value = [],
  onChange,
  options = [],
  onSearch,
  placeholder = "Type to add tags...",
  disabled = false,
  maxTags,
  className,
  renderOption,
  renderTag,
  emptyMessage = "No options available.",
  loading = false,
  disableDropdown = false,
  showGhostSuggestion = false,
  enableSort = false,
}: TagInputProps) {
  
  // Debug: Log value changes
  useEffect(() => {
    console.log('TagInput value prop changed:', value);
  }, [value]);
  // Add custom scrollbar styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #f3f4f6;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const bestOption = React.useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return null;
    // prefer startsWith, then includes
    const byPrefix = options.find(o => (o.title || '').toLowerCase().startsWith(q));
    if (byPrefix) return byPrefix;
    return options.find(o => (o.title || '').toLowerCase().includes(q)) || null;
  }, [inputValue, options]);


  // Handle adding a new tag
  const handleAddTag = useCallback((option: TagInputOption) => {
    console.log('handleAddTag called with:', option);
    console.log('Current value before adding:', value);
    console.log('Current inputValue:', inputValue);
    
    if (maxTags && value.length >= maxTags) {
      console.log('Max tags reached, not adding');
      return;
    }
    
    const isAlreadySelected = value.some(tag => tag.id === option.id);
    console.log('Is already selected:', isAlreadySelected);
    
    if (!isAlreadySelected) {
      console.log('Adding new tag to value');
      const newValue = [...value, option];
      console.log('New value to be passed to onChange:', newValue);
      console.log('Calling onChange with new value');
      onChange(newValue);
      console.log('onChange called successfully');
    } else {
      console.log('Tag already selected, not adding');
    }
    
    console.log('Clearing input value');
    setInputValue('');
    // Keep dropdown open for better UX - user can continue selecting
    // setIsOpen(false); // Removed this line
    
    // Focus back to input
    setTimeout(() => {
      console.log('Focusing back to input');
      inputRef.current?.focus();
    }, 100);
  }, [value, onChange, maxTags]);

  // Handle removing a tag
  const handleRemoveTag = useCallback((tagId: string) => {
    onChange(value.filter(tag => tag.id !== tagId));
  }, [value, onChange]);

  // Handle input keydown
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      
      if (inputValue.trim()) {
        // Try to find exact match first
        const exactMatch = options.find(opt => 
          opt.title.toLowerCase() === inputValue.trim().toLowerCase()
        );
        
        if (exactMatch) {
          handleAddTag(exactMatch);
        } else if (bestOption) {
          handleAddTag(bestOption);
        }
        // If no match found, do nothing (don't add invalid tags)
      }
    } else if ((e.key === 'Tab' || e.key === 'ArrowRight') && showGhostSuggestion && bestOption) {
      e.preventDefault();
      setInputValue(bestOption.title);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      const lastTag = value[value.length - 1];
      handleRemoveTag(lastTag.id);
    }
  }, [inputValue, options, value, handleAddTag, handleRemoveTag, showGhostSuggestion, bestOption]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Input change:', value);
    setInputValue(value);
    // Keep dropdown open while typing for better UX
    if (!disableDropdown) setIsOpen(true);
    // Trigger search directly from main input
    if (onSearch) {
      onSearch(value);
    }
  }, [onSearch, disableDropdown]);

  // Handle input focus - show all options when focused
  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true);
    // Always open dropdown on focus for better UX
    if (!disableDropdown) setIsOpen(true);
    // Show all available options when input is focused
    if (onSearch && !inputValue.trim()) {
      onSearch('');
    }
  }, [onSearch, inputValue, disableDropdown]);



  // Handle input blur
  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false);
    // Don't close immediately - let the Popover handle it
    // This prevents the dropdown from closing when clicking inside it
    // We'll let the Popover's onOpenChange handle the closing logic
  }, []);

  // Prevent dropdown from closing when input is focused
  const handlePopoverOpenChange = useCallback((open: boolean) => {
    // Only close if we're not focusing the input
    if (!open && isInputFocused) {
      return; // Don't close if input is focused
    }
    setIsOpen(open);
  }, [isInputFocused]);

  // Default option renderer
  const defaultRenderOption = useCallback((option: TagInputOption, isSelected: boolean) => (
    <div className="flex items-center space-x-2 w-full">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{option.title}</div>
        {option.description && (
          <div className="text-sm text-muted-foreground line-clamp-2">
            {option.description}
          </div>
        )}
      </div>
      {isSelected && (
        <div className="text-xs text-blue-600 font-medium">Selected</div>
      )}
    </div>
  ), []);

  // Default tag renderer
  const defaultRenderTag = useCallback((tag: TagInputOption, onRemove: () => void) => (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 max-w-full group"
    >
      {enableSort && (
        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" aria-hidden="true" />
      )}
      <span className="truncate max-w-[150px] sm:max-w-[200px]">
        {tag.title}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-auto p-0 ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Remove tag: ${tag.title}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  ), [enableSort]);

  // Check if we can add more tags
  const canAddMore = !maxTags || value.length < maxTags;

  // Ensure dropdown stays open when input is focused
  useEffect(() => {
    if (isInputFocused && !isOpen) {
      setIsOpen(true);
    }
  }, [isInputFocused, isOpen]);

  return (
    <div className={cn("w-full", className)} ref={containerRef}>
             <Popover open={isOpen} onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "flex flex-wrap gap-2 min-h-[40px] px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              "transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => {
              // Focus the input first
              inputRef.current?.focus();
              // Always open dropdown on click
              setIsOpen(true);
            }}
          >
            {/* Render existing tags */}
            {value.map((tag, idx) => (
              <div
                key={tag.id}
                draggable={enableSort}
                onDragStart={(e) => {
                  if (!enableSort) return;
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(idx));
                }}
                onDragOver={(e) => { if (enableSort) e.preventDefault(); }}
                onDrop={(e) => {
                  if (!enableSort) return;
                  e.preventDefault();
                  const from = parseInt(e.dataTransfer.getData('text/plain') || '-1', 10);
                  const to = idx;
                  if (isNaN(from) || from === to || from < 0 || from >= value.length) return;
                  const next = [...value];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  onChange(next);
                }}
              >
                {renderTag ? renderTag(tag, () => handleRemoveTag(tag.id)) : defaultRenderTag(tag, () => handleRemoveTag(tag.id))}
              </div>
            ))}
            
            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={value.length === 0 ? placeholder : "Type to search or add tasks..."}
              disabled={disabled || !canAddMore}
              className={cn(
                "flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground",
                "disabled:cursor-not-allowed"
              )}
            />
            {disableDropdown && showGhostSuggestion && bestOption && inputValue && (
              <span className="ml-2 text-xs text-muted-foreground truncate" title={bestOption.title}>
                {bestOption.title}
              </span>
            )}
            
            {/* Add button when input has value */}
            {inputValue.trim() && canAddMore && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { if (bestOption) handleAddTag(bestOption); }}
                disabled={!bestOption}
                className="h-auto p-1 text-xs"
                aria-label="Add tag"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        {!disableDropdown && (
          <PopoverContent className="w-full p-0 max-h-[300px] overflow-hidden" align="start">
            <Command>
              <CommandList className="max-h-[280px] overflow-y-auto custom-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db #f3f4f6', msOverflowStyle: 'none' }}>
                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                  </div>
                )}
                {!loading && options.length === 0 && inputValue && (
                  <CommandEmpty>No options found.</CommandEmpty>
                )}
                {!loading && options.length === 0 && !inputValue && (
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                )}
                {!loading && options.length > 0 && value.length > 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">
                    {value.length} task(s) selected. Continue typing to search or select more.
                  </div>
                )}
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = value.some(tag => tag.id === option.id);
                    return (
                      <CommandItem key={option.id} onSelect={() => handleAddTag(option)} className="cursor-pointer" aria-label={`${isSelected ? 'Deselect' : 'Select'} option: ${option.title}`}>
                        {renderOption ? renderOption(option, isSelected) : defaultRenderOption(option, isSelected)}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
      
      
    </div>
  );
}
