import { useState, useEffect } from "react";
import { AdminApplicationList } from "@/components/AdminApplicationList";
import { ParkingTypeManager } from "@/components/ParkingTypeManager";
import { PageSettingsManager } from "@/components/PageSettingsManager";
import { ProjectSelector } from "@/components/ProjectSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            참가자 페이지로 돌아가기
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            주차등록 관리자
          </h1>
          <p className="text-muted-foreground">
            주차 신청을 관리하고 주차권 종류를 설정합니다
          </p>
        </div>

        <Card className="p-6 mb-6">
          <ProjectSelector value={currentProjectId} onChange={setCurrentProjectId} />
        </Card>

        {currentProjectId && (
          <Card className="p-6">
            <Tabs defaultValue="applications" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="applications">신청 관리</TabsTrigger>
                <TabsTrigger value="parking-types">주차권 관리</TabsTrigger>
                <TabsTrigger value="settings">페이지 설정</TabsTrigger>
              </TabsList>
              <TabsContent value="applications">
                <AdminApplicationList projectId={currentProjectId} />
              </TabsContent>
              <TabsContent value="parking-types">
                <ParkingTypeManager projectId={currentProjectId} />
              </TabsContent>
              <TabsContent value="settings">
                <PageSettingsManager projectId={currentProjectId} />
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;