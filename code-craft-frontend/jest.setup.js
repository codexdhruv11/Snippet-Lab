// Import jest-dom for custom matchers
import '@testing-library/jest-dom';
import './src/tests/setup';

// Mock next/router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: require('react').forwardRef(({ children, ...props }, ref) => (
      <div ref={ref} {...props}>
        {children}
      </div>
    )),
    nav: require('react').forwardRef(({ children, ...props }, ref) => (
      <nav ref={ref} {...props}>
        {children}
      </nav>
    )),
    ul: require('react').forwardRef(({ children, ...props }, ref) => (
      <ul ref={ref} {...props}>
        {children}
      </ul>
    )),
    li: require('react').forwardRef(({ children, ...props }, ref) => (
      <li ref={ref} {...props}>
        {children}
      </li>
    )),
    button: require('react').forwardRef(({ children, ...props }, ref) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    )),
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
  }),
})); 