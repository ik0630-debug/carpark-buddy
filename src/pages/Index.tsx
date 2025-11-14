import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectSelector } from "@/components/ProjectSelector";
import { ParkingApplicationForm } from "@/components/ParkingApplicationForm";
import { ParkingStatusCheck } from "@/components/ParkingStatusCheck";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { toast } = useToast();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [titleText, setTitleText] = useState("M&C Communications\n주차 등록 시스템");
  const [fontSize, setFontSize] = useState("36");

  useEffect(() => {
    if (currentProjectId) {
      fetchSettings();

      // Real-time subscription for settings
      const channel = supabase
        .channel('page-settings')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'page_settings'
          },
          () => {
            fetchSettings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentProjectId]);

  const fetchSettings = async () => {
    if (!currentProjectId) return;
    
    try {
      const { data } = await supabase
        .from("page_settings")
        .select("*")
        .eq("project_id", currentProjectId)
        .in("setting_key", ["title_text", "title_font_size"]);

      if (data) {
        const titleSetting = data.find((s) => s.setting_key === "title_text");
        const fontSizeSetting = data.find((s) => s.setting_key === "title_font_size");

        if (titleSetting) setTitleText(titleSetting.setting_value);
        if (fontSizeSetting) setFontSize(fontSizeSetting.setting_value);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="p-4">
          <ProjectSelector value={currentProjectId} onChange={setCurrentProjectId} />
        </Card>

        {currentProjectId && (
          <>
            <div className="text-center">
              <div 
                className="font-bold text-primary leading-tight whitespace-pre-line"
                style={{ fontSize: `${fontSize}px` }}
              >
                {titleText}
              </div>
            </div>

            <Card className="p-6">
              <Tabs defaultValue="apply" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="apply">주차등록 신청</TabsTrigger>
                  <TabsTrigger value="check">신청 상태 확인</TabsTrigger>
                </TabsList>
                <TabsContent value="apply">
                  <ParkingApplicationForm projectId={currentProjectId} />
                </TabsContent>
                <TabsContent value="check">
                  <ParkingStatusCheck projectId={currentProjectId} />
                </TabsContent>
              </Tabs>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;