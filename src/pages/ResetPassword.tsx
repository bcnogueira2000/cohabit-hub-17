import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses recovery token from URL hash automatically into a session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else toast.error("Link inválido ou expirado");
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password atualizada");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="Living Colours" className="h-14 w-14 object-contain mb-3" />
          <h1 className="font-display text-2xl font-semibold">Definir nova password</h1>
        </div>
        <Card className="p-6 border-border/60 shadow-elegant">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Nova password</Label>
              <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={busy || !ready} className="w-full rounded-full gradient-warm border-0">
              Atualizar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
