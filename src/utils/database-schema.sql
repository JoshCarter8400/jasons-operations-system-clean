-- Database Schema for Jason's Landscaping Business System
-- Based on localStorage audit findings from LOCALSTORAGE_AUDIT.md
-- Optimized for Turso (libSQL) with mobile-first design

-- Business configuration table
CREATE TABLE business_settings (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    tax_rate REAL NOT NULL DEFAULT 0.075,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service areas table
CREATE TABLE service_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service types table
CREATE TABLE service_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price_range TEXT NOT NULL,
    default_rate REAL NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods table
CREATE TABLE payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method_name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clients table - main entity
CREATE TABLE clients (
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (area) REFERENCES service_areas(area_name),
    FOREIGN KEY (service_type) REFERENCES service_types(name),
    FOREIGN KEY (payment_method) REFERENCES payment_methods(method_name)
);

-- Invoices table
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    client_name TEXT NOT NULL, -- Denormalized for quick access
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft/Sent/Paid/Overdue
    subtotal REAL NOT NULL DEFAULT 0.0,
    tax REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL DEFAULT 0.0,
    notes TEXT DEFAULT '',
    sent_date DATE,
    paid_date DATE,
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method) REFERENCES payment_methods(method_name)
);

-- Invoice line items table (normalized from localStorage structure)
CREATE TABLE invoice_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1.0,
    rate REAL NOT NULL,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Indexes for mobile performance optimization
-- Client-focused indexes (primary mobile use case)
CREATE INDEX idx_clients_area ON clients(area);
CREATE INDEX idx_clients_service_type ON clients(service_type);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_next_service ON clients(next_service);
CREATE INDEX idx_clients_name ON clients(name);

-- Invoice-focused indexes
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Line items index
CREATE INDEX idx_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Composite indexes for common mobile queries
CREATE INDEX idx_clients_area_status ON clients(area, status);
CREATE INDEX idx_clients_service_next ON clients(service_type, next_service);
CREATE INDEX idx_invoices_client_status ON invoices(client_id, status);

-- Full-text search for mobile client lookup
-- (Turso supports FTS5 for fast text search)
CREATE VIRTUAL TABLE clients_fts USING fts5(
    name, 
    address, 
    services, 
    notes,
    content='clients',
    content_rowid='id'
);

-- Triggers to maintain FTS index
CREATE TRIGGER clients_fts_insert AFTER INSERT ON clients BEGIN
    INSERT INTO clients_fts(rowid, name, address, services, notes) 
    VALUES (new.id, new.name, new.address, new.services, new.notes);
END;

CREATE TRIGGER clients_fts_delete AFTER DELETE ON clients BEGIN
    INSERT INTO clients_fts(clients_fts, rowid, name, address, services, notes) 
    VALUES('delete', old.id, old.name, old.address, old.services, old.notes);
END;

CREATE TRIGGER clients_fts_update AFTER UPDATE ON clients BEGIN
    INSERT INTO clients_fts(clients_fts, rowid, name, address, services, notes) 
    VALUES('delete', old.id, old.name, old.address, old.services, old.notes);
    INSERT INTO clients_fts(rowid, name, address, services, notes) 
    VALUES (new.id, new.name, new.address, new.services, new.notes);
END;

-- Triggers to maintain calculated fields
CREATE TRIGGER update_client_totals AFTER INSERT ON invoices BEGIN
    UPDATE clients 
    SET total_invoiced = (
        SELECT COALESCE(SUM(total), 0) 
        FROM invoices 
        WHERE client_id = NEW.client_id
    ),
    total_paid = (
        SELECT COALESCE(SUM(total), 0) 
        FROM invoices 
        WHERE client_id = NEW.client_id AND status = 'Paid'
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.client_id;
END;

CREATE TRIGGER update_client_totals_on_update AFTER UPDATE ON invoices BEGIN
    UPDATE clients 
    SET total_invoiced = (
        SELECT COALESCE(SUM(total), 0) 
        FROM invoices 
        WHERE client_id = NEW.client_id
    ),
    total_paid = (
        SELECT COALESCE(SUM(total), 0) 
        FROM invoices 
        WHERE client_id = NEW.client_id AND status = 'Paid'
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.client_id;
END;

-- Update timestamps trigger
CREATE TRIGGER update_clients_timestamp AFTER UPDATE ON clients BEGIN
    UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_invoices_timestamp AFTER UPDATE ON invoices BEGIN
    UPDATE invoices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;