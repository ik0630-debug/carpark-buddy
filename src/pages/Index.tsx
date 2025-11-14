import { ParkingApplicationForm } from "@/components/ParkingApplicationForm";
import { ParkingStatusCheck } from "@/components/ParkingStatusCheck";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              주차등록 시스템
            </h1>
            <p className="text-muted-foreground">
              차량번호를 등록하고 승인 상태를 확인하세요
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              주차등록 신청
            </h2>
            <ParkingApplicationForm />
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              등록 확인
            </h2>
            <ParkingStatusCheck />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;