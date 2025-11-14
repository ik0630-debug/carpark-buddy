import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CheckCircle, XCircle, Clock, Loader2, Trash2, Copy, Download } from "lucide-react";

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
  custom_fields: any;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [bulkParkingTypeId, setBulkParkingTypeId] = useState<string>("");
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "선택된 항목 없음",
        description: "삭제할 항목을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`선택한 ${selectedIds.size}개의 신청을 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("parking_applications")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      toast({
        title: "일괄 삭제 완료",
        description: `${selectedIds.size}개의 신청이 삭제되었습니다`,
      });

      setSelectedIds(new Set());
      fetchData();
    } catch (error) {
      console.error("Error bulk deleting applications:", error);
      toast({
        title: "일괄 삭제 실패",
        description: "삭제 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "선택된 항목 없음",
        description: "배정할 항목을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    if (!bulkParkingTypeId) {
      toast({
        title: "주차권 미선택",
        description: "배정할 주차권을 선택해주세요",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);

    try {
      const selectedType = parkingTypes.find(type => type.id === bulkParkingTypeId);
      const isSpecialType = selectedType && (selectedType.name === "번호없음" || selectedType.name === "거부");

      const { error } = await supabase
        .from("parking_applications")
        .update({
          status: isSpecialType ? "needs_review" : "approved",
          parking_type_id: bulkParkingTypeId,
          approved_at: isSpecialType ? null : new Date().toISOString(),
        })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      if (isSpecialType) {
        const message = selectedType.name === "번호없음" 
          ? "차량 번호가 없습니다." 
          : "등록 대상 차량이 아닙니다.";
        toast({
          title: "확인 필요",
          description: `${selectedIds.size}개의 신청이 확인 필요 상태로 변경되었습니다. ${message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "일괄 배정 완료",
          description: `${selectedIds.size}개의 신청에 주차권이 배정되었습니다`,
        });
      }

      setSelectedIds(new Set());
      setBulkParkingTypeId("");
      fetchData();
    } catch (error) {
      console.error("Error bulk assigning parking types:", error);
      toast({
        title: "일괄 배정 실패",
        description: "배정 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCopyCarNumbers = async () => {
    const selectedApplications = applications.filter(app => selectedIds.has(app.id));
    const carNumbers = selectedApplications.map(app => app.car_number).join(", ");
    
    try {
      await navigator.clipboard.writeText(carNumbers);
      toast({
        title: "복사 완료",
        description: `${selectedIds.size}개의 차량번호가 클립보드에 복사되었습니다`,
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      toast({
        title: "복사 실패",
        description: "클립보드 복사 중 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const selectedApplications = applications.filter(app => selectedIds.has(app.id));
    
    // CSV 헤더 생성
    let csvContent = "차량번호,상태,주차권,신청일";
    
    // custom_fields가 있는 경우 동적으로 헤더 추가
    const allCustomFieldKeys = new Set<string>();
    selectedApplications.forEach(app => {
      if (app.custom_fields && typeof app.custom_fields === 'object') {
        Object.keys(app.custom_fields).forEach(key => allCustomFieldKeys.add(key));
      }
    });
    
    if (allCustomFieldKeys.size > 0) {
      csvContent += "," + Array.from(allCustomFieldKeys).join(",");
    }
    
    csvContent += "\n";
    
    // 데이터 행 추가
    selectedApplications.forEach(app => {
      const status = app.status === "approved" ? "적용완료" : 
                    app.status === "pending" ? "대기중" : 
                    app.status === "needs_review" ? "확인필요" : "거부됨";
      const parkingType = app.parking_types ? `${app.parking_types.name} (${app.parking_types.hours}시간)` : "-";
      const createdAt = new Date(app.created_at).toLocaleString("ko-KR");
      
      let row = `${app.car_number},${status},${parkingType},${createdAt}`;
      
      // custom_fields 추가
      if (allCustomFieldKeys.size > 0) {
        const customFieldValues = Array.from(allCustomFieldKeys).map(key => {
          const value = app.custom_fields && typeof app.custom_fields === 'object' 
            ? (app.custom_fields as Record<string, string>)[key] || "" 
            : "";
          return value;
        });
        row += "," + customFieldValues.join(",");
      }
      
      csvContent += row + "\n";
    });
    
    // BOM 추가 (엑셀에서 한글 깨짐 방지)
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `주차신청_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "내보내기 완료",
      description: `${selectedIds.size}개의 신청이 CSV 파일로 다운로드되었습니다`,
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(applications.map(app => app.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
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
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size}개 선택됨
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            <Select
              value={bulkParkingTypeId}
              onValueChange={setBulkParkingTypeId}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="주차권 선택" />
              </SelectTrigger>
              <SelectContent>
                {parkingTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="default"
              size="sm"
              onClick={handleBulkAssign}
              disabled={isAssigning || !bulkParkingTypeId}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  배정 중...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  일괄 배정
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              내보내기
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCarNumbers}
            >
              <Copy className="mr-2 h-4 w-4" />
              차량번호 복사
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  선택 삭제
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-3">
        {applications.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            등록된 신청이 없습니다
          </div>
        ) : (
          applications.map((app) => (
            <div key={app.id} className="border rounded-lg p-4 space-y-3">
              {/* 첫째 줄: 체크박스, 차량번호, 상태 */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedIds.has(app.id)}
                    onCheckedChange={(checked) => handleSelectOne(app.id, checked as boolean)}
                  />
                  <span className="font-mono font-semibold">{app.car_number}</span>
                </div>
                {getStatusBadge(app.status)}
              </div>

              {/* 동적 필드 표시 */}
              {app.custom_fields && typeof app.custom_fields === 'object' && Object.keys(app.custom_fields).length > 0 && (
                <div className="text-sm space-y-1 pl-8 border-l-2 border-muted">
                  {Object.entries(app.custom_fields as Record<string, string>).map(([key, value]) => (
                    value && (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span>{value}</span>
                      </div>
                    )
                  ))}
                </div>
              )}
              
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
              <TableHead className="w-12">
                <Checkbox
                  checked={applications.length > 0 && selectedIds.size === applications.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  등록된 신청이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(app.id)}
                      onCheckedChange={(checked) => handleSelectOne(app.id, checked as boolean)}
                    />
                  </TableCell>
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