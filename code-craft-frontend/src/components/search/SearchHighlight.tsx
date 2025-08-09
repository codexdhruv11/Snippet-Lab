import React from 'react';
import { highlightSearchTerms } from '@/utils/searchUtils';

interface SearchHighlightProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

export const SearchHighlight: React.FC<SearchHighlightProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-yellow-300 dark:bg-yellow-700 font-semibold'
}) => {
  if (!query || !text) {
    return <span className={className}>{text}</span>;
  }

  const parts = highlightSearchTerms(text, query);
  
  return (
    <span className={className}>
      {parts.map((part, index) => 
        part.highlight ? (
          <mark 
            key={index} 
            className={highlightClassName}
            style={{ backgroundColor: 'transparent' }}
          >
            <span className={highlightClassName}>
              {part.text}
            </span>
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
};
