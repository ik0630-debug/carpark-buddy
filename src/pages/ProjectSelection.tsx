import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const ProjectSelection = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleText, setTitleText] = useState("M&C Communications\n주차 등록 시스템");
  const [fontSize, setFontSize] = useState("36");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
    fetchDefaultSettings();
  }, []);

  const fetchDefaultSettings = async () => {
    try {
      // 첫 번째 프로젝트의 설정을 가져와서 표시
      const { data: projectData } = await supabase
        .from("projects")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (projectData) {
        const { data } = await supabase
          .from("page_settings")
          .select("setting_key, setting_value")
          .eq("project_id", projectData.id)
          .in("setting_key", ["title_text", "title_font_size"]);

        if (data) {
          const titleSetting = data.find((s) => s.setting_key === "title_text");
          const fontSizeSetting = data.find((s) => s.setting_key === "title_font_size");

          if (titleSetting) setTitleText(titleSetting.setting_value);
          if (fontSizeSetting) setFontSize(fontSizeSetting.setting_value);
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "오류",
        description: "프로젝트를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (slug: string) => {
    navigate(`/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">프로젝트를 불러오는 중...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* 페이지 제목 */}
        <div className="text-center mb-12">
          <h1
            className="font-bold text-foreground whitespace-pre-line"
            style={{ fontSize: `${fontSize}px`, lineHeight: "1.2" }}
          >
            {titleText}
          </h1>
        </div>

        {/* 프로젝트 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>프로젝트 선택</CardTitle>
            <CardDescription>
              참가하실 프로젝트를 선택해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 프로젝트가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleProjectSelect(project.slug)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-muted-foreground">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon">
                          <ArrowRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 관리자 로그인 링크 */}
        <div className="text-center mt-6">
          <Button
            variant="link"
            onClick={() => navigate("/admin/login")}
            className="text-muted-foreground"
          >
            관리자 로그인
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSelection;
