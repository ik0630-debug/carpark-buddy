import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applyCarNumber, setApplyCarNumber] = useState("");
  const [checkCarNumber, setCheckCarNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  const validateCarNumber = (number: string) => {
    const pattern = /^\d{2,3}[가-힣]\d{4}$/;
    return pattern.test(number);
  };

  const handleApply = async () => {
    if (!validateCarNumber(applyCarNumber)) {
      toast({
        title: "잘못된 차량번호",
        description: "형식: 00가0000 또는 000가0000",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const lastFour = applyCarNumber.slice(-4);
      const { error } = await supabase
        .from("parking_applications")
        .insert({
          car_number: applyCarNumber,
          last_four: lastFour,
        });

      if (error) throw error;

      toast({
        title: "신청 완료",
        description: "주차등록 신청이 완료되었습니다",
      });
      setApplyCarNumber("");
    } catch (error) {
      toast({
        title: "신청 실패",
        description: "오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (checkCarNumber.length !== 4 || !/^\d{4}$/.test(checkCarNumber)) {
      toast({
        title: "잘못된 형식",
        description: "뒤 4자리 숫자를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("parking_applications")
        .select(`
          *,
          parking_types (
            name,
            hours
          )
        `)
        .eq("last_four", checkCarNumber)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "등록 내역 없음",
          description: "해당 번호로 등록된 신청이 없습니다",
          variant: "destructive",
        });
        setCheckResult(null);
        return;
      }

      setCheckResult(data);
    } catch (error) {
      toast({
        title: "조회 실패",
        description: "오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle2 className="mr-1 h-4 w-4" />
            승인됨
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-4 w-4" />
            대기중
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-4 w-4" />
            거부됨
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <div className="text-center mb-8" style={{ marginBottom: '50px' }}>
          <h1 className="text-3xl font-bold text-primary leading-tight">
            M&C Communications
          </h1>
          <h2 className="text-2xl font-bold text-primary mt-2">
            주차 등록 시스템
          </h2>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="차량번호 (예: 123가4567)"
            value={applyCarNumber}
            onChange={(e) => setApplyCarNumber(e.target.value.replace(/\s/g, ""))}
            maxLength={8}
            className="h-20 text-center border-2 border-black font-bold placeholder:text-2xl placeholder:font-normal"
            style={{ fontSize: '40px', display: 'flex', alignItems: 'center', paddingTop: '0', paddingBottom: '0' }}
          />
          <Button
            onClick={handleApply}
            disabled={loading}
            className="w-full"
          >
            주차등록 신청
          </Button>

          <Input
            placeholder="차량번호 뒤 4자리"
            value={checkCarNumber}
            onChange={(e) => setCheckCarNumber(e.target.value.replace(/\D/g, ""))}
            maxLength={4}
            className="h-20 text-center border-2 border-black font-bold placeholder:text-2xl placeholder:font-normal"
            style={{ fontSize: '40px', marginTop: '50px', display: 'flex', alignItems: 'center', paddingTop: '0', paddingBottom: '0' }}
          />
          <Button
            onClick={handleCheck}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            주차등록 조회
          </Button>

          {checkResult && (
            <div className="mt-4 p-4 bg-card border rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">상태</span>
                {getStatusBadge(checkResult.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">차량번호</span>
                <span className="font-semibold">{checkResult.car_number}</span>
              </div>
              {checkResult.parking_types && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">주차권</span>
                  <span className="font-semibold">
                    {checkResult.parking_types.name}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;