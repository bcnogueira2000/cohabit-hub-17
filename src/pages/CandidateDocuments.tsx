import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import "./candidatura.css";
import { DocUploadZones, uploadDocsByKind, type FilesByKind } from "@/components/candidate/DocUploadZones";
import { docKindLabel, missingDocKinds, REQUIRED_DOC_KINDS, type LeadDocKind } from "@/lib/leadDocuments";

type Lang = "pt" | "en";

const T = {
  pt: {
    title: "Documentos em falta",
    hello: (n: string) => (n ? `Olá ${n},` : "Olá,"),
    intro: "Pedimos que carregues os documentos abaixo. Não precisas de voltar a preencher os teus dados.",
    teamMsg: "Mensagem da equipa",
    send: "Enviar",
    sending: "A enviar…",
    missing: "Faltam documentos: {list}.",
    doneTitle: "Documentos enviados",
    doneText: "Obrigado! A equipa Living Colours vai rever os documentos e entra em contacto se for preciso.",
    invalidTitle: "Este link expirou ou é inválido",
    invalidText: "Pede à equipa Living Colours um novo link.",
    noRequest: "Neste momento não há nenhum documento pedido.",
    loading: "A carregar…",
  },
  en: {
    title: "Missing documents",
    hello: (n: string) => (n ? `Hi ${n},` : "Hi,"),
    intro: "Please upload the documents below. You don't need to fill in your details again.",
    teamMsg: "Message from the team",
    send: "Send",
    sending: "Sending…",
    missing: "Missing documents: {list}.",
    doneTitle: "Documents sent",
    doneText: "Thank you! The Living Colours team will review the documents and get in touch if needed.",
    invalidTitle: "This link has expired or is invalid",
    invalidText: "Please ask the Living Colours team for a new link.",
    noRequest: "There are no documents requested at the moment.",
    loading: "Loading…",
  },
};

type Req = {
  first_name: string | null;
  language: string | null;
  profile: string | null;
  message: string | null;
  items: string[] | null;
  requested_at: string | null;
};

const CandidateDocuments = () => {
  const { token = "" } = useParams();
  const [lang, setLang] = useState<Lang>("pt");
  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<Req | null>(null);
  const [docs, setDocs] = useState<FilesByKind>({});
  const [showMissing, setShowMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const t = T[lang];

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase.rpc("get_lead_docs_request" as any, { p_token: token });
      const row = (Array.isArray(data) ? data[0] : data) as Req | undefined;
      if (!err && row) {
        setReq(row);
        setLang(String(row.language ?? "").toLowerCase() === "en" ? "en" : "pt");
      }
      setLoading(false);
    })();
  }, [token]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === "en" ? "Documents — Living Colours" : "Documentos — Living Colours";
  }, [lang]);

  const kinds = ((req?.items ?? []) as LeadDocKind[]).filter((k) => REQUIRED_DOC_KINDS.includes(k) || k === "other");
  const missing = missingDocKinds(kinds, docs);

  const send = async () => {
    if (missing.length) {
      setShowMissing(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadDocsByKind(token, docs, lang);
      const { error: e } = await supabase.rpc("submit_lead_documents" as any, { p_token: token });
      if (e) throw new Error(e.message);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  };

  const body = () => {
    if (loading) return <p className="hero-subtitle">{t.loading}</p>;
    if (!req)
      return (
        <>
          <h1 className="hero-title">{t.invalidTitle}</h1>
          <p className="hero-subtitle">{t.invalidText}</p>
        </>
      );
    if (done)
      return (
        <div className="success-panel show">
          <h2>{t.doneTitle}</h2>
          <p>{t.doneText}</p>
        </div>
      );
    if (!kinds.length)
      return (
        <>
          <h1 className="hero-title">{t.title}</h1>
          <p className="hero-subtitle">{t.noRequest}</p>
        </>
      );
    return (
      <>
        <h1 className="hero-title">{t.title}</h1>
        <p className="hero-subtitle">
          {t.hello(req.first_name ?? "")} {t.intro}
        </p>
        {req.message?.trim() && (
          <div className="section" style={{ whiteSpace: "pre-wrap" }}>
            <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, opacity: 0.7, marginBottom: 6 }}>{t.teamMsg}</p>
            <p>{req.message}</p>
          </div>
        )}
        <fieldset className="section">
          <DocUploadZones
            kinds={kinds}
            lang={lang}
            profile={req.profile}
            value={docs}
            onChange={setDocs}
            showMissing={showMissing}
          />
          <p className={`field-error${showMissing && missing.length ? " show" : ""}`}>
            {t.missing.replace("{list}", missing.map((k) => docKindLabel(k, req.profile, lang)).join(", "))}
          </p>
        </fieldset>
        <div className="submit-row">
          <button type="button" onClick={send} disabled={busy}>
            {busy ? t.sending : t.send}
          </button>
          {error && <p className="field-error show">{error}</p>}
        </div>
      </>
    );
  };

  return (
    <div className="lc-form min-h-screen">
      <div className="page">
        <div className="topbar">
          <div className="lang-switch" role="group" aria-label="Idioma / Language">
            <button type="button" className={lang === "pt" ? "active" : ""} onClick={() => setLang("pt")}>PT</button>
            <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
        </div>
        <div className="card">{body()}</div>
      </div>
    </div>
  );
};

export default CandidateDocuments;
