import React, { useState, useEffect, useMemo, createContext, useContext, useReducer } from 'react';
import * as Papa from 'papaparse';

interface DataRow {
    [key: string]: number;
}

interface Filters {
    [key: string]: number[];
}

interface SearchTerms {
    [key: string]: string;
}

interface DropdownState {
    [key: string]: boolean;
}

interface AppState {
    data: DataRow[];
    filters: Filters;
    searchTerms: SearchTerms;
    dropdownOpen: DropdownState;
    currentPage: number;
    scrollIndex: number;
    columns: string[];
}

type AppAction =
    | { type: 'SET_DATA'; payload: { data: DataRow[]; columns: string[] } }
    | { type: 'SET_FILTER'; payload: { filterType: string; values: number[] } }
    | { type: 'SET_SEARCH_TERM'; payload: { filterType: string; value: string } }
    | { type: 'TOGGLE_DROPDOWN'; payload: string }
    | { type: 'SET_CURRENT_PAGE'; payload: number }
    | { type: 'SET_SCROLL_INDEX'; payload: number }
    | { type: 'RESET_PAGINATION' };

const initialState: AppState = {
    data: [],
    filters: {},
    searchTerms: {},
    dropdownOpen: {},
    currentPage: 1,
    scrollIndex: 0,
    columns: []
};

const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'SET_DATA':
            // Initialize filters and search terms for new columns
            const newFilters: Filters = {};
            const newSearchTerms: SearchTerms = {};
            const newDropdownOpen: DropdownState = {};
            
            // Fix: Check if columns exists and is an array before calling forEach
            const columns = action.payload.columns || [];
            columns.forEach(col => {
                newFilters[col] = [];
                newSearchTerms[col] = '';
                newDropdownOpen[col] = false;
            });
            
            return { 
                ...state, 
                data: action.payload.data || [],
                columns: columns,
                filters: newFilters,
                searchTerms: newSearchTerms,
                dropdownOpen: newDropdownOpen,
                currentPage: 1,
                scrollIndex: 0
            };
        case 'SET_FILTER':
            return {
                ...state,
                filters: {
                    ...state.filters,
                    [action.payload.filterType]: action.payload.values
                }
            };
        case 'SET_SEARCH_TERM':
            return {
                ...state,
                searchTerms: {
                    ...state.searchTerms,
                    [action.payload.filterType]: action.payload.value
                }
            };
        case 'TOGGLE_DROPDOWN':
            return {
                ...state,
                dropdownOpen: {
                    ...state.dropdownOpen,
                    [action.payload]: !state.dropdownOpen[action.payload]
                }
            };
        case 'SET_CURRENT_PAGE':
            return { ...state, currentPage: action.payload };
        case 'SET_SCROLL_INDEX':
            return { ...state, scrollIndex: action.payload };
        case 'RESET_PAGINATION':
            return { ...state, currentPage: 1, scrollIndex: 0 };
        default:
            return state;
    }
};

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
    filteredData: DataRow[];
    paginatedData: DataRow[];
    visibleData: DataRow[];
    totalPages: number;
    maxScrollIndex: number;
    getAvailableValuesForFilter: (targetColumn: string) => number[];
    getFilteredValues: (column: string, searchTerm: string) => number[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);
    const rowsPerPage = 100;
    const visibleRows = 20;

    // Get available values for a specific filter based on other active filters
    const getAvailableValuesForFilter = (targetColumn: string) => {
        const otherFilters = { ...state.filters };
        delete otherFilters[targetColumn];
        
        const filteredData = state.data.filter(row => {
            return Object.keys(otherFilters).every(key => {
                const filterValues = otherFilters[key];
                return !filterValues || filterValues.length === 0 || filterValues.includes(row[key]);
            });
        });

        const uniqueValues = [...new Set(filteredData.map(row => row[targetColumn]))].sort((a, b) => a - b);
        return uniqueValues;
    };

    // Filter data
    const filteredData = useMemo(() => {
        return state.data.filter(row => {
            return Object.keys(state.filters).every(key => {
                const filterValues = state.filters[key];
                return !filterValues || filterValues.length === 0 || filterValues.includes(row[key]);
            });
        });
    }, [state.data, state.filters]);

    // Paginate data
    const paginatedData = useMemo(() => {
        const startIndex = (state.currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, state.currentPage]);

    // Get visible rows for scrolling
    const visibleData = useMemo(() => {
        return paginatedData.slice(state.scrollIndex, state.scrollIndex + visibleRows);
    }, [paginatedData, state.scrollIndex]);

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const maxScrollIndex = Math.max(0, paginatedData.length - visibleRows);

    const getFilteredValues = (column: string, searchTerm: string) => {
        const availableValues = getAvailableValuesForFilter(column);
        return availableValues.filter(val => 
            val.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const value: AppContextType = {
        state,
        dispatch,
        filteredData,
        paginatedData,
        visibleData,
        totalPages,
        maxScrollIndex,
        getAvailableValuesForFilter,
        getFilteredValues
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

const FileUpload: React.FC = () => {
    const { state, dispatch } = useAppContext();

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const csvData = e.target?.result as string;
                try {
                    const parsed = Papa.parse(csvData, {
                        header: true,
                        dynamicTyping: true,
                        skipEmptyLines: true
                    });

                    if (parsed.data && parsed.data.length > 0) {
                        // Get column names from the first row
                        const firstRow = parsed.data[0] as any;
                        const columns = Object.keys(firstRow);
                        
                        const processedData: DataRow[] = parsed.data.map((row: any) => {
                            const processedRow: DataRow = {};
                            columns.forEach(col => {
                                processedRow[col] = parseInt(row[col]) || 0;
                            });
                            return processedRow;
                        });
                        
                        dispatch({ type: 'SET_DATA', payload: { data: processedData, columns } });
                    }
                } catch (error) {
                    console.error('Error parsing CSV:', error);
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
            <h3>Load CSV File</h3>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ marginBottom: '10px' }}
            />
            <div style={{ fontSize: '14px', color: '#666' }}>
                Upload your CSV file with numeric columns
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                Current dataset has {state.data.length} rows
            </div>
        </div>
    );
};

const FilterDropdown: React.FC<{ column: string }> = ({ column }) => {
    const { state, dispatch, getFilteredValues } = useAppContext();

    const handleMultiSelectChange = (value: number) => {
        const currentValues = state.filters[column] || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];

        dispatch({ type: 'SET_FILTER', payload: { filterType: column, values: newValues } });
        dispatch({ type: 'RESET_PAGINATION' });
    };

    const handleSearchChange = (value: string) => {
        dispatch({ type: 'SET_SEARCH_TERM', payload: { filterType: column, value } });
    };

    const toggleDropdown = () => {
        dispatch({ type: 'TOGGLE_DROPDOWN', payload: column });
    };

    return (
        <div style={{ position: 'relative', minWidth: '200px' }}>
            <label>{column} dropdown: </label>
            <div style={{ position: 'relative' }}>
                <div 
                    onClick={toggleDropdown}
                    style={{ 
                        border: '1px solid #ccc', 
                        padding: '8px', 
                        cursor: 'pointer',
                        backgroundColor: 'white',
                        minHeight: '20px'
                    }}
                >
                    {(state.filters[column] || []).length === 0 
                        ? 'Select values...' 
                        : `${(state.filters[column] || []).length} selected`
                    }
                </div>

                {state.dropdownOpen[column] && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderTop: 'none',
                        maxHeight: '200px',
                        zIndex: 1000,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <input
                            type="text"
                            placeholder={`Search ${column}...`}
                            value={state.searchTerms[column] || ''}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: 'none',
                                borderBottom: '1px solid #eee',
                                boxSizing: 'border-box'
                            }}
                        />

                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {getFilteredValues(column, state.searchTerms[column] || '').map(value => (
                                <div
                                    key={value}
                                    onClick={() => handleMultiSelectChange(value)}
                                    style={{
                                        padding: '8px',
                                        cursor: 'pointer',
                                        backgroundColor: (state.filters[column] || []).includes(value) ? '#e6f3ff' : 'white',
                                        borderBottom: '1px solid #f0f0f0'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={(state.filters[column] || []).includes(value)}
                                        onChange={() => {}}
                                        style={{ marginRight: '8px' }}
                                    />
                                    {value}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const Filters: React.FC = () => {
    const { state } = useAppContext();
    
    return (
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
            <h3>Filters</h3>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {state.columns.map(column => (
                    <FilterDropdown key={column} column={column} />
                ))}
            </div>
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                Green - selected, White - unselected
            </div>
        </div>
    );
};

const DataTable: React.FC = () => {
    const { state, dispatch, filteredData, paginatedData, visibleData, totalPages, maxScrollIndex } = useAppContext();

    const handleScroll = (direction: 'up' | 'down') => {
        if (direction === 'up' && state.scrollIndex > 0) {
            dispatch({ type: 'SET_SCROLL_INDEX', payload: state.scrollIndex - 1 });
        } else if (direction === 'down' && state.scrollIndex < maxScrollIndex) {
            dispatch({ type: 'SET_SCROLL_INDEX', payload: state.scrollIndex + 1 });
        }
    };

    const handlePageChange = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && state.currentPage > 1) {
            dispatch({ type: 'SET_CURRENT_PAGE', payload: state.currentPage - 1 });
        } else if (direction === 'next' && state.currentPage < totalPages) {
            dispatch({ type: 'SET_CURRENT_PAGE', payload: state.currentPage + 1 });
        }
    };

    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ marginBottom: '10px' }}>
                <span>Total Records: {filteredData.length}</span>
                <span style={{ marginLeft: '20px' }}>
                    Showing {state.scrollIndex + 1}-{Math.min(state.scrollIndex + 20, paginatedData.length)} of {paginatedData.length} (Page {state.currentPage} of {totalPages})
                </span>
            </div>

            <div style={{ border: '1px solid #ccc', marginBottom: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f0f0f0' }}>
                            {state.columns.map(column => (
                                <th key={column} style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleData.map((row, index) => (
                            <tr key={state.scrollIndex + index}>
                                {state.columns.map(column => (
                                    <td key={column} style={{ border: '1px solid #ccc', padding: '8px' }}>
                                        {row[column]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Scroll Controls */}
            <div style={{ marginBottom: '10px' }}>
                <button 
                    onClick={() => handleScroll('up')} 
                    disabled={state.scrollIndex === 0}
                    style={{ marginRight: '10px', padding: '5px 10px' }}
                >
                    Scroll Up
                </button>
                <button 
                    onClick={() => handleScroll('down')} 
                    disabled={state.scrollIndex >= maxScrollIndex}
                    style={{ padding: '5px 10px' }}
                >
                    Scroll Down
                </button>
                <span style={{ marginLeft: '20px' }}>
                    Scroll Position: {state.scrollIndex + 1} - {Math.min(state.scrollIndex + 20, paginatedData.length)}
                </span>
            </div>

            {/* Pagination Controls */}
            <div>
                <button 
                    onClick={() => handlePageChange('prev')} 
                    disabled={state.currentPage === 1}
                    style={{ marginRight: '10px', padding: '5px 10px' }}
                >
                    Previous Page
                </button>
                <span style={{ margin: '0 10px' }}>
                    Page {state.currentPage} of {totalPages}
                </span>
                <button 
                    onClick={() => handlePageChange('next')} 
                    disabled={state.currentPage === totalPages}
                    style={{ marginLeft: '10px', padding: '5px 10px' }}
                >
                    Next Page
                </button>
            </div>
        </div>
    );
};

const FilterSummary: React.FC = () => {
    const { state } = useAppContext();
    const hasActiveFilters = Object.values(state.filters).some(filterArray => filterArray && filterArray.length > 0);

    if (!hasActiveFilters) return null;

    return (
        <div style={{ padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
            <h4>Active Filters:</h4>
            {Object.entries(state.filters).map(([column, values]) => (
                values && values.length > 0 && (
                    <div key={column}>{column}: {values.join(', ')}</div>
                )
            ))}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { dispatch } = useAppContext();

    // Load default data
    useEffect(() => {
        const sampleData: DataRow[] = [
            { number: 12, mod3: 0, mod4: 0, mod5: 2, mod6: 0 },
            { number: 24, mod3: 0, mod4: 0, mod5: 4, mod6: 0 },
            { number: 36, mod3: 0, mod4: 0, mod5: 1, mod6: 0 },
            { number: 48, mod3: 0, mod4: 0, mod5: 3, mod6: 0 },
            { number: 60, mod3: 0, mod4: 0, mod5: 0, mod6: 0 },
            { number: 34, mod3: 1, mod4: 2, mod5: 4, mod6: 4 },
            { number: 888, mod3: 0, mod4: 0, mod5: 3, mod6: 0 },
            { number: 446, mod3: 2, mod4: 2, mod5: 1, mod6: 2 },
            { number: 6, mod3: 0, mod4: 2, mod5: 1, mod6: 0 },
            { number: 23, mod3: 2, mod4: 3, mod5: 3, mod6: 5 },
            { number: 5664, mod3: 0, mod4: 0, mod5: 4, mod6: 0 }
        ];
        const columns = ['number', 'mod3', 'mod4', 'mod5', 'mod6'];
        dispatch({ type: 'SET_DATA', payload: { data: sampleData, columns } });
    }, [dispatch]);

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>Business Intelligence Dashboard</h1>
            <FileUpload />
            <Filters />
            <DataTable />
            <FilterSummary />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <Dashboard />
        </AppProvider>
    );
};

export default App;
