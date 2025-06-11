import React from 'react';

// Function to detect URLs and convert them to clickable links
export const linkifyText = (text: string): React.ReactNode => {
  if (!text) return text;

  // Enhanced URL regex that matches:
  // - http:// and https:// URLs
  // - www. URLs (without protocol)
  // - domain.extension URLs (basic)
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (!part) return null;
    
    // Check if this part is a URL
    if (urlRegex.test(part)) {
      let href = part;
      
      // Add protocol if missing
      if (part.startsWith('www.') || (!part.startsWith('http://') && !part.startsWith('https://'))) {
        href = `https://${part}`;
      }
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-words"
          onClick={(e) => e.stopPropagation()} // Prevent event bubbling to parent elements
        >
          {part}
        </a>
      );
    }
    
    return <span key={index}>{part}</span>;
  }).filter(Boolean); // Remove null entries
};

// Alternative function that preserves whitespace and line breaks
export const linkifyTextWithWhitespace = (text: string): React.ReactNode => {
  if (!text) return text;

  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => (
    <React.Fragment key={lineIndex}>
      {lineIndex > 0 && <br />}
      {linkifyText(line)}
    </React.Fragment>
  ));
}; 