import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

interface ParkingType {
  id: string;
  name: string;
  hours: number;
}

interface Application {
  id: string;
  car_number: string;
  last_four: string;
  status: string;
  parking_type_id: string | null;
  created_at: string;
  approved_at: string | null;
  applicant_name: string | null;
  applicant_phone: string | null;
  parking_types: ParkingType | null;
}

export const AdminApplicationList = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [parkingTypes, setParkingTypes] = useState<ParkingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel('admin-applications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parking_applications'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchData(); // Refresh data on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [appsResult, typesResult] = await Promise.all([
        supabase
          .from("parking_applications")
          .select(`
            *,
            parking_types (
              id,
              name,
              hours
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("parking_types")
          .select("*")
          .order("hours", { ascending: true }),
      ]);

      if (appsResult.error) throw appsResult.error;
      if (typesResult.error) throw typesResult.error;

      setApplications(appsResult.data || []);
      setParkingTypes(typesResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "데이터 로딩 실패",
        description: "데이터를 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, parkingTypeId: string) => {
    if (!parkingTypeId) {
      toast({
        title: "주차권 미선택",
        description: "주차권을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    setProcessingId(id);

    try {
      const { error } = await supabase
        .from("parking_applications")
        .update({
          status: "approved",
          parking_type_id: parkingTypeId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "승인 완료",
        description: "주차등록이 승인되었습니다",
      });

      fetchData();
    } catch (error) {
      console.error("Error approving application:", error);
      toast({
        title: "승인 실패",
        description: "승인 처리 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);

    try {
      const { error } = await supabase
        .from("parking_applications")
        .update({
          status: "rejected",
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "거부 완료",
        description: "주차등록이 거부되었습니다",
      });

      fetchData();
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast({
        title: "거부 실패",
        description: "거부 처리 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success">승인됨</Badge>;
      case "pending":
        return <Badge variant="secondary">대기중</Badge>;
      case "rejected":
        return <Badge variant="destructive">거부됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>신청자</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>차량번호</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>주차권</TableHead>
              <TableHead>신청일</TableHead>
              <TableHead>관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  등록된 신청이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>{app.applicant_name || "-"}</TableCell>
                  <TableCell>{app.applicant_phone || "-"}</TableCell>
                  <TableCell className="font-mono">{app.car_number}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    {app.status === "pending" ? (
                      <Select
                        onValueChange={(value) =>
                          handleApprove(app.id, value)
                        }
                        disabled={processingId === app.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {parkingTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : app.parking_types ? (
                      `${app.parking_types.name}`
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(app.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell>
                    {app.status === "pending" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(app.id)}
                        disabled={processingId === app.id}
                      >
                        {processingId === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};