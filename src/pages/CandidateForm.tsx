import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CandidateDateField from "./CandidateDateField";
import "./candidatura.css";


type Lang = "pt" | "en";

const I18N: Record<Lang, Record<string, string>> = {
  pt: {
    heroTitle: "Vamos preparar tudo para a tua chegada",
    heroSubtitle:
      "Preenche os teus dados com calma — precisamos deles para avançar com o teu contrato de alojamento e organizar a tua estadia no Living Colours.",
    requiredNote: "Campo obrigatório",
    s1Title: "Os teus dados",
    s2Title: "Contacto de emergência",
    s3Title: "Documentos a anexar",
    s4Title: "Comentários",
    s5Title: "Consentimento",
    lblFullName: "Nome completo",
    lblNationality: "Nacionalidade",
    lblDob: "Data de nascimento",
    lblDocType: "Tipo de documento",
    lblDocNumber: "Nº do documento",
    lblDocValidity: "Validade do documento",
    lblTaxNumber: "NIF",
    lblNoTaxNumber: "Não tenho NIF português",
    lblPhone: "Telemóvel",
    lblEmail: "Email",
    lblAddress: "Morada de residência",
    lblPostalCode: "Código postal",
    lblCity: "Localidade",
    lblProfile: "Situação",
    optChoose: "Escolhe uma opção",
    optCitizenCard: "Cartão de Cidadão",
    optPassport: "Passaporte",
    optResidencePermit: "Título de Residência",
    optOther: "Outro",
    optStudent: "Estudante",
    optWorker: "Trabalhador",
    lblInstitution: "Instituição de ensino",
    lblCourse: "Curso",
    lblWorkplace: "Local de trabalho",
    lblJobTitle: "Função",
    lblEcName: "Nome",
    lblEcRelation: "Relação (opcional)",
    lblEcPhone: "Telefone",
    lblEcEmail: "Email (opcional)",
    dzText: "Arrasta os ficheiros para aqui, ou clica para escolher",
    dzHint:
      "Anexa obrigatoriamente uma cópia do teu cartão de cidadão ou passaporte. Se tiveres, podes também anexar comprovativo de matrícula ou de vínculo laboral, e comprovativo de NIF.",
    dzError: "Precisamos de pelo menos um documento.",
    removeLabel: "Remover",
    commentsPlaceholder: "Há alguma coisa que devêssemos saber?",
    gdprText:
      "Aceito que os meus dados pessoais e documentos sejam recolhidos e tratados pela Living Colours, para efeitos de elaboração do contrato de alojamento e gestão da minha estadia, nos termos do RGPD.",
    submitBtn: "Submeter candidatura",
    submitting: "A enviar…",
    submitHint: "Marca o consentimento acima para poderes submeter.",
    successTitle: "Candidatura recebida",
    successText:
      "Obrigado — vamos analisar tudo com calma e entramos em contacto contigo em breve.",
    loading: "A carregar…",
    invalidTitle: "Este link expirou ou é inválido",
    invalidText:
      "Pede à equipa Living Colours um novo link para preencheres a tua candidatura.",
  },
  en: {
    heroTitle: "Let's get everything ready for your arrival",
    heroSubtitle:
      "Take your time filling this in — we need these details to move forward with your accommodation contract and organise your stay at Living Colours.",
    requiredNote: "Required field",
    s1Title: "Your details",
    s2Title: "Emergency contact",
    s3Title: "Documents to attach",
    s4Title: "Comments",
    s5Title: "Consent",
    lblFullName: "Full name",
    lblNationality: "Nationality",
    lblDob: "Date of birth",
    lblDocType: "Document type",
    lblDocNumber: "Document number",
    lblDocValidity: "Document validity",
    lblTaxNumber: "Tax number",
    lblNoTaxNumber: "I don't have a Portuguese tax number",
    lblPhone: "Phone",
    lblEmail: "Email",
    lblAddress: "Address",
    lblPostalCode: "Postal code",
    lblCity: "City",
    lblProfile: "Situation",
    optChoose: "Choose an option",
    optCitizenCard: "Citizen Card",
    optPassport: "Passport",
    optResidencePermit: "Residence Permit",
    optOther: "Other",
    optStudent: "Student",
    optWorker: "Worker",
    lblInstitution: "Institution",
    lblCourse: "Course",
    lblWorkplace: "Workplace",
    lblJobTitle: "Job title",
    lblEcName: "Name",
    lblEcRelation: "Relationship (optional)",
    lblEcPhone: "Phone",
    lblEcEmail: "Email (optional)",
    dzText: "Drag your files here, or click to browse",
    dzHint:
      "Please attach a copy of your ID card or passport (required). If available, you can also attach proof of enrollment or employment, and proof of tax number.",
    dzError: "We need at least one document.",
    removeLabel: "Remove",
    commentsPlaceholder: "Anything else we should know?",
    gdprText:
      "I agree that my personal data and documents will be collected and processed by Living Colours, for the purpose of drawing up the accommodation contract and managing my stay, in accordance with the GDPR.",
    submitBtn: "Submit application",
    submitting: "Sending…",
    submitHint: "Check the consent above to be able to submit.",
    successTitle: "Application received",
    successText:
      "Thank you — we'll take a good look at everything and get back to you shortly.",
    loading: "Loading…",
    invalidTitle: "This link has expired or is invalid",
    invalidText:
      "Please ask the Living Colours team for a new link to fill in your application.",
  },
};

/** Valores guardados na base de dados para o tipo de documento. */
const DOC_TYPE_DB: Record<string, string> = {
  citizen_card: "Cartão de Cidadão",
  passport: "Passaporte",
  residence_permit: "Título de Residência",
  other: "Outro",
};
const DOC_TYPE_FORM: Record<string, string> = Object.fromEntries(
  Object.entries(DOC_TYPE_DB).map(([k, v]) => [v.toLowerCase(), k])
);

interface LeadFormData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  document_type: string | null;
  document_number: string | null;
  document_validity: string | null;
  tax_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  profile: string | null;
  employer_or_school: string | null;
  course: string | null;
  course_duration: string | null;
  job_title: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_email: string | null;
  candidate_comments: string | null;
  gdpr_consent: boolean | null;
  language: string | null;
  form_submitted_at: string | null;
}

const TEXTURE = [
  { top: "4%", left: "2%", size: 46, rot: -12, cls: "frag-sage", shape: "ldot" },
  { top: "18%", left: "92%", size: 34, rot: 25, cls: "frag-dark", shape: "l" },
  { top: "46%", left: "6%", size: 30, rot: 8, cls: "frag-dark", shape: "bar" },
  { top: "62%", left: "94%", size: 50, rot: -20, cls: "frag-sage", shape: "dot" },
  { top: "84%", left: "4%", size: 38, rot: 40, cls: "frag-sage", shape: "ldot" },
  { top: "95%", left: "90%", size: 26, rot: -6, cls: "frag-dark", shape: "bar" },
];

const Fragment_ = ({ shape }: { shape: string }) => {
  const L = (
    <path
      d="M2 2 L2 22 M2 22 L18 22"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
  if (shape === "l") return L;
  if (shape === "ldot")
    return (
      <>
        {L}
        <circle cx="18" cy="9" r="3.2" fill="currentColor" />
      </>
    );
  if (shape === "bar") return <rect x="9" y="2" width="6" height="20" rx="3" fill="currentColor" />;
  return <circle cx="12" cy="12" r="4" fill="currentColor" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",").pop() ?? "");
    reader.onerror = () => reject(new Error("Não foi possível ler o ficheiro"));
    reader.readAsDataURL(file);
  });

const CandidateForm = () => {
  const { token = "" } = useParams();
  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [lead, setLead] = useState<LeadFormData | null>(null);
  const [profile, setProfile] = useState("");
  const [noTax, setNoTax] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [dragover, setDragover] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const t = useMemo(() => I18N[lang], [lang]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase.rpc("get_lead_form_data", {
        p_token: token,
      });
      if (!alive) return;
      const row = (Array.isArray(data) ? data[0] : data) as LeadFormData | undefined;
      if (err || !row) {
        setInvalid(true);
        setLoading(false);
        return;
      }
      setLead(row);
      setProfile(row.profile === "student" || row.profile === "professional" ? row.profile : "");
      setNoTax((row.tax_number ?? "") === "999999999");
      setConsent(!!row.gdpr_consent);
      const l = String(row.language ?? "").trim().toLowerCase();
      setLang(l === "en" ? "en" : "pt");
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === "en"
        ? "Application Form — Living Colours"
        : "Formulário de Candidatura — Living Colours";
  }, [lang]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted = ["pdf", "jpg", "jpeg"];
    const next = [...files];
    Array.from(list).forEach((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!accepted.includes(ext)) return;
      if (next.some((x) => x.name === f.name && x.size === f.size)) return;
      next.push(f);
    });
    setFiles(next);
    if (next.length) setFileError(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const okFiles = files.length > 0;
    setFileError(!okFiles);
    if (!form.reportValidity() || !okFiles) {
      if (!okFiles) dropRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setBusy(true);
    setError(null);
    const fd = new FormData(form);
    const val = (k: string) => String(fd.get(k) ?? "").trim();
    const docType = val("document_type");
    const payload: Record<string, unknown> = {
      full_name: val("full_name"),
      phone: val("phone"),
      nationality: val("nationality"),
      date_of_birth: val("date_of_birth"),
      document_type: DOC_TYPE_DB[docType] ?? docType,
      document_number: val("document_number"),
      document_validity: val("document_validity"),
      tax_number: val("tax_number"),
      address: val("address"),
      postal_code: val("postal_code"),
      city: val("city"),
      profile,
      employer_or_school:
        profile === "student" ? val("course_institution") : val("job_workplace"),
      course: profile === "student" ? val("course") : "",
      job_title: profile === "professional" ? val("job_title") : "",
      emergency_contact_name: val("emergency_contact_name"),
      emergency_contact_relation: val("emergency_contact_relation"),
      emergency_contact_phone: val("emergency_contact_phone"),
      emergency_contact_email: val("emergency_contact_email"),
      candidate_comments: val("candidate_comments"),
      gdpr_consent: consent,
    };

    try {
      for (const file of files) {
        const base64 = await fileToBase64(file);
        const { error: upErr } = await supabase.functions.invoke("upload-lead-document", {
          body: {
            token,
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_content_base64: base64,
          },
        });
        if (upErr) throw new Error(upErr.message);
      }

      const { error: subErr } = await supabase.rpc("submit_lead_form", {
        p_token: token,
        p_data: payload as never,
      });
      if (subErr) throw new Error(subErr.message);

      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="lc-form min-h-screen">
      <div className="brand-texture" aria-hidden="true">
        {TEXTURE.map((p, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={p.size}
            height={p.size}
            className={p.cls}
            style={{ top: p.top, left: p.left, transform: `rotate(${p.rot}deg)` }}
          >
            <Fragment_ shape={p.shape} />
          </svg>
        ))}
      </div>
      <div className="page">
        <div className="topbar">
          <div className="lang-switch" role="group" aria-label="Idioma / Language">
            <button type="button" className={lang === "pt" ? "active" : ""} onClick={() => setLang("pt")}>
              PT
            </button>
            <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
              EN
            </button>
          </div>
        </div>
        <div className="card">{children}</div>
      </div>
    </div>
  );

  if (loading) return shell(<p className="hero-subtitle">{t.loading}</p>);

  if (invalid || !lead)
    return shell(
      <>
        <h1 className="hero-title">{t.invalidTitle}</h1>
        <p className="hero-subtitle">{t.invalidText}</p>
      </>
    );

  const docTypeDefault = lead.document_type
    ? DOC_TYPE_FORM[lead.document_type.toLowerCase()] ?? "other"
    : "";

  return shell(
    <>
      <h1 className="hero-title">{done ? t.successTitle : t.heroTitle}</h1>
      {!done && (
        <>
          <p className="hero-subtitle">{t.heroSubtitle}</p>
          <p className="required-note">
            <span className="req">*</span> <span>{t.requiredNote}</span>
          </p>
        </>
      )}

      {done ? (
        <div className="success-panel show">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M8 12.5l2.5 2.5L16 9.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h2>{t.successTitle}</h2>
          <p>{t.successText}</p>
        </div>
      ) : (
        <form id="applicationForm" ref={formRef} onSubmit={submit} noValidate>
          {/* 01 — dados */}
          <fieldset className="section">
            <div className="section-head">
              <span className="section-num">01</span>
              <h2 className="section-title">{t.s1Title}</h2>
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="full_name">
                  <span>{t.lblFullName}</span>
                  <span className="req">*</span>
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  required
                  autoComplete="name"
                  defaultValue={lead.full_name ?? ""}
                />
              </div>

              <div className="field-grid cols-2">
                <div className="field">
                  <label htmlFor="nationality">
                    <span>{t.lblNationality}</span>
                    <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="nationality"
                    name="nationality"
                    required
                    defaultValue={lead.nationality ?? ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="date_of_birth" id="date_of_birth-label">
                    <span>{t.lblDob}</span>
                    <span className="req">*</span>
                  </label>
                  <CandidateDateField
                    id="date_of_birth"
                    name="date_of_birth"
                    value={dob}
                    onChange={setDob}
                    lang={lang}
                    placeholder={lang === "pt" ? "dd/mm/aaaa" : "dd/mm/yyyy"}
                    invalid={dateError && !dob}
                    fromYear={1930}
                    toYear={new Date().getFullYear() - 15}
                    defaultMonthYear={2000}
                  />
                </div>

              </div>

              <div className="field-grid cols-2">
                <div className="field">
                  <label htmlFor="document_type">
                    <span>{t.lblDocType}</span>
                    <span className="req">*</span>
                  </label>
                  <select id="document_type" name="document_type" required defaultValue={docTypeDefault}>
                    <option value="" disabled>
                      {t.optChoose}
                    </option>
                    <option value="citizen_card">{t.optCitizenCard}</option>
                    <option value="passport">{t.optPassport}</option>
                    <option value="residence_permit">{t.optResidencePermit}</option>
                    <option value="other">{t.optOther}</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="document_number">
                    <span>{t.lblDocNumber}</span>
                    <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="document_number"
                    name="document_number"
                    required
                    defaultValue={lead.document_number ?? ""}
                  />
                </div>
              </div>

              <div className="field-grid cols-2">
                <div className="field">
                  <label htmlFor="document_validity" id="document_validity-label">
                    <span>{t.lblDocValidity}</span>
                    <span className="req">*</span>
                  </label>
                  <CandidateDateField
                    id="document_validity"
                    name="document_validity"
                    value={docValidity}
                    onChange={setDocValidity}
                    lang={lang}
                    placeholder={lang === "pt" ? "dd/mm/aaaa" : "dd/mm/yyyy"}
                    invalid={dateError && !docValidity}
                    fromYear={new Date().getFullYear() - 5}
                    toYear={new Date().getFullYear() + 30}
                    defaultMonthYear={new Date().getFullYear() + 1}
                  />
                </div>

                <div className="field">
                  <label htmlFor="tax_number">
                    <span>{t.lblTaxNumber}</span>
                    <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="tax_number"
                    name="tax_number"
                    required
                    readOnly={noTax}
                    key={noTax ? "notax" : "tax"}
                    defaultValue={noTax ? "999999999" : lead.tax_number ?? ""}
                  />
                  <label className="checkbox-inline" htmlFor="no_tax_number">
                    <input
                      type="checkbox"
                      id="no_tax_number"
                      checked={noTax}
                      onChange={(e) => setNoTax(e.target.checked)}
                    />
                    <span>{t.lblNoTaxNumber}</span>
                  </label>
                </div>
              </div>

              <div className="field-grid cols-2">
                <div className="field">
                  <label htmlFor="phone">
                    <span>{t.lblPhone}</span>
                    <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    autoComplete="tel"
                    defaultValue={lead.phone ?? ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">
                    <span>{t.lblEmail}</span>
                    <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    readOnly
                    autoComplete="email"
                    defaultValue={lead.email ?? ""}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="address">
                  <span>{t.lblAddress}</span>
                  <span className="req">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  required
                  autoComplete="street-address"
                  defaultValue={lead.address ?? ""}
                />
              </div>

              <div className="field-grid cols-2">
                <div className="field">
                  <label htmlFor="postal_code">
                    <span>{t.lblPostalCode}</span>
                    <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="postal_code"
                    name="postal_code"
                    required
                    defaultValue={lead.postal_code ?? ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="city">
                    <span>{t.lblCity}</span>
                    <span className="req">*</span>
                  </label>
                  <input type="text" id="city" name="city" required defaultValue={lead.city ?? ""} />
                </div>
              </div>

              <div className="field">
                <label>
                  <span>{t.lblProfile}</span>
                  <span className="req">*</span>
                </label>
                <div className="radio-row">
                  <label className="radio-pill">
                    <input
                      type="radio"
                      name="profile"
                      value="student"
                      required
                      checked={profile === "student"}
                      onChange={() => setProfile("student")}
                    />
                    <span>{t.optStudent}</span>
                  </label>
                  <label className="radio-pill">
                    <input
                      type="radio"
                      name="profile"
                      value="professional"
                      required
                      checked={profile === "professional"}
                      onChange={() => setProfile("professional")}
                    />
                    <span>{t.optWorker}</span>
                  </label>
                </div>
              </div>

              <div className={`conditional-block${profile === "student" ? " active" : ""}`}>
                <div className="field-grid cols-2">
                  <div className="field">
                    <label htmlFor="course_institution">
                      <span>{t.lblInstitution}</span>
                      <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      id="course_institution"
                      name="course_institution"
                      required={profile === "student"}
                      defaultValue={lead.employer_or_school ?? ""}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="course">
                      <span>{t.lblCourse}</span>
                      <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      id="course"
                      name="course"
                      required={profile === "student"}
                      defaultValue={lead.course ?? ""}
                    />
                  </div>
                </div>
              </div>

              <div className={`conditional-block${profile === "professional" ? " active" : ""}`}>
                <div className="field-grid cols-2">
                  <div className="field">
                    <label htmlFor="job_workplace">
                      <span>{t.lblWorkplace}</span>
                      <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      id="job_workplace"
                      name="job_workplace"
                      required={profile === "professional"}
                      defaultValue={lead.employer_or_school ?? ""}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="job_title">
                      <span>{t.lblJobTitle}</span>
                      <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      id="job_title"
                      name="job_title"
                      required={profile === "professional"}
                      defaultValue={lead.job_title ?? ""}
                    />
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          {/* 02 — emergência */}
          <fieldset className="section">
            <div className="section-head">
              <span className="section-num">02</span>
              <h2 className="section-title">{t.s2Title}</h2>
            </div>
            <div className="field-grid">
              <div className="field-grid cols-2">
                <div className="field">
                  <label htmlFor="emergency_contact_name">
                    <span>{t.lblEcName}</span>
                    <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    id="emergency_contact_name"
                    name="emergency_contact_name"
                    required
                    defaultValue={lead.emergency_contact_name ?? ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="emergency_contact_relation">
                    <span>{t.lblEcRelation}</span>
                  </label>
                  <input
                    type="text"
                    id="emergency_contact_relation"
                    name="emergency_contact_relation"
                    defaultValue={lead.emergency_contact_relation ?? ""}
                  />
                </div>
              </div>
              <div className="field-grid cols-2">
                <div className="field">
                  <label htmlFor="emergency_contact_phone">
                    <span>{t.lblEcPhone}</span>
                    <span className="req">*</span>
                  </label>
                  <input
                    type="tel"
                    id="emergency_contact_phone"
                    name="emergency_contact_phone"
                    required
                    defaultValue={lead.emergency_contact_phone ?? ""}
                  />
                </div>
                <div className="field">
                  <label htmlFor="emergency_contact_email">
                    <span>{t.lblEcEmail}</span>
                  </label>
                  <input
                    type="email"
                    id="emergency_contact_email"
                    name="emergency_contact_email"
                    defaultValue={lead.emergency_contact_email ?? ""}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* 03 — documentos */}
          <fieldset className="section">
            <div className="section-head">
              <span className="section-num">03</span>
              <h2 className="section-title">{t.s3Title}</h2>
            </div>

            <div
              className={`dropzone${dragover ? " dragover" : ""}`}
              ref={dropRef}
              tabIndex={0}
              role="button"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragover(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragover(true);
              }}
              onDragLeave={() => setDragover(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragover(false);
                addFiles(e.dataTransfer?.files ?? null);
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15V4M12 4L7.5 8.5M12 4l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="dropzone-text">{t.dzText}</p>
              <p className="dropzone-hint">{t.dzHint}</p>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <p className={`field-error${fileError ? " show" : ""}`}>{t.dzError}</p>

            <ul className="file-list">
              {files.map((f, i) => (
                <li className="file-item" key={`${f.name}-${i}`}>
                  <svg className="file-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  <span className="file-name">{f.name}</span>
                  <span className="file-size">{formatSize(f.size)}</span>
                  <button
                    type="button"
                    aria-label={t.removeLabel}
                    onClick={() => setFiles(files.filter((_, x) => x !== i))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>

          {/* 04 — comentários */}
          <fieldset className="section">
            <div className="section-head">
              <span className="section-num">04</span>
              <h2 className="section-title">{t.s4Title}</h2>
            </div>
            <div className="field">
              <textarea
                id="candidate_comments"
                name="candidate_comments"
                rows={4}
                placeholder={t.commentsPlaceholder}
                defaultValue={lead.candidate_comments ?? ""}
              />
            </div>
          </fieldset>

          {/* 05 — RGPD */}
          <fieldset className="section">
            <div className="section-head">
              <span className="section-num">05</span>
              <h2 className="section-title">{t.s5Title}</h2>
            </div>
            <div className="consent-row">
              <input
                type="checkbox"
                id="gdpr_consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <label htmlFor="gdpr_consent">{t.gdprText}</label>
            </div>
          </fieldset>

          <div className="submit-row">
            <button type="submit" disabled={!consent || busy}>
              {busy ? t.submitting : t.submitBtn}
            </button>
            {error ? (
              <p className="field-error show">{error}</p>
            ) : (
              <p className="submit-hint">{t.submitHint}</p>
            )}
          </div>
        </form>
      )}
    </>
  );
};

export default CandidateForm;
