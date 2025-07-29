import { env } from './env-validation';

/**
 * API Constants
 */
export const API_BASE_URL = env.apiUrl;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    PROFILE: '/auth/profile',
    REFRESH: '/auth/refresh',
  },
  CSRF_TOKEN: '/csrf-token',
  USERS: {
    ME: '/users/me',
    UPDATE: '/users/me',
    CHANGE_PASSWORD: '/users/change-password',
    CONTRIBUTION_GRAPH: (userId: string) => `/users/${userId}/contribution-graph`,
  },
  SNIPPETS: {
    BASE: '/snippets',
    SINGLE: (id: string) => `/snippets/${id}`,
    STARRED: '/snippets/starred',
    DETAIL: (id: string) => `/snippets/${id}`,
  },
  TAGS: {
    POPULAR: '/snippets/tags/popular',
  },
  COMMENTS: {
    FOR_SNIPPET: (snippetId: string) => `/snippets/${snippetId}/comments`,
    SINGLE: (commentId: string) => `/comments/${commentId}`,
    MY_COMMENTS: '/comments/my-comments',
    THREADED: (snippetId: string) => `/snippets/${snippetId}/comments/threaded`,
    ADD_REPLY: (snippetId: string, commentId: string) => `/snippets/${snippetId}/comments/${commentId}/replies`,
    GET_REPLIES: (commentId: string) => `/comments/${commentId}/replies`,
    THREAD: (commentId: string) => `/comments/${commentId}/thread`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (notificationId: string) => `/notifications/${notificationId}/read`,
    MARK_ALL_READ: '/notifications/read-all',
    UNREAD_COUNT: '/notifications/unread-count',
  },
  STARS: {
    TOGGLE: (snippetId: string) => `/snippets/${snippetId}/stars`,
    COUNT: (snippetId: string) => `/snippets/${snippetId}/stars/count`,
    CHECK: (snippetId: string) => `/snippets/${snippetId}/stars/me`,
    LIST: (snippetId: string) => `/snippets/${snippetId}/stars`,
    STATS: (snippetId: string) => `/snippets/${snippetId}/stars/stats`,
  },
  FOLLOWS: {
    TOGGLE: (userId: string) => `/users/${userId}/follow`,
    FOLLOWERS: (userId: string) => `/users/${userId}/followers`,
    FOLLOWING: (userId: string) => `/users/${userId}/following`,
    FOLLOWER_COUNT: (userId: string) => `/users/${userId}/followers/count`,
    FOLLOWING_COUNT: (userId: string) => `/users/${userId}/following/count`,
    CHECK: (userId: string) => `/users/${userId}/follow/me`,
  },
  USER_SEARCH: {
    SEARCH: '/users/search',
  },
  USER_PROFILE: {
    PUBLIC: (userId: string) => `/users/${userId}/profile`,
  },
  EXECUTIONS: {
    BASE: '/executions',
    LANGUAGES: '/executions/languages',
    STATS: '/executions/stats',
  },
  WEBHOOKS: {
    HEALTH: '/webhooks/health',
  },
};

/**
 * Supported Programming Languages
 */
export const SUPPORTED_LANGUAGES = [
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: 'js',
    icon: 'logos:javascript',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: 'ts',
    icon: 'logos:typescript-icon',
  },
  {
    id: 'python',
    name: 'Python',
    extension: 'py',
    icon: 'logos:python',
  },
  {
    id: 'java',
    name: 'Java',
    extension: 'java',
    icon: 'logos:java',
  },
  {
    id: 'csharp',
    name: 'C#',
    extension: 'cs',
    icon: 'logos:c-sharp',
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: 'cpp',
    icon: 'logos:c-plusplus',
  },
  {
    id: 'go',
    name: 'Go',
    extension: 'go',
    icon: 'logos:go',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    extension: 'rb',
    icon: 'logos:ruby',
  },
  {
    id: 'rust',
    name: 'Rust',
    extension: 'rs',
    icon: 'logos:rust',
  },
  {
    id: 'swift',
    name: 'Swift',
    extension: 'swift',
    icon: 'logos:swift',
  },
];

/**
 * API Limits
 */
export const API_LIMITS = {
  CODE_MAX_LENGTH: 50000,
  COMMENT_MAX_LENGTH: 1000,
  TITLE_MAX_LENGTH: 100,
  NAME_MAX_LENGTH: 100,
  BIO_MAX_LENGTH: 500,
  EXECUTION_TIMEOUT: 30000, // 30 seconds
  MAX_USERS_PER_PAGE: 20, // Pagination limit for user lists
  MAX_TAGS_PER_SNIPPET: 10,
  MAX_TAG_LENGTH: 30,
  MIN_TAG_LENGTH: 2,
  MAX_COMMENT_DEPTH: 3, // Maximum nesting level for comment threads
  MAX_NOTIFICATIONS_PER_PAGE: 20, // Pagination limit for notifications
  RATE_LIMIT: {
    EXECUTIONS: 10, // 10 per minute
    SNIPPET_CREATION: 5, // 5 per minute
    COMMENTS: 20, // 20 per minute
    GENERAL: 100, // 100 per minute
    STARS: 30, // 30 per minute
  },
};

/**
 * Notification Settings
 */
export const NOTIFICATION_POLL_INTERVAL = 60000; // 60 seconds - less aggressive polling

/**
 * Error Codes
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
};

/**
 * Responsive Breakpoints
 */
export const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1280,
  DESKTOP: 1280,
};

/**
 * Animation Priorities
 */
export const ANIMATION_PRIORITIES = {
  P1: {
    BUTTON_EFFECTS: true,
    LOADING_STATES: true,
    SIDEBAR_TRANSITIONS: true,
  },
  P2: {
    TEXT_EFFECTS: true,
    PAGE_TRANSITIONS: true,
    HOVER_EFFECTS: true,
  },
};

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  THEME: 'theme',
  EDITOR_SETTINGS: 'editor-settings',
  CODE_DRAFTS: 'snippetlab-drafts',
};

/**
 * Default Editor Settings
 */
export const DEFAULT_EDITOR_SETTINGS = {
  theme: 'vs-dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  minimap: {
    enabled: false,
  },
  lineNumbers: 'on',
  automaticLayout: true,
};

/**
 * Language Code Templates
 */
export const LANGUAGE_TEMPLATES: Record<string, string> = {
  javascript: `// JavaScript example
console.log('Hello, World!');

// Function example
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('SnippetLab'));`,
  
  typescript: `// TypeScript example
interface Person {
  name: string;
  age: number;
}

function greet(person: Person): string {
  return \`Hello, \${person.name}! You are \${person.age} years old.\`;
}

const user: Person = { name: 'SnippetLab', age: 1 };
console.log(greet(user));`,
  
  python: `# Python example
print("Hello, World!")

# Function example
def greet(name):
    return f"Hello, {name}!"

print(greet("SnippetLab"))

# List comprehension example
numbers = [x**2 for x in range(5)]
print(f"Squares: {numbers}")`,
  
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        // Method example
        String greeting = greet("SnippetLab");
        System.out.println(greeting);
    }
    
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}`,
  
  csharp: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
        
        // Method example
        string greeting = Greet("SnippetLab");
        Console.WriteLine(greeting);
    }
    
    static string Greet(string name) {
        return $"Hello, {name}!";
    }
}`,
  
  cpp: `#include <iostream>
#include <string>
using namespace std;

string greet(string name) {
    return "Hello, " + name + "!";
}

int main() {
    cout << "Hello, World!" << endl;
    
    // Function example
    string greeting = greet("SnippetLab");
    cout << greeting << endl;
    
    return 0;
}`,
  
  go: `package main

import "fmt"

func greet(name string) string {
    return fmt.Sprintf("Hello, %s!", name)
}

func main() {
    fmt.Println("Hello, World!")
    
    // Function example
    greeting := greet("SnippetLab")
    fmt.Println(greeting)
}`,
  
  ruby: `# Ruby example
puts "Hello, World!"

# Method example
def greet(name)
  "Hello, #{name}!"
end

puts greet("SnippetLab")

# Array manipulation
numbers = (1..5).map { |x| x ** 2 }
puts "Squares: #{numbers}"`,
  
  rust: `// Rust example
fn main() {
    println!("Hello, World!");
    
    // Function example
    let greeting = greet("SnippetLab");
    println!("{}", greeting);
    
    // Vector example
    let squares: Vec<i32> = (1..6).map(|x| x * x).collect();
    println!("Squares: {:?}", squares);
}

fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}`,
  
  swift: `// Swift example
import Foundation

print("Hello, World!")

// Function example
func greet(_ name: String) -> String {
    return "Hello, \\(name)!"
}

print(greet("SnippetLab"))

// Array manipulation
let numbers = (1...5).map { $0 * $0 }
print("Squares: \\(numbers)")`
};
