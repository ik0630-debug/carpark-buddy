import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, Trash2, Edit2, Plus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface QRCodeManagerProps {
  projectId: string;
}

interface QRCodeData {
  id: string;
  project_id: string;
  url: string;
  size: number;
  fg_color: string;
  bg_color: string;
  created_at: string;
  updated_at: string;
}

export const QRCodeManager = ({ projectId }: QRCodeManagerProps) => {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectSlug, setProjectSlug] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQRCode, setEditingQRCode] = useState<QRCodeData | null>(null);
  const [newQRCode, setNewQRCode] = useState({
    size: 256,
    fg_color: "#000000",
    bg_color: "#ffffff",
  });
  const { toast } = useToast();
  const qrRefs = useRef<{ [key: string]: SVGSVGElement | null }>({});

  useEffect(() => {
    if (projectId) {
      fetchProjectSlug();
      fetchQRCodes();
    }
  }, [projectId]);

  const fetchProjectSlug = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("slug")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      setProjectSlug(data.slug);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "프로젝트 정보를 불러오는데 실패했습니다.",
      });
    }
  };

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQrCodes(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "QR코드를 불러오는데 실패했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const url = `https://parking.mnccom.com/${projectSlug}`;
      const { error } = await supabase.from("qr_codes").insert([
        {
          project_id: projectId,
          url,
          size: newQRCode.size,
          fg_color: newQRCode.fg_color,
          bg_color: newQRCode.bg_color,
        },
      ]);

      if (error) throw error;

      toast({
        title: "성공",
        description: "QR코드가 생성되었습니다.",
      });

      setIsCreateDialogOpen(false);
      setNewQRCode({
        size: 256,
        fg_color: "#000000",
        bg_color: "#ffffff",
      });
      fetchQRCodes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "QR코드 생성에 실패했습니다.",
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingQRCode) return;

    try {
      const { error } = await supabase
        .from("qr_codes")
        .update({
          size: editingQRCode.size,
          fg_color: editingQRCode.fg_color,
          bg_color: editingQRCode.bg_color,
        })
        .eq("id", editingQRCode.id);

      if (error) throw error;

      toast({
        title: "성공",
        description: "QR코드가 수정되었습니다.",
      });

      setIsEditDialogOpen(false);
      setEditingQRCode(null);
      fetchQRCodes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "QR코드 수정에 실패했습니다.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 QR코드를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase.from("qr_codes").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "성공",
        description: "QR코드가 삭제되었습니다.",
      });

      fetchQRCodes();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "QR코드 삭제에 실패했습니다.",
      });
    }
  };

  const handleDownload = (qrCode: QRCodeData) => {
    const svg = qrRefs.current[qrCode.id];
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = qrCode.size;
    canvas.height = qrCode.size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `qrcode-${projectSlug}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyToClipboard = async (qrCode: QRCodeData) => {
    const svg = qrRefs.current[qrCode.id];
    if (!svg) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      canvas.width = qrCode.size;
      canvas.height = qrCode.size;

      img.onload = async () => {
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              toast({
                title: "성공",
                description: "QR코드가 클립보드에 복사되었습니다.",
              });
            } catch (err) {
              toast({
                variant: "destructive",
                title: "오류",
                description: "클립보드 복사에 실패했습니다.",
              });
            }
          }
        });
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "오류",
        description: "클립보드 복사에 실패했습니다.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">QR코드 관리</h2>
          <p className="text-muted-foreground">
            참가자 페이지로 연결되는 QR코드를 생성하고 관리합니다.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              QR코드 생성
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 QR코드 생성</DialogTitle>
              <DialogDescription>
                참가자 페이지(https://parking.mnccom.com/{projectSlug})로 연결되는 QR코드를 생성합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="size">크기 (픽셀)</Label>
                <Input
                  id="size"
                  type="number"
                  min="128"
                  max="1024"
                  value={newQRCode.size}
                  onChange={(e) =>
                    setNewQRCode({ ...newQRCode, size: parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fg_color">QR코드 색상</Label>
                <div className="flex gap-2">
                  <Input
                    id="fg_color"
                    type="color"
                    value={newQRCode.fg_color}
                    onChange={(e) =>
                      setNewQRCode({ ...newQRCode, fg_color: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={newQRCode.fg_color}
                    onChange={(e) =>
                      setNewQRCode({ ...newQRCode, fg_color: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bg_color">배경 색상</Label>
                <div className="flex gap-2">
                  <Input
                    id="bg_color"
                    type="color"
                    value={newQRCode.bg_color}
                    onChange={(e) =>
                      setNewQRCode({ ...newQRCode, bg_color: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={newQRCode.bg_color}
                    onChange={(e) =>
                      setNewQRCode({ ...newQRCode, bg_color: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleCreate}>생성</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {qrCodes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            생성된 QR코드가 없습니다. 새 QR코드를 생성해보세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qrCodes.map((qrCode) => (
            <Card key={qrCode.id}>
              <CardHeader>
                <CardTitle className="text-sm">QR코드</CardTitle>
                <CardDescription className="text-xs break-all">
                  {qrCode.url}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center bg-muted p-4 rounded-lg">
                  <QRCodeSVG
                    ref={(el) => (qrRefs.current[qrCode.id] = el)}
                    value={qrCode.url}
                    size={Math.min(qrCode.size, 200)}
                    fgColor={qrCode.fg_color}
                    bgColor={qrCode.bg_color}
                    level="H"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(qrCode)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    다운로드
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyToClipboard(qrCode)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    복사
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingQRCode(qrCode);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(qrCode.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingQRCode && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>QR코드 수정</DialogTitle>
              <DialogDescription>
                QR코드의 크기와 색상을 변경할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_size">크기 (픽셀)</Label>
                <Input
                  id="edit_size"
                  type="number"
                  min="128"
                  max="1024"
                  value={editingQRCode.size}
                  onChange={(e) =>
                    setEditingQRCode({
                      ...editingQRCode,
                      size: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_fg_color">QR코드 색상</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit_fg_color"
                    type="color"
                    value={editingQRCode.fg_color}
                    onChange={(e) =>
                      setEditingQRCode({
                        ...editingQRCode,
                        fg_color: e.target.value,
                      })
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={editingQRCode.fg_color}
                    onChange={(e) =>
                      setEditingQRCode({
                        ...editingQRCode,
                        fg_color: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_bg_color">배경 색상</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit_bg_color"
                    type="color"
                    value={editingQRCode.bg_color}
                    onChange={(e) =>
                      setEditingQRCode({
                        ...editingQRCode,
                        bg_color: e.target.value,
                      })
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={editingQRCode.bg_color}
                    onChange={(e) =>
                      setEditingQRCode({
                        ...editingQRCode,
                        bg_color: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex justify-center bg-muted p-4 rounded-lg">
                <QRCodeSVG
                  value={editingQRCode.url}
                  size={Math.min(editingQRCode.size, 200)}
                  fgColor={editingQRCode.fg_color}
                  bgColor={editingQRCode.bg_color}
                  level="H"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingQRCode(null);
                }}
              >
                취소
              </Button>
              <Button onClick={handleUpdate}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
