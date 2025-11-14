import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const ParkingApplicationForm = () => {
  const [carNumber, setCarNumber] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const validateCarNumber = (number: string) => {
    // 한국 차량번호 형식: 00가0000 또는 000가0000
    const pattern = /^\d{2,3}[가-힣]\d{4}$/;
    return pattern.test(number);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCarNumber(carNumber)) {
      toast({
        title: "잘못된 차량번호",
        description: "차량번호는 '00가0000' 또는 '000가0000' 형식이어야 합니다",
        variant: "destructive",
      });
      return;
    }

    if (!applicantName.trim() || !applicantPhone.trim()) {
      toast({
        title: "필수 정보 누락",
        description: "이름과 연락처를 모두 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const lastFour = carNumber.slice(-4);
      
      const { error } = await supabase
        .from("parking_applications")
        .insert({
          car_number: carNumber,
          last_four: lastFour,
          applicant_name: applicantName,
          applicant_phone: applicantPhone,
        });

      if (error) throw error;

      toast({
        title: "신청 완료",
        description: "주차등록 신청이 완료되었습니다. 뒤 4자리로 상태를 확인하실 수 있습니다.",
      });

      setCarNumber("");
      setApplicantName("");
      setApplicantPhone("");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "신청 실패",
        description: "주차등록 신청 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="applicant-name">신청자 이름</Label>
        <Input
          id="applicant-name"
          placeholder="홍길동"
          value={applicantName}
          onChange={(e) => setApplicantName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="applicant-phone">연락처</Label>
        <Input
          id="applicant-phone"
          placeholder="010-1234-5678"
          value={applicantPhone}
          onChange={(e) => setApplicantPhone(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="car-number">차량번호</Label>
        <Input
          id="car-number"
          placeholder="예: 123가4567"
          value={carNumber}
          onChange={(e) => setCarNumber(e.target.value.replace(/\s/g, ""))}
          maxLength={8}
          required
        />
        <p className="text-sm text-muted-foreground">
          형식: 00가0000 또는 000가0000
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            신청 중...
          </>
        ) : (
          "주차등록 신청"
        )}
      </Button>
    </form>
  );
};