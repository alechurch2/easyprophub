import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    loadData();
    trackEvent("course_opened", { page: "training", section: "training" });
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
          <button onClick={() => setSelectedLesson(null)} className="text-[11px] uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors mb-6 flex items-center gap-1.5">
            ← Torna al modulo
          </button>

          <div className="card-elevated p-6 sm:p-8 mb-6">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">{selectedLesson.title}</h1>
            {selectedLesson.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedLesson.description}</p>
            )}
          </div>

          {selectedLesson.video_url && (
            <div className="aspect-video bg-black/40 border border-border/50 rounded-2xl overflow-hidden mb-6 shadow-2xl">
              <iframe
                src={selectedLesson.video_url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {selectedLesson.attachment_url && (
            <a href={selectedLesson.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-6 panel-inset px-4 py-2.5 rounded-xl">
              📎 {selectedLesson.attachment_name || "Allegato"}
            </a>
          )}

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => toggleProgress(selectedLesson.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                progress[selectedLesson.id]
                  ? "bg-success/10 text-success border border-success/20"
                  : "panel-inset text-muted-foreground hover:text-foreground hover:border-primary/30"
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-medium">Academy</p>
              <h1 className="font-heading text-2xl font-bold text-foreground">Formazione</h1>
            </div>
          </div>
          <div className="divider-fade mb-0 mt-4" />
        </div>

        {categories.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nessun corso disponibile al momento.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((cat) => (
              <div key={cat.id}>
                <div className="mb-4">
                  <h2 className="font-heading text-lg font-semibold text-foreground">{cat.title}</h2>
                  {cat.description && <p className="text-sm text-muted-foreground/70 mt-1">{cat.description}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getCategoryModules(cat.id).map((mod) => {
                    const prog = getModuleProgress(mod.id);
                    const modLessons = getModuleLessons(mod.id);
                    const isOpen = selectedModule === mod.id;
                    const completedCount = modLessons.filter(l => progress[l.id]).length;
                    return (
                      <div key={mod.id} className={cn("card-premium overflow-hidden transition-all duration-300", isOpen && "ring-1 ring-primary/20")}>
                        <button
                          onClick={() => setSelectedModule(isOpen ? null : mod.id)}
                          className="w-full p-5 text-left flex items-center justify-between group"
                        >
                          <div className="flex-1">
                            <h3 className="font-heading font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{mod.title}</h3>
                            <div className="flex items-center gap-3 mt-3">
                              <Progress value={prog} className="flex-1 h-1.5" />
                              <span className="text-[10px] font-mono text-muted-foreground/60">{completedCount}/{modLessons.length}</span>
                            </div>
                          </div>
                          <ChevronRight className={cn("h-4 w-4 text-muted-foreground/40 transition-transform duration-200 ml-3", isOpen && "rotate-90")} />
                        </button>
                        {isOpen && (
                          <div className="border-t border-border/50 bg-muted/5">
                            {modLessons.length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground/60">Nessuna lezione disponibile.</p>
                            ) : (
                              modLessons.map((lesson, i) => (
                                <button
                                  key={lesson.id}
                                  onClick={() => setSelectedLesson(lesson)}
                                  className="w-full flex items-center gap-3 p-3.5 px-5 text-left hover:bg-primary/5 transition-all duration-150 border-b border-border/30 last:border-b-0 group/lesson"
                                >
                                  {progress[lesson.id] ? (
                                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                  ) : (
                                    <PlayCircle className="h-4 w-4 text-muted-foreground/40 group-hover/lesson:text-primary shrink-0 transition-colors" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm text-foreground/80 group-hover/lesson:text-foreground transition-colors">
                                      <span className="font-mono text-[10px] text-muted-foreground/40 mr-2">{String(i + 1).padStart(2, '0')}</span>
                                      {lesson.title}
                                    </span>
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
