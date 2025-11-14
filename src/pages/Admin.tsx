import { useState, useEffect } from "react";
import { AdminApplicationList } from "@/components/AdminApplicationList";
import { ParkingTypeManager } from "@/components/ParkingTypeManager";
import { PageSettingsManager } from "@/components/PageSettingsManager";
import { ProjectSelector } from "@/components/ProjectSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { role, projectId, loading, signOut } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !role) {
      navigate("/admin/login");
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    // 유저 권한인 경우 로그인한 프로젝트로 자동 설정
    if (role === "user" && projectId) {
      setCurrentProjectId(projectId);
    }
  }, [role, projectId]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!role) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              참가자 페이지로 돌아가기
            </Button>
            <Button
              variant="outline"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              로그아웃
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            주차등록 관리자 {role === "user" && "(현장)"}
          </h1>
          <p className="text-muted-foreground">
            주차 신청을 관리하고 주차권 종류를 설정합니다
          </p>
        </div>

        {role === "master" && (
          <Card className="p-6 mb-6">
            <ProjectSelector value={currentProjectId} onChange={setCurrentProjectId} />
          </Card>
        )}

        {currentProjectId && (
          <Card className="p-6">
            <Tabs defaultValue="applications" className="w-full">
              <TabsList className={`grid w-full mb-6 ${role === "master" ? "grid-cols-3" : "grid-cols-1"}`}>
                <TabsTrigger value="applications">신청 관리</TabsTrigger>
                {role === "master" && (
                  <>
                    <TabsTrigger value="parking-types">주차권 관리</TabsTrigger>
                    <TabsTrigger value="settings">페이지 설정</TabsTrigger>
                  </>
                )}
              </TabsList>
              <TabsContent value="applications">
                <AdminApplicationList projectId={currentProjectId} />
              </TabsContent>
              {role === "master" && (
                <>
                  <TabsContent value="parking-types">
                    <ParkingTypeManager projectId={currentProjectId} />
                  </TabsContent>
                  <TabsContent value="settings">
                    <PageSettingsManager projectId={currentProjectId} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;