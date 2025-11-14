import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface PageSettingsManagerProps {
  projectId: string;
}

export const PageSettingsManager = ({ projectId }: PageSettingsManagerProps) => {
  const [titleText, setTitleText] = useState("");
  const [fontSize, setFontSize] = useState("36");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchSettings();
    }
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("page_settings")
        .select("*")
        .eq("project_id", projectId)
        .in("setting_key", ["title_text", "title_font_size"]);

      if (error) throw error;

      if (data) {
        const titleSetting = data.find((s) => s.setting_key === "title_text");
        const fontSizeSetting = data.find((s) => s.setting_key === "title_font_size");

        if (titleSetting) setTitleText(titleSetting.setting_value);
        if (fontSizeSetting) setFontSize(fontSizeSetting.setting_value);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "설정 로딩 실패",
        description: "설정을 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Update title text
      const { error: titleError } = await supabase
        .from("page_settings")
        .update({ setting_value: titleText })
        .eq("project_id", projectId)
        .eq("setting_key", "title_text");

      if (titleError) throw titleError;

      // Update font size
      const { error: fontError } = await supabase
        .from("page_settings")
        .update({ setting_value: fontSize })
        .eq("project_id", projectId)
        .eq("setting_key", "title_font_size");

      if (fontError) throw fontError;

      toast({
        title: "저장 완료",
        description: "페이지 설정이 저장되었습니다",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "저장 실패",
        description: "설정 저장 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title-text">페이지 제목</Label>
          <Textarea
            id="title-text"
            placeholder="제목을 입력하세요 (줄바꿈으로 여러 줄 가능)"
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Enter 키로 줄바꿈이 가능합니다
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-size">폰트 크기 (px)</Label>
          <Input
            id="font-size"
            type="number"
            min="12"
            max="100"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
          />
        </div>

        <div className="border rounded-lg p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">미리보기:</p>
          <div
            className="font-bold text-primary text-center whitespace-pre-line"
            style={{ fontSize: `${fontSize}px` }}
          >
            {titleText}
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </>
        ) : (
          "설정 저장"
        )}
      </Button>
    </div>
  );
};