import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

interface ProjectManagerProps {
  onProjectsChange?: () => void;
}

export const ProjectManager = ({ onProjectsChange }: ProjectManagerProps = {}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      
      // 외부 콜백 호출
      onProjectsChange?.();
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "데이터 로딩 실패",
        description: "프로젝트 목록을 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newName.trim() || !newSlug.trim()) {
      toast({
        title: "입력 오류",
        description: "프로젝트 이름과 URL 주소를 모두 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    // slug 검증 (영문자, 숫자, 하이픈만 허용)
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(newSlug)) {
      toast({
        title: "입력 오류",
        description: "URL 주소는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: newName.trim(),
          slug: newSlug.trim().toLowerCase(),
          description: newDescription.trim() || null,
          password: newPassword.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // 기본 페이지 설정 추가
      if (data) {
        await supabase.from("page_settings").insert([
          {
            project_id: data.id,
            setting_key: "title_text",
            setting_value: "주차등록 시스템",
          },
          {
            project_id: data.id,
            setting_key: "title_font_size",
            setting_value: "36",
          },
        ]);
      }

      toast({
        title: "추가 완료",
        description: "새 프로젝트가 추가되었습니다",
      });

      setNewName("");
      setNewSlug("");
      setNewDescription("");
      setNewPassword("");
      setOpen(false);
      fetchProjects();
    } catch (error) {
      console.error("Error adding project:", error);
      toast({
        title: "추가 실패",
        description: "프로젝트 추가 중 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 프로젝트를 삭제하시겠습니까? 모든 관련 데이터가 삭제됩니다.")) {
      return;
    }

    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "삭제 완료",
        description: "프로젝트가 삭제되었습니다",
      });

      // 삭제된 프로젝트가 현재 선택된 프로젝트라면 localStorage에서도 제거
      const currentProjectId = localStorage.getItem("currentProjectId");
      if (currentProjectId === id) {
        localStorage.removeItem("currentProjectId");
      }

      fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "삭제 실패",
        description: "프로젝트 삭제 중 오류가 발생했습니다",
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
        <h2 className="text-2xl font-semibold">프로젝트 관리</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              프로젝트 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 프로젝트 추가</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">프로젝트 이름</Label>
                <Input
                  id="name"
                  placeholder="예: 2024년 연말 행사"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL 주소</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/</span>
                  <Input
                    id="slug"
                    placeholder="예: 2024-year-end"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  영문 소문자, 숫자, 하이픈(-)만 사용 가능
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  placeholder="프로젝트 설명을 입력하세요"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">프로젝트 비밀번호 (선택)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="현장 관리자용 비밀번호"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  현장 관리자가 로그인할 때 사용할 비밀번호입니다
                </p>
              </div>
              <Button type="submit" className="w-full">
                추가
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로젝트 이름</TableHead>
              <TableHead>URL 주소</TableHead>
              <TableHead>설명</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead className="w-[100px]">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  등록된 프로젝트가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    /{project.slug}
                  </TableCell>
                  <TableCell>{project.description || "-"}</TableCell>
                  <TableCell>
                    {new Date(project.created_at).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(project.id)}
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