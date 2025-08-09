import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { useSearch } from "@/hooks/useSearch";
import { useSearchFilters } from "@/hooks/useSearchFilters";

// Mock hooks
jest.mock("@/hooks/useSearch");
jest.mock("@/hooks/useSearchFilters");

// Mock data
const mockResults = [
  { id: "1", type: "snippet", data: { title: "Test Snippet", author: { name: "Author" }, createdAt: "2023-01-01T00:00:00Z" } },
  { id: "2", type: "user", data: { name: "Test User", bio: "Test bio" } },
];

const mockFilters = {
  scope: "all",
};

// Mock hook implementations
useSearch.mockReturnValue({
  query: "",
  results: mockResults,
  isLoading: false,
  error: null,
  totalCount: 2,
  setQuery: jest.fn(),
  setFilters: jest.fn(),
});

useSearchFilters.mockReturnValue({
  filters: mockFilters,
  setFilter: jest.fn(),
  clearFilters: jest.fn(),
});

// Test SearchResults
describe("SearchResults", () => {
  it("should render search results correctly", () => {
    render(<SearchResults />);

    expect(screen.getByText("Test Snippet")).toBeInTheDocument();
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("should render no results text when no results are available", () => {
    (useSearch as jest.Mock).mockReturnValue({
      query: "",
      results: [],
      isLoading: false,
      error: null,
      totalCount: 0,
      setQuery: jest.fn(),
      setFilters: jest.fn(),
    });

    render(<SearchResults />);

    expect(screen.getByText("No results found")).toBeInTheDocument();
  });
});

// Test SearchFilters
describe("SearchFilters", () => {
  it("should render search filters correctly", () => {
    render(<SearchResults />);

    expect(screen.getByLabelText("Language:")).toBeInTheDocument();
    expect(screen.getByLabelText("Author:")).toBeInTheDocument();
    expect(screen.getByLabelText("Tags:")).toBeInTheDocument();
  });

  it("should call setFilter when changing a filter", () => {
    const { getByLabelText } = render(<SearchFilters />);
    const languageSelect = getByLabelText("Language:");
    const authorInput = getByLabelText("Author:");
    const tagsInput = getByLabelText("Tags:");

    fireEvent.change(languageSelect, { target: { value: "javascript" } });
    fireEvent.change(authorInput, { target: { value: "new author" } });
    fireEvent.change(tagsInput, { target: { value: "newtag" } });

    expect((useSearchFilters as jest.Mock)().setFilter).toHaveBeenCalled();
  });
});

