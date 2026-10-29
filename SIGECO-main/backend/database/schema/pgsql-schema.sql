--
-- PostgreSQL database dump
--

\restrict C0dyem0l0UIRArgE901btP3akhFxVXZoviWeOPmsLkU8NyqRIrQdSfXsVhFtKmN

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: acad; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA acad;


--
-- Name: anl; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA anl;


--
-- Name: cat; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA cat;


--
-- Name: cfg; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA cfg;


--
-- Name: cms; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA cms;


--
-- Name: crm; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA crm;


--
-- Name: docs; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA docs;


--
-- Name: fin; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA fin;


--
-- Name: hr; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA hr;


--
-- Name: ntf; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA ntf;


--
-- Name: org; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA org;


--
-- Name: qms; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA qms;


--
-- Name: req; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA req;


--
-- Name: sec; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA sec;


--
-- Name: shop; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA shop;


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: fn_enrollment_status(); Type: FUNCTION; Schema: acad; Owner: -
--

CREATE FUNCTION acad.fn_enrollment_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO acad.enrollment_status_history (enrollment_id, from_status, to_status)
        VALUES (NEW.enrollment_id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_generate_certificate_code(); Type: FUNCTION; Schema: acad; Owner: -
--

CREATE FUNCTION acad.fn_generate_certificate_code() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE seq INT;
BEGIN
    seq := nextval('acad.seq_certificate');
    RETURN 'CERT-' || to_char(NOW(), 'YYYY') || '-' || lpad(seq::text, 5, '0');
END;
$$;


--
-- Name: fn_generate_enrollment_code(); Type: FUNCTION; Schema: acad; Owner: -
--

CREATE FUNCTION acad.fn_generate_enrollment_code() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE seq INT;
BEGIN
    seq := nextval('acad.seq_enrollment');
    RETURN 'INS-' || to_char(NOW(), 'YYYYMM') || '-' || lpad(seq::text, 6, '0');
END;
$$;


--
-- Name: fn_capture_daily_kpis(); Type: FUNCTION; Schema: anl; Owner: -
--

CREATE FUNCTION anl.fn_capture_daily_kpis() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO anl.kpi_snapshots (kpi_id, value)
    SELECT k.kpi_id, COUNT(e.enrollment_id)
    FROM anl.kpi_definitions k
    LEFT JOIN acad.enrollments e ON e.enrolled_at::date = CURRENT_DATE
    WHERE k.code = 'ENR_DAY'
    GROUP BY k.kpi_id;

    INSERT INTO anl.kpi_snapshots (kpi_id, value)
    SELECT k.kpi_id, COALESCE(SUM(p.amount_pen), 0)
    FROM anl.kpi_definitions k
    LEFT JOIN fin.payments p ON p.paid_at::date = CURRENT_DATE
    WHERE k.code = 'REV_DAY'
    GROUP BY k.kpi_id;
END;
$$;


--
-- Name: fn_lead_status(); Type: FUNCTION; Schema: crm; Owner: -
--

CREATE FUNCTION crm.fn_lead_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO crm.lead_status_history (lead_id, from_status, to_status)
        VALUES (NEW.lead_id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: fn_generate_document_code(character varying, character varying); Type: FUNCTION; Schema: docs; Owner: -
--

CREATE FUNCTION docs.fn_generate_document_code(p_type character varying, p_area character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN upper(p_type) || '-' || upper(p_area) || '-' || lpad(nextval('docs.seq_document')::text, 4, '0');
    END;
    $$;


--
-- Name: fn_generate_complaint_code(character varying); Type: FUNCTION; Schema: qms; Owner: -
--

CREATE FUNCTION qms.fn_generate_complaint_code(p_kind character varying) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE seq INT;
BEGIN
    seq := nextval('qms.seq_complaint');
    RETURN CASE WHEN p_kind = 'Reclamo' THEN 'REC-' ELSE 'QUE-' END
        || to_char(NOW(), 'YYYY') || '-' || lpad(seq::text, 4, '0');
END;
$$;


--
-- Name: fn_generate_order_code(); Type: FUNCTION; Schema: req; Owner: -
--

CREATE FUNCTION req.fn_generate_order_code() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN 'SOL-' || to_char(NOW(), 'YYYY') || '-' || lpad(nextval('req.seq_order')::text, 5, '0');
    END;
    $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.attendance (
    attendance_id bigint NOT NULL,
    session_id integer NOT NULL,
    enrollment_id integer NOT NULL,
    status character varying(16) NOT NULL,
    marked_at timestamp with time zone DEFAULT now() NOT NULL,
    marked_by_user_id integer,
    CONSTRAINT attendance_status_check CHECK (((status)::text = ANY ((ARRAY['Present'::character varying, 'Late'::character varying, 'Absent'::character varying, 'Justified'::character varying])::text[])))
);


--
-- Name: attendance_attendance_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.attendance ALTER COLUMN attendance_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.attendance_attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: certificate_templates; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.certificate_templates (
    template_id integer NOT NULL,
    name character varying(80) NOT NULL,
    course_type_id smallint,
    html_layout text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: certificate_templates_template_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.certificate_templates ALTER COLUMN template_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.certificate_templates_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: certificates; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.certificates (
    certificate_id integer NOT NULL,
    enrollment_id integer NOT NULL,
    template_id integer,
    certificate_code character varying(40) NOT NULL,
    issued_on date NOT NULL,
    hours_accredited numeric(6,1) NOT NULL,
    pdu_hours numeric(6,1),
    file_url character varying(400),
    public_verify_url character varying(400),
    revoked_at timestamp with time zone,
    revoke_reason character varying(200)
);


--
-- Name: certificates_certificate_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.certificates ALTER COLUMN certificate_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.certificates_certificate_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: course_editions; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.course_editions (
    edition_id integer NOT NULL,
    course_id integer NOT NULL,
    edition_code character varying(40) NOT NULL,
    modality_id smallint NOT NULL,
    campus_id integer,
    classroom_id integer,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    enrollment_opens_on date,
    enrollment_closes_on date,
    price_pen numeric(12,2) NOT NULL,
    max_seats integer NOT NULL,
    status character varying(20) DEFAULT 'Draft'::character varying NOT NULL,
    meeting_url character varying(400),
    featured_on_home boolean DEFAULT false NOT NULL,
    notes character varying(400),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT course_editions_check CHECK ((ends_on >= starts_on)),
    CONSTRAINT course_editions_status_check CHECK (((status)::text = ANY ((ARRAY['Draft'::character varying, 'Scheduled'::character varying, 'Open'::character varying, 'InProgress'::character varying, 'Closed'::character varying, 'Cancelled'::character varying])::text[])))
);


--
-- Name: course_editions_edition_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.course_editions ALTER COLUMN edition_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.course_editions_edition_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: edition_instructors; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.edition_instructors (
    edition_id integer NOT NULL,
    instructor_id integer NOT NULL,
    is_lead boolean DEFAULT false NOT NULL
);


--
-- Name: edition_sessions; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.edition_sessions (
    session_id integer NOT NULL,
    edition_id integer NOT NULL,
    session_number integer NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    topic character varying(200),
    classroom_id integer,
    meeting_url character varying(400)
);


--
-- Name: edition_sessions_session_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.edition_sessions ALTER COLUMN session_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.edition_sessions_session_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: enrollment_status_history; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.enrollment_status_history (
    history_id bigint NOT NULL,
    enrollment_id integer NOT NULL,
    from_status character varying(20),
    to_status character varying(20) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by_user_id integer,
    reason character varying(300)
);


--
-- Name: enrollment_status_history_history_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.enrollment_status_history ALTER COLUMN history_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.enrollment_status_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: enrollments; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.enrollments (
    enrollment_id integer NOT NULL,
    enrollment_code character varying(30) NOT NULL,
    student_id integer NOT NULL,
    edition_id integer NOT NULL,
    organization_id integer,
    agreement_id integer,
    status character varying(20) DEFAULT 'Reserved'::character varying NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    completed_at timestamp with time zone,
    attendance_percent numeric(5,2),
    final_score numeric(5,2),
    origin character varying(20) DEFAULT 'Web'::character varying NOT NULL,
    sales_user_id integer,
    notes character varying(400),
    CONSTRAINT enrollments_origin_check CHECK (((origin)::text = ANY ((ARRAY['Web'::character varying, 'WhatsApp'::character varying, 'Sede'::character varying, 'Corporativo'::character varying, 'Campaña'::character varying, 'Carrito'::character varying])::text[]))),
    CONSTRAINT enrollments_status_check CHECK (((status)::text = ANY ((ARRAY['Reserved'::character varying, 'Confirmed'::character varying, 'InProgress'::character varying, 'Completed'::character varying, 'Failed'::character varying, 'Withdrawn'::character varying, 'Cancelled'::character varying])::text[])))
);


--
-- Name: enrollments_enrollment_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.enrollments ALTER COLUMN enrollment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.enrollments_enrollment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: evaluations; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.evaluations (
    evaluation_id integer NOT NULL,
    enrollment_id integer NOT NULL,
    title character varying(120) NOT NULL,
    score numeric(5,2) NOT NULL,
    max_score numeric(5,2) DEFAULT 20 NOT NULL,
    evaluated_at date NOT NULL
);


--
-- Name: evaluations_evaluation_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.evaluations ALTER COLUMN evaluation_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.evaluations_evaluation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: seq_certificate; Type: SEQUENCE; Schema: acad; Owner: -
--

CREATE SEQUENCE acad.seq_certificate
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: seq_enrollment; Type: SEQUENCE; Schema: acad; Owner: -
--

CREATE SEQUENCE acad.seq_enrollment
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students; Type: TABLE; Schema: acad; Owner: -
--

CREATE TABLE acad.students (
    student_id integer NOT NULL,
    document_type_id smallint NOT NULL,
    document_number character varying(20) NOT NULL,
    first_name character varying(80) NOT NULL,
    last_name character varying(80) NOT NULL,
    email public.citext NOT NULL,
    phone character varying(20),
    profession character varying(120),
    specialty character varying(120),
    city character varying(80),
    department character varying(80),
    organization_id integer,
    user_id integer,
    marketing_opt_in boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: students_student_id_seq; Type: SEQUENCE; Schema: acad; Owner: -
--

ALTER TABLE acad.students ALTER COLUMN student_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME acad.students_student_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: audit_logs; Type: TABLE; Schema: anl; Owner: -
--

CREATE TABLE anl.audit_logs (
    audit_log_id bigint NOT NULL,
    actor_user_id integer,
    action character varying(40) NOT NULL,
    entity character varying(60) NOT NULL,
    entity_id character varying(40),
    before_json jsonb,
    after_json jsonb,
    ip_address character varying(45),
    user_agent character varying(300),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_audit_log_id_seq; Type: SEQUENCE; Schema: anl; Owner: -
--

ALTER TABLE anl.audit_logs ALTER COLUMN audit_log_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME anl.audit_logs_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kpi_definitions; Type: TABLE; Schema: anl; Owner: -
--

CREATE TABLE anl.kpi_definitions (
    kpi_id integer NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(160) NOT NULL,
    unit character varying(20) NOT NULL,
    period character varying(16) NOT NULL,
    formula_note character varying(400),
    target_value numeric(18,4),
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: kpi_definitions_kpi_id_seq; Type: SEQUENCE; Schema: anl; Owner: -
--

ALTER TABLE anl.kpi_definitions ALTER COLUMN kpi_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME anl.kpi_definitions_kpi_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: kpi_snapshots; Type: TABLE; Schema: anl; Owner: -
--

CREATE TABLE anl.kpi_snapshots (
    snapshot_id bigint NOT NULL,
    kpi_id integer NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    dimension character varying(80),
    value numeric(18,4) NOT NULL
);


--
-- Name: kpi_snapshots_snapshot_id_seq; Type: SEQUENCE; Schema: anl; Owner: -
--

ALTER TABLE anl.kpi_snapshots ALTER COLUMN snapshot_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME anl.kpi_snapshots_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: complaints; Type: TABLE; Schema: qms; Owner: -
--

CREATE TABLE qms.complaints (
    complaint_id integer NOT NULL,
    ticket_code character varying(20) NOT NULL,
    kind character varying(16) NOT NULL,
    consumer_name character varying(160) NOT NULL,
    document_number character varying(20),
    email character varying(160),
    phone character varying(20),
    address character varying(200),
    good_description character varying(300) NOT NULL,
    claimed_amount_pen numeric(12,2),
    detail text NOT NULL,
    occurred_on date,
    enrollment_id integer,
    status character varying(20) DEFAULT 'Open'::character varying NOT NULL,
    answer text,
    answered_at timestamp with time zone,
    due_at date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT complaints_kind_check CHECK (((kind)::text = ANY ((ARRAY['Reclamo'::character varying, 'Queja'::character varying])::text[]))),
    CONSTRAINT complaints_status_check CHECK (((status)::text = ANY ((ARRAY['Open'::character varying, 'InReview'::character varying, 'Answered'::character varying, 'Closed'::character varying])::text[])))
);


--
-- Name: vw_complaint_sla; Type: VIEW; Schema: anl; Owner: -
--

CREATE VIEW anl.vw_complaint_sla AS
 SELECT complaint_id,
    ticket_code,
    kind,
    status,
    created_at,
    due_at,
    answered_at,
        CASE
            WHEN ((answered_at IS NOT NULL) AND (due_at IS NOT NULL) AND ((answered_at)::date <= due_at)) THEN 1
            ELSE 0
        END AS met_sla
   FROM qms.complaints;


--
-- Name: courses; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.courses (
    course_id integer NOT NULL,
    code character varying(30) NOT NULL,
    slug character varying(180) NOT NULL,
    title character varying(220) NOT NULL,
    short_description character varying(400),
    long_description text,
    course_type_id smallint NOT NULL,
    default_modality_id smallint NOT NULL,
    duration_hours numeric(6,1) NOT NULL,
    duration_weeks smallint,
    base_price_pen numeric(12,2) NOT NULL,
    compare_at_price_pen numeric(12,2),
    grants_certificate boolean DEFAULT true NOT NULL,
    pdu_hours numeric(6,1),
    autodesk_official boolean DEFAULT false NOT NULL,
    featured_on_home boolean DEFAULT false NOT NULL,
    min_enrollment integer DEFAULT 8 NOT NULL,
    max_enrollment integer DEFAULT 30 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT courses_base_price_pen_check CHECK ((base_price_pen >= (0)::numeric)),
    CONSTRAINT courses_duration_hours_check CHECK ((duration_hours > (0)::numeric))
);


--
-- Name: vw_edition_seats; Type: VIEW; Schema: anl; Owner: -
--

CREATE VIEW anl.vw_edition_seats AS
 SELECT e.edition_id,
    e.edition_code,
    c.title AS course_title,
    e.max_seats,
    count(en.enrollment_id) FILTER (WHERE ((en.status)::text = ANY ((ARRAY['Reserved'::character varying, 'Confirmed'::character varying, 'InProgress'::character varying, 'Completed'::character varying])::text[]))) AS occupied_seats,
    (e.max_seats - count(en.enrollment_id) FILTER (WHERE ((en.status)::text = ANY ((ARRAY['Reserved'::character varying, 'Confirmed'::character varying, 'InProgress'::character varying, 'Completed'::character varying])::text[])))) AS free_seats,
    e.status,
    e.starts_on,
    e.price_pen
   FROM ((acad.course_editions e
     JOIN cat.courses c ON ((c.course_id = e.course_id)))
     LEFT JOIN acad.enrollments en ON ((en.edition_id = e.edition_id)))
  GROUP BY e.edition_id, e.edition_code, c.title, e.max_seats, e.status, e.starts_on, e.price_pen;


--
-- Name: vw_enrollment_funnel; Type: VIEW; Schema: anl; Owner: -
--

CREATE VIEW anl.vw_enrollment_funnel AS
 SELECT (enrolled_at)::date AS day,
    status,
    origin,
    count(*) AS qty
   FROM acad.enrollments
  GROUP BY ((enrolled_at)::date), status, origin;


--
-- Name: leads; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.leads (
    lead_id integer NOT NULL,
    full_name character varying(160) NOT NULL,
    email character varying(160),
    phone character varying(20),
    document_number character varying(20),
    city character varying(80),
    profession character varying(120),
    source_id smallint,
    campaign_id integer,
    course_id integer,
    status character varying(20) DEFAULT 'New'::character varying NOT NULL,
    assigned_user_id integer,
    lost_reason character varying(200),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    converted_student_id integer,
    CONSTRAINT leads_status_check CHECK (((status)::text = ANY ((ARRAY['New'::character varying, 'Contacted'::character varying, 'Qualified'::character varying, 'Reserved'::character varying, 'Won'::character varying, 'Lost'::character varying])::text[])))
);


--
-- Name: vw_lead_funnel; Type: VIEW; Schema: anl; Owner: -
--

CREATE VIEW anl.vw_lead_funnel AS
 SELECT status,
    count(*) AS qty
   FROM crm.leads
  GROUP BY status;


--
-- Name: payments; Type: TABLE; Schema: fin; Owner: -
--

CREATE TABLE fin.payments (
    payment_id integer NOT NULL,
    invoice_id integer NOT NULL,
    payment_method_id smallint NOT NULL,
    paid_at timestamp with time zone NOT NULL,
    amount_pen numeric(12,2) NOT NULL,
    reference character varying(80),
    received_by_user_id integer,
    notes character varying(200)
);


--
-- Name: vw_revenue_by_month; Type: VIEW; Schema: anl; Owner: -
--

CREATE VIEW anl.vw_revenue_by_month AS
 SELECT (date_trunc('month'::text, paid_at))::date AS month_start,
    sum(amount_pen) AS collected_pen
   FROM fin.payments
  GROUP BY ((date_trunc('month'::text, paid_at))::date);


--
-- Name: vw_student_history; Type: VIEW; Schema: anl; Owner: -
--

CREATE VIEW anl.vw_student_history AS
 SELECT s.student_id,
    s.document_number,
    s.first_name,
    s.last_name,
    s.email,
    e.enrollment_code,
    e.status,
    e.enrolled_at,
    e.origin,
    ed.edition_code,
    c.title AS course_title,
    e.attendance_percent,
    e.final_score,
    cert.certificate_code
   FROM ((((acad.students s
     JOIN acad.enrollments e ON ((e.student_id = s.student_id)))
     JOIN acad.course_editions ed ON ((ed.edition_id = e.edition_id)))
     JOIN cat.courses c ON ((c.course_id = ed.course_id)))
     LEFT JOIN acad.certificates cert ON ((cert.enrollment_id = e.enrollment_id)));


--
-- Name: accreditation_bodies; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.accreditation_bodies (
    body_id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(160) NOT NULL,
    logo_url character varying(400)
);


--
-- Name: accreditation_bodies_body_id_seq; Type: SEQUENCE; Schema: cat; Owner: -
--

ALTER TABLE cat.accreditation_bodies ALTER COLUMN body_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cat.accreditation_bodies_body_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: course_accreditations; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.course_accreditations (
    course_id integer NOT NULL,
    body_id integer NOT NULL,
    credential_note character varying(200)
);


--
-- Name: course_areas; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.course_areas (
    course_id integer NOT NULL,
    area_id integer NOT NULL
);


--
-- Name: course_modules; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.course_modules (
    module_id integer NOT NULL,
    course_id integer NOT NULL,
    sort_order integer NOT NULL,
    title character varying(200) NOT NULL,
    hours numeric(5,1)
);


--
-- Name: course_modules_module_id_seq; Type: SEQUENCE; Schema: cat; Owner: -
--

ALTER TABLE cat.course_modules ALTER COLUMN module_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cat.course_modules_module_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: course_prerequisites; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.course_prerequisites (
    course_id integer NOT NULL,
    prerequisite_course_id integer NOT NULL,
    CONSTRAINT course_prerequisites_check CHECK ((course_id <> prerequisite_course_id))
);


--
-- Name: course_types; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.course_types (
    course_type_id smallint NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(80) NOT NULL
);


--
-- Name: course_types_course_type_id_seq; Type: SEQUENCE; Schema: cat; Owner: -
--

ALTER TABLE cat.course_types ALTER COLUMN course_type_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cat.course_types_course_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: courses_course_id_seq; Type: SEQUENCE; Schema: cat; Owner: -
--

ALTER TABLE cat.courses ALTER COLUMN course_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cat.courses_course_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: knowledge_areas; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.knowledge_areas (
    area_id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(120) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: knowledge_areas_area_id_seq; Type: SEQUENCE; Schema: cat; Owner: -
--

ALTER TABLE cat.knowledge_areas ALTER COLUMN area_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cat.knowledge_areas_area_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: modalities; Type: TABLE; Schema: cat; Owner: -
--

CREATE TABLE cat.modalities (
    modality_id smallint NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(80) NOT NULL
);


--
-- Name: modalities_modality_id_seq; Type: SEQUENCE; Schema: cat; Owner: -
--

ALTER TABLE cat.modalities ALTER COLUMN modality_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cat.modalities_modality_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: app_settings; Type: TABLE; Schema: cfg; Owner: -
--

CREATE TABLE cfg.app_settings (
    setting_key character varying(80) NOT NULL,
    setting_value text NOT NULL,
    description character varying(200),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by_user_id integer
);


--
-- Name: currencies; Type: TABLE; Schema: cfg; Owner: -
--

CREATE TABLE cfg.currencies (
    currency_code character(3) NOT NULL,
    name character varying(40) NOT NULL,
    symbol character varying(8) NOT NULL
);


--
-- Name: document_types; Type: TABLE; Schema: cfg; Owner: -
--

CREATE TABLE cfg.document_types (
    document_type_id smallint NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(80) NOT NULL,
    is_for_person boolean DEFAULT true NOT NULL,
    is_for_organization boolean DEFAULT false NOT NULL
);


--
-- Name: document_types_document_type_id_seq; Type: SEQUENCE; Schema: cfg; Owner: -
--

ALTER TABLE cfg.document_types ALTER COLUMN document_type_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cfg.document_types_document_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: holidays; Type: TABLE; Schema: cfg; Owner: -
--

CREATE TABLE cfg.holidays (
    holiday_date date NOT NULL,
    name character varying(80) NOT NULL
);


--
-- Name: theme_tokens; Type: TABLE; Schema: cfg; Owner: -
--

CREATE TABLE cfg.theme_tokens (
    token_key character varying(40) NOT NULL,
    light_hex character(7) NOT NULL,
    dark_hex character(7) NOT NULL,
    description character varying(120)
);


--
-- Name: hero_slides; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.hero_slides (
    slide_id integer NOT NULL,
    badge character varying(80),
    title character varying(200) NOT NULL,
    subtitle character varying(400),
    image_url character varying(400),
    primary_cta character varying(40),
    primary_url character varying(200),
    secondary_cta character varying(40),
    secondary_url character varying(200),
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: hero_slides_slide_id_seq; Type: SEQUENCE; Schema: cms; Owner: -
--

ALTER TABLE cms.hero_slides ALTER COLUMN slide_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cms.hero_slides_slide_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: media_assets; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.media_assets (
    asset_id integer NOT NULL,
    file_name character varying(200) NOT NULL,
    url character varying(400) NOT NULL,
    mime_type character varying(80),
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: media_assets_asset_id_seq; Type: SEQUENCE; Schema: cms; Owner: -
--

ALTER TABLE cms.media_assets ALTER COLUMN asset_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cms.media_assets_asset_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: pages; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.pages (
    page_id integer NOT NULL,
    slug character varying(80) NOT NULL,
    title character varying(160) NOT NULL,
    body_html text,
    is_published boolean DEFAULT true NOT NULL
);


--
-- Name: pages_page_id_seq; Type: SEQUENCE; Schema: cms; Owner: -
--

ALTER TABLE cms.pages ALTER COLUMN page_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cms.pages_page_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: site_stats; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.site_stats (
    stat_key character varying(40) NOT NULL,
    label character varying(80) NOT NULL,
    display_value character varying(40) NOT NULL,
    sort_order integer NOT NULL
);


--
-- Name: testimonials; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.testimonials (
    testimonial_id integer NOT NULL,
    author_name character varying(160) NOT NULL,
    author_title character varying(200),
    quote character varying(800) NOT NULL,
    photo_url character varying(400),
    sort_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT true NOT NULL
);


--
-- Name: testimonials_testimonial_id_seq; Type: SEQUENCE; Schema: cms; Owner: -
--

ALTER TABLE cms.testimonials ALTER COLUMN testimonial_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME cms.testimonials_testimonial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: campaigns; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.campaigns (
    campaign_id integer NOT NULL,
    name character varying(160) NOT NULL,
    channel character varying(30) NOT NULL,
    starts_on date,
    ends_on date,
    budget_pen numeric(12,2),
    course_id integer,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: campaigns_campaign_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.campaigns ALTER COLUMN campaign_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.campaigns_campaign_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lead_interactions; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.lead_interactions (
    interaction_id bigint NOT NULL,
    lead_id integer NOT NULL,
    user_id integer,
    channel character varying(20) NOT NULL,
    happened_at timestamp with time zone DEFAULT now() NOT NULL,
    summary character varying(400) NOT NULL,
    next_follow_up_on date
);


--
-- Name: lead_interactions_interaction_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.lead_interactions ALTER COLUMN interaction_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.lead_interactions_interaction_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lead_sources; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.lead_sources (
    source_id smallint NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(80) NOT NULL
);


--
-- Name: lead_sources_source_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.lead_sources ALTER COLUMN source_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.lead_sources_source_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lead_status_history; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.lead_status_history (
    history_id bigint NOT NULL,
    lead_id integer NOT NULL,
    from_status character varying(20),
    to_status character varying(20) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by_user_id integer
);


--
-- Name: lead_status_history_history_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.lead_status_history ALTER COLUMN history_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.lead_status_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: leads_lead_id_seq; Type: SEQUENCE; Schema: crm; Owner: -
--

ALTER TABLE crm.leads ALTER COLUMN lead_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME crm.leads_lead_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tipos_documento; Type: TABLE; Schema: docs; Owner: -
--

CREATE TABLE docs.tipos_documento (
    id_tipo_documento smallint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(80) NOT NULL
);


--
-- Name: doc_types_doc_type_id_seq; Type: SEQUENCE; Schema: docs; Owner: -
--

CREATE SEQUENCE docs.doc_types_doc_type_id_seq
    AS smallint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: doc_types_doc_type_id_seq; Type: SEQUENCE OWNED BY; Schema: docs; Owner: -
--

ALTER SEQUENCE docs.doc_types_doc_type_id_seq OWNED BY docs.tipos_documento.id_tipo_documento;


--
-- Name: versiones_documento; Type: TABLE; Schema: docs; Owner: -
--

CREATE TABLE docs.versiones_documento (
    id_version bigint NOT NULL,
    id_documento bigint NOT NULL,
    numero_version integer NOT NULL,
    contenido text,
    enlace_archivo character varying(400),
    motivo_cambio character varying(300),
    creado_por integer,
    creado_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: document_versions_version_id_seq; Type: SEQUENCE; Schema: docs; Owner: -
--

CREATE SEQUENCE docs.document_versions_version_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_versions_version_id_seq; Type: SEQUENCE OWNED BY; Schema: docs; Owner: -
--

ALTER SEQUENCE docs.document_versions_version_id_seq OWNED BY docs.versiones_documento.id_version;


--
-- Name: documentos; Type: TABLE; Schema: docs; Owner: -
--

CREATE TABLE docs.documentos (
    id_documento bigint NOT NULL,
    codigo character varying(40) NOT NULL,
    titulo character varying(220) NOT NULL,
    id_tipo_documento smallint NOT NULL,
    id_area_propietaria bigint NOT NULL,
    estado character varying(16) DEFAULT 'Borrador'::character varying NOT NULL,
    resumen character varying(500),
    contenido text,
    enlace_archivo character varying(400),
    version_actual integer DEFAULT 1 NOT NULL,
    vigente_desde date,
    vigente_hasta date,
    creado_por integer,
    creado_en timestamp(0) with time zone,
    actualizado_en timestamp(0) with time zone
);


--
-- Name: documents_document_id_seq; Type: SEQUENCE; Schema: docs; Owner: -
--

CREATE SEQUENCE docs.documents_document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documents_document_id_seq; Type: SEQUENCE OWNED BY; Schema: docs; Owner: -
--

ALTER SEQUENCE docs.documents_document_id_seq OWNED BY docs.documentos.id_documento;


--
-- Name: seq_document; Type: SEQUENCE; Schema: docs; Owner: -
--

CREATE SEQUENCE docs.seq_document
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: discount_rules; Type: TABLE; Schema: fin; Owner: -
--

CREATE TABLE fin.discount_rules (
    discount_rule_id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(120) NOT NULL,
    percent numeric(5,2),
    amount_pen numeric(12,2),
    valid_from date,
    valid_to date,
    coupon_code character varying(30),
    requires_agreement boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: discount_rules_discount_rule_id_seq; Type: SEQUENCE; Schema: fin; Owner: -
--

ALTER TABLE fin.discount_rules ALTER COLUMN discount_rule_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME fin.discount_rules_discount_rule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: installments; Type: TABLE; Schema: fin; Owner: -
--

CREATE TABLE fin.installments (
    installment_id integer NOT NULL,
    enrollment_id integer NOT NULL,
    sequence_no smallint NOT NULL,
    due_on date NOT NULL,
    amount_pen numeric(12,2) NOT NULL,
    paid_amount_pen numeric(12,2) DEFAULT 0 NOT NULL,
    status character varying(16) DEFAULT 'Pending'::character varying NOT NULL,
    CONSTRAINT installments_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Partial'::character varying, 'Paid'::character varying, 'Overdue'::character varying, 'Waived'::character varying])::text[])))
);


--
-- Name: installments_installment_id_seq; Type: SEQUENCE; Schema: fin; Owner: -
--

ALTER TABLE fin.installments ALTER COLUMN installment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME fin.installments_installment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invoice_items; Type: TABLE; Schema: fin; Owner: -
--

CREATE TABLE fin.invoice_items (
    invoice_item_id integer NOT NULL,
    invoice_id integer NOT NULL,
    description character varying(220) NOT NULL,
    quantity numeric(8,2) DEFAULT 1 NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    discount_pen numeric(12,2) DEFAULT 0 NOT NULL,
    line_total numeric(12,2) NOT NULL
);


--
-- Name: invoice_items_invoice_item_id_seq; Type: SEQUENCE; Schema: fin; Owner: -
--

ALTER TABLE fin.invoice_items ALTER COLUMN invoice_item_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME fin.invoice_items_invoice_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invoices; Type: TABLE; Schema: fin; Owner: -
--

CREATE TABLE fin.invoices (
    invoice_id integer NOT NULL,
    invoice_type character(2) NOT NULL,
    series character varying(4) NOT NULL,
    number integer NOT NULL,
    enrollment_id integer,
    organization_id integer,
    student_id integer,
    issue_date date NOT NULL,
    currency_code character(3) DEFAULT 'PEN'::bpchar NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    igv numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    status character varying(16) DEFAULT 'Issued'::character varying NOT NULL,
    sunat_status character varying(20),
    notes character varying(300),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_invoice_type_check CHECK ((invoice_type = ANY (ARRAY['01'::bpchar, '03'::bpchar, '07'::bpchar]))),
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['Issued'::character varying, 'Paid'::character varying, 'Partial'::character varying, 'Void'::character varying, 'Credited'::character varying])::text[])))
);


--
-- Name: invoices_invoice_id_seq; Type: SEQUENCE; Schema: fin; Owner: -
--

ALTER TABLE fin.invoices ALTER COLUMN invoice_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME fin.invoices_invoice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payment_methods; Type: TABLE; Schema: fin; Owner: -
--

CREATE TABLE fin.payment_methods (
    payment_method_id smallint NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(80) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: payment_methods_payment_method_id_seq; Type: SEQUENCE; Schema: fin; Owner: -
--

ALTER TABLE fin.payment_methods ALTER COLUMN payment_method_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME fin.payment_methods_payment_method_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: payments_payment_id_seq; Type: SEQUENCE; Schema: fin; Owner: -
--

ALTER TABLE fin.payments ALTER COLUMN payment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME fin.payments_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: instructor_areas; Type: TABLE; Schema: hr; Owner: -
--

CREATE TABLE hr.instructor_areas (
    instructor_id integer NOT NULL,
    area_id integer NOT NULL
);


--
-- Name: instructors; Type: TABLE; Schema: hr; Owner: -
--

CREATE TABLE hr.instructors (
    instructor_id integer NOT NULL,
    public_id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_type_id smallint NOT NULL,
    document_number character varying(20) NOT NULL,
    full_name character varying(160) NOT NULL,
    professional_title character varying(160),
    email character varying(160),
    phone character varying(20),
    bio text,
    photo_url character varying(400),
    user_id integer,
    hourly_rate_pen numeric(10,2),
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: instructors_instructor_id_seq; Type: SEQUENCE; Schema: hr; Owner: -
--

ALTER TABLE hr.instructors ALTER COLUMN instructor_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME hr.instructors_instructor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: outbox; Type: TABLE; Schema: ntf; Owner: -
--

CREATE TABLE ntf.outbox (
    outbox_id bigint NOT NULL,
    template_id integer,
    channel character varying(16) NOT NULL,
    to_address character varying(200) NOT NULL,
    payload_json jsonb,
    status character varying(16) DEFAULT 'Queued'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    error character varying(400),
    CONSTRAINT outbox_status_check CHECK (((status)::text = ANY ((ARRAY['Queued'::character varying, 'Sent'::character varying, 'Failed'::character varying])::text[])))
);


--
-- Name: outbox_outbox_id_seq; Type: SEQUENCE; Schema: ntf; Owner: -
--

ALTER TABLE ntf.outbox ALTER COLUMN outbox_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME ntf.outbox_outbox_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: templates; Type: TABLE; Schema: ntf; Owner: -
--

CREATE TABLE ntf.templates (
    template_id integer NOT NULL,
    code character varying(40) NOT NULL,
    channel character varying(16) NOT NULL,
    subject character varying(160),
    body text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: templates_template_id_seq; Type: SEQUENCE; Schema: ntf; Owner: -
--

ALTER TABLE ntf.templates ALTER COLUMN template_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME ntf.templates_template_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: agreements; Type: TABLE; Schema: org; Owner: -
--

CREATE TABLE org.agreements (
    agreement_id integer NOT NULL,
    organization_id integer NOT NULL,
    code character varying(30) NOT NULL,
    title character varying(200) NOT NULL,
    kind character varying(20) DEFAULT 'Convenio'::character varying NOT NULL,
    starts_on date NOT NULL,
    ends_on date,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    notes character varying(500),
    show_on_home boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: agreements_agreement_id_seq; Type: SEQUENCE; Schema: org; Owner: -
--

ALTER TABLE org.agreements ALTER COLUMN agreement_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME org.agreements_agreement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: areas; Type: TABLE; Schema: org; Owner: -
--

CREATE TABLE org.areas (
    id_area bigint NOT NULL,
    nombre character varying(255) NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    codigo character varying(20),
    finalidad character varying(300),
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: campuses; Type: TABLE; Schema: org; Owner: -
--

CREATE TABLE org.campuses (
    campus_id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(120) NOT NULL,
    address character varying(200),
    city character varying(80),
    department character varying(80),
    phone character varying(20),
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: campuses_campus_id_seq; Type: SEQUENCE; Schema: org; Owner: -
--

ALTER TABLE org.campuses ALTER COLUMN campus_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME org.campuses_campus_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: classrooms; Type: TABLE; Schema: org; Owner: -
--

CREATE TABLE org.classrooms (
    classroom_id integer NOT NULL,
    campus_id integer NOT NULL,
    name character varying(80) NOT NULL,
    capacity integer NOT NULL,
    is_virtual boolean DEFAULT false NOT NULL,
    meeting_url character varying(400),
    CONSTRAINT classrooms_capacity_check CHECK ((capacity > 0))
);


--
-- Name: classrooms_classroom_id_seq; Type: SEQUENCE; Schema: org; Owner: -
--

ALTER TABLE org.classrooms ALTER COLUMN classroom_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME org.classrooms_classroom_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: internal_areas_area_id_seq; Type: SEQUENCE; Schema: org; Owner: -
--

CREATE SEQUENCE org.internal_areas_area_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: internal_areas_area_id_seq; Type: SEQUENCE OWNED BY; Schema: org; Owner: -
--

ALTER SEQUENCE org.internal_areas_area_id_seq OWNED BY org.areas.id_area;


--
-- Name: miembros_area; Type: TABLE; Schema: org; Owner: -
--

CREATE TABLE org.miembros_area (
    id_area bigint NOT NULL,
    id_usuario integer NOT NULL,
    es_encargado boolean DEFAULT false NOT NULL,
    ingresado_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: organization_contacts; Type: TABLE; Schema: org; Owner: -
--

CREATE TABLE org.organization_contacts (
    contact_id integer NOT NULL,
    organization_id integer NOT NULL,
    full_name character varying(160) NOT NULL,
    job_title character varying(80),
    email character varying(160),
    phone character varying(20),
    is_primary boolean DEFAULT false NOT NULL
);


--
-- Name: organization_contacts_contact_id_seq; Type: SEQUENCE; Schema: org; Owner: -
--

ALTER TABLE org.organization_contacts ALTER COLUMN contact_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME org.organization_contacts_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: organizations; Type: TABLE; Schema: org; Owner: -
--

CREATE TABLE org.organizations (
    organization_id integer NOT NULL,
    document_type_id smallint NOT NULL,
    tax_id character varying(20) NOT NULL,
    legal_name character varying(200) NOT NULL,
    trade_name character varying(200),
    sector character varying(80),
    city character varying(80),
    email character varying(160),
    phone character varying(20),
    show_on_home boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations_organization_id_seq; Type: SEQUENCE; Schema: org; Owner: -
--

ALTER TABLE org.organizations ALTER COLUMN organization_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME org.organizations_organization_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: model_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_permissions (
    permission_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL
);


--
-- Name: model_has_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_has_roles (
    role_id bigint NOT NULL,
    model_type character varying(255) NOT NULL,
    model_id bigint NOT NULL
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    guard_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;


--
-- Name: role_has_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_has_permissions (
    permission_id bigint NOT NULL,
    role_id bigint NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    guard_name character varying(255) NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone,
    status character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    requested_area character varying(255)
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: complaint_history; Type: TABLE; Schema: qms; Owner: -
--

CREATE TABLE qms.complaint_history (
    history_id bigint NOT NULL,
    complaint_id integer NOT NULL,
    from_status character varying(20),
    to_status character varying(20) NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by_user_id integer,
    note character varying(400)
);


--
-- Name: complaint_history_history_id_seq; Type: SEQUENCE; Schema: qms; Owner: -
--

ALTER TABLE qms.complaint_history ALTER COLUMN history_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME qms.complaint_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: complaints_complaint_id_seq; Type: SEQUENCE; Schema: qms; Owner: -
--

ALTER TABLE qms.complaints ALTER COLUMN complaint_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME qms.complaints_complaint_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: seq_complaint; Type: SEQUENCE; Schema: qms; Owner: -
--

CREATE SEQUENCE qms.seq_complaint
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: survey_answers; Type: TABLE; Schema: qms; Owner: -
--

CREATE TABLE qms.survey_answers (
    answer_id integer NOT NULL,
    response_id integer NOT NULL,
    question_id integer NOT NULL,
    numeric_value numeric(5,2),
    text_value character varying(500)
);


--
-- Name: survey_answers_answer_id_seq; Type: SEQUENCE; Schema: qms; Owner: -
--

ALTER TABLE qms.survey_answers ALTER COLUMN answer_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME qms.survey_answers_answer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: survey_questions; Type: TABLE; Schema: qms; Owner: -
--

CREATE TABLE qms.survey_questions (
    question_id integer NOT NULL,
    survey_id integer NOT NULL,
    sort_order integer NOT NULL,
    prompt character varying(300) NOT NULL,
    kind character varying(16) NOT NULL
);


--
-- Name: survey_questions_question_id_seq; Type: SEQUENCE; Schema: qms; Owner: -
--

ALTER TABLE qms.survey_questions ALTER COLUMN question_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME qms.survey_questions_question_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: survey_responses; Type: TABLE; Schema: qms; Owner: -
--

CREATE TABLE qms.survey_responses (
    response_id integer NOT NULL,
    survey_id integer NOT NULL,
    enrollment_id integer,
    instructor_id integer,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: survey_responses_response_id_seq; Type: SEQUENCE; Schema: qms; Owner: -
--

ALTER TABLE qms.survey_responses ALTER COLUMN response_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME qms.survey_responses_response_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: surveys; Type: TABLE; Schema: qms; Owner: -
--

CREATE TABLE qms.surveys (
    survey_id integer NOT NULL,
    name character varying(160) NOT NULL,
    scope character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: surveys_survey_id_seq; Type: SEQUENCE; Schema: qms; Owner: -
--

ALTER TABLE qms.surveys ALTER COLUMN survey_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME qms.surveys_survey_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: adjuntos_pedido; Type: TABLE; Schema: req; Owner: -
--

CREATE TABLE req.adjuntos_pedido (
    id_adjunto bigint NOT NULL,
    id_pedido bigint NOT NULL,
    id_historial bigint,
    cargado_por integer,
    origen_archivo character varying(20) DEFAULT 'upload'::character varying NOT NULL,
    nombre_original character varying(255) NOT NULL,
    tipo_archivo character varying(120),
    tamano_bytes bigint,
    disco character varying(40),
    ruta character varying(500),
    enlace_externo character varying(1000),
    creado_en timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: detalles_pedido; Type: TABLE; Schema: req; Owner: -
--

CREATE TABLE req.detalles_pedido (
    id_detalle bigint NOT NULL,
    id_pedido bigint NOT NULL,
    descripcion character varying(220) NOT NULL,
    cantidad numeric(10,2),
    unidad character varying(20),
    notas character varying(200)
);


--
-- Name: historial_pedido; Type: TABLE; Schema: req; Owner: -
--

CREATE TABLE req.historial_pedido (
    id_historial bigint NOT NULL,
    id_pedido bigint NOT NULL,
    estado character varying(255) NOT NULL,
    observacion text,
    modificado_por bigint,
    modificado_en timestamp(0) without time zone NOT NULL,
    estado_anterior character varying(20),
    estado_nuevo character varying(20)
);


--
-- Name: internal_order_attachments_attachment_id_seq; Type: SEQUENCE; Schema: req; Owner: -
--

CREATE SEQUENCE req.internal_order_attachments_attachment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: internal_order_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: req; Owner: -
--

ALTER SEQUENCE req.internal_order_attachments_attachment_id_seq OWNED BY req.adjuntos_pedido.id_adjunto;


--
-- Name: internal_order_history_history_id_seq; Type: SEQUENCE; Schema: req; Owner: -
--

CREATE SEQUENCE req.internal_order_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: internal_order_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: req; Owner: -
--

ALTER SEQUENCE req.internal_order_history_history_id_seq OWNED BY req.historial_pedido.id_historial;


--
-- Name: internal_order_items_item_id_seq; Type: SEQUENCE; Schema: req; Owner: -
--

CREATE SEQUENCE req.internal_order_items_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: internal_order_items_item_id_seq; Type: SEQUENCE OWNED BY; Schema: req; Owner: -
--

ALTER SEQUENCE req.internal_order_items_item_id_seq OWNED BY req.detalles_pedido.id_detalle;


--
-- Name: pedidos; Type: TABLE; Schema: req; Owner: -
--

CREATE TABLE req.pedidos (
    id_pedido bigint NOT NULL,
    area_origen bigint NOT NULL,
    area_destino bigint NOT NULL,
    solicitado_por bigint,
    documento_relacionado integer,
    titulo character varying(200) NOT NULL,
    descripcion text NOT NULL,
    categoria character varying(255),
    prioridad character varying(255),
    estado character varying(255) DEFAULT 'Borrador'::character varying NOT NULL,
    fecha_limite date,
    creado_en timestamp(0) without time zone,
    actualizado_en timestamp(0) without time zone,
    codigo_pedido character varying(30),
    tipo_solicitud character varying(16) DEFAULT 'Ticket'::character varying NOT NULL,
    respuesta character varying(500),
    atendido_por integer,
    motivo_escalamiento character varying(500),
    fecha_escalamiento timestamp(0) with time zone,
    fecha_atencion timestamp(0) with time zone,
    fecha_cierre timestamp(0) with time zone
);


--
-- Name: internal_orders_order_id_seq; Type: SEQUENCE; Schema: req; Owner: -
--

CREATE SEQUENCE req.internal_orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: internal_orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: req; Owner: -
--

ALTER SEQUENCE req.internal_orders_order_id_seq OWNED BY req.pedidos.id_pedido;


--
-- Name: seq_order; Type: SEQUENCE; Schema: req; Owner: -
--

CREATE SEQUENCE req.seq_order
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: intentos_login; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.intentos_login (
    id_intento bigint NOT NULL,
    correo public.citext NOT NULL,
    exitoso boolean NOT NULL,
    direccion_ip character varying(45),
    realizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: login_attempts_attempt_id_seq; Type: SEQUENCE; Schema: sec; Owner: -
--

ALTER TABLE sec.intentos_login ALTER COLUMN id_intento ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sec.login_attempts_attempt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: permisos; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.permisos (
    id_permiso integer NOT NULL,
    codigo character varying(80) NOT NULL,
    modulo character varying(40) NOT NULL,
    descripcion character varying(200)
);


--
-- Name: permissions_permission_id_seq; Type: SEQUENCE; Schema: sec; Owner: -
--

ALTER TABLE sec.permisos ALTER COLUMN id_permiso ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sec.permissions_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tokens_acceso; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.tokens_acceso (
    id_token bigint NOT NULL,
    id_usuario integer NOT NULL,
    hash_token character(64) NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    revocado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens_refresh_token_id_seq; Type: SEQUENCE; Schema: sec; Owner: -
--

ALTER TABLE sec.tokens_acceso ALTER COLUMN id_token ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sec.refresh_tokens_refresh_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: roles; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.roles (
    id_rol integer NOT NULL,
    nombre character varying(60) NOT NULL,
    descripcion character varying(200),
    es_sistema boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL
);


--
-- Name: roles_permisos; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.roles_permisos (
    id_rol integer NOT NULL,
    id_permiso integer NOT NULL
);


--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: sec; Owner: -
--

ALTER TABLE sec.roles ALTER COLUMN id_rol ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sec.roles_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sesiones_usuario; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.sesiones_usuario (
    id_sesion uuid DEFAULT gen_random_uuid() NOT NULL,
    id_usuario integer NOT NULL,
    inicio timestamp with time zone DEFAULT now() NOT NULL,
    fin timestamp with time zone,
    direccion_ip character varying(45),
    agente_usuario character varying(300)
);


--
-- Name: usuarios; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.usuarios (
    id_usuario integer NOT NULL,
    correo public.citext NOT NULL,
    contrasena character varying(256) NOT NULL,
    nombre_completo character varying(160) NOT NULL,
    telefono character varying(20),
    tema_preferido character varying(10) DEFAULT 'system'::character varying NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    cambiar_contrasena boolean DEFAULT true NOT NULL,
    ultimo_ingreso timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    creado_por integer,
    estado character varying(255) DEFAULT 'pending'::character varying NOT NULL,
    area_solicitada character varying(255),
    id_area bigint,
    CONSTRAINT users_preferred_theme_check CHECK (((tema_preferido)::text = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: sec; Owner: -
--

ALTER TABLE sec.usuarios ALTER COLUMN id_usuario ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME sec.users_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: usuarios_roles; Type: TABLE; Schema: sec; Owner: -
--

CREATE TABLE sec.usuarios_roles (
    id_usuario integer NOT NULL,
    id_rol integer NOT NULL,
    asignado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_items; Type: TABLE; Schema: shop; Owner: -
--

CREATE TABLE shop.cart_items (
    cart_item_id integer NOT NULL,
    cart_id uuid NOT NULL,
    edition_id integer NOT NULL,
    quantity smallint DEFAULT 1 NOT NULL
);


--
-- Name: cart_items_cart_item_id_seq; Type: SEQUENCE; Schema: shop; Owner: -
--

ALTER TABLE shop.cart_items ALTER COLUMN cart_item_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME shop.cart_items_cart_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: carts; Type: TABLE; Schema: shop; Owner: -
--

CREATE TABLE shop.carts (
    cart_id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id integer,
    session_key character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: web_order_items; Type: TABLE; Schema: shop; Owner: -
--

CREATE TABLE shop.web_order_items (
    order_item_id integer NOT NULL,
    order_id integer NOT NULL,
    edition_id integer NOT NULL,
    enrollment_id integer,
    unit_price_pen numeric(12,2) NOT NULL
);


--
-- Name: web_order_items_order_item_id_seq; Type: SEQUENCE; Schema: shop; Owner: -
--

ALTER TABLE shop.web_order_items ALTER COLUMN order_item_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME shop.web_order_items_order_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: web_orders; Type: TABLE; Schema: shop; Owner: -
--

CREATE TABLE shop.web_orders (
    order_id integer NOT NULL,
    order_code character varying(30) NOT NULL,
    student_id integer NOT NULL,
    status character varying(20) DEFAULT 'Pending'::character varying NOT NULL,
    coupon_code character varying(30),
    subtotal_pen numeric(12,2) NOT NULL,
    discount_pen numeric(12,2) DEFAULT 0 NOT NULL,
    total_pen numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    paid_at timestamp with time zone,
    CONSTRAINT web_orders_status_check CHECK (((status)::text = ANY ((ARRAY['Pending'::character varying, 'Paid'::character varying, 'Cancelled'::character varying, 'Refunded'::character varying])::text[])))
);


--
-- Name: web_orders_order_id_seq; Type: SEQUENCE; Schema: shop; Owner: -
--

ALTER TABLE shop.web_orders ALTER COLUMN order_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME shop.web_orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: documentos id_documento; Type: DEFAULT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.documentos ALTER COLUMN id_documento SET DEFAULT nextval('docs.documents_document_id_seq'::regclass);


--
-- Name: tipos_documento id_tipo_documento; Type: DEFAULT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.tipos_documento ALTER COLUMN id_tipo_documento SET DEFAULT nextval('docs.doc_types_doc_type_id_seq'::regclass);


--
-- Name: versiones_documento id_version; Type: DEFAULT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.versiones_documento ALTER COLUMN id_version SET DEFAULT nextval('docs.document_versions_version_id_seq'::regclass);


--
-- Name: areas id_area; Type: DEFAULT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.areas ALTER COLUMN id_area SET DEFAULT nextval('org.internal_areas_area_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions ALTER COLUMN id SET DEFAULT nextval('public.permissions_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: adjuntos_pedido id_adjunto; Type: DEFAULT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.adjuntos_pedido ALTER COLUMN id_adjunto SET DEFAULT nextval('req.internal_order_attachments_attachment_id_seq'::regclass);


--
-- Name: detalles_pedido id_detalle; Type: DEFAULT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.detalles_pedido ALTER COLUMN id_detalle SET DEFAULT nextval('req.internal_order_items_item_id_seq'::regclass);


--
-- Name: historial_pedido id_historial; Type: DEFAULT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.historial_pedido ALTER COLUMN id_historial SET DEFAULT nextval('req.internal_order_history_history_id_seq'::regclass);


--
-- Name: pedidos id_pedido; Type: DEFAULT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.pedidos ALTER COLUMN id_pedido SET DEFAULT nextval('req.internal_orders_order_id_seq'::regclass);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (attendance_id);


--
-- Name: attendance attendance_session_id_enrollment_id_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.attendance
    ADD CONSTRAINT attendance_session_id_enrollment_id_key UNIQUE (session_id, enrollment_id);


--
-- Name: certificate_templates certificate_templates_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.certificate_templates
    ADD CONSTRAINT certificate_templates_pkey PRIMARY KEY (template_id);


--
-- Name: certificates certificates_certificate_code_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.certificates
    ADD CONSTRAINT certificates_certificate_code_key UNIQUE (certificate_code);


--
-- Name: certificates certificates_enrollment_id_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.certificates
    ADD CONSTRAINT certificates_enrollment_id_key UNIQUE (enrollment_id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (certificate_id);


--
-- Name: course_editions course_editions_edition_code_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.course_editions
    ADD CONSTRAINT course_editions_edition_code_key UNIQUE (edition_code);


--
-- Name: course_editions course_editions_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.course_editions
    ADD CONSTRAINT course_editions_pkey PRIMARY KEY (edition_id);


--
-- Name: edition_instructors edition_instructors_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.edition_instructors
    ADD CONSTRAINT edition_instructors_pkey PRIMARY KEY (edition_id, instructor_id);


--
-- Name: edition_sessions edition_sessions_edition_id_session_number_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.edition_sessions
    ADD CONSTRAINT edition_sessions_edition_id_session_number_key UNIQUE (edition_id, session_number);


--
-- Name: edition_sessions edition_sessions_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.edition_sessions
    ADD CONSTRAINT edition_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: enrollment_status_history enrollment_status_history_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollment_status_history
    ADD CONSTRAINT enrollment_status_history_pkey PRIMARY KEY (history_id);


--
-- Name: enrollments enrollments_enrollment_code_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollments
    ADD CONSTRAINT enrollments_enrollment_code_key UNIQUE (enrollment_code);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (enrollment_id);


--
-- Name: enrollments enrollments_student_id_edition_id_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollments
    ADD CONSTRAINT enrollments_student_id_edition_id_key UNIQUE (student_id, edition_id);


--
-- Name: evaluations evaluations_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.evaluations
    ADD CONSTRAINT evaluations_pkey PRIMARY KEY (evaluation_id);


--
-- Name: students students_document_type_id_document_number_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.students
    ADD CONSTRAINT students_document_type_id_document_number_key UNIQUE (document_type_id, document_number);


--
-- Name: students students_email_key; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.students
    ADD CONSTRAINT students_email_key UNIQUE (email);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: anl; Owner: -
--

ALTER TABLE ONLY anl.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_log_id);


--
-- Name: kpi_definitions kpi_definitions_code_key; Type: CONSTRAINT; Schema: anl; Owner: -
--

ALTER TABLE ONLY anl.kpi_definitions
    ADD CONSTRAINT kpi_definitions_code_key UNIQUE (code);


--
-- Name: kpi_definitions kpi_definitions_pkey; Type: CONSTRAINT; Schema: anl; Owner: -
--

ALTER TABLE ONLY anl.kpi_definitions
    ADD CONSTRAINT kpi_definitions_pkey PRIMARY KEY (kpi_id);


--
-- Name: kpi_snapshots kpi_snapshots_pkey; Type: CONSTRAINT; Schema: anl; Owner: -
--

ALTER TABLE ONLY anl.kpi_snapshots
    ADD CONSTRAINT kpi_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: accreditation_bodies accreditation_bodies_code_key; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.accreditation_bodies
    ADD CONSTRAINT accreditation_bodies_code_key UNIQUE (code);


--
-- Name: accreditation_bodies accreditation_bodies_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.accreditation_bodies
    ADD CONSTRAINT accreditation_bodies_pkey PRIMARY KEY (body_id);


--
-- Name: course_accreditations course_accreditations_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_accreditations
    ADD CONSTRAINT course_accreditations_pkey PRIMARY KEY (course_id, body_id);


--
-- Name: course_areas course_areas_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_areas
    ADD CONSTRAINT course_areas_pkey PRIMARY KEY (course_id, area_id);


--
-- Name: course_modules course_modules_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_modules
    ADD CONSTRAINT course_modules_pkey PRIMARY KEY (module_id);


--
-- Name: course_prerequisites course_prerequisites_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_prerequisites
    ADD CONSTRAINT course_prerequisites_pkey PRIMARY KEY (course_id, prerequisite_course_id);


--
-- Name: course_types course_types_code_key; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_types
    ADD CONSTRAINT course_types_code_key UNIQUE (code);


--
-- Name: course_types course_types_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_types
    ADD CONSTRAINT course_types_pkey PRIMARY KEY (course_type_id);


--
-- Name: courses courses_code_key; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.courses
    ADD CONSTRAINT courses_code_key UNIQUE (code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (course_id);


--
-- Name: courses courses_slug_key; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.courses
    ADD CONSTRAINT courses_slug_key UNIQUE (slug);


--
-- Name: knowledge_areas knowledge_areas_code_key; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.knowledge_areas
    ADD CONSTRAINT knowledge_areas_code_key UNIQUE (code);


--
-- Name: knowledge_areas knowledge_areas_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.knowledge_areas
    ADD CONSTRAINT knowledge_areas_pkey PRIMARY KEY (area_id);


--
-- Name: modalities modalities_code_key; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.modalities
    ADD CONSTRAINT modalities_code_key UNIQUE (code);


--
-- Name: modalities modalities_pkey; Type: CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.modalities
    ADD CONSTRAINT modalities_pkey PRIMARY KEY (modality_id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: cfg; Owner: -
--

ALTER TABLE ONLY cfg.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (setting_key);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: cfg; Owner: -
--

ALTER TABLE ONLY cfg.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (currency_code);


--
-- Name: document_types document_types_code_key; Type: CONSTRAINT; Schema: cfg; Owner: -
--

ALTER TABLE ONLY cfg.document_types
    ADD CONSTRAINT document_types_code_key UNIQUE (code);


--
-- Name: document_types document_types_pkey; Type: CONSTRAINT; Schema: cfg; Owner: -
--

ALTER TABLE ONLY cfg.document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (document_type_id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: cfg; Owner: -
--

ALTER TABLE ONLY cfg.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (holiday_date);


--
-- Name: theme_tokens theme_tokens_pkey; Type: CONSTRAINT; Schema: cfg; Owner: -
--

ALTER TABLE ONLY cfg.theme_tokens
    ADD CONSTRAINT theme_tokens_pkey PRIMARY KEY (token_key);


--
-- Name: hero_slides hero_slides_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.hero_slides
    ADD CONSTRAINT hero_slides_pkey PRIMARY KEY (slide_id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (asset_id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (page_id);


--
-- Name: pages pages_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);


--
-- Name: site_stats site_stats_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.site_stats
    ADD CONSTRAINT site_stats_pkey PRIMARY KEY (stat_key);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (testimonial_id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (campaign_id);


--
-- Name: lead_interactions lead_interactions_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_interactions
    ADD CONSTRAINT lead_interactions_pkey PRIMARY KEY (interaction_id);


--
-- Name: lead_sources lead_sources_code_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_sources
    ADD CONSTRAINT lead_sources_code_key UNIQUE (code);


--
-- Name: lead_sources lead_sources_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_sources
    ADD CONSTRAINT lead_sources_pkey PRIMARY KEY (source_id);


--
-- Name: lead_status_history lead_status_history_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT lead_status_history_pkey PRIMARY KEY (history_id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (lead_id);


--
-- Name: tipos_documento doc_types_pkey; Type: CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.tipos_documento
    ADD CONSTRAINT doc_types_pkey PRIMARY KEY (id_tipo_documento);


--
-- Name: tipos_documento docs_doc_types_code_unique; Type: CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.tipos_documento
    ADD CONSTRAINT docs_doc_types_code_unique UNIQUE (codigo);


--
-- Name: versiones_documento docs_document_versions_document_id_version_no_unique; Type: CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.versiones_documento
    ADD CONSTRAINT docs_document_versions_document_id_version_no_unique UNIQUE (id_documento, numero_version);


--
-- Name: documentos docs_documents_code_unique; Type: CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.documentos
    ADD CONSTRAINT docs_documents_code_unique UNIQUE (codigo);


--
-- Name: versiones_documento document_versions_pkey; Type: CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.versiones_documento
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id_version);


--
-- Name: documentos documents_pkey; Type: CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.documentos
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id_documento);


--
-- Name: discount_rules discount_rules_code_key; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.discount_rules
    ADD CONSTRAINT discount_rules_code_key UNIQUE (code);


--
-- Name: discount_rules discount_rules_pkey; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.discount_rules
    ADD CONSTRAINT discount_rules_pkey PRIMARY KEY (discount_rule_id);


--
-- Name: installments installments_enrollment_id_sequence_no_key; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.installments
    ADD CONSTRAINT installments_enrollment_id_sequence_no_key UNIQUE (enrollment_id, sequence_no);


--
-- Name: installments installments_pkey; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.installments
    ADD CONSTRAINT installments_pkey PRIMARY KEY (installment_id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (invoice_item_id);


--
-- Name: invoices invoices_invoice_type_series_number_key; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.invoices
    ADD CONSTRAINT invoices_invoice_type_series_number_key UNIQUE (invoice_type, series, number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (invoice_id);


--
-- Name: payment_methods payment_methods_code_key; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (payment_method_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- Name: instructor_areas instructor_areas_pkey; Type: CONSTRAINT; Schema: hr; Owner: -
--

ALTER TABLE ONLY hr.instructor_areas
    ADD CONSTRAINT instructor_areas_pkey PRIMARY KEY (instructor_id, area_id);


--
-- Name: instructors instructors_document_type_id_document_number_key; Type: CONSTRAINT; Schema: hr; Owner: -
--

ALTER TABLE ONLY hr.instructors
    ADD CONSTRAINT instructors_document_type_id_document_number_key UNIQUE (document_type_id, document_number);


--
-- Name: instructors instructors_pkey; Type: CONSTRAINT; Schema: hr; Owner: -
--

ALTER TABLE ONLY hr.instructors
    ADD CONSTRAINT instructors_pkey PRIMARY KEY (instructor_id);


--
-- Name: instructors instructors_public_id_key; Type: CONSTRAINT; Schema: hr; Owner: -
--

ALTER TABLE ONLY hr.instructors
    ADD CONSTRAINT instructors_public_id_key UNIQUE (public_id);


--
-- Name: outbox outbox_pkey; Type: CONSTRAINT; Schema: ntf; Owner: -
--

ALTER TABLE ONLY ntf.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (outbox_id);


--
-- Name: templates templates_code_key; Type: CONSTRAINT; Schema: ntf; Owner: -
--

ALTER TABLE ONLY ntf.templates
    ADD CONSTRAINT templates_code_key UNIQUE (code);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: ntf; Owner: -
--

ALTER TABLE ONLY ntf.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (template_id);


--
-- Name: agreements agreements_code_key; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.agreements
    ADD CONSTRAINT agreements_code_key UNIQUE (code);


--
-- Name: agreements agreements_pkey; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.agreements
    ADD CONSTRAINT agreements_pkey PRIMARY KEY (agreement_id);


--
-- Name: miembros_area area_members_pkey; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.miembros_area
    ADD CONSTRAINT area_members_pkey PRIMARY KEY (id_area, id_usuario);


--
-- Name: campuses campuses_code_key; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.campuses
    ADD CONSTRAINT campuses_code_key UNIQUE (code);


--
-- Name: campuses campuses_pkey; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.campuses
    ADD CONSTRAINT campuses_pkey PRIMARY KEY (campus_id);


--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (classroom_id);


--
-- Name: areas internal_areas_pkey; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.areas
    ADD CONSTRAINT internal_areas_pkey PRIMARY KEY (id_area);


--
-- Name: areas org_internal_areas_code_unique; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.areas
    ADD CONSTRAINT org_internal_areas_code_unique UNIQUE (codigo);


--
-- Name: organization_contacts organization_contacts_pkey; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.organization_contacts
    ADD CONSTRAINT organization_contacts_pkey PRIMARY KEY (contact_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (organization_id);


--
-- Name: organizations organizations_tax_id_key; Type: CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.organizations
    ADD CONSTRAINT organizations_tax_id_key UNIQUE (tax_id);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: model_has_permissions model_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_pkey PRIMARY KEY (permission_id, model_id, model_type);


--
-- Name: model_has_roles model_has_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_pkey PRIMARY KEY (role_id, model_id, model_type);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: permissions permissions_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_has_permissions role_has_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id);


--
-- Name: roles roles_name_guard_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: complaint_history complaint_history_pkey; Type: CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.complaint_history
    ADD CONSTRAINT complaint_history_pkey PRIMARY KEY (history_id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (complaint_id);


--
-- Name: complaints complaints_ticket_code_key; Type: CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.complaints
    ADD CONSTRAINT complaints_ticket_code_key UNIQUE (ticket_code);


--
-- Name: survey_answers survey_answers_pkey; Type: CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_answers
    ADD CONSTRAINT survey_answers_pkey PRIMARY KEY (answer_id);


--
-- Name: survey_questions survey_questions_pkey; Type: CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_questions
    ADD CONSTRAINT survey_questions_pkey PRIMARY KEY (question_id);


--
-- Name: survey_responses survey_responses_pkey; Type: CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_responses
    ADD CONSTRAINT survey_responses_pkey PRIMARY KEY (response_id);


--
-- Name: surveys surveys_pkey; Type: CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.surveys
    ADD CONSTRAINT surveys_pkey PRIMARY KEY (survey_id);


--
-- Name: adjuntos_pedido internal_order_attachments_pkey; Type: CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.adjuntos_pedido
    ADD CONSTRAINT internal_order_attachments_pkey PRIMARY KEY (id_adjunto);


--
-- Name: historial_pedido internal_order_history_pkey; Type: CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.historial_pedido
    ADD CONSTRAINT internal_order_history_pkey PRIMARY KEY (id_historial);


--
-- Name: detalles_pedido internal_order_items_pkey; Type: CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.detalles_pedido
    ADD CONSTRAINT internal_order_items_pkey PRIMARY KEY (id_detalle);


--
-- Name: pedidos internal_orders_pkey; Type: CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.pedidos
    ADD CONSTRAINT internal_orders_pkey PRIMARY KEY (id_pedido);


--
-- Name: pedidos req_internal_orders_order_code_unique; Type: CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.pedidos
    ADD CONSTRAINT req_internal_orders_order_code_unique UNIQUE (codigo_pedido);


--
-- Name: intentos_login login_attempts_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.intentos_login
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id_intento);


--
-- Name: permisos permissions_code_key; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.permisos
    ADD CONSTRAINT permissions_code_key UNIQUE (codigo);


--
-- Name: permisos permissions_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.permisos
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id_permiso);


--
-- Name: tokens_acceso refresh_tokens_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.tokens_acceso
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id_token);


--
-- Name: roles_permisos role_permissions_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.roles_permisos
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id_rol, id_permiso);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.roles
    ADD CONSTRAINT roles_name_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_rol);


--
-- Name: usuarios_roles user_roles_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.usuarios_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id_usuario, id_rol);


--
-- Name: sesiones_usuario user_sessions_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.sesiones_usuario
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id_sesion);


--
-- Name: usuarios users_email_key; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.usuarios
    ADD CONSTRAINT users_email_key UNIQUE (correo);


--
-- Name: usuarios users_pkey; Type: CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.usuarios
    ADD CONSTRAINT users_pkey PRIMARY KEY (id_usuario);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (cart_item_id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (cart_id);


--
-- Name: web_order_items web_order_items_pkey; Type: CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.web_order_items
    ADD CONSTRAINT web_order_items_pkey PRIMARY KEY (order_item_id);


--
-- Name: web_orders web_orders_order_code_key; Type: CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.web_orders
    ADD CONSTRAINT web_orders_order_code_key UNIQUE (order_code);


--
-- Name: web_orders web_orders_pkey; Type: CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.web_orders
    ADD CONSTRAINT web_orders_pkey PRIMARY KEY (order_id);


--
-- Name: ix_editions_course; Type: INDEX; Schema: acad; Owner: -
--

CREATE INDEX ix_editions_course ON acad.course_editions USING btree (course_id, starts_on);


--
-- Name: ix_editions_status; Type: INDEX; Schema: acad; Owner: -
--

CREATE INDEX ix_editions_status ON acad.course_editions USING btree (status);


--
-- Name: ix_enrollments_edition; Type: INDEX; Schema: acad; Owner: -
--

CREATE INDEX ix_enrollments_edition ON acad.enrollments USING btree (edition_id, status);


--
-- Name: ix_enrollments_student; Type: INDEX; Schema: acad; Owner: -
--

CREATE INDEX ix_enrollments_student ON acad.enrollments USING btree (student_id);


--
-- Name: ix_students_name; Type: INDEX; Schema: acad; Owner: -
--

CREATE INDEX ix_students_name ON acad.students USING btree (last_name, first_name);


--
-- Name: ix_audit_actor; Type: INDEX; Schema: anl; Owner: -
--

CREATE INDEX ix_audit_actor ON anl.audit_logs USING btree (actor_user_id, created_at DESC);


--
-- Name: ix_audit_entity; Type: INDEX; Schema: anl; Owner: -
--

CREATE INDEX ix_audit_entity ON anl.audit_logs USING btree (entity, entity_id, created_at DESC);


--
-- Name: ix_kpi_snap; Type: INDEX; Schema: anl; Owner: -
--

CREATE INDEX ix_kpi_snap ON anl.kpi_snapshots USING btree (kpi_id, captured_at DESC);


--
-- Name: ix_courses_featured; Type: INDEX; Schema: cat; Owner: -
--

CREATE INDEX ix_courses_featured ON cat.courses USING btree (featured_on_home, is_published);


--
-- Name: ix_courses_published; Type: INDEX; Schema: cat; Owner: -
--

CREATE INDEX ix_courses_published ON cat.courses USING btree (is_published, is_active);


--
-- Name: ix_leads_phone; Type: INDEX; Schema: crm; Owner: -
--

CREATE INDEX ix_leads_phone ON crm.leads USING btree (phone);


--
-- Name: ix_leads_status; Type: INDEX; Schema: crm; Owner: -
--

CREATE INDEX ix_leads_status ON crm.leads USING btree (status, created_at DESC);


--
-- Name: docs_documents_owner_area_id_status_index; Type: INDEX; Schema: docs; Owner: -
--

CREATE INDEX docs_documents_owner_area_id_status_index ON docs.documentos USING btree (id_area_propietaria, estado);


--
-- Name: ix_invoices_date; Type: INDEX; Schema: fin; Owner: -
--

CREATE INDEX ix_invoices_date ON fin.invoices USING btree (issue_date, status);


--
-- Name: ix_payments_date; Type: INDEX; Schema: fin; Owner: -
--

CREATE INDEX ix_payments_date ON fin.payments USING btree (paid_at);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: model_has_permissions_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_permissions_model_id_model_type_index ON public.model_has_permissions USING btree (model_id, model_type);


--
-- Name: model_has_roles_model_id_model_type_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_has_roles_model_id_model_type_index ON public.model_has_roles USING btree (model_id, model_type);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: req_internal_order_attachments_order_id_created_at_index; Type: INDEX; Schema: req; Owner: -
--

CREATE INDEX req_internal_order_attachments_order_id_created_at_index ON req.adjuntos_pedido USING btree (id_pedido, creado_en);


--
-- Name: ix_sessions_user; Type: INDEX; Schema: sec; Owner: -
--

CREATE INDEX ix_sessions_user ON sec.sesiones_usuario USING btree (id_usuario, inicio DESC);


--
-- Name: ix_users_active; Type: INDEX; Schema: sec; Owner: -
--

CREATE INDEX ix_users_active ON sec.usuarios USING btree (activo);


--
-- Name: enrollments trg_enrollments_status; Type: TRIGGER; Schema: acad; Owner: -
--

CREATE TRIGGER trg_enrollments_status AFTER UPDATE ON acad.enrollments FOR EACH ROW EXECUTE FUNCTION acad.fn_enrollment_status();


--
-- Name: leads trg_leads_status; Type: TRIGGER; Schema: crm; Owner: -
--

CREATE TRIGGER trg_leads_status AFTER UPDATE ON crm.leads FOR EACH ROW EXECUTE FUNCTION crm.fn_lead_status();


--
-- Name: attendance attendance_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.attendance
    ADD CONSTRAINT attendance_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: attendance attendance_marked_by_user_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.attendance
    ADD CONSTRAINT attendance_marked_by_user_id_fkey FOREIGN KEY (marked_by_user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: attendance attendance_session_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.attendance
    ADD CONSTRAINT attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES acad.edition_sessions(session_id);


--
-- Name: certificate_templates certificate_templates_course_type_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.certificate_templates
    ADD CONSTRAINT certificate_templates_course_type_id_fkey FOREIGN KEY (course_type_id) REFERENCES cat.course_types(course_type_id);


--
-- Name: certificates certificates_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.certificates
    ADD CONSTRAINT certificates_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: certificates certificates_template_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.certificates
    ADD CONSTRAINT certificates_template_id_fkey FOREIGN KEY (template_id) REFERENCES acad.certificate_templates(template_id);


--
-- Name: course_editions course_editions_campus_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.course_editions
    ADD CONSTRAINT course_editions_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES org.campuses(campus_id);


--
-- Name: course_editions course_editions_classroom_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.course_editions
    ADD CONSTRAINT course_editions_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES org.classrooms(classroom_id);


--
-- Name: course_editions course_editions_course_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.course_editions
    ADD CONSTRAINT course_editions_course_id_fkey FOREIGN KEY (course_id) REFERENCES cat.courses(course_id);


--
-- Name: course_editions course_editions_modality_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.course_editions
    ADD CONSTRAINT course_editions_modality_id_fkey FOREIGN KEY (modality_id) REFERENCES cat.modalities(modality_id);


--
-- Name: edition_instructors edition_instructors_edition_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.edition_instructors
    ADD CONSTRAINT edition_instructors_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES acad.course_editions(edition_id);


--
-- Name: edition_instructors edition_instructors_instructor_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.edition_instructors
    ADD CONSTRAINT edition_instructors_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES hr.instructors(instructor_id);


--
-- Name: edition_sessions edition_sessions_classroom_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.edition_sessions
    ADD CONSTRAINT edition_sessions_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES org.classrooms(classroom_id);


--
-- Name: edition_sessions edition_sessions_edition_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.edition_sessions
    ADD CONSTRAINT edition_sessions_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES acad.course_editions(edition_id);


--
-- Name: enrollment_status_history enrollment_status_history_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollment_status_history
    ADD CONSTRAINT enrollment_status_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: enrollment_status_history enrollment_status_history_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollment_status_history
    ADD CONSTRAINT enrollment_status_history_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: enrollments enrollments_agreement_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollments
    ADD CONSTRAINT enrollments_agreement_id_fkey FOREIGN KEY (agreement_id) REFERENCES org.agreements(agreement_id);


--
-- Name: enrollments enrollments_edition_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollments
    ADD CONSTRAINT enrollments_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES acad.course_editions(edition_id);


--
-- Name: enrollments enrollments_organization_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollments
    ADD CONSTRAINT enrollments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(organization_id);


--
-- Name: enrollments enrollments_sales_user_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollments
    ADD CONSTRAINT enrollments_sales_user_id_fkey FOREIGN KEY (sales_user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES acad.students(student_id);


--
-- Name: evaluations evaluations_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.evaluations
    ADD CONSTRAINT evaluations_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: students students_document_type_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.students
    ADD CONSTRAINT students_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES cfg.document_types(document_type_id);


--
-- Name: students students_organization_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.students
    ADD CONSTRAINT students_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(organization_id);


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: acad; Owner: -
--

ALTER TABLE ONLY acad.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: audit_logs audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: anl; Owner: -
--

ALTER TABLE ONLY anl.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: kpi_snapshots kpi_snapshots_kpi_id_fkey; Type: FK CONSTRAINT; Schema: anl; Owner: -
--

ALTER TABLE ONLY anl.kpi_snapshots
    ADD CONSTRAINT kpi_snapshots_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES anl.kpi_definitions(kpi_id);


--
-- Name: course_accreditations course_accreditations_body_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_accreditations
    ADD CONSTRAINT course_accreditations_body_id_fkey FOREIGN KEY (body_id) REFERENCES cat.accreditation_bodies(body_id);


--
-- Name: course_accreditations course_accreditations_course_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_accreditations
    ADD CONSTRAINT course_accreditations_course_id_fkey FOREIGN KEY (course_id) REFERENCES cat.courses(course_id);


--
-- Name: course_areas course_areas_area_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_areas
    ADD CONSTRAINT course_areas_area_id_fkey FOREIGN KEY (area_id) REFERENCES cat.knowledge_areas(area_id);


--
-- Name: course_areas course_areas_course_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_areas
    ADD CONSTRAINT course_areas_course_id_fkey FOREIGN KEY (course_id) REFERENCES cat.courses(course_id);


--
-- Name: course_modules course_modules_course_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_modules
    ADD CONSTRAINT course_modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES cat.courses(course_id);


--
-- Name: course_prerequisites course_prerequisites_course_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_prerequisites
    ADD CONSTRAINT course_prerequisites_course_id_fkey FOREIGN KEY (course_id) REFERENCES cat.courses(course_id);


--
-- Name: course_prerequisites course_prerequisites_prerequisite_course_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.course_prerequisites
    ADD CONSTRAINT course_prerequisites_prerequisite_course_id_fkey FOREIGN KEY (prerequisite_course_id) REFERENCES cat.courses(course_id);


--
-- Name: courses courses_course_type_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.courses
    ADD CONSTRAINT courses_course_type_id_fkey FOREIGN KEY (course_type_id) REFERENCES cat.course_types(course_type_id);


--
-- Name: courses courses_default_modality_id_fkey; Type: FK CONSTRAINT; Schema: cat; Owner: -
--

ALTER TABLE ONLY cat.courses
    ADD CONSTRAINT courses_default_modality_id_fkey FOREIGN KEY (default_modality_id) REFERENCES cat.modalities(modality_id);


--
-- Name: campaigns campaigns_course_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.campaigns
    ADD CONSTRAINT campaigns_course_id_fkey FOREIGN KEY (course_id) REFERENCES cat.courses(course_id);


--
-- Name: lead_interactions lead_interactions_lead_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_interactions
    ADD CONSTRAINT lead_interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.leads(lead_id);


--
-- Name: lead_interactions lead_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_interactions
    ADD CONSTRAINT lead_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: lead_status_history lead_status_history_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT lead_status_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: lead_status_history lead_status_history_lead_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT lead_status_history_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.leads(lead_id);


--
-- Name: leads leads_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: leads leads_campaign_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES crm.campaigns(campaign_id);


--
-- Name: leads leads_converted_student_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_converted_student_id_fkey FOREIGN KEY (converted_student_id) REFERENCES acad.students(student_id);


--
-- Name: leads leads_course_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_course_id_fkey FOREIGN KEY (course_id) REFERENCES cat.courses(course_id);


--
-- Name: leads leads_source_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.leads
    ADD CONSTRAINT leads_source_id_fkey FOREIGN KEY (source_id) REFERENCES crm.lead_sources(source_id);


--
-- Name: versiones_documento docs_document_versions_created_by_user_id_foreign; Type: FK CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.versiones_documento
    ADD CONSTRAINT docs_document_versions_created_by_user_id_foreign FOREIGN KEY (creado_por) REFERENCES sec.usuarios(id_usuario);


--
-- Name: versiones_documento docs_document_versions_document_id_foreign; Type: FK CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.versiones_documento
    ADD CONSTRAINT docs_document_versions_document_id_foreign FOREIGN KEY (id_documento) REFERENCES docs.documentos(id_documento) ON DELETE CASCADE;


--
-- Name: documentos docs_documents_created_by_user_id_foreign; Type: FK CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.documentos
    ADD CONSTRAINT docs_documents_created_by_user_id_foreign FOREIGN KEY (creado_por) REFERENCES sec.usuarios(id_usuario);


--
-- Name: documentos docs_documents_doc_type_id_foreign; Type: FK CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.documentos
    ADD CONSTRAINT docs_documents_doc_type_id_foreign FOREIGN KEY (id_tipo_documento) REFERENCES docs.tipos_documento(id_tipo_documento);


--
-- Name: documentos docs_documents_owner_area_id_foreign; Type: FK CONSTRAINT; Schema: docs; Owner: -
--

ALTER TABLE ONLY docs.documentos
    ADD CONSTRAINT docs_documents_owner_area_id_foreign FOREIGN KEY (id_area_propietaria) REFERENCES org.areas(id_area);


--
-- Name: installments installments_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.installments
    ADD CONSTRAINT installments_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES fin.invoices(invoice_id);


--
-- Name: invoices invoices_currency_code_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.invoices
    ADD CONSTRAINT invoices_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES cfg.currencies(currency_code);


--
-- Name: invoices invoices_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.invoices
    ADD CONSTRAINT invoices_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: invoices invoices_organization_id_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.invoices
    ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(organization_id);


--
-- Name: invoices invoices_student_id_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.invoices
    ADD CONSTRAINT invoices_student_id_fkey FOREIGN KEY (student_id) REFERENCES acad.students(student_id);


--
-- Name: payments payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.payments
    ADD CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES fin.invoices(invoice_id);


--
-- Name: payments payments_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.payments
    ADD CONSTRAINT payments_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES fin.payment_methods(payment_method_id);


--
-- Name: payments payments_received_by_user_id_fkey; Type: FK CONSTRAINT; Schema: fin; Owner: -
--

ALTER TABLE ONLY fin.payments
    ADD CONSTRAINT payments_received_by_user_id_fkey FOREIGN KEY (received_by_user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: instructor_areas instructor_areas_area_id_fkey; Type: FK CONSTRAINT; Schema: hr; Owner: -
--

ALTER TABLE ONLY hr.instructor_areas
    ADD CONSTRAINT instructor_areas_area_id_fkey FOREIGN KEY (area_id) REFERENCES cat.knowledge_areas(area_id);


--
-- Name: instructor_areas instructor_areas_instructor_id_fkey; Type: FK CONSTRAINT; Schema: hr; Owner: -
--

ALTER TABLE ONLY hr.instructor_areas
    ADD CONSTRAINT instructor_areas_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES hr.instructors(instructor_id);


--
-- Name: instructors instructors_document_type_id_fkey; Type: FK CONSTRAINT; Schema: hr; Owner: -
--

ALTER TABLE ONLY hr.instructors
    ADD CONSTRAINT instructors_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES cfg.document_types(document_type_id);


--
-- Name: instructors instructors_user_id_fkey; Type: FK CONSTRAINT; Schema: hr; Owner: -
--

ALTER TABLE ONLY hr.instructors
    ADD CONSTRAINT instructors_user_id_fkey FOREIGN KEY (user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: outbox outbox_template_id_fkey; Type: FK CONSTRAINT; Schema: ntf; Owner: -
--

ALTER TABLE ONLY ntf.outbox
    ADD CONSTRAINT outbox_template_id_fkey FOREIGN KEY (template_id) REFERENCES ntf.templates(template_id);


--
-- Name: agreements agreements_organization_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.agreements
    ADD CONSTRAINT agreements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(organization_id);


--
-- Name: classrooms classrooms_campus_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.classrooms
    ADD CONSTRAINT classrooms_campus_id_fkey FOREIGN KEY (campus_id) REFERENCES org.campuses(campus_id);


--
-- Name: miembros_area org_area_members_area_id_foreign; Type: FK CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.miembros_area
    ADD CONSTRAINT org_area_members_area_id_foreign FOREIGN KEY (id_area) REFERENCES org.areas(id_area) ON DELETE CASCADE;


--
-- Name: miembros_area org_area_members_user_id_foreign; Type: FK CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.miembros_area
    ADD CONSTRAINT org_area_members_user_id_foreign FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario) ON DELETE CASCADE;


--
-- Name: organization_contacts organization_contacts_organization_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.organization_contacts
    ADD CONSTRAINT organization_contacts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES org.organizations(organization_id);


--
-- Name: organizations organizations_document_type_id_fkey; Type: FK CONSTRAINT; Schema: org; Owner: -
--

ALTER TABLE ONLY org.organizations
    ADD CONSTRAINT organizations_document_type_id_fkey FOREIGN KEY (document_type_id) REFERENCES cfg.document_types(document_type_id);


--
-- Name: model_has_permissions model_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_permissions
    ADD CONSTRAINT model_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: model_has_roles model_has_roles_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_has_roles
    ADD CONSTRAINT model_has_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: role_has_permissions role_has_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_has_permissions role_has_permissions_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_has_permissions
    ADD CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: complaint_history complaint_history_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.complaint_history
    ADD CONSTRAINT complaint_history_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES sec.usuarios(id_usuario);


--
-- Name: complaint_history complaint_history_complaint_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.complaint_history
    ADD CONSTRAINT complaint_history_complaint_id_fkey FOREIGN KEY (complaint_id) REFERENCES qms.complaints(complaint_id);


--
-- Name: complaints complaints_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.complaints
    ADD CONSTRAINT complaints_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: survey_answers survey_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_answers
    ADD CONSTRAINT survey_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES qms.survey_questions(question_id);


--
-- Name: survey_answers survey_answers_response_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_answers
    ADD CONSTRAINT survey_answers_response_id_fkey FOREIGN KEY (response_id) REFERENCES qms.survey_responses(response_id);


--
-- Name: survey_questions survey_questions_survey_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_questions
    ADD CONSTRAINT survey_questions_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES qms.surveys(survey_id);


--
-- Name: survey_responses survey_responses_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_responses
    ADD CONSTRAINT survey_responses_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: survey_responses survey_responses_instructor_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_responses
    ADD CONSTRAINT survey_responses_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES hr.instructors(instructor_id);


--
-- Name: survey_responses survey_responses_survey_id_fkey; Type: FK CONSTRAINT; Schema: qms; Owner: -
--

ALTER TABLE ONLY qms.survey_responses
    ADD CONSTRAINT survey_responses_survey_id_fkey FOREIGN KEY (survey_id) REFERENCES qms.surveys(survey_id);


--
-- Name: adjuntos_pedido req_internal_order_attachments_history_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.adjuntos_pedido
    ADD CONSTRAINT req_internal_order_attachments_history_id_foreign FOREIGN KEY (id_historial) REFERENCES req.historial_pedido(id_historial) ON DELETE SET NULL;


--
-- Name: adjuntos_pedido req_internal_order_attachments_order_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.adjuntos_pedido
    ADD CONSTRAINT req_internal_order_attachments_order_id_foreign FOREIGN KEY (id_pedido) REFERENCES req.pedidos(id_pedido) ON DELETE CASCADE;


--
-- Name: adjuntos_pedido req_internal_order_attachments_uploaded_by_user_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.adjuntos_pedido
    ADD CONSTRAINT req_internal_order_attachments_uploaded_by_user_id_foreign FOREIGN KEY (cargado_por) REFERENCES sec.usuarios(id_usuario) ON DELETE SET NULL;


--
-- Name: historial_pedido req_internal_order_history_changed_by_user_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.historial_pedido
    ADD CONSTRAINT req_internal_order_history_changed_by_user_id_foreign FOREIGN KEY (modificado_por) REFERENCES sec.usuarios(id_usuario);


--
-- Name: historial_pedido req_internal_order_history_order_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.historial_pedido
    ADD CONSTRAINT req_internal_order_history_order_id_foreign FOREIGN KEY (id_pedido) REFERENCES req.pedidos(id_pedido);


--
-- Name: detalles_pedido req_internal_order_items_order_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.detalles_pedido
    ADD CONSTRAINT req_internal_order_items_order_id_foreign FOREIGN KEY (id_pedido) REFERENCES req.pedidos(id_pedido);


--
-- Name: pedidos req_internal_orders_from_area_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.pedidos
    ADD CONSTRAINT req_internal_orders_from_area_id_foreign FOREIGN KEY (area_origen) REFERENCES org.areas(id_area);


--
-- Name: pedidos req_internal_orders_requested_by_user_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.pedidos
    ADD CONSTRAINT req_internal_orders_requested_by_user_id_foreign FOREIGN KEY (solicitado_por) REFERENCES sec.usuarios(id_usuario);


--
-- Name: pedidos req_internal_orders_to_area_id_foreign; Type: FK CONSTRAINT; Schema: req; Owner: -
--

ALTER TABLE ONLY req.pedidos
    ADD CONSTRAINT req_internal_orders_to_area_id_foreign FOREIGN KEY (area_destino) REFERENCES org.areas(id_area);


--
-- Name: tokens_acceso refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.tokens_acceso
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario);


--
-- Name: roles_permisos role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.roles_permisos
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (id_permiso) REFERENCES sec.permisos(id_permiso);


--
-- Name: roles_permisos role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.roles_permisos
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (id_rol) REFERENCES sec.roles(id_rol);


--
-- Name: usuarios sec_users_area_id_foreign; Type: FK CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.usuarios
    ADD CONSTRAINT sec_users_area_id_foreign FOREIGN KEY (id_area) REFERENCES org.areas(id_area) ON DELETE SET NULL;


--
-- Name: usuarios_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.usuarios_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (id_rol) REFERENCES sec.roles(id_rol);


--
-- Name: usuarios_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.usuarios_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario);


--
-- Name: sesiones_usuario user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: sec; Owner: -
--

ALTER TABLE ONLY sec.sesiones_usuario
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (id_usuario) REFERENCES sec.usuarios(id_usuario);


--
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES shop.carts(cart_id);


--
-- Name: cart_items cart_items_edition_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.cart_items
    ADD CONSTRAINT cart_items_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES acad.course_editions(edition_id);


--
-- Name: carts carts_student_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.carts
    ADD CONSTRAINT carts_student_id_fkey FOREIGN KEY (student_id) REFERENCES acad.students(student_id);


--
-- Name: web_order_items web_order_items_edition_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.web_order_items
    ADD CONSTRAINT web_order_items_edition_id_fkey FOREIGN KEY (edition_id) REFERENCES acad.course_editions(edition_id);


--
-- Name: web_order_items web_order_items_enrollment_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.web_order_items
    ADD CONSTRAINT web_order_items_enrollment_id_fkey FOREIGN KEY (enrollment_id) REFERENCES acad.enrollments(enrollment_id);


--
-- Name: web_order_items web_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.web_order_items
    ADD CONSTRAINT web_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES shop.web_orders(order_id);


--
-- Name: web_orders web_orders_student_id_fkey; Type: FK CONSTRAINT; Schema: shop; Owner: -
--

ALTER TABLE ONLY shop.web_orders
    ADD CONSTRAINT web_orders_student_id_fkey FOREIGN KEY (student_id) REFERENCES acad.students(student_id);


--
-- PostgreSQL database dump complete
--

\unrestrict C0dyem0l0UIRArgE901btP3akhFxVXZoviWeOPmsLkU8NyqRIrQdSfXsVhFtKmN

--
-- PostgreSQL database dump
--

\restrict qfsItxqZgcqLGRT6O2PiVdG42kaV9ZYXME3gI5XN8Z7QV6XwlapdlrTFj6nWmSr

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2026_08_21_094048_create_permission_tables	1
5	2026_08_21_094920_add_status_and_area_to_users_table	1
6	2026_08_21_102842_alter_sec_users_add_status_and_area	1
7	2026_08_21_120833_create_internal_operations_tables	2
8	2026_08_21_130000_align_area_control_system	3
9	2026_08_21_140000_create_internal_order_attachments_table	4
10	2026_09_18_160000_translate_operational_schema_to_spanish	5
11	2026_09_18_160100_translate_legacy_history_status	6
12	2026_09_25_100000_add_psychology_area	7
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.migrations_id_seq', 12, true);


--
-- PostgreSQL database dump complete
--

\unrestrict qfsItxqZgcqLGRT6O2PiVdG42kaV9ZYXME3gI5XN8Z7QV6XwlapdlrTFj6nWmSr
