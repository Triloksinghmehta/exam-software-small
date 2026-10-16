import { Button, Card, Page } from "../components/ui";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

// G3: identity only. Exams, practice and results arrive in G5.
export default function StudentHome() {
  const { student } = useAuth();
  if (!student) return null;
  return (
    <Page title="Home">
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <b className="text-lg">{student.full_name}</b>
            <p className="text-slate-600">{student.student_code} · Level {student.level}</p>
          </div>
          <Button variant="secondary" onClick={() => supabase.auth.signOut()}>Logout</Button>
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-bold mb-2">Exams</h2>
        <p className="text-slate-600">No exams right now. Your teacher will add one.</p>
      </Card>
    </Page>
  );
}
