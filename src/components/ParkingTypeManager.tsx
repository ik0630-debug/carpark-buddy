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
import { Loader2, Trash2, Plus, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ParkingType {
  id: string;
  name: string;
  hours: number;
  created_at: string;
  sort_order: number;
}

interface ParkingTypeManagerProps {
  projectId: string;
}

interface SortableRowProps {
  type: ParkingType;
  onDelete: (id: string) => void;
}

function SortableRow({ type, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: type.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            className="cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </button>
          <span className="text-sm sm:text-base">{type.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm sm:text-base">{type.hours}시간</TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(type.id)}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export const ParkingTypeManager = ({ projectId }: ParkingTypeManagerProps) => {
  const [parkingTypes, setParkingTypes] = useState<ParkingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHours, setNewHours] = useState("");
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (projectId) {
      fetchParkingTypes();
    }
  }, [projectId]);

  const fetchParkingTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("parking_types")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

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

    if (!newName.trim() || !newHours) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 올바르게 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    const hours = parseInt(newHours);
    if (isNaN(hours) || hours < 0) {
      toast({
        title: "입력 오류",
        description: "시간은 0 이상의 숫자여야 합니다",
        variant: "destructive",
      });
      return;
    }

    try {
      const maxOrder = parkingTypes.length > 0 
        ? Math.max(...parkingTypes.map(t => t.sort_order)) 
        : 0;

      const { error } = await supabase.from("parking_types").insert({
        name: newName.trim(),
        hours: parseInt(newHours),
        project_id: projectId,
        sort_order: maxOrder + 1,
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
        description: "주차권 삭제 중 오류가 발생했습니다. 이 주차권을 사용하는 신청이 있는지 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = parkingTypes.findIndex((type) => type.id === active.id);
    const newIndex = parkingTypes.findIndex((type) => type.id === over.id);

    const newOrder = arrayMove(parkingTypes, oldIndex, newIndex);
    setParkingTypes(newOrder);

    try {
      const updates = newOrder.map((type, index) => ({
        id: type.id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("parking_types")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      toast({
        title: "순서 변경 완료",
        description: "주차권 순서가 저장되었습니다",
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "순서 변경 실패",
        description: "순서 변경 중 오류가 발생했습니다",
        variant: "destructive",
      });
      fetchParkingTypes();
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
                  placeholder="예: 5시간"
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
                  min="0"
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

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-sm sm:text-base">주차권 이름</TableHead>
              <TableHead className="text-sm sm:text-base">시간</TableHead>
              <TableHead className="w-16 sm:w-24 text-right text-sm sm:text-base">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parkingTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  등록된 주차권이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={parkingTypes.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {parkingTypes.map((type) => (
                    <SortableRow
                      key={type.id}
                      type={type}
                      onDelete={handleDelete}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
