-- Simplified Database Schema for Jason's Landscaping Business System
-- Remove foreign key constraints to fix client creation issues

-- Business configuration table
CREATE TABLE IF NOT EXISTS business_settings (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    tax_rate REAL NOT NULL DEFAULT 0.075,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service areas table
CREATE TABLE IF NOT EXISTS service_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service types table
CREATE TABLE IF NOT EXISTS service_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price_range TEXT NOT NULL,
    default_rate REAL NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method_name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clients table - main entity WITHOUT FOREIGN KEY CONSTRAINTS
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    area TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    service_type TEXT NOT NULL,
    services TEXT NOT NULL, -- Detailed service description
    price TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'Active', -- Active/Inactive
    last_service DATE,
    next_service DATE,
    created_date DATE NOT NULL,
    total_invoiced REAL DEFAULT 0.0,
    total_paid REAL DEFAULT 0.0,
    last_scheduled TEXT, -- JSON string for last scheduled service details
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_area ON clients(area);
CREATE INDEX IF NOT EXISTS idx_clients_service_type ON clients(service_type);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_next_service ON clients(next_service);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- Update timestamp trigger
CREATE TRIGGER IF NOT EXISTS update_clients_timestamp AFTER UPDATE ON clients BEGIN
    UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;