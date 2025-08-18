-- Database Schema for Jason's Landscaping Business System
-- Based on localStorage audit findings from LOCALSTORAGE_AUDIT.md
-- Optimized for Turso (libSQL) with mobile-first design

-- Business configuration table
CREATE TABLE business_settings (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT DEFAULT '',
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

-- Invoice counter table for unique numbering
CREATE TABLE invoice_counter (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(year)
);

-- Invoices table
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT UNIQUE NOT NULL,
    client_id INTEGER NOT NULL,
    client_name TEXT NOT NULL, -- Denormalized for quick access
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'collecting', -- collecting/sent/paid/overdue
    subtotal REAL NOT NULL DEFAULT 0.0,
    tax REAL NOT NULL DEFAULT 0.0,
    total REAL NOT NULL DEFAULT 0.0,
    notes TEXT DEFAULT '',
    sent_date DATE,
    paid_date DATE,
    payment_method TEXT,
    receipt_sent_date DATE,
    receipt_delivery_method TEXT CHECK (receipt_delivery_method IN ('email', 'text', 'none') OR receipt_delivery_method IS NULL),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method) REFERENCES payment_methods(method_name),
    
    -- Check constraints for invoice status workflow
    CHECK (status IN ('collecting', 'sent', 'paid', 'overdue')),
    
    -- Check constraint for invoice number format
    CHECK (invoice_number LIKE 'INV-%-%' AND LENGTH(invoice_number) = 13)
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
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

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

-- Equipment types table
CREATE TABLE equipment_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT NOT NULL UNIQUE, -- Mower, Trimmer, Blower, Chainsaw, Hedge Trimmer, Pole Saw, Pressure Washer, Trailer
    requires_hours BOOLEAN DEFAULT false, -- Track hours for mowers primarily
    service_interval_hours INTEGER, -- Service every X hours (50 for mowers)
    active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Equipment table - main entity for all landscaping equipment
CREATE TABLE equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_type TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    serial_number TEXT,
    
    -- Usage tracking
    current_hours REAL DEFAULT 0.0,
    condition TEXT DEFAULT 'Good', -- Excellent/Good/Fair/Needs Work
    status TEXT DEFAULT 'Active', -- Active/Inactive/Out of Service
    
    -- Service tracking
    last_service_date DATE,
    last_service_hours REAL,
    next_service_due_hours REAL,
    
    -- Equipment-specific fields (JSON for flexibility)
    specifications TEXT, -- JSON: {barSize: "20\"", chainType: "3/8", psi: 3000, licensePlate: "ABC123"}
    
    -- Purchase/ownership info
    purchase_date DATE,
    purchase_price REAL,
    warranty_expires DATE,
    
    -- Location and notes
    current_location TEXT DEFAULT 'Shop',
    notes TEXT DEFAULT '',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (equipment_type) REFERENCES equipment_types(type_name)
);

-- Equipment service history table
CREATE TABLE equipment_service_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    service_date DATE NOT NULL,
    service_type TEXT NOT NULL, -- Oil Change, Blade Sharpening, General Maintenance, Repair
    hours_at_service REAL,
    description TEXT NOT NULL,
    cost REAL DEFAULT 0.0,
    performed_by TEXT DEFAULT 'Jason',
    next_service_due_hours REAL,
    parts_replaced TEXT, -- JSON array of parts
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE
);

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

-- Invoice numbering triggers
CREATE TRIGGER generate_invoice_number BEFORE INSERT ON invoices
WHEN NEW.invoice_number IS NULL OR NEW.invoice_number = ''
BEGIN
    -- Get current year
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM invoice_counter WHERE year = strftime('%Y', 'now')) = 0
        THEN 
            -- Insert new year counter if it doesn't exist
            (INSERT INTO invoice_counter (year, last_number) VALUES (strftime('%Y', 'now'), 1))
        ELSE
            -- Increment existing counter
            (UPDATE invoice_counter 
             SET last_number = last_number + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE year = strftime('%Y', 'now'))
    END;
    
    -- Set the invoice number in format INV-YYYY-NNNN
    UPDATE NEW SET invoice_number = 'INV-' || strftime('%Y', 'now') || '-' || 
        printf('%04d', (SELECT last_number FROM invoice_counter WHERE year = strftime('%Y', 'now')));
END;

-- Validate invoice number format on update
CREATE TRIGGER validate_invoice_number_update BEFORE UPDATE ON invoices
WHEN NEW.invoice_number != OLD.invoice_number
BEGIN
    SELECT CASE
        WHEN NEW.invoice_number NOT LIKE 'INV-____-____' OR LENGTH(NEW.invoice_number) != 13
        THEN RAISE(ABORT, 'Invoice number must be in format INV-YYYY-NNNN')
    END;
END;

-- Update invoice counter timestamp
CREATE TRIGGER update_invoice_counter_timestamp AFTER UPDATE ON invoice_counter BEGIN
    UPDATE invoice_counter SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Equipment indexes for mobile performance optimization
CREATE INDEX idx_equipment_type ON equipment(equipment_type);
CREATE INDEX idx_equipment_brand ON equipment(brand);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_condition ON equipment(condition);
CREATE INDEX idx_equipment_hours ON equipment(current_hours);
CREATE INDEX idx_equipment_next_service ON equipment(next_service_due_hours);

-- Service History indexes
CREATE INDEX idx_service_history_equipment_id ON equipment_service_history(equipment_id);
CREATE INDEX idx_service_history_date ON equipment_service_history(service_date);
CREATE INDEX idx_service_history_type ON equipment_service_history(service_type);

-- Composite indexes for common equipment queries
CREATE INDEX idx_equipment_type_status ON equipment(equipment_type, status);
CREATE INDEX idx_equipment_brand_model ON equipment(brand, model);

-- Equipment full-text search for mobile lookup
CREATE VIRTUAL TABLE equipment_fts USING fts5(
    brand, 
    model, 
    serial_number, 
    notes,
    content='equipment',
    content_rowid='id'
);

-- Triggers to maintain equipment FTS index
CREATE TRIGGER equipment_fts_insert AFTER INSERT ON equipment BEGIN
    INSERT INTO equipment_fts(rowid, brand, model, serial_number, notes) 
    VALUES (new.id, new.brand, new.model, new.serial_number, new.notes);
END;

CREATE TRIGGER equipment_fts_delete AFTER DELETE ON equipment BEGIN
    INSERT INTO equipment_fts(equipment_fts, rowid, brand, model, serial_number, notes) 
    VALUES('delete', old.id, old.brand, old.model, old.serial_number, old.notes);
END;

CREATE TRIGGER equipment_fts_update AFTER UPDATE ON equipment BEGIN
    INSERT INTO equipment_fts(equipment_fts, rowid, brand, model, serial_number, notes) 
    VALUES('delete', old.id, old.brand, old.model, old.serial_number, old.notes);
    INSERT INTO equipment_fts(rowid, brand, model, serial_number, notes) 
    VALUES (new.id, new.brand, new.model, new.serial_number, new.notes);
END;

-- Equipment timestamp triggers
CREATE TRIGGER update_equipment_timestamp AFTER UPDATE ON equipment BEGIN
    UPDATE equipment SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Insert starting invoice counter for 2025
INSERT INTO invoice_counter (year, last_number) VALUES (2025, 0);

-- Insert default equipment types
INSERT INTO equipment_types (type_name, requires_hours, service_interval_hours) VALUES
('Mower', true, 50),
('Trimmer', false, NULL),
('Blower', false, NULL),
('Chainsaw', false, NULL),
('Hedge Trimmer', false, NULL),
('Pole Saw', false, NULL),
('Pressure Washer', false, NULL),
('Trailer', false, NULL);