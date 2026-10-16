"""Rebuilds handoff/phase1-v1.0.0 from the living docs. Run from the repo root: python -I scripts/build_handoff.py
The hand-written files (00, 07, 08, 10, 12-16) are kept as they are; copied files are refreshed; manifest is recomputed."""
import hashlib, json, os, shutil

H = "handoff/phase1-v1.0.0/"
COPIES = {
    "docs/open-questions.md": "02_DECISION_LOG.md",
    "docs/database-schema.md": "05_DATABASE_SCHEMA.md",
    "docs/auth-rls-matrix.md": "06_RLS_AND_ROLE_MATRIX.md",
    "docs/question-rules.md": "09_QUESTION_GENERATOR_SPEC.md",
    "docs/qa-test-cases.md": "11_TEST_REPORT.md",
    "docs/workflows.md": "04_UI_ROUTES_AND_FLOWS.md",
    "features.md": "01_PRODUCT_REQUIREMENTS.md",
    ".env.example": ".env.example",
}
for src, dst in COPIES.items():
    shutil.copyfile(src, H + dst)

arch = open("docs/architecture.md", encoding="utf-8").read() + "\n\n## Decision records (ADRs)\n"
for f in sorted(os.listdir("docs/decisions")):
    arch += "\n---\n\n" + open("docs/decisions/" + f, encoding="utf-8").read()
open(H + "03_ARCHITECTURE.md", "w", encoding="utf-8").write(arch)

for d in ("migrations", "functions", "tests"):
    shutil.copytree("supabase/" + d, H + "supabase/" + d, dirs_exist_ok=True)

files = {}
for root, _, fs in os.walk(H):
    for f in sorted(fs):
        p = os.path.join(root, f).replace("\\", "/")
        if p.endswith("export_manifest.json"):
            continue
        files[p[len(H):]] = hashlib.sha256(open(p, "rb").read()).hexdigest()

manifest = {
    "release": "phase1 v1.0.0-rc",
    "supabase_project_ref_dev": "sehspievdmlwlltrbztl",
    "postgres": "17",
    "migrations": sorted(f for f in files if f.startswith("supabase/migrations/")),
    "edge_functions": ["admin-students", "start-attempt"],
    "cron_jobs": ["finalize-expired-attempts (* * * * *)"],
    "tables": ["settings", "profiles", "levels", "student_code_counters", "students", "exams", "attempts", "attempt_questions", "attempt_events", "audit_events"],
    "env_var_names": ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_STUDENT_EMAIL_DOMAIN", "STUDENT_EMAIL_DOMAIN", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    "storage_buckets": [],
    "note": "No secrets and no user data in this bundle.",
    "sha256": files,
}
json.dump(manifest, open(H + "export_manifest.json", "w"), indent=1)
print(len(files), "files hashed")
