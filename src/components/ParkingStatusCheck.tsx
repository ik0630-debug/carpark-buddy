import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Application {
  id: string;
  car_number: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  parking_type_id: string | null;
  parking_types: {
    name: string;
    hours: number;
  } | null;
}

export const ParkingStatusCheck = () => {
  const [lastFour, setLastFour] = useState("");
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);
  const { toast } = useToast();

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lastFour.length !== 4 || !/^\d{4}$/.test(lastFour)) {
      toast({
        title: "잘못된 형식",
        description: "차량번호 뒤 4자리 숫자를 입력해주세요",
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
        .eq("last_four", lastFour)
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
        setApplication(null);
        return;
      }

      setApplication(data);
    } catch (error) {
      console.error("Error checking status:", error);
      toast({
        title: "조회 실패",
        description: "상태 조회 중 오류가 발생했습니다",
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleCheck} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="last-four">차량번호 뒤 4자리</Label>
          <Input
            id="last-four"
            placeholder="1234"
            value={lastFour}
            onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))}
            maxLength={4}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              조회 중...
            </>
          ) : (
            "상태 확인"
          )}
        </Button>
      </form>

      {application && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">상태</span>
            {getStatusBadge(application.status)}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">차량번호</span>
            <span className="font-semibold">{application.car_number}</span>
          </div>

          {application.parking_types && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">주차권</span>
              <span className="font-semibold">
                {application.parking_types.name} ({application.parking_types.hours}시간)
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">신청일</span>
            <span className="text-sm">
              {new Date(application.created_at).toLocaleString("ko-KR")}
            </span>
          </div>

          {application.approved_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">승인일</span>
              <span className="text-sm">
                {new Date(application.approved_at).toLocaleString("ko-KR")}
              </span>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};