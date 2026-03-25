import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ReviewRatingWidget({ reviewId }: { reviewId: string }) {
  const { user } = useAuth();
  const [rating, setRating] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRating();
  }, [reviewId]);

  const loadRating = async () => {
    const { data } = await supabase
      .from("ai_review_ratings" as any)
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) setRating((data as any).is_useful);
    setLoading(false);
  };

  const submitRating = async (isUseful: boolean) => {
    if (rating === isUseful) return;

    if (rating !== null) {
      await supabase
        .from("ai_review_ratings" as any)
        .update({ is_useful: isUseful } as any)
        .eq("review_id", reviewId)
        .eq("user_id", user!.id);
    } else {
      await supabase
        .from("ai_review_ratings" as any)
        .insert({ review_id: reviewId, user_id: user!.id, is_useful: isUseful } as any);
    }
    setRating(isUseful);
    toast.success("Grazie per il feedback!");
  };

  if (loading) return null;

  return (
    <div className="card-premium p-4">
      <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Questa review è stata utile?</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={rating === true ? "default" : "outline"}
          onClick={() => submitRating(true)}
          className={cn(rating === true && "bg-success hover:bg-success/90")}
        >
          <ThumbsUp className="h-4 w-4 mr-1" /> Utile
        </Button>
        <Button
          size="sm"
          variant={rating === false ? "default" : "outline"}
          onClick={() => submitRating(false)}
          className={cn(rating === false && "bg-destructive hover:bg-destructive/90")}
        >
          <ThumbsDown className="h-4 w-4 mr-1" /> Non utile
        </Button>
      </div>
    </div>
  );
}
