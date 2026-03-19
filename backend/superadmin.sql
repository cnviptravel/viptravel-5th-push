INSERT INTO users (full_name, email, password, role, isAdmin, status, isVerified) 
VALUES ('Super Admin', 'auth@cnviptravel.com', 'admin123', 'admin', 1, 'approved', 1) 
ON CONFLICT(email) DO UPDATE SET role='admin', isAdmin=1, status='approved', isVerified=1;