import React from 'react';
import { render, screen } from '@testing-library/react';
import { SnippetCard } from '../components/snippet/SnippetCard';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { TestSnippet } from './types/test-types';

// Mock the StarButton component
jest.mock('../components/snippet/StarButton', () => ({
  StarButton: ({ snippetId }: { snippetId: string; initialStarCount: number; isSmall?: boolean }) => (
    <button data-testid={`star-button-${snippetId}`}>Star</button>
  ),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line react/display-name
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-testid="link">
      {children}
    </a>
  );
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="motion-div">{children}</div>
    ),
  },
}));

// Add mock for jest-dom matchers
// Types are already provided by @testing-library/jest-dom

describe('SnippetCard Component', () => {
  const mockSnippet: TestSnippet = {
    _id: '123',
    title: 'Test Snippet',
    code: 'console.log("Hello World");',
    programmingLanguage: 'javascript',
    language: 'javascript', // Add both property naming conventions
    userName: 'Test User',
    author: { name: 'Test User', _id: 'user123' }, // Add both property naming conventions
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    stars: 5,
    comments: 3,
    isStarred: false,
  };

  it('renders the snippet title', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    expect(screen.getByText('Test Snippet')).toBeInTheDocument();
  });

  it('renders the language name', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
  });

  it('renders the username', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    expect(screen.getByText('By Test User')).toBeInTheDocument();
  });

  it('renders the star button', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    expect(screen.getByTestId('star-button-123')).toBeInTheDocument();
  });

  it('renders the star count', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders the comment count', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the date', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    const formattedDate = formatDistanceToNow(new Date('2023-01-01T00:00:00.000Z'), { addSuffix: true });
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });

  it('renders a link to the snippet detail page', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    const link = screen.getByTestId('link');
    expect(link).toHaveAttribute('href', '/snippets/123');
  });

  it('renders code preview', () => {
    render(<SnippetCard snippet={mockSnippet} />);
    expect(screen.getByText('console.log("Hello World");')).toBeInTheDocument();
  });
}); 