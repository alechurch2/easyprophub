import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, ChevronRight, PlayCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Module {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  sort_order: number;
}

export default function Training() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [catRes, modRes, lesRes, progRes] = await Promise.all([
      supabase.from("course_categories").select("*").order("sort_order"),
      supabase.from("course_modules").select("*").order("sort_order"),
      supabase.from("course_lessons").select("*").order("sort_order"),
      supabase.from("lesson_progress").select("lesson_id, completed").eq("user_id", user!.id),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (modRes.data) setModules(modRes.data);
    if (lesRes.data) setLessons(lesRes.data);
    if (progRes.data) {
      const map: Record<string, boolean> = {};
      progRes.data.forEach((p) => { if (p.completed) map[p.lesson_id] = true; });
      setProgress(map);
    }
    setLoading(false);
  };

  const toggleProgress = async (lessonId: string) => {
    const isCompleted = progress[lessonId];
    if (isCompleted) {
      await supabase.from("lesson_progress").update({ completed: false, completed_at: null }).eq("user_id", user!.id).eq("lesson_id", lessonId);
      setProgress((p) => { const n = { ...p }; delete n[lessonId]; return n; });
    } else {
      await supabase.from("lesson_progress").upsert({
        user_id: user!.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(),
      });
      setProgress((p) => ({ ...p, [lessonId]: true }));
    }
  };

  const getModuleLessons = (moduleId: string) => lessons.filter((l) => l.module_id === moduleId);
  const getCategoryModules = (catId: string) => modules.filter((m) => m.category_id === catId);

  const getModuleProgress = (moduleId: string) => {
    const mLessons = getModuleLessons(moduleId);
    if (mLessons.length === 0) return 0;
    const completed = mLessons.filter((l) => progress[l.id]).length;
    return Math.round((completed / mLessons.length) * 100);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Lesson detail view
  if (selectedLesson) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
          <button onClick={() => setSelectedLesson(null)} className="text-sm text-primary hover:underline mb-4 flex items-center gap-1">
            ← Torna al modulo
          </button>
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{selectedLesson.title}</h1>
          {selectedLesson.description && (
            <p className="text-muted-foreground mb-6">{selectedLesson.description}</p>
          )}
          {selectedLesson.video_url && (
            <div className="aspect-video bg-card border border-border rounded-xl overflow-hidden mb-6">
              <iframe
                src={selectedLesson.video_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {selectedLesson.attachment_url && (
            <a href={selectedLesson.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6">
              📎 {selectedLesson.attachment_name || "Allegato"}
            </a>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => toggleProgress(selectedLesson.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                progress[selectedLesson.id]
                  ? "bg-success/10 text-success"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              {progress[selectedLesson.id] ? "Completata" : "Segna come completata"}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Formazione</h1>
            <p className="text-sm text-muted-foreground">Esplora i corsi e i moduli disponibili</p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="card-premium p-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nessun corso disponibile al momento.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((cat) => (
              <div key={cat.id}>
                <h2 className="font-heading text-lg font-semibold text-foreground mb-1">{cat.title}</h2>
                {cat.description && <p className="text-sm text-muted-foreground mb-4">{cat.description}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getCategoryModules(cat.id).map((mod) => {
                    const prog = getModuleProgress(mod.id);
                    const modLessons = getModuleLessons(mod.id);
                    const isOpen = selectedModule === mod.id;
                    return (
                      <div key={mod.id} className="card-premium overflow-hidden">
                        <button
                          onClick={() => setSelectedModule(isOpen ? null : mod.id)}
                          className="w-full p-4 text-left flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{mod.title}</h3>
                            <div className="flex items-center gap-3 mt-2">
                              <Progress value={prog} className="flex-1 h-1.5" />
                              <span className="text-xs text-muted-foreground">{prog}%</span>
                            </div>
                          </div>
                          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                        </button>
                        {isOpen && (
                          <div className="border-t border-border">
                            {modLessons.length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground">Nessuna lezione disponibile.</p>
                            ) : (
                              modLessons.map((lesson, i) => (
                                <button
                                  key={lesson.id}
                                  onClick={() => setSelectedLesson(lesson)}
                                  className="w-full flex items-center gap-3 p-3 px-4 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
                                >
                                  {progress[lesson.id] ? (
                                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                  ) : (
                                    <PlayCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm text-foreground">{i + 1}. {lesson.title}</span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
