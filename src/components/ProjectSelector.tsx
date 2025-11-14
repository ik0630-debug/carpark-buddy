import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      <Label>프로젝트 선택</Label>
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