import { useState, useEffect } from "react";
import { AdminApplicationList } from "@/components/AdminApplicationList";
import { ParkingTypeManager } from "@/components/ParkingTypeManager";
import { PageSettingsManager } from "@/components/PageSettingsManager";
import { QRCodeManager } from "@/components/QRCodeManager";
import { ProjectSelector } from "@/components/ProjectSelector";
import { UserApprovalManager } from "@/components/UserApprovalManager";
import { ProfileEditor } from "@/components/ProfileEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const Admin = () => {
  const navigate = useNavigate();
  const { role, projectId, loading, signOut } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-xs sm:text-sm px-2 sm:px-4"
            >
              <ArrowLeft className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">참가자 페이지로 돌아가기</span>
              <span className="sm:hidden">뒤로</span>
            </Button>
            <div className="flex items-center gap-1 sm:gap-2">
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="overflow-y-auto w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>계정 설정</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <Tabs defaultValue="profile" className="w-full">
                      <TabsList className={`grid w-full mb-6 ${role === "master" ? "grid-cols-2" : "grid-cols-1"}`}>
                        <TabsTrigger value="profile" className="text-sm">내 정보</TabsTrigger>
                        {role === "master" && (
                          <TabsTrigger value="users" className="text-sm">사용자 승인</TabsTrigger>
                        )}
                      </TabsList>
                      <TabsContent value="profile">
                        <ProfileEditor />
                      </TabsContent>
                      {role === "master" && (
                        <TabsContent value="users">
                          <UserApprovalManager />
                        </TabsContent>
                      )}
                    </Tabs>
                  </div>
                </SheetContent>
              </Sheet>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
              >
                <LogOut className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">로그아웃</span>
                <span className="xs:hidden">로그아웃</span>
              </Button>
            </div>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
            주차등록 관리자 {role === "user" && "(현장)"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            주차 신청을 관리하고 주차권 종류를 설정합니다
          </p>
        </div>

        {role === "master" && (
          <Card className="p-3 sm:p-6 mb-4 sm:mb-6">
            <ProjectSelector value={currentProjectId} onChange={setCurrentProjectId} />
          </Card>
        )}

        {currentProjectId && (
          <Card className="p-3 sm:p-6">
            <Tabs defaultValue="applications" className="w-full">
              <TabsList className="w-full mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-3 gap-1">
                <TabsTrigger value="applications" className="text-sm sm:text-base py-2">
                  신청 관리
                </TabsTrigger>
                <TabsTrigger value="parking-types" className="text-sm sm:text-base py-2">
                  주차권 관리
                </TabsTrigger>
                <TabsTrigger value="page-management" className="text-sm sm:text-base py-2">
                  페이지 관리
                </TabsTrigger>
              </TabsList>
              <TabsContent value="applications">
                <AdminApplicationList projectId={currentProjectId} />
              </TabsContent>
              <TabsContent value="parking-types">
                <ParkingTypeManager projectId={currentProjectId} />
              </TabsContent>
              <TabsContent value="page-management">
                <Tabs defaultValue="qr-codes" className="w-full">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="qr-codes" className="flex-1">
                      QR코드 관리
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1">
                      페이지 설정
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="qr-codes">
                    <QRCodeManager projectId={currentProjectId} />
                  </TabsContent>
                  <TabsContent value="settings">
                    <PageSettingsManager projectId={currentProjectId} />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;