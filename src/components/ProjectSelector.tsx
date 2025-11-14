import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings } from "lucide-react";
import { ProjectManager } from "./ProjectManager";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface ProjectSelectorProps {
  value: string | null;
  onChange: (projectId: string) => void;
}

export const ProjectSelector = ({ value, onChange }: ProjectSelectorProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
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
      
      const projectList = data || [];
      setProjects(projectList);
      
      // 프로젝트가 있는데 선택된 것이 없으면 첫 번째 프로젝트를 자동 선택
      if (projectList.length > 0 && !value) {
        const savedProjectId = localStorage.getItem("currentProjectId");
        const projectToSelect = savedProjectId && projectList.find(p => p.id === savedProjectId)
          ? savedProjectId
          : projectList[0].id;
        onChange(projectToSelect);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "데이터 로딩 실패",
        description: "프로젝트 목록을 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    }
  };

  // 프로젝트 관리 Dialog에서 변경이 있을 때 목록 새로고침
  const handleProjectsChange = () => {
    fetchProjects();
  };

  const handleValueChange = (projectId: string) => {
    localStorage.setItem("currentProjectId", projectId);
    onChange(projectId);
  };

  if (projects.length === 0) {
    return (
      <div className="space-y-2">
        <Label>프로젝트</Label>
        <p className="text-sm text-muted-foreground">
          프로젝트를 먼저 생성해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>프로젝트 선택</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              프로젝트 관리
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>프로젝트 관리</DialogTitle>
            </DialogHeader>
            <ProjectManager onProjectsChange={handleProjectsChange} />
          </DialogContent>
        </Dialog>
      </div>
      <Select value={value || undefined} onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="프로젝트를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};