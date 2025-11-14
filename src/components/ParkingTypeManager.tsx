import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ParkingType {
  id: string;
  name: string;
  hours: number;
  created_at: string;
}

export const ParkingTypeManager = () => {
  const [parkingTypes, setParkingTypes] = useState<ParkingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHours, setNewHours] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchParkingTypes();
  }, []);

  const fetchParkingTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("parking_types")
        .select("*")
        .order("hours", { ascending: true });

      if (error) throw error;
      setParkingTypes(data || []);
    } catch (error) {
      console.error("Error fetching parking types:", error);
      toast({
        title: "데이터 로딩 실패",
        description: "주차권 목록을 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim() || !newHours || parseInt(newHours) <= 0) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 올바르게 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("parking_types").insert({
        name: newName.trim(),
        hours: parseInt(newHours),
      });

      if (error) throw error;

      toast({
        title: "추가 완료",
        description: "새 주차권이 추가되었습니다",
      });

      setNewName("");
      setNewHours("");
      setOpen(false);
      fetchParkingTypes();
    } catch (error) {
      console.error("Error adding parking type:", error);
      toast({
        title: "추가 실패",
        description: "주차권 추가 중 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 주차권을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("parking_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "삭제 완료",
        description: "주차권이 삭제되었습니다",
      });

      fetchParkingTypes();
    } catch (error) {
      console.error("Error deleting parking type:", error);
      toast({
        title: "삭제 실패",
        description: "주차권 삭제 중 오류가 발생했습니다",
        variant: "destructive",
      });
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">주차권 목록</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              주차권 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 주차권 추가</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">주차권 이름</Label>
                <Input
                  id="name"
                  placeholder="예: 5시간권"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hours">시간 (시간 단위)</Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  placeholder="예: 5"
                  value={newHours}
                  onChange={(e) => setNewHours(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                추가
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>주차권 이름</TableHead>
              <TableHead>시간</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead className="w-24">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parkingTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  등록된 주차권이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              parkingTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>{type.hours}시간</TableCell>
                  <TableCell>
                    {new Date(type.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(type.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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