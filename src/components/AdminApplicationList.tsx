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
  parking_types: ParkingType | null;
}

interface AdminApplicationListProps {
  projectId: string;
}

export const AdminApplicationList = ({ projectId }: AdminApplicationListProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [parkingTypes, setParkingTypes] = useState<ParkingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
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
    }
  }, [projectId]);

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
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        supabase
          .from("parking_types")
          .select("*")
          .eq("project_id", projectId)
          .order("sort_order", { ascending: true }),
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
      // 선택한 주차권 정보 가져오기
      const selectedType = parkingTypes.find(type => type.id === parkingTypeId);
      
      // "번호없음"이나 "거부"인 경우 상태를 needs_review로 설정
      const isSpecialType = selectedType && 
        (selectedType.name === "번호없음" || selectedType.name === "거부");

      const { error } = await supabase
        .from("parking_applications")
        .update({
          status: isSpecialType ? "needs_review" : "approved",
          parking_type_id: parkingTypeId,
          approved_at: isSpecialType ? null : new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // 특수 타입일 때 메시지 표시
      if (isSpecialType) {
        const message = selectedType.name === "번호없음" 
          ? "차량 번호가 없습니다." 
          : "등록 대상 차량이 아닙니다.";
        toast({
          title: "확인 필요",
          description: message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "배정 완료",
          description: "주차권이 배정되었습니다",
        });
      }

      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error("Error approving application:", error);
      toast({
        title: "배정 실패",
        description: "처리 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) {
      return;
    }

    setProcessingId(id);

    try {
      const { error } = await supabase
        .from("parking_applications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "삭제 완료",
        description: "신청이 삭제되었습니다",
      });

      fetchData();
    } catch (error) {
      console.error("Error deleting application:", error);
      toast({
        title: "삭제 실패",
        description: "삭제 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-success">적용완료</Badge>;
      case "pending":
        return <Badge variant="secondary">대기중</Badge>;
      case "needs_review":
        return <Badge variant="destructive">확인필요</Badge>;
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
      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-3">
        {applications.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            등록된 신청이 없습니다
          </div>
        ) : (
          applications.map((app) => (
            <div key={app.id} className="border rounded-lg p-4 space-y-3">
              {/* 첫째 줄: 차량번호, 상태 */}
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold">{app.car_number}</span>
                {getStatusBadge(app.status)}
              </div>
              
              {/* 둘째 줄: 주차권, 수정/삭제 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  {app.status === "pending" || app.status === "needs_review" || editingId === app.id ? (
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(value) => handleApprove(app.id, value)}
                        disabled={processingId === app.id}
                        defaultValue={app.parking_type_id || undefined}
                      >
                        <SelectTrigger className="w-full">
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
                      {editingId === app.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          취소
                        </Button>
                      )}
                    </div>
                  ) : app.parking_types ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {app.parking_types.name} ({app.parking_types.hours}시간)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(app.id)}
                        disabled={processingId === app.id}
                      >
                        수정
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(app.id)}
                  disabled={processingId === app.id}
                >
                  {processingId === app.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "삭제"
                  )}
                </Button>
              </div>

              {/* 신청일 */}
              <div className="text-xs text-muted-foreground">
                {new Date(app.created_at).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop View - Table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  등록된 신청이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-mono">{app.car_number}</TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell>
                    {app.status === "pending" || app.status === "needs_review" || editingId === app.id ? (
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(value) =>
                            handleApprove(app.id, value)
                          }
                          disabled={processingId === app.id}
                          defaultValue={app.parking_type_id || undefined}
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
                        {editingId === app.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            취소
                          </Button>
                        )}
                      </div>
                    ) : app.parking_types ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {app.parking_types.name} ({app.parking_types.hours}시간)
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(app.id)}
                          disabled={processingId === app.id}
                        >
                          수정
                        </Button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(app.created_at).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(app.id)}
                      disabled={processingId === app.id}
                    >
                      {processingId === app.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "삭제"
                      )}
                    </Button>
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