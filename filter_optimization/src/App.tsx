import React, { useState, useEffect, useMemo } from 'react';
import * as Papa from 'papaparse';

interface DataRow {
    number: number;
    mod3: number;
    mod4: number;
    mod5: number;
    mod6: number;
}

interface Filters {
    mod3: number[];
    mod4: number[];
    mod5: number[];
    mod6: number[];
}

const App: React.FC = () => {
    const [data, setData] = useState<DataRow[]>([]);

    const [filters, setFilters] = useState<Filters>({
        mod3: [],
        mod4: [],
        mod5: [],
        mod6: []
    });

    const [searchTerms, setSearchTerms] = useState({
        mod3: '',
        mod4: '',
        mod5: '',
        mod6: ''
    });

    const [dropdownOpen, setDropdownOpen] = useState({
        mod3: false,
        mod4: false,
        mod5: false,
        mod6: false
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [scrollIndex, setScrollIndex] = useState(0);

    const rowsPerPage = 100;
    const visibleRows = 20;

    // Handle file upload
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

                    if (parsed.data) {
                        const processedData: DataRow[] = parsed.data.map((row) => ({
                            number: parseInt(row.number) || 0,
                            mod3: parseInt(row.mod3) || 0,
                            mod4: parseInt(row.mod4) || 0,
                            mod5: parseInt(row.mod5) || 0,
                            mod6: parseInt(row.mod6) || 0
                        }));
                        setData(processedData);
                    }
                } catch (error) {
                    console.error('Error parsing CSV:', error);
                }
            };
            reader.readAsText(file);
        }
    };

    // Load default data
    useEffect(() => {
        // Default sample data
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
        setData(sampleData);
    }, []);

    // Get available values for a specific filter based on other active filters
    const getAvailableValuesForFilter = (targetColumn: keyof Filters) => {
        // Create a filter object excluding the target column
        const otherFilters = { ...filters };
        delete otherFilters[targetColumn];
        
        // Filter data based on other active filters
        const filteredData = data.filter(row => {
            if (otherFilters.mod3 && otherFilters.mod3.length > 0 && !otherFilters.mod3.includes(row.mod3)) return false;
            if (otherFilters.mod4 && otherFilters.mod4.length > 0 && !otherFilters.mod4.includes(row.mod4)) return false;
            if (otherFilters.mod5 && otherFilters.mod5.length > 0 && !otherFilters.mod5.includes(row.mod5)) return false;
            if (otherFilters.mod6 && otherFilters.mod6.length > 0 && !otherFilters.mod6.includes(row.mod6)) return false;
            return true;
        });

        // Get unique values for the target column from the filtered data
        const uniqueValues = [...new Set(filteredData.map(row => row[targetColumn]))].sort((a, b) => a - b);
        return uniqueValues;
    };

    // Filter data
    const filteredData = useMemo(() => {
        return data.filter(row => {
            if (filters.mod3.length > 0 && !filters.mod3.includes(row.mod3)) return false;
            if (filters.mod4.length > 0 && !filters.mod4.includes(row.mod4)) return false;
            if (filters.mod5.length > 0 && !filters.mod5.includes(row.mod5)) return false;
            if (filters.mod6.length > 0 && !filters.mod6.includes(row.mod6)) return false;
            return true;
        });
    }, [data, filters]);

    // Paginate data
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, currentPage]);

    // Get visible rows for scrolling
    const visibleData = useMemo(() => {
        return paginatedData.slice(scrollIndex, scrollIndex + visibleRows);
    }, [paginatedData, scrollIndex]);

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const maxScrollIndex = Math.max(0, paginatedData.length - visibleRows);

    const handleMultiSelectChange = (filterType: keyof Filters, value: number) => {
        setFilters(prev => {
            const currentValues = prev[filterType];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];

                return {
                    ...prev,
                    [filterType]: newValues
                };
        });
        setCurrentPage(1);
        setScrollIndex(0);
    };

    const handleSearchChange = (filterType: keyof typeof searchTerms, value: string) => {
        setSearchTerms(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const toggleDropdown = (filterType: keyof typeof dropdownOpen) => {
        setDropdownOpen(prev => ({
            ...prev,
            [filterType]: !prev[filterType]
        }));
    };

    const getFilteredValues = (column: keyof DataRow, searchTerm: string) => {
        const availableValues = getAvailableValuesForFilter(column);
        return availableValues.filter(val => 
            val.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handleScroll = (direction: 'up' | 'down') => {
        if (direction === 'up' && scrollIndex > 0) {
            setScrollIndex(scrollIndex - 1);
        } else if (direction === 'down' && scrollIndex < maxScrollIndex) {
            setScrollIndex(scrollIndex + 1);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Business Intelligence Dashboard</h1>

        {/* File Upload Section */}
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
            <h3>Load CSV File</h3>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ marginBottom: '10px' }}
            />
            <div style={{ fontSize: '14px', color: '#666' }}>
                Upload your CSV file with columns: number, mod3, mod4, mod5, mod6
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                Current dataset has {data.length} rows
            </div>
        </div>

        {/* Filters Section */}
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Filters</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {(['mod3', 'mod4', 'mod5', 'mod6'] as const).map(column => (
            <div key={column} style={{ position: 'relative', minWidth: '200px' }}>
            <label>{column} dropdown: </label>
            <div style={{ position: 'relative' }}>
            <div 
            onClick={() => toggleDropdown(column)}
            style={{ 
                border: '1px solid #ccc', 
                padding: '8px', 
                cursor: 'pointer',
                backgroundColor: 'white',
                minHeight: '20px'
            }}
            >
            {filters[column].length === 0 
                ? 'Select values...' 
                : `${filters[column].length} selected`
            }
            </div>

            {dropdownOpen[column] && (
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
                value={searchTerms[column]}
                onChange={(e) => handleSearchChange(column, e.target.value)}
                style={{
                    width: '100%',
                    padding: '8px',
                    border: 'none',
                    borderBottom: '1px solid #eee',
                    boxSizing: 'border-box'
                }}
                />

                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {getFilteredValues(column, searchTerms[column]).map(value => (
                    <div
                    key={value}
                    onClick={() => handleMultiSelectChange(column, value)}
                    style={{
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor: filters[column].includes(value) ? '#e6f3ff' : 'white',
                        borderBottom: '1px solid #f0f0f0'
                    }}
                    >
                    <input
                    type="checkbox"
                    checked={filters[column].includes(value)}
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
        ))}
        </div>

        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        Green - selected, White - unselected
        </div>
        </div>
        {/* Data Table */}
        <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
        <span>Total Records: {filteredData.length}</span>
        <span style={{ marginLeft: '20px' }}>
        Showing {scrollIndex + 1}-{Math.min(scrollIndex + visibleRows, paginatedData.length)} of {paginatedData.length} (Page {currentPage} of {totalPages})
        </span>
        </div>

        <div style={{ border: '1px solid #ccc', marginBottom: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
        <tr style={{ backgroundColor: '#f0f0f0' }}>
        <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>number</th>
        <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>mod3</th>
        <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>mod4</th>
        <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>mod5</th>
        <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>mod6</th>
        </tr>
        </thead>
        <tbody>
        {visibleData.map((row, index) => (
            <tr key={scrollIndex + index}>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{row.number}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{row.mod3}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{row.mod4}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{row.mod5}</td>
            <td style={{ border: '1px solid #ccc', padding: '8px' }}>{row.mod6}</td>
            </tr>
        ))}
        </tbody>
        </table>
        </div>

        {/* Scroll Controls */}
        <div style={{ marginBottom: '10px' }}>
        <button 
        onClick={() => handleScroll('up')} 
        disabled={scrollIndex === 0}
        style={{ marginRight: '10px', padding: '5px 10px' }}
        >
        Scroll Up
        </button>
        <button 
        onClick={() => handleScroll('down')} 
        disabled={scrollIndex >= maxScrollIndex}
        style={{ padding: '5px 10px' }}
        >
        Scroll Down
        </button>
        <span style={{ marginLeft: '20px' }}>
        Scroll Position: {scrollIndex + 1} - {Math.min(scrollIndex + visibleRows, paginatedData.length)}
        </span>
        </div>

        {/* Pagination Controls */}
        <div>
        <button 
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
        disabled={currentPage === 1}
        style={{ marginRight: '10px', padding: '5px 10px' }}
        >
        Previous Page
        </button>
        <span style={{ margin: '0 10px' }}>
        Page {currentPage} of {totalPages}
        </span>
        <button 
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
        disabled={currentPage === totalPages}
        style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
        Next Page
        </button>
        </div>
        </div>

        {/* Filter Summary */}
        {(filters.mod3.length > 0 || filters.mod4.length > 0 || filters.mod5.length > 0 || filters.mod6.length > 0) && (
            <div style={{ padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
            <h4>Active Filters:</h4>
            {filters.mod3.length > 0 && <div>mod3: {filters.mod3.join(', ')}</div>}
            {filters.mod4.length > 0 && <div>mod4: {filters.mod4.join(', ')}</div>}
            {filters.mod5.length > 0 && <div>mod5: {filters.mod5.join(', ')}</div>}
            {filters.mod6.length > 0 && <div>mod6: {filters.mod6.join(', ')}</div>}
            </div>
        )}
        </div>
    );
};

export default App;
