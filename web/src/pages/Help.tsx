import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, Logo, Segmented } from "../components/ui";

// Public "how to use" tutorial. Screenshots live in /public/help.
type Step = { title: string; img?: string; points: string[]; tip?: string };

const ADMIN: Step[] = [
  { title: "Log in", img: "admin-login.jpg", points: [
    "Open the website. On the login page press \"Log in as admin\".",
    "Type your email and password, then press Login.",
  ] },
  { title: "Your dashboard", img: "admin-dashboard.jpg", points: [
    "The top boxes show how many students you have, which exams are open, who is writing right now and how many finished today.",
    "Below you see open exams and the latest scores.",
    "Use the menu on the left (at the bottom on a phone) to move between pages.",
  ] },
  { title: "Add your students", img: "admin-students.jpg", points: [
    "Go to Students.",
    "Press Add student to add one child: type the name, father's name, date of birth and level.",
    "The system gives the child a Student ID (like SAI260001) and a password. Write them down. The password is shown only once.",
    "The three dots at the end of a row let you edit, reset the password, disable or delete a student.",
  ], tip: "If a child forgets the password, use Reset password and give them the new one." },
  { title: "Add many students at once", img: "admin-import.jpg", points: [
    "On Students press Upload CSV.",
    "Press Download template. Open it in Excel or Google Sheets and fill one child per line.",
    "Save it as CSV and drag it into the box.",
    "Rows with a mistake turn red and tell you why. Fix them or skip them, then press Import.",
    "Press Download login list and keep that file safe. It has every child's ID and password.",
  ] },
  { title: "Check the levels", img: "admin-levels.jpg", points: [
    "Go to Levels. Each level (Junior Level and Level 1 to 8) has ready-made questions and a time limit.",
    "Press Edit to change what kind of sums a level gets. New exams start from these settings.",
  ] },
  { title: "Create an exam", img: "admin-create-exam.jpg", points: [
    "Go to Exams and press Create exam.",
    "Give it a name, choose Official exam or Practice, and pick the level.",
    "Choose when it opens and closes, how many minutes the children get and how many tries.",
    "The questions are filled in from the level. Change them if you like and press Preview to see a sample paper.",
    "Press Publish. Children of that level will now see it on their home page.",
  ], tip: "Every child gets their own set of questions, so copying from a friend does not help." },
  { title: "Manage your exams", img: "admin-exams.jpg", points: [
    "All exams are listed with their status: Draft, Open, Ended or Closed.",
    "Use the tabs to switch between Official and Practice.",
    "The three dots on a card let you reuse an exam (great for weekly tests), close it now, or delete it.",
  ] },
  { title: "See results", img: "admin-results.jpg", points: [
    "Click an exam card to open its results.",
    "You see every child's score, correct, wrong, skipped, time taken and how many times they left the screen.",
    "Press Download CSV to open the results in Excel.",
    "The Leaderboard tab shows ranks. Turn on \"Show leaderboard to students\" if children should see it.",
  ] },
  { title: "Settings", img: "admin-settings.jpg", points: [
    "Student ID start: the letters at the front of every new ID.",
    "Import mode: let the system make IDs and passwords, or take them from your file.",
    "Anti-cheat: full screen, record leaving the screen, block copy and paste, one login at a time.",
    "At the bottom you can change your own password.",
  ] },
];

const STUDENT: Step[] = [
  { title: "Log in", img: "student-login.jpg", points: [
    "Open the website and type the Student ID and password your teacher gave you.",
    "Press Login.",
    "The first time, you choose your own new password. Remember it!",
  ] },
  { title: "Your home page", img: "student-home.jpg", points: [
    "Here you see all your tests. Tests you can write now are shown at the top.",
    "Start means the test is open now. A date means it opens later. See result means you already finished. \"You missed this one\" means it closed before you started.",
    "Practice tests have a yellow PRACTICE label and do not count for the ranking.",
  ] },
  { title: "Before you start", img: "student-instructions.jpg", points: [
    "Read how many questions there are and how much time you get.",
    "Press I'm ready, then Start. The timer begins right away.",
  ], tip: "Sit somewhere quiet and make sure the phone is charged before you start." },
  { title: "Writing the test", img: "student-exam.jpg", points: [
    "Type each answer in the box under the sum. Press Enter to go to the next one.",
    "The top shows the time left and how many you have answered. Answers save by themselves.",
    "Do not leave the screen or open other apps. Your teacher can see it.",
    "Press Submit when you are done. When time runs out the test submits by itself.",
  ], tip: "If the internet stops, keep going. Your answers are kept and sent when it comes back." },
  { title: "Your result", img: "student-result.jpg", points: [
    "You see your score straight away: correct, wrong, skipped and time taken.",
    "If your teacher turned it on, press Leaderboard to see your rank.",
  ] },
  { title: "Your progress", img: "student-progress.jpg", points: [
    "Press Progress in the menu.",
    "See how many tests you did, your average and best score, and a chart of your last scores.",
    "Tap any test in the list to open its result again.",
  ] },
];

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-6">
      {steps.map((s, i) => (
        <li key={s.title}>
          <Card className="p-0 overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1fr_1.3fr]">
              <div className="p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-600 font-bold text-white">{i + 1}</span>
                  <h2 className="font-display text-2xl font-medium text-slate-900">{s.title}</h2>
                </div>
                <ul className="list-disc space-y-2 pl-5 text-slate-700">
                  {s.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
                {s.tip && <p className="mt-4 rounded-md border-l-4 border-brass-500 bg-slate-50 px-4 py-3 text-sm text-slate-700"><b>Tip:</b> {s.tip}</p>}
              </div>
              {s.img && (
                <div className="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
                  <img src={`/help/${s.img}`} alt={`Screen: ${s.title}`} loading="lazy" onError={(e) => { e.currentTarget.parentElement!.style.display = "none"; }} className="w-full rounded-lg border border-slate-200 shadow-sm" />
                </div>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ol>
  );
}

export default function Help() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"admin" | "student">(params.get("for") === "student" ? "student" : "admin");
  const pick = (t: "admin" | "student") => { setTab(t); setParams({ for: t }, { replace: true }); };
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <span className="flex items-center gap-2"><Logo size={34} /><b className="font-display text-xl font-semibold text-indigo-800">VODMON Demo</b></span>
          <Link to={tab === "admin" ? "/admin/login" : "/login"} className="text-sm font-semibold text-indigo-600 hover:underline">Back to login</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">Step-by-step guide</p>
        <h1 className="font-display text-4xl font-medium text-slate-900">How to use VODMON Demo</h1>
        <p className="mt-2 mb-6 text-slate-600">Simple steps with pictures. Pick who you are below.</p>
        <div className="mb-8"><Segmented options={[["admin", "For teachers / admin"], ["student", "For students"]]} value={tab} onChange={pick} /></div>
        <Steps steps={tab === "admin" ? ADMIN : STUDENT} />
        <p className="mt-10 text-center text-sm text-slate-500">Still stuck? Ask your teacher or the portal administrator.</p>
      </main>
    </div>
  );
}
