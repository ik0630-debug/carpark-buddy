import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Index = () => {
  const { toast } = useToast();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("project");
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [applyCarNumber, setApplyCarNumber] = useState("");
  const [checkCarNumber, setCheckCarNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [titleText, setTitleText] = useState("M&C Communications\n주차 등록 시스템");
  const [fontSize, setFontSize] = useState("36");
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState({ title: "", description: "" });

  useEffect(() => {
    // URL에서 프로젝트를 가져오는 로직
    const initializeProject = async () => {
      // 1. slug가 있으면 slug로 프로젝트 조회
      if (slug) {
        const { data } = await supabase
          .from("projects")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        
        if (data) {
          setCurrentProjectId(data.id);
          localStorage.setItem("currentProjectId", data.id);
        } else {
          toast({
            title: "프로젝트를 찾을 수 없습니다",
            description: "URL을 확인해주세요",
            variant: "destructive",
          });
        }
      }
      // 2. project 파라미터가 있으면 ID로 조회
      else if (projectIdFromUrl) {
        setCurrentProjectId(projectIdFromUrl);
        localStorage.setItem("currentProjectId", projectIdFromUrl);
      }
      // 3. 저장된 프로젝트 ID가 있으면 사용
      else {
        const savedProjectId = localStorage.getItem("currentProjectId");
        if (savedProjectId) {
          setCurrentProjectId(savedProjectId);
        } else {
          // 4. 첫 번째 프로젝트를 자동 선택
          const { data } = await supabase
            .from("projects")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (data) {
            setCurrentProjectId(data.id);
            localStorage.setItem("currentProjectId", data.id);
          }
        }
      }
    };

    initializeProject();
  }, [slug, projectIdFromUrl]);

  useEffect(() => {
    if (currentProjectId) {
      fetchSettings();

      // Real-time subscription for settings
      const channel = supabase
        .channel('page-settings')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'page_settings'
          },
          () => {
            fetchSettings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentProjectId]);

  // Realtime subscription for status updates
  useEffect(() => {
    if (!checkResult || !currentProjectId) return;

    const channel = supabase
      .channel(`application-${checkResult.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parking_applications',
          filter: `id=eq.${checkResult.id}`
        },
        async () => {
          // Refresh application data
          const { data } = await supabase
            .from("parking_applications")
            .select(`
              *,
              parking_types (
                name,
                hours
              )
            `)
            .eq("id", checkResult.id)
            .maybeSingle();
          
        if (data) {
          setCheckResult(data);
          setIsResultDialogOpen(true);
          toast({
            title: "상태 업데이트",
            description: "주차등록 상태가 변경되었습니다",
          });
        }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkResult?.id, currentProjectId]);

  const fetchSettings = async () => {
    if (!currentProjectId) return;
    
    try {
      const { data } = await supabase
        .from("page_settings")
        .select("*")
        .eq("project_id", currentProjectId)
        .in("setting_key", ["title_text", "title_font_size"]);

      if (data) {
        const titleSetting = data.find((s) => s.setting_key === "title_text");
        const fontSizeSetting = data.find((s) => s.setting_key === "title_font_size");

        if (titleSetting) setTitleText(titleSetting.setting_value);
        if (fontSizeSetting) setFontSize(fontSizeSetting.setting_value);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const validateCarNumber = (number: string) => {
    const pattern = /^\d{2,3}[가-힣]\d{4}$/;
    return pattern.test(number);
  };

  const handleApply = async () => {
    if (!currentProjectId) {
      setErrorMessage({
        title: "프로젝트 없음",
        description: "관리자에게 문의하세요"
      });
      setErrorDialogOpen(true);
      return;
    }

    if (!validateCarNumber(applyCarNumber)) {
      setErrorMessage({
        title: "잘못된 차량번호",
        description: "형식: 00가0000 또는 000가0000"
      });
      setErrorDialogOpen(true);
      return;
    }

    setLoading(true);
    try {
      const lastFour = applyCarNumber.slice(-4);
      const { error } = await supabase
        .from("parking_applications")
        .insert({
          car_number: applyCarNumber,
          last_four: lastFour,
          project_id: currentProjectId,
        });

      if (error) throw error;

      toast({
        title: "신청 완료",
        description: "주차등록 신청이 완료되었습니다.",
      });
      
      // 차량번호 뒤 4자리만 자동입력
      setCheckCarNumber(lastFour);
      setApplyCarNumber("");
    } catch (error) {
      toast({
        title: "신청 실패",
        description: "오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!currentProjectId) {
      setErrorMessage({
        title: "프로젝트 없음",
        description: "관리자에게 문의하세요"
      });
      setErrorDialogOpen(true);
      return;
    }

    if (checkCarNumber.length !== 4 || !/^\d{4}$/.test(checkCarNumber)) {
      setErrorMessage({
        title: "잘못된 형식",
        description: "뒤 4자리 숫자를 입력해주세요"
      });
      setErrorDialogOpen(true);
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
        .eq("project_id", currentProjectId)
        .eq("last_four", checkCarNumber)
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
        setCheckResult(null);
        return;
      }

      setCheckResult(data);
      setIsResultDialogOpen(true);
    } catch (error) {
      toast({
        title: "조회 실패",
        description: "오류가 발생했습니다",
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
    }
  };

  if (!currentProjectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">프로젝트를 불러오는 중...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8" style={{ marginBottom: '50px' }}>
          <div 
            className="font-bold text-primary leading-tight whitespace-pre-line"
            style={{ fontSize: `${fontSize}px` }}
          >
            {titleText}
          </div>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="차량번호 (예: 123가4567)"
            value={applyCarNumber}
            onChange={(e) => setApplyCarNumber(e.target.value.replace(/\s/g, ""))}
            maxLength={8}
            disabled={!currentProjectId || loading}
            className="h-20 text-center border-2 border-black font-bold placeholder:text-2xl placeholder:font-normal"
            style={{ 
              fontSize: '40px', 
              lineHeight: '80px',
              padding: '0 1rem'
            }}
          />
          <Button
            onClick={handleApply}
            disabled={!currentProjectId || loading}
            className="w-full h-14"
            style={{ fontSize: '16px' }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                처리 중...
              </>
            ) : (
              "주차등록 신청"
            )}
          </Button>

          <Input
            placeholder="차량번호 뒤 4자리"
            value={checkCarNumber}
            onChange={(e) => setCheckCarNumber(e.target.value.replace(/\D/g, ""))}
            maxLength={4}
            disabled={!currentProjectId || loading}
            className="h-20 text-center border-2 border-black font-bold placeholder:text-2xl placeholder:font-normal"
            style={{ 
              fontSize: '40px', 
              marginTop: '50px',
              lineHeight: '80px',
              padding: '0 1rem'
            }}
          />
          <Button
            onClick={handleCheck}
            disabled={!currentProjectId || loading}
            className="w-full h-14"
            style={{ fontSize: '16px' }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                조회 중...
              </>
            ) : (
              "주차 등록 조회"
            )}
          </Button>
        </div>

        <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{errorMessage.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-center text-lg">{errorMessage.description}</p>
            </div>
            <Button onClick={() => setErrorDialogOpen(false)} className="w-full">
              확인
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>주차 등록 조회 결과</DialogTitle>
            </DialogHeader>
            {checkResult && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">상태</span>
                  {getStatusBadge(checkResult.status)}
                </div>
                
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">차량번호</span>
                <span className="font-semibold">{checkResult.car_number}</span>
              </div>

              {checkResult.status === "approved" && checkResult.parking_types && (
                  <>
                    {checkResult.parking_types.name === "번호 없음" ? (
                      <div className="text-center py-4">
                        <p className="text-lg font-semibold text-destructive">
                          입력하신 차량 번호가 없습니다
                        </p>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">주차권</span>
                        <span className="font-semibold">
                          {checkResult.parking_types.name} ({checkResult.parking_types.hours}시간)
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">신청일</span>
                  <span className="text-sm">
                    {new Date(checkResult.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>

                {checkResult.approved_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">승인일</span>
                    <span className="text-sm">
                      {new Date(checkResult.approved_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;