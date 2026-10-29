-- Datos operativos para el backoffice (alumnos, matrículas, leads, caja, reclamos)
INSERT INTO acad.students (document_type_id, document_number, first_name, last_name, email, phone, profession, city, organization_id)
SELECT d.document_type_id, v.doc, v.fn, v.ln, v.email, v.phone, v.prof, v.city, o.organization_id
FROM (VALUES
    ('44556677', 'María', 'Castañeda Ruiz', 'maria.castaneda@unt.edu.pe', '944111001', 'Ing. Civil', 'Trujillo', 'UNT'),
    ('44556678', 'Luis', 'Haro Mendoza', 'luis.haro@sedalib.com.pe', '944111002', 'Ing. Sanitaria', 'Trujillo', 'Sedalib'),
    ('44556679', 'Ana', 'Paredes Silva', 'ana.paredes@gmail.com', '944111003', 'Ing. de Minas', 'Cajamarca', NULL),
    ('44556680', 'José', 'Calderón Díaz', 'jose.calderon@mpt.gob.pe', '944111004', 'Ing. Civil', 'Trujillo', 'MPT'),
    ('44556681', 'Rosa', 'Valverde León', 'rosa.valverde@gmail.com', '944111005', 'Arq.', 'Lima', NULL),
    ('44556682', 'Pedro', 'Alfaro Chávez', 'pedro.alfaro@grll.gob.pe', '944111006', 'Ing. Civil', 'Trujillo', 'GRLL'),
    ('44556683', 'Carla', 'Núñez Rojas', 'carla.nunez@cip.org.pe', '944111007', 'Ing. Industrial', 'Lima', 'CIP'),
    ('44556684', 'Hugo', 'Salazar Peña', 'hugo.salazar@gmail.com', '944111008', 'Ing. Civil', 'Chiclayo', NULL)
) AS v(doc, fn, ln, email, phone, prof, city, org)
JOIN cfg.document_types d ON d.code = 'DNI'
LEFT JOIN org.organizations o ON o.trade_name = v.org
WHERE NOT EXISTS (SELECT 1 FROM acad.students s WHERE s.email = v.email);

INSERT INTO acad.enrollments (enrollment_code, student_id, edition_id, status, origin, confirmed_at, attendance_percent)
SELECT acad.fn_generate_enrollment_code(), s.student_id, e.edition_id, v.status, v.origin,
       CASE WHEN v.status IN ('Confirmed','InProgress','Completed') THEN NOW() - INTERVAL '3 days' END,
       v.att
FROM (VALUES
    ('maria.castaneda@unt.edu.pe', 'ASF-001-1-26', 'Confirmed', 'Web', 82.0),
    ('luis.haro@sedalib.com.pe', 'ALC-001-1-26', 'Confirmed', 'Corporativo', 90.0),
    ('ana.paredes@gmail.com', 'OBR-001-2-26', 'Reserved', 'WhatsApp', NULL::numeric),
    ('jose.calderon@mpt.gob.pe', 'SAN-001-1-26', 'InProgress', 'Sede', 74.0),
    ('rosa.valverde@gmail.com', 'ASF-001-1-26', 'Confirmed', 'Web', 88.0),
    ('pedro.alfaro@grll.gob.pe', 'OBR-001-2-26', 'Confirmed', 'Corporativo', 70.0),
    ('carla.nunez@cip.org.pe', 'ALC-001-1-26', 'Completed', 'Campaña', 95.0),
    ('hugo.salazar@gmail.com', 'SAN-001-1-26', 'Reserved', 'Web', NULL)
) AS v(email, ed, status, origin, att)
JOIN acad.students s ON s.email = v.email
JOIN acad.course_editions e ON e.edition_code = v.ed
WHERE NOT EXISTS (
    SELECT 1 FROM acad.enrollments x WHERE x.student_id = s.student_id AND x.edition_id = e.edition_id
);

INSERT INTO crm.leads (full_name, email, phone, city, profession, source_id, course_id, status)
SELECT v.name, v.email, v.phone, v.city, v.prof, src.source_id, c.course_id, v.status
FROM (VALUES
    ('Elena Quiroz', 'elena.quiroz@gmail.com', '933200101', 'Trujillo', 'Ing. Civil', 'WEB', 'PMP-001', 'New'),
    ('Marco Díaz', 'marco.diaz@gmail.com', '933200102', 'Lima', 'Ing. Civil', 'META', 'BIM-001', 'Contacted'),
    ('Fiorella Ramos', 'fiorella.ramos@unt.edu.pe', '933200103', 'Trujillo', 'Estudiante', 'REFERIDO', 'C3D-001', 'Qualified'),
    ('Raúl Espinoza', 'raul.espinoza@mpt.gob.pe', '933200104', 'Trujillo', 'Ing. Civil', 'EMPRESA', 'OBR-001', 'Reserved'),
    ('Lucía Benites', 'lucia.benites@gmail.com', '933200105', 'Chiclayo', 'Arq.', 'GOOGLE', 'BIM-001', 'Won'),
    ('Omar Vega', 'omar.vega@gmail.com', '933200106', 'Piura', 'Ing. Civil', 'WA', 'ASF-001', 'Lost'),
    ('Patricia Soto', 'patricia.soto@sedalib.com.pe', '933200107', 'Trujillo', 'Ing. Sanitaria', 'EMPRESA', 'SAN-001', 'Contacted'),
    ('Diego Cueva', 'diego.cueva@gmail.com', '933200108', 'Cusco', 'Ing. Civil', 'EVENTO', 'S10-001', 'New')
) AS v(name, email, phone, city, prof, src, course, status)
JOIN crm.lead_sources src ON src.code = v.src
JOIN cat.courses c ON c.code = v.course
WHERE NOT EXISTS (SELECT 1 FROM crm.leads l WHERE l.email = v.email);

INSERT INTO fin.invoices (invoice_type, series, number, enrollment_id, student_id, issue_date, subtotal, igv, total, status)
SELECT '01', 'B001', v.n, e.enrollment_id, e.student_id, CURRENT_DATE - v.days, v.sub, round(v.sub * 0.18, 2), round(v.sub * 1.18, 2), v.st
FROM (VALUES
    (1, 'maria.castaneda@unt.edu.pe', 'ASF-001-1-26', 5, 420.00, 'Paid'),
    (2, 'luis.haro@sedalib.com.pe', 'ALC-001-1-26', 4, 450.00, 'Paid'),
    (3, 'rosa.valverde@gmail.com', 'ASF-001-1-26', 2, 420.00, 'Issued'),
    (4, 'pedro.alfaro@grll.gob.pe', 'OBR-001-2-26', 1, 480.00, 'Partial')
) AS v(n, email, ed, days, sub, st)
JOIN acad.students s ON s.email = v.email
JOIN acad.course_editions ed ON ed.edition_code = v.ed
JOIN acad.enrollments e ON e.student_id = s.student_id AND e.edition_id = ed.edition_id
WHERE NOT EXISTS (SELECT 1 FROM fin.invoices i WHERE i.series = 'B001' AND i.number = v.n);

INSERT INTO fin.invoice_items (invoice_id, description, quantity, unit_price, line_total)
SELECT i.invoice_id, c.title, 1, i.subtotal, i.subtotal
FROM fin.invoices i
JOIN acad.enrollments e ON e.enrollment_id = i.enrollment_id
JOIN acad.course_editions ed ON ed.edition_id = e.edition_id
JOIN cat.courses c ON c.course_id = ed.course_id
WHERE NOT EXISTS (SELECT 1 FROM fin.invoice_items x WHERE x.invoice_id = i.invoice_id);

INSERT INTO fin.payments (invoice_id, payment_method_id, paid_at, amount_pen, reference)
SELECT i.invoice_id, m.payment_method_id, NOW() - INTERVAL '2 days', i.total, 'YAPE-' || i.number
FROM fin.invoices i
JOIN fin.payment_methods m ON m.code = 'YAPE'
WHERE i.status = 'Paid'
  AND NOT EXISTS (SELECT 1 FROM fin.payments p WHERE p.invoice_id = i.invoice_id);

INSERT INTO fin.payments (invoice_id, payment_method_id, paid_at, amount_pen, reference)
SELECT i.invoice_id, m.payment_method_id, NOW() - INTERVAL '1 day', 200, 'TRANSF-PARCIAL'
FROM fin.invoices i
JOIN fin.payment_methods m ON m.code = 'TRANSF'
WHERE i.status = 'Partial'
  AND NOT EXISTS (SELECT 1 FROM fin.payments p WHERE p.invoice_id = i.invoice_id);

INSERT INTO qms.complaints (ticket_code, kind, consumer_name, email, phone, good_description, detail, status, due_at)
SELECT qms.fn_generate_complaint_code(v.kind), v.kind, v.name, v.email, v.phone, v.good, v.detail, v.status, CURRENT_DATE + 10
FROM (VALUES
    ('Reclamo', 'Ana Paredes Silva', 'ana.paredes@gmail.com', '944111003', 'Curso OBR-001', 'Solicito reprogramación de sesión por cruce laboral.', 'Open'),
    ('Queja', 'Hugo Salazar Peña', 'hugo.salazar@gmail.com', '944111008', 'Atención en sede', 'Demora en confirmación de vacante.', 'InReview')
) AS v(kind, name, email, phone, good, detail, status)
WHERE NOT EXISTS (SELECT 1 FROM qms.complaints c WHERE c.email = v.email AND c.good_description = v.good);

INSERT INTO acad.certificates (enrollment_id, certificate_code, issued_on, hours_accredited)
SELECT e.enrollment_id, acad.fn_generate_certificate_code(), CURRENT_DATE - 2, c.duration_hours
FROM acad.enrollments e
JOIN acad.students s ON s.student_id = e.student_id
JOIN acad.course_editions ed ON ed.edition_id = e.edition_id
JOIN cat.courses c ON c.course_id = ed.course_id
WHERE s.email = 'carla.nunez@cip.org.pe'
  AND NOT EXISTS (SELECT 1 FROM acad.certificates x WHERE x.enrollment_id = e.enrollment_id);

INSERT INTO shop.web_orders (order_code, student_id, status, subtotal_pen, discount_pen, total_pen, paid_at)
SELECT 'WEB-2026-0001', s.student_id, 'Paid', 650, 0, 650, NOW() - INTERVAL '6 days'
FROM acad.students s
WHERE s.email = 'rosa.valverde@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM shop.web_orders o WHERE o.order_code = 'WEB-2026-0001');

SELECT anl.fn_capture_daily_kpis();
